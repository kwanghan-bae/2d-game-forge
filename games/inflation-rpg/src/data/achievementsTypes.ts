// Cycle 128 — N5 Live Ops mega-phase F1: AchievementSystem 자료구조
//
// PRD: docs/superpowers/evolution/cycle-125-prd.md §F1
// Test plan: docs/superpowers/evolution/cycle-127-test-plan.md §F1
//
// 본 cycle scope = F1 catalog + logic + 7 test 만. F3 의 token economy (claimAchievement,
// seasonToken) 는 cycle 129 carry-over. gameStore wiring 도 cycle 129. 본 file 은
// pure 자료구조 + state shape 만 정의 — 영속 통합 없음.

import type { CycleSaga } from '../saga/SagaTypes';

/** 5 starter achievement id literal. cycle 132+ 카탈로그 확장 시 union 확장 의무. */
export type AchievementId =
  | 'lv-10m-in-3-cycles'
  | 'npc-collect-4-uniques'
  | 'realm-conquest-6'
  | 'aging-master-10'
  | 'inflation-flash-100x';

/** AchievementTrigger — 본 cycle 시점에서는 evaluator 가 saga 인자로 직접 처리 하므로
 *  trigger 는 *문서 목적* 의 literal union. cycle 132+ 의 카탈로그 확장 시 generic
 *  trigger DSL (e.g., 'on_cycle_end', 'on_npc_encounter') 로 확장 의무. */
export type AchievementTrigger =
  | 'cycle-end-rolling-window'   // 최근 N 사이클 기준 (lv-10m-in-3-cycles)
  | 'cycle-end-cumulative'       // cycle 간 누적 set/dict (npc-collect-4, aging-master)
  | 'cycle-end-single'           // 단일 cycle saga 의 events 만 (realm-conquest, inflation-flash)
  ;

/** AchievementDef — PRD §F1 의 catalog item. token reward 는 cycle 129 의 F3 wire. */
export interface AchievementDef {
  readonly id: AchievementId;
  readonly nameKR: string;
  readonly description: string;
  readonly trigger: AchievementTrigger;
  /** F3 의 token 지급량. cycle 129 wire 전까지는 dormant. PRD §F1.10 의 합 = 1+2+2+3+5. */
  readonly reward: { readonly tokens: number };
}

/** 개별 도전과제 progress record — PRD §F1 의 flat shape.
 *  progress: number = 표시용 카운터. Set/dict 같은 풍부한 진척 데이터는
 *  AchievementsState 의 aux side-channel field 에 보관 (advisor §Gap 1 권고). */
export interface AchievementProgress {
  readonly id: AchievementId;
  readonly progress: number;
  readonly completed: boolean;
  readonly completedAt?: number;
  /** cycle 129 의 F3 token 지급 시점. F1 시점 = 항상 undefined. */
  readonly claimedAt?: number;
}

/** AchievementsState — store 의 MetaState.achievements 에 들어갈 outer shape.
 *  byId = id → AchievementProgress (flat scalar progress).
 *  aux side-channel = evaluator 가 progress 계산에 필요한 풍부한 데이터.
 *  - last3MaxLevels: rolling window FIFO (lv-10m-in-3-cycles 의 'last 3' 해석)
 *  - npcIdsCollected: distinct npcInstanceId 누적 set (string[] for serializability)
 *  - naturalDeathsByRealm: realm id → 자연사 누적 카운트 (aging-master-10)
 *
 *  aux field 는 evaluator 가 read+write 하지만 외부 UI 는 byId.progress 만 표시한다.
 *  cycle 129 의 persist v26 진입 시 그대로 영속. */
export interface AchievementsState {
  readonly byId: Readonly<Record<AchievementId, AchievementProgress>>;
  readonly last3MaxLevels: readonly number[];                    // FIFO, length ≤ 3
  readonly npcIdsCollected: readonly string[];                   // distinct npc instance id
  readonly naturalDeathsByRealm: Readonly<Record<string, number>>;
}

/** 5 starter 의 default AchievementProgress shape. */
function mkProgress(id: AchievementId): AchievementProgress {
  return { id, progress: 0, completed: false };
}

/** INITIAL_ACHIEVEMENTS — fresh state (no achievements unlocked).
 *  cycle 129 의 INITIAL_META 에 default 로 주입. */
export const INITIAL_ACHIEVEMENTS: AchievementsState = {
  byId: {
    'lv-10m-in-3-cycles': mkProgress('lv-10m-in-3-cycles'),
    'npc-collect-4-uniques': mkProgress('npc-collect-4-uniques'),
    'realm-conquest-6': mkProgress('realm-conquest-6'),
    'aging-master-10': mkProgress('aging-master-10'),
    'inflation-flash-100x': mkProgress('inflation-flash-100x'),
  },
  last3MaxLevels: [],
  npcIdsCollected: [],
  naturalDeathsByRealm: {},
};

/** Evaluator 의 input/output 형식 명세 — 본 file 의 자료 contract.
 *  실제 함수 본체는 achievementsLogic.ts. */
export interface AchievementEvaluatorInput {
  /** 가장 최근 끝난 cycle 의 saga. evaluator 의 유일한 cycle-event source. */
  readonly saga: CycleSaga;
  /** 직전까지 누적된 progress + aux. evaluator 는 mutate 0, 새 객체 반환. */
  readonly prior: AchievementsState;
  /** completedAt 에 기록될 ms 타임스탬프. test 에서 mock 가능 (Date.now 호출 차단). */
  readonly nowMs: number;
}
