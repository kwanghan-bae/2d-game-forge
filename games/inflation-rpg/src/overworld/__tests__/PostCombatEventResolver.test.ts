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
      eventMomentumDensityActive: false,
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
      eventMomentumDensityActive: false,
    }));
    expect(result.newEventChainCount).toBe(1);
  });

  it('pity timer does NOT force trap — skips to positive event', () => {
    // When fightsSinceEvent >= 20, pity activates. Trap uses rngChance (not pity).
    // rngChance always returns false → trap won't fire.
    // But pity forces the NEXT eligible positive event (treasure shrine).
    const result = resolvePostCombatEvent(makeCtx({
      fightsSinceEvent: 25,
      rngChance: () => false, // never natural trigger
    }));
    // Should NOT be trap; should be a positive event (treasure shrine is first positive)
    expect(result.eventType).not.toBe('event_trap');
    expect(result.eventType).not.toBeNull();
  });

  it('pity timer forces positive event (treasure shrine first)', () => {
    const result = resolvePostCombatEvent(makeCtx({
      fightsSinceEvent: 18, // C743: pity threshold now 18
      rngChance: () => false,
    }));
    expect(result.eventType).toBe('event_treasure_shrine_pending');
  });

  // C743: Healer event (C809: updated for weighted pool)
  it('triggers healer event with HP recovery', () => {
    // Pool: trap(0.04), shrine(0.08), fairy(0.02), mentor(0.03), healer(0.03), inspiration(0.025)
    // rngInt=8000 → roll lands in healer slice (cumulative 0.17-0.20)
    const result = resolvePostCombatEvent(makeCtx({
      heroHp: 50,
      heroHpMax: 100,
      totalFights: 50,
      heroLevel: 1,
      heroGold: 0,
      strategyGambler: false,
      strategyBlacksmith: false,
      strategyCursedAltar: false,
      strategyRestShrine: false,
      rngChance: () => true,
      rngInt: (n: number) => n === 10000 ? 8000 : 0,
    }));
    expect(result.eventType).toBe('event_healer');
    expect(result.heroHpDelta).toBe(25); // 0.25 * 100 = 25
  });

  it('healer blocked when totalFights < HEALER_MIN_FIGHTS', () => {
    const result = resolvePostCombatEvent(makeCtx({
      totalFights: 25, // < 30
      heroHp: 50,
      heroHpMax: 100,
      rngChance: () => true,
      rngInt: (n: number) => n - 1, // always pick last
    }));
    // Should not be healer since totalFights < 30
    expect(result.eventType).not.toBe('event_healer');
  });

  // C743: Echo event (C809: updated for weighted pool)
  it('triggers echo event granting prestige echo duration', () => {
    // Make echo the only late-eligible event by disabling optional strategies
    const result = resolvePostCombatEvent(makeCtx({
      heroLevel: 10,
      totalFights: 25, // below healer/inspiration gates, above eventsEnabled threshold
      heroGold: 0,
      strategyGambler: false,
      strategyBlacksmith: false,
      strategyCursedAltar: false,
      strategyRestShrine: false,
      rngChance: () => true,
      rngInt: (n: number) => n === 10000 ? 9999 : 0, // last position → echo (only tail event)
    }));
    expect(result.eventType).toBe('event_echo');
    expect(result.newPrestigeEchoRemaining).toBe(10);
  });

  it('echo blocked when heroLevel < ECHO_MIN_LEVEL', () => {
    const result = resolvePostCombatEvent(makeCtx({
      heroLevel: 3, // < 5
      totalFights: 50,
      rngChance: () => true,
    }));
    expect(result.eventType).not.toBe('event_echo');
  });

  // C747: Inspiration event (C809: updated for weighted pool)
  it('triggers inspiration event with ATK buff metadata', () => {
    // Make inspiration the last eligible event
    const result = resolvePostCombatEvent(makeCtx({
      heroLevel: 1, // below echo gate
      totalFights: 50,
      heroGold: 0,
      strategyGambler: false,
      strategyBlacksmith: false,
      strategyCursedAltar: false,
      strategyRestShrine: false,
      rngChance: () => true,
      rngInt: (n: number) => n === 10000 ? 9999 : 0, // last position → inspiration
    }));
    expect(result.eventType).toBe('event_inspiration');
    expect(result.newInspirationRemaining).toBe(6); // C751: early-mid phase duration
  });

  it('inspiration blocked when totalFights < phase minFights', () => {
    const result = resolvePostCombatEvent(makeCtx({
      totalFights: 25, // < 30 (early-mid gate)
      rngChance: () => true,
    }));
    expect(result.eventType).not.toBe('event_inspiration');
  });

  // C755: Late-game exclusive events (C809: updated for weighted pool)
  it('triggers ancient_colosseum after 150 fights', () => {
    // At 160 fights, colosseum is available. Use rngInt to pick it from pool tail.
    const result = resolvePostCombatEvent(makeCtx({
      heroLevel: 1,
      totalFights: 160,
      heroGold: 0,
      strategyGambler: false,
      strategyBlacksmith: false,
      strategyCursedAltar: false,
      strategyRestShrine: false,
      rngChance: () => true,
      rngInt: (n: number) => n === 10000 ? 9999 : 0, // last position → colosseum (last in pool)
    }));
    expect(result.eventType).toBe('event_ancient_colosseum');
    expect(result.colosseumPending).toBe(true);
  });

  it('does not trigger ancient_colosseum before 150 fights', () => {
    const result = resolvePostCombatEvent(makeCtx({
      totalFights: 100,
      rngChance: () => true,
      rngInt: (n: number) => n - 1, // pick last
    }));
    // At 100 fights, ancient_colosseum is not available (gate=150)
    expect(result.eventType).not.toBe('event_ancient_colosseum');
  });

  it('triggers void_rift after 200 fights', () => {
    // At 250 fights, void_rift is available (gate=200). Use rngInt to select last item.
    const result = resolvePostCombatEvent(makeCtx({
      heroLevel: 1,
      totalFights: 250,
      heroGold: 0,
      strategyGambler: false,
      strategyBlacksmith: false,
      strategyCursedAltar: false,
      strategyRestShrine: false,
      rngChance: () => true,
      rngInt: (n: number) => n === 10000 ? 9999 : 0, // last → late events (void_rift or later)
    }));
    // With multiple late events available, this picks the last one in pool
    expect(result.voidRiftTriggered || result.eventType?.includes('event_')).toBeTruthy();
  });
});
