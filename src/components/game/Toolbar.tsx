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
				<span className="text-md text-md">{label} Current progress will be lost.</span>
				<div className="flex gap-2">
					<button type="button" onClick={confirmAction} className="btn-primary text-lg flex-1">
						Yes
					</button>
					<button
						type="button"
						onClick={() => setPending(null)}
						className="btn-secondary text-lg flex-1"
					>
						Cancel
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<button type="button" onClick={() => setPending("new-game")} className="btn-primary text-lg">
				New Game
			</button>
			<button
				type="button"
				onClick={() => setPending("reset-board")}
				className="btn-secondary text-lg"
			>
				Reset Board
			</button>
		</div>
	);
}
