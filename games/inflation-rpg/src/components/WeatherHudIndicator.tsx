/**
 * C725: WeatherHudIndicator — shows current weather as a pill badge.
 * Only displays when weather is not normal.
 */
import { getWeatherDisplay } from './WeatherHudIndicatorLogic';
import type { Weather } from '../overworld/encounter/WeatherSystem';

interface WeatherHudIndicatorProps {
  weather: Weather;
}

export function WeatherHudIndicator({ weather }: WeatherHudIndicatorProps) {
  const display = getWeatherDisplay({ weather });
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
