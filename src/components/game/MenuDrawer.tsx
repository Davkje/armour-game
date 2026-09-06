"use client";

import { useRef } from "react";
import { RulesReference } from "./RulesReference";
import { Toolbar } from "./Toolbar";
import { RiMenuLine } from "@remixicon/react";

export function MenuDrawer() {
	const dialogRef = useRef<HTMLDialogElement>(null);

	return (
		<>
			<button
				type="button"
				aria-label="Open menu"
				onClick={() => dialogRef.current?.showModal()}
				className="btn-icon fixed top-4 right-4 z-30 text-lg"
			>
				<RiMenuLine />
			</button>

			<dialog
				ref={dialogRef}
				aria-labelledby="menu-drawer-title"
				onClick={(e) => {
					if (e.target === dialogRef.current) dialogRef.current?.close();
				}}
				className="menu-drawer flex flex-col bg-background p-0 shadow-2xl min-w-[40vw]"
			>
				<div className="flex shrink-0 items-center justify-between p-6 pb-0">
					<h2 id="menu-drawer-title" className="font-semibold tracking-widest uppercase">
						Menu
					</h2>
					<button
						type="button"
						aria-label="Close menu"
						onClick={() => dialogRef.current?.close()}
						className="btn-icon-ghost"
					>
						✕
					</button>
				</div>

				<div className="flex flex-col gap-6 overflow-y-auto p-6">
					<Toolbar />
					<div className="border-t border-black/10 pt-6">
						<RulesReference />
					</div>
				</div>
			</dialog>
		</>
	);
}
