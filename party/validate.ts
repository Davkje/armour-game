import type { BoardState, ConditionType, GameAction, PlayerId, Position } from "../src/lib/game/types";

// The room server trusts nobody's payload: a modified client can send any JSON.
// This is NOT rules enforcement (the game is a sandbox — anyone may move shared
// cards, flip, roll the round, etc., on the honor system). It only rejects
// (1) malformed/absurd input that could crash or corrupt the room and
// (2) the few things that would break the privacy of a hand or hijack the
// authoritative state.

const CONDITIONS: readonly ConditionType[] = [
	"broken",
	"rusty",
	"dirty",
	"enchanted",
	"cursed",
	"wound",
	"battle-scarred",
];
const MAX_ID_LENGTH = 64;
const MAX_TOKENS = 300;
// Positions are fractions of a zone; a card dropped half off the edge is
// slightly outside 0-1, but nothing legitimate is anywhere near this far.
const POSITION_LIMIT = 10;

export const MAX_MESSAGE_BYTES = 20_000;
export const MAX_NAME_LENGTH = 20;

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is string {
	return typeof value === "string" && value.length > 0 && value.length <= MAX_ID_LENGTH;
}

function toPosition(value: unknown): Position | null {
	if (!isObject(value)) return null;
	const { x, y } = value;
	if (typeof x !== "number" || typeof y !== "number") return null;
	if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
	if (Math.abs(x) > POSITION_LIMIT || Math.abs(y) > POSITION_LIMIT) return null;
	return { x, y };
}

export function isValidPosition(value: unknown): value is Position {
	return toPosition(value) !== null;
}

/** A zone that is another player's hand — the one place a card's identity is private. */
function isOthersHand(state: BoardState, zoneId: string, playerId: PlayerId): boolean {
	const zone = state.zones[zoneId];
	return zone?.kind === "hand" && zone.ownerId !== playerId;
}

/**
 * Returns a clean copy of the action (only known fields kept) or `null` if it
 * must be refused. `playerId` is the seat bound to the sending connection.
 */
export function validateAction(state: BoardState, playerId: PlayerId, raw: unknown): GameAction | null {
	if (!isObject(raw) || typeof raw.type !== "string") return null;

	const cardOk = (cardId: unknown): cardId is string => {
		if (!isId(cardId)) return false;
		const card = state.cards[cardId];
		return !!card && !isOthersHand(state, card.zoneId, playerId);
	};
	const zoneOk = (zoneId: unknown): zoneId is string =>
		isId(zoneId) && !!state.zones[zoneId] && !isOthersHand(state, zoneId, playerId);

	switch (raw.type) {
		case "MOVE_CARD": {
			const position = toPosition(raw.position);
			if (!cardOk(raw.cardId) || !zoneOk(raw.zoneId) || !position) return null;
			return { type: "MOVE_CARD", cardId: raw.cardId, zoneId: raw.zoneId, position };
		}
		case "SHUFFLE_ZONE": {
			const seed = raw.seed;
			if (!zoneOk(raw.zoneId)) return null;
			if (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0 || seed >= 2 ** 32) return null;
			return { type: "SHUFFLE_ZONE", zoneId: raw.zoneId, seed };
		}
		case "SORT_ZONE": {
			if (!zoneOk(raw.zoneId)) return null;
			if (raw.direction !== "asc" && raw.direction !== "desc") return null;
			return { type: "SORT_ZONE", zoneId: raw.zoneId, direction: raw.direction };
		}
		case "FLIP_CARD": {
			if (!cardOk(raw.cardId)) return null;
			return { type: "FLIP_CARD", cardId: raw.cardId };
		}
		case "ADD_CONDITION":
		case "REMOVE_CONDITION": {
			const condition = raw.condition;
			if (!cardOk(raw.cardId)) return null;
			if (typeof condition !== "string" || !CONDITIONS.includes(condition as ConditionType)) return null;
			return { type: raw.type, cardId: raw.cardId, condition: condition as ConditionType };
		}
		case "PLACE_TOKEN": {
			const position = toPosition(raw.position);
			if (!isId(raw.tokenId) || state.tokens[raw.tokenId]) return null;
			if (Object.keys(state.tokens).length >= MAX_TOKENS) return null;
			if (raw.tokenType !== "gold" || !zoneOk(raw.zoneId) || !position) return null;
			return { type: "PLACE_TOKEN", tokenId: raw.tokenId, tokenType: "gold", zoneId: raw.zoneId, position };
		}
		case "MOVE_TOKEN": {
			const position = toPosition(raw.position);
			if (!isId(raw.tokenId) || !state.tokens[raw.tokenId]) return null;
			if (!zoneOk(raw.zoneId) || !position) return null;
			return { type: "MOVE_TOKEN", tokenId: raw.tokenId, zoneId: raw.zoneId, position };
		}
		case "REMOVE_TOKEN": {
			if (!isId(raw.tokenId) || !state.tokens[raw.tokenId]) return null;
			return { type: "REMOVE_TOKEN", tokenId: raw.tokenId };
		}
		case "SET_ROUND": {
			const round = raw.round;
			if (typeof round !== "number" || !Number.isInteger(round) || round < 0 || round > 999) return null;
			return { type: "SET_ROUND", round };
		}
		case "RESET_BOARD":
			return { type: "RESET_BOARD" };
		// LOAD_STATE (Local mode's save/restore) and RENAME_PLAYER (the server does
		// that itself when someone joins) are never valid from a client — anything
		// else unknown falls through to here too.
		default:
			return null;
	}
}
