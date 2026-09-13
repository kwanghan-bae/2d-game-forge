import { getVillageRealmDefinition } from '../../data';
import type {
  RealmId,
  SupportAgentId,
  VillageContentArcKind,
  VillageFactionId,
  VillageSaveEnvelope,
  VillageWorldChainKind,
  VillageWorldChainState,
  VillageWorldEvent,
  VillageWorldEventChoice,
  VillageWorldEventEffects,
  VillageWorldEventType,
} from '../../types';
import { VILLAGE_CONTENT_ARC_KINDS, Village_MAX_WORLD_CHAIN_STEP } from '../../types';
import {
  deterministicUnit,
  getVillageAIState,
  getVillageSimulationState,
  Village_WORLD_DAY_MS,
} from './state';

export interface VillageContentArcDefinition {
  kind: VillageContentArcKind;
  factionId: VillageFactionId;
  eventType: VillageWorldEventType;
  labelKR: string;
}

export const VILLAGE_CONTENT_ARC_DEFINITIONS: Record<VillageContentArcKind, VillageContentArcDefinition> = {
  village_refuge: {
    kind: 'village_refuge',
    factionId: 'village',
    eventType: 'social',
    labelKR: '마을 피난 행렬',
  },
  merchant_ledger: {
    kind: 'merchant_ledger',
    factionId: 'merchants',
    eventType: 'supply',
    labelKR: '상단의 붉은 장부',
  },
  spirit_embers: {
    kind: 'spirit_embers',
    factionId: 'spirits',
    eventType: 'omen',
    labelKR: '푸른 불씨의 귀환',
  },
};

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

const ARC_CADENCE_START_DAY = 7;
const ARC_CADENCE_DAYS = 6;

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function safeInteger(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : fallback;
}

function targetRealmId(save: VillageSaveEnvelope): RealmId {
  if (save.meta.unlockedRealms.includes('underworld')) return 'underworld';
  if (save.meta.unlockedRealms.includes('deep_forest')) return 'deep_forest';
  return 'sacred_fields';
}

function targetRealmName(save: VillageSaveEnvelope): string {
  return getVillageRealmDefinition(targetRealmId(save))?.nameKR ?? '원정로';
}

function makeChoice(
  id: string,
  title: string,
  text: string,
  effects: VillageWorldEventEffects,
): VillageWorldEventChoice {
  return { id, title, text, effects };
}

