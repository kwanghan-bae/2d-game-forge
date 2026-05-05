import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { StatAlloc } from './StatAlloc';
import { createBattleGame } from '../battle/BattleGame';
import type Phaser from 'phaser';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { StoryModal } from '../components/StoryModal';
import { getStoryById } from '../data/stories';

export function Battle() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [showStatAlloc, setShowStatAlloc] = useState(false);
  const run = useGameStore((s) => s.run);
  const setScreen = useGameStore((s) => s.setScreen);
  const bossDrop = useGameStore((s) => s.bossDrop);
  const pendingStoryId = useGameStore((s) => s.pendingStoryId);
  const setPendingStory = useGameStore((s) => s.setPendingStory);
  const pendingStory = pendingStoryId ? getStoryById(pendingStoryId) : null;

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
        setScreen('town');
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
    <ForgeScreen style={{ position: 'relative' }}>
      <div data-testid="battle-header" style={{ padding: '8px 14px', background: 'var(--forge-bg-panel)', borderBottom: '1px solid var(--forge-border)', display: 'flex', gap: 8 }}>
        <span style={{ fontSize: 12, background: 'var(--forge-bg-card)', border: '1px solid var(--forge-border)', borderRadius: 5, padding: '3px 8px', color: 'var(--forge-stat-bp)', fontWeight: 700 }}>
          ⚡{run.bp}
        </span>
        <span style={{ fontSize: 12, background: 'var(--forge-bg-card)', border: '1px solid var(--forge-border)', borderRadius: 5, padding: '3px 8px', color: 'var(--forge-stat-hp)', fontWeight: 700 }}>
          Lv.{run.level.toLocaleString()}
        </span>
        {run.statPoints > 0 && (
          <span style={{ fontSize: 12, background: 'var(--forge-accent-dim)', border: '1px solid var(--forge-accent)', borderRadius: 5, padding: '3px 8px', color: 'var(--forge-accent)', fontWeight: 700 }}>
            SP {run.statPoints}
          </span>
        )}
      </div>

      <div ref={canvasRef} style={{ flex: 1 }} />

      {showStatAlloc && run.statPoints > 0 && (
        <StatAlloc onClose={handleStatAllocClose} />
      )}

      {pendingStory && (
        <StoryModal
          title="보스 처치"
          textKR={pendingStory.textKR}
          onClose={() => setPendingStory(null)}
        />
      )}
    </ForgeScreen>
  );
}
