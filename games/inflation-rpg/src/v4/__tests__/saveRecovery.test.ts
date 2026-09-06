import { describe, expect, it } from 'vitest';
import {
  createInitialV4Save,
  loadV4Save,
  readV4Save,
  startFreshV4Save,
  V4_RECOVERY_BACKUP_KEY,
  V4_SAVE_KEY,
} from '../save';

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
});
