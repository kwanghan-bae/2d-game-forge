import { describe, it, expect } from 'vitest';
import { DurationBuffTracker } from '../encounter/DurationBuffTracker';

describe('C958: DurationBuffTracker timing invariants', () => {
  it('buff lasts exactly N fights after activation', () => {
    const tracker = new DurationBuffTracker();
    tracker.activate('test_buff', 3);
    expect(tracker.remaining('test_buff')).toBe(3);
    
    tracker.tick();
    expect(tracker.remaining('test_buff')).toBe(2);
    expect(tracker.isActive('test_buff')).toBe(true);
    
    tracker.tick();
    expect(tracker.remaining('test_buff')).toBe(1);
    expect(tracker.isActive('test_buff')).toBe(true);
    
    tracker.tick();
    expect(tracker.remaining('test_buff')).toBe(0);
    expect(tracker.isActive('test_buff')).toBe(false);
  });

  it('tick1 decrements only the specified buff', () => {
    const tracker = new DurationBuffTracker();
    tracker.activate('a', 3);
    tracker.activate('b', 3);
    
    tracker.tick1('a');
    expect(tracker.remaining('a')).toBe(2);
    expect(tracker.remaining('b')).toBe(3);
  });

  it('tick1 + tick does not cause double decrement when used separately', () => {
    const tracker = new DurationBuffTracker();
    tracker.activate('solo', 5);
    
    // tick1 only — no global tick
    tracker.tick1('solo');
    expect(tracker.remaining('solo')).toBe(4);
    
    // global tick ticks everything including 'solo'
    tracker.tick();
    expect(tracker.remaining('solo')).toBe(3);
  });

  it('activate resets duration for already-active buff', () => {
    const tracker = new DurationBuffTracker();
    tracker.activate('refresh', 5);
    tracker.tick();
    tracker.tick();
    expect(tracker.remaining('refresh')).toBe(3);
    
    tracker.activate('refresh', 5);
    expect(tracker.remaining('refresh')).toBe(5);
  });
});
