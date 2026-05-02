import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { MAP_AREAS } from '../data/maps';
import { getDungeonById } from '../data/dungeons';
import { Battle } from './Battle';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { ForgePanel } from '@/components/ui/forge-panel';
import { ForgeButton } from '@/components/ui/forge-button';

export function Dungeon() {
  const run = useGameStore((s) => s.run);
  const setScreen = useGameStore((s) => s.setScreen);

  const isNewFlow = run.currentDungeonId !== null;
  const dungeon = isNewFlow ? getDungeonById(run.currentDungeonId!) : undefined;

  const area = useMemo(
    () => MAP_AREAS.find((a) => a.id === run.currentAreaId),
    [run.currentAreaId],
  );

  if (isNewFlow) {
    if (!dungeon) {
      return (
        <ForgeScreen>
          <ForgePanel style={{ margin: 16 }}>
            <p style={{ color: 'var(--forge-danger)' }}>던전을 찾을 수 없다.</p>
            <ForgeButton onClick={() => setScreen('town')}>마을로</ForgeButton>
          </ForgePanel>
        </ForgeScreen>
      );
    }
    return (
      <ForgeScreen>
        <div
          data-testid="dungeon-header"
          style={{
            padding: '14px 16px',
            background: 'var(--forge-bg-panel)',
            borderBottom: '1px solid var(--forge-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 700, color: 'var(--forge-accent)' }}>
            {dungeon.emoji} {dungeon.nameKR}
          </span>
          <span style={{ fontSize: 12, color: 'var(--forge-text-secondary)' }}>
            F{run.currentFloor}
          </span>
        </div>
        <Battle />
      </ForgeScreen>
    );
  }

  // 구 flow — area + stage UI
  if (!area) {
    return (
      <ForgeScreen>
        <ForgePanel style={{ margin: 16 }}>
          <p style={{ color: 'var(--forge-danger)' }}>구역을 찾을 수 없다.</p>
          <ForgeButton onClick={() => setScreen('world-map')}>월드맵</ForgeButton>
        </ForgePanel>
      </ForgeScreen>
    );
  }

  const isFinalStage = run.currentStage >= area.stageCount;
  const totalMonsters = area.stageMonsterCount * area.stageCount;
  const stageProgress = totalMonsters > 0
    ? Math.min(1, run.dungeonRunMonstersDefeated / totalMonsters)
    : 0;

  return (
    <ForgeScreen>
      <div
        data-testid="dungeon-header"
        style={{
          padding: '14px 16px',
          background: 'var(--forge-bg-panel)',
          borderBottom: '1px solid var(--forge-border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 700, color: 'var(--forge-accent)' }}>
            {area.nameKR}
          </span>
          <span style={{ fontSize: 12, color: 'var(--forge-text-secondary)' }}>
            Stage {run.currentStage} / {area.stageCount}
            {isFinalStage && area.finalStageIsBoss ? ' · BOSS' : ''}
          </span>
        </div>
        <div
          style={{
            height: 4,
            background: 'var(--forge-border)',
            marginTop: 8,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${stageProgress * 100}%`,
              height: '100%',
              background: isFinalStage
                ? 'var(--forge-danger)'
                : 'var(--forge-accent)',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>
      <Battle />
    </ForgeScreen>
  );
}
