"use client";

import { useEffect, useRef, useState } from "react";
import { useSendDiceRoll } from "./GameContext";
import {
	RiDice1Fill,
	RiDice2Fill,
	RiDice3Fill,
	RiDice4Fill,
	RiDice5Fill,
	RiDice6Fill,
} from "@remixicon/react";

const DICE_FACES = [RiDice1Fill, RiDice2Fill, RiDice3Fill, RiDice4Fill, RiDice5Fill, RiDice6Fill];

// How fast the shown number flickers through random faces while rolling.
const ROLL_TICK_MS = 80;
// Total time the dice spins before landing on the real result — the CSS
// animation runs exactly once over this same span (see dice-roll in
// globals.css), so it winds down to a natural stop on its own rather than
// being cut off mid-turn by React removing the style.
const ROLL_DURATION_MS = 1100;

export default function DiceRoller() {
	const [diceNumber, setDiceNumber] = useState(6);
	const [isRolling, setIsRolling] = useState(false);
	const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const sendDiceRoll = useSendDiceRoll();

	// Only matters if the component unmounts mid-roll (e.g. leaving the game).
	useEffect(() => {
		return () => {
			if (tickRef.current) clearInterval(tickRef.current);
		};
	}, []);

	function rollDice() {
		if (isRolling) return;
		setIsRolling(true);
		const startedAt = Date.now();

		tickRef.current = setInterval(() => {
			const face = Math.floor(Math.random() * 6) + 1;
			setDiceNumber(face);
			if (Date.now() - startedAt >= ROLL_DURATION_MS) {
				if (tickRef.current) clearInterval(tickRef.current);
				setIsRolling(false);
				sendDiceRoll(face);
			}
		}, ROLL_TICK_MS);
	}

	const DiceFace = DICE_FACES[diceNumber - 1];

	return (
		// Positioning is owned by the shared fixed row in GameScreen.tsx — this
		// used to be `fixed right-16 bottom-4` on its own.
		<div className="group flex">
			<button
				type="button"
				aria-label="Roll dice"
				onClick={rollDice}
				style={{ animation: isRolling ? `dice-roll ${ROLL_DURATION_MS}ms ease-in-out 1` : undefined }}
				className="btn-icon h-10 bg-white"
			>
				<DiceFace className="-m-2" color="black" size={53} />
			</button>
		</div>
	);
}
