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

  // C735: Night indicator tests
  it('returns night icon and EXP mul when isNight=true, weather=normal', () => {
    const result = getWeatherDisplay({ weather: 'normal', isNight: true });
    expect(result).not.toBeNull();
    expect(result!.icon).toBe('🌙');
    expect(result!.label).toContain('Night');
    expect(result!.label).toContain('EXP');
  });

  it('returns weather display (not night) when weather is active', () => {
    // Weather takes priority; night is secondary
    const result = getWeatherDisplay({ weather: 'rain', isNight: true });
    expect(result).not.toBeNull();
    expect(result!.icon).toBe('🌧️');
  });

  it('returns null for normal weather with isNight=false', () => {
    expect(getWeatherDisplay({ weather: 'normal', isNight: false })).toBeNull();
  });
});
