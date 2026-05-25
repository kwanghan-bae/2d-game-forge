// Cycle 128 — N5 Live Ops mega-phase F1: AchievementSystem pure evaluator
//
// PRD: docs/superpowers/evolution/cycle-125-prd.md §F1
// Test plan: docs/superpowers/evolution/cycle-127-test-plan.md §F1 (F1.1~F1.6, F1.8)
// Advisor: rolling window 해석, side-channel aux state, saga-only input,
//          claim 스킵 (cycle 129 carry-over), gameStore wiring 스킵.
//
// 핵심 invariant:
// - hero state mutation 0: evaluator 는 saga 의 finalLevel / finalAge / deathCause /
//   finalRealm / chapters[].events 만 읽는다. hero ref 0 (F1.11 회귀 가드).
// - prior mutation 0: 새 객체 반환. spread/copy.
// - 중복 완료 차단: 이미 completed === true 인 entry 는 evaluator 가 손대지 않음
//   (F1.8 invariant).
// - nowMs 주입: Date.now 직접 호출 0 (test mock 가능).
// - Side-channel aux: last3MaxLevels (rolling window) / npcIdsCollected (distinct set
//   as array) / naturalDeathsByRealm (dict). progress: number 만 byId 에 두고 풍부한
//   데이터는 outer level (advisor §Gap 1 권고).

import type { CycleSaga, SagaEvent } from '../saga/SagaTypes';
import type {
  AchievementEvaluatorInput,
  AchievementId,
  AchievementProgress,
  AchievementsState,
} from './achievementsTypes';

const LV_10M_THRESHOLD = 10_000_000;
const LV_10M_WINDOW = 3;
const NPC_UNIQUE_TARGET = 4;
const REALM_CONQUEST_TARGET = 6;
const AGING_MASTER_TARGET = 10;
const FLASH_JUMP_RATIO = 100;
const FLASH_JUMP_TARGET = 3;

/** 사가의 모든 chapter 의 event 를 flat 으로 펼치는 helper.
 *  highlightEvents 는 dedupe 정책상 chapters 의 subset 이므로 중복 카운트 회피
 *  — chapters 만 읽는다. */
function flattenSagaEvents(saga: CycleSaga): readonly SagaEvent[] {
  const out: SagaEvent[] = [];
  for (const chap of saga.chapters) {
    for (const ev of chap.events) {
      out.push(ev);
    }
  }
  return out;
}

/** evaluator entry — pure, prior 무변동, 새 state 반환.
 *
 *  cycleSliceV2.endCycle 의 hook 으로 cycle 종료 직후 호출 (cycle 129 wire 예정).
 *  현 cycle 128 = 함수 정의만, store 호출처 wire 는 carry-over.
 */
