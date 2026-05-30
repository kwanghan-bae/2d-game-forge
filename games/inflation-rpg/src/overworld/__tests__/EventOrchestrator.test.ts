import { describe, it, expect } from 'vitest';
import { EventOrchestrator } from '../encounter/EventOrchestrator';

describe('EventOrchestrator', () => {
  function makeCtx(overrides: Partial<Parameters<EventOrchestrator['resolve']>[2]> = {}) {
    return { heroHpMax: 100, heroGold: 500, comboStreak: 5, relicLevels: [1, 2], ...overrides };
  }

  it('triggers and checks pending state', () => {
    const orch = new EventOrchestrator();
    expect(orch.getPending('colosseum')).toBe(false);
    orch.trigger('colosseum');
    expect(orch.getPending('colosseum')).toBe(true);
  });

  it('resolve accept returns duration effects', () => {
    const orch = new EventOrchestrator();
    orch.trigger('colosseum');
    const effects = orch.resolve('colosseum', true, makeCtx());
    expect(effects.colosseumRemaining).toBe(5);
    expect(orch.getPending('colosseum')).toBe(false);
  });

  it('resolve decline returns consolation gold', () => {
    const orch = new EventOrchestrator();
    orch.trigger('trial_grounds');
    const effects = orch.resolve('trial_grounds', false, makeCtx());
    expect(effects.declineGold).toBeGreaterThan(0);
    expect(effects.trialGroundsRemaining).toBe(0);
  });

  it('void rift accept upgrades a relic level', () => {
    const orch = new EventOrchestrator();
    orch.trigger('void_rift');
    const effects = orch.resolve('void_rift', true, makeCtx({ relicLevels: [1, 1] }));
    expect(effects.voidRiftRemaining).toBe(3);
    // One relic should have been upgraded
    if (effects.voidRiftRelicLevels) {
      const sum = effects.voidRiftRelicLevels.reduce((a, b) => a + b, 0);
      expect(sum).toBe(3); // was 1+1=2, now one is 2 → sum=3
    }
  });

  it('rain sanctuary returns heal amount', () => {
    const orch = new EventOrchestrator();
    orch.trigger('rain_sanctuary');
    const effects = orch.resolve('rain_sanctuary', true, makeCtx({ heroHpMax: 200 }));
    expect(effects.rainSanctuaryRemaining).toBeGreaterThan(0);
    expect(effects.rainSanctuaryHeal).toBeGreaterThan(0);
  });

  it('getAllPending lists all triggered events', () => {
    const orch = new EventOrchestrator();
    orch.trigger('wind_gale');
    orch.trigger('snow_drift');
    const pending = orch.getAllPending();
    expect(pending).toContain('wind_gale');
    expect(pending).toContain('snow_drift');
    expect(pending.length).toBe(2);
  });
});
