"use client";

import { useActivePlayerId, useGameState } from "./GameProvider";

// Fixed corner button, same family as Menu/Token menu — switches which
// player's board is the active, interactive one (see AGENTS.md's note on
// local hotseat testing). Purely a local view switch, not game state.
export function PlayerSwitcher() {
	const state = useGameState();
	const [activePlayerId, setActivePlayerId] = useActivePlayerId();

	if (state.players.length <= 1) return null;

	const activePlayer = state.players.find((p) => p.id === activePlayerId) ?? state.players[0];

	function handleClick() {
		const ids = state.players.map((p) => p.id);
		const currentIndex = ids.indexOf(activePlayerId ?? ids[0]);
		setActivePlayerId(ids[(currentIndex + 1) % ids.length]);
	}

	return (
		<button
			type="button"
			title={`Change player — you are ${activePlayer.name}`}
			aria-label="Change active player"
			onClick={handleClick}
			className="btn btn-icon fixed top-4 right-16 z-30 text-lg font-bold"
		>
			{activePlayer.name.replace(/[^0-9]/g, "") || activePlayer.name.slice(0, 1)}
		</button>
	);
}
