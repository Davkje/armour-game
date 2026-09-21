"use client";

import { useState } from "react";

/**
 * Gates entry into the Online game tree until a player identity is known —
 * shown by OnlineGameProvider.tsx in place of the board while connecting,
 * waiting for a name, or if the room is already full.
 */
export function OnlineJoinScreen({
	status,
	onJoin,
}: {
	status: "connecting" | "needs-name" | "full";
	onJoin: (name: string) => void;
}) {
	const [name, setName] = useState("");

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
			<h1 className="font-semibold">Armour Game</h1>

			{status === "connecting" && <p>Connecting…</p>}

			{status === "full" && (
				<p className="max-w-sm text-center">
					This game is already full — every seat has been claimed.
				</p>
			)}

			{status === "needs-name" && (
				<form
					className="flex w-full max-w-xs flex-col gap-3"
					onSubmit={(e) => {
						e.preventDefault();
						const trimmed = name.trim();
						if (trimmed) onJoin(trimmed);
					}}
				>
					<input
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Your name"
						maxLength={20}
						autoFocus
						className="w-full rounded-lg border border-black/20 px-4 py-2"
					/>
					<button type="submit" className="btn-primary px-6 py-3" disabled={!name.trim()}>
						Join Game
					</button>
				</form>
			)}
		</div>
	);
}
