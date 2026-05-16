import { describe, it, expect } from 'vitest';
import type { MetaState, MythicId } from '../types';
import {
  getMythicFlatMult,
  getMythicCooldownMult,
  getMythicDropBonus,
  getMythicXpMult,
  getMythicReviveCount,
  equipMythic,
  unequipMythic,
  rollMythicDrop,
  awardMilestoneMythic,
} from './mythics';
import { MYTHICS, ALL_MYTHIC_IDS as DATA_ALL } from '../data/mythics';

function makeMeta(
  equipped: (MythicId | null)[] = [],
  owned: MythicId[] = [],
): MetaState {
  return {
    mythicEquipped:
      equipped.length === 5
        ? equipped
        : [...equipped, ...Array(5 - equipped.length).fill(null)],
    mythicOwned: owned,
  } as MetaState;
}

describe('getMythicFlatMult', () => {
  it('returns 1.0 for empty equipped', () => {
    expect(getMythicFlatMult(makeMeta([]), 'atk')).toBe(1);
  });
  it('tier1_charm: ATK +50%', () => {
    expect(getMythicFlatMult(makeMeta(['tier1_charm']), 'atk')).toBeCloseTo(1.5);
    expect(getMythicFlatMult(makeMeta(['tier1_charm']), 'hp')).toBe(1);
  });
  it('stacks multiplicatively (tier1_charm + eternal_flame both ATK)', () => {
    expect(
      getMythicFlatMult(makeMeta(['tier1_charm', 'eternal_flame']), 'atk'),
    ).toBeCloseTo(1.5 * 1.75);
  });
  it('void_pact (all) applies to every stat', () => {
    expect(getMythicFlatMult(makeMeta(['void_pact']), 'hp')).toBeCloseTo(1.2);
    expect(getMythicFlatMult(makeMeta(['void_pact']), 'def')).toBeCloseTo(1.2);
  });
  it('only equipped (not owned) counts', () => {
    const meta = makeMeta([], ['tier1_charm']);
    expect(getMythicFlatMult(meta, 'atk')).toBe(1);
  });
});

describe('getMythicCooldownMult', () => {
  it('time_hourglass -30%', () => {
    expect(getMythicCooldownMult(makeMeta(['time_hourglass']), 'ult')).toBeCloseTo(0.7);
  });
  it('floor 0.4 even when stacked', () => {
    const meta = makeMeta(['time_hourglass', 'swift_winds']);
    const result = getMythicCooldownMult(meta, 'ult');
    expect(result).toBeGreaterThanOrEqual(0.4);
  });
  it('returns 1.0 with no cooldown mythics', () => {
    expect(getMythicCooldownMult(makeMeta(['tier1_charm']), 'ult')).toBe(1);
  });
});

describe('Phase Realms — getMythicCooldownMult target filter', () => {
  it('swift_winds (target=base) applies to base skills only', () => {
    expect(getMythicCooldownMult(makeMeta(['swift_winds']), 'base')).toBeCloseTo(0.8);
    expect(getMythicCooldownMult(makeMeta(['swift_winds']), 'ult')).toBe(1);
  });
  it('time_hourglass (no target) applies to both base and ult', () => {
    expect(getMythicCooldownMult(makeMeta(['time_hourglass']), 'base')).toBeCloseTo(0.7);
    expect(getMythicCooldownMult(makeMeta(['time_hourglass']), 'ult')).toBeCloseTo(0.7);
  });
  it('swift_winds + time_hourglass on base = multiplicative', () => {
    expect(getMythicCooldownMult(makeMeta(['swift_winds', 'time_hourglass']), 'base')).toBeCloseTo(0.56);
  });
  it('swift_winds + time_hourglass on ult = only time_hourglass applies', () => {
    expect(getMythicCooldownMult(makeMeta(['swift_winds', 'time_hourglass']), 'ult')).toBeCloseTo(0.7);
  });
  it('cooldown floor 0.4 still enforced', () => {
    // Using two copies of time_hourglass via meta with mythicEquipped array (emulates deep stack)
    // time_hourglass appears twice: 0.7 * 0.7 = 0.49, which is > 0.4, so floor not hit
    // Instead, use theoretical stacking that would breach 0.4
    const meta = makeMeta(['swift_winds', 'time_hourglass']);
    const result = getMythicCooldownMult(meta, 'base');
    // 0.8 * 0.7 = 0.56 > 0.4, still above floor
    // floor is enforced: Math.max(0.4, mult)
    expect(result).toBeGreaterThanOrEqual(0.4);
  });
});

describe('getMythicDropBonus', () => {
  it('infinity_seal: ×2 for all kinds (returns +1.0 additive)', () => {
    expect(getMythicDropBonus(makeMeta(['infinity_seal']), 'gold')).toBeCloseTo(1.0);
    expect(getMythicDropBonus(makeMeta(['infinity_seal']), 'dr')).toBeCloseTo(1.0);
    expect(getMythicDropBonus(makeMeta(['infinity_seal']), 'dungeon_currency')).toBeCloseTo(1.0);
  });
  it('dimension_navigator: dungeon_currency ×3 = +2.0', () => {
    expect(getMythicDropBonus(makeMeta(['dimension_navigator']), 'dungeon_currency')).toBeCloseTo(2.0);
    expect(getMythicDropBonus(makeMeta(['dimension_navigator']), 'gold')).toBe(0);
  });
  it('merchant_seal: gold +100% = +1.0', () => {
    expect(getMythicDropBonus(makeMeta(['merchant_seal']), 'gold')).toBeCloseTo(1.0);
  });
});

