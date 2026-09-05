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

### Note: condition/status tokens (not yet built)

Planned feature: small colored tokens a player can place onto a card to represent state — primarily the physical game's **Conditions** (Broken, Rusty, Dirty, Enchanted, Cursed, Wound, Battle-Scarred — see "Rules reference" below). Not designed or built yet; flagged here so it isn't lost. Likely touches the board layout's planned "token menu" button (see the Phase 0 board-layout mockup discussion) for picking which token to place.

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

## Data Sources

Two sources that complement each other — one for structured data, one for card art:

1. **Google Sheet** (canonical structured game data):
   `https://docs.google.com/spreadsheets/d/1whYUMzpywZDRYpHlXLchZVkGthvRiyIGiQDInuhrJuY/edit?gid=0`
   - **48 items** — columns: Name, Item Type, Rarity, Traits (`$`-prefixed), Count, Text, Bonus (score), Slot, Feature (ability text), Cost, Image (relative path e.g. `Items/Axes/axe_1.png`)
   - **21 event cards** — full text, choice logic (e.g. "Right"/"Left"), linked actions (loot/shop/battle/betray with difficulty)
   - **3 races** (Dwarf, Orc, Elf) with unique abilities
   - **~20 quest givers** — unique +/- scoring rules for the endgame (e.g. "+1 point for Heavy and Metal Items, -1 for Broken Items")
   - **Unverified assumption:** sheet rows #1–48 map to CardID 100–147 in the TTS export, in the same order. Verify before building the merge script.

2. **Dextrous / Tabletop Simulator export** (`Armour_Game_2026-09-03.json`):
   - Source of **final rendered card images** — 48 cards (CardID 100–147) in an "Items" deck, front/back images hosted on Firebase Storage, plus custom condition tokens (e.g. "Dirty") with their own image URLs.
   - These images already have all text/design baked in, so the board only needs to display the card image as a draggable object — no need to render card UI from raw data fields.
   - **Known risk:** these Firebase URLs are on Dextrous's account, not self-hosted. Fine for now; worth revisiting (e.g. mirroring to owned storage) if that account ever changes.

### Rules reference (from the physical game's rules card)

Actions: Gear Change, Trade, Rest, Repair, Loot, Shop, Battle, Betray.
Conditions: Broken, Rusty, Dirty, Enchanted, Cursed, Wound, Battle-Scarred (each affects item score differently — see rules card for exact effects).

## Data Sync Workflow

Recommended path, simplest first:

1. **Start:** a local script pulls the Sheet data (published CSV or Sheets API) and generates `items.json` etc.; commit and push, Vercel deploys.
2. **Upgrade soon after:** a Google Apps Script `onEdit` trigger on the Sheet calls a secret Vercel Deploy Hook URL whenever an edit is saved, triggering an automatic rebuild with fresh data. No public update button, no admin login, no custom backend.
3. **Later, if needed:** Next.js ISR (revalidate every N seconds) for near-live updates without a full rebuild.
4. **Only if truly needed:** a real backend (Supabase/Firestore) with push-sync from a Sheets trigger, enabling live mid-session data edits. Not justified until there's a concrete need to change card stats while a playtest is in progress.

A fully public, unauthenticated "refresh" button on the live site is discouraged (low risk, but unnecessary attack surface) — the Sheets-trigger approach above avoids needing one entirely.

## Roadmap

- **Phase 0 — Core mechanic prototype:** board with drag-and-drop zones using placeholder/generic cards, no real data yet. Single-player is enough. Goal: nail the board interaction before wiring real content.
- **Phase 1 — Real data & art:** merge the Google Sheet and Dextrous/TTS data into clean data files (`items.json`, `events.json`, `questgivers.json`, `races.json`); swap placeholders for real card art on the same board.
- **Phase 2 — Multiplayer:** real-time shared board state (PartyKit), public/private state split for hands, and a host/invite-link/join flow.
- **Phase 3 — Scoring:** semi-automatic end-game score calculator using item data + quest-giver rules.
- **Phase 4 — Polish:** animations, sound, convenience features (undo, search/filter in card piles, etc.).
- **Phase 5 — Content pipeline:** Google Sheet + Dextrous is sufficient as the "backend" for now (effectively a headless CMS); no need for a real database unless the game grows significantly or in-app card editing becomes a requirement.

## Open Questions

- Playtest feedback loop: no structure yet for collecting what works/doesn't between sessions.
- Deployment specifics beyond "likely Vercel" not yet finalized.
