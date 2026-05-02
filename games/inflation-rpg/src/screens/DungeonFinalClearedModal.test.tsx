import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DungeonFinalClearedModal } from './DungeonFinalClearedModal';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';

describe('DungeonFinalClearedModal', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'town',
      run: { ...INITIAL_RUN },
      meta: { ...INITIAL_META },
    });
  });

  it('renders nothing when pendingFinalClearedId is null', () => {
    const { container } = render(<DungeonFinalClearedModal />);
    expect(container.firstChild).toBeNull();
  });

  it('renders dungeon name + 정복 message when pendingFinalClearedId is set', () => {
    useGameStore.setState({
      meta: { ...INITIAL_META, pendingFinalClearedId: 'plains' },
    });
    render(<DungeonFinalClearedModal />);
    expect(screen.getByText(/평야/)).toBeInTheDocument();
    expect(screen.getByText(/정복/)).toBeInTheDocument();
  });

  it('close button clears pendingFinalClearedId', () => {
    useGameStore.setState({
      meta: { ...INITIAL_META, pendingFinalClearedId: 'plains' },
    });
    render(<DungeonFinalClearedModal />);
    fireEvent.click(screen.getByTestId('final-cleared-close'));
    expect(useGameStore.getState().meta.pendingFinalClearedId).toBeNull();
  });

  it('renders gracefully for unknown dungeon id', () => {
    useGameStore.setState({
      meta: { ...INITIAL_META, pendingFinalClearedId: 'foobar' },
    });
    render(<DungeonFinalClearedModal />);
    expect(screen.getByTestId('final-cleared-close')).toBeInTheDocument();
  });
});
