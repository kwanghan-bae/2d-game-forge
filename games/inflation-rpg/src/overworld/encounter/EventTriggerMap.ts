// C810: Data-driven event trigger dispatch — replaces 15 individual if-checks
import type { EventId } from './EventOrchestrator';
import type { PostCombatResult } from './PostCombatEventResolver';

/**
 * Maps PostCombatResult boolean fields to EventOrchestrator event IDs.
 * Adding a new event: add one entry here + the field in PostCombatResult.
 */
export const EVENT_PENDING_TRIGGER_MAP: ReadonlyArray<
  [keyof PostCombatResult, EventId]
> = [
  ['colosseumPending', 'colosseum'],
  ['trialGroundsPending', 'trial_grounds'],
  ['stormNexusPending', 'storm_nexus'],
  ['rainSanctuaryPending', 'rain_sanctuary'],
  ['fogAmbushPending', 'fog_ambush'],
  ['windGalePending', 'wind_gale'],
  ['snowDriftPending', 'snow_drift'],
  ['clearSkyPathPending', 'clear_sky_path'],
  ['abyssalConvergencePending', 'abyssal_convergence'],
  ['temporalFissurePending', 'temporal_fissure'],
  ['titanArenaPending', 'titan_arena'],
  ['crimsonTithePending', 'crimson_tithe'],
  ['goldCruciblePending', 'gold_crucible'],
  ['astralParadoxPending', 'astral_paradox'],
  ['soulForgePending', 'soul_forge'],
  ['voidRiftTriggered', 'void_rift'],
];

/**
 * Dispatch all pending event triggers from a PostCombatResult.
 * Returns the set of triggered event IDs (for testing/debugging).
 */
export function dispatchPendingTriggers(
  result: PostCombatResult,
  trigger: (id: EventId) => void,
): EventId[] {
  const triggered: EventId[] = [];
  for (const [key, eventId] of EVENT_PENDING_TRIGGER_MAP) {
    if (result[key]) {
      trigger(eventId);
      triggered.push(eventId);
    }
  }
  return triggered;
}
