import { useCallback, useMemo, useState } from 'react';
import {
  cancelFacilityTask,
  confirmPendingExpedition,
  confirmNextRealmUnlock,
  chooseStoryChoice as chooseStoryChoiceDomain,
  rejuvenateHero,
  restAgent,
  setVillagePolicy,
  startExpedition,
  startFacilityTask,
  updateVillageSettings,
  upgradeFacility,
  useIntervention,
} from './domain';
import type { VillageMonetizationAdapter } from './monetization';
import type { FacilityId, InterventionType, RealmId, SupportAgentId, VillagePolicy, VillageSaveEnvelope, VillageSettings } from './types';
import type { StoryChoiceOptionId } from './types';
import { getAvailableStoryChoice } from './domain';
import { recordVillageSaveMetric } from './telemetry';
import { useVillageMonetization } from './useVillageMonetization';
import { useVillagePersistence } from './useVillagePersistence';

export function useVillageGame(monetization?: VillageMonetizationAdapter) {
  const [offlineRewardDoubled, setOfflineRewardDoubled] = useState(false);
  const resetOfflineReward = useCallback(() => setOfflineRewardDoubled(false), []);
  const {
    save,
    saveRef,
    storageStatus,
    storageIssue,
    now,
    offlineSummary,
    offlineSummaryRef,
    commit: persistCommit,
    refresh,
    settleOffline,
    startFreshSave: replaceInvalidSave,
    closeOffline,
  } = useVillagePersistence({ onOfflineResult: resetOfflineReward });
  const [message, setMessage] = useState<string | null>(null);

  const commit = useCallback((next: VillageSaveEnvelope, nextMessage?: string) => {
    persistCommit(next);
    if (nextMessage) setMessage(nextMessage);
  }, [persistCommit]);

  const markOfflineRewardDoubled = useCallback(() => setOfflineRewardDoubled(true), []);
  const monetizationState = useVillageMonetization({
    monetization,
    saveRef,
    offlineSummaryRef,
    commit,
    setMessage,
    offlineRewardDoubled,
    markOfflineRewardDoubled,
  });

  const changePolicy = useCallback((policy: VillagePolicy) => {
    const current = saveRef.current;
    const next = setVillagePolicy(current, policy, Date.now());
    commit(next);
    if (next.run.policy !== current.run.policy) {
      recordVillageSaveMetric(next, 'policy_changed', `policy_changed:${next.createdAt}:${next.updatedAt}:${next.run.policy}`, next.updatedAt, next.run.policy);
    }
  }, [commit]);

  const updateSettings = useCallback((patch: Partial<VillageSettings>) => {
    commit(updateVillageSettings(saveRef.current, patch, Date.now()));
  }, [commit]);

  const startTask = useCallback((facilityId: FacilityId, agentId: SupportAgentId | null = null) => {
    const result = startFacilityTask(saveRef.current, facilityId, Date.now(), agentId);
    if (result.ok) {
      commit(result.save, `${result.task.type} 작업을 시작했습니다.`);
      recordVillageSaveMetric(result.save, 'facility_task_started', `facility_task_started:${result.task.id}`, result.task.startedAt, result.task.facilityId);
    }
    else setMessage(result.error);
  }, [commit]);

  const cancelTask = useCallback((facilityId: FacilityId) => {
    const result = cancelFacilityTask(saveRef.current, facilityId, Date.now());
    if (result.ok) commit(result.save, '작업을 취소하고 투입 재화를 돌려받았습니다.');
    else setMessage(result.error);
  }, [commit]);

  const restSupportAgent = useCallback((agentId: SupportAgentId) => {
    const result = restAgent(saveRef.current, agentId, Date.now());
    if (result.ok) commit(result.save, '지원 에이전트가 휴식을 마쳤습니다.');
    else setMessage(result.error);
  }, [commit]);

  const rejuvenate = useCallback(() => {
    const result = rejuvenateHero(saveRef.current, 5, Date.now());
    if (result.ok) commit(result.save, `영웅의 시간이 ${result.result.yearsReduced}년 되돌아갔습니다.`);
    else setMessage(result.error);
  }, [commit]);

  const intervene = useCallback((type: InterventionType) => {
    const result = useIntervention(saveRef.current, type, Date.now());
    if (result.ok) {
      commit(result.save, type === 'heal' ? '신의 개입으로 영웅을 즉시 회복했습니다.' : '신의 개입으로 원정에서 안전하게 후퇴했습니다.');
    } else {
      setMessage(result.error);
    }
  }, [commit]);

  const startRun = useCallback((realmId: RealmId, agentId: SupportAgentId | null = null) => {
    const current = saveRef.current;
    const result = startExpedition(current, realmId, Date.now(), current.run.policy, agentId);
    if (result.ok) {
      commit(result.save, '원정을 출발시켰습니다.');
      recordVillageSaveMetric(result.save, 'expedition_started', `expedition_started:${result.task.id}`, result.task.startedAt, result.save.run.expedition?.realmId ?? realmId);
    }
    else setMessage(result.error);
  }, [commit]);

  const chooseStory = useCallback((choice: StoryChoiceOptionId) => {
    const result = chooseStoryChoiceDomain(saveRef.current, choice, Date.now());
    if (result.ok) {
      commit(result.save, '깊은 숲의 선택을 사가에 기록했습니다. 저승의 길이 열렸습니다.');
      recordVillageSaveMetric(result.save, 'story_choice_made', `story_choice_made:${result.save.createdAt}:${result.save.updatedAt}`, result.save.updatedAt, choice);
    }
    else setMessage(result.error);
  }, [commit]);

  const confirmRun = useCallback(() => {
    const current = saveRef.current;
    if (current.run.expedition?.status !== 'awaiting_confirmation') return;
    const next = confirmPendingExpedition(current, Date.now());
    if (next === current) {
      setMessage('원정 결과를 확인할 수 없습니다. 기기 시각을 확인한 뒤 다시 시도해 주세요.');
      return;
    }
    commit(next, '보류된 원정 결과를 확인했습니다.');
  }, [commit]);

  const confirmUnlock = useCallback(() => {
    const current = saveRef.current;
    const next = confirmNextRealmUnlock(current, Date.now());
    if (next === current) {
      setMessage('확인할 다음 영역 기록이 없습니다.');
      return;
    }
    commit(next, '다음 영역 기록을 해금했습니다.');
  }, [commit]);

  const upgrade = useCallback((facilityId: FacilityId) => {
    const result = upgradeFacility(saveRef.current, facilityId, Date.now());
    if (result.ok) commit(result.save, '시설 레벨이 올랐습니다.');
    else setMessage(result.error);
  }, [commit]);

  const startFreshSave = useCallback(() => {
    if (!replaceInvalidSave()) return;
    setOfflineRewardDoubled(false);
    setMessage('새 현재 게임 저장을 시작했습니다. 손상된 현재 게임 데이터는 복구 백업으로 보존되었습니다.');
  }, [replaceInvalidSave]);
  const closeMessage = useCallback(() => setMessage(null), []);
  const activeTasks = useMemo(() => Object.values(save.meta.tasks), [save.meta.tasks]);

  return {
    save,
    storyChoice: getAvailableStoryChoice(save),
    storageStatus,
    storageIssue,
    now,
    offlineSummary,
    message,
    activeTasks,
    refresh,
    settleOffline,
    changePolicy,
    updateSettings,
    startTask,
    cancelTask,
    restSupportAgent,
    rejuvenate,
    offlineRewardDoubled,
    ...monetizationState,
    intervene,
    startRun,
    chooseStoryChoice: chooseStory,
    confirmRun,
    confirmUnlock,
    upgrade,
    startFreshSave,
    closeOffline,
    closeMessage,
  };
}
