import React from 'react';
import { useGameStore } from '../store/gameStore';
import { QUESTS } from '../data/quests';
import type { Quest } from '../types';

interface Props {
  onBack: () => void;
}

export function QuestLogScreen({ onBack }: Props) {
  const questsCompleted = useGameStore(s => s.meta.questsCompleted ?? []);
  const questProgress = useGameStore(s => s.meta.questProgress ?? {});

  const completed = QUESTS.filter(q => questsCompleted.includes(q.id));
  const inProgress = QUESTS.filter(q => !questsCompleted.includes(q.id));

  return (
    <div data-testid="quest-log-screen" style={{ padding: 24, color: '#eee', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>📜 퀘스트</h2>
        <button
          type="button"
          data-testid="quest-log-back"
          onClick={onBack}
          style={{ background: '#374151', border: 'none', color: '#eee', padding: '6px 14px', borderRadius: 6, cursor: 'pointer' }}
        >
          돌아가기
        </button>
      </div>

      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>
        완료 {completed.length}/{QUESTS.length}
      </div>

      {inProgress.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, color: '#fbbf24', marginBottom: 8 }}>진행 중</h3>
          {inProgress.map(q => (
            <QuestCard key={q.id} quest={q} progress={questProgress[q.id] ?? 0} completed={false} />
          ))}
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h3 style={{ fontSize: 14, color: '#4ade80', marginBottom: 8 }}>완료</h3>
          {completed.map(q => (
            <QuestCard key={q.id} quest={q} progress={q.target.count} completed={true} />
          ))}
        </section>
      )}
    </div>
  );
}

function QuestCard({ quest, progress, completed }: { quest: Quest; progress: number; completed: boolean }) {
  const pct = Math.min(100, Math.round((progress / quest.target.count) * 100));
  return (
    <div style={{
      background: completed ? '#0a1a0a' : '#111827',
      border: `1px solid ${completed ? '#4ade80' : '#374151'}`,
      borderRadius: 8, padding: 10, marginBottom: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {completed ? '✓ ' : ''}{quest.nameKR}
        </span>
        <span style={{ fontSize: 11, opacity: 0.6 }}>{quest.regionId}</span>
      </div>
      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{quest.description}</div>
      {!completed && (
        <div style={{ marginTop: 6 }}>
          <div style={{ height: 4, background: '#1f2937', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: '#fbbf24', transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{progress}/{quest.target.count}</div>
        </div>
      )}
      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
        보상: {quest.reward.gold ? `${quest.reward.gold.toLocaleString()}G` : ''}
        {quest.reward.bp ? ` +${quest.reward.bp}BP` : ''}
        {quest.reward.equipmentId ? ` 🎁장비` : ''}
        {!quest.reward.gold && !quest.reward.bp && !quest.reward.equipmentId ? '없음' : ''}
      </div>
    </div>
  );
}
