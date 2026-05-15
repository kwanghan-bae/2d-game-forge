import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Town } from './Town';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';

describe('Town screen', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'town',
      run: INITIAL_RUN,
      meta: INITIAL_META,
    });
  });

  it('renders town title and 3 starter dungeons', () => {
    render(<Town />);
    expect(screen.getByText('마을')).toBeInTheDocument();
    expect(screen.getByTestId('town-dungeon-plains')).toBeInTheDocument();
    expect(screen.getByTestId('town-dungeon-forest')).toBeInTheDocument();
    expect(screen.getByTestId('town-dungeon-mountains')).toBeInTheDocument();
  });

  it('selecting a dungeon sets currentDungeonId and navigates to class-select', () => {
    render(<Town />);
    const enterButtons = screen.getAllByText('입장');
    fireEvent.click(enterButtons[0]!);
    // First button = plains (DUNGEONS array order)
    expect(useGameStore.getState().run.currentDungeonId).toBe('plains');
    expect(useGameStore.getState().screen).toBe('class-select');
  });

  it('back button returns to main-menu', () => {
    render(<Town />);
    fireEvent.click(screen.getByText('돌아가기'));
    expect(useGameStore.getState().screen).toBe('main-menu');
  });

  it('Town: 직업소 버튼 → setScreen("skill-progression")', () => {
    render(<Town />);
    fireEvent.click(screen.getByTestId('town-skill-progression'));
    expect(useGameStore.getState().screen).toBe('skill-progression');
  });

  it('보물고 button navigates to relics screen', () => {
    render(<Town />);
    fireEvent.click(screen.getByTestId('town-relics'));
    expect(useGameStore.getState().screen).toBe('relics');
  });
});
