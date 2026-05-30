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
  windGaleRemaining: number;
  snowDriftRemaining: number;
  abyssalConvergenceRemaining: number;
  temporalFissureRemaining: number;
  titanArenaRemaining: number;
  eventMomentumAtkRemaining: number;
  eventMomentumDensityRemaining: number;
}

export interface HudBadge {
  type: 'weather' | 'trait' | 'inspiration' | 'event';
  icon: string;
  label: string;
}

// C794: Declarative event badge registry — add new events here (1 line each)
const EVENT_BADGE_REGISTRY: Array<{ key: keyof ActiveEventState; icon: string; label: string }> = [
  { key: 'trialGroundsRemaining', icon: '⚔️', label: '시련장' },
  { key: 'colosseumRemaining', icon: '🏟️', label: '투기장' },
  { key: 'voidRiftRemaining', icon: '🌀', label: '공허균열' },
  { key: 'stormNexusRemaining', icon: '⛈️', label: '폭풍핵' },
  { key: 'rainSanctuaryRemaining', icon: '🌧️', label: '비의 성소' },
  { key: 'fogAmbushRemaining', icon: '🌫️', label: '안개 매복' },
  { key: 'windGaleRemaining', icon: '🌬️', label: '질풍' },
  { key: 'snowDriftRemaining', icon: '❄️', label: '눈보라' },
  { key: 'abyssalConvergenceRemaining', icon: '🌊', label: '심연 수렴' },
  { key: 'temporalFissureRemaining', icon: '⏳', label: '시간 균열' },
  { key: 'titanArenaRemaining', icon: '🏛️', label: '타이탄 투기장' },
  { key: 'eventMomentumAtkRemaining', icon: '🔥', label: '기세 ATK' },
  { key: 'eventMomentumDensityRemaining', icon: '🌀', label: '기세 밀도' },
];

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

  // Active gated events — data-driven
  if (input.activeEvents) {
    for (const entry of EVENT_BADGE_REGISTRY) {
      const remaining = input.activeEvents[entry.key];
      if (remaining > 0) {
        badges.push({ type: 'event', icon: entry.icon, label: `${entry.label} (${remaining})` });
      }
    }
  }

  return badges;
}
