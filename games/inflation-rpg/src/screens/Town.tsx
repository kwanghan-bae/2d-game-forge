import React from 'react';
import { useGameStore } from '../store/gameStore';
import { getStartDungeons } from '../data/dungeons';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { ForgeButton } from '@/components/ui/forge-button';
import { ForgePanel } from '@/components/ui/forge-panel';
import type { Dungeon } from '../types';

export function Town() {
  const setScreen = useGameStore((s) => s.setScreen);
  const selectDungeon = useGameStore((s) => s.selectDungeon);

  const dungeons = getStartDungeons();

  const enterDungeon = (d: Dungeon) => {
    selectDungeon(d.id);
    setScreen('class-select');
  };

  return (
    <ForgeScreen>
      <h1
        style={{
          textAlign: 'center',
          fontSize: 'var(--forge-font-2xl)',
          marginBottom: 'var(--forge-space-4)',
        }}
      >
        마을
      </h1>
      <p
        style={{
          textAlign: 'center',
          color: 'var(--forge-text-secondary)',
          marginBottom: 'var(--forge-space-6)',
        }}
      >
        던전을 선택하여 모험을 시작한다
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--forge-space-4)',
          padding: 'var(--forge-space-4)',
        }}
      >
        {dungeons.map((d) => (
          <ForgePanel
            key={d.id}
            data-testid={`town-dungeon-${d.id}`}
            style={{
              borderLeft: `4px solid ${d.themeColor}`,
              padding: 'var(--forge-space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--forge-space-2)',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '3rem' }}>{d.emoji}</div>
            <div style={{ fontSize: 'var(--forge-font-lg)', fontWeight: 600 }}>
              {d.nameKR}
            </div>
            <ForgeButton variant="primary" onClick={() => enterDungeon(d)}>입장</ForgeButton>
          </ForgePanel>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 'var(--forge-space-6)' }}>
        <ForgeButton variant="secondary" onClick={() => setScreen('main-menu')}>
          돌아가기
        </ForgeButton>
      </div>
    </ForgeScreen>
  );
}
