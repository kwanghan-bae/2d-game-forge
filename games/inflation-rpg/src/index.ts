import { parseGameManifest } from '@forge/core/manifest';
import type { GameManifestValue } from '@forge/core/manifest';

export const gameManifest: GameManifestValue = parseGameManifest({
  slug: 'inflation-rpg',
  title: '신의 마을: 영원의 후원자',
  assetsBasePath: '/games/inflation-rpg/assets',
});

export { StartGame, StartLegacyGame } from './startGame';
export type { StartGameConfig } from './startGame';
export { createNativeV4Monetization } from './v4/monetization';
export type {
  NativeV4MonetizationHandle,
  NativeV4MonetizationOptions,
  V4MonetizationAdapter,
} from './v4/monetization';
