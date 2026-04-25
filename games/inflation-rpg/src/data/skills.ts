import type { ActiveSkill } from '../types';

export const SKILLS: Record<string, [ActiveSkill, ActiveSkill]> = {
  hwarang: [
    { id: 'hwarang-strike', nameKR: '화랑일격', description: '단일 강타',
      cooldownSec: 5, effect: { type: 'multi_hit', multiplier: 3, targets: 1 }, vfxEmoji: '⚔️' },
    { id: 'hwarang-rush', nameKR: '돌격', description: '연속 공격',
      cooldownSec: 8, effect: { type: 'multi_hit', multiplier: 1.5, targets: 3 }, vfxEmoji: '💨' },
  ],
  mudang: [
    { id: 'mudang-curse', nameKR: '저주', description: '실행 처치 (HP 30% 이하)',
      cooldownSec: 12, effect: { type: 'execute', executeThreshold: 0.3 }, vfxEmoji: '🌀' },
    { id: 'mudang-bless', nameKR: '축복', description: 'LUC 50% 일시증가',
      cooldownSec: 15, effect: { type: 'buff', buffStat: 'luc', buffPercent: 50, buffDurationSec: 8 }, vfxEmoji: '✨' },
  ],
  choeui: [
    { id: 'choeui-shield', nameKR: '방패막기', description: 'DEF 50% 증가',
      cooldownSec: 8, effect: { type: 'buff', buffStat: 'def', buffPercent: 50, buffDurationSec: 6 }, vfxEmoji: '🛡️' },
    { id: 'choeui-reflect', nameKR: '반격', description: '강력한 반격타',
      cooldownSec: 10, effect: { type: 'multi_hit', multiplier: 2.5, targets: 1 }, vfxEmoji: '⚡' },
  ],
  geomgaek: [
    { id: 'geomgaek-iaido', nameKR: '발도술', description: '치명타급 일격',
      cooldownSec: 6, effect: { type: 'multi_hit', multiplier: 4, targets: 1 }, vfxEmoji: '🗡️' },
    { id: 'geomgaek-storm', nameKR: '검풍', description: 'AoE 검기',
      cooldownSec: 9, effect: { type: 'aoe', multiplier: 2, targets: 4 }, vfxEmoji: '🌪️' },
  ],
  tiger_hunter: [
    { id: 'tiger-snipe', nameKR: '저격', description: 'HP 30% 이하 즉사',
      cooldownSec: 12, effect: { type: 'execute', executeThreshold: 0.3 }, vfxEmoji: '🎯' },
    { id: 'tiger-volley', nameKR: '연발사격', description: '5연발',
      cooldownSec: 7, effect: { type: 'multi_hit', multiplier: 1, targets: 5 }, vfxEmoji: '🏹' },
  ],
  dosa: [
    { id: 'dosa-fireball', nameKR: '화염구', description: '범위 폭발',
      cooldownSec: 6, effect: { type: 'aoe', multiplier: 2.5, targets: 3 }, vfxEmoji: '🔥' },
    { id: 'dosa-thunder', nameKR: '낙뢰', description: '강력한 단일 마법',
      cooldownSec: 10, effect: { type: 'multi_hit', multiplier: 3.5, targets: 1 }, vfxEmoji: '⚡' },
  ],
  yacha: [
    { id: 'yacha-stealth', nameKR: '은신', description: 'AGI 100% 일시증가',
      cooldownSec: 10, effect: { type: 'buff', buffStat: 'agi', buffPercent: 100, buffDurationSec: 4 }, vfxEmoji: '👤' },
    { id: 'yacha-shadow', nameKR: '그림자칼', description: '연속 4회',
      cooldownSec: 7, effect: { type: 'multi_hit', multiplier: 1.3, targets: 4 }, vfxEmoji: '🌑' },
  ],
  gungsu: [
    { id: 'gungsu-pierce', nameKR: '관통사격', description: '높은 데미지 단일',
      cooldownSec: 6, effect: { type: 'multi_hit', multiplier: 3.5, targets: 1 }, vfxEmoji: '🏹' },
    { id: 'gungsu-rain', nameKR: '화살비', description: 'AoE',
      cooldownSec: 8, effect: { type: 'aoe', multiplier: 1.8, targets: 5 }, vfxEmoji: '☔' },
  ],
  uinyeo: [
    { id: 'uinyeo-heal', nameKR: '치유', description: 'HP 40% 회복',
      cooldownSec: 12, effect: { type: 'heal', healPercent: 40 }, vfxEmoji: '💚' },
    { id: 'uinyeo-revive', nameKR: '소생', description: 'HP 60% 회복',
      cooldownSec: 20, effect: { type: 'heal', healPercent: 60 }, vfxEmoji: '🌿' },
  ],
  jangsu: [
    { id: 'jangsu-rally', nameKR: '집결', description: 'ATK 30% 일시증가',
      cooldownSec: 10, effect: { type: 'buff', buffStat: 'atk', buffPercent: 30, buffDurationSec: 8 }, vfxEmoji: '🪖' },
    { id: 'jangsu-charge', nameKR: '돌격', description: '강타',
      cooldownSec: 7, effect: { type: 'multi_hit', multiplier: 2.8, targets: 1 }, vfxEmoji: '⚔️' },
  ],
  seungbyeong: [
    { id: 'seungbyeong-counter', nameKR: '반격술', description: '반격 강타',
      cooldownSec: 8, effect: { type: 'multi_hit', multiplier: 3, targets: 1 }, vfxEmoji: '🥋' },
    { id: 'seungbyeong-defend', nameKR: '금강방어', description: 'DEF 70% 증가',
      cooldownSec: 12, effect: { type: 'buff', buffStat: 'def', buffPercent: 70, buffDurationSec: 5 }, vfxEmoji: '🛡️' },
  ],
  geosa: [
    { id: 'geosa-fortify', nameKR: '요새화', description: 'DEF 100% 일시증가',
      cooldownSec: 14, effect: { type: 'buff', buffStat: 'def', buffPercent: 100, buffDurationSec: 6 }, vfxEmoji: '🗿' },
    { id: 'geosa-quake', nameKR: '진동', description: 'AoE',
      cooldownSec: 10, effect: { type: 'aoe', multiplier: 2, targets: 4 }, vfxEmoji: '🌊' },
  ],
  cheongwan: [
    { id: 'cheongwan-fortune', nameKR: '행운의 주사위', description: 'LUC 100% 일시증가',
      cooldownSec: 15, effect: { type: 'buff', buffStat: 'luc', buffPercent: 100, buffDurationSec: 10 }, vfxEmoji: '🎲' },
    { id: 'cheongwan-strike', nameKR: '천운일격', description: '강력한 단일',
      cooldownSec: 9, effect: { type: 'multi_hit', multiplier: 3.5, targets: 1 }, vfxEmoji: '⭐' },
  ],
  yongnyeo: [
    { id: 'yongnyeo-breath', nameKR: '용의 숨결', description: 'AoE 화염',
      cooldownSec: 11, effect: { type: 'aoe', multiplier: 3, targets: 5 }, vfxEmoji: '🐉' },
    { id: 'yongnyeo-claw', nameKR: '용발톱', description: '연속 3타',
      cooldownSec: 7, effect: { type: 'multi_hit', multiplier: 2, targets: 3 }, vfxEmoji: '🐾' },
  ],
  gwisin: [
    { id: 'gwisin-haunt', nameKR: '원혼', description: '실행 처치 (HP 25%)',
      cooldownSec: 12, effect: { type: 'execute', executeThreshold: 0.25 }, vfxEmoji: '👻' },
    { id: 'gwisin-wail', nameKR: '곡소리', description: '연속 4타',
      cooldownSec: 8, effect: { type: 'multi_hit', multiplier: 1.7, targets: 4 }, vfxEmoji: '😱' },
  ],
  seonin: [
    { id: 'seonin-meditate', nameKR: '명상', description: 'HP 30% 회복',
      cooldownSec: 14, effect: { type: 'heal', healPercent: 30 }, vfxEmoji: '🧘' },
    { id: 'seonin-wisdom', nameKR: '천지지혜', description: '모든 스탯 30% 일시',
      cooldownSec: 18, effect: { type: 'buff', buffStat: 'atk', buffPercent: 30, buffDurationSec: 12 }, vfxEmoji: '📜' },
  ],
};

export function getSkillsForCharacter(charId: string): [ActiveSkill, ActiveSkill] | null {
  return SKILLS[charId] ?? null;
}

export function getAllSkills(): ActiveSkill[] {
  return Object.values(SKILLS).flat();
}
