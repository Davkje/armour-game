"use client";

import { PlayerBoard } from "./PlayerBoard";
import { Zone } from "./Zone";
import { equippedSlotIds } from "@/lib/game/initialState";
import type { BoardCard, BoardToken, CardId, Player, Zone as ZoneType } from "@/lib/game/types";

export function PlayerSection({
	player,
	isActive,
	zones,
	cardsByZone,
	tokensByZone,
	onZoom,
}: {
	player: Player;
	isActive: boolean;
	zones: Record<string, ZoneType>;
	cardsByZone: (zoneId: string) => BoardCard[];
	tokensByZone: (zoneId: string) => BoardToken[];
	onZoom: (cardId: CardId) => void;
}) {
	// `order`/`basis-full` (CSS only) instead of conditionally placing this in
	// a different JSX block keep it mounted in the same spot in the tree
	// across active-player switches — only props change (isActive, hideHand),
	// nothing remounts. That matters: dnd-kit's drag/drop registration for a
	// zone's cards is tied to that zone staying mounted, so remounting every
	// zone on every switch was the likely cause of drops intermittently
	// failing right after switching players.
	return (
		<div
			className={
				isActive
					? "order-3 basis-full"
					: "order-1 flex flex-col gap-2 rounded-xl border-2 border-black/10 p-3 opacity-80 grow"
			}
		>
			{!isActive && <span className="text-xs font-semibold text-black/50">{player.name}</span>}
			<div className="flex gap-4">
				<PlayerBoard
					zones={equippedSlotIds(player.id).map((id) => zones[id])}
					cardsByZone={cardsByZone}
					onZoom={onZoom}
				/>
				<div
					className={
						isActive
							? "grid w-full min-w-0 grid-rows-2 gap-4"
							: "flex grow flex-col gap-4 min-w-(--card-width)"
					}
				>
					<Zone
						zone={zones[`${player.id}-area`]}
						cards={cardsByZone(`${player.id}-area`)}
						tokens={tokensByZone(`${player.id}-area`)}
						onZoom={onZoom}
					/>
					<Zone
						zone={zones[`${player.id}-hand`]}
						cards={cardsByZone(`${player.id}-hand`)}
						hideHand={!isActive}
						onZoom={onZoom}
					/>
				</div>
			</div>
		</div>
	);
}
