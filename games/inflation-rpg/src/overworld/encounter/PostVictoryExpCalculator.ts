/**
 * PostVictoryExpCalculator — pure function for post-victory EXP multiplier chain.
 * C861: Extracted from EncounterEngine inline code.
 */

export interface PostVictoryExpParams {
  baseExpGain: number;
  expMul: number; // from computeExpMultiplierWithBreakdown
  declineStackActive: boolean;
  declineStackExpMul: number;
  soulForgeStacks: number;
  soulForgeExpPerStack: number;
  mentorActive: boolean;
  mentorExpMul: number;
  crossroadsExpActive: boolean;
  crossroadsExpMul: number;
  earlyMomentumExpActive: boolean;
  earlyMomentumExpMul: number;
  heroLevel: number;
}

export interface PostVictoryExpResult {
  rawExp: number;
  cappedExp: number;
}

export function computePostVictoryExp(p: PostVictoryExpParams): PostVictoryExpResult {
  const dsm = p.declineStackActive ? p.declineStackExpMul : 1;
  const sfm = 1 + p.soulForgeStacks * p.soulForgeExpPerStack;
  const mentorMul = p.mentorActive ? (1 + p.mentorExpMul) : 1;
  const crossMul = p.crossroadsExpActive ? p.crossroadsExpMul : 1;
  const earlyMul = p.earlyMomentumExpActive ? p.earlyMomentumExpMul : 1;
  const rawExp = Math.floor(p.baseExpGain * p.expMul * dsm * sfm * mentorMul * crossMul * earlyMul);
  const cappedExp = Math.min(rawExp, p.heroLevel * 500);
  return { rawExp, cappedExp };
}
