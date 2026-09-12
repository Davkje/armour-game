<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Armour Game

## Overview

Armour is a physical card/board game designed by David and his brother Gustav, already playtested in physical form. This project is a **digital playtest version** — a tool to speed up playtesting (including remotely) and a learning project for David (frontend dev, React/Next.js/TypeScript).

Game premise: a party has survived a catastrophic quest but lost all their gear. Over 10 rounds, players loot, shop, battle, and betray each other to collect items. At the end, points are tallied from equipped items, set bonuses, race bonuses, and a randomly assigned quest-giver's likes/dislikes.

## Design Philosophy: Sandbox, Not a Rules Engine

This is the core architectural decision. The app is a **virtual tabletop** (like a scoped-down Tabletop Simulator for this one game), not a system that enforces game rules in code.

- Cards and tokens are freely draggable objects on a board with zones (decks, discard, player areas, shared table).
- The only hardcoded logic is **auto-shuffle and deal at game start**.
- Turn order is a **soft indicator only** — the UI shows whose turn it is, but nothing technically blocks other players from acting. Honor system, like a physical game.
- End-game scoring is **semi-automatic**: players mark which items are equipped, the app calculates score from item data + quest-giver rules (not fully automatic, since quest-giver rules are partly free-text/flavorful).
- This is deliberate: locking game rules into code too early makes it expensive to iterate on rule ideas, and the rules are still evolving.

### Note: per-zone/deck setup config (not yet built)

Bug found in Phase 0: moving a card between zones was forcibly flipping it face-up (except in decks) — fixed so `MOVE_CARD` never changes which side faces up; only an explicit flip action does. No implicit "reveal on placement" behavior.

This raised a related idea worth remembering: once Phase 1 introduces multiple real deck types (items, events, etc.), they'll likely need different **setup** behavior — e.g. starts face up/down, starts shuffled or not. Since zones are already plain data (`Zone` records in `src/lib/game/`, not components), the natural extension is optional fields on `Zone` (e.g. `dealFaceDown?`, `startShuffled?`) read once in `buildInitialState()` — still just setup, not a runtime rule, so it stays consistent with the sandbox philosophy above. Deliberately not building this yet — wait until Phase 1's real deck types show what actually needs to vary, rather than guessing now.

### Note: condition/status tokens

