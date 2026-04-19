'use client';
import React, { useEffect, useRef } from 'react';
import { StartGame } from '../startGame';
import type { ForgeGameInstance } from '@forge/core';

export default function Page() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<ForgeGameInstance | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.id = 'game-container';
    gameRef.current = StartGame({
      parent: 'game-container',
      assetsBasePath: '/assets',
      exposeTestHooks: process.env.NODE_ENV !== 'production',
    });
    return () => {
      gameRef.current?.destroy();
    };
  }, []);

  return <div ref={containerRef} style={{ minHeight: '100dvh' }} />;
}
