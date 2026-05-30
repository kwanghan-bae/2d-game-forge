/**
 * C754: EventGateConfig — defines phase-gated event availability.
 * Late-game exclusive events only appear after totalFights threshold.
 */
import { LATE_GAME_DENSITY_THRESHOLD, LATE_GAME_DENSITY_MUL } from './constants';

export interface EventGateDef {
  id: string;
  minTotalFights: number;
  chance: number;
  weatherCondition?: string; // C770: only trigger when current weather matches
  description: string;
}

export const MID_GAME_EVENTS: readonly EventGateDef[] = [
  {
    id: 'event_trial_grounds',
    minTotalFights: 90,
    chance: 0.020, // C785: reduced from 0.025 to balance vs weather events
    description: 'Trial Grounds — enemies ×1.10 level, EXP×1.50 for next 3 fights',
  },
  {
    id: 'event_rain_sanctuary',
    minTotalFights: 95,
    chance: 0.04, // C785: doubled from 0.02 (weather-gating already limits effective rate)
    weatherCondition: 'rain',
    description: 'Rain Sanctuary — heal 20% HP, gold×0.7 for 3 fights (rain only)',
  },
  {
    id: 'event_fog_ambush',
    minTotalFights: 100,
    chance: 0.04, // C785: doubled
    weatherCondition: 'fog',
    description: 'Fog Ambush — enemy ATK×1.2, EXP×1.3 for 2 fights (fog only)',
  },
  {
    id: 'event_storm_nexus',
    minTotalFights: 110,
    chance: 0.04, // C785: doubled
    weatherCondition: 'storm',
    description: 'Storm Nexus — ATK×1.4 + HP drain 5%/fight, 4 fights (storm only)',
  },
  {
    id: 'event_wind_gale',
    minTotalFights: 95,
    chance: 0.04, // C785: doubled
    weatherCondition: 'wind',
    description: 'Wind Gale — EXP×1.20 + dodge +10%, gold×0.60, 3 fights (wind only)',
  },
  {
    id: 'event_snow_drift',
    minTotalFights: 100,
    chance: 0.04, // C785: doubled
    weatherCondition: 'snow',
    description: 'Snow Drift — enemy dmg×0.85, hero ATK×0.92, 3 fights (snow only)',
  },
];

export const LATE_GAME_EVENTS: readonly EventGateDef[] = [
  {
    id: 'event_ancient_colosseum',
    minTotalFights: 130,
    chance: 0.02,
    description: 'Ancient Colosseum — double XP for next 5 fights but enemies hit 30% harder',
  },
  {
    id: 'event_void_rift',
    minTotalFights: 200,
    chance: 0.015,
    description: 'Void Rift — teleport to random higher-tier area, gain relic shard',
  },
  {
    id: 'event_temporal_fissure',
    minTotalFights: 170,
    chance: 0.02,
    description: 'Temporal Fissure — store 50% EXP for 5 fights, pay back ×2.0 at end (lost on death)',
  },
  {
    id: 'event_abyssal_convergence',
    minTotalFights: 250,
    chance: 0.025,
    description: 'Abyssal Convergence — EXP×1.70, enemy ATK×1.60, 3% HP drain, gold×0.5, 5 fights',
  },
  {
    id: 'event_titan_arena',
    minTotalFights: 300,
    chance: 0.02,
    description: 'Titan Arena — enemy HP×1.5, ATK×1.2, EXP×2.0 for 4 fights',
  },
  {
    id: 'event_crimson_tithe',
    minTotalFights: 325,
    chance: 0.025,
    description: 'Crimson Tithe — sacrifice 25% HP for EXP×1.8 + lifesteal 8% for 6 fights',
  },
  {
    id: 'event_gold_crucible',
    minTotalFights: 350,
    chance: 0.02,
    description: 'Gold Crucible — burn 30% gold for ATK boost (12% of burned gold) for 12 fights',
  },
  {
    id: 'event_astral_paradox',
    minTotalFights: 400,
    chance: 0.025,
    description: 'Astral Paradox — EXP×2.5 but enemy ATK×2.0 for 5 fights',
  },
  {
    id: 'event_soul_forge',
    minTotalFights: 500,
    chance: 0.02,
    description: 'Soul Forge — sacrifice 15 combo for permanent +8% EXP stack (max 5)',
  },
];

/**
 * Returns mid-game events available at given totalFights and weather.
 * Events with weatherCondition only appear when current weather matches.
 */
export function getAvailableMidEvents(totalFights: number, currentWeather?: string): readonly EventGateDef[] {
  return MID_GAME_EVENTS.filter(e =>
    totalFights >= e.minTotalFights &&
    (!e.weatherCondition || e.weatherCondition === currentWeather)
  );
}

/**
 * Returns late-game events available at given totalFights.
 */
export function getAvailableLateEvents(totalFights: number): readonly EventGateDef[] {
  return LATE_GAME_EVENTS.filter(e => totalFights >= e.minTotalFights);
}

/**
 * C790: Late-game density ramp (was step function in C789).
 * Linear ramp from fight 150 (×1.0) to fight 350 (×2.0), capped at ×2.0.
 */
export function getLateGameDensityMul(totalFights: number): number {
  if (totalFights <= 150) return 1.0;
  // C808: extended ramp — phase 1: 150-350 (→×2.0), phase 2: 350-550 (→×3.5)
  if (totalFights <= 350) return 1.0 + (totalFights - 150) / 200; // →2.0 at 350
  return Math.min(3.5, 2.0 + (totalFights - 350) / 133); // →3.5 at ~550
}
