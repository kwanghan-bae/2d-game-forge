import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { Inventory } from './Inventory';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';
import type { Equipment } from '../types';

const sword: Equipment = {
  id: 'w-sword', name: '철검', slot: 'weapon', rarity: 'common',
  stats: { flat: { atk: 80 } }, dropAreaIds: [], price: 300,
};

beforeEach(() => {
  useGameStore.setState({
    screen: 'inventory',
    run: INITIAL_RUN,
    meta: { ...INITIAL_META, inventory: { weapons: [sword], armors: [], accessories: [] } },
  });
});

describe('Inventory', () => {
  it('shows weapon tab with item count', () => {
    render(<Inventory />);
    expect(screen.getByText(/무기.*1\/10/i)).toBeInTheDocument();
  });

  it('renders the sword item', () => {
    render(<Inventory />);
    expect(screen.getByText('철검')).toBeInTheDocument();
  });

  it('back button returns to previous screen', async () => {
    useGameStore.setState((s) => ({ ...s, screen: 'inventory' }));
    render(<Inventory />);
    await userEvent.click(screen.getByRole('button', { name: /뒤로/i }));
    expect(['main-menu', 'world-map']).toContain(useGameStore.getState().screen);
  });
});
