import { describe, expect, it } from 'vitest';
import { FACILITY_IDS } from '../data';
import {
  completeFacilityTasks,
  getFacilityUpgradeCost,
  restAgent,
  setVillagePolicy,
  startExpedition,
  startFacilityTask,
  updateVillageSettings,
  upgradeFacility,
  useIntervention,
} from '../domain';
import {
  createInitialVillageSave,
  loadVillageSave,
  persistVillageSave,
  simulateOfflineProgress,
} from '../save';
import type { FacilityId, VillagePolicy, VillageSaveEnvelope } from '../types';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  } as unknown as Storage;
}

function nextRandom(state: number): { state: number; value: number } {
  const next = (state * 1_664_525 + 1_013_904_223) >>> 0;
  return { state: next, value: next / 4_294_967_296 };
}

function persistAndReload(save: VillageSaveEnvelope, storage: Storage): VillageSaveEnvelope {
  expect(persistVillageSave(save, storage)).toBe(true);
  const loaded = loadVillageSave(storage);
  expect(loaded).not.toBeNull();
  return loaded ?? save;
}

function runRandomizedSaveSequence(seed: number): VillageSaveEnvelope {
  const storage = memoryStorage();
  let randomState = seed;
  let now = Date.now();
  let save = createInitialVillageSave(seed);
  now = save.updatedAt;

  for (let step = 0; step < 80; step += 1) {
    const random = nextRandom(randomState);
    randomState = random.state;
    now = Math.max(now, save.updatedAt) + 1_000 + Math.floor(random.value * 5_000);
    const facilityId = FACILITY_IDS[Math.floor(random.value * FACILITY_IDS.length)] as FacilityId;
    const policy: VillagePolicy = random.value < 0.34
      ? 'aggression'
      : random.value < 0.67
        ? 'hoarding'
        : 'training';

    switch (step % 8) {
      case 0:
        save = setVillagePolicy(save, policy, now);
        break;
      case 1:
        save = updateVillageSettings(save, {
          music: random.value,
          sfx: 1 - random.value,
          muted: step % 2 === 0,
        }, now);
        break;
      case 2: {
        const started = startFacilityTask(save, facilityId, now);
        if (started.ok) save = started.save;
        break;
      }
      case 3:
        save = completeFacilityTasks(save, now);
        break;
      case 4: {
        const started = startExpedition(save, 'sacred_fields', now, policy, null);
        if (started.ok) save = started.save;
        break;
      }
      case 5:
        save = simulateOfflineProgress(save, now + 2 * 60 * 60 * 1000).save;
        now = save.updatedAt;
        break;
      case 6: {
        const cost = getFacilityUpgradeCost(save, facilityId);
        if (cost && save.meta.currencies.gold >= cost.gold && save.meta.currencies.materials >= cost.materials) {
          const upgraded = upgradeFacility(save, facilityId, now);
          if (upgraded.ok) save = upgraded.save;
        }
        break;
      }
      default: {
        const agent = save.meta.agents[step % save.meta.agents.length];
        if (agent && agent.fatigue > 0) save = restAgent(save, agent.id, now).save;
        if (save.run.expedition && save.run.interventionCharges > 0 && step % 2 === 1) {
          const intervened = useIntervention(save, 'retreat', now);
          if (intervened.ok) save = intervened.save;
        }
        break;
      }
    }

    save = persistAndReload(save, storage);
  }

  return save;
}

describe('Village save state-machine invariants', () => {
  it('keeps repeated mixed gameplay actions reloadable across deterministic seeds', () => {
    for (const seed of [11, 29, 47, 83, 101, 137, 211, 307]) {
      const save = runRandomizedSaveSequence(seed);

      expect(save.schemaVersion).toBe(2);
      expect(save.updatedAt).toBeGreaterThanOrEqual(save.createdAt);
      expect(save.lastProcessedAt).toBeGreaterThanOrEqual(save.createdAt);
      expect(save.lastProcessedAt).toBeLessThanOrEqual(save.updatedAt);
      expect(Object.keys(save.meta.tasks).length).toBeLessThanOrEqual(FACILITY_IDS.length);
    }
  });
});
