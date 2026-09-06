import { useEffect, useState, type CSSProperties } from 'react';
import type { StartGameConfig } from '../types';
import { POLICY_LABELS } from './data';
import { createNativeV4Monetization, type V4MonetizationAdapter } from './monetization';
import { useV4Game } from './useV4Game';
import { ExpeditionScreen } from './screens/ExpeditionScreen';
import { HeroDetailScreen } from './screens/HeroDetailScreen';
import { OfflineResultScreen } from './screens/OfflineResultScreen';
import { SagaScreen } from './screens/SagaScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TownHubScreen } from './screens/TownHubScreen';
import './styles.css';

type V4Screen = 'town' | 'hero' | 'expedition' | 'saga' | 'settings';

interface Props { config: StartGameConfig; }

const RESOURCES = [
  ['spirit', '신력', '✨'],
  ['gold', '금화', '🪙'],
  ['materials', '재료', '🧱'],
  ['rift', '균열석', '🪨'],
] as const;

export function V4App({ config }: Props) {
  const [nativeMonetization, setNativeMonetization] = useState<V4MonetizationAdapter | undefined>(undefined);
  useEffect(() => {
    if (config.v4Monetization || nativeMonetization) return;
    const capacitor = (window as Window & {
      Capacitor?: { isNativePlatform?: () => boolean };
    }).Capacitor;
    if (!capacitor?.isNativePlatform?.()) return;

    let cancelled = false;
    void createNativeV4Monetization().then(async (handle) => {
      const initialized = await handle.initialize();
      if (!cancelled && initialized) setNativeMonetization(handle.adapter);
    }).catch(() => {
      // Native monetization is optional; failure leaves the core loop playable.
    });
    return () => { cancelled = true; };
  }, [config.v4Monetization, nativeMonetization]);

  const game = useV4Game(config.v4Monetization ?? nativeMonetization);
  const [screen, setScreen] = useState<V4Screen>('town');

  useEffect(() => {
    const timer = window.setInterval(game.refresh, 1000);
    return () => window.clearInterval(timer);
  }, [game.refresh]);

  return (
    <div
      className="v4-shell"
      data-assets-base={config.assetsBasePath}
      data-testid="v4-app"
      style={{ '--v4-world-bg': `url(${config.assetsBasePath}/images/title_bg.png)` } as CSSProperties}
    >
      <div className="v4-container">
        <header className="v4-header">
          <div><div className="v4-kicker">LOCAL-FIRST · V4</div><h1 className="v4-title">신의 마을: 영원의 후원자</h1><p className="v4-subtitle">한 명의 영웅, 일곱 시설, 끝나지 않는 사가</p></div>
          <div className="v4-header-actions">
            <div className="v4-action">{POLICY_LABELS[game.save.run.policy]}</div>
            <button type="button" className="v4-btn v4-btn--quiet" onClick={() => setScreen('settings')}>⚙ 설정</button>
          </div>
        </header>
        <div className="v4-resource-row" aria-label="보유 재화">
          {RESOURCES.map(([key, label, icon]) => <div className="v4-resource" key={key}><span className="v4-resource-label">{icon} {label}</span><strong className="v4-resource-value">{game.save.meta.currencies[key].toLocaleString('ko-KR')}</strong></div>)}
        </div>
        {game.message && <div className="v4-alert" role="status">{game.message}<button type="button" className="v4-btn v4-btn--quiet" style={{ float: 'right', minHeight: 24, padding: '2px 6px' }} onClick={game.closeMessage}>닫기</button></div>}
      </div>

      {screen === 'town' && <TownHubScreen save={game.save} now={game.now} onPolicyChange={game.changePolicy} onStartTask={game.startTask} onCancelTask={game.cancelTask} onRestAgent={game.restSupportAgent} onInstantTask={game.monetizationAvailable ? game.instantTask : undefined} onRefresh={game.refresh} onUpgrade={game.upgrade} onNavigate={setScreen} onIntervention={game.intervene} monetizationAvailable={game.monetizationAvailable} adFree={game.adFree} adsToday={game.adsToday} onInterventionCharge={game.addInterventionCharge} onBuyAdFree={game.buyAdFree} />}
      {screen === 'hero' && <HeroDetailScreen hero={game.save.run.hero} gold={game.save.meta.currencies.gold} expeditionActive={Boolean(game.save.run.expedition)} onBack={() => setScreen('town')} onImportLegacy={game.importLegacyHero} onRejuvenate={game.rejuvenate} />}
      {screen === 'expedition' && <ExpeditionScreen save={game.save} now={game.now} onStart={game.startRun} onConfirm={game.confirmRun} onRefresh={game.refresh} onIntervention={game.intervene} onBack={() => setScreen('town')} />}
      {screen === 'saga' && <SagaScreen entries={game.save.meta.sagaEntries} onBack={() => setScreen('town')} />}
      {screen === 'settings' && <SettingsScreen settings={game.save.meta.settings} onChange={game.updateSettings} onBack={() => setScreen('town')} />}

      <nav className="v4-nav" aria-label="주요 메뉴"><div className="v4-nav-inner">
        {([['town', '🏘️ 마을'], ['hero', '⚔️ 영웅'], ['expedition', '🧭 원정'], ['saga', '📜 사가']] as Array<[V4Screen, string]>).map(([id, label]) => <button type="button" key={id} className={`v4-nav-btn ${screen === id ? 'v4-nav-btn--active' : ''}`} onClick={() => setScreen(id)}>{label}</button>)}
      </div></nav>

      {game.offlineSummary && <OfflineResultScreen summary={game.offlineSummary} onClose={game.closeOffline} onDoubleReward={game.monetizationAvailable ? game.doubleOfflineReward : undefined} canDoubleReward={!game.offlineRewardDoubled} adsToday={game.adsToday} adFree={game.adFree} />}
    </div>
  );
}
