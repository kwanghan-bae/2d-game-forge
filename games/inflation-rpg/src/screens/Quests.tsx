import React from 'react';
import { useGameStore } from '../store/gameStore';
import { QUESTS } from '../data/quests';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { ForgePanel } from '@/components/ui/forge-panel';
import { ForgeButton } from '@/components/ui/forge-button';

export function Quests() {
  const meta = useGameStore((s) => s.meta);
  const currentDungeonId = useGameStore((s) => s.run.currentDungeonId);
  const completeQuest = useGameStore((s) => s.completeQuest);
  const setScreen = useGameStore((s) => s.setScreen);

  const inDungeonFlow = currentDungeonId !== null;

  return (
    <ForgeScreen>
      <div style={{ padding: '14px 16px' }}>
        <h2 style={{ color: 'var(--forge-accent)', margin: 0 }}>퀘스트</h2>
      </div>
      <div style={{ paddingBottom: 16 }}>
        {QUESTS.map((q) => {
          const progress = meta.questProgress[q.id] ?? 0;
          const completed = meta.questsCompleted.includes(q.id);
          const claimable = !inDungeonFlow && !completed && progress >= q.target.count;
          return (
            <ForgePanel
              key={q.id}
              style={{
                margin: '8px 16px',
                opacity: inDungeonFlow ? 0.55 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>{q.nameKR}</span>
                <span style={{ fontSize: 11, color: 'var(--forge-text-secondary)' }}>
                  {q.regionId}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--forge-text-secondary)', margin: '6px 0' }}>
                {q.description}
              </div>
              <div style={{ fontSize: 12 }}>
                진행: {Math.min(progress, q.target.count)} / {q.target.count}
              </div>
              <div style={{ fontSize: 11, color: 'var(--forge-accent)', marginTop: 4 }}>
                보상: {q.reward.gold ? `${q.reward.gold}G ` : ''}
                {q.reward.bp ? `BP+${q.reward.bp} ` : ''}
                {q.reward.equipmentId ? `${q.reward.equipmentId}` : ''}
              </div>
              {inDungeonFlow && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--forge-text-secondary)', fontStyle: 'italic' }}>
                  재설계 예정 — Phase F
                </div>
              )}
              {claimable && (
                <ForgeButton variant="primary" style={{ marginTop: 8 }} onClick={() => completeQuest(q.id)}>
                  보상 수령
                </ForgeButton>
              )}
              {completed && !inDungeonFlow && (
                <div style={{ marginTop: 8, color: 'var(--forge-stat-hp)', fontSize: 12 }}>
                  ✅ 완료
                </div>
              )}
            </ForgePanel>
          );
        })}
      </div>
      <div style={{ padding: '0 16px 16px' }}>
        <ForgeButton variant="secondary" style={{ width: '100%' }} onClick={() => setScreen('world-map')}>
          돌아가기
        </ForgeButton>
      </div>
    </ForgeScreen>
  );
}
