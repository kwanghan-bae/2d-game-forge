// Compatibility façade for callers outside the village domain. Production domain modules import direct modules.
export {
  AGENT_REST_RECOVERY,
  MAX_INTERVENTION_CHARGES,
} from './domain/contracts';
export type {
  AgentDomainResult,
  DomainResult,
  FacilityTaskPreview,
  FacilityUpgradeCost,
  HeroDomainResult,
  InterventionDomainResult,
} from './domain/contracts';

export {
  advanceHeroActions,
  advanceHeroAutonomy,
  decideHeroAction,
  getHeroNextAction,
} from './domain/hero/autonomy';
export { getVillageHeroPower, rejuvenateHero } from './domain/hero/progression';
export {
  getBlacksmithEquipmentOutput,
  getBlacksmithEquipmentRecommendation,
  getFacilityTaskPreview,
} from './domain/facility/preview';
export { cancelFacilityTask, restAgent, startFacilityTask } from './domain/facility/tasks';
export { getFacilityUpgradeCost, upgradeFacility } from './domain/facility/upgrade';
export {
  getExpeditionForecast,
  getExpeditionSuccessChance,
  getNextRealmId,
} from './domain/expedition/forecast';
export {
  confirmNextRealmUnlock,
  confirmPendingExpedition,
  startExpedition,
} from './domain/expedition/commands';
export {
  completeFacilityTaskNow,
  completeFacilityTasks,
} from './domain/expedition/settlement';
export { chooseStoryChoice } from './domain/story/choices';
export { grantInterventionCharge, useIntervention } from './domain/intervention/commands';
export { grantOfflineResourceBonus } from './domain/rewards/offline';
export { setVillagePolicy, updateVillageSettings } from './domain/settings/commands';
export { getAvailableStoryChoice, hasVillageEpilogue } from './story';
