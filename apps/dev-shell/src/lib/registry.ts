import type { GameManifestValue, ForgeGameInstance } from '@forge/core';

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

export const registeredGames: RegisteredGame[] = [
  {
    manifest: {
      slug: 'inflation-rpg',
      title: '조선 인플레이션 RPG',
      assetsBasePath: '/games/inflation-rpg/assets',
    },
    load: () => import('@forge/game-inflation-rpg'),
  },
];

export function findGame(slug: string): RegisteredGame | undefined {
  return registeredGames.find((g) => g.manifest.slug === slug);
}
