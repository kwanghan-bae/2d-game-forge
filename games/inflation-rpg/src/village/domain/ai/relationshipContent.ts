import type {
  SupportAgentId,
  VillageAgentGoal,
  VillageAgentMemoryEffect,
  VillageAgentMemoryTag,
  VillageFactionId,
  VillageRelationshipArcKind,
  VillageSaveEnvelope,
  VillageWorldChainKind,
  VillageWorldChainState,
  VillageWorldEvent,
  VillageWorldEventChoice,
  VillageWorldEventEffects,
  VillageWorldEventType,
} from '../../types';
import { VILLAGE_RELATIONSHIP_ARC_KINDS } from '../../types';
import {
  deterministicUnit,
  getVillageAgentAIState,
  getVillageAgentCognitionState,
  getVillageAIState,
  getVillageSimulationState,
  VILLAGE_SUPPORT_AGENT_IDS,
  Village_WORLD_DAY_MS,
} from './state';

export interface VillageRelationshipArcDefinition {
  kind: VillageRelationshipArcKind;
  leftAgentId: SupportAgentId;
  rightAgentId: SupportAgentId;
  factionId: VillageFactionId;
  eventType: VillageWorldEventType;
  labelKR: string;
}

export const VILLAGE_RELATIONSHIP_ARC_DEFINITIONS: Record<VillageRelationshipArcKind, VillageRelationshipArcDefinition> = {
  forge_route_dispute: {
    kind: 'forge_route_dispute',
    leftAgentId: 'blacksmith',
    rightAgentId: 'guide',
    factionId: 'merchants',
    eventType: 'supply',
    labelKR: '부서진 약속의 수레',
  },
  bellows_vigil: {
    kind: 'bellows_vigil',
    leftAgentId: 'mudang',
    rightAgentId: 'blacksmith',
    factionId: 'spirits',
    eventType: 'omen',
    labelKR: '꺼지지 않는 종',
  },
  waystone_rite: {
    kind: 'waystone_rite',
    leftAgentId: 'guide',
    rightAgentId: 'mudang',
    factionId: 'village',
    eventType: 'weather',
    labelKR: '안개 속의 이정표',
  },
};

/** Relationship arcs intentionally use two acts; the shared world chain cap remains unchanged. */
export const VILLAGE_RELATIONSHIP_ARC_FINAL_STEP = 1 as const;

const RELATIONSHIP_ARC_CADENCE_START_DAY = 12;
const RELATIONSHIP_ARC_CADENCE_DAYS = 6;

const SEASON_LABELS: Record<string, string> = {
  spring: '봄',
  summer: '여름',
  autumn: '가을',
  winter: '겨울',
};

const AGENT_NAMES: Record<SupportAgentId, string> = {
  blacksmith: '담철',
  mudang: '월령',
  guide: '솔바람',
};

