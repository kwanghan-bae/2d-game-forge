import { describe, it, expect } from 'vitest';
import { resolvePostCombatEvent, PostCombatContext, PostCombatResult } from '../encounter/PostCombatEventResolver';

describe('PostCombatEventResolver', () => {
  function makeCtx(overrides: Partial<PostCombatContext> = {}): PostCombatContext {
    return {
      totalFights: 50,
      comboStreak: 0,
      heroHp: 100,
      heroHpMax: 100,
      heroGold: 500,
      heroAtk: 10,
      heroLevel: 10,
      isElite: false,
      isBoss: false,
      cursedAltarRemaining: 0,
      cursedAltarAtkBuff: false,
      fairyBlessingRemaining: 0,
      relics: [],
      relicLevels: [],
      fightsSinceVillage: 10,
      eventChainCount: 0,
      consecutiveEliteKills2: 0,
      goldenHourRemaining: 0,
      strategyRestShrine: true,
      strategyGambler: true,
      strategyBlacksmith: true,
      strategyCursedAltar: true,
      rngChance: () => false,
      rngInt: (n: number) => 0,
      hasPendingShrineChoice: () => false,
      ...overrides,
    };
  }

  it('returns no event when totalFights <= 20', () => {
    const result = resolvePostCombatEvent(makeCtx({ totalFights: 10 }));
    expect(result.eventType).toBeNull();
  });

  it('triggers trap when rng allows and combo < threshold', () => {
    let callCount = 0;
    const result = resolvePostCombatEvent(makeCtx({
      rngChance: () => { callCount++; return callCount === 1; }, // first chance = trap
      comboStreak: 0,
    }));
    expect(result.eventType).toBe('event_trap');
  });

  it('avoids trap when combo >= TRAP_AVOID_COMBO', () => {
    let callCount = 0;
    const result = resolvePostCombatEvent(makeCtx({
      rngChance: () => { callCount++; return callCount === 1; },
      comboStreak: 100,
    }));
    expect(result.eventType).toBe('event_trap_avoided');
  });

  it('increments event chain on event trigger', () => {
    let callCount = 0;
    const result = resolvePostCombatEvent(makeCtx({
      rngChance: () => { callCount++; return callCount === 1; },
      comboStreak: 100,
      eventChainCount: 0,
    }));
    expect(result.newEventChainCount).toBe(1);
  });
});
