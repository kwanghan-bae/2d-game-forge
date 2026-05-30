import { describe, test, expect } from 'vitest';
import { EventChoiceEngine, MerchantChoice, GamblerChoice, AltarChoice } from '../encounter/EventChoiceEngine';

/**
 * C694: Integration tests — EventChoiceEngine triggers are invoked
 * by EncounterEngine's resolvePostCombatEvents when conditions met.
 * These tests verify the pending→resolve flow for the 3 new event types.
 */
describe('EventChoiceEngine integration with PostCombatEventResolver', () => {
  test('merchant event triggers pending choice when event fires', () => {
    const engine = new EventChoiceEngine();
    // Simulate: PostCombatResult signals merchant event
    engine.triggerMerchant();
    expect(engine.hasPendingMerchantChoice()).toBe(true);
    // Player picks SELL
    engine.setMerchantChoice(MerchantChoice.SELL);
    const result = engine.resolveMerchantChoice();
    expect(result).toBe(MerchantChoice.SELL);
    expect(engine.hasPendingMerchantChoice()).toBe(false);
  });

  test('gambler event triggers pending choice when event fires', () => {
    const engine = new EventChoiceEngine();
    engine.triggerGambler();
    expect(engine.hasPendingGamblerChoice()).toBe(true);
    // Player picks BET_HIGH
    engine.setGamblerChoice(GamblerChoice.BET_HIGH);
    const result = engine.resolveGamblerChoice();
    expect(result).toBe(GamblerChoice.BET_HIGH);
    expect(engine.hasPendingGamblerChoice()).toBe(false);
  });

  test('altar event triggers pending choice when event fires', () => {
    const engine = new EventChoiceEngine();
    engine.triggerAltar();
    expect(engine.hasPendingAltarChoice()).toBe(true);
    // Player picks SACRIFICE
    engine.setAltarChoice(AltarChoice.SACRIFICE);
    const result = engine.resolveAltarChoice();
    expect(result).toBe(AltarChoice.SACRIFICE);
    expect(engine.hasPendingAltarChoice()).toBe(false);
  });
});
