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
} from './constants-events';

export interface ConsequenceContext {
  hero: { hp: number; hpMax: number; gold: number; level: number };
  totalFights: number;
  rngChance: (rate: number) => boolean;
  reputationStyle: 'aggressive' | 'defensive' | 'greedy' | 'balanced';
  reputationTotalChoices: number;
}

export interface ConsequenceState {
  reputationFired: boolean;
  veteransTrialFired: boolean;
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
  };
  reputationFired?: boolean;
  veteransTrialFired?: boolean;
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

  return null;
}

function resolveReputation(ctx: ConsequenceContext): ConsequenceResult {
  const events: OverworldEvent[] = [];
  const heroMutations: { hpDelta?: number; goldDelta?: number } = {};
  const buffs: ConsequenceResult['buffs'] = {};
  const style = ctx.reputationStyle;

  if (style === 'aggressive') {
    buffs.reputationAtkRemaining = REPUTATION_AGG_DURATION;
    events.push({ type: 'event_reputation', style, value: REPUTATION_AGG_ATK_MUL });
  } else if (style === 'defensive') {
    const healAmt = Math.floor(ctx.hero.hpMax * REPUTATION_DEF_HEAL_RATE);
    heroMutations.hpDelta = healAmt;
    buffs.reputationShieldRemaining = REPUTATION_DEF_SHIELD_DURATION;
    events.push({ type: 'event_reputation', style, value: healAmt });
  } else if (style === 'greedy') {
    const goldBurst = Math.floor(ctx.hero.level * REPUTATION_GREEDY_GOLD_MUL);
    heroMutations.goldDelta = goldBurst;
    events.push({ type: 'event_reputation', style, value: goldBurst });
  } else {
    buffs.reputationExpRemaining = REPUTATION_BALANCED_EXP_DURATION;
    events.push({ type: 'event_reputation', style: 'balanced', value: REPUTATION_BALANCED_EXP_MUL });
  }

  return { events, heroMutations, buffs, reputationFired: true };
}

function resolveVeteransTrial(ctx: ConsequenceContext): ConsequenceResult {
  const events: OverworldEvent[] = [];
  const heroMutations: { hpDelta?: number; goldDelta?: number } = {};
  const buffs: ConsequenceResult['buffs'] = {};
  const style = ctx.reputationStyle;

  if (style === 'aggressive') {
    buffs.veteransTrialAtkRemaining = VETERANS_TRIAL_AGG_DURATION;
    const hpCost = Math.floor(ctx.hero.hpMax * VETERANS_TRIAL_AGG_HP_COST);
    heroMutations.hpDelta = -hpCost;
    events.push({ type: 'event_veterans_trial', style, value: VETERANS_TRIAL_AGG_ATK_MUL });
  } else if (style === 'defensive') {
    buffs.veteransTrialShieldRemaining = VETERANS_TRIAL_DEF_SHIELD_DURATION;
    const healAmt = Math.floor(ctx.hero.hpMax * VETERANS_TRIAL_DEF_HEAL_RATE);
    heroMutations.hpDelta = healAmt;
    events.push({ type: 'event_veterans_trial', style, value: healAmt });
  } else if (style === 'greedy') {
    const goldBurst = Math.floor(ctx.hero.level * VETERANS_TRIAL_GREEDY_GOLD_MUL);
    heroMutations.goldDelta = goldBurst;
    events.push({ type: 'event_veterans_trial', style, value: goldBurst });
  } else {
    buffs.veteransTrialAtkRemaining = VETERANS_TRIAL_BALANCED_ALL_DURATION;
    buffs.veteransTrialExpRemaining = VETERANS_TRIAL_BALANCED_ALL_DURATION;
    events.push({ type: 'event_veterans_trial', style: 'balanced', value: VETERANS_TRIAL_BALANCED_ATK_MUL });
  }

  return { events, heroMutations, buffs, veteransTrialFired: true };
}
