import { routePartykitRequest, Server, type Connection, type WSMessage } from "partyserver";
import { buildInitialState } from "../src/lib/game/initialState";
import { gameReducer } from "../src/lib/game/reducer";
import type { ClientMessage, ServerMessage } from "../src/lib/game/protocol";
import { loadState, saveState, type WrittenSnapshot } from "./persistence";
import { MAX_MESSAGE_BYTES, MAX_NAME_LENGTH, isValidPosition, validateAction } from "./validate";
import type { BoardState, PlayerId, ZoneId } from "../src/lib/game/types";

// A refresh/network blip shouldn't evict someone from their own hand — a
// disconnected player's seat is held for this long before it's released for
// someone else to claim. Exact duration is a judgment call, not a hard
// requirement; adjust freely.
const DISCONNECT_GRACE_MS = 60_000;

interface Env {
	GameServer: DurableObjectNamespace<GameServer>;
}

type ConnectionData = { playerId: PlayerId };

function isHandZone(zoneId: string, playerId: PlayerId): boolean {
	return zoneId === `${playerId}-hand`;
}

/**
 * Strips another player's hand-card identity before it's sent to `viewerId`
 * — the same "just a count" treatment PlayerSection.tsx already gives
 * non-active hands in Local mode (see AGENTS.md's Multiplayer State Model),
 * except here it's the server actually withholding the data, not just the
 * UI choosing not to render it. Redacted cards stay in the map (so
 * `cards.length` per zone — how PlayerSection counts a hand — still works)
 * with their identifying fields blanked; the viewer's own hand is untouched.
 */
function redactForViewer(state: BoardState, viewerId: PlayerId): BoardState {
	const cards: BoardState["cards"] = {};
	for (const [id, card] of Object.entries(state.cards)) {
		const owningPlayerId = card.zoneId.endsWith("-hand") ? card.zoneId.slice(0, -"-hand".length) : null;
		const isOthersHand = owningPlayerId !== null && !isHandZone(card.zoneId, viewerId) && owningPlayerId !== viewerId;
		cards[id] = isOthersHand
			? { ...card, label: "", imageFront: "", imageBack: "", item: undefined }
			: card;
	}
	return { ...state, cards };
}

export class GameServer extends Server<Env> {
	state: BoardState | undefined;
	/** What's already in storage, so persist() only rewrites the card chunks that actually changed. */
	written: WrittenSnapshot = new Map();
	/** playerId -> when its connection dropped. Kept for DISCONNECT_GRACE_MS so a refresh can reclaim the same seat. */
	heldSeats = new Map<PlayerId, number>();

	async onStart() {
		this.state = await loadState(this.ctx.storage);
	}

	// No onConnect handler needed — a connection isn't bound to a player (and
	// gets no state) until its first "join" message arrives, via onMessage.

	async onMessage(connection: Connection<ConnectionData>, raw: WSMessage) {
		if (typeof raw !== "string" || raw.length > MAX_MESSAGE_BYTES) return;
		let message: ClientMessage;
		try {
			message = JSON.parse(raw) as ClientMessage;
		} catch {
			return;
		}

		if (typeof message !== "object" || message === null) return;

		if (message.type === "join") {
			await this.handleJoin(message, connection);
			return;
		}

		if (message.type === "action") {
			await this.handleAction(connection, message.action);
			return;
		}

		if (message.type === "cursor") {
			this.handleCursor(connection, message.zoneId, message.position);
		}
	}

	onClose(connection: Connection<ConnectionData>) {
		const playerId = connection.state?.playerId;
		if (!playerId) return;
		this.heldSeats.set(playerId, Date.now());
		this.announce("disconnected", playerId, connection.id);
	}

	/** Tell everyone except `exceptConnectionId` that a player's connection changed. */
	announce(event: "joined" | "reconnected" | "disconnected", playerId: PlayerId, exceptConnectionId: string) {
		const name = this.state?.players.find((p) => p.id === playerId)?.name;
		if (!name) return;
		const message: ServerMessage = { type: "presence", event, playerId, name };
		this.broadcast(JSON.stringify(message), [exceptConnectionId]);
	}

	/** playerIds currently bound to an open connection. */
	openPlayerIds(): Set<PlayerId> {
		const open = new Set<PlayerId>();
		for (const connection of this.getConnections<ConnectionData>()) {
			if (connection.state?.playerId) open.add(connection.state.playerId);
		}
		return open;
	}

