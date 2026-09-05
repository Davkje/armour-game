"use client";

import { Board } from "./Board";
import { GameProvider } from "./GameProvider";
import { MenuDrawer } from "./MenuDrawer";
import { RoundTracker } from "./RoundTracker";

export function GameScreen() {
	return (
		<GameProvider>
			<div className="flex flex-1 flex-col items-center gap-4 p-6">
				<Board />
			</div>
			{/*
			 * Token menu (bottom-left, for placing condition tokens once that
			 * feature exists) — still a static placeholder, not wired up yet.
			 */}
			<button
				type="button"
				aria-label="Token menu"
				className="fixed bottom-4 left-4 flex h-10 w-10 items-center justify-center rounded-md bg-black text-white"
			>
				C
			</button>
			<RoundTracker />
			<MenuDrawer />
		</GameProvider>
	);
}
