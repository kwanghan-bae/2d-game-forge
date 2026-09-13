import type {
  FacilityId,
  SupportAgentId,
  VillageAgentDecisionReason,
  VillageAgentGoal,
  VillageAgentSchedule,
  VillageSaveEnvelope,
} from '../../types';
import {
  ensureVillageAIState,
  ensureVillageAgentBrains,
  getVillageAgentAIState,
  getVillageAIState,
  deterministicUnit,
  VILLAGE_SUPPORT_AGENT_IDS,
} from './state';

export type VillageAgentDuty = Extract<FacilityId, 'blacksmith' | 'mudang' | 'expedition'>;

export interface VillageAgentPlan {
  agentId: SupportAgentId;
  goal: VillageAgentGoal;
  goalLabel: string;
  score: number;
  reason: VillageAgentDecisionReason;
  rationale: string;
  schedule: VillageAgentSchedule;
}

export interface VillageAgentPlanCandidate extends VillageAgentPlan {
  available: boolean;
}

export interface VillageAgentPlanAnalysis {
  selected: VillageAgentPlanCandidate;
  candidates: VillageAgentPlanCandidate[];
}

export interface VillageAgentAssignmentCandidate {
  agentId: SupportAgentId;
  score: number;
  available: boolean;
  rationale: string;
}

export interface VillageAgentAssignmentAnalysis {
  duty: VillageAgentDuty;
  selected: SupportAgentId | null;
  candidates: VillageAgentAssignmentCandidate[];
}

export const VILLAGE_AGENT_GOAL_LABELS: Record<VillageAgentGoal, string> = {
  recover: '회복 우선',
  craft: '정밀 제작',
  ward: '마을 수호',
  guide: '원정 경로 탐색',
  bond: '동료와 유대',
};

const SPECIALTY_GOAL_BY_AGENT: Record<SupportAgentId, VillageAgentGoal> = {
  blacksmith: 'craft',
  mudang: 'ward',
  guide: 'guide',
};

