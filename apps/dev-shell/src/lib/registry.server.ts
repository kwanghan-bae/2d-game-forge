/**
 * Server-safe registry: manifest data only, no dynamic game imports.
 * Import this from Server Components (pages, layouts).
 * For the full registry with load() callbacks, use registry.ts from Client Components only.
 */
import type { GameManifestValue } from '@forge/core/manifest';

export const manifests: GameManifestValue[] = [
  {
    slug: 'inflation-rpg',
    title: '조선 인플레이션 RPG',
    assetsBasePath: '/games/inflation-rpg/assets',
  },
];

export function findManifest(slug: string): GameManifestValue | undefined {
  return manifests.find((m) => m.slug === slug);
}
