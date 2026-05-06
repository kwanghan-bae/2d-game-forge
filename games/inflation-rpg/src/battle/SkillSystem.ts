import type { ActiveSkill } from '../types';

export interface SkillState {
  cooldownsMs: Map<string, number>; // skillId -> next-fire-time-ms
}

export function createSkillState(): SkillState {
  return { cooldownsMs: new Map() };
}

export function isSkillReady(state: SkillState, skill: ActiveSkill, nowMs: number): boolean {
  const next = state.cooldownsMs.get(skill.id) ?? 0;
  return nowMs >= next;
}

export function fireSkill(
  state: SkillState,
  skill: ActiveSkill,
  nowMs: number,
): void {
  state.cooldownsMs.set(skill.id, nowMs + skill.cooldownSec * 1000);
}

export interface SkillEffectResult {
  damage?: number;
  heal?: number;
  buff?: { stat: string; percent: number; durationMs: number };
  execute?: boolean;
  vfxEmoji: string;
}

/**
 * Compute the effect of firing a skill given current player state.
 * Returns the resulting damage/heal/buff for BattleScene to apply.
 * `dmgMul` on the skill (from BattleReadySkill) scales all damage/heal/buff output.
 */
export function computeSkillEffect(
  skill: ActiveSkill & { dmgMul?: number },
  playerAtk: number,
  playerHpMax: number,
  enemyHp: number,
  enemyHpMax: number,
): SkillEffectResult {
  const eff = skill.effect;
  const dmgMul = skill.dmgMul ?? 1;
  const result: SkillEffectResult = { vfxEmoji: skill.vfxEmoji };

  if (eff.type === 'multi_hit' || eff.type === 'aoe') {
    const mult = eff.multiplier ?? 1;
    const targets = eff.targets ?? 1;
    result.damage = Math.floor(playerAtk * mult * targets * dmgMul);
  } else if (eff.type === 'heal') {
    result.heal = Math.floor(playerHpMax * (eff.healPercent ?? 0) / 100 * dmgMul);
  } else if (eff.type === 'buff') {
    result.buff = {
      stat: eff.buffStat ?? 'atk',
      percent: (eff.buffPercent ?? 0) * dmgMul,
      durationMs: (eff.buffDurationSec ?? 0) * 1000,
    };
  } else if (eff.type === 'execute') {
    const threshold = eff.executeThreshold ?? 0;
    if (enemyHp / enemyHpMax <= threshold) {
      result.execute = true;
      result.damage = enemyHp; // 즉사
    } else {
      result.damage = Math.floor(playerAtk * 1.5 * dmgMul);
    }
  }

  return result;
}
