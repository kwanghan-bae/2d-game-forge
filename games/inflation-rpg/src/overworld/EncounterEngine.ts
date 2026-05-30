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
import { DANGER_ZONE_RATE,DANGER_ZONE_STAT_MUL,DANGER_ZONE_EXP_MUL,COMBO_STREAK_THRESHOLD,COMBO_STREAK_EXP_BONUS,MILESTONE_LEVELS,CRIT_STREAK_THRESHOLD,CRIT_CHANCE,CRIT_DAMAGE_MUL,OVERKILL_DROP_BONUS,CLOSE_CALL_THRESHOLD,CLOSE_CALL_HEAL,MOMENTUM_ATK_BONUS,MOMENTUM_CAP,DROP_STREAK_THRESHOLD,BOSS_RAGE_ATK_PER_TURN,ELITE_SPAWN_RATE,ELITE_HP_MUL,ELITE_EXP_MUL,VILLAGE_REST_HP_THRESHOLD,VILLAGE_REST_HP_BOOST,SHRINE_MEDITATION_ATK_BUFF,SHRINE_MEDITATION_BUFF_DURATION,DEATH_STREAK_THRESHOLD,MERCY_DAMAGE_REDUCTION,MERCY_DURATION,EXP_DIMINISH_THRESHOLD,EXP_DIMINISH_FACTOR,FIRST_BLOOD_EXP_MUL,FIRST_BLOOD_DROP_GUARANTEE,REVENGE_ATK_BONUS,SURVIVAL_STREAK_THRESHOLD,SURVIVAL_STREAK_EXP_BONUS,LUCKY_DODGE_CHANCE,GOLD_PER_KILL_BASE,GOLD_BOSS_MUL,GOLD_ELITE_MUL,WAVE_INTERVAL,WAVE_SIZE,WAVE_BONUS_EXP_MUL,WAVE_BONUS_GOLD_MUL,GOLD_DEATH_PENALTY,KILL_MILESTONE_INTERVAL,KILL_MILESTONE_ATK_BONUS,GOLD_MOMENTUM_THRESHOLD,GOLD_MOMENTUM_BONUS,AREA_FAMILIARITY_EXP_BONUS,AREA_FAMILIARITY_CAP,TREASURE_GOBLIN_RATE,TREASURE_GOBLIN_GOLD_MUL,TREASURE_GOBLIN_HP_MUL,TREASURE_GOBLIN_FLEE_RATE,COMBO_GOLD_THRESHOLD,COMBO_GOLD_BONUS_PER,VILLAGE_SHOP_COST,VILLAGE_SHOP_SHIELD_MUL,VILLAGE_SHOP_SHIELD_DURATION,OVERKILL_GOLD_BONUS,WIN_HP_REGEN_RATE,BOSS_VAULT_GOLD_PER_LEVEL,NEAR_DEATH_HP_THRESHOLD,NEAR_DEATH_ATK_MUL,GOLD_SAVE_CHANCE,COMBO_EXP_THRESHOLD,COMBO_EXP_BONUS_PER,CRIT_GOLD_BONUS,DANGER_ZONE_GOLD_MUL,GOLD_LEVEL_POWER,BOSS_ENRAGE_HP_THRESHOLD,BOSS_ENRAGE_ATK_MUL,EXP_OVERFLOW_GOLD_RATIO,CLOSE_CALL_HP_THRESHOLD,CLOSE_CALL_EXP_BONUS,VILLAGE_GOLD_INTEREST_RATE,WAVE_MULTI_KILL_ATK_BONUS,GREED_MODE_GOLD_THRESHOLD,GREED_MODE_EXP_PENALTY,GREED_MODE_GOLD_BONUS,DODGE_PER_100_KILLS,DODGE_CAP,BOSS_STREAK_MULTIPLIER,EXHAUSTION_THRESHOLD,EXHAUSTION_ATK_PENALTY,LIFESTEAL_RATE,SHRINE_TITHE_RATE,SHRINE_TITHE_ATK_BONUS,LUCKY_TREASURE_CHANCE,LUCKY_TREASURE_MIN,LUCKY_TREASURE_MAX,DANGER_STREAK_EXP_STEP,DANGER_STREAK_EXP_CAP,SHIELD_BREAK_ATK_MUL,GOLD_MAGNET_COMBO_THRESHOLD,GOLD_MAGNET_GOBLIN_MUL,DEATH_HP_DECAY_RATE,VILLAGE_HEAL_BASE,VILLAGE_HEAL_PER_VISIT,VILLAGE_HEAL_CAP,OVERKILL_STREAK_THRESHOLD,OVERKILL_INVINCIBILITY_FIGHTS,LEVEL_UP_EXP_BONUS,ELITE_BOUNTY_INTERVAL,ELITE_BOUNTY_EXP_BONUS,BOSS_OVERKILL_VAULT_MUL,CAVE_TREASURE_CHANCE,CAVE_TREASURE_MIN,CAVE_TREASURE_MAX,REVENGE_GOLD_FIGHTS,REVENGE_GOLD_BONUS,SHRINE_MASTERY_THRESHOLD,SHRINE_MASTERY_MEDITATION_CHANCE,GOLD_ARMOR_THRESHOLD,GOLD_ARMOR_REDUCTION,BOSS_RAGE_RESET_ON_CRIT,GOLD_TAX_LEVEL_THRESHOLD,GOLD_TAX_RATE,DOUBLE_HIT_KILL_THRESHOLD,DOUBLE_HIT_CHANCE,GOLD_HEAL_HP_THRESHOLD,GOLD_HEAL_COST,GOLD_HEAL_AMOUNT,EXP_DECAY_LEVEL_START,EXP_DECAY_PER_LEVEL,EXP_DECAY_CAP,SURVIVOR_THRESHOLD,SURVIVOR_HP_BONUS,COMBO_BREAKER_ATK_BONUS,BOSS_STREAK_STAT_SCALE,PRESTIGE_LEVEL_REQUIREMENT,PRESTIGE_STAT_BONUS,PRESTIGE_LEVEL_INCREMENT,TREASURE_HUNTER_CAVE_INTERVAL,TREASURE_HUNTER_GOLD_BONUS,EXP_SHIELD_PRESERVE,ELITE_COMBO_THRESHOLD,ELITE_COMBO_DROP_GUARANTEE,REGEN_SCALE_PER_50_KILLS,REGEN_SCALE_CAP,GOLD_STREAK_THRESHOLD,GOLD_STREAK_BONUS,DEATH_ATK_BONUS,DEATH_ATK_CAP,NIGHT_CYCLE_INTERVAL,NIGHT_DURATION,NIGHT_EXP_MUL,NIGHT_ENEMY_DMG_MUL,LUCKY_FIND_CHANCE,EXP_CHAIN_KILLS_THRESHOLD,EXP_CHAIN_BONUS,BERSERKER_HP_THRESHOLD,BERSERKER_ATK_BONUS,BERSERKER_CRIT_BONUS,GOLD_INTEREST_PRESTIGE_BONUS,DANGER_MAGNET_THRESHOLD,DANGER_MAGNET_SPAWN_BONUS,QUICK_KILL_MAX_HITS,QUICK_KILL_EXP_BONUS,BOUNTY_KILL_INTERVAL,BOUNTY_GOLD_REWARD,BOSS_ENRAGE_TIMER_TURN,BOSS_ENRAGE_TIMER_MUL,COMBO_GOLD_MUL_THRESHOLD,COMBO_GOLD_MUL_BONUS,BANK_DEPOSIT_RATE,FIRST_HIT_DAMAGE_MUL,LEVEL_UP_HEAL_RATE,CRIT_GOLD_SCALE_PER_100,CRIT_GOLD_SCALE_CAP,OVERKILL_HEAL_RATE,EXP_OVERFLOW_BONUS,DARKNESS_CURSE_DEATHS,DARKNESS_CURSE_ATK_PENALTY,BOSS_LOOT_GOLD_MUL,BOSS_LOOT_INTERVAL,TIME_PRESSURE_PER_100,TIME_PRESSURE_CAP,COMPANION_UNLOCK_WINS,COMPANION_EXP_BONUS,ARMOR_BUY_COST,ARMOR_REDUCTION,ARMOR_DURATION,SPEC_ATK_BONUS,COMBO_MILESTONE_INTERVAL,COMBO_MILESTONE_GOLD_BONUS,ELEMENTAL_LEVEL_MOD,ELEMENTAL_DMG_BONUS,SURVIVAL_HEAL_THRESHOLD,SURVIVAL_HEAL_RATE,SACRIFICE_FURY_ATK_BONUS,SACRIFICE_FURY_DURATION,WAVE_PRESTIGE_EXP_BONUS,FULL_HP_GOLD_BONUS,BOSS_SLAYER_EXP_BONUS,BOSS_SLAYER_DURATION,CHAIN_LIGHTNING_COMBO,CHAIN_LIGHTNING_DMG_RATE,PRESTIGE_GOLD_BONUS_PER_LEVEL,LUCKY_CRIT_CHANCE,LUCKY_CRIT_MUL,DANGER_EXP_SCALE_PER_10,DANGER_EXP_SCALE_CAP,STAMINA_FIGHTS_PER_PENALTY,STAMINA_ATK_PENALTY,STAMINA_PENALTY_CAP,VILLAGE_VIGOR_HP_BONUS,VILLAGE_VIGOR_DURATION,GOLD_MAGNET_PRESTIGE_BONUS,DEATH_INSURANCE_PENALTY,MULTI_KILL_THRESHOLD,MULTI_KILL_EXP_BONUS,GOLD_INTEREST_CAP_PER_PRESTIGE,CRIT_HEAL_RATE,SHRINE_BLESSING_EXP_BONUS,SHRINE_BLESSING_DURATION,GOLD_HOARD_THRESHOLD,GOLD_HOARD_ATK_BONUS,REVENGE_EXP_BONUS,DODGE_COUNTER_ATK_BONUS,DODGE_COUNTER_ATK_CAP,LOW_HP_EXP_THRESHOLD,LOW_HP_EXP_BONUS,ELITE_GOLD_BONUS,GOLD_FORGE_COST,GOLD_FORGE_THRESHOLD,GOLD_FORGE_ATK_FLAT,COMBO_BREAK_THRESHOLD,COMBO_BREAK_EXP_BONUS,BOSS_KILL_ATK_INTERVAL,BOSS_KILL_ATK_BONUS,GOLD_CASCADE_MULTIPLIER,GOLD_CASCADE_THRESHOLD,ADRENALINE_HP_THRESHOLD,ADRENALINE_ATK_BONUS,VILLAGE_BLESSING_STREAK,VILLAGE_BLESSING_GOLD_BONUS,VILLAGE_BLESSING_DURATION,EXP_CASCADE_BONUS,BATTLE_HARDEN_INTERVAL,BATTLE_HARDEN_HP_BONUS,BATTLE_HARDEN_CAP,PRESTIGE_EXP_BONUS,LUCKY_GOLD_CHANCE,LUCKY_GOLD_PER_LEVEL,KILL_MOMENTUM_EXP_BONUS,KILL_MOMENTUM_EXP_CAP,VILLAGE_SHIELD_DURATION,GOLD_PER_BOSS_BONUS,EXP_DROUGHT_THRESHOLD,EXP_DROUGHT_BONUS,VILLAGE_TRAINING_ATK_BONUS,VILLAGE_TRAINING_DURATION,SURVIVOR_GRIT_HP_THRESHOLD,SURVIVOR_GRIT_EXP_BONUS,GOLD_LEVEL_MILESTONE,GOLD_LEVEL_MILESTONE_BONUS,SURVIVAL_EXP_SCALE,SURVIVAL_EXP_SCALE_CAP,PRESTIGE_ATK_BONUS_PER,DANGER_GOLD_SCALE,VENGEFUL_SPIRIT_THRESHOLD,VENGEFUL_SPIRIT_ATK_BONUS,TREASURE_HOARD_INTERVAL,TREASURE_HOARD_MUL,EXP_CHAIN_PER_FIGHT,EXP_CHAIN_CAP,ARMOR_BREAK_RATE,INTEREST_VILLAGE_INTERVAL,INTEREST_VILLAGE_BONUS,DEATH_DEFIANCE_CHANCE,COMBO_GOLD_HIGH_THRESHOLD,COMBO_GOLD_HIGH_MUL,PRESTIGE_FULL_HEAL,ELITE_EXP_BONUS_RATE,VILLAGE_INVEST_BONUS_PER_VISIT,VILLAGE_INVEST_BONUS_CAP,FOCUS_STRIKE_INTERVAL,FOCUS_STRIKE_MUL,GOLD_OVERFLOW_THRESHOLD,GOLD_OVERFLOW_RATIO,KILL_STREAK_GOLD_THRESHOLD,KILL_STREAK_GOLD_BONUS,REST_EXP_PER_LEVEL,TIME_PRESSURE_LEVEL_CAP,LIFESTEAL_INTERVAL,LIFESTEAL_HIT_RATE,GOLD_SHIELD_DURATION,GOLD_SHIELD_REDUCTION,BOSS_EXP_PRESTIGE_BONUS,COMBO_HEAL_THRESHOLD,COMBO_HEAL_RATE,DANGER_INTEREST_BONUS,CRIT_CHAIN_ATK_BONUS,CRIT_CHAIN_CAP,GOLD_HARVEST_HP_THRESHOLD,GOLD_HARVEST_BONUS,WAVE_HEAL_RATE,PRESTIGE_GOLD_MUL_BONUS,COMBO_FINISHER_THRESHOLD,COMBO_FINISHER_EXP_MUL,FORGE_COST_PRESTIGE_DISCOUNT,FORGE_COST_MIN,ENEMY_WEAKEN_INTERVAL,ENEMY_WEAKEN_RATE,ENEMY_WEAKEN_CAP,GOLD_PER_CRIT,GOLD_PER_CRIT_CAP,REGEN_BUFF_VILLAGE_THRESHOLD,REGEN_BUFF_MUL,DANGER_ZONE_ATK_BONUS,BOSS_FURY_ATK_BONUS,BOSS_FURY_DURATION,GOLD_HOARD_EXP_THRESHOLD,GOLD_HOARD_EXP_PER_1000,WAVE_FINISHER_GOLD_MUL,VILLAGE_ATK_FLAT,EXP_PER_VILLAGE_BONUS,EXP_PER_VILLAGE_CAP,DOUBLE_GOLD_CHANCE,BOSS_WEAKNESS_BONUS,COMBO_GOLD_FLOOR_THRESHOLD,COMBO_GOLD_FLOOR_PER_LEVEL,DEATH_EXP_RATE,FINAL_STAND_HP,FINAL_STAND_DMG_MUL,ELITE_FURY_DURATION,ELITE_FURY_CRIT_BONUS,GOLD_COMPOUND_THRESHOLD,PRESTIGE_COMBO_ADD,WAVE_SURVIVAL_EXP_MUL,BOSS_TROPHY_ATK_BONUS,DANGER_CASCADE_MUL,DANGER_CASCADE_DURATION,FOUNTAIN_ENHANCED_HEAL,CRIT_GOLD_BONUS_MUL,KILL_EXP_MILESTONE_INTERVAL,KILL_EXP_MILESTONE_AMOUNT,COMBO_SHIELD_THRESHOLD,COMBO_SHIELD_REDUCTION,OVERKILL_CHAIN_GOLD_MUL,OVERKILL_CHAIN_CAP,PRESTIGE_HEAL_BONUS,EXP_THEFT_RATE,GOLD_INSURANCE_PAYOUT_MUL,FATIGUE_FIGHT_THRESHOLD,FATIGUE_RECOVERY_HEAL,ELITE_COMBO_SPAWN_BONUS,TRAINING_EXTENDED_DURATION,DANGER_COMBO_PRESERVE,BOSS_FRENZY_EXP_BASE,BOSS_FRENZY_CAP,GOLD_SURGE_INTERVAL,GOLD_SURGE_AMOUNT,REVENGE_GOLD_MUL,COMBO_EXP_OVERFLOW_RATIO,SHIELD_BREAK_GOLD,PRESTIGE_SURGE_ATK_MUL,ELITE_LOOT_UPGRADE,VILLAGE_DEFENSE_FIGHTS,DANGER_EXP_CHAIN_MUL,GOLD_PER_HIT_BONUS,BOSS_ENRAGE_EXP_BONUS,COMBO_PRESTIGE_ATK_FLAT,WAVE_GOLD_SURGE_PER_KILL,PRESTIGE_EXP_FLOOR_PER_LEVEL,CRIT_CHAIN_GOLD_BONUS,FORGE_VISIT_DISCOUNT,DANGER_ATK_CHAIN_BONUS,BOSS_DEFEAT_HEAL_RATE,COMBO_ATK_MILESTONE_INTERVAL,COMBO_MILESTONE_ATK,GOLD_SHIELD_OVERFLOW_THRESHOLD,GOLD_OVERFLOW_SHIELD_DURATION,GOLD_OVERFLOW_SHIELD_REDUCTION,TROPHY_EXP_BONUS,ELITE_CHAIN_THRESHOLD,ELITE_CHAIN_GOLD,PRESTIGE_GOLD_PER_COUNT,DANGER_COMBO_ATK_BONUS,WAVE_EXP_SCALE_PER_WAVE,WAVE_EXP_SCALE_CAP,BOSS_VAULT_PRESTIGE_MUL,COMBO_BREAK_GOLD_PER_LEVEL,CRIT_MASTERY_PER_CRIT,CRIT_MASTERY_CAP,VILLAGE_REST_ATK_DURATION,VILLAGE_REST_ATK_BONUS,DANGER_GOLD_CAP_PER_STREAK,ELITE_EXP_CHAIN_BONUS,PRESTIGE_SHIELD_HITS,VILLAGE_EXP_PER_VISIT,DANGER_PRESTIGE_GOLD_MUL,BOSS_CHAIN_GOLD_PER_LEVEL,COMBO_CRIT_SYNERGY_THRESHOLD,COMBO_CRIT_DMG_BONUS,WAVE_MOMENTUM_ATK_DURATION,WAVE_MOMENTUM_ATK_MUL,ELITE_PRESTIGE_GOLD_FLAT,DANGER_CHAIN_HEAL_THRESHOLD,DANGER_CHAIN_HEAL_RATE,BANK_INTEREST_RATE,BANK_INTEREST_CAP,PRESTIGE_ALL_EXP_BONUS,COMBAT_MASTERY_PER_100,COMBAT_MASTERY_CAP,SURVIVAL_GOLD_THRESHOLD,SURVIVAL_GOLD_PER_LEVEL,PRESTIGE_DANGER_IMMUNE_FIGHTS,WAVE_GOLD_CASCADE_PER_FIGHT,BOSS_EXP_MASTERY_PER_UNIQUE,BOSS_EXP_MASTERY_CAP,CRIT_HEAL_SCALE_PER_100,CRIT_HEAL_SCALE_CAP,COMBO_GOLD_ESCALATION_THRESHOLD,COMBO_GOLD_ESCALATION_BONUS,ELITE_DANGER_EXP_BONUS,VILLAGE_PRESTIGE_HEAL_BONUS,DEATH_GOLD_PROTECT_PER_PRESTIGE,DEATH_GOLD_PROTECT_CAP,FINAL_MASTERY_PER_1000_FIGHTS,FINAL_MASTERY_CAP,REVENGE_STREAK_ATK_PER_DEATH,REVENGE_STREAK_CAP,REVENGE_STREAK_DURATION,GOLD_RAIN_CHANCE,GOLD_RAIN_MUL,EXP_FOUNTAIN_PER_100_FIGHTS,SHIELD_REGEN_INTERVAL,DANGER_MASTERY_PER_50,DANGER_MASTERY_CAP,COMBO_PERSIST_RATE,BOSS_TROPHY_GOLD_PER_UNIQUE,ELITE_MASTERY_PER_20,ELITE_MASTERY_CAP,PRESTIGE_MOMENTUM_BONUS,WAVE_CHAIN_ATK_PER_WAVE,WAVE_CHAIN_CAP,PRESTIGE_CRIT_DMG_BONUS,DANGER_GOLD_STREAK_BONUS,COMBO_EXP_CASCADE_THRESHOLD,COMBO_EXP_CASCADE_MUL,BOSS_HEAL_ON_KILL_RATE,ELITE_GOLD_CHAIN_BONUS,VILLAGE_TRAINING_EXP_PER_PRESTIGE,DEATH_EXP_SAVE_RATE,WAVE_GOLD_ACCUMULATOR_MUL,COMBO_SHIELD_REGEN_THRESHOLD,PRESTIGE_EXP_SCALE_BONUS,PRESTIGE_EXP_SCALE_CAP,OVERKILL_CHAIN_EXTRA_MUL,OVERKILL_CHAIN_EXTRA_CAP,DANGER_CRIT_BONUS,SURVIVAL_COMPOUND_THRESHOLD,SURVIVAL_COMPOUND_EXP_MUL,PRESTIGE_BANK_INTEREST_BONUS,ELITE_BOSS_SYNERGY_DROP_BONUS,COMBO_GOLD_MILESTONE_INTERVAL,COMBO_GOLD_MILESTONE_AMOUNT,WAVE_DANGER_EXP_BONUS,DEATH_COUNT_ATK_PER_10,DEATH_COUNT_ATK_CAP,PRESTIGE_SHIELD_BLOCK_BONUS,BOSS_VAULT_PRESTIGE_SCALE,COMBO_END_EXP_THRESHOLD,COMBO_END_EXP_PER_COMBO,DANGER_STREAK_GOLD_COMPOUND,DANGER_STREAK_COMPOUND_THRESHOLD,ELITE_CHAIN_ATK_BONUS,ELITE_CHAIN_ATK_DURATION,PRESTIGE_HEAL_BOOST,WAVE_COMPLETE_GOLD_BONUS,BOSS_FURY_ATK_SCALE,CRIT_CHAIN_EXP_BONUS,VILLAGE_GOLD_FOUNTAIN_SCALE,DEATH_DEFIANCE_PRESTIGE_CHANCE,DEATH_DEFIANCE_PRESTIGE_COOLDOWN,COMBO_PRESTIGE_SCALE,DANGER_EXP_MASTERY_PER_100,DANGER_EXP_MASTERY_CAP,BOSS_GOLD_CASCADE_PER_BOSS,ELITE_VILLAGE_EXP_BURST,COMBO_ATK_ACCEL_THRESHOLD,COMBO_ATK_ACCEL_BONUS,PRESTIGE_GOLD_CASCADE_BONUS,PRESTIGE_GOLD_CASCADE_CAP,WAVE_EXP_BURST_PER_LEVEL,DANGER_SHIELD_GRANT_CHANCE,BOSS_CRIT_BONUS,DEATH_GOLD_COMPOUND_PER_DEATH,DEATH_GOLD_COMPOUND_CAP,ELITE_PRESTIGE_ATK_BONUS,GOLD_OVERFLOW_SHIELD_UPGRADE,COMBO_GOLD_VELOCITY_BONUS,PRESTIGE_DANGER_GOLD_BONUS,WAVE_ATK_MOMENTUM_PER_WAVE,WAVE_ATK_MOMENTUM_CAP,ELITE_MASTERY_UPGRADE_BONUS,BOSS_VAULT_COMPOUND_BONUS,CRIT_GOLD_MASTERY_PER_50,CRIT_GOLD_MASTERY_CAP,VILLAGE_SHIELD_RESTORE,DEATH_EXP_CASCADE_RATE,COMBO_DANGER_SYNERGY_THRESHOLD,COMBO_DANGER_SYNERGY_MUL,PRESTIGE_SHIELD_RECHARGE,DANGER_GOLD_MASTERY_RATE,DANGER_GOLD_MASTERY_CAP,COMBO_EXP_VELOCITY_RATE,COMBO_EXP_VELOCITY_CAP,BOSS_ATK_FURY_CHAIN_BONUS,BOSS_ATK_FURY_CHAIN_CAP,ELITE_GOLD_MASTERY_RATE,ELITE_GOLD_MASTERY_CAP,WAVE_EXP_COMPOUND_RATE,WAVE_EXP_COMPOUND_CAP,DEATH_ATK_SURGE_BONUS,DEATH_ATK_SURGE_DURATION,VILLAGE_GOLD_PRESTIGE_SCALE,CRIT_EXP_CHAIN_RATE,CRIT_EXP_CHAIN_CAP,PRESTIGE_GOLD_MOMENTUM_RATE,PRESTIGE_GOLD_MOMENTUM_CAP,DANGER_ATK_SCALING_RATE,DANGER_ATK_SCALING_CAP,ELITE_EXP_CASCADE_RATE,ELITE_EXP_CASCADE_CAP,BOSS_GOLD_FURY_RATE,WAVE_ATK_COMPOUND_BONUS,WAVE_ATK_COMPOUND_CAP,PRESTIGE_EXP_BURST_PER_PRESTIGE,DEATH_GOLD_INSURANCE_RATE,VILLAGE_EXP_PRESTIGE_SCALE,CRIT_GOLD_CASCADE_RATE,CRIT_GOLD_CASCADE_CAP,COMBO_PRESTIGE_GOLD_RATE,COMBO_PRESTIGE_GOLD_CAP,DANGER_COMBO_ATK_FLAT,DANGER_COMBO_THRESHOLD,ELITE_PRESTIGE_EXP_RATE,WAVE_GOLD_SURGE_SCALE,BOSS_EXP_CASCADE_PER_BOSS,BOSS_EXP_CASCADE_CAP,COMBO_ATK_MILESTONE2_INTERVAL,COMBO_ATK_MILESTONE2_BONUS,PRESTIGE_DANGER_MASTERY_RATE,DEATH_EXP_RECOVERY_PER_DEATH,VILLAGE_ATK_TRAINING_BONUS,VILLAGE_ATK_TRAINING_DURATION,CRIT_COMBO_SYNERGY_BONUS,CRIT_COMBO_SYNERGY_THRESHOLD,ELITE_GOLD_CASCADE_PER_ELITE,ELITE_GOLD_CASCADE_CAP,PRESTIGE_ATK_MOMENTUM_RATE,PRESTIGE_ATK_MOMENTUM_CAP,DANGER_EXP_SURGE_BONUS,COMBO_GOLD_MILESTONE2_INTERVAL,COMBO_GOLD_MILESTONE2_BONUS,BOSS_SHIELD_GRANT_DURATION,WAVE_EXP_MASTERY_RATE,WAVE_EXP_MASTERY_CAP,ELITE_ATK_CHAIN_BONUS2,ELITE_ATK_CHAIN_CAP2,PRESTIGE_GOLD_BURST_PER_PRESTIGE,DEATH_COMBO_PRESERVE_RATE,VILLAGE_DANGER_RESET,FINAL_MASTERY_RATE,FINAL_MASTERY2_CAP,BLOOD_PACT_HP_COST,BLOOD_PACT_ATK_BONUS,BLOOD_PACT_THRESHOLD,GREED_GAMBIT_GOLD_THRESHOLD,GREED_GAMBIT_EXP_BONUS,GREED_GAMBIT_GOLD_PENALTY,ADRENALINE_RUSH_HP_THRESHOLD,ADRENALINE_RUSH_ATK_BONUS,SACRIFICE_GOLD_RATE,SACRIFICE_GOLD_EXP_RATIO,RISK_REWARD_DANGER_EXP,RISK_REWARD_DANGER_DEATH_PENALTY,SHIELD_SACRIFICE_ATK_MUL,SHIELD_SACRIFICE_CHANCE,COMBO_TAX_THRESHOLD,COMBO_TAX_RATE,COMBO_TAX_REWARD_MUL,PRESTIGE_ECHO_DURATION,PRESTIGE_ECHO_BONUS,PRESTIGE_ECHO_DECAY,BOSS_ENRAGE_REWARD_MUL,BOSS_ENRAGE_DMG_MUL,BOSS_ENRAGE_CHANCE,WAVE_EXHAUSTION_ATK_PENALTY,WAVE_EXHAUSTION_DURATION,WAVE_EXHAUSTION_GOLD_BONUS,LOW_HP_FURY_THRESHOLD,LOW_HP_FURY_ATK_MUL,FULL_HP_FORTUNE_GOLD_MUL,COMBO_GATE_THRESHOLD,COMBO_GATE_EXP_BURST,GOLD_THRESHOLD_DEF_MUL,GOLD_THRESHOLD_DEF_BONUS,DEATH_PROXIMITY_CRIT_DURATION,BOSS_CONDITIONAL_MUL,ELITE_HUNTER_STREAK,ELITE_HUNTER_REWARD_MUL,DEEP_DANGER_THRESHOLD,DEEP_DANGER_EXP_MUL,PRESTIGE_READY_BONUS_PER_FIGHT,PRESTIGE_READY_BONUS_CAP,CONDITIONAL_STACK_BONUS,CONDITIONAL_STACK_CAP,GOLD_BURN_RATE,GOLD_BURN_ATK_PER_100,GOLD_BURN_COOLDOWN,LEVEL_SACRIFICE_RATE,COMBO_RESET_GOLD_PER_COMBO,EXP_OFFERING_RATE,EXP_OFFERING_BOSS_MUL,SHIELD_BREAK_BURST_MUL,SHIELD_BREAK_BURST_DURATION,DANGER_BET_INCREASE,DANGER_BET_LOCK_MUL,DANGER_BET_DURATION,HEALTH_TAX_HP_COST,HEALTH_TAX_GOLD_PER_FIGHT,SACRIFICE_ALTAR_COOLDOWN,SACRIFICE_DIMINISH_RATE,SACRIFICE_DIMINISH_CAP,SACRIFICE_PRESTIGE_RATE,SACRIFICE_PRESTIGE_CAP,MOMENTUM_DECAY_RATE,GOLDEN_HOUR_INTERVAL,GOLDEN_HOUR_DURATION,GOLDEN_HOUR_GOLD_MUL,FATIGUE_ONSET,FATIGUE_ATK_PENALTY_PER_FIGHT,FATIGUE_CAP,ACCUMULATOR_PER_CLEAN,ACCUMULATOR_CAP,SEASON_LENGTH,RUSH_HOUR_START,RUSH_HOUR_DURATION,RUSH_HOUR_GOLD_MUL,RUSH_HOUR_EXP_MUL,AGING_INTERVAL,AGING_EXP_BONUS,AGING_ATK_PENALTY,AGING_CAP,REJUVENATION_AGE,REJUVENATION_EXP_BURST,TIME_LOCK_GROWTH,TIME_LOCK_DURATION,TIME_LOCK_DEPOSIT_RATE,TEMPORAL_PRESTIGE_FAST_THRESHOLD,TEMPORAL_PRESTIGE_FAST_BONUS,TEMPORAL_PRESTIGE_SLOW_BONUS,BLOOD_FURY_SYNERGY_MUL,WEALTH_SACRIFICE_EFFICIENCY,TEMPORAL_COMBO_DISCOUNT,ELDER_WISDOM_AGE,ELDER_WISDOM_PRESTIGE,ELDER_WISDOM_EXP_MUL,DESPERATE_TRADE_CRIT_MUL,SYNERGY_COUNT_BONUS,SYNERGY_COUNT_CAP,SYNERGY_TIER_3_BONUS,SYNERGY_TIER_5_BONUS,ANTI_SYNERGY_PENALTY,SYNERGY_PRESTIGE_RATE,SYNERGY_PRESTIGE_CAP,TOTAL_SYNERGIES,RELIC_DROP_CHANCE_ELITE,RELIC_DROP_CHANCE_BOSS,RELIC_UPGRADE_CHANCE,RELIC_MAX_SLOTS,EMBER_CROWN_ATK_PER_CRIT,EMBER_CROWN_CAP,MISER_POUCH_GOLD_MUL,MISER_POUCH_HEAL_PENALTY,HOURGLASS_DURATION_MUL,BLOOD_PACT_RELIC_EFFICIENCY,BLOOD_PACT_RELIC_HP_PENALTY,SCHOLAR_LENS_EXP_MUL,SCHOLAR_LENS_ATK_PENALTY,RELIC_UPGRADE_BONUS,RELIC_PRESTIGE_RETENTION,MERCHANT_EVENT_CHANCE,MERCHANT_PRICE_MUL,TREASURE_SHRINE_CHANCE,SHRINE_GOLD_BURST,SHRINE_EXP_BURST,SHRINE_HEAL_AMOUNT,TRAP_CHANCE,TRAP_DAMAGE,TRAP_GOLD_LOSS,TRAP_AVOID_COMBO,REST_SHRINE_CHANCE,GAMBLER_CHANCE,GAMBLER_WIN_RATE,BLACKSMITH_CHANCE,BLACKSMITH_BOOST,CURSED_ALTAR_CHANCE,CURSED_ALTAR_ATK_BUFF,CURSED_ALTAR_DAMAGE_MUL,CURSED_ALTAR_DURATION,FAIRY_CHANCE,FAIRY_DURATION,TIME_RIFT_CHANCE,EVENT_CHAIN_THRESHOLD,EVENT_CHAIN_REWARD_EXP,EVENT_CHAIN_REWARD_GOLD,VILLAGE_GOLD_FOUNTAIN,DANGER_TAX_IMMUNITY,CRIT_STREAK_GUARANTEE_THRESHOLD,BOSS_KILL_EXP_MUL,GOLD_INVEST_LOCK_FIGHTS,GOLD_INVEST_RETURN_MUL,GOLD_INVEST_MIN,DAMAGE_REFLECT_RATE,PASSIVE_GOLD_PER_VISIT,PASSIVE_GOLD_CAP,BOSS_IMMUNITY_INTERVAL,ACHIEVEMENT_KILL_THRESHOLDS,ACHIEVEMENT_ATK_BONUS,WEATHER_CHANCE,WEATHER_RAIN_ATK_PENALTY,WEATHER_WIND_EXP_BONUS,WEATHER_FOG_CRIT_PENALTY,ARENA_COST,ARENA_REWARD_MUL,ARENA_ENEMY_HP_MUL,SHRINE_SKILL_GRANT_RATE,MERCIFUL_PROC_RATE } from './encounter/constants';
export * from './encounter/constants';

