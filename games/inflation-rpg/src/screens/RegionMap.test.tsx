import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RegionMap } from './RegionMap';
import { useGameStore, INITIAL_META } from '../store/gameStore';

const baseRun = {
  characterId: 'hwarang', level: 1, exp: 0, bp: 28, statPoints: 0,
  allocated: { hp: 0, atk: 0, def: 0, agi: 0, luc: 0 },
  currentAreaId: 'village-entrance', isHardMode: false,
  monstersDefeated: 0, goldThisRun: 0,
  currentStage: 1, dungeonRunMonstersDefeated: 0,
};

beforeEach(() => {
  useGameStore.setState({ screen: 'world-map', run: baseRun, meta: INITIAL_META });
});

describe('RegionMap (plains)', () => {
  it('shows 마을 입구 node at level 1', () => {
    render(<RegionMap regionId="plains" onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /마을 입구/i })).toBeInTheDocument();
  });

  it('마을 입구 is not locked at level 1', () => {
    render(<RegionMap regionId="plains" onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /마을 입구/i })).not.toBeDisabled();
  });

  it('tavern-street (minLevel 45) is locked at level 1 — shows info, does not enter battle', async () => {
    render(<RegionMap regionId="plains" onBack={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /주막 거리/i });
    await userEvent.click(btn);
    expect(useGameStore.getState().screen).not.toBe('battle');
    expect(screen.getByText(/Lv\.45/i)).toBeInTheDocument();
  });

  it('← button calls onBack', async () => {
    const onBack = vi.fn();
    render(<RegionMap regionId="plains" onBack={onBack} />);
    await userEvent.click(screen.getByRole('button', { name: /뒤로가기/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('entering unlocked area triggers battle screen and deducts BP', async () => {
    render(<RegionMap regionId="plains" onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /마을 입구/i }));
    const state = useGameStore.getState();
    expect(state.screen).toBe('battle');
    expect(state.run.bp).toBe(27);
    expect(state.run.currentAreaId).toBe('village-entrance');
  });

  it('shows region name in header', () => {
    render(<RegionMap regionId="plains" onBack={vi.fn()} />);
    expect(screen.getByText(/조선 평야/i)).toBeInTheDocument();
  });

  it('does not show areas from other regions', () => {
    render(<RegionMap regionId="plains" onBack={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /숲의 입구/i })).not.toBeInTheDocument();
  });
});
