// games/inflation-rpg/src/systems/effects.test.ts
import { describe, it, expect } from 'vitest';
import {
  createEffectsState, addEffect, tickEffects, evaluateTriggers,
  processIncomingDamage, getDebuffStatMultiplier, applyProcMult,
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
