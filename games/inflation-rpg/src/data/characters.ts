import type { Character } from '../types';

export const CHARACTERS: Character[] = [
  // ── 기본 (soul grade 0) ──
  {
    id: 'hwarang', nameKR: '화랑', emoji: '⚔️', statFocus: 'AGI·ATK',
    statMultipliers: { hp: 1.0, atk: 1.1, def: 1.0, agi: 1.2, luc: 1.0 },
    passiveSkill: { id: 'hwarang_spirit', nameKR: '화랑정신', description: '모든 스탯 10% 증가', effect: 'stat_boost', value: 1.1 },
    unlockSoulGrade: 0,
  },
  {
    id: 'mudang', nameKR: '무당', emoji: '🌸', statFocus: 'LUC·아이템',
    statMultipliers: { hp: 0.9, atk: 1.0, def: 0.95, agi: 1.05, luc: 1.3 },
    passiveSkill: { id: 'spiritual_eye', nameKR: '령안', description: '아이템 드롭 20% 증가', effect: 'item_find', value: 1.2 },
    unlockSoulGrade: 0,
  },
  {
    id: 'choeui', nameKR: '초의', emoji: '🛡️', statFocus: 'HP·DEF',
    statMultipliers: { hp: 1.2, atk: 0.95, def: 1.1, agi: 0.9, luc: 0.9 },
    passiveSkill: { id: 'adamantine', nameKR: '금강불괴', description: '최대 HP 5%를 ATK로 전환', effect: 'life_conversion', value: 0.05 },
    unlockSoulGrade: 0,
  },
  {
    id: 'geomgaek', nameKR: '검객', emoji: '🗡️', statFocus: 'ATK·크리',
    statMultipliers: { hp: 0.95, atk: 1.15, def: 0.9, agi: 1.1, luc: 1.05 },
    passiveSkill: { id: 'sword_mastery', nameKR: '검술', description: '모든 스탯 10% 증가', effect: 'stat_boost', value: 1.1 },
    unlockSoulGrade: 0,
  },
  // ── 공격형 (soul grade 2~4) ──
  {
    id: 'tiger_hunter', nameKR: '착호갑사', emoji: '🏹', statFocus: 'ATK·보스',
    statMultipliers: { hp: 0.9, atk: 1.2, def: 0.9, agi: 1.0, luc: 0.95 },
    passiveSkill: { id: 'beast_hunter', nameKR: '짐승사냥꾼', description: '짐승·요괴 데미지 50% 증가', effect: 'beast_damage', value: 1.5 },
    unlockSoulGrade: 2,
  },
  {
    id: 'dosa', nameKR: '도사', emoji: '🔥', statFocus: 'ATK·마법',
    statMultipliers: { hp: 0.9, atk: 1.2, def: 0.85, agi: 1.0, luc: 1.1 },
    passiveSkill: { id: 'tao_power', nameKR: '도력', description: '모든 스탯 10% 증가', effect: 'stat_boost', value: 1.1 },
    unlockSoulGrade: 3,
  },
  {
    id: 'yacha', nameKR: '야차', emoji: '😈', statFocus: 'AGI·회피',
    statMultipliers: { hp: 0.85, atk: 1.1, def: 0.85, agi: 1.35, luc: 1.0 },
    passiveSkill: { id: 'ghost_step', nameKR: '귀신발걸음', description: '모든 스탯 10% 증가', effect: 'stat_boost', value: 1.1 },
    unlockSoulGrade: 3,
  },
  {
    id: 'gungsu', nameKR: '궁수', emoji: '🎯', statFocus: 'ATK·원거리',
    statMultipliers: { hp: 0.9, atk: 1.15, def: 0.9, agi: 1.15, luc: 1.0 },
    passiveSkill: { id: 'eagle_eye', nameKR: '매의눈', description: '아이템 드롭 20% 증가', effect: 'item_find', value: 1.2 },
    unlockSoulGrade: 4,
  },
  // ── 방어형 (soul grade 3~5) ──
  {
    id: 'uinyeo', nameKR: '의녀', emoji: '💚', statFocus: 'HP·회복',
    statMultipliers: { hp: 1.25, atk: 0.9, def: 1.0, agi: 0.95, luc: 1.05 },
    passiveSkill: { id: 'healing_hand', nameKR: '치유손', description: '최대 HP 5%를 ATK로 전환', effect: 'life_conversion', value: 0.05 },
    unlockSoulGrade: 3,
  },
  {
    id: 'jangsu', nameKR: '장수', emoji: '🪖', statFocus: 'DEF·HP',
    statMultipliers: { hp: 1.2, atk: 0.95, def: 1.25, agi: 0.85, luc: 0.9 },
    passiveSkill: { id: 'iron_wall', nameKR: '철벽', description: '모든 스탯 10% 증가', effect: 'stat_boost', value: 1.1 },
    unlockSoulGrade: 4,
  },
  {
    id: 'seungbyeong', nameKR: '승병', emoji: '🙏', statFocus: 'DEF·반격',
    statMultipliers: { hp: 1.1, atk: 1.0, def: 1.2, agi: 0.9, luc: 0.95 },
    passiveSkill: { id: 'monk_guard', nameKR: '호법', description: '모든 스탯 10% 증가', effect: 'stat_boost', value: 1.1 },
    unlockSoulGrade: 5,
  },
  {
    id: 'geosa', nameKR: '거사', emoji: '🗿', statFocus: 'HP·중갑',
    statMultipliers: { hp: 1.3, atk: 0.9, def: 1.15, agi: 0.8, luc: 0.9 },
    passiveSkill: { id: 'heavy_armor', nameKR: '중갑', description: '최대 HP 5%를 ATK로 전환', effect: 'life_conversion', value: 0.05 },
    unlockSoulGrade: 5,
  },
  // ── 특수형 (soul grade 6~9) ──
  {
    id: 'cheongwan', nameKR: '천관', emoji: '⭐', statFocus: 'LUC·특수',
    statMultipliers: { hp: 0.95, atk: 1.05, def: 0.95, agi: 1.1, luc: 1.4 },
    passiveSkill: { id: 'star_reading', nameKR: '점성', description: '아이템 드롭 20% 증가', effect: 'item_find', value: 1.2 },
    unlockSoulGrade: 6,
  },
  {
    id: 'yongnyeo', nameKR: '용녀', emoji: '🐉', statFocus: '균형·전지',
    statMultipliers: { hp: 1.1, atk: 1.1, def: 1.1, agi: 1.1, luc: 1.1 },
    passiveSkill: { id: 'dragon_blessing', nameKR: '용의축복', description: '모든 스탯 10% 증가', effect: 'stat_boost', value: 1.1 },
    unlockSoulGrade: 7,
  },
  {
    id: 'gwisin', nameKR: '귀신', emoji: '👻', statFocus: 'ATK·유령',
    statMultipliers: { hp: 0.8, atk: 1.35, def: 0.8, agi: 1.2, luc: 1.1 },
    passiveSkill: { id: 'ghost_form', nameKR: '귀신형', description: '짐승·요괴 데미지 50% 증가', effect: 'beast_damage', value: 1.5 },
    unlockSoulGrade: 8,
  },
  {
    id: 'seonin', nameKR: '선인', emoji: '🌙', statFocus: '균형·지혜',
    statMultipliers: { hp: 1.15, atk: 1.15, def: 1.1, agi: 1.1, luc: 1.15 },
    passiveSkill: { id: 'immortal_body', nameKR: '신선체', description: '모든 스탯 10% 증가', effect: 'stat_boost', value: 1.1 },
    unlockSoulGrade: 9,
  },
];

export function getCharacterById(id: string): Character | undefined {
  return CHARACTERS.find(c => c.id === id);
}

export function getUnlockedCharacters(soulGrade: number): Character[] {
  return CHARACTERS.filter(c => c.unlockSoulGrade <= soulGrade);
}
