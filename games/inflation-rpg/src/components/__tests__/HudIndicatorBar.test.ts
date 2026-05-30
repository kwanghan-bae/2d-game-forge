import { describe, it, expect } from 'vitest';
import { buildHudIndicators } from '../HudIndicatorBar';
import type { TraitId } from '../../cycle/traits';

describe('HudIndicatorBar', () => {
  it('returns empty when all inactive', () => {
    const result = buildHudIndicators({
      weather: 'normal',
      isNight: false,
      influencingTraits: [],
      inspirationRemaining: 0,
    });
    expect(result).toEqual([]);
  });

  it('shows weather badge only', () => {
    const result = buildHudIndicators({
      weather: 'rain',
      isNight: false,
      influencingTraits: [],
      inspirationRemaining: 0,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: 'weather', icon: '🌧️', label: 'Dodge +5%' });
  });

  it('shows trait badges only', () => {
    const traits: TraitId[] = ['t_challenge', 't_swift'];
    const result = buildHudIndicators({
      weather: 'normal',
      isNight: false,
      influencingTraits: traits,
      inspirationRemaining: 0,
    });
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('trait');
    expect(result[1].type).toBe('trait');
  });

  it('shows inspiration badge with remaining count', () => {
    const result = buildHudIndicators({
      weather: 'normal',
      isNight: false,
      influencingTraits: [],
      inspirationRemaining: 5,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: 'inspiration', icon: '✨', label: 'ATK +15% (5)' });
  });

  it('composes all badge types together', () => {
    const result = buildHudIndicators({
      weather: 'storm',
      isNight: false,
      influencingTraits: ['t_berserker' as TraitId],
      inspirationRemaining: 3,
    });
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('weather');
    expect(result[1].type).toBe('trait');
    expect(result[2].type).toBe('inspiration');
  });

  it('shows night badge when weather is normal and isNight', () => {
    const result = buildHudIndicators({
      weather: 'normal',
      isNight: true,
      influencingTraits: [],
      inspirationRemaining: 0,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: 'weather', icon: '🌙', label: 'Night: EXP ×2' });
  });

  it('shows event badges for active trial/colosseum/voidRift', () => {
    const result = buildHudIndicators({
      weather: 'normal',
      isNight: false,
      influencingTraits: [],
      inspirationRemaining: 0,
      activeEvents: { trialGroundsRemaining: 2, colosseumRemaining: 0, voidRiftRemaining: 1 },
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: 'event', icon: '⚔️', label: '시련장 (2)' });
    expect(result[1]).toEqual({ type: 'event', icon: '🌀', label: '공허균열 (1)' });
  });

  it('shows no event badges when all events are zero', () => {
    const result = buildHudIndicators({
      weather: 'normal',
      isNight: false,
      influencingTraits: [],
      inspirationRemaining: 0,
      activeEvents: { trialGroundsRemaining: 0, colosseumRemaining: 0, voidRiftRemaining: 0 },
    });
    expect(result).toHaveLength(0);
  });
});
