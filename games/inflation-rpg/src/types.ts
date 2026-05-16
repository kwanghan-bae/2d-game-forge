import type { CycleHistoryEntry } from './cycle/cycleEvents';

export type StatKey = 'hp' | 'atk' | 'def' | 'agi' | 'luc';

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';
export type EquipmentRarity =
  | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface EquipmentStats {
  flat?: Partial<Record<StatKey, number>>;
  percent?: Partial<Record<StatKey, number>>;
}

export interface EquipmentBase {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  baseStats: EquipmentStats;
  dropAreaIds: string[];
  price: number;
}

export interface EquipmentInstance {
  instanceId: string;
  baseId: string;
  enhanceLv: number;
  modifiers: Modifier[];
}

export interface PassiveSkill {
  id: string;
  nameKR: string;
  description: string;
  effect: 'stat_boost' | 'beast_damage' | 'item_find' | 'life_conversion' | 'bp_ring';
  value: number;
}

export type ActiveSkillType =
  | 'multi_hit' | 'aoe' | 'heal' | 'buff' | 'execute'
  | 'debuff' | 'reflect';  // Phase D

export interface ActiveSkill {
  id: string;
  nameKR: string;
  description: string;
  cooldownSec: number;
  effect: {
    type: ActiveSkillType;
    multiplier?: number;
    targets?: number;
    healPercent?: number;
    buffStat?: StatKey;
    buffPercent?: number;
    buffDurationSec?: number;
    executeThreshold?: number;
    debuffStatPercent?: number;     // Phase D
    debuffDurationSec?: number;
    reflectPercent?: number;
    reflectDurationSec?: number;
  };
  vfxEmoji: string;
}

export type SkillKind = 'base' | 'ult';

export interface UltSkillRow extends ActiveSkill {
  charId: string;       // 'hwarang' | 'mudang' | 'choeui'
  ultIndex: 1 | 2 | 3 | 4;
}

export interface Character {
  id: string;
  nameKR: string;
  emoji: string;
  statFocus: string;
  statMultipliers: Record<StatKey, number>;
  passiveSkill: PassiveSkill;
  unlockSoulGrade: number;
  activeSkills: [ActiveSkill, ActiveSkill];
}

export interface Monster {
  id: string;
  nameKR: string;
  emoji: string;
  levelMin: number;
  levelMax: number;
  hpMult: number;
  atkMult: number;
  defMult: number;
  expMult: number;
  goldMult: number;
  isBoss: false;
  regionTags: string[];
}

export interface Boss {
  id: string;
  nameKR: string;
  emoji: string;
  areaId: string;
  bpReward: number;
  isHardMode: boolean;
  hpMult: number;
  atkMult: number;
  guaranteedDrop?: string;
  storyOnDefeat?: string;
}

export interface MapArea {
  id: string;
  nameKR: string;
  regionId: string;
  levelRange: [number, number];
  bossId?: string;
  isHardOnly: boolean;
  mapX: number;
  mapY: number;
  icon: string;
  stageCount: number;
  stageMonsterCount: number;
  finalStageIsBoss: boolean;
}

export type QuestType = 'kill_count' | 'boss_defeat' | 'item_collect';

export interface QuestTarget {
  monsterId?: string;
  bossId?: string;
  equipmentId?: string;
  count: number;
}

export interface QuestReward {
  gold?: number;
  bp?: number;
  equipmentId?: string;
}

export interface Quest {
  id: string;
  regionId: string;
  nameKR: string;
  description: string;
  type: QuestType;
  target: QuestTarget;
  reward: QuestReward;
}

export type AllocatedStats = Record<StatKey, number>;

export interface Inventory {
  weapons: EquipmentInstance[];
  armors: EquipmentInstance[];
  accessories: EquipmentInstance[];
}

export interface RunState {
  characterId: string;
  level: number;
  exp: number;
  bp: number;
  statPoints: number;
  allocated: AllocatedStats;
  currentDungeonId: string | null;   // Phase B-2 — 선택된 던전 ID, 미선택 시 null
  currentFloor: number;              // B-3α — 신 flow 던전 floor (1..N). 런 종료 시 1 로 리셋.
  isHardMode: boolean;
  monstersDefeated: number;
  goldThisRun: number;
  currentStage: number;
  dungeonRunMonstersDefeated: number;
  featherUsed: number;               // Phase E — revive count used this run (feather_of_fate + phoenix_feather)
  playerHp: number | null;           // [Phase Realms] null = hydrate to maxHp on next battle entry
}

