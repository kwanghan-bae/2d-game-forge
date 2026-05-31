/**
 * C867: Pure resolver for mid-game choice events.
 * Extracts wandering merchant, sparring grounds, proving grounds,
 * mercenary offer, and crossroads resolution from EncounterEngine.
 */
import type { OverworldEvent } from '../OverworldEvents';
import {
  WANDERING_MERCHANT_HEAL_RATE,
  WANDERING_MERCHANT_ATK_DURATION,
  WANDERING_MERCHANT_ATK_MUL,
  WANDERING_MERCHANT_GAMBLE_CHANCE,
  WANDERING_MERCHANT_GAMBLE_WIN_RATE,
  WANDERING_MERCHANT_GAMBLE_LOSS_GOLD,
  WANDERING_MERCHANT_GAMBLE_LOSS_RATE,
  SPARRING_GROUNDS_WIN_CHANCE,
  SPARRING_GROUNDS_EXP_REWARD_MUL,
  SPARRING_GROUNDS_HP_COST_RATE,
  PROVING_GROUNDS_MIN_FIGHT,
  PROVING_GROUNDS_MAX_FIGHT,
  PROVING_GROUNDS_CHANCE,
  PROVING_GROUNDS_REWARD_EXP_MUL,
  PROVING_GROUNDS_REWARD_DURATION,
  PROVING_GROUNDS_FAIL_HP_COST,
  PROVING_GROUNDS_WIN_CHANCE,
  MERCENARY_OFFER_GOLD_COST_RATE,
  MERCENARY_OFFER_DURATION,
  CROSSROADS_ATK_DURATION,
  CROSSROADS_EXP_DURATION,
  CROSSROADS_GOLD_BURST_MUL,
} from './constants-events';

export interface MidGameHeroState {
  hp: number;
  hpMax: number;
  gold: number;
  level: number;
  atk: number;
}

export interface MidGameContext {
  hero: MidGameHeroState;
  totalFights: number;
  crossroadsUsed: boolean;
  rngFloat: () => number;
  rngChance: (rate: number) => boolean;
}

export interface MidGamePending {
  wanderingMerchantPending?: boolean;
  sparringGroundsPending?: boolean;
  mercenaryOfferPending?: boolean;
  crossroadsPending?: boolean;
  provingChoiceResolved?: 'accept' | 'decline'; // C875: player's choice (if already made)
}

export interface MidGameResult {
  events: OverworldEvent[];
  heroMutations: {
    hpDelta?: number;
    goldDelta?: number;
    expGain?: number;
  };
  buffs: {
    wanderingMerchantAtkRemaining?: number;
    provingGroundsExpRemaining?: number;
    mercenaryShieldRemaining?: number;
    crossroadsAtkRemaining?: number;
    crossroadsExpRemaining?: number;
  };
  crossroadsUsed?: boolean;
  provingPending?: boolean; // C875: true = player choice needed, pause game loop
}

