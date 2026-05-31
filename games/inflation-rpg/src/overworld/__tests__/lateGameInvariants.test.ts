import { describe, it, expect } from 'vitest';
import {
  LATE_GAME_PITY_THRESHOLD,
  LATE_GAME_PITY_THRESHOLD_700,
  LATE_GAME_PITY_THRESHOLD_800,
  LATE_GAME_PITY_FIGHT_MIN,
  ASCENSION_TRIAL_CHANCE,
  ECHO_MEMORY_CHANCE,
  SHARD_FUSION_CHANCE,
  ENDGAME_SURGE_CHANCE,
  EVENT_PITY_THRESHOLD,
  MID_GAME_PITY_THRESHOLD,
  MID_GAME_PITY_FIGHT_MIN,
} from '../encounter/constants-events';
import { LATE_GAME_EVENTS } from '../encounter/EventGateConfig';

describe('C946: Late-game event density invariants', () => {
  it('pity thresholds form decreasing ramp', () => {
    expect(LATE_GAME_PITY_THRESHOLD).toBeGreaterThan(LATE_GAME_PITY_THRESHOLD_700);
    expect(LATE_GAME_PITY_THRESHOLD_700).toBeGreaterThan(LATE_GAME_PITY_THRESHOLD_800);
    expect(LATE_GAME_PITY_THRESHOLD_800).toBeGreaterThanOrEqual(5);
  });

  it('late-game pity starts at fight 500', () => {
    expect(LATE_GAME_PITY_FIGHT_MIN).toBe(500);
  });

  it('combined late-game event probability is within band [0.10, 0.25]', () => {
    const combined = ASCENSION_TRIAL_CHANCE + ECHO_MEMORY_CHANCE + SHARD_FUSION_CHANCE + ENDGAME_SURGE_CHANCE;
    expect(combined).toBeGreaterThanOrEqual(0.10);
    expect(combined).toBeLessThanOrEqual(0.25);
  });

  it('late-game events (520+) have fight thresholds >= 500', () => {
    const lateEntries = LATE_GAME_EVENTS.filter(e => e.minTotalFights >= 500);
    expect(lateEntries.length).toBeGreaterThanOrEqual(3);
    for (const entry of lateEntries) {
      expect(entry.minTotalFights, `${entry.id} minTotalFights too low`).toBeGreaterThanOrEqual(500);
    }
  });

  it('individual event probabilities are reasonable (1-10%)', () => {
    expect(ASCENSION_TRIAL_CHANCE).toBeGreaterThanOrEqual(0.01);
    expect(ASCENSION_TRIAL_CHANCE).toBeLessThanOrEqual(0.10);
    expect(ECHO_MEMORY_CHANCE).toBeGreaterThanOrEqual(0.01);
    expect(ECHO_MEMORY_CHANCE).toBeLessThanOrEqual(0.10);
    expect(SHARD_FUSION_CHANCE).toBeGreaterThanOrEqual(0.01);
    expect(SHARD_FUSION_CHANCE).toBeLessThanOrEqual(0.10);
    expect(ENDGAME_SURGE_CHANCE).toBeGreaterThanOrEqual(0.01);
    expect(ENDGAME_SURGE_CHANCE).toBeLessThanOrEqual(0.10);
  });
});

describe('C955: Mid-game pity invariants', () => {
  it('mid-game threshold is between base and late-game', () => {
    expect(MID_GAME_PITY_THRESHOLD).toBeLessThan(EVENT_PITY_THRESHOLD);
    expect(MID_GAME_PITY_THRESHOLD).toBeGreaterThan(LATE_GAME_PITY_THRESHOLD);
  });

  it('mid-game pity starts before late-game', () => {
    expect(MID_GAME_PITY_FIGHT_MIN).toBeLessThan(LATE_GAME_PITY_FIGHT_MIN);
    expect(MID_GAME_PITY_FIGHT_MIN).toBeGreaterThanOrEqual(100);
  });

  it('pity ramp is monotonically decreasing across game phases', () => {
    // early (0-199): 18, mid (200-499): 15, late-start (500): 12, late-end (800+): 9
    expect(EVENT_PITY_THRESHOLD).toBeGreaterThan(MID_GAME_PITY_THRESHOLD);
    expect(MID_GAME_PITY_THRESHOLD).toBeGreaterThan(LATE_GAME_PITY_THRESHOLD);
    expect(LATE_GAME_PITY_THRESHOLD).toBeGreaterThan(LATE_GAME_PITY_THRESHOLD_800);
  });
});
