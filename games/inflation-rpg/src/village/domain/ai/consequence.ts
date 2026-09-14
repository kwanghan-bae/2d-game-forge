import type {
  FacilityId,
  RealmId,
  SupportAgentId,
  VillageAgentGoal,
  VillageAgentAIState,
  VillageAIState,
  VillageSaveEnvelope,
  VillageSimulationState,
  VillageWorldEventRecord,
} from '../../types';
import { VILLAGE_CONSEQUENCE_ECHO_KINDS } from '../../types';
import {
  createVillageAgentAIState,
  getVillageAIState,
  getVillageSimulationState,
  VILLAGE_SUPPORT_AGENT_IDS,
} from './state';

export const VILLAGE_CONSEQUENCE_AXES = ['supply', 'cohesion', 'frontier'] as const;
export type VillageConsequenceAxis = typeof VILLAGE_CONSEQUENCE_AXES[number];
export type VillageConsequenceLevel = 'stable' | 'strained' | 'critical';

export interface VillageConsequenceProfile {
  supplyPressure: number;
  cohesionPressure: number;
  frontierPressure: number;
  dominantAxis: VillageConsequenceAxis;
  dominantAxisLabel: string;
  dominantPressure: number;
  dominantLevel: VillageConsequenceLevel;
  dominantLevelLabel: string;
  summaryKR: string;
  /** Recent resolved event ids that explain the derived pressure. */
  sourceEventIds: string[];
}

export interface VillageConsequenceFacilityModifier {
  axis: VillageConsequenceAxis;
  pressure: number;
  intensity: number;
  durationMultiplier: number;
  outputMultiplier: number;
  rationaleKR: string;
}

export interface VillageConsequenceExpeditionModifier {
  successChanceDelta: number;
  rationaleKR: string;
}

const AXIS_LABELS: Record<VillageConsequenceAxis, string> = {
  supply: '공급망',
  cohesion: '공동체',
  frontier: '원정로',
};

const LEVEL_LABELS: Record<VillageConsequenceLevel, string> = {
  stable: '안정',
  strained: '긴장',
  critical: '위기',
};

const FACILITY_AXIS_BY_ID: Record<FacilityId, VillageConsequenceAxis> = {
  temple: 'frontier',
  recovery: 'cohesion',
  blacksmith: 'supply',
  training: 'supply',
  mudang: 'frontier',
  expedition: 'frontier',
  archive: 'cohesion',
};

const REALM_THREAT_WEIGHT: Record<RealmId, number> = {
  sacred_fields: 0.2,
  deep_forest: 0.35,
  underworld: 0.45,
};