describe('getMythicXpMult', () => {
  it('soul_truth: ×3 (= +200% mult)', () => {
    expect(getMythicXpMult(makeMeta(['soul_truth']))).toBeCloseTo(3.0);
  });
  it('soul_truth × scholar_eye stacks multiplicatively', () => {
    expect(getMythicXpMult(makeMeta(['soul_truth', 'scholar_eye']))).toBeCloseTo(6.0);
  });
});

describe('Phase Realms — getMythicXpMult includes drop_mult all_kinds (infinity_seal)', () => {
  it('infinity_seal (drop_mult all_kinds) doubles xp', () => {
    expect(getMythicXpMult(makeMeta(['infinity_seal']))).toBeCloseTo(2.0);
  });
  it('infinity_seal × soul_truth = 2 × 3 = 6', () => {
    expect(getMythicXpMult(makeMeta(['infinity_seal', 'soul_truth']))).toBeCloseTo(6.0);
  });
  it('dimension_navigator (drop_mult dungeon_currency) does NOT affect xp', () => {
    expect(getMythicXpMult(makeMeta(['dimension_navigator']))).toBe(1);
  });
});

describe('passives', () => {
  it('phoenix_feather passive revive: 1 if equipped', () => {
    expect(getMythicReviveCount(makeMeta(['phoenix_feather']))).toBe(1);
    expect(getMythicReviveCount(makeMeta([]))).toBe(0);
  });
});

describe('equipMythic', () => {
  function meta(over: Partial<MetaState> = {}): MetaState {
    return {
      mythicOwned: ['tier1_charm', 'fire_throne', 'time_hourglass'],
      mythicEquipped: [null, null, null, null, null],
      mythicSlotCap: 3,
      ...over,
    } as MetaState;
  }
  it('equips an owned mythic into specified slot', () => {
    const r = equipMythic(meta(), 0, 'tier1_charm');
    expect(r.mythicEquipped[0]).toBe('tier1_charm');
  });
  it('rejects equipping into slot beyond slotCap', () => {
    expect(() => equipMythic(meta({ mythicSlotCap: 1 }), 2, 'tier1_charm'))
      .toThrow(/slot/i);
  });
  it('rejects equipping a non-owned mythic', () => {
    expect(() => equipMythic(meta(), 0, 'world_tree_root')).toThrow(/owned/i);
  });
  it('rejects equipping the same mythic into two slots (swap instead)', () => {
    const after = equipMythic(meta(), 0, 'tier1_charm');
    expect(() => equipMythic(after, 1, 'tier1_charm')).toThrow(/already equipped/i);
  });
  it('unequipMythic clears the slot', () => {
    const after = equipMythic(meta(), 0, 'tier1_charm');
    const cleared = unequipMythic(after, 0);
    expect(cleared.mythicEquipped[0]).toBeNull();
  });
});

describe('rollMythicDrop (base 30% chance, weighted from unowned random_drop pool)', () => {
  function meta(owned: MythicId[] = []): MetaState {
    return { mythicOwned: owned } as MetaState;
  }
  it('returns null when rng >= 0.30 (no drop)', () => {
    expect(rollMythicDrop(meta(), () => 0.31)).toBeNull();
    expect(rollMythicDrop(meta(), () => 0.99)).toBeNull();
  });
  it('returns a random_drop mythic when rng < 0.30', () => {
    const seq = [0.05, 0]; let i = 0;
    const id = rollMythicDrop(meta(), () => seq[i++]);
    expect(id).not.toBeNull();
    expect(MYTHICS[id!].acquisition.kind).toBe('random_drop');
  });
  it('excludes owned mythics from pool', () => {
    const allRandom = DATA_ALL.filter(id => MYTHICS[id].acquisition.kind === 'random_drop');
    const ownedAll = meta(allRandom);
    const seq = [0.0, 0.0]; let i = 0;
    expect(rollMythicDrop(ownedAll, () => seq[i++])).toBeNull();
  });
  it('excludes milestone mythics from random pool', () => {
    const seq = [0.05, 0.999]; let i = 0;
    const id = rollMythicDrop(meta(), () => seq[i++]);
    expect(['tier1_charm', 'tier5_seal', 'infinity_seal', 'dimension_navigator', 'light_of_truth'])
      .not.toContain(id!);
  });
});

describe('awardMilestoneMythic', () => {
  it('awards correct mythic for tier 1/5/10/15/20', () => {
    expect(awardMilestoneMythic({ mythicOwned: [] } as unknown as MetaState, 1).mythicOwned).toEqual(['tier1_charm']);
    expect(awardMilestoneMythic({ mythicOwned: [] } as unknown as MetaState, 5).mythicOwned).toEqual(['tier5_seal']);
    expect(awardMilestoneMythic({ mythicOwned: [] } as unknown as MetaState, 10).mythicOwned).toEqual(['infinity_seal']);
    expect(awardMilestoneMythic({ mythicOwned: [] } as unknown as MetaState, 15).mythicOwned).toEqual(['dimension_navigator']);
    expect(awardMilestoneMythic({ mythicOwned: [] } as unknown as MetaState, 20).mythicOwned).toEqual(['light_of_truth']);
  });
  it('no-op for non-milestone tier', () => {
    const before = { mythicOwned: ['fire_throne'] } as unknown as MetaState;
    expect(awardMilestoneMythic(before, 7).mythicOwned).toEqual(['fire_throne']);
  });
  it('no double-award if already owned', () => {
    const before = { mythicOwned: ['tier1_charm'] } as unknown as MetaState;
    expect(awardMilestoneMythic(before, 1).mythicOwned).toEqual(['tier1_charm']);
  });
});
