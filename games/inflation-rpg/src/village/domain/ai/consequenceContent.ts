import type {
  RealmId,
  VillageConsequenceEchoKind,
  VillageFactionId,
  VillageSaveEnvelope,
  VillageWorldEvent,
  VillageWorldEventChoice,
  VillageWorldEventEffects,
  VillageWorldEventType,
} from '../../types';
import { VILLAGE_CONSEQUENCE_ECHO_KINDS } from '../../types';
import {
  getVillageConsequenceAxisLabel,
  getVillageConsequenceIntensity,
  getVillageConsequenceLevelLabel,
  getVillageConsequencePressure,
  getVillageConsequenceProfile,
  type VillageConsequenceAxis,
} from './consequence';
import {
  deterministicUnit,
  getVillageAIState,
  getVillageSimulationState,
  Village_WORLD_DAY_MS,
} from './state';

export const VILLAGE_CONSEQUENCE_ECHO_FINAL_STEP = 0;

export interface VillageConsequenceEchoDefinition {
  kind: VillageConsequenceEchoKind;
  axis: VillageConsequenceAxis;
  factionId: VillageFactionId;
  eventType: VillageWorldEventType;
  labelKR: string;
}

export const VILLAGE_CONSEQUENCE_ECHO_DEFINITIONS: Record<VillageConsequenceEchoKind, VillageConsequenceEchoDefinition> = {
  supply_aftershock: {
    kind: 'supply_aftershock',
    axis: 'supply',
    factionId: 'merchants',
    eventType: 'supply',
    labelKR: '공급망 후폭풍',
  },
  cohesion_aftershock: {
    kind: 'cohesion_aftershock',
    axis: 'cohesion',
    factionId: 'village',
    eventType: 'social',
    labelKR: '공동체 후폭풍',
  },
  frontier_aftershock: {
    kind: 'frontier_aftershock',
    axis: 'frontier',
    factionId: 'spirits',
    eventType: 'omen',
    labelKR: '원정로 후폭풍',
  },
};

const ECHO_FIRST_DAY = 10;
const ECHO_CADENCE_DAYS = 7;
const ECHO_WINDOW_DAYS = 3;
const ECHO_MIN_PRESSURE = 0.43;

function makeChoice(
  id: string,
  title: string,
  text: string,
  effects: VillageWorldEventEffects,
): VillageWorldEventChoice {
  return { id, title, text, effects };
}

function targetRealmId(save: VillageSaveEnvelope): RealmId {
  if (save.meta.unlockedRealms.includes('underworld')) return 'underworld';
  if (save.meta.unlockedRealms.includes('deep_forest')) return 'deep_forest';
  return 'sacred_fields';
}

export function isVillageConsequenceEchoKind(value: unknown): value is VillageConsequenceEchoKind {
  return VILLAGE_CONSEQUENCE_ECHO_KINDS.includes(value as VillageConsequenceEchoKind);
}

function hasActiveEcho(source: VillageSaveEnvelope, kind: VillageConsequenceEchoKind): boolean {
  const ai = getVillageAIState(source);
  return ai.pendingEvents.some((event) => event.chainKind === kind)
    || (ai.world.chains ?? []).some((chain) => chain.kind === kind);
}

function resolvedEchoStarts(source: VillageSaveEnvelope): Array<{ kind: VillageConsequenceEchoKind; day: number }> {
  return getVillageSimulationState(source).eventHistory
    .filter((record) => isVillageConsequenceEchoKind(record.chainKind) && record.chainStep === 0)
    .flatMap((record) => {
      const kind = record.chainKind;
      return isVillageConsequenceEchoKind(kind) ? [{ kind, day: record.day }] : [];
    });
}

/**
 * Selects a delayed consequence echo after a real event has been resolved.
 * Coverage is bounded and only uses an opportunity after active/due chains
 * have been considered, so it never overlaps an existing chain or pending echo.
 */
