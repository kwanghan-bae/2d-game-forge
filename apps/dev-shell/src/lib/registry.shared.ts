import type { GameManifestValue } from '@forge/core/manifest';

/**
 * The single source of truth for portal-visible game metadata.
 *
 * Keep this module data-only so both Server Components and the client-side
 * loader registry can import it without pulling a game bundle into the server
 * manifest path.
 */
export const GAME_MANIFESTS: readonly GameManifestValue[] = [
  {
    slug: 'inflation-rpg',
    title: '신의 마을: 영원의 후원자',
    assetsBasePath: '/games/inflation-rpg/assets',
  },
  {
    slug: 'inflation-rpg-legacy',
    title: '신의 마을: 옛 모험',
    assetsBasePath: '/games/inflation-rpg/assets',
  },
];
