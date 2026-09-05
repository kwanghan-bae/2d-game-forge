import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PerkShopScreen } from '../PerkShopScreen';
import { useGameStore } from '../../store/gameStore';

describe('PerkShopScreen — C1022', () => {
  beforeEach(() => {
    useGameStore.setState({
      run: {
        ...useGameStore.getState().run,
        characterId: 'hwarang',
      },
      meta: {
        ...useGameStore.getState().meta,
        jp: { hwarang: 50 },
        jpPerksOwned: { hwarang: [] },
      },
    });
  });

  it('renders title, back button, JP balance, and both tiers', () => {
    const onBack = vi.fn();
    render(<PerkShopScreen onBack={onBack} />);

    expect(screen.getByTestId('perk-shop')).toBeInTheDocument();
    expect(screen.getByTestId('btn-perk-back')).toBeInTheDocument();
    expect(screen.getByTestId('perk-jp-balance').textContent).toBe('50');

    expect(screen.getByTestId('section-tier-1')).toBeInTheDocument();
    expect(screen.getByTestId('section-tier-2')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('btn-perk-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('displays lock and requirement message for Tier 2 perks without prerequisites', () => {
    render(<PerkShopScreen onBack={() => {}} />);

    // crit_mastery requires crit_cascade
    const reqBox = screen.getByTestId('perk-req-crit_mastery');
    expect(reqBox).toBeInTheDocument();
    expect(reqBox.textContent).toContain('연쇄 치명타');

    // buy button should not be available
    expect(screen.queryByTestId('btn-buy-crit_mastery')).not.toBeInTheDocument();
  });

  it('unlocks Tier 2 perk when prerequisite is owned and supports 2-step purchase', () => {
    useGameStore.setState({
      meta: {
        ...useGameStore.getState().meta,
        jp: { hwarang: 50 },
        jpPerksOwned: { hwarang: ['crit_cascade'] },
      },
    });

    render(<PerkShopScreen onBack={() => {}} />);

    // Now crit_mastery can be purchased
    expect(screen.queryByTestId('perk-req-crit_mastery')).not.toBeInTheDocument();
    const buyBtn = screen.getByTestId('btn-buy-crit_mastery');
    expect(buyBtn).toBeInTheDocument();

    // Step 1: click buy
    fireEvent.click(buyBtn);
    const confirmBtn = screen.getByTestId('btn-confirm-crit_mastery');
    expect(confirmBtn).toBeInTheDocument();

    // Step 2: click confirm
    fireEvent.click(confirmBtn);

    // Verify gameStore updated
    const state = useGameStore.getState();
    expect(state.meta.jpPerksOwned['hwarang']).toContain('crit_mastery');
    expect(state.meta.jp['hwarang']).toBe(50 - 16); // 16 cost

    // C1025: Verify character reaction quote is rendered
    const reactionBanner = screen.getByTestId('perk-reaction-quote');
    expect(reactionBanner).toBeInTheDocument();
    expect(reactionBanner.textContent).toBeTruthy();
  });
});
