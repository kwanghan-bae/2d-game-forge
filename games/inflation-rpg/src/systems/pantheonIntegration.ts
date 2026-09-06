/**
 * pantheonIntegration.ts — C1157: Pantheon Crests & Omniverse Sovereign Title Integration.
 *
 * Integrates the fruits of conquering the Eternal Pantheon into the broader account:
 * 1. applyPantheonVictory: Updates MetaState with clears count, crests balance, and highest phase.
 * 2. hasOmniverseSovereignTitle: Evaluates unlock of the apex '진 우주 주재신' title.
 * 3. getOmniverseSovereignPerks: Grants global prestige multipliers (+10% final damage, -5% damage taken).
 * 4. recordPantheonSaga: Generates Hall of Sagas chronicles for Pantheon victories.
 */

import type { MetaState } from '../types';
import type { PantheonFullRaidResult } from './pantheonRaid';
import { formatPantheonSagaEntry } from '../data/pantheonRaidLore';

export interface OmniverseSovereignPerks {
  hasTitle: boolean;
  damageDealtMultiplier: number;
  damageTakenMultiplier: number;
}

/**
 * Applies a full Pantheon Raid victory to the player's MetaState.
 */
export function applyPantheonVictory(
  meta: MetaState,
  raidResult: PantheonFullRaidResult
): MetaState {
  if (!raidResult.won) return meta;

  const currentClears = (meta as unknown as { pantheonClears?: number }).pantheonClears ?? 0;
  const currentCrests = (meta as unknown as { pantheonCrests?: number }).pantheonCrests ?? 0;
  const earnedCrests = raidResult.rewards?.pantheonCrests ?? 5;

  return {
    ...meta,
    pantheonClears: currentClears + 1,
    pantheonCrests: currentCrests + earnedCrests,
    pantheonHighestPhase: 4,
  } as any;
}

/**
 * Checks if the player has unlocked the apex '진 우주 주재신' title.
 */
export function hasOmniverseSovereignTitle(meta: MetaState): boolean {
  const clears = (meta as unknown as { pantheonClears?: number }).pantheonClears ?? 0;
  return clears >= 1;
}

/**
 * Returns global account-wide multipliers granted by the Omniverse Sovereign title.
 */
export function getOmniverseSovereignPerks(meta: MetaState): OmniverseSovereignPerks {
  const hasTitle = hasOmniverseSovereignTitle(meta);

  return {
    hasTitle,
    damageDealtMultiplier: hasTitle ? 1.10 : 1.0, // +10% universal final damage
    damageTakenMultiplier: hasTitle ? 0.95 : 1.0, // -5% universal damage taken
  };
}

/**
 * Formats a chronicle for the Hall of Sagas commemorating the Pantheon conquest.
 */
export function recordPantheonSaga(
  meta: MetaState,
  heroName: string,
  raidResult: PantheonFullRaidResult
): string | null {
  if (!raidResult.won) return null;
  const clears = ((meta as unknown as { pantheonClears?: number }).pantheonClears ?? 0) + 1;
  return formatPantheonSagaEntry(clears, heroName, raidResult.totalTurns);
}
