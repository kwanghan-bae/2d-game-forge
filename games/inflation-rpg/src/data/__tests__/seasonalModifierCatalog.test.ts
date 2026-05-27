// Cycle 129 — N5 Live Ops mega-phase F2: SeasonalModifier catalog test
//
// Test plan: docs/superpowers/evolution/cycle-127-test-plan.md §F2.5 (atk/hp
// 무변동 invariant 의 *data-level positive grep* 형식).

import { describe, expect, it } from 'vitest';
import {
  ALL_SEASON_MODIFIER_IDS,
  SEASON_MODIFIER_CATALOG,
  getSeasonModifierDef,
} from '../seasonalModifierCatalog';

describe('Cycle 129 F2 — SeasonalModifier catalog', () => {
  /** cycle 129 5 + cycle 137 1 + cycle 149 2 + cycle 178 4 = 12 modifier */
  it('12 modifier 존재 (cycle 129 5 + 137 1 + 149 2 + 178 4) + lookup helper 동작', () => {
    expect(ALL_SEASON_MODIFIER_IDS).toHaveLength(12);
    expect(ALL_SEASON_MODIFIER_IDS).toEqual(
      expect.arrayContaining([
        'volcano-fire-trait-boost',
        'chaos-narrative-elegy',
        'field-cosmetic-spring',
        'npc-encounter-boost',
        'legendary-buff-card-bias',
        'underworld-shadow-trait-boost',
        'heaven-narrative-ode',
        'sea-cosmetic-aqua',
      ]),
    );
    for (const id of ALL_SEASON_MODIFIER_IDS) {
      const def = getSeasonModifierDef(id);
      expect(def.id).toBe(id);
      expect(def.nameKR).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(['trait_weight', 'narrative_weight', 'cosmetic']).toContain(def.type);
    }
  });

  /** F2.5 invariant — catalog 의 applyRule 에 atk/hp/MAX_ARRIVALS 등의 sim
   *  영향 key 가 존재하지 않음. data-level positive grep. cycle 17 atk-bound
   *  봉인 회피의 invariant 보강. */
  it('F2.5 atk/hp/MAX_ARRIVALS/fieldLevelRange key 0 hit — cycle 17 봉인 회피', () => {
    const forbiddenKeys = [
      'atk', 'atkBonus', 'atkBase',
      'hp', 'hpBonus', 'hpBase',
      'MAX_ARRIVALS', 'maxArrivals', 'arrivalCap',
      'fieldLevelRange', 'fieldLv',
    ];
    for (const def of Object.values(SEASON_MODIFIER_CATALOG)) {
      const ruleStr = JSON.stringify(def.applyRule);
      for (const key of forbiddenKeys) {
        expect(
          ruleStr.includes(`"${key}"`),
          `modifier ${def.id} 의 applyRule 에 ${key} key 가 존재함 — cycle 17 봉인 위반`,
        ).toBe(false);
      }
    }
  });

  /** modifier type 의 axis 일관성 — applyRule 의 key set 이 type 과 정합 */
  it('type axis 정합성 — trait_weight/narrative_weight/cosmetic 각 type 의 applyRule key', () => {
    const def1 = SEASON_MODIFIER_CATALOG['volcano-fire-trait-boost'];
    expect(def1.applyRule.traitWeightMul).toBeDefined();
    expect(def1.applyRule.traitWeightMul!['fire_*']).toBe(2);

    const def2 = SEASON_MODIFIER_CATALOG['chaos-narrative-elegy'];
    expect(def2.applyRule.narrativeWeightMul).toBeDefined();
    expect(def2.applyRule.narrativeWeightMul!['elegy']).toBe(1.5);

    const def3 = SEASON_MODIFIER_CATALOG['field-cosmetic-spring'];
    expect(def3.applyRule.cosmeticTint).toBeDefined();
    expect(def3.type).toBe('cosmetic');

    const def4 = SEASON_MODIFIER_CATALOG['npc-encounter-boost'];
    expect(def4.applyRule.npcEncounterMul).toBe(1.3);

    const def5 = SEASON_MODIFIER_CATALOG['legendary-buff-card-bias'];
    expect(def5.applyRule.buffCardWeightMul).toBeDefined();
    expect(def5.applyRule.buffCardWeightMul!['legendary']).toBe(1.5);
  });

  /** referential equality — pure data, same lookup → same reference */
  it('catalog referential — getSeasonModifierDef 의 같은 id → 같은 ref', () => {
    const a = getSeasonModifierDef('volcano-fire-trait-boost');
    const b = getSeasonModifierDef('volcano-fire-trait-boost');
    expect(a).toBe(b);
  });

  /** Cycle 168 — axis 분포 invariant (level-designer #3, cycle 149 의 균등화).
   *  catalog 가 trait 4 / narrative 2 / cosmetic 2 = 50%/25%/25% 비중 유지. */
  it('cycle 168 — catalog 8 의 axis 분포 invariant (trait 4 / narrative 2 / cosmetic 2)', () => {
    let trait = 0;
    let narrative = 0;
    let cosmetic = 0;
    for (const id of ALL_SEASON_MODIFIER_IDS) {
      const def = SEASON_MODIFIER_CATALOG[id];
      if (def.type === 'trait_weight') trait++;
      else if (def.type === 'narrative_weight') narrative++;
      else if (def.type === 'cosmetic') cosmetic++;
    }
    // cycle 149 (catalog 6 → 8) axis 균등화 후의 분포.
    expect(trait + narrative + cosmetic).toBe(ALL_SEASON_MODIFIER_IDS.length);
    expect(trait).toBeGreaterThanOrEqual(4);
    expect(narrative).toBeGreaterThanOrEqual(2);
    expect(cosmetic).toBeGreaterThanOrEqual(2);
    // 단일 axis 가 catalog 의 75% 이상 → false (편향 알람 invariant).
    const total = trait + narrative + cosmetic;
    expect(trait / total).toBeLessThan(0.75);
    expect(narrative / total).toBeLessThan(0.75);
    expect(cosmetic / total).toBeLessThan(0.75);
  });

  /** Cycle 182 — narrativeWeightMul / buffCardWeightMul / npcEncounterMul
   *  의 모든 값이 [0.5, 3.0] 범위 (cycle 168 패턴의 narrative axis 확장). */
  it('cycle 182 — 모든 weightMul axis 의 값이 [0.5, 3.0] 범위', () => {
    for (const id of ALL_SEASON_MODIFIER_IDS) {
      const def = SEASON_MODIFIER_CATALOG[id];
      const rule = def.applyRule;
      if (rule.narrativeWeightMul) {
        for (const [tone, mul] of Object.entries(rule.narrativeWeightMul)) {
          expect(mul, `${id} narrative ${tone}`).toBeGreaterThanOrEqual(0.5);
          expect(mul, `${id} narrative ${tone}`).toBeLessThanOrEqual(3.0);
        }
      }
      if (rule.buffCardWeightMul) {
        for (const [rarity, mul] of Object.entries(rule.buffCardWeightMul)) {
          expect(mul, `${id} buffCard ${rarity}`).toBeGreaterThanOrEqual(0.5);
          expect(mul, `${id} buffCard ${rarity}`).toBeLessThanOrEqual(3.0);
        }
      }
      if (rule.npcEncounterMul !== undefined) {
        expect(rule.npcEncounterMul, `${id} npcEncounter`).toBeGreaterThanOrEqual(0.5);
        expect(rule.npcEncounterMul, `${id} npcEncounter`).toBeLessThanOrEqual(3.0);
      }
    }
  });

  /** Cycle 168 — traitWeightMul 의 최대 배수 sanity (economy 깨짐 가드). */
  it('cycle 168 — traitWeightMul 의 모든 값이 [0.5, 3.0] 범위 (economy sanity)', () => {
    for (const id of ALL_SEASON_MODIFIER_IDS) {
      const def = SEASON_MODIFIER_CATALOG[id];
      if (!def.applyRule.traitWeightMul) continue;
      for (const [pattern, mul] of Object.entries(def.applyRule.traitWeightMul)) {
        expect(mul, `${id} - ${pattern}`).toBeGreaterThanOrEqual(0.5);
        expect(mul, `${id} - ${pattern}`).toBeLessThanOrEqual(3.0);
      }
    }
  });
});
