/**
 * C725: WeatherHudIndicatorLogic test — pure logic for weather badge display.
 */
import { describe, it, expect } from 'vitest';
import { getWeatherDisplay, type WeatherDisplayInput } from '../../components/WeatherHudIndicatorLogic';

describe('WeatherHudIndicatorLogic', () => {
  it('returns null for normal weather', () => {
    const input: WeatherDisplayInput = { weather: 'normal' };
    expect(getWeatherDisplay(input)).toBeNull();
  });

  it('returns rain icon and dodge bonus label', () => {
    const result = getWeatherDisplay({ weather: 'rain' });
    expect(result).not.toBeNull();
    expect(result!.icon).toBe('🌧️');
    expect(result!.label).toContain('Dodge');
  });

  it('returns wind icon and EXP bonus label', () => {
    const result = getWeatherDisplay({ weather: 'wind' });
    expect(result).not.toBeNull();
    expect(result!.icon).toBe('💨');
    expect(result!.label).toContain('EXP');
  });

  it('returns fog icon and ATK/Crit penalty label', () => {
    const result = getWeatherDisplay({ weather: 'fog' });
    expect(result).not.toBeNull();
    expect(result!.icon).toBe('🌫️');
    expect(result!.label).toContain('ATK');
  });
});
