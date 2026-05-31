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
  FIRST_TRIAL_MIN_FIGHTS,
  FIRST_TRIAL_MAX_FIGHTS,
  FIRST_TRIAL_CHANCE,
  FIRST_TRIAL_HEAL_RATE,
  FIRST_TRIAL_ATK_MUL,
  FIRST_TRIAL_ATK_DURATION,
  FIRST_TRIAL_EXP_MUL,
  FIRST_TRIAL_EXP_DURATION,
  WANDERING_SAGE_MIN_FIGHTS,
  WANDERING_SAGE_MAX_FIGHTS,
  WANDERING_SAGE_CHANCE,
  WANDERING_SAGE_EXP_MUL,
  WANDERING_SAGE_EXP_DURATION,
  WANDERING_SAGE_ATK_MUL,
  WANDERING_SAGE_ATK_DURATION,
  WANDERING_SAGE_ATK_HEAL_RATE,
  ELDERS_JUDGMENT_MIN_FIGHT,
  ELDERS_JUDGMENT_MAX_FIGHT,
  ELDERS_JUDGMENT_MIN_CHOICES,
  ELDERS_JUDGMENT_CHANCE,
  ELDERS_JUDGMENT_AGG_ATK_MUL,
  ELDERS_JUDGMENT_AGG_DURATION,
  ELDERS_JUDGMENT_DEF_SHIELD_DR,
  ELDERS_JUDGMENT_DEF_DURATION,
  ELDERS_JUDGMENT_BAL_EXP_MUL,
  ELDERS_JUDGMENT_BAL_DURATION,
  ELDERS_JUDGMENT_DIVERSIFY_ATK,
  ELDERS_JUDGMENT_DIVERSIFY_EXP,
  ELDERS_JUDGMENT_DIVERSIFY_HEAL,
  ELDERS_JUDGMENT_DIVERSIFY_DURATION,
  STAT_SHARD_ATK_FLAT,
  STAT_SHARD_CHANCE,
  ENEMY_MORPH_DURATION,
  ENEMY_MORPH_DR_RATE,
  ENEMY_MORPH_CHANCE,
  VETERANS_CHALLENGE_MIN_FIGHT,
  VETERANS_CHALLENGE_MAX_FIGHT,
  VETERANS_CHALLENGE_CHANCE,
  VETERANS_CHALLENGE_EXP_MUL,
  VETERANS_CHALLENGE_DURATION,
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
  finalReckoningFired?: boolean; // C896: already triggered this run
  lastStandChoiceResolved?: 'accept' | 'decline'; // C890: player's choice
  lastStandFired?: boolean; // C890: already triggered this run
  firstTrialFired?: boolean; // C905: already triggered this run
  firstTrialChoiceResolved?: 'heal' | 'atk' | 'exp'; // C920: 3-way player choice
  wanderingSagePending?: boolean; // C921: sage encounter active
  wanderingSageChoiceResolved?: 'exp' | 'atk'; // C921: player's choice
  eldersJudgmentFired?: boolean; // C926: already triggered this run
  eldersJudgmentPending?: boolean; // C926: pending player choice
  eldersJudgmentChoiceResolved?: 'double_down' | 'diversify'; // C926
  veteransChallengeChoiceResolved?: 'accept' | 'decline'; // C959: player's choice
  veteransChallengeFired?: boolean; // C959: already triggered this run
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
    finalReckoningAtkRemaining?: number; // C896
    finalReckoningShieldRemaining?: number; // C896
    finalReckoningExpRemaining?: number; // C896
    greedyGoldRemaining?: number; // C902
    firstTrialAtkRemaining?: number; // C905
    firstTrialExpRemaining?: number; // C920: EXP rush duration
    wanderingSageExpRemaining?: number; // C921
    wanderingSageAtkRemaining?: number; // C921
    eldersJudgmentAtkRemaining?: number; // C926
    eldersJudgmentShieldRemaining?: number; // C926
    eldersJudgmentExpRemaining?: number; // C926
    lastStandAtkRemaining?: number; // C890
    veteransChallengeExpRemaining?: number; // C959
    veteransChallengeAtkRemaining?: number; // C959
  };
  statShardAtk?: number; // C938: permanent ATK shard (flat bonus)
  enemyMorphDuration?: number; // C939: enemy morph duration (fights)
  enemyMorphDrRate?: number; // C939: enemy morph damage reduction rate
  greedyGoldMul?: number; // C902: greedy gold gain multiplier
  crossroadsUsed?: boolean;
  provingPending?: boolean; // C875: true = player choice needed, pause game loop
  mercenaryChoicePending?: boolean; // C878: true = player choice needed
  crossroadsChoicePending?: boolean; // C878: true = player choice needed
  wanderingMerchantChoicePending?: boolean; // C881: true = player choice needed
  wanderingSageChoicePending?: boolean; // C921: true = player choice needed
  eldersJudgmentChoicePending?: boolean; // C926: true = player choice needed
  eldersJudgmentFired?: boolean; // C926: true = elder's judgment triggered
  veteransChallengePending?: boolean; // C959: true = player choice needed
  lastStandChoicePending?: boolean; // C890: true = player choice needed
  reputationFired?: boolean; // C883: true = reputation payoff event triggered
  veteransTrialFired?: boolean; // C887: true = veteran's trial event triggered
  finalReckoningFired?: boolean; // C896: true = final reckoning event triggered
  firstTrialFired?: boolean; // C905: true = first trial event triggered
  firstTrialChoicePending?: boolean; // C911: true = player choice needed
}

