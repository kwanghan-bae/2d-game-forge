// Cycle 155 — SeasonalModifier applyRule pure consumer (game-critic #1 분할).
// cycle 129 의 catalog 가 14 cycle 동안 dormant — 본 cycle 에서 *pure* 적용
// 함수 만 정착 (실제 HeroDecisionAI / narrationVariants wire 는 cycle 156+).

import type {
  SeasonModifierApplyRule,
  SeasonModifierDef,
} from './seasonalModifierTypes';

/**
 * trait id 가 modifier 의 traitWeightMul 매핑에 해당하는지 검사.
 * wildcard `prefix_*` 지원. wildcard 미매칭 시 exact match 후순위.
 * 반환 = 적용할 배수. 매칭 없음 = 1 (변경 없음).
 */
export function getTraitWeightMul(rule: SeasonModifierApplyRule, traitId: string): number {
  if (!rule.traitWeightMul) return 1;
  // exact match 우선
  if (rule.traitWeightMul[traitId] !== undefined) {
    return rule.traitWeightMul[traitId];
  }
  // wildcard prefix match — `fire_*` 가 `fire_burst` 매칭.
  for (const pattern of Object.keys(rule.traitWeightMul)) {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (traitId.startsWith(prefix)) {
        return rule.traitWeightMul[pattern];
      }
    }
  }
  return 1;
}

/** narrative tone 가중 배수 lookup. exact match 만. */
export function getNarrativeWeightMul(rule: SeasonModifierApplyRule, tone: string): number {
  return rule.narrativeWeightMul?.[tone] ?? 1;
}

/** realm id 에 대한 cosmetic tint token lookup. 매칭 없음 = null. */
export function getCosmeticTint(rule: SeasonModifierApplyRule, realmId: string): string | null {
  return rule.cosmeticTint?.[realmId] ?? null;
}

/** modifier 가 active 인지 검사. 본 sim 의 진입점 검증용. */
export function isModifierActive(def: SeasonModifierDef | undefined): def is SeasonModifierDef {
  return def !== undefined;
}
