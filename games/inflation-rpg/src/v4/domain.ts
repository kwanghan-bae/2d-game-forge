import {
  getV4AgentDefinition,
  getV4FacilityDefinition,
  getV4RealmDefinition,
} from './data';
import { V4_MAX_INTERVENTION_CHARGES, V4_MAX_SAGA_ENTRIES } from './types';
import { applyV4EquipmentBonuses, getV4EquipmentBonuses, getV4EquipmentDefinition, getV4EquipmentName } from './equipment';
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
  V4Settings,
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
  heroExpGain: number;
  assignedAgentId: SupportAgentId | null;
  canStart: boolean;
  error: string | null;
}

export type FacilityUpgradeCost = { gold: number; materials: number };

export { V4_MAX_INTERVENTION_CHARGES as MAX_INTERVENTION_CHARGES } from './types';
export const AGENT_REST_RECOVERY = 25;
const FACILITY_OUTPUT_PER_LEVEL = 0.18;
const FACILITY_UPGRADE_GROWTH = 1.35;
const AGENT_OUTPUT_PER_LEVEL = 0.08;
const AGENT_SPEED_PER_LEVEL = 0.03;
const MAX_HERO_EXP_SETTLEMENT = 100_000;
const MAX_LEVELS_PER_SETTLEMENT = 1_000;
const MAX_ECONOMY_VALUE = Number.MAX_SAFE_INTEGER;
const BLACKSMITH_EQUIPMENT_UNLOCKS = [
  { id: 'v4_iron_sword', facilityLevel: 1 },
  { id: 'v4_guardian_armor', facilityLevel: 2 },
  { id: 'v4_spirit_talisman', facilityLevel: 3 },
] as const;

function positiveFiniteLevel(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 ? value : 1;
}

function boundedMultiplier(value: number): number {
  if (Number.isNaN(value) || value < 0) return 1;
  return Number.isFinite(value) ? Math.min(MAX_ECONOMY_VALUE, value) : MAX_ECONOMY_VALUE;
}

function safeScaledEconomyAmount(value: number | undefined, multiplier: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || multiplier <= 0) return 0;
  const scaled = value * multiplier;
  return Number.isFinite(scaled)
    ? Math.min(MAX_ECONOMY_VALUE, Math.max(0, Math.floor(scaled)))
    : MAX_ECONOMY_VALUE;
}

function safeDurationSeconds(value: number): number {
  if (!Number.isFinite(value)) return 10;
  return Math.min(MAX_ECONOMY_VALUE, Math.max(10, Math.round(value)));
}

function saturatingAdd(value: number, amount: number): number {
  const base = Number.isFinite(value) && value >= 0 ? Math.min(MAX_ECONOMY_VALUE, value) : 0;
  return Math.min(MAX_ECONOMY_VALUE, base + amount);
}

function saturatingCounterAdd(value: number | undefined, amount: number, cap = MAX_ECONOMY_VALUE): number {
  const base = Number.isFinite(value) && (value ?? 0) >= 0
    ? Math.min(cap, Math.floor(value ?? 0))
    : 0;
  const increment = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
  return Math.min(cap, base + increment);
}

function cloneSave(save: V4SaveEnvelope): V4SaveEnvelope {
  return JSON.parse(JSON.stringify(save)) as V4SaveEnvelope;
}

function isPersistableClock(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= MAX_ECONOMY_VALUE;
}

function eventTimestamp(save: V4SaveEnvelope, now: number): number {
  const requested = isPersistableClock(now)
    ? now
    : save.updatedAt;
  return Math.min(MAX_ECONOMY_VALUE, Math.max(save.updatedAt, requested));
}

function safeCompletionTimestamp(startedAt: number, durationSeconds: number): number | null {
  if (!isPersistableClock(startedAt) || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;
  const durationMs = durationSeconds * 1000;
  if (!Number.isFinite(durationMs) || durationMs > MAX_ECONOMY_VALUE - startedAt) return null;
  return startedAt + durationMs;
}

function touchSave(save: V4SaveEnvelope, now: number): void {
  const requested = eventTimestamp(save, now);
  save.updatedAt = Math.min(MAX_ECONOMY_VALUE, Math.max(save.updatedAt, save.lastProcessedAt, requested));
  if (save.meta.sagaEntries.length > V4_MAX_SAGA_ENTRIES) {
    save.meta.sagaEntries.length = V4_MAX_SAGA_ENTRIES;
  }
}

function isActionClockValid(save: V4SaveEnvelope, now: number): boolean {
  return isPersistableClock(now) && now >= save.updatedAt;
}

function isV4Policy(value: unknown): value is V4Policy {
  return value === 'aggression' || value === 'hoarding' || value === 'training';
}

function isInterventionType(value: unknown): value is InterventionType {
  return value === 'heal' || value === 'retreat';
}

function isValidInterventionCharges(value: number): boolean {
  return Number.isFinite(value)
    && Number.isInteger(value)
    && value >= 0
    && value <= V4_MAX_INTERVENTION_CHARGES;
}

function isValidCurrencyBalance(value: unknown): value is number {
  return isPersistableFiniteNumber(value) && Number.isSafeInteger(value) && value >= 0;
}

function isPersistableFiniteNumber(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Math.abs(value) <= MAX_ECONOMY_VALUE;
}

function canPay(save: V4SaveEnvelope, input: Partial<Record<V4CurrencyKey, number>>): boolean {
  return Object.entries(input).every(([key, value]) => {
    const balance = save.meta.currencies[key as V4CurrencyKey];
    return isValidCurrencyBalance(balance)
      && isValidCurrencyBalance(value)
      && balance >= value;
  });
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
    if (!Object.prototype.hasOwnProperty.call(save.meta.currencies, currency)
      || !Number.isFinite(value) || !Number.isFinite(multiplier) || value <= 0 || multiplier <= 0) continue;
    const amount = Math.floor(value * multiplier);
    const current = save.meta.currencies[currency];
    if (!Number.isFinite(amount) || !Number.isFinite(current) || current < 0
      || current > MAX_ECONOMY_VALUE) continue;
    const boundedAmount = Math.min(MAX_ECONOMY_VALUE, amount);
    save.meta.currencies[currency] = Math.min(MAX_ECONOMY_VALUE, current + boundedAmount);
  }
}