export function resolveMidGameEvents(
  ctx: MidGameContext,
  pending: MidGamePending,
): MidGameResult {
  // C966: Event evaluation order (earlier = higher priority, early-returns block later events):
  // 1. Wandering Merchant (pending-gated)
  // 2. Sparring Grounds (pending-gated)
  // 3. Proving Grounds (fight 20-110, rng)
  // 4. Mercenary Offer (pending-gated)
  // 5. Crossroads (pending-gated)
  // 6. First Trial (fight 10-40, rng, one-shot)
  // 7. Reputation Consequence (fight 160+, choices≥3, one-shot)
  // 8. Veteran's Trial (via consequence, choices≥5, one-shot)
  // 9. Elder's Judgment (fight 300+, choices≥6, one-shot)
  // 10. Last Stand (fight 400-600, rng, one-shot)
  // 11. Wandering Sage (fight 260-450, rng, repeatable)
  // 12. Veteran's Challenge (fight 200-400, rng, one-shot)
  // 13. Stat Shard / Enemy Morph (endgame, rng)
  const events: OverworldEvent[] = [];
  const heroMutations: MidGameResult['heroMutations'] = {};
  const buffs: MidGameResult['buffs'] = {};
  let crossroadsUsed = false;
  let statShardAtk: number | undefined;
  let enemyMorphDuration: number | undefined;
  let enemyMorphDrRate: number | undefined;

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
      // C939: Enemy Morph — 30% chance to weaken enemies on sparring win
      const morphGranted = ctx.rngChance(ENEMY_MORPH_CHANCE);
      if (morphGranted) {
        enemyMorphDuration = ENEMY_MORPH_DURATION;
        enemyMorphDrRate = ENEMY_MORPH_DR_RATE;
      }
      events.push({ type: 'event_sparring_grounds', won: true, expGained, hpLost: 0, morphGranted });
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
        // C938: Stat Shard — 40% chance of permanent ATK bonus on win
        const shardGranted = ctx.rngChance(STAT_SHARD_CHANCE);
        if (shardGranted) {
          statShardAtk = STAT_SHARD_ATK_FLAT;
        }
        events.push({ type: 'event_proving_grounds', won: true, expMul: PROVING_GROUNDS_REWARD_EXP_MUL, hpCost: 0, shardGranted });
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

  // C911: First Trial — earliest player choice (fight 10-40, once per run, 2-phase pending)
  if (!pending.firstTrialFired
    && ctx.totalFights >= FIRST_TRIAL_MIN_FIGHTS
    && ctx.totalFights <= FIRST_TRIAL_MAX_FIGHTS
    && ctx.rngChance(FIRST_TRIAL_CHANCE)) {
    if (!pending.firstTrialChoiceResolved) {
      // Phase 1: trigger pending — UI will show choice modal
      return { events, heroMutations, buffs, crossroadsUsed, firstTrialChoicePending: true };
    }
    // Phase 2: resolve player choice
    if (pending.firstTrialChoiceResolved === 'heal') {
      const healAmt = Math.floor(ctx.hero.hpMax * FIRST_TRIAL_HEAL_RATE);
      heroMutations.hpDelta = (heroMutations.hpDelta ?? 0) + healAmt;
      events.push({ type: 'event_first_trial', style: 'heal', value: healAmt } as OverworldEvent);
    } else if (pending.firstTrialChoiceResolved === 'exp') {
      buffs.firstTrialExpRemaining = FIRST_TRIAL_EXP_DURATION;
      events.push({ type: 'event_first_trial', style: 'exp', value: FIRST_TRIAL_EXP_MUL } as OverworldEvent);
    } else {
      buffs.firstTrialAtkRemaining = FIRST_TRIAL_ATK_DURATION;
      events.push({ type: 'event_first_trial', style: 'atk', value: FIRST_TRIAL_ATK_MUL } as OverworldEvent);
    }
    return { events, heroMutations, buffs, crossroadsUsed, firstTrialFired: true };
  }

  // C891: Delegate consequence events to ConsequenceResolver
  const consequenceResult = resolveConsequenceEvents(
    {
      hero: ctx.hero,
      totalFights: ctx.totalFights,
      rngChance: ctx.rngChance,
      rngFloat: ctx.rngFloat,
      reputationStyle: pending.reputationStyle ?? 'balanced',
      reputationTotalChoices: pending.reputationTotalChoices ?? 0,
    },
    {
      reputationFired: pending.reputationFired ?? false,
      veteransTrialFired: pending.veteransTrialFired ?? false,
      finalReckoningFired: pending.finalReckoningFired ?? false,
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
      finalReckoningFired: consequenceResult.finalReckoningFired,
      greedyGoldMul: consequenceResult.greedyGoldMul,
    };
  }

  // C926: Elder's Judgment — consequence player choice (fight 300-500, once, 6+ choices)
  if (pending.eldersJudgmentPending) {
    const style = pending.reputationStyle ?? 'balanced';
    if (pending.eldersJudgmentChoiceResolved === 'double_down') {
      if (style === 'aggressive') {
        buffs.eldersJudgmentAtkRemaining = ELDERS_JUDGMENT_AGG_DURATION;
        events.push({ type: 'event_elders_judgment', choice: 'double_down', style, value: ELDERS_JUDGMENT_AGG_ATK_MUL } as OverworldEvent);
      } else if (style === 'defensive') {
        buffs.eldersJudgmentShieldRemaining = ELDERS_JUDGMENT_DEF_DURATION;
        events.push({ type: 'event_elders_judgment', choice: 'double_down', style, value: ELDERS_JUDGMENT_DEF_SHIELD_DR } as OverworldEvent);
      } else {
        buffs.eldersJudgmentExpRemaining = ELDERS_JUDGMENT_BAL_DURATION;
        events.push({ type: 'event_elders_judgment', choice: 'double_down', style, value: ELDERS_JUDGMENT_BAL_EXP_MUL } as OverworldEvent);
      }
      return { events, heroMutations, buffs, crossroadsUsed, eldersJudgmentFired: true };
    } else if (pending.eldersJudgmentChoiceResolved === 'diversify') {
      buffs.eldersJudgmentAtkRemaining = ELDERS_JUDGMENT_DIVERSIFY_DURATION;
      buffs.eldersJudgmentExpRemaining = ELDERS_JUDGMENT_DIVERSIFY_DURATION;
      const healAmt = Math.floor(ctx.hero.hpMax * ELDERS_JUDGMENT_DIVERSIFY_HEAL);
      heroMutations.hpDelta = (heroMutations.hpDelta ?? 0) + healAmt;
      events.push({ type: 'event_elders_judgment', choice: 'diversify', style, value: ELDERS_JUDGMENT_DIVERSIFY_ATK } as OverworldEvent);
      return { events, heroMutations, buffs, crossroadsUsed, eldersJudgmentFired: true };
    } else {
      return { events, heroMutations, buffs, crossroadsUsed, eldersJudgmentChoicePending: true };
    }
  } else if (!pending.eldersJudgmentFired
    && ctx.totalFights >= ELDERS_JUDGMENT_MIN_FIGHT
    && ctx.totalFights <= ELDERS_JUDGMENT_MAX_FIGHT
    && (pending.reputationTotalChoices ?? 0) >= ELDERS_JUDGMENT_MIN_CHOICES
    && ctx.rngChance(ELDERS_JUDGMENT_CHANCE)) {
    return { events, heroMutations, buffs, crossroadsUsed, eldersJudgmentChoicePending: true };
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

  // C921: Wandering Sage — mid-late repeatable (fight 260-450, 4%, 2-way choice)
  // Placed after consequences to avoid blocking auto-resolve events
  if (pending.wanderingSagePending) {
    if (pending.wanderingSageChoiceResolved === 'exp') {
      buffs.wanderingSageExpRemaining = WANDERING_SAGE_EXP_DURATION;
      events.push({ type: 'event_wandering_sage', style: 'exp', value: WANDERING_SAGE_EXP_MUL } as OverworldEvent);
    } else if (pending.wanderingSageChoiceResolved === 'atk') {
      buffs.wanderingSageAtkRemaining = WANDERING_SAGE_ATK_DURATION;
      const healAmt = Math.floor(ctx.hero.hpMax * WANDERING_SAGE_ATK_HEAL_RATE);
      heroMutations.hpDelta = (heroMutations.hpDelta ?? 0) + healAmt;
      events.push({ type: 'event_wandering_sage', style: 'atk', value: WANDERING_SAGE_ATK_MUL } as OverworldEvent);
    } else {
      return { events, heroMutations, buffs, crossroadsUsed, wanderingSageChoicePending: true };
    }
  } else if (ctx.totalFights >= WANDERING_SAGE_MIN_FIGHTS
    && ctx.totalFights <= WANDERING_SAGE_MAX_FIGHTS
    && ctx.rngChance(WANDERING_SAGE_CHANCE)) {
    return { events, heroMutations, buffs, crossroadsUsed, wanderingSageChoicePending: true };
  }

  // C959: Veteran's Challenge — mid-game risk/reward decision (200-400, one-shot)
  if (pending.veteransChallengeChoiceResolved === 'accept') {
    buffs.veteransChallengeExpRemaining = VETERANS_CHALLENGE_DURATION;
    buffs.veteransChallengeAtkRemaining = VETERANS_CHALLENGE_DURATION;
    events.push({ type: 'event_veterans_challenge', accepted: true, duration: VETERANS_CHALLENGE_DURATION });
  } else if (pending.veteransChallengeChoiceResolved === 'decline') {
    events.push({ type: 'event_veterans_challenge', accepted: false, duration: 0 });
  } else if (!pending.veteransChallengeFired
    && ctx.totalFights >= VETERANS_CHALLENGE_MIN_FIGHT
    && ctx.totalFights <= VETERANS_CHALLENGE_MAX_FIGHT
    && ctx.rngChance(VETERANS_CHALLENGE_CHANCE)) {
    return { events, heroMutations, buffs, crossroadsUsed, veteransChallengePending: true };
  }

  return { events, heroMutations, buffs, crossroadsUsed, statShardAtk, enemyMorphDuration, enemyMorphDrRate };
}
