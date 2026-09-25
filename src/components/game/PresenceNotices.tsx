"use client";

export type PresenceNotice = { id: number; text: string };

/**
 * Small transient bubbles ("Bob joined the game") stacked at the top centre —
 * fed by the room server's "presence" messages (see OnlineGameProvider.tsx,
 * which also removes each one after a few seconds). Purely informational, so
 * it never intercepts pointer events over the board.
 */
export function PresenceNotices({ notices }: { notices: PresenceNotice[] }) {
	if (notices.length === 0) return null;

	return (
		<div
			aria-live="polite"
			className="pointer-events-none fixed top-3 left-1/2 z-90 flex -translate-x-1/2 flex-col items-center gap-2"
		>
			{notices.map((notice) => (
				<div
					key={notice.id}
					style={{ animation: "notice-in 200ms ease-out" }}
					className="rounded-full bg-foreground px-4 py-1.5 text-sm text-background shadow-lg"
				>
					{notice.text}
				</div>
			))}
		</div>
	);
}