function normalizeSettlementEfficiency(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

function scaleResources(
  output: Partial<Record<V4CurrencyKey, number>>,
  multiplier: number,
): Partial<Record<V4CurrencyKey, number>> {
  return Object.fromEntries(
    Object.entries(output).map(([key, value]) => [key, safeScaledEconomyAmount(value, multiplier)]),
  ) as Partial<Record<V4CurrencyKey, number>>;
}

function isSaveIdUsed(save: V4SaveEnvelope, id: string): boolean {
  if (Object.prototype.hasOwnProperty.call(save.meta.tasks, id)) return true;
  if (save.run.expedition?.id === id || save.run.lastExpeditionResult?.id === id) return true;
  return save.meta.sagaEntries.some((entry) => entry.id === id || entry.id.endsWith(`-${id}`));
}

function nextSaveId(save: V4SaveEnvelope, base: string): string {
  if (!isSaveIdUsed(save, base)) return base;
  let suffix = 2;
  while (isSaveIdUsed(save, `${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function nextTaskId(save: V4SaveEnvelope, prefix: string, now: number): string {
  const timestamp = eventTimestamp(save, now);
  return nextSaveId(save, `${prefix}-${timestamp}-${Object.keys(save.meta.tasks).length + 1}`);
}

function advanceHeroActionsInPlace(save: V4SaveEnvelope, actions: number, now: number): void {
  const amount = Math.floor(actions);
  if (!Number.isFinite(actions) || amount <= 0) return;

  const eventAt = eventTimestamp(save, now);
  const hero = save.run.hero;
  const previousAge = hero.age;
  const currentActions = Number.isFinite(hero.actionCount) && Number.isInteger(hero.actionCount) && hero.actionCount >= 0
    ? Math.min(MAX_ECONOMY_VALUE, hero.actionCount)
    : 0;
  const nextActions = Math.min(MAX_ECONOMY_VALUE, currentActions + amount);
  const effectiveActions = nextActions - currentActions;
  if (effectiveActions <= 0) return;
  hero.actionCount = nextActions;
  hero.age = Math.max(previousAge, HeroLifecycle.ageFromActions(hero.actionCount));
  if (hero.age > previousAge) {
    save.meta.sagaEntries.unshift({
      id: nextSaveId(save, `saga-aging-${eventAt}-${hero.actionCount}`),
      kind: 'milestone',
      createdAt: eventAt,
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
  touchSave(save, now);
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

function savedEquipmentLevel(source: V4SaveEnvelope, equipmentId: string): number {
  const savedLevel = source.run.hero.equipmentLevels?.[equipmentId];
  if (typeof savedLevel === 'number' && Number.isFinite(savedLevel)) {
    return Math.min(20, Math.max(0, Math.floor(savedLevel)));
  }
  return source.run.hero.equipmentIds.includes(equipmentId) ? 1 : 0;
}

/**
 * Selects the next equipment reward for blacksmith work.
 *
 * Newly unlocked equipment takes priority over upgrades so a levelled-up
 * blacksmith reveals the full three-slot loadout before returning to the
 * weapon upgrade loop. Once every available item exists, the lowest-level
 * item is upgraded to keep the task useful without making higher-tier items
 * permanently unreachable.
 */
export function getBlacksmithEquipmentOutput(source: V4SaveEnvelope): string {
  const facilityLevel = positiveFiniteLevel(source.meta.facilities.blacksmith?.level);
  const available = BLACKSMITH_EQUIPMENT_UNLOCKS.filter(
    (equipment) => equipment.facilityLevel <= facilityLevel,
  );
  const nextMissing = available.find((equipment) => savedEquipmentLevel(source, equipment.id) < 1);
  if (nextMissing) return nextMissing.id;

  const nextUpgrade = available.reduce((selected, equipment) => {
    if (!selected) return equipment;
    return savedEquipmentLevel(source, equipment.id) < savedEquipmentLevel(source, selected.id)
      ? equipment
      : selected;
  }, available[0]);
  return nextUpgrade?.id ?? BLACKSMITH_EQUIPMENT_UNLOCKS[0].id;
}

/** Returns only a missing item so defeat guidance does not suggest re-crafting equipped gear. */
export function getBlacksmithEquipmentRecommendation(source: V4SaveEnvelope): string | null {
  const facilityLevel = positiveFiniteLevel(source.meta.facilities.blacksmith?.level);
  return BLACKSMITH_EQUIPMENT_UNLOCKS.find(
    (equipment) => equipment.facilityLevel <= facilityLevel && savedEquipmentLevel(source, equipment.id) < 1,
  )?.id ?? null;
}

function facilityTaskEconomy(
  save: V4SaveEnvelope,
  facilityId: FacilityId,
  assignedAgentId: SupportAgentId | null,
): Pick<FacilityTaskPreview, 'durationSeconds' | 'input' | 'output' | 'outputEquipmentIds' | 'heroExpGain'> {
  const facility = save.meta.facilities[facilityId];
  const definition = getV4FacilityDefinition(facilityId);
  const agent = assignedAgentId ? save.meta.agents.find((item) => item.id === assignedAgentId) : undefined;
  const facilityLevel = positiveFiniteLevel(facility?.level);
  const agentLevel = positiveFiniteLevel(agent?.level);
  const specialty = Boolean(
    agent && agent.trust >= 50 && getV4AgentDefinition(agent.id)?.specialty === facilityId,
  );
  const fatigueMultiplier = agent && agent.fatigue >= 80 ? 1.15 : 1;
  const agentSpeedMultiplier = agent ? Math.pow(1 - AGENT_SPEED_PER_LEVEL, Math.max(0, agentLevel - 1)) : 1;
  const durationSeconds = safeDurationSeconds(
    (definition?.baseDurationSeconds ?? 0) * Math.pow(0.94, facilityLevel - 1)
      * (specialty ? 0.85 : 1) * agentSpeedMultiplier * fatigueMultiplier,
  );
  const outputMultiplier = boundedMultiplier((specialty ? 1.2 : 1)
    * (1 + FACILITY_OUTPUT_PER_LEVEL * (facilityLevel - 1))
    * (agent ? 1 + AGENT_OUTPUT_PER_LEVEL * Math.max(0, agentLevel - 1) : 1));
  return {
    durationSeconds,
    input: { ...(definition?.input ?? {}) },
    output: Object.fromEntries(
      Object.entries(definition?.output ?? {}).map(([key, value]) => [key, safeScaledEconomyAmount(value, outputMultiplier)]),
    ) as Partial<Record<V4CurrencyKey, number>>,
    outputEquipmentIds: facilityId === 'blacksmith'
      ? [getBlacksmithEquipmentOutput(save)]
      : definition?.outputEquipmentIds ? [...definition.outputEquipmentIds] : [],
    heroExpGain: safeScaledEconomyAmount(definition?.heroExpGain, outputMultiplier),
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
  assignedAgentId?: SupportAgentId | null,
): FacilityTaskPreview {
  const hasAssignedAgentArgument = arguments.length >= 3;
  const requestedAgentId = hasAssignedAgentArgument ? assignedAgentId : null;
  const facility = source.meta.facilities[facilityId];
  const definition = getV4FacilityDefinition(facilityId);
  const agent = requestedAgentId ? source.meta.agents.find((item) => item.id === requestedAgentId) : undefined;
  const economy = facilityTaskEconomy(source, facilityId, requestedAgentId ?? null);
  let error: string | null = null;

  if (!facility || !definition
    || typeof facility.level !== 'number'
    || !Number.isFinite(facility.level)
    || !Number.isInteger(facility.level)
    || facility.level < 1) {
    error = '아직 사용할 수 없는 시설입니다.';
  } else if (hasAssignedAgentArgument && requestedAgentId === undefined) {
    error = '지원 에이전트를 찾을 수 없습니다.';
  } else if (facility.activeTaskId) {
    error = '이 시설에는 이미 진행 중인 작업이 있습니다.';
  } else if (facilityId === 'training' && source.run.expedition) {
    error = '원정 중인 영웅은 훈련소 작업을 시작할 수 없습니다.';
  } else if (requestedAgentId !== null && !agent) {
    error = '지원 에이전트를 찾을 수 없습니다.';
  } else if (requestedAgentId !== null && agent?.activeTaskId) {
    error = '해당 지원 에이전트가 다른 작업 중입니다.';
  } else if (requestedAgentId && agent && getV4AgentDefinition(agent.id)?.specialty !== facilityId) {
    error = '해당 지원 에이전트는 이 시설의 전문 담당자가 아닙니다.';
  } else if (agent && agent.fatigue >= 100) {
    error = '지원 에이전트가 너무 피로합니다. 휴식 후 다시 배정하세요.';
  } else if (!canPay(source, economy.input)) {
    error = '작업에 필요한 재화가 부족합니다.';
  }

  return {
    facilityId,
    ...economy,
    assignedAgentId: requestedAgentId ?? null,
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
  hero.level = Number.isFinite(hero.level) && Number.isInteger(hero.level) && hero.level >= 1 ? hero.level : 1;
  const currentExp = Number.isFinite(hero.exp) && hero.exp >= 0
    ? Math.min(MAX_HERO_EXP_SETTLEMENT, hero.exp)
    : 0;
  const safeAmount = Number.isFinite(amount) && amount > 0
    ? Math.min(MAX_HERO_EXP_SETTLEMENT, Math.floor(amount))
    : 0;
  hero.exp = Math.min(MAX_HERO_EXP_SETTLEMENT, currentExp + safeAmount);
  let levelsGained = 0;
  while (hero.exp >= hero.level * 100 && levelsGained < MAX_LEVELS_PER_SETTLEMENT) {
    hero.exp -= hero.level * 100;
    hero.level += 1;
    hero.atk = saturatingAdd(hero.atk, 20);
    hero.def = saturatingAdd(hero.def, 10);
    hero.defBase = saturatingAdd(hero.defBase, 10);
    hero.hpMax = Math.max(1, saturatingAdd(hero.hpMax, 100));
    hero.hp = Math.min(hero.hpMax, saturatingAdd(hero.hp, 100));
    levelsGained += 1;
  }
  if (levelsGained >= MAX_LEVELS_PER_SETTLEMENT) {
    hero.exp = Math.min(hero.exp, Math.max(0, hero.level * 100 - 1));
  }
  return levelsGained;
}

function grantEquipmentLevel(save: V4SaveEnvelope, equipmentId: string): void {
  if (!getV4EquipmentDefinition(equipmentId)) return;
  const hero = save.run.hero;
  const equipmentLevels = hero.equipmentLevels ?? {};
  const savedLevel = equipmentLevels[equipmentId] ?? 0;
  const currentLevel = Number.isFinite(savedLevel) ? Math.max(0, Math.floor(savedLevel)) : 0;
  if (currentLevel >= 20) return;
  if (!hero.equipmentIds.includes(equipmentId)) hero.equipmentIds.push(equipmentId);
  equipmentLevels[equipmentId] = Math.min(20, currentLevel + 1);
  hero.equipmentLevels = equipmentLevels;
  applyV4EquipmentBonuses(hero, getV4EquipmentBonuses([equipmentId], { [equipmentId]: 1 }));
}

export function startFacilityTask(
  source: V4SaveEnvelope,
  facilityId: FacilityId,
  now: number,
  assignedAgentId?: SupportAgentId | null,
): DomainResult {
  const hasAssignedAgentArgument = arguments.length >= 4;
  const requestedAgentId = hasAssignedAgentArgument ? assignedAgentId : null;
  const preview = getFacilityTaskPreview(
    source,
    facilityId,
    hasAssignedAgentArgument ? assignedAgentId : null,
  );
  if (!preview.canStart) {
    return { ok: false, save: source, error: preview.error ?? '작업을 시작할 수 없습니다.' };
  }

  const save = cloneSave(source);
  const eventAt = eventTimestamp(save, now);
  const facility = save.meta.facilities[facilityId];
  const definition = getV4FacilityDefinition(facilityId);
  const agent = requestedAgentId ? save.meta.agents.find((item) => item.id === requestedAgentId) : undefined;
  if (!facility || !definition) return { ok: false, save: source, error: '아직 사용할 수 없는 시설입니다.' };
  const completesAt = safeCompletionTimestamp(eventAt, preview.durationSeconds);
  if (completesAt === null) return { ok: false, save: source, error: '작업 시각 범위를 확인할 수 없어 시작하지 않았습니다.' };

  pay(save, preview.input);
  const taskLabel = facilityId === 'blacksmith' && preview.outputEquipmentIds[0]
    ? `${getV4EquipmentName(preview.outputEquipmentIds[0])} 제작`
    : definition.taskLabelKR;
  const task: FacilityTask = {
    id: nextTaskId(save, facilityId, eventAt),
    facilityId,
    type: taskLabel,
    startedAt: eventAt,
    completesAt,
    input: preview.input,
    outputPreview: preview.output,
    outputEquipmentIds: preview.outputEquipmentIds.length > 0 ? preview.outputEquipmentIds : undefined,
    heroExpGain: preview.heroExpGain > 0 ? preview.heroExpGain : undefined,
    assignedAgentId: requestedAgentId ?? null,
  };
  save.meta.tasks[task.id] = task;
  facility.activeTaskId = task.id;
  if (agent) agent.activeTaskId = task.id;
  syncHeroAction(save);
  touchSave(save, now);
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

  if (task.completesAt <= eventTimestamp(save, now)) {
    return {
      ok: false,
      save: source,
      error: '이미 완료된 작업입니다. 진행 확인으로 결과를 정산해 주세요.',
    };
  }

  give(save, task.input, 0.8);
  facility.activeTaskId = null;
  delete save.meta.tasks[task.id];
  if (task.assignedAgentId) {
    const agent = save.meta.agents.find((item) => item.id === task.assignedAgentId);
    if (agent) agent.activeTaskId = null;
  }
  syncHeroAction(save);
  touchSave(save, now);
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
  if (!Number.isFinite(sourceAgent.fatigue) || sourceAgent.fatigue < 0 || sourceAgent.fatigue > 100) {
    return { ok: false, save: source, error: '에이전트의 피로도를 확인할 수 없습니다.' };
  }
  if (sourceAgent.fatigue <= 0) return { ok: false, save: source, error: '에이전트의 피로도가 이미 0입니다.' };

  const save = cloneSave(source);
  const eventAt = eventTimestamp(save, now);
  const agent = save.meta.agents.find((candidate) => candidate.id === agentId);
  if (!agent) return { ok: false, save: source, error: '지원 에이전트를 찾을 수 없습니다.' };
  agent.fatigue = Math.max(0, agent.fatigue - AGENT_REST_RECOVERY);
  save.meta.sagaEntries.unshift({
    id: nextSaveId(save, `saga-agent-rest-${agentId}-${eventAt}`),
    kind: 'facility',
    createdAt: eventAt,
    title: `${agent.nameKR} 휴식`,
    text: `${agent.nameKR}이(가) 잠시 숨을 고르고 피로를 ${AGENT_REST_RECOVERY} 낮췄다.`,
  });
  touchSave(save, now);
  return { ok: true, save };
}

export function rejuvenateHero(source: V4SaveEnvelope, years: number, now: number): HeroDomainResult {
  if (!Number.isFinite(years) || years <= 0) {
    return { ok: false, save: source, error: '회춘할 기간을 확인해 주세요.' };
  }
  if (source.run.expedition) {
    return { ok: false, save: source, error: '원정 중에는 회춘 의식을 진행할 수 없습니다.' };
  }

  const gold = source.meta.currencies.gold;
  if (!isValidCurrencyBalance(gold)) {
    return { ok: false, save: source, error: '금화 잔액을 확인할 수 없어 회춘하지 않았습니다.' };
  }

  const eventAt = eventTimestamp(source, now);
  const runtime = createV4HeroRuntime(source.run.hero);
  const result = runtime.rejuvenate(years);
  if (result.yearsReduced <= 0) {
    return { ok: false, save: source, error: '영웅은 이미 가장 젊은 상태입니다.' };
  }
  if (gold < result.cost) {
    return { ok: false, save: source, error: `회춘 비용 ${result.cost} 금화가 부족합니다.` };
  }

  const save = cloneSave(source);
  save.meta.currencies.gold = gold;
  save.meta.currencies.gold -= result.cost;
  save.run.hero = result.snapshot;
  save.meta.sagaEntries.unshift({
    id: nextSaveId(save, `saga-rejuvenation-${eventAt}`),
    kind: 'rejuvenation',
    createdAt: eventAt,
    title: '영원의 회춘 의식',
    text: `${save.run.hero.name}의 시간이 ${result.yearsReduced}년 되돌아갔다.`,
  });
  touchSave(save, now);
  return { ok: true, save, result };
}

export function getV4HeroPower(save: V4SaveEnvelope): number {
  const hero = save.run.hero;
  const rawParts = [hero.atk, hero.def, hero.hpMax];
  // A present numeric NaN indicates a corrupted stat snapshot. Preserve the
  // existing fail-closed behavior for that case, while treating an omitted
  // field as zero instead of allowing derived arithmetic to poison every
  // otherwise valid combat stat.
  if (rawParts.some((part) => typeof part === 'number' && Number.isNaN(part))) return 0;
  const parts = rawParts.map((part, index) => {
    if (typeof part !== 'number') return 0;
    return index === 2 ? part / 100 : part;
  });
  let power = 0;
  for (const part of parts) {
    if (typeof part !== 'number') continue;
    if (part < 0) continue;
    const safePart = Number.isFinite(part)
      ? Math.min(MAX_ECONOMY_VALUE, Math.floor(part))
      : MAX_ECONOMY_VALUE;
    if (power >= MAX_ECONOMY_VALUE - safePart) return MAX_ECONOMY_VALUE;
    power += safePart;
  }
  return power;
}

const SUCCESS_BASE_BY_TIER = { normal: 0.92, elite: 0.72, boss: 0.55 } as const;

function clampSuccessChance(value: number): number {
  return Number.isFinite(value) ? Math.min(0.97, Math.max(0.05, value)) : 0.05;
}

export function getExpeditionSuccessChance(
  source: V4SaveEnvelope,
  realmId: RealmId,
  encounterIndex = 2,
  assignedAgentId: SupportAgentId | null = null,
): number {
  const realm = getV4RealmDefinition(realmId);
  const encounter = realm?.encounters[Math.min(realm.encounters.length - 1, Math.max(0, Math.floor(encounterIndex)))];
  if (!realm || !encounter) return 0.05;

  const readiness = getV4HeroPower(source) / Math.max(1, encounter.recommendedPower);
  const readinessBonus = Math.max(-0.35, Math.min(0.2, (readiness - 1) * 0.3));
  const guide = assignedAgentId === 'guide' ? source.meta.agents.find((agent) => agent.id === 'guide') : undefined;
  const guideIsAssignedToThisExpedition = Boolean(
    guide?.activeTaskId
      && source.run.expedition?.id === guide.activeTaskId
      && source.run.expedition.realmId === realmId
      && source.run.expedition.assignedAgentId === 'guide',
  );
  const guideIsAvailable = Boolean(
    guide
      && guide.fatigue < 100
      && (!guide.activeTaskId || guideIsAssignedToThisExpedition),
  );
  const guideTrust = guide && typeof guide.trust === 'number' && Number.isFinite(guide.trust)
    ? Math.max(0, guide.trust)
    : 0;
  const guideBonus = guideIsAvailable && guide
    ? Math.min(0.08, guideTrust / 1_250)
    : 0;
  // Once an expedition has departed, its policy is part of the immutable run
  // snapshot. The town policy can be changed for the next departure without
  // rewriting the battle forecast of the hero who is already travelling.
  const expeditionPolicy = source.run.expedition?.realmId === realmId
    ? source.run.expedition.policy
    : source.run.policy;
  const policyBonus = expeditionPolicy === 'hoarding'
    ? 0.04
    : expeditionPolicy === 'training'
      ? (encounter.tier === 'boss' ? -0.02 : 0.02)
      : 0;
  const mudangLevel = positiveFiniteLevel(source.meta.facilities.mudang?.level);
  const mudangBlessing = Math.min(0.06, Math.max(0, mudangLevel - 1) * 0.02);
  const heroHpMax = typeof source.run.hero.hpMax === 'number'
    && Number.isFinite(source.run.hero.hpMax)
    && source.run.hero.hpMax > 0
    ? Math.min(MAX_ECONOMY_VALUE, source.run.hero.hpMax)
    : 1;
  const heroHp = typeof source.run.hero.hp === 'number' && Number.isFinite(source.run.hero.hp)
    ? Math.min(heroHpMax, Math.max(0, source.run.hero.hp))
    : 0;
  const healthPenalty = heroHp / heroHpMax < 0.35 ? 0.15 : 0;
  return clampSuccessChance(
    SUCCESS_BASE_BY_TIER[encounter.tier] + readinessBonus + guideBonus + policyBonus
      + mudangBlessing - encounter.risk * 0.05 - healthPenalty,
  );
}

export function getNextRealmId(realmId: RealmId): RealmId | null {
  return realmId === 'joseon_plains' ? 'deep_forest' : realmId === 'deep_forest' ? 'underworld' : null;
}

function deterministicRoll(key: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) / 4_294_967_296;
}

function expeditionDurationSeconds(save: V4SaveEnvelope, baseDurationSeconds: number, hasGuide: boolean): number {
  const expeditionFacilityLevel = save.meta.facilities.expedition?.level ?? 1;
  return Math.max(1, Math.round(
    baseDurationSeconds * Math.pow(0.94, expeditionFacilityLevel - 1) * (hasGuide ? 0.9 : 1),
  ));
}

function resolveExpedition(
  save: V4SaveEnvelope,
  now: number,
  allowPermanentUnlock: boolean,
  efficiency: number,
  allowHistoricalSettlement = false,
  allowRiskyBossConfirmation = false,
): void {
  const eventAt = allowHistoricalSettlement ? now : eventTimestamp(save, now);
  while (save.run.expedition) {
    const expedition = save.run.expedition;
    if (expedition.completesAt > eventAt || expedition.status === 'awaiting_confirmation') return;

    const realm = getV4RealmDefinition(expedition.realmId);
    if (!realm) return;
    // Saves created before staged expeditions have no encounterIndex. Treat
    // them as already at the boss so schema 1 resumes without replaying work.
    const isLegacySingleEncounter = expedition.encounterIndex === undefined;
    const encounterIndex = isLegacySingleEncounter
      ? realm.encounters.length - 1
      : Math.min(realm.encounters.length - 1, Math.max(0, Math.floor(expedition.encounterIndex ?? 0)));
    const encounter = realm.encounters[encounterIndex] ?? realm.encounters[realm.encounters.length - 1];
    if (!encounter) return;
    const isBoss = isLegacySingleEncounter || encounter.tier === 'boss';
    if (!allowRiskyBossConfirmation && !allowPermanentUnlock && !realm.offlineSafe && isBoss) {
      expedition.status = 'awaiting_confirmation';
      return;
    }
    // Preflight the next stage before resolving this encounter. Without this
    // guard, a valid-but-near-ceiling completion time could resolve the battle
    // and then write an unsafe `completesAt` for the next encounter, leaving a
    // save that fails schema validation on the next load.
    const nextEncounter = !isBoss ? realm.encounters[encounterIndex + 1] : undefined;
    const nextCompletionAt = nextEncounter
      ? safeCompletionTimestamp(
        expedition.completesAt,
        expeditionDurationSeconds(save, nextEncounter.durationSeconds, expedition.assignedAgentId === 'guide'),
      )
      : null;
    if (nextEncounter && nextCompletionAt === null) return;

    const guide = expedition.assignedAgentId === 'guide' ? save.meta.agents.find((agent) => agent.id === 'guide') : undefined;
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
    advanceHeroActionsInPlace(save, 1, eventAt);
    const heroPower = getV4HeroPower(save);
    const successChance = getExpeditionSuccessChance(
      save,
      expedition.realmId,
      encounterIndex,
      expedition.assignedAgentId,
    );
    const won = battle.won && deterministicRoll(`${expedition.id}:${encounter.id}`) < successChance;
    save.run.hero.hp = battle.heroRemainingHp;
    if (won) expedition.encountersCleared = saturatingCounterAdd(expedition.encountersCleared, 1, 3);
    expedition.totalTurns = saturatingCounterAdd(expedition.totalTurns, battle.turns);
    expedition.totalDamageDealt = saturatingCounterAdd(expedition.totalDamageDealt, battle.totalDamageDealt);
    expedition.totalDamageTaken = saturatingCounterAdd(expedition.totalDamageTaken, battle.totalDamageTaken);

    if (won && !isBoss) {
      if (!nextEncounter || nextCompletionAt === null) return;
      expedition.encounterIndex = encounterIndex + 1;
      expedition.startedAt = expedition.completesAt;
      expedition.completesAt = nextCompletionAt;
      continue;
    }

    const policyBonus = expedition.policy === 'aggression' ? 1.1 : expedition.policy === 'hoarding' ? 0.9 : 1;
    const reward = won ? scaleResources(realm.reward, policyBonus * efficiency) : {};
    const totalTurns = expedition.totalTurns ?? battle.turns;
    const totalDamageDealt = expedition.totalDamageDealt ?? battle.totalDamageDealt;
    const totalDamageTaken = expedition.totalDamageTaken ?? battle.totalDamageTaken;
    const encountersCleared = expedition.encountersCleared ?? (won ? 1 : 0);
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
      completedAt: eventAt,
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
      recommendedEquipmentId: getBlacksmithEquipmentRecommendation(save),
      retryAfterSeconds: won ? 0 : encounter.durationSeconds,
      successChance,
      encountersCleared,
      totalEncounterCount,
    };
    if (won) {
      give(save, realm.reward, policyBonus * efficiency);
      save.run.hero.realmId = expedition.realmId;
      save.run.hero.currentAction = 'rest';
      if (allowPermanentUnlock) {
        const next = getNextRealmId(expedition.realmId);
        if (next && !save.meta.unlockedRealms.includes(next)) save.meta.unlockedRealms.push(next);
      }
      save.meta.sagaEntries.unshift({
        id: nextSaveId(save, `saga-expedition-${expedition.id}`),
        kind: 'expedition',
        createdAt: eventAt,
        title: `${realm.nameKR} 원정 성공`,
        text: `${save.run.hero.name}이(가) ${realm.boss}을(를) 넘어 마을로 돌아왔다.`,
      });
    } else {
      // A defeated expedition never destroys persistent resources. The
      // preparation cost is refunded so failure teaches the player through
      // the result card without creating an unrecoverable currency loss.
      give(save, realm.cost);
      save.run.hero.currentAction = 'rest';
      save.meta.sagaEntries.unshift({
        id: nextSaveId(save, `saga-expedition-${expedition.id}`),
        kind: 'expedition',
        createdAt: eventAt,
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

function settleFacilityTasks(
  source: V4SaveEnvelope,
  now: number,
  outputEfficiency = 1,
  allowPermanentUnlock = true,
  allowHistoricalSettlement = false,
  allowRiskyBossConfirmation = false,
  onlyTaskId: string | null = null,
  resolveExpeditionOnSettlement = true,
): V4SaveEnvelope {
  if (!isPersistableClock(now) || (!allowHistoricalSettlement && now < source.updatedAt)) return source;
  const save = cloneSave(source);
  // Offline settlement may intentionally resolve the capped historical
  // window before a later manual write timestamp. Real-time callers keep the
  // stricter persisted-write clock guard above.
  const eventAt = allowHistoricalSettlement ? now : eventTimestamp(save, now);
  const efficiency = normalizeSettlementEfficiency(outputEfficiency);
  for (const task of Object.values(save.meta.tasks)) {
    if (onlyTaskId !== null && task.id !== onlyTaskId) continue;
    if (task.completesAt > eventAt) continue;
    const facility = save.meta.facilities[task.facilityId];
    give(save, task.outputPreview, efficiency);
    if (task.outputEquipmentIds) {
      for (const equipmentId of task.outputEquipmentIds) grantEquipmentLevel(save, equipmentId);
    }
    if (task.heroExpGain) {
      const levelsGained = applyHeroExperience(save, task.heroExpGain * efficiency);
      if (levelsGained > 0) {
        save.meta.sagaEntries.unshift({
          id: nextSaveId(save, `saga-level-${task.id}`),
          kind: 'milestone',
          createdAt: eventAt,
          title: '영웅의 성장',
          text: `${save.run.hero.name}이(가) ${levelsGained}단계 성장해 Lv.${save.run.hero.level}이 되었다.`,
        });
      }
    }
    if (task.facilityId === 'training') advanceHeroActionsInPlace(save, 1, eventAt);
    if (facility) facility.activeTaskId = null;
    if (task.assignedAgentId) {
      const agent = save.meta.agents.find((item) => item.id === task.assignedAgentId);
      if (agent) {
        const previousTrust = agent.trust;
        agent.activeTaskId = null;
        agent.fatigue = Math.min(100, agent.fatigue + 5);
        agent.trust = Math.min(100, agent.trust + 1);
        agent.level = Math.max(agent.level, Math.min(3, 1 + Math.floor(agent.trust / 50)));
        if (previousTrust < 100 && agent.trust === 100) {
          save.meta.sagaEntries.unshift({
            id: nextSaveId(save, `saga-agent-trust-${agent.id}-${task.id}`),
            kind: 'milestone',
            createdAt: eventAt,
            title: `${agent.nameKR} 신뢰 최고점`,
            text: `${agent.nameKR}이(가) 마을의 후원자를 완전히 신뢰하게 되었다.`,
          });
        }
      }
    }
    if (task.facilityId === 'recovery') {
      save.run.hero.hp = save.run.hero.hpMax;
    }
    save.meta.sagaEntries.unshift({
      id: nextSaveId(save, `saga-facility-${task.id}`),
      kind: 'facility',
      createdAt: eventAt,
      title: `${getV4FacilityDefinition(task.facilityId)?.nameKR ?? '시설'} 작업 완료`,
      text: `${task.type} 작업이 완료되어 마을에 결과가 쌓였다.`,
    });
    delete save.meta.tasks[task.id];
  }
  if (resolveExpeditionOnSettlement) {
    resolveExpedition(save, eventAt, allowPermanentUnlock, efficiency, allowHistoricalSettlement, allowRiskyBossConfirmation);
  }
  syncHeroAction(save);
  save.lastProcessedAt = Math.max(save.lastProcessedAt, eventAt);
  touchSave(save, eventAt);
  return save;
}

export function completeFacilityTasks(
  source: V4SaveEnvelope,
  now: number,
  outputEfficiency = 1,
  allowPermanentUnlock = true,
  allowHistoricalSettlement = false,
  allowRiskyBossConfirmation = false,
): V4SaveEnvelope {
  return settleFacilityTasks(
    source,
    now,
    outputEfficiency,
    allowPermanentUnlock,
    allowHistoricalSettlement,
    allowRiskyBossConfirmation,
  );
}

export function completeFacilityTaskNow(
  source: V4SaveEnvelope,
  facilityId: FacilityId,
  now: number,
): DomainResult {
  if (!isPersistableClock(now)) return { ok: false, save: source, error: '기기 시각을 확인할 수 없어 작업을 완료하지 않았습니다.' };
  const prepared = cloneSave(source);
  const eventAt = eventTimestamp(prepared, now);
  if (now < prepared.updatedAt) return { ok: false, save: source, error: '저장 시각이 미래라 작업을 즉시 완료하지 않았습니다.' };
  const facility = prepared.meta.facilities[facilityId];
  const taskId = facility?.activeTaskId;
  const task = taskId ? prepared.meta.tasks[taskId] : undefined;
  if (!facility || !task) {
    return { ok: false, save: source, error: '즉시 완료할 작업이 없습니다.' };
  }
  task.completesAt = eventAt;
  return {
    ok: true,
    save: settleFacilityTasks(prepared, eventAt, 1, true, false, false, task.id, false),
    task,
  };
}

/** Explicit player confirmation for a risky expedition held by offline settlement. */
export function confirmPendingExpedition(source: V4SaveEnvelope, now: number): V4SaveEnvelope {
  const pending = source.run.expedition;
  if (pending?.status !== 'awaiting_confirmation') return source;
  if (!isPersistableClock(now) || now < source.updatedAt || now < pending.completesAt) return source;
  const save = cloneSave(source);
  if (!save.run.expedition) return source;
  save.run.expedition.status = 'traveling';
  return completeFacilityTasks(save, now, 1, false, false, true);
}

/** Explicitly commits the next Realm record after an offline victory. */
export function confirmNextRealmUnlock(source: V4SaveEnvelope, now: number): V4SaveEnvelope {
  const result = source.run.lastExpeditionResult;
  if (!result || result.outcome !== 'victory') return source;
  const next = getNextRealmId(result.realmId);
  if (!next || source.meta.unlockedRealms.includes(next)) return source;
  const nextRealm = getV4RealmDefinition(next);
  if (!nextRealm) return source;
  if (!isActionClockValid(source, now)) return source;

  const save = cloneSave(source);
  const eventAt = eventTimestamp(save, now);
  save.meta.unlockedRealms.push(next);
  save.meta.sagaEntries.unshift({
    id: nextSaveId(save, `saga-realm-unlock-${next}-${eventAt}`),
    kind: 'milestone',
    createdAt: eventAt,
    title: `${nextRealm.nameKR} 기록 해금`,
    text: `${nextRealm.nameKR}으로 향하는 다음 장이 사가에 기록되었다.`,
  });
  touchSave(save, now);
  return save;
}

export function grantOfflineResourceBonus(
  source: V4SaveEnvelope,
  gains: Partial<Record<V4CurrencyKey, number>>,
  now: number,
): V4SaveEnvelope {
  if (!isActionClockValid(source, now) || !gains || Array.isArray(gains)) return source;
  const positiveGains = Object.fromEntries(
    Object.entries(gains).filter(([key, value]) =>
      Object.prototype.hasOwnProperty.call(source.meta.currencies, key)
      && Number.isFinite(value) && value > 0),
  ) as Partial<Record<V4CurrencyKey, number>>;
  if (Object.keys(positiveGains).length === 0) return source;
  const save = cloneSave(source);
  give(save, positiveGains);
  touchSave(save, now);
  return save;
}

export function grantInterventionCharge(source: V4SaveEnvelope, now: number): V4SaveEnvelope {
  if (!isActionClockValid(source, now)
    || !isValidInterventionCharges(source.run.interventionCharges)
    || source.run.interventionCharges >= V4_MAX_INTERVENTION_CHARGES) return source;
  const save = cloneSave(source);
  save.run.interventionCharges = Math.min(
    V4_MAX_INTERVENTION_CHARGES,
    save.run.interventionCharges + 1,
  );
  touchSave(save, now);
  return save;
}

export function useIntervention(
  source: V4SaveEnvelope,
  intervention: InterventionType,
  now: number,
): InterventionDomainResult {
  if (!isInterventionType(intervention)) {
    return { ok: false, save: source, error: '알 수 없는 신의 개입입니다.' };
  }
  if (!isActionClockValid(source, now)) {
    return { ok: false, save: source, error: '저장 시각을 확인할 수 없어 신의 개입을 적용하지 않았습니다.' };
  }
  if (!isValidInterventionCharges(source.run.interventionCharges)) {
    return { ok: false, save: source, error: '신의 개입 충전 정보를 확인할 수 없습니다.' };
  }
  if (source.run.interventionCharges <= 0) {
    return { ok: false, save: source, error: '신의 개입 충전이 없습니다.' };
  }
  if (intervention === 'heal') {
    const sourceHero = source.run.hero;
    if (!isPersistableFiniteNumber(sourceHero.hp)
      || !isPersistableFiniteNumber(sourceHero.hpMax)
      || sourceHero.hpMax <= 0
      || sourceHero.hp < 0
      || sourceHero.hp > sourceHero.hpMax) {
      return { ok: false, save: source, error: '영웅 HP 정보를 확인할 수 없어 회복하지 않았습니다.' };
    }
  }

  const save = cloneSave(source);
  const eventAt = eventTimestamp(save, now);
  const hero = save.run.hero;
  if (intervention === 'heal') {
    if (hero.hp >= hero.hpMax) {
      return { ok: false, save: source, error: '영웅의 HP가 이미 가득 찼습니다.' };
    }
    hero.hp = hero.hpMax;
    save.run.interventionCharges -= 1;
    save.meta.sagaEntries.unshift({
      id: nextSaveId(save, `saga-intervention-heal-${eventAt}`),
      kind: 'milestone',
      createdAt: eventAt,
      title: '신의 개입: 즉시 회복',
      text: `${hero.name}의 상처가 신력으로 즉시 아물었다.`,
    });
    touchSave(save, now);
    return { ok: true, save, intervention };
  }

  const expedition = save.run.expedition;
  if (!expedition) {
    return { ok: false, save: source, error: '후퇴할 원정이 없습니다.' };
  }

  const realm = getV4RealmDefinition(expedition.realmId);
  if (!realm) return { ok: false, save: source, error: '원정 기록을 확인할 수 없습니다.' };
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
    id: nextSaveId(save, `saga-intervention-retreat-${expedition.id}`),
    kind: 'expedition',
    createdAt: eventAt,
    title: '신의 개입: 원정 후퇴',
    text: `${hero.name}이(가) 신의 명을 받아 ${realm.nameKR}에서 안전하게 돌아왔다.`,
  });
  touchSave(save, now);
  return { ok: true, save, intervention };
}

export function startExpedition(
  source: V4SaveEnvelope,
  realmId: RealmId,
  now: number,
  policy: V4Policy,
  assignedAgentId: SupportAgentId | null,
): DomainResult {
  if (!isV4Policy(policy)) {
    return { ok: false, save: source, error: '알 수 없는 원정 정책입니다.' };
  }
  const sourceHero = source.run.hero;
  if (!isPersistableFiniteNumber(sourceHero.hp)
    || !isPersistableFiniteNumber(sourceHero.hpMax)
    || sourceHero.hpMax <= 0
    || sourceHero.hp < 0
    || sourceHero.hp > sourceHero.hpMax) {
    return { ok: false, save: source, error: '영웅 HP 정보를 확인할 수 없어 원정을 시작하지 않았습니다.' };
  }
  const save = cloneSave(source);
  const realm = getV4RealmDefinition(realmId);
  if (!realm) {
    return { ok: false, save: source, error: '알 수 없는 Realm입니다.' };
  }
  if (!save.meta.unlockedRealms.includes(realmId)) {
    return { ok: false, save: source, error: '아직 기록되지 않은 Realm입니다.' };
  }
  if (save.run.expedition) {
    return { ok: false, save: source, error: '동시에 진행할 수 있는 원정은 1개뿐입니다.' };
  }
  const pendingRealmUnlock = save.run.lastExpeditionResult?.outcome === 'victory'
    ? getNextRealmId(save.run.lastExpeditionResult.realmId)
    : null;
  if (pendingRealmUnlock && !save.meta.unlockedRealms.includes(pendingRealmUnlock)) {
    return { ok: false, save: source, error: '다음 Realm 기록을 먼저 확정해 주세요.' };
  }
  if (save.run.hero.hp <= 0) {
    return { ok: false, save: source, error: '영웅이 쓰러져 있습니다. 회복당에서 먼저 회복하세요.' };
  }
  if (Object.values(save.meta.tasks).some((task) => task.facilityId === 'training')) {
    return { ok: false, save: source, error: '영웅이 훈련 중입니다. 훈련을 마친 뒤 원정을 시작하세요.' };
  }
  if (assignedAgentId !== null && assignedAgentId !== 'guide') {
    return { ok: false, save: source, error: '원정에는 길잡이만 배정할 수 있습니다.' };
  }
  if (!canPay(save, realm.cost)) {
    return { ok: false, save: source, error: '원정 준비에 필요한 신력 또는 재료가 부족합니다.' };
  }
  if (assignedAgentId && !save.meta.agents.some((agent) => agent.id === assignedAgentId && !agent.activeTaskId)) {
    return { ok: false, save: source, error: '길잡이가 다른 작업 중입니다.' };
  }
  const assignedGuide = assignedAgentId === 'guide'
    ? save.meta.agents.find((agent) => agent.id === 'guide')
    : undefined;
  if (assignedAgentId === 'guide' && (assignedGuide?.fatigue ?? 0) >= 100) {
    return { ok: false, save: source, error: '길잡이가 너무 피로합니다. 휴식 후 다시 출발하세요.' };
  }
  const eventAt = eventTimestamp(save, now);
  const firstEncounterDuration = expeditionDurationSeconds(
    save,
    realm.encounters[0]?.durationSeconds ?? realm.durationSeconds,
    assignedAgentId === 'guide',
  );
  const completesAt = safeCompletionTimestamp(eventAt, firstEncounterDuration);
  if (completesAt === null) return { ok: false, save: source, error: '원정 시각 범위를 확인할 수 없어 출발하지 않았습니다.' };
  pay(save, realm.cost);
  const id = nextSaveId(save, `expedition-${realmId}-${eventAt}`);
  save.run.expedition = {
    id,
    realmId,
    policy,
    assignedAgentId,
    startedAt: eventAt,
    completesAt,
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
  touchSave(save, now);
  return {
    ok: true,
    save,
    task: {
      id,
      facilityId: 'expedition',
      type: '원정',
      startedAt: eventAt,
      completesAt: save.run.expedition.completesAt,
      input: realm.cost,
      outputPreview: realm.reward,
      assignedAgentId,
    },
  };
}

export function setV4Policy(source: V4SaveEnvelope, policy: V4Policy, now: number): V4SaveEnvelope {
  if (!isV4Policy(policy)) return source;
  const save = cloneSave(source);
  save.run.policy = policy;
  touchSave(save, now);
  return save;
}

function clampVolume(value: number | undefined, fallback: number): number {
  return typeof value !== 'number' || !Number.isFinite(value)
    ? fallback
    : Math.min(1, Math.max(0, value));
}

export function updateV4Settings(
  source: V4SaveEnvelope,
  patch: Partial<V4Settings>,
  now: number,
): V4SaveEnvelope {
  const save = cloneSave(source);
  const safePatch: Partial<V4Settings> = patch && typeof patch === 'object' && !Array.isArray(patch)
    ? patch
    : {};
  save.meta.settings = {
    music: clampVolume(safePatch.music, source.meta.settings.music),
    sfx: clampVolume(safePatch.sfx, source.meta.settings.sfx),
    muted: typeof safePatch.muted === 'boolean' ? safePatch.muted : source.meta.settings.muted,
  };
  touchSave(save, now);
  return save;
}

export function upgradeFacility(source: V4SaveEnvelope, facilityId: FacilityId, now: number): DomainResult {
  const save = cloneSave(source);
  const eventAt = eventTimestamp(save, now);
  const facility = save.meta.facilities[facilityId];
  if (!facility) return { ok: false, save: source, error: '시설을 찾을 수 없습니다.' };
  if (facility.activeTaskId) return { ok: false, save: source, error: '작업 중인 시설은 강화할 수 없습니다.' };
  if (!Number.isFinite(facility.level) || !Number.isInteger(facility.level) || facility.level < 1) {
    return { ok: false, save: source, error: '시설 레벨을 확인할 수 없습니다.' };
  }
  if (facility.level >= MAX_ECONOMY_VALUE) {
    return { ok: false, save: source, error: '시설 레벨이 더 이상 오르지 않습니다.' };
  }
  const cost = getFacilityUpgradeCost(source, facilityId);
  if (!cost) return { ok: false, save: source, error: '시설을 찾을 수 없습니다.' };
  if (!canPay(save, cost)) return { ok: false, save: source, error: '시설 강화 재료가 부족합니다.' };
  pay(save, cost);
  facility.level += 1;
  touchSave(save, now);
  return {
    ok: true,
    save,
    task: {
      id: nextSaveId(save, `upgrade-${facilityId}-${eventAt}`),
      facilityId,
      type: '시설 강화',
      startedAt: eventAt,
      completesAt: eventAt,
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
  if (!facility || !getV4FacilityDefinition(facilityId)) return null;
  const growth = Math.pow(FACILITY_UPGRADE_GROWTH, positiveFiniteLevel(facility.level) - 1);
  return {
    gold: safeScaledEconomyAmount(80, growth),
    materials: safeScaledEconomyAmount(4, growth),
  };
}
