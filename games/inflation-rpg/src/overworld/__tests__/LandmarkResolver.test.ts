import { describe, test, expect } from 'vitest';
import { LandmarkResolver, type LandmarkContext } from '../encounter/LandmarkResolver';

function makeMockContext(overrides?: Partial<LandmarkContext>): LandmarkContext {
  return {
    rngChance: () => false,
    rngInt: () => 0,
    shrineTithes: 0,
    incrementShrineTithes: () => {},
    setShrineBuffRemaining: () => {},
    setShrineBlessingRemaining: () => {},
    setDarknessCursed: () => {},
    ...overrides,
  };
}

describe('LandmarkResolver', () => {
  test('resolveShrine heals hero when meditation fails', () => {
    const ctx = makeMockContext({ rngChance: () => false });
    const resolver = new LandmarkResolver(ctx);
    const hero = { hp: 50, hpMax: 100, heal: (n: number) => { hero.hp = Math.min(hero.hpMax, hero.hp + n); }, gold: 100, personality: { adjust: () => {} } } as any;
    const events: any[] = [];
    resolver.resolveShrine(hero, 'shrine_1', events);
    expect(hero.hp).toBeGreaterThan(50);
    expect(events.some(e => e.type === 'shrine_visited')).toBe(true);
  });

  test('resolveShrine meditation path grants full heal and buff', () => {
    const ctx = makeMockContext({ rngChance: () => true });
    const setShrineBuffCalled: number[] = [];
    ctx.setShrineBuffRemaining = (n) => setShrineBuffCalled.push(n);
    const resolver = new LandmarkResolver(ctx);
    const hero = { hp: 50, hpMax: 100, heal: (n: number) => { hero.hp = Math.min(hero.hpMax, hero.hp + n); }, gold: 100, personality: { adjust: () => {} }, tickAge: () => {} } as any;
    const events: any[] = [];
    resolver.resolveShrine(hero, 'shrine_1', events);
    expect(events.some(e => e.type === 'meditation_done')).toBe(true);
    expect(setShrineBuffCalled.length).toBeGreaterThan(0);
  });

  test('resolveCave gives gold on treasure chance', () => {
    const ctx = makeMockContext({ rngChance: () => true, rngInt: () => 50 });
    const resolver = new LandmarkResolver(ctx);
    const hero = { gold: 100, personality: { get: () => 0, adjust: () => {} } } as any;
    const events: any[] = [];
    resolver.resolveCave(hero, events);
    expect(hero.gold).toBeGreaterThan(100);
    expect(events.some(e => e.type === 'lucky_treasure')).toBe(true);
  });

  test('resolveCave moral choice when no treasure', () => {
    const ctx = makeMockContext({ rngChance: () => false });
    const resolver = new LandmarkResolver(ctx);
    const hero = { gold: 100, personality: { get: () => 5, adjust: () => {} } } as any;
    const events: any[] = [];
    resolver.resolveCave(hero, events);
    expect(events.some(e => e.type === 'moral_choice')).toBe(true);
  });
});
