"use client";

import { useDraggable } from "@dnd-kit/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CONDITIONS } from "@/lib/game/conditions";
import type { ConditionType } from "@/lib/game/types";

const listVariants = {
	hidden: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
	visible: { transition: { staggerChildren: 0.03 } },
};

const itemVariants = {
	hidden: { opacity: 0, y: 10, scale: 0.7 },
	visible: { opacity: 1, y: 0, scale: 1 },
};

function TokenDot({ id, name, color }: { id: ConditionType; name: string; color: string }) {
	const { ref, isDragging } = useDraggable({ id: `token:${id}`, type: "token" });

	return (
		<motion.button
			ref={ref}
			type="button"
			title={name}
			aria-label={`${name} condition token`}
			variants={itemVariants}
			transition={{ type: "spring", stiffness: 500, damping: 30 }}
			style={{ touchAction: "none", backgroundColor: `var(${color})` }}
			className={`h-8 w-8 rounded-full border-2 border-black/40 ${
				isDragging ? "opacity-40" : "cursor-grab"
			}`}
		/>
	);
}

export function TokenMenu() {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

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

	return (
		<div
			ref={containerRef}
			className="fixed bottom-4 left-4 z-30 flex flex-col-reverse items-center gap-1.5"
		>
			<button
				type="button"
				aria-label="Token menu"
				onClick={() => setIsOpen((open) => !open)}
				className="btn btn-icon"
			>
				▲
			</button>

			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial="hidden"
						animate="visible"
						exit="hidden"
						variants={listVariants}
						className="flex flex-col gap-1.5"
					>
						{CONDITIONS.map((condition) => (
							<TokenDot
								key={condition.id}
								id={condition.id}
								name={condition.name}
								color={condition.color}
							/>
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
