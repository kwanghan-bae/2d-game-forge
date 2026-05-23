import { describe, expect, it } from 'vitest';
import type { NpcEntity } from '../../types';
import type { PersonalityState } from '../../hero/PersonalityState';
import { computeNpcOutcome } from '../NpcInteraction';

function npc(kind: NpcEntity['kind']): NpcEntity {
  return {
    instanceId: 'n1', kind, nameKR: 'X', emoji: '🗡️',
    age: 30, ageRate: 1.0, isAlive: true, bornChapter: '어린시절',
    relationship: 50, zoneRealmId: 'base',
  };
}

function pers(overrides: Partial<PersonalityState>): PersonalityState {
  return {
    moral: 0, prudent: 0, heroic: 0, merciful: 0, pious: 0,
    ...overrides,
  } as PersonalityState;
}

describe('computeNpcOutcome', () => {
  it('rival + heroic high → 결투 (combat)', () => {
    const r = computeNpcOutcome(npc('rival'), pers({ heroic: 5 }));
    expect(r.outcome).toBe('duel');
  });
  it('rival + prudent high → 회피', () => {
    const r = computeNpcOutcome(npc('rival'), pers({ prudent: 5 }));
    expect(r.outcome).toBe('evade');
  });
  it('mentor + pious high → 스킬 전수', () => {
    const r = computeNpcOutcome(npc('mentor'), pers({ pious: 5 }));
    expect(r.outcome).toBe('skill_taught');
  });
  it('friend → talk by default', () => {
    const r = computeNpcOutcome(npc('friend'), pers({}));
    expect(['talk','help']).toContain(r.outcome);
  });
  it('returns relationship delta', () => {
    const r = computeNpcOutcome(npc('friend'), pers({ merciful: 3 }));
    expect(typeof r.relationshipDelta).toBe('number');
  });
});
