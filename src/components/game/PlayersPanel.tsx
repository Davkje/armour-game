"use client";

import { useState } from "react";
import { useActivePlayerId, useGameMode, useGameState, useRoster } from "./GameContext";
import { playerColor } from "@/lib/game/playerColors";

/**
 * The menu's "Players" section: everyone's name and color (the same color as
 * their live cursor), whether they're connected, and — online — a one-click
 * copy of the invite link. The room's own address IS the invite link (there is
 * no separate "original" one), so this is the same link the popup showed when
 * the game started, for anyone who didn't copy it then.
 */
export function PlayersPanel() {
	const state = useGameState();
	const mode = useGameMode();
	const roster = useRoster();
	const [activePlayerId] = useActivePlayerId();
	const [copied, setCopied] = useState(false);

	async function copyInviteLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Clipboard can be refused (insecure context, denied permission) —
			// the address bar still has the link.
		}
	}

	return (
		<section className="flex flex-col gap-3">
			<h3>Players</h3>
			<ul className="flex flex-col gap-2">
				{state.players.map((player, index) => {
					const seat = roster.find((s) => s.playerId === player.id);
					const isMe = mode === "online" && player.id === activePlayerId;
					// Local mode has no connections — everyone is just "at the table".
					const status =
						mode !== "online" ? null : !seat?.claimed ? "waiting" : seat.online ? "online" : "offline";

					return (
						<li key={player.id} className="flex items-center gap-3">
							<span
								aria-hidden
								style={{ backgroundColor: playerColor(index) }}
								className={`inline-block h-3 w-3 shrink-0 rounded-full ${status === "offline" || status === "waiting" ? "opacity-40" : ""}`}
							/>
							<span className={`min-w-0 flex-1 truncate ${status === "waiting" ? "text-black/40" : ""}`}>
								{status === "waiting" ? "Empty seat" : player.name}
								{isMe && <span className="ml-2 text-sm text-black/50">(You)</span>}
							</span>
							{status && (
								<span className="text-sm text-black/50">
									{status === "online" ? "online" : status === "offline" ? "offline" : "waiting"}
								</span>
							)}
						</li>
					);
				})}
			</ul>
			{mode === "online" && (
				<button type="button" onClick={copyInviteLink} className="btn-secondary px-4 py-2 text-sm">
					{copied ? "Copied!" : "Copy invite link"}
				</button>
			)}
		</section>
	);
}
