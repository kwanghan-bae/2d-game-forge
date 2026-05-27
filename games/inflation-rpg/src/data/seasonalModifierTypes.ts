// Cycle 129 — N5 Live Ops mega-phase F2: SeasonalModifier 자료구조
//
// PRD: docs/superpowers/evolution/cycle-125-prd.md §F2
// Test plan: docs/superpowers/evolution/cycle-127-test-plan.md §F2
//
// 본 cycle scope = 자료 catalog + seasonId pure 산출 + 5 modifier def + tests.
// 실제 HeroDecisionAI / narrative engine wire 는 cycle 131+ (telemetry) carry-over.
// applyRule 은 *data* 로만 존재 — 소비처 0 인 상태에서 cycle 17 atk-bound 봉인 회피
// invariant 가 자동 보장.
//
// **R1 (PRD §리스크)** — naming 충돌 회피:
//   기존 `season/SeasonState.ts` = age-based 환경 tint (V3-H, 봄/여름/가을/겨울).
//   본 file 의 `SeasonalModifier` = live-ops 30-day rotation 의 catalog item.
//   둘은 namespace 자체가 분리 (`season/` vs `data/`) 이며 field 이름도
//   `meta.season` (env tint) vs `meta.seasonStartedAt` (live-ops timestamp) 으로
//   분리. cross-mutation 0 의 invariant 는 PRD EDGE.7 의 grep CI step 의무.

/** SeasonModifierId — cycle 129 5 starter + cycle 137 1 추가 = 6.
 *  cycle 137+ catalog 확장 시 union 확장 + tests 동기화. */
export type SeasonModifierId =
  | 'volcano-fire-trait-boost'
  | 'chaos-narrative-elegy'
  | 'field-cosmetic-spring'
  | 'npc-encounter-boost'
  | 'legendary-buff-card-bias'
  | 'underworld-shadow-trait-boost';

/** SeasonModifierType — modifier 가 어느 layer 에 영향을 주는지의 literal.
 *  - 'trait_weight'    = HeroDecisionAI 의 trait roll 확률 분포 (cycle 131 wire)
 *  - 'narrative_weight' = narrationVariants 의 tone 가중 (cycle 131 wire)
 *  - 'cosmetic'        = sprite tint / UI 색조만 (sim 영향 0, 즉시 사용 가능)
 *
 *  *모두* atk/hp/MAX_ARRIVALS/fieldLevelRange 등 sim 영향 axis 와 분리.
 *  PRD §F2 "반대 기준" 의 negative spec 직접 회수. */
export type SeasonModifierType =
  | 'trait_weight'
  | 'narrative_weight'
  | 'cosmetic';

/** applyRule — modifier 의 효과 정의. *데이터* 로만 존재 (runtime consumer 0
 *  in cycle 129). 본 field 는 cycle 131 의 telemetry 와 함께 HeroDecisionAI /
 *  narrationVariants 에 wire 예정. 현재는 catalog 의 declarative spec. */
export interface SeasonModifierApplyRule {
  /** trait_weight 의 경우: trait id pattern → 배수. e.g. `{ fire_*: 2 }` */
  readonly traitWeightMul?: Readonly<Record<string, number>>;
  /** narrative_weight 의 경우: tone literal → 배수. e.g. `{ elegy: 1.5 }` */
  readonly narrativeWeightMul?: Readonly<Record<string, number>>;
  /** cosmetic 의 경우: realm id → tint 색조 token. sim 영향 0. */
  readonly cosmeticTint?: Readonly<Record<string, string>>;
  /** npc-encounter-boost 같은 NPC encounter 확률 배수. */
  readonly npcEncounterMul?: number;
  /** legendary-buff-card-bias 같은 buff card pool weight 배수. */
  readonly buffCardWeightMul?: Readonly<Record<string, number>>;
}

/** SeasonModifierDef — catalog item. PRD §F2 의 catalog spec. */
export interface SeasonModifierDef {
  readonly id: SeasonModifierId;
  readonly nameKR: string;
  readonly description: string;
  readonly type: SeasonModifierType;
  readonly applyRule: SeasonModifierApplyRule;
}
