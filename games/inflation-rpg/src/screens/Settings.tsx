import React from 'react';
import { useGameStore } from '../store/gameStore';
import { ForgeButton } from '@/components/ui/forge-button';
import { ForgeScreen } from '@/components/ui/forge-screen';

export function Settings() {
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <ForgeScreen style={{ background: 'linear-gradient(180deg,#1a1030 0%,#0f0f1a 100%)', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--forge-accent)', marginBottom: 8 }}>
        설정
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 200 }}>
        <ForgeButton variant="primary" onClick={() => setScreen('iap-shop')}>
          상점 (IAP)
        </ForgeButton>

        <ForgeButton variant="secondary" onClick={() => setScreen('privacy')}>
          개인정보처리방침
        </ForgeButton>

        <ForgeButton
          variant="secondary"
          onClick={() => window.dispatchEvent(new CustomEvent('forge-restore-purchases'))}
        >
          구매 복원
        </ForgeButton>

        <ForgeButton variant="secondary" onClick={() => setScreen('main-menu')}>
          뒤로
        </ForgeButton>
      </div>
    </ForgeScreen>
  );
}