export function selectVillageConsequenceEchoKind(
  source: VillageSaveEnvelope,
  day: number,
): VillageConsequenceEchoKind | null {
  if (!Number.isSafeInteger(day) || day < ECHO_FIRST_DAY) return null;
  const profile = getVillageConsequenceProfile(source);
  if (profile.sourceEventIds.length === 0) return null;
  const starts = resolvedEchoStarts(source);
  const available = VILLAGE_CONSEQUENCE_ECHO_KINDS.filter((kind) => !hasActiveEcho(source, kind));
  if (available.length === 0) return null;
  const lastStart = starts.length > 0 ? Math.max(...starts.map((entry) => entry.day)) : null;
  const scheduledStart = lastStart === null ? ECHO_FIRST_DAY : lastStart + ECHO_CADENCE_DAYS;
  const scheduled = day >= scheduledStart && day < scheduledStart + ECHO_WINDOW_DAYS;
  const needsCoverage = starts.length < VILLAGE_CONSEQUENCE_ECHO_KINDS.length;
  if (!scheduled && !needsCoverage) return null;
  if (lastStart !== null && day < lastStart + 4) return null;

  const pressureForKind = (kind: VillageConsequenceEchoKind): number => (
    getVillageConsequencePressure(profile, VILLAGE_CONSEQUENCE_ECHO_DEFINITIONS[kind].axis)
  );
  const eligible = available.filter((kind) => pressureForKind(kind) >= ECHO_MIN_PRESSURE);
  if (eligible.length === 0) return null;

  const startedKinds = new Set(starts.map((entry) => entry.kind));
  const preferred = VILLAGE_CONSEQUENCE_ECHO_KINDS[
    (Math.abs(Math.floor(getVillageAIState(source).seed)) + starts.length) % VILLAGE_CONSEQUENCE_ECHO_KINDS.length
  ];
  if (needsCoverage && eligible.includes(preferred) && !startedKinds.has(preferred)) return preferred;
  return [...eligible].sort((left, right) => {
    const leftScore = pressureForKind(left) + deterministicUnit(`${getVillageAIState(source).seed}:echo:${day}:${left}`) * 0.04;
    const rightScore = pressureForKind(right) + deterministicUnit(`${getVillageAIState(source).seed}:echo:${day}:${right}`) * 0.04;
    if (leftScore !== rightScore) return rightScore - leftScore;
    return left < right ? -1 : left > right ? 1 : 0;
  })[0] ?? null;
}

function buildSupplyEcho(
  save: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  kind: VillageConsequenceEchoKind,
  parentEventId: string | undefined,
): VillageWorldEvent {
  const profile = getVillageConsequenceProfile(save);
  const pressure = Math.round(profile.supplyPressure * 100);
  const level = getVillageConsequenceLevelLabel(profile.dominantLevel);
  return {
    id: `world-event-${day}-echo-${kind}`,
    type: 'supply',
    day,
    createdAt,
    expiresAt: createdAt + Village_WORLD_DAY_MS * 2,
    title: '장터의 저울이 지난 선택을 기억했다',
    cause: `상단의 신뢰와 마을의 번영에 남은 ${pressure}% 공급망 압력이 ${level} 단계의 후폭풍으로 돌아왔다.`,
    prompt: '공동 장부로 다음 거래의 기반을 만들 것인가, 당장의 이익을 지켜 볼 것인가?',
    choices: [
      makeChoice(
        'echo-supply-open-ledger',
        '공동 장부를 연다',
        '담철과 상단이 같은 기록을 쓰며 다음 물자의 책임을 함께 나눈다.',
        {
          currencyDelta: { materials: 1 },
          prosperityDelta: 4,
          agentTrustDelta: { blacksmith: 3, mudang: 1 },
          factionTrustDelta: { merchants: 0.08, village: 0.04 },
          factionInfluenceDelta: { merchants: 0.03, village: 0.02 },
          factionTensionDelta: { merchants: -0.06, village: -0.03 },
          agentMemory: {
            blacksmith: { tag: 'success', summary: '공동 장부를 열어 물자의 책임을 함께 나눴다.', valence: 0.45, salience: 0.65 },
            mudang: { tag: 'support', summary: '상단과 마을의 약속이 다시 이어지는 것을 지켜봤다.', valence: 0.3, salience: 0.58 },
          },
        },
      ),
      makeChoice(
        'echo-supply-protect-profit',
        '당장의 이익을 지킨다',
        '이번에는 금화를 먼저 챙기고, 다음 물자의 책임은 각자의 몫으로 남긴다.',
        {
          currencyDelta: { gold: 20 },
          prosperityDelta: -2,
          heroPurposeDelta: 2,
          factionTrustDelta: { merchants: 0.05, village: -0.06 },
          factionInfluenceDelta: { merchants: 0.04 },
          factionTensionDelta: { merchants: 0.01, village: 0.06 },
          agentMemory: {
            blacksmith: { tag: 'conflict', summary: '당장의 이익을 택해 공동 장부를 미뤘다.', valence: -0.3, salience: 0.62 },
            guide: { tag: 'observation', summary: '물자의 책임이 다시 각자의 계산으로 갈라졌다.', valence: -0.25, salience: 0.55 },
          },
        },
      ),
    ],
    chainId: `world-chain-${kind}-${day}`,
    chainKind: kind,
    chainStep: 0,
    factionId: 'merchants',
    ...(parentEventId ? { parentEventId } : {}),
  };
}