Built: small colored tokens representing the physical game's **Conditions** (Broken, Rusty, Dirty, Enchanted, Cursed, Wound, Battle-Scarred — see "Rules reference" below; shared metadata in `src/lib/game/conditions.ts`). Opened via the token menu button (bottom-left, `TokenMenu.tsx`), which works like the round tracker's picker — an upward-opening palette of dots, each an infinite supply (dragging one out doesn't remove it from the menu).

Implementation note: a token is a dnd-kit draggable with `type: "token"`; each card is *also* a droppable (`accept: "token"`) in addition to being draggable itself, so tokens can land on a card in any zone (Player Area, Equipped Items slots, hand, etc.) without per-zone special-casing. Zones' own droppables are scoped to `accept: "card"` so a token dragged over a zone never collides with the zone itself, only the card underneath. Attaching/removing conditions is purely visual bookkeeping on `BoardCard.conditions` — no rule enforcement (e.g. nothing stops you from adding "wound" without an item slot), consistent with the sandbox philosophy above; that logic is for a later phase if it's ever needed.

**Board tokens** (e.g. gold/currency) are a second, distinct token category: freestanding pieces that drop directly into a free-layout zone (currently just Player Area) instead of attaching to a card — modeled separately in `state.tokens` (`BoardToken`, see `types.ts`), not on `BoardCard`. Free zones accept both `"card"` and `"board-token"` drag types. Dragging one out of the token menu (`TokenMenu.tsx`'s `GoldSpawner`, id `spawn-token:gold`) spawns a brand-new `BoardToken`; an already-placed one (`GoldToken.tsx`) drags with its own real id to reposition it — Board.tsx's `handleDragEnd` tells the two apart by checking whether the source id is a known token in `state.tokens`. Extend `FreeTokenType` for any future non-attachable token kind.

## Tech Stack

- **Frontend:** Next.js + React + TypeScript
- **Hosting:** Vercel
- **Multiplayer sync:** PartyKit (built on Cloudflare Workers/Durable Objects) — chosen because it has "rooms" as a first-class primitive (matches the "host game → shareable link → join" requirement) and can filter which part of state each client sees (matches the private-hand requirement below) — both would otherwise need to be hand-built on a generic BaaS. Colyseus is a viable alternative if PartyKit doesn't pan out; not yet finalized, evaluate both before Phase 2.
  - Cost: free in practice at this project's scale. PartyKit itself has no platform fee (post Cloudflare acquisition); you pay only for underlying Cloudflare Workers/Durable Objects usage, which has a generous free tier (100k requests/day). Cloudflare's paid plan, if ever needed, starts at $5/month.

## Multiplayer State Model

Two categories of state, handled differently:

- **Public board state** — fully shared, every player sees everything (table, discard, shared decks). No access control needed.
- **Private hand state** — each player has a hand of cards only they can see. A card becomes visible to everyone once placed on the table, or if the owner manually chooses to reveal it. Drawn cards stop being visible to others.
- This requires **real server-side access control** for hand data, not just client-side hiding (otherwise a player could inspect network traffic to cheat).
- Room/session handling (host game, get invite link, join) is scoped into the multiplayer phase and will need research into how other web-based multiplayer card/board games solve it — not yet designed.

### Note: generalizing to N players, before Phase 1's real data (in progress)

Decided while still in Phase 0: worth generalizing the board's zone model to support multiple players *before* wiring in real item/event data, not after. Right now every per-player zone is hardcoded to a single player (`player-1-hand`, `player-1-area`, `player-1-slot-head`, etc., written out by hand in `initialState.ts`, referenced by literal string in `Board.tsx`). Building Phase 1's real data against that single-player-only structure risks having to redo the zone wiring a second time once multiplayer needs show up. Generalizing now — a `buildPlayerZones(playerId)` factory instead of one-off hardcoded zones — costs little against today's placeholder cards, and lets Phase 1's real data land in a structure that already scales to N players.

This also settled how to actually *test* multi-player locally, without needing PartyKit/Phase 2 built yet: a single "Change Player" control that switches which player's zones render as the big interactive board (Equipped Items/Player Area/Hand) — pass the device around like a physical board game, honor-system style. Other players' zones still render, just smaller/read-only-ish in an "other players" area, so trading/betraying (dragging a card onto another player's zone) still works without extra plumbing — same `Zone`/`Card` components either way, they don't care whose zone it is. A non-active player's hand renders forced face-down regardless of the card's real `faceDown` state, matching the existing "honor system" turn-order pattern — this is a courtesy for local hotseat testing, not real security; the real per-client access control described above is still a Phase 2 concern.

Explicitly **not** solving yet: the visual layout for 4 simultaneous players on one screen (where do players 3 and 4 go, rotated zones, etc.) — that's a genuinely hard UI problem best deferred until Phase 2, once real multiplayer constraints are known. The data model doesn't care about player count either way (arrays/records keyed by player id scale to any N); only the screen layout is being deliberately kept simple (1 active player + N others) for now.

## Data Sources

Two sources that complement each other — one for structured data, one for card art:

1. **Google Sheet** (canonical structured game data), published to the web per-tab as CSV (that's also how it already feeds Dextrous) — pulled by `scripts/sync-sheet-data.mjs` (`yarn data:sync`) into `src/data/*.json`:
   `https://docs.google.com/spreadsheets/d/1whYUMzpywZDRYpHlXLchZVkGthvRiyIGiQDInuhrJuY/edit?gid=0`
   - **48 items** (`items.json`) — columns: Name, Item Type, Rarity (**Common/Rare/Magic** — not "Epic"), Traits (`$`-prefixed), Count, Text, Bonus (score), Slot, Feature (ability text), Cost, Image (a Dextrous stock-art reference, not used by the app — the TTS card art already has it baked in). Note: the Items tab has an old draft table (placeholder "A great item!" text) sitting above the real 48-row table; the published CSV (gid=0) is the clean final table only.
   - **21 event cards** (`events.json`, 22 physical copies — one event has 2 copies) — Text-Front/Text-Back (both sides have story text, already baked into the card art), linked actions (loot/shop/battle/betray with difficulty)
   - **3 races** (`races.json`: Dwarf, Orc, Elf) with unique abilities
   - **20 quest givers** (`questgivers.json`) — unique +/- scoring rules for the endgame (e.g. "+1 point for Heavy and Metal Items, -1 for Broken Items")
   - **Verified:** sheet row order matches CardID order in the TTS export for all 4 tabs — cross-checked Events/Quest-Givers/Races row order against the TTS deck's `Nickname` field (exact match), and Items row order against a rendered Dextrous print export (same 8×6 reading order as the spritesheet grid). Confirmed empirically too: cropping grid position 1/4 of the Items spritesheet produces "Small Axe"/"Spine-Cleaver" as expected.

2. **Dextrous / Tabletop Simulator export** (`data/dextrous-export.json`, committed):
   - Source of **final rendered card images** — 4 decks (Items 48, Quests 20, Events 21, Races 3), each a single front/back spritesheet (`FaceUrl`/`BackUrl`, 8×6 grid) hosted on Firebase Storage, sliced into individual per-card PNGs by `scripts/extract-card-art.mjs` (`yarn data:art`) into `public/cards/{items,events,quests,races}/{n}-{front,back}.png`. Every deck has its own real front **and** back art (not one shared placeholder back) — Event cards specifically have story text on both sides.
   - These images already have all text/design baked in, so the board only needs to display the card image as a draggable object — no need to render card UI from raw data fields (the Sheet's structured fields are still captured on `BoardCard.item` for later phases, e.g. Phase 3 scoring).
   - **Known risk:** these Firebase URLs are on Dextrous's account, not self-hosted. Fine for now; worth revisiting (e.g. mirroring to owned storage) if that account ever changes.

### Rules reference (from the physical game's rules card)

Also shown to players in-app via a scrollable reference in the menu drawer (`RulesReference.tsx`) — keep the two in sync if the rules change.

**Your Turn**

1. Draw event card — another player reads the story.
2. Choose your path — decide and resolve on your story.
3. You may... — then do the basic actions in order.
4. Update character — add and remove items or conditions.
5. Discard — discard items you haven't equipped.

**Actions — Basic**

- Gear Change — shift 1 item.
- Trade — you can trade with other players.
- Rest — remove one wound or dirt token.
- Repair — remove one rust or broken token.

**Actions — Story**

- Loot — loot said amount of cards, or let another player do the same.
- Shop — draw said amount from the correct pile. View items and pay gold to keep them. Shuffle the rest back in. Sell items for half price, shuffle into the correct pile.
- Battle — roll and add your weapon's score. Compare to the monster's difficulty. If you win, loot the difficulty amount. If you lose, discard an item.
- Betray — choose a player. Both roll a die and add your weapon bonus. The winner steals an item of the event card's rarity or lower; the loser gets a wound on that same item slot.

**Conditions** (each affects item score/usability differently):

- Broken — item abilities can't be used. Broken weapons can't be used in battles or betrayals.
- Rusty — rusty weapons have -1 score in battles or betrayals. Normal score otherwise.
- Dirty — if you have 3+ dirty items, you pay double in shops.
- Enchanted — +1 to the item's score.
- Cursed — +1 to the item's score, but the item can't be switched for another unless stolen.
- Wound — applied to an item slot. Items in the wounded slot are flipped over — can't be used, score of 0 while flipped.
- Battle-Scarred — a healed wound becomes a battle-scar. That slot can't be wounded again.

## Data Sync Workflow

Recommended path, simplest first:

1. **Start:** a local script pulls the Sheet data (published CSV or Sheets API) and generates `items.json` etc.; commit and push, Vercel deploys.
2. **Upgrade soon after:** a Google Apps Script `onEdit` trigger on the Sheet calls a secret Vercel Deploy Hook URL whenever an edit is saved, triggering an automatic rebuild with fresh data. No public update button, no admin login, no custom backend.
3. **Later, if needed:** Next.js ISR (revalidate every N seconds) for near-live updates without a full rebuild.
4. **Only if truly needed:** a real backend (Supabase/Firestore) with push-sync from a Sheets trigger, enabling live mid-session data edits. Not justified until there's a concrete need to change card stats while a playtest is in progress.

A fully public, unauthenticated "refresh" button on the live site is discouraged (low risk, but unnecessary attack surface) — the Sheets-trigger approach above avoids needing one entirely.

## Roadmap

- **Phase 0 — Core mechanic prototype (done):** board with drag-and-drop zones using placeholder/generic cards, no real data yet. Single-player is enough. Goal: nail the board interaction before wiring real content.
- **Phase 1 — Real data & art (done):** merge the Google Sheet and Dextrous/TTS data into clean data files (`items.json`, `events.json`, `questgivers.json`, `races.json`); swap placeholders for real card art on the same board. Added a new shared `race-deck` zone (players take a Race card at setup) — Phase 0 didn't have one since Races weren't part of the placeholder-card model.
- **Phase 2 — Multiplayer:** real-time shared board state (PartyKit), public/private state split for hands, and a host/invite-link/join flow.
- **Phase 3 — Scoring:** semi-automatic end-game score calculator using item data + quest-giver rules.
- **Phase 4 — Polish:** animations, sound, convenience features (undo, search/filter in card piles, etc.).
- **Phase 5 — Content pipeline:** Google Sheet + Dextrous is sufficient as the "backend" for now (effectively a headless CMS); no need for a real database unless the game grows significantly or in-app card editing becomes a requirement.

## Open Questions

- Playtest feedback loop: no structure yet for collecting what works/doesn't between sessions.
- Deployment specifics beyond "likely Vercel" not yet finalized.
