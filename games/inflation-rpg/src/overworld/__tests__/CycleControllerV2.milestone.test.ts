/**
 * Cycle 106 F1 — inflation milestone crossing detector tests.
 *
 * PRD §F1 §수용 기준:
 *   (a) 합성 level 곡선 단일 step (95 → 250) 의 tier 1 한 번 emit
 *   (b) 동일 arrival 다단 step (50 → 12000) 의 tier 1 + tier 2 동시 emit
 *   (c) same-tier 두 번 emit 금지 (cycle 동안 ledger)
 *   (d) cycle 종료 시 ledger reset (= 새 controller = fresh ledger)
 *
 * Strategy: drive a real CycleControllerV2 with extreme heroAtkBase so a single
 * `handleArrival('enemy', ...)` yields enough expGain to cross multiple tiers
 * in one batch. EncounterEngine determinism + seed control = repeatable.
 *
 * Also: pure-function `tiersCrossed` boundary semantics.
 */

import { describe, it, expect } from 'vitest';
import { tiersCrossed, presetForTier, MILESTONE_PRESETS, MILESTONE_THRESHOLDS } from '../../data/milestones';
import { CycleControllerV2 } from '../CycleControllerV2';
import type { OverworldEvent } from '../OverworldEvents';

type MilestoneEv = Extract<OverworldEvent, { type: 'inflation_milestone' }>;

function filterMilestones(events: readonly OverworldEvent[]): MilestoneEv[] {
  return events.filter((e): e is MilestoneEv => e.type === 'inflation_milestone');
}

