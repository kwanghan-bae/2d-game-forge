/**
 * AbyssalCorridorModal.test.tsx — C1124: Component tests for AbyssalCorridorModal.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AbyssalCorridorModal } from '../AbyssalCorridorModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';
import { useCycleStoreV2 } from '../../overworld/cycleSliceV2';
import { HeroEntity } from '../../hero/HeroEntity';

describe('C1124: AbyssalCorridorModal Component Tests', () => {
  beforeEach(() => {
    const mockHero = HeroEntity.create({ seed: 42, heroHpMax: 100000000, heroAtkBase: 50000000 });
    useCycleStoreV2.setState({
      controller: {
        getHero: () => mockHero,
      } as any,
    });

    useGameStore.setState({
      screen: 'main-menu',
      run: { ...INITIAL_RUN, goldThisRun: 5000 },
      meta: {
        ...INITIAL_META,
        apexTrialsCleared: [1, 2, 3], // Unlocks corridor Sector 1
        corridorSectorsCleared: [],
        starlightShards: 10,
        crackStones: 5,
        dimensionalEssence: 2,
        equippedItemIds: [],
        inventory: { weapons: [], armors: [], accessories: [] },
      },
    });
  });

  it('renders modal with title, header, and 5 sector tabs', () => {
    const onClose = vi.fn();
    render(<AbyssalCorridorModal onClose={onClose} />);

    expect(screen.getByTestId('abyssal-corridor-modal')).toBeDefined();
    expect(screen.getByText(/우주적 심연 회랑/)).toBeDefined();

    for (let s = 1; s <= 5; s++) {
      expect(screen.getByTestId(`sector-btn-${s}`)).toBeDefined();
    }

    fireEvent.click(screen.getByTestId('close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows locked state if apex trial tier 3 is not cleared', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        apexTrialsCleared: [1, 2], // Missing tier 3
      },
    }));

    render(<AbyssalCorridorModal onClose={() => {}} />);

    const challengeBtn = screen.getByTestId('challenge-corridor-btn');
    expect(challengeBtn).toBeDisabled();
    expect(screen.getByText(/초월 시련 3단계/)).toBeDefined();
  });

  it('allows switching sectors and updates guardian information', () => {
    render(<AbyssalCorridorModal onClose={() => {}} />);

    // Click sector 2 tab
    const sector2Btn = screen.getByTestId('sector-btn-2');
    fireEvent.click(sector2Btn);

    const guardianName = screen.getByTestId('guardian-name');
    expect(guardianName.textContent).toContain('암흑의 파편용');
  });

  it('executing challenge on sector 1 triggers combat, awards rewards and records cleared sector', () => {
    render(<AbyssalCorridorModal onClose={() => {}} />);

    const challengeBtn = screen.getByTestId('challenge-corridor-btn');
    expect(challengeBtn).not.toBeDisabled();
    expect(screen.getByTestId('sector-lore-inscript')).toBeDefined();

    fireEvent.click(challengeBtn);

    const combatResult = screen.getByTestId('corridor-combat-result');
    expect(combatResult).toBeDefined();
    expect(combatResult.textContent).toContain('토벌 성공');
    expect(screen.getByTestId('guardian-dialogue')).toBeDefined();

    const state = useGameStore.getState();
    expect(state.meta.corridorSectorsCleared).toContain(1);
    expect(state.meta.starlightShards).toBeGreaterThan(10);
    expect(state.meta.crackStones).toBeGreaterThan(5);
    expect(state.meta.dimensionalEssence).toBe(2);
    expect(state.run.goldThisRun).toBeGreaterThan(5000);
  });

  it('closes when clicking the backdrop', () => {
    const onClose = vi.fn();
    render(<AbyssalCorridorModal onClose={onClose} />);

    const backdrop = screen.getByTestId('abyssal-corridor-modal-backdrop');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
