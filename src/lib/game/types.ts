export type CardId = string;
export type PlayerId = string;
export type ZoneId = string;

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
  /** Purely manual — players track rounds themselves, nothing advances it automatically. */
  round: number;
}

export type GameAction =
  | { type: "MOVE_CARD"; cardId: CardId; zoneId: ZoneId; position: Position }
  | { type: "SHUFFLE_ZONE"; zoneId: ZoneId }
  | { type: "FLIP_CARD"; cardId: CardId }
  | { type: "SET_ROUND"; round: number }
  | { type: "RESET_BOARD" };
