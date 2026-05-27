// Cycle 129 — N5 Live Ops mega-phase F2: 5 starter SeasonalModifier catalog
//
// PRD: docs/superpowers/evolution/cycle-125-prd.md §F2 의 5 modifier spec 직접
// 회수. 모두 *data only* — cycle 129 시점에서 runtime consumer 0 (cycle 131
// telemetry 에서 HeroDecisionAI / narrationVariants / SeasonPassScreen 에 wire).
//
// **cycle 17 atk-bound 봉인 회피 invariant**:
//   - atk / hp / MAX_ARRIVALS / fieldLevelRange 어느 field 도 mutation 0
//   - traitWeightMul / narrativeWeightMul / npcEncounterMul / buffCardWeightMul /
//     cosmeticTint 5 종 axis 만
//   - 본 file 의 catalog 가 위 axis 외의 새 field 를 추가할 때는 PRD §F2 "반대
//     기준" 직접 위반 — review 의무.

import type {
  SeasonModifierDef,
  SeasonModifierId,
} from './seasonalModifierTypes';

export const SEASON_MODIFIER_CATALOG: Readonly<
  Record<SeasonModifierId, SeasonModifierDef>
> = {
  'volcano-fire-trait-boost': {
    id: 'volcano-fire-trait-boost',
    nameKR: '용암의 시즌',
    description: '용암 차원 진입 시 화염 계열 trait 추첨 가중 ×2',
    type: 'trait_weight',
    applyRule: {
      // PRD §F2 직접 회수: volcano realm + fire trait ×2.
      // wildcard `fire_*` 는 cycle 131 의 HeroDecisionAI wire 에서 prefix 매칭.
      traitWeightMul: { 'fire_*': 2 },
    },
  },
  'chaos-narrative-elegy': {
    id: 'chaos-narrative-elegy',
    nameKR: '혼돈의 비가',
    description: '혼돈 차원의 narrative tone — 애가/비극 가중 ×1.5',
    type: 'narrative_weight',
    applyRule: {
      narrativeWeightMul: { elegy: 1.5, tragedy: 1.5 },
    },
  },
  'field-cosmetic-spring': {
    id: 'field-cosmetic-spring',
    nameKR: '들녘의 봄',
    description: '초원 차원의 sprite tint — 봄 색조 (cosmetic only)',
    type: 'cosmetic',
    applyRule: {
      // sim 영향 0 의 hard invariant — string tint token 만.
      cosmeticTint: { plains: 'spring-pastel', field: 'spring-pastel' },
    },
  },
  'npc-encounter-boost': {
    id: 'npc-encounter-boost',
    nameKR: '만남의 시즌',
    description: 'NPC 등장률 가중 ×1.3',
    type: 'trait_weight',
    applyRule: {
      npcEncounterMul: 1.3,
    },
  },
  'legendary-buff-card-bias': {
    id: 'legendary-buff-card-bias',
    nameKR: '전설의 부름',
    description: '보스 인트로 선택의 legendary buff card 가중 ×1.5',
    type: 'trait_weight',
    applyRule: {
      buffCardWeightMul: { legendary: 1.5 },
    },
  },
  // Cycle 137 — underworld realm 의 shadow trait boost. cycle 129 의 axis 5 종
  // (traitWeightMul) 재사용. 새 field 추가 0, invariant 보존.
  'underworld-shadow-trait-boost': {
    id: 'underworld-shadow-trait-boost',
    nameKR: '황천의 그림자',
    description: '황천 차원 진입 시 그림자 계열 trait 추첨 가중 ×2',
    type: 'trait_weight',
    applyRule: {
      // wildcard `shadow_*` 는 cycle 131+ HeroDecisionAI wire 에서 prefix 매칭.
      traitWeightMul: { 'shadow_*': 2 },
    },
  },
  // Cycle 149 — narrative 톤 확장. trait 편향 67% → 50% 로 균등화.
  'heaven-narrative-ode': {
    id: 'heaven-narrative-ode',
    nameKR: '천상의 송가',
    description: '천상 차원의 narrative tone — 송가/찬미 가중 ×1.5',
    type: 'narrative_weight',
    applyRule: {
      narrativeWeightMul: { ode: 1.5, hymn: 1.5 },
    },
  },
  // Cycle 149 — cosmetic 영역 확장. sea realm sprite tint.
  'sea-cosmetic-aqua': {
    id: 'sea-cosmetic-aqua',
    nameKR: '해류의 푸름',
    description: '바다 차원의 sprite tint — 청록 색조 (cosmetic only)',
    type: 'cosmetic',
    applyRule: {
      cosmeticTint: { sea: 'aqua-deep' },
    },
  },
  // Cycle 178 — cosmetic axis 4 신규. cycle 177 wire 완성 후 활용 폭 확장.
  // 5 realm (sea/volcano/underworld/heaven/chaos) 각자 dedicated 시즌 보유.
  'volcano-cosmetic-ember': {
    id: 'volcano-cosmetic-ember',
    nameKR: '용암의 잔불',
    description: '용암 차원의 sprite tint — 적색 잔불 (cosmetic only)',
    type: 'cosmetic',
    applyRule: {
      cosmeticTint: { volcano: 'ember-glow' },
    },
  },
  'underworld-cosmetic-shadow': {
    id: 'underworld-cosmetic-shadow',
    nameKR: '황천의 어둠',
    description: '황천 차원의 sprite tint — 보라 어둠 (cosmetic only)',
    type: 'cosmetic',
    applyRule: {
      cosmeticTint: { underworld: 'shadow-ink' },
    },
  },
  'heaven-cosmetic-cloud': {
    id: 'heaven-cosmetic-cloud',
    nameKR: '천상의 구름',
    description: '천상 차원의 sprite tint — 차분한 청회색 (cosmetic only)',
    type: 'cosmetic',
    applyRule: {
      cosmeticTint: { heaven: 'cloud-silver' },
    },
  },
  'chaos-cosmetic-prism': {
    id: 'chaos-cosmetic-prism',
    nameKR: '혼돈의 프리즘',
    description: '혼돈 차원의 sprite tint — 마젠타 (cosmetic only)',
    type: 'cosmetic',
    applyRule: {
      cosmeticTint: { chaos: 'chaos-prism' },
    },
  },
};

/** 모든 starter id (catalog 순회용). cycle 132+ 에서 union 확장 시 동기화. */
export const ALL_SEASON_MODIFIER_IDS: readonly SeasonModifierId[] = Object.keys(
  SEASON_MODIFIER_CATALOG,
) as readonly SeasonModifierId[];

/** 카탈로그 lookup helper. */
export function getSeasonModifierDef(id: SeasonModifierId): SeasonModifierDef {
  return SEASON_MODIFIER_CATALOG[id];
}
