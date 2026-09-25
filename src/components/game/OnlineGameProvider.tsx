"use client";

import { useRef, useState, type Dispatch, type ReactNode } from "react";
import usePartySocket from "partysocket/react";
import { gameReducer } from "@/lib/game/reducer";
import { clearOnlineSeat, loadOnlineSeat, saveOnlineSeat, type OnlineSeat } from "@/lib/game/storage";
import type { ClientMessage, RosterSeat, ServerMessage } from "@/lib/game/protocol";
import type { BoardState, GameAction, PlayerId, Position, ZoneId } from "@/lib/game/types";
import {
	ActivePlayerContext,
	CursorContext,
	GameDispatchContext,
	GameModeContext,
	GameStateContext,
	RosterContext,
} from "./GameContext";
import { InviteLinkOverlay } from "./InviteLinkOverlay";
import { OnlineJoinScreen } from "./OnlineJoinScreen";
import { PresenceNotices, type PresenceNotice } from "./PresenceNotices";

// Falls back to the local `partykit dev` default (see AGENTS.md) so this
// works out of the box without any env setup; set for real once the party
// server has an actual deployed host.
const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "127.0.0.1:1999";

// "choosing": connected but not seated — the join screen offers the seats.
// "replaced": another window of the same player took the seat over.
type Status = "connecting" | "choosing" | "replaced" | "joined";

// The server closes a connection with this code when a newer one of the same
// player takes its seat (party/index.ts) — it must not auto-reconnect, or two
// open tabs would keep kicking each other out.
const REPLACED_CLOSE_CODE = 4000;

const JOIN_REJECTED_TEXT = {
	full: "Every seat is taken by someone who is connected right now.",
	taken: "Someone just took that seat — pick another one.",
	"unknown-seat": "We couldn't match your saved seat — pick your seat below.",
} as const;

// A cursor's rendered position holds steady if its owner just isn't moving
// their mouse, so the only way to know one has actually gone stale (closed
// tab, network drop — party/index.ts has no "player left" message) is to
// clear it if no update arrives for a while.
const CURSOR_STALE_MS = 4_000;
// Sending on every raw mousemove would be dozens of messages/sec per player;
// this is a floor on time between sends, not a smoothing/animation rate.
const CURSOR_SEND_THROTTLE_MS = 50;
// How long a "Bob joined the game" bubble stays on screen.
const NOTICE_VISIBLE_MS = 4_000;

const PRESENCE_TEXT = {
	joined: "joined the game",
	reconnected: "reconnected",
	disconnected: "disconnected",
} as const;

/**
 * Online mode's implementation of the shared GameContext interface (see
 * GameContext.tsx) — backed by a PartyKit room instead of GameProvider.tsx's
 * local useReducer. The room (see party/index.ts) is still the sole
 * *authority*: every action is sent over the socket, and whatever it
 * broadcasts back always wins, overwriting local state outright.
 *
 * `dispatch` also applies the action locally right away via the same
 * `gameReducer` GameProvider.tsx uses, purely as an optimistic prediction —
 * without this, the DOM wouldn't reflect a move until the server round-trip
 * completed, and dnd-kit's drop animation (which measures the dragged card's
 * *actual* DOM position right after the drop) would animate toward its stale
 * pre-drop spot instead of where it was actually dropped. Because actions
 * carry their own randomness/ids (see createShuffleSeed in reducer.ts),
 * this local prediction and the server's own run of the identical action
 * produce identical results in the common case, so the eventual broadcast
 * arrives as a no-op replace; it only visibly corrects anything if another
 * player's action was interleaved in between, which is rare and acceptable
 * for this sandbox game (see AGENTS.md's design philosophy).
 */
