"use client";

import { useEffect, useRef, useState } from "react";
import { useGameDispatch } from "./GameProvider";
import type { ZoneId } from "@/lib/game/types";
import { RiArrowDownSFill, RiArrowUpSFill } from "@remixicon/react";

/** Cmd/Ctrl+click a stack's top card to open this — see Card.tsx. */
export function PileMenu({
	zoneId,
	onClose,
	onFindCard,
}: {
	zoneId: ZoneId;
	onClose: () => void;
	/** null = show the whole pile, otherwise only its top N cards. */
	onFindCard: (limit: number | null) => void;
}) {
	const dispatch = useGameDispatch();
	const containerRef = useRef<HTMLDivElement>(null);
	const [view, setView] = useState<"menu" | "find">("menu");
	const [limitAll, setLimitAll] = useState(true);
	const [limitCount, setLimitCount] = useState(5);

	useEffect(() => {
		function handlePointerDown(e: PointerEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				onClose();
			}
		}
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [onClose]);

	// Opens above the pile (not to the side) so it doesn't run off-screen for
	// decks sitting near the right edge of the board.
	const containerClassName =
		"absolute bottom-[calc(100%+1rem)] left-0 z-20 flex w-max flex-col gap-2 rounded-lg border-2 border-black bg-background p-2 shadow-xl";

	if (view === "find") {
		return (
			<div ref={containerRef} className={containerClassName}>
				<label className="flex items-center gap-2 text-md">
					<input type="radio" checked={limitAll} onChange={() => setLimitAll(true)} />
					All
				</label>
				<label className="flex items-center gap-2 text-md">
					<input type="radio" checked={!limitAll} onChange={() => setLimitAll(false)} />
					Up to
					<span className="flex gap-1 items-stretchw-full">
						<input
							type="number"
							min={1}
							value={limitCount}
							onFocus={() => setLimitAll(false)}
							onChange={(e) => setLimitCount(Math.max(1, Number(e.target.value) || 1))}
							className="w-13 rounded-r-none border-r-0"
						/>
						<span className="flex flex-col overflow-hidden rounded-sm border border-black/20">
							<button
								type="button"
								aria-label="Increase"
								onClick={() => {
									setLimitAll(false);
									setLimitCount((n) => n + 1);
								}}
								className="flex h-1/2 w-5 items-center justify-center hover:bg-black/5"
							>
								<RiArrowUpSFill size={14} />
							</button>
							<button
								type="button"
								aria-label="Decrease"
								onClick={() => {
									setLimitAll(false);
									setLimitCount((n) => Math.max(1, n - 1));
								}}
								className="flex h-1/2 w-5 items-center justify-center border-t border-black/20 hover:bg-black/5"
							>
								<RiArrowDownSFill size={14} />
							</button>
						</span>
					</span>
				</label>
				<div className="flex gap-1">
					<button
						type="button"
						className="btn-primary flex-1 text-md"
						onClick={() => onFindCard(limitAll ? null : limitCount)}
					>
						Show
					</button>
					<button
						type="button"
						className="btn-secondary flex-1 text-md"
						onClick={() => setView("menu")}
					>
						Back
					</button>
				</div>
			</div>
		);
	}

	return (
		<div ref={containerRef} className={containerClassName}>
			<button
				type="button"
				className="btn-secondary text-md"
				onClick={() => {
					dispatch({ type: "SHUFFLE_ZONE", zoneId });
					onClose();
				}}
			>
				Shuffle
			</button>
			<button
				type="button"
				className="btn-secondary text-md"
				onClick={() => {
					dispatch({ type: "SORT_ZONE", zoneId, direction: "asc" });
					onClose();
				}}
			>
				Sort Low
			</button>
			<button
				type="button"
				className="btn-secondary text-md"
				onClick={() => {
					dispatch({ type: "SORT_ZONE", zoneId, direction: "desc" });
					onClose();
				}}
			>
				Sort High
			</button>
			<button type="button" className="btn-secondary text-md" onClick={() => setView("find")}>
				Find card
			</button>
		</div>
	);
}
