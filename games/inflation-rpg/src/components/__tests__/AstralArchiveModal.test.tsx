/**
 * AstralArchiveModal.test.tsx — C1136: Component tests for AstralArchiveModal.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AstralArchiveModal } from '../AstralArchiveModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';

describe('C1136: AstralArchiveModal Component Tests', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: { ...INITIAL_RUN },
      meta: {
        ...INITIAL_META,
        starlightShards: 500,
        ascensionTrialClearedFloor: 5,
        highestRiftDepth: 12,
        claimedArchiveMilestones: [],
      },
    });
  });

  it('renders modal with header, perks banner, and category filter tabs', () => {
    const onClose = vi.fn();
    render(<AstralArchiveModal onClose={onClose} />);

    expect(screen.getByTestId('astral-archive-modal')).toBeDefined();
    expect(screen.getByText(/성간 아카이브/)).toBeDefined();
    expect(screen.getByTestId('archive-perks-banner')).toBeDefined();
    expect(screen.getByTestId('archivist-greeting')).toBeDefined();

    expect(screen.getByTestId('category-tab-all')).toBeDefined();
    expect(screen.getByTestId('category-tab-trials')).toBeDefined();
    expect(screen.getByTestId('category-tab-chaos_rift')).toBeDefined();

    fireEvent.click(screen.getByTestId('close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('filters milestones by selected category', () => {
    render(<AstralArchiveModal onClose={() => {}} />);

    // Click '시련' tab
    fireEvent.click(screen.getByTestId('category-tab-trials'));

    expect(screen.getByTestId('milestone-card-trials_floor_5')).toBeDefined();
    expect(screen.getByTestId('milestone-card-trials_floor_10')).toBeDefined();
    expect(screen.queryByTestId('milestone-card-rift_depth_10')).toBeNull();
  });

  it('allows claiming reward for unlocked milestone, updating shards and claimed state', () => {
    render(<AstralArchiveModal onClose={() => {}} />);

    const claimBtn = screen.getByTestId('claim-btn-trials_floor_5');
    expect(claimBtn).toBeDefined();

    fireEvent.click(claimBtn);

    const feedback = screen.getByTestId('archive-claim-feedback');
    expect(feedback.textContent).toContain('시련의 도전자');
    expect(feedback.textContent).toContain('수령 완료');

    const state = useGameStore.getState();
    expect(state.meta.starlightShards).toBe(600); // 500 + 100
    expect(state.meta.claimedArchiveMilestones).toContain('trials_floor_5');
  });

  it('closes when clicking backdrop', () => {
    const onClose = vi.fn();
    render(<AstralArchiveModal onClose={onClose} />);

    const backdrop = screen.getByTestId('astral-archive-modal-backdrop');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
