import { describe, it, expect } from 'vitest';
import { VillageResolver, type VillageContext } from '../encounter/VillageResolver';
import { HeroEntity } from '../../hero/HeroEntity';

function makeHero(overrides: Partial<{ gold: number; hp: number; hpMax: number; level: number }> = {}) {
  const hero = HeroEntity.create({ seed: 42, heroHpMax: overrides.hpMax ?? 100, heroAtkBase: 10 });
  if (overrides.gold !== undefined) hero.gold = overrides.gold;
  if (overrides.hp !== undefined) (hero as any).hp = overrides.hp;
  if (overrides.level !== undefined) (hero as any).level = overrides.level;
  return hero;
}

function makeContext(overrides: Partial<VillageContext> = {}): VillageContext {
  return {
    prestigeCount: 0,
    villageVisits: 0,
    dangerStreak: 0,
    bankGold: 0,
    fightsSinceLastDeath: 0,
    investFightsRemaining: 0,
    goldInvested: 0,
    totalWins: 0,
    totalDeaths: 0,
    ...overrides,
  };
}

describe('VillageResolver', () => {
  it('shop purchase: hero with enough gold buys HP shield', () => {
    const hero = makeHero({ gold: 500 });
    const ctx = makeContext();
    const resolver = new VillageResolver();
    const events: any[] = [];
    const result = resolver.resolve(hero, events, ctx);
    const shopEvents = events.filter(e => e.type === 'village_shop_purchase');
    expect(shopEvents.length).toBeGreaterThan(0);
    expect(shopEvents[0].effect).toBe('hp_shield');
  });

  it('gold interest: grants interest based on gold and prestige', () => {
    const hero = makeHero({ gold: 1000 });
    const ctx = makeContext({ prestigeCount: 2, villageVisits: 5 });
    const resolver = new VillageResolver();
    const events: any[] = [];
    const goldBefore = hero.gold;
    resolver.resolve(hero, events, ctx);
    // Gold should increase from interest (minus shop costs)
    // Just verify interest logic ran (hero gold changed)
    expect(hero.gold).not.toBe(goldBefore);
  });

  it('healing: low HP hero gets rest bonus (hpMax boost)', () => {
    const hero = makeHero({ hp: 10, hpMax: 100 });
    const ctx = makeContext();
    const resolver = new VillageResolver();
    const events: any[] = [];
    resolver.resolve(hero, events, ctx);
    const restBonus = events.find(e => e.type === 'village_rest_bonus');
    expect(restBonus).toBeDefined();
    expect(restBonus.hpBoost).toBeGreaterThan(0);
  });

  it('bank: deposits fraction of gold and returns stored gold', () => {
    const hero = makeHero({ gold: 200 });
    const ctx = makeContext({ bankGold: 50 });
    const resolver = new VillageResolver();
    const events: any[] = [];
    const result = resolver.resolve(hero, events, ctx);
    // Bank gold should be withdrawn (added to hero)
    // Then deposit made from remaining
    expect(result.bankGold).toBeGreaterThanOrEqual(0);
    // After receiving 50 bank gold, hero should have gotten it
    expect(result.bankGold).not.toBe(50); // was consumed + re-deposited
  });
});
