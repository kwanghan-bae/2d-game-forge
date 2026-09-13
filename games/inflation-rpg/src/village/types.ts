export type VillageCurrencyKey = 'spirit' | 'gold' | 'materials' | 'rift';
export type VillagePolicy = 'aggression' | 'hoarding' | 'training';
export type InterventionType = 'heal' | 'retreat';
export type VillageSeason = 'spring' | 'summer' | 'autumn' | 'winter';
export type VillageWeather = 'clear' | 'rain' | 'fog' | 'wind';
export type VillageHeroPersonalityKey = 'courage' | 'caution' | 'compassion' | 'curiosity';
export type VillageHeroGoal = 'recover' | 'prepare' | 'explore' | 'support';
export type VillageAgentGoal = 'recover' | 'craft' | 'ward' | 'guide' | 'bond';
export type VillageAgentDecisionReason = 'fatigue' | 'specialty' | 'relationship' | 'weather' | 'routine' | 'conflict';
export type VillageAgentMemoryTag = 'observation' | 'choice' | 'success' | 'failure' | 'support' | 'conflict';
export type VillageAgentBeliefKind = 'hero_trust' | 'peer_trust' | 'supply_security' | 'weather_safety' | 'realm_threat';
export type VillageAgentBeliefSource = 'observation' | 'rumor' | 'outcome';
export type VillageAgentPlanStepKind = 'observe' | 'prepare' | 'act' | 'recover' | 'reconcile';
export type VillageMemoryTag = 'victory' | 'defeat' | 'support' | 'event' | 'choice';
export type VillageWorldEventType = 'weather' | 'social' | 'supply' | 'omen';
export type VillageWorldEventOutcome = 'chosen' | 'expired';
export type VillageFactionId = 'village' | 'merchants' | 'spirits';
export type VillageWorldChainKind = 'weather_supply' | 'supply_social' | 'social_omen' | 'omen_weather';
export type VillageAIDecisionKind = 'hero_action' | 'agent_goal';
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
export const Village_MAX_AI_MEMORIES = 50;
export const Village_MAX_AGENT_MEMORIES = 24;
export const Village_MAX_AGENT_BELIEFS = 18;
export const Village_MAX_PENDING_WORLD_EVENTS = 3;
export const Village_MAX_RESOLVED_WORLD_EVENTS = 120;
export const Village_MAX_WORLD_EVENT_HISTORY = 120;
export const Village_MAX_WORLD_CHAINS = 3;
export const Village_MAX_WORLD_CHAIN_STEP = 2;
export const Village_MAX_AI_DECISION_HISTORY = 240;
export const Village_SIMULATION_VERSION = 1 as const;

export interface VillageHeroPersonality {
  courage: number;
  caution: number;
  compassion: number;
  curiosity: number;
}

export interface VillageHeroNeeds {
  fatigue: number;
  morale: number;
  purpose: number;
}

export interface VillageMemory {
  id: string;
  tag: VillageMemoryTag;
  summary: string;
  valence: number;
  salience: number;
  createdAt: number;
}

export interface VillageAIWorldState {
  day: number;
  season: VillageSeason;
  weather: VillageWeather;
  prosperity: number;
  threatByRealm: Record<RealmId, number>;
  lastSimulatedDay: number;
  /** Additive schema 3 world-dynamics extension; old saves omit these fields. */
  factions?: Record<VillageFactionId, VillageFactionState>;
  chains?: VillageWorldChainState[];
}

export interface VillageFactionState {
  /** Normalized relationship between the faction and the village. */
  trust: number;
  /** Normalized ability to shape the next world event. */
  influence: number;
  /** Normalized internal pressure that makes escalation more likely. */
  tension: number;
  lastActionDay: number;
}

export interface VillageWorldChainState {
  id: string;
  kind: VillageWorldChainKind;
  factionId: VillageFactionId;
  /** The last resolved step. The next generated event increments this value. */
  step: number;
  /** Causal momentum in the -1..1 range; it changes delay and outcome tone. */
  momentum: number;
  nextDay: number;
  pendingEventId: string | null;
  lastEventId: string;
}

export interface VillageAILastDecision {
  action: HeroAction;
  reason: HeroAutonomyReason;
  confidence: number;
  decidedAt: number;
}

export interface VillageAIHeroState {
  personality: VillageHeroPersonality;
  needs: VillageHeroNeeds;
  currentGoal: VillageHeroGoal;
  memories: VillageMemory[];
  lastDecision: VillageAILastDecision | null;
}

export interface VillageAgentSchedule {
  goal: VillageAgentGoal;
  startTick: number;
  endTick: number;
  reason: VillageAgentDecisionReason;
}

export interface VillageAgentMemory {
  id: string;
  tag: VillageAgentMemoryTag;
  summary: string;
  valence: number;
  salience: number;
  createdAt: number;
  relatedAgentId: SupportAgentId | null;
}

