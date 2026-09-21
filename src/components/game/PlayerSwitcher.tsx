"use client";

import { useActivePlayerId, useGameMode, useGameState } from "./GameContext";

// Fixed corner button, same family as Menu/Token menu — switches which
// player's board is the active, interactive one (see AGENTS.md's note on
// local hotseat testing). Purely a local view switch, not game state.
//
// Deliberately the one place in the UI that branches on game mode: in Online
// mode `activePlayerId` is fixed to whichever player this connection is
// bound to (assigned once at join) rather than a manual hotseat toggle, so
// there's nothing for this button to do there. This isn't a precedent for
// adding mode checks elsewhere — every other component (Board/Zone/Card/...)
// stays fully mode-agnostic; this one is inherently local-only by design.
export function PlayerSwitcher() {
	const state = useGameState();
	const [activePlayerId, setActivePlayerId] = useActivePlayerId();
	const mode = useGameMode();

	if (mode === "online" || state.players.length <= 1) return null;

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
			className="btn btn-icon fixed top-4 right-16 z-30 text-lg font-bold w-max px-2"
		>
			{activePlayer.name}
		</button>
	);
}
