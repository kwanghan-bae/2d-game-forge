/**
 * C754: EventGateConfig — defines phase-gated event availability.
 * Late-game exclusive events only appear after totalFights threshold.
 */

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
    chance: 0.025,
    description: 'Trial Grounds — enemies ×1.10 level, EXP×1.50 for next 3 fights',
  },
  {
    id: 'event_storm_nexus',
    minTotalFights: 110,
    chance: 0.02,
    weatherCondition: 'storm',
    description: 'Storm Nexus — ATK×1.4 + HP drain 5%/fight, 4 fights (storm only)',
  },
];

export const LATE_GAME_EVENTS: readonly EventGateDef[] = [
  {
    id: 'event_ancient_colosseum',
    minTotalFights: 150,
    chance: 0.02,
    description: 'Ancient Colosseum — double XP for next 5 fights but enemies hit 30% harder',
  },
  {
    id: 'event_void_rift',
    minTotalFights: 200,
    chance: 0.015,
    description: 'Void Rift — teleport to random higher-tier area, gain relic shard',
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
