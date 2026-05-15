import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Town } from './Town';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../store/gameStore';

describe('Town — Phase Compass UI', () => {
  beforeEach(() => {
    useGameStore.setState({ screen: 'town', run: { ...INITIAL_RUN }, meta: { ...INITIAL_META } });
  });

  it('shows single 던전 입장 button', () => {
    render(<Town />);
    expect(screen.getByTestId('town-enter-dungeon')).toBeInTheDocument();
  });

  it('does not render town-dungeon-<id> grid testids (legacy removed)', () => {
    render(<Town />);
    expect(screen.queryByTestId('town-dungeon-plains')).not.toBeInTheDocument();
    expect(screen.queryByTestId('town-dungeon-forest')).not.toBeInTheDocument();
    expect(screen.queryByTestId('town-dungeon-mountains')).not.toBeInTheDocument();
  });

  it('still shows town facility buttons (보물고 / 차원 제단 / 직업소)', () => {
    render(<Town />);
    expect(screen.getByTestId('town-relics')).toBeInTheDocument();
    expect(screen.getByTestId('town-ascension-altar')).toBeInTheDocument();
    expect(screen.getByTestId('town-skill-progression')).toBeInTheDocument();
  });

  it('던전 입장 클릭 시 DungeonPickModal 마운트', () => {
    render(<Town />);
    expect(screen.queryByTestId('dungeon-pick-modal')).not.toBeInTheDocument();
    act(() => { fireEvent.click(screen.getByTestId('town-enter-dungeon')); });
    expect(screen.getByTestId('dungeon-pick-modal')).toBeInTheDocument();
  });

  it('보물고 클릭 → setScreen(relics)', () => {
    render(<Town />);
    act(() => { fireEvent.click(screen.getByTestId('town-relics')); });
    expect(useGameStore.getState().screen).toBe('relics');
  });

  it('차원 제단 클릭 → setScreen(ascension)', () => {
    render(<Town />);
    act(() => { fireEvent.click(screen.getByTestId('town-ascension-altar')); });
    expect(useGameStore.getState().screen).toBe('ascension');
  });

  it('직업소 클릭 → setScreen(skill-progression)', () => {
    render(<Town />);
    act(() => { fireEvent.click(screen.getByTestId('town-skill-progression')); });
    expect(useGameStore.getState().screen).toBe('skill-progression');
  });
});
