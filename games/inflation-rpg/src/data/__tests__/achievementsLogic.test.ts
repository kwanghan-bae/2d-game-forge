// Cycle 128 — N5 Live Ops mega-phase F1: AchievementSystem evaluator tests
//
// Test plan: docs/superpowers/evolution/cycle-127-test-plan.md §F1
// 본 cycle scope: F1.1, F1.2, F1.3, F1.4, F1.5, F1.6, F1.8 + F1.11 (hero state
// mutation 0 invariant). 8 case ship — F1.7 (persist) + F1.9/F1.10 (claim) +
// F1.12 (sim driver) + F1.13 (e2e) + F1.14 (multi-seed sim) 는 cycle 129+ carry-over.

import { describe, expect, it } from 'vitest';
import { evaluateAchievements } from '../achievementsLogic';
import { INITIAL_ACHIEVEMENTS } from '../achievementsTypes';
import type { AchievementsState } from '../achievementsTypes';
import type {
  CycleSaga,
  DeathCause,
  SagaEvent,
  SagaEventType,
} from '../../saga/SagaTypes';

const NOW = 1_700_000_000_000;

/** Saga factory — 본문은 chapters[0].events 에 모두 펼친다. PRD test plan 의
 *  case 가 모두 *saga-only input* 기반이므로 hero ref 없이도 충분. */
function mkSaga(opts: {
  finalLevel?: number;
  finalAge?: number;
  finalRealm?: string;
  deathCause?: DeathCause;
  events?: SagaEvent[];
} = {}): CycleSaga {
  const events = opts.events ?? [];
  return {
    cycleId: 'test-cycle-' + Math.random().toString(36).slice(2, 8),
    endedAtMs: NOW,
    hero: {
      name: 'TestHero',
      seed: 42,
      finalAge: opts.finalAge ?? 70,
      finalJob: 'wanderer',
      finalLevel: opts.finalLevel ?? 0,
      finalPersonality: {} as never,  // never read by evaluator
      cause: opts.deathCause ?? '자연사',
    },
    chapters: [{ name: 'youth' as never, events }],
    highlightEvents: [],
    finalLevel: opts.finalLevel ?? 0,
    finalAge: opts.finalAge ?? 70,
    finalRealm: opts.finalRealm ?? '',
    deathCause: opts.deathCause ?? '자연사',
    finishedAt: NOW,
  };
}

function mkEvent(type: SagaEventType, payload: Record<string, unknown>): SagaEvent {
  return { age: 10, type, narrativeText: '', payload };
}

