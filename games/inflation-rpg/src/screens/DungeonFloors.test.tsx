import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DungeonFloors } from './DungeonFloors';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';

describe('DungeonFloors', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'dungeon-floors',
      run: { ...INITIAL_RUN, characterId: 'hwarang', currentDungeonId: 'plains', currentFloor: 1 },
      meta: { ...INITIAL_META },
    });
  });

  it('renders floor cards 1..30', () => {
    render(<DungeonFloors />);
    expect(screen.getByTestId('floor-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('floor-card-30')).toBeInTheDocument();
    expect(screen.queryByTestId('floor-card-31')).not.toBeInTheDocument();
  });

  it('locks floors past run.currentFloor', () => {
    useGameStore.setState({
      run: { ...INITIAL_RUN, characterId: 'hwarang', currentDungeonId: 'plains', currentFloor: 5 },
    });
    render(<DungeonFloors />);
    expect(screen.getByTestId('floor-card-5')).not.toBeDisabled();
    expect(screen.getByTestId('floor-card-6')).toBeDisabled();
  });

  it('click on accessible floor sets currentFloor + transitions to dungeon', () => {
    useGameStore.setState({
      run: { ...INITIAL_RUN, characterId: 'hwarang', currentDungeonId: 'plains', currentFloor: 3, bp: 30 },
    });
    render(<DungeonFloors />);
    fireEvent.click(screen.getByTestId('floor-card-2'));
    expect(useGameStore.getState().run.currentFloor).toBe(2);
    expect(useGameStore.getState().screen).toBe('dungeon');
  });

  it('back button returns to town and clears currentDungeonId', () => {
    render(<DungeonFloors />);
    fireEvent.click(screen.getByTestId('dungeon-floors-back'));
    expect(useGameStore.getState().screen).toBe('town');
    expect(useGameStore.getState().run.currentDungeonId).toBeNull();
  });

  it('renders dungeon name in header', () => {
    render(<DungeonFloors />);
    expect(screen.getByText(/평야/)).toBeInTheDocument();
  });
});

describe('DungeonFloors — boss cards', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'dungeon-floors',
      run: { ...INITIAL_RUN, characterId: 'hwarang', currentDungeonId: 'plains', currentFloor: 30 },
      meta: { ...INITIAL_META },
    });
  });

  it('floor 5 (mini) card has data-boss="mini"', () => {
    render(<DungeonFloors />);
    expect(screen.getByTestId('floor-card-5')).toHaveAttribute('data-boss', 'mini');
  });

  it('floor 10 (major) card has data-boss="major"', () => {
    render(<DungeonFloors />);
    expect(screen.getByTestId('floor-card-10')).toHaveAttribute('data-boss', 'major');
  });

  it('floor 15/20/25 (sub) cards have data-boss="sub"', () => {
    render(<DungeonFloors />);
    expect(screen.getByTestId('floor-card-15')).toHaveAttribute('data-boss', 'sub');
    expect(screen.getByTestId('floor-card-20')).toHaveAttribute('data-boss', 'sub');
    expect(screen.getByTestId('floor-card-25')).toHaveAttribute('data-boss', 'sub');
  });

  it('floor 30 (final) card has data-boss="final" and shows ⭐', () => {
    render(<DungeonFloors />);
    const card = screen.getByTestId('floor-card-30');
    expect(card).toHaveAttribute('data-boss', 'final');
    expect(card.textContent).toContain('⭐');
  });

  it('non-boss floors have data-boss="none"', () => {
    render(<DungeonFloors />);
    expect(screen.getByTestId('floor-card-1')).toHaveAttribute('data-boss', 'none');
    expect(screen.getByTestId('floor-card-7')).toHaveAttribute('data-boss', 'none');
  });
});
