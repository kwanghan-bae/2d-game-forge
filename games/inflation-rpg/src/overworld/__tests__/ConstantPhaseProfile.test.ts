import { describe, it, expect } from 'vitest';
import { getConstantProfile, type PhaseProfile } from '../encounter/ConstantPhaseProfile';

describe('ConstantPhaseProfile — C746', () => {
  it('classifies NIGHT_CYCLE_INTERVAL as all-run', () => {
    expect(getConstantProfile('NIGHT_CYCLE_INTERVAL')).toBe('all-run');
  });

  it('classifies HEALER_MIN_FIGHTS as mid', () => {
    expect(getConstantProfile('HEALER_MIN_FIGHTS')).toBe('mid');
  });

  it('classifies ECHO_MIN_LEVEL as mid', () => {
    expect(getConstantProfile('ECHO_MIN_LEVEL')).toBe('mid');
  });

  it('classifies EVENT_PITY_THRESHOLD as all-run', () => {
    expect(getConstantProfile('EVENT_PITY_THRESHOLD')).toBe('all-run');
  });

  it('classifies WEATHER_CHANCE as all-run', () => {
    expect(getConstantProfile('WEATHER_CHANCE')).toBe('all-run');
  });

  it('classifies PRESTIGE_LEVEL_REQUIREMENT as late', () => {
    expect(getConstantProfile('PRESTIGE_LEVEL_REQUIREMENT')).toBe('late');
  });

  it('classifies TRAP_CHANCE as early', () => {
    expect(getConstantProfile('TRAP_CHANCE')).toBe('early');
  });

  it('classifies BOSS_ENRAGE_HP_THRESHOLD as all-run', () => {
    expect(getConstantProfile('BOSS_ENRAGE_HP_THRESHOLD')).toBe('all-run');
  });

  it('returns unknown for unclassified constants', () => {
    expect(getConstantProfile('SOME_NONEXISTENT_CONSTANT')).toBe('unknown');
  });

  it('exports PhaseProfile type with expected values', () => {
    const valid: PhaseProfile[] = ['early', 'mid', 'late', 'all-run', 'unknown'];
    expect(valid).toHaveLength(5);
  });
});

// C751: Phase-aware inspiration config tests
import { getInspirationConfig } from '../encounter/ConstantPhaseProfile';

describe('getInspirationConfig — C751', () => {
  it('early-mid (totalFights < 80): duration 6, gate 30', () => {
    const cfg = getInspirationConfig(50);
    expect(cfg.duration).toBe(6);
    expect(cfg.minFights).toBe(30);
  });

  it('mid (totalFights 80-199): duration 8, gate 40', () => {
    const cfg = getInspirationConfig(100);
    expect(cfg.duration).toBe(8);
    expect(cfg.minFights).toBe(40);
  });

  it('late (totalFights >= 200): duration 10, gate 40', () => {
    const cfg = getInspirationConfig(250);
    expect(cfg.duration).toBe(10);
    expect(cfg.minFights).toBe(40);
  });

  it('invariant: duration in [4, 12]', () => {
    for (const tf of [0, 30, 79, 80, 199, 200, 500, 1000]) {
      const cfg = getInspirationConfig(tf);
      expect(cfg.duration).toBeGreaterThanOrEqual(4);
      expect(cfg.duration).toBeLessThanOrEqual(12);
    }
  });

  it('invariant: minFights in [20, 60]', () => {
    for (const tf of [0, 30, 79, 80, 199, 200, 500, 1000]) {
      const cfg = getInspirationConfig(tf);
      expect(cfg.minFights).toBeGreaterThanOrEqual(20);
      expect(cfg.minFights).toBeLessThanOrEqual(60);
    }
  });
});
