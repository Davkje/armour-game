"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Board } from "./Board";
import { GameProvider } from "./GameProvider";
import { MenuDrawer } from "./MenuDrawer";
import { NotesPanel } from "./NotesPanel";
import { OnlineGameProvider } from "./OnlineGameProvider";
import { PlayerSwitcher } from "./PlayerSwitcher";
import { RoundTracker } from "./RoundTracker";
import DiceRoller from "./DiceRoller";

const GAME_TREE = (
	<>
		<div className="flex flex-1 flex-col items-center gap-3 p-3">
			<Board />
		</div>
		<div className="fixed bottom-4 left-16 right-4 z-30 flex h-10 items-end gap-2">
			<NotesPanel />
			<div className="ml-auto flex h-10 shrink-0 items-end gap-2">
				<DiceRoller />
				<RoundTracker />
			</div>
		</div>
		<PlayerSwitcher />
		<MenuDrawer />
	</>
);

function GameScreenInner({ gameId }: { gameId: string }) {
	const searchParams = useSearchParams();
	const playerCount = Number(searchParams.get("players")) || 2;

	if (searchParams.get("mode") === "online") {
		return (
			<OnlineGameProvider key={gameId} gameId={gameId} playerCount={playerCount}>
				{GAME_TREE}
			</OnlineGameProvider>
		);
	}

	const playerNames = searchParams.getAll("name");
	return (
		<GameProvider key={gameId} gameId={gameId} playerCount={playerCount} playerNames={playerNames}>
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
