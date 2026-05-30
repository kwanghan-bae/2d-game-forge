import { describe, test, expect } from 'vitest';
import { EventChoiceEngine, ShrineChoice, DangerChoice } from '../encounter/EventChoiceEngine';

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
});
