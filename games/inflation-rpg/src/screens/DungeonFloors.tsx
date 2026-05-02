import React from 'react';
import { useGameStore } from '../store/gameStore';
import { getDungeonById } from '../data/dungeons';
import { getFloorInfo, getBossType } from '../data/floors';
import { isRunOver } from '../systems/bp';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { ForgeButton } from '@/components/ui/forge-button';
import { ForgePanel } from '@/components/ui/forge-panel';
import { formatNumber } from '../lib/format';
import type { BossType } from '../types';

const NAMED_FLOOR_COUNT = 30;

export function DungeonFloors() {
  const run = useGameStore((s) => s.run);
  const setScreen = useGameStore((s) => s.setScreen);
  const setCurrentFloor = useGameStore((s) => s.setCurrentFloor);
  const selectDungeon = useGameStore((s) => s.selectDungeon);
  const encounterMonster = useGameStore((s) => s.encounterMonster);
  const endRun = useGameStore((s) => s.endRun);

  const dungeon = run.currentDungeonId
    ? getDungeonById(run.currentDungeonId)
    : undefined;

  if (!dungeon) {
    return (
      <ForgeScreen>
        <ForgePanel style={{ margin: 16 }}>
          <p style={{ color: 'var(--forge-danger)' }}>던전 정보를 찾을 수 없다.</p>
          <ForgeButton onClick={() => setScreen('town')}>마을로</ForgeButton>
        </ForgePanel>
      </ForgeScreen>
    );
  }

  const enterFloor = (floor: number) => {
    if (floor > run.currentFloor) return;
    const info = getFloorInfo(dungeon.id, floor);
    setCurrentFloor(floor);
    encounterMonster(info.monsterLevel);
    const newBP = useGameStore.getState().run.bp;
    if (isRunOver(newBP)) {
      endRun();
      return;
    }
    setScreen('dungeon');
  };

  const backToTown = () => {
    selectDungeon(null);
    setScreen('town');
  };

  const floors = Array.from({ length: NAMED_FLOOR_COUNT }, (_, i) => i + 1);

  return (
    <ForgeScreen>
      <div
        style={{
          padding: '14px 16px',
          background: 'var(--forge-bg-panel)',
          borderBottom: '1px solid var(--forge-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <ForgeButton
          variant="secondary"
          onClick={backToTown}
          data-testid="dungeon-floors-back"
        >
          ← 마을로
        </ForgeButton>
        <span style={{ fontWeight: 700, color: 'var(--forge-accent)' }}>
          {dungeon.emoji} {dungeon.nameKR}
        </span>
        <span style={{ fontSize: 12, color: 'var(--forge-text-secondary)' }}>
          ⚡ BP {formatNumber(run.bp)}
        </span>
      </div>
      <div
        style={{
          padding: 'var(--forge-space-4)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
          gap: 'var(--forge-space-2)',
          overflowY: 'auto',
        }}
      >
        {floors.map((floor) => {
          const info = getFloorInfo(dungeon.id, floor);
          const locked = floor > run.currentFloor;
          const isCurrent = floor === run.currentFloor;
          const bossType: BossType | null = getBossType(floor);
          const dataBoss = bossType ?? 'none';

          const bossBg: Partial<Record<BossType, string>> = {
            mini: '#5a4a1f',
            major: '#7a3f1f',
            sub: '#5a1f5a',
            final: '#aa1f1f',
          };
          const baseBg = isCurrent
            ? 'var(--forge-accent)'
            : locked
            ? 'rgba(0,0,0,0.6)'
            : bossType
            ? bossBg[bossType]
            : 'var(--forge-bg-panel)';

          const label = bossType === 'final'
            ? `⭐F${floor}`
            : bossType
            ? `👹F${floor}`
            : `F${floor}`;

          return (
            <button
              key={floor}
              data-testid={`floor-card-${floor}`}
              data-boss={dataBoss}
              disabled={locked}
              onClick={() => enterFloor(floor)}
              style={{
                minHeight: 56,
                padding: 'var(--forge-space-2)',
                background: baseBg,
                color: isCurrent ? '#000' : 'var(--forge-text-primary)',
                border: `1px solid ${
                  isCurrent
                    ? 'var(--forge-accent)'
                    : bossType === 'final'
                    ? '#ffd700'
                    : 'var(--forge-border)'
                }`,
                borderRadius: 6,
                cursor: locked ? 'not-allowed' : 'pointer',
                opacity: locked ? 0.5 : 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {locked ? '🔒' : label}
              </div>
              <div style={{ fontSize: 10, opacity: 0.85 }}>
                Lv {formatNumber(info.monsterLevel)}
              </div>
            </button>
          );
        })}
      </div>
    </ForgeScreen>
  );
}
