import type { GameManifestValue, ForgeGameInstance } from '@forge/core';
import { GAME_MANIFESTS } from './registry.shared';

export interface RegisteredGame {
  manifest: GameManifestValue;
  load: () => Promise<{
    StartGame: (config: {
      parent: string;
      assetsBasePath: string;
      exposeTestHooks: boolean;
    }) => ForgeGameInstance;
  }>;
}

const loaders: Record<string, RegisteredGame['load']> = {
  'inflation-rpg': () => import('@forge/game-inflation-rpg/game'),
};

export const registeredGames: RegisteredGame[] = GAME_MANIFESTS.map((manifest) => {
  const load = loaders[manifest.slug];
  if (!load) throw new Error(`No game loader registered for ${manifest.slug}`);
  return { manifest, load };
});

export function findGame(slug: string): RegisteredGame | undefined {
  return registeredGames.find((g) => g.manifest.slug === slug);
}
