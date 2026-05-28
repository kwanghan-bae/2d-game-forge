import type { PassiveSkill } from '../types';
import { getCharacterById } from '../data/characters';

export interface PassiveBonuses {
  statBoostMult: number;
  critRateBonus: number;
  dodgeRateBonus: number;
  expBoostMult: number;
  goldBoostMult: number;
  bossDamageMult: number;
  firstStrikeMult: number;
  itemFindMult: number;
  beastDamageMult: number;
  lifeConversion: number;  // fraction of maxHP added to ATK
}

const DEFAULT_BONUSES: PassiveBonuses = {
  statBoostMult: 1,
  critRateBonus: 0,
  dodgeRateBonus: 0,
  expBoostMult: 1,
  goldBoostMult: 1,
  bossDamageMult: 1,
  firstStrikeMult: 1,
  itemFindMult: 1,
  beastDamageMult: 1,
  lifeConversion: 0,
};

export function getPassiveBonuses(characterId: string): PassiveBonuses {
  const char = getCharacterById(characterId);
  if (!char?.passiveSkill) return { ...DEFAULT_BONUSES };

  const p: PassiveSkill = char.passiveSkill;
  const bonuses = { ...DEFAULT_BONUSES };

  switch (p.effect) {
    case 'stat_boost':
      bonuses.statBoostMult = p.value;
      break;
    case 'crit_rate':
      bonuses.critRateBonus = p.value;
      break;
    case 'dodge_rate':
      bonuses.dodgeRateBonus = p.value;
      break;
    case 'exp_boost':
      bonuses.expBoostMult = p.value;
      break;
    case 'gold_boost':
      bonuses.goldBoostMult = p.value;
      break;
    case 'boss_damage':
      bonuses.bossDamageMult = p.value;
      break;
    case 'first_strike':
      bonuses.firstStrikeMult = p.value;
      break;
    case 'item_find':
      bonuses.itemFindMult = p.value;
      break;
    case 'beast_damage':
      bonuses.beastDamageMult = p.value;
      break;
    case 'life_conversion':
      bonuses.lifeConversion = p.value;
      break;
  }

  return bonuses;
}
