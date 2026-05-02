import React from 'react';
import { useGameStore } from '../store/gameStore';
import { ForgeButton } from '@/components/ui/forge-button';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { formatNumber } from '../lib/format';

export function MainMenu() {
  const setScreen = useGameStore((s) => s.setScreen);
  const abandonRun = useGameStore((s) => s.abandonRun);
  const meta = useGameStore((s) => s.meta);
  const runCharacterId = useGameStore((s) => s.run.characterId);
  const setTutorialStep = useGameStore((s) => s.setTutorialStep);
  const restartTutorial = useGameStore((s) => s.restartTutorial);

  const hasActiveRun = runCharacterId !== '';

  React.useEffect(() => {
    if (!meta.tutorialDone && meta.tutorialStep === -1) {
      setTutorialStep(0);
    }
  }, [meta.tutorialDone, meta.tutorialStep, setTutorialStep]);

  return (
    <ForgeScreen style={{ background: 'linear-gradient(180deg,#1a1030 0%,#0f0f1a 100%)', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
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
            <ForgeButton
              variant="primary"
              onClick={() => {
                const dungeonId = useGameStore.getState().run.currentDungeonId;
                setScreen(dungeonId !== null ? 'dungeon-floors' : 'town');
              }}
            >
              런 이어하기
            </ForgeButton>
            <ForgeButton
              variant="secondary"
              onClick={() => { abandonRun(); setScreen('town'); }}
            >
              새로 시작
            </ForgeButton>
          </>
        ) : (
          <ForgeButton variant="primary" onClick={() => setScreen('town')}>
            🏘️ 마을로
          </ForgeButton>
        )}
        <ForgeButton variant="secondary" onClick={() => setScreen('inventory')}>
          인벤토리
        </ForgeButton>
        <ForgeButton variant="secondary" onClick={() => setScreen('shop')}>
          상점
        </ForgeButton>
        <ForgeButton variant="secondary" onClick={restartTutorial}>
          튜토리얼 다시
        </ForgeButton>
      </div>

      <VolumeControls />

      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--forge-text-secondary)', marginTop: 4 }}>
        <span>💰 {formatNumber(meta.gold)}</span>
        <span>DR {formatNumber(meta.dr)}</span>
        <span>강화석 {formatNumber(meta.enhanceStones)}</span>
      </div>

      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--forge-text-muted)' }}>
        최고 기록: Lv.{meta.bestRunLevel.toLocaleString()}
      </div>
    </ForgeScreen>
  );
}

function VolumeControls() {
  const meta = useGameStore((s) => s.meta);
  const setVolumes = useGameStore((s) => s.setVolumes);
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: 6, width: 200,
        padding: 10, background: 'var(--forge-bg-panel)',
        border: '1px solid var(--forge-border)', borderRadius: 8,
        fontSize: 11, color: 'var(--forge-text-secondary)',
      }}
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 32 }}>BGM</span>
        <input
          type="range" min={0} max={100}
          value={Math.round(meta.musicVolume * 100)}
          onChange={(e) => setVolumes(Number(e.target.value) / 100, meta.sfxVolume, meta.muted)}
          style={{ flex: 1 }}
        />
        <span style={{ width: 28, textAlign: 'right' }}>{Math.round(meta.musicVolume * 100)}</span>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 32 }}>SFX</span>
        <input
          type="range" min={0} max={100}
          value={Math.round(meta.sfxVolume * 100)}
          onChange={(e) => setVolumes(meta.musicVolume, Number(e.target.value) / 100, meta.muted)}
          style={{ flex: 1 }}
        />
        <span style={{ width: 28, textAlign: 'right' }}>{Math.round(meta.sfxVolume * 100)}</span>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={meta.muted}
          onChange={(e) => setVolumes(meta.musicVolume, meta.sfxVolume, e.target.checked)}
        />
        음소거
      </label>
    </div>
  );
}
