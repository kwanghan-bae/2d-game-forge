import { useCallback, useEffect, useRef, useState } from 'react';
import {
  advanceHeroAutonomy,
  completeFacilityTasks,
} from './domain';
import {
  createInitialVillageSave,
  persistVillageSave,
  readVillageSave,
  simulateOfflineProgress,
  startFreshVillageSave,
  Village_LIVE_REFRESH_GAP_MS,
} from './save';
import type { OfflineSummary, VillageSaveEnvelope } from './types';
import {
  recordFinishedVillageExpedition,
  recordVillageSaveMetric,
} from './telemetry';

interface VillagePersistenceOptions {
  onOfflineResult?: () => void;
}

/** Owns the local save lifecycle, offline settlement, and presentation clock. */
export function useVillagePersistence({ onOfflineResult }: VillagePersistenceOptions = {}) {
  const [boot] = useState(() => {
    const loaded = readVillageSave();
    return {
      loaded,
      save: loaded.status === 'valid' ? loaded.save : createInitialVillageSave(Date.now()),
    };
  });
  const [save, setSave] = useState<VillageSaveEnvelope>(() => boot.save);
  const saveRef = useRef(save);
  const initialOfflineSettlementDone = useRef(false);
  const [storageStatus, setStorageStatus] = useState(() => boot.loaded.status);
  const [storageIssue] = useState(() => boot.loaded.status === 'invalid' ? boot.loaded.reason : null);
  const [clock, setClock] = useState(() => Date.now());
  const [offlineSummary, setOfflineSummary] = useState<OfflineSummary | null>(null);
  const offlineSummaryRef = useRef<OfflineSummary | null>(null);

  const updatePresentationClock = useCallback((timestamp: number) => {
    if (!Number.isFinite(timestamp)) return;
    setClock((previous) => Number.isFinite(previous)
      ? Math.max(previous, timestamp)
      : timestamp);
  }, []);

  useEffect(() => {
    if (boot.loaded.status === 'missing' || boot.loaded.status === 'unavailable') {
      recordVillageSaveMetric(boot.save, 'save_created', `save_created:${boot.save.createdAt}`, boot.save.createdAt);
    }
  }, [boot.loaded.status, boot.save]);

  const commit = useCallback((next: VillageSaveEnvelope) => {
    recordFinishedVillageExpedition(saveRef.current, next);
    saveRef.current = next;
    setSave(next);
    const persisted = persistVillageSave(next);
    setStorageStatus((previous) => previous === 'invalid' ? previous : persisted ? 'valid' : 'unavailable');
  }, []);

  const settleOffline = useCallback(() => {
    if (storageStatus === 'invalid') return;
    const timestamp = Date.now();
    updatePresentationClock(timestamp);
    const current = saveRef.current;
    const result = simulateOfflineProgress(current, timestamp);
    recordFinishedVillageExpedition(current, result.save);
    const shouldPersist = result.save !== current || storageStatus !== 'valid';
    if (shouldPersist) {
      saveRef.current = result.save;
      setSave(result.save);
      const persisted = persistVillageSave(result.save);
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
      onOfflineResult?.();
    }
  }, [onOfflineResult, storageStatus, updatePresentationClock]);

  useEffect(() => {
    if (initialOfflineSettlementDone.current) return;
    initialOfflineSettlementDone.current = true;
    settleOffline();
    // The initial state is intentionally processed once on mount. Subsequent
    // mutations use commit() and do not replay this effect.
  }, [settleOffline]);

  const refresh = useCallback(() => {
    const timestamp = Date.now();
    const current = saveRef.current;
    updatePresentationClock(timestamp);
    if (!Number.isFinite(timestamp) || timestamp < current.updatedAt) return;
    if (timestamp - current.updatedAt > Village_LIVE_REFRESH_GAP_MS) {
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

  const startFreshSave = useCallback((): boolean => {
    if (storageStatus !== 'invalid') return false;
    const next = startFreshVillageSave(undefined, Date.now());
    recordVillageSaveMetric(next, 'save_created', `save_created:${next.createdAt}`, next.createdAt);
    saveRef.current = next;
    setSave(next);
    setStorageStatus(persistVillageSave(next) ? 'valid' : 'unavailable');
    setOfflineSummary(null);
    return true;
  }, [storageStatus]);

  const closeOffline = useCallback(() => {
    offlineSummaryRef.current = null;
    setOfflineSummary(null);
  }, []);

  return {
    save,
    saveRef,
    storageStatus,
    storageIssue,
    now: clock,
    offlineSummary,
    offlineSummaryRef,
    commit,
    refresh,
    settleOffline,
    startFreshSave,
    closeOffline,
  };
}
