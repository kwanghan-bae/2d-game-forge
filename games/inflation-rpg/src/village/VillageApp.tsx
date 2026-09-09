import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { StartGameConfig } from '../types';
import type { OfflineSummary } from './types';
import {
  claimSoundOwner,
  playBgm,
  releaseSoundOwner,
  setVolumes,
  stopAmbient,
} from '../systems/sound';
import { getVillagePolicyName } from './data';
import { createNativeVillageMonetization, type NativeVillageMonetizationHandle, type VillageMonetizationAdapter } from './monetization';
import { useVillageGame } from './useVillageGame';
import { ExpeditionScreen } from './screens/ExpeditionScreen';
import { HeroDetailScreen } from './screens/HeroDetailScreen';
import { OfflineResultScreen } from './screens/OfflineResultScreen';
import { SagaScreen } from './screens/SagaScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TownHubScreen } from './screens/TownHubScreen';
import { VillageSaveRecoveryScreen } from './screens/VillageSaveRecoveryScreen';
import { readVillageMetricEvents, recordVillageMetric, summarizeVillageOnboarding } from './telemetry';
import { PRODUCT_GENRE, PRODUCT_TITLE, VILLAGE_GUARDIAN_SHEET_FILENAME, VILLAGE_TITLE_BACKGROUND_FILENAME } from './identity';
import './styles.css';

type VillageScreen = 'town' | 'hero' | 'expedition' | 'saga' | 'settings';

interface Props { config: StartGameConfig; }

const RESOURCES = [
  ['spirit', '신력', '✨'],
  ['gold', '금화', '🪙'],
  ['materials', '재료', '🧱'],
  ['rift', '균열석', '🪨'],
] as const;

function formatHeaderResource(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0';
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value))).toLocaleString('ko-KR');
}

function normalizeVolume(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : 0;
}

