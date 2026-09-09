"use client";

import {
	createContext,
	useContext,
	useReducer,
	useState,
	type Dispatch,
	type ReactNode,
} from "react";
import { buildInitialState } from "@/lib/game/initialState";
import { gameReducer } from "@/lib/game/reducer";
import type { BoardState, GameAction, PlayerId } from "@/lib/game/types";

const GameStateContext = createContext<BoardState | null>(null);
const GameDispatchContext = createContext<Dispatch<GameAction> | null>(null);
const ActivePlayerContext = createContext<[PlayerId | undefined, (id: PlayerId) => void] | null>(
	null,
);

export function GameProvider({
	children,
	playerCount = 2,
	playerNames,
}: {
	children: ReactNode;
	playerCount?: number;
	playerNames?: string[];
}) {
	const [state, dispatch] = useReducer(
		gameReducer,
		{ playerCount, playerNames },
		({ playerCount, playerNames }) => buildInitialState(playerCount, playerNames),
	);
	const activePlayerState = useState<PlayerId | undefined>(state.players[0]?.id);

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
