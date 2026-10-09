"use client";

import { useEffect, useRef, useState } from "react";
import { RiPencilFill } from "@remixicon/react";

/**
 * A free scratchpad (e.g. for tallying up scores at the end of a game) — not
 * game state: purely local to this browser, never synced through
 * GameContext/the room server, so it doesn't need Local/Online branching or
 * persistence of its own. Same click-outside/Escape-to-close pattern as
 * TokenMenu.tsx/RoundTracker.tsx.
 *
 * Deliberately *not* a floating popup — it fuses flush with its own trigger
 * button (one continuous black bar, same height, no seam) and reaches over
 * to the RoundTracker/DiceRoller buttons on open rather than stopping at
 * some guessed width.
 */
export function NotesPanel() {
	const [isOpen, setIsOpen] = useState(false);
	const [notes, setNotes] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		if (!isOpen) return;

		function handlePointerDown(e: PointerEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		}
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") setIsOpen(false);
		}

		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	// The field stays mounted at all times (see the textarea below) so this
	// has to focus it by hand on every open — React's `autoFocus` only fires
	// once, on the element's first-ever mount.
	useEffect(() => {
		if (isOpen) textareaRef.current?.focus();
	}, [isOpen]);

	return (
		<div
			ref={containerRef}
			className={`flex h-10 transition-[flex-grow] duration-300 ease-out ${isOpen ? "grow" : "grow-0"}`}
		>
			<button
				type="button"
				aria-label="Notes"
				onClick={() => setIsOpen((open) => !open)}
				className={`btn-icon shrink-0 ${isOpen ? "" : ""}`}
			>
				<RiPencilFill />
			</button>

			<div
				className={`-ml-1 h-10 min-w-0 grow overflow-hidden transition-[max-width] duration-300 ease-out ${
					isOpen ? "max-w-[2000px]" : "max-w-0"
				}`}
			>
				<textarea
					ref={textareaRef}
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					placeholder="…"
					tabIndex={isOpen ? 0 : -1}
					className="h-10 w-full resize-none rounded-r-sm bg-black px-3 py-2 text-lg leading-5 text-white placeholder:text-white/50 focus:outline-none"
				/>
			</div>
		</div>
	);
}
