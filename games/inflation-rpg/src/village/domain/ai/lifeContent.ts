import { getVillageRealmDefinition } from '../../data';
import type {
  RealmId,
  SupportAgentId,
  VillageAgentMemoryEffect,
  VillageAgentMemoryTag,
  VillageFactionId,
  VillageLifeArcKind,
  VillageSaveEnvelope,
  VillageWorldChainState,
  VillageWorldEvent,
  VillageWorldEventChoice,
  VillageWorldEventEffects,
  VillageWorldEventType,
} from '../../types';
import { VILLAGE_LIFE_ARC_KINDS } from '../../types';
import {
  deterministicUnit,
  getVillageAgentAIState,
  getVillageAgentCognitionState,
  getVillageAIState,
  getVillageSimulationState,
  VILLAGE_SUPPORT_AGENT_IDS,
  Village_WORLD_DAY_MS,
} from './state';

export interface VillageLifeArcDefinition {
  kind: VillageLifeArcKind;
  agentId: SupportAgentId;
  factionId: VillageFactionId;
  eventType: VillageWorldEventType;
  labelKR: string;
}

export const VILLAGE_LIFE_ARC_DEFINITIONS: Record<VillageLifeArcKind, VillageLifeArcDefinition> = {
  blacksmith_apprentice: {
    kind: 'blacksmith_apprentice',
    agentId: 'blacksmith',
    factionId: 'merchants',
    eventType: 'supply',
    labelKR: '금 간 모루의 제자',
  },
  mudang_memorial: {
    kind: 'mudang_memorial',
    agentId: 'mudang',
    factionId: 'spirits',
    eventType: 'omen',
    labelKR: '기억되지 못한 이름',
  },
  guide_waystone: {
    kind: 'guide_waystone',
    agentId: 'guide',
    factionId: 'village',
    eventType: 'weather',
    labelKR: '돌아오지 않는 이정표',
  },
};

/** Personal arcs intentionally use two acts; the shared world chain cap remains three acts for faction sagas. */
export const VILLAGE_LIFE_ARC_FINAL_STEP = 1 as const;

const SEASON_LABELS: Record<string, string> = {
  spring: '봄',
  summer: '여름',
  autumn: '가을',
  winter: '겨울',
};

const FACTION_LABELS: Record<VillageFactionId, string> = {
  village: '마을',
  merchants: '상단',
  spirits: '정령',
};

const AGENT_NAMES: Record<SupportAgentId, string> = {
  blacksmith: '담철',
  mudang: '월령',
  guide: '솔바람',
};

const LIFE_ARC_CADENCE_START_DAY = 10;
const LIFE_ARC_CADENCE_DAYS = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function agentName(source: VillageSaveEnvelope, agentId: SupportAgentId): string {
  return source.meta.agents.find((agent) => agent.id === agentId)?.nameKR ?? AGENT_NAMES[agentId];
}

function targetRealmId(source: VillageSaveEnvelope): RealmId {
  if (source.meta.unlockedRealms.includes('underworld')) return 'underworld';
  if (source.meta.unlockedRealms.includes('deep_forest')) return 'deep_forest';
  return 'sacred_fields';
}

function targetRealmName(source: VillageSaveEnvelope): string {
  return getVillageRealmDefinition(targetRealmId(source))?.nameKR ?? '원정로';
}

function makeChoice(
  id: string,
  title: string,
  text: string,
  effects: VillageWorldEventEffects,
): VillageWorldEventChoice {
  return { id, title, text, effects };
}

function memoryEffect(
  agentId: SupportAgentId,
  tag: VillageAgentMemoryTag,
  summary: string,
  valence: number,
  salience: number,
  relatedAgentId: SupportAgentId | null = null,
): Partial<Record<SupportAgentId, VillageAgentMemoryEffect>> {
  return {
    [agentId]: { tag, summary, valence, salience, relatedAgentId },
  };
}

