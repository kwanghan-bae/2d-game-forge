/**
 * Server-safe registry: manifest data only, no dynamic game imports.
 * Import this from Server Components (pages, layouts).
 * For the full registry with load() callbacks, use registry.ts from Client Components only.
 */
import type { GameManifestValue } from '@forge/core/manifest';
import { GAME_MANIFESTS } from './registry.shared';

export const manifests: GameManifestValue[] = GAME_MANIFESTS.map((manifest) => ({ ...manifest }));

export function findManifest(slug: string): GameManifestValue | undefined {
  return manifests.find((m) => m.slug === slug);
}
