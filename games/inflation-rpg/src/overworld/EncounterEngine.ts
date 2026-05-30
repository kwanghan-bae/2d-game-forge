import type { SeededRng } from '../cycle/SeededRng';
import type { HeroEntity } from '../hero/HeroEntity';
import { LANDMARK_TYPES, type LandmarkKind } from '../data/landmarks';
import type { OverworldEvent } from './OverworldEvents';
import { ENEMY_DROPS, BOSS_DROPS } from './dropTable';
import { getStrategyEnabled } from '../components/StrategyPanel';
import {
  enemyHpAtLevel,
  enemyAtkAtLevel,
  expGainForKill,
} from '../cycle/inflationCurve';
import { SkillLearningSystem, isSkillMilestoneLevel } from '../hero/SkillLearningSystem';
import { findEncounterForKind, selectBranch } from '../data/personalityEncounters';
import { EventChoiceEngine, ShrineChoice, DangerChoice, MerchantChoice, GamblerChoice, AltarChoice } from './encounter/EventChoiceEngine';
import { LandmarkResolver } from './encounter/LandmarkResolver';
import { VillageResolver } from './encounter/VillageResolver';
import { computeHeroAtk } from './encounter/CombatCalculator';
import { computeAtkMultipliers } from './encounter/AtkMultiplierCalc';
import { resolveDeathPenalty } from './encounter/DeathPenaltyResolver';
import { resolvePostCombatEvent, type PostCombatContext } from './encounter/PostCombatEventResolver';
import { resolveEventEffects } from './encounter/EventEffectResolver';
import { computeDamageReduction } from './encounter/DefenseCalc';
import { computeHeroTurn } from './encounter/HeroTurnCalc';
import { chooseGamblerBet } from './encounter/HeroDecisionAI';
import { computeEnemyPrestigeScale } from './encounter/EnemyScalingResolver';
import { computeEnemyTurnAtk } from './encounter/EnemyTurnCalc';
import { RelicEffectResolver } from './encounter/RelicEffectResolver';
import { computeNight, WeatherSubsystem } from './encounter/WeatherSystem';
import { EventOrchestrator, type EventId } from './encounter/EventOrchestrator';
import { createDeclineStack, pushDecline, consumeDeclineStack, shouldForceRareEvent, type DeclineStackState } from './encounter/DeclineStack';
import { dispatchPendingTriggers } from './encounter/EventTriggerMap';
import { rollChainEvent } from './encounter/EventChainConfig';
import { computeGoldReward, type GoldRewardContext } from './encounter/GoldCalculator';
import { computeExpMultiplier, computeExpMultiplierWithBreakdown, type ExpMultiplierContext } from './encounter/ExpCalculator';
import { computePostCombatHeal } from './encounter/PostCombatHealCalc';
import { computeDropChance } from './encounter/DropResolver';
import { DANGER_ZONE_RATE,DANGER_ZONE_STAT_MUL,DANGER_ZONE_EXP_MUL,COMBO_STREAK_THRESHOLD,COMBO_STREAK_EXP_BONUS,MILESTONE_LEVELS,CRIT_STREAK_THRESHOLD,CRIT_CHANCE,CRIT_DAMAGE_MUL,OVERKILL_DROP_BONUS,CLOSE_CALL_THRESHOLD,CLOSE_CALL_HEAL,MOMENTUM_ATK_BONUS,MOMENTUM_CAP,DROP_STREAK_THRESHOLD,BOSS_RAGE_ATK_PER_TURN,ELITE_SPAWN_RATE,ELITE_HP_MUL,ELITE_EXP_MUL,VILLAGE_REST_HP_THRESHOLD,VILLAGE_REST_HP_BOOST,SHRINE_MEDITATION_ATK_BUFF,SHRINE_MEDITATION_BUFF_DURATION,DEATH_STREAK_THRESHOLD,MERCY_DAMAGE_REDUCTION,MERCY_DURATION,EXP_DIMINISH_THRESHOLD,EXP_DIMINISH_FACTOR,FIRST_BLOOD_EXP_MUL,FIRST_BLOOD_DROP_GUARANTEE,REVENGE_ATK_BONUS,SURVIVAL_STREAK_THRESHOLD,SURVIVAL_STREAK_EXP_BONUS,LUCKY_DODGE_CHANCE,GOLD_PER_KILL_BASE,GOLD_BOSS_MUL,GOLD_ELITE_MUL,WAVE_INTERVAL,WAVE_SIZE,WAVE_BONUS_EXP_MUL,WAVE_BONUS_GOLD_MUL,GOLD_DEATH_PENALTY,KILL_MILESTONE_INTERVAL,KILL_MILESTONE_ATK_BONUS,GOLD_MOMENTUM_THRESHOLD,GOLD_MOMENTUM_BONUS,AREA_FAMILIARITY_EXP_BONUS,AREA_FAMILIARITY_CAP,TREASURE_GOBLIN_RATE,TREASURE_GOBLIN_GOLD_MUL,TREASURE_GOBLIN_HP_MUL,TREASURE_GOBLIN_FLEE_RATE,COMBO_GOLD_THRESHOLD,COMBO_GOLD_BONUS_PER,VILLAGE_SHOP_COST,VILLAGE_SHOP_SHIELD_MUL,VILLAGE_SHOP_SHIELD_DURATION,OVERKILL_GOLD_BONUS,WIN_HP_REGEN_RATE,BOSS_VAULT_GOLD_PER_LEVEL,NEAR_DEATH_HP_THRESHOLD,NEAR_DEATH_ATK_MUL,GOLD_SAVE_CHANCE,COMBO_EXP_THRESHOLD,COMBO_EXP_BONUS_PER,CRIT_GOLD_BONUS,DANGER_ZONE_GOLD_MUL,GOLD_LEVEL_POWER,BOSS_ENRAGE_HP_THRESHOLD,BOSS_ENRAGE_ATK_MUL,EXP_OVERFLOW_GOLD_RATIO,CLOSE_CALL_HP_THRESHOLD,CLOSE_CALL_EXP_BONUS,VILLAGE_GOLD_INTEREST_RATE,WAVE_MULTI_KILL_ATK_BONUS,GREED_MODE_GOLD_THRESHOLD,GREED_MODE_EXP_PENALTY,GREED_MODE_GOLD_BONUS,DODGE_PER_100_KILLS,DODGE_CAP,BOSS_STREAK_MULTIPLIER,EXHAUSTION_THRESHOLD,EXHAUSTION_ATK_PENALTY,LIFESTEAL_RATE,SHRINE_TITHE_RATE,SHRINE_TITHE_ATK_BONUS,LUCKY_TREASURE_CHANCE,LUCKY_TREASURE_MIN,LUCKY_TREASURE_MAX,DANGER_STREAK_EXP_STEP,DANGER_STREAK_EXP_CAP,SHIELD_BREAK_ATK_MUL,GOLD_MAGNET_COMBO_THRESHOLD,GOLD_MAGNET_GOBLIN_MUL,DEATH_HP_DECAY_RATE,VILLAGE_HEAL_BASE,VILLAGE_HEAL_PER_VISIT,VILLAGE_HEAL_CAP,OVERKILL_STREAK_THRESHOLD,OVERKILL_INVINCIBILITY_FIGHTS,LEVEL_UP_EXP_BONUS,ELITE_BOUNTY_INTERVAL,ELITE_BOUNTY_EXP_BONUS,BOSS_OVERKILL_VAULT_MUL,CAVE_TREASURE_CHANCE,CAVE_TREASURE_MIN,CAVE_TREASURE_MAX,REVENGE_GOLD_FIGHTS,REVENGE_GOLD_BONUS,SHRINE_MASTERY_THRESHOLD,SHRINE_MASTERY_MEDITATION_CHANCE,GOLD_ARMOR_THRESHOLD,GOLD_ARMOR_REDUCTION,BOSS_RAGE_RESET_ON_CRIT,GOLD_TAX_LEVEL_THRESHOLD,GOLD_TAX_RATE,DOUBLE_HIT_KILL_THRESHOLD,DOUBLE_HIT_CHANCE,GOLD_HEAL_HP_THRESHOLD,GOLD_HEAL_COST,GOLD_HEAL_AMOUNT,EXP_DECAY_LEVEL_START,EXP_DECAY_PER_LEVEL,EXP_DECAY_CAP,SURVIVOR_THRESHOLD,SURVIVOR_HP_BONUS,COMBO_BREAKER_ATK_BONUS,BOSS_STREAK_STAT_SCALE,PRESTIGE_LEVEL_REQUIREMENT,PRESTIGE_STAT_BONUS,PRESTIGE_LEVEL_INCREMENT,TREASURE_HUNTER_CAVE_INTERVAL,TREASURE_HUNTER_GOLD_BONUS,EXP_SHIELD_PRESERVE,ELITE_COMBO_THRESHOLD,ELITE_COMBO_DROP_GUARANTEE,REGEN_SCALE_PER_50_KILLS,REGEN_SCALE_CAP,GOLD_STREAK_THRESHOLD,GOLD_STREAK_BONUS,DEATH_ATK_BONUS,DEATH_ATK_CAP,NIGHT_CYCLE_INTERVAL,NIGHT_DURATION,NIGHT_EXP_MUL,NIGHT_ENEMY_DMG_MUL,LUCKY_FIND_CHANCE,EXP_CHAIN_KILLS_THRESHOLD,EXP_CHAIN_BONUS,BERSERKER_HP_THRESHOLD,BERSERKER_ATK_BONUS,BERSERKER_CRIT_BONUS,GOLD_INTEREST_PRESTIGE_BONUS,DANGER_MAGNET_THRESHOLD,DANGER_MAGNET_SPAWN_BONUS,QUICK_KILL_MAX_HITS,QUICK_KILL_EXP_BONUS,BOUNTY_KILL_INTERVAL,BOUNTY_GOLD_REWARD,BOSS_ENRAGE_TIMER_TURN,BOSS_ENRAGE_TIMER_MUL,COMBO_GOLD_MUL_THRESHOLD,COMBO_GOLD_MUL_BONUS,BANK_DEPOSIT_RATE,FIRST_HIT_DAMAGE_MUL,LEVEL_UP_HEAL_RATE,CRIT_GOLD_SCALE_PER_100,CRIT_GOLD_SCALE_CAP,OVERKILL_HEAL_RATE,EXP_OVERFLOW_BONUS,DARKNESS_CURSE_DEATHS,DARKNESS_CURSE_ATK_PENALTY,BOSS_LOOT_GOLD_MUL,BOSS_LOOT_INTERVAL,TIME_PRESSURE_PER_100,TIME_PRESSURE_CAP,COMPANION_UNLOCK_WINS,COMPANION_EXP_BONUS,ARMOR_BUY_COST,ARMOR_REDUCTION,ARMOR_DURATION,SPEC_ATK_BONUS,COMBO_MILESTONE_INTERVAL,COMBO_MILESTONE_GOLD_BONUS,ELEMENTAL_LEVEL_MOD,ELEMENTAL_DMG_BONUS,SURVIVAL_HEAL_THRESHOLD,SURVIVAL_HEAL_RATE,SACRIFICE_FURY_ATK_BONUS,SACRIFICE_FURY_DURATION,WAVE_PRESTIGE_EXP_BONUS,FULL_HP_GOLD_BONUS,BOSS_SLAYER_EXP_BONUS,BOSS_SLAYER_DURATION,CHAIN_LIGHTNING_COMBO,CHAIN_LIGHTNING_DMG_RATE,PRESTIGE_GOLD_BONUS_PER_LEVEL,LUCKY_CRIT_CHANCE,LUCKY_CRIT_MUL,DANGER_EXP_SCALE_PER_10,DANGER_EXP_SCALE_CAP,STAMINA_FIGHTS_PER_PENALTY,STAMINA_ATK_PENALTY,STAMINA_PENALTY_CAP,VILLAGE_VIGOR_HP_BONUS,VILLAGE_VIGOR_DURATION,GOLD_MAGNET_PRESTIGE_BONUS,DEATH_INSURANCE_PENALTY,MULTI_KILL_THRESHOLD,MULTI_KILL_EXP_BONUS,GOLD_INTEREST_CAP_PER_PRESTIGE,CRIT_HEAL_RATE,SHRINE_BLESSING_EXP_BONUS,SHRINE_BLESSING_DURATION,GOLD_HOARD_THRESHOLD,GOLD_HOARD_ATK_BONUS,REVENGE_EXP_BONUS,DODGE_COUNTER_ATK_BONUS,DODGE_COUNTER_ATK_CAP,LOW_HP_EXP_THRESHOLD,LOW_HP_EXP_BONUS,ELITE_GOLD_BONUS,GOLD_FORGE_COST,GOLD_FORGE_THRESHOLD,GOLD_FORGE_ATK_FLAT,COMBO_BREAK_THRESHOLD,COMBO_BREAK_EXP_BONUS,BOSS_KILL_ATK_INTERVAL,BOSS_KILL_ATK_BONUS,GOLD_CASCADE_MULTIPLIER,GOLD_CASCADE_THRESHOLD,ADRENALINE_HP_THRESHOLD,ADRENALINE_ATK_BONUS,VILLAGE_BLESSING_STREAK,VILLAGE_BLESSING_GOLD_BONUS,VILLAGE_BLESSING_DURATION,EXP_CASCADE_BONUS,BATTLE_HARDEN_INTERVAL,BATTLE_HARDEN_HP_BONUS,BATTLE_HARDEN_CAP,PRESTIGE_EXP_BONUS,LUCKY_GOLD_CHANCE,LUCKY_GOLD_PER_LEVEL,KILL_MOMENTUM_EXP_BONUS,KILL_MOMENTUM_EXP_CAP,VILLAGE_SHIELD_DURATION,GOLD_PER_BOSS_BONUS,EXP_DROUGHT_THRESHOLD,EXP_DROUGHT_BONUS,VILLAGE_TRAINING_ATK_BONUS,VILLAGE_TRAINING_DURATION,SURVIVOR_GRIT_HP_THRESHOLD,SURVIVOR_GRIT_EXP_BONUS,GOLD_LEVEL_MILESTONE,GOLD_LEVEL_MILESTONE_BONUS,SURVIVAL_EXP_SCALE,SURVIVAL_EXP_SCALE_CAP,PRESTIGE_ATK_BONUS_PER,DANGER_GOLD_SCALE,VENGEFUL_SPIRIT_THRESHOLD,VENGEFUL_SPIRIT_ATK_BONUS,TREASURE_HOARD_INTERVAL,TREASURE_HOARD_MUL,EXP_CHAIN_PER_FIGHT,EXP_CHAIN_CAP,ARMOR_BREAK_RATE,INTEREST_VILLAGE_INTERVAL,INTEREST_VILLAGE_BONUS,DEATH_DEFIANCE_CHANCE,COMBO_GOLD_HIGH_THRESHOLD,COMBO_GOLD_HIGH_MUL,PRESTIGE_FULL_HEAL,ELITE_EXP_BONUS_RATE,VILLAGE_INVEST_BONUS_PER_VISIT,VILLAGE_INVEST_BONUS_CAP,FOCUS_STRIKE_INTERVAL,FOCUS_STRIKE_MUL,GOLD_OVERFLOW_THRESHOLD,GOLD_OVERFLOW_RATIO,KILL_STREAK_GOLD_THRESHOLD,KILL_STREAK_GOLD_BONUS,REST_EXP_PER_LEVEL,TIME_PRESSURE_LEVEL_CAP,LIFESTEAL_INTERVAL,LIFESTEAL_HIT_RATE,GOLD_SHIELD_DURATION,GOLD_SHIELD_REDUCTION,BOSS_EXP_PRESTIGE_BONUS,COMBO_HEAL_THRESHOLD,COMBO_HEAL_RATE,DANGER_INTEREST_BONUS,CRIT_CHAIN_ATK_BONUS,CRIT_CHAIN_CAP,GOLD_HARVEST_HP_THRESHOLD,GOLD_HARVEST_BONUS,WAVE_HEAL_RATE,PRESTIGE_GOLD_MUL_BONUS,COMBO_FINISHER_THRESHOLD,COMBO_FINISHER_EXP_MUL,FORGE_COST_PRESTIGE_DISCOUNT,FORGE_COST_MIN,GOLD_PER_CRIT,GOLD_PER_CRIT_CAP,REGEN_BUFF_VILLAGE_THRESHOLD,REGEN_BUFF_MUL,DANGER_ZONE_ATK_BONUS,BOSS_FURY_ATK_BONUS,BOSS_FURY_DURATION,GOLD_HOARD_EXP_THRESHOLD,GOLD_HOARD_EXP_PER_1000,WAVE_FINISHER_GOLD_MUL,VILLAGE_ATK_FLAT,EXP_PER_VILLAGE_BONUS,EXP_PER_VILLAGE_CAP,DOUBLE_GOLD_CHANCE,BOSS_WEAKNESS_BONUS,COMBO_GOLD_FLOOR_THRESHOLD,COMBO_GOLD_FLOOR_PER_LEVEL,DEATH_EXP_RATE,FINAL_STAND_HP,FINAL_STAND_DMG_MUL,ELITE_FURY_DURATION,ELITE_FURY_CRIT_BONUS,GOLD_COMPOUND_THRESHOLD,PRESTIGE_COMBO_ADD,WAVE_SURVIVAL_EXP_MUL,BOSS_TROPHY_ATK_BONUS,DANGER_CASCADE_MUL,DANGER_CASCADE_DURATION,FOUNTAIN_ENHANCED_HEAL,CRIT_GOLD_BONUS_MUL,KILL_EXP_MILESTONE_INTERVAL,KILL_EXP_MILESTONE_AMOUNT,COMBO_SHIELD_THRESHOLD,COMBO_SHIELD_REDUCTION,OVERKILL_CHAIN_GOLD_MUL,OVERKILL_CHAIN_CAP,PRESTIGE_HEAL_BONUS,EXP_THEFT_RATE,GOLD_INSURANCE_PAYOUT_MUL,FATIGUE_FIGHT_THRESHOLD,FATIGUE_RECOVERY_HEAL,ELITE_COMBO_SPAWN_BONUS,TRAINING_EXTENDED_DURATION,DANGER_COMBO_PRESERVE,BOSS_FRENZY_EXP_BASE,BOSS_FRENZY_CAP,GOLD_SURGE_INTERVAL,GOLD_SURGE_AMOUNT,REVENGE_GOLD_MUL,COMBO_EXP_OVERFLOW_RATIO,SHIELD_BREAK_GOLD,PRESTIGE_SURGE_ATK_MUL,ELITE_LOOT_UPGRADE,VILLAGE_DEFENSE_FIGHTS,DANGER_EXP_CHAIN_MUL,GOLD_PER_HIT_BONUS,BOSS_ENRAGE_EXP_BONUS,COMBO_PRESTIGE_ATK_FLAT,WAVE_GOLD_SURGE_PER_KILL,PRESTIGE_EXP_FLOOR_PER_LEVEL,CRIT_CHAIN_GOLD_BONUS,FORGE_VISIT_DISCOUNT,DANGER_ATK_CHAIN_BONUS,BOSS_DEFEAT_HEAL_RATE,COMBO_ATK_MILESTONE_INTERVAL,COMBO_MILESTONE_ATK,GOLD_SHIELD_OVERFLOW_THRESHOLD,GOLD_OVERFLOW_SHIELD_DURATION,GOLD_OVERFLOW_SHIELD_REDUCTION,TROPHY_EXP_BONUS,ELITE_CHAIN_THRESHOLD,ELITE_CHAIN_GOLD,PRESTIGE_GOLD_PER_COUNT,DANGER_COMBO_ATK_BONUS,WAVE_EXP_SCALE_PER_WAVE,WAVE_EXP_SCALE_CAP,BOSS_VAULT_PRESTIGE_MUL,COMBO_BREAK_GOLD_PER_LEVEL,CRIT_MASTERY_PER_CRIT,CRIT_MASTERY_CAP,VILLAGE_REST_ATK_DURATION,VILLAGE_REST_ATK_BONUS,DANGER_GOLD_CAP_PER_STREAK,ELITE_EXP_CHAIN_BONUS,PRESTIGE_SHIELD_HITS,VILLAGE_EXP_PER_VISIT,DANGER_PRESTIGE_GOLD_MUL,BOSS_CHAIN_GOLD_PER_LEVEL,COMBO_CRIT_SYNERGY_THRESHOLD,COMBO_CRIT_DMG_BONUS,WAVE_MOMENTUM_ATK_DURATION,WAVE_MOMENTUM_ATK_MUL,ELITE_PRESTIGE_GOLD_FLAT,DANGER_CHAIN_HEAL_THRESHOLD,DANGER_CHAIN_HEAL_RATE,BANK_INTEREST_RATE,BANK_INTEREST_CAP,PRESTIGE_ALL_EXP_BONUS,COMBAT_MASTERY_PER_100,COMBAT_MASTERY_CAP,SURVIVAL_GOLD_THRESHOLD,SURVIVAL_GOLD_PER_LEVEL,PRESTIGE_DANGER_IMMUNE_FIGHTS,WAVE_GOLD_CASCADE_PER_FIGHT,BOSS_EXP_MASTERY_PER_UNIQUE,BOSS_EXP_MASTERY_CAP,CRIT_HEAL_SCALE_PER_100,CRIT_HEAL_SCALE_CAP,COMBO_GOLD_ESCALATION_THRESHOLD,COMBO_GOLD_ESCALATION_BONUS,ELITE_DANGER_EXP_BONUS,VILLAGE_PRESTIGE_HEAL_BONUS,DEATH_GOLD_PROTECT_PER_PRESTIGE,DEATH_GOLD_PROTECT_CAP,FINAL_MASTERY_PER_1000_FIGHTS,FINAL_MASTERY_CAP,REVENGE_STREAK_ATK_PER_DEATH,REVENGE_STREAK_CAP,REVENGE_STREAK_DURATION,GOLD_RAIN_CHANCE,GOLD_RAIN_MUL,EXP_FOUNTAIN_PER_100_FIGHTS,SHIELD_REGEN_INTERVAL,DANGER_MASTERY_PER_50,DANGER_MASTERY_CAP,COMBO_PERSIST_RATE,BOSS_TROPHY_GOLD_PER_UNIQUE,ELITE_MASTERY_PER_20,ELITE_MASTERY_CAP,PRESTIGE_MOMENTUM_BONUS,WAVE_CHAIN_ATK_PER_WAVE,WAVE_CHAIN_CAP,PRESTIGE_CRIT_DMG_BONUS,DANGER_GOLD_STREAK_BONUS,COMBO_EXP_CASCADE_THRESHOLD,COMBO_EXP_CASCADE_MUL,BOSS_HEAL_ON_KILL_RATE,ELITE_GOLD_CHAIN_BONUS,VILLAGE_TRAINING_EXP_PER_PRESTIGE,DEATH_EXP_SAVE_RATE,WAVE_GOLD_ACCUMULATOR_MUL,COMBO_SHIELD_REGEN_THRESHOLD,PRESTIGE_EXP_SCALE_BONUS,PRESTIGE_EXP_SCALE_CAP,OVERKILL_CHAIN_EXTRA_MUL,OVERKILL_CHAIN_EXTRA_CAP,DANGER_CRIT_BONUS,SURVIVAL_COMPOUND_THRESHOLD,SURVIVAL_COMPOUND_EXP_MUL,PRESTIGE_BANK_INTEREST_BONUS,ELITE_BOSS_SYNERGY_DROP_BONUS,COMBO_GOLD_MILESTONE_INTERVAL,COMBO_GOLD_MILESTONE_AMOUNT,WAVE_DANGER_EXP_BONUS,DEATH_COUNT_ATK_PER_10,DEATH_COUNT_ATK_CAP,PRESTIGE_SHIELD_BLOCK_BONUS,BOSS_VAULT_PRESTIGE_SCALE,COMBO_END_EXP_THRESHOLD,COMBO_END_EXP_PER_COMBO,DANGER_STREAK_GOLD_COMPOUND,DANGER_STREAK_COMPOUND_THRESHOLD,ELITE_CHAIN_ATK_BONUS,ELITE_CHAIN_ATK_DURATION,PRESTIGE_HEAL_BOOST,WAVE_COMPLETE_GOLD_BONUS,BOSS_FURY_ATK_SCALE,CRIT_CHAIN_EXP_BONUS,VILLAGE_GOLD_FOUNTAIN_SCALE,DEATH_DEFIANCE_PRESTIGE_CHANCE,DEATH_DEFIANCE_PRESTIGE_COOLDOWN,COMBO_PRESTIGE_SCALE,DANGER_EXP_MASTERY_PER_100,DANGER_EXP_MASTERY_CAP,BOSS_GOLD_CASCADE_PER_BOSS,ELITE_VILLAGE_EXP_BURST,COMBO_ATK_ACCEL_THRESHOLD,COMBO_ATK_ACCEL_BONUS,PRESTIGE_GOLD_CASCADE_BONUS,PRESTIGE_GOLD_CASCADE_CAP,WAVE_EXP_BURST_PER_LEVEL,DANGER_SHIELD_GRANT_CHANCE,BOSS_CRIT_BONUS,DEATH_GOLD_COMPOUND_PER_DEATH,DEATH_GOLD_COMPOUND_CAP,ELITE_PRESTIGE_ATK_BONUS,GOLD_OVERFLOW_SHIELD_UPGRADE,COMBO_GOLD_VELOCITY_BONUS,PRESTIGE_DANGER_GOLD_BONUS,WAVE_ATK_MOMENTUM_PER_WAVE,WAVE_ATK_MOMENTUM_CAP,ELITE_MASTERY_UPGRADE_BONUS,BOSS_VAULT_COMPOUND_BONUS,CRIT_GOLD_MASTERY_PER_50,CRIT_GOLD_MASTERY_CAP,VILLAGE_SHIELD_RESTORE,DEATH_EXP_CASCADE_RATE,COMBO_DANGER_SYNERGY_THRESHOLD,COMBO_DANGER_SYNERGY_MUL,PRESTIGE_SHIELD_RECHARGE,DANGER_GOLD_MASTERY_RATE,DANGER_GOLD_MASTERY_CAP,COMBO_EXP_VELOCITY_RATE,COMBO_EXP_VELOCITY_CAP,BOSS_ATK_FURY_CHAIN_BONUS,BOSS_ATK_FURY_CHAIN_CAP,ELITE_GOLD_MASTERY_RATE,ELITE_GOLD_MASTERY_CAP,WAVE_EXP_COMPOUND_RATE,WAVE_EXP_COMPOUND_CAP,DEATH_ATK_SURGE_BONUS,DEATH_ATK_SURGE_DURATION,VILLAGE_GOLD_PRESTIGE_SCALE,CRIT_EXP_CHAIN_RATE,CRIT_EXP_CHAIN_CAP,PRESTIGE_GOLD_MOMENTUM_RATE,PRESTIGE_GOLD_MOMENTUM_CAP,DANGER_ATK_SCALING_RATE,DANGER_ATK_SCALING_CAP,ELITE_EXP_CASCADE_RATE,ELITE_EXP_CASCADE_CAP,BOSS_GOLD_FURY_RATE,WAVE_ATK_COMPOUND_BONUS,WAVE_ATK_COMPOUND_CAP,PRESTIGE_EXP_BURST_PER_PRESTIGE,DEATH_GOLD_INSURANCE_RATE,VILLAGE_EXP_PRESTIGE_SCALE,CRIT_GOLD_CASCADE_RATE,CRIT_GOLD_CASCADE_CAP,COMBO_PRESTIGE_GOLD_RATE,COMBO_PRESTIGE_GOLD_CAP,DANGER_COMBO_ATK_FLAT,DANGER_COMBO_THRESHOLD,ELITE_PRESTIGE_EXP_RATE,WAVE_GOLD_SURGE_SCALE,BOSS_EXP_CASCADE_PER_BOSS,BOSS_EXP_CASCADE_CAP,COMBO_ATK_MILESTONE2_INTERVAL,COMBO_ATK_MILESTONE2_BONUS,PRESTIGE_DANGER_MASTERY_RATE,DEATH_EXP_RECOVERY_PER_DEATH,VILLAGE_ATK_TRAINING_BONUS,VILLAGE_ATK_TRAINING_DURATION,CRIT_COMBO_SYNERGY_BONUS,CRIT_COMBO_SYNERGY_THRESHOLD,ELITE_GOLD_CASCADE_PER_ELITE,ELITE_GOLD_CASCADE_CAP,PRESTIGE_ATK_MOMENTUM_RATE,PRESTIGE_ATK_MOMENTUM_CAP,DANGER_EXP_SURGE_BONUS,COMBO_GOLD_MILESTONE2_INTERVAL,COMBO_GOLD_MILESTONE2_BONUS,BOSS_SHIELD_GRANT_DURATION,WAVE_EXP_MASTERY_RATE,WAVE_EXP_MASTERY_CAP,ELITE_ATK_CHAIN_BONUS2,ELITE_ATK_CHAIN_CAP2,PRESTIGE_GOLD_BURST_PER_PRESTIGE,DEATH_COMBO_PRESERVE_RATE,VILLAGE_DANGER_RESET,FINAL_MASTERY_RATE,FINAL_MASTERY2_CAP,BLOOD_PACT_HP_COST,BLOOD_PACT_ATK_BONUS,BLOOD_PACT_THRESHOLD,GREED_GAMBIT_GOLD_THRESHOLD,GREED_GAMBIT_EXP_BONUS,GREED_GAMBIT_GOLD_PENALTY,ADRENALINE_RUSH_HP_THRESHOLD,ADRENALINE_RUSH_ATK_BONUS,SACRIFICE_GOLD_RATE,SACRIFICE_GOLD_EXP_RATIO,RISK_REWARD_DANGER_EXP,RISK_REWARD_DANGER_DEATH_PENALTY,SHIELD_SACRIFICE_ATK_MUL,SHIELD_SACRIFICE_CHANCE,COMBO_TAX_THRESHOLD,COMBO_TAX_RATE,COMBO_TAX_REWARD_MUL,PRESTIGE_ECHO_DURATION,PRESTIGE_ECHO_BONUS,PRESTIGE_ECHO_DECAY,BOSS_ENRAGE_REWARD_MUL,BOSS_ENRAGE_DMG_MUL,BOSS_ENRAGE_CHANCE,WAVE_EXHAUSTION_ATK_PENALTY,WAVE_EXHAUSTION_DURATION,WAVE_EXHAUSTION_GOLD_BONUS,LOW_HP_FURY_THRESHOLD,LOW_HP_FURY_ATK_MUL,FULL_HP_FORTUNE_GOLD_MUL,COMBO_GATE_THRESHOLD,COMBO_GATE_EXP_BURST,GOLD_THRESHOLD_DEF_MUL,GOLD_THRESHOLD_DEF_BONUS,DEATH_PROXIMITY_CRIT_DURATION,BOSS_CONDITIONAL_MUL,ELITE_HUNTER_STREAK,ELITE_HUNTER_REWARD_MUL,DEEP_DANGER_THRESHOLD,DEEP_DANGER_EXP_MUL,PRESTIGE_READY_BONUS_PER_FIGHT,PRESTIGE_READY_BONUS_CAP,CONDITIONAL_STACK_BONUS,CONDITIONAL_STACK_CAP,GOLD_BURN_RATE,GOLD_BURN_ATK_PER_100,GOLD_BURN_COOLDOWN,LEVEL_SACRIFICE_RATE,COMBO_RESET_GOLD_PER_COMBO,EXP_OFFERING_RATE,EXP_OFFERING_BOSS_MUL,SHIELD_BREAK_BURST_MUL,SHIELD_BREAK_BURST_DURATION,DANGER_BET_INCREASE,DANGER_BET_LOCK_MUL,DANGER_BET_DURATION,HEALTH_TAX_HP_COST,HEALTH_TAX_GOLD_PER_FIGHT,SACRIFICE_ALTAR_COOLDOWN,SACRIFICE_DIMINISH_RATE,SACRIFICE_DIMINISH_CAP,SACRIFICE_PRESTIGE_RATE,SACRIFICE_PRESTIGE_CAP,MOMENTUM_DECAY_RATE,GOLDEN_HOUR_INTERVAL,GOLDEN_HOUR_DURATION,GOLDEN_HOUR_GOLD_MUL,FATIGUE_ONSET,FATIGUE_ATK_PENALTY_PER_FIGHT,FATIGUE_CAP,ACCUMULATOR_PER_CLEAN,ACCUMULATOR_CAP,SEASON_LENGTH,RUSH_HOUR_START,RUSH_HOUR_DURATION,RUSH_HOUR_GOLD_MUL,RUSH_HOUR_EXP_MUL,AGING_INTERVAL,AGING_EXP_BONUS,AGING_ATK_PENALTY,AGING_CAP,REJUVENATION_AGE,REJUVENATION_EXP_BURST,TIME_LOCK_GROWTH,TIME_LOCK_DURATION,TIME_LOCK_DEPOSIT_RATE,TEMPORAL_PRESTIGE_FAST_THRESHOLD,TEMPORAL_PRESTIGE_FAST_BONUS,TEMPORAL_PRESTIGE_SLOW_BONUS,BLOOD_FURY_SYNERGY_MUL,WEALTH_SACRIFICE_EFFICIENCY,TEMPORAL_COMBO_DISCOUNT,ELDER_WISDOM_AGE,ELDER_WISDOM_PRESTIGE,ELDER_WISDOM_EXP_MUL,DESPERATE_TRADE_CRIT_MUL,SYNERGY_COUNT_BONUS,SYNERGY_COUNT_CAP,SYNERGY_TIER_3_BONUS,SYNERGY_TIER_5_BONUS,ANTI_SYNERGY_PENALTY,SYNERGY_PRESTIGE_RATE,SYNERGY_PRESTIGE_CAP,TOTAL_SYNERGIES,RELIC_DROP_CHANCE_ELITE,RELIC_DROP_CHANCE_BOSS,RELIC_UPGRADE_CHANCE,RELIC_MAX_SLOTS,EMBER_CROWN_ATK_PER_CRIT,EMBER_CROWN_CAP,MISER_POUCH_GOLD_MUL,MISER_POUCH_HEAL_PENALTY,HOURGLASS_DURATION_MUL,BLOOD_PACT_RELIC_EFFICIENCY,BLOOD_PACT_RELIC_HP_PENALTY,SCHOLAR_LENS_EXP_MUL,SCHOLAR_LENS_ATK_PENALTY,RELIC_UPGRADE_BONUS,RELIC_PRESTIGE_RETENTION,MERCHANT_EVENT_CHANCE,MERCHANT_PRICE_MUL,TREASURE_SHRINE_CHANCE,SHRINE_GOLD_BURST,SHRINE_EXP_BURST,SHRINE_HEAL_AMOUNT,TRAP_CHANCE,TRAP_DAMAGE,TRAP_GOLD_LOSS,TRAP_AVOID_COMBO,REST_SHRINE_CHANCE,GAMBLER_CHANCE,GAMBLER_WIN_RATE,BLACKSMITH_CHANCE,BLACKSMITH_BOOST,CURSED_ALTAR_CHANCE,CURSED_ALTAR_ATK_BUFF,CURSED_ALTAR_DAMAGE_MUL,CURSED_ALTAR_DURATION,FAIRY_CHANCE,FAIRY_DURATION,MENTOR_EXP_MUL,TIME_RIFT_CHANCE,EVENT_CHAIN_THRESHOLD,EVENT_CHAIN_REWARD_EXP,EVENT_CHAIN_REWARD_GOLD,VILLAGE_GOLD_FOUNTAIN,DANGER_TAX_IMMUNITY,CRIT_STREAK_GUARANTEE_THRESHOLD,BOSS_KILL_EXP_MUL,GOLD_INVEST_LOCK_FIGHTS,GOLD_INVEST_RETURN_MUL,GOLD_INVEST_MIN,DAMAGE_REFLECT_RATE,PASSIVE_GOLD_PER_VISIT,PASSIVE_GOLD_CAP,BOSS_IMMUNITY_INTERVAL,ACHIEVEMENT_KILL_THRESHOLDS,ACHIEVEMENT_ATK_BONUS,WEATHER_CHANCE,WEATHER_RAIN_ATK_PENALTY,WEATHER_WIND_EXP_BONUS,WEATHER_FOG_CRIT_PENALTY,ARENA_COST,ARENA_REWARD_MUL,ARENA_ENEMY_HP_MUL,SHRINE_SKILL_GRANT_RATE,MERCIFUL_PROC_RATE,ATK_CAP_BASE,ATK_CAP_PER_PRESTIGE,ATK_CAP_MAX,TRIAL_GROUNDS_LEVEL_MUL,TRIAL_GROUNDS_DURATION,RELIC_MAX_LEVEL,STORM_NEXUS_ATK_MUL,STORM_NEXUS_HP_DRAIN_RATE,STORM_NEXUS_DURATION,VOID_RIFT_SCALE_PER_TIER,RAIN_SANCTUARY_HEAL_RATE,RAIN_SANCTUARY_GOLD_MUL,RAIN_SANCTUARY_DURATION,FOG_AMBUSH_ENEMY_ATK_MUL,FOG_AMBUSH_EXP_MUL,FOG_AMBUSH_DURATION,VOID_RIFT_EXP_PER_TIER,EVENT_DECLINE_GOLD_RATE,EVENT_DECLINE_GOLD_CAP,WEATHER_DURATION_MIN,WEATHER_DURATION_MAX,WIND_GALE_EXP_MUL,WIND_GALE_DODGE_BONUS,WIND_GALE_DURATION,WIND_GALE_GOLD_PENALTY,SNOW_DRIFT_ENEMY_SPD_MUL,SNOW_DRIFT_ATK_PENALTY,SNOW_DRIFT_DURATION,ABYSSAL_CONVERGENCE_EXP_MUL,ABYSSAL_CONVERGENCE_ENEMY_ATK_MUL,ABYSSAL_CONVERGENCE_HP_DRAIN_RATE,LATE_GAME_DENSITY_THRESHOLD,LATE_GAME_DENSITY_MUL,TEMPORAL_FISSURE_STORE_RATE,TEMPORAL_FISSURE_PAYBACK_MUL,EVENT_MOMENTUM_TIER2_DURATION,EVENT_MOMENTUM_TIER3_DURATION,ABYSSAL_CONVERGENCE_GOLD_MUL,TITAN_ARENA_DURATION,TITAN_ARENA_ENEMY_HP_MUL,TITAN_ARENA_ENEMY_ATK_MUL,TITAN_ARENA_EXP_MUL,GOLD_CRUCIBLE_DURATION,GOLD_CRUCIBLE_ATK_RATE,ASTRAL_PARADOX_DURATION,ASTRAL_PARADOX_EXP_MUL,ASTRAL_PARADOX_ENEMY_ATK_MUL,CRIMSON_TITHE_DURATION,CRIMSON_TITHE_EXP_MUL,CRIMSON_TITHE_LIFESTEAL,SOUL_FORGE_EXP_PER_STACK,SOUL_FORGE_MAX_STACKS } from './encounter/constants';
export * from './encounter/constants';

