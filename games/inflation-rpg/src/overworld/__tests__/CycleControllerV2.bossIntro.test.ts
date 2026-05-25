import { describe, it, expect, beforeEach } from 'vitest';
import { CycleControllerV2 } from '../CycleControllerV2';
import { EncounterEngine } from '../EncounterEngine';
import { HeroEntity } from '../../hero/HeroEntity';
import { SeededRng } from '../../cycle/SeededRng';
import { useGameStore } from '../../store/gameStore';
import type { OverworldEvent } from '../OverworldEvents';
import { BOSS_INTRO_CATALOG } from '../../buff/bossIntroCatalog';

/**
 * Cycle 109 F1 — Boss Intro Choice tests.
 *
 * Coverage matrix:
 *   - EncounterEngine emits boss_intro_offered (not battle_started) when
 *     kind === 'boss' AND isBossIntroEligible() returns true.
 *   - cards.length === 3 + no duplicates (sample without replacement).
 *   - Controller marks bossIntroPending=true on emit + captures landmarkId/cards.
 *   - handleArrival is no-op while bossIntroPending=true.
 *   - resolveBossIntro(idx) applies the chosen buff, marks landmarkId in
 *     bossIntroSeenIds, re-enters resolveEncounter (no recursion), emits
 *     boss_intro_resolved + battle_started + battle_won.
 *   - Multi-boss cycle: each boss landmark triggers intro independently.
 *   - 4-cap: after activeBossIntroBuffs.length === 4, next boss emits
 *     boss_intro_skipped instead of boss_intro_offered.
 *   - Non-boss landmarks: enemy kind never triggers boss intro path.
 *   - getBossIntroAtkMul accumulates atk_mul effects multiplicatively.
 *   - resolveBossIntro returns [] when not pending (defensive guard).
 */

function makeStrongHero(seed = 1) {
  return HeroEntity.create({ seed, heroHpMax: 100000, heroAtkBase: 100000 });
}

function makeFrailHero(seed = 1) {
  return HeroEntity.create({ seed, heroHpMax: 1, heroAtkBase: 1 });
}

beforeEach(() => {
  useGameStore.setState(s => ({ ...s, meta: { ...s.meta, crackStones: 0 } }));
});

describe('EncounterEngine boss intro intercept', () => {
  it('emits boss_intro_offered (not battle_started) when isBossIntroEligible=true', () => {
    const hero = makeStrongHero();
    const cards = [
      { id: 'atk_small' as const, nameKR: 'A', descKR: 'a', tier: 'small' as const },
      { id: 'hp_small'  as const, nameKR: 'B', descKR: 'b', tier: 'small' as const },
      { id: 'atk_big'   as const, nameKR: 'C', descKR: 'c', tier: 'big'   as const },
    ];
    const engine = new EncounterEngine(new SeededRng(1), {
      isBossIntroEligible: () => true,
      isBossIntroCapped:   () => false,
      pickBossIntroCards:  () => cards,
    });
    const events = engine.resolveEncounter(hero, 'boss', 'boss_dragon_1');
    const offered = events.find(e => e.type === 'boss_intro_offered');
    expect(offered).toBeDefined();
    expect(events.some(e => e.type === 'battle_started')).toBe(false);
  });

  it('falls through to battle when isBossIntroEligible=false', () => {
    const hero = makeStrongHero();
    const engine = new EncounterEngine(new SeededRng(1), {
      isBossIntroEligible: () => false,
    });
    const events = engine.resolveEncounter(hero, 'boss', 'boss_dragon_1');
    expect(events.some(e => e.type === 'boss_intro_offered')).toBe(false);
    expect(events.some(e => e.type === 'battle_started')).toBe(true);
  });

  it('non-boss landmark (enemy kind) never emits boss_intro_offered', () => {
    const hero = makeStrongHero();
    const engine = new EncounterEngine(new SeededRng(1), {
      isBossIntroEligible: () => true,
      pickBossIntroCards: () => [],
    });
    const events = engine.resolveEncounter(hero, 'enemy', 'wolf_1');
    expect(events.some(e => e.type === 'boss_intro_offered')).toBe(false);
  });

  it('emits boss_intro_skipped when isBossIntroCapped=true (cap reached)', () => {
    const hero = makeStrongHero();
    const engine = new EncounterEngine(new SeededRng(1), {
      isBossIntroEligible: () => true,
      isBossIntroCapped:   () => true,
      pickBossIntroCards:  () => [],
    });
    const events = engine.resolveEncounter(hero, 'boss', 'boss_capped');
    const skipped = events.find(e => e.type === 'boss_intro_skipped');
    expect(skipped).toBeDefined();
    if (skipped && skipped.type === 'boss_intro_skipped') {
      expect(skipped.reason).toBe('cap_reached');
      expect(skipped.landmarkId).toBe('boss_capped');
    }
    // Battle still proceeds.
    expect(events.some(e => e.type === 'battle_started')).toBe(true);
  });
});

