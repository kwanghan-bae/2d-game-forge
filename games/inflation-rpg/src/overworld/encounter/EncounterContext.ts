/**
 * EncounterContext — shared state passed between extracted methods.
 * This type captures the combat outcome that reward/exp/gold calculators need.
 *
 * Created in C652 as the first step toward breaking up the 2229-line EncounterEngine.
 */

import type { HeroEntity } from '../../hero/HeroEntity';

/** Result of the combat hit loop, passed to reward calculators */
export interface CombatOutcome {
  readonly won: boolean;
  readonly isBoss: boolean;
  readonly isElite: boolean;
  readonly isDangerZone: boolean;
  readonly tookDamage: boolean;
  readonly didCrit: boolean;
  readonly isOverkill: boolean;
  readonly rageTurn: number;
  readonly totalDamageDealt: number;
}

/** Snapshot of engine state relevant to reward calculation */
export interface EncounterContext {
  readonly hero: HeroEntity;
  readonly combat: CombatOutcome;

  // Combo & streaks
  readonly comboStreak: number;
  readonly dangerStreak: number;
  readonly survivalStreak: number;
  readonly fightsSinceDeath: number;
  readonly killCount: number;
  readonly killMilestones: number;

  // Prestige
  readonly prestigeCount: number;
  readonly prestigeReadyBonus: number;

  // Progression
  readonly totalWins: number;
  readonly totalDeaths: number;
  readonly totalDangerFights: number;
  readonly totalEliteKills: number;
  readonly uniqueBossKills: number;
  readonly villageVisits: number;
  readonly fightChainCount: number;
  readonly consecutiveWaveClears: number;
  readonly heroAge: number;

  // Misc state
  readonly waveRemaining: number;
  readonly goldenHourRemaining: number;
  readonly consecutiveCrits: number;
  readonly critExpChain: number;
  readonly eliteCombo: number;
  readonly dangerChainCount: number;
  readonly dangerFights: number;
  readonly consecutiveBossKills: number;
  readonly fightsSincePrestige: number;
  readonly killsSinceLevelUp: number;
  readonly eliteAfterVillage: boolean;
  readonly survivorGritActive: boolean;
}
