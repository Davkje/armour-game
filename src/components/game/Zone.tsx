"use client";

import Image from "next/image";
import { useDroppable } from "@dnd-kit/react";
import { Card } from "./Card";
import { CARD_WIDTH } from "@/lib/game/constants";
import type { BoardCard, CardId, Zone as ZoneType } from "@/lib/game/types";

export function Zone({
	zone,
	cards,
	onZoom,
}: {
	zone: ZoneType;
	cards: BoardCard[];
	onZoom: (cardId: CardId) => void;
}) {
	// `accept: "card"` keeps a dragged condition token from colliding with the
	// zone itself — it should only ever land on the card underneath it.
	const { ref, isDropTarget } = useDroppable({ id: zone.id, accept: "card" });
	const sorted = [...cards].sort((a, b) => a.order - b.order);
	// Stack/slot zones pile cards on top of each other — only the top one
	// should be clickable/draggable, not whatever's buried underneath it.
	const isPile = zone.layout === "stack" || zone.layout === "slot";

	if (zone.layout === "slot") {
		return (
			<div
				ref={ref}
				style={{ width: "var(--card-width)", height: "var(--card-height)" }}
				className={`relative place-self-center justify-self-center rounded-lg border ${
					isDropTarget ? "border-black/40 bg-black/10" : "border-black/10 bg-black/4"
				}`}
			>
				{zone.icon ? (
					<Image
						src={zone.icon}
						alt=""
						width={CARD_WIDTH * 0.1}
						height={CARD_WIDTH * 0.1}
						className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-25"
					/>
				) : (
					<span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs tracking-wide text-black/40 uppercase">
						{zone.label}
					</span>
				)}
				{sorted.map((card, i) => (
					<Card
						key={card.id}
						card={card}
						zone={zone}
						stackIndex={i}
						interactive={!isPile || i === sorted.length - 1}
						onZoom={onZoom}
					/>
				))}
			</div>
		);
	}

	return (
		<div
			className={`relative min-w-0 rounded-lg border-2 p-3 transition-colors ease duration-100 ${
				isDropTarget ? "border-black/40 bg-black/5" : "border-black/10"
			}`}
		>
			<span className="pointer-events-none absolute -bottom-2 left-2 bg-background px-1 text-xs text-black/50 rounded-sm">
				{zone.label}
			</span>

			<div
				ref={ref}
				style={{
					minHeight: "var(--card-height)",
					// "stack" zones (decks/discard) get an explicit width matching
					// the card, so the bordered box hugs the pile instead of
					// stretching to fill the flex row's available space — "free"/
					// "row" zones (Table/Player Area/Hand) still stretch, since
					// those need the extra room.
					width: zone.layout === "stack" ? "var(--card-width)" : undefined,
				}}
				className={`relative ${
					zone.layout === "row" ? "flex items-center gap-2 overflow-x-auto" : ""
				}`}
			>
				{sorted.map((card, i) => (
					<Card
						key={card.id}
						card={card}
						zone={zone}
						stackIndex={i}
						interactive={!isPile || i === sorted.length - 1}
						onZoom={onZoom}
					/>
				))}
			</div>
		</div>
	);
}
