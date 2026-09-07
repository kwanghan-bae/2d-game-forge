import { describe, expect, it } from 'vitest';
import {
  createInitialV4Save,
  loadV4Save,
  persistV4Save,
  readV4Save,
  startFreshV4Save,
  V4_RECOVERY_BACKUP_KEY,
  V4_SAVE_KEY,
} from '../save';
import { startExpedition, startFacilityTask } from '../domain';
import { V4_MAX_SAGA_ENTRIES } from '../types';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    dump: (key: string) => values.get(key),
  } as Storage & { dump: (key: string) => string | undefined };
}

describe('V4 save recovery boundary', () => {
  it('distinguishes an absent save from a malformed save', () => {
    const empty = memoryStorage();
    expect(readV4Save(empty)).toEqual({ status: 'missing' });

    const malformed = memoryStorage({ [V4_SAVE_KEY]: '{not-json' });
    expect(readV4Save(malformed)).toEqual({ status: 'invalid', reason: 'malformed_json' });
  });

  it('reports schema-invalid data without changing the original payload', () => {
    const raw = JSON.stringify({ schemaVersion: 999 });
    const storage = memoryStorage({ [V4_SAVE_KEY]: raw });

    expect(readV4Save(storage)).toEqual({ status: 'invalid', reason: 'invalid_schema' });
    expect(storage.dump(V4_SAVE_KEY)).toBe(raw);
    expect(loadV4Save(storage)).toBeNull();
  });

  it('isolates arbitrary JSON payloads without throwing during recovery', () => {
    const payloads: unknown[] = [
      null,
      [],
      0,
      false,
      'text',
      { schemaVersion: 1 },
      { schemaVersion: 1, meta: { currencies: { gold: Number.MAX_SAFE_INTEGER + 1 } } },
      { schemaVersion: 1, run: { hero: { equipmentIds: { nested: true } } } },
      { __proto__: { schemaVersion: 1 }, schemaVersion: 1, meta: [], run: null },
    ];

    for (const payload of payloads) {
      const storage = memoryStorage({ [V4_SAVE_KEY]: JSON.stringify(payload) });
      expect(() => readV4Save(storage)).not.toThrow();
      expect(readV4Save(storage)).toEqual({ status: 'invalid', reason: 'invalid_schema' });
    }
  });

  it('rejects a payload that combines an active expedition with an old result', () => {
    const base = createInitialV4Save(6541);
    const started = startExpedition(base, 'joseon_plains', base.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.lastExpeditionResult = {
      id: 'old-result',
      realmId: 'joseon_plains',
      outcome: 'victory',
      completedAt: started.save.updatedAt,
      reward: { gold: 1 },
      heroPower: 200,
      recommendedPower: 120,
      turns: 1,
      totalDamageDealt: 1,
      totalDamageTaken: 1,
      heroRemainingHp: started.save.run.hero.hp,
      weaknessKR: '기록',
      recommendedFacilityId: 'training',
      recommendedEquipmentId: null,
      retryAfterSeconds: 0,
      successChance: 0.9,
      encountersCleared: 1,
      totalEncounterCount: 3,
    };
    const storage = memoryStorage({ [V4_SAVE_KEY]: JSON.stringify(started.save) });

    expect(readV4Save(storage)).toEqual({ status: 'invalid', reason: 'invalid_schema' });
  });

  it('rejects a payload whose active expedition id collides with a facility task id', () => {
    const base = createInitialV4Save(6542);
    const taskStarted = startFacilityTask(base, 'blacksmith', base.updatedAt, null);
    expect(taskStarted.ok).toBe(true);
    if (!taskStarted.ok) return;

    const expeditionStarted = startExpedition(
      taskStarted.save,
      'joseon_plains',
      taskStarted.save.updatedAt,
      'aggression',
      null,
    );
    expect(expeditionStarted.ok).toBe(true);
    if (!expeditionStarted.ok) return;

    expeditionStarted.save.run.expedition!.id = taskStarted.task.id;
    const storage = memoryStorage({ [V4_SAVE_KEY]: JSON.stringify(expeditionStarted.save) });

    expect(readV4Save(storage)).toEqual({ status: 'invalid', reason: 'invalid_schema' });
  });

  it('rejects a payload with an empty saga entry id', () => {
    const invalid = createInitialV4Save(6543);
    invalid.meta.sagaEntries[0]!.id = '';
    const storage = memoryStorage({ [V4_SAVE_KEY]: JSON.stringify(invalid) });

    expect(readV4Save(storage)).toEqual({ status: 'invalid', reason: 'invalid_schema' });
  });

  it.each([
    ['title', (save: ReturnType<typeof createInitialV4Save>) => { save.meta.sagaEntries[0]!.title = '  '; }],
    ['text', (save: ReturnType<typeof createInitialV4Save>) => { save.meta.sagaEntries[0]!.text = ''; }],
  ])('rejects a saga entry with an empty %s', (_field, mutate) => {
    const invalid = createInitialV4Save(6544);
    mutate(invalid);
    const storage = memoryStorage({ [V4_SAVE_KEY]: JSON.stringify(invalid) });

    expect(readV4Save(storage)).toEqual({ status: 'invalid', reason: 'invalid_schema' });
  });

  it('backs up the invalid payload only when the player starts a fresh V4 save', () => {
    const raw = JSON.stringify({ schemaVersion: 999, keep: 'for-recovery' });
    const storage = memoryStorage({ [V4_SAVE_KEY]: raw });

    const fresh = startFreshV4Save(storage, 123);

    expect(storage.dump(V4_RECOVERY_BACKUP_KEY)).toBe(raw);
    expect(loadV4Save(storage)).toMatchObject({ schemaVersion: 1, run: { hero: { name: fresh.run.hero.name } } });
    expect(fresh.meta.sagaEntries[0]?.title).toBe('영원한 후원자의 탄생');
  });

  it('does not alter a valid save when recovery is not needed', () => {
    const valid = createInitialV4Save(456);
    const raw = JSON.stringify(valid);
    const storage = memoryStorage({ [V4_SAVE_KEY]: raw });

    expect(startFreshV4Save(storage, 789)).toMatchObject({ schemaVersion: 1 });
    expect(storage.dump(V4_RECOVERY_BACKUP_KEY)).toBeUndefined();
    expect(loadV4Save(storage)?.run.hero.name).toBe(valid.run.hero.name);
  });

  it('reports a persistence failure without interrupting gameplay', () => {
    const broken = {
      getItem: () => null,
      setItem: () => { throw new Error('quota exceeded'); },
      removeItem: () => {},
    } as unknown as Storage;

    expect(persistV4Save(createInitialV4Save(987), broken)).toBe(false);
  });

  it.each([
    ['name', (save: ReturnType<typeof createInitialV4Save>) => { save.run.hero.name = ''; }],
    ['emoji', (save: ReturnType<typeof createInitialV4Save>) => { save.run.hero.emoji = ''; }],
  ])('rejects a save with an empty hero %s', (_field, mutate) => {
    const invalid = createInitialV4Save(321);
    mutate(invalid);
    const storage = memoryStorage({ [V4_SAVE_KEY]: JSON.stringify(invalid) });

    expect(readV4Save(storage)).toEqual({ status: 'invalid', reason: 'invalid_schema' });
    expect(loadV4Save(storage)).toBeNull();
  });

  it('trims oversized saga history while hydrating an older valid save', () => {
    const save = createInitialV4Save(654);
    save.updatedAt = save.createdAt + V4_MAX_SAGA_ENTRIES + 4;
    save.lastProcessedAt = save.updatedAt;
    save.meta.sagaEntries = Array.from({ length: V4_MAX_SAGA_ENTRIES + 5 }, (_, index) => ({
      id: `legacy-saga-${index}`,
      kind: 'milestone' as const,
      createdAt: save.createdAt + index,
      title: `기록 ${index}`,
      text: `내용 ${index}`,
    })).reverse();
    const storage = memoryStorage({ [V4_SAVE_KEY]: JSON.stringify(save) });

    const loaded = loadV4Save(storage);

    expect(loaded?.meta.sagaEntries).toHaveLength(V4_MAX_SAGA_ENTRIES);
    expect(loaded?.meta.sagaEntries[0]?.id).toBe(`legacy-saga-${V4_MAX_SAGA_ENTRIES + 4}`);
    expect(loaded?.meta.sagaEntries.at(-1)?.id).toBe('legacy-saga-5');
  });
});
