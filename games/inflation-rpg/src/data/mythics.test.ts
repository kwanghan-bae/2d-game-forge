import { describe, it, expect } from 'vitest';
import { MYTHICS } from './mythics';

describe('mythics', () => {
  describe('Phase Realms — mythic data refactor', () => {
    it('gluttony_chalice procTrigger is on_kill', () => {
      expect(MYTHICS.gluttony_chalice.procTrigger).toBe('on_kill');
      expect(MYTHICS.gluttony_chalice.procEffect).toBe('sp_steal');
    });

    it('swift_winds has target=base', () => {
      expect(MYTHICS.swift_winds.target).toBe('base');
      expect(MYTHICS.swift_winds.effectType).toBe('cooldown_mult');
    });

    it('serpent_fang remains on_player_attack lifesteal', () => {
      expect(MYTHICS.serpent_fang.procTrigger).toBe('on_player_attack');
      expect(MYTHICS.serpent_fang.procEffect).toBe('lifesteal');
    });

    it('time_hourglass has no target (applies to both base and ult)', () => {
      expect(MYTHICS.time_hourglass.target).toBeUndefined();
      expect(MYTHICS.time_hourglass.effectType).toBe('cooldown_mult');
    });
  });
});