export interface VillageAgentBelief {
  id: string;
  kind: VillageAgentBeliefKind;
  subject: 'hero' | 'village' | SupportAgentId | RealmId;
  /** Beliefs are normalized to 0..1; meaning depends on `kind`. */
  value: number;
  confidence: number;
  source: VillageAgentBeliefSource;
  updatedAt: number;
}

export interface VillageAgentPlanStep {
  kind: VillageAgentPlanStepKind;
  labelKR: string;
}

export interface VillageAgentPlanState {
  goal: VillageAgentGoal;
  steps: VillageAgentPlanStep[];
  currentStep: number;
  createdAtTick: number;
  expiresAtTick: number;
  interruptionCount: number;
  lastReplannedTick: number;
}

export interface VillageAgentCognitionState {
  memories: VillageAgentMemory[];
  beliefs: VillageAgentBelief[];
  plan: VillageAgentPlanState | null;
}

export interface VillageAgentAIState {
  goal: VillageAgentGoal;
  goalProgress: number;
  stress: number;
  /** Directed affinity toward each support agent. Self-affinity is always 0. */
  relationships: Record<SupportAgentId, number>;
  schedule: VillageAgentSchedule;
  lastDecisionTick: number;
  /** Optional only for reading pre-AI-03A schema 3 saves. */
  cognition?: VillageAgentCognitionState;
}

export interface VillageWorldEventEffects {
  currencyDelta?: Partial<Record<VillageCurrencyKey, number>>;
  heroMoraleDelta?: number;
  heroFatigueDelta?: number;
  heroPurposeDelta?: number;
  agentTrustDelta?: Partial<Record<SupportAgentId, number>>;
  agentFatigueDelta?: Partial<Record<SupportAgentId, number>>;
  realmThreatDelta?: Partial<Record<RealmId, number>>;
  factionTrustDelta?: Partial<Record<VillageFactionId, number>>;
  factionInfluenceDelta?: Partial<Record<VillageFactionId, number>>;
  factionTensionDelta?: Partial<Record<VillageFactionId, number>>;
  prosperityDelta?: number;
}

export interface VillageWorldEventChoice {
  id: string;
  title: string;
  text: string;
  effects: VillageWorldEventEffects;
}

export interface VillageWorldEvent {
  id: string;
  type: VillageWorldEventType;
  day: number;
  createdAt: number;
  expiresAt: number;
  title: string;
  cause: string;
  prompt: string;
  choices: VillageWorldEventChoice[];
  /** Optional causal metadata; base events from older schema 3 saves omit it. */
  chainId?: string;
  chainKind?: VillageWorldChainKind;
  chainStep?: number;
  factionId?: VillageFactionId;
  parentEventId?: string;
}

export interface VillageWorldEventRecord {
  eventId: string;
  type: VillageWorldEventType;
  day: number;
  choiceId: string | null;
  outcome: VillageWorldEventOutcome;
  resolvedAt: number;
  chainId?: string;
  chainKind?: VillageWorldChainKind;
  chainStep?: number;
  factionId?: VillageFactionId;
  parentEventId?: string;
}

export interface VillageAIDecisionRecord {
  id: string;
  actor: 'hero' | SupportAgentId;
  kind: VillageAIDecisionKind;
  value: HeroAction | VillageAgentGoal;
  reason: HeroAutonomyReason | VillageAgentDecisionReason;
  day: number;
  decidedAt: number;
}

export interface VillageSimulationState {
  version: typeof Village_SIMULATION_VERSION;
  seed: number;
  tick: number;
  lastSimulatedAt: number;
  eventHistory: VillageWorldEventRecord[];
  /** Additive schema 3 journal used for local replay and diversity audits. */
  decisionHistory?: VillageAIDecisionRecord[];
}

export interface VillageAIState {
  version: 1;
  seed: number;
  world: VillageAIWorldState;
  hero: VillageAIHeroState;
  pendingEvents: VillageWorldEvent[];
  resolvedEventIds: string[];
  /** Optional only for reading pre-AI-02 schema 3 saves; new writes include all three brains. */
  agentBrains?: Record<SupportAgentId, VillageAgentAIState>;
}

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
  equipmentLevels: Record<string, number>;
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
  /** Every expedition traverses normal → elite → boss in this order. */
  encounterIndex: number;
  encountersCleared: number;
  totalTurns: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
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
  successChance: number;
  encountersCleared: number;
  totalEncounterCount: number;
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
  simulation: VillageSimulationState;
  ai: VillageAIState;
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
  lastExpeditionResult: ExpeditionResult | null;
  interventionCharges: number;
}

export interface VillageSaveEnvelope {
  schemaVersion: 3;
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
  | 'world_event'
  | 'insufficient_resources'
  | 'invalid_clock'
  | 'no_action';

export interface HeroAutonomyDecision {
  action: HeroAction;
  facilityId: FacilityId | null;
  realmId: RealmId | null;
  assignedAgentId: SupportAgentId | null;
  reason: HeroAutonomyReason;
  /** Optional explanation fields used by the human-readable AI forecast. */
  score?: number;
  confidence?: number;
  rationale?: string;
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
