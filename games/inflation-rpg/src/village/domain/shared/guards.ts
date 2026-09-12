import { getVillageAgentDefinition } from '../../data';
import type { SupportAgent, VillagePolicy, VillageSaveEnvelope } from '../../types';

export const MAX_ECONOMY_VALUE = Number.MAX_SAFE_INTEGER;

export function positiveFiniteLevel(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 ? value : 1;
}

export function isPersistableClock(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= MAX_ECONOMY_VALUE;
}

export function isValidCompletionWindow(startedAt: unknown, completesAt: unknown): boolean {
  return typeof startedAt === 'number'
    && typeof completesAt === 'number'
    && isPersistableClock(startedAt)
    && isPersistableClock(completesAt);
}

export function safeCompletionTimestamp(startedAt: number, durationSeconds: number): number | null {
  if (!isPersistableClock(startedAt) || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;
  const durationMs = durationSeconds * 1000;
  if (!Number.isFinite(durationMs) || durationMs > MAX_ECONOMY_VALUE - startedAt) return null;
  return startedAt + durationMs;
}

export function isActionClockValid(save: VillageSaveEnvelope, now: number): boolean {
  return isPersistableClock(now) && now >= save.updatedAt;
}

export function isVillagePolicy(value: unknown): value is VillagePolicy {
  return value === 'aggression' || value === 'hoarding' || value === 'training';
}

export function isValidAgentFatigue(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function isValidAgentLevel(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Number.isInteger(value)
    && value >= 1
    && value <= 3;
}

export function isValidAgentTrust(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function isValidAgentState(agent: SupportAgent | undefined): agent is SupportAgent {
  const definition = agent ? getVillageAgentDefinition(agent.id) : undefined;
  return Boolean(agent
    && definition
    && agent.nameKR === definition.nameKR
    && agent.roleKR === definition.roleKR
    && agent.trait === definition.trait
    && isValidAgentLevel(agent.level)
    && isValidAgentTrust(agent.trust)
    && isValidAgentFatigue(agent.fatigue));
}

export function isValidCurrencyBalance(value: unknown): value is number {
  return isPersistableFiniteNumber(value) && Number.isSafeInteger(value) && value >= 0;
}

export function isPersistableFiniteNumber(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Math.abs(value) <= MAX_ECONOMY_VALUE;
}
