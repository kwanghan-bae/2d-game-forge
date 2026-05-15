import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DungeonPickModal } from './DungeonPickModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../store/gameStore';
import { EMPTY_COMPASS_OWNED } from '../data/compass';

describe('DungeonPickModal', () => {
  beforeEach(() => {
    useGameStore.setState({ run: { ...INITIAL_RUN }, meta: { ...INITIAL_META } });
  });

  it('shows pick result with picked dungeon and 입장 button', () => {
    render(<DungeonPickModal onClose={() => {}} />);
    expect(screen.getByTestId('pick-result')).toBeInTheDocument();
    expect(screen.getByTestId('pick-enter')).toBeInTheDocument();
  });

  it('does not show free-select button when no compass owned', () => {
    render(<DungeonPickModal onClose={() => {}} />);
    expect(screen.queryByTestId('pick-free-mode')).not.toBeInTheDocument();
  });

  it('shows free-select button when omni owned', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, compassOwned: { ...EMPTY_COMPASS_OWNED, omni: true } },
    }));
    render(<DungeonPickModal onClose={() => {}} />);
    expect(screen.getByTestId('pick-free-mode')).toBeInTheDocument();
  });

  it('clicking 입장 calls onClose + setScreen(class-select)', () => {
    let closed = false;
    render(<DungeonPickModal onClose={() => { closed = true; }} />);
    act(() => { fireEvent.click(screen.getByTestId('pick-enter')); });
    expect(closed).toBe(true);
    expect(useGameStore.getState().screen).toBe('class-select');
  });

  it('toggling free-mode reveals dungeon cards (only enabled when canFreeSelect)', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, compassOwned: { ...EMPTY_COMPASS_OWNED, forest_second: true } },
    }));
    render(<DungeonPickModal onClose={() => {}} />);
    act(() => { fireEvent.click(screen.getByTestId('pick-free-mode')); });
    expect(screen.getByTestId('free-card-plains')).toBeDisabled();
    expect(screen.getByTestId('free-card-forest')).not.toBeDisabled();
    expect(screen.getByTestId('free-card-mountains')).toBeDisabled();
  });
});
