import React from 'react';
import { useGameStore } from '../store/gameStore';

export function MainMenu() {
  const setScreen = useGameStore(s => s.setScreen);
  const bestRunLevel = useGameStore(s => s.meta.bestRunLevel ?? 0);

  return (
    <div data-testid="main-menu" style={{ padding: 24, color: '#eee', textAlign: 'center' }}>
      <h1 style={{ marginBottom: 8 }}>조선 인플레이션 RPG</h1>
      <p style={{ opacity: 0.7, marginBottom: 32 }}>신이 되어 용사의 일대기를 후원하라</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 280, margin: '0 auto' }}>
        <button
          type="button"
          data-testid="btn-start-cycle"
          onClick={() => setScreen('cycle-prep-v2')}
          style={menuBtnStyle}
        >
          사이클 시작
        </button>
        <button
          type="button"
          data-testid="btn-saga-gallery"
          onClick={() => setScreen('saga-gallery')}
          style={{ ...menuBtnStyle, opacity: 0.5 }}
          disabled
        >
          용사 갤러리 (V1b)
        </button>
        <button
          type="button"
          data-testid="btn-settings"
          onClick={() => setScreen('settings')}
          style={{ ...menuBtnStyle, opacity: 0.5 }}
          disabled
        >
          설정
        </button>
      </div>

      <div data-testid="best-record" style={{ marginTop: 24, fontSize: 12, opacity: 0.6 }}>
        최고 기록: Lv {bestRunLevel}
      </div>
    </div>
  );
}

const menuBtnStyle: React.CSSProperties = {
  padding: '12px 24px',
  fontSize: 16,
  background: '#1f2937',
  color: '#fbbf24',
  border: '1px solid #fbbf24',
  borderRadius: 4,
  cursor: 'pointer',
};
