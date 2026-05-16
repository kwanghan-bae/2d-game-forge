// games/inflation-rpg/src/systems/effects.ts
import type {
  ActiveEffect, EffectsState, EffectId, MythicProc,
} from '../types';

export function createEffectsState(): EffectsState {
  return { active: new Map() };
}

export function addEffect(state: EffectsState, effect: ActiveEffect): void {
  const existing = state.active.get(effect.id);
  if (existing && effect.effectType === 'debuff') {
    // debuff stack
    existing.stack += 1;
    existing.remainingMs = Math.max(existing.remainingMs, effect.durationMs);
    return;
  }
  state.active.set(effect.id, { ...effect });
}

export interface CombatStateForEffects {
  selfHp: number;
  selfMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  selfAtk: number;
  selfDef: number;
}

export interface EffectEvent {
  kind: 'damage' | 'heal' | 'stun' | 'expire' | 'trigger_fire';
  target: 'self' | 'enemy';
  amount: number;
  effectId: EffectId;
}

export interface TickResult {
  stateDelta: { selfHpDelta?: number; enemyHpDelta?: number; actionBlocked?: boolean };
  events: EffectEvent[];
}

export function tickEffects(
  state: EffectsState,
  combat: CombatStateForEffects,
  dtMs: number,
): TickResult {
  let selfHpDelta = 0;
  let enemyHpDelta = 0;
  let actionBlocked = false;
  const events: EffectEvent[] = [];

  for (const [id, eff] of Array.from(state.active.entries())) {
    eff.remainingMs -= dtMs;
    if (eff.remainingMs <= 0) {
      state.active.delete(id);
      events.push({ kind: 'expire', target: eff.target, amount: 0, effectId: id });
      continue;
    }
    // type 별 적용
    if (eff.effectType === 'dot') {
      const damage = Math.floor(eff.magnitude * (dtMs / 1000));
      if (eff.target === 'enemy') enemyHpDelta -= damage;
      else selfHpDelta -= damage;
      events.push({ kind: 'damage', target: eff.target, amount: damage, effectId: id });
    } else if (eff.effectType === 'cc' && eff.target === 'enemy') {
      actionBlocked = true;  // enemy 가 cc 면 enemy attack 봉쇄 (BattleScene 측에서 처리)
    }
    // shield / reflect / debuff / trigger 는 별도 함수로 처리 (Task 3 / 별도 evaluateTriggers)
  }

  return { stateDelta: { selfHpDelta, enemyHpDelta, actionBlocked }, events };
}

// 받은 데미지 처리 — shield 흡수 + reflect trigger
export interface IncomingDamageResult {
  damageAfterShield: number;
  reflectDamage: number;
  events: EffectEvent[];
}

export function processIncomingDamage(
  state: EffectsState,
  rawDamage: number,
): IncomingDamageResult {
  let dmg = rawDamage;
  let reflectDamage = 0;
  const events: EffectEvent[] = [];

  // shield 흡수 (먼저 적용)
  for (const [id, eff] of state.active.entries()) {
    if (eff.effectType !== 'shield') continue;
    const absorbed = Math.min(dmg, eff.magnitude);
    dmg -= absorbed;
    eff.magnitude -= absorbed;
    if (eff.magnitude <= 0) state.active.delete(id);
    events.push({ kind: 'damage', target: 'self', amount: -absorbed, effectId: id });
    if (dmg <= 0) break;
  }

  // reflect (남은 dmg 의 일부 반사)
  for (const [id, eff] of state.active.entries()) {
    if (eff.effectType !== 'reflect') continue;
    reflectDamage += Math.floor(dmg * eff.magnitude);
    events.push({ kind: 'damage', target: 'enemy', amount: Math.floor(dmg * eff.magnitude), effectId: id });
  }

  return { damageAfterShield: dmg, reflectDamage, events };
}

// 디버프 stat % multiplier (적 stat 에 곱)
export function getDebuffStatMultiplier(state: EffectsState, target: 'enemy' | 'self'): number {
  let mult = 1;
  for (const eff of state.active.values()) {
    if (eff.effectType !== 'debuff' || eff.target !== target) continue;
    mult *= (1 - eff.magnitude * eff.stack);
  }
  return Math.max(0, mult);
}

