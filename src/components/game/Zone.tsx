"use client";

import Image from "next/image";
import { useDroppable } from "@dnd-kit/react";
import { Card } from "./Card";
import { GoldToken } from "./GoldToken";
import { useActivePlayerId } from "./GameProvider";
import { CARD_WIDTH } from "@/lib/game/constants";
import type { BoardCard, BoardToken, CardId, Zone as ZoneType } from "@/lib/game/types";

export function Zone({
	zone,
	cards,
	tokens = [],
	onZoom,
	className = "",
}: {
	zone: ZoneType;
	cards: BoardCard[];
	tokens?: BoardToken[];
	onZoom: (cardId: CardId) => void;
	className?: string;
}) {
	const [activePlayerId] = useActivePlayerId();
	// Zones with no owner (decks, discard, quest deck) are shared/public —
	// always interactive. A zone owned by a player is only a valid drop
	// target while that player is the active one (see AGENTS.md's note on
	// local hotseat testing) — you can't move cards onto someone else's
	// board just because you can currently see it.
	const isLockedToOtherPlayer = zone.ownerId !== undefined && zone.ownerId !== activePlayerId;
	const { ref, isDropTarget } = useDroppable({
		id: zone.id,
		accept: zone.layout === "free" ? ["card", "board-token"] : "card",
		disabled: isLockedToOtherPlayer,
	});
	const sorted = [...cards].sort((a, b) => a.order - b.order);

	const isPile = zone.layout === "stack" || zone.layout === "slot";

	if (zone.layout === "slot") {
		return (
			<div
				ref={ref}
				style={{ width: "var(--card-width)", height: "var(--card-height)" }}
				className={`relative place-self-center justify-self-center rounded-sm ${
					isDropTarget ? "bg-black/10" : "bg-black/4"
				} ${className}`}
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
			className={`relative min-w-0 h-full rounded-lg border-2 p-3 transition-colors ease duration-100 ${
				isDropTarget ? "border-black/40 bg-black/5" : "border-black/10"
			} ${className}`}
		>
			<span className="pointer-events-none absolute -bottom-2 left-2 bg-background px-1 text-xs text-black/50 rounded-sm">
				{zone.label}
			</span>

			<div
				ref={ref}
				style={{
					minHeight: "var(--card-height)",
					width: zone.layout === "stack" ? "var(--card-width)" : undefined,
				}}
				className={`relative custom-scrollbar ${
					zone.layout === "row" ? "flex items-center gap-2 overflow-y-hidden overflow-x-auto" : ""
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
				{tokens.map((token) => (
					<GoldToken key={token.id} token={token} zone={zone} />
				))}
			</div>
		</div>
	);
}
