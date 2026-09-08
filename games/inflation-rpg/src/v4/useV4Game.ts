import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  cancelFacilityTask,
  advanceHeroAutonomy,
  confirmPendingExpedition,
  completeFacilityTasks,
  completeFacilityTaskNow,
  confirmNextRealmUnlock,
  chooseStoryChoice as chooseStoryChoiceDomain,
  grantInterventionCharge,
  grantOfflineResourceBonus,
  rejuvenateHero,
  restAgent,
  setV4Policy,
  startExpedition,
  startFacilityTask,
  updateV4Settings,
  upgradeFacility,
  useIntervention,
} from './domain';
import {
  createInitialV4Save,
  importV3HeroSnapshot,
  persistV4Save,
  readV4Save,
  simulateOfflineProgress,
  startFreshV4Save,
  V4_LIVE_REFRESH_GAP_MS,
} from './save';
import { useGameStore } from '../store/gameStore';
import type { HeroSnapshot } from '../hero/HeroEntity';
import { V4_DAILY_REWARDED_LIMIT, type V4MonetizationAdapter, type V4RewardedPlacement } from './monetization';
import type { FacilityId, InterventionType, OfflineSummary, RealmId, SupportAgentId, V4Policy, V4SaveEnvelope, V4Settings } from './types';
import { V4_MAX_INTERVENTION_CHARGES, type StoryChoiceOptionId } from './types';
import { getAvailableStoryChoice } from './domain';
import { recordV4Metric, type V4MetricName, type V4MetricDetail } from './telemetry';

function monotonicActionTimestamp(
  save: V4SaveEnvelope,
  actionStartedAt: number,
  actionStartUpdatedAt: number,
): number {
  const timestamp = Date.now();
  if (!Number.isFinite(timestamp) || timestamp >= save.updatedAt) return timestamp;
  return actionStartedAt >= actionStartUpdatedAt && save.updatedAt <= actionStartUpdatedAt
    ? actionStartUpdatedAt
    : timestamp;
}

function readAdFreeEntitlement(monetization: V4MonetizationAdapter | undefined): boolean {
  try {
    return monetization?.isAdFree() === true;
  } catch {
    return false;
  }
}

function readAdsToday(monetization: V4MonetizationAdapter | undefined): number {
  try {
    const value = monetization?.getAdsToday();
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.min(V4_DAILY_REWARDED_LIMIT, Math.max(0, Math.floor(value)))
      : 0;
  } catch {
    return 0;
  }
}

function canRestorePurchases(monetization: V4MonetizationAdapter | undefined): boolean {
  try {
    return monetization?.canRestorePurchases() === true;
  } catch {
    return false;
  }
}

function recordMetric(
  save: V4SaveEnvelope,
  name: V4MetricName,
  id: string,
  occurredAt = save.updatedAt,
  detail?: V4MetricDetail,
): void {
  if (!Number.isFinite(occurredAt) || !Number.isFinite(save.createdAt)) return;
  recordV4Metric({ id, name, occurredAt: Math.max(save.createdAt, occurredAt), saveCreatedAt: save.createdAt, ...(detail ? { detail } : {}) });
}

function recordFinishedExpedition(previous: V4SaveEnvelope, next: V4SaveEnvelope): void {
  const result = next.run.lastExpeditionResult;
  if (!result || result.id === previous.run.lastExpeditionResult?.id) return;
  recordMetric(next, 'expedition_finished', `expedition_finished:${result.id}`, result.completedAt, {
    outcome: result.outcome,
  });
}

