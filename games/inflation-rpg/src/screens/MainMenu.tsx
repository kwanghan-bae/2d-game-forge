import React from 'react';
import { useGameStore } from '../store/gameStore';
import { ForgeButton } from '@/components/ui/forge-button';

export function MainMenu() {
  const setScreen = useGameStore((s) => s.setScreen);
  const abandonRun = useGameStore((s) => s.abandonRun);
  const meta = useGameStore((s) => s.meta);
  const runCharacterId = useGameStore((s) => s.run.characterId);

  const hasActiveRun = runCharacterId !== '';

  return (
    <div className="forge-screen" style={{ background: 'linear-gradient(180deg,#1a1030 0%,#0f0f1a 100%)', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--forge-accent)', letterSpacing: 2 }}>
          INFLATION
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--forge-danger)', letterSpacing: 2 }}>
          RPG
        </div>
        <div style={{ fontSize: 12, color: 'var(--forge-text-muted)', marginTop: 4 }}>
          배틀 포인트를 소비해 최고 레벨을 달성하라
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 200 }}>
        {hasActiveRun ? (
          <>
            <ForgeButton variant="primary" onClick={() => setScreen('world-map')}>
              런 이어하기
            </ForgeButton>
            <ForgeButton
              variant="secondary"
              onClick={() => { abandonRun(); setScreen('class-select'); }}
            >
              새로 시작
            </ForgeButton>
          </>
        ) : (
          <>
            <ForgeButton variant="primary" onClick={() => setScreen('class-select')}>
              게임 시작
            </ForgeButton>
            {meta.hardModeUnlocked && (
              <ForgeButton
                variant="primary"
                style={{ background: 'var(--forge-danger)' }}
                onClick={() => setScreen('class-select')}
              >
                하드모드
              </ForgeButton>
            )}
          </>
        )}
        <ForgeButton variant="secondary" onClick={() => setScreen('inventory')}>
          인벤토리
        </ForgeButton>
        <ForgeButton variant="secondary" onClick={() => setScreen('shop')}>
          상점
        </ForgeButton>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--forge-text-muted)' }}>
        최고 기록: Lv.{meta.bestRunLevel.toLocaleString()}
      </div>
    </div>
  );
}
