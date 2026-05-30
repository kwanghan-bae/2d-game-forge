/**
 * C746: ConstantPhaseProfile — classifies game constants by phase relevance.
 * Pure lookup module. No runtime behavior change.
 */

export type PhaseProfile = 'early' | 'mid' | 'late' | 'all-run' | 'unknown';

const PHASE_MAP: Record<string, PhaseProfile> = {
  // Early-game constants (active from fight 1, lose relevance mid-game)
  TRAP_CHANCE: 'early',
  TRAP_DAMAGE: 'early',
  TRAP_GOLD_LOSS: 'early',
  TRAP_AVOID_COMBO: 'early',

  // Mid-game constants (gates or effects that activate mid-run)
  HEALER_MIN_FIGHTS: 'mid',
  HEALER_EVENT_CHANCE: 'mid',
  HEALER_HEAL_RATE: 'mid',
  ECHO_MIN_LEVEL: 'mid',
  ECHO_EVENT_CHANCE: 'mid',
  ECHO_DURATION: 'mid',
  INSPIRATION_EVENT_CHANCE: 'mid',
  INSPIRATION_ATK_BONUS: 'mid',
  GOLDEN_HOUR_INTERVAL: 'mid',
  FATIGUE_ONSET: 'mid',

  // Late-game constants (prestige, high-level scaling)
  PRESTIGE_LEVEL_REQUIREMENT: 'late',
  PRESTIGE_STAT_BONUS: 'late',
  PRESTIGE_LEVEL_INCREMENT: 'late',

  // All-run constants (always active regardless of phase)
  NIGHT_CYCLE_INTERVAL: 'all-run',
  NIGHT_DURATION: 'all-run',
  NIGHT_EXP_MUL: 'all-run',
  NIGHT_ENEMY_DMG_MUL: 'all-run',
  EVENT_PITY_THRESHOLD: 'all-run',
  WEATHER_CHANCE: 'all-run',
  WEATHER_RAIN_ATK_PENALTY: 'all-run',
  WEATHER_WIND_EXP_BONUS: 'all-run',
  WEATHER_FOG_CRIT_PENALTY: 'all-run',
  BOSS_ENRAGE_HP_THRESHOLD: 'all-run',
  CRIT_CHANCE: 'all-run',
  CRIT_DAMAGE_MUL: 'all-run',
};

export function getConstantProfile(name: string): PhaseProfile {
  return PHASE_MAP[name] ?? 'unknown';
}

/**
 * C751: Phase-aware inspiration configuration.
 * Returns duration and min-fights gate based on current totalFights bracket.
 */
export interface InspirationPhaseConfig {
  duration: number;
  minFights: number;
}

export function getInspirationConfig(totalFights: number): InspirationPhaseConfig {
  // Late-game (200+ fights): longer buff, same gate
  if (totalFights >= 200) return { duration: 10, minFights: 40 };
  // Mid-game (80+ fights): standard
  if (totalFights >= 80) return { duration: 8, minFights: 40 };
  // Early-mid (< 80 fights): shorter buff, lower gate
  return { duration: 6, minFights: 30 };
}
