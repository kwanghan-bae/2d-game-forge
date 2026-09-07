import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  cancelFacilityTask,
  confirmPendingExpedition,
  completeFacilityTasks,
  completeFacilityTaskNow,
  confirmNextRealmUnlock,
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
} from './save';
import { useGameStore } from '../store/gameStore';
import type { HeroSnapshot } from '../hero/HeroEntity';
import type { V4MonetizationAdapter, V4RewardedPlacement } from './monetization';
import type { FacilityId, InterventionType, OfflineSummary, RealmId, SupportAgentId, V4Policy, V4SaveEnvelope, V4Settings } from './types';

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
  const initialOfflineSettlementDone = useRef(false);
  const [storageStatus, setStorageStatus] = useState(() => boot.loaded.status);
  const [storageIssue] = useState(() => boot.loaded.status === 'invalid' ? boot.loaded.reason : null);
  const [clock, setClock] = useState(() => Date.now());
  const [offlineSummary, setOfflineSummary] = useState<OfflineSummary | null>(null);
  const [offlineRewardDoubled, setOfflineRewardDoubled] = useState(false);
  const offlineRewardClaimInFlight = useRef(false);
  const instantTaskInFlight = useRef(new Set<FacilityId>());
  const interventionChargeInFlight = useRef(false);
  const [message, setMessage] = useState<string | null>(null);

  const commit = useCallback((next: V4SaveEnvelope, nextMessage?: string) => {
    saveRef.current = next;
    setSave(next);
    persistV4Save(next);
    if (nextMessage) setMessage(nextMessage);
  }, []);

  const settleOffline = useCallback(() => {
    if (storageStatus === 'invalid') return;
    const result = simulateOfflineProgress(saveRef.current, Date.now());
    saveRef.current = result.save;
    setSave(result.save);
    persistV4Save(result.save);
    if (result.summary.processedSeconds > 0 || result.summary.clockAnomaly) {
      setOfflineSummary(result.summary);
      setOfflineRewardDoubled(false);
    }
  }, [storageStatus]);

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
    setClock(timestamp);
    if (!Number.isFinite(timestamp) || timestamp < current.updatedAt) return;
    const hasDueWork = Object.values(current.meta.tasks).some((task) => task.completesAt <= timestamp)
      || Boolean(current.run.expedition
        && current.run.expedition.status === 'traveling'
        && current.run.expedition.completesAt <= timestamp);
    if (hasDueWork) {
      const next = completeFacilityTasks(current, timestamp);
      commit(next);
    }
  }, [commit]);

  const changePolicy = useCallback((policy: V4Policy) => {
    commit(setV4Policy(saveRef.current, policy, Date.now()));
  }, [commit]);

  const updateSettings = useCallback((patch: Partial<V4Settings>) => {
    commit(updateV4Settings(saveRef.current, patch, Date.now()));
  }, [commit]);

  const startTask = useCallback((facilityId: FacilityId, agentId: SupportAgentId | null = null) => {
    const result = startFacilityTask(saveRef.current, facilityId, Date.now(), agentId);
    if (result.ok) commit(result.save, `${result.task.type} 작업을 시작했습니다.`);
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
    const result = await monetization.watchRewarded(placement);
    if (result.granted) return true;
    const messages = {
      daily_limit: '오늘의 보상형 광고 횟수를 모두 사용했습니다.',
      provider_failed: '광고를 불러오지 못했습니다. 게임은 계속 진행됩니다.',
      not_purchased: '구매가 완료되지 않았습니다.',
      granted: '',
    } as const;
    setMessage(messages[result.reason]);
    return false;
  }, [monetization]);

  const doubleOfflineReward = useCallback(async () => {
    const hasPositiveResourceReward = Boolean(offlineSummary
      && Object.values(offlineSummary.resourcesGained).some((value) => Number.isFinite(value) && value > 0));
    if (!offlineSummary || !hasPositiveResourceReward || offlineRewardDoubled || offlineRewardClaimInFlight.current) return;
    offlineRewardClaimInFlight.current = true;
    try {
      if (!(await watchRewarded('offline_double'))) return;
      const current = saveRef.current;
      const next = grantOfflineResourceBonus(current, offlineSummary.resourcesGained, Date.now());
      if (next === current) {
        setMessage('저장 시각을 확인할 수 없어 오프라인 2배 보상을 적용하지 않았습니다.');
        return;
      }
      commit(next, '오프라인 재화 보상을 2배로 적용했습니다.');
      setOfflineRewardDoubled(true);
    } finally {
      offlineRewardClaimInFlight.current = false;
    }
  }, [commit, offlineRewardDoubled, offlineSummary, watchRewarded]);

  const instantTask = useCallback(async (facilityId: FacilityId) => {
    if (instantTaskInFlight.current.has(facilityId)) return;
    const current = saveRef.current;
    const activeTaskId = current.meta.facilities[facilityId]?.activeTaskId;
    if (!activeTaskId || !current.meta.tasks[activeTaskId]) {
      setMessage('즉시 완료할 작업이 없습니다.');
      return;
    }
    instantTaskInFlight.current.add(facilityId);
    try {
      if (!(await watchRewarded('instant_task'))) return;
      const result = completeFacilityTaskNow(saveRef.current, facilityId, Date.now());
      if (result.ok) commit(result.save, '광고 혜택으로 작업을 즉시 완료했습니다.');
      else setMessage(result.error);
    } finally {
      instantTaskInFlight.current.delete(facilityId);
    }
  }, [commit, watchRewarded]);

  const addInterventionCharge = useCallback(async () => {
    if (interventionChargeInFlight.current) return;
    if (saveRef.current.run.interventionCharges >= 3) {
      setMessage('개입 충전이 이미 가득 찼습니다.');
      return;
    }
    interventionChargeInFlight.current = true;
    try {
      if (!(await watchRewarded('intervention_charge'))) return;
      const current = saveRef.current;
      const next = grantInterventionCharge(current, Date.now());
      if (next === current) {
        setMessage('저장 시각을 확인할 수 없어 개입 충전을 적용하지 않았습니다.');
        return;
      }
      commit(next, '개입 충전을 1회 얻었습니다.');
    } finally {
      interventionChargeInFlight.current = false;
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
    const result = await monetization.buyAdFree();
    setMessage(result.granted ? '광고 제거가 적용되었습니다.' : '구매가 완료되지 않았습니다.');
  }, [monetization]);

  const startRun = useCallback((realmId: RealmId, agentId: SupportAgentId | null = null) => {
    const current = saveRef.current;
    const result = startExpedition(current, realmId, Date.now(), current.run.policy, agentId);
    if (result.ok) commit(result.save, '원정을 출발시켰습니다.');
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
    saveRef.current = next;
    setSave(next);
    setStorageStatus('valid');
    setOfflineSummary(null);
    setOfflineRewardDoubled(false);
    setMessage('새 V4 저장을 시작했습니다. 기존 손상 저장은 복구 백업으로 보존되었습니다.');
  }, [storageStatus]);

  const closeOffline = useCallback(() => setOfflineSummary(null), []);
  const closeMessage = useCallback(() => setMessage(null), []);
  const activeTasks = useMemo(() => Object.values(save.meta.tasks), [save.meta.tasks]);

  return {
    save,
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
    adFree: monetization?.isAdFree() ?? false,
    adsToday: monetization?.getAdsToday() ?? 0,
    offlineRewardDoubled,
    doubleOfflineReward,
    instantTask,
    addInterventionCharge,
    intervene,
    buyAdFree,
    startRun,
    confirmRun,
    confirmUnlock,
    upgrade,
    importLegacyHero,
    startFreshSave,
    closeOffline,
    closeMessage,
  };
}
