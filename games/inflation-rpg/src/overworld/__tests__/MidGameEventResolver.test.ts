import { describe, it, expect } from 'vitest';
import { resolveMidGameEvents, MidGameContext, MidGamePending } from '../encounter/MidGameEventResolver';

function makeCtx(overrides: Partial<MidGameContext> = {}): MidGameContext {
  return {
    hero: { hp: 500, hpMax: 1000, gold: 200, level: 10, atk: 20 },
    totalFights: 30,
    crossroadsUsed: false,
    rngFloat: () => 0.5,
    rngChance: () => true,
    ...overrides,
  };
}

describe('resolveMidGameEvents', () => {
  it('wandering merchant returns pending when no choice resolved', () => {
    const ctx = makeCtx({ hero: { hp: 600, hpMax: 1000, gold: 200, level: 10, atk: 20 } });
    const result = resolveMidGameEvents(ctx, { wanderingMerchantPending: true });
    expect(result.wanderingMerchantChoicePending).toBe(true);
  });

  it('wandering merchant heals when player chooses heal', () => {
    const ctx = makeCtx({ hero: { hp: 600, hpMax: 1000, gold: 200, level: 10, atk: 20 } });
    const result = resolveMidGameEvents(ctx, { wanderingMerchantPending: true, wanderingMerchantChoiceResolved: 'heal' });
    expect(result.events[0]).toMatchObject({ type: 'event_wandering_merchant', choice: 'heal' });
    expect(result.heroMutations.hpDelta).toBeGreaterThan(0);
  });

  it('wandering merchant ATK buff when player chooses atk', () => {
    const ctx = makeCtx({
      hero: { hp: 800, hpMax: 1000, gold: 200, level: 10, atk: 20 },
    });
    const result = resolveMidGameEvents(ctx, { wanderingMerchantPending: true, wanderingMerchantChoiceResolved: 'atk' });
    expect(result.events[0]).toMatchObject({ type: 'event_wandering_merchant', choice: 'atk' });
    expect(result.buffs.wanderingMerchantAtkRemaining).toBeGreaterThan(0);
  });

  it('wandering merchant gamble win doubles ATK duration', () => {
    const ctx = makeCtx({
      hero: { hp: 900, hpMax: 1000, gold: 200, level: 10, atk: 20 },
      rngChance: () => true,
    });
    const result = resolveMidGameEvents(ctx, { wanderingMerchantPending: true, wanderingMerchantChoiceResolved: 'gamble' });
    expect(result.events[0]).toMatchObject({ type: 'event_wandering_merchant', choice: 'gamble_win' });
  });

  it('wandering merchant gamble lose costs gold', () => {
    const ctx = makeCtx({
      hero: { hp: 900, hpMax: 1000, gold: 200, level: 10, atk: 20 },
      rngChance: () => false,
    });
    const result = resolveMidGameEvents(ctx, { wanderingMerchantPending: true, wanderingMerchantChoiceResolved: 'gamble' });
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
    const result = resolveMidGameEvents(ctx, { sparringGroundsPending: true, firstTrialFired: true });
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
    const result = resolveMidGameEvents(ctx, { provingChoiceResolved: 'accept', firstTrialFired: true });
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

  // C911: First Trial 2-phase pending tests
  it('first trial returns pending when no choice resolved', () => {
    const ctx = makeCtx({ hero: { hp: 400, hpMax: 1000, gold: 200, level: 10, atk: 20 }, totalFights: 15, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, {});
    expect(result.firstTrialChoicePending).toBe(true);
  });

  it('first trial heals when player chooses heal', () => {
    const ctx = makeCtx({ hero: { hp: 400, hpMax: 1000, gold: 200, level: 10, atk: 20 }, totalFights: 15, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { firstTrialChoiceResolved: 'heal' });
    expect(result.events[0]).toMatchObject({ type: 'event_first_trial', style: 'heal' });
    expect(result.heroMutations.hpDelta).toBeGreaterThan(0);
    expect(result.firstTrialFired).toBe(true);
  });

  it('first trial gives ATK buff when player chooses atk', () => {
    const ctx = makeCtx({ hero: { hp: 700, hpMax: 1000, gold: 200, level: 10, atk: 20 }, totalFights: 20, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { firstTrialChoiceResolved: 'atk' });
    expect(result.events[0]).toMatchObject({ type: 'event_first_trial', style: 'atk' });
    expect(result.buffs.firstTrialAtkRemaining).toBeGreaterThan(0);
    expect(result.firstTrialFired).toBe(true);
  });

  it('first trial does not fire if already fired', () => {
    const ctx = makeCtx({ hero: { hp: 700, hpMax: 1000, gold: 200, level: 10, atk: 20 }, totalFights: 15, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { firstTrialFired: true });
    const ftEvents = result.events.filter((e: { type: string }) => e.type === 'event_first_trial');
    expect(ftEvents).toHaveLength(0);
    expect(result.firstTrialChoicePending).toBeUndefined();
  });

  it('first trial does not fire outside window', () => {
    const ctx = makeCtx({ hero: { hp: 700, hpMax: 1000, gold: 200, level: 10, atk: 20 }, totalFights: 5, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, {});
    const ftEvents = result.events.filter((e: { type: string }) => e.type === 'event_first_trial');
    expect(ftEvents).toHaveLength(0);
    expect(result.firstTrialChoicePending).toBeUndefined();
  });

  it('mercenary offer returns pending when no choice resolved', () => {
    const ctx = makeCtx({ hero: { hp: 800, hpMax: 1000, gold: 500, level: 10, atk: 20 }, totalFights: 115 });
    const result = resolveMidGameEvents(ctx, { mercenaryOfferPending: true });
    expect(result.mercenaryChoicePending).toBe(true);
  });

  it('mercenary offer accepted when player chooses accept', () => {
    const ctx = makeCtx({ hero: { hp: 800, hpMax: 1000, gold: 500, level: 10, atk: 20 }, totalFights: 115 });
    const result = resolveMidGameEvents(ctx, { mercenaryOfferPending: true, mercenaryChoiceResolved: 'accept' });
    expect(result.events[0]).toMatchObject({ type: 'event_mercenary_offer', choice: 'accept' });
    expect(result.buffs.mercenaryShieldRemaining).toBeGreaterThan(0);
  });

  it('mercenary offer declined when player chooses decline', () => {
    const ctx = makeCtx({ hero: { hp: 800, hpMax: 1000, gold: 50, level: 10, atk: 20 }, totalFights: 115 });
    const result = resolveMidGameEvents(ctx, { mercenaryOfferPending: true, mercenaryChoiceResolved: 'decline' });
    expect(result.events[0]).toMatchObject({ type: 'event_mercenary_offer', choice: 'decline' });
  });

  it('crossroads returns pending when no choice resolved', () => {
    const ctx = makeCtx({ hero: { hp: 300, hpMax: 1000, gold: 200, level: 10, atk: 20 }, totalFights: 115 });
    const result = resolveMidGameEvents(ctx, { crossroadsPending: true });
    expect(result.crossroadsChoicePending).toBe(true);
  });

  it('crossroads picks gold when player chooses gold', () => {
    const ctx = makeCtx({ hero: { hp: 300, hpMax: 1000, gold: 200, level: 10, atk: 20 }, totalFights: 115 });
    const result = resolveMidGameEvents(ctx, { crossroadsPending: true, crossroadsChoiceResolved: 'gold' });
    expect(result.events[0]).toMatchObject({ type: 'event_crossroads', path: 'gold' });
    expect(result.heroMutations.goldDelta).toBeGreaterThan(0);
    expect(result.crossroadsUsed).toBe(true);
  });

  it('crossroads picks exp when player chooses exp', () => {
    const ctx = makeCtx({ hero: { hp: 800, hpMax: 1000, gold: 200, level: 10, atk: 50 }, totalFights: 115 });
    const result = resolveMidGameEvents(ctx, { crossroadsPending: true, crossroadsChoiceResolved: 'exp' });
    expect(result.events[0]).toMatchObject({ type: 'event_crossroads', path: 'exp' });
    expect(result.buffs.crossroadsExpRemaining).toBeGreaterThan(0);
  });

  it('crossroads picks atk when player chooses atk', () => {
    const ctx = makeCtx({ hero: { hp: 800, hpMax: 1000, gold: 200, level: 10, atk: 20 }, totalFights: 115 });
    const result = resolveMidGameEvents(ctx, { crossroadsPending: true, crossroadsChoiceResolved: 'atk' });
    expect(result.events[0]).toMatchObject({ type: 'event_crossroads', path: 'atk' });
    expect(result.buffs.crossroadsAtkRemaining).toBeGreaterThan(0);
  });

  // C883: Reputation payoff tests
  it('reputation aggressive gives ATK buff', () => {
    const ctx = makeCtx({ totalFights: 190, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { reputationStyle: 'aggressive', reputationTotalChoices: 3 });
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'event_reputation', style: 'aggressive' }));
    expect(result.buffs.reputationAtkRemaining).toBe(8);
    expect(result.reputationFired).toBe(true);
  });

  it('reputation defensive heals + shield', () => {
    const ctx = makeCtx({ totalFights: 190, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { reputationStyle: 'defensive', reputationTotalChoices: 3 });
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'event_reputation', style: 'defensive' }));
    expect(result.heroMutations.hpDelta).toBeGreaterThan(0);
    expect(result.buffs.reputationShieldRemaining).toBe(6);
  });

  it('reputation greedy gives gold burst', () => {
    const ctx = makeCtx({ totalFights: 190, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { reputationStyle: 'greedy', reputationTotalChoices: 3 });
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'event_reputation', style: 'greedy' }));
    expect(result.heroMutations.goldDelta).toBeGreaterThan(0);
    // C902: greedy gold gain buff
    expect(result.greedyGoldMul).toBe(1.25);
    expect(result.buffs.greedyGoldRemaining).toBe(5);
  });

  it('reputation balanced gives EXP buff', () => {
    const ctx = makeCtx({ totalFights: 190, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { reputationStyle: 'balanced', reputationTotalChoices: 3 });
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'event_reputation', style: 'balanced' }));
    expect(result.buffs.reputationExpRemaining).toBe(5);
  });

  it('reputation does not fire outside window', () => {
    const ctx = makeCtx({ totalFights: 150, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { reputationStyle: 'aggressive', reputationTotalChoices: 3 });
    const repEvents = result.events.filter(e => e.type === 'event_reputation');
    expect(repEvents).toHaveLength(0);
  });

  it('reputation does not fire with too few choices', () => {
    const ctx = makeCtx({ totalFights: 190, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { reputationStyle: 'aggressive', reputationTotalChoices: 2 });
    const repEvents = result.events.filter(e => e.type === 'event_reputation');
    expect(repEvents).toHaveLength(0);
  });

  it('reputation does not re-fire if already fired', () => {
    const ctx = makeCtx({ totalFights: 190, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { reputationStyle: 'aggressive', reputationTotalChoices: 3, reputationFired: true });
    const repEvents = result.events.filter(e => e.type === 'event_reputation');
    expect(repEvents).toHaveLength(0);
  });

  // C887: Veteran's Trial tests
  it('veterans trial aggressive gives ATK + costs HP', () => {
    const ctx = makeCtx({ totalFights: 300, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { reputationStyle: 'aggressive', reputationTotalChoices: 5, reputationFired: true });
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'event_veterans_trial', style: 'aggressive' }));
    expect(result.buffs.veteransTrialAtkRemaining).toBe(12);
    expect(result.heroMutations.hpDelta).toBeLessThan(0);
    expect(result.veteransTrialFired).toBe(true);
  });

  it('veterans trial defensive heals + shield', () => {
    const ctx = makeCtx({ totalFights: 300, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { reputationStyle: 'defensive', reputationTotalChoices: 5, reputationFired: true });
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'event_veterans_trial', style: 'defensive' }));
    expect(result.heroMutations.hpDelta).toBeGreaterThan(0);
    expect(result.buffs.veteransTrialShieldRemaining).toBe(10);
  });

  it('veterans trial greedy gives gold burst', () => {
    const ctx = makeCtx({ totalFights: 300, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { reputationStyle: 'greedy', reputationTotalChoices: 5, reputationFired: true });
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'event_veterans_trial', style: 'greedy' }));
    expect(result.heroMutations.goldDelta).toBeGreaterThan(0);
    // C902: greedy gold gain buff
    expect(result.greedyGoldMul).toBe(1.35);
    expect(result.buffs.greedyGoldRemaining).toBe(8);
  });

  it('veterans trial balanced gives both ATK + EXP', () => {
    const ctx = makeCtx({ totalFights: 300, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { reputationStyle: 'balanced', reputationTotalChoices: 5, reputationFired: true });
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'event_veterans_trial', style: 'balanced' }));
    expect(result.buffs.veteransTrialAtkRemaining).toBe(6);
    expect(result.buffs.veteransTrialExpRemaining).toBe(6);
  });

  it('veterans trial does not fire outside window', () => {
    const ctx = makeCtx({ totalFights: 200, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { reputationStyle: 'aggressive', reputationTotalChoices: 5, reputationFired: true });
    const vtEvents = result.events.filter(e => e.type === 'event_veterans_trial');
    expect(vtEvents).toHaveLength(0);
  });

  it('veterans trial does not re-fire', () => {
    const ctx = makeCtx({ totalFights: 300, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { reputationStyle: 'aggressive', reputationTotalChoices: 5, reputationFired: true, veteransTrialFired: true });
    const vtEvents = result.events.filter(e => e.type === 'event_veterans_trial');
    expect(vtEvents).toHaveLength(0);
  });

  // C890: Last Stand Challenge tests
  it('last stand returns pending when no choice resolved', () => {
    const ctx = makeCtx({ totalFights: 450, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { reputationFired: true, veteransTrialFired: true });
    expect(result.lastStandChoicePending).toBe(true);
  });

  it('last stand accept gives ATK buff + costs HP', () => {
    const ctx = makeCtx({ totalFights: 450, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { reputationFired: true, veteransTrialFired: true, lastStandChoiceResolved: 'accept' });
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'event_last_stand', choice: 'accept' }));
    expect(result.buffs.lastStandAtkRemaining).toBe(12);
    expect(result.heroMutations.hpDelta).toBeLessThan(0);
  });

  it('last stand decline heals + gives gold', () => {
    const ctx = makeCtx({ totalFights: 450, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { reputationFired: true, veteransTrialFired: true, lastStandChoiceResolved: 'decline' });
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'event_last_stand', choice: 'decline' }));
    expect(result.heroMutations.hpDelta).toBeGreaterThan(0);
    expect(result.heroMutations.goldDelta).toBeGreaterThan(0);
  });

  it('last stand does not fire outside window', () => {
    const ctx = makeCtx({ totalFights: 300, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { reputationFired: true, veteransTrialFired: true });
    expect(result.lastStandChoicePending).toBeUndefined();
  });

  it('last stand does not re-fire', () => {
    const ctx = makeCtx({ totalFights: 450, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, { reputationFired: true, veteransTrialFired: true, lastStandFired: true });
    expect(result.lastStandChoicePending).toBeUndefined();
    const lsEvents = result.events.filter(e => e.type === 'event_last_stand');
    expect(lsEvents).toHaveLength(0);
  });

  // C896: Final Reckoning consequence event tests
  it('final reckoning fires in fight 500-600 window with aggressive style', () => {
    const ctx = makeCtx({ totalFights: 550, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, {
      reputationFired: true,
      veteransTrialFired: true,
      lastStandFired: true,
      reputationStyle: 'aggressive',
      reputationTotalChoices: 10,
    });
    expect(result.finalReckoningFired).toBe(true);
    expect(result.buffs.finalReckoningAtkRemaining).toBeGreaterThan(0);
    expect(result.heroMutations.hpDelta).toBeLessThan(0); // HP cost
  });

  it('final reckoning fires defensive style with shield + heal', () => {
    const ctx = makeCtx({ totalFights: 520, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, {
      reputationFired: true,
      veteransTrialFired: true,
      lastStandFired: true,
      reputationStyle: 'defensive',
      reputationTotalChoices: 10,
    });
    expect(result.finalReckoningFired).toBe(true);
    expect(result.buffs.finalReckoningShieldRemaining).toBeGreaterThan(0);
    expect(result.heroMutations.hpDelta).toBeGreaterThan(0); // heal
  });

  it('final reckoning fires greedy style with gold burst', () => {
    const ctx = makeCtx({ totalFights: 510, rngChance: () => true, hero: { hp: 800, hpMax: 1000, gold: 200, level: 50, atk: 20 } });
    const result = resolveMidGameEvents(ctx, {
      reputationFired: true,
      veteransTrialFired: true,
      lastStandFired: true,
      reputationStyle: 'greedy',
      reputationTotalChoices: 10,
    });
    expect(result.finalReckoningFired).toBe(true);
    expect(result.heroMutations.goldDelta).toBeGreaterThan(0);
    // C902: greedy gold gain buff
    expect(result.greedyGoldMul).toBe(1.50);
    expect(result.buffs.greedyGoldRemaining).toBe(15);
  });

  it('final reckoning balanced style gives ATK + EXP', () => {
    const ctx = makeCtx({ totalFights: 560, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, {
      reputationFired: true,
      veteransTrialFired: true,
      lastStandFired: true,
      reputationStyle: 'balanced',
      reputationTotalChoices: 10,
    });
    expect(result.finalReckoningFired).toBe(true);
    expect(result.buffs.finalReckoningAtkRemaining).toBeGreaterThan(0);
    expect(result.buffs.finalReckoningExpRemaining).toBeGreaterThan(0);
  });

  it('final reckoning does not fire below fight 500', () => {
    const ctx = makeCtx({ totalFights: 499, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, {
      reputationFired: true,
      veteransTrialFired: true,
      lastStandFired: true,
      reputationStyle: 'aggressive',
      reputationTotalChoices: 10,
    });
    expect(result.finalReckoningFired).toBeUndefined();
  });

  it('final reckoning does not re-fire', () => {
    const ctx = makeCtx({ totalFights: 550, rngChance: () => true });
    const result = resolveMidGameEvents(ctx, {
      reputationFired: true,
      veteransTrialFired: true,
      lastStandFired: true,
      finalReckoningFired: true,
      reputationStyle: 'aggressive',
      reputationTotalChoices: 10,
    });
    expect(result.finalReckoningFired).toBeUndefined();
  });
});
