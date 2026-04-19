import React from 'react';
import { useGameStore } from '../store/gameStore';

export function GameOver() {
  const meta = useGameStore((s) => s.meta);
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
      <div style={{ fontSize: 48 }}>💀</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--danger)' }}>런 종료</div>
      <div className="panel" style={{ width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>최고 기록</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>
          Lv.{meta.bestRunLevel.toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          베이스 어빌리티 Lv.{meta.baseAbilityLevel}
          {meta.hardModeUnlocked && <span style={{ color: 'var(--danger)', marginLeft: 8 }}>하드모드 해금!</span>}
        </div>
      </div>
      <button className="btn-primary" style={{ width: '100%' }} onClick={() => setScreen('class-select')}>
        다시 도전
      </button>
      <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setScreen('main-menu')}>
        메인 메뉴
      </button>
    </div>
  );
}
