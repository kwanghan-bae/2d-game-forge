/**
 * AscendantRushModal.test.tsx — C1073: AscendantRushModal Component Tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AscendantRushModal } from '../AscendantRushModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';
import { useCycleStoreV2 } from '../../overworld/cycleSliceV2';
import { BOSS_RUSH_WAVES } from '../../systems/ascendantBossRush';
import type { HeroEntity } from '../../hero/HeroEntity';

describe('C1073: AscendantRushModal Component Tests', () => {
  const dummyHero = {
    id: 'hero-1',
    name: '성광의 용사',
    jobId: 'swordsman',
    level: 150,
    hp: 1000000,
    hpMax: 1000000,
    atk: 450000,
    def: 35000,
    spd: 100,
    critRate: 0.10,
    critDmg: 1.5,
  } as unknown as HeroEntity;

  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: {
        ...INITIAL_RUN,
        goldThisRun: 50000,
      },
      meta: {
        ...INITIAL_META,
        starlightShards: 10,
        crackStones: 5,
        equippedItemIds: [],
        inventory: {
          weapons: [],
          armors: [],
          accessories: [],
        },
      },
    });

    useCycleStoreV2.setState({
      controller: {
        getHero: () => dummyHero,
      } as unknown as ReturnType<typeof useCycleStoreV2.getState>['controller'],
    });
  });

  it('renders modal with title, 5 boss wave cards, resources, and close button', () => {
    const onClose = vi.fn();
    render(<AscendantRushModal onClose={onClose} />);

    expect(screen.getByTestId('boss-rush-modal')).toBeDefined();
    expect(screen.getByText(/승천 보스 연전 \(Boss Rush\)/)).toBeDefined();
    expect(screen.getByText(/50,000G/)).toBeDefined();
    expect(screen.getByText(/10개/)).toBeDefined();
    expect(screen.getByText(/5개/)).toBeDefined();

    for (const w of BOSS_RUSH_WAVES) {
      expect(screen.getByTestId(`rush-wave-card-${w.wave}`)).toBeDefined();
    }

    fireEvent.click(screen.getByTestId('close-rush-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('executes boss rush on button click, awards rewards to store, and displays summary', () => {
    render(<AscendantRushModal onClose={() => {}} />);

    const startBtn = screen.getByTestId('start-rush-btn');
    expect(startBtn).not.toBeDisabled();
    expect(startBtn.textContent).toContain('5연속 승천 보스 연전 개시');

    fireEvent.click(startBtn);

    // Summary banner appears
    const summary = screen.getByTestId('rush-summary-banner');
    expect(summary).toBeDefined();

    // Check store state updated with rewards
    const state = useGameStore.getState();
    expect(state.meta.starlightShards).toBeGreaterThan(10);
    expect(state.meta.crackStones).toBeGreaterThan(5);
    expect(state.run.goldThisRun).toBeGreaterThan(50000);

    // Button label transitions to retry
    expect(screen.getByTestId('start-rush-btn').textContent).toContain('보스 연전 재도전');
  });

  it('displays wave-by-wave turn results on completed rush', () => {
    render(<AscendantRushModal onClose={() => {}} />);

    fireEvent.click(screen.getByTestId('start-rush-btn'));

    // Wave 1 card should display checkmark and turns
    const wave1Card = screen.getByTestId('rush-wave-card-1');
    expect(wave1Card.textContent).toContain('턴');
  });
});
