import { describe, expect, it } from 'vitest';
import type { NpcEntity } from '../../types';
import type { PersonalitySnapshot } from '../../hero/PersonalityState';
import { computeNpcOutcome } from '../NpcInteraction';

function npc(kind: NpcEntity['kind']): NpcEntity {
  return {
    instanceId: 'n1', kind, nameKR: 'X', emoji: '🗡️',
    age: 30, ageRate: 1.0, isAlive: true, bornChapter: '어린시절',
    relationship: 50, zoneRealmId: 'base',
  };
}

function pers(overrides: Partial<PersonalitySnapshot>): PersonalitySnapshot {
  return {
    moral: 0, prudent: 0, heroic: 0, merciful: 0, pious: 0,
    ...overrides,
  };
}

function npcNamed(kind: NpcEntity['kind'], nameKR: string): NpcEntity {
  return { ...npc(kind), nameKR };
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

  /* ─────────────────── Cycle 4 A2 — josa 받침 회귀 가드 ─────────────────── */
  describe('Cycle 4 A2: narrative 조사 (josa) 받침 유무 자동 처리', () => {
    it("rival 받침 없음 (폭풍) + heroic → '폭풍과 결투했다'", () => {
      const r = computeNpcOutcome(npcNamed('rival', '폭풍'), pers({ heroic: 5 }));
      expect(r.narrativeKR).toBe('폭풍과 결투했다');
    });
    it("rival 받침 있음 (잿불) + heroic → '잿불과 결투했다'", () => {
      const r = computeNpcOutcome(npcNamed('rival', '잿불'), pers({ heroic: 5 }));
      expect(r.narrativeKR).toBe('잿불과 결투했다');
    });
    it("rival 받침 없음 (북풍) + merciful → '북풍과 잠시 협력했다'", () => {
      const r = computeNpcOutcome(npcNamed('rival', '북풍'), pers({ merciful: 5 }));
      expect(r.narrativeKR).toBe('북풍과 잠시 협력했다');
    });
    it("rival 받침 없음 (검은별) + prudent → '검은별을 회피했다'", () => {
      const r = computeNpcOutcome(npcNamed('rival', '검은별'), pers({ prudent: 5 }));
      // 별 (ㄹ 받침) → '을'
      expect(r.narrativeKR).toBe('검은별을 회피했다');
    });
    it("mentor 받침 없음 (지혜) + pious → '지혜가 새 기술을 전수했다'", () => {
      const r = computeNpcOutcome(npcNamed('mentor', '지혜'), pers({ pious: 5 }));
      expect(r.narrativeKR).toBe('지혜가 새 기술을 전수했다');
    });
    it("mentor 받침 있음 (스승) → '스승과 잠시 대화했다'", () => {
      const r = computeNpcOutcome(npcNamed('mentor', '스승'), pers({}));
      expect(r.narrativeKR).toBe('스승과 잠시 대화했다');
    });
  });
});
