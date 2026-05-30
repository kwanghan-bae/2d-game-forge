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
// C277: exp cascade — 3+ one-hit kills = +50% exp
export const EXP_CASCADE_BONUS = 0.50;
// C278: battle hardening — HP growth every 100 fights
export const BATTLE_HARDEN_INTERVAL = 100;
export const BATTLE_HARDEN_HP_BONUS = 0.01; // +1% max HP
export const BATTLE_HARDEN_CAP = 0.10; // max +10%
// C279: prestige exp scaling — +5% exp per prestige
export const PRESTIGE_EXP_BONUS = 0.05;
// C280: lucky gold drop — 5% chance for bonus gold
export const LUCKY_GOLD_CHANCE = 0.05;
export const LUCKY_GOLD_PER_LEVEL = 10;
// C281: kill momentum exp — faster kills give more exp
export const KILL_MOMENTUM_EXP_BONUS = 0.02; // +2% per win streak (max 10 = +20%)
export const KILL_MOMENTUM_EXP_CAP = 10;
// C282: village shield — village grants 1-hit damage immunity
export const VILLAGE_SHIELD_DURATION = 1; // absorbs 1 hit
// C283: gold per boss multiplier — each boss killed = +2% gold permanently
export const GOLD_PER_BOSS_BONUS = 0.02;
// C284: exp drought breaker — 20+ fights without level-up = +30% exp
export const EXP_DROUGHT_THRESHOLD = 20;
export const EXP_DROUGHT_BONUS = 0.30;
// C285: village training — village grants +5% ATK for 5 fights
export const VILLAGE_TRAINING_ATK_BONUS = 0.05;
export const VILLAGE_TRAINING_DURATION = 5;
// C286: survivor's grit — survive at <5% HP = +50% exp next fight
export const SURVIVOR_GRIT_HP_THRESHOLD = 0.05;
export const SURVIVOR_GRIT_EXP_BONUS = 0.50;
// C287: gold per level milestone — every 10 levels, +5g flat income
export const GOLD_LEVEL_MILESTONE = 10;
export const GOLD_LEVEL_MILESTONE_BONUS = 5;
// C288: survival exp multiplier — scales with current survival streak
export const SURVIVAL_EXP_SCALE = 0.01; // +1% per streak (cap 20%)
export const SURVIVAL_EXP_SCALE_CAP = 0.20;
// C289: prestige ATK scaling — +2% ATK per prestige (stacks with specMul)
export const PRESTIGE_ATK_BONUS_PER = 0.02;
// C290: enemy gold scaling — enemies in higher danger zones give more gold
export const DANGER_GOLD_SCALE = 0.15; // +15% gold per danger zone level
// C291: vengeful spirit — die 3+ times to same enemy type = +40% ATK vs that type (uses dangerStreak as proxy)
export const VENGEFUL_SPIRIT_THRESHOLD = 3;
export const VENGEFUL_SPIRIT_ATK_BONUS = 0.40;
// C292: treasure hoard — find 2× gold every 25 kills
export const TREASURE_HOARD_INTERVAL = 25;
export const TREASURE_HOARD_MUL = 2.0;
// C293: exp chain bonus — every consecutive fight gives +1% exp (resets at village)
export const EXP_CHAIN_PER_FIGHT = 0.01;
export const EXP_CHAIN_CAP = 0.30; // max +30%
// C294: armor break — critical hits reduce enemy defense by 10%
export const ARMOR_BREAK_RATE = 0.10;
// C295: gold interest boost — gold interest rate increases by +1% per 5 village visits
export const INTEREST_VILLAGE_INTERVAL = 5;
export const INTEREST_VILLAGE_BONUS = 0.01;
// C296: death defiance — 10% chance to survive fatal blow at 1 HP (separate from lucky dodge)
export const DEATH_DEFIANCE_CHANCE = 0.10;
// C297: combo gold multiplier — at 50+ combo, gold ×1.5
export const COMBO_GOLD_HIGH_THRESHOLD = 50;
export const COMBO_GOLD_HIGH_MUL = 1.5;
// C298: prestige heal — prestige grants 100% HP restore
export const PRESTIGE_FULL_HEAL = true;
// C299: elite exp bonus — elites give +30% exp
export const ELITE_EXP_BONUS_RATE = 0.30;
// C300: village investment upgrade — each village visit increases investment return by 1%
export const VILLAGE_INVEST_BONUS_PER_VISIT = 0.01;
export const VILLAGE_INVEST_BONUS_CAP = 0.20;
// C301: focus strike — every 5th hit deals ×2 damage
export const FOCUS_STRIKE_INTERVAL = 5;
export const FOCUS_STRIKE_MUL = 2.0;
// C302: gold overflow — excess gold above 5000 converts to exp at 10:1
export const GOLD_OVERFLOW_THRESHOLD = 5000;
export const GOLD_OVERFLOW_RATIO = 10; // 10 gold = 1 exp
// C303: kill streak gold — 10+ kills without village = +25% gold
export const KILL_STREAK_GOLD_THRESHOLD = 10;
export const KILL_STREAK_GOLD_BONUS = 0.25;
// C304: rest exp — village also grants flat 5 × level exp
export const REST_EXP_PER_LEVEL = 5;
// C305: enemy scaling cap — time pressure caps at level 50
export const TIME_PRESSURE_LEVEL_CAP = 50;
// C306: lifesteal — every 10th hit restores 3% HP
export const LIFESTEAL_INTERVAL = 10;
export const LIFESTEAL_HIT_RATE = 0.03;
// C307: gold shield — spending gold at shop grants temporary damage reduction
export const GOLD_SHIELD_DURATION = 3;
export const GOLD_SHIELD_REDUCTION = 0.15;
// C308: boss exp scaling — bosses give more exp with each prestige
export const BOSS_EXP_PRESTIGE_BONUS = 0.10;
// C309: combo heal — at 20+ combo, heal 1% per hit
export const COMBO_HEAL_THRESHOLD = 20;
export const COMBO_HEAL_RATE = 0.01;
// C310: danger gold interest — danger zone fights increase gold interest earned
export const DANGER_INTEREST_BONUS = 0.02;
// C311: crit chain — consecutive crits give +10% ATK each (cap +50%)
export const CRIT_CHAIN_ATK_BONUS = 0.10;
export const CRIT_CHAIN_CAP = 0.50;
// C312: gold harvest — kills at full HP give +15% gold
export const GOLD_HARVEST_HP_THRESHOLD = 1.0;
export const GOLD_HARVEST_BONUS = 0.15;
// C313: wave heal — each wave kill heals 2% HP
export const WAVE_HEAL_RATE = 0.02;
// C314: prestige gold multiplier — +10% gold per prestige
export const PRESTIGE_GOLD_MUL_BONUS = 0.10;
// C315: combo finisher — killing at combo 100+ grants 3× exp
export const COMBO_FINISHER_THRESHOLD = 100;
export const COMBO_FINISHER_EXP_MUL = 3.0;
// C316: village forge upgrade — forge cost decreases by 50 per prestige (min 100)
export const FORGE_COST_PRESTIGE_DISCOUNT = 50;
export const FORGE_COST_MIN = 100;
// C317: enemy weakening — enemies lose 5% HP per 50 total kills (cap -25%)
export const ENEMY_WEAKEN_INTERVAL = 50;
export const ENEMY_WEAKEN_RATE = 0.05;
export const ENEMY_WEAKEN_CAP = 0.25;
// C318: gold per crit — each total crit ever = +1 flat gold income
export const GOLD_PER_CRIT = 1;
export const GOLD_PER_CRIT_CAP = 50;
// C319: regeneration buff — at 10+ village visits, win HP regen doubles
export const REGEN_BUFF_VILLAGE_THRESHOLD = 10;
export const REGEN_BUFF_MUL = 2.0;
// C320: danger zone ATK — fighting in danger zone gives +10% ATK
export const DANGER_ZONE_ATK_BONUS = 0.10;
// C321: boss fury — after killing a boss, next 5 fights get +20% ATK
export const BOSS_FURY_ATK_BONUS = 0.20;
export const BOSS_FURY_DURATION = 5;
// C322: gold hoarding exp — gold above 2000 gives passive exp per fight
export const GOLD_HOARD_EXP_THRESHOLD = 2000;
export const GOLD_HOARD_EXP_PER_1000 = 5;
// C323: wave finisher — killing last enemy in wave gives ×3 gold
export const WAVE_FINISHER_GOLD_MUL = 3.0;
// C324: village ATK boost — village grants +3 flat ATK permanently
export const VILLAGE_ATK_FLAT = 3;
// C325: exp per village — each village visit adds +2% exp permanently (cap +20%)
export const EXP_PER_VILLAGE_BONUS = 0.02;
export const EXP_PER_VILLAGE_CAP = 0.20;
// C326: double gold chance — 3% chance for double gold on any fight
export const DOUBLE_GOLD_CHANCE = 0.03;
// C327: boss weakness — bosses take +15% damage if hero has full HP
export const BOSS_WEAKNESS_BONUS = 0.15;
// C328: combo gold floor — at 10+ combo, minimum gold earned = 10 × level
export const COMBO_GOLD_FLOOR_THRESHOLD = 10;
export const COMBO_GOLD_FLOOR_PER_LEVEL = 10;
// C329: death exp — dying grants 50% of current level exp (consolation)
export const DEATH_EXP_RATE = 0.50;
// C330: final stand — at 1 HP, hero deals ×2 damage
export const FINAL_STAND_HP = 1;
export const FINAL_STAND_DMG_MUL = 2.0;
// C331: elite fury — killing elite grants temp crit boost
export const ELITE_FURY_DURATION = 3;
export const ELITE_FURY_CRIT_BONUS = 0.15;
// C332: gold interest compound — double interest if gold > 1000
export const GOLD_COMPOUND_THRESHOLD = 1000;
// C333: prestige combo bonus — prestige adds to combo
export const PRESTIGE_COMBO_ADD = 2;
// C334: wave survival exp — bonus for surviving wave unscathed
export const WAVE_SURVIVAL_EXP_MUL = 1.5;
// C335: boss trophy ATK — +1% per unique boss killed
export const BOSS_TROPHY_ATK_BONUS = 0.01;
// C336: danger exp cascade — danger kills boost next fight exp
export const DANGER_CASCADE_MUL = 1.3;
export const DANGER_CASCADE_DURATION = 2;
// C337: village fountain enhanced heal
export const FOUNTAIN_ENHANCED_HEAL = 0.30;
// C338: crit gold bonus
export const CRIT_GOLD_BONUS_MUL = 1.20;
// C339: kill count exp milestone — every 100 kills burst
export const KILL_EXP_MILESTONE_INTERVAL = 100;
export const KILL_EXP_MILESTONE_AMOUNT = 50;
// C340: combo shield — combo 10+ reduces damage
export const COMBO_SHIELD_THRESHOLD = 10;
export const COMBO_SHIELD_REDUCTION = 0.15;
// C341: overkill chain gold
export const OVERKILL_CHAIN_GOLD_MUL = 0.10;
export const OVERKILL_CHAIN_CAP = 5;
// C342: prestige full heal on village
export const PRESTIGE_HEAL_BONUS = 0.10; // +10% max HP heal per prestige at village
// C343: exp theft on crit
export const EXP_THEFT_RATE = 0.05; // 5% of base exp stolen on crit
// C344: gold insurance enhanced payout
export const GOLD_INSURANCE_PAYOUT_MUL = 3;
// C345: battle fatigue recovery
export const FATIGUE_FIGHT_THRESHOLD = 50;
export const FATIGUE_RECOVERY_HEAL = 0.20;
// C346: elite spawn rate at high combo
export const ELITE_COMBO_SPAWN_BONUS = 0.02; // +2% elite spawn per 5 combo
// C347: village training extended duration
export const TRAINING_EXTENDED_DURATION = 5;
// C348: danger zone combo preserve
export const DANGER_COMBO_PRESERVE = true;
// C349: boss frenzy exponential
export const BOSS_FRENZY_EXP_BASE = 1.5;
export const BOSS_FRENZY_CAP = 3;
// C350: gold surge every N fights
export const GOLD_SURGE_INTERVAL = 25;
export const GOLD_SURGE_AMOUNT = 0.10; // 10% of current gold
// C351: revenge gold multiplier
export const REVENGE_GOLD_MUL = 3.0;
// C352: combo exp overflow to gold
export const COMBO_EXP_OVERFLOW_RATIO = 200;
// C353: shield break gold burst
export const SHIELD_BREAK_GOLD = 50;
// C354: prestige ATK surge — first fight after prestige
export const PRESTIGE_SURGE_ATK_MUL = 5.0;
// C355: elite loot upgrade (use boss pool)
export const ELITE_LOOT_UPGRADE = true;
// C356: village defense immunity
export const VILLAGE_DEFENSE_FIGHTS = 1;
// C357: danger exp chain compound
export const DANGER_EXP_CHAIN_MUL = 0.05;
// C358: gold per hit bonus
export const GOLD_PER_HIT_BONUS = 2;
// C359: boss enrage exp bonus
export const BOSS_ENRAGE_EXP_BONUS = 0.50;
// C360: combo prestige synergy flat ATK
export const COMBO_PRESTIGE_ATK_FLAT = 5;
// C361: wave gold surge
export const WAVE_GOLD_SURGE_PER_KILL = 0.05;
// C362: prestige exp floor
export const PRESTIGE_EXP_FLOOR_PER_LEVEL = 5;
// C363: crit chain gold
export const CRIT_CHAIN_GOLD_BONUS = 0.10;
// C364: village forge visit discount
export const FORGE_VISIT_DISCOUNT = 0.02;
// C365: danger ATK chain
export const DANGER_ATK_CHAIN_BONUS = 0.03;
// C366: boss defeat heal
export const BOSS_DEFEAT_HEAL_RATE = 0.20;
// C367: combo milestone ATK
export const COMBO_ATK_MILESTONE_INTERVAL = 10;
export const COMBO_MILESTONE_ATK = 2;
// C368: gold overflow shield
export const GOLD_SHIELD_OVERFLOW_THRESHOLD = 500;
export const GOLD_OVERFLOW_SHIELD_DURATION = 3;
export const GOLD_OVERFLOW_SHIELD_REDUCTION = 0.30;
// C369: exp per boss trophy
export const TROPHY_EXP_BONUS = 0.02;
// C370: elite chain reward
export const ELITE_CHAIN_THRESHOLD = 2;
export const ELITE_CHAIN_GOLD = 30;
// C371: prestige gold multiplier — each prestige adds flat gold %
export const PRESTIGE_GOLD_PER_COUNT = 0.08;
// C372: danger zone combo preservation bonus — extra ATK when combo preserved in danger
export const DANGER_COMBO_ATK_BONUS = 0.15;
// C373: wave exp scaling — exp grows with wave count
export const WAVE_EXP_SCALE_PER_WAVE = 0.02;
export const WAVE_EXP_SCALE_CAP = 1.0;
// C374: boss vault prestige bonus — prestige boosts boss vault gold
export const BOSS_VAULT_PRESTIGE_MUL = 0.10;
// C375: combo breaker gold — breaking enemy combo streak gives gold
export const COMBO_BREAK_GOLD_PER_LEVEL = 5;
// C376: crit mastery — crits increase future crit chance slightly
export const CRIT_MASTERY_PER_CRIT = 0.001;
export const CRIT_MASTERY_CAP = 0.10;
// C377: village rest bonus — full heal gives temp ATK boost
export const VILLAGE_REST_ATK_DURATION = 5;
export const VILLAGE_REST_ATK_BONUS = 0.20;
// C378: danger zone gold cap increase — higher danger streaks raise gold cap
export const DANGER_GOLD_CAP_PER_STREAK = 50;
// C379: elite exp chain — consecutive elites give escalating exp
export const ELITE_EXP_CHAIN_BONUS = 0.10;
// C380: prestige shield — first hit after prestige is blocked
export const PRESTIGE_SHIELD_HITS = 3;
// C381: exp per village visit — each village grants flat exp
export const VILLAGE_EXP_PER_VISIT = 3;
// C382: danger zone prestige bonus — danger + prestige = extra gold
export const DANGER_PRESTIGE_GOLD_MUL = 0.05;
// C383: boss chain gold — consecutive bosses give escalating gold
export const BOSS_CHAIN_GOLD_PER_LEVEL = 10;
// C384: combo crit synergy — high combo + crit = extra damage
export const COMBO_CRIT_SYNERGY_THRESHOLD = 15;
export const COMBO_CRIT_DMG_BONUS = 0.50;
// C385: wave momentum — surviving full wave boosts next fight ATK
export const WAVE_MOMENTUM_ATK_DURATION = 3;
export const WAVE_MOMENTUM_ATK_MUL = 0.25;
// C386: elite prestige loot — prestige + elite = guaranteed gold bonus
export const ELITE_PRESTIGE_GOLD_FLAT = 50;
// C387: danger chain heal — long danger streak heals small amount
export const DANGER_CHAIN_HEAL_THRESHOLD = 5;
export const DANGER_CHAIN_HEAL_RATE = 0.05;
// C388: gold invest returns — banked gold grows slightly each fight
export const BANK_INTEREST_RATE = 0.01;
export const BANK_INTEREST_CAP = 100;
// C389: prestige exp multiplier — each prestige boosts all exp
export const PRESTIGE_ALL_EXP_BONUS = 0.05;
// C390: combat mastery — total fights increase base ATK
export const COMBAT_MASTERY_PER_100 = 1;
export const COMBAT_MASTERY_CAP = 20;
// C391: survival gold bonus — staying alive long gives gold per 10 fights
export const SURVIVAL_GOLD_THRESHOLD = 10;
export const SURVIVAL_GOLD_PER_LEVEL = 2;
// C392: prestige danger immunity — first danger fight after prestige takes no damage
export const PRESTIGE_DANGER_IMMUNE_FIGHTS = 2;
// C393: wave gold cascade — each wave fight gives more gold than last
export const WAVE_GOLD_CASCADE_PER_FIGHT = 0.08;
// C394: boss exp mastery — unique bosses give permanent exp bonus
export const BOSS_EXP_MASTERY_PER_UNIQUE = 0.01;
export const BOSS_EXP_MASTERY_CAP = 0.30;
// C395: crit heal scaling — crit heal grows with total crits
export const CRIT_HEAL_SCALE_PER_100 = 0.01;
export const CRIT_HEAL_SCALE_CAP = 0.10;
// C396: combo gold escalation — gold formula grows faster at high combo
export const COMBO_GOLD_ESCALATION_THRESHOLD = 20;
export const COMBO_GOLD_ESCALATION_BONUS = 0.03;
// C397: elite danger synergy — elite in danger zone = double exp bonus
export const ELITE_DANGER_EXP_BONUS = 0.50;
// C398: village prestige compound — village heal improves with prestige
export const VILLAGE_PRESTIGE_HEAL_BONUS = 0.02;
// C399: death gold protection — save portion of gold on death based on prestige
export const DEATH_GOLD_PROTECT_PER_PRESTIGE = 0.05;
export const DEATH_GOLD_PROTECT_CAP = 0.50;
// C400: final mastery — all multipliers get small boost based on total playtime
export const FINAL_MASTERY_PER_1000_FIGHTS = 0.02;
export const FINAL_MASTERY_CAP = 0.20;
// C401: revenge streak — dying multiple times builds ATK multiplier
export const REVENGE_STREAK_ATK_PER_DEATH = 0.10;
export const REVENGE_STREAK_CAP = 0.50;
export const REVENGE_STREAK_DURATION = 5;
// C402: gold rain — chance of gold rain event after boss
export const GOLD_RAIN_CHANCE = 0.15;
export const GOLD_RAIN_MUL = 3.0;
// C403: exp fountain — village grants exp based on total fights
export const EXP_FOUNTAIN_PER_100_FIGHTS = 5;
// C404: shield regen — shields regenerate 1 charge per 5 fights
export const SHIELD_REGEN_INTERVAL = 5;
// C405: danger mastery — total danger fights boost danger zone rewards
export const DANGER_MASTERY_PER_50 = 0.05;
export const DANGER_MASTERY_CAP = 0.50;
// C406: combo persistence — combo doesn't fully reset, keeps 25%
export const COMBO_PERSIST_RATE = 0.25;
// C407: boss trophy gold — each unique boss adds flat gold per fight
export const BOSS_TROPHY_GOLD_PER_UNIQUE = 2;
// C408: elite mastery exp — total elites boost exp globally
export const ELITE_MASTERY_PER_20 = 0.02;
export const ELITE_MASTERY_CAP = 0.30;
// C409: prestige momentum — prestige count boosts momentum multiplier
export const PRESTIGE_MOMENTUM_BONUS = 0.03;
// C410: wave chain bonus — completing consecutive waves gives ATK
export const WAVE_CHAIN_ATK_PER_WAVE = 1;
export const WAVE_CHAIN_CAP = 10;
// C411: prestige crit bonus — prestige increases crit damage
export const PRESTIGE_CRIT_DMG_BONUS = 0.15;
// C412: danger gold streak — consecutive danger wins multiply gold
export const DANGER_GOLD_STREAK_BONUS = 0.08;
// C413: combo exp cascade — high combo cascades exp to lower enemies
export const COMBO_EXP_CASCADE_THRESHOLD = 8;
export const COMBO_EXP_CASCADE_MUL = 0.20;
// C414: boss heal on kill — killing boss heals based on boss level
export const BOSS_HEAL_ON_KILL_RATE = 0.15;
// C415: elite gold chain — consecutive elites escalate gold
export const ELITE_GOLD_CHAIN_BONUS = 0.12;
// C416: village training exp — village grants training exp based on prestige
export const VILLAGE_TRAINING_EXP_PER_PRESTIGE = 3;
// C417: death insurance — save portion of exp on death
export const DEATH_EXP_SAVE_RATE = 0.10;
// C418: wave gold accumulator — gold earned in wave multiplied at end
export const WAVE_GOLD_ACCUMULATOR_MUL = 0.05;
// C419: combo shield regen — reaching combo milestones regens shield
export const COMBO_SHIELD_REGEN_THRESHOLD = 10;
// C420: prestige exp scaling — prestige count scales exp formula base
export const PRESTIGE_EXP_SCALE_BONUS = 0.04;
export const PRESTIGE_EXP_SCALE_CAP = 0.40;
// C421: overkill chain gold — consecutive overkills multiply gold (stacks with existing)
export const OVERKILL_CHAIN_EXTRA_MUL = 0.06;
export const OVERKILL_CHAIN_EXTRA_CAP = 5;
// C422: danger crit bonus — crits in danger zone deal more damage
export const DANGER_CRIT_BONUS = 0.25;
// C423: survival exp compound — long survival streaks compound exp
export const SURVIVAL_COMPOUND_THRESHOLD = 20;
export const SURVIVAL_COMPOUND_EXP_MUL = 0.15;
// C424: prestige gold interest — prestige increases bank interest
export const PRESTIGE_BANK_INTEREST_BONUS = 0.005;
// C425: elite boss synergy — elite after boss gives double loot chance
export const ELITE_BOSS_SYNERGY_DROP_BONUS = 0.20;
// C426: combo gold milestone — every 15 combo grants flat gold
export const COMBO_GOLD_MILESTONE_INTERVAL = 15;
export const COMBO_GOLD_MILESTONE_AMOUNT = 10;
// C427: wave danger bonus — waves in danger zone get extra exp
export const WAVE_DANGER_EXP_BONUS = 0.20;
// C428: death count ATK — total deaths boost ATK permanently
export const DEATH_COUNT_ATK_PER_10 = 1;
export const DEATH_COUNT_ATK_CAP = 15;
// C429: prestige shield strength — prestige increases shield block amount
export const PRESTIGE_SHIELD_BLOCK_BONUS = 0.05;
// C430: boss gold vault scaling — vault gold scales with prestige
export const BOSS_VAULT_PRESTIGE_SCALE = 0.10;
// C431: combo exp finisher bonus — ending high combo gives burst exp
export const COMBO_END_EXP_THRESHOLD = 12;
export const COMBO_END_EXP_PER_COMBO = 2;
// C432: danger streak gold compound — long danger streaks compound gold
export const DANGER_STREAK_GOLD_COMPOUND = 0.04;
export const DANGER_STREAK_COMPOUND_THRESHOLD = 3;
// C433: elite chain ATK — consecutive elites boost ATK temporarily
export const ELITE_CHAIN_ATK_BONUS = 0.08;
export const ELITE_CHAIN_ATK_DURATION = 3;
// C434: prestige heal boost — prestige increases all healing
export const PRESTIGE_HEAL_BOOST = 0.03;
// C435: wave completion gold bonus — wave clear gives flat gold
export const WAVE_COMPLETE_GOLD_BONUS = 5;
// C436: boss fury ATK scaling — boss fury buff scales with kills
export const BOSS_FURY_ATK_SCALE = 0.02;
// C437: crit chain exp — consecutive crits boost exp
export const CRIT_CHAIN_EXP_BONUS = 0.04;
// C438: village gold fountain upgrade — village gold scales with visits
export const VILLAGE_GOLD_FOUNTAIN_SCALE = 0.5;
// C439: death defiance — cooldown-based survival chance
export const DEATH_DEFIANCE_PRESTIGE_CHANCE = 0.08;
export const DEATH_DEFIANCE_PRESTIGE_COOLDOWN = 10;
// C440: combo prestige synergy — combo multipliers scale with prestige
export const COMBO_PRESTIGE_SCALE = 0.02;
// C441: danger exp mastery — total danger fights boost exp globally
export const DANGER_EXP_MASTERY_PER_100 = 0.03;
export const DANGER_EXP_MASTERY_CAP = 0.30;
// C442: boss gold cascade — each boss this run multiplies gold
export const BOSS_GOLD_CASCADE_PER_BOSS = 0.05;
// C443: elite exp burst — first elite after village gives burst exp
export const ELITE_VILLAGE_EXP_BURST = 0.25;
// C444: combo ATK acceleration — combo speed multiplies ATK
export const COMBO_ATK_ACCEL_THRESHOLD = 5;
export const COMBO_ATK_ACCEL_BONUS = 0.03;
// C445: prestige gold cascade — prestige multiplies all gold sources
export const PRESTIGE_GOLD_CASCADE_BONUS = 0.02;
export const PRESTIGE_GOLD_CASCADE_CAP = 0.30;
// C446: wave exp burst — completing wave gives burst exp
export const WAVE_EXP_BURST_PER_LEVEL = 3;
// C447: danger shield — surviving danger gives temp shield
export const DANGER_SHIELD_GRANT_CHANCE = 0.12;
// C448: boss crit bonus — boss fights increase crit chance
export const BOSS_CRIT_BONUS = 0.05;
// C449: death gold compound — dying multiple times compounds gold on return
export const DEATH_GOLD_COMPOUND_PER_DEATH = 0.03;
export const DEATH_GOLD_COMPOUND_CAP = 0.30;
// C450: elite prestige ATK — prestige makes elite kills boost ATK more
export const ELITE_PRESTIGE_ATK_BONUS = 0.01;
// C451: gold overflow shield upgrade — overflow shield blocks more
export const GOLD_OVERFLOW_SHIELD_UPGRADE = 2;
// C452: combo gold velocity — fast combos give more gold
export const COMBO_GOLD_VELOCITY_BONUS = 0.02;
// C453: prestige danger gold — prestige makes danger zones give more gold
export const PRESTIGE_DANGER_GOLD_BONUS = 0.04;
// C454: wave ATK momentum — killing in waves builds permanent ATK
export const WAVE_ATK_MOMENTUM_PER_WAVE = 0.5;
export const WAVE_ATK_MOMENTUM_CAP = 20;
// C455: elite exp mastery upgrade — elite mastery scales faster
export const ELITE_MASTERY_UPGRADE_BONUS = 0.01;
// C456: boss vault compound — vault gold compounds with consecutive bosses
export const BOSS_VAULT_COMPOUND_BONUS = 0.08;
// C457: crit gold mastery — total crits boost gold permanently
export const CRIT_GOLD_MASTERY_PER_50 = 0.02;
export const CRIT_GOLD_MASTERY_CAP = 0.30;
// C458: village shield upgrade — village restores more shield
export const VILLAGE_SHIELD_RESTORE = 2;
// C459: death exp cascade — dying at high level gives proportional exp
export const DEATH_EXP_CASCADE_RATE = 0.05;
// C460: combo danger synergy — combo in danger zone gets extra multiplier
export const COMBO_DANGER_SYNERGY_THRESHOLD = 5;
export const COMBO_DANGER_SYNERGY_MUL = 0.15;
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
  private villageShieldActive = false; // C282: 1-hit shield
  private villageTrainingRemaining = 0; // C285: ATK buff duration
  private survivorGritActive = false; // C286: survived at low HP
  private fightChainCount = 0; // C293: fights since last village (for exp chain)
  private goldShieldRemaining = 0; // C307: gold shield from shop
  private consecutiveCrits = 0; // C311: crit chain counter
  private bossFuryRemaining = 0; // C321: post-boss ATK buff
  private eliteFuryRemaining = 0; // C331: post-elite crit boost
  private uniqueBossKills = 0; // C335: unique boss kills
  private dangerCascadeRemaining = 0; // C336: danger cascade duration
  private consecutiveBossKills = 0; // C349: boss frenzy tracking
  private fightsSinceVillage = 0; // C345: fatigue recovery tracking
  private prestigeSurgeReady = false; // C354: first fight after prestige
  private villageDefenseRemaining = 0; // C356: village temp immunity
  private dangerChainCount = 0; // C357: consecutive danger kills
  private goldOverflowShieldRemaining = 0; // C368
  private comboMilestoneBonus = 0; // C367: permanent bonus from combo milestones
  private maxComboReached = 0; // C367: track highest combo
  private forgeDiscount = 0; // C364: accumulated village forge discount
  private critMasteryBonus = 0; // C376: accumulated crit mastery
  private villageRestAtkRemaining = 0; // C377: village rest ATK buff
  private prestigeShieldRemaining = 0; // C380: hits blocked after prestige
  private waveMomentumRemaining = 0; // C385: wave momentum ATK buff
  private prestigeDangerImmune = 0; // C392: immune to danger damage after prestige
  private revengeStreakRemaining = 0; // C401: revenge streak buff duration
  private revengeStreakPower = 0; // C401: accumulated revenge ATK bonus
  private totalEliteKills = 0; // C408: track total elites
  private consecutiveWaveClears = 0; // C410: consecutive wave completions
  private dangerFights = 0; // C405: track total danger zone fights
  private overkillChain = 0; // C421: consecutive overkills
  private eliteChainAtkRemaining = 0; // C433: elite chain ATK buff duration
  private deathDefianceCooldown = 0; // C439: death defiance cooldown
  private eliteAfterVillage = false; // C443: track first elite after village
  private deathGoldCompound = 0; // C449: accumulated gold compound from deaths

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
      if (isDangerZone) { this.dangerStreak++; this.dangerFights++; } else { this.dangerStreak = 0; }
      // C133: elite enemy — 5% chance on non-boss, non-danger encounters. ×2 HP, guaranteed drop, ×2.5 exp.
      // C346: elite spawn rate boost at high combo
      const eliteComboBonus = Math.floor(this.comboStreak / 5) * ELITE_COMBO_SPAWN_BONUS;
      const isElite = !isBoss && !isDangerZone && this.rng.chance(ELITE_SPAWN_RATE + eliteComboBonus);
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
      // C317: enemy weakening — kills reduce enemy HP
      const enemyWeakenMul = 1 - Math.min(ENEMY_WEAKEN_CAP, Math.floor(this.killCount / ENEMY_WEAKEN_INTERVAL) * ENEMY_WEAKEN_RATE);
      const enemyHp = Math.max(1, Math.floor(enemyHpAtLevel(ENEMY_BASE_HP, hero.level, isBoss ? BOSS_HP_MUL : hpMul) * bossStreakScale * timePressureMul * enemyWeakenMul));
      const enemyAtk = Math.floor(enemyAtkAtLevel(ENEMY_BASE_ATK, hero.level, isBoss ? BOSS_ATK_MUL : atkMul) * bossStreakScale);

      if (hero.staggered) return events;
      // C439: decrement death defiance cooldown
      if (this.deathDefianceCooldown > 0) this.deathDefianceCooldown--;

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
      // C285: village training ATK buff
      const trainingMul = this.villageTrainingRemaining > 0 ? (1 + VILLAGE_TRAINING_ATK_BONUS) : 1;
      if (this.villageTrainingRemaining > 0) this.villageTrainingRemaining--;
      // C289: prestige ATK scaling
      const prestigeAtkMul = 1 + this.prestigeCount * PRESTIGE_ATK_BONUS_PER;
      // C291: vengeful spirit — consecutive deaths (danger streak) = bonus ATK
      const vengefulMul = this.consecutiveDeaths >= VENGEFUL_SPIRIT_THRESHOLD ? (1 + VENGEFUL_SPIRIT_ATK_BONUS) : 1;
      // C311: crit chain ATK bonus
      const critChainMul = 1 + Math.min(CRIT_CHAIN_CAP, this.consecutiveCrits * CRIT_CHAIN_ATK_BONUS);
      // C320: danger zone ATK bonus
      const dangerComboBonus = isDangerZone && this.comboStreak > 0 ? DANGER_COMBO_ATK_BONUS : 0;
      const dangerAtkMul = isDangerZone ? (1 + DANGER_ZONE_ATK_BONUS + this.dangerChainCount * DANGER_ATK_CHAIN_BONUS + dangerComboBonus) : 1;
      // C321: boss fury ATK buff
      // C436: boss fury ATK scaling — fury scales with boss kills
      const bossFuryMul = this.bossFuryRemaining > 0 ? (1 + BOSS_FURY_ATK_BONUS + this.consecutiveBossKills * BOSS_FURY_ATK_SCALE) : 1;
      if (this.bossFuryRemaining > 0) this.bossFuryRemaining--;
      // C330: final stand — at 1 HP, ×2 damage
      const finalStandMul = hero.hp === FINAL_STAND_HP ? FINAL_STAND_DMG_MUL : 1;
      // C335: boss trophy ATK
      const bossTrophyMul = 1 + this.uniqueBossKills * BOSS_TROPHY_ATK_BONUS;
      // C354: prestige ATK surge — first fight after prestige
      const prestigeSurgeMul = this.prestigeSurgeReady ? PRESTIGE_SURGE_ATK_MUL : 1;
      if (this.prestigeSurgeReady) this.prestigeSurgeReady = false;
      // C360: combo prestige synergy flat ATK
      const comboPrestigeFlat = this.comboStreak * this.prestigeCount * COMBO_PRESTIGE_ATK_FLAT;
      // C377: village rest ATK buff
      const villageRestAtkMul = this.villageRestAtkRemaining > 0 ? (1 + VILLAGE_REST_ATK_BONUS) : 1;
      if (this.villageRestAtkRemaining > 0) this.villageRestAtkRemaining--;
      // C385: wave momentum ATK
      const waveMomentumAtkMul = this.waveMomentumRemaining > 0 ? (1 + WAVE_MOMENTUM_ATK_MUL) : 1;
      if (this.waveMomentumRemaining > 0) this.waveMomentumRemaining--;
      // C401: revenge streak ATK multiplier
      const revengeStreakMul = this.revengeStreakRemaining > 0 ? (1 + this.revengeStreakPower) : 1;
      if (this.revengeStreakRemaining > 0) this.revengeStreakRemaining--;
      // C410: wave chain ATK bonus
      const waveChainAtk = Math.min(WAVE_CHAIN_CAP, this.consecutiveWaveClears) * WAVE_CHAIN_ATK_PER_WAVE;
      // C390: combat mastery — total fights increase base ATK
      const combatMastery = Math.min(COMBAT_MASTERY_CAP, Math.floor((this.totalWins + this.totalDeaths) / 100) * COMBAT_MASTERY_PER_100);
      // C428: death count ATK — total deaths boost ATK permanently
      const deathCountAtk = Math.min(DEATH_COUNT_ATK_CAP, Math.floor(this.totalDeaths / 10) * DEATH_COUNT_ATK_PER_10);
      // C433: elite chain ATK — consecutive elites boost ATK temporarily
      const eliteChainAtkMul = this.eliteChainAtkRemaining > 0 ? (1 + ELITE_CHAIN_ATK_BONUS * this.eliteCombo) : 1;
      if (this.eliteChainAtkRemaining > 0) this.eliteChainAtkRemaining--;
      // C440: combo prestige synergy — combo multipliers scale with prestige
      const comboPrestigeSynergyMul = this.comboStreak > 0 ? (1 + this.prestigeCount * COMBO_PRESTIGE_SCALE) : 1;
      const baseHeroAtk = Math.max(1, Math.floor((hero.atk + comboPrestigeFlat + this.comboMilestoneBonus + combatMastery + waveChainAtk + deathCountAtk) * damping * bossAtkMul * realmAtkMul * momentumMul * shrineMul * revengeMul * milestoneMul * nearDeathMul * exhaustionMul * titheMul * shieldBreakMul * comboBreakerMul * prestigeMul * achieveMul * weatherAtkMul * deathAtkMul * berserkerMul * curseMul * specMul * elementalMul * furyMul * staminaMul * goldHoardMul * bossKillAtkMul * adrenalineMul * trainingMul * prestigeAtkMul * vengefulMul * critChainMul * dangerAtkMul * bossFuryMul * finalStandMul * bossTrophyMul * prestigeSurgeMul * villageRestAtkMul * waveMomentumAtkMul * revengeStreakMul * eliteChainAtkMul * comboPrestigeSynergyMul));
      // C122: critical hit — when combo streak >= 5, 20% chance per attack for x2 damage
      // C333: prestige combo bonus
      const effectiveCombo = this.comboStreak + this.prestigeCount * PRESTIGE_COMBO_ADD;
      const canCrit = effectiveCombo >= CRIT_STREAK_THRESHOLD;
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
      const MAX_COMBAT_TURNS = 500;
      while (eHp > 0 && !hero.staggered && hitCount < MAX_COMBAT_TURNS) {
        // C203: crit streak — guaranteed crit after 3 consecutive crits
        const guaranteedCrit = this.critStreak >= CRIT_STREAK_GUARANTEE_THRESHOLD;
        // C224: berserker crit bonus
        const berserkerCrit = hero.hp < hero.hpMax * BERSERKER_HP_THRESHOLD ? BERSERKER_CRIT_BONUS : 0;
        // C331: elite fury crit bonus
        const eliteFuryCrit = this.eliteFuryRemaining > 0 ? ELITE_FURY_CRIT_BONUS : 0;
        // C448: boss crit bonus — boss fights increase crit chance
        const bossCritExtra = isBoss ? BOSS_CRIT_BONUS : 0;
        const isCrit = canCrit && (guaranteedCrit || this.rng.chance(CRIT_CHANCE * weatherCritMul + berserkerCrit + eliteFuryCrit + this.critMasteryBonus + bossCritExtra));
        if (isCrit) { this.critStreak++; this.critMasteryBonus = Math.min(CRIT_MASTERY_CAP, this.critMasteryBonus + CRIT_MASTERY_PER_CRIT); } else { this.critStreak = 0; }
        if (guaranteedCrit) this.critStreak = 0; // consume guarantee
        const baseCritAtk = isCrit ? baseHeroAtk * (this.rng.chance(LUCKY_CRIT_CHANCE) ? LUCKY_CRIT_MUL : CRIT_DAMAGE_MUL) * (1 + this.prestigeCount * PRESTIGE_CRIT_DMG_BONUS) : baseHeroAtk;
        // C384: combo crit synergy — high combo + crit = extra damage
        const comboCritBonus = (isCrit && this.comboStreak >= COMBO_CRIT_SYNERGY_THRESHOLD) ? (1 + COMBO_CRIT_DMG_BONUS) : 1;
        // C422: danger crit bonus — crits in danger zone deal more
        const dangerCritBonus = (isCrit && isDangerZone) ? (1 + DANGER_CRIT_BONUS) : 1;
        const heroAtk = Math.floor(baseCritAtk * comboCritBonus * dangerCritBonus);
        // C395: crit heal scaling — crit heal grows with total crits
        const critHealScale = Math.min(CRIT_HEAL_SCALE_CAP, Math.floor(this.totalCrits / 100) * CRIT_HEAL_SCALE_PER_100);
        if (isCrit) { didCrit = true; this.totalCrits++; hero.heal(Math.max(1, Math.floor(hero.hpMax * (CRIT_HEAL_RATE + critHealScale)))); }
        // C192: boss rage reset on crit
        if (isCrit && isBoss && BOSS_RAGE_RESET_ON_CRIT) rageTurn = 0;
        hitCount++;
        // C209: boss immunity phase — boss takes 0 damage every Nth turn
        const bossImmune = isBoss && hitCount % BOSS_IMMUNITY_INTERVAL === 0;
        // C232: first hit advantage
        const firstHitMul = hitCount === 1 ? FIRST_HIT_DAMAGE_MUL : 1;
        // C268: dodge counter ATK boost
        const dodgeAtkBonus = Math.min(DODGE_COUNTER_ATK_CAP, dodgeCount * DODGE_COUNTER_ATK_BONUS);
        // C294: armor break on crit — reduce enemy effective HP
        const armorBreakMul = (isCrit && hitCount > 1) ? (1 + ARMOR_BREAK_RATE) : 1;
        // C301: focus strike — every 5th hit ×2
        const focusStrikeMul = (hitCount > 0 && hitCount % FOCUS_STRIKE_INTERVAL === 0) ? FOCUS_STRIKE_MUL : 1;
        // C327: boss weakness — boss takes +15% if hero full HP
        const bossWeakMul = (isBoss && hero.hp >= hero.hpMax) ? (1 + BOSS_WEAKNESS_BONUS) : 1;
        const effectiveAtk = bossImmune ? 0 : Math.floor(heroAtk * firstHitMul * (1 + dodgeAtkBonus) * armorBreakMul * focusStrikeMul * bossWeakMul);
        // C353: shield break gold — hit landing after immunity phase
        if (!bossImmune && isBoss && hitCount > 1 && (hitCount - 1) % BOSS_IMMUNITY_INTERVAL === 0) {
          hero.gold += SHIELD_BREAK_GOLD;
        }
        totalDamageDealt += effectiveAtk;
        eHp -= effectiveAtk;
        // C306: lifesteal — every 10th hit
        if (hitCount > 0 && hitCount % LIFESTEAL_INTERVAL === 0) {
          hero.heal(Math.max(1, Math.floor(hero.hpMax * LIFESTEAL_HIT_RATE)));
        }
        // C309: combo heal — at 20+ combo, heal per hit
        if (this.comboStreak >= COMBO_HEAL_THRESHOLD) {
          hero.heal(Math.max(1, Math.floor(hero.hpMax * COMBO_HEAL_RATE)));
        }
        // C313: wave heal — each hit during wave heals
        if (this.waveRemaining > 0) {
          hero.heal(Math.max(1, Math.floor(hero.hpMax * WAVE_HEAL_RATE)));
        }
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
          // C307: gold shield damage reduction
          const goldShieldMul = this.goldShieldRemaining > 0 ? (1 - GOLD_SHIELD_REDUCTION) : 1;
          if (this.goldShieldRemaining > 0) this.goldShieldRemaining--;
          // C340: combo shield — high combo reduces damage
          const comboShieldMul = this.comboStreak >= COMBO_SHIELD_THRESHOLD ? (1 - COMBO_SHIELD_REDUCTION) : 1;
          // C368: gold overflow shield damage reduction
          const goldOverflowMul = this.goldOverflowShieldRemaining > 0 ? (1 - GOLD_OVERFLOW_SHIELD_REDUCTION) : 1;
          if (this.goldOverflowShieldRemaining > 0) this.goldOverflowShieldRemaining--;
          const incomingDmg = Math.max(1, Math.floor(rageAtk * mercyReduction * shieldReduction * goldArmorMul * nightDmgMul * armorMul * vigorMul * goldShieldMul * comboShieldMul * goldOverflowMul));
          // C380: prestige shield blocks hits
          if (this.prestigeShieldRemaining > 0) {
            this.prestigeShieldRemaining--;
            // C429: prestige shield strength — shield block heals
            hero.heal(Math.max(1, Math.floor(hero.hpMax * this.prestigeCount * PRESTIGE_SHIELD_BLOCK_BONUS)));
            rageTurn++;
            continue;
          }
          // C392: prestige danger immunity
          if (isDangerZone && this.prestigeDangerImmune > 0) {
            this.prestigeDangerImmune--;
            rageTurn++;
            continue;
          }
          // C356: village defense immunity
          if (this.villageDefenseRemaining > 0) {
            this.villageDefenseRemaining--;
            rageTurn++;
            continue;
          }
          // C282: village shield absorbs first hit
          if (this.villageShieldActive) {
            this.villageShieldActive = false;
          } else {
            hero.takeDamage(incomingDmg);
          }
          // C206: damage reflection
          eHp -= Math.max(1, Math.floor(incomingDmg * DAMAGE_REFLECT_RATE));
          // C142: lucky dodge — survive fatal hit with 10% chance
          if (hero.staggered && this.rng.chance(LUCKY_DODGE_CHANCE)) {
            hero.staggered = false;
            hero.hp = 1;
            luckyDodge = true;
          }
          // C296: death defiance — separate 10% survival chance
          if (hero.staggered && !luckyDodge && this.rng.chance(DEATH_DEFIANCE_CHANCE)) {
            hero.staggered = false;
            hero.hp = 1;
          }
          // C439: death defiance prestige — cooldown-based survival
          if (hero.staggered && this.deathDefianceCooldown <= 0 && this.prestigeCount > 0 && this.rng.chance(DEATH_DEFIANCE_PRESTIGE_CHANCE)) {
            hero.staggered = false;
            hero.hp = 1;
            this.deathDefianceCooldown = DEATH_DEFIANCE_PRESTIGE_COOLDOWN;
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
      // C331: decrement elite fury
      if (this.eliteFuryRemaining > 0) this.eliteFuryRemaining--;
      // C336: decrement danger cascade
      if (this.dangerCascadeRemaining > 0) this.dangerCascadeRemaining--;
      const isOverkill = hitCount === 1 && !hero.staggered;
      // C261: multi-kill tracking
      if (isOverkill) { this.consecutiveOneHits++; } else { this.consecutiveOneHits = 0; }
      // C183: overkill streak tracking
      if (isOverkill) {
        this.overkillStreak++;
        this.overkillChain++; // C421
        if (this.overkillStreak >= OVERKILL_STREAK_THRESHOLD) {
          this.invincibleFights += OVERKILL_INVINCIBILITY_FIGHTS;
          this.overkillStreak = 0;
        }
      } else {
        this.overkillStreak = 0;
        this.overkillChain = 0; // C421: reset
      }
      // C183: decrement invincibility after fight
      if (this.invincibleFights > 0) this.invincibleFights--;
      if (hero.staggered) {
        // C120: combo streak resets on death
        // C198: combo breaker — if had high combo, grant ATK bonus
        if (this.comboStreak >= 3) this.comboBreakerReady = true;
        // C431: combo exp finisher — ending high combo gives burst exp
        if (this.comboStreak >= COMBO_END_EXP_THRESHOLD) {
          hero.gainExp(this.comboStreak * COMBO_END_EXP_PER_COMBO);
        }
        // C406: combo persistence — keep 25% of combo on death
        this.comboStreak = Math.floor(this.comboStreak * COMBO_PERSIST_RATE);
        // C401: revenge streak — dying builds ATK bonus
        this.revengeStreakPower = Math.min(REVENGE_STREAK_CAP, this.revengeStreakPower + REVENGE_STREAK_ATK_PER_DEATH);
        this.revengeStreakRemaining = REVENGE_STREAK_DURATION;
        // C449: death gold compound — dying compounds gold return
        this.deathGoldCompound = Math.min(DEATH_GOLD_COMPOUND_CAP, this.deathGoldCompound + DEATH_GOLD_COMPOUND_PER_DEATH);
        // C141: survival streak resets on death
        this.survivalStreak = 0;
        // C410: wave chain resets on death
        this.consecutiveWaveClears = 0;
        // C197: reset survivor counter
        this.fightsSinceDeath = 0;
        // C147: gold loss on death — lose 10% (C159: 25% chance to save)
        // C399: death gold protection — prestige protects portion of gold
        const goldProtectRate = Math.min(DEATH_GOLD_PROTECT_CAP, this.prestigeCount * DEATH_GOLD_PROTECT_PER_PRESTIGE);
        if (!this.rng.chance(GOLD_SAVE_CHANCE)) {
          const goldLost = Math.floor(hero.gold * GOLD_DEATH_PENALTY * (1 - goldProtectRate));
          hero.gold -= goldLost;
        } else {
          events.push({ type: 'gold_saved' });
        }
        // C181: max HP decay on death
        const hpDecay = Math.max(1, Math.floor(hero.hpMax * DEATH_HP_DECAY_RATE));
        hero.hpMax = Math.max(1, hero.hpMax - hpDecay);
        // C417: death insurance — save portion of exp based on level
        hero.gainExp(Math.floor(hero.level * DEATH_EXP_SAVE_RATE * 10));
        // C459: death exp cascade — dying at high level gives proportional exp
        hero.gainExp(Math.floor(hero.exp * DEATH_EXP_CASCADE_RATE));
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
        // C329: death exp consolation
        hero.exp += Math.floor(hero.level * 10 * DEATH_EXP_RATE);
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
          // C344: insurance enhanced payout — recover gold on insurance
          hero.gold += Math.floor(hero.level * GOLD_INSURANCE_PAYOUT_MUL);
        }
        // C140: track who killed us for revenge
        this.lastDeathEnemyId = landmarkId;
        events.push({ type: 'hero_died', cause: '전사', enemyId: landmarkId, oldLevel, newLevel });
        return events;
      }
      // C120: combo streak — no-damage kills in a row grant bonus exp
      if (tookDamage) {
        // C348: danger zone preserves combo
        if (!(isDangerZone && DANGER_COMBO_PRESERVE)) {
          // C272: combo break consolation
          if (this.comboStreak >= COMBO_BREAK_THRESHOLD) this.comboBreakBonus = true;
          this.comboStreak = 0;
        }
      } else {
        this.comboStreak++;
        // C419: combo shield regen — reaching combo milestone regens shield
        if (this.comboStreak > 0 && this.comboStreak % COMBO_SHIELD_REGEN_THRESHOLD === 0) {
          if (this.prestigeShieldRemaining < 3) this.prestigeShieldRemaining++;
        }
        // C367: combo milestone — every 10 combo grants permanent ATK bonus
        if (this.comboStreak > this.maxComboReached) {
          const oldMilestones = Math.floor(this.maxComboReached / COMBO_ATK_MILESTONE_INTERVAL);
          this.maxComboReached = this.comboStreak;
          const newMilestones = Math.floor(this.maxComboReached / COMBO_ATK_MILESTONE_INTERVAL);
          if (newMilestones > oldMilestones) {
            this.comboMilestoneBonus += (newMilestones - oldMilestones) * COMBO_MILESTONE_ATK;
          }
        }
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
      const bossExpMul = isBoss ? (BOSS_KILL_EXP_MUL + this.prestigeCount * BOSS_EXP_PRESTIGE_BONUS) : 1;
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
      // C277: exp cascade
      const expCascadeMul = this.consecutiveOneHits >= GOLD_CASCADE_THRESHOLD ? (1 + EXP_CASCADE_BONUS) : 1;
      // C279: prestige exp scaling
      const prestigeExpMul = 1 + this.prestigeCount * PRESTIGE_EXP_BONUS;
      // C281: kill momentum exp
      const killMomentumExp = 1 + Math.min(KILL_MOMENTUM_EXP_CAP, this.survivalStreak) * KILL_MOMENTUM_EXP_BONUS;
      // C284: exp drought breaker
      const expDroughtMul = this.killsSinceLevelUp >= EXP_DROUGHT_THRESHOLD ? (1 + EXP_DROUGHT_BONUS) : 1;
      // C286: survivor's grit
      const survivorGritMul = this.survivorGritActive ? (1 + SURVIVOR_GRIT_EXP_BONUS) : 1;
      if (this.survivorGritActive) this.survivorGritActive = false;
      // C288: survival exp scale
      const survivalScaleMul = 1 + Math.min(SURVIVAL_EXP_SCALE_CAP, this.survivalStreak * SURVIVAL_EXP_SCALE);
      // C293: exp chain bonus (fights since village)
      this.fightChainCount++;
      const expChainFightMul = 1 + Math.min(EXP_CHAIN_CAP, this.fightChainCount * EXP_CHAIN_PER_FIGHT);
      // C299: elite exp bonus
      const eliteExpMul2 = isElite ? (1 + ELITE_EXP_BONUS_RATE) : 1;
      // C315: combo finisher
      const comboFinisherMul = this.comboStreak >= COMBO_FINISHER_THRESHOLD ? COMBO_FINISHER_EXP_MUL : 1;
      // C325: exp per village visits
      const villageExpMul = 1 + Math.min(EXP_PER_VILLAGE_CAP, this.villageVisits * EXP_PER_VILLAGE_BONUS);
      // C334: wave survival exp — no damage in wave
      const waveSurvivalMul = (this.waveRemaining > 0 && !tookDamage) ? WAVE_SURVIVAL_EXP_MUL : 1;
      // C336: danger exp cascade
      const dangerCascadeExpMul = this.dangerCascadeRemaining > 0 ? DANGER_CASCADE_MUL : 1;
      // C357: danger exp chain compound — consecutive danger kills
      if (isDangerZone) { this.dangerChainCount++; } else { this.dangerChainCount = 0; }
      // C387: danger chain heal — long danger streak heals small amount
      if (isDangerZone && this.dangerChainCount >= DANGER_CHAIN_HEAL_THRESHOLD) {
        hero.heal(Math.max(1, Math.floor(hero.hpMax * DANGER_CHAIN_HEAL_RATE)));
      }
      const dangerChainMul = 1 + this.dangerChainCount * DANGER_EXP_CHAIN_MUL;
      // C359: boss enrage exp — if boss fight lasted multiple turns (rageTurn > 0)
      const bossEnrageMul = (isBoss && rageTurn > 2) ? (1 + BOSS_ENRAGE_EXP_BONUS) : 1;
      // C373: wave exp scaling
      const waveExpScaleMul = this.waveRemaining > 0 ? (1 + Math.min(WAVE_EXP_SCALE_CAP, (WAVE_SIZE - this.waveRemaining) * WAVE_EXP_SCALE_PER_WAVE)) : 1;
      // C379: elite exp chain
      const eliteExpChainMul = isElite && this.eliteCombo > 1 ? (1 + (this.eliteCombo - 1) * ELITE_EXP_CHAIN_BONUS) : 1;
      // C389: prestige exp multiplier
      const prestigeAllExpMul = 1 + this.prestigeCount * PRESTIGE_ALL_EXP_BONUS;
      // C394: boss exp mastery — unique bosses give permanent exp bonus
      const bossExpMasteryMul = 1 + Math.min(BOSS_EXP_MASTERY_CAP, this.uniqueBossKills * BOSS_EXP_MASTERY_PER_UNIQUE);
      // C397: elite danger synergy — elite in danger zone = double exp bonus
      const eliteDangerMul = (isElite && isDangerZone) ? (1 + ELITE_DANGER_EXP_BONUS) : 1;
      // C400: final mastery — all multipliers get small boost based on total playtime
      const finalMasteryMul = 1 + Math.min(FINAL_MASTERY_CAP, Math.floor((this.totalWins + this.totalDeaths) / 1000) * FINAL_MASTERY_PER_1000_FIGHTS);
      // C408: elite mastery — total elite kills boost exp
      if (isElite) this.totalEliteKills++;
      // C455: elite exp mastery upgrade — scales faster with prestige
      const eliteMasteryMul = 1 + Math.min(ELITE_MASTERY_CAP, Math.floor(this.totalEliteKills / 20) * (ELITE_MASTERY_PER_20 + this.prestigeCount * ELITE_MASTERY_UPGRADE_BONUS));
      // C413: combo exp cascade — high combo cascades exp
      const comboExpCascadeMul = this.comboStreak >= COMBO_EXP_CASCADE_THRESHOLD ? (1 + COMBO_EXP_CASCADE_MUL) : 1;
      // C420: prestige exp scaling — prestige scales exp formula base
      const prestigeExpScaleMul = 1 + Math.min(PRESTIGE_EXP_SCALE_CAP, this.prestigeCount * PRESTIGE_EXP_SCALE_BONUS);
      // C423: survival exp compound — long survival streaks compound exp
      const survivalCompoundMul = this.fightsSinceDeath >= SURVIVAL_COMPOUND_THRESHOLD ? (1 + SURVIVAL_COMPOUND_EXP_MUL) : 1;
      // C427: wave danger bonus — waves in danger zone get extra exp
      const waveDangerMul = (isDangerZone && this.waveRemaining > 0) ? (1 + WAVE_DANGER_EXP_BONUS) : 1;
      // C437: crit chain exp — consecutive crits boost exp
      const critChainExpMul = this.consecutiveCrits > 0 ? (1 + this.consecutiveCrits * CRIT_CHAIN_EXP_BONUS) : 1;
      // C441: danger exp mastery — total danger fights boost exp
      const dangerExpMasteryMul = 1 + Math.min(DANGER_EXP_MASTERY_CAP, Math.floor(this.dangerFights / 100) * DANGER_EXP_MASTERY_PER_100);
      // C443: elite exp burst — first elite after village
      const eliteVillageBurstMul = (isElite && this.eliteAfterVillage) ? (1 + ELITE_VILLAGE_EXP_BURST) : 1;
      if (isElite && this.eliteAfterVillage) this.eliteAfterVillage = false;
      // C444: combo ATK acceleration exp bonus (using combo for exp too)
      const comboAccelExpMul = this.comboStreak >= COMBO_ATK_ACCEL_THRESHOLD ? (1 + (this.comboStreak - COMBO_ATK_ACCEL_THRESHOLD) * COMBO_ATK_ACCEL_BONUS) : 1;
      const expGain = Math.floor(baseExpGain * dangerMul2 * eliteMul * comboBonus * diminish * firstBloodMul * survivalBonus * waveMulExp * familiarityMul * comboExpMul * closeCallMul * greedExpMul * lvUpMul * eliteBountyMul * expDecayMul * bossExpMul * weatherExpMul * arenaMul * nightExpMul * expChainMul * quickKillMul * companionMul * bossSlayerMul * multiKillMul * shrineBlessMul * revengeExpMul * lowHpExpMul * comboBreakMul * expCascadeMul * prestigeExpMul * killMomentumExp * expDroughtMul * survivorGritMul * survivalScaleMul * expChainFightMul * eliteExpMul2 * comboFinisherMul * villageExpMul * waveSurvivalMul * dangerCascadeExpMul * dangerChainMul * bossEnrageMul * waveExpScaleMul * eliteExpChainMul * prestigeAllExpMul * bossExpMasteryMul * eliteDangerMul * finalMasteryMul * eliteMasteryMul * comboExpCascadeMul * prestigeExpScaleMul * survivalCompoundMul * waveDangerMul * critChainExpMul * dangerExpMasteryMul * eliteVillageBurstMul * comboAccelExpMul);
      // C216: elite combo — 3 consecutive elites guarantee drop on next
      const eliteComboGuarantee = isElite && this.eliteCombo >= ELITE_COMBO_THRESHOLD;
      const baseDropOdds = isBoss ? 0.96 : (isElite || eliteComboGuarantee) ? 1.0 : !this.firstBloodUsed ? 1.0 : DROP_RATE; // C139: first blood = guaranteed drop
      // Cycle 109 F1: boss intro drop_bonus adds onto V3-C drop_chance buff.
      const introDropBonus = isBoss ? (this.opts.getBossIntroDropBonus?.() ?? 0) : 0;
      // C123: overkill bonus — one-hit kills get +15% drop rate
      const overkillDropBonus = isOverkill ? OVERKILL_DROP_BONUS : 0;
      // C425: elite boss synergy — elite after boss gives extra drop chance
      const eliteBossSynergyBonus = (isElite && this.bossSlayerRemaining > 0) ? ELITE_BOSS_SYNERGY_DROP_BONUS : 0;
      const dropOdds = Math.min(1, baseDropOdds + (this.opts.dropChanceBonus ?? 0) + introDropBonus + overkillDropBonus + eliteBossSynergyBonus);
      // C126: drop streak — 3 consecutive drops upgrades next to boss pool
      const upgradePool = !isBoss && this.dropStreak >= DROP_STREAK_THRESHOLD;
      // C355: elite loot upgrade — elites use boss pool
      const eliteLootUpgrade = isElite && ELITE_LOOT_UPGRADE;
      const dropId = this.rng.chance(dropOdds) ? this.rollDrop(isBoss || upgradePool || eliteLootUpgrade) : null;
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

      // C322: gold hoarding exp
      if (hero.gold > GOLD_HOARD_EXP_THRESHOLD) {
        const hoardExp = Math.floor((hero.gold - GOLD_HOARD_EXP_THRESHOLD) / 1000) * GOLD_HOARD_EXP_PER_1000;
        hero.exp += hoardExp;
      }

      // C343: exp theft on crit
      const expTheft = didCrit ? Math.floor(expGain * EXP_THEFT_RATE) : 0;
      // C362: prestige exp floor
      const prestigeExpFloor = this.prestigeCount * PRESTIGE_EXP_FLOOR_PER_LEVEL;
      // C369: trophy exp bonus
      const trophyExpBonus = Math.floor(expGain * this.uniqueBossKills * TROPHY_EXP_BONUS);
      const finalExp = Math.max(prestigeExpFloor, expGain) + expTheft + trophyExpBonus;
      const { leveled } = hero.gainExp(finalExp);
      // C352: combo exp overflow to gold — high combo converts some exp to gold
      if (this.comboStreak >= COMBO_STREAK_THRESHOLD && expGain > COMBO_EXP_OVERFLOW_RATIO) {
        hero.gold += Math.floor(expGain / COMBO_EXP_OVERFLOW_RATIO);
      }
      // C336: danger zone kill sets cascade for next fights
      if (isDangerZone) this.dangerCascadeRemaining = DANGER_CASCADE_DURATION;
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
      // C341: overkill chain gold — consecutive one-shots boost gold
      const overkillChainMul = 1 + Math.min(OVERKILL_CHAIN_CAP, this.consecutiveOneHits) * OVERKILL_CHAIN_GOLD_MUL;
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
      // C283: gold per boss killed
      const bossGoldMul = 1 + this.bossesKilled * GOLD_PER_BOSS_BONUS;
      // C287: gold per level milestone
      const levelMilestoneGold = Math.floor(hero.level / GOLD_LEVEL_MILESTONE) * GOLD_LEVEL_MILESTONE_BONUS;
      // C290: danger zone gold scale
      const dangerScaleMul = 1 + this.dangerStreak * DANGER_GOLD_SCALE;
      // C292: treasure hoard — every 25 kills, gold ×2
      const treasureHoardMul2 = (this.killCount > 0 && this.killCount % TREASURE_HOARD_INTERVAL === 0) ? TREASURE_HOARD_MUL : 1;
      // C297: combo gold high — at 50+ combo, gold ×1.5
      const comboGoldHighMul = this.comboStreak >= COMBO_GOLD_HIGH_THRESHOLD ? COMBO_GOLD_HIGH_MUL : 1;
      // C303: kill streak gold bonus
      const killStreakGoldMul = this.fightChainCount >= KILL_STREAK_GOLD_THRESHOLD ? (1 + KILL_STREAK_GOLD_BONUS) : 1;
      // C312: gold harvest — no damage taken this fight = +15% gold
      const goldHarvestMul = !tookDamage ? (1 + GOLD_HARVEST_BONUS) : 1;
      // C314: prestige gold multiplier
      const prestigeGoldMul2 = 1 + this.prestigeCount * PRESTIGE_GOLD_MUL_BONUS;
      // C318: gold per crit
      const critGoldFlat = Math.min(GOLD_PER_CRIT_CAP, this.totalCrits * GOLD_PER_CRIT);
      // C323: wave finisher gold — last wave kill gets ×3
      const waveFinisherMul = (this.waveRemaining === 1) ? WAVE_FINISHER_GOLD_MUL : 1;
      // C326: double gold chance
      const doubleGoldMul = this.rng.chance(DOUBLE_GOLD_CHANCE) ? 2 : 1;
      // C338: crit gold bonus
      const critGoldBonusMul = didCrit ? CRIT_GOLD_BONUS_MUL : 1;
      // C361: wave gold surge
      const waveGoldSurgeMul = this.waveRemaining > 0 ? (1 + (WAVE_SIZE - this.waveRemaining) * WAVE_GOLD_SURGE_PER_KILL) : 1;
      // C393: wave gold cascade — each wave fight gives more gold
      const waveGoldCascadeMul = this.waveRemaining > 0 ? (1 + (WAVE_SIZE - this.waveRemaining) * WAVE_GOLD_CASCADE_PER_FIGHT) : 1;
      // C396: combo gold escalation — gold grows faster at high combo
      const comboGoldEscMul = this.comboStreak >= COMBO_GOLD_ESCALATION_THRESHOLD ? (1 + (this.comboStreak - COMBO_GOLD_ESCALATION_THRESHOLD) * COMBO_GOLD_ESCALATION_BONUS) : 1;
      // C363: crit chain gold
      const critChainGoldMul = this.consecutiveCrits > 0 ? (1 + this.consecutiveCrits * CRIT_CHAIN_GOLD_BONUS) : 1;
      // C371: prestige gold multiplier
      const prestigeGoldMul3 = 1 + this.prestigeCount * PRESTIGE_GOLD_PER_COUNT;
      // C382: danger prestige gold bonus
      const dangerPrestigeMul = (isDangerZone && this.prestigeCount > 0) ? (1 + this.prestigeCount * DANGER_PRESTIGE_GOLD_MUL) : 1;
      // C405: danger mastery — total danger fights boost gold
      const dangerMasteryMul = 1 + Math.min(DANGER_MASTERY_CAP, Math.floor(this.dangerFights / 50) * DANGER_MASTERY_PER_50);
      // C412: danger gold streak — consecutive danger wins multiply gold
      const dangerGoldStreakMul = isDangerZone ? (1 + this.dangerStreak * DANGER_GOLD_STREAK_BONUS) : 1;
      // C432: danger streak gold compound — long danger streaks compound gold
      const dangerStreakCompoundMul = (isDangerZone && this.dangerStreak >= DANGER_STREAK_COMPOUND_THRESHOLD) ? (1 + (this.dangerStreak - DANGER_STREAK_COMPOUND_THRESHOLD) * DANGER_STREAK_GOLD_COMPOUND) : 1;
      // C415: elite gold chain — consecutive elites escalate gold
      const eliteGoldChainMul = isElite && this.eliteCombo > 1 ? (1 + (this.eliteCombo - 1) * ELITE_GOLD_CHAIN_BONUS) : 1;
      // C407: boss trophy gold — unique bosses add flat gold
      const bossTrophyGold = this.uniqueBossKills * BOSS_TROPHY_GOLD_PER_UNIQUE;
      // C418: wave gold accumulator — gold in wave multiplied at end
      const waveAccumulatorMul = (this.waveRemaining > 0 && this.waveRemaining === 1) ? (1 + WAVE_GOLD_ACCUMULATOR_MUL * WAVE_SIZE) : 1;
      // C421: overkill chain extra gold
      const overkillChainExtraMul = 1 + Math.min(OVERKILL_CHAIN_EXTRA_CAP, this.overkillChain) * OVERKILL_CHAIN_EXTRA_MUL;
      // C442: boss gold cascade — each boss this run multiplies gold
      const bossGoldCascadeMul = 1 + this.consecutiveBossKills * BOSS_GOLD_CASCADE_PER_BOSS;
      // C445: prestige gold cascade — prestige multiplies all gold
      const prestigeGoldCascadeMul = 1 + Math.min(PRESTIGE_GOLD_CASCADE_CAP, this.prestigeCount * PRESTIGE_GOLD_CASCADE_BONUS);
      // C449: death gold compound — deaths compound gold on return
      const deathGoldCompoundMul = 1 + Math.min(DEATH_GOLD_COMPOUND_CAP, this.deathGoldCompound);
      // C452: combo gold velocity — fast combos give more gold
      const comboGoldVelocityMul = this.comboStreak > 0 ? (1 + this.comboStreak * COMBO_GOLD_VELOCITY_BONUS) : 1;
      // C453: prestige danger gold — prestige makes danger zones give more gold
      const prestigeDangerGoldMul = (isDangerZone && this.prestigeCount > 0) ? (1 + this.prestigeCount * PRESTIGE_DANGER_GOLD_BONUS) : 1;
      // C457: crit gold mastery — total crits boost gold
      const critGoldMasteryMul = 1 + Math.min(CRIT_GOLD_MASTERY_CAP, Math.floor(this.totalCrits / 50) * CRIT_GOLD_MASTERY_PER_50);
      // C460: combo danger synergy — combo in danger zone
      const comboDangerSynergyMul = (isDangerZone && this.comboStreak >= COMBO_DANGER_SYNERGY_THRESHOLD) ? (1 + COMBO_DANGER_SYNERGY_MUL) : 1;
      const goldEarned = Math.floor(GOLD_PER_KILL_BASE * Math.pow(hero.level, GOLD_LEVEL_POWER) * goldMul * dangerGoldMul * waveMul * momentumGoldMul * comboGoldMul * overkillGoldMul * overkillChainMul * critGoldMul * greedGoldMul * revengeGoldMul * arenaMul * treasureHunterMul * goldStreakMul * comboGoldMul2 * comboMilestoneMul * fullHpGoldMul * eliteGoldMul * goldCascadeMul * villageBlessMul * bossGoldMul * dangerScaleMul * treasureHoardMul2 * comboGoldHighMul * killStreakGoldMul * goldHarvestMul * prestigeGoldMul2 * waveFinisherMul * doubleGoldMul * critGoldBonusMul * waveGoldSurgeMul * critChainGoldMul * prestigeGoldMul3 * dangerPrestigeMul * waveGoldCascadeMul * comboGoldEscMul * dangerMasteryMul * dangerGoldStreakMul * dangerStreakCompoundMul * eliteGoldChainMul * waveAccumulatorMul * overkillChainExtraMul * bossGoldCascadeMul * prestigeGoldCascadeMul * deathGoldCompoundMul * comboGoldVelocityMul * prestigeDangerGoldMul * critGoldMasteryMul * comboDangerSynergyMul) + levelMilestoneGold + critGoldFlat + bossTrophyGold;
      // C328: combo gold floor
      const goldFloor = this.comboStreak >= COMBO_GOLD_FLOOR_THRESHOLD ? hero.level * COMBO_GOLD_FLOOR_PER_LEVEL : 0;
      hero.gold += Math.max(goldEarned, goldFloor);
      // C426: combo gold milestone — every 15 combo grants flat gold
      if (this.comboStreak > 0 && this.comboStreak % COMBO_GOLD_MILESTONE_INTERVAL === 0) {
        hero.gold += COMBO_GOLD_MILESTONE_AMOUNT * hero.level;
      }
      // C358: gold per hit bonus — multi-hit fights give extra
      if (hitCount > 1) hero.gold += hitCount * GOLD_PER_HIT_BONUS;
      // C280: lucky gold drop
      if (this.rng.chance(LUCKY_GOLD_CHANCE)) {
        hero.gold += hero.level * LUCKY_GOLD_PER_LEVEL;
      }
      // C375: combo breaker gold — surviving enemy rage and winning gives gold
      if (rageTurn > 0) hero.gold += hero.level * COMBO_BREAK_GOLD_PER_LEVEL;
      // C391: survival gold bonus — staying alive gives gold per 10 fights
      if (this.fightsSinceDeath > 0 && this.fightsSinceDeath % SURVIVAL_GOLD_THRESHOLD === 0) {
        hero.gold += hero.level * SURVIVAL_GOLD_PER_LEVEL;
      }
      // C447: danger shield — surviving danger gives temp shield
      if (isDangerZone && !hero.staggered && this.rng.chance(DANGER_SHIELD_GRANT_CHANCE)) {
        if (this.prestigeShieldRemaining < 3) this.prestigeShieldRemaining++;
      }
      // C208: passive gold income based on village visits
      // C259: gold magnet prestige scaling
      // C378: danger zone raises gold cap
      const effectiveGoldCap = PASSIVE_GOLD_CAP + (isDangerZone ? this.dangerStreak * DANGER_GOLD_CAP_PER_STREAK : 0);
      hero.gold += Math.min(this.villageVisits * PASSIVE_GOLD_PER_VISIT + this.prestigeCount * GOLD_MAGNET_PRESTIGE_BONUS, effectiveGoldCap);
      // C438: village gold fountain upgrade — village gold scales with visits
      hero.gold += Math.floor(this.villageVisits * VILLAGE_GOLD_FOUNTAIN_SCALE);
      // C388: bank interest — banked gold grows each fight
      // C424: prestige bank interest bonus
      if (this.bankGold > 0) {
        const interestRate = BANK_INTEREST_RATE + this.prestigeCount * PRESTIGE_BANK_INTEREST_BONUS;
        this.bankGold += Math.min(BANK_INTEREST_CAP, Math.floor(this.bankGold * interestRate));
      }
      // C193: gold tax at high levels (C202: exempt during danger streak)
      if (hero.level >= GOLD_TAX_LEVEL_THRESHOLD && !(DANGER_TAX_IMMUNITY && isDangerZone)) {
        const tax = Math.floor(hero.gold * GOLD_TAX_RATE);
        hero.gold -= tax;
      }
      // C368: gold overflow shield — when gold exceeds threshold, grant temporary shield
      if (hero.gold > GOLD_SHIELD_OVERFLOW_THRESHOLD * hero.level && this.goldOverflowShieldRemaining <= 0) {
        // C451: gold overflow shield upgrade — more charges with prestige
        this.goldOverflowShieldRemaining = GOLD_OVERFLOW_SHIELD_DURATION + (this.prestigeCount > 0 ? GOLD_OVERFLOW_SHIELD_UPGRADE : 0);
      }
      // C157: boss vault — lump sum gold bonus for boss kills
      if (isBoss) {
        this.bossStreak++;
        this.bossesKilled++; // C239
        this.uniqueBossKills++; // C335: boss trophy ATK
        // C172: boss streak multiplier
        const streakMul = 1 + (this.bossStreak - 1) * BOSS_STREAK_MULTIPLIER;
        // C186: overkill boss vault doubler
        const bossOverkillMul = isOverkill ? BOSS_OVERKILL_VAULT_MUL : 1;
        // C239: boss loot table — every Nth boss gives double gold
        const bossLootMul = (this.bossesKilled % BOSS_LOOT_INTERVAL === 0) ? BOSS_LOOT_GOLD_MUL : 1;
        // C374: boss vault prestige bonus
        const bossVaultPrestigeMul = 1 + this.prestigeCount * BOSS_VAULT_PRESTIGE_MUL;
        // C430: boss vault prestige scaling
        const bossVaultPrestigeScale = 1 + this.prestigeCount * BOSS_VAULT_PRESTIGE_SCALE;
        // C456: boss vault compound — vault compounds with consecutive bosses
        const bossVaultCompound = 1 + this.consecutiveBossKills * BOSS_VAULT_COMPOUND_BONUS;
        const vaultGold = Math.floor(hero.level * BOSS_VAULT_GOLD_PER_LEVEL * streakMul * bossOverkillMul * bossLootMul * bossVaultPrestigeMul * bossVaultPrestigeScale * bossVaultCompound);
        hero.gold += vaultGold;
        // C383: boss chain gold — consecutive bosses give escalating gold
        if (this.consecutiveBossKills > 0) {
          hero.gold += this.consecutiveBossKills * hero.level * BOSS_CHAIN_GOLD_PER_LEVEL;
        }
        events.push({ type: 'boss_vault', gold: vaultGold });
        // C251: boss slayer buff
        this.bossSlayerRemaining = BOSS_SLAYER_DURATION;
        // C321: boss fury buff
        this.bossFuryRemaining = BOSS_FURY_DURATION;
        // C349: boss frenzy — consecutive boss kills give exponential reward
        this.consecutiveBossKills++;
        const frenzyMul = Math.min(BOSS_FRENZY_CAP, Math.pow(BOSS_FRENZY_EXP_BASE, this.consecutiveBossKills - 1));
        hero.exp += Math.floor(hero.level * 10 * frenzyMul);
        // C366: boss defeat heal
        hero.heal(Math.max(1, Math.floor(hero.hpMax * BOSS_DEFEAT_HEAL_RATE)));
        // C414: boss heal on kill — heal based on boss level
        hero.heal(Math.max(1, Math.floor(hero.hpMax * BOSS_HEAL_ON_KILL_RATE)));
        // C402: gold rain — chance after boss kill
        if (this.rng.chance(GOLD_RAIN_CHANCE)) {
          hero.gold += Math.floor(hero.gold * (GOLD_RAIN_MUL - 1));
          events.push({ type: 'gold_rain' });
        }
      } else {
        this.consecutiveBossKills = 0;
      }
      // C302: gold overflow — excess gold above threshold converts to exp
      if (hero.gold > GOLD_OVERFLOW_THRESHOLD) {
        const excess = hero.gold - GOLD_OVERFLOW_THRESHOLD;
        const bonusExp = Math.floor(excess / GOLD_OVERFLOW_RATIO);
        hero.gold = GOLD_OVERFLOW_THRESHOLD;
        hero.exp += bonusExp;
      }
      // C156: HP regen on win
      // C238: reset consecutive deaths on win
      this.consecutiveDeaths = 0;
      // C276: deathless streak increment
      this.fightsSinceLastDeath++;
      // C286: survivor's grit — trigger if survived at very low HP
      if (hero.hp > 0 && hero.hp < hero.hpMax * SURVIVOR_GRIT_HP_THRESHOLD) {
        this.survivorGritActive = true;
      }
      // C217: HP regen scaling based on kills
      const regenBonus = Math.min(REGEN_SCALE_CAP, Math.floor(this.totalWins / 50) * REGEN_SCALE_PER_50_KILLS);
      const regenAmount = Math.max(1, Math.floor(hero.hpMax * (WIN_HP_REGEN_RATE + regenBonus)));
      // C319: regen buff — double regen at 10+ village visits
      const regenBuffMul = this.villageVisits >= REGEN_BUFF_VILLAGE_THRESHOLD ? REGEN_BUFF_MUL : 1;
      hero.heal(Math.floor(regenAmount * regenBuffMul));
      // C174: lifesteal — heal based on damage dealt
      // C434: prestige heal boost — prestige increases all healing
      const prestigeHealMul = 1 + this.prestigeCount * PRESTIGE_HEAL_BOOST;
      const lifestealHeal = Math.max(1, Math.floor(totalDamageDealt * LIFESTEAL_RATE * prestigeHealMul));
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
          // C300: village investment upgrade — bonus return per visit
          const investBonus = 1 + Math.min(VILLAGE_INVEST_BONUS_CAP, this.villageVisits * VILLAGE_INVEST_BONUS_PER_VISIT);
          hero.gold += Math.floor(this.goldInvested * GOLD_INVEST_RETURN_MUL * investBonus);
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
      if (isElite) { this.eliteCombo++; this.eliteChainAtkRemaining = ELITE_CHAIN_ATK_DURATION; } else { this.eliteCombo = 0; }
      // C450: elite prestige ATK — prestige makes elite kills boost ATK
      if (isElite && this.prestigeCount > 0) {
        hero.atkBase += Math.floor(this.prestigeCount * ELITE_PRESTIGE_ATK_BONUS * hero.level);
        hero.recomputeStats();
      }
      if (eliteComboGuarantee) this.eliteCombo = 0; // consumed
      // C370: elite chain reward — consecutive elite kills give flat gold bonus
      if (isElite && this.eliteCombo >= ELITE_CHAIN_THRESHOLD) {
        hero.gold += this.eliteCombo * ELITE_CHAIN_GOLD;
      }
      // C386: elite prestige loot — prestige + elite = guaranteed gold bonus
      if (isElite && this.prestigeCount > 0) {
        hero.gold += ELITE_PRESTIGE_GOLD_FLAT * this.prestigeCount;
      }
      // C146: wave tracking
      this.totalWins++;
      // C278: battle hardening — every 100 total fights, +1% max HP
      const totalFights = this.totalWins + this.totalDeaths;
      if (totalFights > 0 && totalFights % BATTLE_HARDEN_INTERVAL === 0) {
        const hardenBonus = Math.min(BATTLE_HARDEN_CAP, Math.floor(totalFights / BATTLE_HARDEN_INTERVAL) * BATTLE_HARDEN_HP_BONUS);
        const hpGain = Math.max(1, Math.floor(hero.hpMax * hardenBonus));
        hero.hpMax += hpGain;
        hero.hp += hpGain;
      }
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
      this.fightsSinceVillage++;
      // C339: kill count exp milestone — every 100 kills burst
      if (this.killCount % KILL_EXP_MILESTONE_INTERVAL === 0) {
        hero.exp += KILL_EXP_MILESTONE_AMOUNT * hero.level;
      }
      // C345: fatigue recovery — heal after sustained combat
      if (this.fightsSinceVillage % FATIGUE_FIGHT_THRESHOLD === 0) {
        hero.heal(Math.max(1, Math.floor(hero.hpMax * FATIGUE_RECOVERY_HEAL)));
      }
      // C350: gold surge every N fights
      if (this.killCount % GOLD_SURGE_INTERVAL === 0) {
        hero.gold += Math.max(1, Math.floor(hero.gold * GOLD_SURGE_AMOUNT));
      }
      // C185: elite bounty tracking
      if (isElite) {
        this.eliteKills++;
        // C331: elite fury — grant temp crit boost
        this.eliteFuryRemaining = ELITE_FURY_DURATION;
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
          // C385: wave momentum — surviving full wave boosts next fights
          this.waveMomentumRemaining = WAVE_MOMENTUM_ATK_DURATION;
         // C410: wave chain — consecutive wave clears boost ATK
         this.consecutiveWaveClears++;
         // C435: wave completion gold bonus
         hero.gold += WAVE_COMPLETE_GOLD_BONUS * hero.level;
         // C446: wave exp burst — completing wave gives burst exp
         hero.gainExp(WAVE_EXP_BURST_PER_LEVEL * hero.level);
         // C454: wave ATK momentum — wave clears build permanent ATK
         const waveAtkGain = Math.min(WAVE_ATK_MOMENTUM_CAP, this.consecutiveWaveClears * WAVE_ATK_MOMENTUM_PER_WAVE);
         hero.atkBase += waveAtkGain;
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
        // C351: revenge gold multiplier on revenge kill
        hero.gold += Math.floor(hero.gold * (REVENGE_GOLD_MUL - 1) * 0.1);
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
        // C311: crit chain counter
        this.consecutiveCrits++;
      } else {
        this.consecutiveCrits = 0;
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
        // C354: prestige surge — first fight after prestige has mega ATK
        this.prestigeSurgeReady = true;
        // C380: prestige shield — block first N hits after prestige
        this.prestigeShieldRemaining = PRESTIGE_SHIELD_HITS;
        // C392: prestige danger immunity
        this.prestigeDangerImmune = PRESTIGE_DANGER_IMMUNE_FIGHTS;
        hero.level = 1;
        hero.exp = 0;
        hero.recomputeStats();
        // C298: prestige full heal
        if (PRESTIGE_FULL_HEAL) { hero.hp = hero.hpMax; }
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
      // C282: village shield
      this.villageShieldActive = true;
      // C356: village defense immunity
      this.villageDefenseRemaining = VILLAGE_DEFENSE_FIGHTS;
      // C285: village training ATK buff
      // C347: extended training duration
      this.villageTrainingRemaining = VILLAGE_TRAINING_DURATION + TRAINING_EXTENDED_DURATION;
      // C324: village ATK flat
      hero.atk += VILLAGE_ATK_FLAT;
      // C276: village blessing for deathless streak
      if (this.fightsSinceLastDeath >= VILLAGE_BLESSING_STREAK) {
        this.villageBlessingRemaining = VILLAGE_BLESSING_DURATION;
      }
      // C218: reset gold streak (village spends gold)
      this.fightsSinceSpend = 0;
      // C293: reset exp chain at village
      this.fightChainCount = 0;
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
      // C316: forge cost discount per prestige
      const forgeCost = Math.max(FORGE_COST_MIN, GOLD_FORGE_COST - this.prestigeCount * FORGE_COST_PRESTIGE_DISCOUNT);
      if (hero.gold >= GOLD_FORGE_THRESHOLD) {
        hero.gold -= forgeCost;
        hero.atk += GOLD_FORGE_ATK_FLAT;
        events.push({ type: 'village_shop_purchase', cost: forgeCost, effect: 'atk_forge' });
      }
      // C307: gold shield from any village shop purchase
      this.goldShieldRemaining = GOLD_SHIELD_DURATION;
      // C168: gold interest
      // C225: interest scales with prestige
      const interestRate = VILLAGE_GOLD_INTEREST_RATE + this.prestigeCount * GOLD_INTEREST_PRESTIGE_BONUS + Math.floor(this.villageVisits / INTEREST_VILLAGE_INTERVAL) * INTEREST_VILLAGE_BONUS;
      // C262: interest cap scales with prestige
      const interestCap = 50 + this.prestigeCount * GOLD_INTEREST_CAP_PER_PRESTIGE;
      let interest = Math.min(interestCap, Math.floor(hero.gold * interestRate));
      // C332: compound interest — double if gold > threshold
      if (hero.gold > GOLD_COMPOUND_THRESHOLD) interest *= 2;
      if (interest > 0) hero.gold += interest;
      // C201: village gold fountain
      hero.gold += VILLAGE_GOLD_FOUNTAIN;
      // C337: fountain enhanced heal
      hero.heal(Math.max(1, Math.floor(hero.hpMax * FOUNTAIN_ENHANCED_HEAL)));
      // C342: prestige heal bonus at village
      if (this.prestigeCount > 0) {
        hero.heal(Math.max(1, Math.floor(hero.hpMax * this.prestigeCount * PRESTIGE_HEAL_BONUS)));
      }
      // C345: reset fatigue counter at village
      this.fightsSinceVillage = 0;
      // C304: rest exp — village grants flat exp
      hero.exp += hero.level * REST_EXP_PER_LEVEL;
      // C310: danger interest — danger streak boosts gold at village
      hero.gold += Math.floor(this.dangerStreak * DANGER_INTEREST_BONUS * hero.gold);
      // C205: gold investment — lock gold for GOLD_INVEST_LOCK_FIGHTS fights, get ×3 return
      if (this.investFightsRemaining <= 0 && hero.gold >= GOLD_INVEST_MIN) {
        const investAmount = Math.floor(hero.gold * 0.5); // invest half
        hero.gold -= investAmount;
        this.goldInvested = investAmount;
        this.investFightsRemaining = GOLD_INVEST_LOCK_FIGHTS;
      }
      // C182: village heal scaling
      this.villageVisits++;
      // C364: village forge visit discount — each visit cheapens next shop/forge interaction
      this.forgeDiscount = Math.min(0.5, this.villageVisits * FORGE_VISIT_DISCOUNT);
      // C398: village prestige compound — village heal improves with prestige
      const prestigeHealBonus = this.prestigeCount * VILLAGE_PRESTIGE_HEAL_BONUS;
      const healRate = Math.min(VILLAGE_HEAL_CAP + prestigeHealBonus, VILLAGE_HEAL_BASE + (this.villageVisits - 1) * VILLAGE_HEAL_PER_VISIT + prestigeHealBonus);
      const healAmount = Math.floor(hero.hpMax * healRate);
      hero.heal(healAmount);
      // C377: village rest ATK bonus — full heal grants temp ATK boost
      if (hero.hp >= hero.hpMax) this.villageRestAtkRemaining = VILLAGE_REST_ATK_DURATION;
      // C381: exp per village visit
      hero.gainExp(this.villageVisits * VILLAGE_EXP_PER_VISIT);
      // C403: exp fountain — village grants exp based on total fights
      hero.gainExp(Math.floor((this.totalWins + this.totalDeaths) / 100) * EXP_FOUNTAIN_PER_100_FIGHTS);
      // C404: shield regen — regenerate 1 shield charge per 5 fights
      if (this.totalWins > 0 && this.totalWins % SHIELD_REGEN_INTERVAL === 0) {
        if (this.prestigeShieldRemaining < 3) this.prestigeShieldRemaining++;
      }
      // C458: village shield upgrade — village restores more shield
      if (this.prestigeShieldRemaining < 3) {
        this.prestigeShieldRemaining = Math.min(3, this.prestigeShieldRemaining + VILLAGE_SHIELD_RESTORE);
      }
      // C409: prestige momentum — prestige count boosts momentum
      if (this.prestigeCount > 0) this.waveMomentumRemaining += Math.floor(this.prestigeCount * PRESTIGE_MOMENTUM_BONUS * 10);
      // C416: village training exp — prestige grants training exp
      hero.gainExp(this.prestigeCount * VILLAGE_TRAINING_EXP_PER_PRESTIGE);
      // C443: elite exp burst — mark first elite after village
      this.eliteAfterVillage = true;
      // C231: village bank — withdraw stored gold, then deposit portion
      if (this.bankGold > 0) {
        hero.gold += this.bankGold;
        this.bankGold = 0;
      }
      // C388: bank interest — banked gold grows each fight
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
