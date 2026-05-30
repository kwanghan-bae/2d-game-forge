import { describe, test, expect } from 'vitest';
import { EventChoiceEngine, MerchantChoice, GamblerChoice, AltarChoice } from '../encounter/EventChoiceEngine';
import { resolveEventEffects, type EventEffectContext } from '../encounter/EventEffectResolver';

/**
 * C694: Integration tests — EventChoiceEngine triggers are invoked
 * by EncounterEngine's resolvePostCombatEvents when conditions met.
 * These tests verify the pending→resolve flow for the 3 new event types.
 */
describe('EventChoiceEngine integration with PostCombatEventResolver', () => {
  test('merchant event triggers pending choice when event fires', () => {
    const engine = new EventChoiceEngine();
    engine.triggerMerchant();
    expect(engine.hasPendingMerchantChoice()).toBe(true);
    engine.setMerchantChoice(MerchantChoice.SELL);
    const result = engine.resolveMerchantChoice();
    expect(result).toBe(MerchantChoice.SELL);
    expect(engine.hasPendingMerchantChoice()).toBe(false);
  });

  test('gambler event triggers pending choice when event fires', () => {
    const engine = new EventChoiceEngine();
    engine.triggerGambler();
    expect(engine.hasPendingGamblerChoice()).toBe(true);
    engine.setGamblerChoice(GamblerChoice.BET_HIGH);
    const result = engine.resolveGamblerChoice();
    expect(result).toBe(GamblerChoice.BET_HIGH);
    expect(engine.hasPendingGamblerChoice()).toBe(false);
  });

  test('altar event triggers pending choice when event fires', () => {
    const engine = new EventChoiceEngine();
    engine.triggerAltar();
    expect(engine.hasPendingAltarChoice()).toBe(true);
    engine.setAltarChoice(AltarChoice.SACRIFICE);
    const result = engine.resolveAltarChoice();
    expect(result).toBe(AltarChoice.SACRIFICE);
    expect(engine.hasPendingAltarChoice()).toBe(false);
  });
});

/**
 * C698: Tests for resolve effects — verify hero state changes
 * based on player choice for each event type.
 */
describe('resolveEventEffects', () => {
  function makeCtx(overrides: Partial<EventEffectContext> = {}): EventEffectContext {
    return {
      heroGold: 1000,
      heroHp: 500,
      heroHpMax: 500,
      heroAtk: 100,
      heroLevel: 50,
      relics: [],
      relicLevels: [],
      rngChance: () => true,
      rngInt: (n: number) => 0,
      ...overrides,
    };
  }

  test('merchant BUY: spend gold, gain relic', () => {
    const ctx = makeCtx({ heroGold: 1000, relics: [0], relicLevels: [1] });
    const result = resolveEventEffects('merchant', MerchantChoice.BUY, ctx);
    expect(result.goldDelta).toBeLessThan(0);
    expect(result.newRelics.length).toBe(2);
  });

  test('merchant IGNORE: no changes', () => {
    const ctx = makeCtx();
    const result = resolveEventEffects('merchant', MerchantChoice.IGNORE, ctx);
    expect(result.goldDelta).toBe(0);
    expect(result.newRelics).toEqual([]);
  });

  test('gambler BET_HIGH win: gold triples', () => {
    const ctx = makeCtx({ heroGold: 500, rngChance: () => true });
    const result = resolveEventEffects('gambler', GamblerChoice.BET_HIGH, ctx);
    expect(result.goldDelta).toBe(1000); // C714: 3x = +2x current
  });

  test('gambler BET_HIGH lose: 60% gold loss', () => {
    const ctx = makeCtx({ heroGold: 500, rngChance: () => false });
    const result = resolveEventEffects('gambler', GamblerChoice.BET_HIGH, ctx);
    expect(result.goldDelta).toBe(-300); // C714: 60% loss
    expect(result.eventSubType).toBe('event_gambler_lose_high');
  });

  test('altar SACRIFICE: HP cost + ATK buff activation', () => {
    const ctx = makeCtx({ heroHp: 500, heroHpMax: 500 });
    const result = resolveEventEffects('altar', AltarChoice.SACRIFICE, ctx);
    expect(result.hpDelta).toBeLessThan(0);
    expect(result.cursedAltarActivated).toBe(true);
  });

  test('altar LEAVE: no changes', () => {
    const ctx = makeCtx();
    const result = resolveEventEffects('altar', AltarChoice.LEAVE, ctx);
    expect(result.hpDelta).toBe(0);
    expect(result.cursedAltarActivated).toBe(false);
  });

  test('altar SACRIFICE blocked by HP threshold → falls back to PRAY', () => {
    // HP ratio 0.30 < threshold 0.40 → sacrifice denied
    const ctx = makeCtx({ heroHp: 150, heroHpMax: 500 });
    const result = resolveEventEffects('altar', AltarChoice.SACRIFICE, ctx);
    expect(result.cursedAltarActivated).toBe(false);
    expect(result.hpDelta).toBeGreaterThan(0); // heal from PRAY fallback
    expect(result.eventSubType).toBe('event_altar_pray');
  });
});
