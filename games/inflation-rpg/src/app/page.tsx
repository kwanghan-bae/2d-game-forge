'use client';
import React, { useEffect, useRef, useState } from 'react';
import type { ForgeGameInstance } from '@forge/core';

export default function Page() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<ForgeGameInstance | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.id = 'game-container';
    let cancelled = false;

    // Dynamic import keeps the browser-only game mount out of the SSR bundle.
    void import('../startGame').then(({ StartGame }) => {
      if (cancelled || !containerRef.current) return;
      gameRef.current = StartGame({
        parent: 'game-container',
        assetsBasePath: '/assets',
        exposeTestHooks: process.env.NODE_ENV !== 'production',
      });
    }).catch(() => {
      if (!cancelled) setLoadError('게임을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    });

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <>
      <div ref={containerRef} style={{ minHeight: '100dvh' }} />
      {loadError && (
        <p role="alert" data-testid="standalone-game-load-error">
          {loadError}
        </p>
      )}
    </>
  );
}
