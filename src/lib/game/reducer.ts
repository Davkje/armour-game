import { MAX_ROUND, MIN_ROUND } from "./constants";
import { buildInitialState } from "./initialState";
import type { BoardState, GameAction, ZoneId } from "./types";

function cardsInZone(state: BoardState, zoneId: ZoneId) {
	return Object.values(state.cards).filter((card) => card.zoneId === zoneId);
}

function maxOrderInZone(state: BoardState, zoneId: ZoneId) {
	return cardsInZone(state, zoneId).reduce((max, card) => Math.max(max, card.order), -1);
}

/**
 * Entropy for a SHUFFLE_ZONE action, generated at the dispatch call site (not
 * inside the reducer) so `gameReducer` stays a pure function of its inputs —
 * needed so it can run identically server-side once Phase 2 makes the server
 * authoritative. 64 is comfortably more than any deck in this game ever
 * holds, and the reducer still uses its OWN live `cardsInZone` to know how
 * many of these values it actually needs — the caller never has to know the
 * zone's exact current size, only "enough" randomness, which matters for
 * call sites like Toolbar.tsx's "New Game" (RESET_BOARD immediately followed
 * by a SHUFFLE_ZONE per starting deck — the component's own state is still
 * stale at that point, since dispatches haven't landed yet).
 */
export function createShuffleEntropy(): number[] {
	return Array.from({ length: 64 }, () => Math.random());
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
			const zone = state.zones[action.zoneId];
			const faceDown = zone?.faceDownDefault ?? true;
			const cards = cardsInZone(state, action.zoneId);
			const shuffledOrders = cards.map((_, i) => i);
			let entropyIndex = 0;
			for (let i = shuffledOrders.length - 1; i > 0; i--) {
				const j = Math.floor(action.randomValues[entropyIndex++] * (i + 1));
				[shuffledOrders[i], shuffledOrders[j]] = [shuffledOrders[j], shuffledOrders[i]];
			}

			const updatedCards = { ...state.cards };
			cards.forEach((card, i) => {
				// A shuffle mixes every card back into an even pile — reset
				// faceDown to the zone's default too, not just the order,
				// otherwise a card someone flipped up while it sat in the stack
				// would get shuffled in and could resurface face-up mid-pile.
				updatedCards[card.id] = { ...card, order: shuffledOrders[i], faceDown };
			});

			return { ...state, cards: updatedCards };
		}

		case "SORT_ZONE": {
			const zone = state.zones[action.zoneId];
			const faceDown = zone?.faceDownDefault ?? true;
			const cards = cardsInZone(state, action.zoneId);
			const updatedCards = { ...state.cards };
			for (const card of cards) {
				// "desc" (top of pile = highest sheet number) is a plain sort by
				// sortOrder; "asc" (lowest number ends up on top, drawn first)
				// just inverts the comparison — order's sign never matters
				// elsewhere, only its relative ordering does.
				const order = action.direction === "asc" ? -card.sortOrder : card.sortOrder;
				// Same reasoning as SHUFFLE_ZONE — re-piling the whole zone
				// should reset every card back to the zone's normal face state.
				updatedCards[card.id] = { ...card, order, faceDown };
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

			const id = action.tokenId;
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

		case "LOAD_STATE":
			return action.state;

		case "RENAME_PLAYER":
			return {
				...state,
				players: state.players.map((p) =>
					p.id === action.playerId ? { ...p, name: action.name } : p,
				),
			};

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
