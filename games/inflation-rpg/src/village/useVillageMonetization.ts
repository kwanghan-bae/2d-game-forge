import { useCallback, useEffect, useRef, useState } from 'react';
import {
  completeFacilityTaskNow,
  grantInterventionCharge,
  grantOfflineResourceBonus,
} from './domain';
import {
  Village_DAILY_REWARDED_LIMIT,
  type VillageMonetizationAdapter,
  type VillageRewardedPlacement,
} from './monetization';
import type { FacilityId, OfflineSummary, VillageSaveEnvelope } from './types';
import { Village_MAX_INTERVENTION_CHARGES } from './types';

interface VillageMonetizationOptions {
  monetization?: VillageMonetizationAdapter;
  saveRef: { current: VillageSaveEnvelope };
  offlineSummaryRef: { current: OfflineSummary | null };
  commit: (next: VillageSaveEnvelope, nextMessage?: string) => void;
  setMessage: (message: string) => void;
  offlineRewardDoubled: boolean;
  markOfflineRewardDoubled: () => void;
}

function monotonicActionTimestamp(
  save: VillageSaveEnvelope,
  actionStartedAt: number,
  actionStartUpdatedAt: number,
): number {
  const timestamp = Date.now();
  if (!Number.isFinite(timestamp) || timestamp >= save.updatedAt) return timestamp;
  return actionStartedAt >= actionStartUpdatedAt && save.updatedAt <= actionStartUpdatedAt
    ? actionStartUpdatedAt
    : timestamp;
}

function readAdFreeEntitlement(monetization: VillageMonetizationAdapter | undefined): boolean {
  try {
    return monetization?.isAdFree() === true;
  } catch {
    return false;
  }
}

function readAdsToday(monetization: VillageMonetizationAdapter | undefined): number {
  try {
    const value = monetization?.getAdsToday();
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.min(Village_DAILY_REWARDED_LIMIT, Math.max(0, Math.floor(value)))
      : 0;
  } catch {
    return 0;
  }
}

function canRestorePurchases(monetization: VillageMonetizationAdapter | undefined): boolean {
  try {
    return monetization?.canRestorePurchases() === true;
  } catch {
    return false;
  }
}

export function useVillageMonetization({
  monetization,
  saveRef,
  offlineSummaryRef,
  commit,
  setMessage,
  offlineRewardDoubled,
  markOfflineRewardDoubled,
}: VillageMonetizationOptions) {
  const mountedRef = useRef(true);
  const [offlineRewardPending, setOfflineRewardPending] = useState(false);
  const [instantTaskPendingFacilities, setInstantTaskPendingFacilities] = useState<FacilityId[]>([]);
  const [interventionChargePending, setInterventionChargePending] = useState(false);
  const [, setMonetizationRevision] = useState(0);
  const offlineRewardClaimInFlight = useRef(false);
  const instantTaskInFlight = useRef(new Set<FacilityId>());
  const interventionChargeInFlight = useRef(false);
  const adFreePurchaseInFlight = useRef(false);
  const [adFreePurchasePending, setAdFreePurchasePending] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!monetization) return;
    return monetization.subscribe(() => {
      setMonetizationRevision((revision) => revision + 1);
    });
  }, [monetization]);

  const watchRewarded = useCallback(async (placement: VillageRewardedPlacement): Promise<boolean> => {
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
  }, [monetization, setMessage]);

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
      markOfflineRewardDoubled();
    } finally {
      offlineRewardClaimInFlight.current = false;
      if (mountedRef.current) setOfflineRewardPending(false);
    }
  }, [commit, markOfflineRewardDoubled, offlineRewardDoubled, offlineSummaryRef, saveRef, setMessage, watchRewarded]);

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
  }, [commit, saveRef, setMessage, watchRewarded]);

  const addInterventionCharge = useCallback(async () => {
    if (interventionChargeInFlight.current) return;
    const current = saveRef.current;
    if (current.run.interventionCharges >= Village_MAX_INTERVENTION_CHARGES) {
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
  }, [commit, saveRef, setMessage, watchRewarded]);

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
  }, [monetization, setMessage]);

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
  }, [monetization, setMessage]);

  return {
    monetizationAvailable: Boolean(monetization),
    adFree: readAdFreeEntitlement(monetization),
    adsToday: readAdsToday(monetization),
    offlineRewardPending,
    instantTaskPendingFacilities,
    interventionChargePending,
    adFreePurchasePending,
    doubleOfflineReward,
    instantTask,
    addInterventionCharge,
    buyAdFree,
    restorePurchases,
    restorePurchasesAvailable: canRestorePurchases(monetization),
  };
}
