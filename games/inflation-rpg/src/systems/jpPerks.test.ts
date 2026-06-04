import { describe, it, expect } from 'vitest';
import {
  canPurchasePerk,
  purchasePerk,
  getActivePerkEffects,
  JP_PERKS,
  getPerkDef,
} from './jpPerks';

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
});
