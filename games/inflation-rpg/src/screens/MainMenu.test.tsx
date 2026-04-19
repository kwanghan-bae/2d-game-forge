import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { MainMenu } from './MainMenu';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';

beforeEach(() => {
  useGameStore.setState({ screen: 'main-menu', run: INITIAL_RUN, meta: INITIAL_META });
});

describe('MainMenu', () => {
  it('renders game title', () => {
    render(<MainMenu />);
    expect(screen.getByText(/INFLATION/i)).toBeInTheDocument();
  });

  it('게임 시작 button navigates to class-select', async () => {
    render(<MainMenu />);
    await userEvent.click(screen.getByRole('button', { name: /게임 시작/i }));
    expect(useGameStore.getState().screen).toBe('class-select');
  });

  it('인벤토리 button navigates to inventory', async () => {
    render(<MainMenu />);
    await userEvent.click(screen.getByRole('button', { name: /인벤토리/i }));
    expect(useGameStore.getState().screen).toBe('inventory');
  });
});
