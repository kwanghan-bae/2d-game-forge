import {
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createInitialVillageSave } from '../../save';
import { getFacilityTaskPreview } from '../facility/preview';
import {
  cancelFacilityTask,
  restAgent,
  startFacilityTask,
} from '../facility/tasks';
import { getFacilityUpgradeCost, upgradeFacility } from '../facility/upgrade';
import { startExpedition } from '../expedition/commands';

beforeAll(() => {
  vi.setSystemTime(new Date('2026-09-06T00:00:00.000Z'));
});

describe('Village facility domain', () => {
  it('cancels facility work with a full input refund and releases the agent', () => {
    const initial = createInitialVillageSave(71);
    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const canceled = cancelFacilityTask(started.save, 'blacksmith', initial.createdAt + 1_000);
    expect(canceled.ok).toBe(true);
    if (!canceled.ok) return;
    expect(canceled.save.meta.currencies).toMatchObject({
      gold: initial.meta.currencies.gold - 4,
      materials: initial.meta.currencies.materials - 1,
    });
    expect(canceled.save.meta.facilities.blacksmith.activeTaskId).toBeNull();
    expect(canceled.save.meta.tasks).toEqual({});
    expect(canceled.save.meta.agents.find((agent) => agent.id === 'blacksmith')?.activeTaskId).toBeNull();
  });

  it('does not refund a facility task that is already due for settlement', () => {
    const initial = createInitialVillageSave(72);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const result = cancelFacilityTask(started.save, 'temple', started.task.completesAt);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(started.save);
    if (result.ok) return;
    expect(result.error).toContain('이미 완료');
    expect(result.save.meta.tasks[started.task.id]).toBeDefined();
  });

  it('gates agent specialty by trust and slows tired agents', () => {
    const initial = createInitialVillageSave(75);
    const baseline = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(baseline.ok).toBe(true);
    if (!baseline.ok) return;

    const trusted = createInitialVillageSave(76);
    trusted.meta.agents = trusted.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, trust: 50 }
      : agent);
    const specialized = startFacilityTask(trusted, 'blacksmith', trusted.createdAt, 'blacksmith');
    expect(specialized.ok).toBe(true);
    if (!specialized.ok) return;

    const tired = createInitialVillageSave(77);
    tired.meta.agents = tired.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, trust: 50, fatigue: 80 }
      : agent);
    const slowed = startFacilityTask(tired, 'blacksmith', tired.createdAt, 'blacksmith');
    expect(slowed.ok).toBe(true);
    if (!slowed.ok) return;

    expect(specialized.task.completesAt - specialized.task.startedAt)
      .toBeLessThan(baseline.task.completesAt - baseline.task.startedAt);
    expect(slowed.task.completesAt - slowed.task.startedAt)
      .toBeGreaterThan(specialized.task.completesAt - specialized.task.startedAt);
  });

  it('does not assign new work to an exhausted agent', () => {
    const initial = createInitialVillageSave(79);
    initial.meta.agents = initial.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, fatigue: 100 }
      : agent);

    const result = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('피로');
  });

  it('lets an idle agent rest to recover from fatigue', () => {
    const initial = createInitialVillageSave(80);
    initial.meta.agents = initial.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, fatigue: 100 }
      : agent);

    const result = restAgent(initial, 'blacksmith', initial.createdAt + 1_000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.meta.agents.find((agent) => agent.id === 'blacksmith')?.fatigue).toBe(75);
    expect(result.save.meta.sagaEntries[0]?.title).toContain('휴식');
  });

  it('does not rest an agent while it owns an active task', () => {
    const initial = createInitialVillageSave(81);
    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const result = restAgent(started.save, 'blacksmith', initial.createdAt + 1_000);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('작업 중');
  });

  it.each([
    ['missing', undefined],
    ['not-a-number', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['over-cap', 101],
  ])('rejects resting an agent with %s fatigue', (_label, fatigue) => {
    const malformed = createInitialVillageSave(133);
    malformed.meta.agents = malformed.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, fatigue: fatigue as never }
      : agent);

    const result = restAgent(malformed, 'blacksmith', malformed.updatedAt + 1_000);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(malformed);
    expect(malformed.meta.agents.find((agent) => agent.id === 'blacksmith')?.fatigue).toBe(fatigue);
  });

  it.each([
    ['missing', undefined],
    ['not-a-number', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['over-cap', 101],
  ])('rejects assigning an agent with %s fatigue', (_label, fatigue) => {
    const malformed = createInitialVillageSave(134);
    malformed.meta.agents = malformed.meta.agents.map((agent) => agent.id === 'blacksmith' || agent.id === 'guide'
      ? { ...agent, fatigue: fatigue as never }
      : agent);

    const task = startFacilityTask(malformed, 'blacksmith', malformed.updatedAt + 1_000, 'blacksmith');
    const expedition = startExpedition(malformed, 'sacred_fields', malformed.updatedAt + 1_000, 'aggression', 'guide');

    expect(task.ok).toBe(false);
    expect(task.save).toBe(malformed);
    expect(expedition.ok).toBe(false);
    expect(expedition.save).toBe(malformed);
    expect(malformed.meta.tasks).toEqual({});
    expect(malformed.run.expedition).toBeNull();
  });

  it.each([
    ['trust-not-a-number', 'trust', Number.NaN],
    ['trust-over-cap', 'trust', 101],
    ['level-fractional', 'level', 1.5],
    ['level-infinite', 'level', Number.POSITIVE_INFINITY],
    ['trait-tampered', 'trait', '위조된 특성'],
  ])('rejects assigning an agent with malformed %s', (_label, field, value) => {
    const malformed = createInitialVillageSave(135);
    malformed.meta.agents = malformed.meta.agents.map((agent) => {
      if (agent.id !== 'blacksmith' && agent.id !== 'guide') return agent;
      return { ...agent, [field]: value } as typeof agent;
    });

    const task = startFacilityTask(malformed, 'blacksmith', malformed.updatedAt + 1_000, 'blacksmith');
    const expedition = startExpedition(malformed, 'sacred_fields', malformed.updatedAt + 1_000, 'aggression', 'guide');

    expect(task.ok).toBe(false);
    expect(task.save).toBe(malformed);
    expect(expedition.ok).toBe(false);
    expect(expedition.save).toBe(malformed);
    expect(malformed.meta.tasks).toEqual({});
    expect(malformed.run.expedition).toBeNull();
  });

  it('keeps hero training and expedition actions mutually exclusive', () => {
    const initial = createInitialVillageSave(83);
    const training = startFacilityTask(initial, 'training', initial.createdAt, null);
    expect(training.ok).toBe(true);
    if (!training.ok) return;

    const expeditionWhileTraining = startExpedition(training.save, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(expeditionWhileTraining.ok).toBe(false);

    const expedition = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(expedition.ok).toBe(true);
    if (!expedition.ok) return;
    const trainingDuringExpedition = startFacilityTask(expedition.save, 'training', initial.createdAt, null);
    expect(trainingDuringExpedition.ok).toBe(false);
  });

  it('scales facility upgrade costs and task throughput by level', () => {
    const initial = createInitialVillageSave(84);
    initial.meta.currencies.gold = 500;
    initial.meta.currencies.materials = 100;

    const firstUpgrade = upgradeFacility(initial, 'temple', initial.createdAt);
    expect(firstUpgrade.ok).toBe(true);
    if (!firstUpgrade.ok) return;
    expect(firstUpgrade.task.input).toEqual({ gold: 80, materials: 4 });

    const secondUpgrade = upgradeFacility(firstUpgrade.save, 'temple', initial.createdAt + 1_000);
    expect(secondUpgrade.ok).toBe(true);
    if (!secondUpgrade.ok) return;
    expect(secondUpgrade.task.input).toEqual({ gold: 108, materials: 5 });

    const started = startFacilityTask(secondUpgrade.save, 'temple', initial.createdAt + 2_000);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.task.outputPreview.spirit).toBe(24);
  });

  it('previews the same facility economy and blockers before a task starts', () => {
    const initial = createInitialVillageSave(85);
    const preview = getFacilityTaskPreview(initial, 'blacksmith', 'blacksmith');
    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');

    expect(preview).toMatchObject({
      facilityId: 'blacksmith',
      durationSeconds: 45,
      input: { gold: 20, materials: 3 },
      output: { materials: 2 },
      outputEquipmentIds: ['iron_sword'],
      assignedAgentId: 'blacksmith',
      canStart: true,
      error: null,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.task.completesAt - started.task.startedAt).toBe(preview.durationSeconds * 1000);
    expect(started.task.input).toEqual(preview.input);
    expect(started.task.outputPreview).toEqual(preview.output);

    const blocked = getFacilityTaskPreview({
      ...initial,
      meta: { ...initial.meta, currencies: { ...initial.meta.currencies, gold: 0 } },
    }, 'blacksmith', 'blacksmith');
    expect(blocked.canStart).toBe(false);
    expect(blocked.error).toContain('재화');
  });

  it('allows only a specialist agent to own its designated facility work', () => {
    const initial = createInitialVillageSave(94);
    const preview = getFacilityTaskPreview(initial, 'blacksmith', 'guide');
    const result = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'guide');

    expect(preview.canStart).toBe(false);
    expect(preview.error).toContain('전문');
    expect(result.ok).toBe(false);
  });

  it('rejects empty support-agent assignments before writing tasks or expeditions', () => {
    const initial = createInitialVillageSave(120);
    const preview = getFacilityTaskPreview(initial, 'blacksmith', '' as never);
    const task = startFacilityTask(initial, 'blacksmith', initial.updatedAt, '' as never);
    const expedition = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', '' as never);
    const undefinedPreview = getFacilityTaskPreview(initial, 'blacksmith', undefined);
    const undefinedTask = startFacilityTask(initial, 'blacksmith', initial.updatedAt, undefined);
    const undefinedExpedition = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', undefined as never);
    const omittedPreview = getFacilityTaskPreview(initial, 'temple');
    const nullTask = startFacilityTask(initial, 'temple', initial.updatedAt, null);
    const specialistPreview = getFacilityTaskPreview(initial, 'mudang', 'mudang');

    expect(preview.canStart).toBe(false);
    expect(preview.error).toBe('지원 에이전트를 찾을 수 없습니다.');
    expect(task.ok).toBe(false);
    expect(expedition.ok).toBe(false);
    expect(undefinedPreview.canStart).toBe(false);
    expect(undefinedPreview.error).toBe('지원 에이전트를 찾을 수 없습니다.');
    expect(undefinedTask.ok).toBe(false);
    expect(undefinedExpedition.ok).toBe(false);
    expect(omittedPreview.canStart).toBe(true);
    expect(nullTask.ok).toBe(true);
    expect(specialistPreview.canStart).toBe(true);
    expect(initial.meta.tasks).toEqual({});
    expect(initial.run.expedition).toBeNull();
    expect(initial.meta.currencies).toEqual({ spirit: 100, gold: 100, materials: 12, rift: 0 });
  });

  it('makes training and expedition facility levels affect the live economy', () => {
    const base = createInitialVillageSave(95);
    const upgraded = createInitialVillageSave(96);
    upgraded.meta.facilities.training.level = 3;
    upgraded.meta.facilities.expedition.level = 3;

    const baseTraining = getFacilityTaskPreview(base, 'training', null);
    const upgradedTraining = getFacilityTaskPreview(upgraded, 'training', null);
    expect(upgradedTraining.heroExpGain).toBeGreaterThan(baseTraining.heroExpGain);

    const baseExpedition = startExpedition(base, 'sacred_fields', base.createdAt, 'aggression', null);
    const upgradedExpedition = startExpedition(upgraded, 'sacred_fields', upgraded.createdAt, 'aggression', null);
    expect(baseExpedition.ok).toBe(true);
    expect(upgradedExpedition.ok).toBe(true);
    if (!baseExpedition.ok || !upgradedExpedition.ok) return;
    expect(upgradedExpedition.task.completesAt - upgradedExpedition.task.startedAt)
      .toBeLessThan(baseExpedition.task.completesAt - baseExpedition.task.startedAt);
  });

  it('keeps facility economy previews finite for malformed extreme levels', () => {
    const malformed = createInitialVillageSave(117);
    malformed.meta.facilities.blacksmith.level = Number.MAX_VALUE;
    malformed.meta.facilities.temple.level = Number.MAX_VALUE;

    const preview = getFacilityTaskPreview(malformed, 'blacksmith', null);
    const cost = getFacilityUpgradeCost(malformed, 'temple');
    const started = startFacilityTask(malformed, 'blacksmith', malformed.updatedAt, null);

    expect(cost).not.toBeNull();
    expect([
      preview.durationSeconds,
      preview.heroExpGain,
      ...Object.values(preview.output),
      ...(cost ? [cost.gold, cost.materials] : []),
    ].every((value) => Number.isFinite(value))).toBe(true);
    expect(started.ok).toBe(true);
  });

  it('blocks task previews and starts for malformed facility levels', () => {
    for (const level of [Number.NaN, 1.5, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const malformed = createInitialVillageSave(118);
      malformed.meta.facilities.blacksmith.level = level;

      const preview = getFacilityTaskPreview(malformed, 'blacksmith', null);
      const started = startFacilityTask(malformed, 'blacksmith', malformed.updatedAt, null);

      expect(preview.canStart).toBe(false);
      expect(preview.error).toBe('아직 사용할 수 없는 시설입니다.');
      expect(started.ok).toBe(false);
    }

    const missingLevel = createInitialVillageSave(118);
    delete (missingLevel.meta.facilities.blacksmith as { level?: number }).level;
    const preview = getFacilityTaskPreview(missingLevel, 'blacksmith', null);
    const started = startFacilityTask(missingLevel, 'blacksmith', missingLevel.updatedAt, null);

    expect(preview.canStart).toBe(false);
    expect(preview.error).toBe('아직 사용할 수 없는 시설입니다.');
    expect(started.ok).toBe(false);

    const wrongType = createInitialVillageSave(118);
    (wrongType.meta.facilities.blacksmith as { level: unknown }).level = '2';
    const wrongTypePreview = getFacilityTaskPreview(wrongType, 'blacksmith', null);
    const wrongTypeStarted = startFacilityTask(wrongType, 'blacksmith', wrongType.updatedAt, null);

    expect(wrongTypePreview.canStart).toBe(false);
    expect(wrongTypePreview.error).toBe('아직 사용할 수 없는 시설입니다.');
    expect(wrongTypeStarted.ok).toBe(false);
  });

  it('exposes the scaled facility upgrade cost without mutating the save', () => {
    const initial = createInitialVillageSave(86);
    initial.meta.facilities.temple.level = 3;

    expect(getFacilityUpgradeCost(initial, 'temple')).toEqual({ gold: 145, materials: 7 });
    expect(initial.meta.currencies).toEqual({ spirit: 100, gold: 100, materials: 12, rift: 0 });
  });

  it('normalizes non-finite explicit action timestamps before persisting', () => {
    const initial = createInitialVillageSave(26);
    initial.meta.agents = initial.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, fatigue: 25 }
      : agent);

    const rested = restAgent(initial, 'blacksmith', Number.NaN);
    const started = startFacilityTask(initial, 'temple', Number.POSITIVE_INFINITY);
    const unsafeClockSave = createInitialVillageSave(28);
    const startedWithUnsafeClock = startFacilityTask(unsafeClockSave, 'temple', Number.MAX_VALUE);

    expect(rested.ok).toBe(true);
    expect(started.ok).toBe(true);
    expect(startedWithUnsafeClock.ok).toBe(true);
    if (!rested.ok || !started.ok || !startedWithUnsafeClock.ok) return;
    expect(rested.save.meta.sagaEntries[0]?.createdAt).toBe(initial.updatedAt);
    expect(started.task.startedAt).toBe(initial.updatedAt);
    expect(started.task.completesAt).toBeGreaterThan(started.task.startedAt);
    expect(startedWithUnsafeClock.task.startedAt).toBe(unsafeClockSave.updatedAt);
  });

  it.each([
    ['fractional', 100.5],
    ['infinite', Number.POSITIVE_INFINITY],
  ])('rejects currency-paying actions when the gold balance is %s', (_label, gold) => {
    const malformed = createInitialVillageSave(722);
    malformed.meta.currencies.gold = gold;

    const task = startFacilityTask(malformed, 'blacksmith', malformed.updatedAt, null);
    const upgrade = upgradeFacility(malformed, 'temple', malformed.updatedAt + 1_000);

    expect(task.ok).toBe(false);
    expect(task.save).toBe(malformed);
    expect(upgrade.ok).toBe(false);
    expect(upgrade.save).toBe(malformed);
    expect(malformed.meta.currencies.gold).toBe(gold);
  });

  it('does not upgrade a facility beyond the persistable level ceiling', () => {
    const capped = createInitialVillageSave(120);
    capped.meta.facilities.temple.level = Number.MAX_SAFE_INTEGER;
    capped.meta.currencies.gold = Number.MAX_SAFE_INTEGER;
    capped.meta.currencies.materials = Number.MAX_SAFE_INTEGER;

    const result = upgradeFacility(capped, 'temple', capped.updatedAt + 1_000);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(capped);
    expect(capped.meta.facilities.temple.level).toBe(Number.MAX_SAFE_INTEGER);
    expect(capped.meta.currencies).toMatchObject({ gold: Number.MAX_SAFE_INTEGER, materials: Number.MAX_SAFE_INTEGER });
  });
});
