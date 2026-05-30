/**
 * C727: EnemyTurnCalc — pure computation of enemy attack damage per turn.
 * Extracted from EncounterEngine L750-755.
 */
import {
  BOSS_RAGE_ATK_PER_TURN,
  BOSS_ENRAGE_HP_THRESHOLD,
  BOSS_ENRAGE_ATK_MUL,
  BOSS_ENRAGE_TIMER_TURN,
  BOSS_ENRAGE_TIMER_MUL,
} from './constants';

export interface EnemyTurnInput {
  baseEnemyAtk: number;
  isBoss: boolean;
  rageTurn: number;
  currentEnemyHp: number;
  maxEnemyHp: number;
}

export interface EnemyTurnResult {
  rageAtk: number;
  isEnraged: boolean;
  isTimerEnraged: boolean;
}

/**
 * Compute the effective enemy ATK for a given combat turn.
 * Boss damage scales with rage turns, enrage when low HP, and timer enrage.
 */
export function computeEnemyTurnAtk(input: EnemyTurnInput): EnemyTurnResult {
  const { baseEnemyAtk, isBoss, rageTurn, currentEnemyHp, maxEnemyHp } = input;

  if (!isBoss) {
    return { rageAtk: baseEnemyAtk, isEnraged: false, isTimerEnraged: false };
  }

  const isEnraged = currentEnemyHp < maxEnemyHp * BOSS_ENRAGE_HP_THRESHOLD;
  const enrageMul = isEnraged ? BOSS_ENRAGE_ATK_MUL : 1;

  const isTimerEnraged = rageTurn >= BOSS_ENRAGE_TIMER_TURN;
  const timerEnrageMul = isTimerEnraged ? BOSS_ENRAGE_TIMER_MUL : 1;

  const rageAtk = Math.floor(
    baseEnemyAtk * (1 + rageTurn * BOSS_RAGE_ATK_PER_TURN) * enrageMul * timerEnrageMul,
  );

  return { rageAtk, isEnraged, isTimerEnraged };
}
