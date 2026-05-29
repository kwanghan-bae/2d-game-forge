import type { SeededRng } from '../cycle/SeededRng';
import type { HeroEntity } from '../hero/HeroEntity';
import { LANDMARK_TYPES, type LandmarkKind } from '../data/landmarks';
import type { OverworldEvent } from './OverworldEvents';
import { ENEMY_DROPS, BOSS_DROPS } from './dropTable';
import {
  enemyHpAtLevel,
  enemyAtkAtLevel,
  expGainForKill,
} from '../cycle/inflationCurve';
import { SkillLearningSystem, isSkillMilestoneLevel } from '../hero/SkillLearningSystem';
import { findEncounterForKind, selectBranch } from '../data/personalityEncounters';

const ENEMY_BASE_HP = 30;
const ENEMY_BASE_ATK = 8;
const BOSS_HP_MUL = 4;
const BOSS_ATK_MUL = 3;  // was 2, tuned C110 — boss danger onset earlier
const ENEMY_EXP_BASE = 12;
const BOSS_EXP_BASE = 60;
const DROP_RATE = 0.36;           // V3-H F2: +20% (was 0.3)
// C119: danger zone — stronger enemy variant with bonus exp
export const DANGER_ZONE_RATE = 0.15;
export const DANGER_ZONE_STAT_MUL = 1.5;
export const DANGER_ZONE_EXP_MUL = 3;
// C120: combo streak — consecutive no-damage kills grant bonus exp
export const COMBO_STREAK_THRESHOLD = 3; // streak >= 3 to start bonus
export const COMBO_STREAK_EXP_BONUS = 0.1; // +10% per streak beyond threshold
// C121: milestone levels that trigger fanfare event
export const MILESTONE_LEVELS = [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000];
// C122: critical hit — unlocked by high combo streak
export const CRIT_STREAK_THRESHOLD = 5; // combo >= 5 to unlock crit chance
export const CRIT_CHANCE = 0.20; // 20% per attack to crit
export const CRIT_DAMAGE_MUL = 2; // x2 damage on crit
// C123: overkill — one-hit kills get bonus drop rate
export const OVERKILL_DROP_BONUS = 0.15; // +15% drop chance on one-hit kills
// C124: close call — survive barely, get adrenaline heal
export const CLOSE_CALL_THRESHOLD = 0.10; // < 10% HP remaining
export const CLOSE_CALL_HEAL = 0.05; // heal 5% of max HP
// C125: battle momentum — consecutive fights without village boost ATK
export const MOMENTUM_ATK_BONUS = 0.02; // +2% ATK per stack
export const MOMENTUM_CAP = 20; // max 20 stacks = +40% ATK
// C126: drop streak — consecutive drops upgrade the next one
export const DROP_STREAK_THRESHOLD = 3; // 3 drops in a row → next is upgraded
// C132: boss rage — boss ATK escalates per combat turn
export const BOSS_RAGE_ATK_PER_TURN = 0.10; // +10% base ATK per turn
// C133: elite enemy — rare spawn, x2 HP, guaranteed drop
export const ELITE_SPAWN_RATE = 0.05; // 5% chance on enemy encounters
export const ELITE_HP_MUL = 2.0;
export const ELITE_EXP_MUL = 2.5;
// C134: village rest bonus — arrive with low HP → permanent max HP boost
export const VILLAGE_REST_HP_THRESHOLD = 0.30; // < 30% HP to trigger
export const VILLAGE_REST_HP_BOOST = 0.01; // +1% max HP permanently
// C136: shrine meditation buff — temp ATK boost lasting N fights
export const SHRINE_MEDITATION_ATK_BUFF = 0.25; // +25% ATK
export const SHRINE_MEDITATION_BUFF_DURATION = 5; // lasts 5 fights
// C137: death streak mercy — reduce damage after consecutive deaths
export const DEATH_STREAK_THRESHOLD = 3; // 3 deaths in a row triggers mercy
export const MERCY_DAMAGE_REDUCTION = 0.30; // -30% incoming damage
export const MERCY_DURATION = 3; // lasts 3 fights
// C138: exp diminishing returns at high levels
export const EXP_DIMINISH_THRESHOLD = 1000; // level 1000+ starts reduction
export const EXP_DIMINISH_FACTOR = 0.0005; // -0.05% per level above threshold
// C139: first blood — first fight of a cycle gets bonus
export const FIRST_BLOOD_EXP_MUL = 2.0; // ×2 exp on first fight
export const FIRST_BLOOD_DROP_GUARANTEE = true;
// C140: revenge bonus — ATK boost against enemy type that killed you
export const REVENGE_ATK_BONUS = 0.50; // +50% ATK on revenge
// C141: survival streak — long survival grants bonus exp
export const SURVIVAL_STREAK_THRESHOLD = 10; // fights survived to start bonus
export const SURVIVAL_STREAK_EXP_BONUS = 0.05; // +5% per fight above threshold
// C142: lucky dodge — chance to survive fatal hit with 1 HP
export const LUCKY_DODGE_CHANCE = 0.10; // 10% on fatal blow
// C144: gold from battles
export const GOLD_PER_KILL_BASE = 5; // base gold per kill
export const GOLD_BOSS_MUL = 5; // bosses give 5× gold
export const GOLD_ELITE_MUL = 3; // elites give 3× gold
// C146: wave mechanic — every N fights, bonus challenge
export const WAVE_INTERVAL = 20; // every 20 wins triggers wave
export const WAVE_SIZE = 3; // 3 consecutive enemies
export const WAVE_BONUS_EXP_MUL = 2.0; // ×2 exp for wave fights
export const WAVE_BONUS_GOLD_MUL = 3.0; // ×3 gold for wave fights
// C147: gold penalty on death
export const GOLD_DEATH_PENALTY = 0.10; // lose 10% gold on death
// C148: kill counter milestones — every N kills = permanent ATK bonus
export const KILL_MILESTONE_INTERVAL = 50;
export const KILL_MILESTONE_ATK_BONUS = 0.01; // +1% ATK per milestone
// C149: gold momentum bonus — high momentum gives extra gold
export const GOLD_MOMENTUM_THRESHOLD = 5;
export const GOLD_MOMENTUM_BONUS = 0.50; // +50% gold when momentum >= threshold
// C151: area familiarity — revisiting areas gives exp bonus
export const AREA_FAMILIARITY_EXP_BONUS = 0.05; // +5% per visit
export const AREA_FAMILIARITY_CAP = 5; // max 5 stacks = +25%
// C152: treasure goblin — rare rich enemy
export const TREASURE_GOBLIN_RATE = 0.03; // 3% chance
export const TREASURE_GOBLIN_GOLD_MUL = 10; // ×10 gold
export const TREASURE_GOBLIN_HP_MUL = 0.3; // 30% HP (easy to kill)
export const TREASURE_GOBLIN_FLEE_RATE = 0.4; // 40% chance to flee after 2 turns
// C153: combo gold bonus — gold scales with combo streak
export const COMBO_GOLD_THRESHOLD = 3;
export const COMBO_GOLD_BONUS_PER = 0.20; // +20% per combo level above threshold
// C154: village shop — spend gold for temp HP shield
export const VILLAGE_SHOP_COST = 50;
export const VILLAGE_SHOP_SHIELD_MUL = 0.20; // +20% max HP
export const VILLAGE_SHOP_SHIELD_DURATION = 3; // lasts 3 fights
// C155: overkill gold bonus
export const OVERKILL_GOLD_BONUS = 1.0; // +100% gold on one-shot kills
// C156: HP regen on win
export const WIN_HP_REGEN_RATE = 0.02; // recover 2% max HP per win
// C157: boss gold vault — bonus lump gold on boss defeat
export const BOSS_VAULT_GOLD_PER_LEVEL = 100;
// C158: near-death power surge — low HP = ATK boost
export const NEAR_DEATH_HP_THRESHOLD = 0.10; // below 10% HP
export const NEAR_DEATH_ATK_MUL = 1.5; // ×1.5 ATK when near death
// C159: double-or-nothing — chance to keep gold on death
export const GOLD_SAVE_CHANCE = 0.25; // 25% chance to not lose gold
// C160: combo exp escalation — high combo gives escalating exp
export const COMBO_EXP_THRESHOLD = 10;
export const COMBO_EXP_BONUS_PER = 0.10; // +10% per combo above threshold
// C161: critical hit gold bonus
export const CRIT_GOLD_BONUS = 0.30; // +30% gold when fight had critical hit
// C162: danger zone gold bonus
export const DANGER_ZONE_GOLD_MUL = 2.0; // ×2 gold in danger zones
// C164: gold level scaling power
export const GOLD_LEVEL_POWER = 1.2; // gold scales as level^1.2 instead of linear
// C165: boss enrage at 50% HP
export const BOSS_ENRAGE_HP_THRESHOLD = 0.5; // below 50% HP
export const BOSS_ENRAGE_ATK_MUL = 2.0; // ×2 ATK when enraged
// C166: exp overflow gold bonus
export const EXP_OVERFLOW_GOLD_RATIO = 100; // 1 gold per 100 overflow exp
// C167: close call exp bonus — survive at low HP for bonus exp
export const CLOSE_CALL_HP_THRESHOLD = 0.20; // below 20% HP after fight
export const CLOSE_CALL_EXP_BONUS = 0.50; // +50% exp
// C168: gold interest at village
export const VILLAGE_GOLD_INTEREST_RATE = 0.02; // 2% interest per village visit
// C169: multi-kill bonus during wave
export const WAVE_MULTI_KILL_ATK_BONUS = 1; // +1 permanent ATK per wave clear
// C170: greed mode — high gold penalizes exp but boosts gold
export const GREED_MODE_GOLD_THRESHOLD = 1000;
export const GREED_MODE_EXP_PENALTY = 0.20; // -20% exp
export const GREED_MODE_GOLD_BONUS = 1.0; // +100% gold
// C171: dodge chance based on kills
export const DODGE_PER_100_KILLS = 0.05; // 5% per 100 kills
export const DODGE_CAP = 0.20; // max 20%
// C172: boss streak bounty
export const BOSS_STREAK_MULTIPLIER = 1; // +1× per consecutive boss kill
// C173: exhaustion debuff
export const EXHAUSTION_THRESHOLD = 50; // fights without village
export const EXHAUSTION_ATK_PENALTY = 0.10; // -10% ATK
// C174: lifesteal on kill
export const LIFESTEAL_RATE = 0.01; // 1% of damage dealt → HP
// C175: shrine gold tithe
export const SHRINE_TITHE_RATE = 0.10; // sacrifice 10% gold
export const SHRINE_TITHE_ATK_BONUS = 0.02; // gain +2% permanent ATK per tithe
// C177: lucky treasure drop
export const LUCKY_TREASURE_CHANCE = 0.05; // 5%
export const LUCKY_TREASURE_MIN = 50;
export const LUCKY_TREASURE_MAX = 200;
// C178: danger zone exp scaling
export const DANGER_STREAK_EXP_STEP = 0.5; // +0.5× exp per consecutive danger fight
export const DANGER_STREAK_EXP_CAP = 3.0; // max ×3 exp in danger zone
// C179: shield break counter-attack
export const SHIELD_BREAK_ATK_MUL = 1.5; // ×1.5 ATK on fight after shield expires
// C180: gold magnet — combo boosts treasure goblin rate
export const GOLD_MAGNET_COMBO_THRESHOLD = 7;
export const GOLD_MAGNET_GOBLIN_MUL = 2.0; // double goblin spawn rate
// C181: max HP decay on death
export const DEATH_HP_DECAY_RATE = 0.01; // -1% max HP per death
// C182: village heal scaling
export const VILLAGE_HEAL_BASE = 0.25;
export const VILLAGE_HEAL_PER_VISIT = 0.01; // +1% per visit
export const VILLAGE_HEAL_CAP = 0.40;
// C183: overkill streak → invincibility
export const OVERKILL_STREAK_THRESHOLD = 3;
export const OVERKILL_INVINCIBILITY_FIGHTS = 1;
// C184: level-up momentum
export const LEVEL_UP_EXP_BONUS = 1.0; // +100% exp on next fight after leveling
// C185: elite bounty board
export const ELITE_BOUNTY_INTERVAL = 5; // every 5 unique elites
export const ELITE_BOUNTY_EXP_BONUS = 0.05; // +5% permanent exp per milestone
// C186: boss overkill vault doubler
export const BOSS_OVERKILL_VAULT_MUL = 2.0;
// C187: cave treasure room
export const CAVE_TREASURE_CHANCE = 0.30;
export const CAVE_TREASURE_MIN = 100;
export const CAVE_TREASURE_MAX = 500;
// C188: revenge gold after death
export const REVENGE_GOLD_FIGHTS = 3;
export const REVENGE_GOLD_BONUS = 0.50; // +50% gold
// C189: shrine mastery — increased meditation chance
export const SHRINE_MASTERY_THRESHOLD = 5; // tithes needed
export const SHRINE_MASTERY_MEDITATION_CHANCE = 0.40; // up from 20%
// C190: gold armor — reduce damage when rich
export const GOLD_ARMOR_THRESHOLD = 500;
export const GOLD_ARMOR_REDUCTION = 0.10; // -10% damage
// C192: boss rage reset on crit
export const BOSS_RAGE_RESET_ON_CRIT = true;
// C193: gold tax at high levels
export const GOLD_TAX_LEVEL_THRESHOLD = 50;
export const GOLD_TAX_RATE = 0.05; // 5% per fight
// C194: double hit chance
export const DOUBLE_HIT_KILL_THRESHOLD = 200;
export const DOUBLE_HIT_CHANCE = 0.10; // 10%
// C195: gold sacrifice heal in combat
export const GOLD_HEAL_HP_THRESHOLD = 0.20; // trigger below 20% HP
export const GOLD_HEAL_COST = 100;
export const GOLD_HEAL_AMOUNT = 0.30; // heal 30% max HP
// C196: exp decay at high levels
export const EXP_DECAY_LEVEL_START = 100;
export const EXP_DECAY_PER_LEVEL = 0.01; // -1% per level above 100
export const EXP_DECAY_CAP = 0.50; // max -50%
// C197: survivor bonus
export const SURVIVOR_THRESHOLD = 100; // fights without dying
export const SURVIVOR_HP_BONUS = 0.10; // +10% max HP
// C198: combo breaker — ATK bonus after losing combo
export const COMBO_BREAKER_ATK_BONUS = 0.30; // +30% ATK
// C199: endgame boss scaling
export const BOSS_STREAK_STAT_SCALE = 0.05; // +5% HP/ATK per boss streak
// C200: prestige system
export const PRESTIGE_LEVEL_REQUIREMENT = 200;
export const PRESTIGE_STAT_BONUS = 0.10; // +10% all stats per prestige
// C213: multi-prestige scaling
export const PRESTIGE_LEVEL_INCREMENT = 50; // each prestige requires 50 more levels
// C214: treasure hunter
export const TREASURE_HUNTER_CAVE_INTERVAL = 5;
export const TREASURE_HUNTER_GOLD_BONUS = 0.10; // +10% gold per tier
// C215: exp shield
export const EXP_SHIELD_PRESERVE = 0.5; // preserve 50% of exp on first death
// C216: elite combo
export const ELITE_COMBO_THRESHOLD = 3; // 3 elites in a row
export const ELITE_COMBO_DROP_GUARANTEE = true;
// C217: HP regen scaling
export const REGEN_SCALE_PER_50_KILLS = 0.001; // +0.1% regen per 50 kills
export const REGEN_SCALE_CAP = 0.05; // max +5% extra regen
// C218: gold streak
export const GOLD_STREAK_THRESHOLD = 5; // fights without spending
export const GOLD_STREAK_BONUS = 0.5; // +50% gold
// C219: death counter ATK
export const DEATH_ATK_BONUS = 0.01; // +1% per death
export const DEATH_ATK_CAP = 0.20; // max +20%
// C220: night mode
export const NIGHT_CYCLE_INTERVAL = 20; // night every 20 fights
export const NIGHT_DURATION = 5; // lasts 5 fights
export const NIGHT_EXP_MUL = 2.0; // ×2 exp at night
export const NIGHT_ENEMY_DMG_MUL = 1.5; // enemies ×1.5 damage at night
// C221: lucky find
export const LUCKY_FIND_CHANCE = 0.02; // 2% chance per fight
// C223: exp combo chain
export const EXP_CHAIN_KILLS_THRESHOLD = 5; // kills since last level-up
export const EXP_CHAIN_BONUS = 0.25; // +25% exp if chained enough kills
// C224: berserker mode
export const BERSERKER_HP_THRESHOLD = 0.25; // below 25% HP
export const BERSERKER_ATK_BONUS = 0.40; // +40% ATK
export const BERSERKER_CRIT_BONUS = 0.20; // +20% crit chance
// C225: gold interest scaling
export const GOLD_INTEREST_PRESTIGE_BONUS = 0.01; // +1% per prestige
// C226: danger magnet
export const DANGER_MAGNET_THRESHOLD = 10; // danger fights to activate
export const DANGER_MAGNET_SPAWN_BONUS = 0.10; // +10% danger zone spawn
// C227: quick kill bonus
export const QUICK_KILL_MAX_HITS = 2; // 1-2 hits counts as quick kill
export const QUICK_KILL_EXP_BONUS = 0.10; // +10% exp
// C228: bounty board
export const BOUNTY_KILL_INTERVAL = 25; // bounty every 25 kills
export const BOUNTY_GOLD_REWARD = 100; // flat gold reward
// C229: boss enrage timer
export const BOSS_ENRAGE_TIMER_TURN = 10; // boss enrages after 10 hits
export const BOSS_ENRAGE_TIMER_MUL = 2.0; // boss ATK doubles
// C230: combo gold multiplier
export const COMBO_GOLD_MUL_THRESHOLD = 10; // combo streak >= 10
export const COMBO_GOLD_MUL_BONUS = 0.30; // +30% gold
// C231: village bank
export const BANK_DEPOSIT_RATE = 0.30; // deposit 30% of gold
// C232: first hit advantage
export const FIRST_HIT_DAMAGE_MUL = 1.5;
// C234: heal on level-up
export const LEVEL_UP_HEAL_RATE = 0.50; // restore 50% HP on level-up
// C235: crit gold scaling
export const CRIT_GOLD_SCALE_PER_100 = 0.10; // +10% crit gold per 100 crits
export const CRIT_GOLD_SCALE_CAP = 0.50; // max +50% additional
// C236: overkill heal
export const OVERKILL_HEAL_RATE = 0.05; // 5% max HP restored on one-hit kill
// C237: exp overflow
export const EXP_OVERFLOW_BONUS = 0.50; // 50% bonus on carried-over exp
// C238: darkness curse
export const DARKNESS_CURSE_DEATHS = 3; // consecutive deaths to trigger curse
export const DARKNESS_CURSE_ATK_PENALTY = 0.20; // -20% ATK while cursed
// C239: boss loot table
export const BOSS_LOOT_GOLD_MUL = 2.0; // bosses matching loot table give x2 gold
export const BOSS_LOOT_INTERVAL = 5; // every 5th boss is a "loot boss"
// C240: time pressure
export const TIME_PRESSURE_PER_100 = 0.10; // +10% enemy HP per 100 fights
export const TIME_PRESSURE_CAP = 1.00; // max +100% enemy HP
// C241: companion buff
export const COMPANION_UNLOCK_WINS = 50; // wins needed to unlock companion
export const COMPANION_EXP_BONUS = 0.15; // +15% exp with companion
// C242: village armor purchase
export const ARMOR_BUY_COST = 300;
export const ARMOR_REDUCTION = 0.10; // -10% damage taken
export const ARMOR_DURATION = 10; // lasts 10 fights
// C243: hero specialization
export const SPEC_ATK_BONUS = 0.25; // +25% ATK after prestige (auto-granted)
// C245: kill combo milestone
export const COMBO_MILESTONE_INTERVAL = 50; // every 50-kill streak
export const COMBO_MILESTONE_GOLD_BONUS = 0.30; // +30% gold on milestone fight
// C246: elemental weakness
export const ELEMENTAL_LEVEL_MOD = 3; // hero level divisible by this = advantage
export const ELEMENTAL_DMG_BONUS = 0.50; // +50% damage on elemental advantage
// C247: survival heal
export const SURVIVAL_HEAL_THRESHOLD = 10; // streak needed
export const SURVIVAL_HEAL_RATE = 0.03; // 3% HP per fight
// C248: sacrifice fury
export const SACRIFICE_FURY_ATK_BONUS = 0.05; // +5% ATK after gold sacrifice heal
export const SACRIFICE_FURY_DURATION = 5; // lasts 5 fights
// C249: wave exp scaling with prestige
export const WAVE_PRESTIGE_EXP_BONUS = 0.10; // +10% wave exp per prestige
// C250: full HP gold bonus
export const FULL_HP_GOLD_BONUS = 0.20; // +20% gold when at full HP
// C251: boss slayer exp buff
export const BOSS_SLAYER_EXP_BONUS = 0.50; // +50% exp after boss kill
export const BOSS_SLAYER_DURATION = 3; // lasts 3 fights
// C252: chain lightning
export const CHAIN_LIGHTNING_COMBO = 20; // combo streak needed
export const CHAIN_LIGHTNING_DMG_RATE = 0.20; // 20% of hero ATK as bonus
// C253: prestige gold bonus
export const PRESTIGE_GOLD_BONUS_PER_LEVEL = 5; // gold per level at prestige time
// C255: lucky crit
export const LUCKY_CRIT_CHANCE = 0.05; // 5% chance for super crit
export const LUCKY_CRIT_MUL = 3.0; // x3 damage instead of x2
// C256: danger zone exp scaling
export const DANGER_EXP_SCALE_PER_10 = 0.05; // +5% per 10 danger fights
export const DANGER_EXP_SCALE_CAP = 0.30; // max +30%
// C257: stamina system
export const STAMINA_FIGHTS_PER_PENALTY = 30; // every 30 fights without village
export const STAMINA_ATK_PENALTY = 0.05; // -5% ATK per threshold
export const STAMINA_PENALTY_CAP = 0.20; // max -20% ATK
// C258: village vigor
export const VILLAGE_VIGOR_HP_BONUS = 0.10; // +10% max HP temp
export const VILLAGE_VIGOR_DURATION = 5; // lasts 5 fights
// C259: gold magnet prestige scaling
export const GOLD_MAGNET_PRESTIGE_BONUS = 1; // +1 passive gold per prestige
// C260: death insurance
export const DEATH_INSURANCE_PENALTY = 0.05; // first death only -5% level
// C261: multi-kill bonus
export const MULTI_KILL_THRESHOLD = 3; // 3 consecutive one-hit kills
export const MULTI_KILL_EXP_BONUS = 0.40; // +40% exp on qualifying kill
// C262: gold interest cap scaling
export const GOLD_INTEREST_CAP_PER_PRESTIGE = 5; // extra cap per prestige
// C263: critical heal
export const CRIT_HEAL_RATE = 0.02; // 2% max HP on crit
// C265: shrine blessing
export const SHRINE_BLESSING_EXP_BONUS = 0.20; // +20% exp
export const SHRINE_BLESSING_DURATION = 5; // lasts 5 fights
// C266: gold hoard ATK
export const GOLD_HOARD_THRESHOLD = 500;
export const GOLD_HOARD_ATK_BONUS = 0.10; // +10% ATK with 500+ gold
// C267: revenge exp
export const REVENGE_EXP_BONUS = 0.30; // +30% exp during revenge window
// C268: dodge counter ATK
export const DODGE_COUNTER_ATK_BONUS = 0.02; // +2% ATK per dodge in fight
export const DODGE_COUNTER_ATK_CAP = 0.20; // max +20%
// C269: low HP exp bonus
export const LOW_HP_EXP_THRESHOLD = 0.30; // below 30% HP
export const LOW_HP_EXP_BONUS = 0.25; // +25% exp
// C270: elite gold bonus
export const ELITE_GOLD_BONUS = 0.50; // +50% gold from elites
// C271: gold forge at village
export const GOLD_FORGE_COST = 500;
export const GOLD_FORGE_THRESHOLD = 1000;
export const GOLD_FORGE_ATK_FLAT = 5; // +5 permanent ATK
// C272: combo break consolation
export const COMBO_BREAK_THRESHOLD = 30; // lost combo must be >= this
export const COMBO_BREAK_EXP_BONUS = 0.50; // +50% exp on next fight
// C273: boss kill counter ATK
export const BOSS_KILL_ATK_INTERVAL = 5; // every 5 bosses
export const BOSS_KILL_ATK_BONUS = 0.03; // +3% ATK per milestone
// C274: gold cascade — 3+ consecutive one-hit kills = double gold
export const GOLD_CASCADE_MULTIPLIER = 2.0;
export const GOLD_CASCADE_THRESHOLD = 3;
// C275: adrenaline rush — below 20% HP = +30% ATK for that fight
export const ADRENALINE_HP_THRESHOLD = 0.20;
export const ADRENALINE_ATK_BONUS = 0.30;
// C276: village blessing — deathless streak reward
export const VILLAGE_BLESSING_STREAK = 20; // fights without death
export const VILLAGE_BLESSING_GOLD_BONUS = 0.10;
export const VILLAGE_BLESSING_DURATION = 10;
// C201: village gold fountain
export const VILLAGE_GOLD_FOUNTAIN = 25; // flat gold per village visit
// C202: danger zone gold tax immunity
export const DANGER_TAX_IMMUNITY = true;
// C203: critical hit streak
export const CRIT_STREAK_GUARANTEE_THRESHOLD = 3; // 3 crits → next guaranteed
// C204: boss kill exp burst
export const BOSS_KILL_EXP_MUL = 3.0; // ×3 exp for boss kills
// C205: gold investment
export const GOLD_INVEST_LOCK_FIGHTS = 10;
export const GOLD_INVEST_RETURN_MUL = 3;
export const GOLD_INVEST_MIN = 100; // minimum gold to invest
// C206: damage reflection
export const DAMAGE_REFLECT_RATE = 0.05; // 5% of damage taken reflected
// C208: passive gold income
export const PASSIVE_GOLD_PER_VISIT = 1; // +1 gold/fight per village visit
export const PASSIVE_GOLD_CAP = 10; // max passive income per fight
// C209: boss immunity phase
export const BOSS_IMMUNITY_INTERVAL = 3; // immune every 3rd turn
// C210: achievement kill milestones
export const ACHIEVEMENT_KILL_THRESHOLDS = [100, 500, 1000];
export const ACHIEVEMENT_ATK_BONUS = 0.05; // +5% ATK per milestone
// C211: weather system
export const WEATHER_CHANCE = 0.3; // 30% chance of non-normal weather
export const WEATHER_RAIN_ATK_PENALTY = 0.1; // -10% ATK in rain
export const WEATHER_WIND_EXP_BONUS = 0.2; // +20% exp in wind
export const WEATHER_FOG_CRIT_PENALTY = 0.5; // halved crit chance in fog
// C212: arena challenge
export const ARENA_COST = 200;
export const ARENA_REWARD_MUL = 5; // ×5 exp and gold from arena fight
export const ARENA_ENEMY_HP_MUL = 3; // enemies ×3 tougher
export const SHRINE_SKILL_GRANT_RATE = 0.20; // cycle 1 F1: was 0.48 (V3-H F2) — skill saturation 해소
const SHRINE_HEAL_FRACTION = 0.4;
// Cycle 28 (cycle 3 D5 carry-over) — spare_enemy moral saturation 70.4% 완화: 0.10 → 0.07.
// cycle 1 F1 에서 0.15 → 0.10 으로 한 차례 줄였고, 이번이 두 번째 감소.
// Cycle 321 — lever 5: PROC_RATE 0.07 → 0.04 (saint dominance root cause 추가 lever).
// cycle 316 F14 finding 의 branch 자체 재설계 deferred, magnitude lever 5번째 시도.
export const MERCIFUL_PROC_RATE = 0.04;
// Cycle 297 — saint dominance root cause lever (cycle 296 finding의 진짜 axis).
// drift 3 → 2: merciful 누적 속도 ↓ → saint 자격 통과 도달까지 더 많은 arrival.
// effect 측정 = cycle 316 sim baseline 강제 시점.
const MERCIFUL_DRIFT = 2;

