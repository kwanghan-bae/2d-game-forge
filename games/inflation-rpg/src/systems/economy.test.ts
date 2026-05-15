import { describe, it, expect } from 'vitest';
import { applyDropMult, applyMetaDropMult } from './economy';
import { EMPTY_RELIC_STACKS } from '../data/relics';
import type { MetaState, AscTree } from '../types';

describe('applyDropMult', () => {
  it('lv 0 = baseline', () => {
    expect(applyDropMult(1000, 0.10, 0)).toBe(1000);
  });

  it('lv 5 × 10% = +50% (1.5×)', () => {
    expect(applyDropMult(1000, 0.10, 5)).toBe(1500);
  });

  it('floor result', () => {
    expect(applyDropMult(100, 0.10, 3)).toBe(130);   // 100 × 1.3 = 130
    expect(applyDropMult(7, 0.10, 5)).toBe(10);      // 7 × 1.5 = 10.5 → floor 10
  });

  it('zero amount stays zero', () => {
    expect(applyDropMult(0, 0.10, 5)).toBe(0);
  });
});

describe('applyMetaDropMult — full Phase E aggregate', () => {
  const EMPTY_ASC: AscTree = {
    hp_pct: 0, atk_pct: 0, gold_drop: 0, bp_start: 0, sp_per_lvl: 0,
    dungeon_currency: 0, crit_damage: 0, asc_accel: 0,
    mod_magnitude: 0, effect_proc: 0,
  };

  function makeMeta(opts: Partial<{
    ascTree: AscTree;
    mythicEquipped: (string | null)[];
    mythicOwned: string[];
    relicStacks: MetaState['relicStacks'];
  }> = {}): MetaState {
    return {
      ascTree: opts.ascTree ?? { ...EMPTY_ASC },
      mythicEquipped: opts.mythicEquipped ?? [null, null, null, null, null],
      mythicOwned: opts.mythicOwned ?? [],
      relicStacks: opts.relicStacks ?? { ...EMPTY_RELIC_STACKS },
    } as unknown as MetaState;
  }

  it('returns base when no bonuses', () => {
    expect(applyMetaDropMult(100, 'gold', makeMeta())).toBe(100);
  });

  it('applies gold_coin relic +1% per stack', () => {
    expect(applyMetaDropMult(100, 'gold', makeMeta({ relicStacks: { ...EMPTY_RELIC_STACKS, gold_coin: 50 } })))
      .toBe(150);
  });

  it('applies merchant_seal mythic +100%', () => {
    expect(applyMetaDropMult(100, 'gold', makeMeta({ mythicEquipped: ['merchant_seal', null, null, null, null] })))
      .toBe(200);
  });

  it('applies infinity_seal mythic +100% (all kinds)', () => {
    expect(applyMetaDropMult(100, 'dungeon_currency',
      makeMeta({ mythicEquipped: ['infinity_seal', null, null, null, null] }))).toBe(200);
  });

  it('mythic + relic + ascTree stack additively (gold path)', () => {
    // ascTree gold_drop lv 5 = +50%, gold_coin 50 stacks = +50%, merchant_seal = +100% → +200% → 300
    const meta = makeMeta({
      ascTree: { ...EMPTY_ASC, gold_drop: 5 },
      relicStacks: { ...EMPTY_RELIC_STACKS, gold_coin: 50 },
      mythicEquipped: ['merchant_seal', null, null, null, null],
    });
    expect(applyMetaDropMult(100, 'gold', meta)).toBe(300);
  });

  it('DR kind: ascTree has no dr node → only mythic+relic contribute', () => {
    const meta = makeMeta({
      relicStacks: { ...EMPTY_RELIC_STACKS, sands_of_time: 30 },     // +30% DR drop
    });
    expect(applyMetaDropMult(100, 'dr', meta)).toBe(130);
  });

  it('dungeon_currency kind: ascTree dungeon_currency lv 5 alone = +50% (no double-count)', () => {
    // Locks in callsite 3 (stones) behavior: when applyMetaDropMult is called directly
    // (not chained through applyDropMult), ascTree.dungeon_currency contributes exactly once.
    const meta = makeMeta({ ascTree: { ...EMPTY_ASC, dungeon_currency: 5 } });
    expect(applyMetaDropMult(100, 'dungeon_currency', meta)).toBe(150);
  });
});
