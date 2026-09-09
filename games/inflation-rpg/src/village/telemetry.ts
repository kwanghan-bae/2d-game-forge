export const Village_METRICS_STORAGE_KEY = 'shin-ui-eternal-sponsor-v4-metrics-v1';
export const Village_METRICS_CAP = 500;

export const Village_METRIC_NAMES = [
  'save_created',
  'facility_task_started',
  'policy_changed',
  'expedition_started',
  'expedition_finished',
  'offline_summary_opened',
  'story_choice_made',
] as const;

export type VillageMetricName = typeof Village_METRIC_NAMES[number];
const Village_METRIC_DETAIL_MAX_LENGTH = 80;
const Village_METRIC_ID_MAX_LENGTH = 160;

export interface VillageMetricEvent {
  id: string;
  name: VillageMetricName;
  occurredAt: number;
  saveCreatedAt: number;
  detail?: string;
}

export interface VillageOnboardingSummary {
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

function isSafeTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isMetricName(value: unknown): value is VillageMetricName {
  return typeof value === 'string' && (Village_METRIC_NAMES as readonly string[]).includes(value);
}

function sanitizeDetail(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0
    ? value.slice(0, Village_METRIC_DETAIL_MAX_LENGTH)
    : undefined;
}

function normalizeMetric(value: unknown): VillageMetricEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  if (id.length === 0 || id.length > Village_METRIC_ID_MAX_LENGTH
    || !isMetricName(candidate.name)
    || !isSafeTimestamp(candidate.occurredAt)
    || !isSafeTimestamp(candidate.saveCreatedAt)
    || candidate.occurredAt < candidate.saveCreatedAt) return null;
  const detail = sanitizeDetail(candidate.detail);
  return {
    id,
    name: candidate.name,
    occurredAt: candidate.occurredAt,
    saveCreatedAt: candidate.saveCreatedAt,
    ...(detail ? { detail } : {}),
  };
}

function readStoredMetrics(storage: Storage | undefined): VillageMetricEvent[] {
  if (!storage) return [];
  let raw: string | null;
  try {
    raw = storage.getItem(Village_METRICS_STORAGE_KEY);
  } catch {
    return [];
  }
  if (raw === null) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed
      .map(normalizeMetric)
      .filter((metric): metric is VillageMetricEvent => metric !== null);
    const newestUnique: VillageMetricEvent[] = [];
    const seenIds = new Set<string>();
    for (let index = normalized.length - 1; index >= 0 && newestUnique.length < Village_METRICS_CAP; index -= 1) {
      const metric = normalized[index];
      if (!metric || seenIds.has(metric.id)) continue;
      seenIds.add(metric.id);
      newestUnique.push(metric);
    }
    return newestUnique.reverse();
  } catch {
    return [];
  }
}

export function readVillageMetricEvents(storage: Storage | undefined = defaultStorage()): VillageMetricEvent[] {
  return readStoredMetrics(storage);
}

export function recordVillageMetric(
  event: VillageMetricEvent,
  storage: Storage | undefined = defaultStorage(),
): boolean {
  const normalized = normalizeMetric(event);
  if (!normalized || !storage) return false;

  const current = readStoredMetrics(storage);
  if (current.some((candidate) => candidate.id === normalized.id)) return false;
  const next = [...current, normalized].slice(-Village_METRICS_CAP);
  try {
    storage.setItem(Village_METRICS_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

function emptySummary(): VillageOnboardingSummary {
  return {
    firstExpeditionSeconds: null,
    distinctDecisionKindsIn30Minutes: 0,
    firstExpeditionWithin15Minutes: false,
    twoDecisionsWithin30Minutes: false,
  };
}

export function summarizeVillageOnboarding(
  events: readonly VillageMetricEvent[],
  saveCreatedAt?: number,
): VillageOnboardingSummary {
  const validEvents = events
    .map(normalizeMetric)
    .filter((event): event is VillageMetricEvent => event !== null);
  const candidateSaveTimes = validEvents.map((event) => event.saveCreatedAt);
  const selectedSaveCreatedAt = isSafeTimestamp(saveCreatedAt)
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
