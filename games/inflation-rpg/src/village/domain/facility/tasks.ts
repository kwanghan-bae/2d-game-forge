import { getVillageFacilityDefinition } from '../../data';
import { getVillageEquipmentName } from '../../equipment';
import type { FacilityId, FacilityTask, SupportAgentId, VillageSaveEnvelope } from '../../types';
import { AGENT_REST_RECOVERY } from '../contracts';
import type { AgentDomainResult, DomainResult } from '../contracts';
import { isValidAgentState, isValidCompletionWindow, safeCompletionTimestamp } from '../shared/guards';
import { nextSaveId, nextTaskId } from '../shared/ids';
import { canApplyCurrencyOutput, give, pay } from '../shared/resourceMath';
import { cloneSave, eventTimestamp, syncHeroAction, touchSave } from '../shared/saveMutation';
import { getFacilityTaskPreview } from './preview';

export function startFacilityTask(
  source: VillageSaveEnvelope,
  facilityId: FacilityId,
  now: number,
  assignedAgentId?: SupportAgentId | null,
): DomainResult {
  const hasAssignedAgentArgument = arguments.length >= 4;
  const requestedAgentId = hasAssignedAgentArgument ? assignedAgentId : null;
  const preview = getFacilityTaskPreview(
    source,
    facilityId,
    hasAssignedAgentArgument ? assignedAgentId : null,
  );
  if (!preview.canStart) {
    return { ok: false, save: source, error: preview.error ?? '작업을 시작할 수 없습니다.' };
  }

  const save = cloneSave(source);
  const eventAt = eventTimestamp(save, now);
  const facility = save.meta.facilities[facilityId];
  const definition = getVillageFacilityDefinition(facilityId);
  const agent = requestedAgentId ? save.meta.agents.find((item) => item.id === requestedAgentId) : undefined;
  if (!facility || !definition) return { ok: false, save: source, error: '아직 사용할 수 없는 시설입니다.' };
  const completesAt = safeCompletionTimestamp(eventAt, preview.durationSeconds);
  if (completesAt === null) return { ok: false, save: source, error: '작업 시각 범위를 확인할 수 없어 시작하지 않았습니다.' };

  pay(save, preview.input);
  const taskLabel = facilityId === 'blacksmith' && preview.outputEquipmentIds[0]
    ? `${getVillageEquipmentName(preview.outputEquipmentIds[0])} 제작`
    : definition.taskLabelKR;
  const task: FacilityTask = {
    id: nextTaskId(save, facilityId, eventAt),
    facilityId,
    type: taskLabel,
    startedAt: eventAt,
    completesAt,
    input: preview.input,
    outputPreview: preview.output,
    outputEquipmentIds: preview.outputEquipmentIds.length > 0 ? preview.outputEquipmentIds : undefined,
    heroExpGain: preview.heroExpGain > 0 ? preview.heroExpGain : undefined,
    assignedAgentId: requestedAgentId ?? null,
  };
  save.meta.tasks[task.id] = task;
  facility.activeTaskId = task.id;
  if (agent) agent.activeTaskId = task.id;
  syncHeroAction(save);
  touchSave(save, now);
  return { ok: true, save, task };
}

export function cancelFacilityTask(
  source: VillageSaveEnvelope,
  facilityId: FacilityId,
  now: number,
): DomainResult {
  const save = cloneSave(source);
  const facility = save.meta.facilities[facilityId];
  const taskId = facility?.activeTaskId;
  const task = taskId ? save.meta.tasks[taskId] : undefined;
  if (!facility || !task) {
    return { ok: false, save: source, error: '취소할 작업이 없습니다.' };
  }

  if (!isValidCompletionWindow(task.startedAt, task.completesAt)) {
    return { ok: false, save: source, error: '작업 시각 범위를 확인할 수 없습니다.' };
  }
  if (task.completesAt <= eventTimestamp(save, now)) {
    return {
      ok: false,
      save: source,
      error: '이미 완료된 작업입니다. 진행 확인으로 결과를 정산해 주세요.',
    };
  }
  if (!canApplyCurrencyOutput(source, task.input)) {
    return { ok: false, save: source, error: '환불할 재화 잔액을 확인할 수 없습니다.' };
  }

  give(save, task.input, 0.8);
  facility.activeTaskId = null;
  delete save.meta.tasks[task.id];
  if (task.assignedAgentId) {
    const agent = save.meta.agents.find((item) => item.id === task.assignedAgentId);
    if (agent) agent.activeTaskId = null;
  }
  syncHeroAction(save);
  touchSave(save, now);
  return { ok: true, save, task };
}

export function restAgent(
  source: VillageSaveEnvelope,
  agentId: SupportAgentId,
  now: number,
): AgentDomainResult {
  const sourceAgent = source.meta.agents.find((agent) => agent.id === agentId);
  if (!sourceAgent) return { ok: false, save: source, error: '지원 에이전트를 찾을 수 없습니다.' };
  if (sourceAgent.activeTaskId) return { ok: false, save: source, error: '작업 중인 에이전트는 휴식할 수 없습니다.' };
  if (!isValidAgentState(sourceAgent)) {
    return { ok: false, save: source, error: '에이전트 정보를 확인할 수 없습니다.' };
  }
  if (sourceAgent.fatigue <= 0) return { ok: false, save: source, error: '에이전트의 피로도가 이미 0입니다.' };

  const save = cloneSave(source);
  const eventAt = eventTimestamp(save, now);
  const agent = save.meta.agents.find((candidate) => candidate.id === agentId);
  if (!agent) return { ok: false, save: source, error: '지원 에이전트를 찾을 수 없습니다.' };
  agent.fatigue = Math.max(0, agent.fatigue - AGENT_REST_RECOVERY);
  save.meta.sagaEntries.unshift({
    id: nextSaveId(save, `saga-agent-rest-${agentId}-${eventAt}`),
    kind: 'facility',
    createdAt: eventAt,
    title: `${agent.nameKR} 휴식`,
    text: `${agent.nameKR}이(가) 잠시 숨을 고르고 피로를 ${AGENT_REST_RECOVERY} 낮췄다.`,
  });
  touchSave(save, now);
  return { ok: true, save };
}
