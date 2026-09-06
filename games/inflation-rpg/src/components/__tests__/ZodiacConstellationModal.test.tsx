/**
 * ZodiacConstellationModal.test.tsx — C1058: ZodiacConstellationModal Component Tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ZodiacConstellationModal } from '../ZodiacConstellationModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';
import { ALL_ZODIAC_SIGNS } from '../../systems/zodiacSystem';

describe('C1058: ZodiacConstellationModal Component Tests', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: { ...INITIAL_RUN },
      meta: {
        ...INITIAL_META,
        crackStones: 20,
        zodiacUnlocked: [],
      },
    });
  });

  it('renders modal with title, 12 zodiac nodes, and close button', () => {
    const onClose = vi.fn();
    render(<ZodiacConstellationModal onClose={onClose} />);

    expect(screen.getByTestId('zodiac-modal')).toBeDefined();
    expect(screen.getByText(/십이지신 천상 성좌도/)).toBeDefined();
    expect(screen.getByText(/각성 진행도: 0\/12/)).toBeDefined();
    expect(screen.getByText(/균열석 20개/)).toBeDefined();

    for (const sign of ALL_ZODIAC_SIGNS) {
      expect(screen.getByTestId(`zodiac-node-${sign}`)).toBeDefined();
    }

    fireEvent.click(screen.getByTestId('close-zodiac-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays selected zodiac details and stat preview', () => {
    render(<ZodiacConstellationModal onClose={() => {}} />);

    // Default selected is rat
    const detail = screen.getByTestId('selected-zodiac-detail');
    expect(detail.textContent).toContain('자의 성좌');
    expect(detail.textContent).toContain('한자: 子');
    expect(detail.textContent).toContain('치명타율 +4%');
  });

  it('unlocks constellation when player has sufficient crackStones', () => {
    render(<ZodiacConstellationModal onClose={() => {}} />);

    const unlockBtn = screen.getByTestId('unlock-zodiac-btn');
    expect(unlockBtn).not.toBeDisabled();
    expect(unlockBtn.textContent).toContain('성좌 각성 (🔮 5개)');

    fireEvent.click(unlockBtn);

    // State updated
    const state = useGameStore.getState();
    expect(state.meta.crackStones).toBe(15); // 20 - 5
    expect(state.meta.zodiacUnlocked).toContain('rat');

    // Feedback banner shown
    expect(screen.getByTestId('zodiac-feedback-banner').textContent).toContain('자의 성좌');

    // Total resonance updated
    const total = screen.getByTestId('zodiac-total-resonance');
    expect(total.textContent).toContain('치명타 확률: +4%');
  });

  it('disables unlock button when insufficient crackStones', () => {
    useGameStore.setState(s => ({
      meta: { ...s.meta, crackStones: 2 },
    }));

    render(<ZodiacConstellationModal onClose={() => {}} />);

    const unlockBtn = screen.getByTestId('unlock-zodiac-btn');
    expect(unlockBtn).toBeDisabled();
  });

  it('shows aggregate resonance stats when multiple constellations are unlocked', () => {
    useGameStore.setState(s => ({
      meta: { ...s.meta, zodiacUnlocked: ['tiger', 'ox', 'dog'] },
    }));

    render(<ZodiacConstellationModal onClose={() => {}} />);

    const total = screen.getByTestId('zodiac-total-resonance');
    expect(total.textContent).toContain('총 공격력: +6%');
    expect(total.textContent).toContain('총 방어력: +6%');
    expect(total.textContent).toContain('받는 피해 감소: +3%');
  });

  it('renders zodiac-pet-synergy-banner when active companion matches unlocked zodiac constellation', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        activePetId: 'white_tiger',
        zodiacUnlocked: ['tiger'],
      },
    }));

    render(<ZodiacConstellationModal onClose={() => {}} />);

    const banner = screen.getByTestId('zodiac-pet-synergy-banner');
    expect(banner).toBeDefined();
    expect(banner.textContent).toContain('영수-성좌 융합 공명 발동');
    expect(banner.textContent).toContain('호랑이의 영험한 포효');
  });
});

