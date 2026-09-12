"use client";

import {
	createContext,
	useContext,
	useEffect,
	useReducer,
	useRef,
	useState,
	type Dispatch,
	type ReactNode,
} from "react";
import { buildInitialState } from "@/lib/game/initialState";
import { gameReducer } from "@/lib/game/reducer";
import { loadActivePlayerId, loadGameState, saveActivePlayerId, saveGameState } from "@/lib/game/storage";
import type { BoardState, GameAction, PlayerId } from "@/lib/game/types";

const GameStateContext = createContext<BoardState | null>(null);
const GameDispatchContext = createContext<Dispatch<GameAction> | null>(null);
const ActivePlayerContext = createContext<[PlayerId | undefined, (id: PlayerId) => void] | null>(
	null,
);

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