export interface EncounterEngineOpts {
  /** Additive bonus to drop chance from V3-C drop_chance buff. */
  dropChanceBonus?: number;
  /** V3-D — field level damping multiplier (1.0 = no damping, <1.0 = weaker hero). */
  damping?: number;
  /** Cycle 108 F1: returns true when fate roll is still available in this
   *  cycle. Controller wires `() => !this.fateRollConsumed`. When true *and*
   *  hero would die in combat, engine emits `fate_roll_required` instead of
   *  `hero_died`. applyDeathPenalty is *not* invoked — controller defers it
   *  to resolveFateRoll('decline'). */
  isFateRollEligible?: () => boolean;
  /** Cycle 109 F1: returns true when boss intro is still available for this
   *  landmark in this cycle. Controller wires `(landmarkId) =>
   *  !bossIntroSeenIds.has(landmarkId) && activeBossIntroBuffs.length < 4`.
   *  When true *and* kind === 'boss', engine emits `boss_intro_offered`
   *  *before* battle_started and aborts the encounter. Controller's
   *  resolveBossIntro re-enters resolveEncounter (with the same landmarkId
   *  now in seenIds so the inner call skips this path). */
  isBossIntroEligible?: (landmarkId: string) => boolean;
  /** Cycle 109 F1: emitted alongside `boss_intro_offered`. Returns the 3
   *  deterministic cards for this landmarkId. Controller wires this so the
   *  catalog + seed mixing logic lives in one place. */
  pickBossIntroCards?: (landmarkId: string) => ReadonlyArray<{
    id: import('../buff/bossIntroCatalog').BossIntroBuffId;
    nameKR: string;
    descKR: string;
    tier: import('../buff/bossIntroCatalog').BossIntroBuffTier;
  }>;
  /** Cycle 109 F1: when activeBossIntroBuffs.length >= 4, controller wires
   *  this to true so engine emits `boss_intro_skipped` (still aborts intro
   *  but lets controller record a saga marker). Default = no skip emission. */
  isBossIntroCapped?: (landmarkId: string) => boolean;
  /** Cycle 109 F1: returns the cumulative atk_mul (1.0 + sum of accepted
   *  atk-tier buffs). Applied multiplicatively to heroAtk inside the combat
   *  loop. PRD §F1.동작(5) "단순화" — bypasses recomputeStats. */
  getBossIntroAtkMul?: () => number;
  /** Cycle 109 F1: returns the cumulative hp_mul. Currently only applied
   *  implicitly via heroHpMax buff effects — engine itself does not consume
   *  this. Reserved for future expansion. */
  getBossIntroDropBonus?: () => number;
  /** Cycle 110 F1: returns the cumulative atk_mul from realm fork buffs
   *  (1.0 + sum of risk-card atkBonus values). Applied multiplicatively to
   *  heroAtk inside the combat loop for *both* enemy and boss (vs boss intro
   *  which is boss-only). PRD §F1.동작(5) — separate channel from boss intro,
   *  engine multiplies both. */
  getRealmForkAtkMul?: () => number;
}

