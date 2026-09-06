import type { ConditionType } from "./types";

// `color` is a CSS custom property name (defined in globals.css), not a
// Tailwind class or hex value — used as `var(${color})` wherever a condition
// is rendered, so the actual hex values live in one place you can tweak.
export const CONDITIONS: { id: ConditionType; name: string; color: string; body: string }[] = [
	{
		id: "broken",
		name: "Broken",
		color: "--condition-broken",
		body: "Item abilities can't be used. Broken weapons can't be used in battles or betrayals.",
	},
	{
		id: "rusty",
		name: "Rusty",
		color: "--condition-rusty",
		body: "Rusty weapons have -1 score in battles or betrayals. Normal score otherwise.",
	},
	{
		id: "dirty",
		name: "Dirty",
		color: "--condition-dirty",
		body: "If you have 3 or more dirty items, you pay double in shops.",
	},
	{
		id: "enchanted",
		name: "Enchanted",
		color: "--condition-enchanted",
		body: "+1 to the item's score.",
	},
	{
		id: "cursed",
		name: "Cursed",
		color: "--condition-cursed",
		body: "+1 to the item's score, but the item can't be switched for another unless stolen.",
	},
	{
		id: "wound",
		name: "Wound",
		color: "--condition-wound",
		body: "Applied to an item slot. Items in the wounded slot are flipped over — the item can't be used and has a score of 0 while flipped.",
	},
	{
		id: "battle-scarred",
		name: "Battle-Scarred",
		color: "--condition-battle-scarred",
		body: "A healed wound becomes a battle-scar. That slot can't be wounded again.",
	},
];
