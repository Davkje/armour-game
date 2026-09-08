"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Board } from "./Board";
import { GameProvider } from "./GameProvider";
import { MenuDrawer } from "./MenuDrawer";
import { PlayerSwitcher } from "./PlayerSwitcher";
import { RoundTracker } from "./RoundTracker";

function GameScreenInner() {
	// Set on the homepage's local player-count picker, e.g. /game?players=3 —
	// buildInitialState clamps it to the 2-4 range that picker offers.
	const searchParams = useSearchParams();
	const playerCount = Number(searchParams.get("players")) || 2;

	return (
		<GameProvider playerCount={playerCount}>
			<div className="flex flex-1 flex-col items-center gap-4 p-3">
				<Board />
			</div>
			<RoundTracker />
			<PlayerSwitcher />
			<MenuDrawer />
		</GameProvider>
	);
}

export function GameScreen() {
	return (
		<Suspense>
			<GameScreenInner />
		</Suspense>
	);
}
