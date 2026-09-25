import type { BoardState, GameAction, PlayerId, Position, ZoneId } from "./types";

/**
 * The WebSocket message shapes shared between the client (OnlineGameProvider,
 * OnlineJoinScreen) and the PartyKit room server (party/index.ts) — kept in
 * one place so both ends type-check against the exact same contract.
 */
export type ClientMessage =
	| {
			type: "join";
			/** Omitted on an auto-rejoin (see OnlineGameProvider.tsx) — a returning connection keeps its seat's existing name rather than re-prompting. */
			name?: string;
			/** Only used the first time anyone joins this room — decides how many player slots the room has. Ignored once the room already has state. */
			playerCount: number;
			/** If this connection previously held a seat (see storage.ts's local persistence), try to reclaim it instead of taking a fresh one. */
			rejoinPlayerId?: PlayerId;
	  }
	| { type: "action"; action: GameAction }
	/**
	 * Live pointer position, as a fraction (0-1) of whichever zone's own
	 * container it's currently over (see Zone.tsx) — the same "zone-local,
	 * not page-absolute" convention card/token positions already use, and for
	 * the same reason: which zone renders where (e.g. "my board" vs. "another
	 * player's board") differs per viewer, so a page-relative fraction would
	 * point at the wrong spot on someone else's screen. Purely a presence
	 * signal — never touches BoardState or room.storage; the server just
	 * relays it to everyone else.
	 */
	| { type: "cursor"; zoneId: ZoneId; position: Position };

export type ServerMessage =
	| {
			type: "joined";
			playerId: PlayerId;
			/** Seat occupancy right after this join — lets the client decide e.g. whether it's still worth offering to invite more players (see InviteLinkOverlay.tsx). */
			occupiedSeats: number;
			totalSeats: number;
	  }
	| { type: "join-rejected"; reason: "full" }
	/**
	 * Someone else's connection changed (never sent to the player it's about).
	 * "disconnected" covers both closing the tab and a network drop — the server
	 * can't tell them apart — and their seat is held for a grace period, so it's
	 * usually followed by "reconnected".
	 */
	| {
			type: "presence";
			event: "joined" | "reconnected" | "disconnected";
			playerId: PlayerId;
			name: string;
	  }
	| { type: "state"; state: BoardState }
	| { type: "cursor"; playerId: PlayerId; zoneId: ZoneId; position: Position };
