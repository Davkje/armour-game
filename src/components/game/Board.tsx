"use client";

import { useRef, useState } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/react";
import { CardZoomOverlay } from "./CardZoomOverlay";
import { useGameDispatch, useGameState } from "./GameProvider";
import { PlayerBoard } from "./PlayerBoard";
import { Zone } from "./Zone";
import { CARD_HEIGHT, CARD_WIDTH } from "@/lib/game/constants";
import type { CardId, Position, ZoneId } from "@/lib/game/types";

export function Board() {
	const state = useGameState();
	const dispatch = useGameDispatch();
	// Offset between the pointer and the card's top-left corner at the moment
	// the drag started, so the exact spot the card was grabbed stays under the
	// cursor on drop (rather than assuming the cursor grabbed the center).
	const grabOffsetRef = useRef<Position>({ x: CARD_WIDTH / 2, y: CARD_HEIGHT / 2 });
	const [zoomedCardId, setZoomedCardId] = useState<CardId | null>(null);

	function handleDragStart(event: DragStartEvent) {
		const element = event.operation.source?.element;
		const initial = event.operation.position.initial;
		if (element) {
			const rect = element.getBoundingClientRect();
			grabOffsetRef.current = { x: initial.x - rect.left, y: initial.y - rect.top };
		} else {
			grabOffsetRef.current = { x: CARD_WIDTH / 2, y: CARD_HEIGHT / 2 };
		}
	}

	function handleDragEnd(event: DragEndEvent) {
		if (event.canceled) return;

		const cardId = event.operation.source?.id as CardId | undefined;
		if (!cardId) return;

		// No catch-all "table" zone anymore — dropping over blank space (no
		// zone under the cursor) isn't a valid move, so the card just reverts.
		const targetZoneId = event.operation.target?.id as ZoneId | undefined;
		if (!targetZoneId) return;
		const zone = state.zones[targetZoneId];
		if (!zone) return;

		let position: Position = { x: 0, y: 0 };
		if (zone.layout === "free") {
			const targetShape = event.operation.target?.shape as
				| { left: number; top: number }
				| undefined;
			const pointer = event.operation.position.current;
			const offset = grabOffsetRef.current;
			if (targetShape) {
				// Keep the exact point the card was grabbed under the cursor.
				position = {
					x: pointer.x - offset.x - targetShape.left,
					y: pointer.y - offset.y - targetShape.top,
				};
			}
		}

		dispatch({ type: "MOVE_CARD", cardId, zoneId: targetZoneId, position });
	}

	const cardsByZone = (zoneId: ZoneId) =>
		Object.values(state.cards).filter((card) => card.zoneId === zoneId);

	const zoomedCard = zoomedCardId ? state.cards[zoomedCardId] : undefined;

	return (
		<>
			<DragDropProvider onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
				<div className="flex w-full flex-col gap-4">
					<div className="grid grid-cols-6 gap-4">
						<Zone
							zone={state.zones["event-deck"]}
							cards={cardsByZone("event-deck")}
							onZoom={setZoomedCardId}
						/>
						<Zone
							zone={state.zones["item-deck-common"]}
							cards={cardsByZone("item-deck-common")}
							onZoom={setZoomedCardId}
						/>
						<Zone
							zone={state.zones["item-deck-rare"]}
							cards={cardsByZone("item-deck-rare")}
							onZoom={setZoomedCardId}
						/>
						<Zone
							zone={state.zones["item-deck-epic"]}
							cards={cardsByZone("item-deck-epic")}
							onZoom={setZoomedCardId}
						/>
						<Zone
							zone={state.zones["item-discard"]}
							cards={cardsByZone("item-discard")}
							onZoom={setZoomedCardId}
						/>
						<Zone
							zone={state.zones["quest-deck"]}
							cards={cardsByZone("quest-deck")}
							onZoom={setZoomedCardId}
						/>
					</div>
					<div className="flex gap-4">
						<PlayerBoard
							zones={[
								state.zones["player-1-slot-head"],
								state.zones["player-1-slot-top"],
								state.zones["player-1-slot-legs"],
								state.zones["player-1-slot-hand-main"],
								state.zones["player-1-slot-hand-off"],
								state.zones["player-1-slot-extra"],
							]}
							cardsByZone={cardsByZone}
							onZoom={setZoomedCardId}
						/>
						<div className="grid w-full min-w-0 grid-rows-2 gap-4">
							<Zone
								zone={state.zones["player-1-area"]}
								cards={cardsByZone("player-1-area")}
								onZoom={setZoomedCardId}
							/>
							<Zone
								zone={state.zones["player-1-hand"]}
								cards={cardsByZone("player-1-hand")}
								onZoom={setZoomedCardId}
							/>
						</div>
					</div>
				</div>
			</DragDropProvider>
			{zoomedCard && <CardZoomOverlay card={zoomedCard} onClose={() => setZoomedCardId(null)} />}
		</>
	);
}
