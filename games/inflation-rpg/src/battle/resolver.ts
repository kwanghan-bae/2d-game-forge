export interface EnemyHpInput {
  monsterLevel: number;
  isBoss: boolean;
  hpMult: number; // monster.hpMult 또는 boss.hpMult
}

export function resolveEnemyMaxHp(input: EnemyHpInput): number {
  const baseMul = input.isBoss ? 50 : 20;
  return Math.floor(input.monsterLevel * baseMul * input.hpMult);
}

export interface EnemyAtkInput {
  monsterLevel: number;
  isBoss: boolean;
}

export function resolveEnemyAtk(input: EnemyAtkInput): number {
  return Math.floor(input.monsterLevel * 8 * (input.isBoss ? 2 : 1));
}

export interface PlayerHitInput {
  playerATK: number;
  crit: boolean;
  rngRoll: number; // [0, 1) — BattleScene 은 Math.random(), sim 은 seeded RNG
}

export function resolvePlayerHit(input: PlayerHitInput): number {
  const critMul = input.crit ? 2.4 : 1;
  const rngMul = 0.9 + input.rngRoll * 0.2; // (0.9, 1.1)
  return Math.floor(input.playerATK * critMul * rngMul);
}

export interface DamageReductionInput {
  enemyATK: number;
  reduction: number; // 0..1
}

export function resolveDamageTaken(input: DamageReductionInput): number {
  return Math.floor(input.enemyATK * (1 - input.reduction));
}
