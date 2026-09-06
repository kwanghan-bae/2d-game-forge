/**
 * PrimordialAscensionModal.test.tsx — C1129: Component tests for PrimordialAscensionModal.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrimordialAscensionModal } from '../PrimordialAscensionModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';

describe('C1129: PrimordialAscensionModal Component Tests', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: { ...INITIAL_RUN },
      meta: {
        ...INITIAL_META,
        dimensionalEssence: 5,
        starlightShards: 2000,
        corridorSectorsCleared: [1, 2, 3, 4], // Missing sector 5
        primordialRanks: {},
      },
    });
  });

  it('renders modal with header, cumulative summary banner, and 4 constellation cards', () => {
    const onClose = vi.fn();
    render(<PrimordialAscensionModal onClose={onClose} />);

    expect(screen.getByTestId('primordial-ascension-modal')).toBeDefined();
    expect(screen.getByText(/원초적 태초 승천/)).toBeDefined();
    expect(screen.getByTestId('primordial-summary-banner')).toBeDefined();

    expect(screen.getByTestId('primordial-node-card-primordial_genesis')).toBeDefined();
    expect(screen.getByTestId('primordial-node-card-primordial_annihilation')).toBeDefined();
    expect(screen.getByTestId('primordial-node-card-primordial_eternity')).toBeDefined();
    expect(screen.getByTestId('primordial-node-card-primordial_singularity')).toBeDefined();

    fireEvent.click(screen.getByTestId('close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows upgrading primordial_genesis and updates state and feedback', () => {
    render(<PrimordialAscensionModal onClose={() => {}} />);

    const upgradeGenesisBtn = screen.getByTestId('upgrade-btn-primordial_genesis');
    expect(upgradeGenesisBtn).not.toBeDisabled();

    fireEvent.click(upgradeGenesisBtn);

    const feedback = screen.getByTestId('feedback-message');
    expect(feedback.textContent).toContain('태초의 창생');
    expect(feedback.textContent).toContain('랭크 1');

    const state = useGameStore.getState();
    expect(state.meta.primordialRanks?.primordial_genesis).toBe(1);
    expect(state.meta.dimensionalEssence).toBe(4); // 5 - 1
    expect(state.meta.starlightShards).toBe(1750); // 2000 - 250
  });

  it('locks primordial_singularity until sector 5 is cleared', () => {
    render(<PrimordialAscensionModal onClose={() => {}} />);

    const upgradeSingularityBtn = screen.getByTestId('upgrade-btn-primordial_singularity');
    expect(upgradeSingularityBtn).toBeDisabled();
    expect(screen.getByText(/제5섹터\(종언의 특이점\) 완파가 필요합니다/)).toBeDefined();
  });

  it('unlocks primordial_singularity when sector 5 is cleared', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        corridorSectorsCleared: [1, 2, 3, 4, 5],
      },
    }));

    render(<PrimordialAscensionModal onClose={() => {}} />);

    const upgradeSingularityBtn = screen.getByTestId('upgrade-btn-primordial_singularity');
    expect(upgradeSingularityBtn).not.toBeDisabled();
  });

  it('closes when clicking backdrop', () => {
    const onClose = vi.fn();
    render(<PrimordialAscensionModal onClose={onClose} />);

    const backdrop = screen.getByTestId('primordial-ascension-modal-backdrop');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
