import { getVillageAgentDefinition, getVillageFacilityDefinition } from '../../data';
import type {
  FacilityId,
  SupportAgentId,
  VillageCurrencyKey,
  VillageSaveEnvelope,
} from '../../types';
import type { FacilityTaskPreview } from '../contracts';
import { MAX_ECONOMY_VALUE, isValidAgentState, positiveFiniteLevel } from '../shared/guards';
import { canPay, safeScaledEconomyAmount } from '../shared/resourceMath';

const FACILITY_OUTPUT_PER_LEVEL = 0.18;
const AGENT_OUTPUT_PER_LEVEL = 0.08;
const AGENT_SPEED_PER_LEVEL = 0.03;
const BLACKSMITH_EQUIPMENT_UNLOCKS = [
  { id: 'iron_sword', facilityLevel: 1 },
  { id: 'guardian_armor', facilityLevel: 2 },
  { id: 'spirit_talisman', facilityLevel: 3 },
] as const;

function boundedMultiplier(value: number): number {
  if (Number.isNaN(value) || value < 0) return 1;
  return Number.isFinite(value) ? Math.min(MAX_ECONOMY_VALUE, value) : MAX_ECONOMY_VALUE;
}

function safeDurationSeconds(value: number): number {
  if (!Number.isFinite(value)) return 10;
  return Math.min(MAX_ECONOMY_VALUE, Math.max(10, Math.round(value)));
}

function savedEquipmentLevel(source: VillageSaveEnvelope, equipmentId: string): number {
  const savedLevel = source.run.hero.equipmentLevels[equipmentId];
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
export function getBlacksmithEquipmentOutput(source: VillageSaveEnvelope): string {
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
export function getBlacksmithEquipmentRecommendation(source: VillageSaveEnvelope): string | null {
  const facilityLevel = positiveFiniteLevel(source.meta.facilities.blacksmith?.level);
  return BLACKSMITH_EQUIPMENT_UNLOCKS.find(
    (equipment) => equipment.facilityLevel <= facilityLevel && savedEquipmentLevel(source, equipment.id) < 1,
  )?.id ?? null;
}

function facilityTaskEconomy(
  save: VillageSaveEnvelope,
  facilityId: FacilityId,
  assignedAgentId: SupportAgentId | null,
): Pick<FacilityTaskPreview, 'durationSeconds' | 'input' | 'output' | 'outputEquipmentIds' | 'heroExpGain'> {
  const facility = save.meta.facilities[facilityId];
  const definition = getVillageFacilityDefinition(facilityId);
  const agent = assignedAgentId ? save.meta.agents.find((item) => item.id === assignedAgentId) : undefined;
  const facilityLevel = positiveFiniteLevel(facility?.level);
  const agentLevel = positiveFiniteLevel(agent?.level);
  const specialty = Boolean(
    agent && agent.trust >= 50 && getVillageAgentDefinition(agent.id)?.specialty === facilityId,
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
    ) as Partial<Record<VillageCurrencyKey, number>>,
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
  source: VillageSaveEnvelope,
  facilityId: FacilityId,
  assignedAgentId?: SupportAgentId | null,
): FacilityTaskPreview {
  const hasAssignedAgentArgument = arguments.length >= 3;
  const requestedAgentId = hasAssignedAgentArgument ? assignedAgentId : null;
  const facility = source.meta.facilities[facilityId];
  const definition = getVillageFacilityDefinition(facilityId);
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
  } else if (requestedAgentId && agent && getVillageAgentDefinition(agent.id)?.specialty !== facilityId) {
    error = '해당 지원 에이전트는 이 시설의 전문 담당자가 아닙니다.';
  } else if (agent && !isValidAgentState(agent)) {
    error = '지원 에이전트 정보를 확인할 수 없습니다.';
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
