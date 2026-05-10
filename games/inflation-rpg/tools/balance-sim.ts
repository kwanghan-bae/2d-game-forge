// games/inflation-rpg/tools/balance-sim.ts
import { resolveEnemyMaxHp, resolveEnemyAtk, resolvePlayerHit, resolveDamageTaken } from '../src/battle/resolver';
import { computeSkillEffect, createSkillState, isSkillReady, fireSkill } from '../src/battle/SkillSystem';
import { calcDamageReduction, calcCritChance } from '../src/systems/stats';
import type { ActiveSkill } from '../src/types';

export interface SimRng {
  next(): number; // [0, 1)
}

export function createSeededRng(seed: number): SimRng {
  // mulberry32
  let s = seed >>> 0;
  return {
    next() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export interface SimEnemy {
  monsterLevel: number;
  isBoss: boolean;
  hpMult: number;
}

export interface SimPlayer {
  atk: number;
  def: number;
  hpMax: number;
  agi: number;
  luc: number;
  skills: Array<ActiveSkill & { dmgMul?: number }>;
}

export interface SimResult {
  victory: boolean;
  ticksTaken: number;
  secondsTaken: number; // ticksTaken * 0.6 (BattleScene combatTimer delay)
  remainingHpRatio: number;
}

const TICK_MS = 600;

export function simulateFloor(
  player: SimPlayer,
  enemy: SimEnemy,
  rng: SimRng,
  maxTicks = 1000,
): SimResult {
  let enemyHp = resolveEnemyMaxHp(enemy);
  const enemyMaxHp = enemyHp;
  const playerHp = player.hpMax;
  const skillState = createSkillState();
  const enemyAtk = resolveEnemyAtk(enemy);
  const reduction = calcDamageReduction(player.def);
  const damageTaken = resolveDamageTaken({ enemyATK: enemyAtk, reduction });
  let monstersDefeated = 0;

  for (let tick = 0; tick < maxTicks; tick++) {
    // 스킬 발동 (BattleScene.update mirror)
    for (const skill of player.skills) {
      const nowMs = tick * TICK_MS;
      if (isSkillReady(skillState, skill, nowMs)) {
        const result = computeSkillEffect(skill, player.atk, player.hpMax, enemyHp, enemyMaxHp);
        if (result.damage !== undefined) {
          enemyHp = Math.max(0, enemyHp - result.damage);
        }
        fireSkill(skillState, skill, nowMs);
      }
    }
    if (enemyHp <= 0) {
      return { victory: true, ticksTaken: tick, secondsTaken: tick * 0.6, remainingHpRatio: 0 };
    }

    // 평타 (BattleScene.doRound mirror, 결정성 부분만)
    const crit = rng.next() < calcCritChance(player.agi, player.luc);
    const combo = rng.next() < 0.05 + player.agi * 0.0005;
    const hits = combo ? 3 : 1;
    let totalDmg = 0;
    for (let i = 0; i < hits; i++) {
      totalDmg += resolvePlayerHit({
        playerATK: player.atk,
        crit,
        rngRoll: rng.next(),
      });
    }
    enemyHp = Math.max(0, enemyHp - totalDmg);
    if (enemyHp <= 0) {
      return { victory: true, ticksTaken: tick, secondsTaken: tick * 0.6, remainingHpRatio: 0 };
    }

    // 적 공격 (BattleScene 의 currentHpEstimate 모델 mirror)
    monstersDefeated++; // 1 floor = 1 enemy 가정. BattleScene 식 재현용.
    const currentHpEstimate = playerHp - (monstersDefeated * damageTaken * 0.1);
    if (currentHpEstimate <= 0) {
      return {
        victory: false,
        ticksTaken: tick,
        secondsTaken: tick * 0.6,
        remainingHpRatio: enemyHp / enemyMaxHp,
      };
    }
  }

  // maxTicks 도달 = 발산
  return {
    victory: false,
    ticksTaken: maxTicks,
    secondsTaken: maxTicks * 0.6,
    remainingHpRatio: enemyHp / enemyMaxHp,
  };
}
