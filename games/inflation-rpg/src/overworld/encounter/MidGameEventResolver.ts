/**
 * C867: Pure resolver for mid-game choice events.
 * Extracts wandering merchant, sparring grounds, proving grounds,
 * mercenary offer, and crossroads resolution from EncounterEngine.
 */
import type { OverworldEvent } from '../OverworldEvents';
import { resolveConsequenceEvents } from './ConsequenceResolver';
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
  PROVING_GROUNDS_MANUAL_BONUS,
  MERCENARY_OFFER_GOLD_COST_RATE,
  MERCENARY_OFFER_DURATION,
  CROSSROADS_ATK_DURATION,
  CROSSROADS_EXP_DURATION,
  CROSSROADS_GOLD_BURST_MUL,
  LAST_STAND_MIN_FIGHT,
  LAST_STAND_MAX_FIGHT,
  LAST_STAND_CHANCE,
  LAST_STAND_ATK_MUL,
  LAST_STAND_ATK_DURATION,
  LAST_STAND_HP_COST,
  LAST_STAND_DECLINE_HEAL_RATE,
  LAST_STAND_DECLINE_GOLD_MUL,
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
  mercenaryChoiceResolved?: 'accept' | 'decline'; // C878: player's choice
  crossroadsChoiceResolved?: 'atk' | 'exp' | 'gold'; // C878: player's chosen path
  wanderingMerchantChoiceResolved?: 'heal' | 'atk' | 'gamble'; // C881: player's choice
  reputationStyle?: 'aggressive' | 'defensive' | 'greedy' | 'balanced'; // C883: dominant choice style
  reputationTotalChoices?: number; // C883: how many choices player has made
  reputationFired?: boolean; // C883: already triggered this run
  veteransTrialFired?: boolean; // C887: already triggered this run
  lastStandChoiceResolved?: 'accept' | 'decline'; // C890: player's choice
  lastStandFired?: boolean; // C890: already triggered this run
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
    reputationAtkRemaining?: number; // C883
    reputationShieldRemaining?: number; // C883
    reputationExpRemaining?: number; // C883
    veteransTrialAtkRemaining?: number; // C887
    veteransTrialShieldRemaining?: number; // C887
    veteransTrialExpRemaining?: number; // C887
    lastStandAtkRemaining?: number; // C890
  };
  crossroadsUsed?: boolean;
  provingPending?: boolean; // C875: true = player choice needed, pause game loop
  mercenaryChoicePending?: boolean; // C878: true = player choice needed
  crossroadsChoicePending?: boolean; // C878: true = player choice needed
  wanderingMerchantChoicePending?: boolean; // C881: true = player choice needed
  lastStandChoicePending?: boolean; // C890: true = player choice needed
  reputationFired?: boolean; // C883: true = reputation payoff event triggered
  veteransTrialFired?: boolean; // C887: true = veteran's trial event triggered
}

