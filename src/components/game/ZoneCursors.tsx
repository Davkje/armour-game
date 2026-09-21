"use client";

import { useCursors, useGameState } from "./GameContext";
import type { ZoneId } from "@/lib/game/types";

// Cycles by player index — good enough until/unless the game ever wants a
// stable per-player color (see AGENTS.md; no such concept exists yet).
const CURSOR_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b"];

/**
 * Other online players' live pointer position, rendered only while it's
 * reported to be over THIS zone (see Zone.tsx, which renders one of these
 * per zone and also sends our own position the same zone-relative way) —
 * that keeps it correct regardless of where this particular zone happens to
 * be laid out on any given viewer's own screen (e.g. "my board" renders big
 * at the bottom for me, but as someone else's small "other player" section
 * for everyone else — see PlayerSection.tsx). Renders nothing in Local mode,
 * since `useCursors()` always returns an empty map there.
 */
export function ZoneCursors({ zoneId }: { zoneId: ZoneId }) {
	const { cursors } = useCursors();
	const state = useGameState();

	return (
		<>
			{Object.entries(cursors).map(([playerId, cursor]) => {
				if (cursor.zoneId !== zoneId) return null;
				const playerIndex = state.players.findIndex((p) => p.id === playerId);
				if (playerIndex === -1) return null;
				const color = CURSOR_COLORS[playerIndex % CURSOR_COLORS.length];

				return (
					<div
						key={playerId}
						className="pointer-events-none absolute z-50 flex items-center gap-1 transition-[left,top] duration-75 ease-linear"
						style={{ left: `${cursor.position.x * 100}%`, top: `${cursor.position.y * 100}%` }}
					>
						<svg
							width="18"
							height="18"
							viewBox="0 0 20 20"
							className="-translate-x-0.5 -translate-y-0.5"
						>
							<path
								d="M2 2 L2 17 L6.5 13 L9 18.5 L11.7 17.2 L9.2 12 L15.5 12 Z"
								fill={color}
								stroke="white"
								strokeWidth="1.2"
								strokeLinejoin="round"
							/>
						</svg>
						<span
							className="rounded px-1.5 py-0.5 text-xs whitespace-nowrap text-white"
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
