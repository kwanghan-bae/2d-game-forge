'use client';

import { useEffect, useRef } from 'react';
import type { ForgeGameInstance } from '@forge/core';
import { StartGame } from '../startGame';

export interface PhaserGameProps {
  containerId?: string;
  assetsBasePath?: string;
  exposeTestHooks?: boolean;
}

export default function PhaserGame({
  containerId = 'game-container',
  assetsBasePath = '/assets',
  exposeTestHooks = false,
}: PhaserGameProps) {
  const gameRef = useRef<ForgeGameInstance | null>(null);

  useEffect(() => {
    if (gameRef.current) return;
    gameRef.current = StartGame({
      parent: containerId,
      assetsBasePath,
      exposeTestHooks,
    });
    return () => {
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, [containerId, assetsBasePath, exposeTestHooks]);

  return <div id={containerId} />;
}
