// games/inflation-rpg/src/systems/playerHp.test.ts
import { describe, it, expect } from 'vitest';
import { computeMaxHp } from './playerHp';
import { EMPTY_RELIC_STACKS } from '../data/relics';
import type { RunState, MetaState, AscTree, AllocatedStats } from '../types';

const EMPTY_ASC: AscTree = {
  hp_pct: 0, atk_pct: 0, gold_drop: 0, bp_start: 0, sp_per_lvl: 0,
  dungeon_currency: 0, crit_damage: 0, asc_accel: 0,
  mod_magnitude: 0, effect_proc: 0,
};

const EMPTY_ALLOC: AllocatedStats = { hp: 0, atk: 0, def: 0, agi: 0, luc: 0 };

function makeRun(overrides: Partial<RunState> = {}): RunState {
  return {
    characterId: 'hwarang',
    level: 1,
    exp: 0,
    bp: 5,
    statPoints: 0,
    allocated: { ...EMPTY_ALLOC },
    currentDungeonId: null,
    currentFloor: 1,
    isHardMode: false,
    monstersDefeated: 0,
    goldThisRun: 0,
    currentStage: 1,
    dungeonRunMonstersDefeated: 0,
    featherUsed: 0,
    playerHp: null,
    ...overrides,
  };
}

function makeMeta(overrides: Partial<MetaState> = {}): MetaState {
  return {
    ascTier: 0,
    ascTree: { ...EMPTY_ASC },
    baseAbilityLevel: 0,
    characterLevels: {},
    inventory: { weapons: [], armors: [], accessories: [] },
    equippedItemIds: [],
    mythicOwned: [],
    mythicEquipped: [null, null, null, null, null],
    relicStacks: { ...EMPTY_RELIC_STACKS },
    ...overrides,
  } as unknown as MetaState;
}

describe('computeMaxHp', () => {
  it('returns positive HP for default run + empty meta', () => {
    const hp = computeMaxHp(makeRun(), makeMeta());
    expect(hp).toBeGreaterThan(0);
  });

  it('increases with allocated.hp investment', () => {
    const noAlloc = computeMaxHp(makeRun({ allocated: { ...EMPTY_ALLOC } }), makeMeta());
    const withAlloc = computeMaxHp(makeRun({ allocated: { ...EMPTY_ALLOC, hp: 100 } }), makeMeta());
    expect(withAlloc).toBeGreaterThan(noAlloc);
  });

  it('increases with character level', () => {
    const lvl1 = computeMaxHp(makeRun(), makeMeta({ characterLevels: { hwarang: 1 } }));
    const lvl10 = computeMaxHp(makeRun(), makeMeta({ characterLevels: { hwarang: 10 } }));
    expect(lvl10).toBeGreaterThan(lvl1);
  });

  it('increases with ascTier', () => {
    const tier0 = computeMaxHp(makeRun(), makeMeta({ ascTier: 0 }));
    const tier5 = computeMaxHp(makeRun(), makeMeta({ ascTier: 5 }));
    expect(tier5).toBeGreaterThan(tier0);
  });

  it('falls back to 100 for unknown characterId', () => {
    expect(computeMaxHp(makeRun({ characterId: 'nonexistent-char' }), makeMeta())).toBe(100);
  });

  it('applies mythic flat_mult on hp (tier5_seal: HP +50%)', () => {
    const base = computeMaxHp(makeRun(), makeMeta());
    const buffed = computeMaxHp(makeRun(), makeMeta({
      mythicOwned: ['tier5_seal'],
      mythicEquipped: ['tier5_seal', null, null, null, null],
    }));
    expect(buffed).toBeGreaterThan(base);
    expect(buffed).toBeCloseTo(base * 1.5, -1);
  });
});