export function useV4Game(monetization?: V4MonetizationAdapter) {
  const [boot] = useState(() => {
    const loaded = readV4Save();
    return {
      loaded,
      save: loaded.status === 'valid' ? loaded.save : createInitialV4Save(Date.now()),
    };
  });
  const [save, setSave] = useState<V4SaveEnvelope>(() => boot.save);
  const saveRef = useRef(save);
  const mountedRef = useRef(true);
  const initialOfflineSettlementDone = useRef(false);
  const [storageStatus, setStorageStatus] = useState(() => boot.loaded.status);
  const [storageIssue] = useState(() => boot.loaded.status === 'invalid' ? boot.loaded.reason : null);
  const [clock, setClock] = useState(() => Date.now());
  const [offlineSummary, setOfflineSummary] = useState<OfflineSummary | null>(null);
  const offlineSummaryRef = useRef<OfflineSummary | null>(null);
  const [offlineRewardDoubled, setOfflineRewardDoubled] = useState(false);
  const [offlineRewardPending, setOfflineRewardPending] = useState(false);
  const [instantTaskPendingFacilities, setInstantTaskPendingFacilities] = useState<FacilityId[]>([]);
  const [interventionChargePending, setInterventionChargePending] = useState(false);
  const [, setMonetizationRevision] = useState(0);
  const offlineRewardClaimInFlight = useRef(false);
  const instantTaskInFlight = useRef(new Set<FacilityId>());
  const interventionChargeInFlight = useRef(false);
  const adFreePurchaseInFlight = useRef(false);
  const [adFreePurchasePending, setAdFreePurchasePending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const updatePresentationClock = useCallback((timestamp: number) => {
    if (!Number.isFinite(timestamp)) return;
    setClock((previous) => Number.isFinite(previous)
      ? Math.max(previous, timestamp)
      : timestamp);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (boot.loaded.status === 'missing' || boot.loaded.status === 'unavailable') {
      recordMetric(boot.save, 'save_created', `save_created:${boot.save.createdAt}`, boot.save.createdAt);
    }
  }, [boot.loaded.status, boot.save]);

  useEffect(() => {
    if (!monetization) return;
    return monetization.subscribe(() => {
      setMonetizationRevision((revision) => revision + 1);
    });
  }, [monetization]);

  const commit = useCallback((next: V4SaveEnvelope, nextMessage?: string) => {
    recordFinishedExpedition(saveRef.current, next);
    saveRef.current = next;
    setSave(next);
    const persisted = persistV4Save(next);
    setStorageStatus((previous) => previous === 'invalid' ? previous : persisted ? 'valid' : 'unavailable');
    if (nextMessage) setMessage(nextMessage);
  }, []);

  const settleOffline = useCallback(() => {
    if (storageStatus === 'invalid') return;
    const timestamp = Date.now();
    updatePresentationClock(timestamp);
    const current = saveRef.current;
    const result = simulateOfflineProgress(current, timestamp);
    recordFinishedExpedition(current, result.save);
    const shouldPersist = result.save !== current || storageStatus !== 'valid';
    if (shouldPersist) {
      saveRef.current = result.save;
      setSave(result.save);
      const persisted = persistV4Save(result.save);
      setStorageStatus((previous) => previous === 'invalid' ? previous : persisted ? 'valid' : 'unavailable');
    }
    const parkedRiskyExpedition = result.save.run.expedition?.status === 'awaiting_confirmation'
      && current.run.expedition?.status !== 'awaiting_confirmation';
    const hasOfflineResult = result.summary.processedSeconds > 0
      || result.summary.clockAnomaly !== null
      || result.summary.completedTaskIds.length > 0
      || result.summary.completedExpedition
      || parkedRiskyExpedition
      || result.summary.equipmentGained.length > 0
      || result.summary.equipmentUpgraded.length > 0
      || Object.values(result.summary.resourcesGained).some(
        (value) => typeof value === 'number' && Number.isFinite(value) && value > 0,
      );
    if (hasOfflineResult) {
      offlineSummaryRef.current = result.summary;
      setOfflineSummary(result.summary);
      setOfflineRewardDoubled(false);
    }
  }, [storageStatus, updatePresentationClock]);

  useEffect(() => {
    if (initialOfflineSettlementDone.current) return;
    initialOfflineSettlementDone.current = true;
    settleOffline();
    // The initial state is intentionally processed once on mount. Subsequent
    // mutations use commit() and do not replay this effect.
  }, [settleOffline]);

  const now = clock;
  const refresh = useCallback(() => {
    const timestamp = Date.now();
    const current = saveRef.current;
    updatePresentationClock(timestamp);
    if (!Number.isFinite(timestamp) || timestamp < current.updatedAt) return;
    if (timestamp - current.updatedAt > V4_LIVE_REFRESH_GAP_MS) {
      settleOffline();
      return;
    }
    const hasDueWork = Object.values(current.meta.tasks).some((task) => task.completesAt <= timestamp)
      || Boolean(current.run.expedition
        && current.run.expedition.status === 'traveling'
        && current.run.expedition.completesAt <= timestamp);
    if (hasDueWork) {
      const settled = completeFacilityTasks(current, timestamp, 1, false, false, false);
      const autonomous = advanceHeroAutonomy(settled, timestamp);
      commit(autonomous.save);
      return;
    }
    const autonomous = advanceHeroAutonomy(current, timestamp);
    if (autonomous.started) commit(autonomous.save);
  }, [commit, settleOffline, updatePresentationClock]);

  const changePolicy = useCallback((policy: V4Policy) => {
    const current = saveRef.current;
    const next = setV4Policy(current, policy, Date.now());
    commit(next);
    if (next.run.policy !== current.run.policy) {
      recordMetric(next, 'policy_changed', `policy_changed:${next.createdAt}:${next.updatedAt}:${next.run.policy}`, next.updatedAt, {
        policy: next.run.policy,
      });
    }
  }, [commit]);

  const updateSettings = useCallback((patch: Partial<V4Settings>) => {
    commit(updateV4Settings(saveRef.current, patch, Date.now()));
  }, [commit]);

  const startTask = useCallback((facilityId: FacilityId, agentId: SupportAgentId | null = null) => {
    const result = startFacilityTask(saveRef.current, facilityId, Date.now(), agentId);
    if (result.ok) {
      commit(result.save, `${result.task.type} 작업을 시작했습니다.`);
      recordMetric(result.save, 'facility_task_started', `facility_task_started:${result.task.id}`, result.task.startedAt, {
        facility: result.task.facilityId,
      });
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

  const watchRewarded = useCallback(async (placement: V4RewardedPlacement): Promise<boolean> => {
    if (!monetization) {
      setMessage('현재 환경에서는 광고 혜택을 사용할 수 없습니다. 게임은 계속 진행됩니다.');
      return false;
    }
    const messages = {
      daily_limit: '오늘의 보상형 광고 횟수를 모두 사용했습니다.',
      provider_failed: '광고를 불러오지 못했습니다. 게임은 계속 진행됩니다.',
      not_purchased: '구매가 완료되지 않았습니다.',
      granted: '',
    } as const;
    let result;
    try {
      result = await monetization.watchRewarded(placement);
    } catch {
      if (mountedRef.current) setMessage(messages.provider_failed);
      return false;
    }
    if (!mountedRef.current) return false;
    if (result.granted) return true;
    setMessage(messages[result.reason]);
    return false;
  }, [monetization]);

  const doubleOfflineReward = useCallback(async () => {
    const summary = offlineSummaryRef.current;
    const hasPositiveResourceReward = Boolean(summary
      && Object.values(summary.resourcesGained).some((value) => Number.isFinite(value) && value > 0));
    if (!summary || !hasPositiveResourceReward || offlineRewardDoubled || offlineRewardClaimInFlight.current) return;
    const actionSave = saveRef.current;
    const actionStartedAt = Date.now();
    if (!Number.isFinite(actionStartedAt) || actionStartedAt < actionSave.updatedAt) {
      setMessage('저장 시각을 확인할 수 없어 오프라인 2배 보상을 적용하지 않았습니다.');
      return;
    }
    const actionStartUpdatedAt = actionSave.updatedAt;
    offlineRewardClaimInFlight.current = true;
    if (mountedRef.current) setOfflineRewardPending(true);
    try {
      if (!(await watchRewarded('offline_double'))) return;
      if (!mountedRef.current) return;
      if (offlineSummaryRef.current !== summary) {
        setMessage('오프라인 정산이 새로 갱신되어 이전 보상 2배를 적용하지 않았습니다.');
        return;
      }
      const current = saveRef.current;
      const next = grantOfflineResourceBonus(
        current,
        summary.resourcesGained,
        monotonicActionTimestamp(current, actionStartedAt, actionStartUpdatedAt),
      );
      if (next === current) {
        setMessage('저장 시각을 확인할 수 없어 오프라인 2배 보상을 적용하지 않았습니다.');
        return;
      }
      commit(next, '오프라인 재화 보상을 2배로 적용했습니다.');
      setOfflineRewardDoubled(true);
    } finally {
      offlineRewardClaimInFlight.current = false;
      if (mountedRef.current) setOfflineRewardPending(false);
    }
  }, [commit, offlineRewardDoubled, watchRewarded]);

  const instantTask = useCallback(async (facilityId: FacilityId) => {
    if (instantTaskInFlight.current.has(facilityId)) return;
    const current = saveRef.current;
    const activeTaskId = current.meta.facilities[facilityId]?.activeTaskId;
    const currentTask = activeTaskId ? current.meta.tasks[activeTaskId] : undefined;
    if (!activeTaskId || !currentTask) {
      setMessage('즉시 완료할 작업이 없습니다.');
      return;
    }
    const currentTimestamp = Date.now();
    if (!Number.isFinite(currentTimestamp)) {
      setMessage('이미 완료된 작업입니다. 진행 확인으로 결과를 정산해 주세요.');
      return;
    }
    if (currentTimestamp < current.updatedAt) {
      setMessage('저장 시각을 확인할 수 없어 작업을 즉시 완료하지 않았습니다.');
      return;
    }
    if (currentTask.completesAt <= currentTimestamp) {
      setMessage('이미 완료된 작업입니다. 진행 확인으로 결과를 정산해 주세요.');
      return;
    }
    const actionStartUpdatedAt = current.updatedAt;
    instantTaskInFlight.current.add(facilityId);
    if (mountedRef.current) {
      setInstantTaskPendingFacilities((facilities) => facilities.includes(facilityId)
        ? facilities
        : [...facilities, facilityId]);
    }
    try {
      if (!(await watchRewarded('instant_task'))) return;
      if (!mountedRef.current) return;
      const latest = saveRef.current;
      const latestTaskId = latest.meta.facilities[facilityId]?.activeTaskId;
      if (latestTaskId !== activeTaskId || !latestTaskId || !latest.meta.tasks[latestTaskId]) {
        setMessage('작업 상태가 바뀌어 광고 즉시 완료를 적용하지 않았습니다.');
        return;
      }
      const latestTimestamp = monotonicActionTimestamp(latest, currentTimestamp, actionStartUpdatedAt);
      if (!Number.isFinite(latestTimestamp) || latest.meta.tasks[latestTaskId].completesAt <= latestTimestamp) {
        setMessage('작업이 자연 완료되어 광고 혜택을 적용하지 않았습니다.');
        return;
      }
      const result = completeFacilityTaskNow(latest, facilityId, latestTimestamp);
      if (result.ok) commit(result.save, '광고 혜택으로 작업을 즉시 완료했습니다.');
      else setMessage(result.error);
    } finally {
      instantTaskInFlight.current.delete(facilityId);
      if (mountedRef.current) {
        setInstantTaskPendingFacilities((facilities) => facilities.filter((id) => id !== facilityId));
      }
    }
  }, [commit, watchRewarded]);

  const addInterventionCharge = useCallback(async () => {
    if (interventionChargeInFlight.current) return;
    const current = saveRef.current;
    if (current.run.interventionCharges >= V4_MAX_INTERVENTION_CHARGES) {
      setMessage('개입 충전이 이미 가득 찼습니다.');
      return;
    }
    const actionStartedAt = Date.now();
    if (!Number.isFinite(actionStartedAt) || actionStartedAt < current.updatedAt) {
      setMessage('저장 시각을 확인할 수 없어 개입 충전을 적용하지 않았습니다.');
      return;
    }
    const actionStartUpdatedAt = current.updatedAt;
    interventionChargeInFlight.current = true;
    if (mountedRef.current) setInterventionChargePending(true);
    try {
      if (!(await watchRewarded('intervention_charge'))) return;
      if (!mountedRef.current) return;
      const latest = saveRef.current;
      const next = grantInterventionCharge(
        latest,
        monotonicActionTimestamp(latest, actionStartedAt, actionStartUpdatedAt),
      );
      if (next === latest) {
        setMessage('저장 시각을 확인할 수 없어 개입 충전을 적용하지 않았습니다.');
        return;
      }
      commit(next, '개입 충전을 1회 얻었습니다.');
    } finally {
      interventionChargeInFlight.current = false;
      if (mountedRef.current) setInterventionChargePending(false);
    }
  }, [commit, watchRewarded]);

  const intervene = useCallback((type: InterventionType) => {
    const result = useIntervention(saveRef.current, type, Date.now());
    if (result.ok) {
      commit(result.save, type === 'heal' ? '신의 개입으로 영웅을 즉시 회복했습니다.' : '신의 개입으로 원정에서 안전하게 후퇴했습니다.');
    } else {
      setMessage(result.error);
    }
  }, [commit]);

  const buyAdFree = useCallback(async () => {
    if (!monetization) {
      setMessage('현재 환경에서는 결제를 사용할 수 없습니다. 게임은 계속 진행됩니다.');
      return;
    }
    if (adFreePurchaseInFlight.current || readAdFreeEntitlement(monetization)) return;
    adFreePurchaseInFlight.current = true;
    if (mountedRef.current) setAdFreePurchasePending(true);
    try {
      const result = await monetization.buyAdFree();
      if (mountedRef.current) setMessage(result.granted ? '광고 제거가 적용되었습니다.' : '구매가 완료되지 않았습니다.');
    } catch {
      if (mountedRef.current) setMessage('구매를 확인하지 못했습니다. 게임은 계속 진행됩니다.');
    } finally {
      adFreePurchaseInFlight.current = false;
      if (mountedRef.current) setAdFreePurchasePending(false);
    }
  }, [monetization]);

  const restorePurchases = useCallback(async () => {
    if (!monetization || !canRestorePurchases(monetization)) {
      setMessage('현재 환경에서는 구매 복원을 사용할 수 없습니다. 게임은 계속 진행됩니다.');
      return;
    }
    try {
      const result = await monetization.restorePurchases();
      if (!mountedRef.current) return;
      setMessage(result.granted
        ? '광고 제거 구매를 복원했습니다.'
        : result.reason === 'not_purchased'
          ? '복원할 광고 제거 구매를 찾지 못했습니다.'
          : '구매 복원에 실패했습니다. 게임은 계속 진행됩니다.');
    } catch {
      if (mountedRef.current) setMessage('구매 복원에 실패했습니다. 게임은 계속 진행됩니다.');
    }
  }, [monetization]);

  const startRun = useCallback((realmId: RealmId, agentId: SupportAgentId | null = null) => {
    const current = saveRef.current;
    const result = startExpedition(current, realmId, Date.now(), current.run.policy, agentId);
    if (result.ok) {
      commit(result.save, '원정을 출발시켰습니다.');
      recordMetric(result.save, 'expedition_started', `expedition_started:${result.task.id}`, result.task.startedAt, {
        realm: result.save.run.expedition?.realmId ?? realmId,
      });
    }
    else setMessage(result.error);
  }, [commit]);

  const chooseStory = useCallback((choice: StoryChoiceOptionId) => {
    const result = chooseStoryChoiceDomain(saveRef.current, choice, Date.now());
    if (result.ok) {
      commit(result.save, '깊은 숲의 선택을 사가에 기록했습니다. 저승의 길이 열렸습니다.');
      recordMetric(result.save, 'story_choice_made', `story_choice_made:${result.save.createdAt}:${result.save.updatedAt}`, result.save.updatedAt, {
        choice,
      });
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
      setMessage('확인할 다음 Realm 기록이 없습니다.');
      return;
    }
    commit(next, '다음 Realm 기록을 해금했습니다.');
  }, [commit]);

  const upgrade = useCallback((facilityId: FacilityId) => {
    const result = upgradeFacility(saveRef.current, facilityId, Date.now());
    if (result.ok) commit(result.save, '시설 레벨이 올랐습니다.');
    else setMessage(result.error);
  }, [commit]);

  const importLegacyHero = useCallback(() => {
    if (saveRef.current.run.expedition) {
      setMessage('원정 중에는 영웅 기록을 바꿀 수 없습니다. 귀환 후 다시 시도해 주세요.');
      return;
    }
    const legacySnapshot = useGameStore.getState().run?.heroSnapshot;
    if (!legacySnapshot) {
      setMessage('가져올 V3 영웅 기록이 없습니다. V3 Legacy에서 영웅을 먼저 후원하세요.');
      return;
    }
    const next = importV3HeroSnapshot(saveRef.current, legacySnapshot as HeroSnapshot, Date.now());
    commit(next, 'V3 영웅 기록을 명시적으로 가져왔습니다.');
  }, [commit]);

  const startFreshSave = useCallback(() => {
    if (storageStatus !== 'invalid') return;
    const next = startFreshV4Save(undefined, Date.now());
    recordMetric(next, 'save_created', `save_created:${next.createdAt}`, next.createdAt);
    saveRef.current = next;
    setSave(next);
    setStorageStatus(persistV4Save(next) ? 'valid' : 'unavailable');
    setOfflineSummary(null);
    setOfflineRewardDoubled(false);
    setMessage('새 V4 저장을 시작했습니다. 기존 손상 저장은 복구 백업으로 보존되었습니다.');
  }, [storageStatus]);

  const closeOffline = useCallback(() => {
    offlineSummaryRef.current = null;
    setOfflineSummary(null);
  }, []);
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
    monetizationAvailable: Boolean(monetization),
    adFree: readAdFreeEntitlement(monetization),
    adsToday: readAdsToday(monetization),
    offlineRewardDoubled,
    offlineRewardPending,
    instantTaskPendingFacilities,
    interventionChargePending,
    adFreePurchasePending,
    doubleOfflineReward,
    instantTask,
    addInterventionCharge,
    intervene,
    buyAdFree,
    restorePurchases,
    restorePurchasesAvailable: canRestorePurchases(monetization),
    startRun,
    chooseStoryChoice: chooseStory,
    confirmRun,
    confirmUnlock,
    upgrade,
    importLegacyHero,
    startFreshSave,
    closeOffline,
    closeMessage,
  };
}
