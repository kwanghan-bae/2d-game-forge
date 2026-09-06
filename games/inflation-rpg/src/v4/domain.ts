import { FACILITY_DEFINITIONS, AGENT_DEFINITIONS, REALM_DEFINITIONS } from './data';
import { createV4HeroRuntime } from './heroRuntime';
import { HeroLifecycle } from '../hero/HeroLifecycle';
import type {
  FacilityId,
  FacilityTask,
  ExpeditionResult,
  HeroAction,
  InterventionType,
  RealmId,
  SupportAgentId,
  V4CurrencyKey,
  RejuvenationResult,
  V4Policy,
  V4SaveEnvelope,
} from './types';

export type DomainResult<T extends V4SaveEnvelope = V4SaveEnvelope> =
  | { ok: true; save: T; task: FacilityTask }
  | { ok: false; save: V4SaveEnvelope; error: string };

export type HeroDomainResult =
  | { ok: true; save: V4SaveEnvelope; result: RejuvenationResult }
  | { ok: false; save: V4SaveEnvelope; error: string };

export type AgentDomainResult =
  | { ok: true; save: V4SaveEnvelope }
  | { ok: false; save: V4SaveEnvelope; error: string };

export type InterventionDomainResult =
  | { ok: true; save: V4SaveEnvelope; intervention: InterventionType }
  | { ok: false; save: V4SaveEnvelope; error: string };

export interface FacilityTaskPreview {
  facilityId: FacilityId;
  durationSeconds: number;
  input: Partial<Record<V4CurrencyKey, number>>;
  output: Partial<Record<V4CurrencyKey, number>>;
  outputEquipmentIds: string[];
  assignedAgentId: SupportAgentId | null;
  canStart: boolean;
  error: string | null;
}

export type FacilityUpgradeCost = { gold: number; materials: number };

export const MAX_INTERVENTION_CHARGES = 3;
export const AGENT_REST_RECOVERY = 25;
const FACILITY_OUTPUT_PER_LEVEL = 0.18;
const FACILITY_UPGRADE_GROWTH = 1.35;

function cloneSave(save: V4SaveEnvelope): V4SaveEnvelope {
  return JSON.parse(JSON.stringify(save)) as V4SaveEnvelope;
}

function canPay(save: V4SaveEnvelope, input: Partial<Record<V4CurrencyKey, number>>): boolean {
  return Object.entries(input).every(([key, value]) => save.meta.currencies[key as V4CurrencyKey] >= (value ?? 0));
}

function pay(save: V4SaveEnvelope, input: Partial<Record<V4CurrencyKey, number>>): void {
  for (const [key, value] of Object.entries(input)) {
    const currency = key as V4CurrencyKey;
    save.meta.currencies[currency] -= value ?? 0;
  }
}

function give(save: V4SaveEnvelope, output: Partial<Record<V4CurrencyKey, number>>, multiplier = 1): void {
  for (const [key, value] of Object.entries(output)) {
    const currency = key as V4CurrencyKey;
    save.meta.currencies[currency] += Math.floor((value ?? 0) * multiplier);
  }
}

function scaleResources(
  output: Partial<Record<V4CurrencyKey, number>>,
  multiplier: number,
): Partial<Record<V4CurrencyKey, number>> {
  return Object.fromEntries(
    Object.entries(output).map(([key, value]) => [key, Math.floor((value ?? 0) * multiplier)]),
  ) as Partial<Record<V4CurrencyKey, number>>;
}

function nextTaskId(save: V4SaveEnvelope, prefix: string, now: number): string {
  return `${prefix}-${now}-${Object.keys(save.meta.tasks).length + 1}`;
}

function advanceHeroActionsInPlace(save: V4SaveEnvelope, actions: number, now: number): void {
  const amount = Math.floor(actions);
  if (!Number.isFinite(actions) || amount <= 0) return;

  const hero = save.run.hero;
  const previousAge = hero.age;
  hero.actionCount += amount;
  hero.age = Math.max(previousAge, HeroLifecycle.ageFromActions(hero.actionCount));
  if (hero.age > previousAge) {
    save.meta.sagaEntries.unshift({
      id: `saga-aging-${now}-${hero.actionCount}`,
      kind: 'milestone',
      createdAt: now,
      title: '영웅의 시간',
      text: `${hero.name}이(가) ${previousAge}세에서 ${hero.age}세로 한 걸음 나아갔다.`,
    });
  }
}

