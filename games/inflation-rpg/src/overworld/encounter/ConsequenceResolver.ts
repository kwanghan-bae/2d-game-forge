/**
 * C891: Pure resolver for consequence events (auto-resolve, style-based).
 * Extracted from MidGameEventResolver to reduce complexity.
 * Consequence events differ from player choices: they fire automatically
 * based on the player's accumulated choice history style.
 */
import type { OverworldEvent } from '../OverworldEvents';
import {
  REPUTATION_MIN_FIGHT,
  REPUTATION_MAX_FIGHT,
  REPUTATION_CHANCE,
  REPUTATION_MIN_CHOICES,
  REPUTATION_AGG_ATK_MUL,
  REPUTATION_AGG_DURATION,
  REPUTATION_DEF_HEAL_RATE,
  REPUTATION_DEF_SHIELD_DURATION,
  REPUTATION_GREEDY_GOLD_MUL,
  REPUTATION_BALANCED_EXP_DURATION,
  REPUTATION_BALANCED_EXP_MUL,
  VETERANS_TRIAL_MIN_FIGHT,
  VETERANS_TRIAL_MAX_FIGHT,
  VETERANS_TRIAL_CHANCE,
  VETERANS_TRIAL_MIN_CHOICES,
  VETERANS_TRIAL_AGG_ATK_MUL,
  VETERANS_TRIAL_AGG_DURATION,
  VETERANS_TRIAL_AGG_HP_COST,
  VETERANS_TRIAL_DEF_SHIELD_DURATION,
  VETERANS_TRIAL_DEF_HEAL_RATE,
  VETERANS_TRIAL_GREEDY_GOLD_MUL,
  VETERANS_TRIAL_BALANCED_ALL_DURATION,
  VETERANS_TRIAL_BALANCED_ATK_MUL,
  VETERANS_TRIAL_BALANCED_EXP_MUL,
  FINAL_RECKONING_MIN_FIGHT,
  FINAL_RECKONING_MAX_FIGHT,
  FINAL_RECKONING_CHANCE,
  FINAL_RECKONING_MIN_CHOICES,
  FINAL_RECKONING_AGG_ATK_MUL,
  FINAL_RECKONING_AGG_DURATION,
  FINAL_RECKONING_AGG_HP_COST,
  FINAL_RECKONING_DEF_SHIELD_DURATION,
  FINAL_RECKONING_DEF_HEAL_RATE,
  FINAL_RECKONING_GREEDY_GOLD_MUL,
  FINAL_RECKONING_BALANCED_ALL_DURATION,
  FINAL_RECKONING_BALANCED_ATK_MUL,
  FINAL_RECKONING_BALANCED_EXP_MUL,
} from './constants-events';

export interface ConsequenceContext {
  hero: { hp: number; hpMax: number; gold: number; level: number };
  totalFights: number;
  rngChance: (rate: number) => boolean;
  rngFloat: () => number; // C899: 0-1 for consequence variance
  reputationStyle: 'aggressive' | 'defensive' | 'greedy' | 'balanced';
  reputationTotalChoices: number;
}

export interface ConsequenceState {
  reputationFired: boolean;
  veteransTrialFired: boolean;
  finalReckoningFired: boolean;
}

export interface ConsequenceResult {
  events: OverworldEvent[];
  heroMutations: { hpDelta?: number; goldDelta?: number };
  buffs: {
    reputationAtkRemaining?: number;
    reputationShieldRemaining?: number;
    reputationExpRemaining?: number;
    veteransTrialAtkRemaining?: number;
    veteransTrialShieldRemaining?: number;
    veteransTrialExpRemaining?: number;
    finalReckoningAtkRemaining?: number;
    finalReckoningShieldRemaining?: number;
    finalReckoningExpRemaining?: number;
  };
  reputationFired?: boolean;
  veteransTrialFired?: boolean;
  finalReckoningFired?: boolean;
}

// C899: ±20% variance on consequence durations/amounts for replay variety
function applyVariance(base: number, roll: number): number {
  const mul = 0.8 + roll * 0.4; // 0.8 to 1.2
  return Math.max(1, Math.round(base * mul));
}

/** Resolve reputation + veteran's trial consequence events. Returns null if nothing fired. */
export function resolveConsequenceEvents(
  ctx: ConsequenceContext,
  state: ConsequenceState,
): ConsequenceResult | null {
  // Reputation Payoff
  if (!state.reputationFired
    && ctx.totalFights >= REPUTATION_MIN_FIGHT
    && ctx.totalFights <= REPUTATION_MAX_FIGHT
    && ctx.reputationTotalChoices >= REPUTATION_MIN_CHOICES
    && ctx.rngChance(REPUTATION_CHANCE)) {
    return resolveReputation(ctx);
  }

  // Veteran's Trial
  if (!state.veteransTrialFired
    && ctx.totalFights >= VETERANS_TRIAL_MIN_FIGHT
    && ctx.totalFights <= VETERANS_TRIAL_MAX_FIGHT
    && ctx.reputationTotalChoices >= VETERANS_TRIAL_MIN_CHOICES
    && ctx.rngChance(VETERANS_TRIAL_CHANCE)) {
    return resolveVeteransTrial(ctx);
  }

  // C896: Final Reckoning — ultra-late consequence (fight 500-600)
  if (!state.finalReckoningFired
    && ctx.totalFights >= FINAL_RECKONING_MIN_FIGHT
    && ctx.totalFights <= FINAL_RECKONING_MAX_FIGHT
    && ctx.reputationTotalChoices >= FINAL_RECKONING_MIN_CHOICES
    && ctx.rngChance(FINAL_RECKONING_CHANCE)) {
    return resolveFinalReckoning(ctx);
  }

  return null;
}

