import { getVillageAgentDefinition } from '../../data';
import {
  applyAgentTrustGain,
  getAvailableStoryChoice,
  getStoryChoiceEntry,
} from '../../story';
import type { StoryDomainResult } from '../../story';
import { Village_MAX_SAGA_ENTRIES } from '../../types';
import type {
  SagaEntry,
  StoryChoiceOptionId,
  SupportAgent,
  SupportAgentId,
  VillageCurrencyKey,
  VillageSaveEnvelope,
} from '../../types';
import { cloneSave } from '../shared/saveMutation';

function addUniqueEntry(save: VillageSaveEnvelope, entry: SagaEntry): void {
  if (save.meta.sagaEntries.some((candidate) => candidate.id === entry.id)) return;
  save.meta.sagaEntries.unshift(entry);
  if (save.meta.sagaEntries.length > Village_MAX_SAGA_ENTRIES) {
    save.meta.sagaEntries.length = Village_MAX_SAGA_ENTRIES;
  }
}

function isSafeCurrencyBalance(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isValidChoiceAgent(agent: SupportAgent | undefined, agentId: SupportAgentId): agent is SupportAgent {
  const definition = getVillageAgentDefinition(agentId);
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

/** Explicitly records the one irreversible story choice before the underworld. */
export function chooseStoryChoice(
  source: VillageSaveEnvelope,
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

  const target: { agentId: SupportAgentId; currency: VillageCurrencyKey; reward: number } = choice === 'protect_flame'
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
  applyAgentTrustGain(save, target.agentId, 5, eventAt);
  save.meta.currencies[target.currency] = Math.min(Number.MAX_SAFE_INTEGER, targetBalance + target.reward);
  addUniqueEntry(save, getStoryChoiceEntry(definition, choice, save.run.hero.name, eventAt));
  if (!save.meta.unlockedRealms.includes('underworld')) save.meta.unlockedRealms.push('underworld');
  save.updatedAt = eventAt;
  save.lastProcessedAt = Math.max(save.lastProcessedAt, eventAt);
  return { ok: true, save };
}
