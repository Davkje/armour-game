import type { BoardCard, BoardState, Player, PlayerId, Zone, ZoneId } from "./types";

const CARDS_PER_STARTING_DECK = 8;

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
				conditions: [],
			};
		}
	}
	return cards;
}

/**
 * Every zone a single player owns (Hand, Player Area, the 6 Equipped Items
 * slots) — factored out so the board scales to N players instead of one
 * hardcoded copy. Zone ids are namespaced by player id (e.g.
 * "player-2-hand"), so `zonesForPlayer("player-2")` never collides with
 * another player's zones.
 */
export function zonesForPlayer(playerId: PlayerId): Record<ZoneId, Zone> {
	const zones: Record<ZoneId, Zone> = {
		[`${playerId}-hand`]: {
			id: `${playerId}-hand`,
			kind: "hand",
			layout: "row",
			label: "Hand",
			ownerId: playerId,
		},
		[`${playerId}-area`]: {
			id: `${playerId}-area`,
			kind: "player-area",
			layout: "free",
			label: "Player Area",
			ownerId: playerId,
		},
		[`${playerId}-slot-head`]: {
			id: `${playerId}-slot-head`,
			kind: "player-area",
			layout: "slot",
			label: "Head",
			ownerId: playerId,
			icon: "/icon_head.svg",
		},
		[`${playerId}-slot-top`]: {
			id: `${playerId}-slot-top`,
			kind: "player-area",
			layout: "slot",
			label: "Top",
			ownerId: playerId,
			icon: "/icon_top.svg",
		},
		[`${playerId}-slot-legs`]: {
			id: `${playerId}-slot-legs`,
			kind: "player-area",
			layout: "slot",
			label: "Legs",
			ownerId: playerId,
			icon: "/icon_legs.svg",
		},
		[`${playerId}-slot-hand-main`]: {
			id: `${playerId}-slot-hand-main`,
			kind: "player-area",
			layout: "slot",
			label: "Hand",
			ownerId: playerId,
			icon: "/icon_hand.svg",
		},
		[`${playerId}-slot-hand-off`]: {
			id: `${playerId}-slot-hand-off`,
			kind: "player-area",
			layout: "slot",
			label: "Hand",
			ownerId: playerId,
			icon: "/icon_hand.svg",
		},
		[`${playerId}-slot-extra`]: {
			id: `${playerId}-slot-extra`,
			kind: "player-area",
			layout: "slot",
			label: "Extra",
			ownerId: playerId,
			icon: "/icon_extra.svg",
		},
	};
	return zones;
}

/** The 6 Equipped Items slot zone ids for a player, in display order. */
export function equippedSlotIds(playerId: PlayerId): ZoneId[] {
	return [
		`${playerId}-slot-head`,
		`${playerId}-slot-top`,
		`${playerId}-slot-legs`,
		`${playerId}-slot-hand-main`,
		`${playerId}-slot-hand-off`,
		`${playerId}-slot-extra`,
	];
}

/** Clamped to the 2-4 range offered on the homepage's local player picker. */
export function buildInitialState(requestedPlayerCount = 2, playerNames?: string[]): BoardState {
	const playerCount = Math.min(4, Math.max(2, requestedPlayerCount));
	const players: Player[] = Array.from({ length: playerCount }, (_, i) => ({
		id: `player-${i + 1}`,
		name: playerNames?.[i]?.trim() || `Player ${i + 1}`,
	}));

	const zones: Record<ZoneId, Zone> = {
		"event-deck": { id: "event-deck", kind: "deck", layout: "stack", label: "Event Deck" },
		"item-deck-common": {
			id: "item-deck-common",
			kind: "deck",
			layout: "stack",
			label: "Common Items",
		},
		"item-deck-rare": {
			id: "item-deck-rare",
			kind: "deck",
			layout: "stack",
			label: "Rare Items",
		},
		"item-deck-epic": {
			id: "item-deck-epic",
			kind: "deck",
			layout: "stack",
			label: "Epic Items",
		},
		"item-discard": {
			id: "item-discard",
			kind: "discard",
			layout: "stack",
			label: "Item Discard",
		},
		"quest-deck": { id: "quest-deck", kind: "deck", layout: "stack", label: "Quest Deck" },
	};

	for (const player of players) {
		Object.assign(zones, zonesForPlayer(player.id));
	}

	return {
		players,
		currentTurnPlayerId: players[0].id,
		round: 1,
		zones,
		cards: buildPlaceholderCards(),
		tokens: {},
	};
}

export const STARTING_DECK_ZONE_IDS = STARTING_DECKS.map((deck) => deck.zoneId);
