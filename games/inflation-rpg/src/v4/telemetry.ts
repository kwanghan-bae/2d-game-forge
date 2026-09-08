export const V4_METRICS_STORAGE_KEY = 'shin-ui-eternal-sponsor-v4-metrics-v1';
export const V4_METRICS_CAP = 500;

export const V4_METRIC_NAMES = [
  'save_created',
  'facility_task_started',
  'policy_changed',
  'expedition_started',
  'expedition_finished',
  'offline_summary_opened',
  'story_choice_made',
] as const;

export type V4MetricName = typeof V4_METRIC_NAMES[number];
const V4_METRIC_DETAIL_MAX_LENGTH = 80;

export interface V4MetricEvent {
  id: string;
  name: V4MetricName;
  occurredAt: number;
  saveCreatedAt: number;
  detail?: string;
}

export interface V4OnboardingSummary {
  firstExpeditionSeconds: number | null;
  distinctDecisionKindsIn30Minutes: number;
  firstExpeditionWithin15Minutes: boolean;
  twoDecisionsWithin30Minutes: boolean;
}

function defaultStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isMetricName(value: unknown): value is V4MetricName {
  return typeof value === 'string' && (V4_METRIC_NAMES as readonly string[]).includes(value);
}

function sanitizeDetail(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0
    ? value.slice(0, V4_METRIC_DETAIL_MAX_LENGTH)
    : undefined;
}

function normalizeMetric(value: unknown): V4MetricEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0
    || !isMetricName(candidate.name)
    || !isFiniteNonNegativeNumber(candidate.occurredAt)
    || !isFiniteNonNegativeNumber(candidate.saveCreatedAt)) return null;
  const detail = sanitizeDetail(candidate.detail);
  return {
    id: candidate.id,
    name: candidate.name,
    occurredAt: candidate.occurredAt,
    saveCreatedAt: candidate.saveCreatedAt,
    ...(detail ? { detail } : {}),
  };
}

function readStoredMetrics(storage: Storage | undefined): V4MetricEvent[] {
  if (!storage) return [];
  let raw: string | null;
  try {
    raw = storage.getItem(V4_METRICS_STORAGE_KEY);
  } catch {
    return [];
  }
  if (raw === null) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeMetric)
      .filter((metric): metric is V4MetricEvent => metric !== null)
      .slice(-V4_METRICS_CAP);
  } catch {
    return [];
  }
}

export function readV4MetricEvents(storage: Storage | undefined = defaultStorage()): V4MetricEvent[] {
  return readStoredMetrics(storage);
}

export function recordV4Metric(
  event: V4MetricEvent,
  storage: Storage | undefined = defaultStorage(),
): boolean {
  const normalized = normalizeMetric(event);
  if (!normalized || !storage) return false;

  const current = readStoredMetrics(storage);
  if (current.some((candidate) => candidate.id === normalized.id)) return false;
  const next = [...current, normalized].slice(-V4_METRICS_CAP);
  try {
    storage.setItem(V4_METRICS_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

function emptySummary(): V4OnboardingSummary {
  return {
    firstExpeditionSeconds: null,
    distinctDecisionKindsIn30Minutes: 0,
    firstExpeditionWithin15Minutes: false,
    twoDecisionsWithin30Minutes: false,
  };
}

export function summarizeV4Onboarding(
  events: readonly V4MetricEvent[],
  saveCreatedAt?: number,
): V4OnboardingSummary {
  const validEvents = events
    .map(normalizeMetric)
    .filter((event): event is V4MetricEvent => event !== null);
  const candidateSaveTimes = validEvents.map((event) => event.saveCreatedAt);
  const selectedSaveCreatedAt = isFiniteNonNegativeNumber(saveCreatedAt)
    ? saveCreatedAt
    : candidateSaveTimes.length > 0 ? Math.max(...candidateSaveTimes) : null;
  if (selectedSaveCreatedAt === null) return emptySummary();

  const saveEvents = validEvents.filter((event) => event.saveCreatedAt === selectedSaveCreatedAt);
  const expeditionTimes = saveEvents
    .filter((event) => event.name === 'expedition_started' && event.occurredAt >= selectedSaveCreatedAt)
    .map((event) => event.occurredAt)
    .sort((left, right) => left - right);
  const firstExpeditionSeconds = expeditionTimes.length > 0
    ? (expeditionTimes[0] - selectedSaveCreatedAt) / 1_000
    : null;
  const decisionKinds = new Set(
    saveEvents
      .filter((event) => (event.name === 'facility_task_started' || event.name === 'policy_changed')
        && event.occurredAt >= selectedSaveCreatedAt
        && event.occurredAt - selectedSaveCreatedAt <= 1_800_000)
      .map((event) => event.name),
  );

  return {
    firstExpeditionSeconds,
    distinctDecisionKindsIn30Minutes: decisionKinds.size,
    firstExpeditionWithin15Minutes: firstExpeditionSeconds !== null && firstExpeditionSeconds <= 900,
    twoDecisionsWithin30Minutes: decisionKinds.size >= 2,
  };
}
