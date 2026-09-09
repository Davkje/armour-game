"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
	const router = useRouter();
	const [showLocalSetup, setShowLocalSetup] = useState(false);
	const [playerCount, setPlayerCount] = useState(2);
	const [names, setNames] = useState<string[]>(["", "", "", ""]);

	function handleStartGame() {
		const params = new URLSearchParams({ players: String(playerCount) });
		for (let i = 0; i < playerCount; i++) {
			params.append("name", names[i].trim() || `Player ${i + 1}`);
		}
		router.push(`/game?${params.toString()}`);
	}

	if (showLocalSetup) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-8">
				<h1 className="font-semibold">Armour Game</h1>
				<div className="flex flex-col items-center gap-3">
					<span className="text-xl">Number of players</span>
					<div className="flex w-full gap-2 text-lg">
						{[2, 3, 4].map((count) => (
							<button
								key={count}
								type="button"
								onClick={() => setPlayerCount(count)}
								className={`w-12 py-2 grow aspect-square ${count === playerCount ? "btn-primary" : "btn-secondary"}`}
							>
								{count}
							</button>
						))}
					</div>
					<div className="flex w-full flex-col gap-2">
						{Array.from({ length: playerCount }, (_, i) => (
							<input
								key={i}
								type="text"
								value={names[i]}
								onChange={(e) => {
									const next = [...names];
									next[i] = e.target.value;
									setNames(next);
								}}
								placeholder={`Player ${i + 1}`}
								maxLength={20}
								className="w-full rounded-lg border border-black/20 px-4 py-2"
							/>
						))}
					</div>
					<div className="flex w-full flex-col gap-2">
						<button type="button" onClick={handleStartGame} className="btn-primary px-6 py-3">
							Start Game
						</button>
						<button
							type="button"
							onClick={() => setShowLocalSetup(false)}
							className="btn-secondary px-6 py-3"
						>
							Back
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-8">
			<div className="text-center">
				<h1 className="font-semibold mb-2">Armour Game</h1>
				<h2>Alpha Version</h2>
			</div>
			<div className="flex flex-col gap-3">
				<button
					type="button"
					onClick={() => setShowLocalSetup(true)}
					className="btn-primary px-6 py-3"
				>
					Local
				</button>
				<button
					type="button"
					disabled
					className="btn-secondary cursor-not-allowed px-6 py-3 opacity-50"
				>
					Online
				</button>
			</div>
		</div>
	);
}
