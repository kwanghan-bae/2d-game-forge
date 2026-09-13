import { Village_HERO_AUTONOMY_DELAY_MS } from '../../types';
import type {
  HeroAction,
  HeroAutonomyDecision,
  HeroAutonomyReason,
  HeroAutonomyResult,
  VillageSaveEnvelope,
} from '../../types';
import { getHeroDecisionAnalysis } from '../ai/decision';
import { getVillageAIState, recordVillageAIDecision } from '../ai/state';
import { startExpedition } from '../expedition/commands';
import { getNextRealmId } from '../expedition/forecast';
import { startFacilityTask } from '../facility/tasks';
import { advanceHeroActionsInPlace } from '../shared/heroActionClock';
import { cloneSave, touchSave } from '../shared/saveMutation';

/** Advances the Village hero's action clock without mutating the source save. */
export function advanceHeroActions(source: VillageSaveEnvelope, actions: number, now: number): VillageSaveEnvelope {
  const amount = Math.floor(actions);
  if (!Number.isFinite(actions) || amount <= 0) return source;
  const save = cloneSave(source);
  advanceHeroActionsInPlace(save, amount, now);
  touchSave(save, now);
  return save;
}

/**
 * Exposes the same next-action decision used by the hero runtime to the hub.
 * It is a read-only forecast; starting a task or expedition remains an
 * explicit player action and therefore cannot be triggered by rendering.
 */
export function getHeroNextAction(source: VillageSaveEnvelope): HeroAction {
  if (source.run.expedition) return 'expedition';
  if (Object.values(source.meta.tasks).some((task) => task.facilityId === 'training')) return 'train';
  if (getVillageAIState(source).pendingEvents.length > 0) return 'rest';
  return getHeroDecisionAnalysis(source).selected.action;
}

function blockedAutonomyDecision(reason: HeroAutonomyReason): HeroAutonomyDecision {
  return {
    action: 'rest',
    facilityId: null,
    realmId: null,
    assignedAgentId: null,
    reason,
  };
}

/** Selects the one action the autonomous hero may start after the grace period. */
export function decideHeroAction(source: VillageSaveEnvelope): HeroAutonomyDecision {
  if (source.run.expedition) {
    return blockedAutonomyDecision('active_expedition');
  }
  if (source.run.lastExpeditionResult) {
    const nextRealm = source.run.lastExpeditionResult.outcome === 'victory'
      ? getNextRealmId(source.run.lastExpeditionResult.realmId)
      : null;
    return blockedAutonomyDecision(nextRealm && !source.meta.unlockedRealms.includes(nextRealm)
      ? 'realm_confirmation'
      : 'result_confirmation');
  }
  if (Object.keys(source.meta.tasks).length > 0) {
    return blockedAutonomyDecision('active_work');
  }
  if (getVillageAIState(source).pendingEvents.length > 0) {
    return blockedAutonomyDecision('world_event');
  }
  return getHeroDecisionAnalysis(source).selected;
}

/**
 * Starts at most one real task or expedition. Every other state is a no-op so
 * an unattended refresh cannot acknowledge results, unlock realms, or spend
 * more than one preparation cost.
 */
export function advanceHeroAutonomy(source: VillageSaveEnvelope, now: number): HeroAutonomyResult {
  if (!Number.isFinite(now) || now < source.updatedAt) {
    return {
      save: source,
      decision: blockedAutonomyDecision('invalid_clock'),
      started: false,
    };
  }
  if (now - source.updatedAt < Village_HERO_AUTONOMY_DELAY_MS) {
    return {
      save: source,
      decision: blockedAutonomyDecision('intervention_window'),
      started: false,
    };
  }

  const decision = decideHeroAction(source);
  if (decision.facilityId) {
    const result = startFacilityTask(source, decision.facilityId, now, decision.assignedAgentId);
    if (result.ok) {
      recordVillageAIDecision(result.save, decision, now, decision.confidence);
      touchSave(result.save, now);
      return { save: result.save, decision, started: true };
    }
    return {
      save: source,
      decision: { ...decision, reason: result.error.includes('부족') ? 'insufficient_resources' : decision.reason },
      started: false,
      error: result.error,
    };
  }
  if (decision.realmId) {
    const result = startExpedition(source, decision.realmId, now, source.run.policy, decision.assignedAgentId);
    if (result.ok) {
      recordVillageAIDecision(result.save, decision, now, decision.confidence);
      touchSave(result.save, now);
      return { save: result.save, decision, started: true };
    }
    return {
      save: source,
      decision: { ...decision, reason: result.error.includes('부족') ? 'insufficient_resources' : decision.reason },
      started: false,
      error: result.error,
    };
  }
  return { save: source, decision, started: false };
}
