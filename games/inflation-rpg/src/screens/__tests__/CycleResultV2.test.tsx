import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CycleResultV2 } from '../CycleResultV2';
import { useCycleStoreV2 } from '../../overworld/cycleSliceV2';

describe('CycleResultV2', () => {
  beforeEach(() => useCycleStoreV2.getState().reset());

  it('shows "no result" when no saga', () => {
    render(<CycleResultV2 onBackToMenu={() => {}} />);
    expect(screen.getByText(/결과가 없습니다/)).toBeInTheDocument();
  });

  it('renders saga summary when result exists', () => {
    useCycleStoreV2.getState().start({ seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100000 });
    for (let i = 0; i < 10; i++) useCycleStoreV2.getState().controller!.handleArrival('enemy', `e${i}`);
    useCycleStoreV2.getState().endCycle();
    render(<CycleResultV2 onBackToMenu={() => {}} />);
    expect(screen.getByTestId('result-hero-name')).toBeInTheDocument();
    expect(screen.getByTestId('result-final-stats')).toBeInTheDocument();
    expect(screen.getByTestId('result-narrative-list')).toBeInTheDocument();
  });

  it('back to menu button triggers callback', () => {
    const onBack = vi.fn();
    useCycleStoreV2.getState().start({ seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100000 });
    for (let i = 0; i < 5; i++) useCycleStoreV2.getState().controller!.handleArrival('enemy', `e${i}`);
    useCycleStoreV2.getState().endCycle();
    render(<CycleResultV2 onBackToMenu={onBack} />);
    fireEvent.click(screen.getByText(/메인 메뉴/));
    expect(onBack).toHaveBeenCalled();
  });
});
