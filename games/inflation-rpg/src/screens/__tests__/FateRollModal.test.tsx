import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FateRollModal } from '../FateRollModal';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('FateRollModal timeout lifecycle', () => {
  it('keeps the original five-second deadline when the parent rerenders', () => {
    const firstResolve = vi.fn();
    const latestResolve = vi.fn();
    const { rerender } = render(
      <FateRollModal oldLevel={10} pendingDeathPenaltyNewLevel={9} onResolve={firstResolve} />,
    );

    act(() => { vi.advanceTimersByTime(4_000); });
    rerender(<FateRollModal oldLevel={10} pendingDeathPenaltyNewLevel={9} onResolve={latestResolve} />);
    act(() => { vi.advanceTimersByTime(1_000); });

    expect(firstResolve).not.toHaveBeenCalled();
    expect(latestResolve).toHaveBeenCalledTimes(1);
    expect(latestResolve).toHaveBeenCalledWith('decline');
  });
});
