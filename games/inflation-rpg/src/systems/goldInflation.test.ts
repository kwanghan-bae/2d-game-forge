import { describe, it, expect } from 'vitest';
import { EQUIPMENT_BASES } from '../data/equipment';
import { getCraftCost } from './crafting';

/**
 * Cycle 36 — Balance: 골드 인플레이션 검증
 * 레벨별 골드 수입과 장비/합성 비용의 비례가 적절한지 확인.
 */

function goldPerKill(level: number, hardMode = false): number {
  return Math.floor(level * 5 * (hardMode ? 5 : 1));
}

describe('gold inflation balance', () => {
  it('early game: 50 kills enough to buy cheapest gear', () => {
    const cheapest = Math.min(...EQUIPMENT_BASES.filter(e => e.rarity === 'common').map(e => e.price));
    const income50kills = goldPerKill(10) * 50;
    expect(income50kills).toBeGreaterThanOrEqual(cheapest);
  });

  it('mid game: craft cost achievable within 100 kills at expected level', () => {
    const rareCraftCost = getCraftCost('rare');
    const midLevel = 50;
    const income100 = goldPerKill(midLevel) * 100;
    expect(income100).toBeGreaterThanOrEqual(rareCraftCost);
  });

  it('late game hard mode: legendary gear purchasable within 200 kills', () => {
    const legendaryAvgPrice = EQUIPMENT_BASES
      .filter(e => e.rarity === 'legendary')
      .reduce((s, e) => s + e.price, 0) / EQUIPMENT_BASES.filter(e => e.rarity === 'legendary').length;
    const lateLevel = 200;
    const income200 = goldPerKill(lateLevel, true) * 200;
    expect(income200).toBeGreaterThanOrEqual(legendaryAvgPrice);
  });

  it('gold formula scales linearly with level', () => {
    const g10 = goldPerKill(10);
    const g100 = goldPerKill(100);
    expect(g100 / g10).toBeCloseTo(10, 0);
  });
});
