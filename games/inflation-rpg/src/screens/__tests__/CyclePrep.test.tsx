import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CyclePrep } from '../CyclePrep';
import { useGameStore } from '../../store/gameStore';
import { useCycleStore } from '../../cycle/cycleSlice';

describe('CyclePrep', () => {
  beforeEach(() => {
    useCycleStore.getState().reset();
  });

  it('renders TraitSelector + Start button', () => {
    render(<CyclePrep onStart={() => {}} onCancel={() => {}} />);
    expect(screen.getByTestId('trait-selector')).toBeInTheDocument();
    expect(screen.getByTestId('btn-prep-start')).toBeInTheDocument();
  });

  it('Start button calls onStart and seeds cycleStore with selected traits', () => {
    const onStart = vi.fn();
    render(<CyclePrep onStart={onStart} onCancel={() => {}} />);
    fireEvent.click(screen.getByTestId('trait-card-t_genius'));
    fireEvent.click(screen.getByTestId('btn-prep-start'));
    expect(onStart).toHaveBeenCalled();
    expect(useCycleStore.getState().status).toBe('running');
    const ctrl = useCycleStore.getState().controller!;
    expect(ctrl.getEvents()[0].type).toBe('cycle_start');
    if (ctrl.getEvents()[0].type === 'cycle_start') {
      expect((ctrl.getEvents()[0] as { traitIds: string[] }).traitIds).toContain('t_genius');
    }
  });

  it('only base-tier traits are available initially (filtered by meta.traitsUnlocked)', () => {
    // gameStore.meta.traitsUnlocked starts as BASE_TRAIT_IDS (Task 7 ensures this).
    render(<CyclePrep onStart={() => {}} onCancel={() => {}} />);
    // mid-tier trait should not be selectable as a card
    expect(screen.queryByTestId('trait-card-t_boss_hunter')).toBeNull();
    // base-tier trait should be selectable
    expect(screen.getByTestId('trait-card-t_genius')).toBeInTheDocument();
  });

  it('Cancel button returns to menu', () => {
    const onCancel = vi.fn();
    render(<CyclePrep onStart={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('btn-prep-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