export interface MetaState {
  inventory: Inventory;
  baseAbilityLevel: number;
  soulGrade: number;
  hardModeUnlocked: boolean;
  characterLevels: Record<string, number>;
  bestRunLevel: number;
  normalBossesKilled: string[];
  hardBossesKilled: string[];
  gold: number;
  dr: number;             // 차원 간섭력 — 단일 메인 영구 화폐
  enhanceStones: number;  // 강화석 — 장비 강화 소모재
  equippedItemIds: string[];   // 장착된 아이템 ID 목록 (순서 = 슬롯 순서)
  equipSlotCount: number;      // 현재 보유 슬롯 수. 기본값 1, 최대 10
  lastPlayedCharId: string;    // GameOver에서 캐릭터 레벨 표시용
  questProgress: Record<string, number>;
  questsCompleted: string[];
  regionsVisited: string[];
  // Phase B-3β1 — 신 dungeon flow 영구 진행도
  dungeonProgress: Record<string, { maxFloor: number }>;  // 던전별 도달 최대 floor
  dungeonFinalsCleared: string[];                          // final boss 처치한 dungeonId 리스트 (1회 영구 보상 게이트)
  pendingFinalClearedId: string | null;                    // final 처치 직후 town 진입 시 모달 트리거
  // Phase F-1 — Ascension
  crackStones: number;       // 차원 균열석 — Asc 비용 화폐
  ascTier: number;           // 현재 Asc Tier (시작 0)
  ascPoints: number;         // Tier 진입 시 N 누적 — F-5 Asc Tree 소비처
  ascTree: AscTree;          // F-5 노드별 lv (Phase G)
  tutorialDone: boolean;
  tutorialStep: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  // Phase F-2+3 — Skill Progression + JP system
  jp: Record<string, number>;
  jpEarnedTotal: Record<string, number>;
  jpCap: Record<string, number>;
  jpFirstKillAwarded: Record<string, Record<string, true>>;
  jpCharLvAwarded: Record<string, number>;
  skillLevels: Record<string, Record<string, number>>;
  ultSlotPicks: Record<string, [string | null, string | null, string | null, string | null]>;
  // Phase D — Modifiers reroll count
  rerollCount?: number;
  // Phase E — Relics + Mythic + Ads
  relicStacks: Record<RelicId, number>;
  mythicOwned: MythicId[];
  mythicEquipped: (MythicId | null)[];   // length 5, index = slot
  mythicSlotCap: number;                 // 0..5, derived from ascTier
  adsToday: number;
  adsLastResetTs: number;
  adsWatched: number;        // lifetime ad-watch count (v9 migration default 0)
  // Phase Compass — 차원 나침반
  compassOwned: Record<CompassId, boolean>;
  dungeonMiniBossesCleared: string[];   // mini-boss 첫 처치 누적
  dungeonMajorBossesCleared: string[];  // major-boss 첫 처치 누적
  // Phase 5 — Monetization
  adFreeOwned: boolean;
  lastIapTx: IapTransaction[];
  // Phase Sim-A — 사이클 히스토리 (최근 N 항목 영구 저장)
  cycleHistory: CycleHistoryEntry[];
}

// Phase G — Ascension Tree (성좌)
export type AscTreeNodeId =
  | 'hp_pct'
  | 'atk_pct'
  | 'gold_drop'
  | 'bp_start'
  | 'sp_per_lvl'
  | 'dungeon_currency'
  | 'crit_damage'
  | 'asc_accel'
  | 'mod_magnitude'
  | 'effect_proc';

export type AscTree = Record<AscTreeNodeId, number>;

// Phase E — Relics + Mythic

export type RelicId =
  | 'warrior_banner' | 'dokkaebi_charm' | 'gold_coin' | 'soul_pearl'
  | 'sands_of_time'  | 'fate_dice'      | 'moonlight_amulet' | 'eagle_arrow'
  | 'undead_coin'    | 'feather_of_fate';

export type MythicId = string;

export type MythicEffectType =
  | 'flat_mult' | 'cooldown_mult' | 'drop_mult' | 'xp_mult' | 'proc' | 'passive';

// Phase Compass / Phase Realms — 차원 나침반
export type CompassId =
  | 'plains_first'     | 'plains_second'
  | 'forest_first'     | 'forest_second'
  | 'mountains_first'  | 'mountains_second'
  | 'sea_first'        | 'sea_second'
  | 'volcano_first'    | 'volcano_second'
  | 'underworld_first' | 'underworld_second'
  | 'heaven_first'     | 'heaven_second'
  | 'chaos_first'      | 'chaos_second'
  | 'omni';

export interface CompassEntry {
  id: CompassId;
  /** null = omni (모든 dungeon 자유 선택), otherwise the specific dungeon id. */
  dungeonId: string | null;
  /**
   * Compass tier — semantics:
   * - 0 = omni (all-dungeon free-select)
   * - 1 = first-tier (mini-boss 첫 처치 보상) — dungeon picker weight ×3 for owned dungeon
   * - 2 = second-tier (major-boss 첫 처치 보상) — enables free-select for that dungeon
   */
  tier: 0 | 1 | 2;
  emoji: string;
  nameKR: string;
  descriptionKR: string;
}

// Phase 5 — Monetization
export type IapProductId =
  | 'ad_free'
  | 'crack_stone_pack_small'
  | 'crack_stone_pack_mid'
  | 'crack_stone_pack_large';

export interface IapTransaction {
  productId: IapProductId;
  ts: number;
  purchaseToken: string;
}

export interface TutorialStep {
  id: string;
  screen: Screen;
  textKR: string;
  ctaKR: string;
}

