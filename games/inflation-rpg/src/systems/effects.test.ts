// games/inflation-rpg/src/systems/effects.test.ts
import { describe, it, expect } from 'vitest';
import {
  createEffectsState, addEffect, tickEffects, evaluateTriggers,
  processIncomingDamage, getDebuffStatMultiplier, applyProcMult,
  registerMythicProcs, evaluateMythicProcs,
  type CombatStateForEffects,
} from './effects';
import type { ActiveEffect } from '../types';

const baseCombat: CombatStateForEffects = {
  selfHp: 1000, selfMaxHp: 1000,
  enemyHp: 5000, enemyMaxHp: 5000,
  selfAtk: 200, selfDef: 50,
};

function makeDot(): ActiveEffect {
  return {
    id: 'dot_poison',
    effectType: 'dot',
    source: 'modifier',
    target: 'enemy',
    durationMs: 5000,
    remainingMs: 5000,
    magnitude: 100,
    stack: 1,
  };
}

describe('effects state lifecycle', () => {
  it('createEffectsState returns empty map', () => {
    const s = createEffectsState();
    expect(s.active.size).toBe(0);
  });

  it('addEffect adds new effect', () => {
    const s = createEffectsState();
    addEffect(s, makeDot());
    expect(s.active.size).toBe(1);
    expect(s.active.get('dot_poison')?.magnitude).toBe(100);
  });

  it('addEffect debuff stack increments', () => {
    const s = createEffectsState();
    const d: ActiveEffect = {
      id: 'debuff_weaken', effectType: 'debuff', source: 'modifier', target: 'enemy',
      durationMs: 3000, remainingMs: 3000, magnitude: 0.5, stack: 1,
    };
    addEffect(s, d);
    addEffect(s, d);
    expect(s.active.get('debuff_weaken')?.stack).toBe(2);
  });
});

describe('tickEffects — dot', () => {
  it('dot deals enemyHpDelta per second', () => {
    const s = createEffectsState();
    addEffect(s, makeDot());
    const result = tickEffects(s, baseCombat, 1000);
    expect(result.stateDelta.enemyHpDelta).toBe(-100);
    expect(result.events).toContainEqual(expect.objectContaining({ kind: 'damage', amount: 100 }));
  });

  it('dot expires when remainingMs <= 0', () => {
    const s = createEffectsState();
    addEffect(s, makeDot());
    tickEffects(s, baseCombat, 5500);
    expect(s.active.size).toBe(0);
  });
});

describe('tickEffects — cc blocks action', () => {
  it('cc on enemy → actionBlocked', () => {
    const s = createEffectsState();
    addEffect(s, {
      id: 'cc_stun', effectType: 'cc', source: 'ult', target: 'enemy',
      durationMs: 2000, remainingMs: 2000, magnitude: 0, stack: 1,
    });
    const result = tickEffects(s, baseCombat, 100);
    expect(result.stateDelta.actionBlocked).toBe(true);
  });
});

describe('evaluateTriggers', () => {
  it('on_hp_below trigger fires when ratio < threshold', () => {
    const s = createEffectsState();
    addEffect(s, {
      id: 'trigger_execute', effectType: 'trigger', source: 'modifier', target: 'enemy',
      durationMs: 999999, remainingMs: 999999, magnitude: 9999, stack: 1,
      triggerCondition: { kind: 'on_hp_below', thresholdRatio: 0.2 },
    });
    const lowHp = { ...baseCombat, enemyHp: 500 };
    const events = evaluateTriggers(s, 'on_hp_change', lowHp);
    expect(events).toContainEqual(expect.objectContaining({ kind: 'trigger_fire' }));
  });

  it('on_kill trigger fires only on kill event', () => {
    const s = createEffectsState();
    addEffect(s, {
      id: 'trigger_soul', effectType: 'trigger', source: 'modifier', target: 'self',
      durationMs: 999999, remainingMs: 999999, magnitude: 50, stack: 1,
      triggerCondition: { kind: 'on_kill' },
    });
    expect(evaluateTriggers(s, 'on_hit', baseCombat).length).toBe(0);
    expect(evaluateTriggers(s, 'on_kill', baseCombat).length).toBe(1);
  });
});

