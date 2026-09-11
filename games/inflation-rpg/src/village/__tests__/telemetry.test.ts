import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Village_METRICS_STORAGE_KEY,
  readVillageMetricEvents,
  recordVillageMetric,
  summarizeVillageOnboarding,
  type VillageMetricEvent,
} from '../telemetry';

const saveCreatedAt = 1_000_000;

function event(
  id: string,
  name: VillageMetricEvent['name'],
  occurredAt: number,
  detail?: VillageMetricEvent['detail'],
): VillageMetricEvent {
  return { id, name, occurredAt, saveCreatedAt, ...(detail ? { detail } : {}) };
}

describe('Village local launch telemetry', () => {
  afterEach(() => localStorage.clear());

  it('reads telemetry only from the canonical key', () => {
    const getItemSpy = vi.spyOn(localStorage, 'getItem').mockReturnValue(null);
    try {
      expect(readVillageMetricEvents()).toEqual([]);
      expect(getItemSpy).toHaveBeenCalledTimes(1);
      expect(getItemSpy).toHaveBeenCalledWith(Village_METRICS_STORAGE_KEY);
    } finally {
      getItemSpy.mockRestore();
    }
  });

  it('does not read unrelated telemetry when canonical data is malformed', () => {
    localStorage.setItem('shin-ui-eternal-sponsor-metrics-v1', '{not-json');
    localStorage.setItem('unrelated-metrics-v1', JSON.stringify([
      event('stale', 'save_created', saveCreatedAt),
    ]));

    expect(readVillageMetricEvents()).toEqual([]);
    expect(localStorage.getItem('shin-ui-eternal-sponsor-metrics-v1')).toBe('{not-json');
  });

  it('fails open when metric storage is corrupt', () => {
    localStorage.setItem(Village_METRICS_STORAGE_KEY, '{not-json');

    expect(() => recordVillageMetric(event('m-1', 'save_created', saveCreatedAt))).not.toThrow();
    expect(readVillageMetricEvents()).toEqual([event('m-1', 'save_created', saveCreatedAt)]);
  });

  it('fails open when metric storage read or write throws', () => {
    const throwingStorage = {
      getItem: () => { throw new Error('read failed'); },
      setItem: () => { throw new Error('write failed'); },
    } as unknown as Storage;

    expect(() => recordVillageMetric(event('m-2', 'save_created', saveCreatedAt), throwingStorage)).not.toThrow();
    expect(() => readVillageMetricEvents(throwingStorage)).not.toThrow();
    expect(readVillageMetricEvents(throwingStorage)).toEqual([]);
  });

  it('caps stored metrics at the newest 500 events', () => {
    const initial = Array.from({ length: 500 }, (_, index) => event(`m-${index}`, 'story_choice_made', saveCreatedAt + index));
    localStorage.setItem(Village_METRICS_STORAGE_KEY, JSON.stringify(initial));

    expect(recordVillageMetric(event('m-500', 'story_choice_made', saveCreatedAt + 500))).toBe(true);

    const events = readVillageMetricEvents();
    expect(events).toHaveLength(500);
    expect(events[0]?.id).toBe('m-1');
    expect(events.at(-1)?.id).toBe('m-500');
  });

  it('ignores a duplicate metric ID', () => {
    const first = event('same-id', 'policy_changed', saveCreatedAt + 1, 'training');
    const duplicate = event('same-id', 'policy_changed', saveCreatedAt + 2, 'hoarding');

    expect(recordVillageMetric(first)).toBe(true);
    expect(recordVillageMetric(duplicate)).toBe(false);
    expect(readVillageMetricEvents()).toEqual([first]);
  });

  it('keeps only the newest occurrence when stored data already contains duplicate IDs', () => {
    const older = event('stored-duplicate', 'policy_changed', saveCreatedAt + 1, 'training');
    const newer = event('stored-duplicate', 'policy_changed', saveCreatedAt + 2, 'hoarding');
    localStorage.setItem(Village_METRICS_STORAGE_KEY, JSON.stringify([older, newer]));

    expect(readVillageMetricEvents()).toEqual([newer]);
  });

  it('rejects unbounded IDs and timestamps that cannot be stored safely', () => {
    expect(recordVillageMetric(event('x'.repeat(161), 'policy_changed', saveCreatedAt + 1))).toBe(false);
    expect(recordVillageMetric(event('unsafe-time', 'policy_changed', Number.MAX_SAFE_INTEGER + 1))).toBe(false);
    expect(recordVillageMetric({
      ...event('before-save', 'policy_changed', saveCreatedAt - 1),
    })).toBe(false);
    expect(readVillageMetricEvents()).toEqual([]);
  });

  it('stores metric detail as a bounded string and drops non-string payloads', () => {
    const detail = 'x'.repeat(81);
    expect(recordVillageMetric(event('detail-long', 'policy_changed', saveCreatedAt + 1, detail))).toBe(true);
    expect(readVillageMetricEvents()[0]?.detail).toBe('x'.repeat(80));

    localStorage.setItem(Village_METRICS_STORAGE_KEY, JSON.stringify([
      { ...event('detail-object', 'policy_changed', saveCreatedAt + 2), detail: { policy: 'training' } },
    ]));
    expect(readVillageMetricEvents()[0]?.detail).toBeUndefined();
  });

  it('counts a first expedition at the inclusive 900-second boundary', () => {
    const summary = summarizeVillageOnboarding([
      event('save', 'save_created', saveCreatedAt),
      event('expedition', 'expedition_started', saveCreatedAt + 900_000),
    ]);

    expect(summary.firstExpeditionSeconds).toBe(900);
    expect(summary.firstExpeditionWithin15Minutes).toBe(true);
  });

  it('counts two distinct decisions at the inclusive 30-minute boundary', () => {
    const summary = summarizeVillageOnboarding([
      event('save', 'save_created', saveCreatedAt),
      event('facility', 'facility_task_started', saveCreatedAt + 1_000),
      event('policy', 'policy_changed', saveCreatedAt + 1_800_000),
    ]);

    expect(summary.distinctDecisionKindsIn30Minutes).toBe(2);
    expect(summary.twoDecisionsWithin30Minutes).toBe(true);
  });
});
