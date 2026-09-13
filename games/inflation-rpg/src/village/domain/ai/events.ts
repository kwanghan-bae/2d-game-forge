import { getVillageRealmDefinition } from '../../data';
import type {
  RealmId,
  SupportAgentId,
  VillageSaveEnvelope,
  VillageWorldEvent,
  VillageWorldEventChoice,
  VillageWorldEventEffects,
} from '../../types';
import {
  Village_MAX_PENDING_WORLD_EVENTS,
  Village_MAX_RESOLVED_WORLD_EVENTS,
} from '../../types';
import {
  deterministicUnit,
  ensureVillageAIState,
  decayVillageAINeeds,
  getVillageAIState,
  getVillageSeason,
  getVillageWeather,
  getVillageWorldDay,
  recordVillageAIMemory,
  recordVillageSimulationEvent,
  ensureVillageSimulationState,
  VILLAGE_SUPPORT_AGENT_IDS,
  Village_WORLD_DAY_MS,
} from './state';
import {
  advanceVillageAgentScheduler,
  recordVillageAgentOutcome,
  recordVillageAgentRelationship,
} from './agents';
import { isActionClockValid, isValidCurrencyBalance } from '../shared/guards';
import { nextSaveId } from '../shared/ids';
import { cloneSave, touchSave } from '../shared/saveMutation';

export interface VillageWorldAdvanceResult {
  save: VillageSaveEnvelope;
  generatedEvents: VillageWorldEvent[];
}

export type WorldEventDomainResult =
  | { ok: true; save: VillageSaveEnvelope; event: VillageWorldEvent; choice: VillageWorldEventChoice }
  | { ok: false; save: VillageSaveEnvelope; error: string };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function eventCreatedAt(save: VillageSaveEnvelope, day: number): number | null {
  const durationMs = Village_WORLD_DAY_MS * 2;
  const requested = save.createdAt + day * Village_WORLD_DAY_MS;
  if (Number.isSafeInteger(requested) && requested <= Number.MAX_SAFE_INTEGER - durationMs) return requested;
  if (Number.isSafeInteger(save.updatedAt) && save.updatedAt <= Number.MAX_SAFE_INTEGER - durationMs) return save.updatedAt;
  return null;
}

function choice(
  id: string,
  title: string,
  text: string,
  effects: VillageWorldEventEffects,
): VillageWorldEventChoice {
  return { id, title, text, effects };
}

function createWeatherEvent(save: VillageSaveEnvelope, day: number, createdAt: number): VillageWorldEvent {
  const realmId: RealmId = save.meta.unlockedRealms.includes('deep_forest') ? 'deep_forest' : 'sacred_fields';
  const realm = getVillageRealmDefinition(realmId);
  return {
    id: `world-event-${day}-weather-${realmId}`,
    type: 'weather',
    day,
    createdAt,
    expiresAt: createdAt + Village_WORLD_DAY_MS * 2,
    title: '산길에 안개가 내려앉았다',
    cause: `${realm?.nameKR ?? '원정로'}의 기류가 바뀌어 시야가 짧아졌다.`,
    prompt: '길잡이의 경고를 믿고 속도를 늦출 것인가, 아니면 예정대로 나아갈 것인가?',
    choices: [
      choice(
        'heed-guide',
        '경고를 따른다',
        '솔바람의 판단을 믿고 안전한 길을 고른다.',
        { agentTrustDelta: { guide: 4 }, heroMoraleDelta: 2, heroFatigueDelta: -4, realmThreatDelta: { [realmId]: -0.04 } },
      ),
      choice(
        'press-forward',
        '예정대로 나아간다',
        '일정을 지키기 위해 안개 속으로 발걸음을 옮긴다.',
        { agentTrustDelta: { guide: -3 }, heroFatigueDelta: 8, realmThreatDelta: { [realmId]: 0.05 } },
      ),
    ],
  };
}

