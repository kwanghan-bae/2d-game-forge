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
export {
  advanceVillageWorld,
  getPendingVillageWorldEvents,
  resolveVillageWorldEvent,
} from './domain/ai/events';
export type { VillageWorldAdvanceResult, WorldEventDomainResult } from './domain/ai/events';
export { getHeroDecisionAnalysis } from './domain/ai/decision';
export {
  getVillageAgentAssignmentAnalysis,
  getVillageAgentPlan,
  getVillageAgentPlanAnalysis,
  VILLAGE_AGENT_MODE_LABELS,
  VILLAGE_AGENT_GOAL_LABELS,
} from './domain/ai/agents';
export {
  getVillageAgentBelief,
  getVillageAgentBeliefValue,
  observeVillageAgentWorld,
  recordVillageAgentBelief,
  recordVillageAgentMemory,
} from './domain/ai/cognition';
export { getVillageAgentCognitionState } from './domain/ai/state';
export {
  compareVillageAIReplay,
  getVillageAIBehaviorDiversity,
  getVillageAIReplayFingerprint,
} from './domain/ai/evaluation';
export {
  runVillageAIScenario,
  Village_AI_EVALUATION_DEFAULT_DAYS,
  Village_AI_EVALUATION_MAX_DAYS,
} from './domain/ai/scenario';
export type {
  VillageAgentAssignmentAnalysis,
  VillageAgentAssignmentCandidate,
  VillageAgentDuty,
  VillageAgentPlan,
  VillageAgentPlanAnalysis,
  VillageAgentPlanCandidate,
  VillageAgentMode,
} from './domain/ai/agents';
export type { VillageAIBehaviorDiversity, VillageAIReplayAudit } from './domain/ai/evaluation';
export type {
  VillageAIScenarioChoicePolicy,
  VillageAIScenarioOptions,
  VillageAIScenarioResult,
} from './domain/ai/scenario';
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
