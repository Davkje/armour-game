"use client";

import { useState } from "react";
import { useGameDispatch } from "./GameProvider";
import { STARTING_DECK_ZONE_IDS } from "@/lib/game/initialState";

type PendingAction = "new-game" | "reset-board" | null;

export function Toolbar() {
	const dispatch = useGameDispatch();
	const [pending, setPending] = useState<PendingAction>(null);

	function handleNewGame() {
		dispatch({ type: "RESET_BOARD" });
		for (const zoneId of STARTING_DECK_ZONE_IDS) {
			dispatch({ type: "SHUFFLE_ZONE", zoneId });
		}
		setPending(null);
	}

	function handleResetBoard() {
		dispatch({ type: "RESET_BOARD" });
		setPending(null);
	}

	if (pending) {
		const label = pending === "new-game" ? "Start a new game?" : "Reset the board?";
		const confirmAction = pending === "new-game" ? handleNewGame : handleResetBoard;

		return (
			<div className="flex flex-col gap-2 rounded-lg border border-black/10 p-3">
				<span className="text-sm text-black/70">{label} Current progress will be lost.</span>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={confirmAction}
						className="flex-1 rounded-full bg-foreground px-4 py-2 text-sm text-background transition-colors hover:opacity-90"
					>
						Yes
					</button>
					<button
						type="button"
						onClick={() => setPending(null)}
						className="flex-1 rounded-full border border-black/20 px-4 py-2 text-sm transition-colors hover:bg-black/5"
					>
						Cancel
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<button
				type="button"
				onClick={() => setPending("new-game")}
				className="rounded-full bg-foreground px-4 py-2 text-sm text-background transition-colors hover:opacity-90"
			>
				New Game
			</button>
			<button
				type="button"
				onClick={() => setPending("reset-board")}
				className="rounded-full border border-black/20 px-4 py-2 text-sm transition-colors hover:bg-black/5"
			>
				Reset Board
			</button>
		</div>
	);
}