const PRESSURE_THRESHOLD = 0.55;
const CRITICAL_PRESSURE_THRESHOLD = 0.78;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finite(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalized(value: unknown, fallback = 0.5): number {
  return clamp(finite(value, fallback), 0, 1);
}

function isConsequenceEchoKind(value: unknown): boolean {
  return VILLAGE_CONSEQUENCE_ECHO_KINDS.includes(value as typeof VILLAGE_CONSEQUENCE_ECHO_KINDS[number]);
}

function agentBrain(ai: VillageAIState, agentId: SupportAgentId): VillageAgentAIState {
  return ai.agentBrains?.[agentId]
    ?? createVillageAgentAIState(ai.seed, agentId, ai.world.lastSimulatedDay);
}

function factionValue(
  ai: VillageAIState,
  factionId: 'village' | 'merchants' | 'spirits',
  field: 'trust' | 'influence' | 'tension',
): number {
  return normalized(ai.world.factions?.[factionId]?.[field]);
}

function eventAxis(record: VillageWorldEventRecord): VillageConsequenceAxis | null {
  if (record.factionId === 'merchants' || record.type === 'supply') return 'supply';
  if (record.factionId === 'village' || record.type === 'social') return 'cohesion';
  if (record.factionId === 'spirits' || record.type === 'weather' || record.type === 'omen') return 'frontier';
  return null;
}

function recentPressure(simulation: VillageSimulationState, currentDay: number): {
  values: Record<VillageConsequenceAxis, number>;
  sourceEventIds: string[];
} {
  const records = simulation.eventHistory
    .filter((record) => (
      !isConsequenceEchoKind(record.chainKind)
      && record.day >= Math.max(0, currentDay - 7)
      && (record.outcome === 'chosen' || record.outcome === 'expired')
    ))
    .sort((left, right) => right.day - left.day || left.eventId.localeCompare(right.eventId));
  const values: Record<VillageConsequenceAxis, number> = {
    supply: 0,
    cohesion: 0,
    frontier: 0,
  };
  for (const record of records) {
    const axis = eventAxis(record);
    if (!axis) continue;
    values[axis] += record.outcome === 'expired' ? 0.08 : 0.045;
  }
  return {
    values: {
      supply: clamp(values.supply, 0, 0.2),
      cohesion: clamp(values.cohesion, 0, 0.2),
      frontier: clamp(values.frontier, 0, 0.2),
    },
    sourceEventIds: records.slice(0, 4).map((record) => record.eventId),
  };
}

function relationshipPressure(ai: VillageAIState): number {
  let negativeTotal = 0;
  let pairCount = 0;
  for (const agentId of VILLAGE_SUPPORT_AGENT_IDS) {
    const brain = agentBrain(ai, agentId);
    for (const peerId of VILLAGE_SUPPORT_AGENT_IDS) {
      if (peerId === agentId) continue;
      negativeTotal += Math.max(0, -clamp(finite(brain.relationships[peerId]), -1, 1));
      pairCount += 1;
    }
  }
  return pairCount === 0 ? 0 : clamp(negativeTotal / pairCount, 0, 1);
}

function stressPressure(ai: VillageAIState): number {
  const total = VILLAGE_SUPPORT_AGENT_IDS.reduce(
    (sum, agentId) => sum + clamp(finite(agentBrain(ai, agentId).stress), 0, 100),
    0,
  );
  return clamp(total / (VILLAGE_SUPPORT_AGENT_IDS.length * 100), 0, 1);
}

function conflictMemoryPressure(ai: VillageAIState): number {
  const salience = VILLAGE_SUPPORT_AGENT_IDS.reduce((sum, agentId) => (
    sum + (agentBrain(ai, agentId).cognition?.memories ?? [])
      .filter((memory) => memory.tag === 'conflict' || memory.tag === 'failure')
      .slice(0, 6)
      .reduce((memorySum, memory) => memorySum + clamp(finite(memory.salience), 0, 1), 0)
  ), 0);
  return clamp(salience / 4, 0, 1);
}

function realmThreatPressure(ai: VillageAIState): number {
  const world = ai.world;
  return clamp((Object.entries(REALM_THREAT_WEIGHT) as Array<[RealmId, number]>)
    .reduce((sum, [realmId, weight]) => sum + normalized(world.threatByRealm[realmId]) * weight, 0), 0, 1);
}

function activeChainPressure(ai: VillageAIState): number {
  return clamp(Math.max(0, ...(ai.world.chains ?? [])
    .map((chain) => finite(chain.momentum))), 0, 1);
}

function levelForPressure(value: number): VillageConsequenceLevel {
  if (value >= CRITICAL_PRESSURE_THRESHOLD) return 'critical';
  if (value >= PRESSURE_THRESHOLD) return 'strained';
  return 'stable';
}

function intensityForPressure(value: number): number {
  return clamp((value - PRESSURE_THRESHOLD) / (1 - PRESSURE_THRESHOLD), 0, 1);
}

export function getVillageConsequenceIntensity(value: number): number {
  return intensityForPressure(normalized(value, 0));
}

export function getVillageConsequenceAxisLabel(axis: VillageConsequenceAxis): string {
  return AXIS_LABELS[axis];
}

export function getVillageConsequenceLevelLabel(level: VillageConsequenceLevel): string {
  return LEVEL_LABELS[level];
}

export function getVillageConsequencePressure(
  profile: VillageConsequenceProfile,
  axis: VillageConsequenceAxis,
): number {
  return profile[`${axis}Pressure`];
}

/**
 * Derives long-tail pressure from already persisted bounded state. The profile
 * is intentionally not saved: replaying the same save produces the same
 * consequence without introducing another schema or migration boundary.
 */
export function getVillageConsequenceProfile(source: VillageSaveEnvelope): VillageConsequenceProfile {
  const ai = getVillageAIState(source);
  const recent = recentPressure(
    getVillageSimulationState(source),
    Math.max(0, Math.floor(finite(ai.world.lastSimulatedDay))),
  );
  const relationship = relationshipPressure(ai);
  const stress = stressPressure(ai);
  const conflictMemory = conflictMemoryPressure(ai);
  const threat = realmThreatPressure(ai);
  const chain = activeChainPressure(ai);

  const supplyPressure = clamp(
    (1 - clamp(finite(ai.world.prosperity, 50) / 100, 0, 1)) * 0.38
      + factionValue(ai, 'merchants', 'tension') * 0.32
      + (1 - factionValue(ai, 'merchants', 'trust')) * 0.18
      + (1 - factionValue(ai, 'merchants', 'influence')) * 0.12
      + recent.values.supply,
    0,
    1,
  );
  const cohesionPressure = clamp(
    factionValue(ai, 'village', 'tension') * 0.34
      + (1 - factionValue(ai, 'village', 'trust')) * 0.24
      + relationship * 0.18
      + stress * 0.12
      + conflictMemory * 0.08
      + recent.values.cohesion,
    0,
    1,
  );
  const frontierPressure = clamp(
    threat * 0.42
      + factionValue(ai, 'spirits', 'tension') * 0.3
      + (1 - factionValue(ai, 'spirits', 'trust')) * 0.18
      + chain * 0.1
      + recent.values.frontier,
    0,
    1,
  );
  const values: Record<VillageConsequenceAxis, number> = {
    supply: supplyPressure,
    cohesion: cohesionPressure,
    frontier: frontierPressure,
  };
  const dominantAxis = VILLAGE_CONSEQUENCE_AXES.reduce((selected, axis) => (
    values[axis] > values[selected] ? axis : selected
  ), VILLAGE_CONSEQUENCE_AXES[0]);
  const dominantPressure = values[dominantAxis];
  const dominantLevel = levelForPressure(dominantPressure);
  const dominantAxisLabel = AXIS_LABELS[dominantAxis];
  const dominantLevelLabel = LEVEL_LABELS[dominantLevel];
  return {
    supplyPressure,
    cohesionPressure,
    frontierPressure,
    dominantAxis,
    dominantAxisLabel,
    dominantPressure,
    dominantLevel,
    dominantLevelLabel,
    summaryKR: dominantLevel === 'stable'
      ? '최근 선택의 누적 후폭풍이 안정 범위라 시설과 원정은 기본 흐름을 따른다.'
      : `${dominantAxisLabel} 압력이 ${dominantLevelLabel} 단계다. 최근 선택의 여파가 다음 준비와 판단에 남아 있다.`,
    sourceEventIds: recent.sourceEventIds,
  };
}

export function getVillageConsequenceFacilityModifier(
  source: VillageSaveEnvelope,
  facilityId: FacilityId,
): VillageConsequenceFacilityModifier {
  const profile = getVillageConsequenceProfile(source);
  const axis = FACILITY_AXIS_BY_ID[facilityId];
  const pressure = getVillageConsequencePressure(profile, axis);
  const intensity = getVillageConsequenceIntensity(pressure);
  const durationMultiplier = clamp(1 + intensity * 0.05, 1, 1.05);
  const outputMultiplier = clamp(1 - intensity * 0.05, 0.95, 1);
  return {
    axis,
    pressure,
    intensity,
    durationMultiplier,
    outputMultiplier,
    rationaleKR: intensity > 0
      ? `${AXIS_LABELS[axis]} 누적 압력 ${Math.round(pressure * 100)}%가 작업 시간과 산출에 반영된다.`
      : '누적 후폭풍이 안정 범위라 기본 시설 효율을 유지한다.',
  };
}

export function getVillageConsequenceExpeditionModifier(
  source: VillageSaveEnvelope,
  realmId: RealmId,
): VillageConsequenceExpeditionModifier {
  const profile = getVillageConsequenceProfile(source);
  const frontierIntensity = getVillageConsequenceIntensity(profile.frontierPressure);
  const cohesionIntensity = getVillageConsequenceIntensity(profile.cohesionPressure);
  const realmThreat = normalized(getVillageAIState(source).world.threatByRealm[realmId]);
  const successChanceDelta = clamp(
    -(frontierIntensity * (0.02 + realmThreat * 0.04) + cohesionIntensity * 0.02),
    -0.06,
    0,
  );
  return {
    successChanceDelta,
    rationaleKR: successChanceDelta < 0
      ? `누적 ${AXIS_LABELS.frontier}·공동체 압력이 예상 승률에 ${Math.round(successChanceDelta * 100)}%p 반영된다.`
      : '원정로에 누적 후폭풍이 없어 기본 예상 승률을 유지한다.',
  };
}

export function getVillageConsequenceAgentGoalBonus(
  source: VillageSaveEnvelope,
  agentId: SupportAgentId,
  goal: VillageAgentGoal,
  profile = getVillageConsequenceProfile(source),
): number {
  const supply = getVillageConsequenceIntensity(profile.supplyPressure);
  const cohesion = getVillageConsequenceIntensity(profile.cohesionPressure);
  const frontier = getVillageConsequenceIntensity(profile.frontierPressure);
  if (goal === 'bond') return cohesion * 18;
  if (goal === 'recover') return Math.max(supply, cohesion, frontier) * 6;
  if (agentId === 'blacksmith' && goal === 'craft') return supply * 12;
  if (agentId === 'mudang' && goal === 'ward') return frontier * 14;
  if (agentId === 'guide' && goal === 'guide') return frontier * 16;
  return 0;
}
