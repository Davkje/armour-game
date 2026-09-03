export type CardId = string;
export type PlayerId = string;
export type ZoneId = string;

export type ZoneKind = "deck" | "discard" | "hand" | "player-area" | "table";
export type ZoneLayout = "stack" | "free" | "row";

export interface Zone {
  id: ZoneId;
  kind: ZoneKind;
  layout: ZoneLayout;
  label: string;
  ownerId?: PlayerId;
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
}

export interface Player {
  id: PlayerId;
  name: string;
}

export interface BoardState {
  players: Player[];
  zones: Record<ZoneId, Zone>;
  cards: Record<CardId, BoardCard>;
  currentTurnPlayerId?: PlayerId;
}

export type GameAction =
  | { type: "MOVE_CARD"; cardId: CardId; zoneId: ZoneId; position: Position }
  | { type: "DRAW_CARD"; fromZoneId: ZoneId; toZoneId: ZoneId }
  | { type: "SHUFFLE_ZONE"; zoneId: ZoneId }
  | { type: "FLIP_CARD"; cardId: CardId }
  | { type: "RESET_BOARD" };