const ENEMY_BASE_HP = 60; // C618: was 30. Forces multi-hit fights (hero can't one-shot)
const ENEMY_BASE_ATK = 12; // C618: was 8. Meaningful damage per hit
const BOSS_HP_MUL = 4;
const BOSS_ATK_MUL = 3;  // was 2, tuned C110 — boss danger onset earlier
const ENEMY_EXP_BASE = 12;
const BOSS_EXP_BASE = 60;
const DROP_RATE = 0.36; // cycle 1 F1: was 0.48 (V3-H F2) — skill saturation 해소
const SHRINE_HEAL_FRACTION = 0.4;
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
  private deathAtkSurgeRemaining = 0; // C467: temp ATK surge after death
  private critExpChain = 0; // C469: consecutive crits for exp chain
  private villageAtkTrainingRemaining = 0; // C488: village ATK training duration
  private bossShieldRemaining = 0; // C494: boss shield remaining
  private prestigeEchoRemaining = 0; // C508: prestige echo duration
  private inspirationRemaining = 0; // C749: inspiration ATK buff duration
  private mentorRemaining = 0; // C812: wandering mentor EXP buff duration
  // C788: hero reference for event resolve (set at start of resolveEncounter)
  private hero!: HeroEntity;
  private colosseumRemaining = 0; // C757: ancient colosseum duration (EXP×2, enemy ATK×1.3)
  private voidRiftRemaining = 0; // C758: void rift tier+2 offset duration
  private trialGroundsRemaining = 0; // C762: trial grounds duration (EXP×1.35, enemy +1 level)
  private stormNexusRemaining = 0; // C770: Storm Nexus duration (ATK×1.4, HP drain 5%)
  private rainSanctuaryRemaining = 0; // C773: Rain Sanctuary duration (gold×0.7)
  private fogAmbushRemaining = 0; // C773: Fog Ambush duration (enemy ATK×1.2, EXP×1.3)
  private windGaleRemaining = 0; // C782: Wind Gale duration (EXP×1.25, dodge+15%)
  private snowDriftRemaining = 0; // C782: Snow Drift duration (enemy SPD-30%, ATK-10%)
  private abyssalConvergenceRemaining = 0; // C789: Abyssal Convergence (EXP×1.5, ATK×1.6, drain)
  private temporalFissureRemaining = 0; // C791: Temporal Fissure (store EXP, pay back ×2)
  private temporalFissureStoredExp = 0; // C791: accumulated EXP during fissure
  private titanArenaRemaining = 0; // C797: Titan Arena (enemy HP×1.5, ATK×1.2, EXP×2.0)
  private crimsonTitheRemaining = 0; // C803: Crimson Tithe (HP cost → EXP×1.8 + lifesteal)
  private goldCrucibleRemaining = 0; // C803: Gold Crucible (ratio-based ATK from gold burn)
  private goldCrucibleAtkFlat = 0; // C803: burned gold × ATK_RATE
  private astralParadoxRemaining = 0; // C800: Astral Paradox (EXP×2.5, enemy ATK×1.8)
  private soulForgeRemaining = 0; // C806: Soul Forge (permanent EXP stack)
  private soulForgeStacks = 0; // C806: permanent stacks (max 5, each +8% EXP)
  // C788: EventOrchestrator replaces EventStateMachine + accept/decline logic
  private readonly eventOrch = new EventOrchestrator();
  private readonly declineStack: DeclineStackState = createDeclineStack(); // C804
  private declineStackExpMul = 1; // C804: bonus EXP from stacked declines
  private declineStackExpDuration = 0; // C804: fights remaining for bonus
  private waveExhaustionRemaining = 0; // C510: wave exhaustion duration
  private comboGateTriggered = false; // C513: combo gate one-shot
  private deathProximityCrit = 0; // C515: guaranteed crit after surviving at 1 HP
  private consecutiveEliteKills2 = 0; // C517: elite hunter streak
  private prestigeReadyBonus = 0; // C519: bonus from fighting past prestige threshold
  private goldBurnCooldown = 0; // C521: gold burn cooldown
  private goldBurnTotal = 0; // C521: total gold burned (for ATK calc)
  private expOfferingActive = false; // C524: next boss gets ×3
  private shieldBreakBurstRemaining = 0; // C525: burst ATK duration
  private dangerBetRemaining = 0; // C526: danger bet lock duration
  private healthTaxApplied = false; // C527: whether health tax taken
  private sacrificeAltarCooldown = 0; // C528: shared cooldown
  private totalSacrifices = 0; // C530: total sacrifice count
  private sacrificeDiminish = 1.0; // C529: diminishing effectiveness
  private levelSacrificeCooldown = 0; // C522: cooldown for level sacrifice
  private goldenHourRemaining = 0; // C532: golden hour window
  private accumulatorBonus = 0; // C534: clean fight accumulator
  private heroAge = 0; // C537: aging system
  private timeLockGold = 0; // C539: gold in time vault
  private timeLockTimer = 0; // C539: fights until vault matures
  private fightsSincePrestige = 0; // C536/C540: fights in current prestige cycle
  private temporalPrestigeBonus = 0; // C540: bonus from last prestige speed
  private synergiesDiscovered = 0; // C550: unique synergies triggered (bitmask)
  private synergyPrestigeBonus = 0; // C549: permanent bonus from synergy discovery
  // C551-C560: Relic system state (C733: delegated to RelicEffectResolver)
  private relicResolver = new RelicEffectResolver({ relics: [], relicLevels: [], imprintedRelic: -1, imprintedRelicLevel: 0 });
  private emberCrownStacks = 0; // C553: ATK stacks from crits
  private phoenixFeatherUsed = false; // C555: one-shot survival
  // C733: compatibility accessors for external functions that read/write relic arrays
  private get relics(): number[] { return this.relicResolver.snapshot().relics; }
  private set relics(v: number[]) { this.relicResolver = new RelicEffectResolver({ ...this.relicResolver.snapshot(), relics: v }); }
  private get relicLevels(): number[] { return this.relicResolver.snapshot().relicLevels; }
  private set relicLevels(v: number[]) { this.relicResolver = new RelicEffectResolver({ ...this.relicResolver.snapshot(), relicLevels: v }); }
  private get imprintedRelic(): number { return this.relicResolver.snapshot().imprintedRelic; }
  private set imprintedRelic(v: number) { this.relicResolver = new RelicEffectResolver({ ...this.relicResolver.snapshot(), imprintedRelic: v }); }
  private get imprintedRelicLevel(): number { return this.relicResolver.snapshot().imprintedRelicLevel; }
  private set imprintedRelicLevel(v: number) { this.relicResolver = new RelicEffectResolver({ ...this.relicResolver.snapshot(), imprintedRelicLevel: v }); }
  // C686: cached ATK breakdown for tooltip display
  private lastAtkBreakdownInput: import('../components/AtkBreakdownLogic').AtkBreakdownInput | null = null;
  // C707: cached EXP breakdown for badge display
  private lastExpBreakdown: Array<{ name: string; value: number }> | null = null;
  // C807: WeatherSubsystem replaces inline lastWeather + weatherRemaining
  private readonly weatherSub = new WeatherSubsystem();
  private lastHealResult: import('./encounter/PostCombatHealCalc').PostCombatHealResult | null = null;
  // C561-C570: Event state
  private cursedAltarRemaining = 0; // C567: cursed altar duration
  private cursedAltarAtkBuff = false; // C567: ATK buff active
  private fairyBlessingRemaining = 0; // C568: guaranteed drops
  private eventChainCount = 0; // C570: consecutive events
  private eventMomentumAtkRemaining = 0; // C793: ATK buff from tier 2
  private eventMomentumDensityRemaining = 0; // C793: density boost from tier 3
  private fightsSinceEvent = 0; // C714: pity timer counter
  private readonly choiceEngine = new EventChoiceEngine();
  private landmarkResolver: LandmarkResolver | null = null;

  private getLandmarkResolver(): LandmarkResolver {
    if (!this.landmarkResolver) {
      const ctx: any = {
        rngChance: (r: number) => this.rng.chance(r),
        rngInt: (b: number) => this.rng.int(b),
        shrineTithes: this.shrineTithes,
        incrementShrineTithes: () => { this.shrineTithes++; },
        setShrineBuffRemaining: (v: number) => { this.shrineBuffRemaining = v; },
        setShrineBlessingRemaining: (v: number) => { this.shrineBlessingRemaining = v; },
        setDarknessCursed: (v: boolean) => { this.darknessCursed = v; },
        tryLearnSkill: (hero: HeroEntity, events: OverworldEvent[]) => {
          if (this.rng.chance(SHRINE_SKILL_GRANT_RATE)) {
            const learn = SkillLearningSystem.tryLearn(hero, this.rng.int(1_000_000_000));
            if (learn) {
              events.push({ type: 'skill_learned', skillId: learn.skillId, skillNameKR: learn.skillNameKR, atkBefore: learn.atkBefore, atkAfter: learn.atkAfter });
            }
          }
        },
      };
      this.landmarkResolver = new LandmarkResolver(ctx);
    }
    (this.landmarkResolver as any).ctx.shrineTithes = this.shrineTithes;
    return this.landmarkResolver;
  }

  constructor(private readonly rng: SeededRng, private opts: EncounterEngineOpts = {}) {
    // C788: EventOrchestrator self-initializes on construction
  }

  setOpts(opts: EncounterEngineOpts): void {
    this.opts = { ...this.opts, ...opts };
  }

  private getPrestigeThreshold(): number {
    return PRESTIGE_LEVEL_REQUIREMENT + this.prestigeCount * PRESTIGE_LEVEL_INCREMENT;
  }

  private countBits(n: number): number {
    let count = 0;
    while (n) { count += n & 1; n >>>= 1; }
    return count;
  }

  private hasRelic(id: number): boolean {
    return this.relicResolver.hasRelic(id);
  }

  private getRelicPower(id: number): number {
    return this.relicResolver.getRelicPower(id);
  }

  getComboStreak(): number { return this.comboStreak; }
  resetComboStreak(): void { this.comboStreak = 0; }
  getBattleMomentum(): number { return this.battleMomentum; }
  getDropStreak(): number { return this.dropStreak; }
  getShrineBuffRemaining(): number { return this.shrineBuffRemaining; }
  getMercyRemaining(): number { return this.mercyRemaining; }

  // C572: expose relic state for UI (C733: delegated)
  getRelics(): { id: number; level: number; name: string }[] {
    return this.relicResolver.getRelicsDisplay();
  }
  getImprintedRelic(): { id: number; name: string } | null {
    return this.relicResolver.getImprintedRelicDisplay();
  }
  getPrestigeCount(): number { return this.prestigeCount; }
  // C657: ATK cap scales with prestige (10 base + 2 per prestige, max 30)
  getAtkCap(): number { return Math.min(ATK_CAP_BASE + this.prestigeCount * ATK_CAP_PER_PRESTIGE, ATK_CAP_MAX); }
  getAtkBreakdownInput() { return this.lastAtkBreakdownInput; }
  getExpBreakdown() { return this.lastExpBreakdown; }
  getWeather() { return this.weatherSub.getCurrent(); }
  // C753: expose inspiration remaining for HUD
  getInspirationRemaining(): number { return this.inspirationRemaining; }
  // C788: All event pending/resolve/remaining delegate to EventOrchestrator
  getColosseumRemaining(): number { return this.colosseumRemaining; }
  getColosseumPending(): boolean { return this.eventOrch.getPending('colosseum'); }
  resolveColosseum(accept: boolean): void { this.applyEventResolve('colosseum', accept); }
  getVoidRiftRemaining(): number { return this.voidRiftRemaining; }
  getVoidRiftPending(): boolean { return this.eventOrch.getPending('void_rift'); }
  resolveVoidRift(accept: boolean): void { this.applyEventResolve('void_rift', accept); }
  getTrialGroundsRemaining(): number { return this.trialGroundsRemaining; }
  getTrialGroundsPending(): boolean { return this.eventOrch.getPending('trial_grounds'); }
  resolveTrialGrounds(accept: boolean): void { this.applyEventResolve('trial_grounds', accept); }
  getStormNexusRemaining(): number { return this.stormNexusRemaining; }
  getStormNexusPending(): boolean { return this.eventOrch.getPending('storm_nexus'); }
  resolveStormNexus(accept: boolean): void { this.applyEventResolve('storm_nexus', accept); }
  getRainSanctuaryRemaining(): number { return this.rainSanctuaryRemaining; }
  getRainSanctuaryPending(): boolean { return this.eventOrch.getPending('rain_sanctuary'); }
  resolveRainSanctuary(accept: boolean): void { this.applyEventResolve('rain_sanctuary', accept); }
  getFogAmbushRemaining(): number { return this.fogAmbushRemaining; }
  getFogAmbushPending(): boolean { return this.eventOrch.getPending('fog_ambush'); }
  resolveFogAmbush(accept: boolean): void { this.applyEventResolve('fog_ambush', accept); }
  getWindGaleRemaining(): number { return this.windGaleRemaining; }
  getWindGalePending(): boolean { return this.eventOrch.getPending('wind_gale'); }
  resolveWindGale(accept: boolean): void { this.applyEventResolve('wind_gale', accept); }
  getSnowDriftRemaining(): number { return this.snowDriftRemaining; }
  getSnowDriftPending(): boolean { return this.eventOrch.getPending('snow_drift'); }
  resolveSnowDrift(accept: boolean): void { this.applyEventResolve('snow_drift', accept); }
  // C789: Abyssal Convergence
  getAbyssalConvergenceRemaining(): number { return this.abyssalConvergenceRemaining; }
  getAbyssalConvergencePending(): boolean { return this.eventOrch.getPending('abyssal_convergence'); }
  resolveAbyssalConvergence(accept: boolean): void { this.applyEventResolve('abyssal_convergence', accept); }
  // C791: Temporal Fissure
  getTemporalFissureRemaining(): number { return this.temporalFissureRemaining; }
  getTemporalFissurePending(): boolean { return this.eventOrch.getPending('temporal_fissure'); }
  resolveTemporalFissure(accept: boolean): void { this.applyEventResolve('temporal_fissure', accept); }
  // C797: Titan Arena
  getTitanArenaRemaining(): number { return this.titanArenaRemaining; }
  getTitanArenaPending(): boolean { return this.eventOrch.getPending('titan_arena'); }
  resolveTitanArena(accept: boolean): void { this.applyEventResolve('titan_arena', accept); }
  // C803: Crimson Tithe
  getCrimsonTitheRemaining(): number { return this.crimsonTitheRemaining; }
  getCrimsonTithePending(): boolean { return this.eventOrch.getPending('crimson_tithe'); }
  resolveCrimsonTithe(accept: boolean): void { this.applyEventResolve('crimson_tithe', accept); }
  // C800: Gold Crucible
  getGoldCrucibleRemaining(): number { return this.goldCrucibleRemaining; }
  getGoldCruciblePending(): boolean { return this.eventOrch.getPending('gold_crucible'); }
  resolveGoldCrucible(accept: boolean): void { this.applyEventResolve('gold_crucible', accept); }
  // C800: Astral Paradox
  getAstralParadoxRemaining(): number { return this.astralParadoxRemaining; }
  getAstralParadoxPending(): boolean { return this.eventOrch.getPending('astral_paradox'); }
  resolveAstralParadox(accept: boolean): void { this.applyEventResolve('astral_paradox', accept); }
  getSoulForgeRemaining(): number { return this.soulForgeRemaining; }
  getSoulForgePending(): boolean { return this.eventOrch.getPending('soul_forge'); }
  resolveSoulForge(accept: boolean): void { this.applyEventResolve('soul_forge', accept); }
  getSoulForgeStacks(): number { return this.soulForgeStacks; }

  // C801: Generic event accessors — replaces per-event boilerplate in controllers
  private readonly eventRemainingMap: Record<EventId, () => number> = {
    colosseum: () => this.colosseumRemaining,
    void_rift: () => this.voidRiftRemaining,
    trial_grounds: () => this.trialGroundsRemaining,
    storm_nexus: () => this.stormNexusRemaining,
    rain_sanctuary: () => this.rainSanctuaryRemaining,
    fog_ambush: () => this.fogAmbushRemaining,
    wind_gale: () => this.windGaleRemaining,
    snow_drift: () => this.snowDriftRemaining,
    abyssal_convergence: () => this.abyssalConvergenceRemaining,
    temporal_fissure: () => this.temporalFissureRemaining,
    titan_arena: () => this.titanArenaRemaining,
    crimson_tithe: () => this.crimsonTitheRemaining,
    gold_crucible: () => this.goldCrucibleRemaining,
    astral_paradox: () => this.astralParadoxRemaining,
    soul_forge: () => this.soulForgeRemaining,
  };
  getEventRemaining(id: EventId): number { return this.eventRemainingMap[id](); }
  getEventPending(id: EventId): boolean { return this.eventOrch.getPending(id); }
  resolveEvent(id: EventId, accept: boolean): void { this.applyEventResolve(id, accept); }
  // C788: Apply resolve effects from orchestrator to local state
  private applyEventResolve(id: EventId, accept: boolean): void {
    const effects = this.eventOrch.resolve(id, accept, {
      heroHpMax: this.hero.hpMax,
      heroHp: this.hero.hp,
      heroGold: this.hero.gold,
      comboStreak: this.comboStreak,
      relicLevels: this.relicLevels,
    });
    if (accept) {
      // C804: consume decline stack — stacked bonus applied in EXP calculator
      const dsMul = consumeDeclineStack(this.declineStack);
      if (dsMul > 1) {
        this.declineStackExpMul = dsMul;
        // Find the accepted event's duration
        const dur = effects.colosseumRemaining || effects.voidRiftRemaining ||
          effects.trialGroundsRemaining || effects.stormNexusRemaining ||
          effects.rainSanctuaryRemaining || effects.fogAmbushRemaining ||
          effects.windGaleRemaining || effects.snowDriftRemaining ||
          effects.abyssalConvergenceRemaining || effects.temporalFissureRemaining ||
          effects.titanArenaRemaining || effects.crimsonTitheRemaining ||
          effects.goldCrucibleRemaining || effects.astralParadoxRemaining || 5;
        this.declineStackExpDuration = dur;
      }
      if (effects.colosseumRemaining) this.colosseumRemaining = effects.colosseumRemaining;
      if (effects.voidRiftRemaining) this.voidRiftRemaining = effects.voidRiftRemaining;
      if (effects.voidRiftRelicLevels) this.relicLevels = effects.voidRiftRelicLevels;
      if (effects.trialGroundsRemaining) this.trialGroundsRemaining = effects.trialGroundsRemaining;
      if (effects.stormNexusRemaining) this.stormNexusRemaining = effects.stormNexusRemaining;
      if (effects.rainSanctuaryRemaining) this.rainSanctuaryRemaining = effects.rainSanctuaryRemaining;
      if (effects.rainSanctuaryHeal) this.hero.hp = Math.min(this.hero.hpMax, this.hero.hp + effects.rainSanctuaryHeal);
      if (effects.fogAmbushRemaining) this.fogAmbushRemaining = effects.fogAmbushRemaining;
      if (effects.windGaleRemaining) this.windGaleRemaining = effects.windGaleRemaining;
      if (effects.snowDriftRemaining) this.snowDriftRemaining = effects.snowDriftRemaining;
      if (effects.abyssalConvergenceRemaining) this.abyssalConvergenceRemaining = effects.abyssalConvergenceRemaining;
      if (effects.temporalFissureRemaining) {
        this.temporalFissureRemaining = effects.temporalFissureRemaining;
        this.temporalFissureStoredExp = 0;
      }
      if (effects.titanArenaRemaining) this.titanArenaRemaining = effects.titanArenaRemaining;
      if (effects.crimsonTitheRemaining) {
        this.crimsonTitheRemaining = effects.crimsonTitheRemaining;
        this.hero.hp -= effects.crimsonTitheHpCost;
        if (this.hero.hp < 1) this.hero.hp = 1;
      }
      if (effects.goldCrucibleRemaining) {
        this.goldCrucibleRemaining = effects.goldCrucibleRemaining;
        this.goldCrucibleAtkFlat = Math.floor(effects.goldCrucibleGoldBurned * GOLD_CRUCIBLE_ATK_RATE);
        this.hero.gold -= effects.goldCrucibleGoldBurned;
        if (this.hero.gold < 0) this.hero.gold = 0;
      }
      if (effects.astralParadoxRemaining) this.astralParadoxRemaining = effects.astralParadoxRemaining;
      if (effects.soulForgeRemaining) {
        this.soulForgeRemaining = effects.soulForgeRemaining;
        this.comboStreak -= effects.soulForgeComboCost;
        if (this.comboStreak < 0) this.comboStreak = 0;
        this.soulForgeStacks = Math.min(this.soulForgeStacks + 1, SOUL_FORGE_MAX_STACKS);
      }
      // C815: Event Chain — roll for follow-up event after accept
      const chainNext = rollChainEvent(id, (rate) => this.rng.chance(rate));
      if (chainNext) this.eventOrch.trigger(chainNext);
    } else {
      // C804: push decline stack
      pushDecline(this.declineStack);
      if (effects.declineGold) this.hero.gold += effects.declineGold;
    }
  }
  // C735: expose night state for UI
  getIsNight(): boolean { return computeNight(this.totalWins).isNight; }
  getHealResult() { return this.lastHealResult; }
  getEventChainCount(): number { return this.eventChainCount; }
  getDeclineStacks(): number { return this.declineStack.stacks; } // C804
  getEventMomentumAtkRemaining(): number { return this.eventMomentumAtkRemaining; }
  getEventMomentumDensityRemaining(): number { return this.eventMomentumDensityRemaining; }
  // C798: Aggregate accessor for HUD — replaces N individual getter calls
  getActiveEventState() {
    return {
      trialGroundsRemaining: this.trialGroundsRemaining,
      colosseumRemaining: this.colosseumRemaining,
      voidRiftRemaining: this.voidRiftRemaining,
      stormNexusRemaining: this.stormNexusRemaining,
      rainSanctuaryRemaining: this.rainSanctuaryRemaining,
      fogAmbushRemaining: this.fogAmbushRemaining,
      windGaleRemaining: this.windGaleRemaining,
      snowDriftRemaining: this.snowDriftRemaining,
      abyssalConvergenceRemaining: this.abyssalConvergenceRemaining,
      temporalFissureRemaining: this.temporalFissureRemaining,
      titanArenaRemaining: this.titanArenaRemaining,
      crimsonTitheRemaining: this.crimsonTitheRemaining,
      goldCrucibleRemaining: this.goldCrucibleRemaining,
      astralParadoxRemaining: this.astralParadoxRemaining,
      soulForgeRemaining: this.soulForgeRemaining,
      eventMomentumAtkRemaining: this.eventMomentumAtkRemaining,
      eventMomentumDensityRemaining: this.eventMomentumDensityRemaining,
    };
  }
  getTotalDeaths(): number { return this.totalDeaths; }
  getTotalFights(): number { return this.totalWins + this.totalDeaths; }

  // C579: treasure shrine player choice — delegates to EventChoiceEngine
  hasPendingShrineChoice(): boolean { return this.choiceEngine.hasPendingShrineChoice(); }
  setShrineChoice(choice: 0 | 1 | 2): void { this.choiceEngine.setShrineChoice(choice as ShrineChoice); }

  // C603: danger zone fight/retreat real-time choice — delegates to EventChoiceEngine
  hasPendingDangerChoice(): boolean { return this.choiceEngine.hasPendingDangerChoice(); }
  setDangerChoice(retreat: boolean): void { this.choiceEngine.setDangerChoice(retreat); }

  // C578: combat stats summary for visual overlay
  getCombatSummary(): { activeBuffs: string[]; deathPrevention: number; dangerLevel: number; deathSaveBlocked: boolean; adaptivePressure: number } {
    const activeBuffs: string[] = [];
    if (this.shrineBuffRemaining > 0) activeBuffs.push('명상');
    if (this.sacrificeFuryRemaining > 0) activeBuffs.push('분노');
    if (this.cursedAltarAtkBuff) activeBuffs.push('저주 제단');
    if (this.invincibleFights > 0) activeBuffs.push('무적');
    if (this.villageShieldActive) activeBuffs.push('마을 방패');
    if (this.fairyBlessingRemaining > 0) activeBuffs.push('요정 축복');
    if (this.goldenHourRemaining > 0) activeBuffs.push('황금 시간');
    const deathSaveBlocked = this.cursedAltarAtkBuff;
    let deathPrevention = 0;
    if (!deathSaveBlocked) {
      if (this.rng) deathPrevention++; // lucky dodge
      if (this.levelSacrificeCooldown <= 0) deathPrevention++; // level sacrifice ready
    }
    if (this.hasRelic(2) && !this.phoenixFeatherUsed) deathPrevention++; // phoenix (always works)
    const dangerLevel = Math.min(10, Math.floor(this.dangerStreak / 5));
    // C612: adaptive pressure indicator (0-100%)
    const adaptivePressure = Math.min(100, Math.round(this.comboStreak * 2));
    return { activeBuffs, deathPrevention, dangerLevel, deathSaveBlocked, adaptivePressure };
  }

  // C594: extracted death prevention logic
  private applyDeathPrevention(hero: HeroEntity, luckyDodge: boolean): { luckyDodge: boolean } {
    const deathSaveBlocked = this.cursedAltarAtkBuff;
    // Lucky dodge — survive fatal hit with 5% chance
    if (hero.staggered && !deathSaveBlocked && this.rng.chance(LUCKY_DODGE_CHANCE)) {
      hero.staggered = false;
      hero.hp = 1;
      luckyDodge = true;
    }
    // Level sacrifice — sacrifice 25% levels to survive (once per 50 fights)
    if (hero.staggered && !luckyDodge && !deathSaveBlocked && hero.level > 10 && this.levelSacrificeCooldown <= 0) {
      const levelsLost = Math.max(1, Math.floor(hero.level * LEVEL_SACRIFICE_RATE));
      hero.level -= levelsLost;
      hero.recomputeStats();
      hero.staggered = false;
      hero.hp = hero.hpMax;
      // C608: removed prestigeShieldRemaining += 1 (was recharging too freely)
      this.totalSacrifices++;
      this.levelSacrificeCooldown = 30;
    }
    // Phoenix Feather relic — one-time death prevention
    if (hero.staggered && this.hasRelic(2) && !this.phoenixFeatherUsed) {
      hero.staggered = false;
      hero.hp = hero.hpMax;
      this.phoenixFeatherUsed = true;
      this.relicResolver.consumePhoenixFeather();
    }
    return { luckyDodge };
  }

  resolveEncounter(hero: HeroEntity, kind: LandmarkKind, landmarkId: string): OverworldEvent[] {
    this.hero = hero; // C788: store ref for event resolve callbacks
    const events: OverworldEvent[] = [];
    if (kind === 'enemy' || kind === 'boss') {
      const isBoss = kind === 'boss';
      // C119: danger zone — 15% chance on regular enemies. ×1.5 stats, ×3 exp.
      // C226: danger magnet — increased danger zone spawn after enough fights
      const dangerMagnetBonus = this.totalDangerFights >= DANGER_MAGNET_THRESHOLD ? DANGER_MAGNET_SPAWN_BONUS : 0;
      const isDangerZone = !isBoss && this.rng.chance(DANGER_ZONE_RATE + dangerMagnetBonus);
      // C603: danger retreat — real-time choice (delegates to EventChoiceEngine)
      if (isDangerZone && this.choiceEngine.getDangerChoice() === DangerChoice.RETREAT) {
        // Player chose to retreat
        this.choiceEngine.clearDangerChoice();
        const retreatCost = Math.max(50, hero.level * 3);
        hero.gold -= Math.min(hero.gold, retreatCost);
        this.comboStreak = Math.floor(this.comboStreak * 0.5); // C605: halve instead of reset
        this.dangerStreak = 0;
        events.push({ type: 'danger_retreat', cost: retreatCost });
        return events;
      }
      if (isDangerZone && !this.choiceEngine.hasPendingDangerChoice()) {
        // First encounter: signal pending choice
        this.choiceEngine.enterDangerZone();
        events.push({ type: 'danger_zone_choice' });
        // Continue with fight (default) — if player picks retreat, next encounter resolves it
      }
      if (this.choiceEngine.hasPendingDangerChoice() && !isDangerZone) {
        this.choiceEngine.exitDangerZone(); // clear if no danger
      }
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
      // C589: adaptive enemy HP scaling — enemies get tougher during kill streaks
      // C627: increased adaptive scaling (was 0.02 cap 100)
      const adaptiveHpMul = 1 + 0.04 * Math.min(this.comboStreak, 50); // +4% per combo, cap +200%
      // C606: adaptive enemy ATK — death pressure increases with combo
      // C627: increased (was 0.005 cap 50)
      const adaptiveAtkMul = 1 + 0.01 * Math.min(this.comboStreak, 50); // cap +50%
      // C669: enemy prestige scaling — enemies scale with hero prestige
      const { hpMul: enemyPrestigeHpMul, atkMul: enemyPrestigeAtkMul } = computeEnemyPrestigeScale(this.prestigeCount);
      // C771: Void Rift multiplicative scaling (inflation-safe: percentage of level)
      const voidRiftMul = this.voidRiftRemaining > 0
        ? 1 + VOID_RIFT_SCALE_PER_TIER * Math.ceil(Math.log2(Math.max(hero.level, 200) / 200) + 1)
        : 1;
      // C769: Trial Grounds multiplicative offset (inflation-safe: constant % regardless of level)
      const trialGroundsLevel = this.trialGroundsRemaining > 0 ? Math.floor(hero.level * TRIAL_GROUNDS_LEVEL_MUL) : hero.level;
      const effectiveEnemyLevel = Math.floor(trialGroundsLevel * voidRiftMul);
      const enemyHp = Math.max(1, Math.floor(enemyHpAtLevel(ENEMY_BASE_HP, effectiveEnemyLevel, isBoss ? BOSS_HP_MUL : hpMul) * bossStreakScale * timePressureMul * adaptiveHpMul * enemyPrestigeHpMul));
      const enemyAtk = Math.floor(enemyAtkAtLevel(ENEMY_BASE_ATK, effectiveEnemyLevel, isBoss ? BOSS_ATK_MUL : atkMul) * bossStreakScale * adaptiveAtkMul * enemyPrestigeAtkMul * (this.abyssalConvergenceRemaining > 0 ? ABYSSAL_CONVERGENCE_ENEMY_ATK_MUL : 1));

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

      // C807: weather via WeatherSubsystem
      const weatherResult = this.weatherSub.advance(
        (rate) => this.rng.chance(rate),
        (n) => this.rng.int(n),
        WEATHER_DURATION_MIN,
        WEATHER_DURATION_MAX,
      );
      const { weather, atkMul: weatherAtkMul, critMul: weatherCritMul, dodgeMul: weatherDodgeMul, speedMul: weatherSpeedMul } = weatherResult;

      // C220: night mode (C706: extracted to WeatherSystem)
      const { isNight } = computeNight(this.totalWins);

      // === C690: ATK section — side effects + delegated pure computation ===
      // Phase 1: Side effects — capture "had" values, decrement timers
      const hadShieldBreak = this.shieldBreakReady;
      if (this.shieldBreakReady) this.shieldBreakReady = false;
      const hadComboBreaker = this.comboBreakerReady;
      if (this.comboBreakerReady) this.comboBreakerReady = false;
      const hadVillageTraining = this.villageTrainingRemaining > 0;
      if (this.villageTrainingRemaining > 0) this.villageTrainingRemaining--;
      const hadBossFury = this.bossFuryRemaining > 0;
      if (this.bossFuryRemaining > 0) this.bossFuryRemaining--;
      const hadPrestigeSurge = this.prestigeSurgeReady;
      if (this.prestigeSurgeReady) this.prestigeSurgeReady = false;
      const hadVillageRestAtk = this.villageRestAtkRemaining > 0;
      if (this.villageRestAtkRemaining > 0) this.villageRestAtkRemaining--;
      const hadWaveMomentum = this.waveMomentumRemaining > 0;
      if (this.waveMomentumRemaining > 0) this.waveMomentumRemaining--;
      const hadRevengeStreak = this.revengeStreakRemaining > 0;
      if (this.revengeStreakRemaining > 0) this.revengeStreakRemaining--;
      const hadEliteChainAtk = this.eliteChainAtkRemaining > 0;
      if (this.eliteChainAtkRemaining > 0) this.eliteChainAtkRemaining--;
      // deathAtkSurge: original code decrements BEFORE reading multiplier
      if (this.deathAtkSurgeRemaining > 0) this.deathAtkSurgeRemaining--;
      const hadDeathAtkSurge = this.deathAtkSurgeRemaining > 0;
      const hadVillageAtkTraining = this.villageAtkTrainingRemaining > 0;
      if (this.villageAtkTrainingRemaining > 0) this.villageAtkTrainingRemaining--;
      // Blood pact HP check BEFORE cost applied
      const hpBelowBloodPact = hero.hp < hero.hpMax * BLOOD_PACT_THRESHOLD;
      if (hpBelowBloodPact) hero.hp = Math.max(1, hero.hp - Math.floor(hero.hpMax * BLOOD_PACT_HP_COST * (this.hasRelic(4) ? BLOOD_PACT_RELIC_HP_PENALTY : 1)));
      // Shield sacrifice — RNG + state mutation
      let hadShieldSacrifice = false;
      if (this.prestigeShieldRemaining > 0 && this.rng.chance(SHIELD_SACRIFICE_CHANCE)) {
        this.prestigeShieldRemaining--;
        hadShieldSacrifice = true;
        this.shieldBreakBurstRemaining = SHIELD_BREAK_BURST_DURATION;
        this.totalSacrifices++;
      }
      // Prestige echo
      const hadPrestigeEcho = this.prestigeEchoRemaining > 0;
      const prestigeEchoDecay = hadPrestigeEcho ? (PRESTIGE_ECHO_DURATION - this.prestigeEchoRemaining) : 0;
      if (this.prestigeEchoRemaining > 0) this.prestigeEchoRemaining--;
      // C749: Inspiration buff
      const inspirationActive = this.inspirationRemaining > 0;
      if (this.inspirationRemaining > 0) this.inspirationRemaining--;
      // C812: Mentor EXP buff
      const mentorActive = this.mentorRemaining > 0;
      if (this.mentorRemaining > 0) this.mentorRemaining--;
      // C793: Event Momentum buffs
      const eventMomentumAtkActive = this.eventMomentumAtkRemaining > 0;
      if (this.eventMomentumAtkRemaining > 0) this.eventMomentumAtkRemaining--;
      if (this.eventMomentumDensityRemaining > 0) this.eventMomentumDensityRemaining--;
      // C757: Colosseum duration decrement
      if (this.colosseumRemaining > 0) this.colosseumRemaining--;
      // C758: Void Rift tier offset decrement
      if (this.voidRiftRemaining > 0) this.voidRiftRemaining--;
      // C762: Trial Grounds decrement
      if (this.trialGroundsRemaining > 0) this.trialGroundsRemaining--;
      // C770: Storm Nexus decrement + HP drain + ATK buff
      if (this.stormNexusRemaining > 0) {
        hero.hp -= Math.floor(hero.hpMax * STORM_NEXUS_HP_DRAIN_RATE);
        if (hero.hp < 1) hero.hp = 1;
        this.stormNexusRemaining--;
      }
      // C773: Rain Sanctuary decrement (gold penalty applied in gold calc)
      if (this.rainSanctuaryRemaining > 0) this.rainSanctuaryRemaining--;
      // C773: Fog Ambush decrement (enemy ATK + EXP applied in respective calcs)
      if (this.fogAmbushRemaining > 0) this.fogAmbushRemaining--;
      // C782: Wind Gale + Snow Drift decrements
      if (this.windGaleRemaining > 0) this.windGaleRemaining--;
      if (this.snowDriftRemaining > 0) this.snowDriftRemaining--;
      // C789: Abyssal Convergence decrement + HP drain
      if (this.abyssalConvergenceRemaining > 0) {
        hero.hp -= Math.floor(hero.hpMax * ABYSSAL_CONVERGENCE_HP_DRAIN_RATE);
        if (hero.hp < 1) hero.hp = 1;
        this.abyssalConvergenceRemaining--;
      }
      // C791: Temporal Fissure decrement + payback at end
      if (this.temporalFissureRemaining > 0) {
        this.temporalFissureRemaining--;
        if (this.temporalFissureRemaining === 0 && this.temporalFissureStoredExp > 0) {
          hero.gainExp(Math.floor(this.temporalFissureStoredExp * TEMPORAL_FISSURE_PAYBACK_MUL));
          this.temporalFissureStoredExp = 0;
        }
      }
      // C797: Titan Arena duration
      if (this.titanArenaRemaining > 0) this.titanArenaRemaining--;
      // C803: Crimson Tithe duration + lifesteal
      if (this.crimsonTitheRemaining > 0) {
        this.crimsonTitheRemaining--;
      }
      // C800: Gold Crucible + Astral Paradox duration
      if (this.goldCrucibleRemaining > 0) {
        this.goldCrucibleRemaining--;
        if (this.goldCrucibleRemaining === 0) this.goldCrucibleAtkFlat = 0;
      }
      if (this.astralParadoxRemaining > 0) this.astralParadoxRemaining--;
      if (this.soulForgeRemaining > 0) this.soulForgeRemaining--;
      // Wave exhaustion
      const hadWaveExhaustion = this.waveExhaustionRemaining > 0;
      if (this.waveExhaustionRemaining > 0) this.waveExhaustionRemaining--;
      // Shield break burst (may have been set by shield sacrifice above)
      const hadShieldBreakBurst = this.shieldBreakBurstRemaining > 0;
      if (this.shieldBreakBurstRemaining > 0) this.shieldBreakBurstRemaining--;

      // Phase 2: Synergy detection (side effects on synergiesDiscovered)
      const lowHpFury = hero.hp <= hero.hpMax * LOW_HP_FURY_THRESHOLD;
      const bloodFurySynergyActive = hpBelowBloodPact && lowHpFury;
      if (bloodFurySynergyActive) this.synergiesDiscovered |= 1;
      const elderWisdomActive = this.heroAge >= ELDER_WISDOM_AGE && this.prestigeCount >= ELDER_WISDOM_PRESTIGE;
      if (elderWisdomActive) this.synergiesDiscovered |= 2;
      const desperateTradeActive = lowHpFury && hadShieldBreakBurst;
      if (desperateTradeActive) this.synergiesDiscovered |= 4;
      const antiSynergyActive = (this.fightsSinceVillage > FATIGUE_ONSET) && (this.accumulatorBonus > 0);
      if (antiSynergyActive) this.synergiesDiscovered |= 8;
      const goldenHourHighCombo = this.goldenHourRemaining > 0 && this.comboStreak >= 30;
      if (goldenHourHighCombo) this.synergiesDiscovered |= 16;
      const wealthSacrificeActive = hero.hp >= hero.hpMax && this.goldBurnCooldown <= 5;
      if (wealthSacrificeActive) this.synergiesDiscovered |= 32;

      // Phase 3: Build context + delegate to pure AtkMultiplierCalc
      const comboPrestigeFlat = this.comboStreak * this.prestigeCount * COMBO_PRESTIGE_ATK_FLAT;
      const waveChainAtk = Math.min(WAVE_CHAIN_CAP, this.consecutiveWaveClears) * WAVE_CHAIN_ATK_PER_WAVE;
      const combatMasteryVal = Math.min(COMBAT_MASTERY_CAP, Math.floor((this.totalWins + this.totalDeaths) / 100) * COMBAT_MASTERY_PER_100);
      const deathCountAtk = Math.min(DEATH_COUNT_ATK_CAP, Math.floor(this.totalDeaths / 10) * DEATH_COUNT_ATK_PER_10);
      const dangerComboAtk = (isDangerZone && this.comboStreak >= DANGER_COMBO_THRESHOLD) ? DANGER_COMBO_ATK_FLAT * Math.floor(this.comboStreak / DANGER_COMBO_THRESHOLD) : 0;
      const comboAtkMilestone = Math.floor(this.comboStreak / COMBO_ATK_MILESTONE2_INTERVAL) * COMBO_ATK_MILESTONE2_BONUS;

      const atkResult = computeAtkMultipliers({
        damping: this.opts.damping ?? 1.0,
        bossAtkMul: isBoss ? (this.opts.getBossIntroAtkMul?.() ?? 1.0) : 1.0,
        realmAtkMul: this.opts.getRealmForkAtkMul?.() ?? 1.0,
        battleMomentum: this.battleMomentum,
        shrineBuffActive: this.shrineBuffRemaining > 0,
        isRevengeFight: this.lastDeathEnemyId === landmarkId,
        killMilestones: this.killMilestones,
        hpRatio: hero.hp / hero.hpMax,
        fightsSinceVillage: this.fightsSinceVillage,
        shrineTithes: this.shrineTithes,
        hadShieldBreak,
        hadComboBreaker,
        prestigeCount: this.prestigeCount,
        achievementMilestones: this.achievementMilestones,
        totalDeaths: this.totalDeaths,
        darknessCursed: this.darknessCursed,
        heroLevel: hero.level,
        sacrificeFuryActive: this.sacrificeFuryRemaining > 0,
        heroGold: hero.gold,
        bossesKilled: this.bossesKilled,
        hpBelowAdrenaline: hero.hp < hero.hpMax * ADRENALINE_HP_THRESHOLD,
        hadVillageTraining,
        consecutiveDeaths: this.consecutiveDeaths,
        consecutiveCrits: this.consecutiveCrits,
        isDangerZone,
        comboStreak: this.comboStreak,
        dangerChainCount: this.dangerChainCount,
        hadBossFury,
        consecutiveBossKills: this.consecutiveBossKills,
        heroHp: hero.hp,
        heroHpMax: hero.hpMax,
        uniqueBossKills: this.uniqueBossKills,
        hadPrestigeSurge,
        hadVillageRestAtk,
        hadWaveMomentum,
        hadRevengeStreak,
        revengeStreakPower: this.revengeStreakPower,
        consecutiveWaveClears: this.consecutiveWaveClears,
        totalWins: this.totalWins,
        totalFights: this.totalWins + this.totalDeaths,
        hadEliteChainAtk,
        eliteCombo: this.eliteCombo,
        hadDeathAtkSurge,
        dangerFights: this.dangerFights,
        hadVillageAtkTraining,
        hadPrestigeEcho,
        prestigeEchoDecay,
        hadWaveExhaustion,
        isElite,
        hpBelowBloodPact,
        hpBelowAdrenalineRush: hero.hp < hero.hpMax * ADRENALINE_RUSH_HP_THRESHOLD,
        hadShieldSacrifice,
        hadShieldBreakBurst,
        dangerBetActive: this.dangerBetRemaining > 0,
        totalSacrifices: this.totalSacrifices,
        accumulatorBonus: this.accumulatorBonus,
        heroAge: this.heroAge,
        temporalPrestigeBonus: this.temporalPrestigeBonus,
        lowHpFury,
        kind,
        deathProximityCrit: this.deathProximityCrit,
        dangerStreak: this.dangerStreak,
        isPrestigeReady: hero.level >= this.getPrestigeThreshold(),
        activeSynergiesFromBloodFury: bloodFurySynergyActive,
        activeSynergiesFromElderWisdom: elderWisdomActive,
        activeSynergiesFromDesperateTrade: desperateTradeActive,
        antiSynergyActive,
        goldenHourHighCombo,
        wealthSacrificeActive,
        synergyPrestigeBonus: this.synergyPrestigeBonus,
        hasEmberCrown: this.hasRelic(0),
        emberCrownStacks: this.emberCrownStacks,
        hasScholarLens: this.hasRelic(5),
        cursedAltarAtkBuff: this.cursedAltarAtkBuff,
        eventMomentumAtkActive,
        inspirationActive,
        comboPrestigeFlat,
        comboMilestoneBonus: this.comboMilestoneBonus,
        combatMastery: combatMasteryVal,
        waveChainAtk,
        deathCountAtk,
        dangerComboAtk,
        comboAtkMilestone,
        goldCrucibleAtkFlat: this.goldCrucibleAtkFlat,
        heroAtk: this.stormNexusRemaining > 0 ? Math.floor(hero.atk * STORM_NEXUS_ATK_MUL) : hero.atk,
        weather,
        hasBloodPactRelic: this.hasRelic(4),
      });
      const { flatAtk, coreMuls, conditionMuls, goldMuls, combatMuls, progressMuls, chainMuls, tradeoffMuls, systemMuls } = atkResult;
      const atkInput = { flatAtk, coreMuls, conditionMuls, goldMuls, combatMuls, progressMuls, chainMuls, tradeoffMuls, systemMuls, atkCap: this.getAtkCap() };
      this.lastAtkBreakdownInput = atkInput;
      // C723: weatherSpeedMul (fog=0.90) reduces effective ATK (hero is slower)
      // C782: Snow Drift ATK penalty (hero ATK ×0.90)
      const snowDriftAtkMul = this.snowDriftRemaining > 0 ? SNOW_DRIFT_ATK_PENALTY : 1;
      const baseHeroAtk = Math.floor(computeHeroAtk(atkInput) * weatherSpeedMul * snowDriftAtkMul);
      // C122: critical hit — when combo streak >= 5, 20% chance per attack for x2 damage
      // C333: prestige combo bonus
      const effectiveCombo = this.comboStreak + this.prestigeCount * PRESTIGE_COMBO_ADD;
      const canCrit = effectiveCombo >= CRIT_STREAK_THRESHOLD;
      const hpBefore = hero.hp;
      // C212: arena enemy HP boost
      let eHp = this.arenaActive ? enemyHp * ARENA_ENEMY_HP_MUL : enemyHp;
      // C797: Titan Arena enemy HP boost
      if (this.titanArenaRemaining > 0) eHp = Math.floor(eHp * TITAN_ARENA_ENEMY_HP_MUL);
      let didCrit = false;
      let hitCount = 0;
      let rageTurn = 0;
      let luckyDodge = false;
      let totalDamageDealt = 0; // C174: track for lifesteal
      let goldHealUsed = false; // C195: once per fight
      let dodgeCount = 0; // C268: dodges this fight
      const MAX_COMBAT_TURNS = 500;
      while (eHp > 0 && !hero.staggered && hitCount < MAX_COMBAT_TURNS) {
        // C719: crit resolution via HeroTurnCalc pure function
        const deathProxCritActive = this.deathProximityCrit > 0;
        if (this.deathProximityCrit > 0) this.deathProximityCrit--;
        const turnResult = computeHeroTurn({
          baseHeroAtk,
          canCrit,
          critStreak: this.critStreak,
          critStreakGuaranteeThreshold: CRIT_STREAK_GUARANTEE_THRESHOLD,
          berserkerHpThreshold: BERSERKER_HP_THRESHOLD,
          heroHpRatio: hero.hp / hero.hpMax,
          berserkerCritBonus: BERSERKER_CRIT_BONUS,
          eliteFuryActive: this.eliteFuryRemaining > 0,
          eliteFuryCritBonus: ELITE_FURY_CRIT_BONUS,
          isBoss,
          bossCritBonus: BOSS_CRIT_BONUS,
          deathProxCritActive,
          baseCritChance: CRIT_CHANCE,
          weatherCritMul,
          critMasteryBonus: this.critMasteryBonus,
          rngChance: (rate: number) => this.rng.chance(rate),
          rngLuckyCrit: () => this.rng.chance(LUCKY_CRIT_CHANCE),
          luckyCritMul: LUCKY_CRIT_MUL,
          critDamageMul: CRIT_DAMAGE_MUL,
          prestigeCount: this.prestigeCount,
          prestigeCritDmgBonus: PRESTIGE_CRIT_DMG_BONUS,
          comboStreak: this.comboStreak,
          comboCritSynergyThreshold: COMBO_CRIT_SYNERGY_THRESHOLD,
          comboCritDmgBonus: COMBO_CRIT_DMG_BONUS,
          isDangerZone,
          dangerCritBonus: DANGER_CRIT_BONUS,
          critComboSynergyThreshold: CRIT_COMBO_SYNERGY_THRESHOLD,
          critComboSynergyBonus: CRIT_COMBO_SYNERGY_BONUS,
          desperateTradeActive,
          desperateTradeCritMul: DESPERATE_TRADE_CRIT_MUL,
        });
        const { isCrit, heroAtk } = turnResult;
        this.critStreak = turnResult.newCritStreak;
        if (isCrit) { this.critMasteryBonus = Math.min(CRIT_MASTERY_CAP, this.critMasteryBonus + CRIT_MASTERY_PER_CRIT); }
        // C395: crit heal scaling — crit heal grows with total crits
        const critHealScale = Math.min(CRIT_HEAL_SCALE_CAP, Math.floor(this.totalCrits / 100) * CRIT_HEAL_SCALE_PER_100);
        if (isCrit) { didCrit = true; this.totalCrits++; hero.heal(Math.max(1, Math.floor(hero.hpMax * (CRIT_HEAL_RATE + critHealScale) * (this.hasRelic(1) ? MISER_POUCH_HEAL_PENALTY : 1)))); this.critExpChain++; if (this.hasRelic(0)) this.emberCrownStacks++; }
        else { this.critExpChain = 0; }
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
          // C727: enemy turn ATK via pure EnemyTurnCalc module
          const { rageAtk } = computeEnemyTurnAtk({
            baseEnemyAtk: enemyAtk,
            isBoss,
            rageTurn,
            currentEnemyHp: eHp,
            maxEnemyHp: enemyHp,
          });
          // C137: mercy damage reduction after death streak
          // C171: dodge chance based on kill count
          // C723: rain weather boosts dodge chance
          const baseDodgeChance = Math.min(DODGE_CAP, Math.floor(this.killCount / 100) * DODGE_PER_100_KILLS);
          const windGaleDodge = this.windGaleRemaining > 0 ? WIND_GALE_DODGE_BONUS : 0; // C782
          const dodgeChance = Math.min(DODGE_CAP, (baseDodgeChance + windGaleDodge) * weatherDodgeMul);
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
          // C622: DR computation via pure DefenseCalc module
          const goldShieldWasActive = this.goldShieldRemaining > 0;
          const goldOverflowWasActive = this.goldOverflowShieldRemaining > 0;
          const bossShieldWasActive = this.bossShieldRemaining > 0;
          // Side effects: decrement shield counters after reading
          if (this.goldShieldRemaining > 0) this.goldShieldRemaining--;
          if (this.goldOverflowShieldRemaining > 0) this.goldOverflowShieldRemaining--;
          if (this.bossShieldRemaining > 0) this.bossShieldRemaining--;
          const totalDrMul = computeDamageReduction({
            mercyRemaining: this.mercyRemaining,
            shopShieldRemaining: this.shopShieldRemaining,
            armorRemaining: this.armorRemaining,
            villageRestRemaining: this.villageRestRemaining,
            goldShieldActive: goldShieldWasActive,
            comboStreak: this.comboStreak,
            goldOverflowShieldActive: goldOverflowWasActive,
            bossShieldActive: bossShieldWasActive,
            prestigeCount: this.prestigeCount,
            isDangerZone,
            heroGold: hero.gold,
            heroLevel: hero.level,
            cursedAltarAtkBuff: this.cursedAltarAtkBuff,
            isNight,
            colosseumActive: this.colosseumRemaining > 0,
            fogAmbushActive: this.fogAmbushRemaining > 0,
            windGaleActive: this.windGaleRemaining > 0,
            snowDriftActive: this.snowDriftRemaining > 0,
            abyssalConvergenceActive: this.abyssalConvergenceRemaining > 0,
            titanArenaActive: this.titanArenaRemaining > 0, astralParadoxActive: this.astralParadoxRemaining > 0, crimsonTitheActive: this.crimsonTitheRemaining > 0,
          });
          const incomingDmg = Math.max(1, Math.floor(rageAtk * totalDrMul));
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
          // C282: village shield — C623: absorbs 50% of first hit (was 100%)
          if (this.villageShieldActive) {
            this.villageShieldActive = false;
            hero.takeDamage(Math.max(1, Math.floor(incomingDmg * 0.5)));
          } else {
            hero.takeDamage(incomingDmg);
          }
          // C206: damage reflection
          eHp -= Math.max(1, Math.floor(incomingDmg * DAMAGE_REFLECT_RATE));
          // C594: extracted death prevention into method
          const { luckyDodge: ld } = this.applyDeathPrevention(hero, luckyDodge);
          luckyDodge = ld;
          // C195: gold sacrifice heal — auto-heal when low HP (once per fight)
          // C602: cost scales with level to prevent free healing at high levels
          const goldHealCost = Math.max(GOLD_HEAL_COST, hero.level * 5);
          if (!hero.staggered && hero.hp < hero.hpMax * GOLD_HEAL_HP_THRESHOLD && hero.gold >= goldHealCost && !goldHealUsed) {
            hero.gold -= goldHealCost;
            hero.heal(Math.floor(hero.hpMax * GOLD_HEAL_AMOUNT));
            goldHealUsed = true;
            // C248: sacrifice fury — gain ATK buff
            this.sacrificeFuryRemaining = SACRIFICE_FURY_DURATION;
          }
          // C515: death proximity — surviving at exactly 1 HP triggers guaranteed crit
          if (!hero.staggered && hero.hp === 1) {
            this.deathProximityCrit = DEATH_PROXIMITY_CRIT_DURATION;
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
        // C667: death penalty delegation to DeathPenaltyResolver
        const deathResult = resolveDeathPenalty({
          comboStreak: this.comboStreak,
          heroGold: hero.gold,
          heroHpMax: hero.hpMax,
          heroLevel: hero.level,
          heroExp: hero.exp,
          prestigeCount: this.prestigeCount,
          totalDeaths: this.totalDeaths,
          deathStreak: this.deathStreak,
          consecutiveDeaths: this.consecutiveDeaths,
          goldSaveRoll: this.rng.chance(GOLD_SAVE_CHANCE),
          revengeStreakPower: this.revengeStreakPower,
          deathGoldCompound: this.deathGoldCompound,
        });
        // Apply results
        this.comboStreak = deathResult.newComboStreak;
        hero.gold -= deathResult.goldLost;
        if (deathResult.goldSaved) events.push({ type: 'gold_saved' });
        hero.gold += deathResult.goldInsurance;
        hero.hpMax = deathResult.newHpMax;
        hero.gainExp(deathResult.expGained);
        this.deathAtkSurgeRemaining = deathResult.deathAtkSurgeDuration;
        this.revengeStreakPower = deathResult.newRevengeStreakPower;
        this.revengeStreakRemaining = deathResult.newRevengeStreakRemaining;
        this.deathGoldCompound = deathResult.newDeathGoldCompound;
        this.deathStreak = deathResult.newDeathStreak;
        this.totalDeaths = deathResult.newTotalDeaths;
        this.consecutiveDeaths = deathResult.newConsecutiveDeaths;
        if (deathResult.mercyActivated) {
          this.mercyRemaining = deathResult.mercyDuration;
          events.push({ type: 'mercy_activated', duration: deathResult.mercyDuration });
        }
        if (deathResult.darknessCursed) this.darknessCursed = true;
        this.revengeGoldRemaining = deathResult.revengeGoldFights;
        // Resets
        this.survivalStreak = 0;
        this.consecutiveWaveClears = 0;
        this.fightsSinceDeath = 0;
        this.fightsSinceLastDeath = 0;
        // C799: Temporal Fissure — death forfeits 70% of stored EXP (was 100% in C793)
        this.temporalFissureRemaining = 0;
        this.temporalFissureStoredExp = Math.floor(this.temporalFissureStoredExp * 0.30);
        // C797: Titan Arena lost on death
        this.titanArenaRemaining = 0;
        // C803: Crimson Tithe lost on death (combo reset as penalty)
        if (this.crimsonTitheRemaining > 0) this.comboStreak = 0;
        this.crimsonTitheRemaining = 0;
        // C800: Gold Crucible + Astral Paradox lost on death
        this.goldCrucibleRemaining = 0;
        this.goldCrucibleAtkFlat = 0;
        this.astralParadoxRemaining = 0;
        this.soulForgeRemaining = 0; // duration lost, but stacks are permanent
        // C793: Event Momentum buffs lost on death
        this.eventMomentumAtkRemaining = 0;
        this.eventMomentumDensityRemaining = 0;
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
          // C639: soft combo decay — halve instead of full reset
          this.comboStreak = Math.floor(this.comboStreak * 0.5);
        }
      } else {
        this.comboStreak++;
        // C608: removed C419/C472 combo shield regen (prestige shield = prestige-only)
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
      const baseExpGain = expGainForKill(isBoss ? BOSS_EXP_BASE : ENEMY_EXP_BASE, hero.level);

      // Side-effects that must occur before exp multiplier computation
      const areaVisitsBefore = this.areaVisits.get(landmarkId) ?? 0;
      this.areaVisits.set(landmarkId, areaVisitsBefore + 1);
      const hadLevelUpMomentum = this.levelUpMomentum;
      if (this.levelUpMomentum) this.levelUpMomentum = false;
      const hadComboBreakBonus = this.comboBreakBonus;
      if (this.comboBreakBonus) this.comboBreakBonus = false;
      this.fightChainCount++;
      if (isDangerZone) { this.dangerChainCount++; } else { this.dangerChainCount = 0; }
      if (isDangerZone && this.dangerChainCount >= DANGER_CHAIN_HEAL_THRESHOLD) {
        hero.heal(Math.max(1, Math.floor(hero.hpMax * DANGER_CHAIN_HEAL_RATE)));
      }
      if (isElite) this.totalEliteKills++;
      const hadEliteAfterVillage = this.eliteAfterVillage;
      if (isElite && this.eliteAfterVillage) this.eliteAfterVillage = false;
      if (hero.level >= this.getPrestigeThreshold()) {
        this.prestigeReadyBonus = Math.min(PRESTIGE_READY_BONUS_CAP, this.prestigeReadyBonus + PRESTIGE_READY_BONUS_PER_FIGHT);
      }
      const rushHourActive = this.fightsSincePrestige >= RUSH_HOUR_START && this.fightsSincePrestige < RUSH_HOUR_START + RUSH_HOUR_DURATION;

      // Compute exp multiplier via extracted pure function (C707: with breakdown for badge)
      const { multiplier: expMul, breakdown: expBreakdownResult } = computeExpMultiplierWithBreakdown({
        comboStreak: this.comboStreak,
        heroLevel: hero.level,
        isDangerZone,
        isElite,
        isBoss,
        isNight,
        isArena: this.arenaActive,
        weather,
        tookDamage,
        didCrit,
        hitCount,
        heroHp: hero.hp,
        heroHpMax: hero.hpMax,
        heroGold: hero.gold,
        heroStaggered: hero.staggered,
        firstBloodUsed: this.firstBloodUsed,
        survivalStreak: this.survivalStreak,
        waveRemaining: this.waveRemaining,
        areaVisits: areaVisitsBefore,
        dangerStreak: this.dangerStreak,
        totalDangerFights: this.totalDangerFights,
        dangerChainCount: this.dangerChainCount,
        dangerFights: this.dangerFights,
        levelUpMomentum: hadLevelUpMomentum,
        eliteBountyMilestones: this.eliteBountyMilestones,
        killsSinceLevelUp: this.killsSinceLevelUp,
        fightChainCount: this.fightChainCount,
        consecutiveOneHits: this.consecutiveOneHits,
        comboBreakBonus: hadComboBreakBonus,
        eliteCombo: this.eliteCombo,
        prestigeCount: this.prestigeCount,
        totalWins: this.totalWins,
        totalDeaths: this.totalDeaths,
        totalEliteKills: this.totalEliteKills,
        consecutiveWaveClears: this.consecutiveWaveClears,
        consecutiveCrits: this.consecutiveCrits,
        consecutiveBossKills: this.consecutiveBossKills,
        fightsSinceDeath: this.fightsSinceDeath,
        villageVisits: this.villageVisits,
        uniqueBossKills: this.uniqueBossKills,
        rageTurn,
        shrineBlessingRemaining: this.shrineBlessingRemaining,
        revengeGoldRemaining: this.revengeGoldRemaining,
        bossSlayerRemaining: this.bossSlayerRemaining,
        survivorGritActive: this.survivorGritActive,
        dangerCascadeRemaining: this.dangerCascadeRemaining,
        eliteAfterVillage: hadEliteAfterVillage,
        prestigeReadyBonus: this.prestigeReadyBonus,
        rushHourActive,
        heroAge: this.heroAge,
        elderWisdomActive,
        hasScholarLens: this.hasRelic(5),
        critExpChain: this.critExpChain,
        baseExpGain,
        colosseumActive: this.colosseumRemaining > 0,
        trialGroundsActive: this.trialGroundsRemaining > 0,
        fogAmbushActive: this.fogAmbushRemaining > 0,
        windGaleActive: this.windGaleRemaining > 0,
        snowDriftActive: this.snowDriftRemaining > 0,
        abyssalConvergenceActive: this.abyssalConvergenceRemaining > 0,
        titanArenaActive: this.titanArenaRemaining > 0, astralParadoxActive: this.astralParadoxRemaining > 0, crimsonTitheActive: this.crimsonTitheRemaining > 0,
        voidRiftTier: this.voidRiftRemaining > 0
          ? Math.ceil(Math.log2(Math.max(hero.level, 200) / 200) + 1)
          : 0,
      });
      this.lastExpBreakdown = expBreakdownResult;
      if (this.survivorGritActive) this.survivorGritActive = false;

      // C804: decline stack EXP bonus for event duration
      const dsm = this.declineStackExpDuration > 0 ? this.declineStackExpMul : 1;
      if (this.declineStackExpDuration > 0) this.declineStackExpDuration--;
      // C806: Soul Forge permanent EXP bonus
      const sfm = 1 + this.soulForgeStacks * SOUL_FORGE_EXP_PER_STACK;
      // C812: Wandering Mentor EXP bonus
      const mentorMul = mentorActive ? (1 + MENTOR_EXP_MUL) : 1;
      const expGainRaw = Math.floor(baseExpGain * expMul * dsm * sfm * mentorMul);
      // C627: EXP safety cap — reduced from level×2500 to level×500
      const expGain = Math.min(expGainRaw, hero.level * 500);
      // C711: drop chance via extracted pure function
      const eliteComboGuarantee = isElite && this.eliteCombo >= ELITE_COMBO_THRESHOLD;
      const dropResult = computeDropChance({
        isBoss,
        isElite,
        eliteCombo: this.eliteCombo,
        firstBloodUsed: this.firstBloodUsed,
        isOverkill,
        bossSlayerRemaining: this.bossSlayerRemaining,
        dropChanceBonus: this.opts.dropChanceBonus ?? 0,
        introDropBonus: isBoss ? (this.opts.getBossIntroDropBonus?.() ?? 0) : 0,
        dropStreak: this.dropStreak,
        heroLevel: hero.level,
      });
      const eliteLootUpgrade = isElite && ELITE_LOOT_UPGRADE;
      const dropId = this.rng.chance(dropResult.dropOdds) ? this.rollDrop(isBoss || dropResult.upgradePool || eliteLootUpgrade) : null;
      if (dropId) {
        this.dropStreak++;
        hero.addEquipment(dropId);
        if (dropResult.upgradePool) {
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
      // C791: Temporal Fissure — store portion of EXP for delayed payback
      let actualExp = finalExp;
      if (this.temporalFissureRemaining > 0) {
        const stored = Math.floor(finalExp * TEMPORAL_FISSURE_STORE_RATE);
        this.temporalFissureStoredExp += stored;
        actualExp = finalExp - stored;
      }
      const { leveled } = hero.gainExp(actualExp);
      // C513: combo gate — one-shot exp burst on first reaching combo 50
      if (this.comboStreak >= COMBO_GATE_THRESHOLD && !this.comboGateTriggered) {
        this.comboGateTriggered = true;
        hero.gainExp(COMBO_GATE_EXP_BURST * hero.level);
      }
      // C517: elite hunter streak tracking
      if (isElite) {
        this.consecutiveEliteKills2++;
      } else {
        this.consecutiveEliteKills2 = 0;
      }
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

      // C144→C680: gold earned from battle — delegated to GoldCalculator
      const arenaMul = this.arenaActive ? ARENA_REWARD_MUL : 1;
      const goldCtx: GoldRewardContext = {
        heroLevel: hero.level, heroGold: hero.gold, heroHp: hero.hp, heroHpMax: hero.hpMax,
        isBoss, isElite, isTreasureGoblin, isDangerZone, isOverkill, didCrit, tookDamage,
        comboStreak: this.comboStreak, battleMomentum: this.battleMomentum,
        consecutiveOneHits: this.consecutiveOneHits, totalCrits: this.totalCrits,
        fightsSinceSpend: this.fightsSinceSpend, killCount: this.killCount,
        caveVisits: this.caveVisits, bossesKilled: this.bossesKilled,
        dangerStreak: this.dangerStreak, dangerFights: this.dangerFights,
        waveRemaining: this.waveRemaining, consecutiveCrits: this.consecutiveCrits,
        fightChainCount: this.fightChainCount, prestigeCount: this.prestigeCount,
        revengeGoldRemaining: this.revengeGoldRemaining,
        villageBlessingRemaining: this.villageBlessingRemaining,
        eliteCombo: this.eliteCombo, uniqueBossKills: this.uniqueBossKills,
        consecutiveEliteKills2: this.consecutiveEliteKills2,
        overkillChain: this.overkillChain, consecutiveBossKills: this.consecutiveBossKills,
        deathGoldCompound: this.deathGoldCompound,
        consecutiveWaveClears: this.consecutiveWaveClears,
        totalEliteKills: this.totalEliteKills, totalWins: this.totalWins,
        goldenHourRemaining: this.goldenHourRemaining, rushHourActive,
        hasRelic1: this.hasRelic(1), arenaMul, rngDoubleGold: this.rng.chance(DOUBLE_GOLD_CHANCE),
      };
      const goldResult = computeGoldReward(goldCtx);
      // Apply side-effects: decrement cooldown counters read by GoldCalculator
      if (this.revengeGoldRemaining > 0) this.revengeGoldRemaining--;
      if (this.villageBlessingRemaining > 0) this.villageBlessingRemaining--;
      // Apply gold to hero
      let goldEarned = goldResult.goldEarned;
      // C773: Rain Sanctuary gold penalty
      if (this.rainSanctuaryRemaining > 0) goldEarned = Math.floor(goldEarned * RAIN_SANCTUARY_GOLD_MUL);
      // C785: Wind Gale gold penalty (trade-off for EXP+dodge)
      if (this.windGaleRemaining > 0) goldEarned = Math.floor(goldEarned * WIND_GALE_GOLD_PENALTY);
      // C795: Abyssal Convergence gold penalty (trade-off for high EXP)
      if (this.abyssalConvergenceRemaining > 0) goldEarned = Math.floor(goldEarned * ABYSSAL_CONVERGENCE_GOLD_MUL);
      hero.gold += goldEarned;
      hero.gold -= goldResult.greedPenalty;
      hero.gold -= goldResult.sacrificeGold;
      hero.gainExp(goldResult.sacrificeExp);
      hero.gold -= goldResult.comboTaxGold;
      hero.gainExp(goldResult.comboTaxExp);
      // C521: gold burn — sacrifice 25% gold for permanent ATK (with cooldown)
      if (this.goldBurnCooldown <= 0 && this.sacrificeAltarCooldown <= 0 && hero.gold > 200) {
        const burnAmount = Math.floor(hero.gold * GOLD_BURN_RATE * this.sacrificeDiminish);
        hero.gold -= burnAmount;
        this.goldBurnTotal += burnAmount;
        hero.atkBase += Math.max(1, Math.floor(burnAmount / 100) * GOLD_BURN_ATK_PER_100);
        hero.recomputeStats();
        this.goldBurnCooldown = GOLD_BURN_COOLDOWN;
        this.totalSacrifices++;
        this.sacrificeDiminish = Math.max(SACRIFICE_DIMINISH_CAP, this.sacrificeDiminish * SACRIFICE_DIMINISH_RATE);
      }
      if (this.goldBurnCooldown > 0) this.goldBurnCooldown--;
      // C523: combo reset trade — when combo ≥ 30, reset for gold burst
      if (this.comboStreak >= 30 && this.sacrificeAltarCooldown <= 0 && this.rng.chance(0.1)) {
        const comboGold = this.comboStreak * COMBO_RESET_GOLD_PER_COMBO * hero.level;
        hero.gold += Math.floor(comboGold * this.sacrificeDiminish);
        this.comboStreak = 0;
        this.totalSacrifices++;
        this.sacrificeDiminish = Math.max(SACRIFICE_DIMINISH_CAP, this.sacrificeDiminish * SACRIFICE_DIMINISH_RATE);
        this.sacrificeAltarCooldown = SACRIFICE_ALTAR_COOLDOWN;
      }
      // C524: exp offering — sacrifice exp near prestige for boss boost
      if (hero.level >= this.getPrestigeThreshold() - 20 && !this.expOfferingActive && hero.exp > 0) {
        hero.exp = Math.floor(hero.exp * (1 - EXP_OFFERING_RATE));
        this.expOfferingActive = true;
        this.totalSacrifices++;
      }
      // C526: danger bet — in danger zone, increase danger for locked multiplier
      if (isDangerZone && this.dangerBetRemaining <= 0 && this.dangerStreak >= 5 && this.rng.chance(0.15)) {
        this.dangerStreak += DANGER_BET_INCREASE;
        this.dangerBetRemaining = DANGER_BET_DURATION;
      }
      if (this.dangerBetRemaining > 0) this.dangerBetRemaining--;
      // C527: health tax — permanent HP reduction for passive gold (one-time)
      if (!this.healthTaxApplied && hero.level >= 50 && this.totalWins >= 100) {
        hero.hpBase = Math.floor(hero.hpBase * (1 - HEALTH_TAX_HP_COST));
        hero.recomputeStats();
        this.healthTaxApplied = true;
        this.totalSacrifices++;
      }
      // C527: health tax passive gold per fight
      if (this.healthTaxApplied) {
        hero.gold += HEALTH_TAX_GOLD_PER_FIGHT;
      }
      // C528: sacrifice altar cooldown tick
      if (this.sacrificeAltarCooldown > 0) this.sacrificeAltarCooldown--;
      if (this.levelSacrificeCooldown > 0) this.levelSacrificeCooldown--;
      // C531: momentum decay — momentum decays when fatigued (over 100 fights without village)
      if (this.battleMomentum > 0 && this.fightsSinceVillage > FATIGUE_ONSET) {
        this.battleMomentum = Math.max(0, this.battleMomentum - 1);
      }
      // C532: golden hour — trigger/decrement
      this.fightsSincePrestige++;
      if (this.fightsSincePrestige % GOLDEN_HOUR_INTERVAL === 0) {
        // C556: Hourglass relic doubles temporal durations (C733: via resolver)
        this.goldenHourRemaining = GOLDEN_HOUR_DURATION * this.relicResolver.hourglassDurationMul();
      }
      if (this.goldenHourRemaining > 0) this.goldenHourRemaining--;
      // C533: fatigue counter
      this.fightsSinceVillage++;
      // C534: accumulator — build from clean fights (no damage)
      if (!tookDamage) {
        this.accumulatorBonus = Math.min(ACCUMULATOR_CAP, this.accumulatorBonus + ACCUMULATOR_PER_CLEAN);
      } else {
        this.accumulatorBonus = 0; // reset on taking damage
      }
      // C535: seasonal cycle (affects which stat gets bonus — implemented via season index)
      const season = Math.floor(this.fightsSincePrestige / SEASON_LENGTH) % 4;
      if (season === 0) hero.gold += hero.level * 2; // spring: gold
      else if (season === 1) hero.gainExp(hero.level * 3); // summer: exp
      // autumn (2) and winter (3): ATK/defense handled by multipliers above
      // C537: aging — increment age
      if (this.totalWins > 0 && this.totalWins % AGING_INTERVAL === 0 && this.heroAge < AGING_CAP) {
        this.heroAge++;
      }
      // C538: rejuvenation — reset age at max
      if (this.heroAge >= REJUVENATION_AGE) {
        this.heroAge = 0;
        hero.gainExp(REJUVENATION_EXP_BURST * hero.level);
      }
      // C539: time lock vault — deposit and mature
      if (this.timeLockTimer > 0) {
        this.timeLockTimer--;
        if (this.timeLockTimer <= 0) {
          hero.gold += Math.floor(this.timeLockGold * (1 + TIME_LOCK_GROWTH));
          this.timeLockGold = 0;
        }
      } else if (hero.gold > 500 && this.rng.chance(0.05)) {
        const deposit = Math.floor(hero.gold * TIME_LOCK_DEPOSIT_RATE);
        hero.gold -= deposit;
        this.timeLockGold = deposit;
        this.timeLockTimer = TIME_LOCK_DURATION;
      }
      // C426: combo gold milestone — every 15 combo grants flat gold
      if (this.comboStreak > 0 && this.comboStreak % COMBO_GOLD_MILESTONE_INTERVAL === 0) {
        hero.gold += COMBO_GOLD_MILESTONE_AMOUNT * hero.level;
      }
      // C493: combo gold milestone 2 — every 25 combo grants gold burst
      if (this.comboStreak > 0 && this.comboStreak % COMBO_GOLD_MILESTONE2_INTERVAL === 0) {
        hero.gold += COMBO_GOLD_MILESTONE2_BONUS * hero.level;
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
      // C447: danger shield — C608: removed prestige shield recharge from danger survival
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
        // C509: boss enrage trade — chance of enraged boss giving 3x vault
        const bossEnrageMul2 = this.rng.chance(BOSS_ENRAGE_CHANCE) ? BOSS_ENRAGE_REWARD_MUL : 1;
        // C524: exp offering — if active, boss rewards ×3
        const expOfferingMul = this.expOfferingActive ? EXP_OFFERING_BOSS_MUL : 1;
        if (this.expOfferingActive) this.expOfferingActive = false;
        const vaultGold = Math.floor(hero.level * BOSS_VAULT_GOLD_PER_LEVEL * streakMul * bossOverkillMul * bossLootMul * bossVaultPrestigeMul * bossVaultPrestigeScale * bossVaultCompound * bossEnrageMul2 * expOfferingMul);
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
        // C474: boss gold fury — boss kills give gold proportional to ATK
        hero.gold += Math.floor(hero.atk * BOSS_GOLD_FURY_RATE);
        // C494: boss shield — boss kills grant temporary shield
        this.bossShieldRemaining = BOSS_SHIELD_GRANT_DURATION;
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
      // C710: post-combat healing via extracted pure function
      const healResult = computePostCombatHeal({
        totalWins: this.totalWins,
        totalDamageDealt,
        villageVisits: this.villageVisits,
        survivalStreak: this.survivalStreak,
        isOverkill,
        prestigeCount: this.prestigeCount,
        heroHpMax: hero.hpMax,
      });
      this.lastHealResult = healResult;
      hero.heal(healResult.regenHeal);
      hero.heal(healResult.lifestealHeal);
      if (healResult.overkillHeal > 0) hero.heal(healResult.overkillHeal);
      if (healResult.survivalHeal > 0) hero.heal(healResult.survivalHeal);
      // C803: Crimson Tithe lifesteal
      if (this.crimsonTitheRemaining > 0) {
        const titheHeal = Math.floor(totalDamageDealt * CRIMSON_TITHE_LIFESTEAL);
        if (titheHeal > 0) hero.heal(titheHeal);
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
      // C551-C552: Relic drop — chance after elite/boss kills (C733: via resolver)
      if (this.relicResolver.count < 3) {
        const relicChance = isElite ? RELIC_DROP_CHANCE_ELITE : (isBoss ? RELIC_DROP_CHANCE_BOSS : 0);
        if (relicChance > 0 && this.rng.chance(relicChance)) {
          const available = [0, 1, 2, 3, 4, 5].filter(id => !this.relicResolver.hasRelic(id));
          if (available.length > 0) {
            const newRelic = available[this.rng.int(available.length)];
            this.relicResolver.dropRelic(newRelic);
          }
        }
      }
      // C557: Relic upgrade — duplicate drops upgrade existing relic (C733: via resolver)
      if (this.relicResolver.count >= 3 && isElite && this.rng.chance(RELIC_UPGRADE_CHANCE)) {
        const upgradeIdx = this.rng.int(this.relicResolver.count);
        this.relicResolver.upgradeRelic(upgradeIdx);
      }
      // C628: extracted post-combat event encounters
      this.resolvePostCombatEvents(hero, events, isElite, isBoss);
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
         // C510: wave exhaustion — completing wave gives gold but temp ATK penalty
         this.waveExhaustionRemaining = WAVE_EXHAUSTION_DURATION;
         hero.gold += Math.floor(hero.gold * WAVE_EXHAUSTION_GOLD_BONUS);
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
        const comboBonus = 1 + (this.comboStreak - COMBO_STREAK_THRESHOLD + 1) * COMBO_STREAK_EXP_BONUS;
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
        // C461: prestige shield recharge — prestige fully recharges shields (already done above)
        // C392: prestige danger immunity
        this.prestigeDangerImmune = PRESTIGE_DANGER_IMMUNE_FIGHTS;
        hero.level = 1;
        hero.exp = 0;
        hero.recomputeStats();
        // C298: prestige full heal
        if (PRESTIGE_FULL_HEAL) { hero.hp = hero.hpMax; }
        // C476: prestige exp burst — prestige gives flat exp burst
        hero.gainExp(this.prestigeCount * PRESTIGE_EXP_BURST_PER_PRESTIGE);
        // C508: prestige echo — activate decaying bonus
        this.prestigeEchoRemaining = PRESTIGE_ECHO_DURATION;
        // C540: temporal prestige — speed of prestige affects next run bonus
        if (this.fightsSincePrestige <= TEMPORAL_PRESTIGE_FAST_THRESHOLD) {
          this.temporalPrestigeBonus = TEMPORAL_PRESTIGE_FAST_BONUS;
        } else {
          this.temporalPrestigeBonus = TEMPORAL_PRESTIGE_SLOW_BONUS;
        }
        this.fightsSincePrestige = 0;
        // C519: reset prestige ready bonus
        this.prestigeReadyBonus = 0;
        // C549: synergy prestige — discovered synergies → permanent bonus
        const discoveredCount = this.countBits(this.synergiesDiscovered);
        this.synergyPrestigeBonus = Math.min(SYNERGY_PRESTIGE_CAP, discoveredCount * SYNERGY_PRESTIGE_RATE);
        // C560: relic prestige — imprint best relic (weakened version persists after reset)
        if (this.relics.length > 0) {
          let bestIdx = 0;
          for (let i = 1; i < this.relics.length; i++) {
            if ((this.relicLevels[i] || 1) > (this.relicLevels[bestIdx] || 1)) bestIdx = i;
          }
          this.imprintedRelic = this.relics[bestIdx];
          this.imprintedRelicLevel = this.relicLevels[bestIdx] || 1;
          this.relics = [];
          this.relicLevels = [];
          this.emberCrownStacks = 0;
          this.phoenixFeatherUsed = false;
        }
        events.push({ type: 'prestige', count: this.prestigeCount });
      }
    } else {
      this.resolveNonCombat(hero, kind, landmarkId, events);
    }
    return events;
  }

  // C619: extracted non-combat encounter resolution
  private resolveNonCombat(hero: HeroEntity, kind: LandmarkKind, landmarkId: string, events: OverworldEvent[]): void {
    if (kind === 'village') {
      this.resolveVillage(hero, events);
    } else if (kind === 'shrine') {
      this.resolveShrine(hero, landmarkId, events);
    } else if (kind === 'cave') {
      this.resolveCave(hero, events);
    } else if (kind === 'ruin') {
      const moral = hero.personality.get('moral');
      if (moral < 0) {
        hero.personality.adjust('moral', -2);
        events.push({ type: 'moral_choice', choice: 'rob_with_bandits', dim: 'moral', delta: -2, nameKR: '강도단에 합류하여 약자를 약탈했다' });
      } else {
        hero.personality.adjust('moral', 2);
        events.push({ type: 'moral_choice', choice: 'resist_bandits', dim: 'moral', delta: 2, nameKR: '강도단에 맞서 약자를 지켰다' });
      }
    } else if (kind === 'sightseeing') {
      const lmType = LANDMARK_TYPES.find(t => landmarkId.startsWith(t.id));
      events.push({
        type: 'sightseeing_arrived',
        landmarkId,
        landmarkNameKR: lmType?.nameKR ?? '절경',
      });
    } else {
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
  }

  private resolveVillage(hero: HeroEntity, events: OverworldEvent[]): void {
    const ctx = {
      prestigeCount: this.prestigeCount,
      villageVisits: this.villageVisits,
      dangerStreak: this.dangerStreak,
      bankGold: this.bankGold,
      fightsSinceLastDeath: this.fightsSinceLastDeath,
      investFightsRemaining: this.investFightsRemaining,
      goldInvested: this.goldInvested,
      totalWins: this.totalWins,
      totalDeaths: this.totalDeaths,
    };
    const resolver = new VillageResolver();
    const result = resolver.resolve(hero, events, ctx);
    // Apply state mutations
    this.battleMomentum = result.battleMomentum;
    this.fightsSinceVillage = result.fightsSinceVillage;
    this.villageRestRemaining = result.villageRestRemaining;
    this.deathInsuranceUsed = result.deathInsuranceUsed;
    this.villageShieldActive = result.villageShieldActive;
    this.villageTrainingRemaining = result.villageTrainingRemaining;
    this.villageBlessingRemaining = result.villageBlessingRemaining;
    this.fightsSinceSpend = result.fightsSinceSpend;
    this.fightChainCount = result.fightChainCount;
    this.shopShieldRemaining = result.shopShieldRemaining;
    this.armorRemaining = result.armorRemaining;
    this.goldShieldRemaining = result.goldShieldRemaining;
    this.investFightsRemaining = result.investFightsRemaining;
    this.goldInvested = result.goldInvested;
    this.villageVisits = result.villageVisits;
    this.forgeDiscount = result.forgeDiscount;
    this.villageRestAtkRemaining = result.villageRestAtkRemaining;
    this.villageAtkTrainingRemaining = result.villageAtkTrainingRemaining;
    this.dangerFights = Math.max(0, this.dangerFights - 5);
    this.eliteAfterVillage = result.eliteAfterVillage;
    this.bankGold = result.bankGold;
    this.arenaActive = result.arenaActive || this.arenaActive;
    if (result.waveMomentumBonus > 0) this.waveMomentumRemaining += result.waveMomentumBonus;
  }

  private resolveShrine(hero: HeroEntity, landmarkId: string, events: OverworldEvent[]): void {
    this.getLandmarkResolver().resolveShrine(hero, landmarkId, events);
  }

  private resolveCave(hero: HeroEntity, events: OverworldEvent[]): void {
    this.caveVisits++;
    this.getLandmarkResolver().resolveCave(hero, events);
  }

  // C628/C675: post-combat events delegated to PostCombatEventResolver
  private resolvePostCombatEvents(hero: HeroEntity, events: OverworldEvent[], isElite: boolean, isBoss: boolean): void {
    const ctx: PostCombatContext = {
      totalFights: this.totalFights,
      comboStreak: this.comboStreak,
      heroHp: hero.hp,
      heroHpMax: hero.hpMax,
      heroGold: hero.gold,
      heroAtk: hero.atk,
      heroLevel: hero.level,
      isElite,
      isBoss,
      cursedAltarRemaining: this.cursedAltarRemaining,
      cursedAltarAtkBuff: this.cursedAltarAtkBuff,
      fairyBlessingRemaining: this.fairyBlessingRemaining,
      relics: this.relics,
      relicLevels: this.relicLevels,
      fightsSinceVillage: this.fightsSinceVillage,
      eventChainCount: this.eventChainCount,
      eventMomentumDensityActive: this.eventMomentumDensityRemaining > 0,
      consecutiveEliteKills2: this.consecutiveEliteKills2,
      goldenHourRemaining: this.goldenHourRemaining,
      fightsSinceEvent: this.fightsSinceEvent,
      strategyRestShrine: getStrategyEnabled('restShrine'),
      strategyGambler: getStrategyEnabled('gambler'),
      strategyBlacksmith: getStrategyEnabled('blacksmith'),
      strategyCursedAltar: getStrategyEnabled('cursedAltar'),
      currentWeather: this.weatherSub.getCurrent(),
      rngChance: (rate: number) => this.rng.chance(rate),
      rngInt: (n: number) => this.rng.int(n),
      hasPendingShrineChoice: () => this.choiceEngine.hasPendingShrineChoice(),
    };

    const r = resolvePostCombatEvent(ctx);

    // Apply state mutations
    this.cursedAltarRemaining = r.newCursedAltarRemaining;
    this.cursedAltarAtkBuff = r.newCursedAltarAtkBuff;
    this.fairyBlessingRemaining = r.newFairyBlessingRemaining;
    this.eventChainCount = r.newEventChainCount;
    // C793: Event Momentum tiers
    if (r.eventMomentumTier === 2) {
      this.eventMomentumAtkRemaining = EVENT_MOMENTUM_TIER2_DURATION;
    } else if (r.eventMomentumTier === 3) {
      this.eventMomentumAtkRemaining = EVENT_MOMENTUM_TIER2_DURATION; // also gives ATK buff
      this.eventMomentumDensityRemaining = EVENT_MOMENTUM_TIER3_DURATION;
    }
    this.fightsSinceVillage = r.newFightsSinceVillage;
    this.relics = r.newRelics;
    this.relicLevels = r.newRelicLevels;
    // C745: wire Echo event → prestige echo duration
    if (r.newPrestigeEchoRemaining > 0) this.prestigeEchoRemaining = r.newPrestigeEchoRemaining;
    // C749: wire Inspiration event → ATK buff duration
    if (r.newInspirationRemaining > 0) this.inspirationRemaining = r.newInspirationRemaining;
    // C812: wire Mentor event → EXP buff duration
    if (r.newMentorRemaining > 0) this.mentorRemaining = r.newMentorRemaining;
    // C810: Data-driven event trigger dispatch
    dispatchPendingTriggers(r, (id) => this.eventOrch.trigger(id));
    // C804: DeclineStack force — if 4+ declines, guarantee rare event trigger
    if (!r.eventType && shouldForceRareEvent(this.declineStack)) {
      const lateEvents: EventId[] = ['titan_arena', 'crimson_tithe', 'gold_crucible', 'astral_paradox', 'soul_forge'];
      const forced = lateEvents[this.rng.int(lateEvents.length)];
      this.eventOrch.trigger(forced);
      this.fightsSinceEvent = 0;
    }
    if (r.comboReset) this.comboStreak = 0;
    // C714: pity timer — reset on event, increment otherwise
    if (r.eventType) {
      this.fightsSinceEvent = 0;
    } else {
      this.fightsSinceEvent++;
    }

    // Apply hero deltas
    if (r.heroHpDelta !== 0) hero.hp = Math.max(1, hero.hp + r.heroHpDelta);
    if (r.heroGoldDelta !== 0) hero.gold = Math.max(0, hero.gold + r.heroGoldDelta);
    if (r.heroAtkDelta !== 0) hero.atk += r.heroAtkDelta;
    if (r.heroExpDelta !== 0) hero.gainExp(r.heroExpDelta);

    // Shrine special handling
    if (r.shrinePending) {
      this.choiceEngine.setPendingShrineChoice();
    } else if (r.eventType === 'event_treasure_shrine') {
      const choice = this.choiceEngine.resolveShrineChoice();
      const shrineGold = Math.max(SHRINE_GOLD_BURST, hero.level * 50);
      const shrineExp = Math.max(SHRINE_EXP_BURST, hero.level * 30);
      if (choice === ShrineChoice.GOLD) hero.gold += shrineGold;
      else if (choice === ShrineChoice.EXP) hero.gainExp(shrineExp);
      else hero.heal(Math.floor(hero.hpMax * SHRINE_HEAL_AMOUNT));
      events.push({ type: 'event_treasure_shrine', choice });
      if (r.eventChainReward) events.push({ type: 'event_chain_reward' });
      return;
    }

    // Merchant pending → trigger + auto-resolve + apply effects
    if (r.merchantPending) {
      this.choiceEngine.triggerMerchant();
      const choice = this.choiceEngine.resolveMerchantChoice();
      const fx = resolveEventEffects('merchant', choice, this.makeEffectCtx(hero));
      hero.gold = Math.max(0, hero.gold + fx.goldDelta);
      this.relics = fx.newRelics;
      this.relicLevels = fx.newRelicLevels;
      if (fx.eventSubType) events.push({ type: fx.eventSubType });
    }

    // Gambler pending → trigger + auto-resolve + apply effects
    if (r.gamblerPending) {
      this.choiceEngine.triggerGambler();
      // C723: AI conditionally bets high when gold surplus is large
      const aiChoice = chooseGamblerBet(hero.gold, GOLD_FORGE_THRESHOLD);
      if (aiChoice === 'BET_HIGH') {
        this.choiceEngine.setGamblerChoice(GamblerChoice.BET_HIGH);
      }
      const choice = this.choiceEngine.resolveGamblerChoice();
      const fx = resolveEventEffects('gambler', choice, this.makeEffectCtx(hero));
      hero.gold = Math.max(0, hero.gold + fx.goldDelta);
      if (fx.eventSubType) events.push({ type: fx.eventSubType });
    }

    // Altar pending → trigger + auto-resolve + apply effects
    if (r.altarPending) {
      this.choiceEngine.triggerAltar();
      const choice = this.choiceEngine.resolveAltarChoice();
      const fx = resolveEventEffects('altar', choice, this.makeEffectCtx(hero));
      hero.hp = Math.max(1, hero.hp + fx.hpDelta);
      if (fx.cursedAltarActivated) {
        this.cursedAltarAtkBuff = true;
        this.cursedAltarRemaining = CURSED_ALTAR_DURATION;
      }
      if (fx.eventSubType) events.push({ type: fx.eventSubType });
    }

    if (r.eventType && !r.merchantPending && !r.gamblerPending && !r.altarPending) {
      events.push({ type: r.eventType });
    }
    if (r.eventChainReward) events.push({ type: 'event_chain_reward' });
  }

  private rollDrop(isBoss: boolean): string {
    const pool = isBoss ? BOSS_DROPS : ENEMY_DROPS;
    return pool[this.rng.int(pool.length)].id;
  }

  // C813: Shared context builder for resolveEventEffects calls
  private makeEffectCtx(hero: HeroEntity) {
    return {
      heroGold: hero.gold, heroHp: hero.hp, heroHpMax: hero.hpMax,
      heroAtk: hero.atk, heroLevel: hero.level,
      relics: this.relics, relicLevels: this.relicLevels,
      rngChance: (rate: number) => this.rng.chance(rate),
      rngInt: (n: number) => this.rng.int(n),
    };
  }
}
