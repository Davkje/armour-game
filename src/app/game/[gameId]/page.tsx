import { GameScreen } from "@/components/game/GameScreen";

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
	const { gameId } = await params;
	return <GameScreen gameId={gameId} />;
}
