import { describe, test, expect, vi } from 'vitest';
import { EventStateMachine } from '../encounter/EventStateMachine';

describe('C778: EventStateMachine', () => {
  test('register + trigger + resolve(accept) calls onAccept', () => {
    const sm = new EventStateMachine();
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    sm.register('test_event', { onAccept, onDecline });

    expect(sm.getPending('test_event')).toBe(false);
    sm.trigger('test_event');
    expect(sm.getPending('test_event')).toBe(true);
    sm.resolve('test_event', true);
    expect(sm.getPending('test_event')).toBe(false);
    expect(onAccept).toHaveBeenCalledOnce();
    expect(onDecline).not.toHaveBeenCalled();
  });

  test('resolve(decline) calls onDecline', () => {
    const sm = new EventStateMachine();
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    sm.register('trial', { onAccept, onDecline });

    sm.trigger('trial');
    sm.resolve('trial', false);
    expect(onDecline).toHaveBeenCalledOnce();
    expect(onAccept).not.toHaveBeenCalled();
  });

  test('resolve without trigger is no-op', () => {
    const sm = new EventStateMachine();
    const onAccept = vi.fn();
    sm.register('noop', { onAccept, onDecline: vi.fn() });

    sm.resolve('noop', true);
    expect(onAccept).not.toHaveBeenCalled();
  });

  test('getAllPending returns only triggered events', () => {
    const sm = new EventStateMachine();
    sm.register('a', { onAccept: vi.fn(), onDecline: vi.fn() });
    sm.register('b', { onAccept: vi.fn(), onDecline: vi.fn() });
    sm.register('c', { onAccept: vi.fn(), onDecline: vi.fn() });

    sm.trigger('a');
    sm.trigger('c');
    expect(sm.getAllPending().sort()).toEqual(['a', 'c']);
  });

  test('unknown eventId is safely ignored', () => {
    const sm = new EventStateMachine();
    expect(sm.getPending('unknown')).toBe(false);
    sm.trigger('unknown'); // no throw
    sm.resolve('unknown', true); // no throw
  });
});
