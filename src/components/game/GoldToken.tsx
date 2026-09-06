"use client";

import { useDraggable } from "@dnd-kit/react";
import { useGameDispatch } from "./GameProvider";
import type { BoardToken } from "@/lib/game/types";

export function GoldToken({ token }: { token: BoardToken }) {
	const { ref, isDragging } = useDraggable({ id: token.id, type: "board-token" });
	const dispatch = useGameDispatch();

	return (
		<button
			ref={ref}
			type="button"
			title="Right-click to remove"
			onContextMenu={(e) => {
				e.preventDefault();
				dispatch({ type: "REMOVE_TOKEN", tokenId: token.id });
			}}
			style={{
				position: "absolute",
				left: `${token.position.x * 100}%`,
				top: `${token.position.y * 100}%`,
				touchAction: "none",
			}}
			className={`z-10 flex h-8 w-8 items-center justify-center rounded-full bg-amber-300 text-amber-800/50 border-2 ${
				isDragging ? "opacity-50" : ""
			}`}
		>
			<span className="bg-amber-600/20 w-5 h-5 rounded-full"></span>
		</button>
	);
}
