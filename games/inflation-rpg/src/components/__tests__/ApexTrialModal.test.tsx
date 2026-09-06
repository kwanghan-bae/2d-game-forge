/**
 * ApexTrialModal.test.tsx — C1105: Apex Trial Challenge Summit Modal Component Tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApexTrialModal } from '../ApexTrialModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';
import { useCycleStoreV2 } from '../../overworld/cycleSliceV2';
import type { HeroEntity } from '../../hero/HeroEntity';

describe('C1105: ApexTrialModal Component Tests', () => {
  const dummyHero = {
    id: 'hero-apex',
    name: '무극의 천상용사',
    jobId: 'swordsman',
    level: 200,
    hp: 80_000_000,
    hpMax: 80_000_000,
    atk: 30_000_000,
    def: 200_000,
  } as unknown as HeroEntity;

  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: {
        ...INITIAL_RUN,
        goldThisRun: 100_000,
      },
      meta: {
        ...INITIAL_META,
        starlightShards: 100,
        crackStones: 50,
        highestRiftDepth: 25,
        apexTrialsCleared: [],
        transmutedRelics: ['polaris_celestial_eye'],
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

  it('renders modal with title, tabs, boss information, and close button', () => {
    const onClose = vi.fn();
    render(<ApexTrialModal onClose={onClose} />);

    expect(screen.getByTestId('apex-trial-modal')).toBeDefined();
    expect(screen.getByText(/무극의 초월 시련 \(Apex Trial Summit\)/)).toBeDefined();
    expect(screen.getByTestId('tier-btn-1')).toBeDefined();
    expect(screen.getByTestId('tier-btn-2')).toBeDefined();
    expect(screen.getByTestId('tier-btn-3')).toBeDefined();

    // Check boss card for tier 1
    expect(screen.getByTestId('boss-name').textContent).toBe('태초의 성흔룡');
    expect(screen.getByText(/여명의 개척자/)).toBeDefined();

    fireEvent.click(screen.getByTestId('close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables challenge button when tier requirements are not met', () => {
    // Reset highestRiftDepth to 5 (< 20 required for tier 1)
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        highestRiftDepth: 5,
      },
    }));

    render(<ApexTrialModal onClose={() => {}} />);
    expect(screen.getByText(/시련 해금 조건 미달/)).toBeDefined();
    expect(screen.getByTestId('challenge-apex-btn')).toBeDisabled();
  });

  it('executes challenge on Tier 1 when requirements are met and grants rewards upon victory', () => {
    render(<ApexTrialModal onClose={() => {}} />);

    const challengeBtn = screen.getByTestId('challenge-apex-btn');
    expect(challengeBtn).not.toBeDisabled();

    fireEvent.click(challengeBtn);

    // Result card appears
    const resultBox = screen.getByTestId('apex-combat-result');
    expect(resultBox).toBeDefined();
    expect(resultBox.textContent).toContain('토벌 성공');

    // Store updated
    const state = useGameStore.getState();
    expect(state.meta.apexTrialsCleared).toContain(1);
    expect(state.meta.starlightShards).toBe(100 + 150);
    expect(state.meta.crackStones).toBe(50 + 30);
    expect(state.run.goldThisRun).toBe(100_000 + 1_000_000);
  });

  it('switches between tiers when clicking tier tabs', () => {
    render(<ApexTrialModal onClose={() => {}} />);

    // Switch to tier 2
    fireEvent.click(screen.getByTestId('tier-btn-2'));
    expect(screen.getByTestId('boss-name').textContent).toBe('불멸의 황혼성황');
    expect(screen.getByText(/황혼의 정복자/)).toBeDefined();

    // Switch to tier 3
    fireEvent.click(screen.getByTestId('tier-btn-3'));
    expect(screen.getByTestId('boss-name').textContent).toBe('무극의 창조주');
    expect(screen.getByText(/무극의 초월자/)).toBeDefined();
  });

  it('disables challenge button when hero is not present in controller', () => {
    useCycleStoreV2.setState({
      controller: {
        getHero: () => null,
      } as unknown as ReturnType<typeof useCycleStoreV2.getState>['controller'],
    });

    render(<ApexTrialModal onClose={() => {}} />);
    expect(screen.getByTestId('challenge-apex-btn')).toBeDisabled();
  });
});
