"use client";

import { useGameDispatch } from "./GameProvider";

export function Toolbar() {
  const dispatch = useGameDispatch();

  function handleNewGame() {
    dispatch({ type: "RESET_BOARD" });
    dispatch({ type: "SHUFFLE_ZONE", zoneId: "deck" });
  }

  function handleResetBoard() {
    dispatch({ type: "RESET_BOARD" });
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={handleNewGame}
        className="rounded-full bg-foreground px-4 py-2 text-sm text-background transition-colors hover:opacity-90"
      >
        New Game
      </button>
      <button
        type="button"
        onClick={handleResetBoard}
        className="rounded-full border border-black/20 px-4 py-2 text-sm transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
      >
        Reset Board
      </button>
    </div>
  );
}