export class EncounterEngine {
  private comboStreak = 0;
  private battleMomentum = 0;
  private dropStreak = 0;
  private shrineBuffRemaining = 0; // C136: fights remaining with shrine ATK buff
  private deathStreak = 0; // C137: consecutive deaths
  private mercyRemaining = 0; // C137: fights remaining with damage reduction
  private firstBloodUsed = false; // C139: has first fight bonus been consumed
  private lastDeathEnemyId: string | null = null; // C140: revenge tracking
  private survivalStreak = 0; // C141: consecutive fights without death
  private totalWins = 0; // C146: total wins for wave trigger
  private waveRemaining = 0; // C146: fights left in current wave
  private killCount = 0; // C148: total kills for milestone tracking
  private killMilestones = 0; // C148: number of milestones reached
  private areaVisits: Map<string, number> = new Map(); // C151: area familiarity
  private shopShieldRemaining = 0; // C154: village shop HP shield duration
  private bossStreak = 0; // C172: consecutive boss kills this run
  private fightsSinceVillage = 0; // C173: fights without village visit
  private shrineTithes = 0; // C175: number of gold tithes at shrines
  private dangerStreak = 0; // C178: consecutive danger zone fights
  private shieldBreakReady = false; // C179: shield just expired → next fight bonus
  private villageVisits = 0; // C182: total village visits for heal scaling
  private overkillStreak = 0; // C183: consecutive 1-hit kills
  private invincibleFights = 0; // C183: fights remaining with invincibility
  private levelUpMomentum = false; // C184: next fight gets exp bonus after level-up
  private eliteKills = 0; // C185: total elite kills for bounty board
  private eliteBountyMilestones = 0; // C185: milestones reached
  private revengeGoldRemaining = 0; // C188: fights with revenge gold bonus
  private fightsSinceDeath = 0; // C197: fights without dying
  private comboBreakerReady = false; // C198: ATK bonus after combo break
  private prestigeCount = 0; // C200: number of prestiges
  private critStreak = 0; // C203: consecutive crits
  private goldInvested = 0; // C205: locked gold
  private investFightsRemaining = 0; // C205: fights until payout
  private achievementMilestones = 0; // C210: number of kill milestones reached
  private arenaActive = false; // C212: next fight is arena
  private caveVisits = 0; // C214: total cave visits
  private expShieldUsed = false; // C215: one-time exp preservation
  private eliteCombo = 0; // C216: consecutive elite kills
  private fightsSinceSpend = 0; // C218: fights without spending gold
  private totalDeaths = 0; // C219: total death count
  private killsSinceLevelUp = 0; // C223: kills since last level-up
  private totalDangerFights = 0; // C226: total danger zone fights
  private bankGold = 0; // C231: gold stored in village bank
  private totalCrits = 0; // C235: total critical hits landed
  private consecutiveDeaths = 0; // C238: consecutive death counter
  private darknessCursed = false; // C238: curse active flag
  private bossesKilled = 0; // C239: boss kill counter for loot table
  private armorRemaining = 0; // C242: armor buff fights remaining
  private sacrificeFuryRemaining = 0; // C248: fury buff from sacrifice
  private bossSlayerRemaining = 0; // C251: exp buff from boss kill
  private villageRestRemaining = 0; // C258: rest bonus from village
  private deathInsuranceUsed = false; // C260: first death insurance
  private consecutiveOneHits = 0; // C261: consecutive one-hit kills
  private shrineBlessingRemaining = 0; // C265: shrine exp blessing
  private comboBreakBonus = false; // C272: consolation exp boost
  private villageBlessingRemaining = 0; // C276: gold blessing duration
  private fightsSinceLastDeath = 0; // C276: deathless streak

