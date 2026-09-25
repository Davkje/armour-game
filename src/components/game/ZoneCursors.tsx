"use client";

import { RiCursorFill } from "@remixicon/react";
import { useCursors, useGameState } from "./GameContext";
import { playerColor } from "@/lib/game/playerColors";
import type { ZoneId } from "@/lib/game/types";

export function ZoneCursors({ zoneId }: { zoneId: ZoneId }) {
	const { cursors } = useCursors();
	const state = useGameState();

	return (
		<>
			{Object.entries(cursors).map(([playerId, cursor]) => {
				if (cursor.zoneId !== zoneId) return null;
				const playerIndex = state.players.findIndex((p) => p.id === playerId);
				if (playerIndex === -1) return null;
				const color = playerColor(playerIndex);

				return (
					<div
						key={playerId}
						className="pointer-events-none absolute z-50 flex items-center transition-[left,top] duration-75 ease-linear"
						style={{ left: `${cursor.position.x * 100}%`, top: `${cursor.position.y * 100}%` }}
					>
						<RiCursorFill style={{ fill: color }} />
						<span
							className="rounded px-1.5 py-0.5 text-sm whitespace-nowrap text-white"
							style={{ backgroundColor: color }}
						>
							{state.players[playerIndex].name}
						</span>
					</div>
				);
			})}
		</>
	);
}