/** Advances the V4 hero's action clock without mutating the source save. */
export function advanceHeroActions(source: V4SaveEnvelope, actions: number, now: number): V4SaveEnvelope {
  const amount = Math.floor(actions);
  if (!Number.isFinite(actions) || amount <= 0) return source;
  const save = cloneSave(source);
  advanceHeroActionsInPlace(save, amount, now);
  save.updatedAt = now;
  return save;
}

/**
 * Exposes the same next-action decision used by the hero runtime to the hub.
 * It is a read-only forecast; starting a task or expedition remains an
 * explicit player action and therefore cannot be triggered by rendering.
 */
export function getHeroNextAction(source: V4SaveEnvelope): HeroAction {
  const hero = source.run.hero;
  if (source.run.expedition) return 'expedition';
  if (Object.values(source.meta.tasks).some((task) => task.facilityId === 'training')) return 'train';
  return createV4HeroRuntime(hero).chooseAction({
    hp: hero.hp,
    hpMax: hero.hpMax,
    policy: source.run.policy,
    expeditionAvailable: source.meta.unlockedRealms.length > 0,
  });
}

function facilityTaskEconomy(
  save: V4SaveEnvelope,
  facilityId: FacilityId,
  assignedAgentId: SupportAgentId | null,
): Pick<FacilityTaskPreview, 'durationSeconds' | 'input' | 'output' | 'outputEquipmentIds'> {
  const facility = save.meta.facilities[facilityId];
  const definition = FACILITY_DEFINITIONS[facilityId];
  const agent = assignedAgentId ? save.meta.agents.find((item) => item.id === assignedAgentId) : undefined;
  const specialty = Boolean(
    agent && agent.trust >= 50 && AGENT_DEFINITIONS[agent.id].specialty === facilityId,
  );
  const fatigueMultiplier = agent && agent.fatigue >= 80 ? 1.15 : 1;
  const durationSeconds = Math.max(10, Math.round(
    (definition?.baseDurationSeconds ?? 0) * Math.pow(0.94, (facility?.level ?? 1) - 1)
      * (specialty ? 0.85 : 1) * fatigueMultiplier,
  ));
  const outputMultiplier = (specialty ? 1.2 : 1)
    * (1 + FACILITY_OUTPUT_PER_LEVEL * ((facility?.level ?? 1) - 1));
  return {
    durationSeconds,
    input: { ...(definition?.input ?? {}) },
    output: Object.fromEntries(
      Object.entries(definition?.output ?? {}).map(([key, value]) => [key, Math.floor((value ?? 0) * outputMultiplier)]),
    ) as Partial<Record<V4CurrencyKey, number>>,
    outputEquipmentIds: definition?.outputEquipmentIds ? [...definition.outputEquipmentIds] : [],
  };
}

/**
 * Returns the exact economy shown by the hub before a task is committed.
 * Keeping this beside startFacilityTask prevents UI previews from drifting
 * away from the actual duration, cost, and output rules.
 */
export function getFacilityTaskPreview(
  source: V4SaveEnvelope,
  facilityId: FacilityId,
  assignedAgentId: SupportAgentId | null = null,
): FacilityTaskPreview {
  const facility = source.meta.facilities[facilityId];
  const definition = FACILITY_DEFINITIONS[facilityId];
  const agent = assignedAgentId ? source.meta.agents.find((item) => item.id === assignedAgentId) : undefined;
  const economy = facilityTaskEconomy(source, facilityId, assignedAgentId);
  let error: string | null = null;

  if (!facility || !definition || facility.level < 1) {
    error = '아직 사용할 수 없는 시설입니다.';
  } else if (facility.activeTaskId) {
    error = '이 시설에는 이미 진행 중인 작업이 있습니다.';
  } else if (facilityId === 'training' && source.run.expedition) {
    error = '원정 중인 영웅은 훈련소 작업을 시작할 수 없습니다.';
  } else if (assignedAgentId && (!agent || agent.activeTaskId)) {
    error = '해당 지원 에이전트가 다른 작업 중입니다.';
  } else if (agent && agent.fatigue >= 100) {
    error = '지원 에이전트가 너무 피로합니다. 휴식 후 다시 배정하세요.';
  } else if (!canPay(source, economy.input)) {
    error = '작업에 필요한 재화가 부족합니다.';
  }

  return {
    facilityId,
    ...economy,
    assignedAgentId,
    canStart: error === null,
    error,
  };
}

