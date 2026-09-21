import type * as Party from "partykit/server";
import { buildInitialState } from "../src/lib/game/initialState";
import { gameReducer } from "../src/lib/game/reducer";
import type { ClientMessage, ServerMessage } from "../src/lib/game/protocol";
import type { BoardState, GameAction, PlayerId, ZoneId } from "../src/lib/game/types";

const STORAGE_KEY = "state";

// A refresh/network blip shouldn't evict someone from their own hand — a
// disconnected player's seat is held for this long before it's released for
// someone else to claim. Exact duration is a judgment call, not a hard
// requirement; adjust freely.
const DISCONNECT_GRACE_MS = 60_000;

type ConnectionState = { playerId: PlayerId };

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

export default class GameServer implements Party.Server {
	constructor(readonly room: Party.Room) {}

	state: BoardState | undefined;
	/** playerId -> pending "free this seat" timer, only set while disconnected within the grace window. */
	disconnectTimers = new Map<PlayerId, ReturnType<typeof setTimeout>>();

	async onStart() {
		this.state = (await this.room.storage.get<BoardState>(STORAGE_KEY)) ?? undefined;
	}

	// No onConnect handler needed — a connection isn't bound to a player (and
	// gets no state) until its first "join" message arrives, via onMessage.

	async onMessage(raw: string, sender: Party.Connection<ConnectionState>) {
		let message: ClientMessage;
		try {
			message = JSON.parse(raw) as ClientMessage;
		} catch {
			return;
		}

		if (message.type === "join") {
			await this.handleJoin(message, sender);
			return;
		}

		if (message.type === "action") {
			await this.handleAction(sender, message.action);
			return;
		}

		if (message.type === "cursor") {
			this.handleCursor(sender, message.zoneId, message.position);
		}
	}

	async onClose(connection: Party.Connection<ConnectionState>) {
		const playerId = connection.state?.playerId;
		if (!playerId) return;

		// Grace period: only free the seat if nobody reclaims it in time.
		const timer = setTimeout(() => {
			this.disconnectTimers.delete(playerId);
			// Freeing a seat is implicit — claimedPlayerIds() below only counts
			// playerIds with a currently-open connection, so once this
			// connection is gone (already true by the time onClose fired) and
			// the timer elapses without a reconnect, the seat is simply free
			// again with no further bookkeeping needed.
		}, DISCONNECT_GRACE_MS);
		this.disconnectTimers.set(playerId, timer);
	}

	/** playerIds currently bound to an open connection (i.e. genuinely taken, not just mid-grace-period). */
	claimedPlayerIds(): Set<PlayerId> {
		const claimed = new Set<PlayerId>();
		for (const connection of this.room.getConnections<ConnectionState>()) {
			if (connection.state?.playerId) claimed.add(connection.state.playerId);
		}
		return claimed;
	}

	async handleJoin(
		message: Extract<ClientMessage, { type: "join" }>,
		sender: Party.Connection<ConnectionState>,
	) {
		if (!this.state) {
			this.state = buildInitialState(message.playerCount);
			await this.persist();
		}

		const claimed = this.claimedPlayerIds();

		// Rejoining a seat you already held (e.g. after a refresh) — cancel its
		// pending free-timer if the grace period hasn't expired yet.
		if (message.rejoinPlayerId && !claimed.has(message.rejoinPlayerId)) {
			const stillExists = this.state.players.some((p) => p.id === message.rejoinPlayerId);
			if (stillExists) {
				this.bindAndConfirm(sender, message.rejoinPlayerId, undefined);
				return;
			}
		}

		const freePlayerId = this.state.players.find((p) => !claimed.has(p.id))?.id;
		if (!freePlayerId) {
			const rejected: ServerMessage = { type: "join-rejected", reason: "full" };
			sender.send(JSON.stringify(rejected));
			return;
		}

		this.bindAndConfirm(sender, freePlayerId, message.name);
	}

	bindAndConfirm(sender: Party.Connection<ConnectionState>, playerId: PlayerId, name: string | undefined) {
		const pendingFree = this.disconnectTimers.get(playerId);
		if (pendingFree) {
			clearTimeout(pendingFree);
			this.disconnectTimers.delete(playerId);
		}

		sender.setState({ playerId });
		// An auto-rejoin (see OnlineGameProvider.tsx) doesn't re-prompt for a
		// name, so it sends none — keep whatever name that seat already has.
		if (this.state && name) {
			this.state = gameReducer(this.state, { type: "RENAME_PLAYER", playerId, name });
		}

		const joined: ServerMessage = { type: "joined", playerId };
		sender.send(JSON.stringify(joined));

		this.persistAndBroadcast();
	}

	async handleAction(sender: Party.Connection<ConnectionState>, action: GameAction) {
		const playerId = sender.state?.playerId;
		if (!playerId || !this.state) return;

		this.state = gameReducer(this.state, action);
		await this.persistAndBroadcast();
	}

	// Pure relay — never touches `this.state`/`room.storage`. A stray cursor
	// message from a connection that hasn't joined yet (no bound playerId) is
	// just dropped.
	handleCursor(sender: Party.Connection<ConnectionState>, zoneId: ZoneId, position: { x: number; y: number }) {
		const playerId = sender.state?.playerId;
		if (!playerId) return;
		const message: ServerMessage = { type: "cursor", playerId, zoneId, position };
		this.room.broadcast(JSON.stringify(message), [sender.id]);
	}

	async persist() {
		if (this.state) await this.room.storage.put(STORAGE_KEY, this.state);
	}

	async persistAndBroadcast() {
		await this.persist();
		if (!this.state) return;
		for (const connection of this.room.getConnections<ConnectionState>()) {
			const viewerId = connection.state?.playerId;
			if (!viewerId) continue;
			const message: ServerMessage = { type: "state", state: redactForViewer(this.state, viewerId) };
			connection.send(JSON.stringify(message));
		}
	}
}
