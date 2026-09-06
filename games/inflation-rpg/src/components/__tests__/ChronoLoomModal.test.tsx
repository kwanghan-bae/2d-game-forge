/**
 * ChronoLoomModal.test.tsx — C1148: Component tests for ChronoLoomModal.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChronoLoomModal } from '../ChronoLoomModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';

describe('C1148: ChronoLoomModal Component Tests', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: INITIAL_RUN,
      meta: {
        ...INITIAL_META,
        chronoEssence: 0,
        chronoLoomRanks: {},
      },
    });
  });

  it('renders modal with essence counter, perks banner, and 4 node containers', () => {
    render(<ChronoLoomModal onClose={() => {}} />);

    expect(screen.getByTestId('chrono-loom-modal')).toBeDefined();
    expect(screen.getByTestId('chrono-essence-count').textContent).toContain('시공 정수: 0개');
    expect(screen.getByTestId('loom-perks-banner')).toBeDefined();

    expect(screen.getByTestId('loom-node-warp_accelerant')).toBeDefined();
    expect(screen.getByTestId('loom-node-singularity_aegis')).toBeDefined();
    expect(screen.getByTestId('loom-node-chrono_duplication')).toBeDefined();
    expect(screen.getByTestId('loom-node-temporal_sovereign')).toBeDefined();
  });

  it('disables upgrade buttons when Chrono Essence is 0', () => {
    render(<ChronoLoomModal onClose={() => {}} />);

    const warpBtn = screen.getByTestId('upgrade-node-warp_accelerant-btn');
    expect(warpBtn).toBeDisabled();
    expect(warpBtn.textContent).toContain('정수 부족');
  });

  it('upgrades a node when essence is sufficient, updating essence and perks banner', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        chronoEssence: 5,
        chronoLoomRanks: {},
      },
    }));

    render(<ChronoLoomModal onClose={() => {}} />);

    const warpBtn = screen.getByTestId('upgrade-node-warp_accelerant-btn');
    expect(warpBtn).not.toBeDisabled();
    expect(warpBtn.textContent).toContain('직조 승급 (정수 1개)');

    fireEvent.click(warpBtn);

    // State updated
    const state = useGameStore.getState();
    expect((state.meta as any).chronoEssence).toBe(4);
    expect(state.meta.chronoLoomRanks?.warp_accelerant).toBe(1);

    // Perks banner reflects +5%
    const banner = screen.getByTestId('loom-perks-banner');
    expect(banner.textContent).toContain('+5%');
  });

  it('disables upgrade button and displays max rank text when at Rank 5', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        chronoEssence: 50,
        chronoLoomRanks: { singularity_aegis: 5 },
      },
    }));

    render(<ChronoLoomModal onClose={() => {}} />);

    const aegisBtn = screen.getByTestId('upgrade-node-singularity_aegis-btn');
    expect(aegisBtn).toBeDisabled();
    expect(aegisBtn.textContent).toContain('최대 계위 달성');

    const banner = screen.getByTestId('loom-perks-banner');
    expect(banner.textContent).toContain('-20%');
    expect(banner.textContent).toContain('[즉사 방어]');
  });

  it('closes when clicking close button or backdrop', () => {
    const onClose = vi.fn();
    render(<ChronoLoomModal onClose={onClose} />);

    fireEvent.click(screen.getByTestId('close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('chrono-loom-modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
