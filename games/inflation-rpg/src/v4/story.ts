import { getV4AgentDefinition, getV4RealmDefinition } from './data';
import { V4_MAX_SAGA_ENTRIES } from './types';
import type { RealmId, SagaEntry, StoryChoiceDefinition, StoryChoiceOptionId, SupportAgent, SupportAgentId, V4CurrencyKey, V4SaveEnvelope } from './types';

export type { StoryChoiceDefinition, StoryChoiceOptionId } from './types';

export type StoryDomainResult =
  | { ok: true; save: V4SaveEnvelope }
  | { ok: false; save: V4SaveEnvelope; error: string };

export const DEEP_FOREST_STORY_ID = 'saga-story-deep-forest-embers';
export const V4_EPILOGUE_ID = 'saga-epilogue-first-journey';

const DEEP_FOREST_CHOICE: StoryChoiceDefinition = {
  id: 'deep_forest_embers',
  title: '흑송 산군의 불씨',
  prompt: '산군이 내려놓은 푸른 불씨가 마을의 다음 운명을 묻는다. 불씨를 지킬 것인가, 묶여 있던 도깨비를 놓아줄 것인가?',
  options: [
    {
      id: 'protect_flame',
      title: '불씨를 지킨다',
      text: '월령의 축원으로 불씨를 봉인한다. 균열석을 얻고 무당 월령과의 신뢰가 깊어진다.',
    },
    {
      id: 'release_goblin',
      title: '도깨비를 놓아준다',
      text: '솔바람의 길을 따라 도깨비를 풀어준다. 재료를 얻고 길잡이 솔바람과의 신뢰가 깊어진다.',
    },
  ],
};

const REALM_INTROS: Record<RealmId, { title: string; text: (heroName: string) => string }> = {
  joseon_plains: {
    title: '첫 장: 장승 아래의 약속',
    text: (heroName) => `${heroName}은(는) 마을 어귀 장승에 새겨진 신탁을 따라 조선 평야로 나섰다. 떠돌이 도깨비가 훔쳐 간 곡식의 혼을 되찾아야 마을의 불씨가 꺼지지 않는다.`,
  },
  deep_forest: {
    title: '둘째 장: 산군의 푸른 불씨',
    text: (heroName) => `${heroName}은(는) 조선 평야의 장승이 가리킨 길을 따라 깊은 숲에 들었다. 산군이 품은 푸른 불씨에는 마을과 저승을 잇는 오래된 약속이 잠들어 있다.`,
  },
  underworld: {
    title: '셋째 장: 황천의 문',
    text: (heroName) => `숲의 불씨가 저승의 문을 밝혀 주었다. ${heroName}은(는) 망자의 행렬 사이에서 염라의 대리인을 만나, 살아 있는 마을의 이름을 증명해야 한다.`,
  },
};

const REALM_VICTORIES: Record<RealmId, { title: string; text: (heroName: string) => string }> = {
  joseon_plains: {
    title: '첫 승리: 장승이 기억한 이름',
    text: (heroName) => `${heroName}은(는) 장승 수문장을 넘어 도깨비가 훔친 곡식의 혼을 돌려놓았다. 장승은 영웅의 이름을 기억하고 깊은 숲으로 향하는 길을 열었다.`,
  },
  deep_forest: {
    title: '둘째 승리: 흑송 산군의 불씨',
    text: (heroName) => `${heroName}은(는) 흑송 산군의 시험을 이겨 내고 푸른 불씨 앞에 섰다. 이 불씨의 쓰임을 정하는 선택이 저승으로 가는 다음 장을 결정한다.`,
  },
  underworld: {
    title: '셋째 승리: 염라 앞의 귀환',
    text: (heroName) => `${heroName}은(는) 염라의 대리인 앞에서 마을과 맺은 약속을 증명했다. 저승의 문은 닫혔지만, 영웅과 마을의 사가는 끝나지 않았다.`,
  },
};

