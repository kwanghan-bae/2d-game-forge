import { parseGameManifest } from '@forge/core/manifest';
import type { GameManifestValue } from '@forge/core/manifest';

export const gameManifest: GameManifestValue = parseGameManifest({
  slug: 'inflation-rpg',
  title: '조선 인플레이션 RPG',
  assetsBasePath: '/games/inflation-rpg/assets',
});

export { StartGame } from './startGame';
export type { StartGameConfig } from './startGame';
