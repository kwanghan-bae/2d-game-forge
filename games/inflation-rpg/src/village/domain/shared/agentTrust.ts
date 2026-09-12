import { getAgentTrustMilestoneEntry } from '../../story';
import { Village_MAX_SAGA_ENTRIES } from '../../types';
import type { SagaEntry, SupportAgentId, VillageSaveEnvelope } from '../../types';

function addUniqueEntry(save: VillageSaveEnvelope, entry: SagaEntry): void {
  if (save.meta.sagaEntries.some((candidate) => candidate.id === entry.id)) return;
  save.meta.sagaEntries.unshift(entry);
  if (save.meta.sagaEntries.length > Village_MAX_SAGA_ENTRIES) {
    save.meta.sagaEntries.length = Village_MAX_SAGA_ENTRIES;
  }
}

export function applyAgentTrustGain(
  save: VillageSaveEnvelope,
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
