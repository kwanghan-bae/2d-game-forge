import { notFound } from 'next/navigation';
import { findGame } from '@/lib/registry';

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const game = findGame(slug);
  if (!game) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-bold">{game.manifest.title}</h1>
      <p
        data-testid="game-placeholder"
        className="mt-3 text-sm text-slate-400"
      >
        게임 로더는 Phase 1 에서 `StartGame(config)` 을 호출하도록 연결됩니다.
      </p>
    </main>
  );
}
