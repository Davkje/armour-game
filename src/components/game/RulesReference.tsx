import { CONDITIONS } from "@/lib/game/conditions";

const YOUR_TURN = [
	{ title: "Draw event card", body: "Another player reads the story." },
	{ title: "Choose your path", body: "Decide and resolve on your story." },
	{ title: "You may...", body: "Then do the basic actions in order." },
	{ title: "Update character", body: "Add and remove items or conditions." },
	{ title: "Discard", body: "Discard items you haven't equipped." },
];

const BASIC_ACTIONS = [
	{ title: "Gear Change", body: "Shift 1 item." },
	{ title: "Trade", body: "You can trade with other players." },
	{ title: "Rest", body: "Remove one wound or dirt token." },
	{ title: "Repair", body: "Remove one rust or broken token." },
];

const STORY_ACTIONS = [
	{ title: "Loot", body: "Loot said amount of cards, or let another player do the same." },
	{
		title: "Shop",
		body: "Draw said amount from the correct pile. View items and pay gold to keep them. Shuffle the rest back in. Sell items for half price, shuffle into the correct pile.",
	},
	{
		title: "Battle",
		body: "Roll and add your weapon's score. Compare to the monster's difficulty. If you win, loot the difficulty amount. If you lose, discard an item.",
	},
	{
		title: "Betray",
		body: "Choose a player. Both roll a die and add your weapon bonus. The winner steals an item of the event card's rarity or lower; the loser gets a wound on that same item slot.",
	},
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-2">
			<h3 className="font-semibold tracking-widest text-black/50 uppercase">{title}</h3>
			{children}
		</div>
	);
}

function Entry({ title, body }: { title: string; body: string }) {
	return (
		<p className="text-sm">
			<span className="font-semibold">{title}</span> — <span className="text-black/70">{body}</span>
		</p>
	);
}

export function RulesReference() {
	return (
		<div className="flex flex-col gap-6">
			<Section title="Your Turn">
				<div className="flex flex-col gap-1">
					{YOUR_TURN.map((entry) => (
						<Entry key={entry.title} {...entry} />
					))}
				</div>
			</Section>

			<Section title="Actions — Basic">
				<div className="flex flex-col gap-1">
					{BASIC_ACTIONS.map((entry) => (
						<Entry key={entry.title} {...entry} />
					))}
				</div>
			</Section>

			<Section title="Actions — Story">
				<div className="flex flex-col gap-1">
					{STORY_ACTIONS.map((entry) => (
						<Entry key={entry.title} {...entry} />
					))}
				</div>
			</Section>

			<Section title="Conditions">
				<div className="flex flex-col gap-2">
					{CONDITIONS.map((entry) => (
						<p key={entry.id} className="text-sm">
							<span
								aria-hidden="true"
								style={{ backgroundColor: `var(${entry.color})` }}
								className="mr-1.5 inline-block h-3 w-3 rounded-full"
							/>
							<span className="font-semibold">{entry.name}</span> —{" "}
							<span className="text-black/70">{entry.body}</span>
						</p>
					))}
				</div>
			</Section>
		</div>
	);
}
