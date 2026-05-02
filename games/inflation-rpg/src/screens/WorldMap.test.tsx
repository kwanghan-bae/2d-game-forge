import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { WorldMap } from './WorldMap';
import { useGameStore, INITIAL_META } from '../store/gameStore';

const baseRun = {
  characterId: 'hwarang', level: 1, exp: 0, bp: 28, statPoints: 0,
  allocated: { hp: 0, atk: 0, def: 0, agi: 0, luc: 0 },
  currentAreaId: 'village-entrance', currentDungeonId: null, currentFloor: 1, isHardMode: false,
  monstersDefeated: 0, goldThisRun: 0,
  currentStage: 1, dungeonRunMonstersDefeated: 0,
};

beforeEach(() => {
  useGameStore.setState({ screen: 'world-map', run: baseRun, meta: INITIAL_META });
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

  it('조선 평야 region is visible and unlocked at level 1', () => {
    render(<WorldMap />);
    expect(screen.getByRole('button', { name: /조선 평야/i })).not.toBeDisabled();
  });

  it('깊은 숲 region is locked at level 1 (minLevel 500)', () => {
    render(<WorldMap />);
    expect(screen.getByRole('button', { name: /깊은 숲/i })).toBeDisabled();
  });

  it('마왕의 성 region is hidden in normal mode', () => {
    render(<WorldMap />);
    expect(screen.queryByRole('button', { name: /마왕의 성/i })).not.toBeInTheDocument();
  });

  it('마왕의 성 region is visible in hard mode', () => {
    useGameStore.setState({ run: { ...baseRun, isHardMode: true } });
    render(<WorldMap />);
    expect(screen.getByRole('button', { name: /마왕의 성/i })).toBeInTheDocument();
  });

  it('마왕의 성 is visible but locked in hard mode at level 1', () => {
    useGameStore.setState({ run: { ...baseRun, isHardMode: true } });
    render(<WorldMap />);
    expect(screen.getByRole('button', { name: /마왕의 성/i })).toBeDisabled();
  });

  it('깊은 숲 unlocks at exactly level 500', () => {
    useGameStore.setState({ run: { ...baseRun, level: 500 } });
    render(<WorldMap />);
    expect(screen.getByRole('button', { name: /깊은 숲/i })).not.toBeDisabled();
  });

  it('clicking 조선 평야 shows RegionMap with 마을 입구', async () => {
    render(<WorldMap />);
    await userEvent.click(screen.getByRole('button', { name: /조선 평야/i }));
    expect(screen.getByRole('button', { name: /마을 입구/i })).toBeInTheDocument();
  });

  it('← button in RegionMap returns to WorldMap region list', async () => {
    render(<WorldMap />);
    await userEvent.click(screen.getByRole('button', { name: /조선 평야/i }));
    await userEvent.click(screen.getByRole('button', { name: /뒤로가기/i }));
    expect(screen.getByRole('button', { name: /조선 평야/i })).toBeInTheDocument();
  });

  it('entering area from RegionMap triggers dungeon screen after BP deduct', async () => {
    render(<WorldMap />);
    await userEvent.click(screen.getByRole('button', { name: /조선 평야/i }));
    await userEvent.click(screen.getByRole('button', { name: /마을 입구/i }));
    const state = useGameStore.getState();
    expect(state.screen).toBe('dungeon');
    expect(state.run.bp).toBe(27);
  });
});
