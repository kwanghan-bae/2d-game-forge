import { describe, it, expect } from 'vitest';
import { resolveMidGameEvents, MidGameContext, MidGamePending } from '../encounter/MidGameEventResolver';

function makeCtx(overrides: Partial<MidGameContext> = {}): MidGameContext {
  return {
    hero: { hp: 500, hpMax: 1000, gold: 200, level: 10, atk: 20 },
    totalFights: 60,
    crossroadsUsed: false,
    rngFloat: () => 0.5,
    rngChance: () => true,
    ...overrides,
  };
}

describe('resolveMidGameEvents', () => {
  it('wandering merchant heals when hp < 70%', () => {
    const ctx = makeCtx({ hero: { hp: 600, hpMax: 1000, gold: 200, level: 10, atk: 20 } });
    const result = resolveMidGameEvents(ctx, { wanderingMerchantPending: true });
    expect(result.events[0]).toMatchObject({ type: 'event_wandering_merchant', choice: 'heal' });
    expect(result.heroMutations.hpDelta).toBeGreaterThan(0);
  });

  it('wandering merchant ATK buff when hp >= 70% and no gamble', () => {
    const ctx = makeCtx({
      hero: { hp: 800, hpMax: 1000, gold: 200, level: 10, atk: 20 },
      rngChance: () => false,
    });
    const result = resolveMidGameEvents(ctx, { wanderingMerchantPending: true });
    expect(result.events[0]).toMatchObject({ type: 'event_wandering_merchant', choice: 'atk' });
    expect(result.buffs.wanderingMerchantAtkRemaining).toBeGreaterThan(0);
  });

  it('wandering merchant gamble win doubles ATK duration', () => {
    const ctx = makeCtx({
      hero: { hp: 900, hpMax: 1000, gold: 200, level: 10, atk: 20 },
      rngChance: () => true,
    });
    const result = resolveMidGameEvents(ctx, { wanderingMerchantPending: true });
    expect(result.events[0]).toMatchObject({ type: 'event_wandering_merchant', choice: 'gamble_win' });
  });

  it('wandering merchant gamble lose costs gold', () => {
    let call = 0;
    const ctx = makeCtx({
      hero: { hp: 900, hpMax: 1000, gold: 200, level: 10, atk: 20 },
      rngChance: (r) => { call++; return call === 1; }, // first=gamble chance yes, second=win no
    });
    const result = resolveMidGameEvents(ctx, { wanderingMerchantPending: true });
    expect(result.events[0]).toMatchObject({ type: 'event_wandering_merchant', choice: 'gamble_lose' });
    expect(result.heroMutations.goldDelta).toBeLessThan(0);
  });

  it('sparring grounds win gives EXP', () => {
    const ctx = makeCtx({ rngFloat: () => 0.3 }); // < WIN_CHANCE
    const result = resolveMidGameEvents(ctx, { sparringGroundsPending: true });
    expect(result.events[0]).toMatchObject({ type: 'event_sparring_grounds', won: true });
    expect(result.heroMutations.expGain).toBeGreaterThan(0);
  });

  it('sparring grounds lose costs HP', () => {
    const ctx = makeCtx({ rngFloat: () => 0.99 }); // > WIN_CHANCE
    const result = resolveMidGameEvents(ctx, { sparringGroundsPending: true });
    expect(result.events[0]).toMatchObject({ type: 'event_sparring_grounds', won: false });
    expect(result.heroMutations.hpDelta).toBeLessThan(0);
  });

  it('proving grounds triggers in fight 55-90 window', () => {
    const ctx = makeCtx({ totalFights: 70, rngChance: () => true, rngFloat: () => 0.3 });
    const result = resolveMidGameEvents(ctx, { provingChoiceResolved: 'accept' });
    expect(result.events[0]).toMatchObject({ type: 'event_proving_grounds', won: true });
    expect(result.buffs.provingGroundsExpRemaining).toBe(5);
  });

  it('proving grounds does not trigger outside window', () => {
    const ctx = makeCtx({ totalFights: 30, rngChance: () => true, rngFloat: () => 0.3 });
    const result = resolveMidGameEvents(ctx, { provingChoiceResolved: 'accept' });
    expect(result.events).toHaveLength(0);
  });

  it('proving grounds fail costs 10% maxHP', () => {
    const ctx = makeCtx({ totalFights: 60, rngChance: () => true, rngFloat: () => 0.99 });
    const result = resolveMidGameEvents(ctx, { provingChoiceResolved: 'accept' });
    expect(result.events[0]).toMatchObject({ type: 'event_proving_grounds', won: false });
    expect(result.heroMutations.hpDelta).toBe(-100); // 10% of 1000
  });

  it('proving grounds returns provingPending when no choice given', () => {
    const ctx = makeCtx({ totalFights: 70, rngChance: () => true, rngFloat: () => 0.3 });
    const result = resolveMidGameEvents(ctx, {});
    expect(result.provingPending).toBe(true);
  });

  it('proving grounds decline gives consolation gold', () => {
    const ctx = makeCtx({ totalFights: 70, rngChance: () => true, rngFloat: () => 0.3 });
    const result = resolveMidGameEvents(ctx, { provingChoiceResolved: 'decline' });
    expect(result.events[0]).toMatchObject({ type: 'event_proving_grounds', declined: true });
    expect(result.heroMutations.goldDelta).toBeGreaterThan(0);
  });

  it('mercenary offer accepted if gold > 100', () => {
    const ctx = makeCtx({ hero: { hp: 800, hpMax: 1000, gold: 500, level: 10, atk: 20 }, totalFights: 115 });
    const result = resolveMidGameEvents(ctx, { mercenaryOfferPending: true });
    expect(result.events[0]).toMatchObject({ type: 'event_mercenary_offer', choice: 'accept' });
    expect(result.buffs.mercenaryShieldRemaining).toBeGreaterThan(0);
  });

  it('mercenary offer declined if gold <= 100', () => {
    const ctx = makeCtx({ hero: { hp: 800, hpMax: 1000, gold: 50, level: 10, atk: 20 }, totalFights: 115 });
    const result = resolveMidGameEvents(ctx, { mercenaryOfferPending: true });
    expect(result.events[0]).toMatchObject({ type: 'event_mercenary_offer', choice: 'decline' });
  });

  it('crossroads picks gold when hp < 40%', () => {
    const ctx = makeCtx({ hero: { hp: 300, hpMax: 1000, gold: 200, level: 10, atk: 20 }, totalFights: 115 });
    const result = resolveMidGameEvents(ctx, { crossroadsPending: true });
    expect(result.events[0]).toMatchObject({ type: 'event_crossroads', path: 'gold' });
    expect(result.heroMutations.goldDelta).toBeGreaterThan(0);
    expect(result.crossroadsUsed).toBe(true);
  });

  it('crossroads picks exp when atk > level*3', () => {
    const ctx = makeCtx({ hero: { hp: 800, hpMax: 1000, gold: 200, level: 10, atk: 50 }, totalFights: 115 });
    const result = resolveMidGameEvents(ctx, { crossroadsPending: true });
    expect(result.events[0]).toMatchObject({ type: 'event_crossroads', path: 'exp' });
    expect(result.buffs.crossroadsExpRemaining).toBeGreaterThan(0);
  });

  it('crossroads picks atk as default', () => {
    const ctx = makeCtx({ hero: { hp: 800, hpMax: 1000, gold: 200, level: 10, atk: 20 }, totalFights: 115 });
    const result = resolveMidGameEvents(ctx, { crossroadsPending: true });
    expect(result.events[0]).toMatchObject({ type: 'event_crossroads', path: 'atk' });
    expect(result.buffs.crossroadsAtkRemaining).toBeGreaterThan(0);
  });
});
