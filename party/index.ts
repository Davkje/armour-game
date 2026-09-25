import { routePartykitRequest, Server, type Connection, type WSMessage } from "partyserver";
import { buildInitialState } from "../src/lib/game/initialState";
import { gameReducer } from "../src/lib/game/reducer";
import type { ClientMessage, RosterSeat, ServerMessage } from "../src/lib/game/protocol";
import { loadState, saveState, type WrittenSnapshot } from "./persistence";
import { MAX_MESSAGE_BYTES, MAX_NAME_LENGTH, isValidPosition, validateAction } from "./validate";
import type { BoardState, PlayerId, ZoneId } from "../src/lib/game/types";

// A refresh/network blip shouldn't evict someone from their own hand — a
// disconnected player's seat is held for this long before it's released for
// someone else to claim. Exact duration is a judgment call, not a hard
// requirement; adjust freely.
const DISCONNECT_GRACE_MS = 60_000;

const SEAT_TOKENS_KEY = "seat-tokens";
// WebSocket close code (4000-4999 is free for applications) telling a client its seat was taken over by a newer connection of the same player.
const REPLACED_CLOSE_CODE = 4000;

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
		const owningPlayerId = card.zoneId.endsWith("-hand")
			? card.zoneId.slice(0, -"-hand".length)
			: null;
		const isOthersHand =
			owningPlayerId !== null && !isHandZone(card.zoneId, viewerId) && owningPlayerId !== viewerId;
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

	/**
	 * playerId -> the secret of whoever last sat in that seat. A seat with no
	 * entry has never been taken. Only ever sent to that seat's own owner (in
	 * its "joined" message) — never in the roster or the board state.
	 */
	seatTokens: Record<PlayerId, string> = {};

	async onStart() {
		this.state = await loadState(this.ctx.storage);
		this.seatTokens = (await this.ctx.storage.get<Record<PlayerId, string>>(SEAT_TOKENS_KEY)) ?? {};
	}

	// Before it has joined a connection gets no board, only the roster — so the
	// join screen can offer "Rejoin as Alice" instead of just a name box.
	onConnect(connection: Connection<ConnectionData>) {
		const message: ServerMessage = { type: "roster", seats: this.rosterSeats() };
		connection.send(JSON.stringify(message));
	}

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
		// A connection we replaced ourselves (same person, new tab or refresh)
		// closes AFTER the new one is already bound to the seat — that isn't the
		// player leaving.
		if (this.openPlayerIds(connection.id).has(playerId)) return;
		this.heldSeats.set(playerId, Date.now());
		this.announce("disconnected", playerId, connection.id);
		this.broadcastRoster(connection.id);
	}

	/** Tell everyone except `exceptConnectionId` that a player's connection changed. */
	announce(
		event: "joined" | "reconnected" | "disconnected",
		playerId: PlayerId,
		exceptConnectionId: string,
	) {
		const name = this.state?.players.find((p) => p.id === playerId)?.name;
		if (!name) return;
		const message: ServerMessage = { type: "presence", event, playerId, name };
		this.broadcast(JSON.stringify(message), [exceptConnectionId]);
	}

	/** playerIds bound to an open connection (optionally ignoring one connection that is closing). */
	openPlayerIds(exceptConnectionId?: string): Set<PlayerId> {
		const open = new Set<PlayerId>();
		for (const connection of this.getConnections<ConnectionData>()) {
			if (connection.id === exceptConnectionId) continue;
			if (connection.state?.playerId) open.add(connection.state.playerId);
		}
		return open;
	}

	/** Seats that can't be handed to a newcomer by auto-assign: open connections plus seats still inside their reconnect grace window. */
	takenPlayerIds(): Set<PlayerId> {
		const taken = this.openPlayerIds();
		const now = Date.now();
		for (const [playerId, droppedAt] of this.heldSeats) {
			if (now - droppedAt < DISCONNECT_GRACE_MS) taken.add(playerId);
			else this.heldSeats.delete(playerId);
		}
		return taken;
	}

	rosterSeats(exceptConnectionId?: string): RosterSeat[] {
		if (!this.state) return [];
		const open = this.openPlayerIds(exceptConnectionId);
		return this.state.players.map((p) => ({
			playerId: p.id,
			name: p.name,
			claimed: !!this.seatTokens[p.id],
			online: open.has(p.id),
		}));
	}

	broadcastRoster(exceptConnectionId?: string) {
		const message: ServerMessage = { type: "roster", seats: this.rosterSeats(exceptConnectionId) };
		this.broadcast(JSON.stringify(message), exceptConnectionId ? [exceptConnectionId] : []);
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
		const state = this.state;
		const name =
			typeof message.name === "string" ? message.name.trim().slice(0, MAX_NAME_LENGTH) : undefined;
		const asString = (value: unknown) => (typeof value === "string" ? value : undefined);
		const rejoinPlayerId = asString(message.rejoinPlayerId);
		const rejoinToken = asString(message.rejoinToken);
		const claimPlayerId = asString(message.claimPlayerId);
		const seatExists = (id: string | undefined): id is string =>
			!!id && state.players.some((p) => p.id === id);
		const reject = (reason: "full" | "taken" | "unknown-seat") => {
			const rejected: ServerMessage = { type: "join-rejected", reason };
			sender.send(JSON.stringify(rejected));
		};

		// 1. The proven owner of a seat (matching secret) always gets it back —
		// even while a stale connection of theirs still sits in it. That's the
		// refresh case: the new socket can arrive before the server has noticed
		// the old one is gone.
		if (
			seatExists(rejoinPlayerId) &&
			rejoinToken &&
			this.seatTokens[rejoinPlayerId] === rejoinToken
		) {
			await this.takeSeat(sender, rejoinPlayerId, undefined, true);
			return;
		}

		// 2. An explicit pick from the join screen's seat list. No proof needed
		// (it's a friends' game, and an offline seat frees up for a newcomer
		// after the grace period anyway) — but never out from under a live
		// connection.
		if (claimPlayerId !== undefined) {
			if (!seatExists(claimPlayerId)) return reject("full");
			if (this.openPlayerIds().has(claimPlayerId)) return reject("taken");
			await this.takeSeat(sender, claimPlayerId, name || undefined, false);
			return;
		}

		// A rejoin that didn't check out (stale or foreign saved seat) must not
		// quietly fall through to being handed a seat with no name asked.
		if (rejoinPlayerId !== undefined || rejoinToken !== undefined) return reject("unknown-seat");

		// 3. Nobody chose: the very first joiner of a brand-new room (there was
		// no roster to pick from yet) gets the first seat nobody holds.
		const taken = this.takenPlayerIds();
		const freePlayerId = state.players.find((p) => !taken.has(p.id))?.id;
		if (!freePlayerId) return reject("full");
		await this.takeSeat(sender, freePlayerId, name || undefined, false);
	}

	/**
	 * Bind `sender` to a seat. `keepToken` is true for a proven owner coming
	 * back; anyone else gets a fresh secret, which also revokes the previous
	 * holder's ability to walk back in over them.
	 */
	async takeSeat(
		sender: Connection<ConnectionData>,
		playerId: PlayerId,
		name: string | undefined,
		keepToken: boolean,
	) {
		const wasClaimed = !!this.seatTokens[playerId];

		// Same seat, older connection (a refreshed or duplicate tab): close it
		// with a code the client knows means "you were replaced, don't reconnect".
		for (const other of this.getConnections<ConnectionData>()) {
			if (other.id !== sender.id && other.state?.playerId === playerId)
				other.close(REPLACED_CLOSE_CODE, "replaced");
		}
		this.heldSeats.delete(playerId);

		sender.setState({ playerId });
		// A silent rejoin doesn't re-prompt for a name, so it sends none — keep
		// whatever name that seat already has.
		if (this.state && name) {
			this.state = gameReducer(this.state, { type: "RENAME_PLAYER", playerId, name });
		}

		if (!keepToken || !this.seatTokens[playerId]) {
			this.seatTokens[playerId] = crypto.randomUUID();
			await this.ctx.storage.put(SEAT_TOKENS_KEY, this.seatTokens);
		}

		// Recomputed AFTER `setState` above, so it includes the seat this
		// connection just claimed.
		const occupiedSeats = this.takenPlayerIds().size;
		const joined: ServerMessage = {
			type: "joined",
			playerId,
			token: this.seatTokens[playerId],
			occupiedSeats,
			totalSeats: this.state?.players.length ?? occupiedSeats,
		};
		sender.send(JSON.stringify(joined));
		this.announce(wasClaimed ? "reconnected" : "joined", playerId, sender.id);
		this.broadcastRoster();

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
	handleCursor(
		sender: Connection<ConnectionData>,
		zoneId: ZoneId,
		position: { x: number; y: number },
	) {
		const playerId = sender.state?.playerId;
		if (!playerId || !this.state) return;
		if (typeof zoneId !== "string" || !this.state.zones[zoneId] || !isValidPosition(position))
			return;
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
