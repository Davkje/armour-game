"use client";

import Image from "next/image";
import { useEffect } from "react";
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
			{/* Card's real source images are 500x700 — the largest we have to zoom into for now. */}
			<Image
				src={card.faceDown ? "/card_back_test.webp" : "/card_front_test.webp"}
				alt={card.faceDown ? "Face-down card" : card.label}
				width={500}
				height={700}
				quality={95}
				className="max-h-[85vh] w-auto rounded-sm shadow-2xl"
				draggable={false}
			/>
		</div>
	);
}
