import { describe, it, expect } from 'vitest';
import { isDungeonUnlocked } from './dungeons';
import type { MetaState, Dungeon } from '../types';

function makeMeta(overrides: Partial<MetaState> = {}): MetaState {
  return { ascTier: 0, ...overrides } as MetaState;
}

function mkDungeon(unlockGate: Dungeon['unlockGate']): Dungeon {
  return {
    id: 'test', nameKR: 'test', emoji: '🧪', themeColor: '#000',
    unlockGate, monsterPool: [], bossIds: { mini: 'm', major: 'M', sub: ['a','b','c'], final: 'f' },
    isHardOnly: false,
  };
}

describe('isDungeonUnlocked', () => {
  it('start: always true', () => {
    expect(isDungeonUnlocked(makeMeta({ ascTier: 0 }), mkDungeon({ type: 'start' }))).toBe(true);
    expect(isDungeonUnlocked(makeMeta({ ascTier: 99 }), mkDungeon({ type: 'start' }))).toBe(true);
  });
  it('asc-tier: false below threshold', () => {
    expect(isDungeonUnlocked(makeMeta({ ascTier: 0 }), mkDungeon({ type: 'asc-tier', tier: 1 }))).toBe(false);
    expect(isDungeonUnlocked(makeMeta({ ascTier: 2 }), mkDungeon({ type: 'asc-tier', tier: 5 }))).toBe(false);
  });
  it('asc-tier: true at or above threshold', () => {
    expect(isDungeonUnlocked(makeMeta({ ascTier: 1 }), mkDungeon({ type: 'asc-tier', tier: 1 }))).toBe(true);
    expect(isDungeonUnlocked(makeMeta({ ascTier: 99 }), mkDungeon({ type: 'asc-tier', tier: 12 }))).toBe(true);
  });
  it('hardmode gate: false unless hardModeUnlocked', () => {
    const noHard = { ascTier: 0, hardModeUnlocked: false } as MetaState;
    const yesHard = { ascTier: 0, hardModeUnlocked: true } as MetaState;
    expect(isDungeonUnlocked(noHard, mkDungeon({ type: 'hardmode' }))).toBe(false);
    expect(isDungeonUnlocked(yesHard, mkDungeon({ type: 'hardmode' }))).toBe(true);
  });
  it('boss-count: false below count', () => {
    const meta = { ascTier: 0, normalBossesKilled: ['boss1', 'boss2'] } as MetaState;
    expect(isDungeonUnlocked(meta, mkDungeon({ type: 'boss-count', count: 5 }))).toBe(false);
  });
  it('boss-count: true at or above count', () => {
    const meta = { ascTier: 0, normalBossesKilled: ['a','b','c','d','e'] } as MetaState;
    expect(isDungeonUnlocked(meta, mkDungeon({ type: 'boss-count', count: 5 }))).toBe(true);
  });
});
