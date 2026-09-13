import type {
  SupportAgentId,
  VillageAgentGoal,
  VillageAgentMemoryEffect,
  VillageAgentMemoryTag,
  VillageAgentRelationshipDelta,
  VillageFactionId,
  VillageSaveEnvelope,
  VillageTriadArcKind,
  VillageWorldChainKind,
  VillageWorldChainState,
  VillageWorldEvent,
  VillageWorldEventChoice,
  VillageWorldEventEffects,
  VillageWorldEventType,
} from '../../types';
import { VILLAGE_TRIAD_ARC_KINDS } from '../../types';
import {
  deterministicUnit,
  getVillageAgentAIState,
  getVillageAgentCognitionState,
  getVillageAIState,
  getVillageSimulationState,
  VILLAGE_SUPPORT_AGENT_IDS,
  Village_WORLD_DAY_MS,
} from './state';

export interface VillageTriadArcDefinition {
  kind: VillageTriadArcKind;
  agents: readonly [SupportAgentId, SupportAgentId, SupportAgentId];
  factionId: VillageFactionId;
  eventType: VillageWorldEventType;
  labelKR: string;
}

const TRIAD_AGENTS = ['blacksmith', 'mudang', 'guide'] as const;

export const VILLAGE_TRIAD_ARC_DEFINITIONS: Record<VillageTriadArcKind, VillageTriadArcDefinition> = {
  granary_covenant: {
    kind: 'granary_covenant',
    agents: TRIAD_AGENTS,
    factionId: 'merchants',
    eventType: 'supply',
    labelKR: '세 자물쇠의 곡식',
  },
  watchfire_triangle: {
    kind: 'watchfire_triangle',
    agents: TRIAD_AGENTS,
    factionId: 'spirits',
    eventType: 'omen',
    labelKR: '세 갈래 봉화',
  },
  bridge_of_names: {
    kind: 'bridge_of_names',
    agents: TRIAD_AGENTS,
    factionId: 'village',
    eventType: 'weather',
    labelKR: '이름 없는 다리',
  },
};

/** Triad stories use three acts while retaining the existing world-chain cap. */
export const VILLAGE_TRIAD_ARC_FINAL_STEP = 2 as const;

const TRIAD_ARC_CADENCE_START_DAY = 18;
const TRIAD_ARC_CADENCE_DAYS = 6;

const SEASON_LABELS: Record<string, string> = {
  spring: '봄',
  summer: '여름',
  autumn: '가을',
  winter: '겨울',
};

