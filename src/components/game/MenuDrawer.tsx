"use client";

import { useRef } from "react";
import { PlayersPanel } from "./PlayersPanel";
import { RulesReference } from "./RulesReference";
import { Toolbar } from "./Toolbar";
import { RiCloseLine, RiMenuLine } from "@remixicon/react";

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
						<RiCloseLine />
					</button>
				</div>

				<div className="flex flex-col gap-6 overflow-y-auto p-6">
					<div className="border-t border-black/10 pt-6">
						<Toolbar />
					</div>
					<PlayersPanel />
					<div className="border-t border-black/10 pt-6">
						<RulesReference />
					</div>
					<div className="border-t border-black/10 pt-6">
						<h2 className="uppercase mb-6">Help</h2>
						<p>
							<strong>Flip Card</strong> - Right click
						</p>
						<p>
							<strong>Deck Menu</strong> Command Click a deck to open
						</p>
						<p>
							<strong>Conditions & Gold</strong> - Left Corner, drag to cards
						</p>
						<p>
							<strong>Round Tracker</strong> - Bottom Right, right click to open
						</p>
						<p>
							<strong>Invite Link</strong> - Url or in Menu
						</p>
					</div>
				</div>
			</dialog>
		</>
	);
}
