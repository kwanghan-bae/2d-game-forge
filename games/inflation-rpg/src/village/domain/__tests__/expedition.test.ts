import {
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  createInitialVillageSave,
  loadVillageSave,
  persistVillageSave,
  simulateOfflineProgress,
} from '../../save';
import { getVillageHeroPower } from '../hero/progression';
import { getFacilityTaskPreview } from '../facility/preview';
import { cancelFacilityTask, startFacilityTask } from '../facility/tasks';
import { getFacilityUpgradeCost } from '../facility/upgrade';
import { getExpeditionForecast, getExpeditionSuccessChance } from '../expedition/forecast';
import {
  confirmNextRealmUnlock,
  confirmPendingExpedition,
  startExpedition,
} from '../expedition/commands';
import { completeFacilityTaskNow, completeFacilityTasks } from '../expedition/settlement';
import { chooseStoryChoice } from '../story/choices';
import { useIntervention } from '../intervention/commands';
import { setVillagePolicy } from '../settings/commands';
import { REALM_DEFINITIONS } from '../../data';
import { Village_MAX_SAGA_ENTRIES } from '../../types';
import type { FacilityId, RealmId } from '../../types';

const HOUR = 60 * 60 * 1000;

beforeAll(() => {
  vi.setSystemTime(new Date('2026-09-06T00:00:00.000Z'));
});

