"use client";

import Image from "next/image";
import { useDroppable } from "@dnd-kit/react";
import { useState } from "react";
import { Card } from "./Card";
import { FindCardOverlay } from "./FindCardOverlay";
import { GoldToken } from "./GoldToken";
import { PileMenu } from "./PileMenu";
import { useActivePlayerId } from "./GameProvider";
import { CARD_HEIGHT, CARD_WIDTH } from "@/lib/game/constants";
import type { BoardCard, BoardToken, CardId, Zone as ZoneType } from "@/lib/game/types";

/**
 * Renders a zone's cards. For "stack"/"slot" piles, only the top card is
 * ever interactive (existing rule), so there's no point mounting real
 * `<Card>`s — and fetching every card's unique front image — for the rest of
 * the pile: only the top 2 are rendered for real (top for interaction, the
 * one below it pre-loaded so flipping/drawing the top card reveals it
 * instantly instead of popping in). Anything deeper is represented by a
 * single backing layer reusing the top card's own (already-loaded)
 * `imageBack` — purely decorative "there's more here", no extra fetch.
 */
function CardPile({
	zone,
	cards,
	onZoom,
	onOpenMenu,
}: {
	zone: ZoneType;
	cards: BoardCard[];
	onZoom: (cardId: CardId) => void;
	onOpenMenu?: () => void;
}) {
	const isPile = zone.layout === "stack" || zone.layout === "slot";

	if (!isPile) {
		return (
			<>
				{cards.map((card, i) => (
					<Card key={card.id} card={card} zone={zone} stackIndex={i} interactive onZoom={onZoom} />
				))}
			</>
		);
	}

	const visible = cards.slice(-2);
	const topCard = cards[cards.length - 1];
	const hasMoreBelow = cards.length > visible.length;

	return (
		<>
			{hasMoreBelow && topCard && (
				<div
					aria-hidden
					style={{ width: "var(--card-width)", height: "var(--card-height)", left: 0, top: 0 }}
					className="absolute overflow-hidden"
				>
					<Image
						src={topCard.imageBack}
						alt=""
						width={CARD_WIDTH}
						height={CARD_HEIGHT}
						className="h-full w-full object-cover"
						draggable={false}
					/>
				</div>
			)}
			{visible.map((card, i) => (
				<Card
					key={card.id}
					card={card}
					zone={zone}
					stackIndex={i}
					interactive={i === visible.length - 1}
					onZoom={onZoom}
					onOpenPileMenu={i === visible.length - 1 ? onOpenMenu : undefined}
				/>
			))}
		</>
	);
}

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
	// Cmd/Ctrl+click on a stack's top card (Card.tsx) opens this — Shuffle /
	// Sort / Find card, scoped to this zone only.
	const [pileMenuOpen, setPileMenuOpen] = useState(false);
	const [findCardOpen, setFindCardOpen] = useState(false);
	const [findCardLimit, setFindCardLimit] = useState<number | null>(null);

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
				<CardPile zone={zone} cards={sorted} onZoom={onZoom} />
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
				<CardPile
					zone={zone}
					cards={sorted}
					onZoom={onZoom}
					onOpenMenu={zone.layout === "stack" ? () => setPileMenuOpen(true) : undefined}
				/>
				{tokens.map((token) => (
					<GoldToken key={token.id} token={token} zone={zone} />
				))}

				{pileMenuOpen && (
					<PileMenu
						zoneId={zone.id}
						onClose={() => setPileMenuOpen(false)}
						onFindCard={(limit) => {
							setPileMenuOpen(false);
							setFindCardLimit(limit);
							setFindCardOpen(true);
						}}
					/>
				)}
			</div>

			{findCardOpen && (
				<FindCardOverlay
					zone={zone}
					cards={[...(findCardLimit ? sorted.slice(-findCardLimit) : sorted)].reverse()}
					onClose={() => setFindCardOpen(false)}
				/>
			)}
		</div>
	);
}
