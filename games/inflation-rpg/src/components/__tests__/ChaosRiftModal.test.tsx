/**
 * ChaosRiftModal.test.tsx — C1081: Endless Chaos Rift Modal Component Tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChaosRiftModal } from '../ChaosRiftModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';
import { useCycleStoreV2 } from '../../overworld/cycleSliceV2';
import type { HeroEntity } from '../../hero/HeroEntity';

describe('C1081: ChaosRiftModal Component Tests', () => {
  const dummyHero = {
    id: 'hero-rift',
    name: '천외천의 무극신선',
    jobId: 'swordsman',
    level: 150,
    hp: 1500000,
    hpMax: 1500000,
    atk: 800000,
    def: 50000,
    spd: 120,
    critRate: 0.15,
    critDmg: 1.8,
  } as unknown as HeroEntity;

  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: {
        ...INITIAL_RUN,
        goldThisRun: 100000,
      },
      meta: {
        ...INITIAL_META,
        starlightShards: 50,
        crackStones: 20,
        highestRiftDepth: 0,
        awakeningTier: 9, // Tier 9: 2.0x final dmg multiplier
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

  it('renders modal with title, currencies, depth indicator, guardian preview, and close button', () => {
    const onClose = vi.fn();
    render(<ChaosRiftModal onClose={onClose} />);

    expect(screen.getByTestId('chaos-rift-modal')).toBeDefined();
    expect(screen.getByText(/무한 혼돈의 균열 \(Chaos Rift\)/)).toBeDefined();
    expect(screen.getByText(/최고 도달: 0층/)).toBeDefined();
    expect(screen.getByText(/100,000G/)).toBeDefined();
    expect(screen.getByText(/50개/)).toBeDefined();
    expect(screen.getByText(/20개/)).toBeDefined();

    // Check depth indicator and guardian preview
    expect(screen.getByTestId('depth-indicator').textContent).toContain('심도 1층');
    expect(screen.getByTestId('guardian-card')).toBeDefined();

    fireEvent.click(screen.getByTestId('close-rift-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows navigating depth with buttons up to max unlocked depth', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        highestRiftDepth: 5,
      },
    }));

    render(<ChaosRiftModal onClose={() => {}} />);
    expect(screen.getByTestId('depth-indicator').textContent).toContain('심도 6층');

    // Prev button decrements depth
    const prevBtn = screen.getByTestId('depth-prev-btn');
    fireEvent.click(prevBtn);
    expect(screen.getByTestId('depth-indicator').textContent).toContain('심도 5층');

    // Max button jumps back to highest selectable depth (6)
    const maxBtn = screen.getByTestId('depth-max-btn');
    fireEvent.click(maxBtn);
    expect(screen.getByTestId('depth-indicator').textContent).toContain('심도 6층');
  });

  it('executes single depth challenge, updates store rewards and highest depth', () => {
    render(<ChaosRiftModal onClose={() => {}} />);

    const challengeBtn = screen.getByTestId('challenge-single-btn');
    expect(challengeBtn).not.toBeDisabled();

    fireEvent.click(challengeBtn);

    // Single result box appears
    const resultBox = screen.getByTestId('single-result-box');
    expect(resultBox).toBeDefined();
    expect(resultBox.textContent).toContain('돌파 성공');

    // Store state updated
    const state = useGameStore.getState();
    expect(state.meta.highestRiftDepth).toBe(1);
    expect(state.meta.starlightShards).toBeGreaterThan(50);
    expect(state.meta.crackStones).toBeGreaterThan(20);
    expect(state.run.goldThisRun).toBeGreaterThan(100000);
  });

  it('executes 10-depth continuous expedition, logs multi-battles, and accumulates rewards', () => {
    render(<ChaosRiftModal onClose={() => {}} />);

    const expeditionBtn = screen.getByTestId('start-expedition-btn');
    expect(expeditionBtn).not.toBeDisabled();

    fireEvent.click(expeditionBtn);

    // Expedition summary appears
    const summary = screen.getByTestId('expedition-summary-banner');
    expect(summary).toBeDefined();
    expect(summary.textContent).toContain('10층 연속 원정 결과');

    // Expedition log list contains entries
    const log = screen.getByTestId('expedition-log');
    expect(log).toBeDefined();
    expect(screen.getByTestId('log-entry-1')).toBeDefined();

    // Store state updated
    const state = useGameStore.getState();
    expect(state.meta.highestRiftDepth).toBeGreaterThanOrEqual(5);
    expect(state.meta.starlightShards).toBeGreaterThan(100);
  });

  it('disables challenge and expedition buttons when hero is not present', () => {
    useCycleStoreV2.setState({
      controller: {
        getHero: () => null,
      } as unknown as ReturnType<typeof useCycleStoreV2.getState>['controller'],
    });

    render(<ChaosRiftModal onClose={() => {}} />);

    expect(screen.getByTestId('challenge-single-btn')).toBeDisabled();
    expect(screen.getByTestId('start-expedition-btn')).toBeDisabled();
  });
});
