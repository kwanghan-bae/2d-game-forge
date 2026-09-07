'use client';

import { useEffect, useRef, useState } from 'react';
import type { ForgeGameInstance } from '@forge/core';
import { findGame } from '@/lib/registry';

export interface GameMountProps {
  slug: string;
  assetsBasePath: string;
}

export default function GameMountInner({ slug, assetsBasePath }: GameMountProps) {
  const containerId = `game-container-${slug}`;
  const instanceRef = useRef<ForgeGameInstance | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (instanceRef.current) return;
    setLoadError(null);
    let destroyed = false;
    let gameInstance: ForgeGameInstance | null = null;

    const game = findGame(slug);
    if (!game) {
      setLoadError('등록된 게임을 찾을 수 없습니다.');
      return;
    }

    void game.load().then((mod) => {
      if (destroyed) return;
      gameInstance = mod.StartGame({
        parent: containerId,
        assetsBasePath,
        exposeTestHooks: process.env.NODE_ENV !== 'production',
      });
      instanceRef.current = gameInstance;
    }).catch(() => {
      if (!destroyed) setLoadError('게임을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    });

    return () => {
      destroyed = true;
      gameInstance?.destroy(true);
      instanceRef.current = null;
    };
  }, [slug, assetsBasePath, containerId]);

  return (
    <div id={containerId} className="mx-auto">
      {loadError && (
        <p role="alert" data-testid="game-load-error" className="rounded-md border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
          {loadError}
        </p>
      )}
    </div>
  );
}
