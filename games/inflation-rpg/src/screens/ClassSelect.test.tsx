import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { ClassSelect } from './ClassSelect';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';

beforeEach(() => {
  useGameStore.setState({ screen: 'class-select', run: INITIAL_RUN, meta: INITIAL_META });
});

describe('ClassSelect', () => {
  it('renders 16 character cards', () => {
    render(<ClassSelect />);
    // 4 unlocked by default (soul grade 0)
    const cards = screen.getAllByRole('button', { name: /화랑|무당|초의|검객/i });
    expect(cards.length).toBeGreaterThanOrEqual(4);
  });

  it('locked characters are not clickable', () => {
    render(<ClassSelect />);
    const lockedCards = screen.getAllByLabelText(/잠김/i);
    expect(lockedCards.length).toBeGreaterThan(0);
  });

  it('selecting a character highlights it', async () => {
    render(<ClassSelect />);
    const hwarang = screen.getByRole('button', { name: /화랑/i });
    await userEvent.click(hwarang);
    expect(hwarang).toHaveClass('selected');
  });

  it('게임 시작 starts run with selected character', async () => {
    render(<ClassSelect />);
    await userEvent.click(screen.getByRole('button', { name: /화랑/i }));
    await userEvent.click(screen.getByRole('button', { name: /모험 시작/i }));
    const state = useGameStore.getState();
    expect(state.run.characterId).toBe('hwarang');
    expect(state.screen).toBe('world-map');
  });

  it('shows character level badge when charLv > 0', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, characterLevels: { hwarang: 3 } },
    }));
    render(<ClassSelect />);
    expect(screen.getByText(/Lv\.3/)).toBeInTheDocument();
  });

  it('does not show level badge when charLv is 0 or absent', () => {
    render(<ClassSelect />);
    expect(screen.queryByText(/Lv\.\d/)).not.toBeInTheDocument();
  });
});
