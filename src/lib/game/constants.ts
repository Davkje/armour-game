// Reference size only — the actual on-screen card size is responsive, set
// via the --card-width/--card-height CSS variables in globals.css (a
// clamp() that scales with viewport width). These numbers match that
// clamp's ceiling and stay in sync with the card art's 5:7 aspect ratio
// (500x700). Used for: Next/Image's width/height hints (so the optimizer
// generates a large-enough source regardless of the live responsive size),
// and as a fallback for drag math before a card's real live-measured size
// is available (rare — most drag math measures the actual element instead).
export const CARD_WIDTH = 180;
export const CARD_HEIGHT = 252;

export const MIN_ROUND = 1;
export const MAX_ROUND = 10;
