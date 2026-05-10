// games/inflation-rpg/src/data/modifiers.ts
import type { Modifier, EquipmentRarity } from '../types';

const ALL: Record<EquipmentRarity, number> = { common: 1, uncommon: 1, rare: 1, epic: 1, legendary: 1, mythic: 1 };
const MYTHIC_ONLY: Record<EquipmentRarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 1, mythic: 3 };

export const MODIFIERS: Modifier[] = [
  // ── attack 8 ──
  { id: 'mod_crit_chance',   nameKR: '크리티컬',   category: 'attack', baseValue: 0.05, effectType: 'stat_mod', validSlots: ['weapon', 'accessory'], rarityWeight: ALL },
  { id: 'mod_crit_damage',   nameKR: '크리데미지',  category: 'attack', baseValue: 0.50, effectType: 'stat_mod', validSlots: ['weapon', 'accessory'], rarityWeight: ALL },
  { id: 'mod_pierce',        nameKR: '관통',        category: 'attack', baseValue: 0.10, effectType: 'stat_mod', validSlots: ['weapon'],              rarityWeight: ALL },
  { id: 'mod_magic_atk',     nameKR: '마법공격',    category: 'attack', baseValue: 0.10, effectType: 'stat_mod', validSlots: ['weapon', 'accessory'], rarityWeight: ALL },
  { id: 'mod_fire_dmg',      nameKR: '화염피해',    category: 'attack', baseValue: 0.10, effectType: 'stat_mod', validSlots: ['weapon', 'accessory'], rarityWeight: ALL },
  { id: 'mod_ice_dmg',       nameKR: '냉기피해',    category: 'attack', baseValue: 0.10, effectType: 'stat_mod', validSlots: ['weapon', 'accessory'], rarityWeight: ALL },
  { id: 'mod_lightning_dmg', nameKR: '번개피해',    category: 'attack', baseValue: 0.10, effectType: 'stat_mod', validSlots: ['weapon', 'accessory'], rarityWeight: ALL },
  { id: 'mod_holy_dmg',      nameKR: '신성피해',    category: 'attack', baseValue: 0.10, effectType: 'stat_mod', validSlots: ['weapon', 'accessory'], rarityWeight: ALL },

  // ── status 8 ──
  { id: 'mod_poison',  nameKR: '중독', category: 'status', baseValue: 50,   effectType: 'dot',    validSlots: ['weapon', 'accessory'], rarityWeight: ALL },
  { id: 'mod_bleed',   nameKR: '출혈', category: 'status', baseValue: 50,   effectType: 'dot',    validSlots: ['weapon', 'accessory'], rarityWeight: ALL },
  { id: 'mod_stun',    nameKR: '기절', category: 'status', baseValue: 1500, effectType: 'cc',     validSlots: ['weapon'],              rarityWeight: ALL },
  { id: 'mod_freeze',  nameKR: '동결', category: 'status', baseValue: 2000, effectType: 'cc',     validSlots: ['weapon'],              rarityWeight: ALL },
  { id: 'mod_fear',    nameKR: '공포', category: 'status', baseValue: 1500, effectType: 'cc',     validSlots: ['weapon', 'accessory'], rarityWeight: ALL },
  { id: 'mod_weaken',  nameKR: '약화', category: 'status', baseValue: 0.20, effectType: 'debuff', validSlots: ['weapon', 'accessory'], rarityWeight: ALL },
  { id: 'mod_slow',    nameKR: '둔화', category: 'status', baseValue: 0.20, effectType: 'debuff', validSlots: ['weapon', 'accessory'], rarityWeight: ALL },
  { id: 'mod_silence', nameKR: '침묵', category: 'status', baseValue: 2000, effectType: 'cc',     validSlots: ['weapon', 'accessory'], rarityWeight: ALL },

  // ── utility 6 ──
  { id: 'mod_lifesteal', nameKR: '흡혈',         category: 'utility', baseValue: 0.05, effectType: 'trigger',  validSlots: ['weapon', 'accessory'], rarityWeight: ALL, triggerCondition: { kind: 'on_hit' } },
  { id: 'mod_sp_steal',  nameKR: 'SP흡수',       category: 'utility', baseValue: 0.02, effectType: 'trigger',  validSlots: ['weapon', 'accessory'], rarityWeight: ALL, triggerCondition: { kind: 'on_hit' } },
  { id: 'mod_gold_boost',nameKR: '골드부스트',   category: 'utility', baseValue: 0.10, effectType: 'stat_mod', validSlots: ['accessory'],          rarityWeight: ALL },
  { id: 'mod_exp_boost', nameKR: '경험치부스트', category: 'utility', baseValue: 0.10, effectType: 'stat_mod', validSlots: ['accessory'],          rarityWeight: ALL },
  { id: 'mod_dr_boost',  nameKR: '화폐부스트',   category: 'utility', baseValue: 0.10, effectType: 'stat_mod', validSlots: ['accessory'],          rarityWeight: ALL },
  { id: 'mod_luck',      nameKR: '행운',         category: 'utility', baseValue: 5,    effectType: 'stat_mod', validSlots: ['accessory'],          rarityWeight: ALL },

  // ── defense 6 ──
  { id: 'mod_evade',   nameKR: '회피',   category: 'defense', baseValue: 0.05, effectType: 'stat_mod', validSlots: ['armor', 'accessory'], rarityWeight: ALL },
  { id: 'mod_reflect', nameKR: '반사',   category: 'defense', baseValue: 0.20, effectType: 'reflect',  validSlots: ['armor'],              rarityWeight: ALL },
  { id: 'mod_thorns',  nameKR: '가시',   category: 'defense', baseValue: 0.30, effectType: 'reflect',  validSlots: ['armor'],              rarityWeight: ALL },
  { id: 'mod_shield',  nameKR: '방어막', category: 'defense', baseValue: 100,  effectType: 'shield',   validSlots: ['armor'],              rarityWeight: ALL },
  { id: 'mod_regen',   nameKR: '재생',   category: 'defense', baseValue: 30,   effectType: 'trigger',  validSlots: ['armor', 'accessory'], rarityWeight: ALL, triggerCondition: { kind: 'on_hit' } },
  { id: 'mod_immune',  nameKR: '면역',   category: 'defense', baseValue: 0.10, effectType: 'stat_mod', validSlots: ['armor', 'accessory'], rarityWeight: ALL },

  // ── special 6 (mythic 가중) ──
  { id: 'mod_instakill',  nameKR: '즉사',     category: 'special', baseValue: 0.05, effectType: 'trigger', validSlots: ['weapon', 'accessory'], rarityWeight: MYTHIC_ONLY, triggerCondition: { kind: 'on_hp_below', thresholdRatio: 0.10 } },
  { id: 'mod_timestop',   nameKR: '시간정지', category: 'special', baseValue: 1000, effectType: 'cc',      validSlots: ['weapon', 'accessory'], rarityWeight: MYTHIC_ONLY },
  { id: 'mod_madness',    nameKR: '광기',     category: 'special', baseValue: 1.00, effectType: 'trigger', validSlots: ['weapon'],              rarityWeight: MYTHIC_ONLY, triggerCondition: { kind: 'on_hp_below', thresholdRatio: 0.30 } },
  { id: 'mod_rage',       nameKR: '분노',     category: 'special', baseValue: 0.10, effectType: 'trigger', validSlots: ['weapon'],              rarityWeight: MYTHIC_ONLY, triggerCondition: { kind: 'on_stack_reach', stackTarget: 5 } },
  { id: 'mod_soul_eat',   nameKR: '영혼흡수', category: 'special', baseValue: 100,  effectType: 'trigger', validSlots: ['weapon', 'accessory'], rarityWeight: MYTHIC_ONLY, triggerCondition: { kind: 'on_kill' } },
  { id: 'mod_black_song', nameKR: '검은노래', category: 'special', baseValue: 0.30, effectType: 'debuff',  validSlots: ['weapon', 'accessory'], rarityWeight: MYTHIC_ONLY },
];

export function getModifierById(id: string): Modifier | undefined {
  return MODIFIERS.find(m => m.id === id);
}
