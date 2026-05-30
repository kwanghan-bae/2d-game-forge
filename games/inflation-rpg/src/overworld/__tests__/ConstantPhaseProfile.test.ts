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