export function resolveMidGameEvents(
  ctx: MidGameContext,
  pending: MidGamePending,
): MidGameResult {
  const events: OverworldEvent[] = [];
  const heroMutations: MidGameResult['heroMutations'] = {};
  const buffs: MidGameResult['buffs'] = {};
  let crossroadsUsed = false;

  // Wandering Merchant
  if (pending.wanderingMerchantPending) {
    const needsHeal = ctx.hero.hp < ctx.hero.hpMax * 0.7;
    if (needsHeal) {
      const healAmt = Math.floor(ctx.hero.hpMax * WANDERING_MERCHANT_HEAL_RATE);
      heroMutations.hpDelta = (heroMutations.hpDelta ?? 0) + healAmt;
      events.push({ type: 'event_wandering_merchant', choice: 'heal', value: healAmt });
    } else if (ctx.rngChance(WANDERING_MERCHANT_GAMBLE_CHANCE)) {
      if (ctx.rngChance(WANDERING_MERCHANT_GAMBLE_WIN_RATE)) {
        buffs.wanderingMerchantAtkRemaining = WANDERING_MERCHANT_ATK_DURATION * 2;
        events.push({ type: 'event_wandering_merchant', choice: 'gamble_win', value: WANDERING_MERCHANT_ATK_DURATION * 2 });
      } else {
        const lossAmount = WANDERING_MERCHANT_GAMBLE_LOSS_GOLD === -1
          ? -Math.floor(ctx.hero.gold * WANDERING_MERCHANT_GAMBLE_LOSS_RATE)
          : WANDERING_MERCHANT_GAMBLE_LOSS_GOLD;
        heroMutations.goldDelta = (heroMutations.goldDelta ?? 0) + lossAmount;
        events.push({ type: 'event_wandering_merchant', choice: 'gamble_lose', value: lossAmount });
      }
    } else {
      buffs.wanderingMerchantAtkRemaining = WANDERING_MERCHANT_ATK_DURATION;
      events.push({ type: 'event_wandering_merchant', choice: 'atk', value: WANDERING_MERCHANT_ATK_DURATION });
    }
  }

  // Sparring Grounds
  if (pending.sparringGroundsPending) {
    const won = ctx.rngFloat() < SPARRING_GROUNDS_WIN_CHANCE;
    if (won) {
      const expGained = Math.floor(ctx.hero.level * SPARRING_GROUNDS_EXP_REWARD_MUL);
      heroMutations.expGain = (heroMutations.expGain ?? 0) + expGained;
      events.push({ type: 'event_sparring_grounds', won: true, expGained, hpLost: 0 });
    } else {
      const hpLost = Math.floor(ctx.hero.hp * SPARRING_GROUNDS_HP_COST_RATE);
      heroMutations.hpDelta = (heroMutations.hpDelta ?? 0) - hpLost;
      events.push({ type: 'event_sparring_grounds', won: false, expGained: 0, hpLost });
    }
  }

  // Proving Grounds (fight 55-110)
  // C875: If choice not yet resolved, signal provingPending for player decision
  if (ctx.totalFights >= PROVING_GROUNDS_MIN_FIGHT
    && ctx.totalFights <= PROVING_GROUNDS_MAX_FIGHT
    && ctx.rngChance(PROVING_GROUNDS_CHANCE)) {
    if (pending.provingChoiceResolved === 'decline') {
      // Player chose to decline — small gold consolation
      const consolation = Math.floor(ctx.hero.level * 0.5);
      heroMutations.goldDelta = (heroMutations.goldDelta ?? 0) + consolation;
      events.push({ type: 'event_proving_grounds', won: false, expMul: 1, hpCost: 0, declined: true });
    } else if (pending.provingChoiceResolved === 'accept') {
      // Player explicitly accepted — resolve with outcome
      const won = ctx.rngFloat() < PROVING_GROUNDS_WIN_CHANCE;
      if (won) {
        buffs.provingGroundsExpRemaining = PROVING_GROUNDS_REWARD_DURATION;
        events.push({ type: 'event_proving_grounds', won: true, expMul: PROVING_GROUNDS_REWARD_EXP_MUL, hpCost: 0 });
      } else {
        const hpCost = Math.floor(ctx.hero.hpMax * PROVING_GROUNDS_FAIL_HP_COST);
        heroMutations.hpDelta = (heroMutations.hpDelta ?? 0) - hpCost;
        events.push({ type: 'event_proving_grounds', won: false, expMul: 1, hpCost });
      }
    } else {
      // No choice yet — signal pending (game loop should pause for player input)
      return { events, heroMutations, buffs, crossroadsUsed, provingPending: true };
    }
  }

  // Mercenary Offer
  if (pending.mercenaryOfferPending) {
    const goldCost = Math.floor(ctx.hero.gold * MERCENARY_OFFER_GOLD_COST_RATE);
    if (ctx.hero.gold > 100) {
      heroMutations.goldDelta = (heroMutations.goldDelta ?? 0) - goldCost;
      buffs.mercenaryShieldRemaining = MERCENARY_OFFER_DURATION;
      events.push({ type: 'event_mercenary_offer', choice: 'accept', goldPaid: goldCost, duration: MERCENARY_OFFER_DURATION });
    } else {
      events.push({ type: 'event_mercenary_offer', choice: 'decline', goldPaid: 0, duration: 0 });
    }
  }

  // Crossroads
  if (pending.crossroadsPending) {
    crossroadsUsed = true;
    const hpRate = ctx.hero.hp / ctx.hero.hpMax;
    let path: 'atk' | 'exp' | 'gold';
    if (hpRate < 0.4) {
      path = 'gold';
    } else if (ctx.hero.atk > ctx.hero.level * 3) {
      path = 'exp';
    } else {
      path = 'atk';
    }
    if (path === 'atk') {
      buffs.crossroadsAtkRemaining = CROSSROADS_ATK_DURATION;
      events.push({ type: 'event_crossroads', path, duration: CROSSROADS_ATK_DURATION });
    } else if (path === 'exp') {
      buffs.crossroadsExpRemaining = CROSSROADS_EXP_DURATION;
      events.push({ type: 'event_crossroads', path, duration: CROSSROADS_EXP_DURATION });
    } else {
      const goldBurst = ctx.hero.level * CROSSROADS_GOLD_BURST_MUL;
      heroMutations.goldDelta = (heroMutations.goldDelta ?? 0) + goldBurst;
      events.push({ type: 'event_crossroads', path, goldBurst });
    }
  }

  return { events, heroMutations, buffs, crossroadsUsed };
}
