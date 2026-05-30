// C815: Event Chain Links — sequential event triggers between related events
import type { EventId } from './EventOrchestrator';

export interface ChainLink {
  next: EventId;
  prob: number; // probability of chain firing (0-1)
  flavor: string; // C821: narrative text shown to player on chain trigger
}

export interface ChainResult {
  next: EventId;
  flavor: string;
}

/**
 * Maps event IDs to potential follow-up events.
 * When an event resolves (accepted), roll for chain trigger.
 * Chain events get priority in the next post-combat event resolution.
 */
export const EVENT_CHAIN_CONFIG: Partial<Record<EventId, ChainLink[]>> = {
  trial_grounds: [{ next: 'colosseum', prob: 0.20, flavor: '시련을 마쳤다. 투기장이 부른다.' }],
  storm_nexus: [{ next: 'abyssal_convergence', prob: 0.15, flavor: '폭풍이 차원의 균열을 드러낸다.' }],
  colosseum: [{ next: 'titan_arena', prob: 0.15, flavor: '투기장의 왕좌가 거인의 영역으로 이끈다.' }],
  crimson_tithe: [{ next: 'soul_forge', prob: 0.12, flavor: '흘린 피가 영혼의 용광로를 깨운다.' }],
  fog_ambush: [{ next: 'temporal_fissure', prob: 0.15, flavor: '안개 속에서 시간의 틈이 열린다.' }],
};

/**
 * Roll for a chain event after an event resolves.
 * Returns chain result with flavor text, or null if no chain fires.
 */
export function rollChainEvent(
  completedEvent: EventId,
  rngChance: (rate: number) => boolean,
): ChainResult | null {
  const chains = EVENT_CHAIN_CONFIG[completedEvent];
  if (!chains) return null;
  for (const link of chains) {
    if (rngChance(link.prob)) return { next: link.next, flavor: link.flavor };
  }
  return null;
}
