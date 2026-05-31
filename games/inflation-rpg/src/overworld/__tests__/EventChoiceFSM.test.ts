import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventChoiceFSM } from '../encounter/EventChoiceFSM';

describe('EventChoiceFSM', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('starts in idle state', () => {
    const fsm = new EventChoiceFSM({ timeoutMs: 2000, defaultChoice: 'accept' });
    expect(fsm.state).toBe('idle');
    expect(fsm.choice).toBeNull();
  });

  it('trigger transitions to presenting', () => {
    const fsm = new EventChoiceFSM({ timeoutMs: 2000, defaultChoice: 'accept' });
    fsm.trigger();
    expect(fsm.state).toBe('presenting');
    expect(fsm.progress).toBeCloseTo(1, 1);
  });

  it('resolve transitions to resolved with choice', () => {
    const fsm = new EventChoiceFSM({ timeoutMs: 2000, defaultChoice: 'accept' });
    fsm.trigger();
    fsm.resolve('decline');
    expect(fsm.state).toBe('resolved');
    expect(fsm.choice).toBe('decline');
  });

  it('checkTimeout auto-resolves with default after timeout', () => {
    const fsm = new EventChoiceFSM({ timeoutMs: 2000, defaultChoice: 'accept' });
    fsm.trigger();
    vi.advanceTimersByTime(2100);
    const timedOut = fsm.checkTimeout();
    expect(timedOut).toBe(true);
    expect(fsm.state).toBe('resolved');
    expect(fsm.choice).toBe('accept');
  });

  it('checkTimeout returns false before timeout', () => {
    const fsm = new EventChoiceFSM({ timeoutMs: 2000, defaultChoice: 'accept' });
    fsm.trigger();
    vi.advanceTimersByTime(500);
    expect(fsm.checkTimeout()).toBe(false);
    expect(fsm.state).toBe('presenting');
  });

  it('reset returns to idle', () => {
    const fsm = new EventChoiceFSM({ timeoutMs: 2000, defaultChoice: 'accept' });
    fsm.trigger();
    fsm.resolve('decline');
    fsm.reset();
    expect(fsm.state).toBe('idle');
    expect(fsm.choice).toBeNull();
  });

  it('trigger is no-op when not idle', () => {
    const fsm = new EventChoiceFSM({ timeoutMs: 2000, defaultChoice: 'accept' });
    fsm.trigger();
    fsm.resolve('decline');
    fsm.trigger(); // should be no-op (state=resolved)
    expect(fsm.state).toBe('resolved');
  });

  it('resolve is no-op when not presenting', () => {
    const fsm = new EventChoiceFSM({ timeoutMs: 2000, defaultChoice: 'accept' });
    fsm.resolve('decline'); // state=idle, should be no-op
    expect(fsm.state).toBe('idle');
    expect(fsm.choice).toBeNull();
  });
});
