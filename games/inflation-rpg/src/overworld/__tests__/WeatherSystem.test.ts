import { describe, test, expect } from 'vitest';
import { rollWeather, type Weather } from '../encounter/WeatherSystem';
import {
  WEATHER_CHANCE,
  WEATHER_RAIN_ATK_PENALTY,
  WEATHER_WIND_EXP_BONUS,
  WEATHER_FOG_CRIT_PENALTY,
} from '../encounter/constants';

describe('WeatherSystem', () => {
  test('no weather when chance fails', () => {
    const result = rollWeather(() => false, () => 0);
    expect(result.weather).toBe('normal');
    expect(result.atkMul).toBe(1);
    expect(result.critMul).toBe(1);
    expect(result.expMul).toBe(1);
  });

  test('rain reduces ATK multiplier', () => {
    const result = rollWeather(() => true, () => 0); // rain = index 0
    expect(result.weather).toBe('rain');
    expect(result.atkMul).toBeCloseTo(1 - WEATHER_RAIN_ATK_PENALTY);
    expect(result.critMul).toBe(1);
    expect(result.expMul).toBe(1);
  });

  test('wind increases EXP multiplier', () => {
    const result = rollWeather(() => true, () => 1); // wind = index 1
    expect(result.weather).toBe('wind');
    expect(result.atkMul).toBe(1);
    expect(result.expMul).toBeCloseTo(1 + WEATHER_WIND_EXP_BONUS);
    expect(result.critMul).toBe(1);
  });

  test('fog reduces crit multiplier', () => {
    const result = rollWeather(() => true, () => 2); // fog = index 2
    expect(result.weather).toBe('fog');
    expect(result.critMul).toBe(WEATHER_FOG_CRIT_PENALTY);
    expect(result.atkMul).toBe(1);
    expect(result.expMul).toBe(1);
  });
});