function safeNow(now: number): number {
  return Number.isFinite(now) && now >= 0 ? now : 0;
}

function storyEntry(id: string, kind: SagaEntry['kind'], createdAt: number, title: string, text: string): SagaEntry {
  return { id, kind, createdAt: safeNow(createdAt), title, text };
}

function cloneSave(save: V4SaveEnvelope): V4SaveEnvelope {
  return JSON.parse(JSON.stringify(save)) as V4SaveEnvelope;
}

function hasEntry(save: V4SaveEnvelope, id: string): boolean {
  return save.meta.sagaEntries.some((entry) => entry.id === id);
}

function addUniqueEntry(save: V4SaveEnvelope, entry: SagaEntry): void {
  if (hasEntry(save, entry.id)) return;
  save.meta.sagaEntries.unshift(entry);
  if (save.meta.sagaEntries.length > V4_MAX_SAGA_ENTRIES) {
    save.meta.sagaEntries.length = V4_MAX_SAGA_ENTRIES;
  }
}

function isSafeCurrencyBalance(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isValidChoiceAgent(agent: SupportAgent | undefined, agentId: SupportAgentId): agent is SupportAgent {
  const definition = getV4AgentDefinition(agentId);
  return Boolean(agent
    && definition
    && agent.id === agentId
    && agent.nameKR === definition.nameKR
    && agent.roleKR === definition.roleKR
    && agent.trait === definition.trait
    && Number.isInteger(agent.level) && agent.level >= 1 && agent.level <= 3
    && Number.isFinite(agent.trust) && agent.trust >= 0 && agent.trust <= 100
    && Number.isFinite(agent.fatigue) && agent.fatigue >= 0 && agent.fatigue <= 100
    && (agent.activeTaskId === null || typeof agent.activeTaskId === 'string'));
}

export function applyAgentTrustGain(
  save: V4SaveEnvelope,
  agentId: SupportAgentId,
  amount: number,
  now: number,
): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) return;
  const agent = save.meta.agents.find((candidate) => candidate.id === agentId);
  if (!agent) return;
  const previousTrust = agent.trust;
  agent.trust = Math.min(100, previousTrust + amount);
  agent.level = Math.max(agent.level, Math.min(3, 1 + Math.floor(agent.trust / 50)));
  if (previousTrust < 50 && agent.trust >= 50) {
    addUniqueEntry(save, getAgentTrustMilestoneEntry(agent.id, agent.nameKR, now));
  }
}

export function getRealmIntroEntry(realmId: RealmId, heroName: string, now: number): SagaEntry {
  const realm = getV4RealmDefinition(realmId);
  const catalog = REALM_INTROS[realmId];
  return storyEntry(
    `saga-realm-intro-${realmId}`,
    'expedition',
    now,
    catalog?.title ?? `${realm?.nameKR ?? '미지의 영역'} 진입`,
    catalog?.text(heroName) ?? `${heroName}은(는) 기록되지 않은 영역의 경계에 발을 디뎠다.`,
  );
}

export function getRealmVictoryEntry(realmId: RealmId, heroName: string, now: number): SagaEntry {
  const realm = getV4RealmDefinition(realmId);
  const catalog = REALM_VICTORIES[realmId];
  return storyEntry(
    `saga-realm-victory-${realmId}`,
    'expedition',
    now,
    catalog?.title ?? `${realm?.nameKR ?? '미지의 영역'} 승리`,
    catalog?.text(heroName) ?? `${heroName}은(는) 기록되지 않은 영역의 시련을 넘어섰다.`,
  );
}

export function getRejuvenationStoryEntry(heroName: string, years: number, now: number): SagaEntry {
  const safeYears = Number.isFinite(years) && years > 0 ? Math.floor(years) : 0;
  return storyEntry(
    `saga-rejuvenation-${safeNow(now)}`,
    'rejuvenation',
    now,
    '영원의 회춘 의식',
    `${heroName}의 시간이 ${safeYears}년 되돌아가 다시 한 번 마을의 약속을 짊어졌다.`,
  );
}