describe('Village expedition and settlement domain', () => {
  it('falls back to full efficiency when settlement receives a non-finite multiplier', () => {
    const initial = createInitialVillageSave(28);
    const started = startFacilityTask(initial, 'training', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const completed = completeFacilityTasks(started.save, started.task.completesAt, Number.NaN);

    expect(completed.meta.currencies.spirit).toBe(initial.meta.currencies.spirit + 8);
    expect(completed.run.hero.exp).toBe(40);
    expect(Number.isFinite(completed.run.hero.exp)).toBe(true);
  });

  it('advances the processing watermark when work is completed online', () => {
    const initial = createInitialVillageSave(17);
    const started = startFacilityTask(initial, 'temple', initial.createdAt, null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const completedAt = started.task.completesAt;

    const completed = completeFacilityTasks(started.save, completedAt);

    expect(completed.lastProcessedAt).toBe(completedAt);
  });

  it('does not settle assigned facility work when agent trust is malformed', () => {
    const initial = createInitialVillageSave(136);
    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const agent = started.save.meta.agents.find((item) => item.id === 'blacksmith');
    if (!agent) return;
    agent.trust = Number.NaN;

    const settled = completeFacilityTasks(started.save, started.task.completesAt);

    expect(settled).toBe(started.save);
    expect(started.save.meta.tasks[started.task.id]).toBeDefined();
    expect(agent.trust).toBe(Number.NaN);
  });

  it('does not settle a guide expedition when agent level is malformed', () => {
    const initial = createInitialVillageSave(137);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', 'guide');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const guide = started.save.meta.agents.find((item) => item.id === 'guide');
    if (!guide) return;
    guide.level = 1.5;

    const settled = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);

    expect(settled).toBe(started.save);
    expect(started.save.run.expedition).not.toBeNull();
    expect(guide.level).toBe(1.5);
  });

  it('does not consume the offline clock when malformed agent settlement is blocked', () => {
    const initial = createInitialVillageSave(138);
    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const agent = started.save.meta.agents.find((item) => item.id === 'blacksmith');
    if (!agent) return;
    agent.trust = Number.NaN;
    const beforeUpdatedAt = started.save.updatedAt;
    const beforeProcessedAt = started.save.lastProcessedAt;

    const result = simulateOfflineProgress(started.save, started.task.completesAt + HOUR);

    expect(result.save).toBe(started.save);
    expect(result.save.updatedAt).toBe(beforeUpdatedAt);
    expect(result.save.lastProcessedAt).toBe(beforeProcessedAt);
    expect(result.summary.completedTaskIds).toEqual([]);
    expect(result.summary.resourcesGained).toEqual({});
  });

  it('promotes an agent after trust grows through completed work', () => {
    const initial = createInitialVillageSave(78);
    initial.meta.agents = initial.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, trust: 49 }
      : agent);
    const started = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const completed = completeFacilityTasks(started.save, started.task.completesAt);
    const agent = completed.meta.agents.find((candidate) => candidate.id === 'blacksmith');
    expect(agent).toMatchObject({ trust: 50, level: 2, activeTaskId: null });
  });

  it('makes higher-level specialists work faster and records maximum trust once', () => {
    const levelTwo = createInitialVillageSave(98);
    levelTwo.meta.agents = levelTwo.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, trust: 50, level: 2 }
      : agent);
    const levelThree = createInitialVillageSave(99);
    levelThree.meta.agents = levelThree.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, trust: 100, level: 3 }
      : agent);

    const first = startFacilityTask(levelTwo, 'blacksmith', levelTwo.createdAt, 'blacksmith');
    const second = startFacilityTask(levelThree, 'blacksmith', levelThree.createdAt, 'blacksmith');
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.task.completesAt - second.task.startedAt)
      .toBeLessThan(first.task.completesAt - first.task.startedAt);

    const maxTrust = createInitialVillageSave(100);
    maxTrust.meta.agents = maxTrust.meta.agents.map((agent) => agent.id === 'blacksmith'
      ? { ...agent, trust: 99 }
      : agent);
    const started = startFacilityTask(maxTrust, 'blacksmith', maxTrust.createdAt, 'blacksmith');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const completed = completeFacilityTasks(started.save, started.task.completesAt);
    expect(completed.meta.agents.find((agent) => agent.id === 'blacksmith')?.trust).toBe(100);
    expect(completed.meta.sagaEntries.some((entry) => entry.title.includes('신뢰'))).toBe(true);
  });

  it('turns training work into hero experience, level, and combat stats', () => {
    const initial = createInitialVillageSave(82);
    initial.run.hero.exp = 80;
    const started = startFacilityTask(initial, 'training', initial.createdAt, null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const completed = completeFacilityTasks(started.save, started.task.completesAt);

    expect(completed.run.hero.level).toBe(2);
    expect(completed.run.hero.exp).toBe(20);
    expect(completed.run.hero.atk).toBeGreaterThan(initial.run.hero.atk);
    expect(completed.run.hero.hpMax).toBe(initial.run.hero.hpMax + 100);
    expect(completed.run.hero.hp).toBe(initial.run.hero.hp + 100);
    expect(completed.run.hero.actionCount).toBe(initial.run.hero.actionCount + 1);
    expect(completed.run.hero.currentAction).toBe('rest');
  });

  it('settles only the selected task when an instant completion overlaps due work', () => {
    const initial = createInitialVillageSave(119);
    const temple = startFacilityTask(initial, 'temple', initial.updatedAt);
    expect(temple.ok).toBe(true);
    if (!temple.ok) return;

    const archive = startFacilityTask(temple.save, 'archive', initial.updatedAt);
    expect(archive.ok).toBe(true);
    if (!archive.ok) return;
    archive.save.meta.tasks[archive.task.id]!.completesAt = initial.updatedAt + 500;

    const expedition = startExpedition(archive.save, 'sacred_fields', initial.updatedAt, 'aggression', null);
    expect(expedition.ok).toBe(true);
    if (!expedition.ok) return;
    expedition.save.run.expedition!.completesAt = initial.updatedAt + 500;

    const instant = completeFacilityTaskNow(expedition.save, 'temple', initial.updatedAt + 1_000);

    expect(instant.ok).toBe(true);
    if (!instant.ok) return;
    expect(instant.save.meta.tasks[archive.task.id]).toBeDefined();
    expect(instant.save.meta.facilities.archive.activeTaskId).toBe(archive.task.id);
    expect(instant.save.run.expedition).toBeDefined();
    expect(instant.save.meta.currencies).toMatchObject({ spirit: 106, materials: 11, rift: 0 });
  });

  it('does not settle due work before a future persisted write time', () => {
    const initial = createInitialVillageSave(27);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = initial.createdAt;
    started.save.updatedAt = initial.createdAt + HOUR;

    const result = completeFacilityTasks(started.save, initial.createdAt + 1_000);

    expect(result).toBe(started.save);
    expect(result.meta.tasks[started.task.id]).toBeDefined();
  });

  it('does not settle work when the completion clock is non-finite', () => {
    const initial = createInitialVillageSave(29);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = initial.createdAt;

    const result = completeFacilityTasks(started.save, Number.POSITIVE_INFINITY);

    expect(result).toBe(started.save);
    expect(result.meta.tasks[started.task.id]).toBeDefined();
  });

  it('does not settle a task whose persisted completion clock is NaN', () => {
    const initial = createInitialVillageSave(291);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = Number.NaN;
    const beforeCurrencies = { ...started.save.meta.currencies };

    const result = completeFacilityTasks(started.save, started.save.updatedAt + 60_000);

    expect(result).toBe(started.save);
    expect(result.meta.tasks[started.task.id]).toBeDefined();
    expect(result.meta.currencies).toEqual(beforeCurrencies);
  });

  it('does not resolve an expedition whose persisted completion clock is NaN', () => {
    const initial = createInitialVillageSave(292);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const expedition = started.save.run.expedition;
    expect(expedition).not.toBeNull();
    if (!expedition) return;
    expedition.completesAt = Number.NaN;
    const beforeCurrencies = { ...started.save.meta.currencies };

    const result = completeFacilityTasks(started.save, started.save.updatedAt + 60_000);

    expect(result).toBe(started.save);
    expect(result.run.expedition).toBe(expedition);
    expect(result.run.lastExpeditionResult).toBeNull();
    expect(result.meta.currencies).toEqual(beforeCurrencies);
  });

  it('does not refund or instantly complete a task whose clock is NaN', () => {
    const initial = createInitialVillageSave(293);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = Number.NaN;
    const beforeCurrencies = { ...started.save.meta.currencies };

    const canceled = cancelFacilityTask(started.save, 'temple', started.save.updatedAt + 60_000);
    const instant = completeFacilityTaskNow(started.save, 'temple', started.save.updatedAt + 60_000);

    expect(canceled.ok).toBe(false);
    expect(canceled.save).toBe(started.save);
    expect(instant.ok).toBe(false);
    expect(instant.save).toBe(started.save);
    expect(started.save.meta.tasks[started.task.id]).toBeDefined();
    expect(started.save.meta.currencies).toEqual(beforeCurrencies);
  });

  it('caps malformed training experience before settlement', () => {
    const initial = createInitialVillageSave(116);
    const started = startFacilityTask(initial, 'training', initial.createdAt, null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].heroExpGain = 100_001;

    const result = completeFacilityTasks(started.save, started.task.completesAt);

    expect(result.run.hero.level).toBe(45);
    expect(result.run.hero.exp).toBe(1_000);
    expect(Number.isFinite(result.run.hero.exp)).toBe(true);
  });

  it('saturates hero stats when a level-up reaches the persistable ceiling', () => {
    const initial = createInitialVillageSave(117);
    const started = startFacilityTask(initial, 'training', initial.createdAt, null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const hero = started.save.run.hero;
    hero.exp = 99;
    hero.atk = Number.MAX_SAFE_INTEGER;
    hero.def = Number.MAX_SAFE_INTEGER;
    hero.defBase = Number.MAX_SAFE_INTEGER;
    hero.hp = Number.MAX_SAFE_INTEGER;
    hero.hpMax = Number.MAX_SAFE_INTEGER;
    started.save.meta.tasks[started.task.id].heroExpGain = 100;

    const result = completeFacilityTasks(started.save, started.task.completesAt);

    expect(result.run.hero.atk).toBe(Number.MAX_SAFE_INTEGER);
    expect(result.run.hero.def).toBe(Number.MAX_SAFE_INTEGER);
    expect(result.run.hero.defBase).toBe(Number.MAX_SAFE_INTEGER);
    expect(result.run.hero.hp).toBe(Number.MAX_SAFE_INTEGER);
    expect(result.run.hero.hpMax).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('rejects instant completion before a future persisted write time', () => {
    const initial = createInitialVillageSave(30);
    const started = startFacilityTask(initial, 'temple', initial.createdAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.updatedAt = initial.createdAt + HOUR;

    const result = completeFacilityTaskNow(started.save, 'temple', initial.createdAt + 1_000);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('미래');
  });

  it('keeps the save chronology valid when an explicit action sees a backwards clock', () => {
    const initial = createInitialVillageSave(24);
    initial.lastProcessedAt = initial.createdAt + HOUR;
    initial.updatedAt = initial.lastProcessedAt;

    const changed = setVillagePolicy(initial, 'training', initial.createdAt + 1_000);
    expect(changed.updatedAt).toBe(initial.lastProcessedAt);

    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;
    persistVillageSave(changed, fakeStorage);
    expect(loadVillageSave(fakeStorage)).not.toBeNull();
  });

  it('normalizes backwards task and expedition action clocks to the last saved time', () => {
    const staleTaskSave = createInitialVillageSave(31);
    staleTaskSave.lastProcessedAt += HOUR;
    staleTaskSave.updatedAt = staleTaskSave.lastProcessedAt;
    const task = startFacilityTask(staleTaskSave, 'temple', staleTaskSave.createdAt);
    expect(task.ok).toBe(true);
    if (!task.ok) return;
    expect(task.task.startedAt).toBe(staleTaskSave.updatedAt);
    expect(task.task.id).toContain(`${staleTaskSave.updatedAt}`);

    const staleExpeditionSave = createInitialVillageSave(32);
    staleExpeditionSave.lastProcessedAt += HOUR;
    staleExpeditionSave.updatedAt = staleExpeditionSave.lastProcessedAt;
    const expedition = startExpedition(staleExpeditionSave, 'sacred_fields', staleExpeditionSave.createdAt, 'aggression', null);
    expect(expedition.ok).toBe(true);
    if (!expedition.ok) return;
    expect(expedition.save.run.expedition?.startedAt).toBe(staleExpeditionSave.updatedAt);
  });

  it('does not auto-confirm a risky Realm boss during offline processing', () => {
    const initial = createInitialVillageSave(19);
    initial.meta.unlockedRealms.push('deep_forest');
    initial.run.hero.atk = 10_000;
    initial.run.hero.def = 10_000;
    initial.run.hero.defBase = 10_000;
    initial.run.hero.hp = 10_000;
    initial.run.hero.hpMax = 10_000;
    const started = startExpedition(initial, 'deep_forest', initial.lastProcessedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.id = 'e2e-victory-4';

    const afterNormal = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);
    const afterElite = completeFacilityTasks(afterNormal, afterNormal.run.expedition!.completesAt);
    const offline = simulateOfflineProgress(afterElite, afterElite.run.expedition!.completesAt);

    expect(offline.summary.completedExpedition).toBe(false);
    expect(offline.save.run.expedition?.realmId).toBe('deep_forest');
    expect(offline.save.run.expedition?.encounterIndex).toBe(2);
    expect(offline.save.run.expedition?.status).toBe('awaiting_confirmation');

    const replay = simulateOfflineProgress(offline.save, offline.save.lastProcessedAt);
    expect(replay.save).toBe(offline.save);
    expect(replay.summary.completedExpedition).toBe(false);

    const refreshed = completeFacilityTasks(offline.save, offline.save.lastProcessedAt + 1_000);
    expect(refreshed.run.expedition?.status).toBe('awaiting_confirmation');

    const confirmed = confirmPendingExpedition(refreshed, refreshed.lastProcessedAt + 1_000);
    expect(confirmed.run.expedition).toBeNull();
    expect(confirmed.run.lastExpeditionResult?.realmId).toBe('deep_forest');
    expect(confirmed.run.lastExpeditionResult?.outcome).toBe('victory');
    expect(confirmed.meta.unlockedRealms).toEqual(['sacred_fields', 'deep_forest']);
    const blockedUnlock = confirmNextRealmUnlock(confirmed, confirmed.updatedAt + 1_000);
    expect(blockedUnlock).toBe(confirmed);
    const choice = chooseStoryChoice(confirmed, 'protect_flame', confirmed.updatedAt + 1_000);
    expect(choice.ok).toBe(true);
    if (!choice.ok) return;
    expect(choice.save.meta.unlockedRealms).toEqual(['sacred_fields', 'deep_forest', 'underworld']);
    expect(confirmPendingExpedition(confirmed, confirmed.updatedAt + 1_000)).toBe(confirmed);
  });

  it('keeps a risky expedition pending for invalid or premature confirmation clocks', () => {
    const initial = createInitialVillageSave(20);
    initial.meta.unlockedRealms.push('deep_forest');
    const started = startExpedition(initial, 'deep_forest', initial.lastProcessedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const afterNormal = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);
    const afterElite = completeFacilityTasks(afterNormal, afterNormal.run.expedition!.completesAt);
    const pending = completeFacilityTasks(afterElite, afterElite.run.expedition!.completesAt, 1, false);
    expect(pending.run.expedition?.status).toBe('awaiting_confirmation');

    expect(confirmPendingExpedition(pending, Number.NaN)).toBe(pending);
    expect(confirmPendingExpedition(pending, pending.updatedAt - 1)).toBe(pending);
    expect(pending.run.expedition?.status).toBe('awaiting_confirmation');
  });

  it('keeps a risky expedition pending when confirmation settlement is malformed', () => {
    const initial = createInitialVillageSave(139);
    initial.meta.unlockedRealms.push('deep_forest');
    const started = startExpedition(initial, 'deep_forest', initial.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const afterNormal = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);
    const afterElite = completeFacilityTasks(afterNormal, afterNormal.run.expedition!.completesAt);
    const pending = completeFacilityTasks(afterElite, afterElite.run.expedition!.completesAt, 1, false);
    expect(pending.run.expedition?.status).toBe('awaiting_confirmation');
    pending.meta.currencies.gold = Number.NaN;

    const confirmed = confirmPendingExpedition(pending, pending.updatedAt + 1_000);

    expect(confirmed).toBe(pending);
    expect(pending.run.expedition?.status).toBe('awaiting_confirmation');
  });

  it('requires explicit confirmation before an offline victory unlocks the next Realm', () => {
    const initial = createInitialVillageSave(93);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.id = 'e2e-victory-4';
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;

    const offline = simulateOfflineProgress(started.save, started.save.run.expedition!.completesAt);
    expect(offline.save.run.expedition?.status).toBe('awaiting_confirmation');
    expect(offline.save.run.lastExpeditionResult).toBeNull();
    expect(offline.summary.completedExpedition).toBe(false);
    expect(offline.save.meta.unlockedRealms).toEqual(['sacred_fields']);

    const victory = confirmPendingExpedition(offline.save, offline.save.updatedAt + 1_000);
    expect(victory.run.lastExpeditionResult?.outcome).toBe('victory');
    expect(victory.run.expedition).toBeNull();
    expect(victory.meta.unlockedRealms).toEqual(['sacred_fields']);

    const confirmed = confirmNextRealmUnlock(victory, victory.updatedAt + 1_000);
    expect(confirmed.meta.unlockedRealms).toEqual(['sacred_fields', 'deep_forest']);
    expect(confirmed.meta.sagaEntries[0]?.title).toContain('깊은 숲');
    expect(confirmNextRealmUnlock(confirmed, confirmed.updatedAt + 1_000)).toBe(confirmed);
  });

  it('never unlocks the underworld through the generic confirmation path when its saga log is capped', () => {
    const source = createInitialVillageSave(140);
    source.meta.unlockedRealms.push('deep_forest');
    source.run.lastExpeditionResult = {
      id: 'deep-forest-result-with-evicted-log',
      realmId: 'deep_forest',
      outcome: 'victory',
      completedAt: source.updatedAt,
      reward: { materials: 1 },
      heroPower: 100,
      recommendedPower: 90,
      turns: 3,
      totalDamageDealt: 120,
      totalDamageTaken: 20,
      heroRemainingHp: 80,
      weaknessKR: '없음',
      recommendedFacilityId: 'training',
      recommendedEquipmentId: null,
      retryAfterSeconds: 0,
      successChance: 0.9,
      encountersCleared: 3,
      totalEncounterCount: 3,
    };
    source.meta.sagaEntries = Array.from({ length: Village_MAX_SAGA_ENTRIES }, (_, index) => ({
      id: `old-saga-${index}`,
      kind: 'facility' as const,
      createdAt: source.updatedAt - index,
      title: '오래된 기록',
      text: '깊은 숲 승리 기록이 상한에서 밀려난 상태',
    }));

    const confirmed = confirmNextRealmUnlock(source, source.updatedAt + 1_000);

    expect(confirmed).toBe(source);
    expect(source.meta.unlockedRealms).toEqual(['sacred_fields', 'deep_forest']);
  });

  it('keeps a pending Realm record from being lost by starting another expedition', () => {
    const initial = createInitialVillageSave(94);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.id = 'e2e-victory-4';
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;

    const pending = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt, 0.7, false);
    expect(pending.run.expedition?.status).toBe('awaiting_confirmation');
    const victory = confirmPendingExpedition(pending, pending.updatedAt + 1_000);
    expect(victory.run.lastExpeditionResult?.outcome).toBe('victory');
    expect(victory.meta.unlockedRealms).toEqual(['sacred_fields']);

    const retry = startExpedition(victory, 'sacred_fields', victory.updatedAt + 1_000, 'aggression', null);
    expect(retry.ok).toBe(false);
    expect(retry.save).toBe(victory);
    if (retry.ok) return;
    expect(retry.error).toContain('기록');
    expect(victory.run.lastExpeditionResult?.outcome).toBe('victory');
  });

  it('does not unlock a Realm when the confirmation clock is invalid or stale', () => {
    const initial = createInitialVillageSave(95);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.id = 'e2e-victory-clock-guard';
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;

    const pending = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt, 0.7, false);
    expect(pending.run.expedition?.status).toBe('awaiting_confirmation');
    const victory = confirmPendingExpedition(pending, pending.updatedAt + 1_000);
    expect(victory.run.lastExpeditionResult?.outcome).toBe('victory');

    expect(confirmNextRealmUnlock(victory, Number.NaN)).toBe(victory);
    expect(confirmNextRealmUnlock(victory, victory.updatedAt - 1)).toBe(victory);
    expect(victory.meta.unlockedRealms).toEqual(['sacred_fields']);
  });

  it('allows one expedition and resolves it into rewards', () => {
    const initial = createInitialVillageSave(9);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', 'guide');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.id = 'e2e-victory-4';
    expect(started.save.run.expedition?.realmId).toBe('sacred_fields');

    const second = startExpedition(started.save, 'sacred_fields', initial.createdAt, 'aggression', 'guide');
    expect(second.ok).toBe(false);

    const invalidAgent = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', 'blacksmith');
    expect(invalidAgent.ok).toBe(false);

    let completed = started.save;
    while (completed.run.expedition) {
      completed = completeFacilityTasks(completed, completed.run.expedition.completesAt);
    }
    expect(completed.run.expedition).toBeNull();
    expect(completed.meta.sagaEntries[0]?.kind).toBe('expedition');
    expect(completed.meta.sagaEntries[0]).toMatchObject({
      title: '신목 들판 원정 성공',
      text: expect.stringContaining('마을로 돌아왔다'),
    });
    expect(completed.run.lastExpeditionResult).toMatchObject({
      realmId: 'sacred_fields', outcome: 'victory', retryAfterSeconds: 0,
    });
  });

  it('does not assign a fully fatigued guide to a new expedition', () => {
    const initial = createInitialVillageSave(103);
    initial.meta.agents = initial.meta.agents.map((agent) => agent.id === 'guide'
      ? { ...agent, fatigue: 100 }
      : agent);

    const result = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', 'guide');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('피로');
  });

  it('does not reuse task ids after a same-clock completion and restart', () => {
    const initial = createInitialVillageSave(101);
    const first = startFacilityTask(initial, 'temple', initial.createdAt, null);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const completed = completeFacilityTasks(first.save, first.task.completesAt);
    const second = startFacilityTask(completed, 'temple', initial.createdAt, null);

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.task.id).not.toBe(first.task.id);
  });

  it('does not reuse an expedition id after same-clock intervention retreat', () => {
    const initial = createInitialVillageSave(102);
    const first = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const retreated = useIntervention(first.save, 'retreat', initial.createdAt);
    expect(retreated.ok).toBe(true);
    if (!retreated.ok) return;
    const second = startExpedition(retreated.save, 'sacred_fields', initial.createdAt, 'aggression', null);

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.task.id).not.toBe(first.task.id);
  });

  it('advances a new expedition through normal, elite, and boss encounters', () => {
    const initial = createInitialVillageSave(90);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.id = 'e2e-victory-4';
    expect(started.save.run.expedition).toMatchObject({ encounterIndex: 0 });

    const normal = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);
    expect(normal.run.expedition).toMatchObject({ encounterIndex: 1 });
    expect(normal.run.lastExpeditionResult).toBeNull();

    const elite = completeFacilityTasks(normal, normal.run.expedition!.completesAt);
    expect(elite.run.expedition).toMatchObject({ encounterIndex: 2 });
    expect(elite.run.lastExpeditionResult).toBeNull();

    const boss = completeFacilityTasks(elite, elite.run.expedition!.completesAt);
    expect(boss.run.expedition).toBeNull();
    expect(boss.run.lastExpeditionResult).toMatchObject({
      outcome: 'victory', encountersCleared: 3, totalEncounterCount: 3,
    });
  });

  it('counts only successful staged encounters as cleared after a defeat', () => {
    const initial = createInitialVillageSave(126);
    initial.run.hero.atk = 1;
    initial.run.hero.hp = 1;
    initial.run.hero.hpMax = 1;
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const completed = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);

    expect(completed.run.lastExpeditionResult).toMatchObject({ outcome: 'defeat', encountersCleared: 0 });
  });

  it('forecasts target success bands and makes support policy effects visible', () => {
    const atRecommendedPower = createInitialVillageSave(92);
    atRecommendedPower.run.hero.atk = 30;
    const normal = getExpeditionSuccessChance(atRecommendedPower, 'sacred_fields', 0, null);
    const elite = getExpeditionSuccessChance(atRecommendedPower, 'sacred_fields', 1, null);
    const boss = getExpeditionSuccessChance(atRecommendedPower, 'sacred_fields', 2, null);

    expect(getVillageHeroPower(atRecommendedPower)).toBe(120);
    expect(normal).toBeGreaterThanOrEqual(0.9);
    expect(normal).toBeLessThanOrEqual(0.97);
    expect(elite).toBeGreaterThanOrEqual(0.65);
    expect(elite).toBeLessThanOrEqual(0.8);
    expect(boss).toBeGreaterThanOrEqual(0.45);
    expect(boss).toBeLessThanOrEqual(0.65);

    const guide = getExpeditionSuccessChance(atRecommendedPower, 'sacred_fields', 2, 'guide');
    const hoarding = getExpeditionSuccessChance(setVillagePolicy(atRecommendedPower, 'hoarding', atRecommendedPower.createdAt + 1), 'sacred_fields', 2, null);
    const blessedSave = createInitialVillageSave(97);
    blessedSave.run.hero.atk = 30;
    blessedSave.meta.facilities.mudang.level = 3;
    const blessed = getExpeditionSuccessChance(blessedSave, 'sacred_fields', 2, null);
    expect(guide).toBeGreaterThan(boss);
    expect(hoarding).toBeGreaterThan(boss);
    expect(blessed).toBeGreaterThan(boss);
  });

  it('does not forecast a guide bonus when the guide is unavailable', () => {
    const baselineSave = createInitialVillageSave(98);
    baselineSave.run.hero.atk = 30;
    const baseline = getExpeditionSuccessChance(baselineSave, 'sacred_fields', 2, null);

    const tiredSave = createInitialVillageSave(99);
    tiredSave.run.hero.atk = 30;
    tiredSave.meta.agents = tiredSave.meta.agents.map((agent) => agent.id === 'guide'
      ? { ...agent, fatigue: 100 }
      : agent);
    expect(getExpeditionSuccessChance(tiredSave, 'sacred_fields', 2, 'guide')).toBe(baseline);

    const busySave = createInitialVillageSave(100);
    busySave.run.hero.atk = 30;
    busySave.meta.agents = busySave.meta.agents.map((agent) => agent.id === 'guide'
      ? { ...agent, activeTaskId: 'unrelated-task' }
      : agent);
    expect(getExpeditionSuccessChance(busySave, 'sacred_fields', 2, 'guide')).toBe(baseline);

    const activeSave = createInitialVillageSave(101);
    activeSave.run.hero.atk = 30;
    const started = startExpedition(activeSave, 'sacred_fields', activeSave.createdAt, 'aggression', 'guide');
    expect(started.ok).toBe(true);
    if (started.ok) {
      expect(getExpeditionSuccessChance(started.save, 'sacred_fields', 2, 'guide')).toBeGreaterThan(baseline);
    }
  });

  it('keeps an active expedition forecast on the policy chosen at departure', () => {
    const initial = createInitialVillageSave(93);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const beforePolicyChange = getExpeditionSuccessChance(started.save, 'sacred_fields', 2, null);
    const changed = setVillagePolicy(started.save, 'hoarding', started.save.updatedAt + 1);
    const afterPolicyChange = getExpeditionSuccessChance(changed, 'sacred_fields', 2, null);

    expect(changed.run.policy).toBe('hoarding');
    expect(changed.run.expedition?.policy).toBe('aggression');
    expect(afterPolicyChange).toBe(beforePolicyChange);
  });

  it('uses the Village hero battle adapter instead of power alone', () => {
    const initial = createInitialVillageSave(11);
    initial.run.hero.atk = 300;
    initial.run.hero.hp = 1;
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;

    const completed = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);
    expect(completed.meta.sagaEntries[0]?.title).toBe('신목 들판 원정 중단');
    expect(completed.meta.currencies.gold).toBe(initial.meta.currencies.gold);
    expect(completed.meta.currencies.spirit).toBe(initial.meta.currencies.spirit);
    expect(completed.run.lastExpeditionResult).toMatchObject({
      outcome: 'defeat', recommendedFacilityId: 'recovery', recommendedEquipmentId: 'iron_sword',
    });
  });

  it('recommends the next unlocked blacksmith equipment after a defeat', () => {
    const initial = createInitialVillageSave(124);
    initial.meta.facilities.blacksmith.level = 3;
    initial.run.hero.equipmentIds = ['iron_sword'];
    initial.run.hero.equipmentLevels = { iron_sword: 1 };
    initial.run.hero.hp = 1;
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;

    const completed = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);

    expect(completed.run.lastExpeditionResult).toMatchObject({
      outcome: 'defeat', recommendedFacilityId: 'recovery', recommendedEquipmentId: 'guardian_armor',
    });
  });

  it('does not dispatch a defeated hero before recovery', () => {
    const initial = createInitialVillageSave(20);
    initial.run.hero.hp = 0;

    const result = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', null);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('회복');
  });

  it.each([
    ['missing', undefined],
    ['not-a-number', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['unsafe', Number.MAX_VALUE],
  ])('rejects expedition start when hero HP is %s', (_label, hp) => {
    const malformed = createInitialVillageSave(201);
    malformed.run.hero.hp = hp as never;

    const result = startExpedition(malformed, 'sacred_fields', malformed.updatedAt, 'aggression', null);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(malformed);
    expect(malformed.meta.currencies.spirit).toBe(100);
    expect(malformed.run.expedition).toBeNull();
  });

  it('keeps hero power and expedition forecast finite for malformed hero stats', () => {
    const save = createInitialVillageSave(114);
    save.run.hero.atk = Number.NaN;
    save.run.hero.hp = Number.NaN;

    expect(getVillageHeroPower(save)).toBe(0);
    expect(Number.isFinite(getExpeditionSuccessChance(save, 'sacred_fields', 2, null))).toBe(true);
  });

  it('keeps malformed HP and support stats from poisoning the expedition forecast', () => {
    const malformed = createInitialVillageSave(127);
    malformed.run.hero.atk = 30;
    malformed.run.hero.hp = Number.NaN;
    malformed.meta.facilities.mudang.level = Number.NaN;
    malformed.meta.agents = malformed.meta.agents.map((agent) => agent.id === 'guide'
      ? { ...agent, trust: Number.NaN }
      : agent);

    const safeEquivalent = createInitialVillageSave(128);
    safeEquivalent.run.hero.atk = 30;
    safeEquivalent.run.hero.hp = 0;
    safeEquivalent.meta.agents = safeEquivalent.meta.agents.map((agent) => agent.id === 'guide'
      ? { ...agent, trust: 0 }
      : agent);

    expect(getExpeditionSuccessChance(malformed, 'sacred_fields', 2, 'guide'))
      .toBe(getExpeditionSuccessChance(safeEquivalent, 'sacred_fields', 2, 'guide'));
  });

  it('uses a zero displayed chance when deterministic battle cannot win and separates solo and guide forecasts', () => {
    const impossible = createInitialVillageSave(897);
    impossible.run.hero.atk = 0;
    impossible.run.hero.def = 0;
    impossible.run.hero.hp = 1;

    const blocked = getExpeditionForecast(impossible, 'sacred_fields', 2, null, 'forecast-impossible');
    expect(blocked.battle.won).toBe(false);
    expect(blocked.successChance).toBe(0);
    expect(blocked.soloSuccessChance).toBe(0);
    expect(blocked.guideSuccessChance).toBe(0);

    const ready = createInitialVillageSave(898);
    ready.run.hero.atk = 100;
    const solo = getExpeditionForecast(ready, 'sacred_fields', 2, null, 'forecast-ready');
    const guide = getExpeditionForecast(ready, 'sacred_fields', 2, 'guide', 'forecast-ready');
    expect(solo.battle.won).toBe(true);
    expect(guide.successChance).toBeGreaterThan(solo.successChance);
    expect(guide.soloSuccessChance).toBe(solo.successChance);
  });

  it('rejects an unknown expedition policy before charging or dispatching', () => {
    const initial = createInitialVillageSave(107);
    const result = startExpedition(initial, 'sacred_fields', initial.updatedAt + 1_000, 'unsafe' as never, null);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(initial);
    expect(initial.run.expedition).toBeNull();
    expect(initial.meta.currencies).toEqual({ spirit: 100, gold: 100, materials: 12, rift: 0 });
  });

  it('rejects inherited definition keys at public domain boundaries', () => {
    const initial = createInitialVillageSave(113);
    const invalidFacility = 'constructor' as FacilityId;
    const invalidRealm = 'constructor' as RealmId;

    expect(getFacilityTaskPreview(initial, invalidFacility)).toMatchObject({
      canStart: false,
      error: '아직 사용할 수 없는 시설입니다.',
    });
    expect(startFacilityTask(initial, invalidFacility, initial.createdAt, null)).toMatchObject({ ok: false });
    expect(getFacilityUpgradeCost(initial, invalidFacility)).toBeNull();
    expect(() => getExpeditionSuccessChance(initial, invalidRealm)).not.toThrow();
    expect(getExpeditionSuccessChance(initial, invalidRealm)).toBe(0.05);
  });

  it('rejects an unknown Realm before checking unlocks or charging', () => {
    const initial = createInitialVillageSave(112);
    const result = startExpedition(initial, 'unknown_realm' as never, initial.updatedAt + 1_000, 'aggression', null);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(initial);
    if (result.ok) return;
    expect(result.error).toContain('알 수 없는 영역');
    expect(initial.run.expedition).toBeNull();
  });

  it('does not let an oversized task reward overflow a currency', () => {
    const initial = createInitialVillageSave(109);
    const started = startFacilityTask(initial, 'temple', initial.updatedAt);
    if (!started.ok) throw new Error(started.error);

    started.save.meta.currencies.gold = 1e308;
    started.save.meta.tasks[started.task.id].outputPreview = { gold: 1e308 };
    const completed = completeFacilityTasks(started.save, started.task.completesAt + 1_000);

    expect(Number.isFinite(completed.meta.currencies.gold)).toBe(true);
    expect(completed.meta.currencies.gold).toBe(1e308);
  });

  it.each([
    ['fractional', 100.5],
    ['not-a-number', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['unsafe', Number.MAX_VALUE],
  ])('does not settle facility output over a malformed %s balance', (_label, spirit) => {
    const malformed = createInitialVillageSave(138);
    const started = startFacilityTask(malformed, 'temple', malformed.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.currencies.spirit = spirit;

    const completed = completeFacilityTasks(started.save, started.task.completesAt);

    expect(completed).toBe(started.save);
    expect(started.save.meta.currencies.spirit).toBe(spirit);
    expect(started.save.meta.tasks[started.task.id]).toBeDefined();

    const instant = completeFacilityTaskNow(
      started.save,
      'temple',
      started.task.completesAt + 1_000,
    );
    expect(instant.ok).toBe(false);
    expect(instant.save).toBe(started.save);
    expect(started.save.meta.tasks[started.task.id]).toBeDefined();
  });

  it.each([
    ['fractional', 100.5],
    ['not-a-number', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['unsafe', Number.MAX_VALUE],
  ])('does not settle an expedition reward over a malformed %s balance', (_label, gold) => {
    const malformed = createInitialVillageSave(139);
    const started = startExpedition(malformed, 'sacred_fields', malformed.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.id = 'e2e-victory-4';
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;
    started.save.meta.currencies.gold = gold;

    const settled = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);

    expect(settled).toBe(started.save);
    expect(started.save.meta.currencies.gold).toBe(gold);
    expect(started.save.run.expedition).not.toBeNull();
  });

  it('rejects unsafe completion clocks before pending work can be settled', () => {
    const initial = createInitialVillageSave(125);
    const unsafeClock = Number.MAX_SAFE_INTEGER + 1;
    const startedTask = startFacilityTask(initial, 'temple', initial.updatedAt, null);
    expect(startedTask.ok).toBe(true);
    if (!startedTask.ok) return;

    const settled = completeFacilityTasks(startedTask.save, unsafeClock);
    const instant = completeFacilityTaskNow(startedTask.save, 'temple', unsafeClock);
    expect(settled).toBe(startedTask.save);
    expect(instant.ok).toBe(false);
    if (instant.ok) return;
    expect(instant.save).toBe(startedTask.save);

    const startedExpedition = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', null);
    expect(startedExpedition.ok).toBe(true);
    if (!startedExpedition.ok) return;
    const pending = startedExpedition.save.run.expedition!;
    pending.status = 'awaiting_confirmation';
    pending.encounterIndex = 2;
    pending.completesAt = startedExpedition.save.updatedAt;
    expect(confirmPendingExpedition(startedExpedition.save, unsafeClock)).toBe(startedExpedition.save);
  });

  it('does not schedule work past the persistable clock ceiling', () => {
    const initial = createInitialVillageSave(126);
    initial.lastProcessedAt = Number.MAX_SAFE_INTEGER;
    initial.updatedAt = Number.MAX_SAFE_INTEGER;

    const task = startFacilityTask(initial, 'temple', initial.updatedAt, null);
    const expedition = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', null);

    expect(task.ok).toBe(false);
    expect(task.save).toBe(initial);
    expect(expedition.ok).toBe(false);
    expect(expedition.save).toBe(initial);
  });

  it('does not overflow the clock when a staged expedition reaches the next encounter', () => {
    const initial = createInitialVillageSave(127);
    const started = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const expedition = started.save.run.expedition;
    if (!expedition) throw new Error('expedition was not started');
    expedition.id = 'staged-clock-overflow';
    expedition.startedAt = Number.MAX_SAFE_INTEGER - 1_000;
    expedition.completesAt = Number.MAX_SAFE_INTEGER - 1;
    started.save.run.hero.atk = Number.MAX_SAFE_INTEGER;
    started.save.run.hero.def = Number.MAX_SAFE_INTEGER;
    started.save.run.hero.hp = Number.MAX_SAFE_INTEGER;
    started.save.run.hero.hpMax = Number.MAX_SAFE_INTEGER;

    const settled = completeFacilityTasks(started.save, expedition.completesAt);
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;

    expect(settled.run.expedition).toMatchObject({
      encounterIndex: 0,
      startedAt: Number.MAX_SAFE_INTEGER - 1_000,
      completesAt: Number.MAX_SAFE_INTEGER - 1,
    });
    expect(persistVillageSave(settled, fakeStorage)).toBe(true);
    expect(loadVillageSave(fakeStorage)).not.toBeNull();
  });

  it('saturates malformed expedition totals before writing a result save', () => {
    const initial = createInitialVillageSave(128);
    const started = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const expedition = started.save.run.expedition;
    if (!expedition) throw new Error('expedition was not started');
    expedition.id = 'malformed-expedition-totals';
    expedition.encounterIndex = 2;
    expedition.startedAt = started.save.updatedAt;
    expedition.completesAt = started.save.updatedAt;
    expedition.encountersCleared = Number.MAX_VALUE;
    expedition.totalTurns = Number.MAX_VALUE;
    expedition.totalDamageDealt = Number.MAX_VALUE;
    expedition.totalDamageTaken = Number.MAX_VALUE;

    const settled = completeFacilityTasks(started.save, expedition.completesAt);
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;
    const result = settled.run.lastExpeditionResult;

    expect(result).not.toBeNull();
    expect(result?.encountersCleared).toBe(3);
    expect(result?.turns).toBe(Number.MAX_SAFE_INTEGER);
    expect(result?.totalDamageDealt).toBe(Number.MAX_SAFE_INTEGER);
    expect(result?.totalDamageTaken).toBe(Number.MAX_SAFE_INTEGER);
    expect(persistVillageSave(settled, fakeStorage)).toBe(true);
    expect(loadVillageSave(fakeStorage)).not.toBeNull();
  });

  it('saturates malformed expedition rewards before writing a result save', () => {
    const initial = createInitialVillageSave(129);
    const started = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const expedition = started.save.run.expedition;
    if (!expedition) throw new Error('expedition was not started');
    expedition.id = 'e2e-victory-clock-guard';
    expedition.encounterIndex = 2;
    expedition.completesAt = expedition.startedAt;

    const realm = REALM_DEFINITIONS.sacred_fields;
    const originalReward = realm.reward;
    realm.reward = { gold: Number.MAX_VALUE };
    try {
      const settled = completeFacilityTasks(started.save, expedition.completesAt);
      const storage = new Map<string, string>();
      const fakeStorage = {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      } as unknown as Storage;

      expect(settled.run.lastExpeditionResult?.outcome).toBe('victory');
      expect(settled.run.lastExpeditionResult?.reward.gold).toBe(Number.MAX_SAFE_INTEGER);
      expect(persistVillageSave(settled, fakeStorage)).toBe(true);
      expect(loadVillageSave(fakeStorage)).not.toBeNull();
    } finally {
      realm.reward = originalReward;
    }
  });

  it('records one deterministic realm entrance and victory beat for each realm', () => {
    const initial = createInitialVillageSave(130);
    const started = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.save.meta.sagaEntries.some((entry) => entry.id === 'saga-realm-intro-sacred_fields')).toBe(true);

    started.save.run.expedition!.id = 'e2e-victory-4';
    started.save.run.hero.atk = 10_000;
    started.save.run.hero.def = 10_000;
    started.save.run.hero.defBase = 10_000;
    started.save.run.hero.hp = started.save.run.hero.hpMax;
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt;
    const completed = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);

    expect(completed.meta.sagaEntries.some((entry) => entry.id === 'saga-realm-victory-sacred_fields')).toBe(true);
    expect(completed.meta.sagaEntries.filter((entry) => entry.id === 'saga-realm-intro-sacred_fields')).toHaveLength(1);
    expect(completed.meta.sagaEntries.filter((entry) => entry.id === 'saga-realm-victory-sacred_fields')).toHaveLength(1);
  });

  it('records the underworld epilogue once while allowing another expedition afterward', () => {
    const initial = createInitialVillageSave(131);
    initial.meta.unlockedRealms.push('deep_forest', 'underworld');
    initial.run.hero.atk = 10_000;
    initial.run.hero.def = 10_000;
    initial.run.hero.defBase = 10_000;
    initial.run.hero.hp = initial.run.hero.hpMax;

    const first = startExpedition(initial, 'underworld', initial.updatedAt, 'aggression', null);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    first.save.run.expedition!.id = 'e2e-victory-4';
    first.save.run.expedition!.encounterIndex = 2;
    first.save.run.expedition!.completesAt = first.save.run.expedition!.startedAt;
    const firstCompleted = completeFacilityTasks(first.save, first.save.run.expedition!.completesAt);
    expect(firstCompleted.meta.sagaEntries.filter((entry) => entry.id === 'saga-epilogue-first-journey')).toHaveLength(1);

    const second = startExpedition(firstCompleted, 'underworld', firstCompleted.updatedAt + 1_000, 'aggression', null);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    second.save.run.expedition!.encounterIndex = 2;
    second.save.run.expedition!.completesAt = second.save.run.expedition!.startedAt;
    const secondCompleted = completeFacilityTasks(second.save, second.save.run.expedition!.completesAt);
    expect(secondCompleted.meta.sagaEntries.filter((entry) => entry.id === 'saga-epilogue-first-journey')).toHaveLength(1);
  });

  it('records the first trust-50 relationship beat once per agent', () => {
    const initial = createInitialVillageSave(132);
    const mudang = initial.meta.agents.find((agent) => agent.id === 'mudang');
    if (!mudang) throw new Error('mudang fixture missing');
    mudang.trust = 49;

    const first = startFacilityTask(initial, 'mudang', initial.updatedAt, 'mudang');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const firstCompleted = completeFacilityTasks(first.save, first.task.completesAt);
    expect(firstCompleted.meta.agents.find((agent) => agent.id === 'mudang')?.trust).toBe(50);
    expect(firstCompleted.meta.sagaEntries.filter((entry) => entry.id === 'saga-agent-trust-mudang-50')).toHaveLength(1);

    const second = startFacilityTask(firstCompleted, 'mudang', firstCompleted.updatedAt + 1_000, 'mudang');
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const secondCompleted = completeFacilityTasks(second.save, second.task.completesAt);
    expect(secondCompleted.meta.sagaEntries.filter((entry) => entry.id === 'saga-agent-trust-mudang-50')).toHaveLength(1);
  });

  it('updates guide level and records the trust-50 milestone once after expedition settlement', () => {
    const initial = createInitialVillageSave(133);
    initial.run.hero.atk = 10_000;
    initial.run.hero.def = 10_000;
    initial.run.hero.defBase = 10_000;
    initial.run.hero.hp = initial.run.hero.hpMax;
    const guide = initial.meta.agents.find((agent) => agent.id === 'guide');
    if (!guide) throw new Error('guide fixture missing');
    guide.trust = 49;
    guide.level = 1;

    const first = startExpedition(initial, 'sacred_fields', initial.updatedAt, 'aggression', 'guide');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    first.save.run.expedition!.id = 'e2e-victory-4';
    first.save.run.expedition!.encounterIndex = 2;
    first.save.run.expedition!.completesAt = first.save.run.expedition!.startedAt;
    const firstCompleted = completeFacilityTasks(first.save, first.save.run.expedition!.completesAt);

    expect(firstCompleted.meta.agents.find((agent) => agent.id === 'guide')).toMatchObject({
      trust: 51,
      level: 2,
    });
    expect(firstCompleted.meta.sagaEntries.filter((entry) => entry.id === 'saga-agent-trust-guide-50')).toHaveLength(1);

    const second = startExpedition(firstCompleted, 'sacred_fields', firstCompleted.updatedAt + 1_000, 'aggression', 'guide');
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    second.save.run.expedition!.encounterIndex = 2;
    second.save.run.expedition!.completesAt = second.save.run.expedition!.startedAt;
    const secondCompleted = completeFacilityTasks(second.save, second.save.run.expedition!.completesAt);
    expect(secondCompleted.meta.sagaEntries.filter((entry) => entry.id === 'saga-agent-trust-guide-50')).toHaveLength(1);
  });
});
