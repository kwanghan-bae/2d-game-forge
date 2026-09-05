import { describe, it, expect, vi } from 'vitest';
import {
  canPurchasePerk,
  purchasePerk,
  getActivePerkEffects,
  JP_PERKS,
  getPerkDef,
} from './jpPerks';
import { EncounterEngine } from '../overworld/EncounterEngine';
import { HeroEntity } from '../hero/HeroEntity';
import { SeededRng } from '../cycle/SeededRng';

describe('jpPerks', () => {
  describe('canPurchasePerk', () => {
    it('allows purchase with enough JP', () => {
      const result = canPurchasePerk('cycle_speed', [], 10);
      expect(result.canBuy).toBe(true);
    });

    it('rejects when already owned', () => {
      const result = canPurchasePerk('cycle_speed', ['cycle_speed'], 100);
      expect(result).toEqual({ canBuy: false, reason: 'already_owned' });
    });

    it('rejects when insufficient JP', () => {
      const result = canPurchasePerk('revive_once', [], 3);
      expect(result).toEqual({ canBuy: false, reason: 'insufficient_jp' });
    });

    it('rejects when prerequisite not met', () => {
      const result = canPurchasePerk('exp_momentum', [], 100);
      expect(result).toEqual({ canBuy: false, reason: 'missing_prerequisite' });
    });

    it('allows when prerequisite is owned', () => {
      const result = canPurchasePerk('exp_momentum', ['cycle_speed'], 100);
      expect(result.canBuy).toBe(true);
    });

    it('C1021: Tier 2 perks enforce prerequisites correctly', () => {
      expect(canPurchasePerk('crit_mastery', [], 50).canBuy).toBe(false);
      expect(canPurchasePerk('crit_mastery', ['crit_cascade'], 50).canBuy).toBe(true);

      expect(canPurchasePerk('boss_slayer', [], 50).canBuy).toBe(false);
      expect(canPurchasePerk('boss_slayer', ['boss_bounty'], 50).canBuy).toBe(true);

      expect(canPurchasePerk('wealth_barrier', [], 50).canBuy).toBe(false);
      expect(canPurchasePerk('wealth_barrier', ['gold_interest'], 50).canBuy).toBe(true);

      expect(canPurchasePerk('relic_affinity', [], 50).canBuy).toBe(false);
      expect(canPurchasePerk('relic_affinity', ['drop_luck'], 50).canBuy).toBe(true);
    });
  });

  describe('purchasePerk', () => {
    it('deducts JP and adds perk', () => {
      const result = purchasePerk('drop_luck', [], 20);
      expect(result).toEqual({ newOwned: ['drop_luck'], newJp: 12 });
    });

    it('returns null when cannot buy', () => {
      expect(purchasePerk('revive_once', [], 2)).toBeNull();
    });
  });

  describe('getActivePerkEffects', () => {
    it('returns defaults for no perks', () => {
      const fx = getActivePerkEffects([]);
      expect(fx.cycleSpeedMul).toBe(1.0);
      expect(fx.dropRateBonus).toBe(0);
      expect(fx.reviveEnabled).toBe(false);
    });

    it('activates owned perks', () => {
      const fx = getActivePerkEffects(['cycle_speed', 'boss_bounty', 'revive_once']);
      expect(fx.cycleSpeedMul).toBe(0.9);
      expect(fx.bossGoldMul).toBe(1.5);
      expect(fx.reviveEnabled).toBe(true);
    });

    it('C1021: activates Tier 2 advanced perks', () => {
      const fx = getActivePerkEffects(['crit_mastery', 'boss_slayer', 'wealth_barrier', 'relic_affinity']);
      expect(fx.critDamageBonus).toBe(0.5);
      expect(fx.bossDamageBonus).toBe(0.25);
      expect(fx.goldBarrierRate).toBe(0.01);
      expect(fx.relicFindBonus).toBe(0.2);
    });
  });

  describe('perk definitions', () => {
    it('all perks have unique IDs', () => {
      const ids = JP_PERKS.map(p => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all prerequisite references are valid', () => {
      const ids = JP_PERKS.map(p => p.id);
      for (const perk of JP_PERKS) {
        if (perk.requires) {
          expect(ids).toContain(perk.requires);
        }
      }
    });

    it('getPerkDef returns correct perk', () => {
      expect(getPerkDef('gold_interest')?.cost).toBe(10);
    });
  });

  describe('C1016: revive_once perk combat effect', () => {
    it('revives hero on first fatal combat and restores 30% HP', () => {
      const hero = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 1 });
      const engine = new EncounterEngine(new SeededRng(1), { perkReviveEnabled: true });
      const events1 = engine.resolveEncounter(hero, 'boss', 'dragon_1');
      expect(events1.some(e => e.type === 'perk_revive')).toBe(true);
      expect(events1.some(e => e.type === 'hero_died')).toBe(false);
      expect(hero.hp).toBe(Math.max(1, Math.floor(hero.hpMax * 0.3)));

      const events2 = engine.resolveEncounter(hero, 'boss', 'dragon_1');
      expect(events2.some(e => e.type === 'perk_revive')).toBe(false);
      expect(events2.some(e => e.type === 'hero_died')).toBe(true);
    });

    it('does not revive if perkReviveEnabled is false', () => {
      const hero = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 1 });
      const engine = new EncounterEngine(new SeededRng(1), { perkReviveEnabled: false });
      const events = engine.resolveEncounter(hero, 'boss', 'dragon_1');
      expect(events.some(e => e.type === 'perk_revive')).toBe(false);
      expect(events.some(e => e.type === 'hero_died')).toBe(true);
    });
  });

  describe('C1023: Tier 2 perk combat effects', () => {
    it('boss_slayer increases damage to boss', () => {
      // Normal engine without boss slayer
      const heroA = HeroEntity.create({ seed: 42, heroHpMax: 1000, heroAtkBase: 100 });
      const engineNormal = new EncounterEngine(new SeededRng(100), { perkBossDamageBonus: 0 });
      engineNormal.resolveEncounter(heroA, 'boss', 'dragon_1');

      // Engine with boss slayer (+25%)
      const heroB = HeroEntity.create({ seed: 42, heroHpMax: 1000, heroAtkBase: 100 });
      const engineSlayer = new EncounterEngine(new SeededRng(100), { perkBossDamageBonus: 0.25 });
      engineSlayer.resolveEncounter(heroB, 'boss', 'dragon_1');

      // With higher damage dealt to boss, hero should defeat boss faster and take less or equal retaliation damage
      expect(heroB.hp).toBeGreaterThanOrEqual(heroA.hp);
    });

    it('wealth_barrier reduces damage taken based on gold', () => {
      const heroA = HeroEntity.create({ seed: 42, heroHpMax: 10000, heroAtkBase: 5 });
      heroA.gold = 200000;
      const spyA = vi.spyOn(heroA, 'takeDamage');
      const engineNormal = new EncounterEngine(new SeededRng(50), { perkGoldBarrierRate: 0 });
      engineNormal.resolveEncounter(heroA, 'enemy', 'wolf_1');

      const heroB = HeroEntity.create({ seed: 42, heroHpMax: 10000, heroAtkBase: 5 });
      heroB.gold = 200000;
      const spyB = vi.spyOn(heroB, 'takeDamage');
      const engineBarrier = new EncounterEngine(new SeededRng(50), { perkGoldBarrierRate: 0.01 });
      engineBarrier.resolveEncounter(heroB, 'enemy', 'wolf_1');

      const totalDmgA = spyA.mock.calls.reduce((sum, [dmg]) => sum + (dmg as number), 0);
      const totalDmgB = spyB.mock.calls.reduce((sum, [dmg]) => sum + (dmg as number), 0);

      expect(totalDmgA).toBeGreaterThan(0);
      expect(totalDmgB).toBeLessThan(totalDmgA);
    });

    it('relic_affinity increases relic drop odds from bosses', () => {
      let normalRelicDrops = 0;
      let affinityRelicDrops = 0;
      for (let s = 0; s < 50; s++) {
        const heroA = HeroEntity.create({ seed: s, heroHpMax: 10000, heroAtkBase: 5000 });
        const engineA = new EncounterEngine(new SeededRng(s), { perkRelicFindBonus: 0 });
        engineA.resolveEncounter(heroA, 'boss', 'boss_1');
        if (engineA.getRelics().length > 0) normalRelicDrops++;

        const heroB = HeroEntity.create({ seed: s, heroHpMax: 10000, heroAtkBase: 5000 });
        const engineB = new EncounterEngine(new SeededRng(s), { perkRelicFindBonus: 5.0 });
        engineB.resolveEncounter(heroB, 'boss', 'boss_1');
        if (engineB.getRelics().length > 0) affinityRelicDrops++;
      }
      expect(affinityRelicDrops).toBeGreaterThan(normalRelicDrops);
    });
  });
});
