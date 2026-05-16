import type { MythicId, MythicEffectType } from '../types';

export type MythicAcquisition =
  | { kind: 'milestone'; tier: number }
  | { kind: 'random_drop' };

export interface MythicDef {
  id: MythicId;
  nameKR: string;
  emoji: string;
  descriptionKR: string;
  effectType: MythicEffectType;
  // target values:
  //   flat_mult:     'atk', 'hp', 'def', 'agi', 'luc', 'critDmg', 'evasion', 'fire_dmg',
  //                  'ice_dmg', 'thunder_dmg', 'holy_dmg', 'modifier_magnitude', 'all'
  //   drop_mult:     'gold', 'dr', 'dungeon_currency', 'all_kinds'
  //   cooldown_mult: 'base', 'ult', undefined (= 'both')  [Phase Realms]
  target?: string;
  value: number;          // magnitude (e.g., 0.5 = +50% / 0.3 = -30% / 2 = ×2)
  acquisition: MythicAcquisition;
  // proc-specific
  procTrigger?: 'on_player_hit_received' | 'on_player_attack' | 'on_kill';  // [Phase Realms — +'on_kill']
  procEffect?: 'lifesteal' | 'thorns' | 'sp_steal' | 'magic_burst';
}

export const MYTHICS: Record<MythicId, MythicDef> = {
  // ── 5 milestone-guaranteed ──
  tier1_charm: { id: 'tier1_charm', nameKR: '초월자의 부적', emoji: '🌟',
    descriptionKR: 'ATK +50%',
    effectType: 'flat_mult', target: 'atk', value: 0.5,
    acquisition: { kind: 'milestone', tier: 1 } },
  tier5_seal: { id: 'tier5_seal', nameKR: '초월자의 인장', emoji: '✨',
    descriptionKR: 'HP +50%',
    effectType: 'flat_mult', target: 'hp', value: 0.5,
    acquisition: { kind: 'milestone', tier: 5 } },
  infinity_seal: { id: 'infinity_seal', nameKR: '무한 인장', emoji: '♾️',
    descriptionKR: '모든 drop ×2',
    effectType: 'drop_mult', target: 'all_kinds', value: 1,
    acquisition: { kind: 'milestone', tier: 10 } },
  dimension_navigator: { id: 'dimension_navigator', nameKR: '차원 항해사', emoji: '🧭',
    descriptionKR: '던전 화폐 ×3',
    effectType: 'drop_mult', target: 'dungeon_currency', value: 2,
    acquisition: { kind: 'milestone', tier: 15 } },
  light_of_truth: { id: 'light_of_truth', nameKR: '진리의 빛', emoji: '☀️',
    descriptionKR: '수식어 마그니튜드 +25%',
    effectType: 'flat_mult', target: 'modifier_magnitude', value: 0.25,
    acquisition: { kind: 'milestone', tier: 20 } },
  // ── 25 random drop ──
  fire_throne: { id: 'fire_throne', nameKR: '화염 왕좌', emoji: '🔥',
    descriptionKR: '화염 데미지 +50%',
    effectType: 'flat_mult', target: 'fire_dmg', value: 0.5,
    acquisition: { kind: 'random_drop' } },
  time_hourglass: { id: 'time_hourglass', nameKR: '시간 모래시계', emoji: '⏱️',
    descriptionKR: '스킬 쿨다운 -30%',
    effectType: 'cooldown_mult', value: -0.3,
    acquisition: { kind: 'random_drop' } },
  millennium_promise: { id: 'millennium_promise', nameKR: '천 년 약속', emoji: '🛡️',
    descriptionKR: 'HP +100%',
    effectType: 'flat_mult', target: 'hp', value: 1.0,
    acquisition: { kind: 'random_drop' } },
  soul_truth: { id: 'soul_truth', nameKR: '영혼 진리', emoji: '👁️',
    descriptionKR: '캐릭터 XP ×3',
    effectType: 'xp_mult', value: 2.0,
    acquisition: { kind: 'random_drop' } },
  fate_scales: { id: 'fate_scales', nameKR: '운명 저울', emoji: '⚖️',
    descriptionKR: '크리 데미지 ×2',
    effectType: 'flat_mult', target: 'critDmg', value: 1.0,
    acquisition: { kind: 'random_drop' } },
  frost_crown: { id: 'frost_crown', nameKR: '서리 왕관', emoji: '❄️',
    descriptionKR: '냉기 데미지 +50%',
    effectType: 'flat_mult', target: 'ice_dmg', value: 0.5,
    acquisition: { kind: 'random_drop' } },
  thunder_diadem: { id: 'thunder_diadem', nameKR: '천둥의 관', emoji: '⚡',
    descriptionKR: '번개 데미지 +50%',
    effectType: 'flat_mult', target: 'thunder_dmg', value: 0.5,
    acquisition: { kind: 'random_drop' } },
  divine_halo: { id: 'divine_halo', nameKR: '신성의 후광', emoji: '🌟',
    descriptionKR: '신성 데미지 +50%',
    effectType: 'flat_mult', target: 'holy_dmg', value: 0.5,
    acquisition: { kind: 'random_drop' } },
  phantom_cloak: { id: 'phantom_cloak', nameKR: '환영의 망토', emoji: '🦇',
    descriptionKR: '회피 +25%',
    effectType: 'flat_mult', target: 'evasion', value: 0.25,
    acquisition: { kind: 'random_drop' } },
  iron_aegis: { id: 'iron_aegis', nameKR: '강철 방패', emoji: '🛡️',
    descriptionKR: 'DEF +100%',
    effectType: 'flat_mult', target: 'def', value: 1.0,
    acquisition: { kind: 'random_drop' } },
  serpent_fang: { id: 'serpent_fang', nameKR: '뱀의 송곳니', emoji: '🐍',
    descriptionKR: '흡혈 20%',
    effectType: 'proc', value: 0.2,
    procTrigger: 'on_player_attack', procEffect: 'lifesteal',
    acquisition: { kind: 'random_drop' } },
  gluttony_chalice: { id: 'gluttony_chalice', nameKR: '탐욕의 성배', emoji: '🍷',
    descriptionKR: '처치 시 모든 active skill cooldown -0.3초',
    effectType: 'proc', value: 0.3,
    procTrigger: 'on_kill', procEffect: 'sp_steal',
    acquisition: { kind: 'random_drop' } },
  thorned_skin: { id: 'thorned_skin', nameKR: '가시 갑옷', emoji: '🌵',
    descriptionKR: '받은 데미지 50% 반사',
    effectType: 'proc', value: 0.5,
    procTrigger: 'on_player_hit_received', procEffect: 'thorns',
    acquisition: { kind: 'random_drop' } },
  swift_winds: { id: 'swift_winds', nameKR: '신속의 바람', emoji: '🌪️',
    descriptionKR: '기본 스킬 쿨다운 -20%',
    effectType: 'cooldown_mult', value: -0.2, target: 'base',
    acquisition: { kind: 'random_drop' } },
  eternal_flame: { id: 'eternal_flame', nameKR: '영원의 불꽃', emoji: '🔥',
    descriptionKR: 'ATK +75%',
    effectType: 'flat_mult', target: 'atk', value: 0.75,
    acquisition: { kind: 'random_drop' } },
  void_pact: { id: 'void_pact', nameKR: '공허 계약', emoji: '🕳️',
    descriptionKR: '모든 stat +20%',
    effectType: 'flat_mult', target: 'all', value: 0.2,
    acquisition: { kind: 'random_drop' } },
  dragon_heart: { id: 'dragon_heart', nameKR: '용의 심장', emoji: '🐉',
    descriptionKR: 'HP +75%',
    effectType: 'flat_mult', target: 'hp', value: 0.75,
    acquisition: { kind: 'random_drop' } },
  phoenix_feather: { id: 'phoenix_feather', nameKR: '불사조 깃털', emoji: '🪶',
    descriptionKR: '런당 1회 부활',
    effectType: 'passive', value: 1,
    acquisition: { kind: 'random_drop' } },
  lucky_clover: { id: 'lucky_clover', nameKR: '행운의 클로버', emoji: '🍀',
    descriptionKR: 'LUC +100%',
    effectType: 'flat_mult', target: 'luc', value: 1.0,
    acquisition: { kind: 'random_drop' } },
  merchant_seal: { id: 'merchant_seal', nameKR: '상인의 인장', emoji: '💰',
    descriptionKR: '골드 +100%',
    effectType: 'drop_mult', target: 'gold', value: 1.0,
    acquisition: { kind: 'random_drop' } },
  scholar_eye: { id: 'scholar_eye', nameKR: '학자의 눈', emoji: '📖',
    descriptionKR: '캐릭터 XP ×2',
    effectType: 'xp_mult', value: 1.0,
    acquisition: { kind: 'random_drop' } },
  assassin_dagger: { id: 'assassin_dagger', nameKR: '암살자 단검', emoji: '🗡️',
    descriptionKR: '크리율 +25%',
    effectType: 'flat_mult', target: 'critRate', value: 0.25,
    acquisition: { kind: 'random_drop' } },
  berserker_axe: { id: 'berserker_axe', nameKR: '광전사 도끼', emoji: '🪓',
    descriptionKR: 'ATK +75%',
    effectType: 'flat_mult', target: 'atk', value: 0.75,
    acquisition: { kind: 'random_drop' } },
  crystal_orb: { id: 'crystal_orb', nameKR: '수정 구슬', emoji: '🔮',
    descriptionKR: '공격 시 15% 확률 마법 폭발',
    effectType: 'proc', value: 0.15,
    procTrigger: 'on_player_attack', procEffect: 'magic_burst',
    acquisition: { kind: 'random_drop' } },
  world_tree_root: { id: 'world_tree_root', nameKR: '세계수 뿌리', emoji: '🌳',
    descriptionKR: 'HP 재생 +200%',
    effectType: 'flat_mult', target: 'hp_regen', value: 2.0,
    acquisition: { kind: 'random_drop' } },
};

export const ALL_MYTHIC_IDS: MythicId[] = Object.keys(MYTHICS);

export const MILESTONE_MYTHIC_BY_TIER: Record<number, MythicId> = {
  1: 'tier1_charm', 5: 'tier5_seal', 10: 'infinity_seal',
  15: 'dimension_navigator', 20: 'light_of_truth',
};

export const MILESTONE_TIERS = [1, 5, 10, 15, 20];
