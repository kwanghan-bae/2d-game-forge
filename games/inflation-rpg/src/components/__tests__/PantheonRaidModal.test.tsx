/**
 * PantheonRaidModal.test.tsx — C1154: Component tests for PantheonRaidModal.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PantheonRaidModal } from '../PantheonRaidModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';

describe('C1154: PantheonRaidModal Component Tests', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: { ...INITIAL_RUN, goldThisRun: 0 },
      meta: {
        ...INITIAL_META,
        totalRebirths: 0,
        pantheonCrests: 0,
        pantheonClears: 0,
        corridorSectorsCleared: [],
      },
    });
  });

  it('renders ineligible alert when player has not completed a rebirth or corridor 5', () => {
    render(<PantheonRaidModal onClose={() => {}} />);

    expect(screen.getByTestId('pantheon-raid-modal')).toBeDefined();
    expect(screen.getByTestId('ineligible-alert')).toBeDefined();
    expect(screen.queryByTestId('challenge-pantheon-btn')).toBeNull();
  });

  it('renders 4 titan tabs and current titan showcase for an eligible account', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        totalRebirths: 1,
      },
    }));

    render(<PantheonRaidModal onClose={() => {}} />);

    expect(screen.queryByTestId('ineligible-alert')).toBeNull();
    expect(screen.getByTestId('challenge-pantheon-btn')).toBeDefined();
    expect(screen.getByTestId('pantheon-crests-count')).toBeDefined();

    const currentCard = screen.getByTestId('current-titan-card');
    expect(currentCard.textContent).toContain('우로보로스');
    expect(currentCard.textContent).toContain('5억 HP');
  });

  it('switches showcased titan when clicking different phase tabs', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        totalRebirths: 1,
      },
    }));

    render(<PantheonRaidModal onClose={() => {}} />);

    // Switch to Phase 4 (아이온)
    fireEvent.click(screen.getByTestId('titan-tab-4'));

    const currentCard = screen.getByTestId('current-titan-card');
    expect(currentCard.textContent).toContain('아이온');
    expect(currentCard.textContent).toContain('25억 HP');
    expect(currentCard.textContent).toContain('특이점 대군주');
  });

  it('executes raid combat and displays results card upon clicking challenge', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        totalRebirths: 1,
      },
    }));

    render(<PantheonRaidModal onClose={() => {}} />);

    const challengeBtn = screen.getByTestId('challenge-pantheon-btn');
    fireEvent.click(challengeBtn);

    const resultsCard = screen.getByTestId('raid-results-card');
    expect(resultsCard).toBeDefined();
    expect(resultsCard.textContent).toContain('돌파 페이즈:');
  });

  it('closes when clicking close button or backdrop', () => {
    const onClose = vi.fn();
    render(<PantheonRaidModal onClose={onClose} />);

    fireEvent.click(screen.getByTestId('close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('pantheon-raid-modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
