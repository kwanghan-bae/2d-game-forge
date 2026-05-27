// Cycle 128 — N5 Live Ops mega-phase F1: 5 starter achievement catalog
//
// PRD: docs/superpowers/evolution/cycle-125-prd.md §F1 의 *trivial 재정의 form*
// 직접 회수. 산술충돌 사전 검증 (룰 8) 의 결과 반영:
//
// 1. lv-10m-in-3-cycles    — baseline p50 6.98M → 10M = +43%. 단일 cycle p10-20.
//                            *연속 3 cycle 의 1 회 이상* 으로 정의 (trivial reject).
//                            advisor 권고 §Gap 2 의 rolling window 해석 채택.
// 2. npc-collect-4-uniques — cyclesWithNpc 2/cycle. 4 유니크 = 평균 2-3 cycle.
//                            moderate, OK as-is.
// 3. realm-conquest-6      — *단일 cycle 안 6 realm 진입* 으로 재정의 (cycle 5
//                            chained 의 unlockedRealms 6/6 = trivial → 단일 cycle
//                            제한 form).
// 4. aging-master-10       — *동일 realm 자연사 10 회* 로 재정의 (5 회는 trivial).
//                            realm 6 중 1 곳 고정 시 평균 60+ cycle.
// 5. inflation-flash-100x  — *단일 cycle 안 ×100 jump 3 회*. baseline 측정 부재,
//                            cycle 132+ sim 측정 후 재조정 가능 (PRD §F1 명시).
//
// reward.tokens 합 = 1 + 2 + 2 + 3 + 5 = 13 / 시즌. cycle 157 의 환전 비율 3:1
// → 균열석 4/시즌 (Math.floor(13/3)). cycle 116 organic 90/시즌 대비 4.32%
// 보조 axis. 변천: 10:1 (cycle 129) → 5:1 (cycle 151, 1.44% → 2.89%)
// → 3:1 (cycle 157, 2.89% → 4.32%). 추가 인하 시 organic 균열석 의존성 약화 risk.

import type { AchievementDef, AchievementId } from './achievementsTypes';

export const ACHIEVEMENT_CATALOG: Readonly<Record<AchievementId, AchievementDef>> = {
  'lv-10m-in-3-cycles': {
    id: 'lv-10m-in-3-cycles',
    nameKR: '인플레이션의 영광',
    description: '연속 3 사이클 동안 최고 레벨 1000만 도달',
    trigger: 'cycle-end-rolling-window',
    reward: { tokens: 1 },
  },
  'npc-collect-4-uniques': {
    id: 'npc-collect-4-uniques',
    nameKR: '사절단',
    description: '4명의 서로 다른 NPC 와 조우',
    trigger: 'cycle-end-cumulative',
    reward: { tokens: 2 },
  },
  'realm-conquest-6': {
    id: 'realm-conquest-6',
    nameKR: '6 차원 정복자',
    description: '단일 사이클 안에 6 개의 차원 진입',
    trigger: 'cycle-end-single',
    reward: { tokens: 2 },
  },
  'aging-master-10': {
    id: 'aging-master-10',
    nameKR: '한 길의 노옹',
    description: '동일 차원에서 자연사 10 회 누적',
    trigger: 'cycle-end-cumulative',
    reward: { tokens: 3 },
  },
  'inflation-flash-100x': {
    id: 'inflation-flash-100x',
    nameKR: '폭발의 섬광',
    description: '단일 사이클 안에 ×100 레벨 점프 3 회',
    trigger: 'cycle-end-single',
    reward: { tokens: 5 },
  },
};

/** 모든 starter id (UI 의 진행도 리스트 순회용). */
export const ALL_ACHIEVEMENT_IDS: readonly AchievementId[] = Object.keys(
  ACHIEVEMENT_CATALOG,
) as readonly AchievementId[];

/** 카탈로그 lookup helper — typed exhaustiveness 검증. */
export function getAchievementDef(id: AchievementId): AchievementDef {
  return ACHIEVEMENT_CATALOG[id];
}
