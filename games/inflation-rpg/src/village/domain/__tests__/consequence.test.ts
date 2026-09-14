import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createInitialVillageSave } from '../../save';
import {
  advanceVillageWorld,
  getPendingVillageWorldEvents,
  resolveVillageWorldEvent,
} from '../ai/events';
import {
  getVillageConsequenceExpeditionModifier,
  getVillageConsequenceFacilityModifier,
  getVillageConsequenceProfile,
} from '../ai/consequence';
import {
  createVillageConsequenceEchoEvent,
  isVillageConsequenceEchoKind,
  VILLAGE_CONSEQUENCE_ECHO_DEFINITIONS,
} from '../ai/consequenceContent';
import { getVillageAgentPlan } from '../ai/agents';
import { runVillageAIScenario } from '../ai/scenario';
import {
  getVillageAIState,
  getVillageSimulationState,
  Village_WORLD_DAY_MS,
} from '../ai/state';
import { getFacilityTaskPreview } from '../facility/preview';
import { getExpeditionForecast, getExpeditionSuccessChance } from '../expedition/forecast';
import { VILLAGE_CONSEQUENCE_ECHO_KINDS } from '../../types';
import type { VillageSaveEnvelope, VillageWorldEvent } from '../../types';

beforeAll(() => {
  vi.setSystemTime(new Date('2026-09-06T00:00:00.000Z'));
});

function pressuredSave(seed: number): VillageSaveEnvelope {
  const save = createInitialVillageSave(seed);
  const world = getVillageAIState(save).world;
  world.prosperity = 0;
  for (const faction of Object.values(world.factions ?? {})) {
    faction.trust = 0;
    faction.influence = 1;
    faction.tension = 1;
  }
  return save;
}

function findAndResolveEcho(save: VillageSaveEnvelope, choiceIndex = 0): {
  save: VillageSaveEnvelope;
  event: VillageWorldEvent;
} | null {
  for (let day = 1; day <= 20; day += 1) {
    const advanced = advanceVillageWorld(save, save.createdAt + day * Village_WORLD_DAY_MS);
    let next = advanced.save;
    const pending = getPendingVillageWorldEvents(next);
    const echo = pending.find((event) => isVillageConsequenceEchoKind(event.chainKind));
    if (echo) return { save: next, event: echo };
    for (const event of pending) {
      const choice = event.choices[choiceIndex] ?? event.choices[0];
      if (!choice) continue;
      const resolved = resolveVillageWorldEvent(next, event.id, choice.id, next.updatedAt + 1);
      if (resolved.ok) next = resolved.save;
    }
    Object.assign(save, next);
  }
  return null;
}

