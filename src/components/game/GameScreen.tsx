"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Board } from "./Board";
import { GameProvider } from "./GameProvider";
import { MenuDrawer } from "./MenuDrawer";
import { PlayerSwitcher } from "./PlayerSwitcher";
import { RoundTracker } from "./RoundTracker";

function GameScreenInner({ gameId }: { gameId: string }) {
	// Set on the homepage's local player-count/name form, e.g.
	// /game/abc123?players=3&name=Alice&name=Bob&name=Carl — only used the
	// first time this gameId is played; a resumed game (loaded from
	// localStorage in GameProvider) ignores these and keeps its own players.
	const searchParams = useSearchParams();
	const playerCount = Number(searchParams.get("players")) || 2;
	const playerNames = searchParams.getAll("name");

	return (
		<GameProvider gameId={gameId} playerCount={playerCount} playerNames={playerNames}>
			<div className="flex flex-1 flex-col items-center gap-3 p-3">
				<Board />
			</div>
			<RoundTracker />
			<PlayerSwitcher />
			<MenuDrawer />
		</GameProvider>
	);
}

export function GameScreen({ gameId }: { gameId: string }) {
	return (
		<Suspense>
			<GameScreenInner gameId={gameId} />
		</Suspense>
	);
}
