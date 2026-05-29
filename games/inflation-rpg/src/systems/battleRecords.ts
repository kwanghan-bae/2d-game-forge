/**
 * Battle session records — tracks per-run personal bests.
 * Stored in memory (resets on app reload). Future: persist to meta.
 */

export interface BattleRecord {
  maxDps: number;
  maxKillStreak: number;
  fastestKillMs: number;
  totalKills: number;
  totalDamage: number;
}

const sessionRecord: BattleRecord = {
  maxDps: 0,
  maxKillStreak: 0,
  fastestKillMs: Infinity,
  totalKills: 0,
  totalDamage: 0,
};

export function updateRecord(partial: Partial<BattleRecord>): void {
  if (partial.maxDps !== undefined && partial.maxDps > sessionRecord.maxDps) {
    sessionRecord.maxDps = partial.maxDps;
  }
  if (partial.maxKillStreak !== undefined && partial.maxKillStreak > sessionRecord.maxKillStreak) {
    sessionRecord.maxKillStreak = partial.maxKillStreak;
  }
  if (partial.fastestKillMs !== undefined && partial.fastestKillMs < sessionRecord.fastestKillMs) {
    sessionRecord.fastestKillMs = partial.fastestKillMs;
  }
  if (partial.totalKills !== undefined) sessionRecord.totalKills += partial.totalKills;
  if (partial.totalDamage !== undefined) sessionRecord.totalDamage += partial.totalDamage;
}

export function getRecord(): Readonly<BattleRecord> {
  return sessionRecord;
}

export function resetRecord(): void {
  sessionRecord.maxDps = 0;
  sessionRecord.maxKillStreak = 0;
  sessionRecord.fastestKillMs = Infinity;
  sessionRecord.totalKills = 0;
  sessionRecord.totalDamage = 0;
}
