/**
 * C703: WeatherSystem — pure weather roll and multiplier computation.
 * C706: Added NightSystem (isNight check) for environment context.
 * Extracted from EncounterEngine L459-468.
 */
import {
  WEATHER_CHANCE,
  WEATHER_RAIN_ATK_PENALTY,
  WEATHER_WIND_EXP_BONUS,
  WEATHER_FOG_CRIT_PENALTY,
  NIGHT_CYCLE_INTERVAL,
  NIGHT_DURATION,
  NIGHT_EXP_MUL,
  NIGHT_ENEMY_DMG_MUL,
} from './constants';

export type Weather = 'normal' | 'rain' | 'wind' | 'fog' | 'storm' | 'snow';

export interface WeatherResult {
  weather: Weather;
  atkMul: number;
  critMul: number;
  expMul: number;
  dodgeMul: number;
  speedMul: number;
}

export interface EnvironmentResult {
  weather: WeatherResult;
  isNight: boolean;
  nightExpMul: number;
  nightDmgMul: number;
}

// C723: weather combat effects
const WEATHER_RAIN_DODGE_BONUS = 0.05;
const WEATHER_FOG_SPEED_PENALTY = 0.10;
// C742: storm/snow effects
const WEATHER_STORM_CRIT_PENALTY = 0.75; // C781: tuned from 0.60 (crit-build nerf -40%→-25%)
const WEATHER_SNOW_SPEED_PENALTY = 0.15;

/**
 * Roll weather for a fight.
 */
export function rollWeather(
  chance: (rate: number) => boolean,
  rollInt: (n: number) => number,
): WeatherResult {
  let weather: Weather = 'normal';
  if (chance(WEATHER_CHANCE)) {
    weather = (['rain', 'wind', 'fog', 'storm', 'snow'] as const)[rollInt(5)];
  }
  return {
    weather,
    atkMul: weather === 'rain' ? (1 - WEATHER_RAIN_ATK_PENALTY) : 1,
    critMul: weather === 'fog' ? WEATHER_FOG_CRIT_PENALTY
      : weather === 'storm' ? WEATHER_STORM_CRIT_PENALTY : 1,
    expMul: weather === 'wind' ? (1 + WEATHER_WIND_EXP_BONUS) : 1,
    dodgeMul: weather === 'rain' ? (1 + WEATHER_RAIN_DODGE_BONUS) : 1,
    speedMul: weather === 'fog' ? (1 - WEATHER_FOG_SPEED_PENALTY)
      : weather === 'snow' ? (1 - WEATHER_SNOW_SPEED_PENALTY) : 1,
  };
}

/**
 * Compute night mode status based on total wins.
 */
export function computeNight(totalWins: number): { isNight: boolean; nightExpMul: number; nightDmgMul: number } {
  const fightInCycle = totalWins % NIGHT_CYCLE_INTERVAL;
  const isNight = fightInCycle >= (NIGHT_CYCLE_INTERVAL - NIGHT_DURATION);
  return {
    isNight,
    nightExpMul: isNight ? NIGHT_EXP_MUL : 1,
    nightDmgMul: isNight ? NIGHT_ENEMY_DMG_MUL : 1,
  };
}

/**
 * Compute full environment state (weather + night) for a fight.
 */
export function computeEnvironment(
  totalWins: number,
  chance: (rate: number) => boolean,
  rollInt: (n: number) => number,
): EnvironmentResult {
  const weather = rollWeather(chance, rollInt);
  const night = computeNight(totalWins);
  return { weather, ...night };
}


/**
 * C807: WeatherSubsystem — stateful wrapper for weather duration + re-roll logic.
 * Extracts weather state management from EncounterEngine.
 */
export class WeatherSubsystem {
  private current: Weather = 'normal';
  private remaining = 0;

  /** Advance weather state for one fight. Returns current weather result. */
  advance(
    chance: (rate: number) => boolean,
    rollInt: (n: number) => number,
    durationMin: number,
    durationMax: number,
  ): WeatherResult {
    if (this.remaining > 0) {
      this.remaining--;
      // Return current weather's effects
      return rollWeather(() => true, () => (['rain', 'wind', 'fog', 'storm', 'snow'] as const).indexOf(this.current as any));
    }
    // Roll new weather
    const result = rollWeather(chance, rollInt);
    this.current = result.weather;
    if (result.weather !== 'normal') {
      this.remaining = durationMin + rollInt(durationMax - durationMin + 1) - 1;
    }
    return result;
  }

  getCurrent(): Weather { return this.current; }
  getRemaining(): number { return this.remaining; }

  /** Reset on death or run end */
  reset(): void {
    this.current = 'normal';
    this.remaining = 0;
  }
}
