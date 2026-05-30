/**
 * C750: HudIndicatorBar — unified view-model composing weather, trait, and
 * inspiration badges into a single indicator array for the overworld HUD.
 * Pure logic, no React dependency.
 */
import type { Weather } from '../overworld/encounter/WeatherSystem';
import type { TraitId } from '../cycle/traits';
import { getWeatherDisplay, type WeatherDisplayResult } from './WeatherHudIndicatorLogic';
import { getTraitBadges, type TraitBadge } from './TraitInfluenceBadgeLogic';

export interface HudIndicatorInput {
  weather: Weather;
  isNight?: boolean;
  influencingTraits: readonly TraitId[];
  inspirationRemaining: number;
  activeEvents?: ActiveEventState;
}

export interface ActiveEventState {
  trialGroundsRemaining: number;
  colosseumRemaining: number;
  voidRiftRemaining: number;
  stormNexusRemaining: number;
  rainSanctuaryRemaining: number;
  fogAmbushRemaining: number;
}

export interface HudBadge {
  type: 'weather' | 'trait' | 'inspiration' | 'event';
  icon: string;
  label: string;
}

export function buildHudIndicators(input: HudIndicatorInput): HudBadge[] {
  const badges: HudBadge[] = [];

  // Weather / Night
  const weatherDisplay: WeatherDisplayResult | null = getWeatherDisplay({
    weather: input.weather,
    isNight: input.isNight,
  });
  if (weatherDisplay) {
    badges.push({ type: 'weather', icon: weatherDisplay.icon, label: weatherDisplay.label });
  }

  // Trait influence
  const traitBadges: TraitBadge[] = getTraitBadges(input.influencingTraits);
  for (const tb of traitBadges) {
    badges.push({ type: 'trait', icon: tb.emoji, label: tb.label });
  }

  // Inspiration buff
  if (input.inspirationRemaining > 0) {
    badges.push({
      type: 'inspiration',
      icon: '✨',
      label: `ATK +15% (${input.inspirationRemaining})`,
    });
  }

  // Active gated events
  if (input.activeEvents) {
    const { trialGroundsRemaining, colosseumRemaining, voidRiftRemaining, stormNexusRemaining, rainSanctuaryRemaining, fogAmbushRemaining } = input.activeEvents;
    if (trialGroundsRemaining > 0) {
      badges.push({ type: 'event', icon: '⚔️', label: `시련장 (${trialGroundsRemaining})` });
    }
    if (colosseumRemaining > 0) {
      badges.push({ type: 'event', icon: '🏟️', label: `투기장 (${colosseumRemaining})` });
    }
    if (voidRiftRemaining > 0) {
      badges.push({ type: 'event', icon: '🌀', label: `공허균열 (${voidRiftRemaining})` });
    }
    if (stormNexusRemaining > 0) {
      badges.push({ type: 'event', icon: '⛈️', label: `폭풍핵 (${stormNexusRemaining})` });
    }
    if (rainSanctuaryRemaining > 0) {
      badges.push({ type: 'event', icon: '🌧️', label: `비의 성소 (${rainSanctuaryRemaining})` });
    }
    if (fogAmbushRemaining > 0) {
      badges.push({ type: 'event', icon: '🌫️', label: `안개 매복 (${fogAmbushRemaining})` });
    }
  }

  return badges;
}
