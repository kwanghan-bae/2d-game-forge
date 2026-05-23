import { describe, expect, it } from 'vitest';
import {
  BUFF_CATALOG,
  singleStepCost,
  nextStepCost,
  maxAffordable,
  findBuff,
} from '../catalog';

describe('BUFF_CATALOG', () => {
  it('contains 7 entries (6 leveled + oneshot_rejuv)', () => {
    expect(BUFF_CATALOG).toHaveLength(7);
    const ids = BUFF_CATALOG.map(b => b.id).sort();
    expect(ids).toEqual([
      'aging_slow', 'drop_chance', 'field_diff', 'light_rate',
      'move_speed', 'oneshot_rejuv', 'rejuv_discount',
    ]);
  });

  it('oneshot_rejuv is flagged isOneShot', () => {
    const o = findBuff('oneshot_rejuv');
    expect(o.isOneShot).toBe(true);
  });

  it('rejuv_discount has cap 0.80, aging_slow has cap 0.50', () => {
    expect(findBuff('rejuv_discount').cap).toBe(0.80);
    expect(findBuff('aging_slow').cap).toBe(0.50);
  });
});

describe('singleStepCost', () => {
  it('lv 0 → baseCost', () => {
    expect(singleStepCost(findBuff('move_speed'), 0)).toBe(100);
  });
  it('lv 1 → baseCost * mul (ceil)', () => {
    // move_speed: 100 * 1.15 = 115
    expect(singleStepCost(findBuff('move_speed'), 1)).toBe(115);
  });
  it('lv 5 of light_rate (500 base, 1.25 mul) → ceil(500 * 1.25^5) = ceil(1525.88) = 1526', () => {
    expect(singleStepCost(findBuff('light_rate'), 5)).toBe(1526);
  });
});

describe('nextStepCost', () => {
  it('count 0 → 0', () => {
    expect(nextStepCost(findBuff('move_speed'), 0, 0)).toBe(0);
  });
  it('count 1 from lv 0 → singleStepCost(0)', () => {
    expect(nextStepCost(findBuff('move_speed'), 0, 1)).toBe(100);
  });
  it('count 10 from lv 0 sums geometric (move_speed: ceil(100), ceil(115), ceil(132), …)', () => {
    const def = findBuff('move_speed');
    let manual = 0;
    for (let i = 0; i < 10; i++) manual += Math.ceil(def.baseCost * Math.pow(def.costMul, i));
    expect(nextStepCost(def, 0, 10)).toBe(manual);
  });
});

describe('maxAffordable', () => {
  it('insufficient light → 0', () => {
    expect(maxAffordable(findBuff('move_speed'), 0, 50)).toBe(0);
  });
  it('exactly 100 light buys 1 step (lv 0 → 1)', () => {
    expect(maxAffordable(findBuff('move_speed'), 0, 100)).toBe(1);
  });
  it('215 light buys 2 steps (100 + 115)', () => {
    expect(maxAffordable(findBuff('move_speed'), 0, 215)).toBe(2);
  });
  it('214 light buys only 1 step', () => {
    expect(maxAffordable(findBuff('move_speed'), 0, 214)).toBe(1);
  });
  it('caps at 1000 to avoid infinite loop on overflow', () => {
    expect(maxAffordable(findBuff('move_speed'), 0, Number.MAX_SAFE_INTEGER)).toBeLessThanOrEqual(1000);
  });
});
