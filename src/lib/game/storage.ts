import type { BoardState } from "./types";

const STORAGE_PREFIX = "armour-game:";
const ACTIVE_PLAYER_PREFIX = "armour-game:active-player:";

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