const AGENT_GOAL_LABELS: Record<VillageAgentGoal, string> = {
  recover: '회복 우선',
  craft: '정밀 제작',
  ward: '마을 수호',
  guide: '원정 경로 탐색',
  bond: '동료와 유대',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function agentName(source: VillageSaveEnvelope, agentId: SupportAgentId): string {
  return source.meta.agents.find((agent) => agent.id === agentId)?.nameKR ?? AGENT_NAMES[agentId];
}

function agentGoal(source: VillageSaveEnvelope, agentId: SupportAgentId): VillageAgentGoal {
  const brain = getVillageAgentAIState(source, agentId);
  return getVillageAgentCognitionState(source, agentId).plan?.goal ?? brain.goal;
}

function agentContext(source: VillageSaveEnvelope, agentId: SupportAgentId): string {
  const agent = source.meta.agents.find((candidate) => candidate.id === agentId);
  const brain = getVillageAgentAIState(source, agentId);
  return `${agentName(source, agentId)}은(는) ${AGENT_GOAL_LABELS[agentGoal(source, agentId)]}을 준비 중이고, 피로 ${Math.round(safeNumber(agent?.fatigue))}%, 긴장 ${Math.round(safeNumber(brain.stress))}%다.`;
}

function makeChoice(
  id: string,
  title: string,
  text: string,
  effects: VillageWorldEventEffects,
): VillageWorldEventChoice {
  return { id, title, text, effects };
}

function pairMemory(
  leftAgentId: SupportAgentId,
  left: { tag: VillageAgentMemoryTag; summary: string; valence: number; salience: number },
  rightAgentId: SupportAgentId,
  right: { tag: VillageAgentMemoryTag; summary: string; valence: number; salience: number },
): Partial<Record<SupportAgentId, VillageAgentMemoryEffect>> {
  return {
    [leftAgentId]: { ...left, relatedAgentId: rightAgentId },
    [rightAgentId]: { ...right, relatedAgentId: leftAgentId },
  };
}

function buildEvent(
  source: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  kind: VillageRelationshipArcKind,
  step: number,
  title: string,
  cause: string,
  prompt: string,
  choices: VillageWorldEventChoice[],
  chainId?: string,
  parentEventId?: string,
): VillageWorldEvent {
  void source;
  const definition = VILLAGE_RELATIONSHIP_ARC_DEFINITIONS[kind];
  const resolvedChainId = chainId ?? `world-relationship-${kind}-${day}`;
  const eventId = step === 0
    ? `world-event-${day}-relationship-${kind}`
    : `${resolvedChainId}-step-${step}-day-${day}`;
  const event: VillageWorldEvent = {
    id: eventId,
    type: definition.eventType,
    day,
    createdAt,
    expiresAt: createdAt + Village_WORLD_DAY_MS * 2,
    title,
    cause,
    prompt,
    choices,
    chainId: resolvedChainId,
    chainKind: kind,
    chainStep: step,
    factionId: definition.factionId,
  };
  if (parentEventId) event.parentEventId = parentEventId;
  return event;
}

function previousChoiceId(source: VillageSaveEnvelope, chain: VillageWorldChainState | undefined): string | null {
  if (!chain) return null;
  return getVillageSimulationState(source).eventHistory.find((record) => record.eventId === chain.lastEventId)?.choiceId ?? null;
}

function hasActiveRelationshipArc(source: VillageSaveEnvelope, kind: VillageRelationshipArcKind): boolean {
  const ai = getVillageAIState(source);
  return (ai.world.chains ?? []).some((chain) => chain.kind === kind)
    || ai.pendingEvents.some((event) => event.chainKind === kind);
}

function hasAnyActiveRelationshipArc(source: VillageSaveEnvelope): boolean {
  const ai = getVillageAIState(source);
  return (ai.world.chains ?? []).some((chain) => isVillageRelationshipArcKind(chain.kind))
    || ai.pendingEvents.some((event) => isVillageRelationshipArcKind(event.chainKind));
}

function pairAffinity(source: VillageSaveEnvelope, definition: VillageRelationshipArcDefinition): number {
  const left = getVillageAgentAIState(source, definition.leftAgentId);
  const right = getVillageAgentAIState(source, definition.rightAgentId);
  return (safeNumber(left.relationships[definition.rightAgentId])
    + safeNumber(right.relationships[definition.leftAgentId])) / 2;
}

function pairConflictMemory(source: VillageSaveEnvelope, definition: VillageRelationshipArcDefinition): number {
  const leftMemories = getVillageAgentCognitionState(source, definition.leftAgentId).memories;
  const rightMemories = getVillageAgentCognitionState(source, definition.rightAgentId).memories;
  const leftScore = leftMemories
    .filter((memory) => memory.relatedAgentId === definition.rightAgentId
      && (memory.tag === 'conflict' || memory.tag === 'failure'))
    .reduce((total, memory) => total + memory.salience, 0);
  const rightScore = rightMemories
    .filter((memory) => memory.relatedAgentId === definition.leftAgentId
      && (memory.tag === 'conflict' || memory.tag === 'failure'))
    .reduce((total, memory) => total + memory.salience, 0);
  return clamp((leftScore + rightScore) / 2, 0, 1);
}

function relationshipArcPressure(source: VillageSaveEnvelope, kind: VillageRelationshipArcKind): number {
  const definition = VILLAGE_RELATIONSHIP_ARC_DEFINITIONS[kind];
  const leftAgent = source.meta.agents.find((agent) => agent.id === definition.leftAgentId);
  const rightAgent = source.meta.agents.find((agent) => agent.id === definition.rightAgentId);
  const leftBrain = getVillageAgentAIState(source, definition.leftAgentId);
  const rightBrain = getVillageAgentAIState(source, definition.rightAgentId);
  const goalMismatch = agentGoal(source, definition.leftAgentId) === agentGoal(source, definition.rightAgentId) ? 0 : 1;
  const averageFatigue = (safeNumber(leftAgent?.fatigue) + safeNumber(rightAgent?.fatigue)) / 2;
  const averageStress = (safeNumber(leftBrain.stress) + safeNumber(rightBrain.stress)) / 2;
  const averageTrust = (safeNumber(leftAgent?.trust) + safeNumber(rightAgent?.trust)) / 2;
  return clamp(
    Math.max(0, -pairAffinity(source, definition)) * 0.44
      + (1 - averageTrust / 100) * 0.12
      + averageFatigue / 100 * 0.12
      + averageStress / 100 * 0.12
      + pairConflictMemory(source, definition) * 0.15
      + goalMismatch * 0.05,
    0,
    1,
  );
}

/** Selects one bounded shared story during a scheduled window or under sustained relationship pressure. */
export function selectVillageRelationshipArcKind(
  source: VillageSaveEnvelope,
  day: number,
): VillageRelationshipArcKind | null {
  if (!Number.isSafeInteger(day) || day < RELATIONSHIP_ARC_CADENCE_START_DAY) return null;
  const ai = getVillageAIState(source);
  if (hasAnyActiveRelationshipArc(source)) return null;
  const available = VILLAGE_RELATIONSHIP_ARC_KINDS.filter((kind) => !hasActiveRelationshipArc(source, kind));
  if (available.length === 0) return null;

  const relationshipStarts = getVillageSimulationState(source).eventHistory
    .filter((record) => isVillageRelationshipArcKind(record.chainKind) && record.chainStep === 0)
    .map((record) => record.day);
  const lastRelationshipStart = relationshipStarts.length > 0 ? Math.max(...relationshipStarts) : null;
  const nextOpportunityStart = lastRelationshipStart === null
    ? RELATIONSHIP_ARC_CADENCE_START_DAY
    : lastRelationshipStart + RELATIONSHIP_ARC_CADENCE_DAYS;
  // A due faction chain can occupy the exact scheduled day. Keep the window
  // open so a shared story is delayed, not silently lost.
  const scheduled = day >= nextOpportunityStart
    && day < nextOpportunityStart + RELATIONSHIP_ARC_CADENCE_DAYS * 2;
  const needsCoverage = relationshipStarts.length < VILLAGE_RELATIONSHIP_ARC_KINDS.length;
  const highestPressure = Math.max(...available.map((kind) => relationshipArcPressure(source, kind)));
  const spontaneous = deterministicUnit(`${ai.seed}:relationship-pressure:${day}`);
  if (!scheduled && !needsCoverage && (highestPressure < 0.84 || spontaneous >= 0.18)) return null;

  const slot = relationshipStarts.length;
  const preferred = VILLAGE_RELATIONSHIP_ARC_KINDS[
    (Math.abs(Math.floor(ai.seed)) + slot) % VILLAGE_RELATIONSHIP_ARC_KINDS.length
  ];
  if (needsCoverage && available.includes(preferred)) return preferred;
  if (scheduled && available.includes(preferred)) return preferred;
  return [...available].sort((left, right) => {
    const leftScore = relationshipArcPressure(source, left) + (left === preferred ? 0.28 : 0)
      + deterministicUnit(`${ai.seed}:relationship-order:${day}:${left}`) * 0.04;
    const rightScore = relationshipArcPressure(source, right) + (right === preferred ? 0.28 : 0)
      + deterministicUnit(`${ai.seed}:relationship-order:${day}:${right}`) * 0.04;
    if (leftScore !== rightScore) return rightScore - leftScore;
    return left < right ? -1 : left > right ? 1 : 0;
  })[0] ?? null;
}

function forgeRouteDisputeEvent(
  source: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  step: number,
  chainId: string,
  parentEventId: string | undefined,
  previousChoice: string | null,
): VillageWorldEvent {
  const blacksmith = agentName(source, 'blacksmith');
  const guide = agentName(source, 'guide');
  const season = SEASON_LABELS[getVillageAIState(source).world.season] ?? '계절';
  if (step === 0) {
    return buildEvent(
      source,
      day,
      createdAt,
      'forge_route_dispute',
      step,
      '부러진 수레바퀴가 작업대 앞에 멈췄다',
      `${season}의 상단 수레가 예정 시간보다 일찍 돌아왔다. ${agentContext(source, 'blacksmith')} ${agentContext(source, 'guide')}`,
      '수레를 함께 고칠 것인가, 예정된 길을 바꿀 것인가?',
      [
        makeChoice(
          'relay-repair-first',
          '함께 고친다',
          `${blacksmith}이(가) 바퀴를 붙들고, ${guide}은(는) 수레가 다시 지나갈 길을 함께 확인한다.`,
          {
            agentTrustDelta: { blacksmith: 3, guide: 3 },
            agentFatigueDelta: { blacksmith: 5, guide: 5 },
            heroMoraleDelta: 2,
            prosperityDelta: 2,
            factionTrustDelta: { merchants: 0.06, village: 0.03 },
            factionTensionDelta: { merchants: -0.04 },
            agentRelationshipDelta: [{ leftAgentId: 'blacksmith', rightAgentId: 'guide', delta: 0.14 }],
            agentMemory: pairMemory(
              'blacksmith',
              { tag: 'support', summary: `${blacksmith}은(는) ${guide}과(와) 수레를 함께 고치며 책임을 나누었다.`, valence: 0.62, salience: 0.94 },
              'guide',
              { tag: 'support', summary: `${guide}은(는) ${blacksmith}과(와) 수레의 길과 바퀴를 함께 맞췄다.`, valence: 0.62, salience: 0.94 },
            ),
          },
        ),
        makeChoice(
          'relay-route-first',
          '먼저 우회한다',
          `${guide}이(가) 안전한 우회로를 정하고, ${blacksmith}의 작업대는 다음 수레를 위해 남겨 둔다.`,
          {
            agentTrustDelta: { blacksmith: -1, guide: 3 },
            agentFatigueDelta: { blacksmith: -2, guide: 3 },
            heroPurposeDelta: 3,
            factionTrustDelta: { merchants: -0.02, village: 0.05 },
            factionInfluenceDelta: { village: 0.03 },
            factionTensionDelta: { merchants: 0.05 },
            agentRelationshipDelta: [{ leftAgentId: 'blacksmith', rightAgentId: 'guide', delta: -0.08 }],
            agentMemory: pairMemory(
              'blacksmith',
              { tag: 'conflict', summary: `${blacksmith}은(는) ${guide}이(가) 수리보다 우회를 먼저 택한 일을 오래 생각했다.`, valence: -0.32, salience: 0.9 },
              'guide',
              { tag: 'choice', summary: `${guide}은(는) ${blacksmith}의 손을 기다리지 않고 수레를 우회시켰다.`, valence: 0.18, salience: 0.84 },
            ),
          },
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  if (previousChoice === 'relay-repair-first') {
    return buildEvent(
      source,
      day,
      createdAt,
      'forge_route_dispute',
      step,
      '새 철못이 길 위에서 울렸다',
      `${blacksmith}과(와) ${guide}이(가) 맞춘 첫 수레가 마을 밖에서 다시 삐걱거렸다.`,
      '완벽한 보강을 기다릴 것인가, 지금 가능한 길을 열 것인가?',
      [
        makeChoice(
          'relay-test-together',
          '끝까지 함께 시험한다',
          '두 사람의 이름을 수레 기록에 함께 적고, 짧은 길을 여러 번 오가며 보강을 확인한다.',
          {
            agentTrustDelta: { blacksmith: 4, guide: 4 },
            agentFatigueDelta: { blacksmith: 4, guide: 4 },
            heroMoraleDelta: 3,
            prosperityDelta: 3,
            factionTrustDelta: { merchants: 0.08, village: 0.04 },
            factionTensionDelta: { merchants: -0.05 },
            agentRelationshipDelta: [{ leftAgentId: 'blacksmith', rightAgentId: 'guide', delta: 0.12 }],
            agentMemory: pairMemory(
              'blacksmith',
              { tag: 'success', summary: `${blacksmith}은(는) ${guide}과(와) 수레의 첫 시험을 끝까지 함께 버텼다.`, valence: 0.72, salience: 0.96 },
              'guide',
              { tag: 'success', summary: `${guide}은(는) ${blacksmith}과(와) 길 위에서 수리의 결과를 확인했다.`, valence: 0.72, salience: 0.96 },
            ),
          },
        ),
        makeChoice(
          'relay-open-route',
          '표시된 길을 먼저 연다',
          `${guide}이(가) 위험 구간을 표시하고, ${blacksmith}은(는) 돌아온 뒤 고칠 곳을 기록한다.`,
          {
            agentTrustDelta: { blacksmith: 1, guide: 2 },
            agentFatigueDelta: { guide: 3 },
            heroPurposeDelta: 3,
            factionTrustDelta: { merchants: 0.04, village: 0.02 },
            factionTensionDelta: { merchants: 0.01 },
            agentRelationshipDelta: [{ leftAgentId: 'blacksmith', rightAgentId: 'guide', delta: 0.03 }],
            agentMemory: pairMemory(
              'blacksmith',
              { tag: 'observation', summary: `${blacksmith}은(는) ${guide}이(가) 표시한 길을 믿되, 수리할 흔적을 따로 적었다.`, valence: 0.28, salience: 0.84 },
              'guide',
              { tag: 'support', summary: `${guide}은(는) ${blacksmith}의 보강 기록을 기다리며 짧은 길부터 열었다.`, valence: 0.42, salience: 0.82 },
            ),
          },
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  return buildEvent(
    source,
    day,
    createdAt,
    'forge_route_dispute',
    step,
    '우회로 끝에 바퀴 자국이 끊겼다',
    `${guide}이(가) 고른 길 끝에서 수레의 자국이 끊겼고, ${blacksmith}의 작업대에는 아직 식지 않은 쇠가 남아 있다.`,
    '다시 돌아가 수리를 도울 것인가, 지금의 우회를 다음 약속으로 남길 것인가?',
    [
      makeChoice(
        'relay-turn-back',
        '돌아가 함께 고친다',
        `${guide}이(가) 수레를 되돌리고, ${blacksmith}은(는) 이번에는 무엇을 기다렸는지 먼저 묻는다.`,
        {
          agentTrustDelta: { blacksmith: 4, guide: 4 },
          agentFatigueDelta: { blacksmith: 3, guide: 4 },
          heroMoraleDelta: 2,
          factionTrustDelta: { merchants: 0.07, village: 0.03 },
          factionTensionDelta: { merchants: -0.04 },
          agentRelationshipDelta: [{ leftAgentId: 'blacksmith', rightAgentId: 'guide', delta: 0.13 }],
          agentMemory: pairMemory(
            'blacksmith',
            { tag: 'support', summary: `${blacksmith}은(는) ${guide}이(가) 돌아온 자리에서 수리와 길의 순서를 다시 맞췄다.`, valence: 0.58, salience: 0.92 },
            'guide',
            { tag: 'success', summary: `${guide}은(는) ${blacksmith}에게 돌아갈 수 있는 길을 함께 돌려주었다.`, valence: 0.64, salience: 0.92 },
          ),
        },
      ),
      makeChoice(
        'relay-mark-detour',
        '우회를 다음 약속으로 남긴다',
        '수레를 무리하게 되돌리지 않고, 두 사람이 다시 만날 장소와 시간을 길목에 적어 둔다.',
        {
          agentTrustDelta: { guide: 2 },
          agentFatigueDelta: { blacksmith: -3, guide: 2 },
          heroPurposeDelta: 4,
          factionInfluenceDelta: { village: 0.04 },
          factionTensionDelta: { merchants: 0.04 },
          agentRelationshipDelta: [{ leftAgentId: 'blacksmith', rightAgentId: 'guide', delta: -0.04 }],
          agentMemory: pairMemory(
            'blacksmith',
            { tag: 'conflict', summary: `${blacksmith}은(는) ${guide}과(와) 다시 만날 약속을 적었지만, 이번 수리의 빈자리를 기억했다.`, valence: -0.18, salience: 0.84 },
            'guide',
            { tag: 'observation', summary: `${guide}은(는) ${blacksmith}과(와) 맞지 않은 순서가 길을 늦춘 일을 기록했다.`, valence: 0.08, salience: 0.82 },
          ),
        },
      ),
    ],
    chainId,
    parentEventId,
  );
}

function bellowsVigilEvent(
  source: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  step: number,
  chainId: string,
  parentEventId: string | undefined,
  previousChoice: string | null,
): VillageWorldEvent {
  const mudang = agentName(source, 'mudang');
  const blacksmith = agentName(source, 'blacksmith');
  if (step === 0) {
    return buildEvent(
      source,
      day,
      createdAt,
      'bellows_vigil',
      step,
      '제례의 종과 쇠망치가 같은 밤 울렸다',
      `${mudang}의 제례 종이 울리는 시간과 ${blacksmith}의 방어 장비를 완성할 시간이 겹쳤다. ${agentContext(source, 'mudang')} ${agentContext(source, 'blacksmith')}`,
      '제례에 쓸 쇠를 먼저 내어줄 것인가, 마을을 지킬 장비를 먼저 완성할 것인가?',
      [
        makeChoice(
          'vigil-share-metal',
          '쇠를 나누어 쓴다',
          `${blacksmith}이(가) 필요한 쇠를 나누고, ${mudang}은(는) 남은 조각으로 종의 울림을 이어 간다.`,
          {
            agentTrustDelta: { mudang: 3, blacksmith: 3 },
            agentFatigueDelta: { mudang: 4, blacksmith: 5 },
            heroMoraleDelta: 3,
            prosperityDelta: 1,
            factionTrustDelta: { spirits: 0.07, merchants: 0.03, village: 0.02 },
            factionTensionDelta: { spirits: -0.04, merchants: -0.02 },
            agentRelationshipDelta: [{ leftAgentId: 'mudang', rightAgentId: 'blacksmith', delta: 0.14 }],
            agentMemory: pairMemory(
              'mudang',
              { tag: 'support', summary: `${mudang}은(는) ${blacksmith}과(와) 쇠를 나누며 제례와 방어를 한 약속으로 묶었다.`, valence: 0.62, salience: 0.94 },
              'blacksmith',
              { tag: 'support', summary: `${blacksmith}은(는) ${mudang}과(와) 남은 쇠의 쓰임을 함께 정했다.`, valence: 0.62, salience: 0.94 },
            ),
          },
        ),
        makeChoice(
          'vigil-guard-metal',
          '장비를 먼저 지킨다',
          `${blacksmith}은(는) 방어 장비를 먼저 완성하고, ${mudang}에게 제례의 시간을 늦춰 달라고 부탁한다.`,
          {
            agentTrustDelta: { mudang: -2, blacksmith: 3 },
            agentFatigueDelta: { mudang: 2, blacksmith: 4 },
            heroPurposeDelta: 3,
            factionTrustDelta: { merchants: 0.05, spirits: -0.03 },
            factionInfluenceDelta: { merchants: 0.03 },
            factionTensionDelta: { spirits: 0.06, merchants: -0.01 },
            agentRelationshipDelta: [{ leftAgentId: 'mudang', rightAgentId: 'blacksmith', delta: -0.08 }],
            agentMemory: pairMemory(
              'mudang',
              { tag: 'conflict', summary: `${mudang}은(는) ${blacksmith}이(가) 제례보다 장비를 먼저 택한 밤을 기억했다.`, valence: -0.32, salience: 0.9 },
              'blacksmith',
              { tag: 'choice', summary: `${blacksmith}은(는) ${mudang}에게 시간을 미루어 달라고 말하고 쇠를 지켰다.`, valence: 0.2, salience: 0.84 },
            ),
          },
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  if (previousChoice === 'vigil-share-metal') {
    return buildEvent(
      source,
      day,
      createdAt,
      'bellows_vigil',
      step,
      '작은 종 안쪽에 새 금이 생겼다',
      `${mudang}과(와) ${blacksmith}이(가) 나눈 쇠는 종을 울렸지만, 안쪽에 가느다란 금이 남았다.`,
      '금 간 울림을 함께 고칠 것인가, 각자의 몫을 끝낸 뒤 다시 만날 것인가?',
      [
        makeChoice(
          'vigil-forge-bell',
          '종을 함께 벼린다',
          `${blacksmith}이(가) 금을 따라 쇠를 다듬고, ${mudang}은(는) 울림이 바뀌는 순간을 읽는다.`,
          {
            agentTrustDelta: { mudang: 4, blacksmith: 4 },
            agentFatigueDelta: { mudang: 4, blacksmith: 4 },
            heroMoraleDelta: 3,
            factionTrustDelta: { spirits: 0.09, merchants: 0.03 },
            factionTensionDelta: { spirits: -0.06 },
            agentRelationshipDelta: [{ leftAgentId: 'mudang', rightAgentId: 'blacksmith', delta: 0.12 }],
            agentMemory: pairMemory(
              'mudang',
              { tag: 'success', summary: `${mudang}은(는) ${blacksmith}과(와) 금 간 종의 울림을 끝까지 맞췄다.`, valence: 0.72, salience: 0.96 },
              'blacksmith',
              { tag: 'success', summary: `${blacksmith}은(는) ${mudang}과(와) 쇠의 금을 숨기지 않고 고쳤다.`, valence: 0.72, salience: 0.96 },
            ),
          },
        ),
        makeChoice(
          'vigil-light-altar',
          '작은 종으로 남긴다',
          '금은 감추지 않고, 제례와 작업을 다시 나눌 때까지 작은 종 하나를 기록관에 남긴다.',
          {
            agentTrustDelta: { mudang: 2, blacksmith: 1 },
            heroPurposeDelta: 3,
            factionTrustDelta: { spirits: 0.05, village: 0.03 },
            factionTensionDelta: { spirits: -0.02 },
            agentRelationshipDelta: [{ leftAgentId: 'mudang', rightAgentId: 'blacksmith', delta: 0.03 }],
            agentMemory: pairMemory(
              'mudang',
              { tag: 'observation', summary: `${mudang}은(는) ${blacksmith}과(와) 고치지 못한 금도 다음 제례의 기억으로 남겼다.`, valence: 0.3, salience: 0.84 },
              'blacksmith',
              { tag: 'support', summary: `${blacksmith}은(는) ${mudang}과(와) 작은 종을 기록으로 보관하기로 했다.`, valence: 0.4, salience: 0.82 },
            ),
          },
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  return buildEvent(
    source,
    day,
    createdAt,
    'bellows_vigil',
    step,
    '제례가 끝난 뒤 쇠 조각이 남았다',
    `${mudang}은(는) 늦어진 제례를 마쳤고, ${blacksmith}의 작업대에는 쓰이지 않은 쇠 조각이 하나 남았다.`,
    '남은 쇠를 돌려 제례를 회복할 것인가, 다음 방어를 위해 간직할 것인가?',
    [
      makeChoice(
        'vigil-return-scrap',
        '쇠를 돌려준다',
        `${blacksmith}이(가) 남은 쇠를 ${mudang}에게 건네고, 다음에는 서로의 시간을 먼저 묻기로 한다.`,
        {
          agentTrustDelta: { mudang: 4, blacksmith: 3 },
          agentFatigueDelta: { mudang: 3, blacksmith: 2 },
          heroMoraleDelta: 2,
          factionTrustDelta: { spirits: 0.08, merchants: 0.03 },
          factionTensionDelta: { spirits: -0.05 },
          agentRelationshipDelta: [{ leftAgentId: 'mudang', rightAgentId: 'blacksmith', delta: 0.13 }],
          agentMemory: pairMemory(
            'mudang',
            { tag: 'support', summary: `${mudang}은(는) ${blacksmith}이(가) 돌려준 쇠로 늦은 제례를 다시 세웠다.`, valence: 0.58, salience: 0.92 },
            'blacksmith',
            { tag: 'success', summary: `${blacksmith}은(는) ${mudang}에게 남은 쇠를 돌려 다음 시간을 약속했다.`, valence: 0.6, salience: 0.92 },
          ),
        },
      ),
      makeChoice(
        'vigil-keep-silence',
        '다음 방어를 위해 남긴다',
        '이번 일의 잘잘못을 정하지 않고, 남은 쇠는 다음 경계가 끝난 뒤에 다시 나누기로 한다.',
        {
          agentTrustDelta: { blacksmith: 2 },
          agentFatigueDelta: { mudang: -3, blacksmith: 1 },
          heroPurposeDelta: 4,
          factionInfluenceDelta: { merchants: 0.03 },
          factionTensionDelta: { spirits: 0.04 },
          agentRelationshipDelta: [{ leftAgentId: 'mudang', rightAgentId: 'blacksmith', delta: -0.04 }],
          agentMemory: pairMemory(
            'mudang',
            { tag: 'conflict', summary: `${mudang}은(는) ${blacksmith}과(와) 나누지 못한 쇠의 침묵을 오래 지켰다.`, valence: -0.18, salience: 0.84 },
            'blacksmith',
            { tag: 'observation', summary: `${blacksmith}은(는) ${mudang}이(가) 다음 방어 뒤를 기다린 일을 기록했다.`, valence: 0.08, salience: 0.82 },
          ),
        },
      ),
    ],
    chainId,
    parentEventId,
  );
}

function waystoneRiteEvent(
  source: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  step: number,
  chainId: string,
  parentEventId: string | undefined,
  previousChoice: string | null,
): VillageWorldEvent {
  const guide = agentName(source, 'guide');
  const mudang = agentName(source, 'mudang');
  const weather = getVillageAIState(source).world.weather;
  if (step === 0) {
    return buildEvent(
      source,
      day,
      createdAt,
      'waystone_rite',
      step,
      '안개가 두 사람에게 다른 길을 보여 주었다',
      `${weather === 'fog' ? '짙은 안개 속에서' : '새벽의 흐린 길목에서'} ${guide}은(는) 돌아갈 표식을, ${mudang}은(는) 멈춰야 할 징조를 발견했다. ${agentContext(source, 'guide')} ${agentContext(source, 'mudang')}`,
      '길을 먼저 읽을 것인가, 징조를 먼저 확인할 것인가?',
      [
        makeChoice(
          'rite-read-waystone',
          '함께 표식을 읽는다',
          `${guide}이(가) 돌의 방향을 살피고, ${mudang}은(는) 그 곁에서 떠나지 말아야 할 때를 확인한다.`,
          {
            agentTrustDelta: { guide: 3, mudang: 3 },
            agentFatigueDelta: { guide: 5, mudang: 4 },
            heroMoraleDelta: 2,
            realmThreatDelta: { sacred_fields: -0.03 },
            factionTrustDelta: { village: 0.07, spirits: 0.04 },
            factionTensionDelta: { village: -0.04, spirits: -0.02 },
            agentRelationshipDelta: [{ leftAgentId: 'guide', rightAgentId: 'mudang', delta: 0.14 }],
            agentMemory: pairMemory(
              'guide',
              { tag: 'support', summary: `${guide}은(는) ${mudang}과(와) 표식과 징조를 한 경로로 맞췄다.`, valence: 0.62, salience: 0.94 },
              'mudang',
              { tag: 'support', summary: `${mudang}은(는) ${guide}과(와) 안개 속에서 돌아올 길을 함께 읽었다.`, valence: 0.62, salience: 0.94 },
            ),
          },
        ),
        makeChoice(
          'rite-follow-alone',
          '길잡이의 감각을 따른다',
          `${guide}이(가) 먼저 길을 열고, ${mudang}은(는) 마을에 남아 늦게 오는 징조를 기다린다.`,
          {
            agentTrustDelta: { guide: 3, mudang: -1 },
            agentFatigueDelta: { guide: 4, mudang: -2 },
            heroPurposeDelta: 3,
            realmThreatDelta: { sacred_fields: 0.04 },
            factionTrustDelta: { village: 0.04, spirits: -0.03 },
            factionInfluenceDelta: { village: 0.04 },
            factionTensionDelta: { spirits: 0.05 },
            agentRelationshipDelta: [{ leftAgentId: 'guide', rightAgentId: 'mudang', delta: -0.08 }],
            agentMemory: pairMemory(
              'guide',
              { tag: 'choice', summary: `${guide}은(는) ${mudang}의 징조를 기다리지 않고 안개 속 길을 먼저 열었다.`, valence: 0.2, salience: 0.86 },
              'mudang',
              { tag: 'conflict', summary: `${mudang}은(는) ${guide}이(가) 징조보다 길을 먼저 택한 일을 기억했다.`, valence: -0.32, salience: 0.9 },
            ),
          },
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  if (previousChoice === 'rite-read-waystone') {
    return buildEvent(
      source,
      day,
      createdAt,
      'waystone_rite',
      step,
      '표식 아래 작은 등불이 꺼졌다',
      `${guide}과(와) ${mudang}이(가) 함께 읽은 표식 아래에서 등불 하나가 바람도 없이 꺼졌다.`,
      '꺼진 등불을 함께 다시 밝힐 것인가, 다음 길이 열릴 때까지 기다릴 것인가?',
      [
        makeChoice(
          'rite-light-beacon',
          '등불을 함께 밝힌다',
          `${mudang}이(가) 불을 붙이고 ${guide}은(는) 돌아올 경로를 세 번 표시해, 누구든 길을 잃지 않게 한다.`,
          {
            agentTrustDelta: { guide: 4, mudang: 4 },
            agentFatigueDelta: { guide: 4, mudang: 4 },
            heroMoraleDelta: 3,
            realmThreatDelta: { sacred_fields: -0.04 },
            factionTrustDelta: { village: 0.09, spirits: 0.05 },
            factionTensionDelta: { village: -0.05, spirits: -0.03 },
            agentRelationshipDelta: [{ leftAgentId: 'guide', rightAgentId: 'mudang', delta: 0.12 }],
            agentMemory: pairMemory(
              'guide',
              { tag: 'success', summary: `${guide}은(는) ${mudang}과(와) 꺼진 등불을 귀환 표식으로 다시 세웠다.`, valence: 0.72, salience: 0.96 },
              'mudang',
              { tag: 'success', summary: `${mudang}은(는) ${guide}과(와) 안개 속 등불을 함께 지켜냈다.`, valence: 0.72, salience: 0.96 },
            ),
          },
        ),
        makeChoice(
          'rite-mark-together',
          '길을 기록하고 기다린다',
          '두 사람의 판단을 기록관에 남기고, 등불이 다시 켜질 때까지 원정로를 서두르지 않는다.',
          {
            agentTrustDelta: { guide: 2, mudang: 2 },
            heroFatigueDelta: -2,
            heroPurposeDelta: 3,
            factionTrustDelta: { village: 0.05, spirits: 0.04 },
            factionTensionDelta: { village: -0.02 },
            agentRelationshipDelta: [{ leftAgentId: 'guide', rightAgentId: 'mudang', delta: 0.03 }],
            agentMemory: pairMemory(
              'guide',
              { tag: 'observation', summary: `${guide}은(는) ${mudang}과(와) 길을 고정하지 않고 기다릴 표식을 남겼다.`, valence: 0.3, salience: 0.84 },
              'mudang',
              { tag: 'support', summary: `${mudang}은(는) ${guide}과(와) 서두르지 않는 귀환 약속을 기록했다.`, valence: 0.42, salience: 0.82 },
            ),
          },
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  return buildEvent(
    source,
    day,
    createdAt,
    'waystone_rite',
    step,
    '마을 쪽 종소리가 안개를 갈랐다',
    `${guide}이(가) 혼자 연 길에서 마을의 종소리가 들렸고, ${mudang}은(는) 그 소리를 늦은 대답으로 받아들였다.`,
    '서둘러 돌아갈 것인가, 다음 사람이 찾을 표식을 남길 것인가?',
    [
      makeChoice(
        'rite-return-early',
        '마을로 돌아간다',
        `${guide}이(가) 길을 닫고 돌아오며, ${mudang}은(는) 오늘의 징조를 다음 경계의 첫 문장으로 적는다.`,
        {
          agentTrustDelta: { guide: 3, mudang: 4 },
          agentFatigueDelta: { guide: 3, mudang: 2 },
          heroMoraleDelta: 2,
          realmThreatDelta: { sacred_fields: -0.03 },
          factionTrustDelta: { village: 0.08, spirits: 0.04 },
          factionTensionDelta: { village: -0.04 },
          agentRelationshipDelta: [{ leftAgentId: 'guide', rightAgentId: 'mudang', delta: 0.13 }],
          agentMemory: pairMemory(
            'guide',
            { tag: 'support', summary: `${guide}은(는) ${mudang}의 종소리를 듣고 길을 닫을 용기를 냈다.`, valence: 0.58, salience: 0.92 },
            'mudang',
            { tag: 'success', summary: `${mudang}은(는) ${guide}이(가) 돌아온 자리에서 늦은 징조를 마을과 나눴다.`, valence: 0.6, salience: 0.92 },
          ),
        },
      ),
      makeChoice(
        'rite-leave-sign',
        '다음 사람을 위한 표식을 남긴다',
        '두 사람의 판단이 모두 맞을 수 있도록, 돌의 방향과 등불이 꺼지는 시간을 길목에 남긴다.',
        {
          agentTrustDelta: { guide: 2 },
          agentFatigueDelta: { guide: 2, mudang: -3 },
          heroPurposeDelta: 4,
          factionInfluenceDelta: { village: 0.04 },
          factionTensionDelta: { spirits: 0.04 },
          agentRelationshipDelta: [{ leftAgentId: 'guide', rightAgentId: 'mudang', delta: -0.04 }],
          agentMemory: pairMemory(
            'guide',
            { tag: 'observation', summary: `${guide}은(는) ${mudang}과(와) 엇갈린 판단을 다음 사람을 위한 표식으로 바꾸었다.`, valence: 0.2, salience: 0.84 },
            'mudang',
            { tag: 'conflict', summary: `${mudang}은(는) ${guide}과(와) 돌아갈 때를 놓친 밤을 기록했다.`, valence: -0.18, salience: 0.82 },
          ),
        },
      ),
    ],
    chainId,
    parentEventId,
  );
}

/** Creates one act of a deterministic two-agent relationship arc. */
export function createVillageRelationshipArcEvent(
  source: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  kind: VillageRelationshipArcKind,
  step = 0,
  chainId?: string,
  parentEventId?: string,
): VillageWorldEvent | null {
  if (!isVillageRelationshipArcKind(kind)
    || !Number.isSafeInteger(day)
    || !Number.isSafeInteger(createdAt)
    || !Number.isSafeInteger(step)
    || step < 0
    || step > VILLAGE_RELATIONSHIP_ARC_FINAL_STEP) return null;
  const resolvedChainId = chainId ?? `world-relationship-${kind}-${day}`;
  const chain = getVillageAIState(source).world.chains?.find((candidate) => candidate.id === resolvedChainId);
  const previousChoice = previousChoiceId(source, chain);
  if (kind === 'forge_route_dispute') {
    return forgeRouteDisputeEvent(source, day, createdAt, step, resolvedChainId, parentEventId, previousChoice);
  }
  if (kind === 'bellows_vigil') {
    return bellowsVigilEvent(source, day, createdAt, step, resolvedChainId, parentEventId, previousChoice);
  }
  return waystoneRiteEvent(source, day, createdAt, step, resolvedChainId, parentEventId, previousChoice);
}

export function isVillageRelationshipArcKind(value: unknown): value is VillageRelationshipArcKind {
  return typeof value === 'string' && VILLAGE_RELATIONSHIP_ARC_KINDS.includes(value as VillageRelationshipArcKind);
}

export function getVillageRelationshipArcLabel(kind: VillageWorldChainKind): string | null {
  return isVillageRelationshipArcKind(kind)
    ? VILLAGE_RELATIONSHIP_ARC_DEFINITIONS[kind].labelKR
    : null;
}

export function getVillageRelationshipArcAgents(kind: VillageRelationshipArcKind): readonly [SupportAgentId, SupportAgentId] {
  const definition = VILLAGE_RELATIONSHIP_ARC_DEFINITIONS[kind];
  return [definition.leftAgentId, definition.rightAgentId];
}

export function getVillageRelationshipArcFactionLabel(kind: VillageRelationshipArcKind): string {
  const labels: Record<VillageFactionId, string> = {
    village: '마을',
    merchants: '상단',
    spirits: '정령',
  };
  return labels[VILLAGE_RELATIONSHIP_ARC_DEFINITIONS[kind].factionId];
}