describe('Village consequence aftermath', () => {
  it('derives bounded pressure that changes facility work, expedition forecast, and agent planning', () => {
    const baseline = createInitialVillageSave(901);
    const pressured = pressuredSave(902);
    const profile = getVillageConsequenceProfile(pressured);
    const facilityModifier = getVillageConsequenceFacilityModifier(pressured, 'blacksmith');
    const expeditionModifier = getVillageConsequenceExpeditionModifier(pressured, 'underworld');
    const baselineTask = getFacilityTaskPreview(baseline, 'blacksmith', null);
    const pressuredTask = getFacilityTaskPreview(pressured, 'blacksmith', null);
    for (const save of [baseline, pressured]) {
      save.run.hero.atk = 10_000;
      save.run.hero.def = 10_000;
      save.run.hero.defBase = 10_000;
      save.run.hero.hp = 10_000;
      save.run.hero.hpMax = 10_000;
    }
    const baselineChance = getExpeditionSuccessChance(baseline, 'underworld', 2, null);
    const pressuredChance = getExpeditionSuccessChance(pressured, 'underworld', 2, null);
    const plan = getVillageAgentPlan(pressured, 'blacksmith');

    expect(profile.dominantAxis).toBe('supply');
    expect(profile.dominantLevel).toBe('critical');
    expect(facilityModifier.intensity).toBeGreaterThan(0);
    expect(facilityModifier.durationMultiplier).toBeLessThanOrEqual(1.05);
    expect(facilityModifier.outputMultiplier).toBeGreaterThanOrEqual(0.95);
    expect(pressuredTask.durationSeconds).toBeGreaterThan(baselineTask.durationSeconds);
    expect(pressuredTask.output.materials ?? 0).toBeLessThan(baselineTask.output.materials ?? 0);
    expect(expeditionModifier.successChanceDelta).toBeGreaterThanOrEqual(-0.06);
    expect(expeditionModifier.successChanceDelta).toBeLessThanOrEqual(0);
    expect(pressuredChance).toBeLessThan(baselineChance);
    expect(getExpeditionForecast(pressured, 'underworld', 2, null).successChance).toBe(pressuredChance);
    expect(plan.rationale).toContain('후폭풍');
  });

  it('keeps the stable profile identical to the existing baseline economy', () => {
    const save = createInitialVillageSave(903);
    const profile = getVillageConsequenceProfile(save);
    const modifier = getVillageConsequenceFacilityModifier(save, 'blacksmith');
    const task = getFacilityTaskPreview(save, 'blacksmith', null);

    expect(profile.dominantLevel).toBe('stable');
    expect(modifier.durationMultiplier).toBe(1);
    expect(modifier.outputMultiplier).toBe(1);
    expect(task.durationSeconds).toBe(45);
    expect(task.output.materials).toBe(2);
  });

  it('exposes all three one-act echo definitions with bounded choices', () => {
    const save = pressuredSave(904);
    for (const kind of VILLAGE_CONSEQUENCE_ECHO_KINDS) {
      const event = createVillageConsequenceEchoEvent(save, 10, save.createdAt + 10, kind, 'source-event');
      expect(event).not.toBeNull();
      expect(event).toMatchObject({
        chainKind: kind,
        chainStep: 0,
        parentEventId: 'source-event',
        factionId: VILLAGE_CONSEQUENCE_ECHO_DEFINITIONS[kind].factionId,
      });
      expect(event?.choices).toHaveLength(2);
      expect(new Set(event?.choices.map((choice) => choice.id)).size).toBe(2);
    }
  });

  it('delays and resolves an echo from a previously resolved event without leaving a chain', () => {
    const found = findAndResolveEcho(pressuredSave(905), 0);
    expect(found).not.toBeNull();
    if (!found) return;

    expect(isVillageConsequenceEchoKind(found.event.chainKind)).toBe(true);
    expect(found.event.parentEventId).toBeTruthy();
    expect(found.event.chainStep).toBe(0);
    expect(found.event.choices).toHaveLength(2);

    const choice = found.event.choices[0];
    const resolved = resolveVillageWorldEvent(found.save, found.event.id, choice.id, found.save.updatedAt + 1);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    expect(getVillageAIState(resolved.save).pendingEvents.some((event) => event.id === found.event.id)).toBe(false);
    expect(getVillageAIState(resolved.save).world.chains?.some((chain) => chain.id === found.event.chainId)).toBe(false);
    expect(getVillageSimulationState(resolved.save).eventHistory).toContainEqual(expect.objectContaining({
      eventId: found.event.id,
      chainKind: found.event.chainKind,
      chainStep: 0,
      outcome: 'chosen',
      parentEventId: found.event.parentEventId,
    }));
  });

  it('surfaces consequence content in a bounded long-run replay', () => {
    const result = runVillageAIScenario(pressuredSave(906), { days: 45, choicePolicy: 'last' });
    const echoes = result.save.meta.simulation.eventHistory.filter((record) => isVillageConsequenceEchoKind(record.chainKind));

    expect(echoes.length).toBeGreaterThan(0);
    expect(new Set(echoes.map((record) => record.eventId)).size).toBe(echoes.length);
    expect(result.maxPendingEventCount).toBeLessThanOrEqual(3);
    expect(result.serializedSize).toBeLessThan(100_000);
  }, 30_000);
});
