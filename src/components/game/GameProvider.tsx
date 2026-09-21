"use client";

import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { buildInitialState } from "@/lib/game/initialState";
import { gameReducer } from "@/lib/game/reducer";
import { loadActivePlayerId, loadGameState, saveActivePlayerId, saveGameState } from "@/lib/game/storage";
import type { PlayerId } from "@/lib/game/types";
import { ActivePlayerContext, GameDispatchContext, GameStateContext } from "./GameContext";

/**
 * Local (hotseat) mode's implementation of the shared GameContext interface —
 * a plain useReducer, persisted to this browser's own localStorage. See
 * OnlineGameProvider.tsx for the PartyKit-backed sibling that populates the
 * exact same contexts. GameModeContext isn't provided here — its default
 * ("local") from GameContext.tsx is already correct.
 */
export function GameProvider({
	children,
	gameId,
	playerCount = 2,
	playerNames,
}: {
	children: ReactNode;
	gameId: string;
	playerCount?: number;
	playerNames?: string[];
}) {
	const [state, dispatch] = useReducer(
		gameReducer,
		{ playerCount, playerNames },
		({ playerCount, playerNames }) => buildInitialState(playerCount, playerNames),
	);
	const activePlayerState = useState<PlayerId | undefined>(state.players[0]?.id);
	const [activePlayerId, setActivePlayerId] = activePlayerState;

	// localStorage isn't available during the server render, so a saved game
	// can only be restored client-side, after mount — the very first render
	// always shows a fresh board (matching the server-rendered HTML, no
	// hydration mismatch), then swaps in the save a moment later if one
	// exists for this gameId. activePlayerId is saved/restored the same way,
	// separately from BoardState (see storage.ts — it's deliberately not part
	// of the game state), so a reload doesn't visually reset whose turn it is.
	//
	// The save effect below must skip its very first run — at that point
	// `state`/`activePlayerId` are still the pre-restore fresh values (the
	// dispatch/setActivePlayerId from the effect above haven't landed yet),
	// so saving there would overwrite a real save with an empty one before
	// it's ever restored.
	const hasMountedRef = useRef(false);

	useEffect(() => {
		const savedState = loadGameState(gameId);
		if (savedState) dispatch({ type: "LOAD_STATE", state: savedState });

		const savedActivePlayerId = loadActivePlayerId(gameId);
		// Syncing in an external value (localStorage) on mount is exactly the
		// sanctioned use of setState-in-an-effect — there's no reducer here to
		// dispatch into for this one, it's a plain useState pair.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		if (savedActivePlayerId) setActivePlayerId(savedActivePlayerId);
	}, [gameId, setActivePlayerId]);

	useEffect(() => {
		if (!hasMountedRef.current) {
			hasMountedRef.current = true;
			return;
		}
		saveGameState(gameId, state);
		if (activePlayerId) saveActivePlayerId(gameId, activePlayerId);
	}, [gameId, state, activePlayerId]);

	return (
		<GameStateContext.Provider value={state}>
			<GameDispatchContext.Provider value={dispatch}>
				<ActivePlayerContext.Provider value={activePlayerState}>
					{children}
				</ActivePlayerContext.Provider>
			</GameDispatchContext.Provider>
		</GameStateContext.Provider>
	);
}
