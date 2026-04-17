'use client';

import { useEffect, useRef } from 'react';
import { findGame } from '@/lib/registry';
import type { GameMountProps } from './GameMount';

export default function GameMountInner({ slug, assetsBasePath }: GameMountProps) {
  const containerId = `game-container-${slug}`;
  const instanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (instanceRef.current) return;
    let destroyed = false;
    let gameInstance: { destroy?: (removeCanvas?: boolean) => void } | null = null;

    const game = findGame(slug);
    if (!game) return;

    game.load().then((mod) => {
      if (destroyed) return;
      gameInstance = mod.StartGame({
        parent: containerId,
        assetsBasePath,
        exposeTestHooks: true,
      }) as typeof gameInstance;
      instanceRef.current = gameInstance;
    });

    return () => {
      destroyed = true;
      gameInstance?.destroy?.(true);
      instanceRef.current = null;
    };
  }, [slug, assetsBasePath, containerId]);

  return <div id={containerId} className="mx-auto" />;
}
