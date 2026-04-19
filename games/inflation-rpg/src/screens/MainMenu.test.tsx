import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { MainMenu } from './MainMenu';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';

const activeRun = { ...INITIAL_RUN, characterId: 'hwarang', level: 15 };

beforeEach(() => {
  useGameStore.setState({ screen: 'main-menu', run: INITIAL_RUN, meta: INITIAL_META });
});

describe('MainMenu — no active run', () => {
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

  it('런 이어하기 button is NOT shown when no active run', () => {
    render(<MainMenu />);
    expect(screen.queryByRole('button', { name: /런 이어하기/i })).not.toBeInTheDocument();
  });
});

describe('MainMenu — active run exists', () => {
  beforeEach(() => {
    useGameStore.setState({ screen: 'main-menu', run: activeRun, meta: INITIAL_META });
  });

  it('런 이어하기 button is shown when active run exists', () => {
    render(<MainMenu />);
    expect(screen.getByRole('button', { name: /런 이어하기/i })).toBeInTheDocument();
  });

  it('게임 시작 button is NOT shown when active run exists', () => {
    render(<MainMenu />);
    expect(screen.queryByRole('button', { name: /게임 시작/i })).not.toBeInTheDocument();
  });

  it('런 이어하기 navigates to world-map', async () => {
    render(<MainMenu />);
    await userEvent.click(screen.getByRole('button', { name: /런 이어하기/i }));
    expect(useGameStore.getState().screen).toBe('world-map');
  });

  it('새로 시작 resets run and navigates to class-select', async () => {
    render(<MainMenu />);
    await userEvent.click(screen.getByRole('button', { name: /새로 시작/i }));
    const state = useGameStore.getState();
    expect(state.run.characterId).toBe('');
    expect(state.screen).toBe('class-select');
  });
});
