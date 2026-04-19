import React from 'react';
import { useGameStore } from '../store/gameStore';

export function MainMenu() {
  const setScreen = useGameStore((s) => s.setScreen);
  const meta = useGameStore((s) => s.meta);

  return (
    <div className="screen" style={{ background: 'linear-gradient(180deg,#1a1030 0%,#0f0f1a 100%)', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--accent)', letterSpacing: 2 }}>
          INFLATION
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--danger)', letterSpacing: 2 }}>
          RPG
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          배틀 포인트를 소비해 최고 레벨을 달성하라
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 200 }}>
        <button className="btn-primary" onClick={() => setScreen('class-select')}>
          게임 시작
        </button>
        {meta.hardModeUnlocked && (
          <button
            className="btn-primary"
            style={{ background: 'var(--danger)' }}
            onClick={() => setScreen('class-select')}
          >
            하드모드
          </button>
        )}
        <button className="btn-secondary" onClick={() => setScreen('inventory')}>
          인벤토리
        </button>
        <button className="btn-secondary" onClick={() => setScreen('shop')}>
          상점
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
        최고 기록: Lv.{meta.bestRunLevel.toLocaleString()}
      </div>
    </div>
  );
}
