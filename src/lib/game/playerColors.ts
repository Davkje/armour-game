// One color per seat, by player index — used for the live cursors and the
// Players list in the menu so a person is the same color everywhere. There is
// no per-player color in the game data (see AGENTS.md); this is presentation only.
export const PLAYER_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b"];

export function playerColor(playerIndex: number): string {
	return PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
}
