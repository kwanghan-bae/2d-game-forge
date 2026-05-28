import { describe, it, expect } from 'vitest';
import { EQUIPMENT_BASES } from '../data/equipment';

/**
 * Gold economy balance sim — verifies gold gains can reasonably afford
 * equipment at each tier without excessive grinding.
 *
 * Gold per kill = level * 5 (normal mode).
 * Equipment should be purchasable within ~20-50 kills at the appropriate level.
 */

function goldPerKill(level: number, hardMode = false): number {
  return Math.floor(level * 5 * (hardMode ? 5 : 1));
}

describe('Gold economy balance', () => {
  it('each equipment tier is affordable within 50 kills at intended level', () => {
    // Map rarity to approximate player level when they encounter it
    const rarityLevelMap: Record<string, number> = {
      common: 50,
      uncommon: 200,
      rare: 500,
      epic: 2000,
      legendary: 10000,
      mythic: 50000,
    };

    const issues: string[] = [];
    for (const eq of EQUIPMENT_BASES) {
      if (!eq.price) continue;
      const approxLevel = rarityLevelMap[eq.rarity] ?? 100;
      const gold = goldPerKill(approxLevel);
      const killsNeeded = Math.ceil(eq.price / gold);
      if (killsNeeded > 50) {
        issues.push(`${eq.id} (${eq.rarity}): needs ${killsNeeded} kills at level ${approxLevel}`);
      }
    }
    // Allow at most 2 outliers (mythic gear can be expensive)
    expect(issues.length, issues.join('\n')).toBeLessThanOrEqual(2);
  });

  it('gold scaling is monotonically increasing with level', () => {
    for (let level = 1; level <= 10000; level += 100) {
      const current = goldPerKill(level);
      const next = goldPerKill(level + 100);
      expect(next).toBeGreaterThan(current);
    }
  });

  it('hard mode gives 5x gold bonus', () => {
    const normal = goldPerKill(100);
    const hard = goldPerKill(100, true);
    expect(hard / normal).toBe(5);
  });
});
