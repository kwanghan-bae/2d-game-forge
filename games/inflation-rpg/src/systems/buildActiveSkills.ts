import type { ActiveSkill, MetaState } from '../types';
import { SKILLS } from '../data/skills';
import { getUltById } from '../data/jobskills';
import { skillCooldownMul, skillDmgMul } from './skillProgression';
import { getMythicCooldownMult } from './mythics';

export interface BattleReadySkill extends ActiveSkill {
  dmgMul: number;
}

export function buildActiveSkillsForCombat(
  charId: string,
  meta: Pick<MetaState, 'skillLevels' | 'ultSlotPicks' | 'mythicEquipped' | 'mythicOwned'>,
): BattleReadySkill[] {
  const baseSkills = SKILLS[charId];
  if (!baseSkills) return [];

  // Phase E — mythic cooldown wrap. Single computation per call.
  const baseCdMyth = getMythicCooldownMult(meta as MetaState, 'base');
  const ultCdMyth = getMythicCooldownMult(meta as MetaState, 'ult');

  const result: BattleReadySkill[] = [];

  for (const s of baseSkills) {
    const lv = meta.skillLevels[charId]?.[s.id] ?? 0;
    result.push({
      ...s,
      cooldownSec: s.cooldownSec * skillCooldownMul('base', lv) * baseCdMyth,
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
        cooldownSec: ult.cooldownSec * skillCooldownMul('ult', lv) * ultCdMyth,
        dmgMul: skillDmgMul('ult', lv),
      });
    }
  }

  return result;
}
