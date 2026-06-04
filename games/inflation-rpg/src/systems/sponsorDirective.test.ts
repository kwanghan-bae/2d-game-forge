import { describe, it, expect } from 'vitest';
import { getDirectiveEffects, DIRECTIVE_INFO } from './sponsorDirective';

describe('sponsorDirective', () => {
  it('null directive returns neutral multipliers', () => {
    const fx = getDirectiveEffects(null);
    expect(fx.critBonus).toBe(0);
    expect(fx.goldMul).toBe(1.0);
    expect(fx.expMul).toBe(1.0);
    expect(fx.jpMul).toBe(1.0);
  });

  it('aggression gives crit bonus', () => {
    const fx = getDirectiveEffects('aggression');
    expect(fx.critBonus).toBe(0.15);
    expect(fx.goldMul).toBe(1.0);
  });

  it('hoarding gives gold + drop but penalizes exp', () => {
    const fx = getDirectiveEffects('hoarding');
    expect(fx.goldMul).toBe(1.4);
    expect(fx.dropRateBonus).toBe(0.20);
    expect(fx.expMul).toBe(0.8);
  });

  it('training gives exp + JP but penalizes gold', () => {
    const fx = getDirectiveEffects('training');
    expect(fx.expMul).toBe(1.3);
    expect(fx.jpMul).toBe(1.5);
    expect(fx.goldMul).toBe(0.6);
  });

  it('all directives have info entries', () => {
    expect(DIRECTIVE_INFO).toHaveLength(3);
    const ids = DIRECTIVE_INFO.map(d => d.id);
    expect(ids).toContain('aggression');
    expect(ids).toContain('hoarding');
    expect(ids).toContain('training');
  });

  it('each directive has a tradeoff', () => {
    for (const info of DIRECTIVE_INFO) {
      expect(info.tradeoff.length).toBeGreaterThan(0);
    }
  });
});
