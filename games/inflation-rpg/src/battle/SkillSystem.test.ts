import { describe, it, expect } from 'vitest';
import {
  createSkillState, isSkillReady, fireSkill, computeSkillEffect,
} from './SkillSystem';
import type { ActiveSkill } from '../types';

const strike: ActiveSkill = {
  id: 'test-strike', nameKR: '강타', description: 'test',
  cooldownSec: 5, effect: { type: 'multi_hit', multiplier: 3, targets: 1 }, vfxEmoji: '💥',
};

describe('SkillSystem', () => {
  it('isSkillReady returns true initially', () => {
    const state = createSkillState();
    expect(isSkillReady(state, strike, 0)).toBe(true);
  });

  it('fireSkill sets cooldown', () => {
    const state = createSkillState();
    fireSkill(state, strike, 1000);
    expect(isSkillReady(state, strike, 2000)).toBe(false);
    expect(isSkillReady(state, strike, 6500)).toBe(true);
  });

  it('multi_hit damage = atk * mult * targets', () => {
    const result = computeSkillEffect(strike, 100, 1000, 500, 1000);
    expect(result.damage).toBe(300);
  });

  it('heal returns percent of max HP', () => {
    const heal: ActiveSkill = {
      id: 'h', nameKR: '회복', description: '',
      cooldownSec: 10, effect: { type: 'heal', healPercent: 30 }, vfxEmoji: '💧',
    };
    const result = computeSkillEffect(heal, 100, 1000, 500, 1000);
    expect(result.heal).toBe(300);
  });

  it('execute insta-kills below threshold', () => {
    const exec: ActiveSkill = {
      id: 'e', nameKR: '저격', description: '',
      cooldownSec: 10, effect: { type: 'execute', executeThreshold: 0.3 }, vfxEmoji: '🎯',
    };
    const r1 = computeSkillEffect(exec, 100, 1000, 200, 1000); // 20% HP
    expect(r1.execute).toBe(true);
    expect(r1.damage).toBe(200);
    const r2 = computeSkillEffect(exec, 100, 1000, 800, 1000); // 80% HP
    expect(r2.execute).toBeUndefined();
  });

  it('aoe damage = atk * mult * targets', () => {
    const aoe: ActiveSkill = {
      id: 'aoe-test', nameKR: '범위공격', description: '',
      cooldownSec: 8, effect: { type: 'aoe', multiplier: 2, targets: 3 }, vfxEmoji: '🔥',
    };
    const result = computeSkillEffect(aoe, 100, 1000, 500, 1000);
    expect(result.damage).toBe(600);
  });

  it('buff returns stat/percent/durationMs', () => {
    const buff: ActiveSkill = {
      id: 'buff-test', nameKR: '방패막기', description: '',
      cooldownSec: 8, effect: { type: 'buff', buffStat: 'def', buffPercent: 30, buffDurationSec: 5 }, vfxEmoji: '🛡️',
    };
    const result = computeSkillEffect(buff, 100, 1000, 500, 1000);
    expect(result.buff).toEqual({ stat: 'def', percent: 30, durationMs: 5000 });
    expect(result.damage).toBeUndefined();
  });

  it('vfxEmoji is always present in result', () => {
    const result = computeSkillEffect(strike, 100, 1000, 500, 1000);
    expect(result.vfxEmoji).toBe('💥');
  });
});
