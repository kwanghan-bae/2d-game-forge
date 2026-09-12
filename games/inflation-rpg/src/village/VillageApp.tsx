import { useEffect, useMemo, useRef, useState } from 'react';
import type { StartGameConfig } from '../types';
import type { OfflineSummary } from './types';
import {
  claimSoundOwner,
  playBgm,
  releaseSoundOwner,
  setVolumes,
  stopAmbient,
} from '../systems/sound';
import { useVillageGame } from './useVillageGame';
import { OfflineResultScreen } from './screens/OfflineResultScreen';
import { VillageSaveRecoveryScreen } from './screens/VillageSaveRecoveryScreen';
import { readVillageMetricEvents, recordVillageMetric, summarizeVillageOnboarding } from './telemetry';
import {
  VillageFrame,
  VillageHeader,
  VillageMessage,
  VillageNavigation,
  VillageResourceBar,
  VillageStorageWarning,
  type VillageScreen,
} from './VillageChrome';
import { VillageScreenRouter } from './VillageScreenRouter';
import { useNativeVillageMonetization } from './useNativeVillageMonetization';
import './styles.css';

interface Props { config: StartGameConfig; }

function normalizeVolume(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : 0;
}

export function VillageApp({ config }: Props) {
  const soundOwner = useRef(Symbol('village-app-audio')).current;
  const nativeMonetization = useNativeVillageMonetization(config.villageMonetization);
  const game = useVillageGame(config.villageMonetization ?? nativeMonetization);
  const [screen, setScreen] = useState<VillageScreen>('town');
  const offlineSummaryMetricRef = useRef<OfflineSummary | null>(null);
  const onboardingSummary = useMemo(
    () => summarizeVillageOnboarding(readVillageMetricEvents(), game.save.createdAt),
    [game.save],
  );

  useEffect(() => {
    const summary = game.offlineSummary;
    if (!summary) {
      offlineSummaryMetricRef.current = null;
      return;
    }
    if (offlineSummaryMetricRef.current === summary) return;
    offlineSummaryMetricRef.current = summary;
    const id = `offline_summary_opened:${game.save.createdAt}:${game.save.updatedAt}`;
    recordVillageMetric({
      id,
      name: 'offline_summary_opened',
      occurredAt: Math.max(game.save.createdAt, game.now),
      saveCreatedAt: game.save.createdAt,
    });
  }, [game.offlineSummary, game.now, game.save.createdAt, game.save.updatedAt]);

  useEffect(() => {
    setVolumes(
      normalizeVolume(game.save.meta.settings.music),
      normalizeVolume(game.save.meta.settings.sfx),
      game.save.meta.settings.muted === true,
    );
  }, [game.save.meta.settings.music, game.save.meta.settings.sfx, game.save.meta.settings.muted]);

  useEffect(() => {
    // Claim the shared audio manager so a late unmount cannot silence a newer
    // game root during SPA navigation.
    claimSoundOwner(soundOwner);
    playBgm(null);
    stopAmbient();
    return () => {
      if (releaseSoundOwner(soundOwner)) {
        playBgm(null);
        stopAmbient();
      }
    };
  }, [soundOwner]);

  useEffect(() => {
    if (game.storageStatus === 'invalid') return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') game.refresh();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [game.refresh, game.storageStatus]);

  useEffect(() => {
    if (game.storageStatus === 'invalid') return;
    const settleOnResume = () => {
      if (document.visibilityState === 'hidden') return;
      game.settleOffline();
    };
    document.addEventListener('visibilitychange', settleOnResume);
    window.addEventListener('pageshow', settleOnResume);
    return () => {
      document.removeEventListener('visibilitychange', settleOnResume);
      window.removeEventListener('pageshow', settleOnResume);
    };
  }, [game.settleOffline, game.storageStatus]);

  if (game.storageStatus === 'invalid') {
    return (
      <VillageFrame config={config}>
        <div className="village-container">
          <VillageHeader mode="recovery" />
          <VillageSaveRecoveryScreen reason={game.storageIssue ?? 'invalid_schema'} onStartFresh={game.startFreshSave} />
        </div>
      </VillageFrame>
    );
  }

  return (
    <VillageFrame config={config}>
      <div className="village-container">
        <VillageHeader mode="normal" policy={game.save.run.policy} onOpenSettings={() => setScreen('settings')} />
        <VillageStorageWarning visible={game.storageStatus === 'unavailable'} />
        <VillageResourceBar currencies={game.save.meta.currencies} />
        <VillageMessage message={game.message} onClose={game.closeMessage} />
      </div>

      <VillageScreenRouter
        screen={screen}
        game={game}
        onNavigate={(nextScreen) => setScreen(nextScreen)}
        onboardingSummary={onboardingSummary}
      />

      <VillageNavigation screen={screen} onNavigate={(nextScreen) => setScreen(nextScreen)} />

      {game.offlineSummary && <OfflineResultScreen summary={game.offlineSummary} pendingExpeditionConfirmation={game.save.run.expedition?.status === 'awaiting_confirmation'} onClose={game.closeOffline} onOpenExpedition={() => setScreen('expedition')} onDoubleReward={game.monetizationAvailable ? game.doubleOfflineReward : undefined} canDoubleReward={!game.offlineRewardDoubled} doubleRewardPending={game.offlineRewardPending} adsToday={game.adsToday} adFree={game.adFree} />}
    </VillageFrame>
  );
}
