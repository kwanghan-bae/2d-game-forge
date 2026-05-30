/**
 * C703: WeatherSystem — pure weather roll and multiplier computation.
 * Extracted from EncounterEngine L459-467.
 */
import {
  WEATHER_CHANCE,
  WEATHER_RAIN_ATK_PENALTY,
  WEATHER_WIND_EXP_BONUS,
  WEATHER_FOG_CRIT_PENALTY,
} from './constants';

export type Weather = 'normal' | 'rain' | 'wind' | 'fog';

export interface WeatherResult {
  weather: Weather;
  atkMul: number;
  critMul: number;
  expMul: number;
}

/**
 * Roll weather for a fight.
 * @param chance - rng function returning true/false for WEATHER_CHANCE
 * @param rollInt - rng function returning 0-2 for weather type
 */
export function rollWeather(
  chance: (rate: number) => boolean,
  rollInt: (n: number) => number,
): WeatherResult {
  let weather: Weather = 'normal';
  if (chance(WEATHER_CHANCE)) {
    weather = (['rain', 'wind', 'fog'] as const)[rollInt(3)];
  }
  return {
    weather,
    atkMul: weather === 'rain' ? (1 - WEATHER_RAIN_ATK_PENALTY) : 1,
    critMul: weather === 'fog' ? WEATHER_FOG_CRIT_PENALTY : 1,
    expMul: weather === 'wind' ? (1 + WEATHER_WIND_EXP_BONUS) : 1,
  };
}