function buildEvent(
  source: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  kind: VillageLifeArcKind,
  step: number,
  title: string,
  cause: string,
  prompt: string,
  choices: VillageWorldEventChoice[],
  chainId?: string,
  parentEventId?: string,
): VillageWorldEvent {
  const definition = VILLAGE_LIFE_ARC_DEFINITIONS[kind];
  const resolvedChainId = chainId ?? `world-life-${kind}-${day}`;
  const eventId = step === 0
    ? `world-event-${day}-life-${kind}`
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

function hasActiveLifeArc(source: VillageSaveEnvelope, kind: VillageLifeArcKind): boolean {
  const ai = getVillageAIState(source);
  return (ai.world.chains ?? []).some((chain) => chain.kind === kind)
    || ai.pendingEvents.some((event) => event.chainKind === kind && event.chainStep === 0);
}

function hasAnyActiveLifeArc(source: VillageSaveEnvelope): boolean {
  const ai = getVillageAIState(source);
  return (ai.world.chains ?? []).some((chain) => isVillageLifeArcKind(chain.kind))
    || ai.pendingEvents.some((event) => isVillageLifeArcKind(event.chainKind));
}

function averageRelationshipTension(source: VillageSaveEnvelope, agentId: SupportAgentId): number {
  const brain = getVillageAgentAIState(source, agentId);
  const peers = VILLAGE_SUPPORT_AGENT_IDS.filter((candidate) => candidate !== agentId);
  if (peers.length === 0) return 0;
  return peers.reduce((total, peerId) => total + Math.max(0, -safeNumber(brain.relationships[peerId])), 0) / peers.length;
}

function lifeArcPressure(source: VillageSaveEnvelope, kind: VillageLifeArcKind): number {
  const agentId = VILLAGE_LIFE_ARC_DEFINITIONS[kind].agentId;
  const agent = source.meta.agents.find((candidate) => candidate.id === agentId);
  const brain = getVillageAgentAIState(source, agentId);
  const cognition = getVillageAgentCognitionState(source, agentId);
  const salientStrain = cognition.memories
    .filter((memory) => memory.tag === 'failure' || memory.tag === 'conflict')
    .reduce((total, memory) => total + memory.salience, 0);
  return clamp(
    safeNumber(agent?.fatigue) / 100 * 0.28
      + safeNumber(brain.stress) / 100 * 0.27
      + (1 - safeNumber(agent?.trust) / 100) * 0.2
      + averageRelationshipTension(source, agentId) * 0.15
      + clamp(salientStrain, 0, 1) * 0.1,
    0,
    1,
  );
}

/** Selects one bounded personal story during a scheduled window or under sustained personal pressure. */
export function selectVillageLifeArcKind(
  source: VillageSaveEnvelope,
  day: number,
): VillageLifeArcKind | null {
  if (!Number.isSafeInteger(day) || day < LIFE_ARC_CADENCE_START_DAY) return null;
  const ai = getVillageAIState(source);
  if (hasAnyActiveLifeArc(source)) return null;
  const available = VILLAGE_LIFE_ARC_KINDS.filter((kind) => !hasActiveLifeArc(source, kind));
  if (available.length === 0) return null;

  const lifeStarts = getVillageSimulationState(source).eventHistory
    .filter((record) => isVillageLifeArcKind(record.chainKind) && record.chainStep === 0)
    .map((record) => record.day);
  const lastLifeStart = lifeStarts.length > 0 ? Math.max(...lifeStarts) : null;
  const nextOpportunityStart = lastLifeStart === null
    ? LIFE_ARC_CADENCE_START_DAY
    : lastLifeStart + LIFE_ARC_CADENCE_DAYS;
  // Due faction chains can occupy the event slot for several days. Keep the
  // opportunity window open long enough for the personal story to surface
  // without creating a second pending event on the same day.
  const scheduled = day >= nextOpportunityStart
    && day < nextOpportunityStart + LIFE_ARC_CADENCE_DAYS * 2;
  const highestPressure = Math.max(...available.map((kind) => lifeArcPressure(source, kind)));
  const spontaneous = deterministicUnit(`${ai.seed}:life-pressure:${day}`);
  if (!scheduled && (highestPressure < 0.84 || spontaneous >= 0.18)) return null;

  const slot = lifeStarts.length;
  const preferred = VILLAGE_LIFE_ARC_KINDS[
    (Math.abs(Math.floor(ai.seed)) + slot) % VILLAGE_LIFE_ARC_KINDS.length
  ];
  if (scheduled && available.includes(preferred)) return preferred;
  return [...available].sort((left, right) => {
    const leftScore = lifeArcPressure(source, left) + (left === preferred ? 0.28 : 0)
      + deterministicUnit(`${ai.seed}:life-order:${day}:${left}`) * 0.04;
    const rightScore = lifeArcPressure(source, right) + (right === preferred ? 0.28 : 0)
      + deterministicUnit(`${ai.seed}:life-order:${day}:${right}`) * 0.04;
    if (leftScore !== rightScore) return rightScore - leftScore;
    return left < right ? -1 : left > right ? 1 : 0;
  })[0] ?? null;
}

function blacksmithApprenticeEvent(
  source: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  step: number,
  chainId: string,
  parentEventId: string | undefined,
  previousChoice: string | null,
): VillageWorldEvent {
  const name = agentName(source, 'blacksmith');
  const blacksmith = source.meta.agents.find((agent) => agent.id === 'blacksmith');
  const hasFailureMemory = getVillageAgentCognitionState(source, 'blacksmith').memories
    .some((memory) => memory.tag === 'failure');
  if (step === 0) {
    return buildEvent(
      source,
      day,
      createdAt,
      'blacksmith_apprentice',
      step,
      blacksmith && blacksmith.fatigue >= 70 ? `${name}의 망치가 평소보다 무겁다` : '작업대에 작은 손자국이 남았다',
      hasFailureMemory
        ? `${name}은 지난 실패의 금을 숨긴 채 작업대를 정리하다가, 아직 떠나지 않은 제자의 손자국을 발견했다.`
        : `${name}의 작업대에 누군가 조심스럽게 놓아 둔 작은 망치가 보였다. 상단의 견습생이 밤마다 연습하고 있었다.`,
      '기술을 나누어 함께 책임질 것인가, 상처가 생기기 전에 거리를 둘 것인가?',
      [
        makeChoice(
          'apprentice-share-hammer',
          '망치를 함께 든다',
          `${name}이 제자의 손을 바로잡고, 첫 칼날을 완성할 때까지 작업대를 나누기로 한다.`,
          {
            agentTrustDelta: { blacksmith: 5 },
            agentFatigueDelta: { blacksmith: 5 },
            heroMoraleDelta: 2,
            prosperityDelta: 2,
            factionTrustDelta: { merchants: 0.06 },
            factionTensionDelta: { merchants: -0.04 },
            agentMemory: memoryEffect('blacksmith', 'support', `${name}은 작업대를 나누어 제자의 첫 손길을 받아들였다.`, 0.6, 0.92),
          },
        ),
        makeChoice(
          'apprentice-set-boundary',
          '먼저 선을 긋는다',
          `이번에는 도구만 빌려 주고, ${name}의 작업대는 스스로 지키게 한다.`,
          {
            agentTrustDelta: { blacksmith: 1 },
            agentFatigueDelta: { blacksmith: -4 },
            heroPurposeDelta: 3,
            factionInfluenceDelta: { merchants: 0.03 },
            factionTensionDelta: { merchants: 0.03 },
            agentMemory: memoryEffect('blacksmith', 'observation', `${name}은 제자에게 도구를 빌려 주되 자신의 작업대에는 선을 그었다.`, 0.05, 0.72),
          },
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  if (previousChoice === 'apprentice-share-hammer') {
    return buildEvent(
      source,
      day,
      createdAt,
      'blacksmith_apprentice',
      step,
      '첫 칼날이 휘었다',
      `${name}이 함께 만든 칼날의 끝이 휘었지만, 제자는 도망치지 않고 망치를 다시 들었다.`,
      '실패를 함께 고칠 것인가, 제자에게 혼자 다시 시작할 시간을 줄 것인가?',
      [
        makeChoice(
          'apprentice-repair-together',
          '함께 다시 벼린다',
          '금 간 칼날을 녹여 새 재료로 만들고, 실패한 이유를 다음 장부에 남긴다.',
          {
            agentTrustDelta: { blacksmith: 6 },
            agentFatigueDelta: { blacksmith: 6 },
            heroMoraleDelta: 3,
            prosperityDelta: 3,
            factionTrustDelta: { merchants: 0.08, village: 0.02 },
            factionTensionDelta: { merchants: -0.05 },
            agentMemory: memoryEffect('blacksmith', 'success', `${name}은 실패한 칼날을 제자와 함께 다시 벼렸다.`, 0.75, 0.96),
          },
        ),
        makeChoice(
          'apprentice-test-alone',
          '혼자 다시 해 보게 한다',
          '곁을 지키되 손을 대지 않고, 제자가 자기 실수의 모양을 직접 보게 한다.',
          {
            agentTrustDelta: { blacksmith: 3 },
            agentFatigueDelta: { blacksmith: 2 },
            heroPurposeDelta: 4,
            factionTrustDelta: { merchants: 0.04 },
            agentMemory: memoryEffect('blacksmith', 'observation', `${name}은 제자의 실패 곁에 서서 스스로 고칠 시간을 주었다.`, 0.35, 0.84),
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
    'blacksmith_apprentice',
    step,
    '비어 있는 작업대',
    `${name}이 선을 그은 다음 날, 작은 망치는 작업대 아래에 놓인 채 아무도 찾지 않았다.`,
    '제자를 다시 부를 것인가, 각자의 숙련을 기다릴 것인가?',
    [
      makeChoice(
        'apprentice-call-back',
        '다시 부른다',
        '도구를 돌려받는 대신, 다음 장부터는 제자의 이름도 작업 기록에 적기로 한다.',
        {
          agentTrustDelta: { blacksmith: 4 },
          agentFatigueDelta: { blacksmith: 3 },
          heroMoraleDelta: 2,
          factionTrustDelta: { merchants: 0.06 },
          factionTensionDelta: { merchants: -0.03 },
          agentMemory: memoryEffect('blacksmith', 'support', `${name}은 한 번 그은 선을 다시 열고 제자의 이름을 기록했다.`, 0.55, 0.9),
        },
      ),
      makeChoice(
        'apprentice-close-shop',
        '기다림으로 남긴다',
        '작업대는 잠그지 않되, 돌아올 시기는 제자 스스로 정하게 둔다.',
        {
          agentTrustDelta: { blacksmith: -2 },
          agentFatigueDelta: { blacksmith: -3 },
          heroPurposeDelta: 3,
          prosperityDelta: 1,
          factionInfluenceDelta: { merchants: 0.04 },
          agentMemory: memoryEffect('blacksmith', 'conflict', `${name}은 제자를 기다리기로 했지만, 빈 작업대의 침묵을 오래 기억했다.`, -0.25, 0.86),
        },
      ),
    ],
    chainId,
    parentEventId,
  );
}

function mudangMemorialEvent(
  source: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  step: number,
  chainId: string,
  parentEventId: string | undefined,
  previousChoice: string | null,
): VillageWorldEvent {
  const name = agentName(source, 'mudang');
  const season = SEASON_LABELS[getVillageAIState(source).world.season] ?? '계절';
  if (step === 0) {
    return buildEvent(
      source,
      day,
      createdAt,
      'mudang_memorial',
      step,
      '제례 장부에서 지워진 이름',
      `${season} 새벽, ${name}의 제례 장부 한쪽에서 오래전 함께 살던 사람의 이름만 깨끗하게 지워져 있었다.`,
      '이름을 다시 읽어 줄 것인가, 남겨진 사람의 침묵을 지켜 줄 것인가?',
      [
        makeChoice(
          'memorial-speak-name',
          '이름을 읽는다',
          `${name}이 작은 등불을 켜고, 잊힌 이름을 오늘의 마을 사람들 앞에서 천천히 부른다.`,
          {
            agentTrustDelta: { mudang: 5 },
            agentFatigueDelta: { mudang: 4 },
            heroMoraleDelta: 3,
            realmThreatDelta: { [targetRealmId(source)]: -0.03 },
            factionTrustDelta: { spirits: 0.08, village: 0.04 },
            factionTensionDelta: { spirits: -0.05 },
            agentMemory: memoryEffect('mudang', 'support', `${name}은 지워진 이름을 다시 읽어 마을의 기억으로 돌려놓았다.`, 0.65, 0.94),
          },
        ),
        makeChoice(
          'memorial-keep-silent',
          '침묵을 지킨다',
          '장부를 덮고, 이름을 말할 준비가 된 사람만 제단 앞에 오도록 기다린다.',
          {
            agentTrustDelta: { mudang: 2 },
            agentFatigueDelta: { mudang: -4 },
            heroPurposeDelta: 3,
            factionTrustDelta: { spirits: 0.02, village: 0.03 },
            factionTensionDelta: { spirits: 0.04 },
            agentMemory: memoryEffect('mudang', 'observation', `${name}은 말하지 않는 애도를 존중하며 제단의 침묵을 지켰다.`, 0.2, 0.78),
          },
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  if (previousChoice === 'memorial-speak-name') {
    return buildEvent(
      source,
      day,
      createdAt,
      'mudang_memorial',
      step,
      '등불 곁에 빈 자리가 생겼다',
      `${name}이 이름을 부른 뒤, 제단 앞에는 누구도 앉지 않은 자리가 하나 남았다.`,
      '빈자리를 마을의 약속으로 남길 것인가, 떠난 사람의 길까지 배웅할 것인가?',
      [
        makeChoice(
          'memorial-walk-to-shrine',
          '끝까지 배웅한다',
          '등불을 들고 오래된 표식까지 걸어가, 돌아오지 못한 사람의 길을 정리한다.',
          {
            agentTrustDelta: { mudang: 6 },
            agentFatigueDelta: { mudang: 5 },
            heroMoraleDelta: 4,
            realmThreatDelta: { [targetRealmId(source)]: -0.04 },
            factionTrustDelta: { spirits: 0.1 },
            factionInfluenceDelta: { spirits: 0.04 },
            factionTensionDelta: { spirits: -0.06 },
            agentMemory: memoryEffect('mudang', 'success', `${name}은 빈자리를 따라 옛 표식까지 걸어가 마지막 인사를 남겼다.`, 0.78, 0.96),
          },
        ),
        makeChoice(
          'memorial-light-lantern',
          '자리를 남긴다',
          '빈자리를 치우지 않고, 다음에 이름을 찾는 사람이 앉을 수 있도록 등불만 밝힌다.',
          {
            agentTrustDelta: { mudang: 3 },
            heroMoraleDelta: 3,
            factionTrustDelta: { spirits: 0.06, village: 0.04 },
            factionTensionDelta: { spirits: -0.03 },
            agentMemory: memoryEffect('mudang', 'support', `${name}은 빈자리를 지워 버리지 않고 다음 사람을 위한 등불로 남겼다.`, 0.55, 0.88),
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
    'mudang_memorial',
    step,
    '침묵 뒤에 남은 작은 불',
    `${name}이 침묵을 지킨 제단에는 밤이 지나도 꺼지지 않은 작은 불 하나가 남았다.`,
    `그 불을 마을 사람들과 나눌 것인가, ${name}의 제단 안에 보관할 것인가?`,
    [
      makeChoice(
        'memorial-ask-village',
        '함께 이름을 묻는다',
        '마을의 사람들에게 각자의 기억을 한 줄씩 들려 달라고 부탁하고 장부를 다시 채운다.',
        {
          agentTrustDelta: { mudang: 4 },
          heroMoraleDelta: 3,
          prosperityDelta: 2,
          factionTrustDelta: { village: 0.08, spirits: 0.05 },
          factionTensionDelta: { village: -0.04, spirits: -0.02 },
          agentMemory: memoryEffect('mudang', 'support', `${name}은 침묵 뒤의 불을 마을 사람들의 기억과 나누었다.`, 0.58, 0.9),
        },
      ),
      makeChoice(
        'memorial-leave-empty',
        '불을 제단에 둔다',
        '이름을 억지로 채우지 않고, 말할 준비가 될 때까지 작은 불만 지켜 준다.',
        {
          agentTrustDelta: { mudang: -1 },
          agentFatigueDelta: { mudang: -3 },
          heroPurposeDelta: 4,
          factionTrustDelta: { spirits: 0.07 },
          factionInfluenceDelta: { spirits: 0.03 },
          factionTensionDelta: { spirits: 0.02 },
          agentMemory: memoryEffect('mudang', 'observation', `${name}은 이름을 서둘러 채우지 않고 말할 때를 기다렸다.`, 0.18, 0.82),
        },
      ),
    ],
    chainId,
    parentEventId,
  );
}

function guideWaystoneEvent(
  source: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  step: number,
  chainId: string,
  parentEventId: string | undefined,
  previousChoice: string | null,
): VillageWorldEvent {
  const name = agentName(source, 'guide');
  const realmName = targetRealmName(source);
  const weather = getVillageAIState(source).world.weather;
  if (step === 0) {
    return buildEvent(
      source,
      day,
      createdAt,
      'guide_waystone',
      step,
      weather === 'fog' ? `${name}이 안개 속에서 돌아오지 않는 이정표를 보았다` : '길목의 이정표가 집이 아닌 곳을 가리켰다',
      `${name}이 ${realmName}에서 돌아오는 길에, 마을을 향해야 할 이정표 하나가 오래된 빈집 쪽을 가리키고 있었다.`,
      '표식을 따라 잃어버린 길을 찾을 것인가, 마을로 돌아오는 안전한 길을 지킬 것인가?',
      [
        makeChoice(
          'waystone-follow-home',
          '표식을 따라간다',
          `${name}이 길을 잃은 사람의 흔적일 수 있다며, ${realmName} 쪽으로 난 표식을 따라간다.`,
          {
            agentTrustDelta: { guide: 5 },
            agentFatigueDelta: { guide: 5 },
            heroPurposeDelta: 3,
            realmThreatDelta: { [targetRealmId(source)]: 0.04 },
            factionTrustDelta: { village: 0.06 },
            factionInfluenceDelta: { village: 0.04 },
            factionTensionDelta: { village: 0.04 },
            agentMemory: memoryEffect('guide', 'observation', `${name}은 돌아오지 않는 이정표를 따라 잃어버린 길의 흔적을 찾았다.`, 0.35, 0.9),
          },
        ),
        makeChoice(
          'waystone-mark-safe',
          '안전한 길을 표시한다',
          '표식을 바로잡고, 다음 사람이 같은 곳에서 길을 잃지 않도록 돌아오는 화살표를 새긴다.',
          {
            agentTrustDelta: { guide: 4 },
            agentFatigueDelta: { guide: -3 },
            heroMoraleDelta: 2,
            realmThreatDelta: { [targetRealmId(source)]: -0.03 },
            factionTrustDelta: { village: 0.09 },
            factionTensionDelta: { village: -0.05 },
            agentMemory: memoryEffect('guide', 'support', `${name}은 길을 찾는 대신 다음 사람이 돌아올 표식을 남겼다.`, 0.62, 0.92),
          },
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  if (previousChoice === 'waystone-follow-home') {
    return buildEvent(
      source,
      day,
      createdAt,
      'guide_waystone',
      step,
      '빈집에 남은 발자국',
      `${name}이 표식을 따라 도착한 빈집 안에는 젖은 신발 자국과 아직 식지 않은 재가 있었다.`,
      '발자국을 따라 더 들어갈 것인가, 돌아오는 길에 구조 신호를 남길 것인가?',
      [
        makeChoice(
          'waystone-open-path',
          '길을 끝까지 연다',
          '발자국의 주인이 돌아올 수 있도록 장애물을 치우고, 원정로의 새 우회로를 표시한다.',
          {
            agentTrustDelta: { guide: 6 },
            agentFatigueDelta: { guide: 6 },
            heroMoraleDelta: 3,
            realmThreatDelta: { [targetRealmId(source)]: -0.03 },
            factionTrustDelta: { village: 0.1 },
            factionInfluenceDelta: { village: 0.05 },
            factionTensionDelta: { village: -0.06 },
            agentMemory: memoryEffect('guide', 'success', `${name}은 빈집에서 시작한 길을 끝까지 열어 귀환할 곳을 만들었다.`, 0.76, 0.96),
          },
        ),
        makeChoice(
          'waystone-wait',
          '신호를 남기고 기다린다',
          '불을 피우고 물을 남긴 뒤, 더 깊이 들어가지 않고 누군가 돌아올 시간을 준다.',
          {
            agentTrustDelta: { guide: 3 },
            agentFatigueDelta: { guide: 1 },
            heroPurposeDelta: 4,
            factionTrustDelta: { village: 0.07 },
            factionTensionDelta: { village: -0.03 },
            agentMemory: memoryEffect('guide', 'support', `${name}은 더 깊이 들어가기보다 돌아올 사람을 위한 신호를 남겼다.`, 0.48, 0.88),
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
    'guide_waystone',
    step,
    '바르게 선 이정표',
    `${name}이 길을 바로잡은 뒤, 이정표 아래에는 마을로 돌아온 사람들의 작은 매듭이 하나씩 늘었다.`,
    '안전한 길을 마을의 규칙으로 만들 것인가, 다음 길잡이의 감각에 맡길 것인가?',
    [
      makeChoice(
        'waystone-call-village',
        '마을의 길로 삼는다',
        '새 표식을 지도와 기록관에 옮겨 적고, 누구나 확인할 수 있는 귀환 경로로 만든다.',
        {
          agentTrustDelta: { guide: 5 },
          heroMoraleDelta: 3,
          prosperityDelta: 2,
          factionTrustDelta: { village: 0.1 },
          factionInfluenceDelta: { village: 0.05 },
          factionTensionDelta: { village: -0.05 },
          agentMemory: memoryEffect('guide', 'success', `${name}은 혼자 아는 감각을 마을 모두의 귀환 경로로 바꾸었다.`, 0.72, 0.94),
        },
      ),
      makeChoice(
        'waystone-let-go',
        '다음 감각에 맡긴다',
        '표식은 남기되 길을 고정하지 않고, 다음 길잡이가 새 계절의 변화를 다시 읽게 한다.',
        {
          agentTrustDelta: { guide: 2 },
          agentFatigueDelta: { guide: -3 },
          heroPurposeDelta: 4,
          factionTrustDelta: { village: 0.05 },
          factionInfluenceDelta: { village: 0.03 },
          factionTensionDelta: { village: 0.02 },
          agentMemory: memoryEffect('guide', 'observation', `${name}은 길을 고정하지 않고 다음 계절의 변화를 읽을 여지를 남겼다.`, 0.32, 0.86),
        },
      ),
    ],
    chainId,
    parentEventId,
  );
}

export function createVillageLifeArcEvent(
  source: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  kind: VillageLifeArcKind,
  step = 0,
  chainId?: string,
  parentEventId?: string,
): VillageWorldEvent | null {
  if (!isVillageLifeArcKind(kind)
    || !Number.isSafeInteger(day)
    || !Number.isSafeInteger(createdAt)
    || !Number.isSafeInteger(step)
    || step < 0
    || step > VILLAGE_LIFE_ARC_FINAL_STEP) return null;
  const resolvedChainId = chainId ?? `world-life-${kind}-${day}`;
  const chain = getVillageAIState(source).world.chains?.find((candidate) => candidate.id === resolvedChainId);
  const previousChoice = previousChoiceId(source, chain);
  if (kind === 'blacksmith_apprentice') {
    return blacksmithApprenticeEvent(source, day, createdAt, step, resolvedChainId, parentEventId, previousChoice);
  }
  if (kind === 'mudang_memorial') {
    return mudangMemorialEvent(source, day, createdAt, step, resolvedChainId, parentEventId, previousChoice);
  }
  return guideWaystoneEvent(source, day, createdAt, step, resolvedChainId, parentEventId, previousChoice);
}

export function isVillageLifeArcKind(value: unknown): value is VillageLifeArcKind {
  return typeof value === 'string' && VILLAGE_LIFE_ARC_KINDS.includes(value as VillageLifeArcKind);
}

export function getVillageLifeArcLabel(kind: VillageWorldEvent['chainKind']): string | null {
  return isVillageLifeArcKind(kind) ? VILLAGE_LIFE_ARC_DEFINITIONS[kind].labelKR : null;
}

export function getVillageLifeArcAgent(kind: VillageLifeArcKind): SupportAgentId {
  return VILLAGE_LIFE_ARC_DEFINITIONS[kind].agentId;
}

export function getVillageLifeArcFactionLabel(kind: VillageLifeArcKind): string {
  return FACTION_LABELS[VILLAGE_LIFE_ARC_DEFINITIONS[kind].factionId];
}
