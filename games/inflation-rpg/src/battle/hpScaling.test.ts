import { describe, it, expect } from 'vitest';
import { resolveEnemyMaxHp, resolvePlayerHit } from './resolver';

/**
 * Monster HP scaling balance test — verifies that expected
 * time-to-kill (hits) stays within playable bounds across level tiers.
 */
describe('monster HP scaling balance', () => {
  // Assume player ATK ≈ level × 10 (post stat allocation)
  function estimatedHitsToKill(level: number): number {
    const enemyHP = resolveEnemyMaxHp({ monsterLevel: level, isBoss: false, hpMult: 1 });
    const playerATK = level * 10;
    const avgDmg = resolvePlayerHit({ playerATK, crit: false, rngRoll: 0.5 });
    return Math.ceil(enemyHP / avgDmg);
  }

  it('early game (lv 1-10): enemies die in 1-3 hits', () => {
    for (let lv = 1; lv <= 10; lv++) {
      const hits = estimatedHitsToKill(lv);
      expect(hits).toBeGreaterThanOrEqual(1);
      expect(hits).toBeLessThanOrEqual(3);
    }
  });

  it('mid game (lv 50-100): enemies die in 1-3 hits', () => {
    for (let lv = 50; lv <= 100; lv += 10) {
      const hits = estimatedHitsToKill(lv);
      expect(hits).toBeGreaterThanOrEqual(1);
      expect(hits).toBeLessThanOrEqual(3);
    }
  });

  it('late game (lv 500-5000): scaling is linear, same hit count', () => {
    const hitsAt500 = estimatedHitsToKill(500);
    const hitsAt5000 = estimatedHitsToKill(5000);
    // Linear HP formula means hit count stays constant
    expect(hitsAt500).toBe(hitsAt5000);
  });

  it('boss HP is 2.5× normal at same level', () => {
    const normal = resolveEnemyMaxHp({ monsterLevel: 100, isBoss: false, hpMult: 1 });
    const boss = resolveEnemyMaxHp({ monsterLevel: 100, isBoss: true, hpMult: 1 });
    expect(boss / normal).toBe(2.5);
  });
});
