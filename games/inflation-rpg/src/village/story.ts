import { getVillageRealmDefinition } from './data';
import type { RealmId, SagaEntry, StoryChoiceDefinition, StoryChoiceOptionId, SupportAgentId, VillageSaveEnvelope } from './types';

export type { StoryChoiceDefinition, StoryChoiceOptionId } from './types';

export type StoryDomainResult =
  | { ok: true; save: VillageSaveEnvelope }
  | { ok: false; save: VillageSaveEnvelope; error: string };

export const DEEP_FOREST_STORY_ID = 'saga-story-deep-forest-embers';
export const Village_EPILOGUE_ID = 'saga-epilogue-first-journey';

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
  sacred_fields: {
    title: '첫 장: 장승 아래의 약속',
    text: (heroName) => `${heroName}은(는) 마을 어귀 장승에 새겨진 신탁을 따라 신목 들판으로 나섰다. 떠돌이 도깨비가 훔쳐 간 곡식의 혼을 되찾아야 마을의 불씨가 꺼지지 않는다.`,
  },
  deep_forest: {
    title: '둘째 장: 산군의 푸른 불씨',
    text: (heroName) => `${heroName}은(는) 신목 들판의 장승이 가리킨 길을 따라 깊은 숲에 들었다. 산군이 품은 푸른 불씨에는 마을과 저승을 잇는 오래된 약속이 잠들어 있다.`,
  },
  underworld: {
    title: '셋째 장: 황천의 문',
    text: (heroName) => `숲의 불씨가 저승의 문을 밝혀 주었다. ${heroName}은(는) 망자의 행렬 사이에서 염라의 대리인을 만나, 살아 있는 마을의 이름을 증명해야 한다.`,
  },
};

const REALM_VICTORIES: Record<RealmId, { title: string; text: (heroName: string) => string }> = {
  sacred_fields: {
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

function hasEntry(save: VillageSaveEnvelope, id: string): boolean {
  return save.meta.sagaEntries.some((entry) => entry.id === id);
}

export function getRealmIntroEntry(realmId: RealmId, heroName: string, now: number): SagaEntry {
  const realm = getVillageRealmDefinition(realmId);
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
  const realm = getVillageRealmDefinition(realmId);
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

export function getVillageEpilogueEntry(heroName: string, now: number): SagaEntry {
  return storyEntry(
    Village_EPILOGUE_ID,
    'milestone',
    now,
    '첫 사가의 끝, 영원의 시작',
    `${heroName}은(는) 저승에서 돌아와 마을의 첫 약속을 지켰다. 다음 인연과 원정은 이제부터도 계속된다.`,
  );
}

export function getAvailableStoryChoice(save: VillageSaveEnvelope): StoryChoiceDefinition | null {
  const result = save.run.lastExpeditionResult;
  if (save.meta.unlockedRealms.includes('underworld')
    || !save.meta.unlockedRealms.includes('deep_forest')
    || result?.realmId !== 'deep_forest'
    || result.outcome !== 'victory') return null;
  return {
    ...DEEP_FOREST_CHOICE,
    options: DEEP_FOREST_CHOICE.options.map((option) => ({ ...option })),
  };
}

export function getStoryChoiceEntry(
  definition: StoryChoiceDefinition,
  choice: StoryChoiceOptionId,
  heroName: string,
  now: number,
): SagaEntry {
  return storyEntry(
    DEEP_FOREST_STORY_ID,
    'milestone',
    now,
    definition.title,
    `${heroName}은(는) ${definition.options.find((option) => option.id === choice)?.text ?? '숲의 운명을 선택했다.'} 이제 저승으로 향하는 길이 열린다.`,
  );
}

export function hasVillageEpilogue(save: VillageSaveEnvelope): boolean {
  return hasEntry(save, Village_EPILOGUE_ID);
}