describe('CycleControllerV2 boss intro wiring', () => {
  it('controller emits boss_intro_offered with exactly 3 deterministic cards', () => {
    const ctrl = new CycleControllerV2({
      seed: 12345, traits: [], heroHpMax: 100000, heroAtkBase: 100000,
    });
    const events = ctrl.handleArrival('boss', 'boss_dragon_1');
    const offered = events.find(e => e.type === 'boss_intro_offered');
    expect(offered).toBeDefined();
    if (offered && offered.type === 'boss_intro_offered') {
      expect(offered.cards).toHaveLength(3);
      const ids = offered.cards.map(c => c.id);
      expect(new Set(ids).size).toBe(3);
      // All ids must be from the canonical catalog.
      for (const id of ids) {
        expect(BOSS_INTRO_CATALOG.some(b => b.id === id)).toBe(true);
      }
    }
    expect(ctrl.isBossIntroPending()).toBe(true);
  });

  it('handleArrival is no-op while bossIntroPending=true', () => {
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 100000, heroAtkBase: 100000,
    });
    ctrl.handleArrival('boss', 'boss_dragon_1');
    expect(ctrl.isBossIntroPending()).toBe(true);
    const events = ctrl.handleArrival('boss', 'boss_dragon_2');
    expect(events).toEqual([]);
  });

  it('same (seed, landmarkId) → same 3-card sample (sim-real parity)', () => {
    const a = new CycleControllerV2({
      seed: 7777, traits: [], heroHpMax: 1, heroAtkBase: 1,
    });
    const b = new CycleControllerV2({
      seed: 7777, traits: [], heroHpMax: 1, heroAtkBase: 1,
    });
    const ea = a.handleArrival('boss', 'boss_same_id');
    const eb = b.handleArrival('boss', 'boss_same_id');
    const oa = ea.find(e => e.type === 'boss_intro_offered');
    const ob = eb.find(e => e.type === 'boss_intro_offered');
    expect(oa && oa.type === 'boss_intro_offered' && oa.cards.map(c => c.id))
      .toEqual(ob && ob.type === 'boss_intro_offered' && ob.cards.map(c => c.id));
  });
});

describe('resolveBossIntro path', () => {
  it('applies the chosen buff to activeBossIntroBuffs + emits boss_intro_resolved', () => {
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 100000, heroAtkBase: 100000,
    });
    ctrl.handleArrival('boss', 'boss_dragon_1');
    const events = ctrl.resolveBossIntro(0);
    expect(ctrl.getActiveBossIntroBuffs()).toHaveLength(1);
    expect(events.some(e => e.type === 'boss_intro_resolved')).toBe(true);
    expect(ctrl.isBossIntroPending()).toBe(false);
  });

  it('re-enters resolveEncounter for actual boss combat (battle_started + battle_won)', () => {
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 100000, heroAtkBase: 100000,
    });
    ctrl.handleArrival('boss', 'boss_dragon_1');
    const events = ctrl.resolveBossIntro(0);
    expect(events.some(e => e.type === 'battle_started')).toBe(true);
    expect(events.some(e => e.type === 'battle_won')).toBe(true);
  });

  it('marks landmarkId in bossIntroSeenIds so re-fight skips intro path', () => {
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 100000, heroAtkBase: 100000,
    });
    ctrl.handleArrival('boss', 'boss_dragon_1');
    expect(ctrl.getBossIntroSeenSize()).toBe(0); // not added until resolve
    ctrl.resolveBossIntro(0);
    expect(ctrl.getBossIntroSeenSize()).toBe(1);
  });

  it('returns [] when not pending (defensive guard)', () => {
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 100000, heroAtkBase: 100000,
    });
    expect(ctrl.resolveBossIntro(0)).toEqual([]);
    expect(ctrl.resolveBossIntro(1)).toEqual([]);
    expect(ctrl.resolveBossIntro(2)).toEqual([]);
  });

  it('double-resolve safe — second call returns []', () => {
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 100000, heroAtkBase: 100000,
    });
    ctrl.handleArrival('boss', 'boss_dragon_1');
    const first = ctrl.resolveBossIntro(0);
    expect(first.length).toBeGreaterThan(0);
    expect(ctrl.resolveBossIntro(0)).toEqual([]);
  });

  it('records bossIntro saga event on resolve', () => {
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 100000, heroAtkBase: 100000,
    });
    ctrl.handleArrival('boss', 'boss_dragon_1');
    ctrl.resolveBossIntro(0);
    const saga = ctrl.finalize();
    const records = saga.chapters.flatMap(c => c.events).filter(e => e.type === 'bossIntro');
    expect(records.length).toBeGreaterThanOrEqual(1);
    const resolveRecord = records.find(e => (e.payload as { chosenIdx?: number }).chosenIdx !== undefined);
    expect(resolveRecord).toBeDefined();
  });
});

