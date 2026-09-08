"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
	const router = useRouter();
	const [showLocalSetup, setShowLocalSetup] = useState(false);
	const [playerCount, setPlayerCount] = useState(2);

	if (showLocalSetup) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-8">
				<h1 className="font-semibold">Armour</h1>
				<div className="flex flex-col items-center gap-4">
					<span className="text-md">Number of players</span>
					<div className="flex gap-2">
						{[2, 3, 4].map((count) => (
							<button
								key={count}
								type="button"
								onClick={() => setPlayerCount(count)}
								className={`w-12 py-2 ${count === playerCount ? "btn-primary" : "btn-secondary"}`}
							>
								{count}
							</button>
						))}
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => setShowLocalSetup(false)}
							className="btn-secondary px-6 py-3"
						>
							Back
						</button>
						<button
							type="button"
							onClick={() => router.push(`/game?players=${playerCount}`)}
							className="btn-primary px-6 py-3"
						>
							Start Game
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-8">
			<h1 className="font-semibold">Armour</h1>
			<div className="flex flex-col gap-4">
				<button
					type="button"
					onClick={() => setShowLocalSetup(true)}
					className="btn-primary px-6 py-3"
				>
					Local
				</button>
				<button type="button" disabled className="btn-secondary cursor-not-allowed px-6 py-3 opacity-50">
					Online
				</button>
			</div>
		</div>
	);
}
