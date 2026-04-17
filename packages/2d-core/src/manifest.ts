import { z } from 'zod';

export const GameManifest = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'slug must be lowercase kebab-case'),
  title: z.string().min(1, 'title must not be empty'),
  assetsBasePath: z
    .string()
    .startsWith('/', 'assetsBasePath must start with "/"'),
});

export type GameManifestInput = z.input<typeof GameManifest>;
export type GameManifestValue = z.output<typeof GameManifest>;

export function parseGameManifest(input: unknown): GameManifestValue {
  return GameManifest.parse(input);
}
