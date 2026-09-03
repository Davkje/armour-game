"use client";

import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { buildInitialState } from "@/lib/game/initialState";
import { gameReducer } from "@/lib/game/reducer";
import type { BoardState, GameAction } from "@/lib/game/types";

const GameStateContext = createContext<BoardState | null>(null);
const GameDispatchContext = createContext<Dispatch<GameAction> | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, buildInitialState);

  return (
    <GameStateContext.Provider value={state}>
      <GameDispatchContext.Provider value={dispatch}>{children}</GameDispatchContext.Provider>
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
