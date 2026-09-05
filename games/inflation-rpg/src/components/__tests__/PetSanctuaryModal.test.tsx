/**
 * PetSanctuaryModal.test.tsx — C1052: PetSanctuaryModal Component Tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PetSanctuaryModal } from '../PetSanctuaryModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';
import { createInitialPets } from '../../systems/petSystem';

describe('C1052: PetSanctuaryModal Component Tests', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: { ...INITIAL_RUN, goldThisRun: 10000 },
      meta: {
        ...INITIAL_META,
        enhanceStones: 20,
        pets: createInitialPets(),
        activePetId: 'white_tiger',
      },
    });
  });

  it('renders modal with title, pet list cards, and close button', () => {
    const onClose = vi.fn();
    render(<PetSanctuaryModal onClose={onClose} />);

    expect(screen.getByTestId('pet-sanctuary-modal')).toBeDefined();
    expect(screen.getByText(/영수 성소/)).toBeDefined();

    expect(screen.getByTestId('pet-card-white_tiger')).toBeDefined();
    expect(screen.getByTestId('pet-card-azure_dragon')).toBeDefined();
    expect(screen.getByTestId('pet-card-vermilion_bird')).toBeDefined();
    expect(screen.getByTestId('pet-card-black_tortoise')).toBeDefined();

    // Default active companion badge on White Tiger
    expect(screen.getByTestId('active-companion-badge')).toBeDefined();

    fireEvent.click(screen.getByTestId('close-pets-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays selected pet detail with aura stats and description', () => {
    render(<PetSanctuaryModal onClose={() => {}} />);

    const detail = screen.getByTestId('selected-pet-detail');
    expect(detail).toBeDefined();
    expect(detail.textContent).toContain('백호');
    expect(detail.textContent).toContain('물리 & 치명타 강화');
    expect(detail.textContent).toContain('공격력');
  });

  it('shows locked message for sealed beasts and prevents feeding', () => {
    render(<PetSanctuaryModal onClose={() => {}} />);

    // Click locked pet card (black tortoise)
    fireEvent.click(screen.getByTestId('pet-card-black_tortoise'));

    expect(screen.getByTestId('locked-pet-message')).toBeDefined();
    expect(screen.getByTestId('locked-pet-message').textContent).toContain('승천의 시련 5층');
    expect(screen.queryByTestId('feed-snack-btn')).toBeNull();
  });

  it('switches active companion when selecting another unlocked pet', () => {
    // Unlock vermilion bird in store
    const pets = createInitialPets();
    pets.vermilion_bird.unlocked = true;
    useGameStore.setState(s => ({
      meta: { ...s.meta, pets },
    }));

    render(<PetSanctuaryModal onClose={() => {}} />);

    // Select vermilion bird
    fireEvent.click(screen.getByTestId('pet-card-vermilion_bird'));

    const setBtn = screen.getByTestId('set-active-companion-btn');
    expect(setBtn).not.toBeDisabled();
    expect(setBtn.textContent).toContain('동행 영수 지정');

    fireEvent.click(setBtn);

    const state = useGameStore.getState();
    expect(state.meta.activePetId).toBe('vermilion_bird');
    expect(screen.getByTestId('pet-feedback-banner').textContent).toContain('주작');
  });

  it('feeds active pet with snack, deducting gold and adding bond EXP', () => {
    render(<PetSanctuaryModal onClose={() => {}} />);

    const goldBefore = useGameStore.getState().run.goldThisRun;
    const feedBtn = screen.getByTestId('feed-snack-btn');
    expect(feedBtn).not.toBeDisabled();

    fireEvent.click(feedBtn);

    const state = useGameStore.getState();
    expect(state.run.goldThisRun).toBe(goldBefore - 500);
    expect(state.meta.pets?.white_tiger.bondExp).toBe(25);
    expect(screen.getByTestId('pet-feedback-banner').textContent).toContain('친밀도 EXP +25');
  });

  it('feeds active pet with essence, deducting gold and enhance stones and leveling up', () => {
    render(<PetSanctuaryModal onClose={() => {}} />);

    const goldBefore = useGameStore.getState().run.goldThisRun;
    const stonesBefore = useGameStore.getState().meta.enhanceStones;
    const essenceBtn = screen.getByTestId('feed-essence-btn');

    // 100 EXP will level up Lv 1 (needs 50 EXP) to Lv 2 (with 50 exp left over, Lv 2 needs 100)
    fireEvent.click(essenceBtn);

    const state = useGameStore.getState();
    expect(state.run.goldThisRun).toBe(goldBefore - 2500);
    expect(state.meta.enhanceStones).toBe(stonesBefore - 2);
    expect(state.meta.pets?.white_tiger.level).toBe(2);
    expect(state.meta.pets?.white_tiger.bondExp).toBe(50);
    expect(screen.getByTestId('pet-feedback-banner').textContent).toContain('친밀도가 상승하여 Lv.2');
  });
});
