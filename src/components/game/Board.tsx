"use client";

import { useRef, useState } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/react";
import { CardZoomOverlay } from "./CardZoomOverlay";
import { useGameDispatch, useGameState } from "./GameProvider";
import { PlayerBoard } from "./PlayerBoard";
import { TokenMenu } from "./TokenMenu";
import { Zone } from "./Zone";
import { CARD_HEIGHT, CARD_WIDTH } from "@/lib/game/constants";
import type { CardId, ConditionType, FreeTokenType, Position, ZoneId } from "@/lib/game/types";

export function Board() {
	const state = useGameState();
	const dispatch = useGameDispatch();
	// Offset between the pointer and the dragged element's top-left corner at
	// the moment the drag started, so the exact spot it was grabbed stays
	// under the cursor on drop (rather than assuming the cursor grabbed the
	// center). Works for cards and board tokens alike — measured live off
	// whatever element actually started the drag.
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

	// Where the dragged element's top-left corner should land, as a fraction
	// (0-1) of the target zone's own size — shared by cards and board tokens,
	// since both use the same "free"-zone percentage-position convention.
	function freeZonePosition(event: DragEndEvent): Position | undefined {
		const targetShape = event.operation.target?.shape as
			| { left: number; top: number; width: number; height: number }
			| undefined;
		if (!targetShape) return undefined;
		const pointer = event.operation.position.current;
		const offset = grabOffsetRef.current;
		return {
			x: (pointer.x - offset.x - targetShape.left) / targetShape.width,
			y: (pointer.y - offset.y - targetShape.top) / targetShape.height,
		};
	}

	function handleDragEnd(event: DragEndEvent) {
		if (event.canceled) return;

		const sourceId = event.operation.source?.id as string | undefined;
		if (!sourceId) return;
		const targetId = event.operation.target?.id as string | undefined;

		// A condition token dragged out of TokenMenu, dropped onto a card
		// (Card.tsx's own droppable, id "card-drop:<cardId>", accepts only
		// "token"-type draggables — so this branch only ever sees a valid
		// card target, never a zone).
		if (sourceId.startsWith("token:")) {
			if (!targetId?.startsWith("card-drop:")) return;
			const condition = sourceId.slice("token:".length) as ConditionType;
			const cardId = targetId.slice("card-drop:".length);
			dispatch({ type: "ADD_CONDITION", cardId, condition });
			return;
		}

		// A fresh board token (e.g. gold) dragged out of TokenMenu — spawns a
		// new one directly in whichever free zone it's dropped on.
		if (sourceId.startsWith("spawn-token:")) {
			if (!targetId) return;
			const zone = state.zones[targetId];
			if (!zone || zone.layout !== "free") return;
			const position = freeZonePosition(event);
			if (!position) return;
			const tokenType = sourceId.slice("spawn-token:".length) as FreeTokenType;
			dispatch({ type: "PLACE_TOKEN", tokenType, zoneId: targetId, position });
			return;
		}

		// An already-placed board token being repositioned.
		if (state.tokens[sourceId]) {
			if (!targetId) return;
			const zone = state.zones[targetId];
			if (!zone || zone.layout !== "free") return;
			const position = freeZonePosition(event);
			if (!position) return;
			dispatch({ type: "MOVE_TOKEN", tokenId: sourceId, zoneId: targetId, position });
			return;
		}

		const cardId = sourceId as CardId;

		// No catch-all "table" zone anymore — dropping over blank space (no
		// zone under the cursor) isn't a valid move, so the card just reverts.
		const targetZoneId = targetId as ZoneId | undefined;
		if (!targetZoneId) return;
		const zone = state.zones[targetZoneId];
		if (!zone) return;

		const position: Position =
			zone.layout === "free" ? (freeZonePosition(event) ?? { x: 0, y: 0 }) : { x: 0, y: 0 };

		dispatch({ type: "MOVE_CARD", cardId, zoneId: targetZoneId, position });
	}

	const cardsByZone = (zoneId: ZoneId) =>
		Object.values(state.cards).filter((card) => card.zoneId === zoneId);

	const tokensByZone = (zoneId: ZoneId) =>
		Object.values(state.tokens).filter((token) => token.zoneId === zoneId);

	const zoomedCard = zoomedCardId ? state.cards[zoomedCardId] : undefined;

	return (
		<>
			<DragDropProvider onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
				<TokenMenu />
				<div className="flex w-full flex-col gap-4">
					<div className="flex flex-wrap gap-4 justify-between">
						<Zone
							zone={state.zones["event-deck"]}
							cards={cardsByZone("event-deck")}
							onZoom={setZoomedCardId}
						/>
						<div className="flex gap-4">
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
						</div>
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
								tokens={tokensByZone("player-1-area")}
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
