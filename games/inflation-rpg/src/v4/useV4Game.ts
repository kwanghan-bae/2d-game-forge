import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  cancelFacilityTask,
  confirmPendingExpedition,
  completeFacilityTasks,
  completeFacilityTaskNow,
  grantInterventionCharge,
  grantOfflineResourceBonus,
  rejuvenateHero,
  restAgent,
  setV4Policy,
  startExpedition,
  startFacilityTask,
  upgradeFacility,
  useIntervention,
} from './domain';
import {
  createInitialV4Save,
  importV3HeroSnapshot,
  loadV4Save,
  persistV4Save,
  simulateOfflineProgress,
} from './save';
import { useGameStore } from '../store/gameStore';
import type { HeroSnapshot } from '../hero/HeroEntity';
import type { V4MonetizationAdapter, V4RewardedPlacement } from './monetization';
import type { FacilityId, InterventionType, OfflineSummary, RealmId, SupportAgentId, V4Policy, V4SaveEnvelope } from './types';

export function useV4Game(monetization?: V4MonetizationAdapter) {
  const [save, setSave] = useState<V4SaveEnvelope>(() => loadV4Save() ?? createInitialV4Save(Date.now()));
  const [clock, setClock] = useState(() => Date.now());
  const [offlineSummary, setOfflineSummary] = useState<OfflineSummary | null>(null);
  const [offlineRewardDoubled, setOfflineRewardDoubled] = useState(false);
  const offlineRewardClaimInFlight = useRef(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const result = simulateOfflineProgress(save, Date.now());
    setSave(result.save);
    persistV4Save(result.save);
    if (result.summary.processedSeconds > 0 || result.summary.clockAnomaly) {
      setOfflineSummary(result.summary);
      setOfflineRewardDoubled(false);
    }
    // The initial state is intentionally processed once on mount. Subsequent
    // mutations use commit() and do not replay this effect.
  }, []);

  const commit = useCallback((next: V4SaveEnvelope, nextMessage?: string) => {
    setSave(next);
    persistV4Save(next);
    if (nextMessage) setMessage(nextMessage);
  }, []);

  const now = clock;
  const refresh = useCallback(() => {
    const timestamp = Date.now();
    setClock(timestamp);
    const hasDueWork = Object.values(save.meta.tasks).some((task) => task.completesAt <= timestamp)
      || Boolean(save.run.expedition
        && save.run.expedition.status === 'traveling'
        && save.run.expedition.completesAt <= timestamp);
    if (hasDueWork) {
      const next = completeFacilityTasks(save, timestamp);
      commit(next);
    }
  }, [commit, save]);

  const changePolicy = useCallback((policy: V4Policy) => {
    commit(setV4Policy(save, policy, Date.now()));
  }, [commit, save]);

  const startTask = useCallback((facilityId: FacilityId, agentId: SupportAgentId | null = null) => {
    const result = startFacilityTask(save, facilityId, Date.now(), agentId);
    if (result.ok) commit(result.save, `${result.task.type} 작업을 시작했습니다.`);
    else setMessage(result.error);
  }, [commit, save]);

  const cancelTask = useCallback((facilityId: FacilityId) => {
    const result = cancelFacilityTask(save, facilityId, Date.now());
    if (result.ok) commit(result.save, '작업을 취소하고 투입 재화를 돌려받았습니다.');
    else setMessage(result.error);
  }, [commit, save]);

  const restSupportAgent = useCallback((agentId: SupportAgentId) => {
    const result = restAgent(save, agentId, Date.now());
    if (result.ok) commit(result.save, '지원 에이전트가 휴식을 마쳤습니다.');
    else setMessage(result.error);
  }, [commit, save]);

  const rejuvenate = useCallback(() => {
    const result = rejuvenateHero(save, 5, Date.now());
    if (result.ok) commit(result.save, `영웅의 시간이 ${result.result.yearsReduced}년 되돌아갔습니다.`);
    else setMessage(result.error);
  }, [commit, save]);

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
    if (!offlineSummary || offlineRewardDoubled || offlineRewardClaimInFlight.current) return;
    offlineRewardClaimInFlight.current = true;
    try {
      if (!(await watchRewarded('offline_double'))) return;
      const next = grantOfflineResourceBonus(save, offlineSummary.resourcesGained, Date.now());
      commit(next, '오프라인 재화 보상을 2배로 적용했습니다.');
      setOfflineRewardDoubled(true);
    } finally {
      offlineRewardClaimInFlight.current = false;
    }
  }, [commit, offlineRewardDoubled, offlineSummary, save, watchRewarded]);

  const instantTask = useCallback(async (facilityId: FacilityId) => {
    if (!(await watchRewarded('instant_task'))) return;
    const result = completeFacilityTaskNow(save, facilityId, Date.now());
    if (result.ok) commit(result.save, '광고 혜택으로 작업을 즉시 완료했습니다.');
    else setMessage(result.error);
  }, [commit, save, watchRewarded]);

  const addInterventionCharge = useCallback(async () => {
    if (!(await watchRewarded('intervention_charge'))) return;
    commit(grantInterventionCharge(save, Date.now()), '개입 충전을 1회 얻었습니다.');
  }, [commit, save, watchRewarded]);

  const intervene = useCallback((type: InterventionType) => {
    const result = useIntervention(save, type, Date.now());
    if (result.ok) {
      commit(result.save, type === 'heal' ? '신의 개입으로 영웅을 즉시 회복했습니다.' : '신의 개입으로 원정에서 안전하게 후퇴했습니다.');
    } else {
      setMessage(result.error);
    }
  }, [commit, save]);

  const buyAdFree = useCallback(async () => {
    if (!monetization) {
      setMessage('현재 환경에서는 결제를 사용할 수 없습니다. 게임은 계속 진행됩니다.');
      return;
    }
    const result = await monetization.buyAdFree();
    setMessage(result.granted ? '광고 제거가 적용되었습니다.' : '구매가 완료되지 않았습니다.');
  }, [monetization]);

  const startRun = useCallback((realmId: RealmId, agentId: SupportAgentId | null = null) => {
    const result = startExpedition(save, realmId, Date.now(), save.run.policy, agentId);
    if (result.ok) commit(result.save, '원정을 출발시켰습니다.');
    else setMessage(result.error);
  }, [commit, save]);

  const confirmRun = useCallback(() => {
    if (save.run.expedition?.status !== 'awaiting_confirmation') return;
    commit(confirmPendingExpedition(save, Date.now()), '보류된 원정 결과를 확인했습니다.');
  }, [commit, save]);

  const upgrade = useCallback((facilityId: FacilityId) => {
    const result = upgradeFacility(save, facilityId, Date.now());
    if (result.ok) commit(result.save, '시설 레벨이 올랐습니다.');
    else setMessage(result.error);
  }, [commit, save]);

  const importLegacyHero = useCallback(() => {
    const legacySnapshot = useGameStore.getState().run?.heroSnapshot;
    if (!legacySnapshot) {
      setMessage('가져올 V3 영웅 기록이 없습니다. V3 Legacy에서 영웅을 먼저 후원하세요.');
      return;
    }
    const next = importV3HeroSnapshot(save, legacySnapshot as HeroSnapshot, Date.now());
    commit(next, 'V3 영웅 기록을 명시적으로 가져왔습니다.');
  }, [commit, save]);

  const closeOffline = useCallback(() => setOfflineSummary(null), []);
  const closeMessage = useCallback(() => setMessage(null), []);
  const activeTasks = useMemo(() => Object.values(save.meta.tasks), [save.meta.tasks]);

  return {
    save,
    now,
    offlineSummary,
    message,
    activeTasks,
    refresh,
    changePolicy,
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
    upgrade,
    importLegacyHero,
    closeOffline,
    closeMessage,
  };
}
