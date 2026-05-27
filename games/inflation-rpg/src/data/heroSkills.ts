/**
 * V1b passive hero skills. Each skill on learn applies a flat multiplier to
 * hero.atkBase / hpBase. Skills are gated by job affinity (`jobIds`) so that
 * the same hero in different jobs has a different skill pool to learn from —
 * a key axis for cycle-to-cycle variety.
 */

export interface HeroSkill {
  id: string;
  nameKR: string;
  description: string;
  atkMul: number;
  hpMul: number;
  jobIds: readonly string[];
}

export const HERO_SKILLS: readonly HeroSkill[] = [
  // Physical / warrior-ish
  { id: 'strike',          nameKR: '일격',         description: '강력한 단일 강타',    atkMul: 1.15, hpMul: 1.00, jobIds: ['warrior', 'paladin', 'hero'] },
  { id: 'cleave',          nameKR: '횡베기',       description: 'AoE 검술',          atkMul: 1.12, hpMul: 1.00, jobIds: ['warrior', 'paladin'] },
  { id: 'shield_wall',     nameKR: '방패막기',     description: '강력한 방어',        atkMul: 1.02, hpMul: 1.18, jobIds: ['warrior', 'paladin'] },

  // Ranged / archer-ish
  { id: 'aim',             nameKR: '저격',         description: '정확한 일격',        atkMul: 1.15, hpMul: 0.98, jobIds: ['archer', 'ranger'] },
  { id: 'multishot',       nameKR: '연사',         description: '연속 화살',          atkMul: 1.12, hpMul: 1.00, jobIds: ['archer', 'ranger'] },
  { id: 'wind_walk',       nameKR: '바람걸음',     description: '회피 강화',          atkMul: 1.05, hpMul: 1.08, jobIds: ['archer', 'ranger', 'rogue'] },

  // Stealth / rogue-ish
  { id: 'backstab',        nameKR: '기습',         description: '뒤치기 치명',        atkMul: 1.20, hpMul: 0.92, jobIds: ['rogue', 'assassin'] },
  { id: 'poison',          nameKR: '독묻히기',     description: '독 추가',           atkMul: 1.10, hpMul: 0.98, jobIds: ['rogue', 'assassin'] },
  { id: 'shadow_step',     nameKR: '그림자걸음',   description: '회피 + 기습',        atkMul: 1.13, hpMul: 1.04, jobIds: ['rogue', 'assassin', 'dark_lord'] },

  // Arcane / mage-ish
  { id: 'fireball',        nameKR: '화염구',       description: '범위 화염',          atkMul: 1.25, hpMul: 1.00, jobIds: ['mage', 'archmage'] },
  { id: 'icebolt',         nameKR: '얼음창',       description: '관통 얼음',          atkMul: 1.20, hpMul: 1.00, jobIds: ['mage', 'archmage'] },
  { id: 'arcane_mastery',  nameKR: '비전통달',     description: '마법 증폭',          atkMul: 1.22, hpMul: 1.00, jobIds: ['mage', 'archmage', 'sage'] },

  // Holy / priest-ish
  { id: 'bless',           nameKR: '축복',         description: '신성 강화',          atkMul: 1.05, hpMul: 1.18, jobIds: ['priest', 'saint', 'paladin'] },
  { id: 'heal',            nameKR: '치유',         description: '자가 회복',          atkMul: 1.00, hpMul: 1.22, jobIds: ['priest', 'saint'] },
  { id: 'divine_judgment', nameKR: '신성심판',     description: '신성 일격',          atkMul: 1.28, hpMul: 1.08, jobIds: ['paladin', 'saint', 'hero'] },

  // Monk / sage-ish
  { id: 'meditation',      nameKR: '명상',         description: '내공 증진',          atkMul: 1.10, hpMul: 1.12, jobIds: ['monk', 'grandmaster', 'sage'] },
  { id: 'palm_strike',     nameKR: '장권',         description: '내공 권법',          atkMul: 1.25, hpMul: 1.02, jobIds: ['monk', 'grandmaster'] },

  // Dark / cursed
  { id: 'curse',           nameKR: '저주',         description: '디버프 + 데미지',    atkMul: 1.15, hpMul: 1.00, jobIds: ['dark_lord', 'assassin'] },
  { id: 'soul_drain',      nameKR: '영혼흡수',     description: '적의 영혼을 흡수',   atkMul: 1.25, hpMul: 1.06, jobIds: ['dark_lord', 'mage'] },

  // Universal (sage / apprentice / fallback)
  { id: 'second_wind',     nameKR: '재생의 호흡',  description: 'HP 자연 회복',       atkMul: 1.00, hpMul: 1.15, jobIds: ['apprentice', 'sage', 'priest'] },
  { id: 'inner_focus',     nameKR: '내적 집중',    description: '모든 스탯 소폭 향상', atkMul: 1.05, hpMul: 1.05, jobIds: ['apprentice', 'sage'] },
];

export function findSkillsForJob(jobId: string): HeroSkill[] {
  return HERO_SKILLS.filter(s => s.jobIds.includes(jobId));
}

export function findSkillById(id: string): HeroSkill | undefined {
  return HERO_SKILLS.find(s => s.id === id);
}
