import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { WorldMap } from './WorldMap';
import { useGameStore, INITIAL_META } from '../store/gameStore';

const runWithChar = {
  characterId: 'hwarang', level: 1, exp: 0, bp: 28, statPoints: 0,
  allocated: { hp: 0, atk: 0, def: 0, agi: 0, luc: 0 },
  currentAreaId: 'village-entrance', isHardMode: false,
  monstersDefeated: 0, goldThisRun: 0,
};

beforeEach(() => {
  useGameStore.setState({ screen: 'world-map', run: runWithChar, meta: INITIAL_META });
});

describe('WorldMap', () => {
  it('shows current BP', () => {
    render(<WorldMap />);
    expect(screen.getByText(/BP.*28/i)).toBeInTheDocument();
  });

  it('shows current level', () => {
    render(<WorldMap />);
    expect(screen.getByText(/Lv.*1/i)).toBeInTheDocument();
  });

  it('available areas are clickable', () => {
    render(<WorldMap />);
    expect(screen.getByRole('button', { name: /마을 입구/i })).toBeInTheDocument();
  });

  it('entering area triggers battle screen after BP deduct', async () => {
    render(<WorldMap />);
    await userEvent.click(screen.getByRole('button', { name: /마을 입구/i }));
    const state = useGameStore.getState();
    expect(state.screen).toBe('battle');
    expect(state.run.bp).toBe(27); // 28 - 1
  });
});
