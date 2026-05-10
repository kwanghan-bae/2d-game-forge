import { describe, it, expect } from 'vitest';
import { enhanceMultiplier, enhanceCost, getInstanceStats } from './enhance';
import type { EquipmentInstance } from '../types';

describe('enhanceMultiplier', () => {
  it('common: 1+0.05·N', () => {
    expect(enhanceMultiplier('common', 0)).toBeCloseTo(1, 5);
    expect(enhanceMultiplier('common', 100)).toBeCloseTo(6, 5);
    expect(enhanceMultiplier('common', 1000)).toBeCloseTo(51, 5);
  });
  it('uncommon: 1+0.07·N', () => {
    expect(enhanceMultiplier('uncommon', 100)).toBeCloseTo(8, 5);
  });
  it('rare: 1+0.10·N', () => {
    expect(enhanceMultiplier('rare', 100)).toBeCloseTo(11, 5);
  });
  it('epic: 1+0.15·N', () => {
    expect(enhanceMultiplier('epic', 100)).toBeCloseTo(16, 5);
  });
  it('legendary: 1+0.22·N', () => {
    expect(enhanceMultiplier('legendary', 100)).toBeCloseTo(23, 5);
  });
  it('mythic: 1+2.0·N', () => {
    expect(enhanceMultiplier('mythic', 100)).toBeCloseTo(201, 5);
  });
});

describe('enhanceCost', () => {
  it('common lv 0→1: stones=ceil(1²/5)=1, dr=1·100=100', () => {
    const c = enhanceCost('common', 0);
    expect(c.stones).toBe(1);
    expect(c.dr).toBe(100);
  });
  it('common lv 9→10: stones=ceil(100/5)=20, dr=1000·100=100000', () => {
    const c = enhanceCost('common', 9);
    expect(c.stones).toBe(20);
    expect(c.dr).toBe(100_000);
  });
  it('rare lv 0→1: rarityMult=2.5 → stones=ceil(1/5)·2.5=2.5, dr=100·2.5=250', () => {
    const c = enhanceCost('rare', 0);
    expect(c.stones).toBe(2.5);
    expect(c.dr).toBe(250);
  });
  it('mythic lv 9→10: rarityMult=16 → stones=20·16=320, dr=100000·16=1600000', () => {
    const c = enhanceCost('mythic', 9);
    expect(c.stones).toBe(320);
    expect(c.dr).toBe(1_600_000);
  });
  it('cost monotonically increases per lv', () => {
    let last = 0;
    for (let lv = 0; lv < 50; lv++) {
      const cur = enhanceCost('rare', lv).dr;
      expect(cur).toBeGreaterThan(last);
      last = cur;
    }
  });
  it('legendary rarityMult is 8', () => {
    const c = enhanceCost('legendary', 0);
    expect(c.dr).toBe(100 * 8);
  });
});

describe('getInstanceStats', () => {
  it('lv 0: returns base stats (multiplier ×1, floor)', () => {
    // 'w-knife' is common with baseStats.flat.atk = 30
    const inst: EquipmentInstance = { instanceId: 'i1', baseId: 'w-knife', enhanceLv: 0, modifiers: [] };
    const stats = getInstanceStats(inst);
    expect(stats.flat?.atk).toBe(30);
  });
  it('lv 10: common ×1.5 → atk floor(30 × 1.5) = 45', () => {
    const inst: EquipmentInstance = { instanceId: 'i1', baseId: 'w-knife', enhanceLv: 10, modifiers: [] };
    const stats = getInstanceStats(inst);
    expect(stats.flat?.atk).toBe(45);
  });
  it('unknown baseId: returns empty stats', () => {
    const inst: EquipmentInstance = { instanceId: 'i1', baseId: 'nonexistent', enhanceLv: 5, modifiers: [] };
    const stats = getInstanceStats(inst);
    expect(stats).toEqual({});
  });
  it('rare with percent: lv 100 → percent ×11 → 20 × 11 = 220', () => {
    // 'w-bow' is rare with baseStats.percent.atk = 20 + flat.atk = 200 (after T2 baseStats rename)
    const inst: EquipmentInstance = { instanceId: 'i1', baseId: 'w-bow', enhanceLv: 100, modifiers: [] };
    const stats = getInstanceStats(inst);
    expect(stats.percent?.atk).toBe(Math.floor(20 * 11));
  });
});
