import type { NextConfig } from 'next';
import path from 'path';

// Absolute path to the inflation-rpg game's src directory.
// This is needed because the game uses `@/game/...` as an alias to its own
// src/game/ directory, but when Turbopack transpiles the package it resolves
// @/ against the dev-shell tsconfig (dev-shell/src/). The turbopack
// resolveAlias below ensures @/game/... resolves to the game's own src/game/.
const gameInflationRpgSrc = path.resolve(__dirname, '../../games/inflation-rpg/src');

const config: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  typedRoutes: false,
  transpilePackages: ['@forge/core', '@forge/game-inflation-rpg'],
  turbopack: {
    resolveAlias: {
      // Override @/game/* so that the inflation-rpg game's internal imports
      // like `import { Direction } from '@/game/physics/Direction'` resolve
      // to the correct location within the game package, not dev-shell/src/.
      '@/game': path.join(gameInflationRpgSrc, 'game'),
      // Override @/components/ui so that forge-* component imports like
      // `import { ForgeButton } from '@/components/ui/forge-button'` resolve
      // to the game's own src/components/ui/, not dev-shell/src/components/.
      '@/components/ui': path.join(gameInflationRpgSrc, 'components/ui'),
      // Override @/lib so that `import { cn } from '@/lib/utils'` inside
      // game components resolves to the game's src/lib/, not dev-shell/src/lib/.
      '@/lib': path.join(gameInflationRpgSrc, 'lib'),
    },
  },
};

export default config;
