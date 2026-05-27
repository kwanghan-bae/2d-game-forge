// Cycle 132 — achievementsSelectors pure helpers unit test.

import { describe, expect, it } from 'vitest';
import { getClaimableIds, getClaimableCount } from '../achievementsSelectors';
import { INITIAL_ACHIEVEMENTS } from '../achievementsTypes';
import type { AchievementsState, AchievementId } from '../achievementsTypes';

const NOW = 1_700_000_000_000;

function makeState(overrides: Partial<Record<AchievementId, { completed?: boolean; claimedAt?: number }>>): AchievementsState {
  const byId = { ...INITIAL_ACHIEVEMENTS.byId };
  for (const [id, patch] of Object.entries(overrides)) {
    const aid = id as AchievementId;
    byId[aid] = {
      ...byId[aid],
      completed: patch?.completed ?? false,
      ...(patch?.claimedAt !== undefined ? { claimedAt: patch.claimedAt } : {}),
      ...(patch?.completed ? { completedAt: NOW } : {}),
    };
  }
  return { ...INITIAL_ACHIEVEMENTS, byId };
}

describe('Cycle 132 — achievementsSelectors', () => {
  it('초기 state — claimable 0', () => {
    expect(getClaimableIds(INITIAL_ACHIEVEMENTS)).toEqual([]);
    expect(getClaimableCount(INITIAL_ACHIEVEMENTS)).toBe(0);
  });

  it('1 completed && !claimedAt → claimable 1', () => {
    const state = makeState({ 'realm-conquest-6': { completed: true } });
    expect(getClaimableIds(state)).toEqual(['realm-conquest-6']);
    expect(getClaimableCount(state)).toBe(1);
  });

  it('3 completed (모두 !claimedAt) → claimable 3, 카탈로그 순서 보존', () => {
    const state = makeState({
      'lv-10m-in-3-cycles': { completed: true },
      'realm-conquest-6': { completed: true },
      'aging-master-10': { completed: true },
    });
    expect(getClaimableIds(state)).toEqual([
      'lv-10m-in-3-cycles',
      'realm-conquest-6',
      'aging-master-10',
    ]);
    expect(getClaimableCount(state)).toBe(3);
  });

  it('5 completed 중 2 already-claimed → claimable 3', () => {
    const state = makeState({
      'lv-10m-in-3-cycles': { completed: true, claimedAt: NOW },
      'npc-collect-4-uniques': { completed: true },
      'realm-conquest-6': { completed: true, claimedAt: NOW + 1 },
      'aging-master-10': { completed: true },
      'inflation-flash-100x': { completed: true },
    });
    expect(getClaimableIds(state)).toEqual([
      'npc-collect-4-uniques',
      'aging-master-10',
      'inflation-flash-100x',
    ]);
    expect(getClaimableCount(state)).toBe(3);
  });

  it('5 completed 모두 claimed → claimable 0', () => {
    const state = makeState({
      'lv-10m-in-3-cycles': { completed: true, claimedAt: NOW },
      'npc-collect-4-uniques': { completed: true, claimedAt: NOW },
      'realm-conquest-6': { completed: true, claimedAt: NOW },
      'aging-master-10': { completed: true, claimedAt: NOW },
      'inflation-flash-100x': { completed: true, claimedAt: NOW },
    });
    expect(getClaimableIds(state)).toEqual([]);
    expect(getClaimableCount(state)).toBe(0);
  });
});