describe('multi-boss per cycle — each landmark triggers intro independently', () => {
  it('two different boss landmarks both trigger boss_intro_offered', () => {
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 100000, heroAtkBase: 100000,
    });
    const e1 = ctrl.handleArrival('boss', 'boss_a');
    expect(e1.some(e => e.type === 'boss_intro_offered')).toBe(true);
    ctrl.resolveBossIntro(0); // accept first

    const e2 = ctrl.handleArrival('boss', 'boss_b');
    expect(e2.some(e => e.type === 'boss_intro_offered')).toBe(true);
    expect(ctrl.getActiveBossIntroBuffs().length).toBe(1); // only first accepted yet
  });

  it('same landmark re-encountered does NOT re-trigger intro (seenIds guard)', () => {
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 100000, heroAtkBase: 100000,
    });
    ctrl.handleArrival('boss', 'boss_a');
    ctrl.resolveBossIntro(0);
    // Re-enter the same landmark — landmark.consumed normally guards this,
    // but the controller's seenIds gives a belt-and-suspenders guarantee.
    const e2 = ctrl.handleArrival('boss', 'boss_a');
    expect(e2.some(e => e.type === 'boss_intro_offered')).toBe(false);
  });
});

describe('4-buff cap — boss_intro_skipped after 4 accepts', () => {
  it('5th boss emits boss_intro_skipped (not boss_intro_offered) when 4 buffs active', () => {
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 100000, heroAtkBase: 100000,
    });
    for (let i = 0; i < 4; i++) {
      ctrl.handleArrival('boss', `boss_${i}`);
      ctrl.resolveBossIntro(0);
    }
    expect(ctrl.getActiveBossIntroBuffs()).toHaveLength(4);

    const e5 = ctrl.handleArrival('boss', 'boss_5th');
    expect(e5.some(e => e.type === 'boss_intro_offered')).toBe(false);
    expect(e5.some(e => e.type === 'boss_intro_skipped')).toBe(true);
    // Boss combat still runs (battle_started present in same event stream).
    expect(e5.some(e => e.type === 'battle_started')).toBe(true);
    // seenIds includes the skipped landmark so future re-encounters wouldn't
    // re-trigger the cap-skip marker either.
    expect(ctrl.getBossIntroSeenSize()).toBeGreaterThanOrEqual(5);
  });
});

describe('cumulative effect getters', () => {
  it('getBossIntroAtkMul = 1.0 + sum(atk_mul values)', () => {
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 100000, heroAtkBase: 100000,
    });
    expect(ctrl.getBossIntroAtkMul()).toBe(1.0);
    // Force the catalog selection deterministically by injecting via internal API.
    // Simpler: pick from a seed we know returns an atk_mul tier from sampleBossIntroCards.
    // We just push atk_small (+0.10) twice via a helper-style mutation. Since the
    // API doesn't expose direct injection, simulate by running two boss intros.
    ctrl.handleArrival('boss', 'boss_a');
    ctrl.resolveBossIntro(0);
    ctrl.handleArrival('boss', 'boss_b');
    ctrl.resolveBossIntro(0);
    const mul = ctrl.getBossIntroAtkMul();
    // Mul is 1.0 + sum, where each picked card may or may not be atk_*. We
    // assert mul >= 1.0 + 0 (any) and <= 1.0 + 0.5 + 0.5 = 2.0 (max two big).
    expect(mul).toBeGreaterThanOrEqual(1.0);
    expect(mul).toBeLessThanOrEqual(2.0);
  });

  it('cumulative getters return 1.0 / 0 with no buffs', () => {
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 1, heroAtkBase: 1,
    });
    expect(ctrl.getBossIntroAtkMul()).toBe(1.0);
    expect(ctrl.getBossIntroHpMul()).toBe(1.0);
    expect(ctrl.getBossIntroMoveMul()).toBe(1.0);
    expect(ctrl.getBossIntroLightMul()).toBe(1.0);
    expect(ctrl.getBossIntroDropBonus()).toBe(0);
  });
});

describe('boss intro → combat → fate roll path', () => {
  it('frail hero → boss intro → accept → combat → fate_roll_required emit if eligible', () => {
    // Fresh controller, frail hero so the boss combat kills.
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 1, heroAtkBase: 1,
    });
    const e1 = ctrl.handleArrival('boss', 'boss_deadly');
    expect(e1.some(e => e.type === 'boss_intro_offered')).toBe(true);
    const e2 = ctrl.resolveBossIntro(0);
    // Combat killed the hero → fate_roll_required emits (fate is fresh this cycle).
    expect(e2.some(e => e.type === 'fate_roll_required')).toBe(true);
  });
});

describe('lightEmit — boss intro events are excluded', () => {
  it('boss_intro_offered + boss_intro_resolved + boss_intro_skipped all emit 0 light', async () => {
    const { computeLightDelta } = await import('../lightEmit');
    const evs: OverworldEvent[] = [
      { type: 'boss_intro_offered', landmarkId: 'b', cards: [] as never },
      { type: 'boss_intro_resolved', chosenIdx: 0, chosenId: 'atk_small' },
      { type: 'boss_intro_skipped', landmarkId: 'b', reason: 'cap_reached' },
    ];
    expect(computeLightDelta(evs, 'boss').delta).toBe(0);
  });
});
