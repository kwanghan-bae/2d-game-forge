/**
 * ChronoRebirthModal.test.tsx — C1142: Component tests for ChronoRebirthModal.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChronoRebirthModal } from '../ChronoRebirthModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';

describe('C1142: ChronoRebirthModal Component Tests', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: { ...INITIAL_RUN, level: 1, goldThisRun: 0 },
      meta: {
        ...INITIAL_META,
        totalRebirths: 0,
        chronoEssence: 0,
        ascensionTrialClearedFloor: 0,
        highestRiftDepth: 0,
      },
    });
  });

  it('renders ineligible alert when player has less than 4 mastery rank', () => {
    render(<ChronoRebirthModal onClose={() => {}} />);

    expect(screen.getByTestId('chrono-rebirth-modal')).toBeDefined();
    expect(screen.getByTestId('ineligible-alert')).toBeDefined();
    expect(screen.getByText(/마스터리 4랭크 이상 필요/)).toBeDefined();
  });

  it('renders qualified tier card and perks for an eligible account', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        ascensionTrialClearedFloor: 5,
        highestRiftDepth: 10,
        apexTrialsCleared: [1],
        corridorSectorsCleared: [1], // 4 milestones -> apprentice_warp
      },
    }));

    render(<ChronoRebirthModal onClose={() => {}} />);

    const card = screen.getByTestId('qualified-tier-card');
    expect(card).toBeDefined();
    expect(card.textContent).toContain('견습의 시공 도약');
    expect(card.textContent).toContain('Lv. 50');
  });

  it('executes rebirth when confirmation checkbox is checked, updating run and meta states', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        ascensionTrialClearedFloor: 5,
        highestRiftDepth: 25,
        apexTrialsCleared: [1, 2],
        corridorSectorsCleared: [1, 3],
        primordialRanks: { primordial_genesis: 3, primordial_annihilation: 3 }, // 8 milestones -> astral_warp
      },
    }));

    render(<ChronoRebirthModal onClose={() => {}} />);

    const checkbox = screen.getByTestId('rebirth-confirm-checkbox');
    const executeBtn = screen.getByTestId('execute-rebirth-btn');
    expect(executeBtn).toBeDisabled();

    // Check confirmation
    fireEvent.click(checkbox);
    expect(executeBtn).not.toBeDisabled();

    // Execute rebirth
    fireEvent.click(executeBtn);

    const successCard = screen.getByTestId('rebirth-success-card');
    expect(successCard).toBeDefined();
    expect(successCard.textContent).toContain('환생 대성공');
    expect(successCard.textContent).toContain('성간의 시공 도약');

    const epilogue = screen.getByTestId('rebirth-epilogue');
    expect(epilogue).toBeDefined();
    expect(epilogue.textContent).toContain('수많은 별빛의 가호');

    const state = useGameStore.getState();
    expect(state.run.level).toBe(100);
    expect(state.run.goldThisRun).toBe(15_000_000);
    expect((state.meta as any).totalRebirths).toBe(1);
    expect((state.meta as any).chronoEssence).toBe(2);
  });

  it('closes when clicking backdrop or close button', () => {
    const onClose = vi.fn();
    render(<ChronoRebirthModal onClose={onClose} />);

    fireEvent.click(screen.getByTestId('close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);

    const backdrop = screen.getByTestId('chrono-rebirth-modal-backdrop');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