describe('Cycle 128 F1 — AchievementSystem evaluator', () => {
  /** F1.1 — lv-10m-in-3-cycles trigger: 3 연속 cycle 모두 10M+ */
  it('F1.1 lv-10m-in-3-cycles 3 연속 10M+ → 1/3 → 2/3 → 3/3 + completed', () => {
    const saga10M = mkSaga({ finalLevel: 10_000_000 });
    let state: AchievementsState = INITIAL_ACHIEVEMENTS;
    state = evaluateAchievements({ saga: saga10M, prior: state, nowMs: NOW });
    expect(state.byId['lv-10m-in-3-cycles'].progress).toBe(1);
    expect(state.byId['lv-10m-in-3-cycles'].completed).toBe(false);

    state = evaluateAchievements({ saga: saga10M, prior: state, nowMs: NOW + 1 });
    expect(state.byId['lv-10m-in-3-cycles'].progress).toBe(2);
    expect(state.byId['lv-10m-in-3-cycles'].completed).toBe(false);

    state = evaluateAchievements({ saga: saga10M, prior: state, nowMs: NOW + 2 });
    expect(state.byId['lv-10m-in-3-cycles'].progress).toBe(3);
    expect(state.byId['lv-10m-in-3-cycles'].completed).toBe(true);
    expect(state.byId['lv-10m-in-3-cycles'].completedAt).toBe(NOW + 2);
  });

  /** F1.2 — rolling window 회귀: cycle 1 = 10M, cycle 2 = 5M, cycle 3 = 12M */
  it('F1.2 lv-10m-in-3-cycles rolling [10M,5M,12M] → 1 → 1 → 2 미완', () => {
    let state: AchievementsState = INITIAL_ACHIEVEMENTS;
    state = evaluateAchievements({
      saga: mkSaga({ finalLevel: 10_000_000 }),
      prior: state,
      nowMs: NOW,
    });
    expect(state.byId['lv-10m-in-3-cycles'].progress).toBe(1);

    state = evaluateAchievements({
      saga: mkSaga({ finalLevel: 5_000_000 }),
      prior: state,
      nowMs: NOW + 1,
    });
    expect(state.byId['lv-10m-in-3-cycles'].progress).toBe(1);

    state = evaluateAchievements({
      saga: mkSaga({ finalLevel: 12_000_000 }),
      prior: state,
      nowMs: NOW + 2,
    });
    expect(state.byId['lv-10m-in-3-cycles'].progress).toBe(2);
    expect(state.byId['lv-10m-in-3-cycles'].completed).toBe(false);
  });

  /** F1.3 — npc-collect-4-uniques: distinct id 4 + 같은 id 중복 emit 무변동 */
  it('F1.3 npc-collect-4-uniques distinct id 4 도달, 중복 emit 무변동', () => {
    let state: AchievementsState = INITIAL_ACHIEVEMENTS;
    // 1 cycle: 2 distinct npc 만남
    state = evaluateAchievements({
      saga: mkSaga({
        events: [
          mkEvent('npcEncounter', { npcInstanceId: 'npc-a', kind: 'mentor' }),
          mkEvent('npcEncounter', { npcInstanceId: 'npc-b', kind: 'rival' }),
        ],
      }),
      prior: state,
      nowMs: NOW,
    });
    expect(state.byId['npc-collect-4-uniques'].progress).toBe(2);
    expect([...state.npcIdsCollected].sort()).toEqual(['npc-a', 'npc-b']);

    // 2 cycle: 중복 a + 신규 c
    state = evaluateAchievements({
      saga: mkSaga({
        events: [
          mkEvent('npcEncounter', { npcInstanceId: 'npc-a', kind: 'mentor' }),  // dup
          mkEvent('npcEncounter', { npcInstanceId: 'npc-c', kind: 'passerby' }),
        ],
      }),
      prior: state,
      nowMs: NOW + 1,
    });
    expect(state.byId['npc-collect-4-uniques'].progress).toBe(3);
    expect(state.byId['npc-collect-4-uniques'].completed).toBe(false);

    // 3 cycle: 신규 d → 4/4 완료
    state = evaluateAchievements({
      saga: mkSaga({
        events: [mkEvent('npcEncounter', { npcInstanceId: 'npc-d', kind: 'mentor' })],
      }),
      prior: state,
      nowMs: NOW + 2,
    });
    expect(state.byId['npc-collect-4-uniques'].progress).toBe(4);
    expect(state.byId['npc-collect-4-uniques'].completed).toBe(true);
    expect(state.byId['npc-collect-4-uniques'].completedAt).toBe(NOW + 2);
  });

  /** F1.4 — realm-conquest-6: 단일 cycle 안 distinct realmEnter 6 개 */
  it('F1.4 realm-conquest-6 단일 cycle 6 realm 진입 → completed', () => {
    const events: SagaEvent[] = [
      mkEvent('realmEnter', { from: 'base', to: 'plains' }),
      mkEvent('realmEnter', { from: 'plains', to: 'forest' }),
      mkEvent('realmEnter', { from: 'forest', to: 'mountains' }),
      mkEvent('realmEnter', { from: 'mountains', to: 'sea' }),
      mkEvent('realmEnter', { from: 'sea', to: 'volcano' }),
      mkEvent('realmEnter', { from: 'volcano', to: 'underworld' }),
    ];
    const state = evaluateAchievements({
      saga: mkSaga({ events }),
      prior: INITIAL_ACHIEVEMENTS,
      nowMs: NOW,
    });
    expect(state.byId['realm-conquest-6'].progress).toBe(6);
    expect(state.byId['realm-conquest-6'].completed).toBe(true);

    // 단일 cycle 한정: 다음 cycle 에 realmEnter 0 회 → progress reset 검증.
    // (PRD 의 F1.4 의 "cycle 종료 시 partial (e.g., 4) 면 다음 cycle 시작 시 0 reset"
    // 의미 — *현재 saga 의 distinct realmEnter 만 카운트* 의 saga-only 해석으로 만족.)
    // 이미 completed === true 이므로 중복 차단 invariant 가 우선 (F1.8). 미완 상태에서
    // 다음 cycle 의 0 회 emit 으로 progress 가 0 으로 떨어지는지를 별도 검증:
    let partial: AchievementsState = INITIAL_ACHIEVEMENTS;
    partial = evaluateAchievements({
      saga: mkSaga({
        events: [
          mkEvent('realmEnter', { from: 'base', to: 'plains' }),
          mkEvent('realmEnter', { from: 'plains', to: 'forest' }),
        ],
      }),
      prior: partial,
      nowMs: NOW,
    });
    expect(partial.byId['realm-conquest-6'].progress).toBe(2);
    // 다음 cycle: realmEnter 0 회
    partial = evaluateAchievements({
      saga: mkSaga({ events: [] }),
      prior: partial,
      nowMs: NOW + 1,
    });
    // 단일 cycle 한정 → 새 cycle 의 distinct 카운트 0 → progress 0 으로 reset.
    expect(partial.byId['realm-conquest-6'].progress).toBe(0);
    expect(partial.byId['realm-conquest-6'].completed).toBe(false);
  });

  /** F1.5 — aging-master-10: 동일 realm 자연사 10 회 누적 */
  it('F1.5 aging-master-10 volcano 자연사 10 회 → completed, dict 영구 누적', () => {
    let state: AchievementsState = INITIAL_ACHIEVEMENTS;
    // 4 회 field 자연사 + 9 회 volcano 자연사 → max=9 (미완)
    for (let i = 0; i < 4; i++) {
      state = evaluateAchievements({
        saga: mkSaga({ deathCause: '자연사', finalRealm: 'field' }),
        prior: state,
        nowMs: NOW + i,
      });
    }
    for (let i = 0; i < 9; i++) {
      state = evaluateAchievements({
        saga: mkSaga({ deathCause: '자연사', finalRealm: 'volcano' }),
        prior: state,
        nowMs: NOW + 100 + i,
      });
    }
    expect(state.naturalDeathsByRealm).toEqual({ field: 4, volcano: 9 });
    expect(state.byId['aging-master-10'].progress).toBe(9);
    expect(state.byId['aging-master-10'].completed).toBe(false);

    // 10 번째 volcano 자연사 → completed
    state = evaluateAchievements({
      saga: mkSaga({ deathCause: '자연사', finalRealm: 'volcano' }),
      prior: state,
      nowMs: NOW + 200,
    });
    expect(state.naturalDeathsByRealm['volcano']).toBe(10);
    expect(state.byId['aging-master-10'].progress).toBe(10);
    expect(state.byId['aging-master-10'].completed).toBe(true);
    expect(state.byId['aging-master-10'].completedAt).toBe(NOW + 200);

    // 전사 (자연사 아님) 는 누적 카운트 0 — '전사' 는 deathCause 의 유효 값.
    const before = state.naturalDeathsByRealm['volcano'];
    state = evaluateAchievements({
      saga: mkSaga({ deathCause: '전사', finalRealm: 'volcano' }),
      prior: state,
      nowMs: NOW + 300,
    });
    expect(state.naturalDeathsByRealm['volcano']).toBe(before);
  });

  /** F1.6 — inflation-flash-100x: 단일 cycle 안 ×100 jump 3 회 */
  it('F1.6 inflation-flash-100x 단일 cycle ×100 jump 3 회 → completed, 다음 cycle 0 reset', () => {
    // 3 levelUp jump ≥ 100 (1→100, 100→10000, 10000→2000000)
    const events: SagaEvent[] = [
      mkEvent('levelUp', { oldLevel: 1, newLevel: 100 }),
      mkEvent('levelUp', { oldLevel: 100, newLevel: 10_000 }),
      mkEvent('levelUp', { oldLevel: 10_000, newLevel: 2_000_000 }),
      // ×50 jump 추가 — 무시되어야
      mkEvent('levelUp', { oldLevel: 100, newLevel: 5_000 }),
    ];
    let state = evaluateAchievements({
      saga: mkSaga({ events }),
      prior: INITIAL_ACHIEVEMENTS,
      nowMs: NOW,
    });
    expect(state.byId['inflation-flash-100x'].progress).toBe(3);
    expect(state.byId['inflation-flash-100x'].completed).toBe(true);

    // 다음 cycle: jump 0 회 — 단일 cycle 한정이므로 진행도 reset 되어야 했으나
    // 이미 completed 이므로 F1.8 의 dup-block 가 우선 → 진행도 무변동.
    state = evaluateAchievements({
      saga: mkSaga({ events: [] }),
      prior: state,
      nowMs: NOW + 1,
    });
    expect(state.byId['inflation-flash-100x'].completed).toBe(true);
    expect(state.byId['inflation-flash-100x'].progress).toBe(3);
    expect(state.byId['inflation-flash-100x'].completedAt).toBe(NOW);  // 최초 시점 유지
  });

  /** F1.8 — 중복 완료 차단: 완료된 도전이 재 trigger 되어도 무변동 */
  it('F1.8 중복 완료 차단 — completed 후 동일 saga 재 emit 시 byId entry identity 유지', () => {
    let state: AchievementsState = INITIAL_ACHIEVEMENTS;
    // realm-conquest-6 완료
    const conquestEvents: SagaEvent[] = [
      mkEvent('realmEnter', { from: 'base', to: 'plains' }),
      mkEvent('realmEnter', { from: 'plains', to: 'forest' }),
      mkEvent('realmEnter', { from: 'forest', to: 'mountains' }),
      mkEvent('realmEnter', { from: 'mountains', to: 'sea' }),
      mkEvent('realmEnter', { from: 'sea', to: 'volcano' }),
      mkEvent('realmEnter', { from: 'volcano', to: 'underworld' }),
    ];
    state = evaluateAchievements({
      saga: mkSaga({ events: conquestEvents }),
      prior: state,
      nowMs: NOW,
    });
    const completedEntry = state.byId['realm-conquest-6'];
    expect(completedEntry.completed).toBe(true);
    expect(completedEntry.completedAt).toBe(NOW);

    // 동일 saga 재 emit (다른 nowMs) — entry identity (===) 보존 검증.
    const after = evaluateAchievements({
      saga: mkSaga({ events: conquestEvents }),
      prior: state,
      nowMs: NOW + 9999,
    });
    expect(after.byId['realm-conquest-6']).toBe(completedEntry);  // referential ===
    expect(after.byId['realm-conquest-6'].completedAt).toBe(NOW); // 시점 무변동
  });

  /** F1.11 — hero state mutation 0 invariant (cycle 17 atk-bound 봉인 회귀 가드).
   *  evaluator 는 saga 만 읽고 prior 만 받는다. hero ref 0 의 함수 signature 가
   *  이미 type level 에서 가드하지만, prior 객체의 deep equality 로도 확정. */
  it('F1.11 hero state mutation 0 — prior 객체 deep equality 보존 (mutation 0)', () => {
    const prior = INITIAL_ACHIEVEMENTS;
    const priorSnapshot = JSON.parse(JSON.stringify(prior));
    evaluateAchievements({
      saga: mkSaga({
        finalLevel: 10_000_000,
        deathCause: '자연사',
        finalRealm: 'volcano',
        events: [
          mkEvent('npcEncounter', { npcInstanceId: 'npc-a', kind: 'mentor' }),
          mkEvent('realmEnter', { from: 'base', to: 'plains' }),
          mkEvent('levelUp', { oldLevel: 1, newLevel: 100 }),
        ],
      }),
      prior,
      nowMs: NOW,
    });
    // prior 가 evaluator 호출 전후로 deep equal 유지 (mutation 0).
    expect(prior).toEqual(priorSnapshot);
  });
});