/**
 * Phase G — `effect_proc` 노드 hook.
 * baseChance 를 (1 + 0.05 × lv) 로 스케일 후 [0, 1] 클램프.
 * 현재 코드에는 proc-chance 사용처가 없어 production callsite 가 없다.
 * 향후 modifier 에 chance 필드가 추가되면 이 helper 를 거쳐가도록 wrap 한다.
 */
export function applyProcMult(baseChance: number, effectProcLv: number): number {
  if (baseChance <= 0) return 0;
  return Math.min(1, baseChance * (1 + 0.05 * effectProcLv));
}

// ─── Phase E — Mythic proc triggers ───
// Permanent (run-scoped) trigger list registered from meta.mythicEquipped.
// Stored on EffectsState.permanentTriggers (separate from `active` map which
// is for time-based ActiveEffect entries).

export function registerMythicProcs(state: EffectsState, procs: MythicProc[]): void {
  state.permanentTriggers = procs;
}

export interface MythicProcResult {
  lifestealHeal: number;
  thornsReflect: number;
  spStealAmount: number;       // [DEPRECATED — replaced by cooldownReduce on 'on_kill', kept for compat]
  magicBurstDamage: number;
  cooldownReduce: number;       // [Phase Realms — seconds, from on_kill sp_steal]
}

export function evaluateMythicProcs(
  state: EffectsState,
  trigger: 'on_player_hit_received' | 'on_player_attack' | 'on_kill',
  ctx: { damageDealt?: number; damageReceived?: number; rng?: () => number; magnitudeBuff?: number },
): MythicProcResult {
  let lifestealHeal = 0;
  let thornsReflect = 0;
  let spStealAmount = 0;
  let magicBurstDamage = 0;
  let cooldownReduce = 0;
  const procs = state.permanentTriggers ?? [];
  for (const p of procs) {
    if (p.trigger !== trigger) continue;
    if (p.effect === 'lifesteal' && ctx.damageDealt) {
      lifestealHeal += ctx.damageDealt * p.value;
    } else if (p.effect === 'thorns' && ctx.damageReceived) {
      thornsReflect += ctx.damageReceived * p.value;
    } else if (p.effect === 'sp_steal') {
      // Phase Realms — sp_steal redefined: on_kill emits cooldownReduce (seconds).
      // Legacy on_player_attack path kept for compat but data no longer uses it.
      if (trigger === 'on_kill') {
        cooldownReduce += p.value;
      } else if (ctx.damageDealt) {
        spStealAmount += ctx.damageDealt * p.value;
      }
    } else if (p.effect === 'magic_burst' && ctx.damageDealt) {
      const r = ctx.rng ? ctx.rng() : Math.random();
      if (r < p.value) magicBurstDamage += ctx.damageDealt * 0.5;
    }
  }
  // Phase Realms — light_of_truth magnitude buff applies to proc results.
  const buff = ctx.magnitudeBuff ?? 1;
  return {
    lifestealHeal: lifestealHeal * buff,
    thornsReflect: thornsReflect * buff,
    spStealAmount: spStealAmount * buff,
    magicBurstDamage: magicBurstDamage * buff,
    cooldownReduce: cooldownReduce * buff,
  };
}

export function evaluateTriggers(
  state: EffectsState,
  event: 'on_kill' | 'on_hit' | 'on_hp_change' | 'on_stack',
  combat: CombatStateForEffects,
): EffectEvent[] {
  const events: EffectEvent[] = [];
  for (const [id, eff] of state.active.entries()) {
    if (eff.effectType !== 'trigger') continue;
    const cond = eff.triggerCondition;
    if (!cond) continue;
    let fired = false;
    if (cond.kind === 'on_kill' && event === 'on_kill') fired = true;
    else if (cond.kind === 'on_hit' && event === 'on_hit') fired = true;
    else if (cond.kind === 'on_hp_below' && event === 'on_hp_change') {
      const ratio = combat.enemyHp / combat.enemyMaxHp;
      if (ratio < cond.thresholdRatio) fired = true;
    }
    if (fired) {
      events.push({ kind: 'trigger_fire', target: eff.target, amount: eff.magnitude, effectId: id });
    }
  }
  return events;
}
