/**
 * RelicTransmutationModal.test.tsx — C1100: RelicTransmutationModal Component Tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RelicTransmutationModal } from '../RelicTransmutationModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';

describe('C1100 [ui]: RelicTransmutationModal Component Tests', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: {
        ...INITIAL_RUN,
        goldThisRun: 1000000,
      },
      meta: {
        ...INITIAL_META,
        starlightShards: 300,
        crackStones: 50,
        transmutedRelics: [],
      },
    });
  });

  it('renders modal with title, currencies, 4 relic cards, and close button', () => {
    const onClose = vi.fn();
    render(<RelicTransmutationModal onClose={onClose} />);

    expect(screen.getByTestId('relic-transmutation-modal')).toBeDefined();
    expect(screen.getByText(/성유물 초월 진화/)).toBeDefined();
    expect(screen.getByText(/1,000,000G/)).toBeDefined();
    expect(screen.getByText(/300개/)).toBeDefined();
    expect(screen.getByText(/50개/)).toBeDefined();

    expect(screen.getByTestId('transmute-card-polaris_eye')).toBeDefined();
    expect(screen.getByTestId('transmute-card-sirius_fang')).toBeDefined();
    expect(screen.getByTestId('transmute-card-vega_veil')).toBeDefined();
    expect(screen.getByTestId('transmute-card-antares_heart')).toBeDefined();

    fireEvent.click(screen.getByTestId('close-transmute-modal-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('executes transmutation on polaris_eye, updates store resources and transmuted list', () => {
    render(<RelicTransmutationModal onClose={() => {}} />);

    const transmuteBtn = screen.getByTestId('transmute-btn-polaris_eye');
    expect(transmuteBtn).not.toBeDisabled();

    fireEvent.click(transmuteBtn);

    // Feedback banner appears
    const banner = screen.getByTestId('transmute-feedback-banner');
    expect(banner.textContent).toContain('태초의 북극성안');

    // Store state updated
    const state = useGameStore.getState();
    expect(state.meta.transmutedRelics).toContain('polaris_celestial_eye');
    expect(state.meta.starlightShards).toBe(180); // 300 - 120
    expect(state.meta.crackStones).toBe(30);      // 50 - 20
    expect(state.run.goldThisRun).toBe(700000);   // 1M - 300k
  });

  it('displays active transcendence status when relic is already transmuted', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        transmutedRelics: ['antares_celestial_heart'],
      },
    }));

    render(<RelicTransmutationModal onClose={() => {}} />);

    const card = screen.getByTestId('transmute-card-antares_heart');
    expect(card.textContent).toContain('초월 완료');
    expect(card.textContent).toContain('완전초월 활성화됨');
  });
});