function syncHeroAction(save: V4SaveEnvelope): void {
  if (save.run.expedition) {
    save.run.hero.currentAction = 'expedition';
    return;
  }
  save.run.hero.currentAction = Object.values(save.meta.tasks).some((task) => task.facilityId === 'training')
    ? 'train'
    : 'rest';
}

function applyHeroExperience(save: V4SaveEnvelope, amount: number): number {
  const hero = save.run.hero;
  hero.exp += Math.max(0, Math.floor(amount));
  let levelsGained = 0;
  while (hero.exp >= hero.level * 100) {
    hero.exp -= hero.level * 100;
    hero.level += 1;
    hero.atk += 20;
    hero.def += 10;
    hero.defBase += 10;
    hero.hpMax += 100;
    hero.hp = Math.min(hero.hpMax, hero.hp + 100);
    levelsGained += 1;
  }
  return levelsGained;
}

export function startFacilityTask(
  source: V4SaveEnvelope,
  facilityId: FacilityId,
  now: number,
  assignedAgentId: SupportAgentId | null = null,
): DomainResult {
  const preview = getFacilityTaskPreview(source, facilityId, assignedAgentId);
  if (!preview.canStart) {
    return { ok: false, save: source, error: preview.error ?? '작업을 시작할 수 없습니다.' };
  }

  const save = cloneSave(source);
  const facility = save.meta.facilities[facilityId];
  const definition = FACILITY_DEFINITIONS[facilityId];
  const agent = assignedAgentId ? save.meta.agents.find((item) => item.id === assignedAgentId) : undefined;
  if (!facility || !definition) return { ok: false, save: source, error: '아직 사용할 수 없는 시설입니다.' };

  pay(save, preview.input);
  const task: FacilityTask = {
    id: nextTaskId(save, facilityId, now),
    facilityId,
    type: definition.taskLabelKR,
    startedAt: now,
    completesAt: now + preview.durationSeconds * 1000,
    input: preview.input,
    outputPreview: preview.output,
    outputEquipmentIds: preview.outputEquipmentIds.length > 0 ? preview.outputEquipmentIds : undefined,
    heroExpGain: definition.heroExpGain,
    assignedAgentId,
  };
  save.meta.tasks[task.id] = task;
  facility.activeTaskId = task.id;
  if (agent) agent.activeTaskId = task.id;
  syncHeroAction(save);
  save.updatedAt = now;
  return { ok: true, save, task };
}

export function cancelFacilityTask(
  source: V4SaveEnvelope,
  facilityId: FacilityId,
  now: number,
): DomainResult {
  const save = cloneSave(source);
  const facility = save.meta.facilities[facilityId];
  const taskId = facility?.activeTaskId;
  const task = taskId ? save.meta.tasks[taskId] : undefined;
  if (!facility || !task) {
    return { ok: false, save: source, error: '취소할 작업이 없습니다.' };
  }

  give(save, task.input, 0.8);
  facility.activeTaskId = null;
  delete save.meta.tasks[task.id];
  if (task.assignedAgentId) {
    const agent = save.meta.agents.find((item) => item.id === task.assignedAgentId);
    if (agent) agent.activeTaskId = null;
  }
  syncHeroAction(save);
  save.updatedAt = now;
  return { ok: true, save, task };
}

