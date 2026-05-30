/**
 * C725: WeatherHudIndicatorLogic — pure logic for weather badge display.
 * No React dependency.
 */
import type { Weather } from '../overworld/encounter/WeatherSystem';

export interface WeatherDisplayInput {
  weather: Weather;
}

export interface WeatherDisplayResult {
  icon: string;
  label: string;
}

export function getWeatherDisplay(input: WeatherDisplayInput): WeatherDisplayResult | null {
  switch (input.weather) {
    case 'rain':
      return { icon: '🌧️', label: 'Dodge +5%' };
    case 'wind':
      return { icon: '💨', label: 'EXP +10%' };
    case 'fog':
      return { icon: '🌫️', label: 'ATK −10%, Crit −30%' };
    case 'normal':
    default:
      return null;
  }
}
