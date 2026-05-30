/**
 * CombatCalculator — pure functions for ATK computation.
 * No side effects, no `this`, fully testable.
 */

export interface AtkComputeInput {
  flatAtk: number;
  coreMuls: number;
  conditionMuls: number;
  goldMuls: number;
  combatMuls: number;
  progressMuls: number;
  chainMuls: number;
  tradeoffMuls: number;
  systemMuls: number;
  atkCap: number;
}

/**
 * Compute final hero ATK from flat base + 8 multiplier categories + cap.
 * Pure function: no mutation, no state dependencies.
 */
export function computeHeroAtk(input: AtkComputeInput): number {
  const { flatAtk, coreMuls, conditionMuls, goldMuls, combatMuls, progressMuls, chainMuls, tradeoffMuls, systemMuls, atkCap } = input;
  const totalMuls = Math.min(atkCap, coreMuls * conditionMuls * goldMuls * combatMuls * progressMuls * chainMuls * tradeoffMuls * systemMuls);
  return Math.max(1, Math.floor(flatAtk * totalMuls));
}
