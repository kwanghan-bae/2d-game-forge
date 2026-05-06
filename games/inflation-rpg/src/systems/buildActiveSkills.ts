import type { ActiveSkill, MetaState } from '../types';
import { SKILLS } from '../data/skills';
import { getUltById } from '../data/jobskills';
import { skillCooldownMul, skillDmgMul } from './skillProgression';

export interface BattleReadySkill extends ActiveSkill {
  dmgMul: number;
}

export function buildActiveSkillsForCombat(
  charId: string,
  meta: Pick<MetaState, 'skillLevels' | 'ultSlotPicks'>,
): BattleReadySkill[] {
  const baseSkills = SKILLS[charId];
  if (!baseSkills) return [];

  const result: BattleReadySkill[] = [];

  for (const s of baseSkills) {
    const lv = meta.skillLevels[charId]?.[s.id] ?? 0;
    result.push({
      ...s,
      cooldownSec: s.cooldownSec * skillCooldownMul('base', lv),
      dmgMul: skillDmgMul('base', lv),
    });
  }

  const slots = meta.ultSlotPicks[charId];
  if (slots) {
    for (const ultId of slots) {
      if (!ultId) continue;
      const ult = getUltById(ultId);
      if (!ult) continue;
      const lv = meta.skillLevels[charId]?.[ult.id] ?? 0;
      result.push({
        ...ult,
        cooldownSec: ult.cooldownSec * skillCooldownMul('ult', lv),
        dmgMul: skillDmgMul('ult', lv),
      });
    }
  }

  return result;
}
