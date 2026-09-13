import type {
  FacilityId,
  SupportAgentId,
  VillageAgentBeliefKind,
  VillageAgentDecisionReason,
  VillageAgentGoal,
  VillageAgentPlanState,
  VillageAgentPlanStep,
  VillageAgentSchedule,
  VillageSaveEnvelope,
} from '../../types';
import {
  decayVillageAgentCognition,
  getVillageAgentBeliefValue,
  observeVillageAgentWorld,
  recordVillageAgentBelief,
  recordVillageAgentMemory,
} from './cognition';
import {
  ensureVillageAIState,
  ensureVillageAgentCognition,
  ensureVillageAgentBrains,
  getVillageAgentAIState,
  getVillageAgentCognitionState,
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
  plan: VillageAgentPlanState;
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

const PLAN_STEPS_BY_GOAL: Record<VillageAgentGoal, readonly VillageAgentPlanStep[]> = {
  recover: [
    { kind: 'observe', labelKR: '피로와 긴장을 확인한다' },
    { kind: 'recover', labelKR: '숨을 고르고 다음 일을 미룬다' },
  ],
  craft: [
    { kind: 'observe', labelKR: '재료와 장비 상태를 확인한다' },
    { kind: 'prepare', labelKR: '필요한 재료를 골라낸다' },
    { kind: 'act', labelKR: '장비를 정밀하게 손본다' },
  ],
  ward: [
    { kind: 'observe', labelKR: '마을의 불안과 징조를 살핀다' },
    { kind: 'prepare', labelKR: '정화와 축원의 순서를 준비한다' },
    { kind: 'act', labelKR: '경계와 축원을 실행한다' },
  ],
  guide: [
    { kind: 'observe', labelKR: '날씨와 영역의 위험을 읽는다' },
    { kind: 'prepare', labelKR: '안전한 경로와 우회로를 표시한다' },
    { kind: 'act', labelKR: '영웅의 원정 경로를 이끈다' },
  ],
  bond: [
    { kind: 'observe', labelKR: '동료의 말과 표정을 살핀다' },
    { kind: 'reconcile', labelKR: '엇갈린 감정을 풀어 본다' },
    { kind: 'act', labelKR: '작은 공동 작업으로 신뢰를 확인한다' },
  ],
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

function createPlanState(
  source: VillageSaveEnvelope,
  agentId: SupportAgentId,
  goal: VillageAgentGoal,
  tick: number,
  interruptionCount = 0,
): VillageAgentPlanState {
  const ai = getVillageAIState(source);
  const steps = PLAN_STEPS_BY_GOAL[goal].map((step) => ({ ...step }));
  const duration = steps.length + 1 + Math.floor(deterministicUnit(`${ai.seed}:agent-plan:${agentId}:${goal}:${tick}`) * 2);
  return {
    goal,
    steps,
    currentStep: 0,
    createdAtTick: tick,
    expiresAtTick: tick + duration,
    interruptionCount: clamp(Math.floor(interruptionCount), 0, 1_000),
    lastReplannedTick: tick,
  };
}

function planForGoal(
  source: VillageSaveEnvelope,
  agentId: SupportAgentId,
  goal: VillageAgentGoal,
  tick: number,
): VillageAgentPlanState {
  const cognition = getVillageAgentCognitionState(source, agentId);
  const activePlan = cognition.plan;
  if (activePlan
    && activePlan.goal === goal
    && activePlan.currentStep < activePlan.steps.length
    && tick < activePlan.expiresAtTick) return activePlan;
  return createPlanState(source, agentId, goal, tick, activePlan?.interruptionCount ?? 0);
}

function averageBelief(
  source: VillageSaveEnvelope,
  agentId: SupportAgentId,
  kind: VillageAgentBeliefKind,
): number {
  const cognition = getVillageAgentCognitionState(source, agentId);
  const beliefs = cognition.beliefs.filter((belief) => belief.kind === kind);
  if (beliefs.length === 0) return 0.5;
  return beliefs.reduce((total, belief) => total + belief.value, 0) / beliefs.length;
}

function salientMemoryScore(
  source: VillageSaveEnvelope,
  agentId: SupportAgentId,
  tag: 'success' | 'failure' | 'conflict' | 'support',
): number {
  return getVillageAgentCognitionState(source, agentId).memories
    .filter((memory) => memory.tag === tag)
    .reduce((total, memory) => total + memory.salience, 0);
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
  const weatherSafety = getVillageAgentBeliefValue(source, agentId, 'weather_safety', 'village', 0.5);
  const supplySecurity = getVillageAgentBeliefValue(source, agentId, 'supply_security', 'village', 0.5);
  const heroTrustBelief = getVillageAgentBeliefValue(source, agentId, 'hero_trust', 'hero', trust / 100);
  const realmThreat = averageBelief(source, agentId, 'realm_threat');
  const conflictMemory = salientMemoryScore(source, agentId, 'conflict');
  const failureMemory = salientMemoryScore(source, agentId, 'failure');
  const activePlanBias = (goal: VillageAgentGoal): number => getVillageAgentCognitionState(source, agentId).plan?.goal === goal ? 7 : 0;
  const specialtyGoal = SPECIALTY_GOAL_BY_AGENT[agentId];
  const available = Boolean(agent && !agent.activeTaskId && fatigue < 100);
  const candidates: VillageAgentPlanCandidate[] = [
    {
      agentId,
      goal: 'recover',
      goalLabel: VILLAGE_AGENT_GOAL_LABELS.recover,
      score: 22 + fatigue * 1.15 + brain.stress * 0.3 + failureMemory * 4 + activePlanBias('recover'),
      reason: goalReason('recover', fatigue, relation, 0),
      rationale: `피로 ${Math.round(fatigue)}%와 긴장 ${Math.round(brain.stress)}%${failureMemory > 0.4 ? ', 최근 실패 기억' : ''}를 반영해 숨을 고른다.`,
      schedule: makeSchedule(source, agentId, 'recover', goalReason('recover', fatigue, relation, 0), tick),
      plan: planForGoal(source, agentId, 'recover', tick),
      available,
    },
    {
      agentId,
      goal: specialtyGoal,
      goalLabel: VILLAGE_AGENT_GOAL_LABELS[specialtyGoal],
      // Each specialty reads a different part of the same world. A planner
      // may therefore keep the role while changing its confidence in the
      // next step instead of behaving as if it had perfect information.
      score: 32
        + (100 - fatigue) * 0.2
        + trust * 0.28
        + brain.goalProgress * 0.18
        + relation * 16
        + weatherBonus
        + (specialtyGoal === 'craft' ? supplySecurity * 10 : 0)
        + (specialtyGoal === 'ward' ? realmThreat * 18 + (1 - weatherSafety) * 10 : 0)
        + (specialtyGoal === 'guide' ? (1 - weatherSafety) * 12 + realmThreat * 12 : 0)
        + heroTrustBelief * 5
        + activePlanBias(specialtyGoal),
      reason: goalReason(specialtyGoal, fatigue, relation, weatherBonus),
      rationale: `${VILLAGE_AGENT_GOAL_LABELS[specialtyGoal]}에 대한 준비도 ${Math.round(brain.goalProgress)}%, 영웅 신뢰 ${Math.round(trust)}%, 개인 판단 신뢰 ${Math.round(heroTrustBelief * 100)}%를 반영했다.${weatherBonus > 0 ? ' 현재 날씨가 이 역할을 돕는다.' : ''}`,
      schedule: makeSchedule(source, agentId, specialtyGoal, goalReason(specialtyGoal, fatigue, relation, weatherBonus), tick),
      plan: planForGoal(source, agentId, specialtyGoal, tick),
      available,
    },
    {
      agentId,
      goal: 'bond',
      goalLabel: VILLAGE_AGENT_GOAL_LABELS.bond,
      score: 20
        + (100 - trust) * 0.42
        + Math.max(0, -relation) * 22
        + conflictMemory * 18
        + (1 - averageBelief(source, agentId, 'peer_trust')) * 12
        + (brain.stress >= 60 ? 8 : 0),
      reason: goalReason('bond', fatigue, relation, 0),
      rationale: relation < -0.2
        ? `동료 관계가 ${relation.toFixed(2)}로 긴장되어 먼저 대화를 회복하려 한다.`
        : `영웅 신뢰 ${Math.round(trust)}%와 동료 관계를 살피며 유대를 쌓으려 한다.`,
      schedule: makeSchedule(source, agentId, 'bond', goalReason('bond', fatigue, relation, 0), tick),
      plan: planForGoal(source, agentId, 'bond', tick),
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
  const elapsedWorldTicks = Math.max(0, tick - ai.world.lastSimulatedDay);
  decayVillageAgentCognition(save, elapsedWorldTicks);
  for (const agentId of VILLAGE_SUPPORT_AGENT_IDS) {
    const brain = brains[agentId];
    const agent = save.meta.agents.find((candidate) => candidate.id === agentId);
    if (!brain) continue;
    const cognition = observeVillageAgentWorld(save, agentId, tick);
    const plan = calculatePlan(save, agentId, tick).selected;
    const previousGoal = brain.goal;
    const elapsedTicks = Math.max(1, tick - brain.lastDecisionTick);
    const activePlan = cognition.plan;
    const planExpired = !activePlan || tick >= activePlan.expiresAtTick;
    const goalChanged = activePlan?.goal !== plan.goal;
    const interrupted = ai.pendingEvents.length > 0;
    if (planExpired || goalChanged || interrupted) {
      cognition.plan = createPlanState(
        save,
        agentId,
        plan.goal,
        tick,
        (activePlan?.interruptionCount ?? 0) + (interrupted ? 1 : 0),
      );
    } else if (activePlan) {
      activePlan.currentStep = Math.min(
        activePlan.steps.length - 1,
        activePlan.currentStep + Math.min(1, Math.floor(elapsedTicks / 2)),
      );
    }
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
  const updatedAt = save.updatedAt;
  recordVillageAgentBelief(save, leftAgentId, 'peer_trust', rightAgentId, (left.relationships[rightAgentId] + 1) / 2, 'outcome', updatedAt);
  recordVillageAgentBelief(save, rightAgentId, 'peer_trust', leftAgentId, (right.relationships[leftAgentId] + 1) / 2, 'outcome', updatedAt);
  const tag = safeDelta >= 0 ? 'support' : 'conflict';
  const summary = safeDelta >= 0
    ? `${rightAgentId}와의 협력이 조금 나아졌다.`
    : `${rightAgentId}와의 의견 충돌이 남았다.`;
  recordVillageAgentMemory(save, leftAgentId, tag, summary, safeDelta, 0.58, updatedAt, rightAgentId);
  recordVillageAgentMemory(
    save,
    rightAgentId,
    tag,
    safeDelta >= 0 ? `${leftAgentId}와의 협력이 조금 나아졌다.` : `${leftAgentId}와의 의견 충돌이 남았다.`,
    safeDelta,
    0.58,
    updatedAt,
    leftAgentId,
  );
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
  const tag = outcome === 'success' ? 'success' : outcome === 'failure' ? 'failure' : 'support';
  const summary = outcome === 'success'
    ? '맡은 역할을 끝까지 수행했다.'
    : outcome === 'failure'
      ? '맡은 역할에서 기대한 결과를 내지 못했다.'
      : '마을의 선택을 돕고 동료의 신뢰를 확인했다.';
  recordVillageAgentMemory(
    save,
    agentId,
    tag,
    summary,
    outcome === 'success' ? 0.7 : outcome === 'failure' ? -0.7 : 0.25,
    outcome === 'failure' ? 0.82 : 0.68,
    save.updatedAt,
  );
  const cognition = ensureVillageAgentCognition(save, agentId);
  if (cognition.plan) {
    if (outcome === 'failure') {
      cognition.plan.interruptionCount = Math.min(1_000, cognition.plan.interruptionCount + 1);
      cognition.plan.currentStep = 0;
    } else {
      cognition.plan.currentStep = Math.min(cognition.plan.steps.length - 1, cognition.plan.currentStep + 1);
    }
  }
  brain.lastDecisionTick = Math.max(brain.lastDecisionTick, safeTickValue);
}
