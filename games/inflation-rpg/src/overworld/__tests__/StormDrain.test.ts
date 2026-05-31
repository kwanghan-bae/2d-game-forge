import { describe, it, expect } from 'vitest';
import { EncounterEngine } from '../EncounterEngine';
import { STORM_NEXUS_HP_DRAIN_RATE, STORM_DRAIN_WARN_HP_THRESHOLD } from '../encounter/constants';

function makeEngine() {
  return new EncounterEngine({ totalFights: 0, heroLevel: 10 } as any);
}

describe('Storm Drain event emission (C863)', () => {
  it('emits storm_drain when stormNexus active and HP > 40%', () => {
    const engine = makeEngine();
    // Manually set storm nexus active
    (engine as any).stormNexusRemaining = 2;
    const hero = { hp: 100, hpMax: 100, level: 10, atk: 10 };
    const events: any[] = [];
    (engine as any).tickWeatherHazards(hero, events);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('storm_drain');
    expect(events[0].value).toBe(Math.floor(100 * STORM_NEXUS_HP_DRAIN_RATE));
    expect(events[0].hpAfter).toBe(hero.hp);
  });

  it('emits storm_drain_critical when HP falls below threshold', () => {
    const engine = makeEngine();
    (engine as any).stormNexusRemaining = 2;
    const hero = { hp: 35, hpMax: 100, level: 10, atk: 10 };
    const events: any[] = [];
    (engine as any).tickWeatherHazards(hero, events);
    expect(events[0].type).toBe('storm_drain_critical');
  });

  it('does not emit when stormNexus inactive', () => {
    const engine = makeEngine();
    (engine as any).stormNexusRemaining = 0;
    const hero = { hp: 100, hpMax: 100, level: 10, atk: 10 };
    const events: any[] = [];
    (engine as any).tickWeatherHazards(hero, events);
    const stormEvents = events.filter((e: any) => e.type?.startsWith('storm_drain'));
    expect(stormEvents).toHaveLength(0);
  });

  it('decrements stormNexusRemaining after drain', () => {
    const engine = makeEngine();
    (engine as any).stormNexusRemaining = 1;
    const hero = { hp: 100, hpMax: 100, level: 10, atk: 10 };
    const events: any[] = [];
    (engine as any).tickWeatherHazards(hero, events);
    expect((engine as any).stormNexusRemaining).toBe(0);
  });
});
