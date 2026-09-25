"use client";

import { useState } from "react";
import { playerColor } from "@/lib/game/playerColors";
import type { RosterSeat } from "@/lib/game/protocol";
import type { PlayerId } from "@/lib/game/types";

function ColorDot({ index }: { index: number }) {
	return (
		<span
			aria-hidden
			style={{ backgroundColor: playerColor(index) }}
			className="inline-block h-3 w-3 shrink-0 rounded-full"
		/>
	);
}

/**
 * Gates entry into the Online game tree until a seat is held — shown by
 * OnlineGameProvider.tsx in place of the board while connecting, while
 * choosing a seat, or after another window of the same player took the seat
 * over. The seat list is why a returning player on a new device (no saved
 * secret) can still get back in: they pick their own offline seat.
 */
export function OnlineJoinScreen({
	status,
	roster,
	playerCount,
	notice,
	onJoin,
	onUseThisWindow,
}: {
	status: "connecting" | "choosing" | "replaced";
	/** null until the server's first roster arrives. */
	roster: RosterSeat[] | null;
	playerCount: number;
	notice: string | null;
	onJoin: (choice: { name?: string; claimPlayerId?: PlayerId }) => void;
	onUseThisWindow: () => void;
}) {
	const [name, setName] = useState("");
	const trimmed = name.trim();

	const heading = <h1 className="font-semibold">Armour Game</h1>;
	const shell = (children: React.ReactNode) => (
		<div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
			{heading}
			{children}
		</div>
	);

	if (status === "connecting" || (status === "choosing" && roster === null)) {
		return shell(<p>Connecting…</p>);
	}

	if (status === "replaced") {
		return shell(
			<>
				<p className="max-w-sm text-center">
					This game was opened in another window, which took over your seat.
				</p>
				<button type="button" onClick={onUseThisWindow} className="btn-primary px-6 py-3">
					Use this window
				</button>
			</>,
		);
	}

	const seats = roster ?? [];
	// A brand-new room has no seats yet (the server builds them on the first
	// join), so there is nothing to pick from — just ask for a name.
	const isNewRoom = seats.length === 0;
	const offlineSeats = seats.filter((seat) => seat.claimed && !seat.online);
	const freeSeat = seats.find((seat) => !seat.claimed);
	const onlineSeats = seats.filter((seat) => seat.online);
	const nothingToJoin = !isNewRoom && offlineSeats.length === 0 && !freeSeat;

	const nameForm = (buttonLabel: string, claimPlayerId?: PlayerId) => (
		<form
			className="flex w-full flex-col gap-3"
			onSubmit={(e) => {
				e.preventDefault();
				if (trimmed) onJoin({ name: trimmed, claimPlayerId });
			}}
		>
			<input
				type="text"
				value={name}
				onChange={(e) => setName(e.target.value)}
				placeholder="Your name"
				maxLength={20}
				autoFocus={offlineSeats.length === 0}
				className="w-full rounded-lg border border-black/20 px-4 py-2"
			/>
			<button type="submit" className="btn-primary px-6 py-3" disabled={!trimmed}>
				{buttonLabel}
			</button>
		</form>
	);

	return shell(
		<div className="flex w-full max-w-xs flex-col gap-5">
			{notice && <p className="rounded-lg bg-yellow-100 px-4 py-2 text-center text-sm">{notice}</p>}

			{isNewRoom && nameForm("Join Game")}

			{offlineSeats.length > 0 && (
				<div className="flex flex-col gap-2">
					<span className="text-sm text-black/60">Already been here? Take your seat back:</span>
					{offlineSeats.map((seat) => (
						<button
							key={seat.playerId}
							type="button"
							onClick={() => onJoin({ claimPlayerId: seat.playerId })}
							className="btn-secondary flex items-center justify-start gap-3 px-4 py-3"
						>
							<ColorDot index={seats.indexOf(seat)} />
							<span className="min-w-0 flex-1 truncate text-left">Rejoin as {seat.name}</span>
							<span className="text-sm font-normal text-black/50">offline</span>
						</button>
					))}
				</div>
			)}

			{freeSeat && (
				<div className="flex flex-col gap-2">
					{offlineSeats.length > 0 && (
						<span className="text-sm text-black/60">Or join as someone new:</span>
					)}
					{nameForm("Join as a new player", freeSeat.playerId)}
				</div>
			)}

			{nothingToJoin && (
				<p className="text-center">
					This game is full — all {playerCount} players are connected right now.
				</p>
			)}

			{onlineSeats.length > 0 && (
				<p className="text-center text-md text-foreground">
					Players: {onlineSeats.map((seat) => seat.name).join(", ")}
				</p>
			)}
		</div>,
	);
}
