import type { GameManifestValue } from '@forge/core/manifest';

export interface RegisteredGame {
  manifest: GameManifestValue;
  load: () => Promise<unknown>;
}

export const registeredGames: RegisteredGame[] = [];

export function findGame(slug: string): RegisteredGame | undefined {
  return registeredGames.find((g) => g.manifest.slug === slug);
}
