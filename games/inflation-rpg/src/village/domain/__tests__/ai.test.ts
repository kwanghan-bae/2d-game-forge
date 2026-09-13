// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createInitialVillageSave } from '../../save';
import {
  getVillageAgentAssignmentAnalysis,
  getVillageAgentPlan,
  getVillageAgentPlanAnalysis,
  recordVillageAgentRelationship,
} from '../ai/agents';
import { getHeroDecisionAnalysis } from '../ai/decision';
import {
  advanceVillageWorld,
  getPendingVillageWorldEvents,
  resolveVillageWorldEvent,
} from '../ai/events';
import {
  getVillageAgentAIState,
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
});
