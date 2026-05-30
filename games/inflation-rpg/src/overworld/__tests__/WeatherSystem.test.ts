import { describe, test, expect } from 'vitest';
import { rollWeather, computeNight, type Weather } from '../encounter/WeatherSystem';
import {
  WEATHER_CHANCE,
  WEATHER_RAIN_ATK_PENALTY,
  WEATHER_WIND_EXP_BONUS,
  WEATHER_FOG_CRIT_PENALTY,
  NIGHT_CYCLE_INTERVAL,
  NIGHT_DURATION,
  NIGHT_EXP_MUL,
  NIGHT_ENEMY_DMG_MUL,
} from '../encounter/constants';

describe('WeatherSystem', () => {
  test('no weather when chance fails', () => {
    const result = rollWeather(() => false, () => 0);
    expect(result.weather).toBe('normal');
    expect(result.atkMul).toBe(1);
    expect(result.critMul).toBe(1);
    expect(result.expMul).toBe(1);
    expect(result.dodgeMul).toBe(1);
    expect(result.speedMul).toBe(1);
  });

  test('rain reduces ATK multiplier and boosts dodge', () => {
    const result = rollWeather(() => true, () => 0); // rain = index 0
    expect(result.weather).toBe('rain');
    expect(result.atkMul).toBeCloseTo(1 - WEATHER_RAIN_ATK_PENALTY);
    expect(result.dodgeMul).toBeCloseTo(1.05);
    expect(result.critMul).toBe(1);
    expect(result.expMul).toBe(1);
    expect(result.speedMul).toBe(1);
  });

  test('wind increases EXP multiplier', () => {
    const result = rollWeather(() => true, () => 1); // wind = index 1
    expect(result.weather).toBe('wind');
    expect(result.atkMul).toBe(1);
    expect(result.expMul).toBeCloseTo(1 + WEATHER_WIND_EXP_BONUS);
    expect(result.critMul).toBe(1);
    expect(result.dodgeMul).toBe(1);
    expect(result.speedMul).toBe(1);
  });

  test('fog reduces crit multiplier and speed', () => {
    const result = rollWeather(() => true, () => 2); // fog = index 2
    expect(result.weather).toBe('fog');
    expect(result.critMul).toBe(WEATHER_FOG_CRIT_PENALTY);
    expect(result.speedMul).toBeCloseTo(0.90);
    expect(result.atkMul).toBe(1);
    expect(result.expMul).toBe(1);
    expect(result.dodgeMul).toBe(1);
  });

  // C781: fog crit penalty softened 0.70 → 0.80
  test('fog crit penalty is 0.80 (C781 rebalance)', () => {
    expect(WEATHER_FOG_CRIT_PENALTY).toBeCloseTo(0.80);
  });

  // C742: Storm/Snow weather
  test('storm reduces crit multiplier (index 3)', () => {
    const result = rollWeather(() => true, () => 3);
    expect(result.weather).toBe('storm');
    expect(result.critMul).toBeLessThan(1);
    expect(result.atkMul).toBe(1);
    expect(result.expMul).toBe(1);
    expect(result.speedMul).toBe(1);
  });

  test('snow reduces speed multiplier (index 4)', () => {
    const result = rollWeather(() => true, () => 4);
    expect(result.weather).toBe('snow');
    expect(result.speedMul).toBeLessThan(1);
    expect(result.atkMul).toBe(1);
    expect(result.critMul).toBe(1);
    expect(result.expMul).toBe(1);
  });
});

describe('computeNight', () => {
  test('daytime when fight is early in cycle', () => {
    const result = computeNight(5); // 5 % 20 = 5, < 15 threshold
    expect(result.isNight).toBe(false);
    expect(result.nightExpMul).toBe(1);
    expect(result.nightDmgMul).toBe(1);
  });

  test('night when fight is late in cycle', () => {
    // NIGHT_CYCLE_INTERVAL=20, NIGHT_DURATION=5 → night starts at fight 15 in cycle
    const result = computeNight(NIGHT_CYCLE_INTERVAL - NIGHT_DURATION); // fight 15
    expect(result.isNight).toBe(true);
    expect(result.nightExpMul).toBe(NIGHT_EXP_MUL);
    expect(result.nightDmgMul).toBe(NIGHT_ENEMY_DMG_MUL);
  });

  test('night wraps correctly at cycle boundary', () => {
    const result = computeNight(NIGHT_CYCLE_INTERVAL); // fight 20 → 20%20=0 → daytime
    expect(result.isNight).toBe(false);
  });
});

// C738: Night balance tuning — interval 20→25 (20% uptime), dmg 1.5→1.6
describe('C738 night balance constants', () => {
  test('NIGHT_CYCLE_INTERVAL = 25 (was 20)', () => {
    expect(NIGHT_CYCLE_INTERVAL).toBe(25);
  });

  test('NIGHT_ENEMY_DMG_MUL = 1.5 (C743 revert from 1.6)', () => {
    expect(NIGHT_ENEMY_DMG_MUL).toBe(1.5);
  });

  test('night uptime = NIGHT_DURATION / NIGHT_CYCLE_INTERVAL = 20%', () => {
    expect(NIGHT_DURATION / NIGHT_CYCLE_INTERVAL).toBeCloseTo(0.2, 2);
  });
});
