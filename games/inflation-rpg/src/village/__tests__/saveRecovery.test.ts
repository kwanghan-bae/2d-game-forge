import { describe, expect, it, vi } from 'vitest';
import {
  createInitialVillageSave,
  loadVillageSave,
  persistVillageSave,
  readVillageSave,
  startFreshVillageSave,
  Village_RECOVERY_BACKUP_KEY,
  Village_SAVE_KEY,
  Village_SCHEMA_VERSION,
} from '../save';
import { startExpedition, startFacilityTask } from '../domain';
import { Village_MAX_SAGA_ENTRIES } from '../types';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    dump: (key: string) => values.get(key),
  } as Storage & { dump: (key: string) => string | undefined };
}

describe('Village save recovery boundary', () => {
  it('reads only the canonical save key', () => {
    const getItem = vi.fn(() => null);
    const storage = {
      getItem,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as unknown as Storage;

    expect(readVillageSave(storage)).toEqual({ status: 'missing' });
    expect(getItem).toHaveBeenCalledTimes(1);
    expect(getItem).toHaveBeenCalledWith(Village_SAVE_KEY);
  });

  it('distinguishes an absent save from a malformed save', () => {
    const empty = memoryStorage();
    expect(readVillageSave(empty)).toEqual({ status: 'missing' });

    const malformed = memoryStorage({ [Village_SAVE_KEY]: '{not-json' });
    expect(readVillageSave(malformed)).toEqual({ status: 'invalid', reason: 'malformed_json' });
  });

  it('reports schema-invalid data without changing the original payload', () => {
    const raw = JSON.stringify({ schemaVersion: 999 });
    const storage = memoryStorage({ [Village_SAVE_KEY]: raw });

    expect(readVillageSave(storage)).toEqual({ status: 'invalid', reason: 'invalid_schema' });
    expect(storage.dump(Village_SAVE_KEY)).toBe(raw);
    expect(loadVillageSave(storage)).toBeNull();
  });

  it('upgrades a valid schema 2 save in the canonical slot to schema 3 once', () => {
    const current = createInitialVillageSave(6540);
    const { simulation: _simulation, ai: _ai, ...legacyMeta } = current.meta;
    void _simulation;
    void _ai;
    const legacy = JSON.parse(JSON.stringify({
      ...current,
      schemaVersion: 2,
      meta: legacyMeta,
    })) as unknown;
    const storage = memoryStorage({ [Village_SAVE_KEY]: JSON.stringify(legacy) });

    const loaded = readVillageSave(storage);

    expect(loaded.status).toBe('valid');
    if (loaded.status !== 'valid') return;
    expect(loaded.save.schemaVersion).toBe(Village_SCHEMA_VERSION);
    expect(loaded.save.meta.ai).toBeDefined();
    expect(loaded.save.meta.simulation).toMatchObject({
      seed: loaded.save.meta.ai.seed,
      tick: 0,
      eventHistory: [],
    });
    expect(JSON.parse(storage.dump(Village_SAVE_KEY) ?? '{}').schemaVersion).toBe(Village_SCHEMA_VERSION);
  });

  it('adds deterministic support-agent brains to an older schema 3 save once', () => {
    const current = createInitialVillageSave(6540);
    const legacyAI = JSON.parse(JSON.stringify(current.meta.ai)) as Record<string, unknown>;
    delete legacyAI.agentBrains;
    const legacy = {
      ...current,
      meta: { ...current.meta, ai: legacyAI },
    } as unknown;
    const storage = memoryStorage({ [Village_SAVE_KEY]: JSON.stringify(legacy) });

    const loaded = readVillageSave(storage);

    expect(loaded.status).toBe('valid');
    if (loaded.status !== 'valid') return;
    expect(loaded.save.meta.ai.agentBrains).toBeDefined();
    expect(Object.keys(loaded.save.meta.ai.agentBrains ?? {})).toEqual(['blacksmith', 'mudang', 'guide']);
    expect(JSON.parse(storage.dump(Village_SAVE_KEY) ?? '{}').meta.ai.agentBrains).toBeDefined();
  });

  it('adds deterministic cognition to an older AI-02 brain once', () => {
    const current = createInitialVillageSave(65401);
    const legacyAI = JSON.parse(JSON.stringify(current.meta.ai)) as Record<string, unknown>;
    const legacyBrains = legacyAI.agentBrains as Record<string, Record<string, unknown>>;
    delete legacyBrains.guide.cognition;
    const legacy = {
      ...current,
      meta: { ...current.meta, ai: legacyAI },
    } as unknown;
    const storage = memoryStorage({ [Village_SAVE_KEY]: JSON.stringify(legacy) });

    const loaded = readVillageSave(storage);

    expect(loaded.status).toBe('valid');
    if (loaded.status !== 'valid') return;
    expect(loaded.save.meta.ai.agentBrains?.guide.cognition).toBeDefined();
    expect(loaded.save.meta.ai.agentBrains?.guide.cognition?.beliefs).toHaveLength(14);
    expect(JSON.parse(storage.dump(Village_SAVE_KEY) ?? '{}').meta.ai.agentBrains.guide.cognition).toBeDefined();
  });

  it('adds deterministic faction and chain state to an older schema 3 world once', () => {
    const current = createInitialVillageSave(65402);
    const legacyAI = JSON.parse(JSON.stringify(current.meta.ai)) as Record<string, unknown>;
    const legacyWorld = legacyAI.world as Record<string, unknown>;
    delete legacyWorld.factions;
    delete legacyWorld.chains;
    const legacyBrains = legacyAI.agentBrains as Record<string, Record<string, unknown>>;
    for (const brain of Object.values(legacyBrains)) {
      const cognition = brain.cognition;
      if (!cognition || typeof cognition !== 'object' || Array.isArray(cognition)) continue;
      const cognitionRecord = cognition as Record<string, unknown>;
      if (!Array.isArray(cognitionRecord.beliefs)) continue;
      cognitionRecord.beliefs = cognitionRecord.beliefs.filter((belief) => {
        if (!belief || typeof belief !== 'object' || Array.isArray(belief)) return true;
        const kind = (belief as Record<string, unknown>).kind;
        return kind !== 'faction_trust' && kind !== 'faction_tension';
      });
    }
    const legacySimulation = JSON.parse(JSON.stringify(current.meta.simulation)) as Record<string, unknown>;
    delete legacySimulation.decisionHistory;
    const legacy = {
      ...current,
      meta: { ...current.meta, ai: legacyAI, simulation: legacySimulation },
    } as unknown;
    const storage = memoryStorage({ [Village_SAVE_KEY]: JSON.stringify(legacy) });

    const loaded = readVillageSave(storage);

    expect(loaded.status).toBe('valid');
    if (loaded.status !== 'valid') return;
    expect(Object.keys(loaded.save.meta.ai.world.factions ?? {})).toEqual(['village', 'merchants', 'spirits']);
    expect(loaded.save.meta.ai.world.chains).toEqual([]);
    expect(loaded.save.meta.ai.agentBrains?.blacksmith.cognition?.beliefs).toHaveLength(14);
    expect(loaded.save.meta.simulation.decisionHistory).toEqual([]);
    expect(JSON.parse(storage.dump(Village_SAVE_KEY) ?? '{}').meta.ai.world.factions).toBeDefined();
    expect(JSON.parse(storage.dump(Village_SAVE_KEY) ?? '{}').meta.simulation.decisionHistory).toEqual([]);
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
      const storage = memoryStorage({ [Village_SAVE_KEY]: JSON.stringify(payload) });
      expect(() => readVillageSave(storage)).not.toThrow();
      expect(readVillageSave(storage)).toEqual({ status: 'invalid', reason: 'invalid_schema' });
    }
  });

  it('rejects a payload that combines an active expedition with an old result', () => {
    const base = createInitialVillageSave(6541);
    const started = startExpedition(base, 'sacred_fields', base.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.lastExpeditionResult = {
      id: 'old-result',
      realmId: 'sacred_fields',
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
    const storage = memoryStorage({ [Village_SAVE_KEY]: JSON.stringify(started.save) });

    expect(readVillageSave(storage)).toEqual({ status: 'invalid', reason: 'invalid_schema' });
  });

  it('rejects a payload whose active expedition id collides with a facility task id', () => {
    const base = createInitialVillageSave(6542);
    const taskStarted = startFacilityTask(base, 'blacksmith', base.updatedAt, null);
    expect(taskStarted.ok).toBe(true);
    if (!taskStarted.ok) return;

    const expeditionStarted = startExpedition(
      taskStarted.save,
      'sacred_fields',
      taskStarted.save.updatedAt,
      'aggression',
      null,
    );
    expect(expeditionStarted.ok).toBe(true);
    if (!expeditionStarted.ok) return;

    expeditionStarted.save.run.expedition!.id = taskStarted.task.id;
    const storage = memoryStorage({ [Village_SAVE_KEY]: JSON.stringify(expeditionStarted.save) });

    expect(readVillageSave(storage)).toEqual({ status: 'invalid', reason: 'invalid_schema' });
  });

  it('rejects a payload with an empty saga entry id', () => {
    const invalid = createInitialVillageSave(6543);
    invalid.meta.sagaEntries[0]!.id = '';
    const storage = memoryStorage({ [Village_SAVE_KEY]: JSON.stringify(invalid) });

    expect(readVillageSave(storage)).toEqual({ status: 'invalid', reason: 'invalid_schema' });
  });

  it('rejects a payload with a blank hero equipment identifier', () => {
    const invalid = createInitialVillageSave(65431);
    invalid.run.hero.equipmentIds = ['  '];
    invalid.run.hero.equipmentLevels = { '  ': 1 };
    const storage = memoryStorage({ [Village_SAVE_KEY]: JSON.stringify(invalid) });

    expect(readVillageSave(storage)).toEqual({ status: 'invalid', reason: 'invalid_schema' });
  });

  it('rejects fractional persisted currency amounts', () => {
    const invalid = createInitialVillageSave(65432);
    invalid.meta.currencies.gold = 1.5;
    const storage = memoryStorage({ [Village_SAVE_KEY]: JSON.stringify(invalid) });

    expect(readVillageSave(storage)).toEqual({ status: 'invalid', reason: 'invalid_schema' });
  });

  it('rejects fractional currency values inside a facility task', () => {
    const source = createInitialVillageSave(65433);
    const started = startFacilityTask(source, 'temple', source.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.task.outputPreview.spirit = 1.5;
    const storage = memoryStorage({ [Village_SAVE_KEY]: JSON.stringify(started.save) });

    expect(readVillageSave(storage)).toEqual({ status: 'invalid', reason: 'invalid_schema' });
  });

  it.each([
    ['title', (save: ReturnType<typeof createInitialVillageSave>) => { save.meta.sagaEntries[0]!.title = '  '; }],
    ['text', (save: ReturnType<typeof createInitialVillageSave>) => { save.meta.sagaEntries[0]!.text = ''; }],
  ])('rejects a saga entry with an empty %s', (_field, mutate) => {
    const invalid = createInitialVillageSave(6544);
    mutate(invalid);
    const storage = memoryStorage({ [Village_SAVE_KEY]: JSON.stringify(invalid) });

    expect(readVillageSave(storage)).toEqual({ status: 'invalid', reason: 'invalid_schema' });
  });

  it('rejects a facility task with an empty player-facing type', () => {
    const invalid = createInitialVillageSave(6545);
    const started = startFacilityTask(invalid, 'temple', invalid.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.task.type = '  ';
    const storage = memoryStorage({ [Village_SAVE_KEY]: JSON.stringify(started.save) });

    expect(readVillageSave(storage)).toEqual({ status: 'invalid', reason: 'invalid_schema' });
  });

  it('rejects an expedition result with an empty weakness explanation', () => {
    const invalid = createInitialVillageSave(6546);
    invalid.run.lastExpeditionResult = {
      id: 'empty-weakness-result',
      realmId: 'sacred_fields',
      outcome: 'defeat',
      completedAt: invalid.updatedAt,
      reward: {},
      heroPower: 90,
      recommendedPower: 120,
      turns: 3,
      totalDamageDealt: 80,
      totalDamageTaken: 120,
      heroRemainingHp: 0,
      weaknessKR: '',
      recommendedFacilityId: 'blacksmith',
      recommendedEquipmentId: null,
      retryAfterSeconds: 45,
      successChance: 0.05,
      encountersCleared: 0,
      totalEncounterCount: 3,
    };
    const storage = memoryStorage({ [Village_SAVE_KEY]: JSON.stringify(invalid) });

    expect(readVillageSave(storage)).toEqual({ status: 'invalid', reason: 'invalid_schema' });
  });

  it('backs up the invalid payload only when the player starts a fresh Village save', () => {
    const raw = JSON.stringify({ schemaVersion: 999, keep: 'for-recovery' });
    const storage = memoryStorage({ [Village_SAVE_KEY]: raw });

    const fresh = startFreshVillageSave(storage, 123);

    expect(storage.dump(Village_RECOVERY_BACKUP_KEY)).toBe(raw);
    expect(loadVillageSave(storage)).toMatchObject({ schemaVersion: Village_SCHEMA_VERSION, run: { hero: { name: fresh.run.hero.name } } });
    expect(fresh.meta.sagaEntries[0]?.title).toBe('영원한 후원자의 탄생');
  });

  it('does not back up an unrelated stored payload when starting fresh', () => {
    const unrelatedRaw = JSON.stringify({ schemaVersion: 1, broken: true });
    const storage = memoryStorage({ 'unrelated-save-record': unrelatedRaw });

    startFreshVillageSave(storage, 124);

    expect(storage.dump(Village_RECOVERY_BACKUP_KEY)).toBeUndefined();
    expect(storage.dump('unrelated-save-record')).toBe(unrelatedRaw);
    expect(storage.dump(Village_SAVE_KEY)).toContain(`"schemaVersion":${Village_SCHEMA_VERSION}`);
  });

  it('does not alter a valid save when recovery is not needed', () => {
    const valid = createInitialVillageSave(456);
    const raw = JSON.stringify(valid);
    const storage = memoryStorage({ [Village_SAVE_KEY]: raw });

    expect(startFreshVillageSave(storage, 789)).toMatchObject({ schemaVersion: Village_SCHEMA_VERSION });
    expect(storage.dump(Village_RECOVERY_BACKUP_KEY)).toBeUndefined();
    expect(loadVillageSave(storage)?.run.hero.name).toBe(valid.run.hero.name);
  });

  it('reports a persistence failure without interrupting gameplay', () => {
    const broken = {
      getItem: () => null,
      setItem: () => { throw new Error('quota exceeded'); },
      removeItem: () => {},
    } as unknown as Storage;

    expect(persistVillageSave(createInitialVillageSave(987), broken)).toBe(false);
  });

  it.each([
    ['name', (save: ReturnType<typeof createInitialVillageSave>) => { save.run.hero.name = ''; }],
    ['emoji', (save: ReturnType<typeof createInitialVillageSave>) => { save.run.hero.emoji = ''; }],
  ])('rejects a save with an empty hero %s', (_field, mutate) => {
    const invalid = createInitialVillageSave(321);
    mutate(invalid);
    const storage = memoryStorage({ [Village_SAVE_KEY]: JSON.stringify(invalid) });

    expect(readVillageSave(storage)).toEqual({ status: 'invalid', reason: 'invalid_schema' });
    expect(loadVillageSave(storage)).toBeNull();
  });

  it('trims oversized saga history when loading a current save', () => {
    const save = createInitialVillageSave(654);
    save.updatedAt = save.createdAt + Village_MAX_SAGA_ENTRIES + 4;
    save.lastProcessedAt = save.updatedAt;
    save.meta.sagaEntries = Array.from({ length: Village_MAX_SAGA_ENTRIES + 5 }, (_, index) => ({
      id: `saga-entry-${index}`,
      kind: 'milestone' as const,
      createdAt: save.createdAt + index,
      title: `기록 ${index}`,
      text: `내용 ${index}`,
    })).reverse();
    const storage = memoryStorage({ [Village_SAVE_KEY]: JSON.stringify(save) });

    const loaded = loadVillageSave(storage);

    expect(loaded?.meta.sagaEntries).toHaveLength(Village_MAX_SAGA_ENTRIES);
    expect(loaded?.meta.sagaEntries[0]?.id).toBe(`saga-entry-${Village_MAX_SAGA_ENTRIES + 4}`);
    expect(loaded?.meta.sagaEntries.at(-1)?.id).toBe('saga-entry-5');
  });

  it('loads a current save with an arbitrary non-empty saga id', () => {
    const save = createInitialVillageSave(655);
    save.meta.sagaEntries[0]!.id = 'historic-choice-without-prefix';
    const storage = memoryStorage({ [Village_SAVE_KEY]: JSON.stringify(save) });

    const loaded = loadVillageSave(storage);

    expect(loaded?.meta.sagaEntries[0]?.id).toBe('historic-choice-without-prefix');
  });
});
