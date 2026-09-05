"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/react";
import { useGameDispatch } from "./GameProvider";
import { CARD_HEIGHT, CARD_WIDTH } from "@/lib/game/constants";
import type { BoardCard, CardId, Zone } from "@/lib/game/types";

const SETTLE_DURATION_MS = 250;
const FLIP_DURATION_MS = 400;

// Hides whichever face is pointed away from the viewer during the flip.
const backfaceHidden: React.CSSProperties = {
	backfaceVisibility: "hidden",
	WebkitBackfaceVisibility: "hidden",
};

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
	// Cards buried under the top of a stack/slot pile aren't clickable or
	// draggable — only the visible top card is.
	interactive: boolean;
	onZoom: (cardId: CardId) => void;
}) {
	const { ref, isDragging } = useDraggable({ id: card.id, disabled: !interactive });
	const dispatch = useGameDispatch();

	const [isSettling, setIsSettling] = useState(false);
	const wasDragging = useRef(false);

	useEffect(() => {
		if (wasDragging.current && !isDragging) {
			setIsSettling(true);
			const timer = setTimeout(() => setIsSettling(false), SETTLE_DURATION_MS);
			wasDragging.current = isDragging;
			return () => clearTimeout(timer);
		}
		wasDragging.current = isDragging;
	}, [isDragging]);

	const style: React.CSSProperties =
		zone.layout === "free"
			? { position: "absolute", left: card.position.x, top: card.position.y }
			: zone.layout === "stack"
				? { position: "absolute", left: stackIndex * 2, top: stackIndex * -2 }
				: zone.layout === "slot"
					? { position: "absolute", left: 0, top: 0 }
					: { position: "relative" };

	return (
		<button
			ref={ref}
			type="button"
			onClick={
				interactive && zone.kind !== "hand"
					? () => dispatch({ type: "FLIP_CARD", cardId: card.id })
					: undefined
			}
			onContextMenu={(e) => {
				e.preventDefault();
				if (interactive) onZoom(card.id);
			}}
			style={{
				...style,
				touchAction: "none",
				width: "var(--card-width)",
				height: "var(--card-height)",
			}}
			className={`block shrink-0 select-none ${interactive ? "cursor-grab" : "cursor-default"}`}
		>
			<div
				style={{
					perspective: 800,
					animation: isDragging
						? "card-wiggle 1s ease-in-out infinite"
						: isSettling
							? `card-settle ${SETTLE_DURATION_MS}ms ease-out forwards`
							: undefined,
				}}
				className={`h-full w-full rounded-md shadow-sm transition-shadow duration-200 ease-out ${
					isDragging || isSettling ? "shadow-xl" : ""
				}`}
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
						src="/card_front_test.webp"
						alt={card.label}
						width={CARD_WIDTH}
						height={CARD_HEIGHT}
						quality={95}
						style={backfaceHidden}
						className="absolute inset-0 h-full w-full rounded-md object-cover"
						draggable={false}
					/>
					<Image
						src="/card_back_test.webp"
						alt="Face-down card"
						width={CARD_WIDTH}
						height={CARD_HEIGHT}
						quality={95}
						style={{ ...backfaceHidden, transform: "rotateY(180deg)" }}
						className="absolute inset-0 h-full w-full rounded-md object-cover"
						draggable={false}
					/>
				</div>
			</div>
		</button>
	);
}