export function evaluateAchievements(
  input: AchievementEvaluatorInput,
): AchievementsState {
  const { saga, prior, nowMs } = input;
  const events = flattenSagaEvents(saga);

  // ─── 1. lv-10m-in-3-cycles (rolling window) ───────────────────────────
  // advisor §Gap 2 의 해석: last3MaxLevels = FIFO 최근 3 cycle 의 maxLevel 값.
  // progress = window 안에서 ≥ 10M 인 카운트. count === 3 → completed.
  //
  // F1.1: [10M], [10M,10M], [10M,10M,10M] → 1, 2, 3 ✓ (3/3 완료)
  // F1.2: [10M], [10M,5M], [10M,5M,12M] → 1, 1, 2 ✓ (미완)
  const finalLevel = saga.finalLevel ?? saga.hero.finalLevel ?? 0;
  const nextWindow = [...prior.last3MaxLevels, finalLevel].slice(-LV_10M_WINDOW);
  const lvCount = nextWindow.filter(lv => lv >= LV_10M_THRESHOLD).length;

  // ─── 2. npc-collect-4-uniques (cycle 간 누적 distinct set) ────────────
  // saga.chapters[].events 의 npcEncounter 의 payload.npcInstanceId 를 unique set
  // 에 누적. 같은 id 중복 emit 시 progress 무변동 (F1.3).
  const priorNpcSet = new Set(prior.npcIdsCollected);
  for (const ev of events) {
    if (ev.type === 'npcEncounter') {
      const npcId = (ev.payload as { npcInstanceId?: unknown }).npcInstanceId;
      if (typeof npcId === 'string' && npcId.length > 0) {
        priorNpcSet.add(npcId);
      }
    }
  }
  const nextNpcIds = Array.from(priorNpcSet);
  const npcCount = Math.min(nextNpcIds.length, NPC_UNIQUE_TARGET);

  // ─── 3. realm-conquest-6 (단일 cycle 안 distinct realmEnter target 카운트) ─
  // saga.chapters[].events 의 realmEnter 의 payload.to 를 distinct set 으로.
  // *현재 saga 만* 읽으므로 cycle 간 누적 아님. F1.4 의 "단일 cycle 안 6 realm" 해석.
  const realmsThisCycle = new Set<string>();
  for (const ev of events) {
    if (ev.type === 'realmEnter') {
      const to = (ev.payload as { to?: unknown }).to;
      if (typeof to === 'string' && to.length > 0) {
        realmsThisCycle.add(to);
      }
    }
  }
  const realmCount = Math.min(realmsThisCycle.size, REALM_CONQUEST_TARGET);

  // ─── 4. aging-master-10 (cycle 간 누적 dict, 동일 realm 자연사 카운트) ──
  // 자연사 (deathCause === '자연사') 인 cycle 만 finalRealm 에 +1.
  // F1.5 의 dict { field: 4, volcano: 10 } shape 유지. realm 별 max 가 target 도달 시 완료.
  const nextDeathsByRealm: Record<string, number> = { ...prior.naturalDeathsByRealm };
  const deathCause = saga.deathCause ?? saga.hero.cause;
  const finalRealm = saga.finalRealm ?? '';
  if (deathCause === '자연사' && finalRealm.length > 0) {
    nextDeathsByRealm[finalRealm] = (nextDeathsByRealm[finalRealm] ?? 0) + 1;
  }
  // 가장 많이 자연사한 realm 의 카운트 = progress 표시.
  let agingMaxCount = 0;
  for (const v of Object.values(nextDeathsByRealm)) {
    if (v > agingMaxCount) agingMaxCount = v;
  }
  const agingProgress = Math.min(agingMaxCount, AGING_MASTER_TARGET);

  // ─── 5. inflation-flash-100x (단일 cycle 안 ×100 jump 3 회) ────────────
  // saga.chapters[].events 의 levelUp payload { oldLevel, newLevel } 에서
  // newLevel / oldLevel ≥ 100 인 frame 카운트. *현재 saga 한정*, cycle 간 누적 아님.
  let flashJumps = 0;
  for (const ev of events) {
    if (ev.type !== 'levelUp') continue;
    const p = ev.payload as { oldLevel?: unknown; newLevel?: unknown };
    const oldLv = typeof p.oldLevel === 'number' ? p.oldLevel : 0;
    const newLv = typeof p.newLevel === 'number' ? p.newLevel : 0;
    if (oldLv > 0 && newLv / oldLv >= FLASH_JUMP_RATIO) {
      flashJumps += 1;
    }
  }
  const flashProgress = Math.min(flashJumps, FLASH_JUMP_TARGET);

  // ─── byId 갱신: 중복 완료 차단 invariant (F1.8) ────────────────────────
  // 이미 completed === true 인 entry 는 evaluator 가 손대지 않음 (identity 유지).
  const nextById: Record<AchievementId, AchievementProgress> = {
    'lv-10m-in-3-cycles': updateProgress(
      prior.byId['lv-10m-in-3-cycles'],
      lvCount,
      LV_10M_WINDOW,
      nowMs,
    ),
    'npc-collect-4-uniques': updateProgress(
      prior.byId['npc-collect-4-uniques'],
      npcCount,
      NPC_UNIQUE_TARGET,
      nowMs,
    ),
    'realm-conquest-6': updateProgress(
      prior.byId['realm-conquest-6'],
      realmCount,
      REALM_CONQUEST_TARGET,
      nowMs,
    ),
    'aging-master-10': updateProgress(
      prior.byId['aging-master-10'],
      agingProgress,
      AGING_MASTER_TARGET,
      nowMs,
    ),
    'inflation-flash-100x': updateProgress(
      prior.byId['inflation-flash-100x'],
      flashProgress,
      FLASH_JUMP_TARGET,
      nowMs,
    ),
  };

  return {
    byId: nextById,
    last3MaxLevels: nextWindow,
    npcIdsCollected: nextNpcIds,
    naturalDeathsByRealm: nextDeathsByRealm,
  };
}

/** Pure progress update — 중복 완료 차단 invariant (F1.8) 의 진원지.
 *  이미 completed 인 entry 는 identity (===) 로 반환하여 immutable 보장. */
function updateProgress(
  prev: AchievementProgress,
  nextProgress: number,
  target: number,
  nowMs: number,
): AchievementProgress {
  if (prev.completed) {
    // F1.8: 이미 완료된 도전 = no-op. progress / completedAt / claimedAt 모두 보존.
    return prev;
  }
  const clamped = Math.min(nextProgress, target);
  const justCompleted = clamped >= target;
  if (justCompleted) {
    return {
      id: prev.id,
      progress: clamped,
      completed: true,
      completedAt: nowMs,
    };
  }
  // progress 변동만 (혹은 무변동) — completed 는 false 유지.
  if (clamped === prev.progress) {
    return prev;  // identity 유지 (불필요한 객체 재생성 회피)
  }
  return {
    id: prev.id,
    progress: clamped,
    completed: false,
  };
}