function createSocialEvent(save: VillageSaveEnvelope, day: number, createdAt: number): VillageWorldEvent {
  const guide = save.meta.agents.find((agent) => agent.id === 'guide');
  const fatigue = typeof guide?.fatigue === 'number' ? Math.floor(guide.fatigue) : 0;
  return {
    id: `world-event-${day}-social-guide`,
    type: 'social',
    day,
    createdAt,
    expiresAt: createdAt + Village_WORLD_DAY_MS * 2,
    title: '길잡이가 늦은 밤 돌아왔다',
    cause: fatigue >= 75
      ? '솔바람이 피로를 숨긴 채 마을의 경계선을 확인하고 돌아왔다.'
      : '솔바람이 평소보다 오래 길을 살피고 조용히 돌아왔다.',
    prompt: '오늘은 동료의 상태를 먼저 살필 것인가, 계획한 일정을 밀어붙일 것인가?',
    choices: [
      choice(
        'rest-together',
        '함께 쉰다',
        '원정 계획을 늦추고 솔바람이 숨을 돌릴 시간을 준다.',
        { agentTrustDelta: { guide: 5, mudang: 1 }, agentFatigueDelta: { guide: -20, mudang: -4 }, heroMoraleDelta: 3, heroPurposeDelta: 2 },
      ),
      choice(
        'keep-schedule',
        '일정을 지킨다',
        '마을의 기대를 저버리지 않기 위해 출발 준비를 계속한다.',
        { agentTrustDelta: { guide: -5, mudang: -1 }, agentFatigueDelta: { guide: 10, mudang: 3 }, heroFatigueDelta: 5, heroPurposeDelta: 4 },
      ),
    ],
  };
}

function createSupplyEvent(save: VillageSaveEnvelope, day: number, createdAt: number): VillageWorldEvent {
  const materials = safeNumber(save.meta.currencies.materials);
  return {
    id: `world-event-${day}-supply-market`,
    type: 'supply',
    day,
    createdAt,
    expiresAt: createdAt + Village_WORLD_DAY_MS * 2,
    title: '장터에 떠돌이 상인이 도착했다',
    cause: materials < 3
      ? '상인이 부족한 재료를 먼저 알아보고 물물교환을 제안했다.'
      : '상인이 원정 준비에 필요한 물품을 펼쳐 놓았다.',
    prompt: '당장의 준비물을 바꿀 것인가, 마을의 비축을 지킬 것인가?',
    choices: [
      choice(
        'trade-supplies',
        '물물교환한다',
        '재료 하나를 내어 금화와 마을의 활기를 얻는다.',
        { currencyDelta: { materials: -1, gold: 30 }, heroMoraleDelta: 2, prosperityDelta: 4 },
      ),
      choice(
        'protect-stores',
        '비축을 지킨다',
        '이번 거래를 거절하고 다음 기회를 기다린다.',
        { heroMoraleDelta: -1, heroPurposeDelta: 2, prosperityDelta: 1 },
      ),
    ],
  };
}

function createOmenEvent(save: VillageSaveEnvelope, day: number, createdAt: number): VillageWorldEvent {
  const targetRealm: RealmId = save.meta.unlockedRealms.includes('underworld') ? 'underworld' : 'sacred_fields';
  return {
    id: `world-event-${day}-omen-rite`,
    type: 'omen',
    day,
    createdAt,
    expiresAt: createdAt + Village_WORLD_DAY_MS * 2,
    title: '무당집의 등불이 푸르게 흔들렸다',
    cause: '월령이 아직 오지 않은 바람의 방향에서 이상한 징조를 읽었다.',
    prompt: '제례를 돕고 징조를 살필 것인가, 불확실한 시간을 아낄 것인가?',
    choices: [
      choice(
        'hold-rite',
        '제례를 돕는다',
        '작은 제례를 올려 원정로의 불안을 가라앉힌다.',
        { currencyDelta: { spirit: -5, rift: 1 }, agentTrustDelta: { mudang: 4 }, heroMoraleDelta: 4, realmThreatDelta: { [targetRealm]: -0.03 } },
      ),
      choice(
        'skip-rite',
        '시간을 아낀다',
        '징조를 뒤로하고 예정된 준비에 집중한다.',
        { agentTrustDelta: { mudang: -3 }, heroMoraleDelta: -4, heroPurposeDelta: 3, realmThreatDelta: { [targetRealm]: 0.03 } },
      ),
    ],
  };
}

