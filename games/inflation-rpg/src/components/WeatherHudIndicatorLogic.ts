/**
 * C725: WeatherHudIndicatorLogic — pure logic for weather/night badge display.
 * No React dependency.
 */
import type { Weather } from '../overworld/encounter/WeatherSystem';

export interface WeatherDisplayInput {
  weather: Weather;
  isNight?: boolean;
}

export interface WeatherDisplayResult {
  icon: string;
  label: string;
}

export function getWeatherDisplay(input: WeatherDisplayInput): WeatherDisplayResult | null {
  // Active weather takes priority over night indicator
  switch (input.weather) {
    case 'rain':
      return { icon: '🌧️', label: 'Dodge +5%' };
    case 'wind':
      return { icon: '💨', label: 'EXP +10%' };
    case 'fog':
      return { icon: '🌫️', label: 'ATK −10%, Crit −30%' };
    case 'storm':
      return { icon: '⛈️', label: 'Crit −40%' };
    case 'snow':
      return { icon: '❄️', label: 'Speed −15%' };
    case 'normal':
    default:
      // C735: Night indicator when no active weather
      if (input.isNight) return { icon: '🌙', label: 'Night: EXP ×2' };
      return null;
  }
}
