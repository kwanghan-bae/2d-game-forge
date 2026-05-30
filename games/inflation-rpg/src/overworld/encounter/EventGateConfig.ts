/**
 * C754: EventGateConfig — defines phase-gated event availability.
 * Late-game exclusive events only appear after totalFights threshold.
 */

export interface EventGateDef {
  id: string;
  minTotalFights: number;
  chance: number;
  description: string;
}

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
 * Returns late-game events available at given totalFights.
 */
export function getAvailableLateEvents(totalFights: number): readonly EventGateDef[] {
  return LATE_GAME_EVENTS.filter(e => totalFights >= e.minTotalFights);
}
