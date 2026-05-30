import { describe, test, expect } from 'vitest';
import { EventChoiceEngine, ShrineChoice, DangerChoice, MerchantChoice, GamblerChoice, AltarChoice } from '../encounter/EventChoiceEngine';

describe('EventChoiceEngine', () => {
  describe('shrine choice', () => {
    test('starts with no pending shrine choice', () => {
      const engine = new EventChoiceEngine();
      expect(engine.hasPendingShrineChoice()).toBe(false);
    });

    test('setPendingShrineChoice makes it pending', () => {
      const engine = new EventChoiceEngine();
      engine.setPendingShrineChoice();
      expect(engine.hasPendingShrineChoice()).toBe(true);
    });

    test('resolveShrineChoice returns the choice and clears pending', () => {
      const engine = new EventChoiceEngine();
      engine.setPendingShrineChoice();
      engine.setShrineChoice(ShrineChoice.EXP);
      const result = engine.resolveShrineChoice();
      expect(result).toBe(ShrineChoice.EXP);
      expect(engine.hasPendingShrineChoice()).toBe(false);
    });

    test('resolveShrineChoice defaults to GOLD if no explicit choice', () => {
      const engine = new EventChoiceEngine();
      engine.setPendingShrineChoice();
      const result = engine.resolveShrineChoice();
      expect(result).toBe(ShrineChoice.GOLD);
      expect(engine.hasPendingShrineChoice()).toBe(false);
    });
  });

  describe('danger choice', () => {
    test('starts with no pending danger choice', () => {
      const engine = new EventChoiceEngine();
      expect(engine.hasPendingDangerChoice()).toBe(false);
    });

    test('enterDangerZone makes it pending', () => {
      const engine = new EventChoiceEngine();
      engine.enterDangerZone();
      expect(engine.hasPendingDangerChoice()).toBe(true);
    });

    test('setDangerChoice(retreat) resolves to RETREAT', () => {
      const engine = new EventChoiceEngine();
      engine.enterDangerZone();
      engine.setDangerChoice(true);
      expect(engine.getDangerChoice()).toBe(DangerChoice.RETREAT);
    });

    test('setDangerChoice(fight) resolves to FIGHT', () => {
      const engine = new EventChoiceEngine();
      engine.enterDangerZone();
      engine.setDangerChoice(false);
      expect(engine.getDangerChoice()).toBe(DangerChoice.FIGHT);
    });

    test('clearDangerChoice resets state', () => {
      const engine = new EventChoiceEngine();
      engine.enterDangerZone();
      engine.setDangerChoice(true);
      engine.clearDangerChoice();
      expect(engine.hasPendingDangerChoice()).toBe(false);
      expect(engine.getDangerChoice()).toBe(DangerChoice.NONE);
    });

    test('exitDangerZone clears pending state', () => {
      const engine = new EventChoiceEngine();
      engine.enterDangerZone();
      engine.exitDangerZone();
      expect(engine.hasPendingDangerChoice()).toBe(false);
    });
  });

  describe('merchant choice', () => {
    test('starts with no pending merchant choice', () => {
      const engine = new EventChoiceEngine();
      expect(engine.hasPendingMerchantChoice()).toBe(false);
    });

    test('triggerMerchant makes it pending with BUY default', () => {
      const engine = new EventChoiceEngine();
      engine.triggerMerchant();
      expect(engine.hasPendingMerchantChoice()).toBe(true);
    });

    test('setMerchantChoice changes to SELL', () => {
      const engine = new EventChoiceEngine();
      engine.triggerMerchant();
      engine.setMerchantChoice(MerchantChoice.SELL);
      const result = engine.resolveMerchantChoice();
      expect(result).toBe(MerchantChoice.SELL);
    });

    test('resolveMerchantChoice returns choice and clears pending', () => {
      const engine = new EventChoiceEngine();
      engine.triggerMerchant();
      engine.setMerchantChoice(MerchantChoice.IGNORE);
      const result = engine.resolveMerchantChoice();
      expect(result).toBe(MerchantChoice.IGNORE);
      expect(engine.hasPendingMerchantChoice()).toBe(false);
    });
  });

  describe('gambler choice', () => {
    test('starts with no pending gambler choice', () => {
      const engine = new EventChoiceEngine();
      expect(engine.hasPendingGamblerChoice()).toBe(false);
    });

    test('triggerGambler makes it pending', () => {
      const engine = new EventChoiceEngine();
      engine.triggerGambler();
      expect(engine.hasPendingGamblerChoice()).toBe(true);
    });

    test('setGamblerChoice to BET_LOW and resolve', () => {
      const engine = new EventChoiceEngine();
      engine.triggerGambler();
      engine.setGamblerChoice(GamblerChoice.BET_LOW);
      const result = engine.resolveGamblerChoice();
      expect(result).toBe(GamblerChoice.BET_LOW);
      expect(engine.hasPendingGamblerChoice()).toBe(false);
    });

    test('resolveGamblerChoice defaults to BET_LOW', () => {
      const engine = new EventChoiceEngine();
      engine.triggerGambler();
      const result = engine.resolveGamblerChoice();
      expect(result).toBe(GamblerChoice.BET_LOW);
    });
  });

  describe('altar choice', () => {
    test('starts with no pending altar choice', () => {
      const engine = new EventChoiceEngine();
      expect(engine.hasPendingAltarChoice()).toBe(false);
    });

    test('triggerAltar makes it pending', () => {
      const engine = new EventChoiceEngine();
      engine.triggerAltar();
      expect(engine.hasPendingAltarChoice()).toBe(true);
    });

    test('setAltarChoice to SACRIFICE and resolve', () => {
      const engine = new EventChoiceEngine();
      engine.triggerAltar();
      engine.setAltarChoice(AltarChoice.SACRIFICE);
      const result = engine.resolveAltarChoice();
      expect(result).toBe(AltarChoice.SACRIFICE);
      expect(engine.hasPendingAltarChoice()).toBe(false);
    });

    test('resolveAltarChoice defaults to SACRIFICE', () => {
      const engine = new EventChoiceEngine();
      engine.triggerAltar();
      const result = engine.resolveAltarChoice();
      expect(result).toBe(AltarChoice.SACRIFICE);
    });
  });
});
