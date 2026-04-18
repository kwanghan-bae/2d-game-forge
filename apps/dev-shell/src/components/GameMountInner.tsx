'use client';

import { useEffect, useRef } from 'react';
import type { ForgeGameInstance } from '@forge/core';
import { findGame } from '@/lib/registry';

export interface GameMountProps {
  slug: string;
  assetsBasePath: string;
}

export default function GameMountInner({ slug, assetsBasePath }: GameMountProps) {
  const containerId = `game-container-${slug}`;
  const instanceRef = useRef<ForgeGameInstance | null>(null);

  useEffect(() => {
    if (instanceRef.current) return;
    let destroyed = false;
    let gameInstance: ForgeGameInstance | null = null;

    const game = findGame(slug);
    if (!game) return;

    game.load().then((mod) => {
      if (destroyed) return;
      gameInstance = mod.StartGame({
        parent: containerId,
        assetsBasePath,
        exposeTestHooks: process.env.NODE_ENV !== 'production',
      });
      instanceRef.current = gameInstance;
    });

    return () => {
      destroyed = true;
      gameInstance?.destroy(true);
      instanceRef.current = null;
    };
  }, [slug, assetsBasePath, containerId]);

  return <div id={containerId} className="mx-auto" />;
}
