import Link from "next/link";

export default function Home() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-8">
			<h1 className="font-semibold">Armour</h1>
			<Link href="/game" className="btn-primary px-6 py-3">
				Start Game
			</Link>
		</div>
	);
}
