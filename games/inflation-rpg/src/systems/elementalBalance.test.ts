import { describe, it, expect } from 'vitest';
import {
  computeElementalMultiplier,
  getAffinityRelation,
  getEquipmentElement,
  getEnemyElement,
  type ElementType,
  WEAKNESS_MULTIPLIER,
  RESISTANCE_MULTIPLIER,
  DARK_CLASH_MULTIPLIER,
  NEUTRAL_MULTIPLIER,
} from './elementalSystem';

describe('C1041: Elemental Affinity Balance & Combat TTK Simulation', () => {
  describe('Damage Ratio Invariants', () => {
    it('advantage deals 2.14x more damage compared to disadvantage', () => {
      const adv = computeElementalMultiplier('fire', 'lightning');
      const disadv = computeElementalMultiplier('lightning', 'fire');

      expect(adv).toBe(WEAKNESS_MULTIPLIER);
      expect(disadv).toBe(RESISTANCE_MULTIPLIER);

      const ratio = adv / disadv;
      expect(ratio).toBeCloseTo(2.14, 2);
    });

    it('symmetric weakness cycle preserves total system entropy', () => {
      const matchups: [ElementType, ElementType][] = [
        ['fire', 'lightning'],
        ['lightning', 'water'],
        ['water', 'fire'],
      ];

      for (const [attacker, defender] of matchups) {
        expect(computeElementalMultiplier(attacker, defender)).toBe(1.5);
        expect(computeElementalMultiplier(defender, attacker)).toBe(0.7);
        expect(getAffinityRelation(attacker, defender)).toBe('weakness');
        expect(getAffinityRelation(defender, attacker)).toBe('resistance');
      }
    });
  });

  describe('Boss Fight TTK (Time-To-Kill) Simulation', () => {
    it('counter-element weapon reduces boss combat turns by approximately 33%', () => {
      // Simulate boss with 10,000 HP, base hero ATK 1,000 per turn
      const bossHp = 10000;
      const baseHeroAtk = 1000;

      // Boss: Dragon Lord (Lightning)
      const bossElement = getEnemyElement('dragon_lord');
      expect(bossElement).toBe('lightning');

      // 1. Advantage weapon: Fire (e.g. w-bluedragon)
      const fireMul = computeElementalMultiplier(getEquipmentElement('w-bluedragon'), bossElement);
      const fireDmgPerTurn = baseHeroAtk * fireMul;
      const fireTurns = Math.ceil(bossHp / fireDmgPerTurn);

      // 2. Disadvantage weapon: Water (e.g. w-fairy)
      const waterMul = computeElementalMultiplier(getEquipmentElement('w-fairy'), bossElement);
      const waterDmgPerTurn = baseHeroAtk * waterMul;
      const waterTurns = Math.ceil(bossHp / waterDmgPerTurn);

      // 3. Neutral weapon: Knife (w-knife)
      const neutralMul = computeElementalMultiplier(getEquipmentElement('w-knife'), bossElement);
      const neutralDmgPerTurn = baseHeroAtk * neutralMul;
      const neutralTurns = Math.ceil(bossHp / neutralDmgPerTurn);

      // Expected:
      // Neutral: 10,000 / 1,000 = 10 turns
      // Fire: 10,000 / 1,500 = 7 turns (30% fewer turns)
      // Water: 10,000 / 700 = 15 turns (50% more turns)
      expect(neutralTurns).toBe(10);
      expect(fireTurns).toBe(7);
      expect(waterTurns).toBe(15);

      expect(fireTurns).toBeLessThan(neutralTurns);
      expect(waterTurns).toBeGreaterThan(neutralTurns);
      expect(waterTurns - fireTurns).toBe(8);
    });

    it('Dark element acts as a flexible 1.25x damage universal offensive option', () => {
      const darkWeaponElement = getEquipmentElement('w-soulreaper');
      expect(darkWeaponElement).toBe('dark');

      const elements: ElementType[] = ['fire', 'water', 'lightning'];
      for (const el of elements) {
        const mul = computeElementalMultiplier(darkWeaponElement, el);
        expect(mul).toBe(DARK_CLASH_MULTIPLIER); // always 1.25x
      }

      // Against another dark enemy, it's neutral (1.0x)
      expect(computeElementalMultiplier('dark', 'dark')).toBe(NEUTRAL_MULTIPLIER);
    });
  });
});
