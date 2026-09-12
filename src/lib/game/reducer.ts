import { MAX_ROUND, MIN_ROUND } from "./constants";
import { buildInitialState } from "./initialState";
import type { BoardState, GameAction, ZoneId } from "./types";

function cardsInZone(state: BoardState, zoneId: ZoneId) {
	return Object.values(state.cards).filter((card) => card.zoneId === zoneId);
}

function maxOrderInZone(state: BoardState, zoneId: ZoneId) {
	return cardsInZone(state, zoneId).reduce((max, card) => Math.max(max, card.order), -1);
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

			// Drawing a card into a hand always reveals it to its owner
			const faceDown = zone.kind === "hand" ? false : card.faceDown;

			return {
				...state,
				cards: {
					...state.cards,
					[card.id]: { ...card, zoneId: action.zoneId, position, order, faceDown },
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

		case "SORT_ZONE": {
			const cards = cardsInZone(state, action.zoneId);
			const updatedCards = { ...state.cards };
			for (const card of cards) {
				// "desc" (top of pile = highest sheet number) is a plain sort by
				// sortOrder; "asc" (lowest number ends up on top, drawn first)
				// just inverts the comparison — order's sign never matters
				// elsewhere, only its relative ordering does.
				const order = action.direction === "asc" ? -card.sortOrder : card.sortOrder;
				updatedCards[card.id] = { ...card, order };
			}
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

		case "ADD_CONDITION": {
			const card = state.cards[action.cardId];
			if (!card) return state;
			if (card.conditions.includes(action.condition)) return state;

			return {
				...state,
				cards: {
					...state.cards,
					[card.id]: { ...card, conditions: [...card.conditions, action.condition] },
				},
			};
		}

		case "REMOVE_CONDITION": {
			const card = state.cards[action.cardId];
			if (!card) return state;

			return {
				...state,
				cards: {
					...state.cards,
					[card.id]: {
						...card,
						conditions: card.conditions.filter((c) => c !== action.condition),
					},
				},
			};
		}

		case "PLACE_TOKEN": {
			const zone = state.zones[action.zoneId];
			if (!zone || zone.layout !== "free") return state;

			const id = `token-${crypto.randomUUID()}`;
			return {
				...state,
				tokens: {
					...state.tokens,
					[id]: { id, type: action.tokenType, zoneId: action.zoneId, position: action.position },
				},
			};
		}

		case "MOVE_TOKEN": {
			const token = state.tokens[action.tokenId];
			if (!token) return state;
			const zone = state.zones[action.zoneId];
			if (!zone || zone.layout !== "free") return state;

			return {
				...state,
				tokens: {
					...state.tokens,
					[token.id]: { ...token, zoneId: action.zoneId, position: action.position },
				},
			};
		}

		case "REMOVE_TOKEN": {
			if (!state.tokens[action.tokenId]) return state;
			const tokens = { ...state.tokens };
			delete tokens[action.tokenId];
			return { ...state, tokens };
		}

		case "SET_ROUND": {
			const round = Math.min(MAX_ROUND, Math.max(MIN_ROUND, action.round));
			return { ...state, round };
		}

		case "RESET_BOARD":
			// Reuse the current players (count + names) — a reset/new game
			// shouldn't wipe the names entered on the homepage.
			return buildInitialState(
				state.players.length,
				state.players.map((p) => p.name),
			);

		default:
			return state;
	}
}
