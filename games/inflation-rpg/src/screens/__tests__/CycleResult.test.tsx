import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CycleResult } from '../CycleResult';
import { useCycleStore } from '../../cycle/cycleSlice';

describe('CycleResult', () => {
  beforeEach(() => {
    useCycleStore.getState().reset();
  });

  it('shows "no result" when store has no result', () => {
    render(<CycleResult onBackToMenu={() => {}} />);
    expect(screen.getByText(/결과가 없습니다/)).toBeInTheDocument();
  });

  it('shows maxLevel and reason when result is populated', () => {
    useCycleStore.getState().start({
      loadout: { characterId: 'K01', bpMax: 3, heroHpMax: 100, heroAtkBase: 100000 },
      seed: 42,
    });
    useCycleStore.getState().abandon();
    render(<CycleResult onBackToMenu={() => {}} />);
    expect(screen.getByTestId('result-max-level')).toBeInTheDocument();
    expect(screen.getByTestId('result-reason')).toBeInTheDocument();
  });

  it('back-to-menu button triggers callback', () => {
    const onBack = vi.fn();
    useCycleStore.getState().start({
      loadout: { characterId: 'K01', bpMax: 3, heroHpMax: 100, heroAtkBase: 100000 },
      seed: 42,
    });
    useCycleStore.getState().abandon();
    render(<CycleResult onBackToMenu={onBack} />);
    fireEvent.click(screen.getByText(/메인 메뉴/));
    expect(onBack).toHaveBeenCalled();
  });
});
