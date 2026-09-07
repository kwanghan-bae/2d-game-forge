import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DangerChoiceModal } from '../DangerChoiceModal';
import { ShrineChoiceModal } from '../ShrineChoiceModal';
import { useCycleStoreV2 } from '../../overworld/cycleSliceV2';

describe('legacy interactive choice idle fallbacks', () => {
  const controller = {
    getHero: () => ({ level: 16, hp: 100, hpMax: 100 }),
    setDangerChoice: vi.fn(),
    setShrineChoice: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    useCycleStoreV2.setState({
      controller: controller as unknown as ReturnType<typeof useCycleStoreV2.getState>['controller'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('auto-selects fight in the danger modal after the idle window', () => {
    const onClose = vi.fn();
    render(<DangerChoiceModal onClose={onClose} />);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(controller.setDangerChoice).toHaveBeenCalledWith(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps explicit danger choices ahead of the idle fallback', () => {
    const onClose = vi.fn();
    render(<DangerChoiceModal onClose={onClose} />);

    fireEvent.click(screen.getByTestId('danger-choice-retreat'));
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(controller.setDangerChoice).toHaveBeenCalledTimes(1);
    expect(controller.setDangerChoice).toHaveBeenCalledWith(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('auto-selects the gold blessing at the shrine after the idle window', () => {
    const onClose = vi.fn();
    render(<ShrineChoiceModal onClose={onClose} />);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(controller.setShrineChoice).toHaveBeenCalledWith(0);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
