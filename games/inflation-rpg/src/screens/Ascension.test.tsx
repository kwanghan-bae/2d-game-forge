import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Ascension } from './Ascension';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';

describe('Ascension screen', () => {
  beforeEach(() => {
    useGameStore.setState({ screen: 'ascension', run: INITIAL_RUN, meta: INITIAL_META });
  });

  it('shows current Tier 0 with ×1.00 multiplier on a fresh profile', () => {
    render(<Ascension />);
    expect(screen.getByTestId('ascension-status').textContent).toContain('Tier 0');
    expect(screen.getByTestId('ascension-status').textContent).toContain('×1.00');
  });

  it('shows finals-blocked message when fewer than nextTier+2 cleared', () => {
    render(<Ascension />);
    const blocked = screen.getByTestId('ascension-blocked');
    expect(blocked.textContent).toContain('정복한 던전이 부족');
    expect(screen.queryByTestId('ascension-ascend')).toBeNull();
  });

  it('shows stones-blocked message when finals met but stones short', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, dungeonFinalsCleared: ['plains', 'forest', 'mountains'], crackStones: 0 },
    }));
    render(<Ascension />);
    const blocked = screen.getByTestId('ascension-blocked');
    expect(blocked.textContent).toContain('균열석이 부족');
  });

  it('shows ascend button when conditions met (3 finals + 1 stone)', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, dungeonFinalsCleared: ['plains', 'forest', 'mountains'], crackStones: 1 },
    }));
    render(<Ascension />);
    const btn = screen.getByTestId('ascension-ascend');
    expect(btn).toBeInTheDocument();
    expect(btn.textContent).toContain('Tier 1');
  });

  it('confirm dialog triggers ascend and navigates to main-menu', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, dungeonFinalsCleared: ['plains', 'forest', 'mountains'], crackStones: 1 },
    }));
    render(<Ascension />);
    fireEvent.click(screen.getByTestId('ascension-ascend'));
    fireEvent.click(screen.getByTestId('ascension-confirm'));
    expect(useGameStore.getState().screen).toBe('main-menu');
    expect(useGameStore.getState().meta.ascTier).toBe(1);
  });

  it('cancel hides confirm dialog without ascending', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, dungeonFinalsCleared: ['plains', 'forest', 'mountains'], crackStones: 1 },
    }));
    render(<Ascension />);
    fireEvent.click(screen.getByTestId('ascension-ascend'));
    expect(screen.getByTestId('ascension-confirm')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ascension-cancel'));
    expect(screen.queryByTestId('ascension-confirm')).toBeNull();
    expect(useGameStore.getState().meta.ascTier).toBe(0);
  });

  it('back button navigates to town', () => {
    render(<Ascension />);
    fireEvent.click(screen.getByRole('button', { name: /마을로/ }));
    expect(useGameStore.getState().screen).toBe('town');
  });
});