export function restAgent(
  source: V4SaveEnvelope,
  agentId: SupportAgentId,
  now: number,
): AgentDomainResult {
  const sourceAgent = source.meta.agents.find((agent) => agent.id === agentId);
  if (!sourceAgent) return { ok: false, save: source, error: '지원 에이전트를 찾을 수 없습니다.' };
  if (sourceAgent.activeTaskId) return { ok: false, save: source, error: '작업 중인 에이전트는 휴식할 수 없습니다.' };
  if (sourceAgent.fatigue <= 0) return { ok: false, save: source, error: '에이전트의 피로도가 이미 0입니다.' };

  const save = cloneSave(source);
  const agent = save.meta.agents.find((candidate) => candidate.id === agentId);
  if (!agent) return { ok: false, save: source, error: '지원 에이전트를 찾을 수 없습니다.' };
  agent.fatigue = Math.max(0, agent.fatigue - AGENT_REST_RECOVERY);
  save.meta.sagaEntries.unshift({
    id: `saga-agent-rest-${agentId}-${now}`,
    kind: 'facility',
    createdAt: now,
    title: `${agent.nameKR} 휴식`,
    text: `${agent.nameKR}이(가) 잠시 숨을 고르고 피로를 ${AGENT_REST_RECOVERY} 낮췄다.`,
  });
  save.updatedAt = now;
  return { ok: true, save };
}

export function rejuvenateHero(source: V4SaveEnvelope, years: number, now: number): HeroDomainResult {
  if (!Number.isFinite(years) || years <= 0) {
    return { ok: false, save: source, error: '회춘할 기간을 확인해 주세요.' };
  }
  if (source.run.expedition) {
    return { ok: false, save: source, error: '원정 중에는 회춘 의식을 진행할 수 없습니다.' };
  }

  const save = cloneSave(source);
  const runtime = createV4HeroRuntime(save.run.hero);
  const result = runtime.rejuvenate(years);
  if (result.yearsReduced <= 0) {
    return { ok: false, save: source, error: '영웅은 이미 가장 젊은 상태입니다.' };
  }
  if (save.meta.currencies.gold < result.cost) {
    return { ok: false, save: source, error: `회춘 비용 ${result.cost} 금화가 부족합니다.` };
  }

  save.meta.currencies.gold -= result.cost;
  save.run.hero = result.snapshot;
  save.meta.sagaEntries.unshift({
    id: `saga-rejuvenation-${now}`,
    kind: 'rejuvenation',
    createdAt: now,
    title: '영원의 회춘 의식',
    text: `${save.run.hero.name}의 시간이 ${result.yearsReduced}년 되돌아갔다.`,
  });
  save.updatedAt = now;
  return { ok: true, save, result };
}

function calculateHeroPower(save: V4SaveEnvelope): number {
  const hero = save.run.hero;
  return hero.atk + hero.def + Math.floor(hero.hpMax / 100) + hero.equipmentIds.length * 30;
}

