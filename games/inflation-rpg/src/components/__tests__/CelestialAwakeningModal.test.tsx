/**
 * CelestialAwakeningModal.test.tsx — C1076: CelestialAwakeningModal Component Tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CelestialAwakeningModal } from '../CelestialAwakeningModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';
import { AWAKENING_TIERS } from '../../systems/celestialAwakening';

describe('C1076: CelestialAwakeningModal Component Tests', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: { ...INITIAL_RUN },
      meta: {
        ...INITIAL_META,
        starlightShards: 200,
        crackStones: 30,
        awakeningTier: 0,
      },
    });
  });

  it('renders modal with title, 9 tier buttons, resources, and close button', () => {
    const onClose = vi.fn();
    render(<CelestialAwakeningModal onClose={onClose} />);

    expect(screen.getByTestId('awakening-modal')).toBeDefined();
    expect(screen.getByText(/9성 천상 초월 각성/)).toBeDefined();
    expect(screen.getByText(/200개/)).toBeDefined();
    expect(screen.getByText(/30개/)).toBeDefined();

    for (const t of AWAKENING_TIERS) {
      expect(screen.getByTestId(`tier-node-${t.tier}`)).toBeDefined();
    }

    fireEvent.click(screen.getByTestId('close-awakening-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays selected tier details and updates on tier click', () => {
    render(<CelestialAwakeningModal onClose={() => {}} />);

    // Default selected is Tier 1
    const card = screen.getByTestId('selected-tier-card');
    expect(card.textContent).toContain('일성경 · 개광');
    expect(card.textContent).toContain('성광의 각성자');

    // Click Tier 5
    fireEvent.click(screen.getByTestId('tier-node-5'));
    expect(card.textContent).toContain('오성경 · 단성');
    expect(card.textContent).toContain('금단의 성취자');
  });

  it('performs breakthrough to Tier 1, consumes resources, and updates store & stats', () => {
    render(<CelestialAwakeningModal onClose={() => {}} />);

    const btn = screen.getByTestId('awaken-breakthrough-btn');
    expect(btn).not.toBeDisabled();
    expect(btn.textContent).toContain('1성경 돌파 단행');

    fireEvent.click(btn);

    const state = useGameStore.getState();
    expect(state.meta.awakeningTier).toBe(1);
    expect(state.meta.starlightShards).toBe(160); // 200 - 40
    expect(state.meta.crackStones).toBe(25); // 30 - 5

    expect(screen.getByTestId('awakening-feedback-banner').textContent).toContain('성광의 각성자');

    // Cumulative stats updated
    const stats = screen.getByTestId('awakening-cumulative-stats');
    expect(stats.textContent).toContain('총 공격력: +15%');
    expect(stats.textContent).toContain('총 최대 체력: +15%');
  });

  it('disables breakthrough button when resources are insufficient', () => {
    useGameStore.setState(s => ({
      meta: { ...s.meta, starlightShards: 5 },
    }));

    render(<CelestialAwakeningModal onClose={() => {}} />);

    const btn = screen.getByTestId('awaken-breakthrough-btn');
    expect(btn).toBeDisabled();
    expect(btn.textContent).toContain('재료 부족');
  });

  it('displays max achievement when already at Tier 9', () => {
    useGameStore.setState(s => ({
      meta: { ...s.meta, awakeningTier: 9 },
    }));

    render(<CelestialAwakeningModal onClose={() => {}} />);

    const btn = screen.getByTestId('awaken-breakthrough-btn');
    expect(btn).toBeDisabled();
    expect(btn.textContent).toContain('최고 경지(천외천) 도달 완료');

    const stats = screen.getByTestId('awakening-cumulative-stats');
    expect(stats.textContent).toContain('최종 피해량: ×2배 증폭');
  });
});