function resolveReputation(ctx: ConsequenceContext): ConsequenceResult {
  const events: OverworldEvent[] = [];
  const heroMutations: { hpDelta?: number; goldDelta?: number } = {};
  const buffs: ConsequenceResult['buffs'] = {};
  const style = ctx.reputationStyle;
  const v = ctx.rngFloat(); // C899: variance roll

  if (style === 'aggressive') {
    buffs.reputationAtkRemaining = applyVariance(REPUTATION_AGG_DURATION, v);
    events.push({ type: 'event_reputation', style, value: REPUTATION_AGG_ATK_MUL });
  } else if (style === 'defensive') {
    const healAmt = applyVariance(Math.floor(ctx.hero.hpMax * REPUTATION_DEF_HEAL_RATE), v);
    heroMutations.hpDelta = healAmt;
    buffs.reputationShieldRemaining = applyVariance(REPUTATION_DEF_SHIELD_DURATION, v);
    events.push({ type: 'event_reputation', style, value: healAmt });
  } else if (style === 'greedy') {
    const goldBurst = applyVariance(Math.floor(ctx.hero.level * REPUTATION_GREEDY_GOLD_MUL), v);
    heroMutations.goldDelta = goldBurst;
    events.push({ type: 'event_reputation', style, value: goldBurst });
  } else {
    buffs.reputationExpRemaining = applyVariance(REPUTATION_BALANCED_EXP_DURATION, v);
    events.push({ type: 'event_reputation', style: 'balanced', value: REPUTATION_BALANCED_EXP_MUL });
  }

  return { events, heroMutations, buffs, reputationFired: true };
}

function resolveVeteransTrial(ctx: ConsequenceContext): ConsequenceResult {
  const events: OverworldEvent[] = [];
  const heroMutations: { hpDelta?: number; goldDelta?: number } = {};
  const buffs: ConsequenceResult['buffs'] = {};
  const style = ctx.reputationStyle;
  const v = ctx.rngFloat(); // C899: variance roll

  if (style === 'aggressive') {
    buffs.veteransTrialAtkRemaining = applyVariance(VETERANS_TRIAL_AGG_DURATION, v);
    const hpCost = applyVariance(Math.floor(ctx.hero.hpMax * VETERANS_TRIAL_AGG_HP_COST), v);
    heroMutations.hpDelta = -hpCost;
    events.push({ type: 'event_veterans_trial', style, value: VETERANS_TRIAL_AGG_ATK_MUL });
  } else if (style === 'defensive') {
    buffs.veteransTrialShieldRemaining = applyVariance(VETERANS_TRIAL_DEF_SHIELD_DURATION, v);
    const healAmt = applyVariance(Math.floor(ctx.hero.hpMax * VETERANS_TRIAL_DEF_HEAL_RATE), v);
    heroMutations.hpDelta = healAmt;
    events.push({ type: 'event_veterans_trial', style, value: healAmt });
  } else if (style === 'greedy') {
    const goldBurst = applyVariance(Math.floor(ctx.hero.level * VETERANS_TRIAL_GREEDY_GOLD_MUL), v);
    heroMutations.goldDelta = goldBurst;
    events.push({ type: 'event_veterans_trial', style, value: goldBurst });
  } else {
    const dur = applyVariance(VETERANS_TRIAL_BALANCED_ALL_DURATION, v);
    buffs.veteransTrialAtkRemaining = dur;
    buffs.veteransTrialExpRemaining = dur;
    events.push({ type: 'event_veterans_trial', style: 'balanced', value: VETERANS_TRIAL_BALANCED_ATK_MUL });
  }

  return { events, heroMutations, buffs, veteransTrialFired: true };
}

function resolveFinalReckoning(ctx: ConsequenceContext): ConsequenceResult {
  const events: OverworldEvent[] = [];
  const heroMutations: { hpDelta?: number; goldDelta?: number } = {};
  const buffs: ConsequenceResult['buffs'] = {};
  const style = ctx.reputationStyle;
  const v = ctx.rngFloat(); // C899: variance roll

  if (style === 'aggressive') {
    buffs.finalReckoningAtkRemaining = applyVariance(FINAL_RECKONING_AGG_DURATION, v);
    const hpCost = applyVariance(Math.floor(ctx.hero.hpMax * FINAL_RECKONING_AGG_HP_COST), v);
    heroMutations.hpDelta = -hpCost;
    events.push({ type: 'event_final_reckoning', style, value: FINAL_RECKONING_AGG_ATK_MUL } as OverworldEvent);
  } else if (style === 'defensive') {
    buffs.finalReckoningShieldRemaining = applyVariance(FINAL_RECKONING_DEF_SHIELD_DURATION, v);
    const healAmt = applyVariance(Math.floor(ctx.hero.hpMax * FINAL_RECKONING_DEF_HEAL_RATE), v);
    heroMutations.hpDelta = healAmt;
    events.push({ type: 'event_final_reckoning', style, value: healAmt } as OverworldEvent);
  } else if (style === 'greedy') {
    const goldBurst = applyVariance(Math.floor(ctx.hero.level * FINAL_RECKONING_GREEDY_GOLD_MUL), v);
    heroMutations.goldDelta = goldBurst;
    events.push({ type: 'event_final_reckoning', style, value: goldBurst } as OverworldEvent);
  } else {
    const dur = applyVariance(FINAL_RECKONING_BALANCED_ALL_DURATION, v);
    buffs.finalReckoningAtkRemaining = dur;
    buffs.finalReckoningExpRemaining = dur;
    events.push({ type: 'event_final_reckoning', style: 'balanced', value: FINAL_RECKONING_BALANCED_ATK_MUL } as OverworldEvent);
  }

  return { events, heroMutations, buffs, finalReckoningFired: true };
}
