import type { BoardState } from "../src/lib/game/types";

// Durable Object KV storage caps each VALUE at 128 KiB (total per object is
// unlimited), so the whole BoardState can't be one value once decks get big —
// at ~400 bytes/card that's only ~320 cards. Cards are stored in fixed-size
// chunks under their own keys instead; everything else (players, zones,
// tokens, round) is small and stays together in one "meta" value.
const META_KEY = "meta";
const CHUNK_COUNT_KEY = "card-chunk-count";
const CHUNK_PREFIX = "cards:";
// ~40KB per chunk at today's card size, leaving ~3x headroom under the limit
// in case cards get longer text/feature fields later.
const CARDS_PER_CHUNK = 100;
// Max keys per get/put/delete call on the storage API.
const BATCH_SIZE = 128;

/** The slice of Party.Storage this module uses — lets tests pass an in-memory fake. */
export interface StorageLike {
	get<T>(keys: string[]): Promise<Map<string, T>>;
	get<T>(key: string): Promise<T | undefined>;
	put<T>(entries: Record<string, T>): Promise<void>;
	delete(keys: string[]): Promise<number>;
}

/** What was last written per key, as JSON — used to skip rewriting chunks nothing changed in. */
export type WrittenSnapshot = Map<string, string>;

function chunkKey(index: number) {
	return `${CHUNK_PREFIX}${index}`;
}

function splitCards(cards: BoardState["cards"]): BoardState["cards"][] {
	// Sorted so a card always lands in the same chunk no matter how the
	// object's key order happens to have shifted — otherwise every chunk would
	// look "changed" after unrelated actions.
	const ids = Object.keys(cards).sort();
	const chunks: BoardState["cards"][] = [];
	for (let i = 0; i < ids.length; i += CARDS_PER_CHUNK) {
		const chunk: BoardState["cards"] = {};
		for (const id of ids.slice(i, i + CARDS_PER_CHUNK)) chunk[id] = cards[id];
		chunks.push(chunk);
	}
	return chunks;
}

export async function loadState(storage: StorageLike): Promise<BoardState | undefined> {
	const meta = await storage.get<Omit<BoardState, "cards">>(META_KEY);
	if (!meta) return undefined;
	const chunkCount = (await storage.get<number>(CHUNK_COUNT_KEY)) ?? 0;

	const keys = Array.from({ length: chunkCount }, (_, i) => chunkKey(i));
	const cards: BoardState["cards"] = {};
	for (let i = 0; i < keys.length; i += BATCH_SIZE) {
		const loaded = await storage.get<BoardState["cards"]>(keys.slice(i, i + BATCH_SIZE));
		for (const chunk of loaded.values()) Object.assign(cards, chunk);
	}
	return { ...meta, cards };
}

/**
 * Writes only the keys whose content changed since `written` (updated in
 * place). The snapshot is updated before the awaited writes so two
 * overlapping calls diff against the latest intent, and the writes themselves
 * are issued in call order.
 */
export async function saveState(
	storage: StorageLike,
	state: BoardState,
	written: WrittenSnapshot,
): Promise<void> {
	const { cards, ...meta } = state;
	const chunks = splitCards(cards);

	const entries: Record<string, unknown> = {
		[META_KEY]: meta,
		[CHUNK_COUNT_KEY]: chunks.length,
	};
	chunks.forEach((chunk, i) => {
		entries[chunkKey(i)] = chunk;
	});

	const changed: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(entries)) {
		const json = JSON.stringify(value);
		if (written.get(key) !== json) {
			written.set(key, json);
			changed[key] = value;
		}
	}

	// Chunks left over from a previous, larger card set.
	const stale: string[] = [];
	for (const key of written.keys()) {
		if (key.startsWith(CHUNK_PREFIX) && !(key in entries)) stale.push(key);
	}
	for (const key of stale) written.delete(key);

	const changedKeys = Object.keys(changed);
	for (let i = 0; i < changedKeys.length; i += BATCH_SIZE) {
		const batch: Record<string, unknown> = {};
		for (const key of changedKeys.slice(i, i + BATCH_SIZE)) batch[key] = changed[key];
		await storage.put(batch);
	}
	for (let i = 0; i < stale.length; i += BATCH_SIZE) {
		await storage.delete(stale.slice(i, i + BATCH_SIZE));
	}
}
