import { describe, it, expect } from 'vitest';
import { getAvailableLateEvents, LATE_GAME_EVENTS } from '../encounter/EventGateConfig';

describe('EventGateConfig — C754', () => {
  it('returns empty when totalFights below all gates', () => {
    expect(getAvailableLateEvents(50)).toEqual([]);
  });

  it('returns ancient_colosseum after 150 fights', () => {
    const events = getAvailableLateEvents(150);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('event_ancient_colosseum');
  });

  it('returns both events after 200 fights', () => {
    const events = getAvailableLateEvents(200);
    expect(events).toHaveLength(2);
    expect(events.map(e => e.id)).toContain('event_ancient_colosseum');
    expect(events.map(e => e.id)).toContain('event_void_rift');
  });

  it('all late events have minTotalFights >= 100 (hard gate)', () => {
    for (const e of LATE_GAME_EVENTS) {
      expect(e.minTotalFights).toBeGreaterThanOrEqual(100);
    }
  });

  it('all late events have chance in (0, 0.05]', () => {
    for (const e of LATE_GAME_EVENTS) {
      expect(e.chance).toBeGreaterThan(0);
      expect(e.chance).toBeLessThanOrEqual(0.05);
    }
  });
});