const DUTY_AGENT_BY_FACILITY: Record<VillageAgentDuty, SupportAgentId> = {
  blacksmith: 'blacksmith',
  mudang: 'mudang',
  expedition: 'guide',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function safeTick(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback;
}

function averagePeerRelationship(source: VillageSaveEnvelope, agentId: SupportAgentId): number {
  const brain = getVillageAgentAIState(source, agentId);
  const peers = VILLAGE_SUPPORT_AGENT_IDS.filter((candidate) => candidate !== agentId);
  if (peers.length === 0) return 0;
  return peers.reduce((total, peerId) => total + safeNumber(brain.relationships[peerId]), 0) / peers.length;
}

function weatherAffinity(agentId: SupportAgentId, source: VillageSaveEnvelope): number {
  const weather = getVillageAIState(source).world.weather;
  if (agentId === 'guide' && weather === 'fog') return 22;
  if (agentId === 'mudang' && (weather === 'rain' || weather === 'wind')) return 14;
  if (agentId === 'blacksmith' && weather === 'clear') return 8;
  return 0;
}

function goalReason(
  goal: VillageAgentGoal,
  fatigue: number,
  relation: number,
  weatherBonus: number,
): VillageAgentDecisionReason {
  if (goal === 'recover') return fatigue >= 55 ? 'fatigue' : 'routine';
  if (goal === 'bond') return relation < -0.2 ? 'conflict' : 'relationship';
  if (weatherBonus > 0) return 'weather';
  return 'specialty';
}

function makeSchedule(
  source: VillageSaveEnvelope,
  agentId: SupportAgentId,
  goal: VillageAgentGoal,
  reason: VillageAgentDecisionReason,
  tick: number,
): VillageAgentSchedule {
  const ai = getVillageAIState(source);
  const duration = 1 + Math.floor(deterministicUnit(`${ai.seed}:agent-schedule:${agentId}:${tick}:${goal}`) * 2);
  return { goal, startTick: tick, endTick: tick + duration, reason };
}

function calculatePlan(
  source: VillageSaveEnvelope,
  agentId: SupportAgentId,
  tick: number,
): VillageAgentPlanAnalysis {
  const ai = getVillageAIState(source);
  const agent = source.meta.agents.find((candidate) => candidate.id === agentId);
  const brain = getVillageAgentAIState(source, agentId);
  const fatigue = clamp(safeNumber(agent?.fatigue), 0, 100);
  const trust = clamp(safeNumber(agent?.trust), 0, 100);
  const relation = clamp(averagePeerRelationship(source, agentId), -1, 1);
  const weatherBonus = weatherAffinity(agentId, source);
  const specialtyGoal = SPECIALTY_GOAL_BY_AGENT[agentId];
  const available = Boolean(agent && !agent.activeTaskId && fatigue < 100);
  const candidates: VillageAgentPlanCandidate[] = [
    {
      agentId,
      goal: 'recover',
      goalLabel: VILLAGE_AGENT_GOAL_LABELS.recover,
      score: 22 + fatigue * 1.15 + brain.stress * 0.3,
      reason: goalReason('recover', fatigue, relation, 0),
      rationale: `피로 ${Math.round(fatigue)}%와 긴장 ${Math.round(brain.stress)}%를 낮추기 위해 숨을 고른다.`,
      schedule: makeSchedule(source, agentId, 'recover', goalReason('recover', fatigue, relation, 0), tick),
      available,
    },
    {
      agentId,
      goal: specialtyGoal,
      goalLabel: VILLAGE_AGENT_GOAL_LABELS[specialtyGoal],
      score: 32
        + (100 - fatigue) * 0.2
        + trust * 0.28
        + brain.goalProgress * 0.18
        + relation * 16
        + weatherBonus,
      reason: goalReason(specialtyGoal, fatigue, relation, weatherBonus),
      rationale: `${VILLAGE_AGENT_GOAL_LABELS[specialtyGoal]}에 대한 준비도 ${Math.round(brain.goalProgress)}%, 영웅 신뢰 ${Math.round(trust)}%를 반영했다.${weatherBonus > 0 ? ' 현재 날씨가 이 역할을 돕는다.' : ''}`,
      schedule: makeSchedule(source, agentId, specialtyGoal, goalReason(specialtyGoal, fatigue, relation, weatherBonus), tick),
      available,
    },
    {
      agentId,
      goal: 'bond',
      goalLabel: VILLAGE_AGENT_GOAL_LABELS.bond,
      score: 20
        + (100 - trust) * 0.42
        + Math.max(0, -relation) * 22
        + (brain.stress >= 60 ? 8 : 0),
      reason: goalReason('bond', fatigue, relation, 0),
      rationale: relation < -0.2
        ? `동료 관계가 ${relation.toFixed(2)}로 긴장되어 먼저 대화를 회복하려 한다.`
        : `영웅 신뢰 ${Math.round(trust)}%와 동료 관계를 살피며 유대를 쌓으려 한다.`,
      schedule: makeSchedule(source, agentId, 'bond', goalReason('bond', fatigue, relation, 0), tick),
      available,
    },
  ];
  const selected = [...candidates].sort((left, right) => {
    const scoreDifference = right.score - left.score;
    if (Math.abs(scoreDifference) > 0.0001) return scoreDifference;
    return deterministicUnit(`${ai.seed}:agent-tie:${agentId}:${tick}:${left.goal}`)
      - deterministicUnit(`${ai.seed}:agent-tie:${agentId}:${tick}:${right.goal}`);
  })[0] ?? candidates[0];
  return { selected, candidates };
}

export function getVillageAgentPlanAnalysis(
  source: VillageSaveEnvelope,
  agentId: SupportAgentId,
): VillageAgentPlanAnalysis {
  const ai = getVillageAIState(source);
  return calculatePlan(source, agentId, safeTick(ai.world.lastSimulatedDay));
}

export function getVillageAgentPlan(
  source: VillageSaveEnvelope,
  agentId: SupportAgentId,
): VillageAgentPlanCandidate {
  return getVillageAgentPlanAnalysis(source, agentId).selected;
}

export function getVillageAgentAssignmentAnalysis(
  source: VillageSaveEnvelope,
  duty: VillageAgentDuty,
): VillageAgentAssignmentAnalysis {
  const requiredAgentId = DUTY_AGENT_BY_FACILITY[duty];
  const candidates = VILLAGE_SUPPORT_AGENT_IDS.map((agentId) => {
    const agent = source.meta.agents.find((candidate) => candidate.id === agentId);
    const plan = getVillageAgentPlan(source, agentId);
    const available = agentId === requiredAgentId
      && Boolean(agent && !agent.activeTaskId && safeNumber(agent.fatigue) < 100 && plan.goal !== 'recover');
    const score = available
      ? plan.score + (plan.goal === SPECIALTY_GOAL_BY_AGENT[agentId] ? 18 : 0)
        + safeNumber(agent?.trust) * 0.16
        + (100 - clamp(safeNumber(agent?.fatigue), 0, 100)) * 0.12
      : -1_000;
    return {
      agentId,
      score,
      available,
      rationale: available
        ? `${VILLAGE_AGENT_GOAL_LABELS[plan.goal]} 계획과 피로 ${Math.round(safeNumber(agent?.fatigue))}%를 반영해 ${agent?.nameKR ?? agentId}을(를) 배정한다.`
        : agentId === requiredAgentId
          ? plan.goal === 'recover'
            ? '현재 휴식 계획이 우선이라 자동 배정하지 않는다.'
            : '현재 작업 중이거나 피로가 한계에 도달했다.'
          : '이 역할의 전문 담당자가 아니다.',
    };
  });
  const selected = candidates
    .filter((candidate) => candidate.available)
    .sort((left, right) => right.score - left.score)[0]?.agentId ?? null;
  return { duty, selected, candidates };
}

/** Replans support-agent schedules at a deterministic world tick. */
export function advanceVillageAgentScheduler(save: VillageSaveEnvelope, targetTick: number): void {
  const ai = ensureVillageAIState(save);
  const tick = safeTick(targetTick, ai.world.lastSimulatedDay);
  const brains = ensureVillageAgentBrains(save);
  for (const agentId of VILLAGE_SUPPORT_AGENT_IDS) {
    const brain = brains[agentId];
    const agent = save.meta.agents.find((candidate) => candidate.id === agentId);
    if (!brain) continue;
    const plan = calculatePlan(save, agentId, tick).selected;
    const previousGoal = brain.goal;
    const elapsedTicks = Math.max(1, tick - brain.lastDecisionTick);
    brain.goal = plan.goal;
    brain.goalProgress = clamp(
      brain.goalProgress + (previousGoal === plan.goal ? elapsedTicks * 5 : -4),
      0,
      100,
    );
    const fatiguePressure = Math.max(0, safeNumber(agent?.fatigue) - 45) * 0.12;
    brain.stress = clamp(
      brain.stress + fatiguePressure - (plan.goal === 'recover' ? 8 : 2),
      0,
      100,
    );
    brain.schedule = {
      ...plan.schedule,
      startTick: tick,
      endTick: Math.max(tick + 1, plan.schedule.endTick),
    };
    brain.lastDecisionTick = tick;
  }
}

/** Records a shared interaction symmetrically so relationship changes are bounded and replayable. */
export function recordVillageAgentRelationship(
  save: VillageSaveEnvelope,
  leftAgentId: SupportAgentId,
  rightAgentId: SupportAgentId,
  delta: number,
): void {
  if (leftAgentId === rightAgentId || !Number.isFinite(delta)) return;
  const brains = ensureVillageAgentBrains(save);
  const left = brains[leftAgentId];
  const right = brains[rightAgentId];
  if (!left || !right) return;
  const safeDelta = clamp(delta, -0.2, 0.2);
  left.relationships[rightAgentId] = clamp(left.relationships[rightAgentId] + safeDelta, -1, 1);
  right.relationships[leftAgentId] = clamp(right.relationships[leftAgentId] + safeDelta, -1, 1);
}

export type VillageAgentOutcome = 'success' | 'failure' | 'support';

export function recordVillageAgentOutcome(
  save: VillageSaveEnvelope,
  agentId: SupportAgentId,
  outcome: VillageAgentOutcome,
  tick: number,
): void {
  const brains = ensureVillageAgentBrains(save);
  const brain = brains[agentId];
  if (!brain) return;
  const safeTickValue = safeTick(tick, brain.lastDecisionTick);
  const progressDelta = outcome === 'success' ? 12 : outcome === 'failure' ? -8 : 6;
  const stressDelta = outcome === 'success' ? -5 : outcome === 'failure' ? 10 : -2;
  brain.goalProgress = clamp(brain.goalProgress + progressDelta, 0, 100);
  brain.stress = clamp(brain.stress + stressDelta, 0, 100);
  brain.lastDecisionTick = Math.max(brain.lastDecisionTick, safeTickValue);
}