function createWorldEvent(save: VillageSaveEnvelope, day: number): VillageWorldEvent | null {
  const ai = getVillageAIState(save);
  const guide = save.meta.agents.find((agent) => agent.id === 'guide');
  const fatigue = safeNumber(guide?.fatigue);
  const roll = deterministicUnit(`${ai.seed}:event:${day}`);
  const createdAt = eventCreatedAt(save, day);
  if (createdAt === null) return null;
  if (fatigue >= 75 || roll < 0.22) return createSocialEvent(save, day, createdAt);
  if (ai.world.weather === 'fog' || roll < 0.48) return createWeatherEvent(save, day, createdAt);
  if (safeNumber(save.meta.currencies.gold) < 40 || roll < 0.76) return createSupplyEvent(save, day, createdAt);
  return createOmenEvent(save, day, createdAt);
}

function hasResolvedEvent(save: VillageSaveEnvelope, eventId: string): boolean {
  return getVillageAIState(save).resolvedEventIds.includes(eventId);
}

function expirePendingWorldEvents(save: VillageSaveEnvelope, now: number): boolean {
  const ai = ensureVillageAIState(save);
  const expired = ai.pendingEvents.filter((event) => event.expiresAt <= now);
  if (expired.length === 0) return false;
  const observedAt = Number.isSafeInteger(now) && now >= save.createdAt ? now : save.updatedAt;
  ai.pendingEvents = ai.pendingEvents.filter((event) => event.expiresAt > now);
  ai.resolvedEventIds = [
    ...expired.map((event) => event.id),
    ...ai.resolvedEventIds.filter((id) => !expired.some((event) => event.id === id)),
  ].slice(0, Village_MAX_RESOLVED_WORLD_EVENTS);
  for (const event of expired) {
    recordVillageSimulationEvent(save, {
      eventId: event.id,
      type: event.type,
      day: event.day,
      choiceId: null,
      outcome: 'expired',
      resolvedAt: observedAt,
    });
    recordVillageAIMemory(
      save,
      'event',
      `${event.title}의 선택 기한을 놓쳤다.`,
      -0.25,
      0.45,
      observedAt,
    );
    save.meta.sagaEntries.unshift({
      id: nextSaveId(save, `saga-world-event-expired-${event.id}`),
      kind: 'milestone',
      createdAt: observedAt,
      title: `${event.title} — 기한 만료`,
      text: '선택하지 못한 사건도 마을의 기억에 남았다.',
    });
  }
  return true;
}

/** Advances the in-game calendar and queues at most three deterministic events. */
export function advanceVillageWorld(source: VillageSaveEnvelope, now: number): VillageWorldAdvanceResult {
  if (!Number.isFinite(now) || now < source.updatedAt) return { save: source, generatedEvents: [] };
  const sourceAI = getVillageAIState(source);
  const targetDay = getVillageWorldDay(source.createdAt, now);
  const hasExpiredEvents = sourceAI.pendingEvents.some((event) => event.expiresAt <= now);
  const needsAgentCognition = !sourceAI.agentBrains
    || VILLAGE_SUPPORT_AGENT_IDS.some((agentId) => !sourceAI.agentBrains?.[agentId]?.cognition);
  if (targetDay <= sourceAI.world.lastSimulatedDay && !hasExpiredEvents && !needsAgentCognition) {
    return { save: source, generatedEvents: [] };
  }

  const save = cloneSave(source);
  const ai = ensureVillageAIState(save);
  const generatedEvents: VillageWorldEvent[] = [];
  const expiredEvents = expirePendingWorldEvents(save, now);
  if (targetDay <= sourceAI.world.lastSimulatedDay) {
    if (!expiredEvents && !needsAgentCognition) return { save: source, generatedEvents: [] };
    advanceVillageAgentScheduler(save, targetDay);
    touchSave(save, now);
    return { save, generatedEvents };
  }
  decayVillageAINeeds(save, targetDay - sourceAI.world.lastSimulatedDay);
  const firstDay = Math.max(ai.world.lastSimulatedDay + 1, targetDay - 30);
  for (let day = firstDay; day <= targetDay; day += 1) {
    ai.world.day = day;
    ai.world.season = getVillageSeason(day);
    ai.world.weather = getVillageWeather(ai.seed, day);
    if (ai.pendingEvents.length >= Village_MAX_PENDING_WORLD_EVENTS) continue;
    const event = createWorldEvent(save, day);
    if (!event || event.expiresAt <= now) continue;
    if (ai.pendingEvents.some((candidate) => candidate.id === event.id) || hasResolvedEvent(save, event.id)) continue;
    ai.pendingEvents = [event, ...ai.pendingEvents].slice(0, Village_MAX_PENDING_WORLD_EVENTS);
    generatedEvents.push(event);
  }
  ai.world.day = targetDay;
  ai.world.season = getVillageSeason(targetDay);
  ai.world.weather = getVillageWeather(ai.seed, targetDay);
  ai.world.lastSimulatedDay = targetDay;
  advanceVillageAgentScheduler(save, targetDay);
  const simulation = ensureVillageSimulationState(save);
  simulation.tick = Math.max(simulation.tick, targetDay);
  simulation.lastSimulatedAt = Math.max(
    simulation.lastSimulatedAt,
    Number.isSafeInteger(now) ? now : save.updatedAt,
  );
  if (generatedEvents.length === 0 && ai.world.day === sourceAI.world.day && ai.world.weather === sourceAI.world.weather) {
    return { save: source, generatedEvents: [] };
  }
  touchSave(save, now);
  return { save, generatedEvents };
}

