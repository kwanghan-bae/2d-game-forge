'use client';

import dynamic from 'next/dynamic';
import type { GameMountProps } from './GameMountInner';

export type { GameMountProps };

// Load the actual game mount lazily, with SSR disabled, so Phaser
// (which requires a browser environment) is never executed server-side.
const GameMountInner = dynamic<GameMountProps>(
  () => import('./GameMountInner'),
  { ssr: false },
);

export default function GameMount(props: GameMountProps) {
  return <GameMountInner {...props} />;
}
