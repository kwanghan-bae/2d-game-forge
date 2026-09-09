import type { VillageSaveEnvelope } from './types';

const LEGACY_SCHEMA_VERSION = 1;
export const LEGACY_CURRENT_SAVE_KEY = 'shin-ui-eternal-sponsor-v4-save-v1';
export const LEGACY_METRICS_STORAGE_KEY = 'shin-ui-eternal-sponsor-v4-metrics-v1';
export const LEGACY_REWARDED_USAGE_KEY = 'shin-ui-eternal-sponsor-v4-rewarded-usage-v1';

/**
 * Keeps deterministic outcomes stable while the current realm identity is
 * renamed. The compatibility seed is intentionally isolated here so current
 * production code does not expose the retired identity.
 */
export function stableLegacyVillageRollKey(value: string): string {
  return value
    .replaceAll('sacred_fields', 'joseon_plains')
    .replaceAll('sacred-fields', 'joseon-plains');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mapLegacyString(value: string): string {
  return value
    .replaceAll('joseon_plains', 'sacred_fields')
    .replaceAll('v4_iron_sword', 'iron_sword')
    .replaceAll('v4_guardian_armor', 'guardian_armor')
    .replaceAll('v4_spirit_talisman', 'spirit_talisman')
    .replaceAll('조선 평야', '신목 들판')
    .replaceAll('조선 인플레이션 RPG', '신의 마을: 옛 모험')
    .replaceAll('조선', '마을')
    .replaceAll('V3 Legacy', '기존 기록')
    .replaceAll('V3 영웅 가져오기', '기존 영웅 기록 가져오기')
    .replaceAll('V4', '현재 게임')
    .replaceAll('v4', '현재 게임');
}

function cloneAndMap(value: unknown): unknown {
  if (typeof value === 'string') return mapLegacyString(value);
  if (Array.isArray(value)) return value.map(cloneAndMap);
  if (!isRecord(value)) return value;

  const mapped: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    mapped[mapLegacyString(key)] = cloneAndMap(child);
  }
  return mapped;
}

/**
 * Converts only the previous current-product envelope. The caller still runs
 * the result through the current schema validator before accepting it.
 */
export function normalizeLegacyVillageSave(input: unknown): VillageSaveEnvelope | null {
  if (!isRecord(input) || input.schemaVersion !== LEGACY_SCHEMA_VERSION) return null;
  const migrated = cloneAndMap(input);
  if (!isRecord(migrated)) return null;
  migrated.schemaVersion = 2;
  return migrated as unknown as VillageSaveEnvelope;
}