export function resolveMidGameEvents(
  ctx: MidGameContext,
  pending: MidGamePending,
): MidGameResult {
  const events: OverworldEvent[] = [];
  const heroMutations: MidGameResult['heroMutations'] = {};
  const buffs: MidGameResult['buffs'] = {};
  let crossroadsUsed = false;

  // Wandering Merchant — C881: two-phase player choice (heal/atk/gamble)
  if (pending.wanderingMerchantPending) {
    if (pending.wanderingMerchantChoiceResolved === 'heal') {
      const healAmt = Math.floor(ctx.hero.hpMax * WANDERING_MERCHANT_HEAL_RATE);
      heroMutations.hpDelta = (heroMutations.hpDelta ?? 0) + healAmt;
      events.push({ type: 'event_wandering_merchant', choice: 'heal', value: healAmt });
    } else if (pending.wanderingMerchantChoiceResolved === 'atk') {
      buffs.wanderingMerchantAtkRemaining = WANDERING_MERCHANT_ATK_DURATION;
      events.push({ type: 'event_wandering_merchant', choice: 'atk', value: WANDERING_MERCHANT_ATK_DURATION });
    } else if (pending.wanderingMerchantChoiceResolved === 'gamble') {
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
      // No choice yet — signal pending
      return { events, heroMutations, buffs, crossroadsUsed, wanderingMerchantChoicePending: true };
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

  // Mercenary Offer — C878: two-phase player choice
  if (pending.mercenaryOfferPending) {
    if (pending.mercenaryChoiceResolved === 'accept') {
      const goldCost = Math.floor(ctx.hero.gold * MERCENARY_OFFER_GOLD_COST_RATE);
      heroMutations.goldDelta = (heroMutations.goldDelta ?? 0) - goldCost;
      buffs.mercenaryShieldRemaining = MERCENARY_OFFER_DURATION;
      events.push({ type: 'event_mercenary_offer', choice: 'accept', goldPaid: goldCost, duration: MERCENARY_OFFER_DURATION });
    } else if (pending.mercenaryChoiceResolved === 'decline') {
      events.push({ type: 'event_mercenary_offer', choice: 'decline', goldPaid: 0, duration: 0 });
    } else {
      // No choice yet — signal pending
      return { events, heroMutations, buffs, crossroadsUsed, mercenaryChoicePending: true };
    }
  }

  // Crossroads — C878: two-phase player choice (3-way: ATK/EXP/Gold)
  if (pending.crossroadsPending) {
    if (pending.crossroadsChoiceResolved) {
      crossroadsUsed = true;
      const path = pending.crossroadsChoiceResolved;
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
    } else {
      // No choice yet — signal pending
      return { events, heroMutations, buffs, crossroadsUsed, crossroadsChoicePending: true };
    }
  }

  // C891: Delegate consequence events to ConsequenceResolver
  const consequenceResult = resolveConsequenceEvents(
    {
      hero: ctx.hero,
      totalFights: ctx.totalFights,
      rngChance: ctx.rngChance,
      reputationStyle: pending.reputationStyle ?? 'balanced',
      reputationTotalChoices: pending.reputationTotalChoices ?? 0,
    },
    {
      reputationFired: pending.reputationFired ?? false,
      veteransTrialFired: pending.veteransTrialFired ?? false,
    },
  );
  if (consequenceResult) {
    events.push(...consequenceResult.events);
    if (consequenceResult.heroMutations.hpDelta) {
      heroMutations.hpDelta = (heroMutations.hpDelta ?? 0) + consequenceResult.heroMutations.hpDelta;
    }
    if (consequenceResult.heroMutations.goldDelta) {
      heroMutations.goldDelta = (heroMutations.goldDelta ?? 0) + consequenceResult.heroMutations.goldDelta;
    }
    Object.assign(buffs, consequenceResult.buffs);
    return {
      events, heroMutations, buffs, crossroadsUsed,
      reputationFired: consequenceResult.reputationFired,
      veteransTrialFired: consequenceResult.veteransTrialFired,
    };
  }

  // C890: Last Stand Challenge — late-game player choice (fight 400-600)
  // Phase 1: trigger pending (no resolved choice yet)
  if (!pending.lastStandFired
    && !pending.lastStandChoiceResolved
    && ctx.totalFights >= LAST_STAND_MIN_FIGHT
    && ctx.totalFights <= LAST_STAND_MAX_FIGHT
    && ctx.rngChance(LAST_STAND_CHANCE)) {
    return { events, heroMutations, buffs, crossroadsUsed, lastStandChoicePending: true };
  }

  // Phase 2: resolve choice
  if (pending.lastStandChoiceResolved === 'accept') {
    buffs.lastStandAtkRemaining = LAST_STAND_ATK_DURATION;
    const hpCost = Math.floor(ctx.hero.hpMax * LAST_STAND_HP_COST);
    heroMutations.hpDelta = (heroMutations.hpDelta ?? 0) - hpCost;
    events.push({ type: 'event_last_stand', choice: 'accept', value: LAST_STAND_ATK_MUL });
    return { events, heroMutations, buffs, crossroadsUsed };
  }
  if (pending.lastStandChoiceResolved === 'decline') {
    const healAmt = Math.floor(ctx.hero.hpMax * LAST_STAND_DECLINE_HEAL_RATE);
    heroMutations.hpDelta = (heroMutations.hpDelta ?? 0) + healAmt;
    const goldGain = Math.floor(ctx.hero.level * LAST_STAND_DECLINE_GOLD_MUL);
    heroMutations.goldDelta = (heroMutations.goldDelta ?? 0) + goldGain;
    events.push({ type: 'event_last_stand', choice: 'decline', value: healAmt });
    return { events, heroMutations, buffs, crossroadsUsed };
  }

  return { events, heroMutations, buffs, crossroadsUsed };
}
