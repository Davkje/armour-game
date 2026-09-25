import type { BoardState, PlayerId } from "./types";

const STORAGE_PREFIX = "armour-game:";
const ACTIVE_PLAYER_PREFIX = "armour-game:active-player:";
const ONLINE_PLAYER_PREFIX = "armour-game:online-player:";

/**
 * Local-only save/resume so an accidental reload doesn't wipe a game — keyed
 * by the gameId in the /game/[gameId] URL (see the homepage's "Local" setup,
 * which mints a fresh id per game). Wrapped in try/catch since localStorage
 * can throw (private browsing, storage disabled, quota) — losing the save in
 * that case isn't worth crashing the board over.
 */
export function loadGameState(gameId: string): BoardState | null {
	try {
		const raw = localStorage.getItem(STORAGE_PREFIX + gameId);
		return raw ? (JSON.parse(raw) as BoardState) : null;
	} catch {
		return null;
	}
}

export function saveGameState(gameId: string, state: BoardState) {
	try {
		localStorage.setItem(STORAGE_PREFIX + gameId, JSON.stringify(state));
	} catch {
		// Not critical enough to surface — the game just won't resume after a reload.
	}
}

// activePlayerId (who's "up" in the local hotseat control) is deliberately
// kept out of BoardState — it's local UI state, not game state (see
// GameProvider.tsx / AGENTS.md) — but it still needs to survive a reload,
// so it's saved separately, keyed by the same gameId.
export function loadActivePlayerId(gameId: string): string | null {
	try {
		return localStorage.getItem(ACTIVE_PLAYER_PREFIX + gameId);
	} catch {
		return null;
	}
}

export function saveActivePlayerId(gameId: string, playerId: string) {
	try {
		localStorage.setItem(ACTIVE_PLAYER_PREFIX + gameId, playerId);
	} catch {
		// Not critical — worst case a reload resets whose turn it visually is.
	}
}

/**
 * Online mode: which seat this browser claimed in a given room, plus the
 * secret the server issued for it, so a refresh (or reopening the tab) can
 * take the same seat back instead of asking again. The secret is what makes
 * that safe — the server only lets a matching seat+secret pair take over a
 * seat that still has a live connection. Deliberately localStorage, not
 * sessionStorage: it needs to survive a closed tab.
 */
export interface OnlineSeat {
	playerId: PlayerId;
	token: string;
}

export function loadOnlineSeat(gameId: string): OnlineSeat | null {
	try {
		const raw = localStorage.getItem(ONLINE_PLAYER_PREFIX + gameId);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<OnlineSeat>;
		// Anything from before seats had a secret (a bare "player-2") is unusable.
		return typeof parsed.playerId === "string" && typeof parsed.token === "string"
			? { playerId: parsed.playerId, token: parsed.token }
			: null;
	} catch {
		return null;
	}
}

export function saveOnlineSeat(gameId: string, seat: OnlineSeat) {
	try {
		localStorage.setItem(ONLINE_PLAYER_PREFIX + gameId, JSON.stringify(seat));
	} catch {
		// Not critical — worst case a reload shows the seat picker again.
	}
}

export function clearOnlineSeat(gameId: string) {
	try {
		localStorage.removeItem(ONLINE_PLAYER_PREFIX + gameId);
	} catch {
		// Nothing to clear if storage is unavailable.
	}
}