describe('processIncomingDamage', () => {
  it('shield absorbs incoming damage', () => {
    const s = createEffectsState();
    addEffect(s, {
      id: 'shield_basic', effectType: 'shield', source: 'modifier', target: 'self',
      durationMs: 5000, remainingMs: 5000, magnitude: 200, stack: 1,
    });
    const r = processIncomingDamage(s, 100);
    expect(r.damageAfterShield).toBe(0);
    expect(s.active.get('shield_basic')?.magnitude).toBe(100);
  });

  it('shield expires when fully absorbed', () => {
    const s = createEffectsState();
    addEffect(s, {
      id: 'shield_basic', effectType: 'shield', source: 'modifier', target: 'self',
      durationMs: 5000, remainingMs: 5000, magnitude: 50, stack: 1,
    });
    const r = processIncomingDamage(s, 100);
    expect(r.damageAfterShield).toBe(50);
    expect(s.active.size).toBe(0);
  });

  it('reflect returns damage to enemy', () => {
    const s = createEffectsState();
    addEffect(s, {
      id: 'reflect_basic', effectType: 'reflect', source: 'ult', target: 'self',
      durationMs: 3000, remainingMs: 3000, magnitude: 0.8, stack: 1,
    });
    const r = processIncomingDamage(s, 100);
    expect(r.reflectDamage).toBe(80);
  });
});

describe('getDebuffStatMultiplier', () => {
  it('returns 1 when no debuff', () => {
    const s = createEffectsState();
    expect(getDebuffStatMultiplier(s, 'enemy')).toBe(1);
  });

  it('debuff -50% × stack 2 → 0', () => {
    const s = createEffectsState();
    addEffect(s, {
      id: 'debuff_weaken', effectType: 'debuff', source: 'modifier', target: 'enemy',
      durationMs: 3000, remainingMs: 3000, magnitude: 0.5, stack: 2,
    });
    expect(getDebuffStatMultiplier(s, 'enemy')).toBeCloseTo(0, 2);
  });
});

describe('applyProcMult (Phase G effect_proc hook)', () => {
  it('lv 0 = baseline chance', () => {
    expect(applyProcMult(0.1, 0)).toBeCloseTo(0.1, 6);
  });

  it('lv 5 = +25% (×1.25)', () => {
    expect(applyProcMult(0.1, 5)).toBeCloseTo(0.125, 6);
  });

  it('clamps to 1.0 max', () => {
    expect(applyProcMult(0.9, 5)).toBe(1.0);    // 0.9 × 1.25 = 1.125 → cap 1.0
    expect(applyProcMult(1.0, 0)).toBe(1.0);
    expect(applyProcMult(1.5, 0)).toBe(1.0);   // input > 1 also capped
  });

  it('0 chance stays 0', () => {
    expect(applyProcMult(0, 5)).toBe(0);
  });

  it('negative chance treated as 0', () => {
    expect(applyProcMult(-0.1, 5)).toBe(0);
  });
});

describe('mythic proc triggers (Phase E)', () => {
  it('registerMythicProcs sets permanentTriggers', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [
      { trigger: 'on_player_attack', effect: 'lifesteal', value: 0.2 },
    ]);
    expect(state.permanentTriggers).toHaveLength(1);
  });

  it('lifesteal: 20% of damage dealt converted to heal', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [
      { trigger: 'on_player_attack', effect: 'lifesteal', value: 0.2 },
    ]);
    const result = evaluateMythicProcs(state, 'on_player_attack', { damageDealt: 100 });
    expect(result.lifestealHeal).toBeCloseTo(20);
    expect(result.thornsReflect).toBe(0);
  });

  it('thorns: 50% of received damage reflected', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [
      { trigger: 'on_player_hit_received', effect: 'thorns', value: 0.5 },
    ]);
    const result = evaluateMythicProcs(state, 'on_player_hit_received', { damageReceived: 200 });
    expect(result.thornsReflect).toBeCloseTo(100);
  });

  it('sp_steal on_player_attack is ignored (only on_kill path active)', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [
      { trigger: 'on_player_attack', effect: 'sp_steal', value: 0.3 },
    ]);
    const result = evaluateMythicProcs(state, 'on_player_attack', { damageDealt: 100 });
    expect(result.cooldownReduce).toBe(0);
  });

  it('magic_burst: deterministic 50% bonus damage when proc rng < chance', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [
      { trigger: 'on_player_attack', effect: 'magic_burst', value: 0.15 },
    ]);
    // rng = 0.05 < 0.15 → proc fires
    const fired = evaluateMythicProcs(state, 'on_player_attack', { damageDealt: 200, rng: () => 0.05 });
    expect(fired.magicBurstDamage).toBeCloseTo(100);  // 200 × 0.5
    // rng = 0.5 > 0.15 → no proc
    const missed = evaluateMythicProcs(state, 'on_player_attack', { damageDealt: 200, rng: () => 0.5 });
    expect(missed.magicBurstDamage).toBe(0);
  });

  it('only matching trigger fires', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [
      { trigger: 'on_player_attack', effect: 'lifesteal', value: 0.2 },
    ]);
    const result = evaluateMythicProcs(state, 'on_player_hit_received', { damageReceived: 100 });
    expect(result.lifestealHeal).toBe(0);
  });

  it('multiple procs aggregate — lifesteal fires, sp_steal on_player_attack ignored', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [
      { trigger: 'on_player_attack', effect: 'lifesteal', value: 0.2 },
      { trigger: 'on_player_attack', effect: 'sp_steal', value: 0.3 },
    ]);
    const result = evaluateMythicProcs(state, 'on_player_attack', { damageDealt: 100 });
    expect(result.lifestealHeal).toBeCloseTo(20);
    expect(result.cooldownReduce).toBe(0);
  });
});

