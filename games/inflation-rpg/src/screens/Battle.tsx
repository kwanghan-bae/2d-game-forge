import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { StatAlloc } from './StatAlloc';
import { createBattleGame } from '../battle/BattleGame';
import type Phaser from 'phaser';

export function Battle() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [showStatAlloc, setShowStatAlloc] = useState(false);
  const run = useGameStore((s) => s.run);
  const setScreen = useGameStore((s) => s.setScreen);
  const bossDrop = useGameStore((s) => s.bossDrop);

  useEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.id = 'battle-canvas';

    gameRef.current = createBattleGame({
      parent: 'battle-canvas',
      onLevelUp: (_newLevel) => {
        setShowStatAlloc(true);
      },
      onBattleEnd: (_victory) => {
        gameRef.current?.destroy(true);
        setScreen('world-map');
      },
      onBossKill: (bossId, bpReward) => {
        bossDrop(bossId, bpReward);
      },
    });

    return () => {
      gameRef.current?.destroy(true);
    };
  }, []);

  const handleStatAllocClose = () => {
    setShowStatAlloc(false);
    gameRef.current?.scene.resume('BattleScene');
  };

  return (
    <div className="screen" style={{ position: 'relative' }}>
      <div style={{ padding: '8px 14px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <span style={{ fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 8px', color: 'var(--bp-color)', fontWeight: 700 }}>
          ⚡{run.bp}
        </span>
        <span style={{ fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 8px', color: 'var(--hp-color)', fontWeight: 700 }}>
          Lv.{run.level.toLocaleString()}
        </span>
        {run.statPoints > 0 && (
          <span style={{ fontSize: 12, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 5, padding: '3px 8px', color: 'var(--accent)', fontWeight: 700 }}>
            SP {run.statPoints}
          </span>
        )}
      </div>

      <div ref={canvasRef} style={{ flex: 1 }} />

      {showStatAlloc && run.statPoints > 0 && (
        <StatAlloc onClose={handleStatAllocClose} />
      )}
    </div>
  );
}
