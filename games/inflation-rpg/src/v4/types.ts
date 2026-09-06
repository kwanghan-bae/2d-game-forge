export type V4CurrencyKey = 'spirit' | 'gold' | 'materials' | 'rift';
export type V4Policy = 'aggression' | 'hoarding' | 'training';
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
export type RealmId = 'joseon_plains' | 'deep_forest' | 'underworld';
export type EncounterTier = 'normal' | 'elite' | 'boss';

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

export interface V4HeroSnapshot {
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
  input: Partial<Record<V4CurrencyKey, number>>;
  outputPreview: Partial<Record<V4CurrencyKey, number>>;
  outputEquipmentIds?: string[];
  heroExpGain?: number;
  assignedAgentId: SupportAgentId | null;
}

export interface ExpeditionState {
  id: string;
  realmId: RealmId;
  policy: V4Policy;
  assignedAgentId: SupportAgentId | null;
  startedAt: number;
  completesAt: number;
  status: 'traveling' | 'awaiting_confirmation';
}

export interface ExpeditionResult {
  id: string;
  realmId: RealmId;
  outcome: 'victory' | 'defeat';
  completedAt: number;
  reward: Partial<Record<V4CurrencyKey, number>>;
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
}

export interface SagaEntry {
  id: string;
  kind: 'birth' | 'facility' | 'expedition' | 'rejuvenation' | 'milestone';
  createdAt: number;
  title: string;
  text: string;
}

export interface V4MetaState {
  currencies: Record<V4CurrencyKey, number>;
  facilities: Record<FacilityId, FacilityState>;
  tasks: Record<string, FacilityTask>;
  agents: SupportAgent[];
  unlockedRealms: RealmId[];
  sagaEntries: SagaEntry[];
  settings: { music: number; sfx: number; muted: boolean };
}

export interface V4RunState {
  hero: V4HeroSnapshot;
  policy: V4Policy;
  expedition: ExpeditionState | null;
  /** Optional so schema 1 saves created before result cards remain loadable. */
  lastExpeditionResult?: ExpeditionResult | null;
  interventionCharges: number;
}

export interface V4SaveEnvelope {
  schemaVersion: 1;
  createdAt: number;
  updatedAt: number;
  lastProcessedAt: number;
  meta: V4MetaState;
  run: V4RunState;
}

export interface OfflineSummary {
  processedSeconds: number;
  efficiency: number;
  completedTaskIds: string[];
  completedExpedition: boolean;
  resourcesGained: Partial<Record<V4CurrencyKey, number>>;
  equipmentGained: string[];
  wasClamped: boolean;
  clockAnomaly: 'backwards' | 'future' | null;
  notes: string[];
}

export interface HeroDecisionContext {
  hp: number;
  hpMax: number;
  policy: V4Policy;
  expeditionAvailable: boolean;
}

export type HeroAction = 'rest' | 'train' | 'expedition';

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

export interface RejuvenationResult {
  snapshot: V4HeroSnapshot;
  yearsReduced: number;
  cost: number;
}

export interface V4HeroRuntime {
  getSnapshot(): V4HeroSnapshot;
  chooseAction(context: HeroDecisionContext): HeroAction;
  resolveBattle(input: BattleInput): BattleResult;
  rejuvenate(years: number): RejuvenationResult;
}
