import type { useVillageGame } from './useVillageGame';
import { ExpeditionScreen } from './screens/ExpeditionScreen';
import { HeroDetailScreen } from './screens/HeroDetailScreen';
import { SagaScreen } from './screens/SagaScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TownHubScreen } from './screens/TownHubScreen';
import type { VillageScreen } from './VillageChrome';
import type { VillageOnboardingSummary } from './telemetry';

type VillageGame = ReturnType<typeof useVillageGame>;

interface VillageScreenRouterProps {
  screen: VillageScreen;
  game: VillageGame;
  onNavigate: (screen: VillageScreen) => void;
  onboardingSummary: VillageOnboardingSummary;
}

export function VillageScreenRouter({ screen, game, onNavigate, onboardingSummary }: VillageScreenRouterProps) {
  if (screen === 'town') {
    return (
      <TownHubScreen
        save={game.save}
        now={game.now}
        onPolicyChange={game.changePolicy}
        onStartTask={game.startTask}
        onCancelTask={game.cancelTask}
        onRestAgent={game.restSupportAgent}
        onInstantTask={game.monetizationAvailable ? game.instantTask : undefined}
        instantTaskPendingFacilities={game.instantTaskPendingFacilities}
        onRefresh={game.refresh}
        onUpgrade={game.upgrade}
        onNavigate={onNavigate}
        onIntervention={game.intervene}
        monetizationAvailable={game.monetizationAvailable}
        adFree={game.adFree}
        adsToday={game.adsToday}
        adFreePurchasePending={game.adFreePurchasePending}
        interventionChargePending={game.interventionChargePending}
        onInterventionCharge={game.addInterventionCharge}
        onBuyAdFree={game.buyAdFree}
      />
    );
  }

  if (screen === 'hero') {
    return (
      <HeroDetailScreen
        hero={game.save.run.hero}
        gold={game.save.meta.currencies.gold}
        expeditionActive={Boolean(game.save.run.expedition)}
        onBack={() => onNavigate('town')}
        onRejuvenate={game.rejuvenate}
      />
    );
  }

  if (screen === 'expedition') {
    return (
      <ExpeditionScreen
        save={game.save}
        now={game.now}
        onStart={game.startRun}
        onConfirm={game.confirmRun}
        onConfirmUnlock={game.confirmUnlock}
        onRefresh={game.refresh}
        onIntervention={game.intervene}
        onOpenSaga={() => onNavigate('saga')}
        onBack={() => onNavigate('town')}
      />
    );
  }

  if (screen === 'saga') {
    return (
      <SagaScreen
        entries={game.save.meta.sagaEntries}
        storyChoice={game.storyChoice}
        onChooseStoryChoice={game.chooseStoryChoice}
        onBack={() => onNavigate('town')}
      />
    );
  }

  return (
    <SettingsScreen
      settings={game.save.meta.settings}
      onChange={game.updateSettings}
      onBack={() => onNavigate('town')}
      onRestorePurchases={game.restorePurchasesAvailable ? game.restorePurchases : undefined}
      onboardingSummary={onboardingSummary}
    />
  );
}
