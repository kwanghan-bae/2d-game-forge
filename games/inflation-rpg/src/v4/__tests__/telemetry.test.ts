import { afterEach, describe, expect, it } from 'vitest';
import {
  V4_METRICS_STORAGE_KEY,
  getV4OnboardingSummary,
  readV4MetricEvents,
  recordV4Metric,
  type V4MetricEvent,
} from '../telemetry';

const saveCreatedAt = 1_000_000;

function event(
  id: string,
  name: V4MetricEvent['name'],
  occurredAt: number,
  detail?: V4MetricEvent['detail'],
): V4MetricEvent {
  return { id, name, occurredAt, saveCreatedAt, ...(detail ? { detail } : {}) };
}

describe('V4 local launch telemetry', () => {
  afterEach(() => localStorage.clear());

  it('fails open when metric storage is corrupt', () => {
    localStorage.setItem(V4_METRICS_STORAGE_KEY, '{not-json');

    expect(() => recordV4Metric(event('m-1', 'save_created', saveCreatedAt))).not.toThrow();
    expect(readV4MetricEvents()).toEqual([event('m-1', 'save_created', saveCreatedAt)]);
  });

  it('fails open when metric storage read or write throws', () => {
    const throwingStorage = {
      getItem: () => { throw new Error('read failed'); },
      setItem: () => { throw new Error('write failed'); },
    } as unknown as Storage;

    expect(() => recordV4Metric(event('m-2', 'save_created', saveCreatedAt), throwingStorage)).not.toThrow();
    expect(() => readV4MetricEvents(throwingStorage)).not.toThrow();
    expect(readV4MetricEvents(throwingStorage)).toEqual([]);
  });

  it('caps stored metrics at the newest 500 events', () => {
    const initial = Array.from({ length: 500 }, (_, index) => event(`m-${index}`, 'story_choice_made', saveCreatedAt + index));
    localStorage.setItem(V4_METRICS_STORAGE_KEY, JSON.stringify(initial));

    expect(recordV4Metric(event('m-500', 'story_choice_made', saveCreatedAt + 500))).toBe(true);

    const events = readV4MetricEvents();
    expect(events).toHaveLength(500);
    expect(events[0]?.id).toBe('m-1');
    expect(events.at(-1)?.id).toBe('m-500');
  });

  it('ignores a duplicate metric ID', () => {
    const first = event('same-id', 'policy_changed', saveCreatedAt + 1, { policy: 'training' });
    const duplicate = event('same-id', 'policy_changed', saveCreatedAt + 2, { policy: 'hoarding' });

    expect(recordV4Metric(first)).toBe(true);
    expect(recordV4Metric(duplicate)).toBe(false);
    expect(readV4MetricEvents()).toEqual([first]);
  });

  it('counts a first expedition at the inclusive 900-second boundary', () => {
    const summary = getV4OnboardingSummary([
      event('save', 'save_created', saveCreatedAt),
      event('expedition', 'expedition_started', saveCreatedAt + 900_000),
    ]);

    expect(summary.firstExpeditionSeconds).toBe(900);
    expect(summary.firstExpeditionWithin15Minutes).toBe(true);
  });

  it('counts two distinct decisions at the inclusive 30-minute boundary', () => {
    const summary = getV4OnboardingSummary([
      event('save', 'save_created', saveCreatedAt),
      event('facility', 'facility_task_started', saveCreatedAt + 1_000),
      event('policy', 'policy_changed', saveCreatedAt + 1_800_000),
    ]);

    expect(summary.distinctDecisionKindsIn30Minutes).toBe(2);
    expect(summary.twoDecisionsWithin30Minutes).toBe(true);
  });
});
