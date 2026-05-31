import { describe, it, expect } from 'vitest';
import { getEventToastLabel, resolveEventToastKey } from '../EventChoiceToastLogic';

describe('EventChoiceToastLogic', () => {
  describe('getEventToastLabel — existing labels', () => {
    it('returns label for merchant buy', () => {
      expect(getEventToastLabel('event_merchant_buy')).toContain('상인');
    });
    it('returns null for unknown', () => {
      expect(getEventToastLabel('unknown_event')).toBeNull();
    });
  });

  describe('getEventToastLabel — C872 mid-game labels', () => {
    it('wandering merchant heal', () => {
      expect(getEventToastLabel('event_wandering_merchant_heal')).toContain('치유');
    });
    it('wandering merchant gamble win', () => {
      expect(getEventToastLabel('event_wandering_merchant_gamble_win')).toContain('승리');
    });
    it('wandering merchant gamble lose', () => {
      expect(getEventToastLabel('event_wandering_merchant_gamble_lose')).toContain('손실');
    });
    it('sparring grounds win', () => {
      expect(getEventToastLabel('event_sparring_grounds_win')).toContain('승리');
    });
    it('sparring grounds lose', () => {
      expect(getEventToastLabel('event_sparring_grounds_lose')).toContain('패배');
    });
    it('proving grounds win', () => {
      expect(getEventToastLabel('event_proving_grounds_win')).toContain('시련');
    });
    it('proving grounds lose', () => {
      expect(getEventToastLabel('event_proving_grounds_lose')).toContain('시련');
    });
    it('mercenary accept', () => {
      expect(getEventToastLabel('event_mercenary_offer_accept')).toContain('용병');
    });
    it('crossroads atk', () => {
      expect(getEventToastLabel('event_crossroads_atk')).toContain('ATK');
    });
    it('crossroads exp', () => {
      expect(getEventToastLabel('event_crossroads_exp')).toContain('EXP');
    });
    it('crossroads gold', () => {
      expect(getEventToastLabel('event_crossroads_gold')).toContain('골드');
    });
    it('storm drain', () => {
      expect(getEventToastLabel('storm_drain')).toContain('폭풍');
    });
    it('storm drain critical', () => {
      expect(getEventToastLabel('storm_drain_critical')).toContain('위험');
    });
  });

  describe('resolveEventToastKey', () => {
    it('maps wandering merchant choice to key', () => {
      expect(resolveEventToastKey({ type: 'event_wandering_merchant', choice: 'heal', value: 50 }))
        .toBe('event_wandering_merchant_heal');
    });
    it('maps sparring win to key', () => {
      expect(resolveEventToastKey({ type: 'event_sparring_grounds', won: true, expGained: 10, hpLost: 0 }))
        .toBe('event_sparring_grounds_win');
    });
    it('maps proving lose to key', () => {
      expect(resolveEventToastKey({ type: 'event_proving_grounds', won: false, expMul: 1, hpCost: 100 }))
        .toBe('event_proving_grounds_lose');
    });
    it('maps mercenary accept to key', () => {
      expect(resolveEventToastKey({ type: 'event_mercenary_offer', choice: 'accept', goldPaid: 50, duration: 3 }))
        .toBe('event_mercenary_offer_accept');
    });
    it('maps crossroads path to key', () => {
      expect(resolveEventToastKey({ type: 'event_crossroads', path: 'gold', goldBurst: 1200 }))
        .toBe('event_crossroads_gold');
    });
    it('passes storm_drain through', () => {
      expect(resolveEventToastKey({ type: 'storm_drain', value: 30, hpAfter: 200 }))
        .toBe('storm_drain');
    });
    // C888: consequence event toast keys
    it('maps reputation aggressive to key', () => {
      expect(resolveEventToastKey({ type: 'event_reputation', style: 'aggressive', value: 0.2 }))
        .toBe('event_reputation_aggressive');
    });
    it('maps reputation balanced to key', () => {
      expect(resolveEventToastKey({ type: 'event_reputation', style: 'balanced', value: 0.15 }))
        .toBe('event_reputation_balanced');
    });
    it('maps veterans trial defensive to key', () => {
      expect(resolveEventToastKey({ type: 'event_veterans_trial', style: 'defensive', value: 100 }))
        .toBe('event_veterans_trial_defensive');
    });
    it('maps veterans trial greedy to key', () => {
      expect(resolveEventToastKey({ type: 'event_veterans_trial', style: 'greedy', value: 500 }))
        .toBe('event_veterans_trial_greedy');
    });
  });

  // C888: consequence event label tests
  describe('getEventToastLabel — C888 consequence labels', () => {
    it('reputation aggressive', () => {
      expect(getEventToastLabel('event_reputation_aggressive')).toContain('ATK');
    });
    it('reputation defensive', () => {
      expect(getEventToastLabel('event_reputation_defensive')).toContain('방패');
    });
    it('reputation greedy', () => {
      expect(getEventToastLabel('event_reputation_greedy')).toContain('골드');
    });
    it('reputation balanced', () => {
      expect(getEventToastLabel('event_reputation_balanced')).toContain('EXP');
    });
    it('veterans trial aggressive', () => {
      expect(getEventToastLabel('event_veterans_trial_aggressive')).toContain('ATK');
    });
    it('veterans trial defensive', () => {
      expect(getEventToastLabel('event_veterans_trial_defensive')).toContain('방패');
    });
    it('veterans trial greedy', () => {
      expect(getEventToastLabel('event_veterans_trial_greedy')).toContain('골드');
    });
    it('veterans trial balanced', () => {
      expect(getEventToastLabel('event_veterans_trial_balanced')).toContain('ATK');
    });
    // C896: Final Reckoning toast labels
    it('final reckoning aggressive', () => {
      expect(getEventToastLabel('event_final_reckoning_aggressive')).toContain('ATK');
    });
    it('final reckoning defensive', () => {
      expect(getEventToastLabel('event_final_reckoning_defensive')).toContain('방패');
    });
    it('final reckoning greedy', () => {
      expect(getEventToastLabel('event_final_reckoning_greedy')).toContain('골드');
    });
    it('final reckoning balanced', () => {
      expect(getEventToastLabel('event_final_reckoning_balanced')).toContain('ATK');
    });
  });
});
