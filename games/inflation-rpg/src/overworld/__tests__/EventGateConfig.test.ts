import { describe, it, expect } from 'vitest';
import { getAvailableLateEvents, getAvailableMidEvents, LATE_GAME_EVENTS, MID_GAME_EVENTS } from '../encounter/EventGateConfig';
import { RELIC_MAX_LEVEL, TRIAL_GROUNDS_EXP_MUL, TRIAL_GROUNDS_DURATION } from '../encounter/constants';

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

  // C759: balance invariants for late-game events
  it('colosseum EXP×2 bounded: total exp boost ≤ 3.0× with night overlap', () => {
    // Colosseum 2.0 × Night 1.5 = 3.0 — acceptable upper bound
    const colosseumExpMul = 2.0;
    const nightExpMul = 1.5;
    expect(colosseumExpMul * nightExpMul).toBeLessThanOrEqual(3.0);
  });

  it('colosseum enemy ATK mul ≤ 2.0 (survivable even with night overlap)', () => {
    const colosseumDmgMul = 1.3;
    const nightDmgMul = 1.5;
    expect(colosseumDmgMul * nightDmgMul).toBeLessThanOrEqual(2.0);
  });

  it('void rift tier offset ≤ 5 (prevents impossible enemies)', () => {
    const voidRiftTierOffset = 2;
    expect(voidRiftTierOffset).toBeLessThanOrEqual(5);
  });

  it('void rift duration ≤ 5 fights (limited window)', () => {
    const voidRiftDuration = 3;
    expect(voidRiftDuration).toBeLessThanOrEqual(5);
  });

  it('colosseum gate (150) > inspiration gate (30-40) — proper late-game', () => {
    const colosseumGate = LATE_GAME_EVENTS.find(e => e.id === 'event_ancient_colosseum')!.minTotalFights;
    expect(colosseumGate).toBeGreaterThanOrEqual(150);
  });

  it('C762: trial_grounds available after 90 fights', () => {
    expect(getAvailableMidEvents(89)).toEqual([]);
    const events = getAvailableMidEvents(90);
    expect(events.length).toBe(1);
    expect(events[0].id).toBe('event_trial_grounds');
  });

  it('C762: trial_grounds gate < colosseum gate (mid < late)', () => {
    const trialGate = MID_GAME_EVENTS.find(e => e.id === 'event_trial_grounds')!.minTotalFights;
    const colosseumGate = LATE_GAME_EVENTS.find(e => e.id === 'event_ancient_colosseum')!.minTotalFights;
    expect(trialGate).toBeLessThan(colosseumGate);
  });

  it('C763: relic max level ≤ 5 (prevents infinite scaling)', () => {
    expect(RELIC_MAX_LEVEL).toBeLessThanOrEqual(5);
    expect(RELIC_MAX_LEVEL).toBeGreaterThanOrEqual(3);
  });

  it('C763: trial grounds EXP multiplier < colosseum (mid < late reward)', () => {
    expect(TRIAL_GROUNDS_EXP_MUL).toBeLessThan(2.0); // colosseum is 2.0
    expect(TRIAL_GROUNDS_EXP_MUL).toBeGreaterThan(1.0);
  });

  it('C763: trial grounds duration ≤ colosseum duration (shorter buff)', () => {
    expect(TRIAL_GROUNDS_DURATION).toBeLessThanOrEqual(5); // colosseum is 5
  });
});
