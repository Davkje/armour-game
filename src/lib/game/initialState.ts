import type { BoardState } from "./types";

const PLACEHOLDER_DECK_SIZE = 20;

export function buildInitialState(): BoardState {
  return {
    players: [{ id: "player-1", name: "Player 1" }],
    currentTurnPlayerId: "player-1",
    zones: {
      deck: { id: "deck", kind: "deck", layout: "stack", label: "Deck" },
      discard: { id: "discard", kind: "discard", layout: "stack", label: "Discard" },
      table: { id: "table", kind: "table", layout: "free", label: "Table" },
      "player-1-hand": {
        id: "player-1-hand",
        kind: "hand",
        layout: "row",
        label: "Hand",
        ownerId: "player-1",
      },
      "player-1-area": {
        id: "player-1-area",
        kind: "player-area",
        layout: "free",
        label: "Player Area",
        ownerId: "player-1",
      },
    },
    cards: Object.fromEntries(
      Array.from({ length: PLACEHOLDER_DECK_SIZE }, (_, i) => {
        const id = `card-${i + 1}`;
        return [
          id,
          {
            id,
            label: `Card ${i + 1}`,
            zoneId: "deck",
            position: { x: 0, y: 0 },
            order: i,
            faceDown: true,
          },
        ];
      }),
    ),
  };
}
