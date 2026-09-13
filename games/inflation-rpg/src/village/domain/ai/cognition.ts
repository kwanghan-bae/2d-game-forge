import { REALM_IDS } from '../../data';
import type {
  RealmId,
  SupportAgentId,
  VillageAgentBelief,
  VillageAgentBeliefKind,
  VillageAgentBeliefSource,
  VillageAgentCognitionState,
  VillageAgentMemoryTag,
  VillageFactionId,
  VillageSaveEnvelope,
} from '../../types';
import { Village_MAX_AGENT_BELIEFS, Village_MAX_AGENT_MEMORIES } from '../../types';
import {
  ensureVillageAgentCognition,
  getVillageAgentCognitionState,
  getVillageAgentAIState,
  getVillageAIState,
  deterministicUnit,
  VILLAGE_FACTION_IDS,
  VILLAGE_SUPPORT_AGENT_IDS,
} from './state';

interface BeliefInput {
  kind: VillageAgentBeliefKind;
  subject: VillageAgentBelief['subject'];
  value: number;
}

const WEATHER_SAFETY: Record<VillageSaveEnvelope['meta']['ai']['world']['weather'], number> = {
  clear: 0.92,
  rain: 0.66,
  fog: 0.44,
  wind: 0.58,
};

const FACTION_LABELS: Record<VillageFactionId, string> = {
  village: '마을',
  merchants: '상단',
  spirits: '정령',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function stableIdOrder(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function finite(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function safeTick(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback;
}

function beliefId(kind: VillageAgentBeliefKind, subject: VillageAgentBelief['subject']): string {
  return `belief-${kind}-${subject}`;
}

function roleBias(
  agentId: SupportAgentId,
  kind: VillageAgentBeliefKind,
  subject: VillageAgentBelief['subject'],
): number {
  if (kind === 'weather_safety') return agentId === 'guide' ? -0.08 : agentId === 'mudang' ? 0.04 : 0;
  if (kind === 'realm_threat') return agentId === 'guide' ? 0.06 : agentId === 'mudang' ? 0.04 : 0.02;
  if (kind === 'supply_security' && agentId === 'blacksmith') return -0.05;
  if (kind === 'faction_trust') {
    if (agentId === 'blacksmith' && subject === 'merchants') return 0.05;
    if (agentId === 'mudang' && subject === 'spirits') return 0.06;
    if (agentId === 'guide' && subject === 'village') return 0.04;
  }
  if (kind === 'faction_tension') {
    if (agentId === 'blacksmith' && subject === 'merchants') return 0.04;
    if (agentId === 'mudang' && subject === 'spirits') return 0.06;
    if (agentId === 'guide' && subject === 'village') return 0.03;
  }
  return 0;
}

function roleConfidence(
  agentId: SupportAgentId,
  kind: VillageAgentBeliefKind,
  subject: VillageAgentBelief['subject'],
): number {
  if (agentId === 'guide' && (kind === 'weather_safety' || kind === 'realm_threat')) return 0.84;
  if (agentId === 'mudang' && (kind === 'weather_safety' || kind === 'realm_threat')) return 0.8;
  if (agentId === 'blacksmith' && kind === 'supply_security') return 0.84;
  if (agentId === 'blacksmith' && (kind === 'faction_trust' || kind === 'faction_tension') && subject === 'merchants') return 0.84;
  if (agentId === 'mudang' && (kind === 'faction_trust' || kind === 'faction_tension') && subject === 'spirits') return 0.86;
  if (agentId === 'guide' && (kind === 'faction_trust' || kind === 'faction_tension') && subject === 'village') return 0.8;
  return 0.62;
}

function actualBeliefs(source: VillageSaveEnvelope, agentId: SupportAgentId): BeliefInput[] {
  const ai = getVillageAIState(source);
  const agent = source.meta.agents.find((candidate) => candidate.id === agentId);
  const materials = clamp(finite(source.meta.currencies.materials) / 12, 0, 1);
  const weatherSafety = WEATHER_SAFETY[ai.world.weather] ?? 0.5;
  const inputs: BeliefInput[] = [
    { kind: 'hero_trust', subject: 'hero', value: clamp(finite(agent?.trust) / 100, 0, 1) },
    { kind: 'supply_security', subject: 'village', value: materials },
    { kind: 'weather_safety', subject: 'village', value: weatherSafety },
  ];
  for (const factionId of VILLAGE_FACTION_IDS) {
    const faction = ai.world.factions?.[factionId];
    inputs.push({ kind: 'faction_trust', subject: factionId, value: clamp(finite(faction?.trust, 0.5), 0, 1) });
    inputs.push({ kind: 'faction_tension', subject: factionId, value: clamp(finite(faction?.tension, 0.5), 0, 1) });
  }
  for (const realmId of REALM_IDS) {
    inputs.push({ kind: 'realm_threat', subject: realmId, value: clamp(finite(ai.world.threatByRealm[realmId]), 0, 1) });
  }
  return inputs;
}

function actualBeliefsForAgent(source: VillageSaveEnvelope, agentId: SupportAgentId): BeliefInput[] {
  const brain = getVillageAgentAIState(source, agentId);
  const peers = VILLAGE_SUPPORT_AGENT_IDS
    .filter((targetId) => targetId !== agentId)
    .map((targetId): BeliefInput => ({
      kind: 'peer_trust',
      subject: targetId,
      value: clamp((finite(brain.relationships[targetId]) + 1) / 2, 0, 1),
    }));
  return [...actualBeliefs(source, agentId), ...peers];
}

function isSameBelief(left: VillageAgentBelief, right: BeliefInput): boolean {
  return left.kind === right.kind && left.subject === right.subject;
}

function upsertBelief(
  cognition: VillageAgentCognitionState,
  belief: VillageAgentBelief,
): void {
  const index = cognition.beliefs.findIndex((candidate) => candidate.id === belief.id);
  if (index >= 0) cognition.beliefs[index] = belief;
  else cognition.beliefs.push(belief);
  cognition.beliefs = cognition.beliefs.slice(-Village_MAX_AGENT_BELIEFS);
}

function memorySubjectLabel(kind: VillageAgentBeliefKind, subject: VillageAgentBelief['subject']): string {
  if (kind === 'hero_trust') return '영웅에 대한 신뢰';
  if (kind === 'supply_security') return '마을 비축 상태';
  if (kind === 'weather_safety') return '현재 날씨의 안전도';
  if (kind === 'peer_trust') return `${subject} 동료와의 신뢰`;
  if (kind === 'faction_trust') {
    return `${FACTION_LABELS[subject as VillageFactionId] ?? subject} 세력에 대한 신뢰`;
  }
  if (kind === 'faction_tension') {
    return `${FACTION_LABELS[subject as VillageFactionId] ?? subject} 세력의 긴장도`;
  }
  return `${subject} 영역의 위협도`;
}

export function getVillageAgentBelief(
  source: VillageSaveEnvelope,
  agentId: SupportAgentId,
  kind: VillageAgentBeliefKind,
  subject: VillageAgentBelief['subject'],
): VillageAgentBelief | null {
  return getVillageAgentCognitionState(source, agentId).beliefs.find((belief) => (
    belief.kind === kind && belief.subject === subject
  )) ?? null;
}

export function getVillageAgentBeliefValue(
  source: VillageSaveEnvelope,
  agentId: SupportAgentId,
  kind: VillageAgentBeliefKind,
  subject: VillageAgentBelief['subject'],
  fallback = 0.5,
): number {
  const belief = getVillageAgentBelief(source, agentId, kind, subject);
  return belief ? belief.value : fallback;
}

/**
 * Reconciles the agent's partial, role-biased view with the true world state.
 * The seed makes observation noise replayable while confidence prevents every
 * new tick from erasing a belief formed by an earlier event.
 */
export function observeVillageAgentWorld(
  save: VillageSaveEnvelope,
  agentId: SupportAgentId,
  tick: number,
): VillageAgentCognitionState {
  const cognition = ensureVillageAgentCognition(save, agentId);
  const ai = getVillageAIState(save);
  const safeWorldTick = safeTick(tick, ai.world.lastSimulatedDay);
  const inputs = actualBeliefsForAgent(save, agentId);
  for (const input of inputs) {
    const previous = cognition.beliefs.find((candidate) => isSameBelief(candidate, input));
    const noise = (deterministicUnit(`${ai.seed}:observe:${agentId}:${input.kind}:${input.subject}:${safeWorldTick}`) - 0.5) * 0.12;
    const observed = clamp(input.value + roleBias(agentId, input.kind, input.subject) + noise, 0, 1);
    const priorWeight = previous ? clamp(previous.confidence * 0.55, 0.18, 0.55) : 0;
    const value = previous
      ? clamp(previous.value * priorWeight + observed * (1 - priorWeight), 0, 1)
      : observed;
    const confidence = clamp(
      (previous?.confidence ?? 0.45) * 0.35 + roleConfidence(agentId, input.kind, input.subject) * 0.65,
      0.35,
      0.95,
    );
    upsertBelief(cognition, {
      id: beliefId(input.kind, input.subject),
      kind: input.kind,
      subject: input.subject,
      value,
      confidence,
      source: 'observation',
      updatedAt: safeWorldTick,
    });
    if (previous && Math.abs(previous.value - value) >= 0.25) {
      recordVillageAgentMemory(
        save,
        agentId,
        'observation',
        `${memorySubjectLabel(input.kind, input.subject)}에 대한 판단이 크게 바뀌었다.`,
        value >= previous.value ? 0.2 : -0.2,
        0.52,
        save.updatedAt,
        input.kind === 'peer_trust' && VILLAGE_SUPPORT_AGENT_IDS.includes(input.subject as SupportAgentId)
          ? input.subject as SupportAgentId
          : null,
      );
    }
  }
  return cognition;
}

export function recordVillageAgentBelief(
  save: VillageSaveEnvelope,
  agentId: SupportAgentId,
  kind: VillageAgentBeliefKind,
  subject: VillageAgentBelief['subject'],
  value: number,
  source: VillageAgentBeliefSource,
  updatedAt: number,
): void {
  const cognition = ensureVillageAgentCognition(save, agentId);
  if (!Number.isFinite(value) || !Number.isFinite(updatedAt)) return;
  const current = getVillageAgentBelief(save, agentId, kind, subject);
  upsertBelief(cognition, {
    id: beliefId(kind, subject),
    kind,
    subject,
    value: clamp(value, 0, 1),
    confidence: source === 'outcome' ? 0.86 : current?.confidence ?? 0.55,
    source,
    updatedAt: Math.max(0, updatedAt),
  });
}

export function recordVillageAgentMemory(
  save: VillageSaveEnvelope,
  agentId: SupportAgentId,
  tag: VillageAgentMemoryTag,
  summary: string,
  valence: number,
  salience: number,
  createdAt: number,
  relatedAgentId: SupportAgentId | null = null,
): void {
  if (!summary.trim() || !Number.isFinite(createdAt)) return;
  const cognition = ensureVillageAgentCognition(save, agentId);
  const normalizedSummary = summary.trim().slice(0, 160);
  const normalizedRelatedAgentId = relatedAgentId && VILLAGE_SUPPORT_AGENT_IDS.includes(relatedAgentId)
    ? relatedAgentId
    : null;
  const existing = cognition.memories.find((memory) => (
    memory.tag === tag
      && memory.summary === normalizedSummary
      && memory.createdAt === createdAt
      && memory.relatedAgentId === normalizedRelatedAgentId
  ));
  if (existing) {
    existing.salience = clamp(Math.max(existing.salience, salience), 0, 1);
    existing.valence = clamp(valence, -1, 1);
    return;
  }
  const idBase = `agent-memory-${agentId}-${tag}-${Math.floor(createdAt)}-${normalizedRelatedAgentId ?? 'world'}`;
  let id = idBase;
  let suffix = 2;
  while (cognition.memories.some((memory) => memory.id === id)) {
    id = `${idBase}-${suffix}`;
    suffix += 1;
  }
  cognition.memories.unshift({
    id,
    tag,
    summary: normalizedSummary,
    valence: clamp(valence, -1, 1),
    salience: clamp(salience, 0, 1),
    createdAt,
    relatedAgentId: normalizedRelatedAgentId,
  });
  cognition.memories = cognition.memories
    .sort((left, right) => right.salience - left.salience || right.createdAt - left.createdAt || stableIdOrder(left.id, right.id))
    .slice(0, Village_MAX_AGENT_MEMORIES);
}

export function decayVillageAgentCognition(save: VillageSaveEnvelope, elapsedTicks: number): void {
  const ticks = Number.isFinite(elapsedTicks) && elapsedTicks > 0
    ? Math.min(30, Math.floor(elapsedTicks))
    : 0;
  if (ticks <= 0) return;
  for (const agentId of VILLAGE_SUPPORT_AGENT_IDS) {
    const cognition = ensureVillageAgentCognition(save, agentId);
    cognition.memories = cognition.memories
      .map((memory) => ({ ...memory, salience: clamp(memory.salience - ticks * 0.025, 0, 1) }))
      .sort((left, right) => right.salience - left.salience || right.createdAt - left.createdAt || stableIdOrder(left.id, right.id))
      .slice(0, Village_MAX_AGENT_MEMORIES);
    cognition.beliefs = cognition.beliefs.map((belief) => ({
      ...belief,
      confidence: clamp(belief.confidence - ticks * 0.01, 0.2, 0.95),
    }));
  }
}
