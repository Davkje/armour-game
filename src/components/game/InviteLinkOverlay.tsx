"use client";

import { useState } from "react";

export function InviteLinkOverlay({ onClose }: { onClose: () => void }) {
	const [url] = useState(() => window.location.href);
	const [copied, setCopied] = useState(false);

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Clipboard API can refuse (insecure context, denied permission) —
			// the link is still shown and selectable by hand, so not fatal.
		}
	}

	return (
		<div
			className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4"
			onClick={onClose}
		>
			<div
				className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-background p-6 shadow-xl"
				onClick={(e) => e.stopPropagation()}
			>
				<h3>Invite players</h3>
				<p className="text-sm text-black/60">Share this link to invite a player!</p>
				<div className="flex gap-2">
					<input
						type="text"
						readOnly
						value={url}
						onFocus={(e) => e.target.select()}
						className="min-w-0 flex-1 truncate rounded-sm border border-black/20 px-2 py-1.5 text-sm"
					/>
					<button
						type="button"
						onClick={handleCopy}
						className="btn-secondary shrink-0 px-3 py-1.5 text-sm"
					>
						{copied ? "Copied!" : "Copy"}
					</button>
				</div>
				<button type="button" onClick={onClose} className="btn-primary px-4 py-2">
					Got it
				</button>
			</div>
		</div>
	);
}
