"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/react";
import { useActivePlayerId, useGameDispatch } from "./GameContext";
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
	onOpenPileMenu,
}: {
	card: BoardCard;
	zone: Zone;
	stackIndex: number;
	interactive: boolean;
	onZoom: (cardId: CardId) => void;
	/** Cmd/Ctrl+click on a stack's top card opens its Shuffle/Sort/Find menu instead of flipping. */
	onOpenPileMenu?: () => void;
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
	// another card (card-to-card drops don't mean anything here). Gated by
	// the same ownership rule as dragging above — otherwise any player could
	// slap a condition onto another player's equipped items or Player Area,
	// which was possible before this check existed (bug: conditions have no
	// in-game trigger a player chooses freely, they only ever result from a
	// resolved Battle/Betray on your OWN gear).
	const { ref: dropRef, isDropTarget } = useDroppable({
		id: `card-drop:${card.id}`,
		accept: "token",
		disabled: !isOwnedByActivePlayer,
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

	// Skipped while this card is the one actively being dragged/settling
	// locally — dnd-kit's own drag transform and drop-animation already own
	// its motion then, and a competing left/top transition at the same time
	// would fight it. For every other position change (another player's move
	// arriving over the network, or a local action that isn't a drag, e.g.
	// drawing a card), this turns what would otherwise be an instant jump
	// into a smooth glide.
	const skipPositionTransition = isDragging || isSettling;

	// This positioning (incl. the glide transition) lives on a WRAPPER, never
	// on the draggable button itself. dnd-kit's own drag-feedback plugin reads
	// the dragged element's *computed* `transition` at pickup and copies it
	// verbatim into its own fixed-position drag overlay — if that element had
	// our left/top transition active, dnd-kit would carry it into a
	// left/top → viewport-fixed coordinate jump, animating the pickup in from
	// a wildly wrong spot. Keeping the button itself always `transition`-free
	// (it only ever fills its wrapper) means dnd-kit never has anything to
	// leak, regardless of what this wrapper is doing.
	const wrapperStyle: React.CSSProperties =
		zone.layout === "free"
			? // Percentages recompute automatically on resize (no JS needed) —
				// card.position is a 0-1 fraction of the zone's own size.
				{
					position: "absolute",
					left: `${card.position.x * 100}%`,
					top: `${card.position.y * 100}%`,
					transition: skipPositionTransition ? undefined : "left 250ms ease, top 250ms ease",
				}
			: zone.layout === "stack"
				? { position: "absolute", left: 0, top: (stackIndex + 1) * -4 }
				: zone.layout === "slot"
					? { position: "absolute", left: 0, top: 0 }
					: { position: "relative" };

	return (
		<div
			style={{
				...wrapperStyle,
				width: "var(--card-width)",
				height: "var(--card-height)",
			}}
			className="z-10 shrink-0"
		>
			<button
				ref={mergeRefs(dragRef, dropRef)}
				type="button"
				onClick={
					canInteract && zone.kind !== "hand"
						? (e) => {
								if ((e.metaKey || e.ctrlKey) && zone.layout === "stack" && onOpenPileMenu) {
									onOpenPileMenu();
									return;
								}
								dispatch({ type: "FLIP_CARD", cardId: card.id });
							}
						: undefined
				}
				onContextMenu={(e) => {
					e.preventDefault();
					if (interactive) onZoom(card.id);
				}}
				style={{ touchAction: "none" }}
				className={`block h-full w-full select-none ${canInteract ? "cursor-grab" : "cursor-default"}`}
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
		</div>
	);
}
