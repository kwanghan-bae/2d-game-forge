'use client';
import React, { useEffect, useRef } from 'react';
import type { ForgeGameInstance } from '@forge/core';

export default function Page() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<ForgeGameInstance | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.id = 'game-container';
    let cancelled = false;

    // Dynamic import keeps Phaser out of the SSR bundle — effects never run server-side
    import('../startGame').then(({ StartGame }) => {
      if (cancelled || !containerRef.current) return;
      gameRef.current = StartGame({
        parent: 'game-container',
        assetsBasePath: '/assets',
        exposeTestHooks: process.env.NODE_ENV !== 'production',
      });
    });

    return () => {
      cancelled = true;
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ minHeight: '100dvh' }} />;
}
