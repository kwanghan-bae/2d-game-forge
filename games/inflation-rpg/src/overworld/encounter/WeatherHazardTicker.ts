import type { OverworldEvent } from '../OverworldEvents';
import {
  STORM_NEXUS_HP_DRAIN_RATE,
  STORM_DRAIN_WARN_HP_THRESHOLD,
  ABYSSAL_CONVERGENCE_HP_DRAIN_RATE,
  TEMPORAL_FISSURE_PAYBACK_MUL,
} from './constants-events';

export interface WeatherState {
  stormNexusRemaining: number;
  abyssalConvergenceRemaining: number;
  temporalFissureRemaining: number;
  temporalFissureStoredExp: number;
  goldCrucibleRemaining: number;
  goldCrucibleAtkFlat: number;
}

export interface WeatherHeroView {
  hp: number;
  hpMax: number;
  gainExp(amount: number): void;
}

export interface WeatherTickResult {
  stormNexusRemaining: number;
  abyssalConvergenceRemaining: number;
  temporalFissureRemaining: number;
  temporalFissureStoredExp: number;
  goldCrucibleRemaining: number;
  goldCrucibleAtkFlat: number;
}

/**
 * Pure-ish weather hazard tick: drains HP, pays back temporal exp, resets gold crucible.
 * Mutates hero.hp and calls hero.gainExp; returns updated weather state.
 */
export function tickWeatherHazards(
  state: WeatherState,
  hero: WeatherHeroView,
  events: OverworldEvent[],
): WeatherTickResult {
  let { stormNexusRemaining, abyssalConvergenceRemaining, temporalFissureRemaining,
    temporalFissureStoredExp, goldCrucibleRemaining, goldCrucibleAtkFlat } = state;

  if (stormNexusRemaining > 0) {
    const drainAmount = Math.floor(hero.hpMax * STORM_NEXUS_HP_DRAIN_RATE);
    hero.hp -= drainAmount;
    if (hero.hp < 1) hero.hp = 1;
    const hpRatio = hero.hp / hero.hpMax;
    const isCritical = hpRatio < STORM_DRAIN_WARN_HP_THRESHOLD;
    if (isCritical) {
      events.push({ type: 'storm_drain_critical', value: drainAmount, hpAfter: hero.hp });
    } else {
      events.push({ type: 'storm_drain', value: drainAmount, hpAfter: hero.hp });
    }
    stormNexusRemaining--;
  }

  if (abyssalConvergenceRemaining > 0) {
    hero.hp -= Math.floor(hero.hpMax * ABYSSAL_CONVERGENCE_HP_DRAIN_RATE);
    if (hero.hp < 1) hero.hp = 1;
    abyssalConvergenceRemaining--;
  }

  if (temporalFissureRemaining > 0) {
    temporalFissureRemaining--;
    if (temporalFissureRemaining === 0 && temporalFissureStoredExp > 0) {
      hero.gainExp(Math.floor(temporalFissureStoredExp * TEMPORAL_FISSURE_PAYBACK_MUL));
      temporalFissureStoredExp = 0;
    }
  }

  if (goldCrucibleRemaining > 0) {
    goldCrucibleRemaining--;
    if (goldCrucibleRemaining === 0) goldCrucibleAtkFlat = 0;
  }

  return { stormNexusRemaining, abyssalConvergenceRemaining, temporalFissureRemaining,
    temporalFissureStoredExp, goldCrucibleRemaining, goldCrucibleAtkFlat };
}
