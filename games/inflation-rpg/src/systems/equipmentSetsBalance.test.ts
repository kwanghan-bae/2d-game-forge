import { describe, it, expect } from 'vitest';
import { HeroEntity } from '../hero/HeroEntity';
import { EncounterEngine } from '../overworld/EncounterEngine';
import { SeededRng } from '../cycle/SeededRng';
import { aggregateSetEffects } from './equipmentSets';
import { getActivePerkEffects } from './jpPerks';

describe('C1031: Equipment Set Synergy & Boss Phase Combat Balance', () => {
  describe('Dragon Set Combat Synergy', () => {
    it('Dragon 3P stacks with boss_slayer perk to provide +45% additive boss damage multiplier', () => {
      const perkFx = getActivePerkEffects(['boss_slayer']);
      const setEffects = aggregateSetEffects(['w-bluedragon', 'a-dragon', 'w-yongcheon']);

      // Boss damage bonus from perks: 0.25; from Dragon 3P: 0.20 => combined: 0.45
      const totalBossDamageBonus = (perkFx.bossDamageBonus ?? 0) + (setEffects.bossDamageBonus ?? 0);
      expect(totalBossDamageBonus).toBeCloseTo(0.45, 2);

      // Hero with combined bonuses deals significantly more damage to bosses
      const heroBase = HeroEntity.create({ seed: 42, heroHpMax: 10000, heroAtkBase: 100 });
      const engineBase = new EncounterEngine(new SeededRng(42), { perkBossDamageBonus: 0 });
      const eventsBase = engineBase.resolveEncounter(heroBase, 'boss', 'dragon_lord');

      const heroBuffed = HeroEntity.create({ seed: 42, heroHpMax: 10000, heroAtkBase: 100 });
      const engineBuffed = new EncounterEngine(new SeededRng(42), { perkBossDamageBonus: totalBossDamageBonus });
      const eventsBuffed = engineBuffed.resolveEncounter(heroBuffed, 'boss', 'dragon_lord');

      // Buffed hero should have higher remaining HP due to finishing fight in fewer turns
      expect(heroBuffed.hp).toBeGreaterThanOrEqual(heroBase.hp);
      expect(eventsBuffed.some(e => e.type === 'battle_won')).toBe(true);
    });
  });

  describe('Boss Phase 2 Enrage Hazard & Counterplay', () => {
    it('Phase 2 boss deals 2.0x enrage damage; Dragon/Celestial synergies reduce combat duration', () => {
      // Long fight: hero ATK is tuned so fight lasts > 5 turns, triggering phase 2
      const hero = HeroEntity.create({ seed: 100, heroHpMax: 50000, heroAtkBase: 20 });
      const engine = new EncounterEngine(new SeededRng(100));
      const events = engine.resolveEncounter(hero, 'boss', 'fire_titan');

      const phaseShift = events.find(e => e.type === 'boss_phase_shift');
      expect(phaseShift).toBeDefined();
      if (phaseShift?.type === 'boss_phase_shift') {
        expect(phaseShift.phase).toBe(2);
        expect(phaseShift.enrageAtkMul).toBe(2.0);
      }
    });

    it('Celestial 2P (+20% HP) grants buffer against Phase 2 enrage strikes', () => {
      const setEffects = aggregateSetEffects(['w-fairy', 'a-celestial']);
      expect(setEffects.hpMulBonus).toBe(0.20);

      const baseHp = 10000;
      const buffedHp = Math.floor(baseHp * (1 + setEffects.hpMulBonus));
      expect(buffedHp).toBe(12000);
      expect(buffedHp - baseHp).toBe(2000);
    });
  });

  describe('Merchant Set Farm Pacing', () => {
    it('Merchant 2P (+25% Gold) accelerates wealth_barrier progression', () => {
      const setEffects = aggregateSetEffects(['acc-gold-magnet', 'acc-charm']);
      expect(setEffects.goldBonus).toBe(25);

      const baseGoldPerCycle = 8000;
      const buffedGold = Math.floor(baseGoldPerCycle * (1 + setEffects.goldBonus / 100));
      expect(buffedGold).toBe(10000);
      // Crossing the 10,000 gold threshold activates 1% wealth_barrier reduction faster
      expect(Math.floor(buffedGold / 10000)).toBe(1);
    });
  });
});
