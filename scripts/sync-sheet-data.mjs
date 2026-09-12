// Pulls the Google Sheet's published CSV tabs and writes clean JSON files
// under src/data/. Re-run whenever the sheet changes (yarn data:sync); the
// sheet is already published to the web (that's how it feeds Dextrous too),
// so this needs no auth/API key.
//
// Run `yarn data:art` first — this script reads the backs.json manifest it
// writes per deck (index -> deduped back filename) to fill in `imageBack`.

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "src/data");
const CARDS_DIR = path.join(ROOT, "public/cards");

const SHEET_BASE =
	"https://docs.google.com/spreadsheets/d/e/2PACX-1vRtCIOcfNJVzpaa5DGFkCL6RWqXHUOSzfqVNNk3ZwSmjSpQfXSbt4hAeIR4NOJwicjFJj1BbouO6iMF/pub";

const TABS = {
	items: 0,
	events: 2106305008,
	races: 955585301,
	questgivers: 2063181786,
};

// Data-file name -> its art folder under public/cards/ (differs for quests).
const ART_FOLDERS = {
	items: "items",
	events: "events",
	races: "races",
	questgivers: "quests",
};

async function fetchCsv(gid) {
	const url = `${SHEET_BASE}?gid=${gid}&single=true&output=csv`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to fetch gid=${gid}: ${res.status}`);
	const text = await res.text();
	return Papa.parse(text, { header: true, skipEmptyLines: true }).data;
}

async function readBackManifest(artFolder) {
	const text = await readFile(path.join(CARDS_DIR, artFolder, "backs.json"), "utf-8");
	return JSON.parse(text);
}

// "$Cool, $Light" -> ["Cool", "Light"]
function parseTraits(raw) {
	if (!raw) return [];
	return raw
		.split(",")
		.map((t) => t.trim().replace(/^\$/, ""))
		.filter(Boolean);
}

function parseItems(rows, artFolder, backs) {
	const items = rows.map((row, i) => ({
		id: i + 1,
		name: row["Name"],
		itemType: row["Item Type"],
		rarity: row["Rarity"].toLowerCase(),
		traits: parseTraits(row["Traits"]),
		text: row["Text"] || "",
		bonus: Number(row["Bonus"]) || 0,
		feature: row["Feature"] || null,
		cost: Number(row["Cost"]) || 0,
		imageFront: `/cards/${artFolder}/${i + 1}-front.png`,
	}));

	// By design there's exactly one back per rarity tier (Common/Rare/Magic),
	// not per item — the cropped art varies slightly pixel-to-pixel even
	// within a tier (imperceptible texture noise), so pixel-hash dedup can't
	// find that match. Pin every item to its rarity's first-seen crop instead
	// of trusting per-position dedup for this deck specifically.
	const representativeBackByRarity = {};
	items.forEach((item, i) => {
		representativeBackByRarity[item.rarity] ??= backs[i];
	});
	for (const item of items) {
		item.imageBack = `/cards/${artFolder}/${representativeBackByRarity[item.rarity]}`;
	}

	return items;
}

function parseActions(row) {
	const actions = [];
	for (const n of [1, 2, 3, 4]) {
		const icon = row[`Ac${n}Icon`];
		if (!icon) continue;
		const type = icon.replace("Icons/", "").replace(".png", "");
		const info = row[`Ac${n}Info`];
		actions.push({ type, value: info ? Number(info) : null });
	}
	return actions;
}

function parseEvents(rows, artFolder, backs) {
	return rows.map((row, i) => ({
		id: i + 1,
		copies: Number(row["Copies"]) || 1,
		rarity: row["Rarity"].toLowerCase(),
		name: row["Nickname"].trim(),
		actions: parseActions(row),
		imageFront: `/cards/${artFolder}/${i + 1}-front.png`,
		imageBack: `/cards/${artFolder}/${backs[i]}`,
	}));
}

function parseQuestGivers(rows, artFolder, backs) {
	return rows.map((row, i) => ({
		id: i + 1,
		nickname: row["Nickname"].trim(),
		text: row["Text"] || "",
		rules: row["Rules"] || "",
		imageFront: `/cards/${artFolder}/${i + 1}-front.png`,
		imageBack: `/cards/${artFolder}/${backs[i]}`,
	}));
}

function parseRaces(rows, artFolder, backs) {
	return rows.map((row, i) => ({
		id: i + 1,
		nickname: row["Nickname"].trim(),
		ability1: row["Ability 1"].trim(),
		ability2: row["Ability 2"].trim(),
		imageFront: `/cards/${artFolder}/${i + 1}-front.png`,
		imageBack: `/cards/${artFolder}/${backs[i]}`,
	}));
}

const PARSERS = {
	items: parseItems,
	events: parseEvents,
	races: parseRaces,
	questgivers: parseQuestGivers,
};

// Some decks (Items, via the rarity-pinning above) end up referencing only a
// few of the back-*.png files extract-card-art.mjs cropped — remove whatever
// isn't actually used so public/cards/ doesn't accumulate dead crops.
async function removeUnusedBacks(artFolder, data) {
	const used = new Set(data.map((row) => path.basename(row.imageBack)));
	const files = await readdir(path.join(CARDS_DIR, artFolder));
	for (const file of files) {
		if (file.startsWith("back-") && !used.has(file)) {
			await rm(path.join(CARDS_DIR, artFolder, file));
		}
	}
}

async function main() {
	await mkdir(OUT_DIR, { recursive: true });

	for (const [name, gid] of Object.entries(TABS)) {
		console.log(`Fetching ${name} (gid=${gid})...`);
		const rows = await fetchCsv(gid);
		const artFolder = ART_FOLDERS[name];
		const backs = await readBackManifest(artFolder);
		const data = PARSERS[name](rows, artFolder, backs);
		await writeFile(path.join(OUT_DIR, `${name}.json`), JSON.stringify(data, null, "\t") + "\n");
		await removeUnusedBacks(artFolder, data);
		console.log(`  -> src/data/${name}.json (${data.length} rows)`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
