import type { BoardCard, BoardState, ZoneId } from "./types";

const CARDS_PER_STARTING_DECK = 8;

// The decks that get dealt some generic placeholder cards at start. Item
// Discard is deliberately excluded — it starts empty, like a real discard pile.
const STARTING_DECKS: { zoneId: ZoneId; labelPrefix: string }[] = [
  { zoneId: "event-deck", labelPrefix: "Event" },
  { zoneId: "item-deck-common", labelPrefix: "Item Common" },
  { zoneId: "item-deck-rare", labelPrefix: "Item Rare" },
  { zoneId: "item-deck-epic", labelPrefix: "Item Epic" },
  { zoneId: "quest-deck", labelPrefix: "Quest" },
];

function buildPlaceholderCards(): Record<string, BoardCard> {
  const cards: Record<string, BoardCard> = {};
  let counter = 1;
  for (const deck of STARTING_DECKS) {
    for (let i = 0; i < CARDS_PER_STARTING_DECK; i++) {
      const id = `card-${counter++}`;
      cards[id] = {
        id,
        label: `${deck.labelPrefix} ${i + 1}`,
        zoneId: deck.zoneId,
        position: { x: 0, y: 0 },
        order: i,
        faceDown: true,
      };
    }
  }
  return cards;
}

export function buildInitialState(): BoardState {
  return {
    players: [{ id: "player-1", name: "Player 1" }],
    currentTurnPlayerId: "player-1",
    round: 1,
    zones: {
      "event-deck": { id: "event-deck", kind: "deck", layout: "stack", label: "Event Deck" },
      "item-deck-common": {
        id: "item-deck-common",
        kind: "deck",
        layout: "stack",
        label: "Item Deck — Common",
      },
      "item-deck-rare": {
        id: "item-deck-rare",
        kind: "deck",
        layout: "stack",
        label: "Item Deck — Rare",
      },
      "item-deck-epic": {
        id: "item-deck-epic",
        kind: "deck",
        layout: "stack",
        label: "Item Deck — Epic",
      },
      "item-discard": {
        id: "item-discard",
        kind: "discard",
        layout: "stack",
        label: "Item Discard",
      },
      "quest-deck": { id: "quest-deck", kind: "deck", layout: "stack", label: "Quest Deck" },
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
      "player-1-slot-head": {
        id: "player-1-slot-head",
        kind: "player-area",
        layout: "slot",
        label: "Head",
        ownerId: "player-1",
        icon: "/icon_head.svg",
      },
      "player-1-slot-top": {
        id: "player-1-slot-top",
        kind: "player-area",
        layout: "slot",
        label: "Top",
        ownerId: "player-1",
        icon: "/icon_top.svg",
      },
      "player-1-slot-legs": {
        id: "player-1-slot-legs",
        kind: "player-area",
        layout: "slot",
        label: "Legs",
        ownerId: "player-1",
        icon: "/icon_legs.svg",
      },
      "player-1-slot-hand-main": {
        id: "player-1-slot-hand-main",
        kind: "player-area",
        layout: "slot",
        label: "Hand",
        ownerId: "player-1",
        icon: "/icon_hand.svg",
      },
      "player-1-slot-hand-off": {
        id: "player-1-slot-hand-off",
        kind: "player-area",
        layout: "slot",
        label: "Hand",
        ownerId: "player-1",
        icon: "/icon_hand.svg",
      },
      "player-1-slot-extra": {
        id: "player-1-slot-extra",
        kind: "player-area",
        layout: "slot",
        label: "Extra",
        ownerId: "player-1",
        icon: "/icon_extra.svg",
      },
    },
    cards: buildPlaceholderCards(),
  };
}

export const STARTING_DECK_ZONE_IDS = STARTING_DECKS.map((deck) => deck.zoneId);
