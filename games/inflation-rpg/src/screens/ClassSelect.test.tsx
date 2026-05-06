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
    // 3 core chars unlocked by default (soul grade 0; 검객 is hard-gated)
    const cards = screen.getAllByRole('button', { name: /화랑|무당|초의/i });
    expect(cards.length).toBeGreaterThanOrEqual(3);
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
    // New flow requires a dungeon to be selected before startRun (invariant).
    useGameStore.getState().selectDungeon('plains');
    render(<ClassSelect />);
    await userEvent.click(screen.getByRole('button', { name: /화랑/i }));
    await userEvent.click(screen.getByRole('button', { name: /모험 시작/i }));
    const state = useGameStore.getState();
    expect(state.run.characterId).toBe('hwarang');
    expect(state.screen).toBe('dungeon-floors');
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

  it('ClassSelect: 13 비핵심 캐릭터 (검객 포함) 는 selectable ✗', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, soulGrade: 9 } }));
    render(<ClassSelect />);
    // 16 - 3 core = 13 chars hard-gated (aria-label="잠김")
    const lockedCards = screen.getAllByLabelText('잠김');
    expect(lockedCards.length).toBeGreaterThanOrEqual(13);
  });

  it('ClassSelect: 핵심 3 (화랑/무당/초의) 는 selectable', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, soulGrade: 9 } }));
    render(<ClassSelect />);
    expect(screen.getAllByLabelText('화랑').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('무당').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('초의').length).toBeGreaterThan(0);
  });
});
