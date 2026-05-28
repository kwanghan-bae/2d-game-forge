import React from 'react';
import { useGameStore } from '../store/gameStore';

/** 플레이 통계 요약 화면. */
export function StatsScreen() {
  const meta = useGameStore((s) => s.meta);
  const setScreen = useGameStore.getState().setScreen;

  const totalKills = Object.values(meta.bestiary).reduce((a, b) => a + b, 0);
  const monstersDiscovered = Object.keys(meta.bestiary).length;
  const totalRuns = meta.cycleHistory.length;
  const bestLevel = meta.bestRunLevel;
  const bossesKilled = meta.normalBossesKilled.length + meta.hardBossesKilled.length;
  const questsDone = meta.questsCompleted.length;

  const stats = [
    { label: '최고 레벨', value: bestLevel.toLocaleString() },
    { label: '총 처치 수', value: totalKills.toLocaleString() },
    { label: '발견한 몬스터', value: `${monstersDiscovered}종` },
    { label: '보스 처치', value: `${bossesKilled}마리` },
    { label: '완료한 퀘스트', value: `${questsDone}개` },
    { label: '총 런 횟수', value: `${totalRuns}회` },
    { label: '소울 등급', value: `${meta.soulGrade}` },
    { label: '승천 티어', value: `${meta.ascTier}` },
  ];

  return (
    <div style={{ padding: 16, color: '#eee', maxWidth: 360, margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 16 }}>📊 통계</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#1a1d28', padding: 12, borderRadius: 8, border: '1px solid #333' }}>
            <div style={{ fontSize: 11, color: '#888' }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#f0c060' }}>{s.value}</div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setScreen('main-menu')}
        style={{ marginTop: 16, width: '100%', padding: '10px', background: '#3b4252', color: '#eee', border: '1px solid #555', borderRadius: 6, minHeight: 44 }}
      >
        돌아가기
      </button>
    </div>
  );
}
