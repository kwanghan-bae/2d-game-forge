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
      title: '신의 마을: 영원의 후원자',
      assetsBasePath: '/games/inflation-rpg/assets',
    },
    load: () => import('@forge/game-inflation-rpg'),
  },
  {
    manifest: {
      slug: 'inflation-rpg-legacy',
      title: '조선 인플레이션 RPG (Legacy)',
      assetsBasePath: '/games/inflation-rpg/assets',
    },
    load: () => import('@forge/game-inflation-rpg').then((mod) => ({ StartGame: mod.StartLegacyGame })),
  },
];

export function findGame(slug: string): RegisteredGame | undefined {
  return registeredGames.find((g) => g.manifest.slug === slug);
}