function applyCurrencyDelta(save: VillageSaveEnvelope, delta: Partial<Record<'spirit' | 'gold' | 'materials' | 'rift', number>>): boolean {
  for (const [key, amount] of Object.entries(delta)) {
    if (!isSafeInteger(amount)) return false;
    const current = save.meta.currencies[key as keyof typeof save.meta.currencies];
    if (!isValidCurrencyBalance(current)) return false;
    if (amount < 0 && current < Math.abs(amount)) return false;
    const next = current + amount;
    if (!Number.isSafeInteger(next) || next < 0) return false;
  }
  for (const [key, amount] of Object.entries(delta)) {
    const currency = key as keyof typeof save.meta.currencies;
    save.meta.currencies[currency] += amount ?? 0;
  }
  return true;
}

function applyAgentDelta(
  save: VillageSaveEnvelope,
  field: 'trust' | 'fatigue',
  delta: Partial<Record<SupportAgentId, number>> | undefined,
): boolean {
  if (!delta) return true;
  for (const [id, amount] of Object.entries(delta)) {
    if (!isSafeInteger(amount)) return false;
    const agent = save.meta.agents.find((candidate) => candidate.id === id);
    if (!agent) return false;
    const current = safeNumber(agent[field], Number.NaN);
    if (!Number.isFinite(current)) return false;
  }
  for (const [id, amount] of Object.entries(delta)) {
    const agent = save.meta.agents.find((candidate) => candidate.id === id);
    if (agent) agent[field] = clamp(safeNumber(agent[field]) + (amount ?? 0), 0, 100);
  }
  return true;
}

