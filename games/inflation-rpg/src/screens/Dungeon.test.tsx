import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dungeon } from './Dungeon';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';

// Mock Battle to avoid Phaser imports (which fail in jsdom)
vi.mock('./Battle', () => ({
  Battle: () => <div data-testid="battle-mock">Battle</div>,
}));

describe('Dungeon', () => {
  beforeEach(() => {
    useGameStore.setState({
      run: {
        ...INITIAL_RUN,
        characterId: 'warrior',
        currentAreaId: 'village-entrance',
        currentDungeonId: null,
        currentFloor: 1,
      },
      meta: { ...INITIAL_META },
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
        currentDungeonId: null,
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

describe('Dungeon — new flow header', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'dungeon',
      run: {
        ...INITIAL_RUN,
        characterId: 'hwarang',
        currentDungeonId: 'plains',
        currentFloor: 7,
      },
      meta: { ...INITIAL_META },
    });
  });

  it('renders dungeon name + floor in new flow', () => {
    render(<Dungeon />);
    expect(screen.getByText(/평야/)).toBeInTheDocument();
    expect(screen.getByText(/F7/)).toBeInTheDocument();
  });
});
