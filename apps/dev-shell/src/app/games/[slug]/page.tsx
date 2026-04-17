import { notFound } from 'next/navigation';
import { findManifest } from '@/lib/registry.server';
import GameMount from '@/components/GameMount';

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const manifest = findManifest(slug);
  if (!manifest) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-xl font-semibold" data-testid="game-title">
        {manifest.title}
      </h1>
      <div className="mt-4">
        <GameMount slug={slug} assetsBasePath={manifest.assetsBasePath} />
      </div>
    </main>
  );
}
