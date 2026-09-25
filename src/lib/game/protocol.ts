import type { BoardState, GameAction, PlayerId, Position, ZoneId } from "./types";

export interface RosterSeat {
	playerId: PlayerId;
	name: string;
	/** Someone has actually sat here (vs. a seat nobody has taken yet, still showing its default name). */
	claimed: boolean;
	/** A connection is bound to this seat right now. */
	online: boolean;
}

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
			/** If this browser previously held a seat (see storage.ts), the seat and the secret token the server gave it — a matching pair reclaims that seat even if the old connection is still open (a refresh can arrive before the server notices the old socket died). */
			rejoinPlayerId?: PlayerId;
			rejoinToken?: string;
			/** Explicit choice from the join screen's seat picker: sit in this seat (refused if someone is connected in it right now). */
			claimPlayerId?: PlayerId;
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
			/** Secret proving ownership of this seat — the client keeps it in localStorage and sends it back to rejoin. Never broadcast to anyone else. */
			token: string;
			/** Seat occupancy right after this join — lets the client decide e.g. whether it's still worth offering to invite more players (see InviteLinkOverlay.tsx). */
			occupiedSeats: number;
			totalSeats: number;
	  }
	/**
	 * "full": no seat available. "taken": the explicitly chosen seat has a live
	 * connection. "unknown-seat": a rejoin whose seat/secret didn't match
	 * (stale localStorage, another room's data) — deliberately NOT treated as a
	 * fresh join, so nobody is seated without choosing a seat and a name.
	 */
	| { type: "join-rejected"; reason: "full" | "taken" | "unknown-seat" }
	/**
	 * Who sits where and who is connected right now. Sent to every new
	 * connection (before it has joined, so the join screen can offer a seat
	 * picker) and to everyone whenever it changes. Contains no secrets.
	 */
	| { type: "roster"; seats: RosterSeat[] }
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
