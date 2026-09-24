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
			// `key={gameId}` forces a full remount whenever the URL's gameId
			// changes — otherwise navigating client-side from one /game/[gameId]
			// route straight to another (same tab, no hard reload — e.g. someone
			// re-pastes a fresh invite link over an already-open game) reuses the
			// SAME OnlineGameProvider instance, leaving its refs (in particular
			// the "which playerId did I claim" ref that drives silent auto-rejoin)
			// pointed at the PREVIOUS room. Since player ids are just "player-1",
			// "player-2", etc. — not globally unique — that stale id can happen
			// to also exist in the new room, silently auto-rejoining that seat
			// and skipping the name prompt entirely instead of asking who you are.
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