describe('Phase Realms — evaluateMythicProcs on_kill trigger + cooldownReduce', () => {
  it('on_kill trigger with sp_steal effect emits cooldownReduce = value', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [{ trigger: 'on_kill', effect: 'sp_steal', value: 0.3 }]);
    const result = evaluateMythicProcs(state, 'on_kill', {});
    expect(result.cooldownReduce).toBeCloseTo(0.3);
    expect(result.lifestealHeal).toBe(0);
  });
  it('on_kill with no procs returns 0 cooldownReduce', () => {
    const state = createEffectsState();
    registerMythicProcs(state, []);
    expect(evaluateMythicProcs(state, 'on_kill', {}).cooldownReduce).toBe(0);
  });
  it('multiple on_kill sp_steal stack additively', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [
      { trigger: 'on_kill', effect: 'sp_steal', value: 0.3 },
      { trigger: 'on_kill', effect: 'sp_steal', value: 0.5 },
    ]);
    expect(evaluateMythicProcs(state, 'on_kill', {}).cooldownReduce).toBeCloseTo(0.8);
  });
  it('on_kill ignores on_player_attack lifesteal procs', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [{ trigger: 'on_player_attack', effect: 'lifesteal', value: 0.2 }]);
    expect(evaluateMythicProcs(state, 'on_kill', {}).lifestealHeal).toBe(0);
  });
});

describe('Phase Realms — light_of_truth applies to proc magnitudes via magnitudeBuff', () => {
  it('lifesteal heal is ×1.25 when magnitudeBuff=1.25', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [{ trigger: 'on_player_attack', effect: 'lifesteal', value: 0.2 }]);
    const baseHeal = evaluateMythicProcs(state, 'on_player_attack', { damageDealt: 100 }).lifestealHeal;
    const buffedHeal = evaluateMythicProcs(state, 'on_player_attack', { damageDealt: 100, magnitudeBuff: 1.25 }).lifestealHeal;
    expect(baseHeal).toBeCloseTo(20);   // 100 × 0.2
    expect(buffedHeal).toBeCloseTo(25); // 100 × 0.2 × 1.25
  });
  it('thorns reflect is ×1.25 with magnitudeBuff', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [{ trigger: 'on_player_hit_received', effect: 'thorns', value: 0.5 }]);
    const result = evaluateMythicProcs(state, 'on_player_hit_received', { damageReceived: 100, magnitudeBuff: 1.25 });
    expect(result.thornsReflect).toBeCloseTo(62.5);  // 100 × 0.5 × 1.25
  });
  it('cooldownReduce (on_kill) is ×1.25 with magnitudeBuff', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [{ trigger: 'on_kill', effect: 'sp_steal', value: 0.4 }]);
    const result = evaluateMythicProcs(state, 'on_kill', { magnitudeBuff: 1.25 });
    expect(result.cooldownReduce).toBeCloseTo(0.5);  // 0.4 × 1.25
  });
});
