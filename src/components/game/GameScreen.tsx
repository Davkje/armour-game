"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Board } from "./Board";
import { GameProvider } from "./GameProvider";
import { MenuDrawer } from "./MenuDrawer";
import { OnlineGameProvider } from "./OnlineGameProvider";
import { PlayerSwitcher } from "./PlayerSwitcher";
import { RoundTracker } from "./RoundTracker";

const GAME_TREE = (
	<>
		<div className="flex flex-1 flex-col items-center gap-3 p-3">
			<Board />
		</div>
		<RoundTracker />
		<PlayerSwitcher />
		<MenuDrawer />
	</>
);

// The one place in the whole component tree that branches on Local vs
// Online — every component under either provider (Board, Zone, Card, ...)
// only ever consumes the shared hooks in GameContext.tsx and stays
// completely mode-agnostic. See AGENTS.md's Multiplayer State Model.
function GameScreenInner({ gameId }: { gameId: string }) {
	const searchParams = useSearchParams();
	const playerCount = Number(searchParams.get("players")) || 2;

	if (searchParams.get("mode") === "online") {
		return (
			<OnlineGameProvider gameId={gameId} playerCount={playerCount}>
				{GAME_TREE}
			</OnlineGameProvider>
		);
	}

	const playerNames = searchParams.getAll("name");
	return (
		<GameProvider gameId={gameId} playerCount={playerCount} playerNames={playerNames}>
			{GAME_TREE}
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
