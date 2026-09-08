"use client";

import { useDraggable } from "@dnd-kit/react";
import { useActivePlayerId, useGameDispatch } from "./GameProvider";
import type { BoardToken, Zone } from "@/lib/game/types";

export function GoldToken({ token, zone }: { token: BoardToken; zone: Zone }) {
	const [activePlayerId] = useActivePlayerId();
	// Same ownership rule as Card.tsx — a token sitting in another player's
	// zone can't be dragged away or removed just because you can see it.
	const isOwnedByActivePlayer = !zone.ownerId || zone.ownerId === activePlayerId;

	const { ref, isDragging } = useDraggable({
		id: token.id,
		type: "board-token",
		disabled: !isOwnedByActivePlayer,
	});
	const dispatch = useGameDispatch();

	return (
		<button
			ref={ref}
			type="button"
			title={isOwnedByActivePlayer ? "Right-click to remove" : undefined}
			onContextMenu={(e) => {
				e.preventDefault();
				if (!isOwnedByActivePlayer) return;
				dispatch({ type: "REMOVE_TOKEN", tokenId: token.id });
			}}
			style={{
				position: "absolute",
				left: `${token.position.x * 100}%`,
				top: `${token.position.y * 100}%`,
				touchAction: "none",
			}}
			className={`z-10 flex h-4 w-4 md:h-8 md:w-8 items-center justify-center rounded-full bg-amber-300 text-amber-800/50 border-2 ${
				isOwnedByActivePlayer ? "cursor-grab" : "cursor-default"
			} ${isDragging ? "opacity-50" : ""}`}
		>
			<span className="bg-amber-600/20 md:w-5 md:h-5 rounded-full"></span>
		</button>
	);
}
