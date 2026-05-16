import type { RunState, MetaState } from '../types';
import { getCharacterById } from '../data/characters';
import { calcFinalStat } from './stats';
import { calcBaseAbilityMult } from './progression';
import { getEquippedInstances } from './equipment';
import { getMythicFlatMult } from './mythics';
import { getRelicFlatMult } from './relics';

/**
 * Phase Realms — compute current maxHp for a run.
 * Mirrors BattleScene's playerHP calculation exactly.
 *   charLv = meta.characterLevels[run.characterId] ?? 0
 *   charLevelMult = 1 + charLv * 0.1
 */
export function computeMaxHp(run: RunState, meta: MetaState): number {
  const char = getCharacterById(run.characterId);
  if (!char) return 100; // safety fallback
  const baseAbility = calcBaseAbilityMult(meta.baseAbilityLevel);
  const allEquipped = getEquippedInstances(meta.inventory, meta.equippedItemIds);
  const charLv = meta.characterLevels[run.characterId] ?? 0;
  const charLevelMult = 1 + charLv * 0.1;
  const ascTierMult = 1 + 0.1 * meta.ascTier;
  const ascTreeHpMult = 1 + 0.05 * meta.ascTree.hp_pct;
  const hpMetaMult = getMythicFlatMult(meta, 'hp') * getRelicFlatMult(meta, 'hp');
  return calcFinalStat(
    'hp',
    run.allocated.hp,
    char.statMultipliers.hp,
    allEquipped,
    baseAbility,
    charLevelMult,
    ascTierMult,
    ascTreeHpMult,
    hpMetaMult,
  );
}
