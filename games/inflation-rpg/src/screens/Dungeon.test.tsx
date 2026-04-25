import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dungeon } from './Dungeon';
import { useGameStore } from '../store/gameStore';

// Mock Battle to avoid Phaser imports (which fail in jsdom)
vi.mock('./Battle', () => ({
  Battle: () => <div data-testid="battle-mock">Battle</div>,
}));

describe('Dungeon', () => {
  beforeEach(() => {
    useGameStore.setState({
      run: {
        characterId: 'warrior',
        level: 1,
        exp: 0,
        bp: 0,
        statPoints: 0,
        allocated: { hp: 0, atk: 0, def: 0, agi: 0, luc: 0 },
        currentAreaId: 'village-entrance',
        isHardMode: false,
        monstersDefeated: 0,
        goldThisRun: 0,
        currentStage: 1,
        dungeonRunMonstersDefeated: 0,
      },
    } as any);
  });

  it('renders stage indicator with current/max', () => {
    render(<Dungeon />);
    expect(screen.getByText(/Stage 1 \/ 7/)).toBeInTheDocument();
  });

  it('displays area name', () => {
    render(<Dungeon />);
    expect(screen.getByText(/마을 입구/)).toBeInTheDocument();
  });

  it('shows BOSS badge when on final stage of boss area', () => {
    useGameStore.setState({
      run: {
        ...useGameStore.getState().run,
        currentAreaId: 'old-fortress', // has bossId 'plains-ghost'
        currentStage: 10,
      },
    } as any);
    render(<Dungeon />);
    expect(screen.getByText(/BOSS/)).toBeInTheDocument();
  });

  it('renders Battle child component', () => {
    render(<Dungeon />);
    expect(screen.getByTestId('battle-mock')).toBeInTheDocument();
  });
});
