import { describe, test, expect } from 'vitest';
import { WEATHER_DURATION_MIN, WEATHER_DURATION_MAX } from '../encounter/constants';

/**
 * C777: Weather Duration System + Void Rift opt-in tests.
 */
describe('C777: Weather Duration System', () => {
  test('WEATHER_DURATION_MIN and MAX are sensible', () => {
    expect(WEATHER_DURATION_MIN).toBeGreaterThanOrEqual(2);
    expect(WEATHER_DURATION_MAX).toBeGreaterThanOrEqual(WEATHER_DURATION_MIN);
    expect(WEATHER_DURATION_MAX).toBeLessThanOrEqual(12);
  });

  test('weather duration range produces 3-8 fights of persistent weather', () => {
    // Verify the range: min=3, max=8
    expect(WEATHER_DURATION_MIN).toBe(3);
    expect(WEATHER_DURATION_MAX).toBe(8);
  });
});
