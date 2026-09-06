"use client";

import { Zone } from "./Zone";
import type { BoardCard, CardId, Zone as ZoneType } from "@/lib/game/types";

export function PlayerBoard({
	zones,
	cardsByZone,
	onZoom,
}: {
	zones: ZoneType[];
	cardsByZone: (zoneId: string) => BoardCard[];
	onZoom: (cardId: CardId) => void;
}) {
	const [head, top, legs, handMain, handOff, extra] = zones;

	return (
		<div className="relative rounded-xl border-2 border-black/10 p-3 shrink-0">
			<span className="pointer-events-none absolute -bottom-2 left-2 bg-background px-1 text-xs text-black/50 rounded-sm">
				Equiped Items
			</span>
			<div className="grid grid-cols-3 gap-4 h-full">
				<Zone zone={head} cards={cardsByZone(head.id)} onZoom={onZoom} />
				<Zone zone={top} cards={cardsByZone(top.id)} onZoom={onZoom} />
				<Zone zone={legs} cards={cardsByZone(legs.id)} onZoom={onZoom} />
				<Zone zone={handMain} cards={cardsByZone(handMain.id)} onZoom={onZoom} />
				<Zone zone={handOff} cards={cardsByZone(handOff.id)} onZoom={onZoom} />
				<Zone zone={extra} cards={cardsByZone(extra.id)} onZoom={onZoom} />
			</div>
		</div>
	);
}
