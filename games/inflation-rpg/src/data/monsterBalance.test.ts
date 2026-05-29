import { describe, it, expect } from 'vitest';
import { MONSTERS } from './monsters';

describe('Monster HP/ATK multiplier balance', () => {
  const normal = MONSTERS.filter(m => !m.isBoss);

  it('all hpMult values are between 0.5 and 4.0', () => {
    for (const m of normal) {
      expect(m.hpMult, `${m.id} hpMult`).toBeGreaterThanOrEqual(0.5);
      expect(m.hpMult, `${m.id} hpMult`).toBeLessThanOrEqual(4.0);
    }
  });

  it('atkMult never wildly exceeds hpMult (max 2x gap)', () => {
    for (const m of normal) {
      expect(m.atkMult, `${m.id} atk vs hp`).toBeLessThanOrEqual(m.hpMult * 2 + 0.5);
    }
  });

  it('expMult correlates with difficulty (higher hpMult → more exp)', () => {
    const easy = normal.filter(m => m.hpMult <= 1.0);
    const hard = normal.filter(m => m.hpMult >= 2.5);
    const avgEasyExp = easy.reduce((s, m) => s + m.expMult, 0) / easy.length;
    const avgHardExp = hard.reduce((s, m) => s + m.expMult, 0) / hard.length;
    expect(avgHardExp).toBeGreaterThan(avgEasyExp);
  });

  it('level ranges are progressive (levelMin < levelMax)', () => {
    for (const m of normal) {
      expect(m.levelMax, `${m.id} range`).toBeGreaterThan(m.levelMin);
    }
  });
});