function applyWorldEventEffects(save: VillageSaveEnvelope, effects: VillageWorldEventEffects): boolean {
  if (!applyCurrencyDelta(save, effects.currencyDelta ?? {})) return false;
  if (!applyAgentDelta(save, 'trust', effects.agentTrustDelta)) return false;
  if (!applyAgentDelta(save, 'fatigue', effects.agentFatigueDelta)) return false;
  const ai = ensureVillageAIState(save);
  if (effects.heroMoraleDelta !== undefined) {
    if (!isSafeInteger(effects.heroMoraleDelta)) return false;
    ai.hero.needs.morale = clamp(ai.hero.needs.morale + effects.heroMoraleDelta, 0, 100);
  }
  if (effects.heroFatigueDelta !== undefined) {
    if (!isSafeInteger(effects.heroFatigueDelta)) return false;
    ai.hero.needs.fatigue = clamp(ai.hero.needs.fatigue + effects.heroFatigueDelta, 0, 100);
  }
  if (effects.heroPurposeDelta !== undefined) {
    if (!isSafeInteger(effects.heroPurposeDelta)) return false;
    ai.hero.needs.purpose = clamp(ai.hero.needs.purpose + effects.heroPurposeDelta, 0, 100);
  }
  if (effects.realmThreatDelta) {
    for (const [realmId, amount] of Object.entries(effects.realmThreatDelta)) {
      if (!isFiniteNumber(amount) || !getVillageRealmDefinition(realmId)) return false;
      ai.world.threatByRealm[realmId as RealmId] = clamp(
        ai.world.threatByRealm[realmId as RealmId] + amount,
        0,
        1,
      );
    }
  }
  if (effects.prosperityDelta !== undefined) {
    if (!isSafeInteger(effects.prosperityDelta)) return false;
    ai.world.prosperity = clamp(ai.world.prosperity + effects.prosperityDelta, 0, 100);
  }
  const trustEntries = Object.entries(effects.agentTrustDelta ?? {})
    .filter((entry): entry is [SupportAgentId, number] => (
      typeof entry[0] === 'string'
      && Number.isSafeInteger(entry[1])
      && save.meta.agents.some((agent) => agent.id === entry[0])
    ));
  for (const [agentId] of trustEntries) {
    recordVillageAgentOutcome(save, agentId, 'support', ai.world.lastSimulatedDay);
  }
  for (let index = 0; index < trustEntries.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < trustEntries.length; nextIndex += 1) {
      const [leftId, leftDelta] = trustEntries[index];
      const [rightId, rightDelta] = trustEntries[nextIndex];
      const alignment = Math.sign(leftDelta) * Math.sign(rightDelta);
      if (alignment !== 0) recordVillageAgentRelationship(save, leftId, rightId, alignment * 0.04);
    }
  }
  return true;
}

export function resolveVillageWorldEvent(
  source: VillageSaveEnvelope,
  eventId: string,
  choiceId: string,
  now: number,
): WorldEventDomainResult {
  if (!isActionClockValid(source, now)) return { ok: false, save: source, error: '사건을 처리할 시각을 확인할 수 없습니다.' };
  const sourceAI = getVillageAIState(source);
  const event = sourceAI.pendingEvents.find((candidate) => candidate.id === eventId);
  if (!event) return { ok: false, save: source, error: '처리할 세계 사건이 없습니다.' };
  const selected = event.choices.find((candidate) => candidate.id === choiceId);
  if (!selected) return { ok: false, save: source, error: '알 수 없는 사건 선택입니다.' };
  if (now > event.expiresAt) return { ok: false, save: source, error: '사건의 선택 기한이 지났습니다.' };

  const save = cloneSave(source);
  const ai = ensureVillageAIState(save);
  if (!applyWorldEventEffects(save, selected.effects)) {
    return { ok: false, save: source, error: '사건 결과를 적용할 자원 또는 상태를 확인할 수 없습니다.' };
  }
  ai.pendingEvents = ai.pendingEvents.filter((candidate) => candidate.id !== eventId);
  ai.resolvedEventIds = [eventId, ...ai.resolvedEventIds.filter((id) => id !== eventId)]
    .slice(0, Village_MAX_RESOLVED_WORLD_EVENTS);
  recordVillageSimulationEvent(save, {
    eventId: event.id,
    type: event.type,
    day: event.day,
    choiceId: selected.id,
    outcome: 'chosen',
    resolvedAt: now,
  });
  recordVillageAIMemory(
    save,
    'event',
    `${event.title}에서 '${selected.title}'을(를) 선택했다.`,
    selected.effects.heroMoraleDelta && selected.effects.heroMoraleDelta < 0 ? -0.4 : 0.35,
    0.75,
    Math.max(source.updatedAt, now),
  );
  save.meta.sagaEntries.unshift({
    id: nextSaveId(save, `saga-world-event-${event.id}`),
    kind: 'milestone',
    createdAt: Math.max(source.updatedAt, now),
    title: event.title,
    text: `${selected.text} 선택의 결과가 마을과 영웅의 기억에 남았다.`,
  });
  touchSave(save, now);
  return { ok: true, save, event, choice: selected };
}

export function getPendingVillageWorldEvents(source: VillageSaveEnvelope): VillageWorldEvent[] {
  return getVillageAIState(source).pendingEvents.map((event) => ({
    ...event,
    choices: event.choices.map((candidate) => ({ ...candidate, effects: { ...candidate.effects } })),
  }));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
