"use client";

import { useDroppable } from "@dnd-kit/react";
import { Card } from "./Card";
import type { BoardCard, Zone as ZoneType } from "@/lib/game/types";

export function Zone({
  zone,
  cards,
  onDrawTopCard,
}: {
  zone: ZoneType;
  cards: BoardCard[];
  onDrawTopCard?: (zoneId: string) => void;
}) {
  const { ref, isDropTarget } = useDroppable({ id: zone.id });
  const sorted = [...cards].sort((a, b) => a.order - b.order);

  return (
    <div
      ref={ref}
      className={`relative rounded-lg border-2 border-dashed p-2 ${
        isDropTarget ? "border-black/40 bg-black/5 dark:border-white/40 dark:bg-white/5" : "border-black/10 dark:border-white/10"
      } ${zone.layout === "row" ? "flex min-h-32 items-center gap-2" : "min-h-32"}`}
    >
      <span className="pointer-events-none absolute -top-2 left-2 bg-background px-1 text-xs text-black/50 dark:text-white/50">
        {zone.label}
      </span>
      {sorted.map((card, i) => (
        <Card
          key={card.id}
          card={card}
          zone={zone}
          stackIndex={i}
          onDrawClick={
            zone.layout === "stack" && i === sorted.length - 1
              ? () => onDrawTopCard?.(zone.id)
              : undefined
          }
        />
      ))}
    </div>
  );
}
