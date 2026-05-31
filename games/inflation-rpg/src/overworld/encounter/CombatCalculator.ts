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

export interface FlatAtkInput {
  heroAtk: number;
  comboPrestigeFlat: number;
  comboMilestoneBonus: number;
  combatMastery: number;
  waveChainAtk: number;
  deathCountAtk: number;
  dangerComboAtk: number;
  comboAtkMilestone: number;
}

/**
 * Compute total flat ATK from hero base + all flat bonus terms.
 * Pure function: no mutation, no state dependencies.
 */
export function computeFlatAtk(input: FlatAtkInput): number {
  return input.heroAtk + input.comboPrestigeFlat + input.comboMilestoneBonus
    + input.combatMastery + input.waveChainAtk + input.deathCountAtk
    + input.dangerComboAtk + input.comboAtkMilestone;
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

// C858: Composable ATK buff resolution — multiplicative stack
export interface ActiveAtkBuffs {
  stormNexus: boolean;
  clearSky: boolean;
  crossroads: boolean;
  earlyMomentum: boolean; // C860
  stormNexusMul: number;   // e.g. 1.35
  clearSkyMul: number;     // e.g. 1.12
  crossroadsMul: number;   // e.g. 1.18 (1 + CROSSROADS_ATK_MUL)
  earlyMomentumMul: number; // e.g. 1.03 (1 + EARLY_MOMENTUM_ATK_MUL)
}

// C865: Maximum composite buff multiplier (prevents degenerate N-stack)
export const BUFF_STACK_CAP = 1.65; // C871: 1.85→1.65 (10% headroom over max practical 1.593)

export function computeBuffedHeroAtk(baseAtk: number, buffs: ActiveAtkBuffs): number {
  const product = (buffs.stormNexus ? buffs.stormNexusMul : 1)
    * (buffs.clearSky ? buffs.clearSkyMul : 1)
    * (buffs.crossroads ? buffs.crossroadsMul : 1)
    * (buffs.earlyMomentum ? buffs.earlyMomentumMul : 1);
  if (product > BUFF_STACK_CAP) {
    return Math.floor(baseAtk * BUFF_STACK_CAP);
  }
  // Preserve original float chain for bit-exact compatibility
  return Math.floor(baseAtk
    * (buffs.stormNexus ? buffs.stormNexusMul : 1)
    * (buffs.clearSky ? buffs.clearSkyMul : 1)
    * (buffs.crossroads ? buffs.crossroadsMul : 1)
    * (buffs.earlyMomentum ? buffs.earlyMomentumMul : 1));
}