function resolveExpedition(save: V4SaveEnvelope, now: number, allowPermanentUnlock: boolean, efficiency: number): void {
  while (save.run.expedition) {
    const expedition = save.run.expedition;
    if (expedition.completesAt > now || expedition.status === 'awaiting_confirmation') return;

    const realm = REALM_DEFINITIONS[expedition.realmId];
    // Saves created before staged expeditions have no encounterIndex. Treat
    // them as already at the boss so schema 1 resumes without replaying work.
    const isLegacySingleEncounter = expedition.encounterIndex === undefined;
    const encounterIndex = isLegacySingleEncounter
      ? realm.encounters.length - 1
      : Math.min(realm.encounters.length - 1, Math.max(0, Math.floor(expedition.encounterIndex ?? 0)));
    const encounter = realm.encounters[encounterIndex] ?? realm.encounters[realm.encounters.length - 1];
    if (!encounter) return;
    const isBoss = isLegacySingleEncounter || encounter.tier === 'boss';
    if (!allowPermanentUnlock && !realm.offlineSafe && isBoss) {
      expedition.status = 'awaiting_confirmation';
      return;
    }

    const guide = expedition.assignedAgentId === 'guide' ? save.meta.agents.find((agent) => agent.id === 'guide') : undefined;
    const guideBonus = guide ? Math.min(0.12, guide.trust / 500) : 0;
    const runtime = createV4HeroRuntime(save.run.hero);
    const battle = runtime.resolveBattle({
      heroAtk: save.run.hero.atk,
      heroDef: save.run.hero.def,
      heroHp: save.run.hero.hp,
      enemyHp: encounter.recommendedPower * encounter.enemyHpMultiplier,
      enemyAtk: encounter.recommendedPower * encounter.enemyAtkMultiplier,
    });
    // One resolved encounter represents one meaningful hero action. Keeping
    // the clock at encounter granularity makes aging predictable and keeps it
    // independent from the number of turns inside the battle loop.
    advanceHeroActionsInPlace(save, 1, now);
    const heroPower = calculateHeroPower(save);
    const won = battle.won && heroPower >= encounter.recommendedPower * (1 - guideBonus);
    save.run.hero.hp = battle.heroRemainingHp;
    expedition.encountersCleared = (expedition.encountersCleared ?? 0) + 1;
    expedition.totalTurns = (expedition.totalTurns ?? 0) + battle.turns;
    expedition.totalDamageDealt = (expedition.totalDamageDealt ?? 0) + battle.totalDamageDealt;
    expedition.totalDamageTaken = (expedition.totalDamageTaken ?? 0) + battle.totalDamageTaken;

    if (won && !isBoss) {
      const nextEncounter = realm.encounters[encounterIndex + 1];
      if (!nextEncounter) return;
      expedition.encounterIndex = encounterIndex + 1;
      expedition.startedAt = expedition.completesAt;
      expedition.completesAt = expedition.startedAt + Math.max(1, Math.round(nextEncounter.durationSeconds * (guide ? 0.9 : 1))) * 1000;
      continue;
    }

    const policyBonus = expedition.policy === 'aggression' ? 1.1 : expedition.policy === 'hoarding' ? 0.9 : 1;
    const reward = won ? scaleResources(realm.reward, policyBonus * efficiency) : {};
    const totalTurns = expedition.totalTurns ?? battle.turns;
    const totalDamageDealt = expedition.totalDamageDealt ?? battle.totalDamageDealt;
    const totalDamageTaken = expedition.totalDamageTaken ?? battle.totalDamageTaken;
    const encountersCleared = expedition.encountersCleared ?? 1;
    const totalEncounterCount = realm.encounters.length;
    const lowHp = save.run.hero.hpMax > 0 && save.run.hero.hp / save.run.hero.hpMax < 0.35;
    const recommendedFacilityId = lowHp
      ? 'recovery'
      : heroPower < encounter.recommendedPower
        ? 'training'
        : 'blacksmith';
    const expeditionResult: ExpeditionResult = {
      id: expedition.id,
      realmId: expedition.realmId,
      outcome: won ? 'victory' : 'defeat',
      completedAt: now,
      reward,
      heroPower,
      recommendedPower: encounter.recommendedPower,
      turns: totalTurns,
      totalDamageDealt,
      totalDamageTaken,
      heroRemainingHp: battle.heroRemainingHp,
      weaknessKR: won
        ? '다음 Realm에 도전하려면 장비와 지원 에이전트를 함께 점검하세요.'
        : lowHp
          ? '영웅의 HP가 부족했습니다. 회복당에서 먼저 회복하세요.'
          : heroPower < encounter.recommendedPower
            ? '전투력이 부족했습니다. 훈련소와 대장간을 먼저 강화하세요.'
            : '정책과 길잡이의 보정을 확인한 뒤 다시 도전하세요.',
      recommendedFacilityId,
      recommendedEquipmentId: save.run.hero.equipmentIds.includes('v4_iron_sword') ? null : 'v4_iron_sword',
      retryAfterSeconds: won ? 0 : encounter.durationSeconds,
      encountersCleared,
      totalEncounterCount,
    };
    if (won) {
      give(save, realm.reward, policyBonus * efficiency);
      save.run.hero.realmId = expedition.realmId;
      save.run.hero.currentAction = 'rest';
      if (allowPermanentUnlock) {
        const next: RealmId | undefined = expedition.realmId === 'joseon_plains'
          ? 'deep_forest' : expedition.realmId === 'deep_forest' ? 'underworld' : undefined;
        if (next && !save.meta.unlockedRealms.includes(next)) save.meta.unlockedRealms.push(next);
      }
      save.meta.sagaEntries.unshift({
        id: `saga-expedition-${expedition.id}`,
        kind: 'expedition',
        createdAt: now,
        title: `${realm.nameKR} 원정 성공`,
        text: `${save.run.hero.name}이(가) ${realm.boss}을(를) 넘어 마을로 돌아왔다.`,
      });
    } else {
      save.run.hero.currentAction = 'rest';
      save.meta.sagaEntries.unshift({
        id: `saga-expedition-${expedition.id}`,
        kind: 'expedition',
        createdAt: now,
        title: `${realm.nameKR} 원정 중단`,
        text: `${encounter.nameKR}에서 힘이 부족해 돌아왔다. 다음 시설과 장비를 준비하자.`,
      });
    }
    save.run.lastExpeditionResult = expeditionResult;
    save.run.expedition = null;
    if (guide) {
      guide.activeTaskId = null;
      guide.fatigue = Math.min(100, guide.fatigue + 8);
      guide.trust = Math.min(100, guide.trust + (won ? 2 : 1));
    }
  }
}

