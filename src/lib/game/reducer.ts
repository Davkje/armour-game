import { buildInitialState } from "./initialState";
import type { BoardState, GameAction, ZoneId } from "./types";

function cardsInZone(state: BoardState, zoneId: ZoneId) {
  return Object.values(state.cards).filter((card) => card.zoneId === zoneId);
}

function maxOrderInZone(state: BoardState, zoneId: ZoneId) {
  return cardsInZone(state, zoneId).reduce((max, card) => Math.max(max, card.order), -1);
}

function topCardInZone(state: BoardState, zoneId: ZoneId) {
  return cardsInZone(state, zoneId).reduce<BoardState["cards"][string] | undefined>(
    (top, card) => (!top || card.order > top.order ? card : top),
    undefined,
  );
}

export function gameReducer(state: BoardState, action: GameAction): BoardState {
  switch (action.type) {
    case "MOVE_CARD": {
      const card = state.cards[action.cardId];
      if (!card) return state;
      const zone = state.zones[action.zoneId];
      if (!zone) return state;

      const order = maxOrderInZone(state, action.zoneId) + 1;
      const position = zone.layout === "stack" ? { x: 0, y: 0 } : action.position;
      const faceDown = zone.kind === "deck" ? card.faceDown : false;

      return {
        ...state,
        cards: {
          ...state.cards,
          [card.id]: { ...card, zoneId: action.zoneId, position, order, faceDown },
        },
      };
    }

    case "DRAW_CARD": {
      const topCard = topCardInZone(state, action.fromZoneId);
      if (!topCard) return state;

      const order = maxOrderInZone(state, action.toZoneId) + 1;

      return {
        ...state,
        cards: {
          ...state.cards,
          [topCard.id]: {
            ...topCard,
            zoneId: action.toZoneId,
            position: { x: 0, y: 0 },
            order,
            faceDown: false,
          },
        },
      };
    }

    case "SHUFFLE_ZONE": {
      const cards = cardsInZone(state, action.zoneId);
      const shuffledOrders = cards.map((_, i) => i);
      for (let i = shuffledOrders.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOrders[i], shuffledOrders[j]] = [shuffledOrders[j], shuffledOrders[i]];
      }

      const updatedCards = { ...state.cards };
      cards.forEach((card, i) => {
        updatedCards[card.id] = { ...card, order: shuffledOrders[i] };
      });

      return { ...state, cards: updatedCards };
    }

    case "FLIP_CARD": {
      const card = state.cards[action.cardId];
      if (!card) return state;

      return {
        ...state,
        cards: { ...state.cards, [card.id]: { ...card, faceDown: !card.faceDown } },
      };
    }

    case "RESET_BOARD":
      return buildInitialState();

    default:
      return state;
  }
}