export function OnlineGameProvider({
	children,
	gameId,
	playerCount,
}: {
	children: ReactNode;
	gameId: string;
	playerCount: number;
}) {
	const [status, setStatus] = useState<Status>("connecting");
	const [playerId, setPlayerId] = useState<PlayerId | null>(null);
	const [state, setState] = useState<BoardState | null>(null);
	const [cursors, setCursors] = useState<Record<PlayerId, { zoneId: ZoneId; position: Position }>>({});
	const lastCursorSentAtRef = useRef(0);
	const cursorExpiryTimersRef = useRef<Record<PlayerId, ReturnType<typeof setTimeout>>>({});
	// Shown once per tab, right after the FIRST successful join — guarded by
	// a ref (not just checking `status`) so PartySocket's automatic
	// reconnects after a network blip, which also send a fresh "joined"
	// message, don't pop it back up mid-game.
	const hasShownInviteRef = useRef(false);
	const [showInviteOverlay, setShowInviteOverlay] = useState(false);
	const [notices, setNotices] = useState<PresenceNotice[]>([]);
	const nextNoticeIdRef = useRef(0);
	// null until the server's first roster arrives (it sends one on connect).
	const [roster, setRoster] = useState<RosterSeat[] | null>(null);
	const [joinNotice, setJoinNotice] = useState<string | null>(null);
	// The seat + secret this browser holds, kept in a ref too so `onOpen` (which
	// runs again on every automatic reconnect) always sees the latest.
	const seatRef = useRef<OnlineSeat | null>(null);

	const socket = usePartySocket({
		host: PARTYKIT_HOST,
		// partyserver routes /parties/<kebab-cased binding name>/<room> and, unlike
		// the old PartyKit platform, has no default "main" party — this must match
		// the `GameServer` binding in wrangler.jsonc.
		party: "game-server",
		room: gameId,
		onOpen() {
			// Every (re)connection — including PartySocket's own automatic
			// reconnects after a network blip — has to prove who it is again; the
			// server's per-connection state doesn't survive a dropped socket. The
			// seat + secret pair lets us take our seat back even if the server
			// hasn't noticed the old socket died yet.
			const saved = seatRef.current ?? loadOnlineSeat(gameId);
			if (saved) {
				seatRef.current = saved;
				const message: ClientMessage = {
					type: "join",
					playerCount,
					rejoinPlayerId: saved.playerId,
					rejoinToken: saved.token,
				};
				socket.send(JSON.stringify(message));
			} else {
				setStatus("choosing");
			}
		},
		onClose(event) {
			if (event.code === REPLACED_CLOSE_CODE) {
				socket.close();
				setStatus("replaced");
			}
		},
		onMessage(event) {
			const message = JSON.parse(event.data as string) as ServerMessage;
			if (message.type === "joined") {
				seatRef.current = { playerId: message.playerId, token: message.token };
				setPlayerId(message.playerId);
				saveOnlineSeat(gameId, seatRef.current);
				setStatus("joined");
				setJoinNotice(null);
				// No point inviting more people to a room that's already full.
				if (!hasShownInviteRef.current && message.occupiedSeats < message.totalSeats) {
					hasShownInviteRef.current = true;
					setShowInviteOverlay(true);
				}
			} else if (message.type === "join-rejected") {
				// A saved seat that didn't check out is no use — forget it so the
				// next reconnect doesn't just retry it.
				if (message.reason === "unknown-seat") {
					seatRef.current = null;
					clearOnlineSeat(gameId);
				}
				setJoinNotice(JOIN_REJECTED_TEXT[message.reason]);
				setStatus("choosing");
			} else if (message.type === "roster") {
				setRoster(message.seats);
			} else if (message.type === "state") {
				setState(message.state);
			} else if (message.type === "presence") {
				const id = nextNoticeIdRef.current++;
				const text = `${message.name} ${PRESENCE_TEXT[message.event]}`;
				setNotices((prev) => [...prev, { id, text }]);
				setTimeout(() => setNotices((prev) => prev.filter((n) => n.id !== id)), NOTICE_VISIBLE_MS);
			} else if (message.type === "cursor") {
				const { playerId: fromPlayerId, zoneId, position } = message;
				setCursors((prev) => ({ ...prev, [fromPlayerId]: { zoneId, position } }));

				clearTimeout(cursorExpiryTimersRef.current[fromPlayerId]);
				cursorExpiryTimersRef.current[fromPlayerId] = setTimeout(() => {
					setCursors((prev) => {
						const next = { ...prev };
						delete next[fromPlayerId];
						return next;
					});
				}, CURSOR_STALE_MS);
			}
		},
	});

	// From the join screen: a new name for a free seat, and/or an explicit seat.
	function handleJoin(choice: { name?: string; claimPlayerId?: PlayerId }) {
		setJoinNotice(null);
		const message: ClientMessage = { type: "join", playerCount, ...choice };
		socket.send(JSON.stringify(message));
	}

	// The "replaced" screen's button — this window takes the seat back.
	function handleUseThisWindow() {
		setStatus("connecting");
		socket.reconnect();
	}

	const joinScreen = (screenStatus: "connecting" | "choosing" | "replaced") => (
		<OnlineJoinScreen
			status={screenStatus}
			roster={roster}
			playerCount={playerCount}
			notice={joinNotice}
			onJoin={handleJoin}
			onUseThisWindow={handleUseThisWindow}
		/>
	);

	const dispatch: Dispatch<GameAction> = (action) => {
		setState((prev) => (prev ? gameReducer(prev, action) : prev));
		const message: ClientMessage = { type: "action", action };
		socket.send(JSON.stringify(message));
	};

	function sendCursor(zoneId: ZoneId, position: Position) {
		const now = Date.now();
		if (now - lastCursorSentAtRef.current < CURSOR_SEND_THROTTLE_MS) return;
		lastCursorSentAtRef.current = now;
		const message: ClientMessage = { type: "cursor", zoneId, position };
		socket.send(JSON.stringify(message));
	}

	// Checked as two separate guards (rather than one `||`) so TypeScript can
	// narrow `status` to the join screen's exact prop type in the first — a
	// combined condition loses that narrowing across the `||`.
	if (status !== "joined") return joinScreen(status);
	if (!state || !playerId) return joinScreen("connecting");

	// activePlayerId is fixed to whichever seat this connection claimed — no
	// manual switching online, so the setter is a stable no-op (PlayerSwitcher
	// doesn't render in Online mode anyway; see GameContext.tsx/PlayerSwitcher.tsx).
	const activePlayerState: [PlayerId | undefined, (id: PlayerId) => void] = [playerId, () => {}];

	return (
		<GameModeContext.Provider value="online">
			<GameStateContext.Provider value={state}>
				<GameDispatchContext.Provider value={dispatch}>
					<ActivePlayerContext.Provider value={activePlayerState}>
						<CursorContext.Provider value={{ cursors, sendCursor }}>
							<RosterContext.Provider value={roster ?? []}>
							{children}
							<PresenceNotices notices={notices} />
							{showInviteOverlay && (
								<InviteLinkOverlay onClose={() => setShowInviteOverlay(false)} />
							)}
							</RosterContext.Provider>
						</CursorContext.Provider>
					</ActivePlayerContext.Provider>
				</GameDispatchContext.Provider>
			</GameStateContext.Provider>
		</GameModeContext.Provider>
	);
}