export function getAgentTrustMilestoneEntry(agentId: SupportAgentId, agentName: string, now: number): SagaEntry {
  return storyEntry(
    `saga-agent-trust-${agentId}-50`,
    'milestone',
    now,
    `${agentName}과 맺은 첫 신뢰`,
    `${agentName}이(가) 신뢰 50에 이르러 영웅의 뜻을 자신의 사명으로 받아들였다.`,
  );
}

export function getV4EpilogueEntry(heroName: string, now: number): SagaEntry {
  return storyEntry(
    V4_EPILOGUE_ID,
    'milestone',
    now,
    '첫 사가의 끝, 영원의 시작',
    `${heroName}은(는) 저승에서 돌아와 마을의 첫 약속을 지켰다. 다음 인연과 원정은 이제부터도 계속된다.`,
  );
}

export function getAvailableStoryChoice(save: V4SaveEnvelope): StoryChoiceDefinition | null {
  const result = save.run.lastExpeditionResult;
  if (save.meta.unlockedRealms.includes('underworld')
    || result?.realmId !== 'deep_forest'
    || result.outcome !== 'victory') return null;
  return {
    ...DEEP_FOREST_CHOICE,
    options: DEEP_FOREST_CHOICE.options.map((option) => ({ ...option })),
  };
}

export function chooseStoryChoice(
  source: V4SaveEnvelope,
  choice: StoryChoiceOptionId,
  now: number,
): StoryDomainResult {
  const definition = getAvailableStoryChoice(source);
  if (!definition) return { ok: false, save: source, error: '기록할 수 있는 서사 선택이 없습니다.' };
  if (!definition.options.some((option) => option.id === choice)) {
    return { ok: false, save: source, error: '알 수 없는 서사 선택입니다.' };
  }
  if (!Number.isSafeInteger(now) || now < 0 || now < source.updatedAt) {
    return { ok: false, save: source, error: '서사 선택 시각을 확인할 수 없습니다.' };
  }

  const target: { agentId: SupportAgentId; currency: V4CurrencyKey; reward: number } = choice === 'protect_flame'
    ? { agentId: 'mudang', currency: 'rift', reward: 1 }
    : { agentId: 'guide', currency: 'materials', reward: 2 };
  const targetAgents = Array.isArray(source.meta.agents)
    ? source.meta.agents.filter((agent) => agent.id === target.agentId)
    : [];
  if (targetAgents.length !== 1 || !isValidChoiceAgent(targetAgents[0], target.agentId)) {
    return { ok: false, save: source, error: '선택 대상 에이전트 기록을 확인할 수 없습니다.' };
  }
  const targetBalance = source.meta.currencies[target.currency];
  if (!isSafeCurrencyBalance(targetBalance)) {
    return { ok: false, save: source, error: '선택 보상 재화 기록을 확인할 수 없습니다.' };
  }

  const save = cloneSave(source);
  const eventAt = Math.max(source.updatedAt, now);
  const heroName = save.run.hero.name;
  applyAgentTrustGain(save, target.agentId, 5, eventAt);
  save.meta.currencies[target.currency] = Math.min(Number.MAX_SAFE_INTEGER, targetBalance + target.reward);
  addUniqueEntry(save, storyEntry(
    DEEP_FOREST_STORY_ID,
    'milestone',
    eventAt,
    definition.title,
    `${heroName}은(는) ${definition.options.find((option) => option.id === choice)?.text ?? '숲의 운명을 선택했다.'} 이제 저승으로 향하는 길이 열린다.`,
  ));
  if (!save.meta.unlockedRealms.includes('underworld')) save.meta.unlockedRealms.push('underworld');
  save.updatedAt = eventAt;
  save.lastProcessedAt = Math.max(save.lastProcessedAt, eventAt);
  return { ok: true, save };
}

export function hasV4Epilogue(save: V4SaveEnvelope): boolean {
  return hasEntry(save, V4_EPILOGUE_ID);
}
