// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createInitialVillageSave } from '../../save';
import {
  advanceVillageAgentScheduler,
  getVillageAgentAssignmentAnalysis,
  getVillageAgentPlan,
  getVillageAgentPlanAnalysis,
  recordVillageAgentRelationship,
} from '../ai/agents';
import { getVillageAgentBelief, recordVillageAgentMemory } from '../ai/cognition';
import { getHeroDecisionAnalysis } from '../ai/decision';
import {
  compareVillageAIReplay,
  getVillageAIBehaviorDiversity,
  getVillageAIReplayFingerprint,
} from '../ai/evaluation';
import {
  runVillageAIScenario,
  Village_AI_EVALUATION_MAX_DAYS,
} from '../ai/scenario';
import {
  advanceVillageWorld,
  getPendingVillageWorldEvents,
  resolveVillageWorldEvent,
} from '../ai/events';
import {
  getVillageAgentAIState,
  getVillageAgentCognitionState,
  getVillageAIState,
  Village_WORLD_DAY_MS,
} from '../ai/state';
import { advanceHeroAutonomy, decideHeroAction } from '../hero/autonomy';

beforeAll(() => {
  vi.setSystemTime(new Date('2026-09-06T00:00:00.000Z'));
});

describe('Village human-like AI slice', () => {
  it('uses stable personality and memory inputs while preserving a readable forecast', () => {
    const cautious = createInitialVillageSave(201);
    const bold = createInitialVillageSave(202);
    const cautiousAI = getVillageAIState(cautious);
    const boldAI = getVillageAIState(bold);
    cautiousAI.hero.personality = { courage: 20, caution: 95, compassion: 60, curiosity: 25 };
    boldAI.hero.personality = { courage: 95, caution: 20, compassion: 25, curiosity: 95 };
    cautiousAI.hero.memories.push({
      id: 'memory-defeat', tag: 'defeat', summary: '지난 원정에서 패배했다.',
      valence: -0.8, salience: 1, createdAt: cautious.createdAt,
    });

    const cautiousDecision = getHeroDecisionAnalysis(cautious).selected;
    const boldDecision = getHeroDecisionAnalysis(bold).selected;

    expect(cautiousDecision.action).toBe('expedition');
    expect(boldDecision.action).toBe('expedition');
    expect(cautiousDecision.rationale).toContain('신목 들판');
    expect(cautiousDecision.confidence).toBeGreaterThanOrEqual(0.5);
    expect(cautiousDecision.score).not.toBe(boldDecision.score);
  });

  it('gives each support agent a deterministic goal, schedule, and duty assignment', () => {
    const initial = createInitialVillageSave(207);
    const now = initial.createdAt + Village_WORLD_DAY_MS;
    const first = advanceVillageWorld(initial, now).save;
    const replay = advanceVillageWorld(initial, now).save;

    for (const agentId of ['blacksmith', 'mudang', 'guide'] as const) {
      expect(first.meta.ai.agentBrains?.[agentId]).toEqual(replay.meta.ai.agentBrains?.[agentId]);
      const plan = getVillageAgentPlan(first, agentId);
      expect(plan.agentId).toBe(agentId);
      expect(plan.schedule.startTick).toBe(1);
      expect(plan.schedule.endTick).toBeGreaterThan(plan.schedule.startTick);
      expect(plan.rationale.length).toBeGreaterThan(0);
    }

    const assignment = getVillageAgentAssignmentAnalysis(first, 'expedition');
    expect(assignment.selected).toBe('guide');
    expect(assignment.candidates.find((candidate) => candidate.agentId === 'guide')?.available).toBe(true);
  });

  it('lets relationship tension change an agent plan and records it symmetrically', () => {
    const initial = createInitialVillageSave(208);
    const brains = initial.meta.ai.agentBrains;
    if (!brains) return;
    brains.blacksmith.relationships.mudang = -1;
    brains.blacksmith.relationships.guide = -1;
    brains.mudang.relationships.blacksmith = -1;
    brains.guide.relationships.blacksmith = -1;

    const before = getVillageAgentAIState(initial, 'blacksmith').relationships.mudang;
    recordVillageAgentRelationship(initial, 'blacksmith', 'mudang', 0.2);
    expect(getVillageAgentAIState(initial, 'blacksmith').relationships.mudang).toBeCloseTo(before + 0.2);
    expect(getVillageAgentAIState(initial, 'mudang').relationships.blacksmith).toBeCloseTo(before + 0.2);

    const plan = getVillageAgentPlanAnalysis(initial, 'blacksmith');
    expect(plan.selected.goal).toBe('bond');
    expect(plan.selected.reason).toBe('conflict');
  });

  it('keeps role-biased beliefs and a replayable multi-step plan per agent', () => {
    const initial = createInitialVillageSave(209);
    initial.meta.agents.find((agent) => agent.id === 'blacksmith')!.trust = 10;
    initial.meta.agents.find((agent) => agent.id === 'guide')!.trust = 90;
    const now = initial.createdAt + Village_WORLD_DAY_MS;
    const first = advanceVillageWorld(initial, now).save;
    const replay = advanceVillageWorld(initial, now).save;

    for (const agentId of ['blacksmith', 'mudang', 'guide'] as const) {
      const cognition = getVillageAgentCognitionState(first, agentId);
      expect(cognition).toEqual(getVillageAgentCognitionState(replay, agentId));
      expect(cognition.beliefs).toHaveLength(14);
      expect(cognition.plan?.steps.length).toBeGreaterThanOrEqual(2);
      expect(cognition.plan?.currentStep).toBeGreaterThanOrEqual(0);
    }

    const blacksmithTrust = getVillageAgentBelief(first, 'blacksmith', 'hero_trust', 'hero');
    const guideTrust = getVillageAgentBelief(first, 'guide', 'hero_trust', 'hero');
    expect(blacksmithTrust?.value).not.toBe(guideTrust?.value);
  });

  it('lets faction pressure change role beliefs, plan scores, and decision reasons', () => {
    const initial = createInitialVillageSave(214);
    const pressured = structuredClone(initial);
    const factions = pressured.meta.ai?.world.factions;
    if (!factions) return;
    factions.merchants.trust = 0.18;
    factions.merchants.tension = 0.96;
    factions.merchants.influence = 0.9;
    pressured.meta.ai!.world.chains = [{
      id: 'chain-pressure-test',
      kind: 'supply_social',
      factionId: 'merchants',
      step: 1,
      momentum: 0.8,
      nextDay: 2,
      pendingEventId: null,
      lastEventId: 'event-pressure-test',
    }];

    const before = getVillageAgentPlanAnalysis(initial, 'blacksmith');
    advanceVillageAgentScheduler(pressured, 1);
    const after = getVillageAgentPlanAnalysis(pressured, 'blacksmith');
    const beforeCraft = before.candidates.find((candidate) => candidate.goal === 'craft');
    const afterCraft = after.candidates.find((candidate) => candidate.goal === 'craft');
    const merchantTension = getVillageAgentBelief(pressured, 'blacksmith', 'faction_tension', 'merchants');

    expect(merchantTension?.value).toBeGreaterThan(0.5);
    expect(afterCraft?.score).toBeGreaterThan(beforeCraft?.score ?? 0);
    expect(afterCraft?.rationale).toContain('상단 세력');
    expect(afterCraft?.rationale).toContain('연쇄 압력');
    expect(afterCraft?.reason).toBe('world_pressure');
  });

  it('switches a pressured specialist into a deterministic crisis coordination mode', () => {
    const pressured = createInitialVillageSave(218);
    const factions = pressured.meta.ai?.world.factions;
    if (!factions) return;
    factions.merchants.trust = 0;
    factions.merchants.tension = 1;
    factions.merchants.influence = 1;
    pressured.meta.ai!.world.chains = [{
      id: 'chain-crisis-mode',
      kind: 'supply_social',
      factionId: 'merchants',
      step: 1,
      momentum: 0.9,
      nextDay: 1,
      pendingEventId: null,
      lastEventId: 'event-crisis-mode',
    }];

    advanceVillageAgentScheduler(pressured, 1);
    const plan = getVillageAgentPlan(pressured, 'blacksmith');

    expect(plan.goal).toBe('bond');
    expect(plan.mode).toBe('crisis');
    expect(plan.modeLabel).toBe('위기 조율');
    expect(plan.reason).toBe('world_pressure');
  });

  it('holds a crisis plan briefly and returns to specialty after pressure resolves', () => {
    const pressured = createInitialVillageSave(219);
    const factions = pressured.meta.ai?.world.factions;
    if (!factions) return;
    factions.merchants.trust = 0;
    factions.merchants.tension = 1;
    factions.merchants.influence = 1;
    pressured.meta.ai!.world.chains = [{
      id: 'chain-crisis-hysteresis',
      kind: 'supply_social',
      factionId: 'merchants',
      step: 1,
      momentum: 0.9,
      nextDay: 1,
      pendingEventId: null,
      lastEventId: 'event-crisis-hysteresis',
    }];

    advanceVillageAgentScheduler(pressured, 1);
    expect(pressured.meta.ai!.agentBrains!.blacksmith.goal).toBe('bond');

    const relieved = structuredClone(pressured);
    relieved.meta.ai!.world.factions!.merchants.trust = 1;
    relieved.meta.ai!.world.factions!.merchants.tension = 0;
    relieved.meta.ai!.world.factions!.merchants.influence = 0;
    relieved.meta.ai!.world.chains = [];

    advanceVillageAgentScheduler(relieved, 2);
    expect(relieved.meta.ai!.agentBrains!.blacksmith.goal).toBe('bond');
    advanceVillageAgentScheduler(relieved, 10);
    expect(relieved.meta.ai!.agentBrains!.blacksmith.goal).toBe('craft');
  });

  it('returns from crisis after resolved pressure even when each world tick creates an event', () => {
    const pressured = createInitialVillageSave(221);
    const factions = pressured.meta.ai?.world.factions;
    if (!factions) return;
    factions.merchants.trust = 0;
    factions.merchants.tension = 1;
    factions.merchants.influence = 1;
    pressured.meta.ai!.world.chains = [{
      id: 'chain-crisis-runtime',
      kind: 'supply_social',
      factionId: 'merchants',
      step: 1,
      momentum: 0.9,
      nextDay: 1,
      pendingEventId: null,
      lastEventId: 'event-crisis-runtime',
    }];

    let current = advanceVillageWorld(pressured, pressured.createdAt + Village_WORLD_DAY_MS).save;
    expect(current.meta.ai!.agentBrains!.blacksmith.goal).toBe('bond');
    while (getPendingVillageWorldEvents(current).length > 0) {
      const event = getPendingVillageWorldEvents(current)[0];
      if (!event) break;
      const resolved = resolveVillageWorldEvent(current, event.id, event.choices[0].id, current.updatedAt + 1);
      if (!resolved.ok) break;
      current = resolved.save;
    }

    current.meta.ai!.world.factions!.merchants.trust = 1;
    current.meta.ai!.world.factions!.merchants.tension = 0;
    current.meta.ai!.world.factions!.merchants.influence = 0;
    current.meta.ai!.world.chains = [];
    current.meta.ai!.agentBrains!.blacksmith.relationships = {
      blacksmith: 0,
      mudang: 0,
      guide: 0,
    };
    for (let day = 2; day <= 8; day += 1) {
      current = advanceVillageWorld(current, pressured.createdAt + Village_WORLD_DAY_MS * day).save;
      while (getPendingVillageWorldEvents(current).length > 0) {
        const event = getPendingVillageWorldEvents(current)[0];
        if (!event) break;
        const resolved = resolveVillageWorldEvent(current, event.id, event.choices[0].id, current.updatedAt + 1);
        if (!resolved.ok) break;
        current = resolved.save;
      }
    }

    expect(current.meta.ai!.agentBrains!.blacksmith.goal).toBe('craft');
  });

  it('withholds automatic expedition support while the guide is in crisis coordination', () => {
    const pressured = createInitialVillageSave(220);
    const factions = pressured.meta.ai?.world.factions;
    if (!factions) return;
    factions.village.trust = 0;
    factions.village.tension = 1;
    factions.village.influence = 1;
    pressured.meta.ai!.world.chains = [{
      id: 'chain-guide-crisis',
      kind: 'social_omen',
      factionId: 'village',
      step: 1,
      momentum: 0.9,
      nextDay: 1,
      pendingEventId: null,
      lastEventId: 'event-guide-crisis',
    }];

    advanceVillageAgentScheduler(pressured, 1);
    const assignment = getVillageAgentAssignmentAnalysis(pressured, 'expedition');

    expect(getVillageAgentPlan(pressured, 'guide').mode).toBe('crisis');
    expect(assignment.selected).toBeNull();
    expect(assignment.candidates.find((candidate) => candidate.agentId === 'guide')?.rationale)
      .toContain('위기 조율');
  });

  it('retains salient experience, advances plans, and counts event interruptions', () => {
    const initial = createInitialVillageSave(210);
    initial.meta.agents.find((agent) => agent.id === 'guide')!.fatigue = 88;
    recordVillageAgentMemory(
      initial,
      'guide',
      'failure',
      '지난 경로 판단이 원정을 위험하게 만들었다.',
      -0.9,
      1,
      initial.updatedAt,
    );

    const firstAnalysis = getVillageAgentPlanAnalysis(initial, 'guide');
    expect(firstAnalysis.selected.goal).toBe('recover');

    const first = advanceVillageWorld(initial, initial.createdAt + Village_WORLD_DAY_MS).save;
    const firstPlan = getVillageAgentCognitionState(first, 'guide').plan;
    expect(firstPlan).not.toBeNull();
    if (!firstPlan) return;

    const second = advanceVillageWorld(first, initial.createdAt + Village_WORLD_DAY_MS * 2).save;
    const secondPlan = getVillageAgentCognitionState(second, 'guide').plan;
    expect(secondPlan?.interruptionCount).toBeGreaterThan(firstPlan.interruptionCount);

    const replay = advanceVillageWorld(first, initial.createdAt + Village_WORLD_DAY_MS * 2).save;
    expect(getVillageAgentCognitionState(second, 'guide')).toEqual(getVillageAgentCognitionState(replay, 'guide'));
    advanceVillageAgentScheduler(second, 2);
    expect(getVillageAgentCognitionState(second, 'guide').memories.length).toBeGreaterThan(0);
  });

  it('generates one deterministic event when the in-game day advances', () => {
    const initial = createInitialVillageSave(203);
    const now = initial.createdAt + Village_WORLD_DAY_MS;
    const first = advanceVillageWorld(initial, now);
    const replay = advanceVillageWorld(initial, now);

    expect(first.generatedEvents).toHaveLength(1);
    expect(first.generatedEvents[0]).toEqual(replay.generatedEvents[0]);
    expect(first.save.meta.ai?.world.day).toBe(1);
    expect(first.save.meta.ai?.pendingEvents).toHaveLength(1);
    expect(first.save.meta.simulation).toMatchObject({ seed: 203, tick: 1, lastSimulatedAt: now, eventHistory: [] });
    expect(first.save.updatedAt).toBe(now);
  });

  it('expires an unanswered event into memory instead of blocking the village forever', () => {
    const initial = createInitialVillageSave(206);
    const advanced = advanceVillageWorld(initial, initial.createdAt + Village_WORLD_DAY_MS).save;
    const event = getPendingVillageWorldEvents(advanced)[0];
    expect(event).toBeDefined();
    if (!event) return;

    const lateChoice = resolveVillageWorldEvent(
      advanced,
      event.id,
      event.choices[0].id,
      event.expiresAt + 1,
    );
    expect(lateChoice.ok).toBe(false);
    expect(lateChoice.save).toBe(advanced);

    const pruned = advanceVillageWorld(advanced, event.expiresAt + 1).save;
    expect(pruned.meta.ai?.pendingEvents.some((candidate) => candidate.id === event.id)).toBe(false);
    expect(pruned.meta.ai?.resolvedEventIds).toContain(event.id);
    expect(pruned.meta.ai?.hero.memories[0]?.summary).toContain('기한을 놓쳤다');
    expect(pruned.meta.simulation.eventHistory[0]).toMatchObject({
      eventId: event.id,
      outcome: 'expired',
      choiceId: null,
    });
  });

  it('pauses autonomous action until a world event is resolved', () => {
    const initial = createInitialVillageSave(204);
    const advanced = advanceVillageWorld(initial, initial.createdAt + Village_WORLD_DAY_MS).save;
    expect(decideHeroAction(advanced).reason).toBe('world_event');
    expect(advanceHeroAutonomy(advanced, advanced.updatedAt + 15_000).started).toBe(false);

    const event = getPendingVillageWorldEvents(advanced)[0];
    expect(event).toBeDefined();
    if (!event) return;
    const resolved = resolveVillageWorldEvent(advanced, event.id, event.choices[0].id, advanced.updatedAt + 1);

    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.save.meta.ai?.pendingEvents).toEqual([]);
    expect(resolved.save.meta.ai?.resolvedEventIds).toContain(event.id);
    expect(resolved.save.meta.ai?.hero.memories[0]?.tag).toBe('event');
    expect(resolved.save.meta.sagaEntries[0]?.title).toBe(event.title);
    expect(resolved.save.meta.simulation.eventHistory[0]).toMatchObject({
      eventId: event.id,
      outcome: 'chosen',
      choiceId: event.choices[0].id,
    });
  });

  it('fails closed when an event choice would spend unavailable currency', () => {
    const initial = createInitialVillageSave(205);
    initial.meta.currencies.materials = 0;
    const advanced = advanceVillageWorld(initial, initial.createdAt + Village_WORLD_DAY_MS).save;
    const event = getPendingVillageWorldEvents(advanced)[0];
    expect(event).toBeDefined();
    if (!event) return;
    const trade = event.choices.find((choice) => choice.id === 'trade-supplies');
    if (!trade) return;

    const result = resolveVillageWorldEvent(advanced, event.id, trade.id, advanced.updatedAt + 1);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(advanced);
    expect(advanced.meta.ai?.pendingEvents).toHaveLength(1);
  });

  it('continues a resolved event as a deterministic causal chain and updates faction state', () => {
    const initial = createInitialVillageSave(211);
    const first = advanceVillageWorld(initial, initial.createdAt + Village_WORLD_DAY_MS).save;
    const event = getPendingVillageWorldEvents(first)[0];
    expect(event?.chainStep).toBe(0);
    expect(event?.chainId).toBeTruthy();
    if (!event) return;

    const resolved = resolveVillageWorldEvent(first, event.id, event.choices[event.choices.length - 1].id, first.updatedAt + 1);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.save.meta.ai?.world.chains).toHaveLength(1);
    expect(resolved.save.meta.ai?.world.chains?.[0]).toMatchObject({
      id: event.chainId,
      step: 0,
      pendingEventId: null,
      lastEventId: event.id,
    });
    expect(resolved.save.meta.simulation.eventHistory[0]).toMatchObject({
      chainId: event.chainId,
      chainStep: 0,
      factionId: event.factionId,
    });

    const continuation = advanceVillageWorld(
      resolved.save,
      initial.createdAt + Village_WORLD_DAY_MS * 3,
    );
    const followup = continuation.generatedEvents.find((candidate) => candidate.chainId === event.chainId);
    expect(followup?.chainStep).toBe(1);
    expect(followup?.parentEventId).toBe(event.id);
    expect(continuation.save.meta.ai?.world.chains?.[0]?.pendingEventId).toBe(followup?.id);
    expect(continuation.generatedEvents).toEqual(
      advanceVillageWorld(resolved.save, initial.createdAt + Village_WORLD_DAY_MS * 3).generatedEvents,
    );
    if (!followup || !followup.factionId) return;

    const beforeTrust = continuation.save.meta.ai?.world.factions?.[followup.factionId]?.trust;
    const followupResult = resolveVillageWorldEvent(
      continuation.save,
      followup.id,
      followup.choices[0].id,
      continuation.save.updatedAt + 1,
    );
    expect(followupResult.ok).toBe(true);
    if (!followupResult.ok) return;
    expect(followupResult.save.meta.ai?.world.factions?.[followup.factionId]?.trust).not.toBe(beforeTrust);
    expect(followupResult.save.meta.ai?.world.chains?.[0]).toMatchObject({
      step: 1,
      pendingEventId: null,
      lastEventId: followup.id,
    });
  });

  it('keeps an expired chain alive with slower momentum and bounded world state', () => {
    const initial = createInitialVillageSave(212);
    const first = advanceVillageWorld(initial, initial.createdAt + Village_WORLD_DAY_MS).save;
    const event = getPendingVillageWorldEvents(first)[0];
    expect(event).toBeDefined();
    if (!event) return;

    const expired = advanceVillageWorld(first, event.expiresAt + 1).save;
    const chain = expired.meta.ai?.world.chains?.find((candidate) => candidate.id === event.chainId);
    expect(chain).toMatchObject({ step: 0, lastEventId: event.id });
    expect(chain?.nextDay).toBeGreaterThan(event.day + 1);
    const followup = getPendingVillageWorldEvents(expired).find((candidate) => candidate.chainId === event.chainId);
    expect(followup).toMatchObject({ chainStep: 1, parentEventId: event.id });

    const later = advanceVillageWorld(expired, initial.createdAt + Village_WORLD_DAY_MS * 4);
    expect(later.save.meta.ai?.resolvedEventIds).toContain(event.id);
    expect(later.save.meta.ai?.world.chains?.length).toBeLessThanOrEqual(3);
  });

  it('records bounded AI decisions and audits replay without wall-clock noise', () => {
    const initial = createInitialVillageSave(213);
    const now = initial.createdAt + Village_WORLD_DAY_MS;
    const first = advanceVillageWorld(initial, now).save;
    const replay = advanceVillageWorld(initial, now).save;

    expect(first.meta.simulation.decisionHistory).toHaveLength(3);
    expect(getVillageAIReplayFingerprint(first)).toBe(getVillageAIReplayFingerprint(replay));
    expect(compareVillageAIReplay(first, replay)).toMatchObject({ matches: true, differences: [] });
    const clockShifted = structuredClone(first);
    clockShifted.updatedAt += 5_000;
    clockShifted.meta.simulation.lastSimulatedAt += 5_000;
    clockShifted.meta.ai!.pendingEvents = clockShifted.meta.ai!.pendingEvents.map((candidate) => ({
      ...candidate,
      createdAt: candidate.createdAt + 5_000,
      expiresAt: candidate.expiresAt + 5_000,
    }));
    expect(compareVillageAIReplay(first, clockShifted).matches).toBe(true);
    const diversity = getVillageAIBehaviorDiversity(first);
    expect(diversity.decisionCount).toBe(3);
    expect(diversity.distinctAgentGoals).toBeGreaterThan(0);
    expect(diversity.diversityScore).toBeGreaterThanOrEqual(0);
    expect(diversity.diversityScore).toBeLessThanOrEqual(1);

    const changed = structuredClone(first);
    changed.meta.ai!.world.prosperity += 1;
    const mismatch = compareVillageAIReplay(first, changed);
    expect(mismatch.matches).toBe(false);
    expect(mismatch.differences).toContain('world');
  });

  it('runs a deterministic bounded scenario and exposes long-run behavior metrics', () => {
    const initial = createInitialVillageSave(215);
    const first = runVillageAIScenario(initial, { days: 7, choicePolicy: 'balanced' });
    const replay = runVillageAIScenario(initial, { days: 7, choicePolicy: 'balanced' });

    expect(first.daysSimulated).toBe(7);
    expect(first.seed).toBe(215);
    expect(first.generatedEventCount).toBeGreaterThan(0);
    expect(first.chosenEventCount).toBe(first.generatedEventCount);
    expect(first.decisionCount).toBeGreaterThanOrEqual(21);
    expect(first.serializedSize).toBeGreaterThan(0);
    expect(first.replayFingerprint).toBe(replay.replayFingerprint);
    expect(compareVillageAIReplay(first.save, replay.save)).toMatchObject({
      matches: true,
      differences: [],
    });
    expect(first.behaviorDiversity.diversityScore).toBeGreaterThanOrEqual(0);
    expect(first.behaviorDiversity.diversityScore).toBeLessThanOrEqual(1);
  });

  it('caps the evaluation horizon at 30 days', () => {
    const result = runVillageAIScenario(createInitialVillageSave(216), { days: 999 });

    expect(result.daysSimulated).toBe(Village_AI_EVALUATION_MAX_DAYS);
    expect(result.decisionCount).toBeGreaterThanOrEqual(Village_AI_EVALUATION_MAX_DAYS * 3);
    expect(result.serializedSize).toBeGreaterThan(0);
  });

  it('counts crisis mode entries and goal switches in a sustained faction crisis', () => {
    const pressured = createInitialVillageSave(217);
    const factions = pressured.meta.ai?.world.factions;
    if (!factions) return;
    factions.merchants.trust = 0;
    factions.merchants.tension = 1;
    factions.merchants.influence = 1;

    const result = runVillageAIScenario(pressured, { days: 7, choicePolicy: 'first' });

    expect(result.pressureDecisionCount).toBeGreaterThan(0);
    expect(result.agentGoalSwitchCount).toBeGreaterThan(0);
    expect(result.crisisModeDecisionCount).toBeGreaterThan(0);
  });
});
