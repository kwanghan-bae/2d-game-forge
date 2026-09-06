import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  completeFacilityTasks,
  setV4Policy,
  startExpedition,
  startFacilityTask,
  upgradeFacility,
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
import type { FacilityId, OfflineSummary, RealmId, SupportAgentId, V4Policy, V4SaveEnvelope } from './types';

export function useV4Game() {
  const [save, setSave] = useState<V4SaveEnvelope>(() => loadV4Save() ?? createInitialV4Save(Date.now()));
  const [clock, setClock] = useState(() => Date.now());
  const [offlineSummary, setOfflineSummary] = useState<OfflineSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const result = simulateOfflineProgress(save, Date.now());
    setSave(result.save);
    persistV4Save(result.save);
    if (result.summary.processedSeconds > 0 || result.summary.clockAnomaly) {
      setOfflineSummary(result.summary);
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
      || Boolean(save.run.expedition && save.run.expedition.completesAt <= timestamp);
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

  const startRun = useCallback((realmId: RealmId, agentId: SupportAgentId | null = null) => {
    const result = startExpedition(save, realmId, Date.now(), save.run.policy, agentId);
    if (result.ok) commit(result.save, '원정을 출발시켰습니다.');
    else setMessage(result.error);
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
    startRun,
    upgrade,
    importLegacyHero,
    closeOffline,
    closeMessage,
  };
}
