import { describe, expect, it } from 'vitest';
import type { NpcEntity } from '../../types';
import { tickNpc, isAliveAge, spawnNpc } from '../NpcLifecycle';

function npc(overrides: Partial<NpcEntity> = {}): NpcEntity {
  return {
    instanceId: 'n1',
    kind: 'rival',
    nameKR: 'X',
    emoji: '🗡️',
    age: 10,
    ageRate: 1.0,
    isAlive: true,
    bornChapter: '어린시절',
    relationship: 50,
    zoneRealmId: 'base',
    ...overrides,
  };
}

describe('tickNpc', () => {
  it('age increases by ageRate per tick', () => {
    const n = npc({ age: 10, ageRate: 1.5 });
    tickNpc(n);
    expect(n.age).toBeCloseTo(11.5);
  });
  it('isAlive=false stops aging', () => {
    const n = npc({ age: 80, isAlive: false });
    tickNpc(n);
    expect(n.age).toBe(80);
  });
});

describe('isAliveAge', () => {
  it('age < 80 → alive', () => expect(isAliveAge(70, 'rival')).toBe(true));
  it('age >= 80 → dead (probabilistic threshold)', () => expect(isAliveAge(150, 'rival')).toBe(false));
  it('family_child max ~70', () => expect(isAliveAge(75, 'family_child')).toBe(false));
});

describe('spawnNpc', () => {
  it('creates NpcEntity from template', () => {
    const n = spawnNpc('rival', { realmId: 'base', seed: 1 });
    expect(n).not.toBeNull();
    expect(n?.kind).toBe('rival');
    expect(n?.zoneRealmId).toBe('base');
    expect(n?.isAlive).toBe(true);
  });
  it('unknown kind → null', () => {
    expect(spawnNpc('bogus' as 'rival', { realmId: 'base', seed: 1 })).toBeNull();
  });
});
