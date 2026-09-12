"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useActivePlayerId, useGameDispatch } from "./GameProvider";
import { CARD_HEIGHT, CARD_WIDTH } from "@/lib/game/constants";
import type { BoardCard, Zone } from "@/lib/game/types";

/** Opened from PileMenu's "Find card" — shows every card in the pile face-up so you can pick a specific one (e.g. "draw until you find a Weapon"). Clicking a card draws it straight to the active player's hand. */
export function FindCardOverlay({
	zone,
	cards,
	onClose,
}: {
	zone: Zone;
	cards: BoardCard[];
	onClose: () => void;
}) {
	const [activePlayerId] = useActivePlayerId();
	const dispatch = useGameDispatch();

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	function handlePick(cardId: string) {
		if (!activePlayerId) return;
		dispatch({ type: "MOVE_CARD", cardId, zoneId: `${activePlayerId}-hand`, position: { x: 0, y: 0 } });
		onClose();
	}

	return (
		<div className="fixed inset-0 z-50 flex flex-col gap-4 bg-black/80 p-8" onClick={onClose}>
			<div className="flex items-center justify-between text-white">
				<h2 className="text-lg font-semibold">{zone.label} — click a card to draw it</h2>
				<button type="button" aria-label="Close" className="btn-icon-ghost text-white" onClick={onClose}>
					✕
				</button>
			</div>
			<div
				className="grid flex-1 auto-rows-max gap-4 overflow-y-auto"
				style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_WIDTH}px, 1fr))` }}
			>
				{cards.map((card) => (
					<button
						key={card.id}
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							handlePick(card.id);
						}}
						className="cursor-pointer rounded-sm transition-transform hover:scale-105"
					>
						<Image
							src={card.imageFront}
							alt={card.label}
							width={CARD_WIDTH}
							height={CARD_HEIGHT}
							className="w-full rounded-sm shadow-lg"
							draggable={false}
						/>
					</button>
				))}
			</div>
		</div>
	);
}
