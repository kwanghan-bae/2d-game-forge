// Cycle 132 — N5 achievements pure selectors.
// claim 분리 (cycle 131) 직후, 사용자에게 "수령 가능 N 개" 같은 UI 노출을 위한
// stateless helpers. store action 외부 — Zustand selector 또는 component
// 안에서 직접 호출.

import { ALL_ACHIEVEMENT_IDS } from './achievementsCatalog';
import type { AchievementId, AchievementsState } from './achievementsTypes';

/** completed && !claimedAt 인 도전과제 id 배열 — 카탈로그 순서 보존. */
export function getClaimableIds(state: AchievementsState): AchievementId[] {
  const out: AchievementId[] = [];
  for (const id of ALL_ACHIEVEMENT_IDS) {
    const p = state.byId[id];
    if (p.completed && p.claimedAt === undefined) out.push(id);
  }
  return out;
}

/** completed && !claimedAt 인 도전과제 개수 — getClaimableIds(state).length 동치. */
export function getClaimableCount(state: AchievementsState): number {
  let n = 0;
  for (const id of ALL_ACHIEVEMENT_IDS) {
    const p = state.byId[id];
    if (p.completed && p.claimedAt === undefined) n++;
  }
  return n;
}
