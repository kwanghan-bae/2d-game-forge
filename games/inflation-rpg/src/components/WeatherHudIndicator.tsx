/**
 * C725: WeatherHudIndicator — shows current weather/night as a pill badge.
 * Only displays when weather is not normal or during night.
 */
import { getWeatherDisplay } from './WeatherHudIndicatorLogic';
import type { Weather } from '../overworld/encounter/WeatherSystem';

interface WeatherHudIndicatorProps {
  weather: Weather;
  isNight?: boolean;
}

export function WeatherHudIndicator({ weather, isNight }: WeatherHudIndicatorProps) {
  const display = getWeatherDisplay({ weather, isNight });
  if (!display) return null;

  return (
    <span
      className="weather-hud-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '12px',
        background: 'rgba(0,0,0,0.6)',
        color: '#fff',
        fontSize: '0.75rem',
      }}
    >
      <span>{display.icon}</span>
      <span>{display.label}</span>
    </span>
  );
}