function buildCohesionEcho(
  save: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  kind: VillageConsequenceEchoKind,
  parentEventId: string | undefined,
): VillageWorldEvent {
  const profile = getVillageConsequenceProfile(save);
  const pressure = Math.round(profile.cohesionPressure * 100);
  return {
    id: `world-event-${day}-echo-${kind}`,
    type: 'social',
    day,
    createdAt,
    expiresAt: createdAt + Village_WORLD_DAY_MS * 2,
    title: '마을의 말들이 늦게 한자리에 모였다',
    cause: `동료 관계와 주민 신뢰에 남은 ${pressure}% 공동체 압력이 뒤늦은 대화의 자리를 만들었다.`,
    prompt: '서로의 몫을 다시 확인할 것인가, 각자의 판단을 지킬 것인가?',
    choices: [
      makeChoice(
        'echo-cohesion-circle',
        '함께 둘러앉는다',
        '세 사람이 각자의 판단을 설명하고, 다음 일의 몫을 다시 나눈다.',
        {
          agentTrustDelta: { blacksmith: 2, mudang: 3, guide: 3 },
          heroMoraleDelta: 3,
          factionTrustDelta: { village: 0.08, spirits: 0.02 },
          factionInfluenceDelta: { village: 0.03 },
          factionTensionDelta: { village: -0.07, spirits: -0.02 },
          agentRelationshipDelta: [
            { leftAgentId: 'blacksmith', rightAgentId: 'mudang', delta: 0.08 },
            { leftAgentId: 'blacksmith', rightAgentId: 'guide', delta: 0.08 },
            { leftAgentId: 'mudang', rightAgentId: 'guide', delta: 0.08 },
          ],
          agentMemory: {
            blacksmith: { tag: 'support', summary: '세 사람이 같은 자리에서 다음 몫을 다시 정했다.', valence: 0.45, salience: 0.68 },
            mudang: { tag: 'support', summary: '말하지 못한 마음을 함께 듣는 자리를 지켰다.', valence: 0.5, salience: 0.68 },
            guide: { tag: 'support', summary: '서로의 경계를 확인한 뒤 다음 길을 맡았다.', valence: 0.42, salience: 0.68 },
          },
        },
      ),
      makeChoice(
        'echo-cohesion-boundary',
        '각자의 경계를 지킨다',
        '지금은 설명보다 일을 끝내기로 하고, 어긋난 감정은 기록으로 남긴다.',
        {
          agentTrustDelta: { blacksmith: 1, guide: -2 },
          agentFatigueDelta: { guide: 5 },
          heroPurposeDelta: 3,
          factionTrustDelta: { village: -0.04 },
          factionInfluenceDelta: { village: 0.04 },
          factionTensionDelta: { village: 0.07 },
          agentRelationshipDelta: [
            { leftAgentId: 'blacksmith', rightAgentId: 'mudang', delta: -0.04 },
            { leftAgentId: 'blacksmith', rightAgentId: 'guide', delta: -0.06 },
            { leftAgentId: 'mudang', rightAgentId: 'guide', delta: -0.04 },
          ],
          agentMemory: {
            blacksmith: { tag: 'conflict', summary: '각자의 경계를 지키느라 대화를 다음으로 미뤘다.', valence: -0.3, salience: 0.62 },
            guide: { tag: 'conflict', summary: '설명하지 못한 판단이 동료의 피로로 남았다.', valence: -0.38, salience: 0.7 },
          },
        },
      ),
    ],
    chainId: `world-chain-${kind}-${day}`,
    chainKind: kind,
    chainStep: 0,
    factionId: 'village',
    ...(parentEventId ? { parentEventId } : {}),
  };
}

