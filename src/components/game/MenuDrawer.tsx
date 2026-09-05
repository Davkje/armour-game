"use client";

import { useRef } from "react";
import { Toolbar } from "./Toolbar";

export function MenuDrawer() {
	const dialogRef = useRef<HTMLDialogElement>(null);

	return (
		<>
			<button
				type="button"
				aria-label="Open menu"
				onClick={() => dialogRef.current?.showModal()}
				className="fixed top-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-md bg-black text-lg text-white"
			>
				☰
			</button>

			{/*
			 * Native <dialog> via showModal() gives us focus trapping and
			 * Escape-to-close for free — no custom keyboard/focus handling
			 * needed. Clicking the backdrop closes it (checking the click
			 * target against the dialog itself, since the backdrop is
			 * technically part of the dialog element's own hit area).
			 */}
			<dialog
				ref={dialogRef}
				aria-labelledby="menu-drawer-title"
				onClick={(e) => {
					if (e.target === dialogRef.current) dialogRef.current?.close();
				}}
				className="menu-drawer bg-background p-6 shadow-2xl"
			>
				<div className="flex h-full flex-col gap-6">
					<div className="flex items-center justify-between">
						<h2 id="menu-drawer-title" className="text-sm font-semibold tracking-widest uppercase">
							Menu
						</h2>
						<button
							type="button"
							aria-label="Close menu"
							onClick={() => dialogRef.current?.close()}
							className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-black/5"
						>
							✕
						</button>
					</div>
					{/* Everything else (settings, rules reference, etc.) lands here later. */}
					<Toolbar />
				</div>
			</dialog>
		</>
	);
}
