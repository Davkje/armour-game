"use client";

import { useDraggable } from "@dnd-kit/react";
import { ZONE_PADDING } from "@/lib/game/constants";
import type { BoardCard, Zone } from "@/lib/game/types";

export function Card({
  card,
  zone,
  stackIndex,
  onDrawClick,
}: {
  card: BoardCard;
  zone: Zone;
  stackIndex: number;
  onDrawClick?: () => void;
}) {
  const { ref, isDragging } = useDraggable({ id: card.id });

  const isTopOfStack = zone.layout === "stack";

  const style: React.CSSProperties =
    zone.layout === "free"
      ? { position: "absolute", left: card.position.x, top: card.position.y }
      : zone.layout === "stack"
        ? {
            position: "absolute",
            left: ZONE_PADDING + stackIndex * 2,
            top: ZONE_PADDING + stackIndex * -2,
          }
        : { position: "relative" };

  return (
    <button
      ref={ref}
      type="button"
      onClick={isTopOfStack ? onDrawClick : undefined}
      style={{ ...style, touchAction: "none" }}
      className={`flex h-24 w-16 items-center justify-center rounded-md border text-xs font-medium shadow-sm select-none ${
        card.faceDown
          ? "border-black/20 bg-zinc-700 text-transparent dark:border-white/20"
          : "border-black/20 bg-white text-black dark:border-white/20 dark:bg-zinc-100"
      } ${isDragging ? "opacity-50" : ""} ${isTopOfStack ? "cursor-pointer" : "cursor-grab"}`}
    >
      {card.faceDown ? "" : card.label}
    </button>
  );
}
