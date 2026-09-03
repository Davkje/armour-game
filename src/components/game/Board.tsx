"use client";

import { DragDropProvider } from "@dnd-kit/react";
import type { DragEndEvent } from "@dnd-kit/react";
import { useGameDispatch, useGameState } from "./GameProvider";
import { Zone } from "./Zone";
import { CARD_HEIGHT, CARD_WIDTH, ZONE_PADDING } from "@/lib/game/constants";
import type { CardId, Position, ZoneId } from "@/lib/game/types";

export function Board() {
  const state = useGameState();
  const dispatch = useGameDispatch();

  const handDropId = state.players[0] ? `${state.players[0].id}-hand` : undefined;

  function handleDrawTopCard(fromZoneId: ZoneId) {
    if (!handDropId) return;
    dispatch({ type: "DRAW_CARD", fromZoneId, toZoneId: handDropId });
  }

  function handleDragEnd(event: DragEndEvent) {
    if (event.canceled) return;

    const cardId = event.operation.source?.id as CardId | undefined;
    if (!cardId) return;

    const targetZoneId = (event.operation.target?.id as ZoneId | undefined) ?? "table";
    const zone = state.zones[targetZoneId];
    if (!zone) return;

    let position: Position = { x: 0, y: 0 };
    if (zone.layout === "free") {
      const targetShape = event.operation.target?.shape as
        | { left: number; top: number }
        | undefined;
      const pointer = event.operation.position.current;
      if (targetShape) {
        // Center the card under the cursor (not its top-left corner), and
        // compensate for the zone's padding box being the absolute-position
        // origin (CSS positions against the padding edge, not the content edge).
        position = {
          x: pointer.x - targetShape.left - CARD_WIDTH / 2 + ZONE_PADDING,
          y: pointer.y - targetShape.top - CARD_HEIGHT / 2 + ZONE_PADDING,
        };
      }
    }

    dispatch({ type: "MOVE_CARD", cardId, zoneId: targetZoneId, position });
  }

  const cardsByZone = (zoneId: ZoneId) =>
    Object.values(state.cards).filter((card) => card.zoneId === zoneId);

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Zone zone={state.zones.deck} cards={cardsByZone("deck")} onDrawTopCard={handleDrawTopCard} />
          <Zone
            zone={state.zones.discard}
            cards={cardsByZone("discard")}
            onDrawTopCard={handleDrawTopCard}
          />
        </div>
        <Zone zone={state.zones.table} cards={cardsByZone("table")} />
        <div className="grid grid-cols-2 gap-4">
          <Zone zone={state.zones["player-1-area"]} cards={cardsByZone("player-1-area")} />
          <Zone zone={state.zones["player-1-hand"]} cards={cardsByZone("player-1-hand")} />
        </div>
      </div>
    </DragDropProvider>
  );
}