export type Screen =
  | 'main-menu'
  | 'town'
  | 'dungeon-floors'
  | 'class-select'
  | 'battle'
  | 'stat-alloc'
  | 'inventory'
  | 'shop'
  | 'game-over'
  | 'quests'
  | 'ascension'
  | 'skill-progression'
  | 'relics'
  | 'settings'
  | 'iap-shop'
  | 'privacy';

export type StoryType = 'region_enter' | 'boss_defeat';

export interface Story {
  id: string;
  type: StoryType;
  refId: string;     // regionId or bossId
  textKR: string;
}

export interface StartGameConfig {
  parent: string;
  assetsBasePath: string;
  exposeTestHooks: boolean;
}

// ── Phase B (300h redesign) — Dungeon/Floor 모델 ──

export type DungeonUnlock =
  | { type: 'start' }
  | { type: 'boss-count'; count: number }
  | { type: 'asc-tier'; tier: number }
  | { type: 'hardmode' };

export interface Dungeon {
  id: string;
  nameKR: string;
  emoji: string;
  themeColor: string;        // CSS color (hex or var() reference) for UI accent
  unlockGate: DungeonUnlock;
  monsterPool: string[];     // monster IDs that spawn in this dungeon
  /**
   * Phase B-3β1 — boss IDs per floor type. References boss IDs in bosses.ts.
   *  - mini    → floor 5
   *  - major   → floor 10
   *  - sub[0]  → floor 15
   *  - sub[1]  → floor 20
   *  - sub[2]  → floor 25
   *  - final   → floor 30 (1회 영구 보상)
   */
  bossIds: {
    mini: string;
    major: string;
    sub: [string, string, string];
    final: string;
  };
  isHardOnly: boolean;
}

export type BossType = 'mini' | 'major' | 'sub' | 'final';

export interface FloorInfo {
  dungeonId: string;
  floorNumber: number;       // 1-indexed
  monsterLevel: number;      // computed from floor depth
  bossType: BossType | null; // null = 일반 floor
}

// ─── Effect-pipeline (Phase D §6.1) ───

export type EffectType =
  | 'stat_mod'  // effect-pipeline 외 — stat 식 직접 적용 (크리/관통/원소피해 등)
  | 'dot'       // 도트 (중독·출혈)
  | 'cc'        // 기절·동결·공포
  | 'debuff'    // 약화·둔화 (stat % 감소, stack)
  | 'shield'    // 보호막 (flat absorption)
  | 'reflect'   // 받은 dmg → 적
  | 'trigger';  // 처치/HP/stack 조건 발동

export type EffectId = string;  // 예: 'dot_poison', 'cc_stun', 'debuff_weaken' 등

export type EffectTarget = 'self' | 'enemy';

export type TriggerCondition =
  | { kind: 'on_kill' }
  | { kind: 'on_hp_below'; thresholdRatio: number }
  | { kind: 'on_stack_reach'; stackTarget: number }
  | { kind: 'on_hit' };

export interface ActiveEffect {
  id: EffectId;
  effectType: EffectType;
  source: 'modifier' | 'ult' | 'skill';
  target: EffectTarget;
  durationMs: number;
  remainingMs: number;
  magnitude: number;
  stack: number;
  triggerCondition?: TriggerCondition;
}

export interface EffectsState {
  active: Map<EffectId, ActiveEffect>;
  permanentTriggers?: MythicProc[];     // Phase E — mythic procs
}

// ─── Mythic Proc (Phase E §T14) ───

/**
 * Phase E + Phase Realms — Mythic proc descriptor.
 *
 * `effect` semantics:
 * - `lifesteal` (trigger: on_player_attack): heals damageDealt × value to run.playerHp.
 * - `thorns` (trigger: on_player_hit_received): reflects damageReceived × value to enemy.
 * - `sp_steal` (trigger: on_kill, Phase Realms redefine): reduces all active skill
 *   cooldowns by `value` seconds. Pre-Phase-Realms semantics (on_player_attack +
 *   damage-scaled SP drain) is preserved in evaluateMythicProcs for backward compat
 *   but no equipped mythic uses that path after Task 10.
 * - `magic_burst` (trigger: on_player_attack): with probability=value, adds 50%
 *   bonus damage to the current hit.
 *
 * All result magnitudes are multiplied by `ctx.magnitudeBuff` in evaluateMythicProcs
 * (Phase Realms — supports light_of_truth's ×1.25 amplification).
 */
export interface MythicProc {
  trigger: 'on_player_hit_received' | 'on_player_attack' | 'on_kill';  // [Phase Realms — +'on_kill']
  effect: 'lifesteal' | 'thorns' | 'sp_steal' | 'magic_burst';
  value: number;
}

// ─── Modifier (Phase D §6.2) ───

export type ModifierCategory = 'attack' | 'status' | 'utility' | 'defense' | 'special';

export type SlotKind = 'weapon' | 'armor' | 'accessory';

export interface Modifier {
  id: string;
  nameKR: string;
  category: ModifierCategory;
  baseValue: number;
  effectType: EffectType;
  validSlots: SlotKind[];
  rarityWeight: Record<EquipmentRarity, number>;
  triggerCondition?: TriggerCondition;
}
