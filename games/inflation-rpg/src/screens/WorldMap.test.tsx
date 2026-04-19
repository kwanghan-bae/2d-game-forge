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
    expect(screen.getByText(/^Lv\.1$/i)).toBeInTheDocument();
  });

  it('마을 입구 (minLevel 1) is accessible at level 1', () => {
    render(<WorldMap />);
    expect(screen.getByRole('button', { name: /마을 입구/i })).not.toBeDisabled();
  });

  it('주막 거리 (minLevel 30) is locked at level 15', () => {
    useGameStore.setState({ run: { ...runWithChar, level: 15 } });
    render(<WorldMap />);
    const btn = screen.getByRole('button', { name: /주막 거리/i });
    expect(btn).toBeDisabled();
  });

  it('주막 거리 shows Lv.30 필요 text when locked', () => {
    render(<WorldMap />); // level 1
    expect(screen.getByText(/Lv\.30 필요/i)).toBeInTheDocument();
  });

  it('주막 거리 is accessible at exactly level 30', () => {
    useGameStore.setState({ run: { ...runWithChar, level: 30 } });
    render(<WorldMap />);
    expect(screen.getByRole('button', { name: /주막 거리/i })).not.toBeDisabled();
  });

  it('entering area triggers battle screen after BP deduct', async () => {
    render(<WorldMap />);
    await userEvent.click(screen.getByRole('button', { name: /마을 입구/i }));
    const state = useGameStore.getState();
    expect(state.screen).toBe('battle');
    expect(state.run.bp).toBe(27); // 28 - 1
  });
});