const WEATHER_LABELS: Record<string, string> = {
  clear: '맑은 하늘',
  rain: '비 내리는 하늘',
  fog: '짙은 안개',
  wind: '거센 바람',
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

function triadContext(source: VillageSaveEnvelope): string {
  const ai = getVillageAIState(source);
  const season = SEASON_LABELS[ai.world.season] ?? '계절';
  const weather = WEATHER_LABELS[ai.world.weather] ?? '변덕스러운 하늘';
  return `${agentContext(source, 'blacksmith')} ${agentContext(source, 'mudang')} ${agentContext(source, 'guide')} ${season}의 ${weather} 아래 세 사람의 계획이 한 사건에 겹쳤다.`;
}

function makeChoice(
  id: string,
  title: string,
  text: string,
  effects: VillageWorldEventEffects,
): VillageWorldEventChoice {
  return { id, title, text, effects };
}

function triadRelationships(
  blacksmithMudang: number,
  blacksmithGuide: number,
  mudangGuide: number,
): VillageAgentRelationshipDelta[] {
  return [
    { leftAgentId: 'blacksmith', rightAgentId: 'mudang', delta: blacksmithMudang },
    { leftAgentId: 'blacksmith', rightAgentId: 'guide', delta: blacksmithGuide },
    { leftAgentId: 'mudang', rightAgentId: 'guide', delta: mudangGuide },
  ];
}

function triadMemories(
  blacksmith: VillageAgentMemoryEffect,
  mudang: VillageAgentMemoryEffect,
  guide: VillageAgentMemoryEffect,
): Partial<Record<SupportAgentId, VillageAgentMemoryEffect>> {
  return { blacksmith, mudang, guide };
}

function triadEffects(
  relationships: readonly [number, number, number],
  memories: Partial<Record<SupportAgentId, VillageAgentMemoryEffect>>,
  effects: Omit<VillageWorldEventEffects, 'agentRelationshipDelta' | 'agentMemory'>,
): VillageWorldEventEffects {
  return {
    ...effects,
    agentRelationshipDelta: triadRelationships(...relationships),
    agentMemory: memories,
  };
}

function buildEvent(
  source: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  kind: VillageTriadArcKind,
  step: number,
  title: string,
  cause: string,
  prompt: string,
  choices: VillageWorldEventChoice[],
  chainId?: string,
  parentEventId?: string,
): VillageWorldEvent {
  void source;
  const definition = VILLAGE_TRIAD_ARC_DEFINITIONS[kind];
  const resolvedChainId = chainId ?? `world-triad-${kind}-${day}`;
  const eventId = step === 0
    ? `world-event-${day}-triad-${kind}`
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

function hasActiveTriadArc(source: VillageSaveEnvelope, kind: VillageTriadArcKind): boolean {
  const ai = getVillageAIState(source);
  return (ai.world.chains ?? []).some((chain) => chain.kind === kind)
    || ai.pendingEvents.some((event) => event.chainKind === kind);
}

function hasAnyActiveTriadArc(source: VillageSaveEnvelope): boolean {
  const ai = getVillageAIState(source);
  return (ai.world.chains ?? []).some((chain) => isVillageTriadArcKind(chain.kind))
    || ai.pendingEvents.some((event) => isVillageTriadArcKind(event.chainKind));
}

function triadRelationshipTension(source: VillageSaveEnvelope): number {
  const blacksmith = getVillageAgentAIState(source, 'blacksmith');
  const mudang = getVillageAgentAIState(source, 'mudang');
  const guide = getVillageAgentAIState(source, 'guide');
  return (
    Math.max(0, -safeNumber(blacksmith.relationships.mudang))
      + Math.max(0, -safeNumber(blacksmith.relationships.guide))
      + Math.max(0, -safeNumber(mudang.relationships.guide))
  ) / 3;
}

function triadConflictMemory(source: VillageSaveEnvelope): number {
  const memories = VILLAGE_SUPPORT_AGENT_IDS.flatMap((agentId) => (
    getVillageAgentCognitionState(source, agentId).memories.filter((memory) => (
      (memory.tag === 'conflict' || memory.tag === 'failure') && memory.relatedAgentId !== null
    ))
  ));
  return clamp(memories.reduce((total, memory) => total + memory.salience, 0) / 3, 0, 1);
}

function triadGoalDiversity(source: VillageSaveEnvelope): number {
  const goals = new Set(VILLAGE_SUPPORT_AGENT_IDS.map((agentId) => agentGoal(source, agentId)));
  return (goals.size - 1) / 2;
}

function triadArcPressure(source: VillageSaveEnvelope, kind: VillageTriadArcKind): number {
  const definition = VILLAGE_TRIAD_ARC_DEFINITIONS[kind];
  const ai = getVillageAIState(source);
  const faction = ai.world.factions?.[definition.factionId];
  const averageFatigue = VILLAGE_SUPPORT_AGENT_IDS.reduce((total, agentId) => {
    const agent = source.meta.agents.find((candidate) => candidate.id === agentId);
    return total + safeNumber(agent?.fatigue);
  }, 0) / VILLAGE_SUPPORT_AGENT_IDS.length;
  const averageStress = VILLAGE_SUPPORT_AGENT_IDS.reduce(
    (total, agentId) => total + safeNumber(getVillageAgentAIState(source, agentId).stress),
    0,
  ) / VILLAGE_SUPPORT_AGENT_IDS.length;
  return clamp(
    triadRelationshipTension(source) * 0.28
      + triadConflictMemory(source) * 0.17
      + triadGoalDiversity(source) * 0.15
      + averageFatigue / 100 * 0.14
      + averageStress / 100 * 0.14
      + safeNumber(faction?.tension, 0.5) * 0.07
      + (1 - safeNumber(faction?.trust, 0.5)) * 0.03
      + safeNumber(faction?.influence, 0.5) * 0.02,
    0,
    1,
  );
}

/** Selects one bounded three-agent story during a scheduled window or sustained group pressure. */
export function selectVillageTriadArcKind(
  source: VillageSaveEnvelope,
  day: number,
): VillageTriadArcKind | null {
  if (!Number.isSafeInteger(day) || day < TRIAD_ARC_CADENCE_START_DAY) return null;
  const ai = getVillageAIState(source);
  if (hasAnyActiveTriadArc(source)) return null;
  const available = VILLAGE_TRIAD_ARC_KINDS.filter((kind) => !hasActiveTriadArc(source, kind));
  if (available.length === 0) return null;

  const triadStarts = getVillageSimulationState(source).eventHistory
    .filter((record) => isVillageTriadArcKind(record.chainKind) && record.chainStep === 0)
    .map((record) => record.day);
  const lastTriadStart = triadStarts.length > 0 ? Math.max(...triadStarts) : null;
  const nextOpportunityStart = lastTriadStart === null
    ? TRIAD_ARC_CADENCE_START_DAY
    : lastTriadStart + TRIAD_ARC_CADENCE_DAYS;
  // Other arcs or due chains may occupy a day. Keep this window open so the
  // group story is delayed rather than silently lost.
  const scheduled = day >= nextOpportunityStart
    && day < nextOpportunityStart + TRIAD_ARC_CADENCE_DAYS * 2;
  const needsCoverage = triadStarts.length < VILLAGE_TRIAD_ARC_KINDS.length;
  const highestPressure = Math.max(...available.map((kind) => triadArcPressure(source, kind)));
  const spontaneous = deterministicUnit(`${ai.seed}:triad-pressure:${day}`);
  if (!scheduled && !needsCoverage && (highestPressure < 0.84 || spontaneous >= 0.18)) return null;

  const slot = triadStarts.length;
  const preferred = VILLAGE_TRIAD_ARC_KINDS[
    (Math.abs(Math.floor(ai.seed)) + slot) % VILLAGE_TRIAD_ARC_KINDS.length
  ];
  if (needsCoverage && available.includes(preferred)) return preferred;
  if (scheduled && available.includes(preferred)) return preferred;
  return [...available].sort((left, right) => {
    const leftScore = triadArcPressure(source, left) + (left === preferred ? 0.28 : 0)
      + deterministicUnit(`${ai.seed}:triad-order:${day}:${left}`) * 0.04;
    const rightScore = triadArcPressure(source, right) + (right === preferred ? 0.28 : 0)
      + deterministicUnit(`${ai.seed}:triad-order:${day}:${right}`) * 0.04;
    if (leftScore !== rightScore) return rightScore - leftScore;
    return left < right ? -1 : left > right ? 1 : 0;
  })[0] ?? null;
}

function granaryCovenantEvent(
  source: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  step: number,
  chainId: string,
  parentEventId: string | undefined,
  previousChoice: string | null,
): VillageWorldEvent {
  const blacksmith = agentName(source, 'blacksmith');
  const mudang = agentName(source, 'mudang');
  const guide = agentName(source, 'guide');
  const context = triadContext(source);
  if (step === 0) {
    return buildEvent(
      source,
      day,
      createdAt,
      'granary_covenant',
      step,
      '세 자물쇠가 잠긴 곡식 창고',
      `${context} ${blacksmith}의 장부, ${mudang}의 봉인, ${guide}의 수레표가 서로 다른 배급량을 가리켰다.`,
      '상단의 수레를 먼저 채울 것인가, 세 사람의 열쇠를 함께 돌릴 것인가?',
      [
        makeChoice(
          'granary-open-three-locks',
          '세 자물쇠를 함께 연다',
          '세 사람이 각자의 기록을 맞춰 주민과 상단이 함께 쓸 임시 배급표를 만든다.',
          triadEffects(
            [0.14, 0.12, 0.1],
            triadMemories(
              { tag: 'support', summary: `${mudang}과 ${guide}의 기록을 묶어 창고를 열었다.`, valence: 0.55, salience: 0.78, relatedAgentId: 'mudang' },
              { tag: 'support', summary: `${blacksmith}과 ${guide}가 함께 만든 배급표를 지켰다.`, valence: 0.5, salience: 0.76, relatedAgentId: 'blacksmith' },
              { tag: 'support', summary: `${blacksmith}과 ${mudang}의 열쇠를 한 수레에 실었다.`, valence: 0.55, salience: 0.8, relatedAgentId: 'guide' },
            ),
            {
              agentTrustDelta: { blacksmith: 3, mudang: 3, guide: 3 },
              agentFatigueDelta: { blacksmith: 4, mudang: 3, guide: 4 },
              heroMoraleDelta: 3,
              prosperityDelta: 4,
              factionTrustDelta: { village: 0.08, merchants: 0.06, spirits: 0.03 },
              factionInfluenceDelta: { village: 0.04, merchants: 0.03 },
              factionTensionDelta: { village: -0.05, merchants: -0.04, spirits: -0.02 },
            },
          ),
        ),
        makeChoice(
          'granary-lock-reserve',
          '비축을 먼저 잠근다',
          '상단의 약속을 지키되 주민 몫은 건드리지 않고, 세 사람의 판단 차이는 다음 날로 미룬다.',
          triadEffects(
            [-0.09, 0.03, -0.08],
            triadMemories(
              { tag: 'conflict', summary: `${mudang}과 ${guide}가 수레보다 비축을 먼저 지킨 일을 기억했다.`, valence: -0.3, salience: 0.8, relatedAgentId: 'mudang' },
              { tag: 'failure', summary: `${blacksmith}과 ${guide}의 다른 수레표를 끝내 맞추지 못했다.`, valence: -0.42, salience: 0.82, relatedAgentId: 'guide' },
              { tag: 'conflict', summary: `${blacksmith}과 ${mudang}이 잠긴 창고 앞에서 결론을 미뤘다.`, valence: -0.28, salience: 0.78, relatedAgentId: 'blacksmith' },
            ),
            {
              agentTrustDelta: { blacksmith: 3, mudang: -2, guide: 2 },
              agentFatigueDelta: { blacksmith: 1, mudang: 4, guide: 5 },
              heroPurposeDelta: 3,
              prosperityDelta: 2,
              factionTrustDelta: { village: -0.04, merchants: 0.1, spirits: 0.01 },
              factionInfluenceDelta: { merchants: 0.05 },
              factionTensionDelta: { village: 0.09, merchants: -0.02, spirits: 0.02 },
            },
          ),
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  if (step === 1) {
    if (previousChoice === 'granary-open-three-locks') {
      return buildEvent(
        source,
        day,
        createdAt,
        'granary_covenant',
        step,
        '첫 자물쇠가 먼저 열렸다',
        `${blacksmith}의 숫자와 ${mudang}의 봉인이 맞았지만, ${guide}가 본 수레는 이미 다른 길로 빠지고 있었다.`,
        '주민과 상단의 몫을 나누어 함께 보낼 것인가, 한쪽을 먼저 보내 시간을 살 것인가?',
        [
          makeChoice(
            'granary-share-both',
            '두 몫을 함께 보낸다',
            '세 사람은 수레를 작게 나누고, 도착이 늦어져도 어느 쪽도 버리지 않기로 한다.',
            triadEffects(
              [0.12, 0.08, 0.1],
              triadMemories(
                { tag: 'support', summary: `${mudang}과 ${guide}가 늦은 수레를 함께 지켰다.`, valence: 0.48, salience: 0.72, relatedAgentId: 'guide' },
                { tag: 'support', summary: `${blacksmith}과 ${guide}가 나눈 몫을 끝까지 기록했다.`, valence: 0.5, salience: 0.74, relatedAgentId: 'blacksmith' },
                { tag: 'support', summary: `${blacksmith}과 ${mudang}이 작은 수레를 함께 보냈다.`, valence: 0.48, salience: 0.76, relatedAgentId: 'blacksmith' },
              ),
              {
                agentTrustDelta: { blacksmith: 2, mudang: 2, guide: 3 },
                agentFatigueDelta: { blacksmith: 3, mudang: 2, guide: 5 },
                heroMoraleDelta: 2,
                prosperityDelta: 3,
                factionTrustDelta: { village: 0.07, merchants: 0.08, spirits: 0.02 },
                factionInfluenceDelta: { village: 0.03, merchants: 0.04 },
                factionTensionDelta: { village: -0.04, merchants: -0.05, spirits: -0.01 },
              },
            ),
          ),
          makeChoice(
            'granary-prioritize-caravan',
            '상단 수레를 먼저 보낸다',
            '거래가 끊기면 다음 배급도 무너진다고 판단해 상단의 수레를 먼저 길에 올린다.',
            triadEffects(
              [-0.04, 0.02, -0.1],
              triadMemories(
                { tag: 'conflict', summary: `${mudang}과 ${guide}가 상단 수레를 먼저 보낸 결정을 두고 다퉜다.`, valence: -0.25, salience: 0.77, relatedAgentId: 'guide' },
                { tag: 'conflict', summary: `${blacksmith}과 ${guide}의 배급 순서가 갈라졌다.`, valence: -0.26, salience: 0.75, relatedAgentId: 'blacksmith' },
                { tag: 'failure', summary: `${blacksmith}과 ${mudang}에게 주민 몫을 늦춘 일이 남았다.`, valence: -0.36, salience: 0.82, relatedAgentId: 'mudang' },
              ),
              {
                agentTrustDelta: { blacksmith: 2, mudang: -2, guide: 3 },
                agentFatigueDelta: { blacksmith: 2, mudang: 4, guide: 4 },
                heroFatigueDelta: 4,
                prosperityDelta: 1,
                factionTrustDelta: { village: -0.06, merchants: 0.11, spirits: 0.02 },
                factionInfluenceDelta: { merchants: 0.05 },
                factionTensionDelta: { village: 0.1, merchants: -0.03, spirits: 0.02 },
              },
            ),
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
      'granary_covenant',
      step,
      '창고 벽에서 두 번째 장부가 나왔다',
      `${blacksmith}이(가) 비축을 잠근 뒤, ${mudang}과 ${guide}가 모르는 두 번째 장부가 벽 안쪽에서 발견됐다.`,
      '기록을 서로 대조해 틀린 약속을 고칠 것인가, 장부를 숨겨 마을의 불안을 막을 것인가?',
      [
        makeChoice(
          'granary-reconcile-ledgers',
          '두 장부를 맞춘다',
          '세 사람은 누가 옳았는지보다 어떤 숫자가 다음 사람을 살리는지부터 확인한다.',
          triadEffects(
            [0.09, 0.04, 0.12],
            triadMemories(
              { tag: 'success', summary: `${mudang}과 ${guide}의 흔적을 따라 두 장부를 맞췄다.`, valence: 0.42, salience: 0.75, relatedAgentId: 'guide' },
              { tag: 'support', summary: `${blacksmith}과 ${guide}가 봉인과 발자국을 함께 확인했다.`, valence: 0.45, salience: 0.72, relatedAgentId: 'blacksmith' },
              { tag: 'success', summary: `${blacksmith}과 ${mudang}이 틀린 수레표를 다시 세웠다.`, valence: 0.5, salience: 0.8, relatedAgentId: 'mudang' },
            ),
            {
              agentTrustDelta: { blacksmith: 3, mudang: 2, guide: 3 },
              agentFatigueDelta: { blacksmith: 3, mudang: 3, guide: 3 },
              heroMoraleDelta: 2,
              prosperityDelta: 2,
              factionTrustDelta: { village: 0.06, merchants: 0.08, spirits: 0.03 },
              factionInfluenceDelta: { village: 0.03, merchants: 0.04 },
              factionTensionDelta: { village: -0.03, merchants: -0.04, spirits: -0.02 },
            },
          ),
        ),
        makeChoice(
          'granary-hide-second-ledger',
          '두 번째 장부를 숨긴다',
          '세 사람의 불완전한 기록이 퍼지지 않도록 장부를 잠그고, 부족한 설명은 영웅이 떠안는다.',
          triadEffects(
            [-0.08, -0.1, 0.03],
            triadMemories(
              { tag: 'conflict', summary: `${mudang}과 ${guide}에게 두 번째 장부를 숨긴 일이 남았다.`, valence: -0.4, salience: 0.81, relatedAgentId: 'mudang' },
              { tag: 'failure', summary: `${blacksmith}과 ${guide}가 같은 수레표를 믿지 못했다.`, valence: -0.36, salience: 0.79, relatedAgentId: 'guide' },
              { tag: 'conflict', summary: `${blacksmith}과 ${mudang}이 잠긴 장부 앞에서 말을 줄였다.`, valence: -0.3, salience: 0.76, relatedAgentId: 'blacksmith' },
            ),
            {
              agentTrustDelta: { blacksmith: 2, mudang: -2, guide: -1 },
              agentFatigueDelta: { blacksmith: 2, mudang: 4, guide: 2 },
              heroPurposeDelta: 3,
              prosperityDelta: 1,
              factionTrustDelta: { village: 0.02, merchants: 0.08, spirits: -0.02 },
              factionInfluenceDelta: { merchants: 0.03 },
              factionTensionDelta: { village: 0.05, merchants: 0.01, spirits: 0.06 },
            },
          ),
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  const shared = previousChoice === 'granary-share-both' || previousChoice === 'granary-reconcile-ledgers';
  return buildEvent(
    source,
    day,
    createdAt,
    'granary_covenant',
    step,
    shared ? '세 사람이 나눈 열쇠가 남았다' : '잠긴 곡식의 이름이 남았다',
    shared
      ? `${blacksmith}, ${mudang}, ${guide}의 기록이 한 장의 배급표로 합쳐졌지만, 다음 계절에도 이 약속을 지킬지는 아직 남아 있다.`
      : '잠긴 창고는 당장을 지켰지만, 누구의 몫이 빠졌는지에 대한 침묵이 다음 거래까지 따라왔다.',
    shared
      ? '공동 배급을 마을의 규칙으로 새길 것인가, 이번 약속만 조용히 봉인할 것인가?'
      : '남은 비축을 다시 열어 빚을 갚을 것인가, 다음 위기를 위해 끝까지 보관할 것인가?',
    shared
      ? [
        makeChoice(
          'granary-three-stewards',
          '세 사람의 이름을 새긴다',
          '세 자물쇠의 열쇠를 세 사람의 책임으로 남겨 다음 배급도 같은 기록으로 시작한다.',
          triadEffects(
            [0.14, 0.12, 0.13],
            triadMemories(
              { tag: 'success', summary: `${mudang}과 ${guide}의 이름을 공동 배급표에 새겼다.`, valence: 0.65, salience: 0.86, relatedAgentId: 'mudang' },
              { tag: 'success', summary: `${blacksmith}과 ${guide}가 세 사람의 책임을 증명했다.`, valence: 0.62, salience: 0.84, relatedAgentId: 'blacksmith' },
              { tag: 'success', summary: `${blacksmith}과 ${mudang}의 약속을 다음 수레에 실었다.`, valence: 0.68, salience: 0.88, relatedAgentId: 'mudang' },
            ),
            {
              agentTrustDelta: { blacksmith: 4, mudang: 4, guide: 4 },
              agentFatigueDelta: { blacksmith: -3, mudang: -3, guide: -3 },
              heroMoraleDelta: 4,
              prosperityDelta: 5,
              factionTrustDelta: { village: 0.1, merchants: 0.1, spirits: 0.05 },
              factionInfluenceDelta: { village: 0.05, merchants: 0.04 },
              factionTensionDelta: { village: -0.08, merchants: -0.07, spirits: -0.03 },
            },
          ),
        ),
        makeChoice(
          'granary-seal-fair-price',
          '공정한 값을 봉인한다',
          '상단과 마을이 다시 흥정하되, 오늘의 수고가 사라지지 않도록 비용을 기록한다.',
          triadEffects(
            [0.03, 0.06, -0.06],
            triadMemories(
              { tag: 'choice', summary: `${mudang}과 ${guide}의 양보를 값으로 남겼다.`, valence: 0.2, salience: 0.7, relatedAgentId: 'guide' },
              { tag: 'choice', summary: `${blacksmith}과 ${guide}가 다음 거래의 비용을 정했다.`, valence: 0.18, salience: 0.68, relatedAgentId: 'blacksmith' },
              { tag: 'conflict', summary: `${blacksmith}과 ${mudang}의 원칙이 값을 정하는 자리에서 엇갈렸다.`, valence: -0.18, salience: 0.72, relatedAgentId: 'blacksmith' },
            ),
            {
              agentTrustDelta: { blacksmith: 3, mudang: 2, guide: 2 },
              heroPurposeDelta: 3,
              prosperityDelta: 3,
              factionTrustDelta: { village: 0.07, merchants: 0.08, spirits: 0.01 },
              factionInfluenceDelta: { merchants: 0.05, village: 0.03 },
              factionTensionDelta: { village: -0.03, merchants: -0.04, spirits: 0.01 },
            },
          ),
        ),
      ]
      : [
        makeChoice(
          'granary-break-seal',
          '봉인을 다시 연다',
          '늦은 몫이라도 주민과 원정대에 나누어 주며 세 사람의 침묵을 행동으로 갚는다.',
          triadEffects(
            [0.1, -0.08, 0.04],
            triadMemories(
              { tag: 'support', summary: `${mudang}과 ${guide}에게 늦게라도 창고를 다시 연 일을 남겼다.`, valence: 0.36, salience: 0.82, relatedAgentId: 'mudang' },
              { tag: 'conflict', summary: `${blacksmith}과 ${guide}가 비축을 다시 여는 시점을 두고 맞섰다.`, valence: -0.16, salience: 0.76, relatedAgentId: 'guide' },
              { tag: 'support', summary: `${blacksmith}과 ${mudang}이 잠긴 곡식을 다시 나눴다.`, valence: 0.35, salience: 0.8, relatedAgentId: 'blacksmith' },
            ),
            {
              agentTrustDelta: { blacksmith: 3, mudang: 3, guide: 1 },
              agentFatigueDelta: { blacksmith: 3, mudang: 2, guide: 4 },
              heroMoraleDelta: 2,
              prosperityDelta: 2,
              factionTrustDelta: { village: 0.1, merchants: -0.02, spirits: 0.03 },
              factionInfluenceDelta: { village: 0.05 },
              factionTensionDelta: { village: -0.05, merchants: 0.06, spirits: -0.02 },
            },
          ),
        ),
        makeChoice(
          'granary-leave-reserve',
          '남은 비축을 남긴다',
          '지금의 서운함을 감수하고 다음 위기에 쓸 마지막 자물쇠를 건드리지 않는다.',
          triadEffects(
            [-0.05, 0.04, -0.1],
            triadMemories(
              { tag: 'conflict', summary: `${mudang}과 ${guide}에게 남은 비축을 지킨 침묵이 남았다.`, valence: -0.32, salience: 0.8, relatedAgentId: 'guide' },
              { tag: 'choice', summary: `${blacksmith}과 ${guide}가 다음 위기를 위해 수레를 비워 두었다.`, valence: 0.12, salience: 0.7, relatedAgentId: 'blacksmith' },
              { tag: 'failure', summary: `${blacksmith}과 ${mudang}이 늦은 배급을 끝내 바꾸지 못했다.`, valence: -0.38, salience: 0.84, relatedAgentId: 'mudang' },
            ),
            {
              agentTrustDelta: { blacksmith: 3, mudang: -1, guide: 2 },
              agentFatigueDelta: { blacksmith: 1, mudang: 4, guide: 3 },
              heroPurposeDelta: 3,
              prosperityDelta: 1,
              factionTrustDelta: { village: -0.05, merchants: 0.03, spirits: 0.02 },
              factionInfluenceDelta: { merchants: 0.02 },
              factionTensionDelta: { village: 0.08, merchants: 0.03, spirits: 0.01 },
            },
          ),
        ),
      ],
    chainId,
    parentEventId,
  );
}

function watchfireTriangleEvent(
  source: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  step: number,
  chainId: string,
  parentEventId: string | undefined,
  previousChoice: string | null,
): VillageWorldEvent {
  const blacksmith = agentName(source, 'blacksmith');
  const mudang = agentName(source, 'mudang');
  const guide = agentName(source, 'guide');
  const context = triadContext(source);
  if (step === 0) {
    return buildEvent(
      source,
      day,
      createdAt,
      'watchfire_triangle',
      step,
      '세 갈래 봉화가 서로 다른 밤을 밝혔다',
      `${context} ${mudang}의 등불, ${blacksmith}의 화덕, ${guide}의 길표가 서로 다른 방향에서 같은 신호를 받았다.`,
      '세 봉화를 하나로 이을 것인가, 중앙 봉화 하나만 남겨 불안을 줄일 것인가?',
      [
        makeChoice(
          'watchfire-link-beacons',
          '세 봉화를 잇는다',
          '세 사람의 불을 한 밤에 연결해 마을과 원정로가 같은 신호를 보게 한다.',
          triadEffects(
            [0.13, 0.1, 0.12],
            triadMemories(
              { tag: 'support', summary: `${mudang}과 ${guide}의 불빛을 화덕의 불과 이었다.`, valence: 0.52, salience: 0.8, relatedAgentId: 'mudang' },
              { tag: 'support', summary: `${blacksmith}과 ${guide}가 먼 봉화까지 같은 신호를 보냈다.`, valence: 0.5, salience: 0.78, relatedAgentId: 'guide' },
              { tag: 'support', summary: `${blacksmith}과 ${mudang}의 불을 길 위에서 연결했다.`, valence: 0.55, salience: 0.82, relatedAgentId: 'blacksmith' },
            ),
            {
              agentTrustDelta: { blacksmith: 3, mudang: 3, guide: 3 },
              agentFatigueDelta: { blacksmith: 3, mudang: 4, guide: 3 },
              heroMoraleDelta: 4,
              heroPurposeDelta: 2,
              factionTrustDelta: { village: 0.05, merchants: 0.02, spirits: 0.1 },
              factionInfluenceDelta: { village: 0.03, spirits: 0.05 },
              factionTensionDelta: { village: -0.03, merchants: -0.01, spirits: -0.07 },
            },
          ),
        ),
        makeChoice(
          'watchfire-keep-central',
          '중앙 봉화만 남긴다',
          '불의 수를 줄여 혼란은 막지만, 세 사람이 읽은 서로 다른 방향은 기록하지 않는다.',
          triadEffects(
            [-0.08, -0.03, 0.02],
            triadMemories(
              { tag: 'conflict', summary: `${mudang}과 ${guide}의 신호를 하나로 줄인 일을 기억했다.`, valence: -0.28, salience: 0.78, relatedAgentId: 'mudang' },
              { tag: 'choice', summary: `${blacksmith}과 ${guide}가 중앙 봉화만 남기기로 합의했다.`, valence: 0.12, salience: 0.7, relatedAgentId: 'guide' },
              { tag: 'conflict', summary: `${blacksmith}과 ${mudang}의 다른 징조를 한 불 아래 덮었다.`, valence: -0.3, salience: 0.8, relatedAgentId: 'blacksmith' },
            ),
            {
              agentTrustDelta: { blacksmith: 2, mudang: -2, guide: 2 },
              agentFatigueDelta: { blacksmith: 2, mudang: 3, guide: 2 },
              heroPurposeDelta: 3,
              factionTrustDelta: { village: 0.03, merchants: 0.01, spirits: -0.04 },
              factionInfluenceDelta: { village: 0.04 },
              factionTensionDelta: { village: -0.02, merchants: 0.02, spirits: 0.08 },
            },
          ),
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  if (step === 1) {
    if (previousChoice === 'watchfire-link-beacons') {
      return buildEvent(
        source,
        day,
        createdAt,
        'watchfire_triangle',
        step,
        '재가 세 불의 순서를 가리켰다',
        `${blacksmith}의 화덕에서 나온 재가 ${mudang}의 제단과 ${guide}의 길 사이를 번갈아 가리키며 타올랐다.`,
        '재의 방향을 따라 먼 봉화로 갈 것인가, 세 불이 지키는 마을에 남을 것인가?',
        [
          makeChoice(
            'watchfire-read-ash',
            '재의 방향을 읽는다',
            '세 사람은 재가 바뀌는 간격을 기록해 징조와 실제 위험을 분리한다.',
            triadEffects(
              [0.1, 0.08, 0.13],
              triadMemories(
                { tag: 'success', summary: `${mudang}과 ${guide}의 신호를 재의 순서로 해석했다.`, valence: 0.48, salience: 0.77, relatedAgentId: 'mudang' },
                { tag: 'support', summary: `${blacksmith}과 ${guide}가 봉화 사이의 간격을 기록했다.`, valence: 0.42, salience: 0.74, relatedAgentId: 'guide' },
                { tag: 'success', summary: `${blacksmith}과 ${mudang}이 불의 흔들림을 위험과 나눴다.`, valence: 0.5, salience: 0.8, relatedAgentId: 'blacksmith' },
              ),
              {
                agentTrustDelta: { blacksmith: 2, mudang: 3, guide: 3 },
                agentFatigueDelta: { blacksmith: 3, mudang: 3, guide: 4 },
                heroPurposeDelta: 3,
                realmThreatDelta: { sacred_fields: -0.03 },
                factionTrustDelta: { village: 0.04, merchants: 0.01, spirits: 0.09 },
                factionInfluenceDelta: { spirits: 0.05, village: 0.02 },
                factionTensionDelta: { village: -0.03, merchants: 0.01, spirits: -0.06 },
              },
            ),
          ),
          makeChoice(
            'watchfire-follow-distant',
            '먼 봉화를 따라간다',
            '마을의 불을 믿고 세 사람 모두 원정로 끝의 작은 불빛까지 걸어간다.',
            triadEffects(
              [0.04, 0.12, 0.06],
              triadMemories(
                { tag: 'support', summary: `${mudang}과 ${guide}가 먼 봉화까지 함께 걸었다.`, valence: 0.4, salience: 0.75, relatedAgentId: 'guide' },
                { tag: 'success', summary: `${blacksmith}과 ${guide}가 불빛의 위치를 확인했다.`, valence: 0.45, salience: 0.78, relatedAgentId: 'blacksmith' },
                { tag: 'support', summary: `${blacksmith}과 ${mudang}이 길 위의 불을 지켰다.`, valence: 0.38, salience: 0.72, relatedAgentId: 'mudang' },
              ),
              {
                agentTrustDelta: { blacksmith: 2, mudang: 2, guide: 3 },
                agentFatigueDelta: { blacksmith: 5, mudang: 4, guide: 5 },
                heroFatigueDelta: 5,
                heroPurposeDelta: 4,
                realmThreatDelta: { sacred_fields: 0.02 },
                factionTrustDelta: { village: 0.02, merchants: 0.04, spirits: 0.06 },
                factionInfluenceDelta: { merchants: 0.03, spirits: 0.03 },
                factionTensionDelta: { village: 0.01, merchants: -0.02, spirits: -0.03 },
              },
            ),
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
      'watchfire_triangle',
      step,
      '중앙 봉화의 불씨가 가장자리에서 꺼졌다',
      `${blacksmith}의 화덕은 남았지만 ${mudang}과 ${guide}가 맡은 가장자리 불이 차례로 약해졌다.`,
      '꺼진 봉화를 다시 살릴 것인가, 하나의 불이 돌아올 때까지 기다릴 것인가?',
      [
        makeChoice(
          'watchfire-rekindle-edge',
          '가장자리 봉화를 다시 살린다',
          '세 사람이 나뉘어 각자의 불을 되살리고, 서로의 상태를 짧은 신호로 계속 확인한다.',
          triadEffects(
            [0.08, 0.04, 0.11],
            triadMemories(
              { tag: 'support', summary: `${mudang}과 ${guide}의 꺼진 봉화를 다시 살렸다.`, valence: 0.42, salience: 0.8, relatedAgentId: 'mudang' },
              { tag: 'support', summary: `${blacksmith}과 ${guide}가 불씨를 나누어 지켰다.`, valence: 0.4, salience: 0.76, relatedAgentId: 'guide' },
              { tag: 'success', summary: `${blacksmith}과 ${mudang}의 신호가 다시 이어졌다.`, valence: 0.45, salience: 0.82, relatedAgentId: 'blacksmith' },
            ),
            {
              agentTrustDelta: { blacksmith: 2, mudang: 3, guide: 2 },
              agentFatigueDelta: { blacksmith: 4, mudang: 5, guide: 4 },
              heroMoraleDelta: 2,
              factionTrustDelta: { village: 0.06, merchants: 0.01, spirits: 0.08 },
              factionInfluenceDelta: { village: 0.03, spirits: 0.04 },
              factionTensionDelta: { village: -0.04, merchants: 0.01, spirits: -0.05 },
            },
          ),
        ),
        makeChoice(
          'watchfire-wait-fog',
          '불이 돌아올 때까지 기다린다',
          '잘못된 신호를 더 만들지 않도록 중앙 봉화 아래서 밤의 변화를 지켜본다.',
          triadEffects(
            [-0.06, 0.03, -0.09],
            triadMemories(
              { tag: 'conflict', summary: `${mudang}과 ${guide}가 기다림의 대가를 두고 의견을 달리했다.`, valence: -0.28, salience: 0.79, relatedAgentId: 'guide' },
              { tag: 'choice', summary: `${blacksmith}과 ${guide}가 중앙 불을 지키며 신호를 줄였다.`, valence: 0.16, salience: 0.7, relatedAgentId: 'blacksmith' },
              { tag: 'failure', summary: `${blacksmith}과 ${mudang}이 꺼진 불을 바로 살리지 못했다.`, valence: -0.34, salience: 0.82, relatedAgentId: 'mudang' },
            ),
            {
              agentTrustDelta: { blacksmith: 2, mudang: -1, guide: 1 },
              agentFatigueDelta: { blacksmith: 2, mudang: 3, guide: 3 },
              heroPurposeDelta: 2,
              factionTrustDelta: { village: 0.01, merchants: 0.02, spirits: -0.05 },
              factionInfluenceDelta: { village: 0.03 },
              factionTensionDelta: { village: 0.02, merchants: 0.02, spirits: 0.09 },
            },
          ),
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  const clearSignal = previousChoice === 'watchfire-read-ash' || previousChoice === 'watchfire-rekindle-edge';
  return buildEvent(
    source,
    day,
    createdAt,
    'watchfire_triangle',
    step,
    clearSignal ? '세 불은 같은 이름을 불렀다' : '남은 불 하나가 먼저 꺼졌다',
    clearSignal
      ? `${blacksmith}, ${mudang}, ${guide}가 서로 다른 불을 보았지만, 그 불들이 한 사람의 귀환을 기다렸다는 사실을 알아냈다.`
      : '중앙 봉화는 끝까지 타올랐지만, 가장자리의 침묵은 다음 밤의 길을 더 어둡게 만들었다.',
    clearSignal
      ? '세 봉화를 마을의 새 약속으로 남길 것인가, 이번 징조만 조용히 보내줄 것인가?'
      : '남은 불 하나를 새 출발점으로 삼을 것인가, 꺼진 불의 이름을 먼저 기록할 것인가?',
    clearSignal
      ? [
        makeChoice(
          'watchfire-keep-vigil',
          '세 불을 지킨다',
          '세 사람은 봉화의 담당을 나누고, 다음 징조가 와도 서로의 신호를 먼저 기다리기로 한다.',
          triadEffects(
            [0.13, 0.11, 0.14],
            triadMemories(
              { tag: 'success', summary: `${mudang}과 ${guide}의 불을 다음 밤까지 지켰다.`, valence: 0.62, salience: 0.86, relatedAgentId: 'guide' },
              { tag: 'success', summary: `${blacksmith}과 ${guide}가 봉화의 담당을 나눴다.`, valence: 0.58, salience: 0.82, relatedAgentId: 'blacksmith' },
              { tag: 'success', summary: `${blacksmith}과 ${mudang}이 같은 신호를 기다리기로 했다.`, valence: 0.64, salience: 0.88, relatedAgentId: 'mudang' },
            ),
            {
              agentTrustDelta: { blacksmith: 4, mudang: 4, guide: 4 },
              agentFatigueDelta: { blacksmith: -3, mudang: -2, guide: -3 },
              heroMoraleDelta: 5,
              heroPurposeDelta: 3,
              factionTrustDelta: { village: 0.08, merchants: 0.02, spirits: 0.13 },
              factionInfluenceDelta: { village: 0.04, spirits: 0.06 },
              factionTensionDelta: { village: -0.05, merchants: -0.01, spirits: -0.09 },
            },
          ),
        ),
        makeChoice(
          'watchfire-give-signal',
          '한 번만 신호를 보낸다',
          '불을 오래 붙잡지 않고, 누구든 돌아올 수 있도록 한 번의 분명한 신호만 남긴다.',
          triadEffects(
            [0.04, 0.07, 0.01],
            triadMemories(
              { tag: 'choice', summary: `${mudang}과 ${guide}에게 한 번의 신호로 밤을 넘긴 일이 남았다.`, valence: 0.26, salience: 0.72, relatedAgentId: 'guide' },
              { tag: 'support', summary: `${blacksmith}과 ${guide}가 돌아올 사람을 위한 신호를 정했다.`, valence: 0.3, salience: 0.7, relatedAgentId: 'blacksmith' },
              { tag: 'choice', summary: `${blacksmith}과 ${mudang}이 불을 오래 붙잡지 않기로 했다.`, valence: 0.24, salience: 0.74, relatedAgentId: 'mudang' },
            ),
            {
              agentTrustDelta: { blacksmith: 2, mudang: 2, guide: 2 },
              agentFatigueDelta: { blacksmith: -1, mudang: -2, guide: -1 },
              heroPurposeDelta: 3,
              factionTrustDelta: { village: 0.06, merchants: 0.03, spirits: 0.08 },
              factionInfluenceDelta: { village: 0.03, spirits: 0.04 },
              factionTensionDelta: { village: -0.03, merchants: -0.01, spirits: -0.04 },
            },
          ),
        ),
      ]
      : [
        makeChoice(
          'watchfire-trust-silence',
          '침묵도 신호로 남긴다',
          '꺼진 봉화를 실패로 지우지 않고, 다음 사람이 읽을 수 있는 빈자리로 기록한다.',
          triadEffects(
            [0.08, 0.02, 0.09],
            triadMemories(
              { tag: 'support', summary: `${mudang}과 ${guide}의 꺼진 불을 빈자리로 기록했다.`, valence: 0.32, salience: 0.8, relatedAgentId: 'mudang' },
              { tag: 'choice', summary: `${blacksmith}과 ${guide}가 실패한 신호도 남기기로 했다.`, valence: 0.25, salience: 0.74, relatedAgentId: 'guide' },
              { tag: 'support', summary: `${blacksmith}과 ${mudang}이 침묵의 의미를 함께 정했다.`, valence: 0.3, salience: 0.78, relatedAgentId: 'blacksmith' },
            ),
            {
              agentTrustDelta: { blacksmith: 3, mudang: 2, guide: 3 },
              agentFatigueDelta: { blacksmith: -1, mudang: -1, guide: -2 },
              heroMoraleDelta: 2,
              heroPurposeDelta: 4,
              factionTrustDelta: { village: 0.08, merchants: 0.01, spirits: 0.05 },
              factionInfluenceDelta: { village: 0.05, spirits: 0.02 },
              factionTensionDelta: { village: -0.04, merchants: 0.01, spirits: -0.03 },
            },
          ),
        ),
        makeChoice(
          'watchfire-cross-dark',
          '어둠을 건넌다',
          '불이 없어도 세 사람이 서로의 목소리를 따라 가장자리 봉화까지 직접 이동한다.',
          triadEffects(
            [-0.02, 0.1, -0.06],
            triadMemories(
              { tag: 'conflict', summary: `${mudang}과 ${guide}가 어둠 속 이동 순서를 두고 다퉜다.`, valence: -0.2, salience: 0.76, relatedAgentId: 'guide' },
              { tag: 'support', summary: `${blacksmith}과 ${guide}가 불 없는 길을 함께 건넜다.`, valence: 0.38, salience: 0.8, relatedAgentId: 'guide' },
              { tag: 'failure', summary: `${blacksmith}과 ${mudang}이 봉화를 늦게 되살렸다.`, valence: -0.24, salience: 0.78, relatedAgentId: 'blacksmith' },
            ),
            {
              agentTrustDelta: { blacksmith: 2, mudang: -1, guide: 3 },
              agentFatigueDelta: { blacksmith: 5, mudang: 5, guide: 6 },
              heroFatigueDelta: 6,
              heroPurposeDelta: 4,
              realmThreatDelta: { sacred_fields: 0.03 },
              factionTrustDelta: { village: 0.03, merchants: 0.04, spirits: 0.03 },
              factionInfluenceDelta: { merchants: 0.03, village: 0.02 },
              factionTensionDelta: { village: 0.04, merchants: -0.02, spirits: 0.04 },
            },
          ),
        ),
      ],
    chainId,
    parentEventId,
  );
}

function bridgeOfNamesEvent(
  source: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  step: number,
  chainId: string,
  parentEventId: string | undefined,
  previousChoice: string | null,
): VillageWorldEvent {
  const blacksmith = agentName(source, 'blacksmith');
  const mudang = agentName(source, 'mudang');
  const guide = agentName(source, 'guide');
  const context = triadContext(source);
  if (step === 0) {
    return buildEvent(
      source,
      day,
      createdAt,
      'bridge_of_names',
      step,
      '안개 속 다리가 세 사람의 이름을 요구했다',
      `${context} ${guide}가 찾은 다리는 ${blacksmith}의 쇠못과 ${mudang}의 표식을 모두 요구했지만, 누구도 건너는 순서를 정하지 못했다.`,
      '세 사람의 이름을 다리에 새길 것인가, 한 사람만 앞장서 위험을 줄일 것인가?',
      [
        makeChoice(
          'bridge-write-three-names',
          '세 이름을 함께 새긴다',
          '세 사람의 역할을 다리의 이정표에 남겨 누구의 판단도 혼자 남지 않게 한다.',
          triadEffects(
            [0.12, 0.13, 0.14],
            triadMemories(
              { tag: 'support', summary: `${mudang}과 ${guide}의 이름을 쇠못 옆에 새겼다.`, valence: 0.55, salience: 0.82, relatedAgentId: 'guide' },
              { tag: 'support', summary: `${blacksmith}과 ${guide}가 같은 다리 표식을 지켰다.`, valence: 0.52, salience: 0.8, relatedAgentId: 'blacksmith' },
              { tag: 'success', summary: `${blacksmith}과 ${mudang}의 이름을 길 위에 함께 남겼다.`, valence: 0.6, salience: 0.84, relatedAgentId: 'mudang' },
            ),
            {
              agentTrustDelta: { blacksmith: 3, mudang: 3, guide: 3 },
              agentFatigueDelta: { blacksmith: 4, mudang: 3, guide: 4 },
              heroMoraleDelta: 3,
              heroPurposeDelta: 3,
              factionTrustDelta: { village: 0.1, merchants: 0.03, spirits: 0.05 },
              factionInfluenceDelta: { village: 0.05, spirits: 0.02 },
              factionTensionDelta: { village: -0.08, merchants: -0.01, spirits: -0.03 },
            },
          ),
        ),
        makeChoice(
          'bridge-cross-alone',
          '한 사람이 먼저 건넌다',
          '길잡이가 앞서고 두 사람은 마을 쪽에서 줄을 잡아, 위험을 한 사람에게 모은다.',
          triadEffects(
            [-0.05, 0.04, -0.09],
            triadMemories(
              { tag: 'conflict', summary: `${mudang}과 ${guide}가 누가 먼저 건널지 끝내 합의하지 못했다.`, valence: -0.3, salience: 0.8, relatedAgentId: 'guide' },
              { tag: 'choice', summary: `${blacksmith}과 ${guide}가 줄 하나로 위험을 나눴다.`, valence: 0.2, salience: 0.75, relatedAgentId: 'guide' },
              { tag: 'failure', summary: `${blacksmith}과 ${mudang}이 다리 앞에서 서로의 걱정을 읽지 못했다.`, valence: -0.34, salience: 0.82, relatedAgentId: 'blacksmith' },
            ),
            {
              agentTrustDelta: { blacksmith: 2, mudang: -2, guide: 3 },
              agentFatigueDelta: { blacksmith: 3, mudang: 4, guide: 6 },
              heroFatigueDelta: 4,
              heroPurposeDelta: 4,
              factionTrustDelta: { village: 0.03, merchants: 0.03, spirits: -0.02 },
              factionInfluenceDelta: { merchants: 0.03 },
              factionTensionDelta: { village: 0.08, merchants: -0.01, spirits: 0.05 },
            },
          ),
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  if (step === 1) {
    if (previousChoice === 'bridge-write-three-names') {
      return buildEvent(
        source,
        day,
        createdAt,
        'bridge_of_names',
        step,
        '다리 밑에서 세 줄의 밧줄이 올라왔다',
        `이름을 새기자 안개 아래에서 ${blacksmith}, ${mudang}, ${guide}에게 각각 맞는 밧줄이 떠올랐다.`,
        '밧줄을 하나로 묶어 함께 건널 것인가, 각자의 길을 지켜 먼저 안전을 확인할 것인가?',
        [
          makeChoice(
            'bridge-share-rope',
            '밧줄을 함께 묶는다',
            '세 줄의 밧줄을 하나로 묶어 한 사람이 흔들리면 모두가 알 수 있게 한다.',
            triadEffects(
              [0.13, 0.1, 0.12],
              triadMemories(
                { tag: 'support', summary: `${mudang}과 ${guide}의 밧줄을 하나로 묶었다.`, valence: 0.52, salience: 0.8, relatedAgentId: 'guide' },
                { tag: 'support', summary: `${blacksmith}과 ${guide}가 흔들림을 함께 견뎠다.`, valence: 0.48, salience: 0.78, relatedAgentId: 'blacksmith' },
                { tag: 'success', summary: `${blacksmith}과 ${mudang}이 같은 밧줄의 장력을 맞췄다.`, valence: 0.55, salience: 0.82, relatedAgentId: 'blacksmith' },
              ),
              {
                agentTrustDelta: { blacksmith: 3, mudang: 3, guide: 3 },
                agentFatigueDelta: { blacksmith: 4, mudang: 4, guide: 4 },
                heroMoraleDelta: 3,
                realmThreatDelta: { sacred_fields: -0.03 },
                factionTrustDelta: { village: 0.08, merchants: 0.03, spirits: 0.04 },
                factionInfluenceDelta: { village: 0.04, merchants: 0.02 },
                factionTensionDelta: { village: -0.06, merchants: -0.01, spirits: -0.02 },
              },
            ),
          ),
          makeChoice(
            'bridge-mark-cost',
            '각자의 값을 표시한다',
            '밧줄을 묶지 않고, 각자가 감당한 위험과 다음 교대 시간을 돌에 표시한다.',
            triadEffects(
              [0.02, 0.06, -0.08],
              triadMemories(
                { tag: 'choice', summary: `${mudang}과 ${guide}가 각자의 위험을 돌에 표시했다.`, valence: 0.2, salience: 0.72, relatedAgentId: 'guide' },
                { tag: 'support', summary: `${blacksmith}과 ${guide}가 교대 시간을 분명히 적었다.`, valence: 0.3, salience: 0.74, relatedAgentId: 'blacksmith' },
                { tag: 'conflict', summary: `${blacksmith}과 ${mudang}의 책임 범위가 돌 위에서 갈라졌다.`, valence: -0.2, salience: 0.76, relatedAgentId: 'mudang' },
              ),
              {
                agentTrustDelta: { blacksmith: 2, mudang: 2, guide: 2 },
                agentFatigueDelta: { blacksmith: 2, mudang: 3, guide: 3 },
                heroPurposeDelta: 3,
                factionTrustDelta: { village: 0.06, merchants: 0.04, spirits: 0.02 },
                factionInfluenceDelta: { village: 0.04, merchants: 0.02 },
                factionTensionDelta: { village: -0.03, merchants: -0.02, spirits: 0.02 },
              },
            ),
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
      'bridge_of_names',
      step,
      '돌아온 발자국이 마을 쪽을 가리켰다',
      `${guide}가 먼저 건넌 뒤 돌아온 발자국은 반대편보다 마을 쪽의 젖은 돌을 더 많이 밟고 있었다.`,
      '모두 돌아가 다리의 뜻을 다시 묻을 것인가, 길잡이를 믿고 건너편의 답을 찾을 것인가?',
      [
        makeChoice(
          'bridge-return-village',
          '마을로 돌아가 확인한다',
          '세 사람은 한 번 건넌 길을 되짚어 마을 사람들의 이름까지 이정표에 더한다.',
          triadEffects(
            [0.1, 0.04, 0.11],
            triadMemories(
              { tag: 'support', summary: `${mudang}과 ${guide}와 함께 마을 쪽 발자국을 되짚었다.`, valence: 0.42, salience: 0.8, relatedAgentId: 'mudang' },
              { tag: 'support', summary: `${blacksmith}과 ${guide}가 돌아온 길의 돌을 다시 고정했다.`, valence: 0.4, salience: 0.76, relatedAgentId: 'guide' },
              { tag: 'success', summary: `${blacksmith}과 ${mudang}이 마을 사람의 이름을 이정표에 더했다.`, valence: 0.46, salience: 0.82, relatedAgentId: 'blacksmith' },
            ),
            {
              agentTrustDelta: { blacksmith: 3, mudang: 3, guide: 2 },
              agentFatigueDelta: { blacksmith: 4, mudang: 3, guide: 4 },
              heroMoraleDelta: 3,
              prosperityDelta: 2,
              factionTrustDelta: { village: 0.1, merchants: 0.02, spirits: 0.04 },
              factionInfluenceDelta: { village: 0.05 },
              factionTensionDelta: { village: -0.07, merchants: -0.01, spirits: -0.02 },
            },
          ),
        ),
        makeChoice(
          'bridge-trust-guide',
          '길잡이를 믿는다',
          '두 사람은 솔바람의 표식을 따라 건너편으로 가서 안개가 숨긴 원인을 먼저 확인한다.',
          triadEffects(
            [-0.03, 0.1, -0.04],
            triadMemories(
              { tag: 'choice', summary: `${mudang}과 ${guide}의 표식을 믿고 안개를 건넜다.`, valence: 0.2, salience: 0.76, relatedAgentId: 'guide' },
              { tag: 'support', summary: `${blacksmith}과 ${guide}가 젖은 돌의 순서를 맞췄다.`, valence: 0.38, salience: 0.78, relatedAgentId: 'guide' },
              { tag: 'choice', summary: `${blacksmith}과 ${mudang}의 걱정을 뒤로하고 길을 따랐다.`, valence: 0.12, salience: 0.72, relatedAgentId: 'mudang' },
            ),
            {
              agentTrustDelta: { blacksmith: 2, mudang: 1, guide: 4 },
              agentFatigueDelta: { blacksmith: 5, mudang: 5, guide: 4 },
              heroFatigueDelta: 5,
              heroPurposeDelta: 4,
              realmThreatDelta: { sacred_fields: 0.02 },
              factionTrustDelta: { village: 0.04, merchants: 0.04, spirits: 0.02 },
              factionInfluenceDelta: { merchants: 0.03, village: 0.02 },
              factionTensionDelta: { village: 0.03, merchants: -0.02, spirits: 0.03 },
            },
          ),
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  const shared = previousChoice === 'bridge-share-rope' || previousChoice === 'bridge-return-village';
  return buildEvent(
    source,
    day,
    createdAt,
    'bridge_of_names',
    step,
    shared ? '다리는 이름을 기억했다' : '안개가 걷힌 뒤 남은 약속',
    shared
      ? `${blacksmith}, ${mudang}, ${guide}의 이름이 새겨진 돌은 안개가 걷힌 뒤에도 마을과 원정로 사이에 남았다.`
      : '다리는 건넜지만, 누구의 판단이 먼저였는지는 젖은 돌과 침묵 사이에 남았다.',
    shared
      ? '세 사람의 이름을 다음 원정의 길표로 삼을 것인가, 오늘만의 표식으로 남길 것인가?'
      : '다리를 다시 닫아 안전을 지킬 것인가, 불완전한 길도 다음 사람에게 넘길 것인가?',
    shared
      ? [
        makeChoice(
          'bridge-name-waystone',
          '공동 이정표로 남긴다',
          '세 사람의 이름과 마을의 약속을 다음 원정대가 읽을 수 있는 길표로 만든다.',
          triadEffects(
            [0.14, 0.13, 0.14],
            triadMemories(
              { tag: 'success', summary: `${mudang}과 ${guide}의 이름을 공동 이정표로 남겼다.`, valence: 0.66, salience: 0.88, relatedAgentId: 'guide' },
              { tag: 'success', summary: `${blacksmith}과 ${guide}가 다음 원정의 길표를 완성했다.`, valence: 0.62, salience: 0.84, relatedAgentId: 'blacksmith' },
              { tag: 'success', summary: `${blacksmith}과 ${mudang}의 약속을 돌에 새겼다.`, valence: 0.68, salience: 0.9, relatedAgentId: 'mudang' },
            ),
            {
              agentTrustDelta: { blacksmith: 4, mudang: 4, guide: 4 },
              agentFatigueDelta: { blacksmith: -3, mudang: -3, guide: -2 },
              heroMoraleDelta: 4,
              heroPurposeDelta: 4,
              prosperityDelta: 3,
              factionTrustDelta: { village: 0.12, merchants: 0.04, spirits: 0.05 },
              factionInfluenceDelta: { village: 0.06, merchants: 0.02 },
              factionTensionDelta: { village: -0.09, merchants: -0.02, spirits: -0.03 },
            },
          ),
        ),
        makeChoice(
          'bridge-keep-private-mark',
          '오늘의 표식으로 남긴다',
          '이정표의 뜻을 세 사람만 간직하고, 다음 사람에게는 안전이 확인된 길만 건넨다.',
          triadEffects(
            [0.05, 0.08, 0.03],
            triadMemories(
              { tag: 'choice', summary: `${mudang}과 ${guide}의 표식을 모두 공개하지 않기로 했다.`, valence: 0.24, salience: 0.73, relatedAgentId: 'guide' },
              { tag: 'support', summary: `${blacksmith}과 ${guide}가 안전이 확인된 길만 남겼다.`, valence: 0.3, salience: 0.72, relatedAgentId: 'blacksmith' },
              { tag: 'choice', summary: `${blacksmith}과 ${mudang}이 오늘의 의미를 간직하기로 했다.`, valence: 0.2, salience: 0.7, relatedAgentId: 'mudang' },
            ),
            {
              agentTrustDelta: { blacksmith: 2, mudang: 2, guide: 3 },
              agentFatigueDelta: { blacksmith: -1, mudang: -2, guide: -2 },
              heroPurposeDelta: 3,
              prosperityDelta: 2,
              factionTrustDelta: { village: 0.07, merchants: 0.02, spirits: 0.04 },
              factionInfluenceDelta: { village: 0.04 },
              factionTensionDelta: { village: -0.04, merchants: -0.01, spirits: -0.02 },
            },
          ),
        ),
      ]
      : [
        makeChoice(
          'bridge-close-fog-road',
          '안개 길을 닫는다',
          '다리를 잠시 닫고 세 사람의 판단이 다시 맞을 때까지 마을 쪽 길을 지킨다.',
          triadEffects(
            [0.08, -0.05, 0.04],
            triadMemories(
              { tag: 'support', summary: `${mudang}과 ${guide}의 불안을 인정하고 안개 길을 닫았다.`, valence: 0.32, salience: 0.8, relatedAgentId: 'mudang' },
              { tag: 'conflict', summary: `${blacksmith}과 ${guide}가 다리를 닫는 시점을 두고 맞섰다.`, valence: -0.18, salience: 0.76, relatedAgentId: 'guide' },
              { tag: 'support', summary: `${blacksmith}과 ${mudang}이 마을 쪽 길을 함께 지켰다.`, valence: 0.3, salience: 0.78, relatedAgentId: 'blacksmith' },
            ),
            {
              agentTrustDelta: { blacksmith: 3, mudang: 3, guide: 1 },
              agentFatigueDelta: { blacksmith: -2, mudang: -1, guide: 2 },
              heroMoraleDelta: 2,
              realmThreatDelta: { sacred_fields: -0.04 },
              factionTrustDelta: { village: 0.1, merchants: -0.01, spirits: 0.03 },
              factionInfluenceDelta: { village: 0.05 },
              factionTensionDelta: { village: -0.06, merchants: 0.05, spirits: -0.02 },
            },
          ),
        ),
        makeChoice(
          'bridge-pass-imperfect-road',
          '불완전한 길을 넘긴다',
          '안전하지 않다는 표시까지 포함해 길을 공개하고, 다음 사람에게 판단을 넘긴다.',
          triadEffects(
            [-0.03, 0.08, -0.06],
            triadMemories(
              { tag: 'choice', summary: `${mudang}과 ${guide}의 우려까지 적어 불완전한 길을 남겼다.`, valence: 0.16, salience: 0.76, relatedAgentId: 'guide' },
              { tag: 'support', summary: `${blacksmith}과 ${guide}가 위험 표시를 길표에 더했다.`, valence: 0.34, salience: 0.8, relatedAgentId: 'blacksmith' },
              { tag: 'conflict', summary: `${blacksmith}과 ${mudang}이 위험을 공개하는 값을 두고 달랐다.`, valence: -0.15, salience: 0.74, relatedAgentId: 'mudang' },
            ),
            {
              agentTrustDelta: { blacksmith: 2, mudang: 1, guide: 3 },
              agentFatigueDelta: { blacksmith: 2, mudang: 3, guide: 2 },
              heroPurposeDelta: 4,
              prosperityDelta: 2,
              realmThreatDelta: { sacred_fields: 0.02 },
              factionTrustDelta: { village: 0.05, merchants: 0.04, spirits: 0.01 },
              factionInfluenceDelta: { merchants: 0.03, village: 0.03 },
              factionTensionDelta: { village: 0.03, merchants: -0.02, spirits: 0.02 },
            },
          ),
        ),
      ],
    chainId,
    parentEventId,
  );
}

/** Creates one act of a deterministic three-agent arc. */
export function createVillageTriadArcEvent(
  source: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  kind: VillageTriadArcKind,
  step = 0,
  chainId?: string,
  parentEventId?: string,
): VillageWorldEvent | null {
  if (!isVillageTriadArcKind(kind)
    || !Number.isSafeInteger(day)
    || !Number.isSafeInteger(createdAt)
    || !Number.isSafeInteger(step)
    || step < 0
    || step > VILLAGE_TRIAD_ARC_FINAL_STEP) return null;
  const resolvedChainId = chainId ?? `world-triad-${kind}-${day}`;
  const chain = getVillageAIState(source).world.chains?.find((candidate) => candidate.id === resolvedChainId);
  const previousChoice = previousChoiceId(source, chain);
  if (kind === 'granary_covenant') {
    return granaryCovenantEvent(source, day, createdAt, step, resolvedChainId, parentEventId, previousChoice);
  }
  if (kind === 'watchfire_triangle') {
    return watchfireTriangleEvent(source, day, createdAt, step, resolvedChainId, parentEventId, previousChoice);
  }
  return bridgeOfNamesEvent(source, day, createdAt, step, resolvedChainId, parentEventId, previousChoice);
}

export function isVillageTriadArcKind(value: unknown): value is VillageTriadArcKind {
  return typeof value === 'string' && VILLAGE_TRIAD_ARC_KINDS.includes(value as VillageTriadArcKind);
}

export function getVillageTriadArcLabel(kind: VillageWorldChainKind): string | null {
  return isVillageTriadArcKind(kind) ? VILLAGE_TRIAD_ARC_DEFINITIONS[kind].labelKR : null;
}

export function getVillageTriadArcAgents(kind: VillageTriadArcKind): readonly [SupportAgentId, SupportAgentId, SupportAgentId] {
  return VILLAGE_TRIAD_ARC_DEFINITIONS[kind].agents;
}

export function getVillageTriadArcFactionLabel(kind: VillageTriadArcKind): string {
  const labels: Record<VillageFactionId, string> = {
    village: '마을',
    merchants: '상단',
    spirits: '정령',
  };
  return labels[VILLAGE_TRIAD_ARC_DEFINITIONS[kind].factionId];
}