export function completeFacilityTasks(
  source: V4SaveEnvelope,
  now: number,
  outputEfficiency = 1,
  allowPermanentUnlock = true,
): V4SaveEnvelope {
  const save = cloneSave(source);
  for (const task of Object.values(save.meta.tasks)) {
    if (task.completesAt > now) continue;
    const facility = save.meta.facilities[task.facilityId];
    give(save, task.outputPreview, outputEfficiency);
    if (task.outputEquipmentIds) {
      save.run.hero.equipmentIds.push(...task.outputEquipmentIds);
    }
    if (task.heroExpGain) {
      const levelsGained = applyHeroExperience(save, task.heroExpGain * outputEfficiency);
      if (levelsGained > 0) {
        save.meta.sagaEntries.unshift({
          id: `saga-level-${task.id}`,
          kind: 'milestone',
          createdAt: now,
          title: '영웅의 성장',
          text: `${save.run.hero.name}이(가) ${levelsGained}단계 성장해 Lv.${save.run.hero.level}이 되었다.`,
        });
      }
    }
    if (task.facilityId === 'training') advanceHeroActionsInPlace(save, 1, now);
    if (facility) facility.activeTaskId = null;
    if (task.assignedAgentId) {
      const agent = save.meta.agents.find((item) => item.id === task.assignedAgentId);
      if (agent) {
        agent.activeTaskId = null;
        agent.fatigue = Math.min(100, agent.fatigue + 5);
        agent.trust = Math.min(100, agent.trust + 1);
        agent.level = Math.max(agent.level, Math.min(3, 1 + Math.floor(agent.trust / 50)));
      }
    }
    if (task.facilityId === 'recovery') {
      save.run.hero.hp = save.run.hero.hpMax;
    }
    save.meta.sagaEntries.unshift({
      id: `saga-facility-${task.id}`,
      kind: 'facility',
      createdAt: now,
      title: `${FACILITY_DEFINITIONS[task.facilityId].nameKR} 작업 완료`,
      text: `${task.type} 작업이 완료되어 마을에 결과가 쌓였다.`,
    });
    delete save.meta.tasks[task.id];
  }
  resolveExpedition(save, now, allowPermanentUnlock, outputEfficiency);
  syncHeroAction(save);
  save.updatedAt = now;
  save.lastProcessedAt = Math.max(save.lastProcessedAt, now);
  return save;
}

export function completeFacilityTaskNow(
  source: V4SaveEnvelope,
  facilityId: FacilityId,
  now: number,
): DomainResult {
  const prepared = cloneSave(source);
  const facility = prepared.meta.facilities[facilityId];
  const taskId = facility?.activeTaskId;
  const task = taskId ? prepared.meta.tasks[taskId] : undefined;
  if (!facility || !task) {
    return { ok: false, save: source, error: '즉시 완료할 작업이 없습니다.' };
  }
  task.completesAt = now;
  return { ok: true, save: completeFacilityTasks(prepared, now), task };
}

