import React from 'react';
import { useGameStore } from '../store/gameStore';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { ForgeButton } from '@/components/ui/forge-button';
import { DungeonPickModal } from './DungeonPickModal';

export function Town() {
  const setScreen = useGameStore((s) => s.setScreen);
  const [pickModalOpen, setPickModalOpen] = React.useState(false);

  return (
    <ForgeScreen>
      <h1
        style={{
          textAlign: 'center',
          fontSize: 'var(--forge-font-2xl)',
          marginBottom: 'var(--forge-space-4)',
        }}
      >
        마을
      </h1>
      <p
        style={{
          textAlign: 'center',
          color: 'var(--forge-text-secondary)',
          marginBottom: 'var(--forge-space-6)',
        }}
      >
        차원 너머 던전으로 떠나라
      </p>

      <div style={{ textAlign: 'center', marginBottom: 'var(--forge-space-6)' }}>
        <ForgeButton
          variant="primary"
          onClick={() => setPickModalOpen(true)}
          data-testid="town-enter-dungeon"
        >
          🚪 던전 입장
        </ForgeButton>
      </div>

      <div style={{ textAlign: 'center', marginTop: 'var(--forge-space-4)' }}>
        <ForgeButton
          variant="secondary"
          onClick={() => setScreen('ascension')}
          data-testid="town-ascension-altar"
        >
          🌌 차원 제단
        </ForgeButton>
      </div>

      <div style={{ textAlign: 'center', marginTop: 'var(--forge-space-4)' }}>
        <ForgeButton
          variant="secondary"
          onClick={() => setScreen('skill-progression')}
          data-testid="town-skill-progression"
        >
          🎓 직업소
        </ForgeButton>
      </div>

      <div style={{ textAlign: 'center', marginTop: 'var(--forge-space-4)' }}>
        <ForgeButton
          variant="secondary"
          onClick={() => setScreen('relics')}
          data-testid="town-relics"
        >
          💎 보물고
        </ForgeButton>
      </div>

      <div style={{ textAlign: 'center', marginTop: 'var(--forge-space-6)' }}>
        <ForgeButton variant="secondary" onClick={() => setScreen('main-menu')}>
          돌아가기
        </ForgeButton>
      </div>

      {pickModalOpen && (
        <DungeonPickModal onClose={() => setPickModalOpen(false)} />
      )}
    </ForgeScreen>
  );
}
