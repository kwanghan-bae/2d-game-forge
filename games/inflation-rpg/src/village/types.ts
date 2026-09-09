export type VillageCurrencyKey = 'spirit' | 'gold' | 'materials' | 'rift';
export type VillagePolicy = 'aggression' | 'hoarding' | 'training';
export type InterventionType = 'heal' | 'retreat';
export type FacilityId =
  | 'temple'
  | 'recovery'
  | 'blacksmith'
  | 'training'
  | 'mudang'
  | 'expedition'
  | 'archive';
export type SupportAgentId = 'blacksmith' | 'mudang' | 'guide';
export type RealmId = 'sacred_fields' | 'deep_forest' | 'underworld';
export type EncounterTier = 'normal' | 'elite' | 'boss';
export type StoryChoiceOptionId = 'protect_flame' | 'release_goblin';

export const Village_MAX_SAGA_ENTRIES = 200;
export const Village_MAX_INTERVENTION_CHARGES = 3;
export const Village_HERO_AUTONOMY_DELAY_MS = 15_000;

export interface RealmEncounterDefinition {
  id: string;
  tier: EncounterTier;
  nameKR: string;
  durationSeconds: number;
  risk: number;
  recommendedPower: number;
  enemyHpMultiplier: number;
  enemyAtkMultiplier: number;
}

export interface VillageHeroSnapshot {
  name: string;
  emoji: string;
  age: number;
  level: number;
  exp: number;
  hp: number;
  hpMax: number;
  atk: number;
  def: number;
  defBase: number;
  critRateBase: number;
  realmId: RealmId;
  equipmentIds: string[];
  /** Village equipment is a compact equipped loadout; repeated crafts increase its level. */
  equipmentLevels?: Record<string, number>;
  actionCount: number;
  rejuvenationCount: number;
  currentAction: 'rest' | 'train' | 'expedition';
}

export interface SupportAgent {
  id: SupportAgentId;
  nameKR: string;
  roleKR: string;
  level: number;
  trust: number;
  fatigue: number;
  trait: string;
  activeTaskId: string | null;
}

export interface FacilityState {
  id: FacilityId;
  level: number;
  activeTaskId: string | null;
}

export interface FacilityTask {
  id: string;
  facilityId: FacilityId;
  type: string;
  startedAt: number;
  completesAt: number;
  input: Partial<Record<VillageCurrencyKey, number>>;
  outputPreview: Partial<Record<VillageCurrencyKey, number>>;
  outputEquipmentIds?: string[];
  heroExpGain?: number;
  assignedAgentId: SupportAgentId | null;
}

export interface ExpeditionState {
  id: string;
  realmId: RealmId;
  policy: VillagePolicy;
  assignedAgentId: SupportAgentId | null;
  startedAt: number;
  completesAt: number;
  status: 'traveling' | 'awaiting_confirmation';
  /** New Village expeditions traverse normal → elite → boss. Omitted means a legacy single-boss save. */
  encounterIndex?: number;
  encountersCleared?: number;
  totalTurns?: number;
  totalDamageDealt?: number;
  totalDamageTaken?: number;
}

export interface ExpeditionResult {
  id: string;
  realmId: RealmId;
  outcome: 'victory' | 'defeat';
  completedAt: number;
  reward: Partial<Record<VillageCurrencyKey, number>>;
  heroPower: number;
  recommendedPower: number;
  turns: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  heroRemainingHp: number;
  weaknessKR: string;
  recommendedFacilityId: FacilityId;
  recommendedEquipmentId: string | null;
  retryAfterSeconds: number;
  /** Deterministic forecast shown before the encounter is resolved. */
  successChance?: number;
  encountersCleared?: number;
  totalEncounterCount?: number;
}

export interface SagaEntry {
  id: string;
  kind: 'birth' | 'facility' | 'expedition' | 'rejuvenation' | 'milestone';
  createdAt: number;
  title: string;
  text: string;
}

export interface StoryChoiceOption {
  id: StoryChoiceOptionId;
  title: string;
  text: string;
}

export interface StoryChoiceDefinition {
  id: 'deep_forest_embers';
  title: string;
  prompt: string;
  options: StoryChoiceOption[];
}

export interface VillageMetaState {
  currencies: Record<VillageCurrencyKey, number>;
  facilities: Record<FacilityId, FacilityState>;
  tasks: Record<string, FacilityTask>;
  agents: SupportAgent[];
  unlockedRealms: RealmId[];
  sagaEntries: SagaEntry[];
  settings: VillageSettings;
}

export interface VillageSettings {
  music: number;
  sfx: number;
  muted: boolean;
}

export interface VillageRunState {
  hero: VillageHeroSnapshot;
  policy: VillagePolicy;
  expedition: ExpeditionState | null;
  /** Optional so schema 1 saves created before result cards remain loadable. */
  lastExpeditionResult?: ExpeditionResult | null;
  interventionCharges: number;
}

export interface VillageSaveEnvelope {
  schemaVersion: 2;
  createdAt: number;
  updatedAt: number;
  lastProcessedAt: number;
  meta: VillageMetaState;
  run: VillageRunState;
}

export interface OfflineSummary {
  processedSeconds: number;
  efficiency: number;
  completedTaskIds: string[];
  completedExpedition: boolean;
  resourcesGained: Partial<Record<VillageCurrencyKey, number>>;
  equipmentGained: string[];
  equipmentUpgraded: string[];
  wasClamped: boolean;
  clockAnomaly: 'backwards' | 'future' | 'invalid' | null;
  notes: string[];
}

export interface HeroDecisionContext {
  hp: number;
  hpMax: number;
  policy: VillagePolicy;
  expeditionAvailable: boolean;
}

export type HeroAction = 'rest' | 'train' | 'expedition';

export type HeroAutonomyReason =
  | 'intervention_window'
  | 'low_hp'
  | 'aggression_policy'
  | 'hoarding_policy'
  | 'training_policy'
  | 'active_work'
  | 'active_expedition'
  | 'result_confirmation'
  | 'realm_confirmation'
  | 'insufficient_resources'
  | 'invalid_clock'
  | 'no_action';

export interface HeroAutonomyDecision {
  action: HeroAction;
  facilityId: FacilityId | null;
  realmId: RealmId | null;
  assignedAgentId: SupportAgentId | null;
  reason: HeroAutonomyReason;
}

export interface HeroAutonomyResult {
  save: VillageSaveEnvelope;
  decision: HeroAutonomyDecision;
  started: boolean;
  error?: string;
}

export interface BattleInput {
  heroAtk: number;
  heroDef: number;
  heroHp: number;
  enemyHp: number;
  enemyAtk: number;
  maxTurns?: number;
}

export interface BattleResult {
  won: boolean;
  turns: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  heroRemainingHp: number;
}

export interface ExpeditionForecast {
  realmId: RealmId;
  encounterIndex: number;
  battle: BattleResult;
  successChance: number;
  soloSuccessChance: number;
  guideSuccessChance: number;
  roll: number;
}

export interface RejuvenationResult {
  snapshot: VillageHeroSnapshot;
  yearsReduced: number;
  cost: number;
}

export interface VillageHeroRuntime {
  getSnapshot(): VillageHeroSnapshot;
  chooseAction(context: HeroDecisionContext): HeroAction;
  resolveBattle(input: BattleInput): BattleResult;
  rejuvenate(years: number): RejuvenationResult;
}
