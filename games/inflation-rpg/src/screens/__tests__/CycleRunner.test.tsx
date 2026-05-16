import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CycleRunner } from '../CycleRunner';
import { useCycleStore } from '../../cycle/cycleSlice';

// NOTE: Test 3 uses manual rAF + performance.now spies rather than
// vi.useFakeTimers({ toFake: [..., 'performance'] }) because happy-dom's
// requestAnimationFrame polyfill doesn't interact reliably with vitest's
// fake-timer performance stub across all CI environments. We drive the rAF
// loop manually to keep the spirit: verify onCycleEnd fires when the cycle
// naturally ends via the rAF path.

describe('CycleRunner', () => {
  beforeEach(() => {
    useCycleStore.getState().reset();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows "idle" message before start', () => {
    render(<CycleRunner onCycleEnd={() => {}} />);
    expect(screen.getByText(/사이클이 시작되지 않았습니다/)).toBeInTheDocument();
  });

  it('shows HUD (LV / BP) when status is running', () => {
    useCycleStore.getState().start({
      loadout: { characterId: 'K01', bpMax: 5, heroHpMax: 100, heroAtkBase: 100 },
      seed: 42,
    });
    render(<CycleRunner onCycleEnd={() => {}} />);
    expect(screen.getByTestId('hud-level')).toBeInTheDocument();
    expect(screen.getByTestId('hud-bp')).toBeInTheDocument();
  });

  it('calls onCycleEnd when cycle naturally ends (driven via manual rAF pump)', () => {
    // Use real timers for this test since we drive rAF manually.
    vi.useRealTimers();

    const onEnd = vi.fn();

    // Spy on performance.now so we control time.
    let nowMs = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => nowMs);

    // Capture rAF callbacks in a queue.
    const rafQueue: FrameRequestCallback[] = [];
    let rafIdCounter = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return ++rafIdCounter;
    });
    vi.stubGlobal('cancelAnimationFrame', (_id: number) => {
      // no-op for the test
    });

    // Start a cycle with bpMax=3 and very high ATK so enemies die in 1 hit
    // → kills happen fast → BP drains → cycle ends quickly.
    useCycleStore.getState().start({
      loadout: { characterId: 'K01', bpMax: 3, heroHpMax: 100, heroAtkBase: 100000 },
      seed: 42,
    });

    render(<CycleRunner onCycleEnd={onEnd} />);

    // Pump frames: each frame advances time by TICK_MS (100ms).
    // With bpMax=3 and roundMs=600ms, cycle ends after ≤3 kills (~1800ms sim time).
    // We pump generously (40 frames × 100ms = 4000ms sim time).
    act(() => {
      for (let frame = 0; frame < 40; frame++) {
        nowMs += 100;
        const cb = rafQueue.shift();
        cb?.(nowMs);
      }
    });

    expect(onEnd).toHaveBeenCalled();
  });
});
