import { describe, it, expect } from 'vitest';
import { resolveEnemyMaxHp, resolveEnemyAtk } from '../battle/resolver';

describe('boss HP & ATK scaling', () => {
  it('boss HP is always higher than non-boss at same level', () => {
    for (let lv = 1; lv <= 500; lv += 50) {
      const bossHp = resolveEnemyMaxHp({ monsterLevel: lv, isBoss: true, hpMult: 1 });
      const mobHp = resolveEnemyMaxHp({ monsterLevel: lv, isBoss: false, hpMult: 1 });
      expect(bossHp, `lv=${lv}`).toBeGreaterThan(mobHp);
    }
  });

  it('enemy HP scales linearly with level (no jumps)', () => {
    let prev = 0;
    for (let lv = 1; lv <= 100; lv++) {
      const hp = resolveEnemyMaxHp({ monsterLevel: lv, isBoss: false, hpMult: 1 });
      expect(hp, `lv=${lv}`).toBeGreaterThan(prev);
      prev = hp;
    }
  });

  it('boss HP multiplier is exactly 2.5x vs non-boss (50/20)', () => {
    const bossHp = resolveEnemyMaxHp({ monsterLevel: 100, isBoss: true, hpMult: 1 });
    const mobHp = resolveEnemyMaxHp({ monsterLevel: 100, isBoss: false, hpMult: 1 });
    expect(bossHp / mobHp).toBeCloseTo(2.5, 5);
  });

  it('hpMult scales proportionally', () => {
    const base = resolveEnemyMaxHp({ monsterLevel: 50, isBoss: true, hpMult: 1 });
    const doubled = resolveEnemyMaxHp({ monsterLevel: 50, isBoss: true, hpMult: 2 });
    expect(doubled).toBe(base * 2);
  });

  it('boss ATK is 2x non-boss', () => {
    const bossAtk = resolveEnemyAtk({ monsterLevel: 100, isBoss: true });
    const mobAtk = resolveEnemyAtk({ monsterLevel: 100, isBoss: false });
    expect(bossAtk / mobAtk).toBeCloseTo(2, 5);
  });
});
