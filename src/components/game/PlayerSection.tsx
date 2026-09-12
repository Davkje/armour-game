"use client";

import { EquippedItems } from "./EquippedItems";
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
	const handCardCount = cardsByZone(`${player.id}-hand`).length;

	return (
		<div
			className={`relative ${
				isActive
					? "order-3 basis-full flex flex-col gap-1"
					: "order-1 flex flex-col grow gap-1 ease-in transition-opacity"
			}`}
		>
			<span className={`absolute -top-3.5 left-3 z-10 bg-background px-2 max-w-min text-lg`}>
				{player.name}
				{isActive && <span className="ml-2 text-sm font-normal text-black/50">(Active)</span>}
			</span>
			<div className="flex gap-3">
				<EquippedItems
					zones={equippedSlotIds(player.id).map((id) => zones[id])}
					cardsByZone={cardsByZone}
					onZoom={onZoom}
				/>
				<div
					className={
						isActive
							? "grid w-full min-w-0 grid-rows-2 gap-3"
							: "flex grow flex-col gap-3 min-w-(--card-width)"
					}
				>
					<div className="relative h-full">
						<Zone
							zone={zones[`${player.id}-area`]}
							cards={cardsByZone(`${player.id}-area`)}
							tokens={tokensByZone(`${player.id}-area`)}
							onZoom={onZoom}
						/>
						{!isActive && (
							<span
								title="Cards in hand"
								className="absolute right-2 bottom-2 rounded-sm bg-black/10 px-2 py-0.5 text-md font-bold text-black"
							>
								Hand: {handCardCount}
							</span>
						)}
					</div>
					{isActive && (
						<Zone
							zone={zones[`${player.id}-hand`]}
							cards={cardsByZone(`${player.id}-hand`)}
							onZoom={onZoom}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
