"use client";

import { useRef, useState, type Dispatch, type ReactNode } from "react";
import usePartySocket from "partysocket/react";
import { gameReducer } from "@/lib/game/reducer";
import { loadOnlinePlayerId, saveOnlinePlayerId } from "@/lib/game/storage";
import type { ClientMessage, ServerMessage } from "@/lib/game/protocol";
import type { BoardState, GameAction, PlayerId, Position, ZoneId } from "@/lib/game/types";
import {
	ActivePlayerContext,
	CursorContext,
	GameDispatchContext,
	GameModeContext,
	GameStateContext,
} from "./GameContext";
import { InviteLinkOverlay } from "./InviteLinkOverlay";
import { OnlineJoinScreen } from "./OnlineJoinScreen";

// Falls back to the local `partykit dev` default (see AGENTS.md) so this
// works out of the box without any env setup; set for real once the party
// server has an actual deployed host.
const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "127.0.0.1:1999";

type Status = "connecting" | "needs-name" | "full" | "joined";

// A cursor's rendered position holds steady if its owner just isn't moving
// their mouse, so the only way to know one has actually gone stale (closed
// tab, network drop — party/index.ts has no "player left" message) is to
// clear it if no update arrives for a while.
const CURSOR_STALE_MS = 4_000;
// Sending on every raw mousemove would be dozens of messages/sec per player;
// this is a floor on time between sends, not a smoothing/animation rate.
const CURSOR_SEND_THROTTLE_MS = 50;

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
	// A ref alongside the state so `onOpen` (which can fire again on an
	// automatic reconnect, long after this render's closure was created) can
	// always read the *current* claimed identity, not whatever it was when
	// the socket was first opened.
	const playerIdRef = useRef<PlayerId | null>(null);
	const lastCursorSentAtRef = useRef(0);
	const cursorExpiryTimersRef = useRef<Record<PlayerId, ReturnType<typeof setTimeout>>>({});
	// Shown once per tab, right after the FIRST successful join — guarded by
	// a ref (not just checking `status`) so PartySocket's automatic
	// reconnects after a network blip, which also send a fresh "joined"
	// message, don't pop it back up mid-game.
	const hasShownInviteRef = useRef(false);
	const [showInviteOverlay, setShowInviteOverlay] = useState(false);

	const socket = usePartySocket({
		host: PARTYKIT_HOST,
		// partyserver routes /parties/<kebab-cased binding name>/<room> and, unlike
		// the old PartyKit platform, has no default "main" party — this must match
		// the `GameServer` binding in wrangler.jsonc.
		party: "game-server",
		room: gameId,
		onOpen() {
			// Every (re)connection — including PartySocket's own automatic
			// reconnects after a network blip — needs to re-assert who this
			// connection is; the server's Connection#state doesn't survive a
			// dropped socket even though the seat itself is held for a grace
			// period (see party/index.ts's DISCONNECT_GRACE_MS).
			const known = playerIdRef.current ?? loadOnlinePlayerId(gameId);
			if (known) {
				const message: ClientMessage = { type: "join", playerCount, rejoinPlayerId: known };
				socket.send(JSON.stringify(message));
			} else {
				setStatus("needs-name");
			}
		},
		onMessage(event) {
			const message = JSON.parse(event.data as string) as ServerMessage;
			if (message.type === "joined") {
				playerIdRef.current = message.playerId;
				setPlayerId(message.playerId);
				saveOnlinePlayerId(gameId, message.playerId);
				setStatus("joined");
				// No point inviting more people to a room that's already full.
				if (!hasShownInviteRef.current && message.occupiedSeats < message.totalSeats) {
					hasShownInviteRef.current = true;
					setShowInviteOverlay(true);
				}
			} else if (message.type === "join-rejected") {
				setStatus("full");
			} else if (message.type === "state") {
				setState(message.state);
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

	function handleJoinWithName(name: string) {
		const message: ClientMessage = { type: "join", name, playerCount };
		socket.send(JSON.stringify(message));
	}

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
	// narrow `status` to OnlineJoinScreen's exact prop type in the first — a
	// combined condition loses that narrowing across the `||`.
	if (status !== "joined") {
		return <OnlineJoinScreen status={status} onJoin={handleJoinWithName} />;
	}
	if (!state || !playerId) {
		return <OnlineJoinScreen status="connecting" onJoin={handleJoinWithName} />;
	}

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
							{children}
							{showInviteOverlay && (
								<InviteLinkOverlay onClose={() => setShowInviteOverlay(false)} />
							)}
						</CursorContext.Provider>
					</ActivePlayerContext.Provider>
				</GameDispatchContext.Provider>
			</GameStateContext.Provider>
		</GameModeContext.Provider>
	);
}
