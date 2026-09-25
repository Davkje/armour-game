"use client";

import { createContext, useContext, type Dispatch } from "react";
import type { RosterSeat } from "@/lib/game/protocol";
import type { BoardState, GameAction, PlayerId, Position, ZoneId } from "@/lib/game/types";

/**
 * The interface boundary between "how state is produced" and every
 * component that reads/mutates it. Board.tsx, Zone.tsx, Card.tsx, etc. only
 * ever consume the hooks below — they never know or care whether they're
 * inside the Local provider (GameProvider.tsx, a useReducer + localStorage)
 * or the Online one (OnlineGameProvider.tsx, a PartyKit WebSocket). Both
 * providers populate these same three contexts, plus GameModeContext, so
 * consuming components need zero Local/Online branching.
 */
export const GameStateContext = createContext<BoardState | null>(null);
export const GameDispatchContext = createContext<Dispatch<GameAction> | null>(null);
export const ActivePlayerContext = createContext<
	[PlayerId | undefined, (id: PlayerId) => void] | null
>(null);

export type GameMode = "local" | "online";
/** Defaults to "local" — only the Online provider overrides it. Used for the rare, deliberate exception where a component IS inherently mode-specific (e.g. PlayerSwitcher.tsx, the hotseat-only "Change Player" button). */
export const GameModeContext = createContext<GameMode>("local");

export function useGameState() {
	const state = useContext(GameStateContext);
	if (!state) throw new Error("useGameState must be used within a GameProvider");
	return state;
}

export function useGameDispatch() {
	const dispatch = useContext(GameDispatchContext);
	if (!dispatch) throw new Error("useGameDispatch must be used within a GameProvider");
	return dispatch;
}

export function useActivePlayerId() {
	const context = useContext(ActivePlayerContext);
	if (!context) throw new Error("useActivePlayerId must be used within a GameProvider");
	return context;
}

export function useGameMode() {
	return useContext(GameModeContext);
}

/**
 * Other players' live pointer positions (see Zone.tsx/OnlineGameProvider.tsx)
 * — a presence feature, not game state, so it's a separate context rather
 * than living on BoardState: it never goes through gameReducer, is never
 * persisted, and Local mode has no other players to show anyway. Each
 * cursor's position is a fraction of whichever zone it was last seen over
 * (zone-local, like card.position) rather than page-relative — see
 * protocol.ts's ClientMessage "cursor" case for why. Defaults to "nobody,
 * and sending is a no-op," which is exactly correct for Local mode — only
 * OnlineGameProvider overrides it.
 */
export const CursorContext = createContext<{
	cursors: Record<PlayerId, { zoneId: ZoneId; position: Position }>;
	sendCursor: (zoneId: ZoneId, position: Position) => void;
}>({ cursors: {}, sendCursor: () => {} });

export function useCursors() {
	return useContext(CursorContext);
}

/**
 * Who is connected right now (Online mode only — see OnlineGameProvider.tsx).
 * Empty in Local mode, where there is nothing to be online or offline.
 */
export const RosterContext = createContext<RosterSeat[]>([]);

export function useRoster() {
	return useContext(RosterContext);
}
