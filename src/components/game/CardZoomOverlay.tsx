"use client";

import Image from "next/image";
import { useEffect } from "react";
import { CONDITIONS } from "@/lib/game/conditions";
import type { BoardCard } from "@/lib/game/types";

export function CardZoomOverlay({ card, onClose }: { card: BoardCard; onClose: () => void }) {
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8"
			onClick={onClose}
			onContextMenu={(e) => {
				e.preventDefault();
				onClose();
			}}
		>
			<div className="flex items-center gap-6">
				<Image
					src={card.faceDown ? card.imageBack : card.imageFront}
					alt={card.faceDown ? "Face-down card" : card.label}
					width={500}
					height={700}
					quality={95}
					className="max-h-[90vh] w-auto rounded-sm shadow-2xl"
					draggable={false}
				/>

				{(card.item || card.conditions.length > 0) && (
					<div className="flex max-h-[85vh] w-xl flex-col gap-4">
						{card.item && (
							<div className="flex flex-col gap-2 overflow-y-auto rounded-lg bg-background p-3 border-2 border-black">
								<h3 className="text-xs font-semibold tracking-widest text-black/50 uppercase">
									{card.item.rarity} {card.item.itemType}
								</h3>
								<p className="text-sm text-black/70">{card.item.traits.join(", ")}</p>
								<p className="text-sm">
									Bonus: <span className="font-semibold">{card.item.bonus}</span> · Cost:{" "}
									<span className="font-semibold">{card.item.cost}</span>
								</p>
								{card.item.feature && <p className="text-sm italic">{card.item.feature}</p>}
							</div>
						)}

						{card.conditions.length > 0 && (
							<div className="flex flex-col gap-3 overflow-y-auto rounded-lg bg-background p-3 border-2 border-black">
								<h3 className="text-xs font-semibold tracking-widest text-black/50 uppercase">
									Conditions
								</h3>
								{card.conditions.map((condition) => {
									const meta = CONDITIONS.find((c) => c.id === condition);
									if (!meta) return null;
									return (
										<p key={condition} className="text-sm">
											<span
												aria-hidden="true"
												style={{ backgroundColor: `var(${meta.color})` }}
												className="mr-1.5 inline-block h-3 w-3 rounded-full"
											/>
											<span className="font-semibold">{meta.name}</span> —{" "}
											<span className="text-black/70">{meta.body}</span>
										</p>
									);
								})}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
