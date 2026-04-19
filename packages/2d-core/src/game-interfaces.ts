export interface IStatSystem {
  calcFinalStat(
    base: number,
    spPoints: number,
    percentMult: number,
    charMult: number,
    baseAbilityMult: number
  ): number;
  calcDamageReduction(def: number): number;
  calcCritChance(agi: number, luc: number): number;
}

export interface IBattlePointSystem {
  onEncounter(current: number): number;
  onDefeat(current: number, isHard: boolean): number;
  onBossKill(current: number, reward: number): number;
}

export interface IProgressionSystem {
  isHardModeUnlocked(bestRunLevel: number): boolean;
  calcBaseAbilityMult(level: number): number;
  onBossKill(bossId: string, killed: string[], maxLevel: number): string[];
}

export interface CharacterClassBase {
  id: string;
  nameKR: string;
  statMultipliers: Record<'hp' | 'atk' | 'def' | 'agi' | 'luc', number>;
  unlockSoulGrade: number;
}