function buildEvent(
  save: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  kind: VillageContentArcKind,
  step: number,
  title: string,
  cause: string,
  prompt: string,
  choices: VillageWorldEventChoice[],
  chainId?: string,
  parentEventId?: string,
): VillageWorldEvent {
  void save;
  const definition = VILLAGE_CONTENT_ARC_DEFINITIONS[kind];
  const resolvedChainId = chainId ?? `world-chain-${kind}-${day}`;
  const eventId = step === 0
    ? `world-event-${day}-arc-${kind}`
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

function previousChoiceId(save: VillageSaveEnvelope, chain: VillageWorldChainState | undefined): string | null {
  if (!chain) return null;
  return getVillageSimulationState(save).eventHistory.find((record) => record.eventId === chain.lastEventId)?.choiceId ?? null;
}

function hasActiveContentArc(save: VillageSaveEnvelope, kind: VillageContentArcKind): boolean {
  const ai = getVillageAIState(save);
  return (ai.world.chains ?? []).some((chain) => chain.kind === kind)
    || ai.pendingEvents.some((event) => event.chainKind === kind && event.chainStep === 0);
}

function contentArcPressure(save: VillageSaveEnvelope, kind: VillageContentArcKind): number {
  const definition = VILLAGE_CONTENT_ARC_DEFINITIONS[kind];
  const faction = getVillageAIState(save).world.factions?.[definition.factionId];
  return safeNumber(faction?.tension, 0.5) * 0.6
    + (1 - safeNumber(faction?.trust, 0.5)) * 0.25
    + safeNumber(faction?.influence, 0.5) * 0.15;
}

/**
 * Selects a bounded, state-sensitive content arc without adding a second
 * random source to the world simulator. The cadence guarantees that a
 * normal 30-day run can encounter all three arcs, while faction pressure can
 * surface an arc between scheduled opportunities.
 */
export function selectVillageContentArcKind(
  source: VillageSaveEnvelope,
  day: number,
): VillageContentArcKind | null {
  if (!Number.isSafeInteger(day) || day < ARC_CADENCE_START_DAY) return null;
  const ai = getVillageAIState(source);
  const available = VILLAGE_CONTENT_ARC_KINDS.filter((kind) => !hasActiveContentArc(source, kind));
  if (available.length === 0) return null;

  const contentStarts = getVillageSimulationState(source).eventHistory
    .filter((record) => isVillageContentArcKind(record.chainKind) && record.chainStep === 0)
    .map((record) => record.day);
  const lastContentStart = contentStarts.length > 0 ? Math.max(...contentStarts) : null;
  const nextOpportunityStart = lastContentStart === null
    ? ARC_CADENCE_START_DAY
    : lastContentStart + ARC_CADENCE_DAYS;
  const scheduled = day >= nextOpportunityStart && day < nextOpportunityStart + ARC_CADENCE_DAYS;
  const highestPressure = Math.max(...available.map((kind) => contentArcPressure(source, kind)));
  const spontaneous = deterministicUnit(`${ai.seed}:content-pressure:${day}`);
  if (!scheduled && (highestPressure < 0.84 || spontaneous >= 0.18)) return null;

  const slot = Math.floor((nextOpportunityStart - ARC_CADENCE_START_DAY) / ARC_CADENCE_DAYS);
  const preferred = VILLAGE_CONTENT_ARC_KINDS[
    (Math.abs(Math.floor(ai.seed)) + slot) % VILLAGE_CONTENT_ARC_KINDS.length
  ];
  return [...available].sort((left, right) => {
    const leftScore = contentArcPressure(source, left) + (left === preferred ? 0.28 : 0)
      + deterministicUnit(`${ai.seed}:content-order:${day}:${left}`) * 0.04;
    const rightScore = contentArcPressure(source, right) + (right === preferred ? 0.28 : 0)
      + deterministicUnit(`${ai.seed}:content-order:${day}:${right}`) * 0.04;
    if (leftScore !== rightScore) return rightScore - leftScore;
    return left < right ? -1 : left > right ? 1 : 0;
  })[0] ?? null;
}

function villageRefugeEvent(
  save: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  step: number,
  chainId: string,
  parentEventId: string | undefined,
  previousChoice: string | null,
): VillageWorldEvent {
  const season = SEASON_LABELS[getVillageAIState(save).world.season] ?? '계절';
  if (step === 0) {
    return buildEvent(
      save,
      day,
      createdAt,
      'village_refuge',
      step,
      '장승 아래에 낯선 등불이 모였다',
      `${season} 저녁, ${targetRealmName(save)}에서 내려온 행렬이 마을 어귀에 멈춰 섰다.`,
      '마을의 문을 열어 함께 겨울을 넘길 것인가, 비축을 지키며 경계를 세울 것인가?',
      [
        makeChoice(
          'refuge-open-gate',
          '문을 연다',
          '행렬에게 우물과 불가를 나누어 주고, 마을의 이름을 먼저 건넨다.',
          {
            agentTrustDelta: { guide: 4, mudang: 2 },
            heroMoraleDelta: 3,
            heroPurposeDelta: 1,
            prosperityDelta: 4,
            factionTrustDelta: { village: 0.12, spirits: 0.02 },
            factionInfluenceDelta: { village: 0.05 },
            factionTensionDelta: { village: -0.08 },
          },
        ),
        makeChoice(
          'refuge-guard-stores',
          '비축을 지킨다',
          '문을 닫지는 않되 창고와 장비를 먼저 지키고 낯선 이의 사정을 살핀다.',
          {
            agentTrustDelta: { blacksmith: 2 },
            heroPurposeDelta: 3,
            prosperityDelta: -1,
            factionTrustDelta: { village: -0.04 },
            factionInfluenceDelta: { village: 0.02 },
            factionTensionDelta: { village: 0.08 },
          },
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  if (step === 1) {
    if (previousChoice === 'refuge-open-gate') {
      return buildEvent(
        save,
        day,
        createdAt,
        'village_refuge',
        step,
        '우물의 물이 먼저 줄었다',
        '문을 연 다음 날, 낯선 행렬보다 먼저 마을 우물의 수위가 눈에 띄게 낮아졌다.',
        '물을 함께 나누어 불안을 잠재울 것인가, 배급을 정해 마을의 질서를 지킬 것인가?',
        [
          makeChoice(
            'refuge-share-well',
            '우물을 함께 쓴다',
            '월령의 도움으로 물길을 다시 찾고, 행렬에게도 같은 몫을 약속한다.',
            {
              agentTrustDelta: { mudang: 4, guide: 2 },
              heroMoraleDelta: 2,
              realmThreatDelta: { sacred_fields: -0.02 },
              factionTrustDelta: { village: 0.08, spirits: 0.04 },
              factionInfluenceDelta: { village: 0.03 },
              factionTensionDelta: { village: -0.06, spirits: -0.03 },
            },
          ),
          makeChoice(
            'refuge-ration-well',
            '물을 배급한다',
            '솔바람이 표시한 순서대로 물을 나누고, 부족함을 숨기지 않는다.',
            {
              agentTrustDelta: { guide: -2 },
              heroFatigueDelta: 3,
              heroPurposeDelta: 2,
              prosperityDelta: 1,
              factionTrustDelta: { village: 0.02 },
              factionTensionDelta: { village: 0.04 },
            },
          ),
        ],
        chainId,
        parentEventId,
      );
    }
    return buildEvent(
      save,
      day,
      createdAt,
      'village_refuge',
      step,
      '문밖에 남은 불씨',
      '경계를 세운 밤, 떠나지 못한 행렬이 장승 아래에 작은 불씨 하나를 남겼다.',
      '길잡이를 보내 사정을 확인할 것인가, 마을 안쪽의 문부터 단단히 잠글 것인가?',
      [
        makeChoice(
          'refuge-send-guide',
          '길잡이를 보낸다',
          '솔바람이 문밖의 사람들과 직접 이야기를 나누고 돌아올 길을 표시한다.',
          {
            agentTrustDelta: { guide: 4 },
            heroMoraleDelta: 2,
            realmThreatDelta: { sacred_fields: -0.03 },
            factionTrustDelta: { village: 0.05 },
            factionInfluenceDelta: { village: 0.03 },
            factionTensionDelta: { village: -0.04 },
          },
        ),
        makeChoice(
          'refuge-keep-gate',
          '문을 지킨다',
          '담철과 함께 경계를 세우고, 불씨가 어디서 왔는지 다음 날까지 기다린다.',
          {
            agentTrustDelta: { blacksmith: 2 },
            heroFatigueDelta: 3,
            heroPurposeDelta: 2,
            realmThreatDelta: { sacred_fields: 0.04 },
            factionInfluenceDelta: { village: 0.04 },
            factionTensionDelta: { village: 0.06 },
          },
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  const communityChoice = previousChoice === 'refuge-share-well' || previousChoice === 'refuge-send-guide';
  return buildEvent(
    save,
    day,
    createdAt,
    'village_refuge',
    step,
    communityChoice ? '행렬이 마을 깃발을 세웠다' : '닫힌 문 앞에 봄비가 내렸다',
    communityChoice
      ? '서로의 몫을 확인한 사람들이 장승 곁에 작은 마을 깃발을 세웠다.'
      : '경계는 지켜졌지만, 문밖의 불씨와 마을의 침묵이 함께 길어졌다.',
    communityChoice
      ? '새로 온 사람들에게 마을의 이름을 맡길 것인가, 각자의 길로 돌려보낼 것인가?'
      : '늦게라도 문을 열 것인가, 이번에는 경계를 지킨 선택으로 남길 것인가?',
    communityChoice
      ? [
        makeChoice(
          'refuge-name-ward',
          '마을의 식구로 맞는다',
          '행렬에게 마을의 일을 맡기고 장승 아래에 새로운 이름을 새긴다.',
          {
            agentTrustDelta: { guide: 3 },
            heroMoraleDelta: 3,
            prosperityDelta: 3,
            realmThreatDelta: { sacred_fields: -0.02 },
            factionTrustDelta: { village: 0.1 },
            factionInfluenceDelta: { village: 0.04 },
            factionTensionDelta: { village: -0.06 },
          },
        ),
        makeChoice(
          'refuge-release-ward',
          '각자의 길을 보낸다',
          '월령이 불씨를 나누어 주고 행렬은 원정로 너머의 다른 마을로 향한다.',
          {
            agentTrustDelta: { mudang: 3 },
            heroMoraleDelta: 4,
            heroPurposeDelta: 2,
            factionTrustDelta: { spirits: 0.05, village: 0.04 },
            factionInfluenceDelta: { spirits: 0.03 },
            factionTensionDelta: { village: -0.03, spirits: -0.02 },
          },
        ),
      ]
      : [
        makeChoice(
          'refuge-open-late',
          '늦게 문을 연다',
          '하루 늦은 사과와 함께 문을 열고, 남은 불씨를 우물가에 옮긴다.',
          {
            agentTrustDelta: { guide: 2 },
            heroMoraleDelta: 2,
            factionTrustDelta: { village: 0.05 },
            factionTensionDelta: { village: -0.02 },
          },
        ),
        makeChoice(
          'refuge-hold-boundary',
          '경계를 선택으로 남긴다',
          '비축을 지킨 판단을 기록하고, 다음 행렬에는 다른 방식으로 답하기로 한다.',
          {
            agentTrustDelta: { blacksmith: 2 },
            heroPurposeDelta: 4,
            prosperityDelta: 2,
            factionInfluenceDelta: { village: 0.04 },
            factionTensionDelta: { village: 0.03 },
          },
        ),
      ],
    chainId,
    parentEventId,
  );
}

function merchantLedgerEvent(
  save: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  step: number,
  chainId: string,
  parentEventId: string | undefined,
  previousChoice: string | null,
): VillageWorldEvent {
  if (step === 0) {
    return buildEvent(
      save,
      day,
      createdAt,
      'merchant_ledger',
      step,
      '상단의 붉은 장부에서 하루가 사라졌다',
      '장터의 거래량은 늘었지만, 상단의 장부에는 마을을 거친 하루만 비어 있었다.',
      '장부를 함께 대조할 것인가, 수레의 흐름을 믿고 거래를 계속할 것인가?',
      [
        makeChoice(
          'ledger-audit',
          '장부를 대조한다',
          '담철이 거래 자국과 장비 수량을 맞춰 보며 사라진 하루를 찾는다.',
          {
            agentTrustDelta: { blacksmith: 5 },
            heroMoraleDelta: 2,
            prosperityDelta: 2,
            factionTrustDelta: { merchants: 0.1, village: 0.04 },
            factionInfluenceDelta: { merchants: 0.03 },
            factionTensionDelta: { merchants: -0.06 },
          },
        ),
        makeChoice(
          'ledger-trust-caravan',
          '수레를 믿는다',
          '솔바람의 경로를 따라 상단이 약속한 다음 물자를 먼저 받아들인다.',
          {
            agentTrustDelta: { guide: 3 },
            currencyDelta: { gold: 20 },
            heroPurposeDelta: 2,
            factionTrustDelta: { merchants: 0.06, village: -0.03 },
            factionInfluenceDelta: { merchants: 0.07 },
            factionTensionDelta: { merchants: -0.02, village: 0.03 },
          },
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  if (step === 1) {
    if (previousChoice === 'ledger-audit') {
      return buildEvent(
        save,
        day,
        createdAt,
        'merchant_ledger',
        step,
        '봉인 아래의 숫자',
        '장부의 붉은 봉인을 걷자, 누군가 일부러 지운 듯한 숫자와 금속 가루가 함께 드러났다.',
        '빠진 몫을 마을과 나눌 것인가, 증인을 세워 사실부터 굳힐 것인가?',
        [
          makeChoice(
            'ledger-return-share',
            '빠진 몫을 돌려준다',
            '상단에 돌아갈 몫을 인정하고, 마을의 다음 거래를 투명하게 열어 둔다.',
            {
              agentTrustDelta: { blacksmith: 4 },
              currencyDelta: { materials: 2 },
              heroMoraleDelta: 2,
              factionTrustDelta: { merchants: 0.09, village: 0.05 },
              factionInfluenceDelta: { merchants: 0.04, village: 0.02 },
              factionTensionDelta: { merchants: -0.06, village: -0.03 },
            },
          ),
          makeChoice(
            'ledger-call-witness',
            '증인을 부른다',
            '월령의 의식으로 장부의 거짓말과 사람의 실수를 분리해 확인한다.',
            {
              agentTrustDelta: { mudang: 3 },
              currencyDelta: { rift: 1 },
              heroPurposeDelta: 3,
              factionTrustDelta: { merchants: 0.03, village: 0.08 },
              factionInfluenceDelta: { village: 0.04, spirits: 0.02 },
              factionTensionDelta: { merchants: 0.03, village: -0.05 },
            },
          ),
        ],
        chainId,
        parentEventId,
      );
    }
    return buildEvent(
      save,
      day,
      createdAt,
      'merchant_ledger',
      step,
      '상단의 수레가 밤에 멈췄다',
      '거래를 믿고 난 뒤, 상단의 수레가 평소와 다른 길목에서 멈춰 서 있다는 소식이 왔다.',
      '길을 따라가 원인을 확인할 것인가, 마을에 신호를 보내 함께 대비할 것인가?',
      [
        makeChoice(
          'ledger-follow-route',
          '경로를 따라간다',
          '솔바람이 수레의 바퀴 자국을 따라가 물자가 멈춘 이유를 찾는다.',
          {
            agentTrustDelta: { guide: 4 },
            currencyDelta: { gold: 25 },
            realmThreatDelta: { deep_forest: -0.03 },
            factionTrustDelta: { merchants: 0.05 },
            factionInfluenceDelta: { merchants: 0.08 },
            factionTensionDelta: { merchants: -0.04 },
          },
        ),
        makeChoice(
          'ledger-signal-village',
          '마을에 신호를 보낸다',
          '월령의 등불과 마을의 종으로 상단과 주민이 함께 밤을 넘길 준비를 한다.',
          {
            agentTrustDelta: { guide: 2, mudang: 2 },
            heroMoraleDelta: 3,
            prosperityDelta: 3,
            factionTrustDelta: { village: 0.08, merchants: 0.04 },
            factionInfluenceDelta: { village: 0.04 },
            factionTensionDelta: { village: -0.04, merchants: -0.02 },
          },
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  const transparentChoice = previousChoice === 'ledger-return-share' || previousChoice === 'ledger-call-witness';
  return buildEvent(
    save,
    day,
    createdAt,
    'merchant_ledger',
    step,
    transparentChoice ? '장부의 빈칸에 마을 이름이 적혔다' : '새벽의 저울이 기울었다',
    transparentChoice
      ? '빠진 숫자를 함께 확인한 뒤, 붉은 장부의 빈칸은 마을의 이름을 적을 자리로 남았다.'
      : '수레와 신호가 제때 만났지만, 어느 쪽의 말이 먼저였는지는 아직 정해지지 않았다.',
    transparentChoice
      ? '앞으로의 거래를 공동 장부로 묶을 것인가, 진실을 봉인하고 각자의 몫을 지킬 것인가?'
      : '원정로를 다시 열어 이익을 넓힐 것인가, 이번에는 비용을 분명히 기록할 것인가?',
    transparentChoice
      ? [
        makeChoice(
          'ledger-sign-coop',
          '공동 장부를 만든다',
          '상단과 마을이 같은 장부를 쓰며 다음 원정의 물자를 함께 책임진다.',
          {
            agentTrustDelta: { blacksmith: 4 },
            currencyDelta: { materials: 3 },
            prosperityDelta: 4,
            factionTrustDelta: { merchants: 0.12, village: 0.08 },
            factionInfluenceDelta: { merchants: 0.05, village: 0.04 },
            factionTensionDelta: { merchants: -0.08, village: -0.05 },
          },
        ),
        makeChoice(
          'ledger-seal-truth',
          '진실을 봉인한다',
          '사람을 벌하지 않고 기록만 잠가 두며, 마을은 다음 선택을 위해 입을 다문다.',
          {
            agentTrustDelta: { mudang: 2 },
            currencyDelta: { rift: 1 },
            heroPurposeDelta: 3,
            factionTrustDelta: { merchants: -0.03, village: 0.06 },
            factionInfluenceDelta: { village: 0.03 },
            factionTensionDelta: { merchants: 0.05, village: 0.02 },
          },
        ),
      ]
      : [
        makeChoice(
          'ledger-open-route',
          '원정로를 다시 연다',
          '상단과 길잡이가 새 경로를 표시하고, 마을은 얻은 이익으로 다음 원정을 준비한다.',
          {
            agentTrustDelta: { guide: 3 },
            currencyDelta: { gold: 30 },
            prosperityDelta: 3,
            realmThreatDelta: { deep_forest: -0.04 },
            factionTrustDelta: { merchants: 0.08, village: 0.04 },
            factionInfluenceDelta: { merchants: 0.05 },
            factionTensionDelta: { merchants: -0.05, village: -0.02 },
          },
        ),
        makeChoice(
          'ledger-name-cost',
          '비용을 먼저 적는다',
          '이익보다 길의 값과 사람의 수고를 기록해 다음 거래의 기준으로 삼는다.',
          {
            agentTrustDelta: { blacksmith: 2 },
            heroMoraleDelta: -1,
            heroPurposeDelta: 4,
            prosperityDelta: 2,
            factionTrustDelta: { village: 0.08, merchants: -0.02 },
            factionInfluenceDelta: { village: 0.04 },
            factionTensionDelta: { merchants: 0.04 },
          },
        ),
      ],
    chainId,
    parentEventId,
  );
}

function spiritEmbersEvent(
  save: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  step: number,
  chainId: string,
  parentEventId: string | undefined,
  previousChoice: string | null,
): VillageWorldEvent {
  const realmId = targetRealmId(save);
  const realmName = targetRealmName(save);
  if (step === 0) {
    return buildEvent(
      save,
      day,
      createdAt,
      'spirit_embers',
      step,
      '푸른 불씨가 영웅의 이름을 불렀다',
      `무당집의 등불이 ${realmName} 쪽을 향해 세 번 흔들리고, 아직 꺼지지 않은 불씨 하나가 영웅의 이름을 불렀다.`,
      '월령에게 불씨의 뜻을 물을 것인가, 직접 들고 원정로의 반응을 살필 것인가?',
      [
        makeChoice(
          'embers-ask-mudang',
          '뜻을 묻는다',
          '월령이 불씨를 제단에 올리고, 오래된 약속의 첫 문장을 확인한다.',
          {
            agentTrustDelta: { mudang: 5 },
            currencyDelta: { rift: 1 },
            heroMoraleDelta: 4,
            realmThreatDelta: { [realmId]: -0.04 },
            factionTrustDelta: { spirits: 0.12, village: 0.02 },
            factionInfluenceDelta: { spirits: 0.05 },
            factionTensionDelta: { spirits: -0.08 },
          },
        ),
        makeChoice(
          'embers-carry-ember',
          '불씨를 들고 간다',
          '솔바람이 표시한 길을 따라 불씨가 반응하는 곳까지 직접 걸어간다.',
          {
            agentTrustDelta: { guide: 3 },
            heroPurposeDelta: 4,
            heroFatigueDelta: 3,
            realmThreatDelta: { [realmId]: 0.06 },
            factionTrustDelta: { spirits: 0.02, village: 0.04 },
            factionInfluenceDelta: { spirits: 0.02 },
            factionTensionDelta: { spirits: 0.09 },
          },
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  if (step === 1) {
    if (previousChoice === 'embers-ask-mudang') {
      return buildEvent(
        save,
        day,
        createdAt,
        'spirit_embers',
        step,
        '제단에 낯선 발자국이 남았다',
        '불씨의 뜻을 묻고 돌아온 아침, 제단 주변에 누구의 것도 아닌 발자국이 이어져 있었다.',
        '발자국이 가리키는 징조를 따라갈 것인가, 불씨를 제단 안에 지킬 것인가?',
        [
          makeChoice(
            'embers-follow-sign',
            '징조를 따른다',
            '월령이 발자국의 방향을 읽고, 불씨가 가리키는 옛 길을 연다.',
            {
              agentTrustDelta: { mudang: 4 },
              currencyDelta: { rift: 1 },
              realmThreatDelta: { [realmId]: -0.03 },
              factionTrustDelta: { spirits: 0.09 },
              factionInfluenceDelta: { spirits: 0.04 },
              factionTensionDelta: { spirits: -0.06 },
            },
          ),
          makeChoice(
            'embers-protect-flame',
            '제단을 지킨다',
            '불씨를 옮기지 않고 마을 사람들에게 징조를 숨기지 않은 채 함께 지켜본다.',
            {
              agentTrustDelta: { mudang: 2 },
              heroMoraleDelta: 3,
              realmThreatDelta: { [realmId]: -0.02 },
              factionTrustDelta: { village: 0.06, spirits: 0.04 },
              factionInfluenceDelta: { village: 0.03 },
              factionTensionDelta: { spirits: 0.02, village: -0.03 },
            },
          ),
        ],
        chainId,
        parentEventId,
      );
    }
    return buildEvent(
      save,
      day,
      createdAt,
      'spirit_embers',
      step,
      '불씨가 밤마다 방향을 바꾼다',
      `불씨를 들고 돌아온 뒤 ${realmName} 쪽 바람이 매일 달라져, 같은 길을 두 번 고를 수 없게 되었다.`,
      '길잡이의 감각을 믿을 것인가, 불씨를 혼자 봉인해 흔들림을 멈출 것인가?',
      [
        makeChoice(
          'embers-trust-guide',
          '길잡이를 믿는다',
          '솔바람이 불씨가 가리키는 방향을 매일 기록하며 안전한 우회로를 만든다.',
          {
            agentTrustDelta: { guide: 4 },
            heroPurposeDelta: 3,
            realmThreatDelta: { [realmId]: -0.03 },
            factionTrustDelta: { spirits: 0.06, village: 0.05 },
            factionInfluenceDelta: { village: 0.03 },
            factionTensionDelta: { spirits: -0.04 },
          },
        ),
        makeChoice(
          'embers-bind-alone',
          '혼자 봉인한다',
          '영웅이 불씨를 감싸고, 다른 사람에게 위험을 넘기지 않기로 한다.',
          {
            agentTrustDelta: { mudang: -3 },
            heroFatigueDelta: 4,
            heroPurposeDelta: 2,
            realmThreatDelta: { [realmId]: 0.05 },
            factionInfluenceDelta: { spirits: 0.04 },
            factionTensionDelta: { spirits: 0.08 },
          },
        ),
      ],
      chainId,
      parentEventId,
    );
  }

  const altarChoice = previousChoice === 'embers-follow-sign' || previousChoice === 'embers-protect-flame';
  return buildEvent(
    save,
    day,
    createdAt,
    'spirit_embers',
    step,
    altarChoice ? '불씨가 누구의 것인지 밝혀졌다' : '불씨가 길을 선택했다',
    altarChoice
      ? '발자국과 제단의 그림자가 겹치며, 불씨가 한 사람의 소유가 아니라 마을과 원정로의 약속임이 드러났다.'
      : '흔들리던 불씨가 밤하늘의 한 점을 가리키며, 다음 원정로의 방향을 정했다.',
    altarChoice
      ? '불씨를 원래의 제단으로 돌려보낼 것인가, 마을의 불로 나누어 간직할 것인가?'
      : '불씨가 가리킨 길을 새 경로로 기록할 것인가, 다시 땅속에 묻어둘 것인가?',
    altarChoice
      ? [
        makeChoice(
          'embers-return-altar',
          '제단으로 돌려보낸다',
          '월령이 불씨를 제단에 돌려놓고, 정령과 마을 사이의 약속을 다시 맺는다.',
          {
            agentTrustDelta: { mudang: 5 },
            currencyDelta: { rift: 2 },
            heroMoraleDelta: 3,
            realmThreatDelta: { [realmId]: -0.05 },
            factionTrustDelta: { spirits: 0.14, village: 0.03 },
            factionInfluenceDelta: { spirits: 0.06 },
            factionTensionDelta: { spirits: -0.1, village: -0.02 },
          },
        ),
        makeChoice(
          'embers-share-village',
          '마을의 불로 나눈다',
          '불씨를 여러 등불로 나누어 누구도 혼자 징조를 떠안지 않게 한다.',
          {
            agentTrustDelta: { guide: 3 },
            heroMoraleDelta: 4,
            realmThreatDelta: { [realmId]: -0.02 },
            factionTrustDelta: { spirits: 0.06, village: 0.1 },
            factionInfluenceDelta: { village: 0.04, spirits: 0.02 },
            factionTensionDelta: { spirits: -0.04, village: -0.05 },
          },
        ),
      ]
      : [
        makeChoice(
          'embers-mark-path',
          '길을 새겨 둔다',
          '솔바람이 불씨가 가리킨 경로를 기록해 다음 원정의 선택지로 남긴다.',
          {
            agentTrustDelta: { guide: 5 },
            currencyDelta: { materials: 2 },
            heroPurposeDelta: 3,
            realmThreatDelta: { [realmId]: -0.06 },
            factionTrustDelta: { spirits: 0.08, village: 0.06 },
            factionInfluenceDelta: { village: 0.03 },
            factionTensionDelta: { spirits: -0.06 },
          },
        ),
        makeChoice(
          'embers-bury-spark',
          '불씨를 묻는다',
          '월령이 불씨를 땅에 묻고, 더 큰 징조가 올 때까지 마을의 일상을 지킨다.',
          {
            agentTrustDelta: { mudang: 3 },
            currencyDelta: { rift: 1 },
            heroPurposeDelta: 3,
            realmThreatDelta: { [realmId]: 0.02 },
            factionTrustDelta: { spirits: -0.02, village: 0.08 },
            factionInfluenceDelta: { village: 0.04 },
            factionTensionDelta: { spirits: 0.04 },
          },
        ),
      ],
    chainId,
    parentEventId,
  );
}

/** Creates one act of a content arc. The previous choice is read from the journal. */
export function createVillageContentArcEvent(
  source: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  kind: VillageContentArcKind,
  step = 0,
  chainId?: string,
  parentEventId?: string,
): VillageWorldEvent | null {
  if (!VILLAGE_CONTENT_ARC_KINDS.includes(kind)
    || !Number.isSafeInteger(day)
    || !Number.isSafeInteger(createdAt)
    || !Number.isSafeInteger(step)
    || step < 0
    || step > Village_MAX_WORLD_CHAIN_STEP) return null;
  const resolvedChainId = chainId ?? `world-chain-${kind}-${day}`;
  const chain = getVillageAIState(source).world.chains?.find((candidate) => candidate.id === resolvedChainId);
  const previousChoice = previousChoiceId(source, chain);
  if (kind === 'village_refuge') {
    return villageRefugeEvent(source, day, createdAt, step, resolvedChainId, parentEventId, previousChoice);
  }
  if (kind === 'merchant_ledger') {
    return merchantLedgerEvent(source, day, createdAt, step, resolvedChainId, parentEventId, previousChoice);
  }
  return spiritEmbersEvent(source, day, createdAt, step, resolvedChainId, parentEventId, previousChoice);
}

export function isVillageContentArcKind(value: unknown): value is VillageContentArcKind {
  return typeof value === 'string' && VILLAGE_CONTENT_ARC_KINDS.includes(value as VillageContentArcKind);
}

export function getVillageContentArcLabel(kind: VillageWorldChainKind): string | null {
  return isVillageContentArcKind(kind)
    ? VILLAGE_CONTENT_ARC_DEFINITIONS[kind as VillageContentArcKind].labelKR
    : null;
}

export function getVillageContentArcAgent(kind: VillageContentArcKind): SupportAgentId {
  if (kind === 'village_refuge') return 'guide';
  if (kind === 'merchant_ledger') return 'blacksmith';
  return 'mudang';
}

export function getVillageContentArcFactionLabel(kind: VillageContentArcKind): string {
  return FACTION_LABELS[VILLAGE_CONTENT_ARC_DEFINITIONS[kind].factionId];
}
