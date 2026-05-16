import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { MainMenu } from './MainMenu';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../store/gameStore';

beforeEach(() => {
  useGameStore.setState({ screen: 'main-menu', run: INITIAL_RUN, meta: INITIAL_META });
});

describe('MainMenu (V1a)', () => {
  it('renders game title', () => {
    render(<MainMenu />);
    expect(screen.getByText(/조선 인플레이션 RPG/)).toBeInTheDocument();
  });

  it('사이클 시작 navigates to cycle-prep-v2', async () => {
    render(<MainMenu />);
    await userEvent.click(screen.getByTestId('btn-start-cycle'));
    expect(useGameStore.getState().screen).toBe('cycle-prep-v2');
  });

  it('shows best-record indicator', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, bestRunLevel: 42 } }));
    render(<MainMenu />);
    expect(screen.getByTestId('best-record').textContent).toMatch(/42/);
  });

  it('용사 갤러리 button is disabled', () => {
    render(<MainMenu />);
    const btn = screen.getByTestId('btn-saga-gallery');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('설정 button is disabled', () => {
    render(<MainMenu />);
    const btn = screen.getByTestId('btn-settings');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});