/** Explicit player confirmation for a risky expedition held by offline settlement. */
export function confirmPendingExpedition(source: V4SaveEnvelope, now: number): V4SaveEnvelope {
  if (source.run.expedition?.status !== 'awaiting_confirmation') return source;
  const save = cloneSave(source);
  if (!save.run.expedition) return source;
  save.run.expedition.status = 'traveling';
  return completeFacilityTasks(save, now, 1, true);
}

export function grantOfflineResourceBonus(
  source: V4SaveEnvelope,
  gains: Partial<Record<V4CurrencyKey, number>>,
  now: number,
): V4SaveEnvelope {
  const save = cloneSave(source);
  const positiveGains = Object.fromEntries(
    Object.entries(gains).map(([key, value]) => [key, Math.max(0, value ?? 0)]),
  ) as Partial<Record<V4CurrencyKey, number>>;
  give(save, positiveGains);
  save.updatedAt = now;
  return save;
}

export function grantInterventionCharge(source: V4SaveEnvelope, now: number): V4SaveEnvelope {
  const save = cloneSave(source);
  save.run.interventionCharges = Math.min(
    MAX_INTERVENTION_CHARGES,
    save.run.interventionCharges + 1,
  );
  save.updatedAt = now;
  return save;
}

export function useIntervention(
  source: V4SaveEnvelope,
  intervention: InterventionType,
  now: number,
): InterventionDomainResult {
  if (source.run.interventionCharges <= 0) {
    return { ok: false, save: source, error: '신의 개입 충전이 없습니다.' };
  }

  const save = cloneSave(source);
  const hero = save.run.hero;
  if (intervention === 'heal') {
    if (hero.hp >= hero.hpMax) {
      return { ok: false, save: source, error: '영웅의 HP가 이미 가득 찼습니다.' };
    }
    hero.hp = hero.hpMax;
    save.run.interventionCharges -= 1;
    save.meta.sagaEntries.unshift({
      id: `saga-intervention-heal-${now}`,
      kind: 'milestone',
      createdAt: now,
      title: '신의 개입: 즉시 회복',
      text: `${hero.name}의 상처가 신력으로 즉시 아물었다.`,
    });
    save.updatedAt = now;
    return { ok: true, save, intervention };
  }

  const expedition = save.run.expedition;
  if (!expedition) {
    return { ok: false, save: source, error: '후퇴할 원정이 없습니다.' };
  }

  const realm = REALM_DEFINITIONS[expedition.realmId];
  // A retreat refunds half of the preparation cost. It preserves the
  // no-permanent-loss rule while making the charge a meaningful safety valve.
  give(save, realm.cost, 0.5);
  save.run.expedition = null;
  hero.currentAction = 'rest';
  save.run.interventionCharges -= 1;
  if (expedition.assignedAgentId) {
    const agent = save.meta.agents.find((item) => item.id === expedition.assignedAgentId);
    if (agent) {
      agent.activeTaskId = null;
      agent.fatigue = Math.min(100, agent.fatigue + 2);
    }
  }
  save.meta.sagaEntries.unshift({
    id: `saga-intervention-retreat-${now}`,
    kind: 'expedition',
    createdAt: now,
    title: '신의 개입: 원정 후퇴',
    text: `${hero.name}이(가) 신의 명을 받아 ${realm.nameKR}에서 안전하게 돌아왔다.`,
  });
  save.updatedAt = now;
  return { ok: true, save, intervention };
}

