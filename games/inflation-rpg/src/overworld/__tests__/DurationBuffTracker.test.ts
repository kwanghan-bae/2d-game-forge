import { describe, it, expect, beforeEach } from 'vitest';
import { DurationBuffTracker } from '../encounter/DurationBuffTracker';

describe('DurationBuffTracker', () => {
  let tracker: DurationBuffTracker;

  beforeEach(() => {
    tracker = new DurationBuffTracker();
  });

  it('activate sets duration and isActive returns true', () => {
    tracker.activate('stormNexus', 5);
    expect(tracker.isActive('stormNexus')).toBe(true);
    expect(tracker.remaining('stormNexus')).toBe(5);
  });

  it('tick decrements all active buffs', () => {
    tracker.activate('a', 3);
    tracker.activate('b', 1);
    tracker.tick();
    expect(tracker.remaining('a')).toBe(2);
    expect(tracker.isActive('b')).toBe(false); // expired
  });

  it('tick removes expired buffs', () => {
    tracker.activate('x', 1);
    tracker.tick();
    expect(tracker.isActive('x')).toBe(false);
    expect(tracker.remaining('x')).toBe(0);
    expect(tracker.size).toBe(0);
  });

  it('activate with 0 duration does not add', () => {
    tracker.activate('noop', 0);
    expect(tracker.isActive('noop')).toBe(false);
  });

  it('activate overwrites existing duration', () => {
    tracker.activate('buff', 3);
    tracker.activate('buff', 10);
    expect(tracker.remaining('buff')).toBe(10);
  });

  it('reset clears all buffs', () => {
    tracker.activate('a', 5);
    tracker.activate('b', 3);
    tracker.reset();
    expect(tracker.size).toBe(0);
    expect(tracker.isActive('a')).toBe(false);
  });

  it('activeBuffs returns all active IDs', () => {
    tracker.activate('x', 2);
    tracker.activate('y', 4);
    tracker.activate('z', 1);
    expect(tracker.activeBuffs().sort()).toEqual(['x', 'y', 'z']);
    tracker.tick();
    expect(tracker.activeBuffs().sort()).toEqual(['x', 'y']); // z expired
  });

  it('multi-tick lifecycle', () => {
    tracker.activate('short', 2);
    tracker.activate('long', 5);
    tracker.tick(); // short=1, long=4
    tracker.tick(); // short=0 (removed), long=3
    expect(tracker.isActive('short')).toBe(false);
    expect(tracker.remaining('long')).toBe(3);
    tracker.tick(); // long=2
    tracker.tick(); // long=1
    tracker.tick(); // long=0 (removed)
    expect(tracker.size).toBe(0);
  });

  it('isActive and remaining for non-existent buff', () => {
    expect(tracker.isActive('ghost')).toBe(false);
    expect(tracker.remaining('ghost')).toBe(0);
  });
});
