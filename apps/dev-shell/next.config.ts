import type { NextConfig } from 'next';
import path from 'path';

// Absolute path to the inflation-rpg game's src directory. The remaining
// aliases are limited to shared UI/helper modules used by the game package.
const gameInflationRpgSrc = path.resolve(__dirname, '../../games/inflation-rpg/src');

const config: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  typedRoutes: false,
  transpilePackages: ['@forge/core', '@forge/game-inflation-rpg'],
  turbopack: {
    resolveAlias: {
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