	/** Seats that can't be handed to a newcomer: open connections plus seats still inside their reconnect grace window. */
	takenPlayerIds(): Set<PlayerId> {
		const taken = this.openPlayerIds();
		const now = Date.now();
		for (const [playerId, droppedAt] of this.heldSeats) {
			if (now - droppedAt < DISCONNECT_GRACE_MS) taken.add(playerId);
			else this.heldSeats.delete(playerId);
		}
		return taken;
	}

	async handleJoin(
		message: Extract<ClientMessage, { type: "join" }>,
		sender: Connection<ConnectionData>,
	) {
		if (!this.state) {
			// A non-integer here would make buildInitialState build zero players.
			const requested = Number.isInteger(message.playerCount) ? message.playerCount : 2;
			this.state = buildInitialState(requested);
			await this.persist();
		}
		const name = typeof message.name === "string" ? message.name.trim().slice(0, MAX_NAME_LENGTH) : undefined;
		const rejoinPlayerId = typeof message.rejoinPlayerId === "string" ? message.rejoinPlayerId : undefined;

		// Reclaiming a seat you already held (e.g. after a refresh) — allowed as
		// long as no OTHER live connection is currently sitting in it, even if
		// it's inside its grace window.
		if (rejoinPlayerId && !this.openPlayerIds().has(rejoinPlayerId)) {
			const stillExists = this.state.players.some((p) => p.id === rejoinPlayerId);
			if (stillExists) {
				this.bindAndConfirm(sender, rejoinPlayerId, undefined);
				return;
			}
		}

		const taken = this.takenPlayerIds();
		const freePlayerId = this.state.players.find((p) => !taken.has(p.id))?.id;
		if (!freePlayerId) {
			const rejected: ServerMessage = { type: "join-rejected", reason: "full" };
			sender.send(JSON.stringify(rejected));
			return;
		}

		this.bindAndConfirm(sender, freePlayerId, name || undefined);
	}

	bindAndConfirm(sender: Connection<ConnectionData>, playerId: PlayerId, name: string | undefined) {
		this.heldSeats.delete(playerId);

		sender.setState({ playerId });
		// An auto-rejoin (see OnlineGameProvider.tsx) doesn't re-prompt for a
		// name, so it sends none — keep whatever name that seat already has.
		if (this.state && name) {
			this.state = gameReducer(this.state, { type: "RENAME_PLAYER", playerId, name });
		}

		// Recomputed AFTER `setState` above, so it includes the seat this
		// connection just claimed.
		const occupiedSeats = this.takenPlayerIds().size;
		const joined: ServerMessage = {
			type: "joined",
			playerId,
			occupiedSeats,
			totalSeats: this.state?.players.length ?? occupiedSeats,
		};
		sender.send(JSON.stringify(joined));
		this.announce(name ? "joined" : "reconnected", playerId, sender.id);

		void this.persistAndBroadcast();
	}

	async handleAction(sender: Connection<ConnectionData>, action: unknown) {
		const playerId = sender.state?.playerId;
		if (!playerId || !this.state) return;

		const valid = validateAction(this.state, playerId, action);
		if (!valid) {
			console.warn(`refused action from ${playerId}:`, JSON.stringify(action)?.slice(0, 200));
			// The sender already applied it optimistically (see OnlineGameProvider),
			// so hand it the real board to snap back to.
			this.sendState(sender);
			return;
		}

		this.state = gameReducer(this.state, valid);
		await this.persistAndBroadcast();
	}

	// Pure relay — never touches `this.state`/storage. A stray cursor message
	// from a connection that hasn't joined yet (no bound playerId) is just
	// dropped.
	handleCursor(sender: Connection<ConnectionData>, zoneId: ZoneId, position: { x: number; y: number }) {
		const playerId = sender.state?.playerId;
		if (!playerId || !this.state) return;
		if (typeof zoneId !== "string" || !this.state.zones[zoneId] || !isValidPosition(position)) return;
		const message: ServerMessage = { type: "cursor", playerId, zoneId, position };
		this.broadcast(JSON.stringify(message), [sender.id]);
	}

	async persist() {
		if (this.state) await saveState(this.ctx.storage, this.state, this.written);
	}

	async persistAndBroadcast() {
		await this.persist();
		if (!this.state) return;
		for (const connection of this.getConnections<ConnectionData>()) this.sendState(connection);
	}

	/** Send one connection the authoritative board, redacted for the seat it holds. */
	sendState(connection: Connection<ConnectionData>) {
		const viewerId = connection.state?.playerId;
		if (!viewerId || !this.state) return;
		const message: ServerMessage = { type: "state", state: redactForViewer(this.state, viewerId) };
		connection.send(JSON.stringify(message));
	}
}

export default {
	async fetch(request: Request, env: Env) {
		return (await routePartykitRequest(request, env)) || new Response("Not Found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;
