import Link from 'next/link';
import { manifests as registeredManifests } from '@/lib/registry.server';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold">2d-game-forge</h1>
      <p className="mt-2 text-slate-400">Local dev portal.</p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Games</h2>
        {registeredManifests.length === 0 ? (
          <p
            data-testid="no-games"
            className="mt-3 rounded-md border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300"
          >
            아직 등록된 게임이 없습니다. Phase 1 에서 inflation-rpg 가 추가됩니다.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {registeredManifests.map((manifest) => (
              <li key={manifest.slug}>
                <Link
                  href={`/games/${manifest.slug}`}
                  className="block rounded-md border border-slate-800 bg-slate-900 p-4 hover:bg-slate-800"
                >
                  <div className="font-medium">{manifest.title}</div>
                  <div className="text-xs text-slate-500">/{manifest.slug}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
