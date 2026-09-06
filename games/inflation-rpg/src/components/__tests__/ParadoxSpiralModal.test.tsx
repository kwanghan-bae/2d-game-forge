/**
 * ParadoxSpiralModal.test.tsx — C1166: Component tests for ParadoxSpiralModal.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParadoxSpiralModal } from '../ParadoxSpiralModal';
import { AscensionTrialsModal } from '../AscensionTrialsModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';

describe('C1166: ParadoxSpiralModal Component Tests', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: { ...INITIAL_RUN, goldThisRun: 0 },
      meta: {
        ...INITIAL_META,
        totalRebirths: 0,
        pantheonClears: 0,
        paradoxHighestFloor: 0,
        forgedRegalia: [],
      },
    });
  });

  it('renders ineligible alert when account has no rebirth or pantheon clears', () => {
    render(<ParadoxSpiralModal onClose={() => {}} />);

    expect(screen.getByTestId('paradox-spiral-modal')).toBeDefined();
    expect(screen.getByTestId('ineligible-alert')).toBeDefined();
    expect(screen.queryByTestId('challenge-floor-btn')).toBeNull();
  });

  it('renders floor stepper, guardian card, and challenge button for eligible accounts', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        totalRebirths: 1,
        paradoxHighestFloor: 5,
      },
    }));

    render(<ParadoxSpiralModal onClose={() => {}} />);

    expect(screen.queryByTestId('ineligible-alert')).toBeNull();
    expect(screen.getByTestId('paradox-highest-floor').textContent).toContain('최고 돌파: Floor 5');
    expect(screen.getByTestId('selected-floor-display').textContent).toContain('Floor 6');
    expect(screen.getByTestId('guardian-card')).toBeDefined();
    expect(screen.getByTestId('challenge-floor-btn')).toBeDefined();
  });

  it('steps between floors using previous and next floor buttons', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        totalRebirths: 1,
        paradoxHighestFloor: 15,
      },
    }));

    render(<ParadoxSpiralModal onClose={() => {}} />);

    const display = screen.getByTestId('selected-floor-display');
    const prevBtn = screen.getByTestId('prev-floor-btn');
    const nextBtn = screen.getByTestId('next-floor-btn');

    expect(display.textContent).toContain('Floor 16');

    fireEvent.click(prevBtn);
    expect(display.textContent).toContain('Floor 15');

    fireEvent.click(nextBtn);
    expect(display.textContent).toContain('Floor 16');
  });

  it('executes floor combat and updates highest floor upon victory', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        totalRebirths: 1,
        paradoxHighestFloor: 0,
        forgedRegalia: ['ouroboros_chrono_blade', 'ymir_primordial_heart'],
      },
    }));

    render(<ParadoxSpiralModal onClose={() => {}} />);

    const challengeBtn = screen.getByTestId('challenge-floor-btn');
    fireEvent.click(challengeBtn);

    const resultsCard = screen.getByTestId('battle-results-card');
    expect(resultsCard).toBeDefined();
    expect(resultsCard.textContent).toContain('Floor 1 돌파 성공');

    const state = useGameStore.getState();
    expect(state.meta.paradoxHighestFloor).toBe(1);
    expect(state.run.goldThisRun).toBeGreaterThanOrEqual(10_000_000);
  });

  it('closes when clicking close button or backdrop', () => {
    const onClose = vi.fn();
    render(<ParadoxSpiralModal onClose={onClose} />);

    fireEvent.click(screen.getByTestId('close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('paradox-spiral-modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('opens ParadoxSpiralModal from AscensionTrialsModal', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        totalRebirths: 1,
      },
    }));

    render(<AscensionTrialsModal onClose={() => {}} />);

    const openBtn = screen.getByTestId('open-paradox-spiral-btn');
    expect(openBtn).toBeDefined();

    expect(screen.queryByTestId('paradox-spiral-modal')).toBeNull();
    fireEvent.click(openBtn);

    expect(screen.getByTestId('paradox-spiral-modal')).toBeDefined();
  });
});