function buildFrontierEcho(
  save: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  kind: VillageConsequenceEchoKind,
  parentEventId: string | undefined,
): VillageWorldEvent {
  const profile = getVillageConsequenceProfile(save);
  const pressure = Math.round(profile.frontierPressure * 100);
  const realmId = targetRealmId(save);
  const realmLabel = realmId === 'underworld' ? '저승' : realmId === 'deep_forest' ? '깊은 숲' : '신목 들판';
  return {
    id: `world-event-${day}-echo-${kind}`,
    type: 'omen',
    day,
    createdAt,
    expiresAt: createdAt + Village_WORLD_DAY_MS * 2,
    title: `${realmLabel}의 봉화가 지난 약속을 비췄다`,
    cause: `${realmLabel}의 위협과 정령의 긴장에 남은 ${pressure}% 원정로 압력이 다시 신호를 보냈다.`,
    prompt: '길을 정화해 안전을 되찾을 것인가, 징조를 따라 더 깊이 들어갈 것인가?',
    choices: [
      makeChoice(
        'echo-frontier-ward',
        '길을 정화한다',
        '월령이 남은 불안을 정리하고, 솔바람은 위험한 우회로를 닫는다.',
        {
          currencyDelta: { rift: 1 },
          agentTrustDelta: { mudang: 4, guide: 2 },
          heroMoraleDelta: 2,
          realmThreatDelta: { [realmId]: -0.04 },
          factionTrustDelta: { spirits: 0.08, village: 0.02 },
          factionInfluenceDelta: { spirits: 0.03 },
          factionTensionDelta: { spirits: -0.07, village: -0.02 },
          agentMemory: {
            mudang: { tag: 'success', summary: `${realmLabel}으로 이어지는 길의 불안을 정화했다.`, valence: 0.45, salience: 0.68 },
            guide: { tag: 'support', summary: '위험한 우회로를 닫고 안전한 경로를 남겼다.', valence: 0.35, salience: 0.6 },
          },
        },
      ),
      makeChoice(
        'echo-frontier-follow',
        '징조를 따라간다',
        '불안이 가리키는 틈을 닫지 않고, 영웅의 다음 원정이 답을 찾도록 맡긴다.',
        {
          agentTrustDelta: { guide: 2, mudang: -2 },
          heroFatigueDelta: 5,
          heroPurposeDelta: 4,
          realmThreatDelta: { [realmId]: 0.06 },
          factionTrustDelta: { spirits: -0.05, village: 0.02 },
          factionInfluenceDelta: { spirits: 0.04 },
          factionTensionDelta: { spirits: 0.08, village: 0.03 },
          agentMemory: {
            mudang: { tag: 'conflict', summary: '정화하지 않은 징조를 원정로에 남겼다.', valence: -0.35, salience: 0.68 },
            guide: { tag: 'choice', summary: '불안한 틈을 다음 원정의 경로로 남겼다.', valence: 0.18, salience: 0.62 },
          },
        },
      ),
    ],
    chainId: `world-chain-${kind}-${day}`,
    chainKind: kind,
    chainStep: 0,
    factionId: 'spirits',
    ...(parentEventId ? { parentEventId } : {}),
  };
}

export function createVillageConsequenceEchoEvent(
  source: VillageSaveEnvelope,
  day: number,
  createdAt: number,
  kind: VillageConsequenceEchoKind,
  parentEventId?: string,
): VillageWorldEvent | null {
  if (!Number.isSafeInteger(day) || day < ECHO_FIRST_DAY || !Number.isSafeInteger(createdAt)) return null;
  if (!VILLAGE_CONSEQUENCE_ECHO_KINDS.includes(kind)) return null;
  const resolvedParentEventId = parentEventId ?? getVillageConsequenceProfile(source).sourceEventIds[0];
  if (kind === 'supply_aftershock') return buildSupplyEcho(source, day, createdAt, kind, resolvedParentEventId);
  if (kind === 'cohesion_aftershock') return buildCohesionEcho(source, day, createdAt, kind, resolvedParentEventId);
  return buildFrontierEcho(source, day, createdAt, kind, resolvedParentEventId);
}

export function getVillageConsequenceEchoLabel(kind: VillageConsequenceEchoKind): string {
  return VILLAGE_CONSEQUENCE_ECHO_DEFINITIONS[kind].labelKR;
}

export function getVillageConsequenceEchoFactionLabel(kind: VillageConsequenceEchoKind): string {
  const factionId = VILLAGE_CONSEQUENCE_ECHO_DEFINITIONS[kind].factionId;
  return factionId === 'merchants' ? '상단' : factionId === 'spirits' ? '정령' : '마을';
}

export function getVillageConsequenceEchoAxisLabel(kind: VillageConsequenceEchoKind): string {
  return getVillageConsequenceAxisLabel(VILLAGE_CONSEQUENCE_ECHO_DEFINITIONS[kind].axis);
}
