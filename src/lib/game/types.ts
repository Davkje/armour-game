export type CardId = string;
export type PlayerId = string;
export type ZoneId = string;

export type ConditionType =
	| "broken"
	| "rusty"
	| "dirty"
	| "enchanted"
	| "cursed"
	| "wound"
	| "battle-scarred";

export type FreeTokenType = "gold";

export type ItemRarity = "common" | "rare" | "magic";

/** Structured item stats from the Sheet — only present on item-deck cards; events/quests/races don't need this since their art already bakes in all text. */
export interface ItemData {
	itemType: string;
	rarity: ItemRarity;
	traits: string[];
	text: string;
	bonus: number;
	feature: string | null;
	cost: number;
}

export type ZoneKind = "deck" | "discard" | "hand" | "player-area" | "table";
export type ZoneLayout = "stack" | "free" | "row" | "slot";

export interface Zone {
	id: ZoneId;
	kind: ZoneKind;
	layout: ZoneLayout;
	label: string;
	ownerId?: PlayerId;
	/** Background icon shown when a "slot" zone is empty (e.g. "/icon_head.svg"). */
	icon?: string;
}

export interface Position {
	x: number;
	y: number;
}

export interface BoardCard {
	id: CardId;
	label: string;
	zoneId: ZoneId;
	position: Position;
	order: number;
	faceDown: boolean;
	conditions: ConditionType[];
	imageFront: string;
	imageBack: string;
	/** Only present for cards drawn from an item deck. */
	item?: ItemData;
}

export interface Player {
	id: PlayerId;
	name: string;
}

export type BoardTokenId = string;

export interface BoardToken {
	id: BoardTokenId;
	type: FreeTokenType;
	zoneId: ZoneId;
	/** Fraction (0-1) of the zone's own size — same convention as BoardCard.position. */
	position: Position;
}

export interface BoardState {
	players: Player[];
	zones: Record<ZoneId, Zone>;
	cards: Record<CardId, BoardCard>;
	tokens: Record<BoardTokenId, BoardToken>;
	currentTurnPlayerId?: PlayerId;
	/** Purely manual — players track rounds themselves, nothing advances it automatically. */
	round: number;
}

export type GameAction =
	| { type: "MOVE_CARD"; cardId: CardId; zoneId: ZoneId; position: Position }
	| { type: "SHUFFLE_ZONE"; zoneId: ZoneId }
	| { type: "FLIP_CARD"; cardId: CardId }
	| { type: "ADD_CONDITION"; cardId: CardId; condition: ConditionType }
	| { type: "REMOVE_CONDITION"; cardId: CardId; condition: ConditionType }
	| { type: "PLACE_TOKEN"; tokenType: FreeTokenType; zoneId: ZoneId; position: Position }
	| { type: "MOVE_TOKEN"; tokenId: BoardTokenId; zoneId: ZoneId; position: Position }
	| { type: "REMOVE_TOKEN"; tokenId: BoardTokenId }
	| { type: "SET_ROUND"; round: number }
	| { type: "RESET_BOARD" };
