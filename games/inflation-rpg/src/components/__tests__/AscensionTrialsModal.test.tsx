import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AscensionTrialsModal } from '../AscensionTrialsModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';
import { useCycleStoreV2 } from '../../overworld/cycleSliceV2';
import { HeroEntity } from '../../hero/HeroEntity';

describe('C1045: AscensionTrialsModal Component Tests', () => {
  beforeEach(() => {
    const mockHero = HeroEntity.create({ seed: 42, heroHpMax: 50000, heroAtkBase: 5000 });
    useCycleStoreV2.setState({
      controller: {
        getHero: () => mockHero,
      } as any,
    });

    useGameStore.setState({
      screen: 'main-menu',
      run: { ...INITIAL_RUN, goldThisRun: 1000 },
      meta: {
        ...INITIAL_META,
        enhanceStones: 10,
        ascensionTrialClearedFloor: 0,
        equippedItemIds: [],
        inventory: { weapons: [], armors: [], accessories: [] },
      },
    });
  });

  it('renders modal with title, header, and 10 floor buttons', () => {
    const onClose = vi.fn();
    render(<AscensionTrialsModal onClose={onClose} />);

    expect(screen.getByTestId('ascension-trials-modal')).toBeDefined();
    expect(screen.getByText(/승천의 시련/)).toBeDefined();
    expect(screen.getByText(/진행도: 0\/10층/)).toBeDefined();

    for (let f = 1; f <= 10; f++) {
      expect(screen.getByTestId(`floor-btn-${f}`)).toBeDefined();
    }

    fireEvent.click(screen.getByTestId('close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('floor 1 is unlocked and floor 2 is locked initially', () => {
    render(<AscensionTrialsModal onClose={() => {}} />);

    const floor1Btn = screen.getByTestId('floor-btn-1');
    const floor2Btn = screen.getByTestId('floor-btn-2');

    expect(floor1Btn).not.toBeDisabled();
    expect(floor2Btn).toBeDisabled();
  });

  it('executing challenge on floor 1 awards rewards and updates cleared floor on victory', () => {
    render(<AscensionTrialsModal onClose={() => {}} />);

    const challengeBtn = screen.getByTestId('challenge-btn');
    expect(challengeBtn).not.toBeDisabled();

    fireEvent.click(challengeBtn);

    // Combat result should be displayed
    const resultBox = screen.getByTestId('trial-combat-result');
    expect(resultBox).toBeDefined();
    expect(resultBox.textContent).toContain('토벌 성공');

    // Rewards awarded to store
    const state = useGameStore.getState();
    expect((state.meta as any).ascensionTrialClearedFloor).toBe(1);
    expect(state.meta.enhanceStones).toBeGreaterThan(10);
    expect(state.run.goldThisRun).toBeGreaterThan(1000);
  });

  it('displays highest unlocked ascension title badge when cleared floor reaches milestone', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        ascensionTrialClearedFloor: 3,
      } as any,
    }));

    render(<AscensionTrialsModal onClose={() => {}} />);
    const badge = screen.getByTestId('ascension-title-badge');
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain('시련의 도전자');
  });

  it('opens ChaosRiftModal when clicking open-chaos-rift-btn', () => {
    render(<AscensionTrialsModal onClose={() => {}} />);

    const openRiftBtn = screen.getByTestId('open-chaos-rift-btn');
    expect(openRiftBtn).toBeDefined();
    fireEvent.click(openRiftBtn);

    expect(screen.getByTestId('chaos-rift-modal')).toBeDefined();
  });

  it('renders RiftLeaderboardBadge when highestRiftDepth is greater than 0', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        highestRiftDepth: 15,
      },
    }));

    render(<AscensionTrialsModal onClose={() => {}} />);
    const riftBadge = screen.getByTestId('rift-leaderboard-badge');
    expect(riftBadge).toBeDefined();
    expect(riftBadge.textContent).toContain('[심도 15층]');
    expect(riftBadge.textContent).toContain('균열의 탐색자');
  });
});



