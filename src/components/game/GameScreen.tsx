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
			<RoundTracker />
			<MenuDrawer />
		</GameProvider>
	);
}
