// games/inflation-rpg/tools/balance-sim.ts
import { resolveEnemyMaxHp, resolveEnemyAtk, resolvePlayerHit, resolveDamageTaken } from '../src/battle/resolver';
import { computeSkillEffect, createSkillState, isSkillReady, fireSkill } from '../src/battle/SkillSystem';
import { calcDamageReduction, calcCritChance } from '../src/systems/stats';
import {
  createEffectsState, addEffect, tickEffects, processIncomingDamage,
  registerMythicProcs,
  type CombatStateForEffects,
} from '../src/systems/effects';
import { EMPTY_RELIC_STACKS } from '../src/data/relics';
import { getMythicFlatMult, getMythicProcs } from '../src/systems/mythics';
import { getRelicFlatMult } from '../src/systems/relics';
import type { ActiveSkill, Modifier, AscTree, MythicId, RelicId, MetaState } from '../src/types';

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
  modifiers?: Modifier[];  // Phase D — 장비 modifier 효과
  ascTree?: Partial<AscTree>;  // Phase G — Ascension Tree 노드 레벨
  // Phase E — mythic + relic aggregators
  mythicEquipped?: (MythicId | null)[];
  mythicOwned?: MythicId[];
  relicStacks?: Partial<Record<RelicId, number>>;
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
  const skillState = createSkillState();
  const effectsState = createEffectsState();

  // Phase G — ascTree 노드 레벨 추출
  const modMagnitudeLv = player.ascTree?.mod_magnitude ?? 0;
  const critDamageLv = player.ascTree?.crit_damage ?? 0;
  const critMultBonus = 0.20 * critDamageLv;

  // Phase Compass — compass items affect no stat/drop multiplier.
  // Invariant: enabling all compass owned == baseline milestones (unchanged).
  // 따라서 sim 에 compass-on/off 별 분기 불필요. balance-milestones 회귀 0.
  //
  // Phase E — synthesize MetaState-shaped object for aggregator helpers.
  // null branch = mythic-off / relic-empty baseline → skips all Phase E paths
  // and preserves pre-Phase-E sim numbers (balance-milestones.test.ts guard).
  const phaseE_meta = (() => {
    if (!player.mythicEquipped && !player.mythicOwned && !player.relicStacks) {
      return null;
    }
    return {
      mythicEquipped: player.mythicEquipped ?? [null, null, null, null, null],
      mythicOwned: player.mythicOwned ?? [],
      relicStacks: { ...EMPTY_RELIC_STACKS, ...(player.relicStacks ?? {}) },
      ascTree: player.ascTree ?? {},
    } as MetaState;
  })();

  // Phase E — apply mythic + relic flat_mult multipliers to base stats.
  // Mirrors calcFinalStat's Math.floor behavior.
  let simAtk = player.atk;
  let simDef = player.def;
  let simHpMax = player.hpMax;
  if (phaseE_meta) {
    const atkMetaMult = getMythicFlatMult(phaseE_meta, 'atk') * getRelicFlatMult(phaseE_meta, 'atk');
    const defMetaMult = getMythicFlatMult(phaseE_meta, 'def') * getRelicFlatMult(phaseE_meta, 'def');
    const hpMetaMult  = getMythicFlatMult(phaseE_meta, 'hp')  * getRelicFlatMult(phaseE_meta, 'hp');
    simAtk = Math.floor(simAtk * atkMetaMult);
    simDef = Math.floor(simDef * defMetaMult);
    simHpMax = Math.floor(simHpMax * hpMetaMult);
  }

  let playerHpTracker = simHpMax;
  const enemyAtk = resolveEnemyAtk(enemy);
  const reduction = calcDamageReduction(simDef);
  const damageTaken = resolveDamageTaken({ enemyATK: enemyAtk, reduction });
  let monstersDefeated = 0;

  // Phase D — modifier effects → effectsState 등록.
  // RESOLVED in Task 12 — processIncomingDamage 가 적 공격 경로에 연결되어
  // shield/reflect 가 실제 전투 수치에 영향을 준다. dot 는 tickEffects →
  // enemyHpDelta 경로로 이미 처리됨.
  if (player.modifiers) {
    for (const mod of player.modifiers) {
      // Phase G — mod_magnitude 노드가 shield/reflect/trigger magnitude 를 증폭
      const scaledMagnitude = mod.baseValue * (1 + 0.05 * modMagnitudeLv);
      if (mod.effectType === 'shield') {
        addEffect(effectsState, {
          id: `shield_${mod.id}`,
          effectType: 'shield', source: 'modifier', target: 'self',
          durationMs: 999999, remainingMs: 999999, magnitude: scaledMagnitude, stack: 1,
        });
      } else if (mod.effectType === 'reflect') {
        addEffect(effectsState, {
          id: `reflect_${mod.id}`,
          effectType: 'reflect', source: 'modifier', target: 'self',
          durationMs: 999999, remainingMs: 999999, magnitude: scaledMagnitude, stack: 1,
        });
      } else if (mod.effectType === 'trigger') {
        addEffect(effectsState, {
          id: `trigger_${mod.id}`,
          effectType: 'trigger', source: 'modifier', target: 'self',
          durationMs: 999999, remainingMs: 999999, magnitude: scaledMagnitude, stack: 1,
          triggerCondition: mod.triggerCondition,
        });
      }
      // dot/cc/debuff 는 attack 시 trigger — sim 에서는 단순화로 미반영.
      // stat_mod 는 buildSimPlayer 에서 player.atk/def/hpMax 에 합산 (별도 처리).
    }
  }

  // Phase E — register mythic procs into effectsState.permanentTriggers.
  // processIncomingDamage / evaluateMythicProcs paths consume them.
  // Full proc-result application would require deeper integration (out of T23
  // scope); registration is sufficient to keep sim flow intact + baseline parity.
  if (phaseE_meta) {
    const procs = getMythicProcs(phaseE_meta);
    registerMythicProcs(effectsState, procs);
  }

  // Tick rate = 600ms (matches BattleScene combatTimer.delay).
  // Caveat: BattleScene.update runs at Phaser frame rate (~16ms), so a skill
  // with cd < 600ms can fire multiple times between basic attacks in production
  // but at most once per tick in sim. Negligible for current spec — milestone
  // ULTs all have cd ≥ 1s. Re-evaluate when Phase D effect-pipeline lands.
  for (let tick = 0; tick < maxTicks; tick++) {
    // Skill phase mirrors BattleScene.update.
    // Note: only `result.damage` is applied here — heal / buff effects are no-op
    // in the sim. Damage-type ULTs only. Phase 2 (D — effect-pipeline) will add
    // proper effect application; until then milestone players pass `skills: []`.
    for (const skill of player.skills) {
      const nowMs = tick * TICK_MS;
      if (isSkillReady(skillState, skill, nowMs)) {
        const result = computeSkillEffect(skill, simAtk, simHpMax, enemyHp, enemyMaxHp);
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
        playerATK: simAtk,
        crit,
        rngRoll: rng.next(),
        critMultBonus, // Phase G — ascTree.crit_damage (+0.20 per level)
      });
    }
    enemyHp = Math.max(0, enemyHp - totalDmg);
    if (enemyHp <= 0) {
      return { victory: true, ticksTaken: tick, secondsTaken: tick * 0.6, remainingHpRatio: 0 };
    }

    // 적 공격 (BattleScene 의 currentHpEstimate 모델 mirror)
    // Per-tick increment: intentionally diverges from BattleScene where
    // run.monstersDefeated advances only on kill and is constant during a single
    // fight. Sim approximates the fatigue model within one floor. See spec §7.2.
    // RESOLVED Task 12 — processIncomingDamage 경유로 shield/reflect 실제 반영.
    monstersDefeated++;
    const fatigueDamage = damageTaken * 0.1;
    const { damageAfterShield } = processIncomingDamage(effectsState, fatigueDamage);
    playerHpTracker -= damageAfterShield;
    if (playerHpTracker <= 0) {
      return {
        victory: false,
        ticksTaken: tick,
        secondsTaken: tick * 0.6,
        remainingHpRatio: enemyHp / enemyMaxHp,
      };
    }

    // effects tick (BattleScene.update mirror)
    const combat: CombatStateForEffects = {
      selfHp: playerHpTracker, selfMaxHp: simHpMax,
      enemyHp, enemyMaxHp,
      selfAtk: simAtk, selfDef: simDef,
    };
    const tickResult = tickEffects(effectsState, combat, TICK_MS);
    if (tickResult.stateDelta.enemyHpDelta) {
      enemyHp = Math.max(0, enemyHp + tickResult.stateDelta.enemyHpDelta);
      if (enemyHp <= 0) {
        return { victory: true, ticksTaken: tick, secondsTaken: tick * 0.6, remainingHpRatio: 0 };
      }
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