export function VillageApp({ config }: Props) {
  const soundOwner = useRef(Symbol('village-app-audio')).current;
  const [nativeMonetization, setNativeMonetization] = useState<VillageMonetizationAdapter | undefined>(undefined);
  const nativeMonetizationPromise = useRef<ReturnType<typeof createNativeVillageMonetization> | null>(null);
  const nativeMonetizationLifecycleToken = useRef<symbol | null>(null);
  const disposedNativeHandles = useRef(new WeakSet<object>());

  const disposeNativeHandle = (handle: NativeVillageMonetizationHandle): Promise<void> => {
    if (disposedNativeHandles.current.has(handle)) return Promise.resolve();
    disposedNativeHandles.current.add(handle);
    try {
      return Promise.resolve(handle.dispose?.()).then(() => undefined);
    } catch {
      return Promise.resolve();
    }
  };

  useEffect(() => {
    const token = Symbol('village-monetization-lifecycle');
    nativeMonetizationLifecycleToken.current = token;
    return () => {
      const pendingHandle = nativeMonetizationPromise.current;
      // React StrictMode may tear down and immediately recreate effects during
      // development. Defer the disposal check until the replacement effect
      // has had a chance to claim the lifecycle token.
      void Promise.resolve().then(() => {
        if (nativeMonetizationLifecycleToken.current !== token) return;
        nativeMonetizationLifecycleToken.current = null;
        if (pendingHandle) {
          void pendingHandle.then((handle) => disposeNativeHandle(handle)).catch(() => {
            // Monetization cleanup is optional and must never block root unmount.
          });
        }
      });
    };
  }, []);

  useEffect(() => {
    if (config.villageMonetization || nativeMonetization) return;
    const capacitor = (window as Window & {
      Capacitor?: { isNativePlatform?: () => boolean };
    }).Capacitor;
    let isNativePlatform = false;
    try {
      isNativePlatform = Boolean(capacitor?.isNativePlatform?.());
    } catch {
      // A broken native bridge must not prevent the local-first game from booting.
      return;
    }
    if (!isNativePlatform) return;

    const handlePromise = nativeMonetizationPromise.current
      ?? (nativeMonetizationPromise.current = createNativeVillageMonetization());
    const lifecycleToken = nativeMonetizationLifecycleToken.current;
    let cancelled = false;
    void handlePromise.then(async (handle) => {
      try {
        if (cancelled) {
          // The empty-dependency lifecycle effect changes its token during a
          // StrictMode probe. Only the same live root token means that this
          // effect was replaced by a new monetization source.
          if (nativeMonetizationLifecycleToken.current === lifecycleToken) {
            await disposeNativeHandle(handle);
          }
          return;
        }
        const initialized = await handle.initialize();
        if (cancelled || !initialized) {
          if (!cancelled || nativeMonetizationLifecycleToken.current === lifecycleToken) {
            await disposeNativeHandle(handle);
          }
          return;
        }
        setNativeMonetization(handle.adapter);
      } catch {
        if (!cancelled || nativeMonetizationLifecycleToken.current === lifecycleToken) {
          await disposeNativeHandle(handle);
        }
      }
    }).catch(() => {
      // Native monetization is optional; failure leaves the core loop playable.
    });
    return () => { cancelled = true; };
  }, [config.villageMonetization, nativeMonetization]);

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
    // The legacy root and Phaser battle scenes share the global sound
    // manager. Clear those tracks at the Village boundary so SPA navigation cannot
    // leave legacy music or ambient audio playing over the new product.
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
      <div
        className="village-shell"
        data-assets-base={config.assetsBasePath}
        data-testid="village-app"
        style={{
          '--village-world-bg': `url(${config.assetsBasePath}/images/${VILLAGE_TITLE_BACKGROUND_FILENAME})`,
          '--village-hero-sprite': `url(${config.assetsBasePath}/images/${VILLAGE_GUARDIAN_SHEET_FILENAME})`,
        } as CSSProperties}
      >
        <div className="village-container">
          <header className="village-header">
            <div>
              <div className="village-kicker">{PRODUCT_GENRE}</div>
              <h1 className="village-title">{PRODUCT_TITLE}</h1>
            </div>
          </header>
          <VillageSaveRecoveryScreen reason={game.storageIssue ?? 'invalid_schema'} onStartFresh={game.startFreshSave} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="village-shell"
      data-assets-base={config.assetsBasePath}
      data-testid="village-app"
      style={{
        '--village-world-bg': `url(${config.assetsBasePath}/images/${VILLAGE_TITLE_BACKGROUND_FILENAME})`,
        '--village-hero-sprite': `url(${config.assetsBasePath}/images/${VILLAGE_GUARDIAN_SHEET_FILENAME})`,
      } as CSSProperties}
    >
      <div className="village-container">
        <header className="village-header">
          <div><div className="village-kicker">{PRODUCT_GENRE}</div><h1 className="village-title">{PRODUCT_TITLE}</h1><p className="village-subtitle">한 명의 영웅, 일곱 시설, 끝나지 않는 사가</p></div>
          <div className="village-header-actions">
            <div className="village-action">{getVillagePolicyName(game.save.run.policy)}</div>
            <button type="button" className="village-btn village-btn--quiet" onClick={() => setScreen('settings')}>⚙ 설정</button>
          </div>
        </header>
        {game.storageStatus === 'unavailable' && (
          <div className="village-alert" role="status" data-testid="village-storage-warning">
            기기 저장을 사용할 수 없습니다. 현재 세션은 진행되지만 앱을 닫으면 진행이 보존되지 않을 수 있습니다.
          </div>
        )}
        <div className="village-resource-row" aria-label="보유 재화">
          {RESOURCES.map(([key, label, icon]) => <div className="village-resource" key={key}><span className="village-resource-label">{icon} {label}</span><strong className="village-resource-value">{formatHeaderResource(game.save.meta.currencies[key])}</strong></div>)}
        </div>
        {game.message && <div className="village-alert" role="status"><span>{game.message}</span><button type="button" className="village-btn village-btn--quiet village-alert-close" onClick={game.closeMessage}>닫기</button></div>}
      </div>

      {screen === 'town' && <TownHubScreen save={game.save} now={game.now} onPolicyChange={game.changePolicy} onStartTask={game.startTask} onCancelTask={game.cancelTask} onRestAgent={game.restSupportAgent} onInstantTask={game.monetizationAvailable ? game.instantTask : undefined} instantTaskPendingFacilities={game.instantTaskPendingFacilities} onRefresh={game.refresh} onUpgrade={game.upgrade} onNavigate={setScreen} onIntervention={game.intervene} monetizationAvailable={game.monetizationAvailable} adFree={game.adFree} adsToday={game.adsToday} adFreePurchasePending={game.adFreePurchasePending} interventionChargePending={game.interventionChargePending} onInterventionCharge={game.addInterventionCharge} onBuyAdFree={game.buyAdFree} />}
      {screen === 'hero' && <HeroDetailScreen hero={game.save.run.hero} gold={game.save.meta.currencies.gold} expeditionActive={Boolean(game.save.run.expedition)} onBack={() => setScreen('town')} onImportLegacy={game.importLegacyHero} onRejuvenate={game.rejuvenate} />}
      {screen === 'expedition' && <ExpeditionScreen save={game.save} now={game.now} onStart={game.startRun} onConfirm={game.confirmRun} onConfirmUnlock={game.confirmUnlock} onRefresh={game.refresh} onIntervention={game.intervene} onOpenSaga={() => setScreen('saga')} onBack={() => setScreen('town')} />}
      {screen === 'saga' && <SagaScreen entries={game.save.meta.sagaEntries} storyChoice={game.storyChoice} onChooseStoryChoice={game.chooseStoryChoice} onBack={() => setScreen('town')} />}
      {screen === 'settings' && <SettingsScreen settings={game.save.meta.settings} onChange={game.updateSettings} onBack={() => setScreen('town')} onRestorePurchases={game.restorePurchasesAvailable ? game.restorePurchases : undefined} onboardingSummary={onboardingSummary} />}

      <nav className="village-nav" aria-label="주요 메뉴"><div className="village-nav-inner">
        {([['town', '🏘️ 마을'], ['hero', '⚔️ 영웅'], ['expedition', '🧭 원정'], ['saga', '📜 사가']] as Array<[VillageScreen, string]>).map(([id, label]) => <button type="button" key={id} className={`village-nav-btn ${screen === id ? 'village-nav-btn--active' : ''}`} aria-current={screen === id ? 'page' : undefined} onClick={() => setScreen(id)}>{label}</button>)}
      </div></nav>

      {game.offlineSummary && <OfflineResultScreen summary={game.offlineSummary} pendingExpeditionConfirmation={game.save.run.expedition?.status === 'awaiting_confirmation'} onClose={game.closeOffline} onOpenExpedition={() => setScreen('expedition')} onDoubleReward={game.monetizationAvailable ? game.doubleOfflineReward : undefined} canDoubleReward={!game.offlineRewardDoubled} doubleRewardPending={game.offlineRewardPending} adsToday={game.adsToday} adFree={game.adFree} />}
    </div>
  );
}
