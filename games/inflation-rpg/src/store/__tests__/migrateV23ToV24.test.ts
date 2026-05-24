import { describe, expect, it } from 'vitest';
import { migrateV23ToV24, runStoreMigration } from '../gameStore';

// Cycle-7 S1 — sagaHistory stale 5세 entry retroactive cleanup.
//
// 4-AND 조건: eventCount === 0 AND finalAge ≤ 5 AND deathCause === '자연사'
// AND finalLevel ≤ 1. 한 조건이라도 미충족이면 보존. 조건이 매우 엄격해서
// false positive risk 거의 0 (정상 entry — 예: 운 좋은 levelUp 1 회로
// finalLevel 2 — 는 보존).

type SagaEv = { age: number; type: string; narrativeText: string; payload: Record<string, unknown> };
type StaleEntry = {
  cycleId: string;
  endedAtMs: number;
  hero: {
    name: string;
    seed: number;
    finalAge: number;
    finalJob: string;
    finalLevel: number;
    finalPersonality: { moral: number; prudent: number; heroic: number; merciful: number; pious: number };
    cause: string;
  };
  chapters: { name: string; events: SagaEv[] }[];
  highlightEvents: SagaEv[];
};

// Legacy v23 stale shape: Cycle 6 P1 의 flat snapshot field 가 적용되기
// 전이므로 nested `hero.*` 만 존재한다.
function staleEntry(cycleId: string): StaleEntry {
  return {
    cycleId,
    endedAtMs: 1000,
    hero: {
      name: 'h',
      seed: 1,
      finalAge: 5,
      finalJob: '평민',
      finalLevel: 1,
      finalPersonality: { moral: 0, prudent: 0, heroic: 0, merciful: 0, pious: 0 },
      cause: '자연사',
    },
    chapters: [
      { name: '어린시절', events: [] },
      { name: '청년기', events: [] },
      { name: '장년기', events: [] },
      { name: '노년기', events: [] },
      { name: '마지막', events: [] },
    ],
    highlightEvents: [],
  };
}

// Normal entry: flat snapshot field 포함된 새 finalize() 산출.
function normalEntry(cycleId: string) {
  return {
    cycleId,
    endedAtMs: 2000,
    hero: {
      name: 'h2',
      seed: 2,
      finalAge: 38,
      finalJob: '용사',
      finalLevel: 42,
      finalPersonality: { moral: 1, prudent: 2, heroic: 3, merciful: 0, pious: 1 },
      cause: '전사' as const,
    },
    chapters: [
      { name: '어린시절', events: [{ age: 1, type: 'birth', narrativeText: '태어남', payload: {} }] },
      { name: '청년기', events: [] },
      { name: '장년기', events: [] },
      { name: '노년기', events: [] },
      { name: '마지막', events: [] },
    ],
    highlightEvents: [],
    finalLevel: 42,
    finalAge: 38,
    finalRealm: 'sea',
    deathCause: '전사' as const,
    finishedAt: 2000,
  };
}