const ENEMY_BASE_HP = 30;
const ENEMY_BASE_ATK = 8;
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
  // C551-C560: Relic system state
  private relics: number[] = []; // equipped relic IDs (max 3)
  private relicLevels: number[] = []; // upgrade levels (1=base, 2=★★)
  private emberCrownStacks = 0; // C553: ATK stacks from crits
  private phoenixFeatherUsed = false; // C555: one-shot survival
  private imprintedRelic = -1; // C560: prestige-imprinted relic ID
  private imprintedRelicLevel = 0; // C560: imprinted relic strength
  // C561-C570: Event state
  private cursedAltarRemaining = 0; // C567: cursed altar duration
  private cursedAltarAtkBuff = false; // C567: ATK buff active
  private fairyBlessingRemaining = 0; // C568: guaranteed drops
  private eventChainCount = 0; // C570: consecutive events
  private pendingShrineChoice = -1; // C579: -1 = no pending, 0=gold, 1=exp, 2=heal

  constructor(private readonly rng: SeededRng, private opts: EncounterEngineOpts = {}) {}

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
    return this.relics.includes(id) || this.imprintedRelic === id;
  }

  private getRelicPower(id: number): number {
    const idx = this.relics.indexOf(id);
    if (idx >= 0) return (this.relicLevels[idx] ?? 1) * (1 + (this.relicLevels[idx] > 1 ? RELIC_UPGRADE_BONUS : 0));
    if (this.imprintedRelic === id) return RELIC_PRESTIGE_RETENTION * this.imprintedRelicLevel;
    return 0;
  }

  getComboStreak(): number { return this.comboStreak; }
  resetComboStreak(): void { this.comboStreak = 0; }
  getBattleMomentum(): number { return this.battleMomentum; }
  getDropStreak(): number { return this.dropStreak; }
  getShrineBuffRemaining(): number { return this.shrineBuffRemaining; }
  getMercyRemaining(): number { return this.mercyRemaining; }

  // C572: expose relic state for UI
  getRelics(): { id: number; level: number; name: string }[] {
    const RELIC_NAMES = ['Ember Crown', "Miser's Pouch", 'Phoenix Feather', 'Hourglass', 'Blood Pact', "Scholar's Lens"];
    return this.relics.map((id, i) => ({ id, level: this.relicLevels[i] || 1, name: RELIC_NAMES[id] || 'Unknown' }));
  }
  getImprintedRelic(): { id: number; name: string } | null {
    if (this.imprintedRelic < 0) return null;
    const RELIC_NAMES = ['Ember Crown', "Miser's Pouch", 'Phoenix Feather', 'Hourglass', 'Blood Pact', "Scholar's Lens"];
    return { id: this.imprintedRelic, name: RELIC_NAMES[this.imprintedRelic] || 'Unknown' };
  }
  getPrestigeCount(): number { return this.prestigeCount; }
  getEventChainCount(): number { return this.eventChainCount; }
  getTotalDeaths(): number { return this.totalDeaths; }
  getTotalFights(): number { return this.totalWins + this.totalDeaths; }

  // C579: treasure shrine player choice
  hasPendingShrineChoice(): boolean { return this.pendingShrineChoice >= 0; }
  setShrineChoice(choice: 0 | 1 | 2): void { this.pendingShrineChoice = choice; }

  // C578: combat stats summary for visual overlay
  getCombatSummary(): { activeBuffs: string[]; deathPrevention: number; dangerLevel: number; deathSaveBlocked: boolean } {
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
    return { activeBuffs, deathPrevention, dangerLevel, deathSaveBlocked };
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
      this.prestigeShieldRemaining += 1;
      this.totalSacrifices++;
      this.levelSacrificeCooldown = 50;
    }
    // Phoenix Feather relic — one-time death prevention
    if (hero.staggered && this.hasRelic(2) && !this.phoenixFeatherUsed) {
      hero.staggered = false;
      hero.hp = hero.hpMax;
      this.phoenixFeatherUsed = true;
      const featherIdx = this.relics.indexOf(2);
      if (featherIdx >= 0) { this.relics.splice(featherIdx, 1); this.relicLevels.splice(featherIdx, 1); }
    }
    return { luckyDodge };
  }

  resolveEncounter(hero: HeroEntity, kind: LandmarkKind, landmarkId: string): OverworldEvent[] {
    const events: OverworldEvent[] = [];
    if (kind === 'enemy' || kind === 'boss') {
      const isBoss = kind === 'boss';
      // C119: danger zone — 15% chance on regular enemies. ×1.5 stats, ×3 exp.
      // C226: danger magnet — increased danger zone spawn after enough fights
      const dangerMagnetBonus = this.totalDangerFights >= DANGER_MAGNET_THRESHOLD ? DANGER_MAGNET_SPAWN_BONUS : 0;
      const isDangerZone = !isBoss && this.rng.chance(DANGER_ZONE_RATE + dangerMagnetBonus);
      // C595: danger retreat — player choice to flee danger zones (costs gold, resets combo)
      if (isDangerZone && getStrategyEnabled('dangerRetreat') && hero.gold >= 50) {
        hero.gold -= 50;
        this.comboStreak = 0;
        this.dangerStreak = 0;
        events.push({ type: 'danger_retreat' });
        return events;
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
      // C317: enemy weakening — kills reduce enemy HP
      const enemyWeakenMul = 1 - Math.min(ENEMY_WEAKEN_CAP, Math.floor(this.killCount / ENEMY_WEAKEN_INTERVAL) * ENEMY_WEAKEN_RATE);
      // C589: adaptive enemy HP scaling — enemies get tougher during kill streaks
      const adaptiveHpMul = 1 + 0.01 * Math.min(this.comboStreak, 50);
      const enemyHp = Math.max(1, Math.floor(enemyHpAtLevel(ENEMY_BASE_HP, hero.level, isBoss ? BOSS_HP_MUL : hpMul) * bossStreakScale * timePressureMul * enemyWeakenMul * adaptiveHpMul));
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
      if (this.deathAtkSurgeRemaining > 0) this.deathAtkSurgeRemaining--;
      // C440: combo prestige synergy — combo multipliers scale with prestige
      const comboPrestigeSynergyMul = this.comboStreak > 0 ? (1 + this.prestigeCount * COMBO_PRESTIGE_SCALE) : 1;
      // C464: boss ATK fury chain — consecutive boss kills boost ATK
      const bossFuryChainMul = 1 + Math.min(BOSS_ATK_FURY_CHAIN_CAP, this.consecutiveBossKills * BOSS_ATK_FURY_CHAIN_BONUS);
      // C467: death ATK surge — temp ATK boost after death
      const deathAtkSurgeMul = this.deathAtkSurgeRemaining > 0 ? (1 + DEATH_ATK_SURGE_BONUS) : 1;
      // C471: danger ATK scaling — danger zone fights permanently boost ATK
      const dangerAtkScaleMul = 1 + Math.min(DANGER_ATK_SCALING_CAP - 1, this.dangerFights * DANGER_ATK_SCALING_RATE);
      // C475: wave ATK compound — consecutive waves compound ATK
      const waveAtkCompoundMul = 1 + Math.min(WAVE_ATK_COMPOUND_CAP - 1, this.consecutiveWaveClears * WAVE_ATK_COMPOUND_BONUS);
      // C481: danger combo synergy — danger + combo gives flat ATK
      const dangerComboAtk = (isDangerZone && this.comboStreak >= DANGER_COMBO_THRESHOLD) ? DANGER_COMBO_ATK_FLAT * Math.floor(this.comboStreak / DANGER_COMBO_THRESHOLD) : 0;
      // C485: combo ATK milestone — every 20 combo grants flat ATK
      const comboAtkMilestone = Math.floor(this.comboStreak / COMBO_ATK_MILESTONE2_INTERVAL) * COMBO_ATK_MILESTONE2_BONUS;
      // C488: village ATK training — temp ATK after village
      const villageAtkTrainingMul = this.villageAtkTrainingRemaining > 0 ? (1 + VILLAGE_ATK_TRAINING_BONUS) : 1;
      if (this.villageAtkTrainingRemaining > 0) this.villageAtkTrainingRemaining--;
      // C491: prestige ATK momentum — prestige boosts ATK over time
      const prestigeAtkMomentumMul = 1 + Math.min(PRESTIGE_ATK_MOMENTUM_CAP - 1, this.prestigeCount * this.totalWins * PRESTIGE_ATK_MOMENTUM_RATE / 100);
      // C496: elite ATK chain — consecutive elites grant ATK
      const eliteAtkChainMul2 = isElite ? (1 + Math.min(ELITE_ATK_CHAIN_CAP2 - 1, this.eliteCombo * ELITE_ATK_CHAIN_BONUS2)) : 1;
      // C501: blood pact — below 50% HP, sacrifice HP for ATK
      const bloodPactRelicBonus = this.hasRelic(4) ? BLOOD_PACT_RELIC_EFFICIENCY : 1;
      const bloodPactMul = (hero.hp < hero.hpMax * BLOOD_PACT_THRESHOLD) ? (1 + BLOOD_PACT_ATK_BONUS * bloodPactRelicBonus) : 1;
      if (hero.hp < hero.hpMax * BLOOD_PACT_THRESHOLD) hero.hp = Math.max(1, hero.hp - Math.floor(hero.hpMax * BLOOD_PACT_HP_COST * (this.hasRelic(4) ? BLOOD_PACT_RELIC_HP_PENALTY : 1)));
      // C503: adrenaline rush — very low HP gives massive ATK but no healing this fight
      const adrenalineRushMul = (hero.hp < hero.hpMax * ADRENALINE_RUSH_HP_THRESHOLD) ? (1 + ADRENALINE_RUSH_ATK_BONUS) : 1;
      // C506: shield sacrifice — chance to consume shield for massive ATK
      let shieldSacrificeMul = 1;
      if (this.prestigeShieldRemaining > 0 && this.rng.chance(SHIELD_SACRIFICE_CHANCE)) {
        this.prestigeShieldRemaining--;
        shieldSacrificeMul = SHIELD_SACRIFICE_ATK_MUL;
        // C525: shield break burst — destroying shield also gives extended ATK boost
        this.shieldBreakBurstRemaining = SHIELD_BREAK_BURST_DURATION;
        this.totalSacrifices++;
      }
      // C508: prestige echo — recent prestige gives decaying bonus
      const prestigeEchoMul = this.prestigeEchoRemaining > 0 ? (1 + PRESTIGE_ECHO_BONUS - (PRESTIGE_ECHO_DURATION - this.prestigeEchoRemaining) * PRESTIGE_ECHO_DECAY) : 1;
      if (this.prestigeEchoRemaining > 0) this.prestigeEchoRemaining--;
      // C510: wave exhaustion — temp ATK penalty after wave complete
      const waveExhaustionMul = this.waveExhaustionRemaining > 0 ? (1 - WAVE_EXHAUSTION_ATK_PENALTY) : 1;
      if (this.waveExhaustionRemaining > 0) this.waveExhaustionRemaining--;
      // C525: shield break burst — temp ×3 ATK after destroying own shield
      const shieldBreakBurstMul = this.shieldBreakBurstRemaining > 0 ? SHIELD_BREAK_BURST_MUL : 1;
      if (this.shieldBreakBurstRemaining > 0) this.shieldBreakBurstRemaining--;
      // C526: danger bet lock — locked-in multiplier during bet
      const dangerBetMul = this.dangerBetRemaining > 0 ? DANGER_BET_LOCK_MUL : 1;
      // C530: sacrifice prestige — total sacrifices boost power
      const sacrificePrestigeMul = 1 + Math.min(SACRIFICE_PRESTIGE_CAP, this.totalSacrifices * SACRIFICE_PRESTIGE_RATE);
      // C533: fatigue — ATK penalty after 100 consecutive fights without village
      const fatigueMul = this.fightsSinceVillage > FATIGUE_ONSET ? (1 - Math.min(FATIGUE_CAP, (this.fightsSinceVillage - FATIGUE_ONSET) * FATIGUE_ATK_PENALTY_PER_FIGHT)) : 1;
      // C534: accumulator — burst from clean fights
      const accumulatorMul = 1 + this.accumulatorBonus;
      // C537: aging — elderly heroes have less ATK
      const agingAtkMul = 1 - Math.min(AGING_CAP * AGING_ATK_PENALTY, this.heroAge * AGING_ATK_PENALTY);
      // C540: temporal prestige — bonus from previous prestige speed
      const temporalPrestigeMul = 1 + this.temporalPrestigeBonus;
      // C511: low HP fury — ATK ×2 when HP ≤ 20%
      const lowHpFuryMul = hero.hp <= hero.hpMax * LOW_HP_FURY_THRESHOLD ? LOW_HP_FURY_ATK_MUL : 1;
      // C516: boss conditional — all multipliers +20% during boss fights
      const bossConditionalMul = kind === 'boss' ? BOSS_CONDITIONAL_MUL : 1;
      // C520: conditional stack — count active conditions for global bonus
      let activeConditions = 0;
      if (lowHpFuryMul > 1) activeConditions++;
      if (hero.hp >= hero.hpMax) activeConditions++; // C512 active
      if (kind === 'boss') activeConditions++; // C516 active
      if (this.deathProximityCrit > 0) activeConditions++; // C515 active
      if (this.dangerStreak >= DEEP_DANGER_THRESHOLD) activeConditions++; // C518 active
      if (hero.level >= this.getPrestigeThreshold()) activeConditions++; // C519 active
      const conditionalStackMul = 1 + Math.min(CONDITIONAL_STACK_CAP, activeConditions * CONDITIONAL_STACK_BONUS);
      // C541-C550: Synergy Web — detect active synergies
      let activeSynergies = 0;
      // C541: blood fury synergy — blood pact + low HP fury
      const bloodFurySynergy = (bloodPactMul > 1 && lowHpFuryMul > 1) ? BLOOD_FURY_SYNERGY_MUL : 1;
      if (bloodPactMul > 1 && lowHpFuryMul > 1) { activeSynergies++; this.synergiesDiscovered |= 1; }
      // C544: elder wisdom synergy — aging + prestige
      const elderWisdomActive = this.heroAge >= ELDER_WISDOM_AGE && this.prestigeCount >= ELDER_WISDOM_PRESTIGE;
      if (elderWisdomActive) { activeSynergies++; this.synergiesDiscovered |= 2; }
      // C545: desperate trade synergy — low HP fury + shield break burst active
      const desperateTradeActive = lowHpFuryMul > 1 && this.shieldBreakBurstRemaining > 0;
      if (desperateTradeActive) { activeSynergies++; this.synergiesDiscovered |= 4; }
      // C548: anti-synergy — fatigue + accumulator both active weakens both
      const antiSynergyActive = fatigueMul < 1 && accumulatorMul > 1;
      const antiSynergyPenalty = antiSynergyActive ? ANTI_SYNERGY_PENALTY : 1;
      if (antiSynergyActive) { this.synergiesDiscovered |= 8; }
      // C543: temporal combo synergy — golden hour + high combo
      if (this.goldenHourRemaining > 0 && this.comboStreak >= 30) { activeSynergies++; this.synergiesDiscovered |= 16; }
      // C542: wealth sacrifice synergy detected (applied in gold burn section)
      if (hero.hp >= hero.hpMax && this.goldBurnCooldown <= 5) { activeSynergies++; this.synergiesDiscovered |= 32; }
      // C546: synergy count bonus
      const synergyCountMul = 1 + Math.min(SYNERGY_COUNT_CAP, activeSynergies * SYNERGY_COUNT_BONUS);
      // C547: synergy tier bonus
      const synergyTierMul = activeSynergies >= 5 ? (1 + SYNERGY_TIER_5_BONUS) : activeSynergies >= 3 ? (1 + SYNERGY_TIER_3_BONUS) : 1;
      // C549: synergy prestige permanent bonus
      const synergyPrestigeMul = 1 + this.synergyPrestigeBonus;
      // C553: Ember Crown relic — stacked crit ATK bonus
      const emberCrownMul = this.hasRelic(0) ? (1 + Math.min(EMBER_CROWN_CAP, this.emberCrownStacks * EMBER_CROWN_ATK_PER_CRIT)) : 1;
      // C558: Scholar's Lens relic — ATK penalty
      const scholarLensMul = this.hasRelic(5) ? (1 - SCHOLAR_LENS_ATK_PENALTY) : 1;
      // C576: cursed altar ATK buff
      const cursedAltarMul = this.cursedAltarAtkBuff ? CURSED_ALTAR_ATK_BUFF : 1;

      // C583: group multipliers by category for readability (no gameplay change)
      const flatAtk = hero.atk + comboPrestigeFlat + this.comboMilestoneBonus + combatMastery + waveChainAtk + deathCountAtk + dangerComboAtk + comboAtkMilestone;
      const coreMuls = damping * bossAtkMul * realmAtkMul * momentumMul * shrineMul * revengeMul * milestoneMul * prestigeMul * achieveMul;
      const conditionMuls = nearDeathMul * exhaustionMul * titheMul * shieldBreakMul * comboBreakerMul * weatherAtkMul * deathAtkMul * berserkerMul * curseMul * specMul * elementalMul * furyMul * staminaMul * fatigueMul;
      const goldMuls = goldHoardMul * adrenalineMul;
      const combatMuls = bossKillAtkMul * trainingMul * vengefulMul * critChainMul * dangerAtkMul * bossFuryMul * finalStandMul * bossTrophyMul * dangerAtkScaleMul;
      const progressMuls = prestigeAtkMul * prestigeSurgeMul * prestigeAtkMomentumMul * prestigeEchoMul * sacrificePrestigeMul * temporalPrestigeMul;
      const chainMuls = villageRestAtkMul * waveMomentumAtkMul * revengeStreakMul * eliteChainAtkMul * comboPrestigeSynergyMul * bossFuryChainMul * deathAtkSurgeMul * waveAtkCompoundMul * villageAtkTrainingMul * eliteAtkChainMul2;
      const tradeoffMuls = bloodPactMul * adrenalineRushMul * shieldSacrificeMul * waveExhaustionMul * lowHpFuryMul * bossConditionalMul * conditionalStackMul * shieldBreakBurstMul * dangerBetMul;
      const systemMuls = accumulatorMul * agingAtkMul * bloodFurySynergy * antiSynergyPenalty * synergyCountMul * synergyTierMul * synergyPrestigeMul * emberCrownMul * scholarLensMul * cursedAltarMul;
      const baseHeroAtk = Math.max(1, Math.floor(flatAtk * coreMuls * conditionMuls * goldMuls * combatMuls * progressMuls * chainMuls * tradeoffMuls * systemMuls));
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
        // C515: death proximity crit — guaranteed crit after surviving at 1 HP
        const deathProxCrit = this.deathProximityCrit > 0;
        if (this.deathProximityCrit > 0) this.deathProximityCrit--;
        const isCrit = canCrit && (guaranteedCrit || deathProxCrit || this.rng.chance(CRIT_CHANCE * weatherCritMul + berserkerCrit + eliteFuryCrit + this.critMasteryBonus + bossCritExtra));
        if (isCrit) { this.critStreak++; this.critMasteryBonus = Math.min(CRIT_MASTERY_CAP, this.critMasteryBonus + CRIT_MASTERY_PER_CRIT); } else { this.critStreak = 0; }
        if (guaranteedCrit) this.critStreak = 0; // consume guarantee
        const baseCritAtk = isCrit ? baseHeroAtk * (this.rng.chance(LUCKY_CRIT_CHANCE) ? LUCKY_CRIT_MUL : CRIT_DAMAGE_MUL) * (1 + this.prestigeCount * PRESTIGE_CRIT_DMG_BONUS) : baseHeroAtk;
        // C384: combo crit synergy — high combo + crit = extra damage
        const comboCritBonus = (isCrit && this.comboStreak >= COMBO_CRIT_SYNERGY_THRESHOLD) ? (1 + COMBO_CRIT_DMG_BONUS) : 1;
        // C422: danger crit bonus — crits in danger zone deal more
        const dangerCritBonus = (isCrit && isDangerZone) ? (1 + DANGER_CRIT_BONUS) : 1;
        // C489: crit combo synergy — crits during combo deal more
        const critComboSynergy = (isCrit && this.comboStreak >= CRIT_COMBO_SYNERGY_THRESHOLD) ? (1 + CRIT_COMBO_SYNERGY_BONUS) : 1;
        // C545: desperate trade synergy — low HP + shield burst = crit ×3
        const desperateTradeCritMul = (isCrit && desperateTradeActive) ? DESPERATE_TRADE_CRIT_MUL : 1;
        const heroAtk = Math.floor(baseCritAtk * comboCritBonus * dangerCritBonus * critComboSynergy * desperateTradeCritMul);
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
          // C494: boss shield damage reduction
          const bossShieldMul = this.bossShieldRemaining > 0 ? 0.7 : 1;
          if (this.bossShieldRemaining > 0) this.bossShieldRemaining--;
          // C486: prestige danger mastery — prestige reduces danger damage
          const prestigeDangerMasteryMul = (isDangerZone && this.prestigeCount > 0) ? (1 - Math.min(0.3, this.prestigeCount * PRESTIGE_DANGER_MASTERY_RATE)) : 1;
          // C514: gold threshold defense — defense +50% when gold > level×100
          const goldThresholdDefMul = hero.gold > hero.level * GOLD_THRESHOLD_DEF_MUL ? (1 - GOLD_THRESHOLD_DEF_BONUS) : 1;
          // C576: cursed altar damage multiplier
          const cursedAltarDmgMul = this.cursedAltarAtkBuff ? CURSED_ALTAR_DAMAGE_MUL : 1;
          const incomingDmg = Math.max(1, Math.floor(rageAtk * mercyReduction * shieldReduction * goldArmorMul * nightDmgMul * armorMul * vigorMul * goldShieldMul * comboShieldMul * goldOverflowMul * bossShieldMul * prestigeDangerMasteryMul * goldThresholdDefMul * cursedAltarDmgMul));
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
          // C594: extracted death prevention into method
          const { luckyDodge: ld } = this.applyDeathPrevention(hero, luckyDodge);
          luckyDodge = ld;
          // C195: gold sacrifice heal — auto-heal when low HP (once per fight)
          if (!hero.staggered && hero.hp < hero.hpMax * GOLD_HEAL_HP_THRESHOLD && hero.gold >= GOLD_HEAL_COST && !goldHealUsed) {
            hero.gold -= GOLD_HEAL_COST;
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
        // C477: death gold insurance — save portion of gold on death
        hero.gold += Math.floor(hero.gold * DEATH_GOLD_INSURANCE_RATE);
        // C181: max HP decay on death
        const hpDecay = Math.max(1, Math.floor(hero.hpMax * DEATH_HP_DECAY_RATE));
        hero.hpMax = Math.max(1, hero.hpMax - hpDecay);
        // C417: death insurance — save portion of exp based on level
        hero.gainExp(Math.floor(hero.level * DEATH_EXP_SAVE_RATE * 10));
        // C459: death exp cascade — dying at high level gives proportional exp
        hero.gainExp(Math.floor(hero.exp * DEATH_EXP_CASCADE_RATE));
        // C467: death ATK surge — grant temp ATK surge on death
        this.deathAtkSurgeRemaining = DEATH_ATK_SURGE_DURATION;
        // C487: death exp recovery — gain exp proportional to deaths
        hero.gainExp(this.totalDeaths * DEATH_EXP_RECOVERY_PER_DEATH);
        // C498: death combo preservation — high combo partially preserved on death
        if (this.comboStreak > 0) {
          this.comboStreak = Math.floor(this.comboStreak * DEATH_COMBO_PRESERVE_RATE);
        }
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
        // C472: combo shield regen boost — very high combo regens shield faster
        if (this.comboStreak >= COMBO_SHIELD_REGEN_THRESHOLD && this.comboStreak % (COMBO_SHIELD_REGEN_THRESHOLD * 2) === 0) {
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
      // C463: combo exp velocity — exp scales with combo speed
      const comboExpVelocityMul = this.comboStreak > 0 ? (1 + Math.min(COMBO_EXP_VELOCITY_CAP - 1, this.comboStreak * COMBO_EXP_VELOCITY_RATE)) : 1;
      // C466: wave exp compound — wave clears compound exp bonus
      const waveExpCompoundMul = 1 + Math.min(WAVE_EXP_COMPOUND_CAP - 1, this.consecutiveWaveClears * WAVE_EXP_COMPOUND_RATE);
      // C469: crit exp chain — consecutive crits boost exp
      const critExpChainMul2 = 1 + Math.min(CRIT_EXP_CHAIN_CAP - 1, this.critExpChain * CRIT_EXP_CHAIN_RATE);
      // C473: elite exp cascade — each elite compounds exp gain
      const eliteExpCascadeMul = isElite ? (1 + Math.min(ELITE_EXP_CASCADE_CAP - 1, this.totalEliteKills * ELITE_EXP_CASCADE_RATE)) : 1;
      // C482: elite prestige exp — elite kills give more exp per prestige
      const elitePrestigeExpMul = isElite ? (1 + this.prestigeCount * ELITE_PRESTIGE_EXP_RATE) : 1;
      // C484: boss exp cascade — each boss kill this run adds exp
      const bossExpCascadeMul = isBoss ? (1 + Math.min(BOSS_EXP_CASCADE_CAP - 1, this.consecutiveBossKills * BOSS_EXP_CASCADE_PER_BOSS)) : 1;
      // C492: danger exp surge — being in danger gives burst exp
      const dangerExpSurgeMul = isDangerZone ? (1 + DANGER_EXP_SURGE_BONUS / Math.max(1, baseExpGain)) : 1;
      // C495: wave exp mastery — total waves scale exp
      const waveExpMasteryMul = 1 + Math.min(WAVE_EXP_MASTERY_CAP - 1, this.consecutiveWaveClears * WAVE_EXP_MASTERY_RATE);
      // C500: final mastery bonus — total fights scale all rewards
      const finalMasteryMul2 = 1 + Math.min(FINAL_MASTERY2_CAP - 1, this.totalWins * FINAL_MASTERY_RATE);
      // C502: greed gambit — high gold boosts exp
      const greedGambitExpMul = hero.gold > GREED_GAMBIT_GOLD_THRESHOLD ? (1 + GREED_GAMBIT_EXP_BONUS) : 1;
      // C505: risk reward danger — longer danger streaks give exponential exp
      const riskRewardExpMul = isDangerZone ? (1 + Math.min(0.5, this.dangerFights * RISK_REWARD_DANGER_EXP * 0.1)) : 1;
      // C518: deep danger exp — danger streak ≥ 8 adds extra exp layer
      const deepDangerExpMul = this.dangerStreak >= DEEP_DANGER_THRESHOLD ? DEEP_DANGER_EXP_MUL : 1;
      // C519: prestige ready defiance — fighting past prestige threshold accumulates bonus
      if (hero.level >= this.getPrestigeThreshold()) {
        this.prestigeReadyBonus = Math.min(PRESTIGE_READY_BONUS_CAP, this.prestigeReadyBonus + PRESTIGE_READY_BONUS_PER_FIGHT);
      }
      const prestigeReadyExpMul = 1 + this.prestigeReadyBonus;
      // C536: rush hour — exp penalty during rush hour
      const rushHourActive = this.fightsSincePrestige >= RUSH_HOUR_START && this.fightsSincePrestige < RUSH_HOUR_START + RUSH_HOUR_DURATION;
      const rushHourExpMul = rushHourActive ? RUSH_HOUR_EXP_MUL : 1;
      // C537: aging — elderly heroes gain more exp
      const agingExpMul = 1 + this.heroAge * AGING_EXP_BONUS;
      // C544: elder wisdom synergy — aging + prestige = exp ×1.5
      const elderWisdomExpMul = elderWisdomActive ? ELDER_WISDOM_EXP_MUL : 1;
      // C558: Scholar's Lens relic — exp bonus
      const scholarLensExpMul = this.hasRelic(5) ? SCHOLAR_LENS_EXP_MUL : 1;
      const expGainRaw = Math.floor(baseExpGain * dangerMul2 * eliteMul * comboBonus * diminish * firstBloodMul * survivalBonus * waveMulExp * familiarityMul * comboExpMul * closeCallMul * greedExpMul * lvUpMul * eliteBountyMul * expDecayMul * bossExpMul * weatherExpMul * arenaMul * nightExpMul * expChainMul * quickKillMul * companionMul * bossSlayerMul * multiKillMul * shrineBlessMul * revengeExpMul * lowHpExpMul * comboBreakMul * expCascadeMul * prestigeExpMul * killMomentumExp * expDroughtMul * survivorGritMul * survivalScaleMul * expChainFightMul * eliteExpMul2 * comboFinisherMul * villageExpMul * waveSurvivalMul * dangerCascadeExpMul * dangerChainMul * bossEnrageMul * waveExpScaleMul * eliteExpChainMul * prestigeAllExpMul * bossExpMasteryMul * eliteDangerMul * finalMasteryMul * eliteMasteryMul * comboExpCascadeMul * prestigeExpScaleMul * survivalCompoundMul * waveDangerMul * critChainExpMul * dangerExpMasteryMul * eliteVillageBurstMul * comboAccelExpMul * comboExpVelocityMul * waveExpCompoundMul * critExpChainMul2 * eliteExpCascadeMul * elitePrestigeExpMul * bossExpCascadeMul * dangerExpSurgeMul * waveExpMasteryMul * finalMasteryMul2 * greedGambitExpMul * riskRewardExpMul * deepDangerExpMul * prestigeReadyExpMul * rushHourExpMul * agingExpMul * elderWisdomExpMul * scholarLensExpMul);
      // Safety cap: prevent exp overflow causing infinite level-up loops
      const expGain = Math.min(expGainRaw, hero.level * 2500);
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
      // C462: danger gold mastery — danger zone gold scales with total danger fights
      const dangerGoldMasteryMul = isDangerZone ? (1 + Math.min(DANGER_GOLD_MASTERY_CAP, this.dangerFights * DANGER_GOLD_MASTERY_RATE)) : 1;
      // C465: elite gold mastery — total elite kills scale gold
      const eliteGoldMasteryMul = 1 + Math.min(ELITE_GOLD_MASTERY_CAP, this.totalEliteKills * ELITE_GOLD_MASTERY_RATE);
      // C470: prestige gold momentum — prestige count increases gold over time
      const prestigeGoldMomentumMul = 1 + Math.min(PRESTIGE_GOLD_MOMENTUM_CAP, this.prestigeCount * this.totalWins * PRESTIGE_GOLD_MOMENTUM_RATE / 100);
      // C479: crit gold cascade — total crits cascade gold
      const critGoldCascadeMul2 = 1 + Math.min(CRIT_GOLD_CASCADE_CAP - 1, Math.floor(this.totalCrits / 100) * CRIT_GOLD_CASCADE_RATE);
      // C480: combo prestige gold — combo multiplies prestige gold bonus
      const comboPrestigeGoldMul = (this.comboStreak > 0 && this.prestigeCount > 0) ? (1 + Math.min(COMBO_PRESTIGE_GOLD_CAP - 1, this.comboStreak * COMBO_PRESTIGE_GOLD_RATE)) : 1;
      // C483: wave gold surge — wave completion gold scales with wave count
      const waveGoldSurgeScale = this.consecutiveWaveClears > 0 ? (1 + this.consecutiveWaveClears * WAVE_GOLD_SURGE_SCALE) : 1;
      // C490: elite gold cascade — elite kills cascade gold gain
      const eliteGoldCascadeMul2 = 1 + Math.min(ELITE_GOLD_CASCADE_CAP - 1, this.totalEliteKills * ELITE_GOLD_CASCADE_PER_ELITE);
      // C500: final mastery gold — total fights scale gold
      const finalMasteryGoldMul = 1 + Math.min(FINAL_MASTERY2_CAP - 1, this.totalWins * FINAL_MASTERY_RATE);
      // C512: full HP fortune — gold ×1.5 when at full HP
      const fullHpFortuneMul = hero.hp >= hero.hpMax ? FULL_HP_FORTUNE_GOLD_MUL : 1;
      // C517: elite hunter — 3 consecutive elite kills → next elite ×3 rewards
      const eliteHunterMul = (isElite && this.consecutiveEliteKills2 >= ELITE_HUNTER_STREAK) ? ELITE_HUNTER_REWARD_MUL : 1;
      // C532: golden hour — periodic gold ×2 window
      const goldenHourGoldMul = this.goldenHourRemaining > 0 ? GOLDEN_HOUR_GOLD_MUL : 1;
      // C536: rush hour — gold ×3 during rush hour window
      const rushHourGoldMul = rushHourActive ? RUSH_HOUR_GOLD_MUL : 1;
      // C554: Miser's Pouch relic — gold bonus
      const miserPouchGoldMul = this.hasRelic(1) ? MISER_POUCH_GOLD_MUL : 1;
      const goldEarnedRaw = Math.floor(GOLD_PER_KILL_BASE * Math.pow(hero.level, GOLD_LEVEL_POWER) * goldMul * dangerGoldMul * waveMul * momentumGoldMul * comboGoldMul * overkillGoldMul * overkillChainMul * critGoldMul * greedGoldMul * revengeGoldMul * arenaMul * treasureHunterMul * goldStreakMul * comboGoldMul2 * comboMilestoneMul * fullHpGoldMul * eliteGoldMul * goldCascadeMul * villageBlessMul * bossGoldMul * dangerScaleMul * treasureHoardMul2 * comboGoldHighMul * killStreakGoldMul * goldHarvestMul * prestigeGoldMul2 * waveFinisherMul * doubleGoldMul * critGoldBonusMul * waveGoldSurgeMul * critChainGoldMul * prestigeGoldMul3 * dangerPrestigeMul * waveGoldCascadeMul * comboGoldEscMul * dangerMasteryMul * dangerGoldStreakMul * dangerStreakCompoundMul * eliteGoldChainMul * waveAccumulatorMul * overkillChainExtraMul * bossGoldCascadeMul * prestigeGoldCascadeMul * deathGoldCompoundMul * comboGoldVelocityMul * prestigeDangerGoldMul * critGoldMasteryMul * comboDangerSynergyMul * dangerGoldMasteryMul * eliteGoldMasteryMul * prestigeGoldMomentumMul * critGoldCascadeMul2 * comboPrestigeGoldMul * waveGoldSurgeScale * eliteGoldCascadeMul2 * finalMasteryGoldMul * fullHpFortuneMul * eliteHunterMul * goldenHourGoldMul * rushHourGoldMul * miserPouchGoldMul) + levelMilestoneGold + critGoldFlat + bossTrophyGold;
      // Safety cap: prevent gold overflow
      const goldEarned = Math.min(goldEarnedRaw, hero.level * 5000);
      // C328: combo gold floor
      const goldFloor = this.comboStreak >= COMBO_GOLD_FLOOR_THRESHOLD ? hero.level * COMBO_GOLD_FLOOR_PER_LEVEL : 0;
      hero.gold += Math.max(goldEarned, goldFloor);
      // C502: greed gambit — high gold slows gold gain (trade-off for exp bonus)
      if (hero.gold > GREED_GAMBIT_GOLD_THRESHOLD) {
        hero.gold -= Math.floor(goldEarned * GREED_GAMBIT_GOLD_PENALTY);
      }
      // C504: sacrifice gold for exp — spend gold to level faster
      if (hero.gold > 100) {
        const sacrificeGold = Math.floor(hero.gold * SACRIFICE_GOLD_RATE);
        hero.gold -= sacrificeGold;
        hero.gainExp(sacrificeGold * SACRIFICE_GOLD_EXP_RATIO);
      }
      // C507: combo tax — high combo takes gold but gives reward multiplier
      if (this.comboStreak >= COMBO_TAX_THRESHOLD) {
        const comboTax = Math.floor(hero.gold * COMBO_TAX_RATE);
        hero.gold -= comboTax;
        hero.gainExp(Math.floor(comboTax * COMBO_TAX_REWARD_MUL * 10));
      }
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
        // C556: Hourglass relic doubles temporal durations
        this.goldenHourRemaining = GOLDEN_HOUR_DURATION * (this.hasRelic(3) ? HOURGLASS_DURATION_MUL : 1);
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
      // C551-C552: Relic drop — chance after elite/boss kills
      if (this.relics.length < 3) {
        const relicChance = isElite ? RELIC_DROP_CHANCE_ELITE : (isBoss ? RELIC_DROP_CHANCE_BOSS : 0);
        if (relicChance > 0 && this.rng.chance(relicChance)) {
          const available = [0, 1, 2, 3, 4, 5].filter(id => !this.relics.includes(id));
          if (available.length > 0) {
            const newRelic = available[this.rng.int(available.length)];
            this.relics.push(newRelic);
            this.relicLevels.push(1);
          }
        }
      }
      // C557: Relic upgrade — duplicate drops upgrade existing relic
      if (this.relics.length >= 3 && isElite && this.rng.chance(RELIC_UPGRADE_CHANCE)) {
        const upgradeIdx = this.rng.int(this.relics.length);
        this.relicLevels[upgradeIdx] = Math.min((this.relicLevels[upgradeIdx] || 1) + 1, 5);
      }
      // === C561-C570: Event Encounters (post-combat) ===
      let eventTriggered = false;
      const eventsEnabled = this.totalFights > 20; // events start after 20 fights
      // C567: cursed altar tick
      if (this.cursedAltarRemaining > 0) this.cursedAltarRemaining--;
      if (this.cursedAltarRemaining === 0) this.cursedAltarAtkBuff = false;
      // C568: fairy blessing tick
      if (this.fairyBlessingRemaining > 0) this.fairyBlessingRemaining--;
      // C563: Trap encounter
      if (eventsEnabled && !eventTriggered && this.rng.chance(TRAP_CHANCE)) {
        if (this.comboStreak >= TRAP_AVOID_COMBO) {
          events.push({ type: 'event_trap_avoided' });
        } else {
          const trapChoice = this.rng.int(2);
          if (trapChoice === 0) { hero.hp = Math.max(1, hero.hp - Math.floor(hero.hpMax * TRAP_DAMAGE)); }
          else { hero.gold = Math.max(0, hero.gold - TRAP_GOLD_LOSS); }
          events.push({ type: 'event_trap' });
        }
        eventTriggered = true;
      }
      // C562: Treasure shrine (C579: player choice if strategy enabled)
      if (eventsEnabled && !eventTriggered && this.rng.chance(TREASURE_SHRINE_CHANCE)) {
        if (this.pendingShrineChoice === -1) {
          // Signal pending choice — will be resolved next encounter
          this.pendingShrineChoice = 0; // default to gold if not chosen
          events.push({ type: 'event_treasure_shrine_pending' });
        } else {
          const choice = this.pendingShrineChoice;
          this.pendingShrineChoice = -1;
          // C582: scale shrine rewards with level (critic feedback: fixed values meaningless late-game)
          const shrineGold = Math.max(SHRINE_GOLD_BURST, hero.level * 50);
          const shrineExp = Math.max(SHRINE_EXP_BURST, hero.level * 30);
          if (choice === 0) hero.gold += shrineGold;
          else if (choice === 1) hero.gainExp(shrineExp);
          else hero.heal(Math.floor(hero.hpMax * SHRINE_HEAL_AMOUNT));
          events.push({ type: 'event_treasure_shrine', choice });
        }
        eventTriggered = true;
      }
      // C564: Rest shrine — full heal but reset combo (C575: player toggle)
      if (eventsEnabled && !eventTriggered && getStrategyEnabled('restShrine') && this.rng.chance(REST_SHRINE_CHANCE) && hero.hp < hero.hpMax * 0.3) {
        hero.hp = hero.hpMax;
        this.comboStreak = 0;
        events.push({ type: 'event_rest_shrine' });
        eventTriggered = true;
      }
      // C565: Gambler — double or nothing (C575: player toggle)
      if (eventsEnabled && !eventTriggered && getStrategyEnabled('gambler') && this.rng.chance(GAMBLER_CHANCE) && hero.gold >= 50) {
        if (this.rng.chance(GAMBLER_WIN_RATE)) { hero.gold *= 2; }
        else { hero.gold = Math.floor(hero.gold * 0.5); }
        events.push({ type: 'event_gambler' });
        eventTriggered = true;
      }
      // C566: Blacksmith — boost weapon ATK (C575: player toggle)
      if (eventsEnabled && !eventTriggered && getStrategyEnabled('blacksmith') && this.rng.chance(BLACKSMITH_CHANCE)) {
        hero.atk += BLACKSMITH_BOOST;
        events.push({ type: 'event_blacksmith' });
        eventTriggered = true;
      }
      // C567: Cursed altar — massive ATK buff + curse (C575: player toggle)
      if (eventsEnabled && !eventTriggered && getStrategyEnabled('cursedAltar') && this.rng.chance(CURSED_ALTAR_CHANCE) && !this.cursedAltarAtkBuff) {
        this.cursedAltarAtkBuff = true;
        this.cursedAltarRemaining = CURSED_ALTAR_DURATION;
        events.push({ type: 'event_cursed_altar' });
        eventTriggered = true;
      }
      // C568: Fairy blessing — guaranteed drops
      if (eventsEnabled && !eventTriggered && this.rng.chance(FAIRY_CHANCE)) {
        this.fairyBlessingRemaining = FAIRY_DURATION;
        events.push({ type: 'event_fairy' });
        eventTriggered = true;
      }
      // C569: Time rift — reset fatigue
      if (eventsEnabled && !eventTriggered && this.rng.chance(TIME_RIFT_CHANCE) && this.fightsSinceVillage > 50) {
        this.fightsSinceVillage = 0;
        events.push({ type: 'event_time_rift' });
        eventTriggered = true;
      }
      // C561: Wandering Merchant — buy a relic for gold
      if (!eventTriggered && !isElite && !isBoss && this.rng.chance(MERCHANT_EVENT_CHANCE) && hero.gold >= 200 && this.relics.length < 3) {
        const available = [0, 1, 2, 3, 4, 5].filter(id => !this.relics.includes(id));
        if (available.length > 0) {
          const offered = available[this.rng.int(available.length)];
          const cost = 200 * MERCHANT_PRICE_MUL;
          if (hero.gold >= cost) {
            hero.gold -= cost;
            this.relics.push(offered);
            this.relicLevels.push(1);
            events.push({ type: 'event_merchant', relicId: offered });
            eventTriggered = true;
          }
        }
      }
      // C570: Event chain — consecutive events → mega reward
      if (eventTriggered) {
        this.eventChainCount++;
        if (this.eventChainCount >= EVENT_CHAIN_THRESHOLD) {
          hero.gainExp(EVENT_CHAIN_REWARD_EXP);
          hero.gold += EVENT_CHAIN_REWARD_GOLD;
          events.push({ type: 'event_chain_reward' });
          this.eventChainCount = 0;
        }
      } else {
        this.eventChainCount = 0;
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
      // C468: village gold scaling — village gold scales with prestige
      hero.gold += Math.floor(VILLAGE_GOLD_FOUNTAIN * this.prestigeCount * VILLAGE_GOLD_PRESTIGE_SCALE);
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
      // C478: village exp scaling — village exp scales with prestige
      hero.gainExp(Math.floor(hero.level * this.prestigeCount * VILLAGE_EXP_PRESTIGE_SCALE));
      // C488: village ATK training — grant temp ATK boost
      this.villageAtkTrainingRemaining = VILLAGE_ATK_TRAINING_DURATION;
      // C497: prestige gold burst — prestige grants gold burst at village
      hero.gold += this.prestigeCount * PRESTIGE_GOLD_BURST_PER_PRESTIGE;
      // C499: village danger reset — village clears danger penalty
      this.dangerFights = Math.max(0, this.dangerFights - 5);
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
