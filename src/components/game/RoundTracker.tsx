"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useGameDispatch, useGameState } from "./GameProvider";
import { MAX_ROUND, MIN_ROUND } from "@/lib/game/constants";

// Descending so 1 renders nearest the tracker (list grows upward from it),
// 10 furthest, matching the reference mockup.
const ROUND_OPTIONS = Array.from({ length: MAX_ROUND - MIN_ROUND + 1 }, (_, i) => MAX_ROUND - i);

const listVariants = {
	hidden: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
	visible: { transition: { staggerChildren: 0.03 } },
};

const itemVariants = {
	hidden: { opacity: 0, y: 10, scale: 0.7 },
	visible: { opacity: 1, y: 0, scale: 1 },
};

export function RoundTracker() {
	const { round } = useGameState();
	const dispatch = useGameDispatch();
	const [isPickerOpen, setIsPickerOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	function setRound(next: number) {
		dispatch({ type: "SET_ROUND", round: next });
	}

	useEffect(() => {
		if (!isPickerOpen) return;

		function handlePointerDown(e: PointerEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsPickerOpen(false);
			}
		}
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") setIsPickerOpen(false);
		}

		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isPickerOpen]);

	return (
		<div
			ref={containerRef}
			className="group fixed right-4 bottom-4 flex flex-col-reverse items-end gap-1.5"
		>
			<button
				type="button"
				aria-label="Round tracker — click to advance, right-click to pick a round"
				onClick={() => setRound(round + 1)}
				onContextMenu={(e) => {
					e.preventDefault();
					setIsPickerOpen((open) => !open);
				}}
				className="flex h-10 w-10 items-center justify-center rounded-md bg-black text-sm font-semibold text-white"
			>
				{round}
			</button>

			{!isPickerOpen && (
				<div className="flex w-10 flex-col items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
					<button
						type="button"
						aria-label="Increase round"
						onClick={() => setRound(round + 1)}
						disabled={round >= MAX_ROUND}
						className="flex h-5 w-8 items-center justify-center rounded bg-black text-[10px] text-white disabled:opacity-30"
					>
						▲
					</button>
					<button
						type="button"
						aria-label="Decrease round"
						onClick={() => setRound(round - 1)}
						disabled={round <= MIN_ROUND}
						className="flex h-5 w-8 items-center justify-center rounded bg-black text-[10px] text-white disabled:opacity-30"
					>
						▼
					</button>
				</div>
			)}

			<AnimatePresence>
				{isPickerOpen && (
					<motion.div
						initial="hidden"
						animate="visible"
						exit="hidden"
						variants={listVariants}
						className="flex flex-col gap-1.5"
					>
						{ROUND_OPTIONS.map((n) => (
							<motion.button
								key={n}
								type="button"
								variants={itemVariants}
								transition={{ type: "spring", stiffness: 500, damping: 30 }}
								onClick={() => {
									setRound(n);
									setIsPickerOpen(false);
								}}
								className={`flex h-10 w-10 items-center justify-center rounded-md text-sm font-semibold ${
									n === round ? "bg-white text-black" : "bg-black text-white"
								}`}
							>
								{n}
							</motion.button>
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
