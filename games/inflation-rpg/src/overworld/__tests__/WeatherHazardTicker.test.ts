import { describe, it, expect, vi } from 'vitest';
import { tickWeatherHazards } from '../encounter/WeatherHazardTicker';

function makeState(overrides: Partial<Parameters<typeof tickWeatherHazards>[0]> = {}) {
  return {
    stormNexusRemaining: 0,
    abyssalConvergenceRemaining: 0,
    temporalFissureRemaining: 0,
    temporalFissureStoredExp: 0,
    goldCrucibleRemaining: 0,
    goldCrucibleAtkFlat: 0,
    ...overrides,
  };
}

function makeHero(hp = 1000, hpMax = 1000) {
  return { hp, hpMax, gainExp: vi.fn() };
}

describe('WeatherHazardTicker', () => {
  it('storm nexus drains HP and emits storm_drain event', () => {
    const state = makeState({ stormNexusRemaining: 3 });
    const hero = makeHero(500, 1000);
    const events: unknown[] = [];
    const result = tickWeatherHazards(state, hero, events as never);
    expect(hero.hp).toBeLessThan(500);
    expect(result.stormNexusRemaining).toBe(2);
    expect(events).toHaveLength(1);
    expect((events[0] as { type: string }).type).toBe('storm_drain');
  });

  it('storm nexus emits storm_drain_critical when HP is low', () => {
    const state = makeState({ stormNexusRemaining: 1 });
    const hero = makeHero(50, 1000); // 5% HP
    const events: unknown[] = [];
    tickWeatherHazards(state, hero, events as never);
    expect((events[0] as { type: string }).type).toBe('storm_drain_critical');
  });

  it('storm nexus never kills hero (floor at 1)', () => {
    const state = makeState({ stormNexusRemaining: 1 });
    const hero = makeHero(1, 1000);
    const events: unknown[] = [];
    tickWeatherHazards(state, hero, events as never);
    expect(hero.hp).toBe(1);
  });

  it('abyssal convergence drains HP', () => {
    const state = makeState({ abyssalConvergenceRemaining: 2 });
    const hero = makeHero(800, 1000);
    const events: unknown[] = [];
    const result = tickWeatherHazards(state, hero, events as never);
    expect(hero.hp).toBeLessThan(800);
    expect(result.abyssalConvergenceRemaining).toBe(1);
  });

  it('temporal fissure pays back stored EXP on expiry', () => {
    const state = makeState({ temporalFissureRemaining: 1, temporalFissureStoredExp: 100 });
    const hero = makeHero();
    const events: unknown[] = [];
    const result = tickWeatherHazards(state, hero, events as never);
    expect(hero.gainExp).toHaveBeenCalledOnce();
    expect(result.temporalFissureStoredExp).toBe(0);
    expect(result.temporalFissureRemaining).toBe(0);
  });

  it('temporal fissure does nothing when still active', () => {
    const state = makeState({ temporalFissureRemaining: 3, temporalFissureStoredExp: 200 });
    const hero = makeHero();
    const events: unknown[] = [];
    const result = tickWeatherHazards(state, hero, events as never);
    expect(hero.gainExp).not.toHaveBeenCalled();
    expect(result.temporalFissureRemaining).toBe(2);
    expect(result.temporalFissureStoredExp).toBe(200);
  });

  it('gold crucible resets ATK flat on expiry', () => {
    const state = makeState({ goldCrucibleRemaining: 1, goldCrucibleAtkFlat: 50 });
    const hero = makeHero();
    const events: unknown[] = [];
    const result = tickWeatherHazards(state, hero, events as never);
    expect(result.goldCrucibleAtkFlat).toBe(0);
    expect(result.goldCrucibleRemaining).toBe(0);
  });

  it('no-op when all timers are zero', () => {
    const state = makeState();
    const hero = makeHero(500, 1000);
    const events: unknown[] = [];
    const result = tickWeatherHazards(state, hero, events as never);
    expect(hero.hp).toBe(500);
    expect(events).toHaveLength(0);
    expect(result).toEqual(state);
  });
});
