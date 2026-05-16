import { describe, it, expect } from 'vitest';
import type { Trait, TraitId, TraitModifiers } from '../traits';
import { applyTraitMods } from '../traits';

describe('trait types', () => {
  it('Trait shape compiles with all modifier slots', () => {
    const t: Trait = {
      id: 't_genius',
      nameKR: '천재',
      descKR: 'EXP 획득량 증가.',
      unlockTier: 'base',
      mods: { expMul: 1.2 },
    };
    expect(t.id).toBe('t_genius');
  });

  it('TraitId is a literal union', () => {
    const ids: TraitId[] = ['t_genius', 't_fragile'];
    expect(ids.length).toBe(2);
  });

  it('TraitModifiers covers stat multipliers', () => {
    const m: TraitModifiers = {
      hpMul: 0.7,
      atkMul: 1.0,
      expMul: 1.5,
      bpCostMul: 2.0,
      goldMul: 1.2,
    };
    expect(m.bpCostMul).toBe(2);
  });
});

describe('applyTraitMods', () => {
  it('returns input unchanged when no traits provided', () => {
    const baseLoadout = { characterId: 'K01', bpMax: 30, heroHpMax: 100, heroAtkBase: 10 };
    const result = applyTraitMods(baseLoadout, []);
    // ResolvedLoadout always carries expMul/goldMul/bpCostMul = 1; test the base fields only.
    expect(result).toMatchObject(baseLoadout);
  });

  it('multiplies HP and ATK and BP from trait mods', () => {
    const result = applyTraitMods(
      { characterId: 'K01', bpMax: 30, heroHpMax: 100, heroAtkBase: 10 },
      ['t_genius', 't_fragile'],
      // explicit catalog overrides for unit-testable determinism
      {
        t_genius: { mods: { expMul: 1.2 } },
        t_fragile: { mods: { hpMul: 0.7, atkMul: 0.85 } },
      },
    );
    expect(result.heroHpMax).toBe(70);  // 100 * 0.7
    expect(result.heroAtkBase).toBe(8); // 10 * 0.85 floored
    expect(result.bpMax).toBe(30);       // unchanged
  });

  it('stacks multiplicatively when multiple traits modify the same stat', () => {
    const result = applyTraitMods(
      { characterId: 'K01', bpMax: 30, heroHpMax: 100, heroAtkBase: 10 },
      ['t_a', 't_b'],
      {
        t_a: { mods: { hpMul: 0.7 } },
        t_b: { mods: { hpMul: 0.5 } },
      } as Record<string, { mods: TraitModifiers }>,
    );
    expect(result.heroHpMax).toBe(35); // 100 * 0.7 * 0.5
  });

  it('returns bpMul as a separate field (not pre-applied to bpMax) — controller multiplies per-encounter', () => {
    // bpCostMul should NOT modify bpMax at construction. It's a per-encounter cost multiplier
    // applied in AutoBattleController.consumeBp. applyTraitMods returns the resolved bpCostMul
    // on the loadout for the controller to consume.
    const result = applyTraitMods(
      { characterId: 'K01', bpMax: 30, heroHpMax: 100, heroAtkBase: 10 },
      ['t_terminal_genius'],
      {
        t_terminal_genius: { mods: { bpCostMul: 2.0, expMul: 1.5, atkMul: 1.3, hpMul: 1.3 } },
      } as Record<string, { mods: TraitModifiers }>,
    );
    expect(result.bpMax).toBe(30);
    expect(result.bpCostMul).toBe(2.0);
    expect(result.expMul).toBeCloseTo(1.5);
  });
});
