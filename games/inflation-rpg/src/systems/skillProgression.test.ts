import { describe, it, expect } from 'vitest';
import {
  skillDmgMul, skillCooldownMul, jpCostToLevel,
  totalSkillLv, ultSlotsUnlocked,
} from './skillProgression';

describe('skillDmgMul', () => {
  it('base: 1 + 0.05·lv', () => {
    expect(skillDmgMul('base', 0)).toBe(1);
    expect(skillDmgMul('base', 50)).toBeCloseTo(3.5, 5);
    expect(skillDmgMul('base', 100)).toBeCloseTo(6, 5);
  });
  it('ult: 1 + 0.15·lv', () => {
    expect(skillDmgMul('ult', 0)).toBe(1);
    expect(skillDmgMul('ult', 50)).toBeCloseTo(8.5, 5);
    expect(skillDmgMul('ult', 100)).toBeCloseTo(16, 5);
  });
});

describe('skillCooldownMul', () => {
  it('base: always 1.0 (no cd reduction)', () => {
    expect(skillCooldownMul('base', 0)).toBe(1);
    expect(skillCooldownMul('base', 100)).toBe(1);
    expect(skillCooldownMul('base', 1000)).toBe(1);
  });
  it('ult: 1 - 0.005·lv, floor 0.4', () => {
    expect(skillCooldownMul('ult', 0)).toBe(1);
    expect(skillCooldownMul('ult', 50)).toBeCloseTo(0.75, 5);
    expect(skillCooldownMul('ult', 100)).toBeCloseTo(0.5, 5);
    expect(skillCooldownMul('ult', 120)).toBeCloseTo(0.4, 5);
    expect(skillCooldownMul('ult', 1000)).toBe(0.4);
  });
});

describe('jpCostToLevel', () => {
  it('base: ceil((lv+1)²/2)', () => {
    expect(jpCostToLevel('base', 0)).toBe(1);
    expect(jpCostToLevel('base', 9)).toBe(50);
    expect(jpCostToLevel('base', 49)).toBe(1250);
  });
  it('ult: 3× base', () => {
    expect(jpCostToLevel('ult', 0)).toBe(3);
    expect(jpCostToLevel('ult', 9)).toBe(150);
  });
  it('cost monotonic in lv', () => {
    let last = 0;
    for (let lv = 0; lv < 50; lv++) {
      const c = jpCostToLevel('ult', lv);
      expect(c).toBeGreaterThan(last);
      last = c;
    }
  });
});

describe('totalSkillLv', () => {
  it('sums all skill levels for a charId', () => {
    const skillLevels = {
      hwarang: { 'hwarang-strike': 10, 'hwarang-rush': 20, 'hwarang_ult_ilseom': 5 },
      mudang: { 'mudang-curse': 100 },
    };
    expect(totalSkillLv(skillLevels, 'hwarang')).toBe(35);
    expect(totalSkillLv(skillLevels, 'mudang')).toBe(100);
    expect(totalSkillLv(skillLevels, 'choeui')).toBe(0);
  });
});

describe('ultSlotsUnlocked', () => {
  it('boundaries 50/200/500/1500', () => {
    expect(ultSlotsUnlocked(0)).toBe(0);
    expect(ultSlotsUnlocked(49)).toBe(0);
    expect(ultSlotsUnlocked(50)).toBe(1);
    expect(ultSlotsUnlocked(199)).toBe(1);
    expect(ultSlotsUnlocked(200)).toBe(2);
    expect(ultSlotsUnlocked(499)).toBe(2);
    expect(ultSlotsUnlocked(500)).toBe(3);
    expect(ultSlotsUnlocked(1499)).toBe(3);
    expect(ultSlotsUnlocked(1500)).toBe(4);
    expect(ultSlotsUnlocked(99999)).toBe(4);
  });
});
