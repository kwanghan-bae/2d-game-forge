// C815: Event Chain Links — sequential event triggers between related events
import type { EventId } from './EventOrchestrator';

export interface ChainLink {
  next: EventId;
  prob: number; // probability of chain firing (0-1)
}

/**
 * Maps event IDs to potential follow-up events.
 * When an event resolves (accepted), roll for chain trigger.
 * Chain events get priority in the next post-combat event resolution.
 */
export const EVENT_CHAIN_CONFIG: Partial<Record<EventId, ChainLink[]>> = {
  // Trial → Colosseum (training leads to arena)
  trial_grounds: [{ next: 'colosseum', prob: 0.20 }],
  // Storm → Abyssal (storm opens dimensional rift)
  storm_nexus: [{ next: 'abyssal_convergence', prob: 0.15 }],
  // Colosseum → Titan Arena (arena champion invited to titan fight)
  colosseum: [{ next: 'titan_arena', prob: 0.15 }],
  // Crimson Tithe → Soul Forge (blood sacrifice attracts forge spirits)
  crimson_tithe: [{ next: 'soul_forge', prob: 0.12 }],
  // Fog Ambush → Temporal Fissure (fog reveals time distortion)
  fog_ambush: [{ next: 'temporal_fissure', prob: 0.15 }],
};

/**
 * Roll for a chain event after an event resolves.
 * Returns the next event ID to trigger, or null if no chain fires.
 */
export function rollChainEvent(
  completedEvent: EventId,
  rngChance: (rate: number) => boolean,
): EventId | null {
  const chains = EVENT_CHAIN_CONFIG[completedEvent];
  if (!chains) return null;
  for (const link of chains) {
    if (rngChance(link.prob)) return link.next;
  }
  return null;
}
