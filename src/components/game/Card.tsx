"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/react";
import { useActivePlayerId, useGameDispatch } from "./GameProvider";
import { CONDITIONS } from "@/lib/game/conditions";
import { CARD_HEIGHT, CARD_WIDTH } from "@/lib/game/constants";
import type { BoardCard, CardId, Zone } from "@/lib/game/types";

const SETTLE_DURATION_MS = 250;
const LIFT_DURATION_MS = 150;
const FLIP_DURATION_MS = 400;

// Hides whichever face is pointed away from the viewer during the flip.
const backfaceHidden: React.CSSProperties = {
	backfaceVisibility: "hidden",
	WebkitBackfaceVisibility: "hidden",
};

// Combines dnd-kit's draggable and droppable refs onto the same DOM node —
// a card is both at once (draggable to move it, droppable so a condition
// token can be dropped onto it).
function mergeRefs(
	...refs: (React.Ref<Element> | undefined)[]
): React.RefCallback<HTMLButtonElement> {
	return (node) => {
		for (const ref of refs) {
			if (typeof ref === "function") ref(node);
			else if (ref) (ref as React.RefObject<Element | null>).current = node;
		}
	};
}

export function Card({
	card,
	zone,
	stackIndex,
	interactive,
	onZoom,
}: {
	card: BoardCard;
	zone: Zone;
	stackIndex: number;
	interactive: boolean;
	onZoom: (cardId: CardId) => void;
}) {
	const [activePlayerId] = useActivePlayerId();
	// A card in a zone owned by another player can't be dragged or flipped —
	// same rule as Zone.tsx's droppable lock, checked independently here
	// since dragging (moving a card OUT of a zone) is a different primitive
	// than the zone's own droppable (moving a card INTO it).
	const isOwnedByActivePlayer = !zone.ownerId || zone.ownerId === activePlayerId;
	const canInteract = interactive && isOwnedByActivePlayer;

	const { ref: dragRef, isDragging } = useDraggable({
		id: card.id,
		type: "card",
		disabled: !canInteract,
	});
	// `accept: "token"` — only a condition token can drop onto a card, not
	// another card (card-to-card drops don't mean anything here).
	const { ref: dropRef, isDropTarget } = useDroppable({
		id: `card-drop:${card.id}`,
		accept: "token",
	});
	const dispatch = useGameDispatch();

	const [isLifting, setIsLifting] = useState(false);
	const [isSettling, setIsSettling] = useState(false);
	const wasDragging = useRef(false);

	useEffect(() => {
		if (!wasDragging.current && isDragging) {
			setIsSettling(false);
			setIsLifting(true);
			const timer = setTimeout(() => setIsLifting(false), LIFT_DURATION_MS);
			wasDragging.current = isDragging;
			return () => clearTimeout(timer);
		}
		if (wasDragging.current && !isDragging) {
			setIsLifting(false);
			setIsSettling(true);
			const timer = setTimeout(() => setIsSettling(false), SETTLE_DURATION_MS);
			wasDragging.current = isDragging;
			return () => clearTimeout(timer);
		}
		wasDragging.current = isDragging;
	}, [isDragging]);

	const style: React.CSSProperties =
		zone.layout === "free"
			? // Percentages recompute automatically on resize (no JS needed) —
				// card.position is a 0-1 fraction of the zone's own size.
				{
					position: "absolute",
					left: `${card.position.x * 100}%`,
					top: `${card.position.y * 100}%`,
				}
			: zone.layout === "stack"
				? { position: "absolute", left: stackIndex * 2, top: stackIndex * -2 }
				: zone.layout === "slot"
					? { position: "absolute", left: 0, top: 0 }
					: { position: "relative" };

	return (
		<button
			ref={mergeRefs(dragRef, dropRef)}
			type="button"
			onClick={
				canInteract && zone.kind !== "hand"
					? () => dispatch({ type: "FLIP_CARD", cardId: card.id })
					: undefined
			}
			onContextMenu={(e) => {
				e.preventDefault();
				// Zoom stays available even for another player's zone — it's a
				// read-only inspect, not a manipulation. Another player's hand
				// never renders actual Card components (PlayerSection shows just a
				// count instead), so this never exposes hidden hand cards.
				if (interactive) onZoom(card.id);
			}}
			style={{
				...style,
				touchAction: "none",
				width: "var(--card-width)",
				height: "var(--card-height)",
			}}
			className={`z-10 block shrink-0 select-none ${canInteract ? "cursor-grab" : "cursor-default"}`}
		>
			<div
				style={{
					perspective: 800,
					animation: isLifting
						? `card-lift ${LIFT_DURATION_MS}ms ease-out forwards`
						: isDragging
							? "card-wiggle 1s ease-in-out infinite"
							: isSettling
								? `card-settle ${SETTLE_DURATION_MS}ms ease-out forwards`
								: undefined,
				}}
				className={`relative h-full w-full rounded-sm shadow-sm transition-shadow duration-200 ease-out ${
					isLifting || isDragging || isSettling ? "shadow-xl" : ""
				} ${isDropTarget ? "ring-2 ring-yellow-400" : ""}`}
			>
				<div
					style={{
						transformStyle: "preserve-3d",
						transform: `rotateY(${card.faceDown ? 180 : 0}deg)`,
						transition: `transform ${FLIP_DURATION_MS}ms ease`,
					}}
					className="relative h-full w-full"
				>
					<Image
						src={card.imageFront}
						alt={card.label}
						width={CARD_WIDTH}
						height={CARD_HEIGHT}
						quality={95}
						style={backfaceHidden}
						className="absolute inset-0 h-full w-full rounded-sm object-cover"
						draggable={false}
					/>
					<Image
						src={card.imageBack}
						alt="Face-down card"
						width={CARD_WIDTH}
						height={CARD_HEIGHT}
						quality={95}
						style={{ ...backfaceHidden, transform: "rotateY(180deg)" }}
						className="absolute inset-0 h-full w-full rounded-sm object-cover"
						draggable={false}
					/>
				</div>

				{/*
				 * Conditions
				 */}
				{card.conditions.length > 0 && (
					<div className="pointer-events-none absolute inset-x-0 top-12 z-10 flex justify-center gap-1">
						{card.conditions.map((condition) => {
							const meta = CONDITIONS.find((c) => c.id === condition);
							return (
								<span
									key={condition}
									role="button"
									tabIndex={0}
									title={`${meta?.name} — click to remove`}
									onClick={(e) => {
										e.stopPropagation();
										if (canInteract) {
											dispatch({ type: "REMOVE_CONDITION", cardId: card.id, condition });
										}
									}}
									style={{ backgroundColor: meta ? `var(${meta.color})` : undefined }}
									className={`pointer-events-auto h-2 w-2 rounded-full border border-black/30 ${canInteract ? "cursor-pointer" : "cursor-default"}`}
								/>
							);
						})}
					</div>
				)}
			</div>
		</button>
	);
}
