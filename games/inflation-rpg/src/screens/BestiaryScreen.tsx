import React from 'react';
import { useGameStore } from '../store/gameStore';
import { MONSTERS } from '../data/monsters';
import { MONSTER_LORE } from '../data/monsterLore';

export function BestiaryScreen() {
  const bestiary = useGameStore((s) => s.meta.bestiary);
  const setScreen = useGameStore((s) => s.setScreen);

  const discovered = MONSTERS.filter((m) => (bestiary[m.id] ?? 0) > 0);
  const total = MONSTERS.length;

  return (
    <div className="forge-screen" style={{ padding: '16px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ margin: 0 }}>몬스터 도감</h2>
        <button
          onClick={() => setScreen('main-menu')}
          style={{ background: 'var(--forge-accent)', color: '#000', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer' }}
        >
          닫기
        </button>
      </div>
      <p style={{ color: 'var(--forge-text-secondary)', marginBottom: '12px' }}>
        발견: {discovered.length} / {total}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {MONSTERS.map((m) => {
          const kills = bestiary[m.id] ?? 0;
          const known = kills > 0;
          return (
            <div
              key={m.id}
              style={{
                background: 'var(--forge-bg-surface)',
                borderRadius: '6px',
                padding: '8px 12px',
                opacity: known ? 1 : 0.4,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{known ? `${m.emoji} ${m.nameKR}` : '❓ ???'}</span>
                {known && <span style={{ color: 'var(--forge-text-secondary)', fontSize: '12px' }}>×{kills}</span>}
              </div>
              {known && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--forge-text-secondary)' }}>
                  {MONSTER_LORE[m.id] ?? ''}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
