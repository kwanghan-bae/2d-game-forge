import React from 'react';
import { useGameStore } from '../store/gameStore';
import { ForgeButton } from '@/components/ui/forge-button';
import { ForgePanel } from '@/components/ui/forge-panel';
import { ForgeScreen } from '@/components/ui/forge-screen';

export function GameOver() {
  const meta = useGameStore((s) => s.meta);
  const setScreen = useGameStore((s) => s.setScreen);

  const charId = meta.lastPlayedCharId;
  const newCharLv = charId ? (meta.characterLevels[charId] ?? 1) : 0;
  const prevCharLv = newCharLv - 1;

  return (
    <ForgeScreen style={{ alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
      <div style={{ fontSize: 48 }}>💀</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--forge-danger)' }}>런 종료</div>
      <ForgePanel style={{ width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--forge-text-muted)', marginBottom: 4 }}>최고 기록</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--forge-accent)' }}>
          Lv.{meta.bestRunLevel.toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: 'var(--forge-text-muted)', marginTop: 4 }}>
          베이스 어빌리티 Lv.{meta.baseAbilityLevel}
          {meta.hardModeUnlocked && <span style={{ color: 'var(--forge-danger)', marginLeft: 8 }}>하드모드 해금!</span>}
        </div>
      </ForgePanel>
      {charId && newCharLv > 0 && (
        <ForgePanel style={{ width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--forge-text-muted)', marginBottom: 4 }}>캐릭터 성장</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--forge-accent)' }}>
            캐릭터 레벨 {prevCharLv} → {newCharLv}
          </div>
          <div style={{ fontSize: 11, color: 'var(--forge-text-muted)', marginTop: 2 }}>
            스탯 배율 ×{(1 + newCharLv * 0.1).toFixed(1)}
          </div>
        </ForgePanel>
      )}
      <ForgeButton variant="primary" style={{ width: '100%' }} onClick={() => setScreen('town')}>
        다시 도전
      </ForgeButton>
      <ForgeButton variant="secondary" style={{ width: '100%' }} onClick={() => setScreen('main-menu')}>
        메인 메뉴
      </ForgeButton>
    </ForgeScreen>
  );
}