describe('migrateV23ToV24 — stale sagaHistory cleanup', () => {
  it('Case 1: 3 stale entries + 1 normal — normal 1만 남음', () => {
    const v23 = {
      meta: {
        sagaHistory: [
          staleEntry('cyc_stale_1'),
          staleEntry('cyc_stale_2'),
          staleEntry('cyc_stale_3'),
          normalEntry('cyc_normal_1'),
        ],
      },
    };
    const r = migrateV23ToV24(v23) as { meta: { sagaHistory: Array<{ cycleId: string }> } };
    expect(r.meta.sagaHistory.length).toBe(1);
    expect(r.meta.sagaHistory[0]!.cycleId).toBe('cyc_normal_1');
  });

  it('Case 2: eventCount > 0 (chapters 에 event 1 개) 면 stale 조건 미충족 → 보존', () => {
    const entry = staleEntry('cyc_with_event');
    entry.chapters[0]!.events.push({ age: 2, type: 'levelUp', narrativeText: 'LV up', payload: {} });
    const v23 = { meta: { sagaHistory: [entry] } };
    const r = migrateV23ToV24(v23) as { meta: { sagaHistory: unknown[] } };
    expect(r.meta.sagaHistory.length).toBe(1);
  });

  it('Case 2-b: highlightEvents 1 개여도 stale 조건 미충족 → 보존', () => {
    const entry = staleEntry('cyc_with_highlight');
    entry.highlightEvents.push({ age: 1, type: 'death', narrativeText: 'd', payload: {} });
    const v23 = { meta: { sagaHistory: [entry] } };
    const r = migrateV23ToV24(v23) as { meta: { sagaHistory: unknown[] } };
    expect(r.meta.sagaHistory.length).toBe(1);
  });

  it('Case 3: finalAge > 5 면 stale 조건 미충족 → 보존', () => {
    const entry = staleEntry('cyc_age_6');
    entry.hero.finalAge = 6;
    const v23 = { meta: { sagaHistory: [entry] } };
    const r = migrateV23ToV24(v23) as { meta: { sagaHistory: unknown[] } };
    expect(r.meta.sagaHistory.length).toBe(1);
  });

  it('Case 3-b: finalLevel > 1 면 stale 조건 미충족 → 보존 (PRD intent — 운 좋은 levelUp 1 회 보존)', () => {
    const entry = staleEntry('cyc_level_2');
    entry.hero.finalLevel = 2;
    const v23 = { meta: { sagaHistory: [entry] } };
    const r = migrateV23ToV24(v23) as { meta: { sagaHistory: unknown[] } };
    expect(r.meta.sagaHistory.length).toBe(1);
  });

  it('Case 3-c: deathCause ≠ 자연사 면 stale 조건 미충족 → 보존', () => {
    const entry = staleEntry('cyc_killed');
    entry.hero.cause = '전사';
    const v23 = { meta: { sagaHistory: [entry] } };
    const r = migrateV23ToV24(v23) as { meta: { sagaHistory: unknown[] } };
    expect(r.meta.sagaHistory.length).toBe(1);
  });

  it('Case 4: 빈 sagaHistory[] 는 빈 그대로', () => {
    const v23 = { meta: { sagaHistory: [] } };
    const r = migrateV23ToV24(v23) as { meta: { sagaHistory: unknown[] } };
    expect(r.meta.sagaHistory).toEqual([]);
  });

  it('Case 5: 정상 v24 state hydrate (idempotent — 변경 없음)', () => {
    const v24 = { meta: { sagaHistory: [normalEntry('cyc_n1'), normalEntry('cyc_n2')] } };
    const r = migrateV23ToV24(v24) as { meta: { sagaHistory: unknown[] } };
    expect(r.meta.sagaHistory.length).toBe(2);
  });

  it('defensive: meta 없으면 통과', () => {
    expect(migrateV23ToV24({})).toEqual({});
  });

  it('defensive: sagaHistory 가 array 아니면 통과', () => {
    const v23 = { meta: { sagaHistory: null } };
    const r = migrateV23ToV24(v23) as { meta: { sagaHistory: unknown } };
    expect(r.meta.sagaHistory).toBe(null);
  });

  it('defensive: 비정상 shape (chapters undefined, hero missing) 는 stale 조건 미충족으로 보존', () => {
    const v23 = {
      meta: { sagaHistory: [{ cycleId: 'malformed' /* no hero, no chapters */ }] },
    };
    const r = migrateV23ToV24(v23) as { meta: { sagaHistory: unknown[] } };
    expect(r.meta.sagaHistory.length).toBe(1);
  });

  it('defensive: null/non-object passthrough', () => {
    expect(migrateV23ToV24(null)).toBe(null);
    expect(migrateV23ToV24(42)).toBe(42);
  });
});

describe('runStoreMigration v22 → v23 → v24 chain', () => {
  it('가짜 v22 state + stale sagaHistory[] — chain 후 currentRealmId=base AND stale 삭제', () => {
    const v22 = {
      meta: {
        sagaHistory: [
          staleEntry('cyc_v22_stale'),
          normalEntry('cyc_v22_normal'),
        ],
      },
      run: { currentRealmId: 'sea', npcs: [], level: 1 },
    };
    // fromVersion=22 → 22→23 (currentRealmId reset) → 23→24 (stale purge) 둘 다 실행.
    const r = runStoreMigration(v22, 22) as {
      meta: { sagaHistory: Array<{ cycleId: string }> };
      run: { currentRealmId: string };
    };
    expect(r.run.currentRealmId).toBe('base');
    expect(r.meta.sagaHistory.length).toBe(1);
    expect(r.meta.sagaHistory[0]!.cycleId).toBe('cyc_v22_normal');
  });

  it('idempotency: 이미 v24 state 를 fromVersion=24 로 재실행해도 변화 없음', () => {
    const v24 = {
      meta: { sagaHistory: [normalEntry('cyc_n1')] },
      run: { currentRealmId: 'base', npcs: [] },
    };
    const r = runStoreMigration(v24, 24) as { meta: { sagaHistory: unknown[] } };
    expect(r.meta.sagaHistory.length).toBe(1);
  });
});
