// Slices each deck's Dextrous/TTS spritesheet (one big grid image per deck,
// NumWidth x NumHeight cells) into individual front/back PNGs per card.
//
// Card N (1-based, matching the Google Sheet's row order) sits at:
//   col = (N - 1) % NumWidth, row = floor((N - 1) / NumWidth)
// This is TTS's standard left-to-right, top-to-bottom grid convention.
//
// Backs are frequently identical across many cards (e.g. every Common item
// shares one design, all Quest Givers share one, etc.) even when the deck's
// own `UniqueBack` flag is true — rather than guess the grouping rule (by
// rarity? by item type?), every back is content-hashed after cropping and
// only genuinely distinct images get their own file; a `backs.json` manifest
// (index -> filename) records which file each card actually uses, so
// sync-sheet-data.mjs can wire up `imageBack` correctly. Fronts are always
// unique per card, so they're just written directly, no dedup needed.
//
// Run: yarn data:art
// Verify: open public/cards/items/1-front.png and 4-front.png and confirm
// they show "Small Axe" and "Spine-Cleaver" (the sheet's row 1 and row 4).

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const EXPORT_PATH = path.join(ROOT, "data/dextrous-export.json");
const OUT_DIR = path.join(ROOT, "public/cards");

const DECKS = [
	{ nickname: "Items", folder: "items", count: 48 },
	{ nickname: "Quests", folder: "quests", count: 20 },
	{ nickname: "Events", folder: "events", count: 21 },
	{ nickname: "Races", folder: "races", count: 3 },
];

function stripVerifyCache(url) {
	return url.replace("{verifycache}", "");
}

async function fetchImage(url) {
	const res = await fetch(stripVerifyCache(url));
	if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
	return Buffer.from(await res.arrayBuffer());
}

function cellRegion(width, height, numWidth, numHeight, index) {
	const cellWidth = Math.floor(width / numWidth);
	const cellHeight = Math.floor(height / numHeight);
	const col = index % numWidth;
	const row = Math.floor(index / numWidth);
	return { left: col * cellWidth, top: row * cellHeight, width: cellWidth, height: cellHeight };
}

async function cropCell(buffer, numWidth, numHeight, index) {
	const { width, height } = await sharp(buffer).metadata();
	const region = cellRegion(width, height, numWidth, numHeight, index);
	return sharp(buffer).extract(region).png().toBuffer();
}

// PNG encoding isn't deterministic for identical pixels (sharp can pick
// different compression filters depending on surrounding crop context), so
// two visually-identical crops can still produce different file bytes.
// Hashing the raw decoded pixels instead of the encoded PNG catches those as
// the same image.
async function pixelHash(buffer, numWidth, numHeight, index) {
	const { width, height } = await sharp(buffer).metadata();
	const region = cellRegion(width, height, numWidth, numHeight, index);
	const raw = await sharp(buffer).extract(region).raw().toBuffer();
	return createHash("sha1").update(raw).digest("hex").slice(0, 8);
}

function hashBuffer(buffer) {
	return createHash("sha1").update(buffer).digest("hex").slice(0, 8);
}

async function main() {
	const exportData = JSON.parse(await readFile(EXPORT_PATH, "utf-8"));

	for (const deck of DECKS) {
		const state = exportData.ObjectStates.find((s) => s.Nickname === deck.nickname);
		if (!state) throw new Error(`Deck "${deck.nickname}" not found in export`);
		const customDeck = Object.values(state.CustomDeck)[0];

		const deckDir = path.join(OUT_DIR, deck.folder);
		await mkdir(deckDir, { recursive: true });

		console.log(`Slicing ${deck.nickname} (${deck.count} cards)...`);
		const [faceBuffer, backBuffer] = await Promise.all([
			fetchImage(customDeck.FaceUrl),
			fetchImage(customDeck.BackUrl),
		]);

		// Fronts: always unique per card, write directly.
		for (let i = 0; i < deck.count; i++) {
			const cell = await cropCell(faceBuffer, customDeck.NumWidth, customDeck.NumHeight, i);
			await writeFile(path.join(deckDir, `${i + 1}-front.png`), cell);
		}

		// Backs: UniqueBack:false means BackUrl is already one single
		// card-sized image (not a grid) — every card gets that same buffer.
		// UniqueBack:true means it's a real grid to crop per position, but
		// many positions still turn out identical (e.g. all Common items) —
		// content-hash dedup handles both cases uniformly.
		const writtenHashes = new Set();
		const manifest = [];
		for (let i = 0; i < deck.count; i++) {
			const h = customDeck.UniqueBack
				? await pixelHash(backBuffer, customDeck.NumWidth, customDeck.NumHeight, i)
				: hashBuffer(backBuffer);
			const filename = `back-${h}.png`;
			if (!writtenHashes.has(h)) {
				const cell = customDeck.UniqueBack
					? await cropCell(backBuffer, customDeck.NumWidth, customDeck.NumHeight, i)
					: backBuffer;
				await writeFile(path.join(deckDir, filename), cell);
				writtenHashes.add(h);
			}
			manifest.push(filename);
		}
		await writeFile(path.join(deckDir, "backs.json"), JSON.stringify(manifest));
		console.log(`  -> ${writtenHashes.size} distinct back image(s) for ${deck.count} cards`);
	}

	console.log("Done. Spot-check public/cards/items/1-front.png (Small Axe) and 4-front.png (Spine-Cleaver).");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