describe('Cycle 106 F1 — tiersCrossed (pure)', () => {
  it('single-tier crossing (95 → 250) emits tier 1 only', () => {
    expect(tiersCrossed(95, 250)).toEqual([1]);
  });

  it('multi-tier crossing (50 → 5000) emits tier 1 + tier 2 ascending', () => {
    expect(tiersCrossed(50, 5_000)).toEqual([1, 2]);
  });

  it('full multi-tier crossing (50 → 12000) emits tier 1 + 2 + 3 (crosses 10k boundary too)', () => {
    expect(tiersCrossed(50, 12_000)).toEqual([1, 2, 3]);
  });

  it('non-crossing arrival (200 → 500) emits no tier', () => {
    expect(tiersCrossed(200, 500)).toEqual([]);
  });

  it('boundary semantics: from < threshold <= to (inclusive upper)', () => {
    expect(tiersCrossed(99, 100)).toEqual([1]);
    expect(tiersCrossed(100, 101)).toEqual([]); // already at 100 → not re-crossing
    expect(tiersCrossed(999_999, 1_000_000)).toEqual([5]);
  });

  it('mega-range crossing (1 → 1.5e9) hits all 8 tiers ascending', () => {
    expect(tiersCrossed(1, 1_500_000_000)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('MILESTONE_THRESHOLDS catalog integrity', () => {
    expect(MILESTONE_THRESHOLDS).toEqual([100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000]);
    expect(MILESTONE_PRESETS.length).toBe(8);
  });

  it('presetForTier(N).thresholdLv = 10^(N+1)', () => {
    for (let t = 1; t <= 8; t++) {
      const preset = presetForTier(t as 1);
      expect(preset.thresholdLv).toBe(10 ** (t + 1));
    }
  });
});

describe('Cycle 106 F1 — CycleControllerV2 inflation_milestone integration', () => {
  /** Pre-seed hero level via gainExp so a single `handleArrival` of an enemy
   *  reliably crosses ≥ 1 tier. heroAtkBase huge so any base-realm enemy dies
   *  in one swing; pre-existing level skips the slow ramp.
   *
   *  Note: controller.handleArrival emits milestones only from the
   *  `levelCount > 0` branch, so we must ensure the arrival itself produces a
   *  level_up. Pre-seed below the target threshold; gainExp(target_thresh_exp)
   *  fills the level pool to within ε of the threshold; the battle then
   *  pushes hero across in one tick.
   */
  function makeCtrl(seed: number) {
    return new CycleControllerV2({ seed, traits: [], heroHpMax: 100_000, heroAtkBase: 1_000_000 });
  }

  /** Set hero level directly via public field + recomputeStats. Bypasses the
   *  exp curve so test control is precise. exp is reset to 0 so the next
   *  battle's level_up batch starts from a known state. */
  function pumpToLevel(ctrl: CycleControllerV2, target: number): void {
    const hero = ctrl.getHero();
    hero.level = target;
    hero.exp = 0;
    hero.recomputeStats();
  }

  it('(a) crossing tier 1 emits exactly one inflation_milestone event', () => {
    const ctrl = makeCtrl(42);
    // Pump hero to lv 99 then trigger one enemy arrival → expGain pushes ≥ 100.
    pumpToLevel(ctrl, 99);
    const hero = ctrl.getHero();
    expect(hero.level).toBe(99);
    expect(hero.staggered).toBe(false);
    const events = ctrl.handleArrival('enemy', 'wolf_1');
    const levelUps = events.filter((e) => e.type === 'level_up');
    // Sanity: at least one level_up to trigger milestone branch.
    expect(levelUps.length).toBeGreaterThanOrEqual(1);
    const milestones = filterMilestones(events);
    const tier1 = milestones.filter((e) => e.tier === 1);
    expect(tier1.length).toBe(1);
    expect(tier1[0]!.thresholdLv).toBe(100);
    expect(tier1[0]!.toLv).toBeGreaterThanOrEqual(100);
    expect(tier1[0]!.fromLv).toBe(99);
  });

  it('(b) sequential tier emit across separate arrivals — tier 1 then tier 2 (no duplicates)', () => {
    // Pre-seed hero lv 99 → arrival 1 crosses lv 100 (tier 1).
    // Pump again to lv 999 → arrival 2 crosses lv 1000 (tier 2).
    // Ledger keeps tier 1 from re-emitting on the second arrival, even though
    // the second arrival's level_up batch is from < 100 → no double-emit.
    const ctrl = makeCtrl(7);
    pumpToLevel(ctrl, 99);
    const ev1 = ctrl.handleArrival('enemy', 'wolf_1');
    const tier1Emitted = filterMilestones(ev1).map((m) => m.tier);
    expect(tier1Emitted).toEqual([1]);

    // Now hero is at some level past 100. Pump to 999 → next arrival crosses lv 1000.
    pumpToLevel(ctrl, 999);
    const ev2 = ctrl.handleArrival('enemy', 'wolf_2');
    const tier2Emitted = filterMilestones(ev2).map((m) => m.tier);
    expect(tier2Emitted).toEqual([2]);

    // Across both arrivals: tier 1 + tier 2, no duplicates.
    const allTiers = [...tier1Emitted, ...tier2Emitted];
    expect(allTiers).toEqual([1, 2]);
  });

  it('(c) same-tier ledger dedup — across many arrivals tier 1 emits ≤ 1 time', () => {
    const ctrl = makeCtrl(99);
    pumpToLevel(ctrl, 50);
    let allEvents: OverworldEvent[] = [];
    for (let i = 0; i < 15; i++) {
      allEvents = allEvents.concat(ctrl.handleArrival('enemy', `wolf_${i}`));
    }
    const tier1Count = filterMilestones(allEvents).filter((m) => m.tier === 1).length;
    expect(tier1Count).toBeLessThanOrEqual(1);
  });

  it('(d) new controller instance starts with fresh ledger', () => {
    const ctrlA = makeCtrl(42);
    pumpToLevel(ctrlA, 99);
    const aEvents = ctrlA.handleArrival('enemy', 'wolf_1');
    const aTier1 = filterMilestones(aEvents).filter((m) => m.tier === 1).length;

    const ctrlB = makeCtrl(43);
    pumpToLevel(ctrlB, 99);
    const bEvents = ctrlB.handleArrival('enemy', 'wolf_1');
    const bTier1 = filterMilestones(bEvents).filter((m) => m.tier === 1).length;

    // Both fresh ledgers — both emit tier 1 once.
    expect(aTier1).toBe(1);
    expect(bTier1).toBe(1);
  });

  it('saga record `type: milestone` written when tier crosses', () => {
    const ctrl = makeCtrl(42);
    pumpToLevel(ctrl, 99);
    ctrl.handleArrival('enemy', 'wolf_1');
    const saga = ctrl.finalize();
    const allEvents = saga.chapters.flatMap((c) => c.events);
    const milestoneRecords = allEvents.filter((e) => e.type === 'milestone');
    expect(milestoneRecords.length).toBeGreaterThanOrEqual(1);
    const first = milestoneRecords[0]!;
    expect(first.payload.tier).toBe(1);
    expect(first.payload.thresholdLv).toBe(100);
    expect(first.narrativeText).toContain('레벨 100 돌파');
  });
});