export function startExpedition(
  source: V4SaveEnvelope,
  realmId: RealmId,
  now: number,
  policy: V4Policy,
  assignedAgentId: SupportAgentId | null,
): DomainResult {
  const save = cloneSave(source);
  const realm = REALM_DEFINITIONS[realmId];
  if (!save.meta.unlockedRealms.includes(realmId)) {
    return { ok: false, save: source, error: '아직 기록되지 않은 Realm입니다.' };
  }
  if (save.run.expedition) {
    return { ok: false, save: source, error: '동시에 진행할 수 있는 원정은 1개뿐입니다.' };
  }
  if (save.run.hero.hp <= 0) {
    return { ok: false, save: source, error: '영웅이 쓰러져 있습니다. 회복당에서 먼저 회복하세요.' };
  }
  if (Object.values(save.meta.tasks).some((task) => task.facilityId === 'training')) {
    return { ok: false, save: source, error: '영웅이 훈련 중입니다. 훈련을 마친 뒤 원정을 시작하세요.' };
  }
  if (assignedAgentId && assignedAgentId !== 'guide') {
    return { ok: false, save: source, error: '원정에는 길잡이만 배정할 수 있습니다.' };
  }
  if (!canPay(save, realm.cost)) {
    return { ok: false, save: source, error: '원정 준비에 필요한 신력 또는 재료가 부족합니다.' };
  }
  if (assignedAgentId && !save.meta.agents.some((agent) => agent.id === assignedAgentId && !agent.activeTaskId)) {
    return { ok: false, save: source, error: '길잡이가 다른 작업 중입니다.' };
  }
  pay(save, realm.cost);
  const guideBonus = assignedAgentId === 'guide' ? 0.9 : 1;
  const firstEncounterDuration = realm.encounters[0]?.durationSeconds ?? realm.durationSeconds;
  const id = `expedition-${realmId}-${now}`;
  save.run.expedition = {
    id,
    realmId,
    policy,
    assignedAgentId,
    startedAt: now,
    completesAt: now + Math.max(1, Math.round(firstEncounterDuration * guideBonus)) * 1000,
    status: 'traveling',
    encounterIndex: 0,
    encountersCleared: 0,
    totalTurns: 0,
    totalDamageDealt: 0,
    totalDamageTaken: 0,
  };
  save.run.lastExpeditionResult = null;
  save.run.hero.currentAction = 'expedition';
  if (assignedAgentId) {
    const agent = save.meta.agents.find((item) => item.id === assignedAgentId);
    if (agent) agent.activeTaskId = id;
  }
  save.updatedAt = now;
  return {
    ok: true,
    save,
    task: {
      id,
      facilityId: 'expedition',
      type: '원정',
      startedAt: now,
      completesAt: save.run.expedition.completesAt,
      input: realm.cost,
      outputPreview: realm.reward,
      assignedAgentId,
    },
  };
}

export function setV4Policy(source: V4SaveEnvelope, policy: V4Policy, now: number): V4SaveEnvelope {
  const save = cloneSave(source);
  save.run.policy = policy;
  save.updatedAt = now;
  return save;
}

export function upgradeFacility(source: V4SaveEnvelope, facilityId: FacilityId, now: number): DomainResult {
  const save = cloneSave(source);
  const facility = save.meta.facilities[facilityId];
  if (!facility) return { ok: false, save: source, error: '시설을 찾을 수 없습니다.' };
  if (facility.activeTaskId) return { ok: false, save: source, error: '작업 중인 시설은 강화할 수 없습니다.' };
  const cost = getFacilityUpgradeCost(source, facilityId);
  if (!cost) return { ok: false, save: source, error: '시설을 찾을 수 없습니다.' };
  if (!canPay(save, cost)) return { ok: false, save: source, error: '시설 강화 재료가 부족합니다.' };
  pay(save, cost);
  facility.level += 1;
  save.updatedAt = now;
  return {
    ok: true,
    save,
    task: {
      id: `upgrade-${facilityId}-${now}`,
      facilityId,
      type: '시설 강화',
      startedAt: now,
      completesAt: now,
      input: cost,
      outputPreview: {},
      assignedAgentId: null,
    },
  };
}

export function getFacilityUpgradeCost(
  source: V4SaveEnvelope,
  facilityId: FacilityId,
): FacilityUpgradeCost | null {
  const facility = source.meta.facilities[facilityId];
  if (!facility) return null;
  const growth = Math.pow(FACILITY_UPGRADE_GROWTH, facility.level - 1);
  return {
    gold: Math.floor(80 * growth),
    materials: Math.floor(4 * growth),
  };
}
