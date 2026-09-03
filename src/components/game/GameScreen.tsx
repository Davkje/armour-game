"use client";

import { Board } from "./Board";
import { GameProvider } from "./GameProvider";
import { Toolbar } from "./Toolbar";

export function GameScreen() {
  return (
    <GameProvider>
      <div className="flex flex-1 flex-col items-center gap-4 p-6">
        <Toolbar />
        <Board />
      </div>
    </GameProvider>
  );
}