  constructor(private readonly rng: SeededRng, private opts: EncounterEngineOpts = {}) {}

  setOpts(opts: EncounterEngineOpts): void {
    this.opts = { ...this.opts, ...opts };
  }

  getComboStreak(): number { return this.comboStreak; }
  resetComboStreak(): void { this.comboStreak = 0; }
  getBattleMomentum(): number { return this.battleMomentum; }
  getDropStreak(): number { return this.dropStreak; }
  getShrineBuffRemaining(): number { return this.shrineBuffRemaining; }
  getMercyRemaining(): number { return this.mercyRemaining; }

  resolveEncounter(hero: HeroEntity, kind: LandmarkKind, landmarkId: string): OverworldEvent[] {
    const events: OverworldEvent[] = [];
    if (kind === 'enemy' || kind === 'boss') {
      const isBoss = kind === 'boss';
      // C119: danger zone — 15% chance on regular enemies. ×1.5 stats, ×3 exp.
      // C226: danger magnet — increased danger zone spawn after enough fights
      const dangerMagnetBonus = this.totalDangerFights >= DANGER_MAGNET_THRESHOLD ? DANGER_MAGNET_SPAWN_BONUS : 0;
      const isDangerZone = !isBoss && this.rng.chance(DANGER_ZONE_RATE + dangerMagnetBonus);
      // C178: danger streak tracking
      if (isDangerZone) { this.dangerStreak++; } else { this.dangerStreak = 0; }
      // C133: elite enemy — 5% chance on non-boss, non-danger encounters. ×2 HP, guaranteed drop, ×2.5 exp.
      const isElite = !isBoss && !isDangerZone && this.rng.chance(ELITE_SPAWN_RATE);
      // C152: treasure goblin — 3% on non-boss, non-danger, non-elite. Low HP, high gold.
      // C180: gold magnet — combo boosts goblin spawn
      const goblinRate = this.comboStreak >= GOLD_MAGNET_COMBO_THRESHOLD
        ? TREASURE_GOBLIN_RATE * GOLD_MAGNET_GOBLIN_MUL
        : TREASURE_GOBLIN_RATE;
      const isTreasureGoblin = !isBoss && !isDangerZone && !isElite && this.rng.chance(goblinRate);
      const hpMul = isDangerZone ? DANGER_ZONE_STAT_MUL : isElite ? ELITE_HP_MUL : isTreasureGoblin ? TREASURE_GOBLIN_HP_MUL : 1;
      const atkMul = isDangerZone ? DANGER_ZONE_STAT_MUL : 1; // elite has normal ATK
      // C199: endgame boss scaling — bosses get stronger with streak
      const bossStreakScale = isBoss ? (1 + this.bossStreak * BOSS_STREAK_STAT_SCALE) : 1;
      // C240: time pressure — enemies get tougher over total fights
      const timePressureMul = 1 + Math.min(TIME_PRESSURE_CAP, Math.floor(this.totalWins / 100) * TIME_PRESSURE_PER_100);
      const enemyHp = Math.floor(enemyHpAtLevel(ENEMY_BASE_HP, hero.level, isBoss ? BOSS_HP_MUL : hpMul) * bossStreakScale * timePressureMul);
      const enemyAtk = Math.floor(enemyAtkAtLevel(ENEMY_BASE_ATK, hero.level, isBoss ? BOSS_ATK_MUL : atkMul) * bossStreakScale);

      if (hero.staggered) return events;

      // Cycle 109 F1: boss intro intercept (before battle_started).
      // PRD §F1.동작(8) opt-(a): controller emits boss_intro_offered, modal
      // mounts, player picks idx, resolveBossIntro re-calls resolveEncounter
      // with bossIntroSeenIds.has(landmarkId) → isBossIntroEligible=false on
      // the inner call (no recursion). If capped (>=4 active buffs), still
      // abort intro but emit boss_intro_skipped marker.
      if (isBoss && this.opts.isBossIntroEligible?.(landmarkId)) {
        if (this.opts.isBossIntroCapped?.(landmarkId)) {
          events.push({ type: 'boss_intro_skipped', landmarkId, reason: 'cap_reached' });
          // fall through to regular battle path — skip is *only* the intro,
          // the boss combat itself proceeds.
        } else {
          const cards = this.opts.pickBossIntroCards?.(landmarkId);
          if (cards && cards.length === 3) {
            events.push({ type: 'boss_intro_offered', landmarkId, cards });
            return events; // pause — controller resolves via resolveBossIntro
          }
        }
      }

      if (isDangerZone) {
        events.push({ type: 'danger_zone_entered', enemyId: landmarkId });
        this.totalDangerFights++; // C226
      }
      if (isElite) {
        events.push({ type: 'elite_spawned', enemyId: landmarkId });
      }
      if (isTreasureGoblin) {
        events.push({ type: 'treasure_goblin', enemyId: landmarkId });
      }
      events.push({ type: 'battle_started', enemyId: landmarkId });

      // C211: weather system
      type Weather = 'normal' | 'rain' | 'wind' | 'fog';
      let weather: Weather = 'normal';
      if (this.rng.chance(WEATHER_CHANCE)) {
        const roll = this.rng.int(3);
        weather = (['rain', 'wind', 'fog'] as const)[roll];
      }
      const weatherAtkMul = weather === 'rain' ? (1 - WEATHER_RAIN_ATK_PENALTY) : 1;
      const weatherCritMul = weather === 'fog' ? WEATHER_FOG_CRIT_PENALTY : 1;

      // C220: night mode — every 20 fights, 5 night fights
      const fightInCycle = this.totalWins % NIGHT_CYCLE_INTERVAL;
      const isNight = fightInCycle >= (NIGHT_CYCLE_INTERVAL - NIGHT_DURATION);

      const damping = this.opts.damping ?? 1.0;
      const bossAtkMul = isBoss ? (this.opts.getBossIntroAtkMul?.() ?? 1.0) : 1.0;
      // Cycle 110 F1: realm fork atk mul applies to both enemy + boss combat
      // (vs boss intro which is boss-only). Separate channel, multiply both.
      const realmAtkMul = this.opts.getRealmForkAtkMul?.() ?? 1.0;
      // C125: momentum ATK bonus = +2% per momentum stack (capped at 20 = +40%)
      const momentumMul = 1 + this.battleMomentum * MOMENTUM_ATK_BONUS;
      // C136: shrine meditation buff — +25% ATK for duration
      const shrineMul = this.shrineBuffRemaining > 0 ? 1 + SHRINE_MEDITATION_ATK_BUFF : 1;
      // C140: revenge bonus — +50% ATK against enemy that last killed you
      const revengeMul = this.lastDeathEnemyId === landmarkId ? 1 + REVENGE_ATK_BONUS : 1;
      // C148: kill milestone ATK bonus
      const milestoneMul = 1 + this.killMilestones * KILL_MILESTONE_ATK_BONUS;
      // C158: near-death power surge
      const nearDeathMul = hero.hp < hero.hpMax * NEAR_DEATH_HP_THRESHOLD ? NEAR_DEATH_ATK_MUL : 1;
      // C173: exhaustion debuff
      const exhaustionMul = this.fightsSinceVillage >= EXHAUSTION_THRESHOLD ? (1 - EXHAUSTION_ATK_PENALTY) : 1;
      // C175: shrine tithe ATK bonus
      const titheMul = 1 + this.shrineTithes * SHRINE_TITHE_ATK_BONUS;
      // C179: shield break counter-attack
      const shieldBreakMul = this.shieldBreakReady ? SHIELD_BREAK_ATK_MUL : 1;
      if (this.shieldBreakReady) this.shieldBreakReady = false;
      // C198: combo breaker ATK bonus
      const comboBreakerMul = this.comboBreakerReady ? (1 + COMBO_BREAKER_ATK_BONUS) : 1;
      if (this.comboBreakerReady) this.comboBreakerReady = false;
      // C200: prestige stat bonus
      const prestigeMul = 1 + this.prestigeCount * PRESTIGE_STAT_BONUS;
      // C210: achievement kill milestone ATK bonus
      const achieveMul = 1 + this.achievementMilestones * ACHIEVEMENT_ATK_BONUS;
      // C219: death counter ATK bonus
      const deathAtkMul = 1 + Math.min(DEATH_ATK_CAP, this.totalDeaths * DEATH_ATK_BONUS);
      // C224: berserker mode — low HP gives massive ATK
      const berserkerMul = hero.hp < hero.hpMax * BERSERKER_HP_THRESHOLD ? (1 + BERSERKER_ATK_BONUS) : 1;
      // C238: darkness curse ATK penalty
      const curseMul = this.darknessCursed ? (1 - DARKNESS_CURSE_ATK_PENALTY) : 1;
      // C243: hero specialization — permanent ATK bonus after first prestige
      const specMul = this.prestigeCount > 0 ? (1 + SPEC_ATK_BONUS) : 1;
      // C246: elemental weakness
      const elementalMul = (hero.level % ELEMENTAL_LEVEL_MOD === 0) ? (1 + ELEMENTAL_DMG_BONUS) : 1;
      // C248: sacrifice fury ATK bonus
      const furyMul = this.sacrificeFuryRemaining > 0 ? (1 + SACRIFICE_FURY_ATK_BONUS) : 1;
      // C257: stamina penalty
      const staminaPenalty = Math.min(STAMINA_PENALTY_CAP, Math.floor(this.fightsSinceVillage / STAMINA_FIGHTS_PER_PENALTY) * STAMINA_ATK_PENALTY);
      const staminaMul = 1 - staminaPenalty;
      // C266: gold hoard ATK bonus
      const goldHoardMul = hero.gold >= GOLD_HOARD_THRESHOLD ? (1 + GOLD_HOARD_ATK_BONUS) : 1;
      // C273: boss kill counter ATK
      const bossKillAtkMul = 1 + Math.floor(this.bossesKilled / BOSS_KILL_ATK_INTERVAL) * BOSS_KILL_ATK_BONUS;
      // C275: adrenaline rush
      const adrenalineMul = hero.hp < hero.hpMax * ADRENALINE_HP_THRESHOLD ? (1 + ADRENALINE_ATK_BONUS) : 1;
      const baseHeroAtk = Math.max(1, Math.floor(hero.atk * damping * bossAtkMul * realmAtkMul * momentumMul * shrineMul * revengeMul * milestoneMul * nearDeathMul * exhaustionMul * titheMul * shieldBreakMul * comboBreakerMul * prestigeMul * achieveMul * weatherAtkMul * deathAtkMul * berserkerMul * curseMul * specMul * elementalMul * furyMul * staminaMul * goldHoardMul * bossKillAtkMul * adrenalineMul));
      // C122: critical hit — when combo streak >= 5, 20% chance per attack for x2 damage
      const canCrit = this.comboStreak >= CRIT_STREAK_THRESHOLD;
      const hpBefore = hero.hp;
      // C212: arena enemy HP boost
      let eHp = this.arenaActive ? enemyHp * ARENA_ENEMY_HP_MUL : enemyHp;
      let didCrit = false;
      let hitCount = 0;
      let rageTurn = 0;
      let luckyDodge = false;
      let totalDamageDealt = 0; // C174: track for lifesteal
      let goldHealUsed = false; // C195: once per fight
      let dodgeCount = 0; // C268: dodges this fight
      while (eHp > 0 && !hero.staggered) {
        // C203: crit streak — guaranteed crit after 3 consecutive crits
        const guaranteedCrit = this.critStreak >= CRIT_STREAK_GUARANTEE_THRESHOLD;
        // C224: berserker crit bonus
        const berserkerCrit = hero.hp < hero.hpMax * BERSERKER_HP_THRESHOLD ? BERSERKER_CRIT_BONUS : 0;
        const isCrit = canCrit && (guaranteedCrit || this.rng.chance(CRIT_CHANCE * weatherCritMul + berserkerCrit));
        if (isCrit) { this.critStreak++; } else { this.critStreak = 0; }
        if (guaranteedCrit) this.critStreak = 0; // consume guarantee
        const heroAtk = isCrit ? baseHeroAtk * (this.rng.chance(LUCKY_CRIT_CHANCE) ? LUCKY_CRIT_MUL : CRIT_DAMAGE_MUL) : baseHeroAtk;
        if (isCrit) { didCrit = true; this.totalCrits++; hero.heal(Math.max(1, Math.floor(hero.hpMax * CRIT_HEAL_RATE))); }
        // C192: boss rage reset on crit
        if (isCrit && isBoss && BOSS_RAGE_RESET_ON_CRIT) rageTurn = 0;
        hitCount++;
        // C209: boss immunity phase — boss takes 0 damage every Nth turn
        const bossImmune = isBoss && hitCount % BOSS_IMMUNITY_INTERVAL === 0;
        // C232: first hit advantage
        const firstHitMul = hitCount === 1 ? FIRST_HIT_DAMAGE_MUL : 1;
        // C268: dodge counter ATK boost
        const dodgeAtkBonus = Math.min(DODGE_COUNTER_ATK_CAP, dodgeCount * DODGE_COUNTER_ATK_BONUS);
        const effectiveAtk = bossImmune ? 0 : Math.floor(heroAtk * firstHitMul * (1 + dodgeAtkBonus));
        totalDamageDealt += effectiveAtk;
        eHp -= effectiveAtk;
        // C194: double hit — 10% chance for extra strike after 200 kills
        if (eHp > 0 && this.killCount >= DOUBLE_HIT_KILL_THRESHOLD && this.rng.chance(DOUBLE_HIT_CHANCE)) {
          totalDamageDealt += heroAtk;
          eHp -= heroAtk;
        }
        // C252: chain lightning — bonus damage at high combo
        if (eHp > 0 && this.comboStreak >= CHAIN_LIGHTNING_COMBO) {
          const lightningDmg = Math.floor(heroAtk * CHAIN_LIGHTNING_DMG_RATE);
          totalDamageDealt += lightningDmg;
          eHp -= lightningDmg;
        }
        if (eHp > 0) {
          // C132: boss rage — boss ATK escalates each turn the fight lasts
          // C165: boss enrage — ×2 ATK when below 50% HP
          const enrageMul = isBoss && eHp < enemyHp * BOSS_ENRAGE_HP_THRESHOLD ? BOSS_ENRAGE_ATK_MUL : 1;
          // C229: boss enrage timer — additional multiplier after 10 hits
          const timerEnrageMul = isBoss && rageTurn >= BOSS_ENRAGE_TIMER_TURN ? BOSS_ENRAGE_TIMER_MUL : 1;
          const rageAtk = isBoss
            ? Math.floor(enemyAtk * (1 + rageTurn * BOSS_RAGE_ATK_PER_TURN) * enrageMul * timerEnrageMul)
            : enemyAtk;
          // C137: mercy damage reduction after death streak
          const mercyReduction = this.mercyRemaining > 0 ? (1 - MERCY_DAMAGE_REDUCTION) : 1;
          // C154: shop shield damage reduction
          const shieldReduction = this.shopShieldRemaining > 0 ? (1 - VILLAGE_SHOP_SHIELD_MUL) : 1;
          // C171: dodge chance based on kill count
          const dodgeChance = Math.min(DODGE_CAP, Math.floor(this.killCount / 100) * DODGE_PER_100_KILLS);
          if (dodgeChance > 0 && this.rng.chance(dodgeChance)) {
            dodgeCount++; // C268
            rageTurn++;
            continue;
          }
          // C183: invincibility — skip all damage
          if (this.invincibleFights > 0) {
            rageTurn++;
            continue;
          }
          // C190: gold armor — reduce damage when gold > threshold
          const goldArmorMul = hero.gold >= GOLD_ARMOR_THRESHOLD ? (1 - GOLD_ARMOR_REDUCTION) : 1;
          // C220: night mode enemy damage boost
          const nightDmgMul = isNight ? NIGHT_ENEMY_DMG_MUL : 1;
          // C242: armor reduction
          const armorMul = this.armorRemaining > 0 ? (1 - ARMOR_REDUCTION) : 1;
          // C258: village vigor damage reduction
          const vigorMul = this.villageRestRemaining > 0 ? (1 - VILLAGE_VIGOR_HP_BONUS) : 1;
          const incomingDmg = Math.max(1, Math.floor(rageAtk * mercyReduction * shieldReduction * goldArmorMul * nightDmgMul * armorMul * vigorMul));
          hero.takeDamage(incomingDmg);
          // C206: damage reflection
          eHp -= Math.max(1, Math.floor(incomingDmg * DAMAGE_REFLECT_RATE));
          // C142: lucky dodge — survive fatal hit with 10% chance
          if (hero.staggered && this.rng.chance(LUCKY_DODGE_CHANCE)) {
            hero.staggered = false;
            hero.hp = 1;
            luckyDodge = true;
          }
          // C195: gold sacrifice heal — auto-heal when low HP (once per fight)
          if (!hero.staggered && hero.hp < hero.hpMax * GOLD_HEAL_HP_THRESHOLD && hero.gold >= GOLD_HEAL_COST && !goldHealUsed) {
            hero.gold -= GOLD_HEAL_COST;
            hero.heal(Math.floor(hero.hpMax * GOLD_HEAL_AMOUNT));
            goldHealUsed = true;
            // C248: sacrifice fury — gain ATK buff
            this.sacrificeFuryRemaining = SACRIFICE_FURY_DURATION;
          }
          rageTurn++;
        }
      }
      const tookDamage = hero.hp < hpBefore;
      const isOverkill = hitCount === 1 && !hero.staggered;
      // C261: multi-kill tracking
      if (isOverkill) { this.consecutiveOneHits++; } else { this.consecutiveOneHits = 0; }
      // C183: overkill streak tracking
      if (isOverkill) {
        this.overkillStreak++;
        if (this.overkillStreak >= OVERKILL_STREAK_THRESHOLD) {
          this.invincibleFights += OVERKILL_INVINCIBILITY_FIGHTS;
          this.overkillStreak = 0;
        }
      } else {
        this.overkillStreak = 0;
      }
      // C183: decrement invincibility after fight
      if (this.invincibleFights > 0) this.invincibleFights--;
      if (hero.staggered) {
        // C120: combo streak resets on death
        // C198: combo breaker — if had high combo, grant ATK bonus
        if (this.comboStreak >= 3) this.comboBreakerReady = true;
        this.comboStreak = 0;
        // C141: survival streak resets on death
        this.survivalStreak = 0;
        // C197: reset survivor counter
        this.fightsSinceDeath = 0;
        // C147: gold loss on death — lose 10% (C159: 25% chance to save)
        if (!this.rng.chance(GOLD_SAVE_CHANCE)) {
          const goldLost = Math.floor(hero.gold * GOLD_DEATH_PENALTY);
          hero.gold -= goldLost;
        } else {
          events.push({ type: 'gold_saved' });
        }
        // C181: max HP decay on death
        const hpDecay = Math.max(1, Math.floor(hero.hpMax * DEATH_HP_DECAY_RATE));
        hero.hpMax = Math.max(1, hero.hpMax - hpDecay);
        // C137: death streak tracking
        this.deathStreak++;
        // C219: total death counter
        this.totalDeaths++;
        // C238: darkness curse — consecutive deaths trigger penalty
        this.consecutiveDeaths++;
        // C276: reset deathless streak
        this.fightsSinceLastDeath = 0;
        if (this.consecutiveDeaths >= DARKNESS_CURSE_DEATHS) {
          this.darknessCursed = true;
        }
        // C188: revenge gold — next 3 wins give bonus gold
        this.revengeGoldRemaining = REVENGE_GOLD_FIGHTS;
        if (this.deathStreak >= DEATH_STREAK_THRESHOLD) {
          this.mercyRemaining = MERCY_DURATION;
          this.deathStreak = 0; // reset after granting mercy
          events.push({ type: 'mercy_activated', duration: MERCY_DURATION });
        }
        // Cycle 108 F1: intercept (a) — before applyDeathPenalty, check fate
        // roll eligibility. If eligible, emit fate_roll_required and *abort*
        // (level penalty + hero_died emit are deferred to controller's
        // resolveFateRoll('decline'). hero.hp == 0 + staggered=true still hold
        // so controller's handleArrival top-guard catches subsequent arrivals
        // until fate roll resolves).
        if (this.opts.isFateRollEligible?.()) {
          // Preview the level penalty without applying it. Mirrors
          // applyDeathPenalty's floor(level * 0.90) formula but doesn't mutate.
          const oldLevel = hero.level;
          const pendingDeathPenaltyNewLevel = Math.max(1, Math.floor(hero.level * 0.90));
          events.push({ type: 'fate_roll_required', enemyId: landmarkId, oldLevel, pendingDeathPenaltyNewLevel });
          return events;
        }
        // V3-H E1: hero died in battle — apply -10% level penalty and emit event.
        // C215: exp shield — first death preserves 50% of exp
        if (!this.expShieldUsed) {
          this.expShieldUsed = true;
          hero.exp = Math.floor(hero.exp * EXP_SHIELD_PRESERVE);
        }
        const { oldLevel, newLevel } = hero.applyDeathPenalty();
        // C260: death insurance — first death per village cycle is lighter
        if (!this.deathInsuranceUsed) {
          this.deathInsuranceUsed = true;
          const recovered = Math.max(0, Math.floor(oldLevel * (0.10 - DEATH_INSURANCE_PENALTY)));
          if (recovered > 0) hero.level = Math.min(oldLevel, newLevel + recovered);
        }
        // C140: track who killed us for revenge
        this.lastDeathEnemyId = landmarkId;
        events.push({ type: 'hero_died', cause: '전사', enemyId: landmarkId, oldLevel, newLevel });
        return events;
      }
      // C120: combo streak — no-damage kills in a row grant bonus exp
      if (tookDamage) {
        // C272: combo break consolation
        if (this.comboStreak >= COMBO_BREAK_THRESHOLD) this.comboBreakBonus = true;
        this.comboStreak = 0;
      } else {
        this.comboStreak++;
      }
      const comboBonus = this.comboStreak >= COMBO_STREAK_THRESHOLD
        ? 1 + (this.comboStreak - COMBO_STREAK_THRESHOLD + 1) * COMBO_STREAK_EXP_BONUS
        : 1;
      const baseExpGain = expGainForKill(isBoss ? BOSS_EXP_BASE : ENEMY_EXP_BASE, hero.level);
      const dangerMul2 = isDangerZone
        ? Math.min(DANGER_STREAK_EXP_CAP, DANGER_ZONE_EXP_MUL + (this.dangerStreak - 1) * DANGER_STREAK_EXP_STEP)
          + Math.min(DANGER_EXP_SCALE_CAP, Math.floor(this.totalDangerFights / 10) * DANGER_EXP_SCALE_PER_10)
        : 1;
      // C133: elite exp multiplier
      const eliteMul = isElite ? ELITE_EXP_MUL : 1;
      // C138: diminishing returns at high levels (soft cap)
      const diminish = hero.level > EXP_DIMINISH_THRESHOLD
        ? Math.max(0.1, 1 - (hero.level - EXP_DIMINISH_THRESHOLD) * EXP_DIMINISH_FACTOR)
        : 1;
      // C139: first blood bonus — first fight gets ×2 exp
      const firstBloodMul = !this.firstBloodUsed ? FIRST_BLOOD_EXP_MUL : 1;
      // C141: survival streak exp bonus
      const survivalBonus = this.survivalStreak >= SURVIVAL_STREAK_THRESHOLD
        ? 1 + (this.survivalStreak - SURVIVAL_STREAK_THRESHOLD) * SURVIVAL_STREAK_EXP_BONUS
        : 1;
      // C146: wave bonus exp
      const waveMulExp = this.waveRemaining > 0 ? (WAVE_BONUS_EXP_MUL + this.prestigeCount * WAVE_PRESTIGE_EXP_BONUS) : 1;
      // C151: area familiarity bonus
      const visits = this.areaVisits.get(landmarkId) ?? 0;
      const familiarityMul = 1 + Math.min(visits, AREA_FAMILIARITY_CAP) * AREA_FAMILIARITY_EXP_BONUS;
      this.areaVisits.set(landmarkId, visits + 1);
      // C160: combo exp escalation
      const comboExpMul = this.comboStreak >= COMBO_EXP_THRESHOLD
        ? 1 + (this.comboStreak - COMBO_EXP_THRESHOLD) * COMBO_EXP_BONUS_PER
        : 1;
      // C167: close call exp bonus — low HP after fight
      const closeCallMul = (!hero.staggered && hero.hp < hero.hpMax * CLOSE_CALL_HP_THRESHOLD && tookDamage)
        ? (1 + CLOSE_CALL_EXP_BONUS) : 1;
      // C170: greed mode — high gold penalizes exp
      const greedExpMul = hero.gold >= GREED_MODE_GOLD_THRESHOLD ? (1 - GREED_MODE_EXP_PENALTY) : 1;
      // C184: level-up momentum
      const lvUpMul = this.levelUpMomentum ? (1 + LEVEL_UP_EXP_BONUS) : 1;
      if (this.levelUpMomentum) this.levelUpMomentum = false;
      // C185: elite bounty board exp bonus
      const eliteBountyMul = 1 + this.eliteBountyMilestones * ELITE_BOUNTY_EXP_BONUS;
      // C196: exp decay at high levels
      const expDecayMul = hero.level > EXP_DECAY_LEVEL_START
        ? Math.max(1 - EXP_DECAY_CAP, 1 - (hero.level - EXP_DECAY_LEVEL_START) * EXP_DECAY_PER_LEVEL)
        : 1;
      // C204: boss kill exp burst
      const bossExpMul = isBoss ? BOSS_KILL_EXP_MUL : 1;
      // C211: wind weather exp bonus
      const weatherExpMul = weather === 'wind' ? (1 + WEATHER_WIND_EXP_BONUS) : 1;
      // C212: arena reward multiplier (used for both exp and gold)
      const arenaMul = this.arenaActive ? ARENA_REWARD_MUL : 1;
      // C220: night exp bonus
      const nightExpMul = isNight ? NIGHT_EXP_MUL : 1;
      // C223: exp combo chain
      const expChainMul = this.killsSinceLevelUp >= EXP_CHAIN_KILLS_THRESHOLD ? (1 + EXP_CHAIN_BONUS) : 1;
      // C227: quick kill bonus
      const quickKillMul = hitCount <= QUICK_KILL_MAX_HITS ? (1 + QUICK_KILL_EXP_BONUS) : 1;
      // C241: companion exp bonus
      const companionMul = this.totalWins >= COMPANION_UNLOCK_WINS ? (1 + COMPANION_EXP_BONUS) : 1;
      // C251: boss slayer exp buff
      const bossSlayerMul = this.bossSlayerRemaining > 0 ? (1 + BOSS_SLAYER_EXP_BONUS) : 1;
      // C261: multi-kill bonus
      const multiKillMul = this.consecutiveOneHits >= MULTI_KILL_THRESHOLD ? (1 + MULTI_KILL_EXP_BONUS) : 1;
      // C265: shrine blessing exp bonus
      const shrineBlessMul = this.shrineBlessingRemaining > 0 ? (1 + SHRINE_BLESSING_EXP_BONUS) : 1;
      // C267: revenge exp bonus
      const revengeExpMul = this.revengeGoldRemaining > 0 ? (1 + REVENGE_EXP_BONUS) : 1;
      // C269: low HP exp bonus
      const lowHpExpMul = hero.hp < hero.hpMax * LOW_HP_EXP_THRESHOLD ? (1 + LOW_HP_EXP_BONUS) : 1;
      // C272: combo break consolation
      const comboBreakMul = this.comboBreakBonus ? (1 + COMBO_BREAK_EXP_BONUS) : 1;
      if (this.comboBreakBonus) this.comboBreakBonus = false;
      const expGain = Math.floor(baseExpGain * dangerMul2 * eliteMul * comboBonus * diminish * firstBloodMul * survivalBonus * waveMulExp * familiarityMul * comboExpMul * closeCallMul * greedExpMul * lvUpMul * eliteBountyMul * expDecayMul * bossExpMul * weatherExpMul * arenaMul * nightExpMul * expChainMul * quickKillMul * companionMul * bossSlayerMul * multiKillMul * shrineBlessMul * revengeExpMul * lowHpExpMul * comboBreakMul);
      // C216: elite combo — 3 consecutive elites guarantee drop on next
      const eliteComboGuarantee = isElite && this.eliteCombo >= ELITE_COMBO_THRESHOLD;
      const baseDropOdds = isBoss ? 0.96 : (isElite || eliteComboGuarantee) ? 1.0 : !this.firstBloodUsed ? 1.0 : DROP_RATE; // C139: first blood = guaranteed drop
      // Cycle 109 F1: boss intro drop_bonus adds onto V3-C drop_chance buff.
      const introDropBonus = isBoss ? (this.opts.getBossIntroDropBonus?.() ?? 0) : 0;
      // C123: overkill bonus — one-hit kills get +15% drop rate
      const overkillDropBonus = isOverkill ? OVERKILL_DROP_BONUS : 0;
      const dropOdds = Math.min(1, baseDropOdds + (this.opts.dropChanceBonus ?? 0) + introDropBonus + overkillDropBonus);
      // C126: drop streak — 3 consecutive drops upgrades next to boss pool
      const upgradePool = !isBoss && this.dropStreak >= DROP_STREAK_THRESHOLD;
      const dropId = this.rng.chance(dropOdds) ? this.rollDrop(isBoss || upgradePool) : null;
      if (dropId) {
        this.dropStreak++;
        hero.addEquipment(dropId);
        if (upgradePool) {
          events.push({ type: 'drop_upgraded', dropId });
          this.dropStreak = 0; // reset after upgrade
        }
      } else {
        this.dropStreak = 0;
      }

      const { leveled } = hero.gainExp(expGain);
      // C237: exp overflow bonus — leftover exp after level-up boosted by 50%
      if (leveled.length > 0 && hero.exp > 0) {
        const overflowBonus = Math.floor(hero.exp * EXP_OVERFLOW_BONUS);
        hero.exp += overflowBonus;
      }
      // C166: exp overflow gold bonus — excess exp converts to gold
      if (leveled.length > 0) {
        const overflowGold = Math.floor(hero.exp / EXP_OVERFLOW_GOLD_RATIO);
        if (overflowGold > 0) hero.gold += overflowGold;
      }

      // Cycle 283: Sub-phase σ T3 — milestone level-up 시 trait auto-roll.
      // milestone level (5/15/30/50/80) 도달 + chance 30% 통과 시 trait 추가.
      if (leveled.length > 0) {
        hero.rollTraitsForLevels(this.rng, leveled);
      }

      // C144: gold earned from battle
      const goldMul = isBoss ? GOLD_BOSS_MUL : isElite ? GOLD_ELITE_MUL : isTreasureGoblin ? TREASURE_GOBLIN_GOLD_MUL : 1;
      // C162: danger zone gold bonus
      const dangerGoldMul = isDangerZone ? DANGER_ZONE_GOLD_MUL : 1;
      // C146: wave bonus multiplier
      const waveMul = this.waveRemaining > 0 ? WAVE_BONUS_GOLD_MUL : 1;
      // C149: momentum gold bonus
      const momentumGoldMul = this.battleMomentum >= GOLD_MOMENTUM_THRESHOLD ? (1 + GOLD_MOMENTUM_BONUS) : 1;
      // C153: combo gold bonus
      const comboGoldMul = this.comboStreak >= COMBO_GOLD_THRESHOLD
        ? 1 + (this.comboStreak - COMBO_GOLD_THRESHOLD) * COMBO_GOLD_BONUS_PER
        : 1;
      // C155: overkill gold bonus
      const overkillGoldMul = isOverkill ? (1 + OVERKILL_GOLD_BONUS) : 1;
      // C161: crit gold bonus
      // C235: crit gold scaling based on total crits
      const critGoldScale = Math.min(CRIT_GOLD_SCALE_CAP, Math.floor(this.totalCrits / 100) * CRIT_GOLD_SCALE_PER_100);
      const critGoldMul = didCrit ? (1 + CRIT_GOLD_BONUS + critGoldScale) : 1;
      // C170: greed mode — high gold boosts gold gains
      const greedGoldMul = hero.gold >= GREED_MODE_GOLD_THRESHOLD ? (1 + GREED_MODE_GOLD_BONUS) : 1;
      // C188: revenge gold bonus
      const revengeGoldMul = this.revengeGoldRemaining > 0 ? (1 + REVENGE_GOLD_BONUS) : 1;
      if (this.revengeGoldRemaining > 0) this.revengeGoldRemaining--;
      // C214: treasure hunter gold bonus
      const treasureHunterMul = 1 + Math.floor(this.caveVisits / TREASURE_HUNTER_CAVE_INTERVAL) * TREASURE_HUNTER_GOLD_BONUS;
      // C218: gold streak bonus
      const goldStreakMul = this.fightsSinceSpend >= GOLD_STREAK_THRESHOLD ? (1 + GOLD_STREAK_BONUS) : 1;
      // C230: combo gold multiplier
      const comboGoldMul2 = this.comboStreak >= COMBO_GOLD_MUL_THRESHOLD ? (1 + COMBO_GOLD_MUL_BONUS) : 1;
      // C245: kill combo milestone — bonus gold every 50 kills
      const comboMilestoneMul = (this.killCount > 0 && this.killCount % COMBO_MILESTONE_INTERVAL === 0) ? (1 + COMBO_MILESTONE_GOLD_BONUS) : 1;
      // C250: full HP gold bonus
      const fullHpGoldMul = (hero.hp >= hero.hpMax) ? (1 + FULL_HP_GOLD_BONUS) : 1;
      // C270: elite gold bonus
      const eliteGoldMul = isElite ? (1 + ELITE_GOLD_BONUS) : 1;
      // C274: gold cascade
      const goldCascadeMul = this.consecutiveOneHits >= GOLD_CASCADE_THRESHOLD ? GOLD_CASCADE_MULTIPLIER : 1;
      // C276: village blessing gold
      const villageBlessMul = this.villageBlessingRemaining > 0 ? (1 + VILLAGE_BLESSING_GOLD_BONUS) : 1;
      if (this.villageBlessingRemaining > 0) this.villageBlessingRemaining--;
      const goldEarned = Math.floor(GOLD_PER_KILL_BASE * Math.pow(hero.level, GOLD_LEVEL_POWER) * goldMul * dangerGoldMul * waveMul * momentumGoldMul * comboGoldMul * overkillGoldMul * critGoldMul * greedGoldMul * revengeGoldMul * arenaMul * treasureHunterMul * goldStreakMul * comboGoldMul2 * comboMilestoneMul * fullHpGoldMul * eliteGoldMul * goldCascadeMul * villageBlessMul);
      hero.gold += goldEarned;
      // C208: passive gold income based on village visits
      // C259: gold magnet prestige scaling
      hero.gold += Math.min(this.villageVisits * PASSIVE_GOLD_PER_VISIT + this.prestigeCount * GOLD_MAGNET_PRESTIGE_BONUS, PASSIVE_GOLD_CAP);
      // C193: gold tax at high levels (C202: exempt during danger streak)
      if (hero.level >= GOLD_TAX_LEVEL_THRESHOLD && !(DANGER_TAX_IMMUNITY && isDangerZone)) {
        const tax = Math.floor(hero.gold * GOLD_TAX_RATE);
        hero.gold -= tax;
      }
      // C157: boss vault — lump sum gold bonus for boss kills
      if (isBoss) {
        this.bossStreak++;
        this.bossesKilled++; // C239
        // C172: boss streak multiplier
        const streakMul = 1 + (this.bossStreak - 1) * BOSS_STREAK_MULTIPLIER;
        // C186: overkill boss vault doubler
        const bossOverkillMul = isOverkill ? BOSS_OVERKILL_VAULT_MUL : 1;
        // C239: boss loot table — every Nth boss gives double gold
        const bossLootMul = (this.bossesKilled % BOSS_LOOT_INTERVAL === 0) ? BOSS_LOOT_GOLD_MUL : 1;
        const vaultGold = Math.floor(hero.level * BOSS_VAULT_GOLD_PER_LEVEL * streakMul * bossOverkillMul * bossLootMul);
        hero.gold += vaultGold;
        events.push({ type: 'boss_vault', gold: vaultGold });
        // C251: boss slayer buff
        this.bossSlayerRemaining = BOSS_SLAYER_DURATION;
      }
      // C156: HP regen on win
      // C238: reset consecutive deaths on win
      this.consecutiveDeaths = 0;
      // C276: deathless streak increment
      this.fightsSinceLastDeath++;
      // C217: HP regen scaling based on kills
      const regenBonus = Math.min(REGEN_SCALE_CAP, Math.floor(this.totalWins / 50) * REGEN_SCALE_PER_50_KILLS);
      const regenAmount = Math.max(1, Math.floor(hero.hpMax * (WIN_HP_REGEN_RATE + regenBonus)));
      hero.heal(regenAmount);
      // C174: lifesteal — heal based on damage dealt
      const lifestealHeal = Math.max(1, Math.floor(totalDamageDealt * LIFESTEAL_RATE));
      hero.heal(lifestealHeal);
      // C236: overkill heal
      if (isOverkill) {
        hero.heal(Math.max(1, Math.floor(hero.hpMax * OVERKILL_HEAL_RATE)));
      }
      // C247: survival heal — long streaks regenerate HP
      if (this.survivalStreak >= SURVIVAL_HEAL_THRESHOLD) {
        hero.heal(Math.max(1, Math.floor(hero.hpMax * SURVIVAL_HEAL_RATE)));
      }

      events.push({ type: 'battle_won', enemyId: landmarkId, expGain, dropId });
      // C212: reset arena after fight
      if (this.arenaActive) this.arenaActive = false;
      // C177: lucky treasure — random gold bonus
      if (this.rng.chance(LUCKY_TREASURE_CHANCE)) {
        const treasureGold = LUCKY_TREASURE_MIN + this.rng.int(LUCKY_TREASURE_MAX - LUCKY_TREASURE_MIN + 1);
        hero.gold += treasureGold;
        events.push({ type: 'lucky_treasure', gold: treasureGold });
      }
      // C221: lucky find — random free equipment
      if (this.rng.chance(LUCKY_FIND_CHANCE)) {
        const foundItem = this.rollDrop(false);
        if (foundItem) hero.addEquipment(foundItem);
      }
      // C136: decrement shrine buff after each fight
      if (this.shrineBuffRemaining > 0) this.shrineBuffRemaining--;
      // C205: gold investment payout
      if (this.investFightsRemaining > 0) {
        this.investFightsRemaining--;
        if (this.investFightsRemaining === 0 && this.goldInvested > 0) {
          hero.gold += this.goldInvested * GOLD_INVEST_RETURN_MUL;
          this.goldInvested = 0;
        }
      }
      // C154: decrement shop shield after each fight
      if (this.shopShieldRemaining > 0) {
        this.shopShieldRemaining--;
        // C179: shield break — when shield expires, next fight gets bonus
        if (this.shopShieldRemaining === 0) this.shieldBreakReady = true;
      }
      // C242: decrement armor after each fight
      if (this.armorRemaining > 0) this.armorRemaining--;
      // C248: decrement sacrifice fury
      if (this.sacrificeFuryRemaining > 0) this.sacrificeFuryRemaining--;
      // C251: decrement boss slayer
      if (this.bossSlayerRemaining > 0) this.bossSlayerRemaining--;
      // C258: decrement village vigor
      if (this.villageRestRemaining > 0) this.villageRestRemaining--;
      // C265: decrement shrine blessing
      if (this.shrineBlessingRemaining > 0) this.shrineBlessingRemaining--;
      // C137: win resets death streak, decrement mercy
      this.deathStreak = 0;
      if (this.mercyRemaining > 0) this.mercyRemaining--;
      // C141: survival streak increments on win
      this.survivalStreak++;
      // C216: elite combo tracking
      if (isElite) { this.eliteCombo++; } else { this.eliteCombo = 0; }
      if (eliteComboGuarantee) this.eliteCombo = 0; // consumed
      // C146: wave tracking
      this.totalWins++;
      // C218: gold streak counter
      this.fightsSinceSpend++;
      // C223: kills since level-up counter
      this.killsSinceLevelUp++;
      // C210: check kill milestones
      const nextMilestone = ACHIEVEMENT_KILL_THRESHOLDS[this.achievementMilestones];
      if (nextMilestone !== undefined && this.totalWins >= nextMilestone) {
        this.achievementMilestones++;
      }
      // C228: bounty board — flat gold every N kills
      if (this.totalWins % BOUNTY_KILL_INTERVAL === 0) {
        hero.gold += BOUNTY_GOLD_REWARD;
      }
      // C173: exhaustion counter
      this.fightsSinceVillage++;
      // C197: survivor counter
      this.fightsSinceDeath++;
      if (this.fightsSinceDeath % SURVIVOR_THRESHOLD === 0) {
        const hpBonus = Math.max(1, Math.floor(hero.hpMax * SURVIVOR_HP_BONUS));
        hero.hpMax += hpBonus;
      }
      // C148: kill counter milestone
      this.killCount++;
      // C185: elite bounty tracking
      if (isElite) {
        this.eliteKills++;
        if (this.eliteKills % ELITE_BOUNTY_INTERVAL === 0) {
          this.eliteBountyMilestones++;
        }
      }
      if (this.killCount % KILL_MILESTONE_INTERVAL === 0) {
        this.killMilestones++;
        events.push({ type: 'milestone_kill', killCount: this.killCount, milestones: this.killMilestones });
      }
      if (this.waveRemaining > 0) {
        this.waveRemaining--;
        if (this.waveRemaining === 0) {
          events.push({ type: 'wave_complete', totalWins: this.totalWins });
          // C169: multi-kill ATK bonus on wave clear
          hero.atkBase += WAVE_MULTI_KILL_ATK_BONUS;
          hero.recomputeStats();
        }
      } else if (this.totalWins % WAVE_INTERVAL === 0) {
        this.waveRemaining = WAVE_SIZE;
        events.push({ type: 'wave_started', size: WAVE_SIZE });
      }
      // C139: mark first blood as used
      if (!this.firstBloodUsed) {
        this.firstBloodUsed = true;
        events.push({ type: 'first_blood', expGain, dropId });
      }
      // C140: clear revenge target on successful kill
      if (this.lastDeathEnemyId === landmarkId) {
        events.push({ type: 'revenge_kill', enemyId: landmarkId });
        this.lastDeathEnemyId = null;
      }
      // C132: boss rage event — notify when boss fight lasted multiple turns
      if (isBoss && rageTurn > 0) {
        events.push({ type: 'boss_rage', turns: rageTurn, atkMultiplier: 1 + rageTurn * BOSS_RAGE_ATK_PER_TURN });
      }
      // C125: battle momentum — consecutive fights without village give ATK bonus
      this.battleMomentum = Math.min(this.battleMomentum + 1, MOMENTUM_CAP);
      if (isOverkill) {
        events.push({ type: 'overkill', enemyId: landmarkId });
      }
      if (didCrit) {
        events.push({ type: 'critical_hit', streak: this.comboStreak });
      }
      if (this.comboStreak >= COMBO_STREAK_THRESHOLD) {
        events.push({ type: 'combo_streak', streak: this.comboStreak, bonusMul: comboBonus });
      }
      // C124: close call — survive with < 10% HP → adrenaline heal 5% max HP
      if (tookDamage && !hero.staggered && hero.hp < hero.hpMax * CLOSE_CALL_THRESHOLD) {
        const adrenalineHeal = Math.max(1, Math.floor(hero.hpMax * CLOSE_CALL_HEAL));
        hero.heal(adrenalineHeal);
        events.push({ type: 'close_call', hpRemaining: hero.hp, healed: adrenalineHeal });
      }
      // C142: lucky dodge event
      if (luckyDodge) {
        events.push({ type: 'lucky_dodge' });
      }

      // V1c-1 — merciful drift proc on non-boss kills. Sign branches on the
      // hero's current merciful so a prior=0 hero is nudged toward whichever
      // tendency surfaces first and subsequent procs compound that direction.
      if (!isBoss && this.rng.chance(MERCIFUL_PROC_RATE)) {
        const current = hero.personality.get('merciful');
        const sparing = current >= 0;
        const delta = sparing ? MERCIFUL_DRIFT : -MERCIFUL_DRIFT;
        hero.personality.adjust('merciful', delta);
        events.push({
          type: 'moral_choice',
          choice: sparing ? 'spare_enemy' : 'execute_enemy',
          dim: 'merciful',
          delta,
          nameKR: sparing
            ? '쓰러진 적을 살려보내며 자비가 깊어졌다'
            : '쓰러진 적을 처형하여 잔혹함이 굳어졌다',
        });
      }

      for (const newLv of leveled) {
        events.push({ type: 'level_up', from: newLv - 1, to: newLv });
        // C121: milestone fanfare at key levels
        if (MILESTONE_LEVELS.includes(newLv)) {
          events.push({ type: 'milestone_reached', level: newLv });
        }
        // cycle 1 F1: milestone channel 도 SHRINE_SKILL_GRANT_RATE 따르게 통합.
        // 매 100 레벨 마다 deterministic grant 라 826k level 환경에서 ~8200 회
        // fire → skill saturation. shrine 과 같은 확률 gate 로 두 channel 통일.
        if (isSkillMilestoneLevel(newLv) && this.rng.chance(SHRINE_SKILL_GRANT_RATE)) {
          const learn = SkillLearningSystem.tryLearn(hero, this.rng.int(1_000_000_000));
          if (learn) {
            events.push({ type: 'skill_learned', skillId: learn.skillId, skillNameKR: learn.skillNameKR, atkBefore: learn.atkBefore, atkAfter: learn.atkAfter });
          }
        }
      }
      // C184: level-up momentum — flag for next fight exp bonus
      if (leveled.length > 0) {
        this.levelUpMomentum = true;
        this.killsSinceLevelUp = 0; // C223: reset chain
        // C234: heal on level-up
        hero.heal(Math.floor(hero.hpMax * LEVEL_UP_HEAL_RATE));
      }
      // C200: prestige system — reset level at threshold, gain permanent bonus
      // C213: each prestige requires 50 more levels (200, 250, 300, ...)
      const prestigeThreshold = PRESTIGE_LEVEL_REQUIREMENT + this.prestigeCount * PRESTIGE_LEVEL_INCREMENT;
      if (hero.level >= prestigeThreshold) {
        // C253: prestige gold bonus — reward based on level reached
        const prestigeGoldBonus = hero.level * PRESTIGE_GOLD_BONUS_PER_LEVEL;
        hero.gold += prestigeGoldBonus;
        this.prestigeCount++;
        hero.level = 1;
        hero.exp = 0;
        hero.recomputeStats();
        events.push({ type: 'prestige', count: this.prestigeCount });
      }
    } else if (kind === 'village') {
      // C125: village visit resets battle momentum
      this.battleMomentum = 0;
      // C173: reset exhaustion
      this.fightsSinceVillage = 0;
      // C258: village vigor — temp HP bonus
      this.villageRestRemaining = VILLAGE_VIGOR_DURATION;
      // C260: reset death insurance at village
      this.deathInsuranceUsed = false;
      // C276: village blessing for deathless streak
      if (this.fightsSinceLastDeath >= VILLAGE_BLESSING_STREAK) {
        this.villageBlessingRemaining = VILLAGE_BLESSING_DURATION;
      }
      // C218: reset gold streak (village spends gold)
      this.fightsSinceSpend = 0;
      // C134: village rest bonus — arrive with low HP → permanent max HP boost
      if (hero.hp < hero.hpMax * VILLAGE_REST_HP_THRESHOLD) {
        const hpBoost = Math.max(1, Math.floor(hero.hpMax * VILLAGE_REST_HP_BOOST));
        hero.hpMax += hpBoost;
        events.push({ type: 'village_rest_bonus', hpBoost });
      }
      // C154: village shop — spend gold for HP shield
      if (hero.gold >= VILLAGE_SHOP_COST) {
        hero.gold -= VILLAGE_SHOP_COST;
        this.shopShieldRemaining = VILLAGE_SHOP_SHIELD_DURATION;
        events.push({ type: 'village_shop_purchase', cost: VILLAGE_SHOP_COST, effect: 'hp_shield' });
      }
      // C242: village armor purchase
      if (hero.gold >= ARMOR_BUY_COST) {
        hero.gold -= ARMOR_BUY_COST;
        this.armorRemaining = ARMOR_DURATION;
        events.push({ type: 'village_shop_purchase', cost: ARMOR_BUY_COST, effect: 'armor' });
      }
      // C271: gold forge — convert gold to permanent ATK
      if (hero.gold >= GOLD_FORGE_THRESHOLD) {
        hero.gold -= GOLD_FORGE_COST;
        hero.atk += GOLD_FORGE_ATK_FLAT;
        events.push({ type: 'village_shop_purchase', cost: GOLD_FORGE_COST, effect: 'atk_forge' });
      }
      // C168: gold interest
      // C225: interest scales with prestige
      const interestRate = VILLAGE_GOLD_INTEREST_RATE + this.prestigeCount * GOLD_INTEREST_PRESTIGE_BONUS;
      // C262: interest cap scales with prestige
      const interestCap = 50 + this.prestigeCount * GOLD_INTEREST_CAP_PER_PRESTIGE;
      const interest = Math.min(interestCap, Math.floor(hero.gold * interestRate));
      if (interest > 0) hero.gold += interest;
      // C201: village gold fountain
      hero.gold += VILLAGE_GOLD_FOUNTAIN;
      // C205: gold investment — lock gold for GOLD_INVEST_LOCK_FIGHTS fights, get ×3 return
      if (this.investFightsRemaining <= 0 && hero.gold >= GOLD_INVEST_MIN) {
        const investAmount = Math.floor(hero.gold * 0.5); // invest half
        hero.gold -= investAmount;
        this.goldInvested = investAmount;
        this.investFightsRemaining = GOLD_INVEST_LOCK_FIGHTS;
      }
      // C182: village heal scaling
      this.villageVisits++;
      const healRate = Math.min(VILLAGE_HEAL_CAP, VILLAGE_HEAL_BASE + (this.villageVisits - 1) * VILLAGE_HEAL_PER_VISIT);
      const healAmount = Math.floor(hero.hpMax * healRate);
      hero.heal(healAmount);
      // C231: village bank — withdraw stored gold, then deposit portion
      if (this.bankGold > 0) {
        hero.gold += this.bankGold;
        this.bankGold = 0;
      }
      const bankDeposit = Math.floor(hero.gold * BANK_DEPOSIT_RATE);
      if (bankDeposit > 0) {
        hero.gold -= bankDeposit;
        this.bankGold += bankDeposit;
      }
      // C212: arena challenge — spend gold for high-reward next fight
      if (hero.gold >= ARENA_COST) {
        hero.gold -= ARENA_COST;
        this.arenaActive = true;
      }
    } else if (kind === 'shrine') {
      // C189: shrine mastery — increased meditation chance after enough tithes
      const meditationChance = this.shrineTithes >= SHRINE_MASTERY_THRESHOLD
        ? SHRINE_MASTERY_MEDITATION_CHANCE : 0.2;
      if (this.rng.chance(meditationChance)) {
        // V3-H F4: meditation 변형 (20%) — pious +3, 완전 회복, 추가 aging 0.5 tick
        hero.personality.adjust('pious', 3);
        hero.heal(hero.hpMax); // 완전 회복
        hero.tickAge(0.5);     // 명상에 소요되는 시간
        // C136: shrine meditation grants temporary ATK buff
        this.shrineBuffRemaining = SHRINE_MEDITATION_BUFF_DURATION;
        events.push({ type: 'meditation_done', landmarkId });
        events.push({ type: 'shrine_buff_granted', duration: SHRINE_MEDITATION_BUFF_DURATION });
      } else {
        const before = hero.hp;
        hero.heal(Math.floor(hero.hpMax * SHRINE_HEAL_FRACTION));
        const healed = hero.hp - before;
        events.push({ type: 'shrine_visited', landmarkId, healed });
        // C238: shrine lifts darkness curse
        this.darknessCursed = false;
        // C265: shrine blessing
        this.shrineBlessingRemaining = SHRINE_BLESSING_DURATION;
        if (this.rng.chance(SHRINE_SKILL_GRANT_RATE)) {
          const learn = SkillLearningSystem.tryLearn(hero, this.rng.int(1_000_000_000));
          if (learn) {
            events.push({ type: 'skill_learned', skillId: learn.skillId, skillNameKR: learn.skillNameKR, atkBefore: learn.atkBefore, atkAfter: learn.atkAfter });
          }
        }
      }
      // C175: shrine gold tithe — sacrifice gold for permanent ATK boost
      if (hero.gold > 0) {
        const titheGold = Math.max(1, Math.floor(hero.gold * SHRINE_TITHE_RATE));
        hero.gold -= titheGold;
        this.shrineTithes++;
      }
    } else if (kind === 'cave') {
      // C214: track cave visits for treasure hunter bonus
      this.caveVisits++;
      // C187: cave treasure room — 30% chance for gold instead of moral choice
      if (this.rng.chance(CAVE_TREASURE_CHANCE)) {
        const treasureGold = CAVE_TREASURE_MIN + this.rng.int(CAVE_TREASURE_MAX - CAVE_TREASURE_MIN + 1);
        hero.gold += treasureGold;
        events.push({ type: 'lucky_treasure', gold: treasureGold });
      } else {
        // 부상자 발견. 도덕적 결정.
        const heroic = hero.personality.get('heroic');
        const merciful = hero.personality.get('merciful');
        if (heroic + merciful >= 0) {
          hero.personality.adjust('moral', 1);
          events.push({ type: 'moral_choice', choice: 'help_injured', dim: 'moral', delta: 1, nameKR: '부상자를 도와 영혼이 정화되었다' });
        } else {
          hero.personality.adjust('moral', -1);
          events.push({ type: 'moral_choice', choice: 'ignore_injured', dim: 'moral', delta: -1, nameKR: '부상자를 외면하여 영혼이 어두워졌다' });
        }
      }
    } else if (kind === 'ruin') {
      // 강도 만남. moral 따라 분기.
      const moral = hero.personality.get('moral');
      if (moral < 0) {
        hero.personality.adjust('moral', -2);
        events.push({ type: 'moral_choice', choice: 'rob_with_bandits', dim: 'moral', delta: -2, nameKR: '강도단에 합류하여 약자를 약탈했다' });
      } else {
        hero.personality.adjust('moral', 2);
        events.push({ type: 'moral_choice', choice: 'resist_bandits', dim: 'moral', delta: 2, nameKR: '강도단에 맞서 약자를 지켰다' });
      }
    } else if (kind === 'sightseeing') {
      // V3-H F3: 절경 랜드마크 — sightseeing_arrived 를 emit; 실제 personality 조정은
      // CycleControllerV2.handleArrival 에서 rng 기반으로 처리.
      const lmType = LANDMARK_TYPES.find(t => landmarkId.startsWith(t.id));
      events.push({
        type: 'sightseeing_arrived',
        landmarkId,
        landmarkNameKR: lmType?.nameKR ?? '절경',
      });
    } else {
      // V1c-1 personality drift landmarks (watchtower / treasure_cave /
      // holy_ruin / crossroads). The catalog lookup is exhaustive for these
      // kinds; an unknown kind is silently a no-op so the engine stays open
      // to future LandmarkKind additions.
      const enc = findEncounterForKind(kind);
      if (enc) {
        const current = hero.personality.get(enc.dim);
        const branch = selectBranch(current, enc);
        hero.personality.adjust(enc.dim, branch.delta);
        events.push({
          type: 'moral_choice',
          choice: branch.choice,
          dim: enc.dim,
          delta: branch.delta,
          nameKR: branch.nameKR,
        });
      }
    }
    return events;
  }

  private rollDrop(isBoss: boolean): string {
    const pool = isBoss ? BOSS_DROPS : ENEMY_DROPS;
    return pool[this.rng.int(pool.length)].id;
  }
}
