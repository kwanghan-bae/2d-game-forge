'use client';

import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
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
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) return;
    gameRef.current = StartGame({
      parent: containerId,
      assetsBasePath,
      exposeTestHooks,
    });
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [containerId, assetsBasePath, exposeTestHooks]);

  return <div id={containerId} />;
}
