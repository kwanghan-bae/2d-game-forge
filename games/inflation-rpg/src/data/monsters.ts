import type { Monster } from '../types';

export const MONSTERS: Monster[] = [
  // ── Common (all regions) — 기존 8 종 + regionTags ──
  { id: 'slime',    nameKR: '슬라임',    emoji: '🟢', levelMin: 1,     levelMax: 100,    hpMult: 1.0, atkMult: 0.8,  defMult: 0.5,  expMult: 1.0,  goldMult: 1.0,  isBoss: false, regionTags: ['*'] },
  { id: 'goblin',   nameKR: '도깨비',    emoji: '👺', levelMin: 50,    levelMax: 500,    hpMult: 3.0, atkMult: 1.0,  defMult: 0.8,  expMult: 1.1,  goldMult: 1.1,  isBoss: false, regionTags: ['*'] },
  { id: 'tiger',    nameKR: '호랑이',    emoji: '🐯', levelMin: 200,   levelMax: 2000,   hpMult: 3.0, atkMult: 1.3,  defMult: 1.0,  expMult: 1.3,  goldMult: 1.2,  isBoss: false, regionTags: ['*'] },
  { id: 'dragon',   nameKR: '용',        emoji: '🐉', levelMin: 1000,  levelMax: 10000,  hpMult: 3.0, atkMult: 1.8,  defMult: 1.5,  expMult: 1.8,  goldMult: 1.5,  isBoss: false, regionTags: ['*'] },
  { id: 'ghost',    nameKR: '귀신',      emoji: '👻', levelMin: 500,   levelMax: 5000,   hpMult: 1.5, atkMult: 1.5,  defMult: 0.5,  expMult: 1.4,  goldMult: 1.3,  isBoss: false, regionTags: ['*'] },
  { id: 'undead',   nameKR: '망자',      emoji: '💀', levelMin: 5000,  levelMax: 50000,  hpMult: 1.8, atkMult: 1.6,  defMult: 1.3,  expMult: 1.7,  goldMult: 1.4,  isBoss: false, regionTags: ['*'] },
  { id: 'deity',    nameKR: '신수',      emoji: '🌟', levelMin: 20000, levelMax: 200000, hpMult: 2.5, atkMult: 2.2,  defMult: 2.0,  expMult: 2.0,  goldMult: 1.8,  isBoss: false, regionTags: ['*'] },
  { id: 'chaos',    nameKR: '혼돈체',    emoji: '🌀', levelMin: 100000,levelMax: Infinity,hpMult: 3.0, atkMult: 2.8, defMult: 2.5,  expMult: 2.5,  goldMult: 2.0,  isBoss: false, regionTags: ['*'] },

  // ── plains (5종) ──
  { id: 'plains-imp',      nameKR: '도깨비병사',  emoji: '🪖', levelMin: 1,    levelMax: 800,   hpMult: 0.9, atkMult: 0.7, defMult: 0.6, expMult: 1.0, goldMult: 1.0, isBoss: false, regionTags: ['plains'] },
  { id: 'plains-rat',      nameKR: '들쥐',       emoji: '🐀', levelMin: 1,    levelMax: 300,   hpMult: 0.6, atkMult: 0.5, defMult: 0.3, expMult: 0.8, goldMult: 0.9, isBoss: false, regionTags: ['plains'] },
  { id: 'plains-crow',     nameKR: '까마귀',     emoji: '🐦‍⬛', levelMin: 50,   levelMax: 1500,  hpMult: 0.7, atkMult: 0.9, defMult: 0.4, expMult: 1.1, goldMult: 1.0, isBoss: false, regionTags: ['plains'] },
  { id: 'plains-bandit',   nameKR: '야적',       emoji: '🥷', levelMin: 200,  levelMax: 3000,  hpMult: 1.1, atkMult: 1.1, defMult: 0.9, expMult: 1.2, goldMult: 1.4, isBoss: false, regionTags: ['plains'] },
  { id: 'plains-ronin',    nameKR: '길잃은영혼', emoji: '🪦', levelMin: 800,  levelMax: 5000,  hpMult: 1.0, atkMult: 1.2, defMult: 0.7, expMult: 1.3, goldMult: 1.1, isBoss: false, regionTags: ['plains'] },

  // ── forest (5종) ──
  { id: 'forest-fox',      nameKR: '여우',       emoji: '🦊', levelMin: 500,  levelMax: 5000,  hpMult: 0.8, atkMult: 1.1, defMult: 0.6, expMult: 1.2, goldMult: 1.1, isBoss: false, regionTags: ['forest'] },
  { id: 'forest-squirrel', nameKR: '청설모',     emoji: '🐿️', levelMin: 500,  levelMax: 3000,  hpMult: 0.5, atkMult: 0.6, defMult: 0.4, expMult: 1.0, goldMult: 0.9, isBoss: false, regionTags: ['forest'] },
  { id: 'forest-bear',     nameKR: '곰',         emoji: '🐻', levelMin: 2000, levelMax: 12000, hpMult: 1.6, atkMult: 1.5, defMult: 1.2, expMult: 1.4, goldMult: 1.2, isBoss: false, regionTags: ['forest'] },
  { id: 'forest-spirit',   nameKR: '나무정령',   emoji: '🌳', levelMin: 3000, levelMax: 18000, hpMult: 1.8, atkMult: 1.0, defMult: 1.5, expMult: 1.5, goldMult: 1.3, isBoss: false, regionTags: ['forest'] },
  { id: 'forest-snake',    nameKR: '독뱀',       emoji: '🐍', levelMin: 800,  levelMax: 8000,  hpMult: 0.7, atkMult: 1.4, defMult: 0.5, expMult: 1.3, goldMult: 1.0, isBoss: false, regionTags: ['forest'] },

  // ── mountains (5종) ──
  { id: 'mountain-goat',   nameKR: '산양',       emoji: '🐐', levelMin: 3000,  levelMax: 15000,  hpMult: 1.0, atkMult: 1.0, defMult: 0.8, expMult: 1.1, goldMult: 1.0, isBoss: false, regionTags: ['mountains'] },
  { id: 'mountain-bandit', nameKR: '산적',       emoji: '🤺', levelMin: 4000,  levelMax: 25000,  hpMult: 1.3, atkMult: 1.4, defMult: 1.1, expMult: 1.3, goldMult: 1.5, isBoss: false, regionTags: ['mountains'] },
  { id: 'mountain-eagle',  nameKR: '검독수리',   emoji: '🦅', levelMin: 6000,  levelMax: 50000,  hpMult: 1.0, atkMult: 1.6, defMult: 0.7, expMult: 1.4, goldMult: 1.1, isBoss: false, regionTags: ['mountains'] },
  { id: 'mountain-miner',  nameKR: '광부유령',   emoji: '⛏️', levelMin: 8000,  levelMax: 80000,  hpMult: 1.4, atkMult: 1.3, defMult: 1.4, expMult: 1.5, goldMult: 1.6, isBoss: false, regionTags: ['mountains'] },
  { id: 'mountain-grey',   nameKR: '회색곰',     emoji: '🦣', levelMin: 20000, levelMax: 180000, hpMult: 2.0, atkMult: 1.9, defMult: 1.8, expMult: 1.8, goldMult: 1.5, isBoss: false, regionTags: ['mountains'] },

  // ── coast (5종) ──
  { id: 'coast-eel',       nameKR: '뱀장어',     emoji: '🐠', levelMin: 1000,  levelMax: 8000,    hpMult: 0.7, atkMult: 1.2, defMult: 0.5, expMult: 1.2, goldMult: 1.0, isBoss: false, regionTags: ['coast'] },
  { id: 'coast-turtle',    nameKR: '거북',       emoji: '🐢', levelMin: 2000,  levelMax: 20000,   hpMult: 1.5, atkMult: 0.8, defMult: 1.8, expMult: 1.3, goldMult: 1.1, isBoss: false, regionTags: ['coast'] },
  { id: 'coast-crab',      nameKR: '대게',       emoji: '🦀', levelMin: 3000,  levelMax: 30000,   hpMult: 1.2, atkMult: 1.3, defMult: 1.5, expMult: 1.4, goldMult: 1.3, isBoss: false, regionTags: ['coast'] },
  { id: 'coast-mermaid',   nameKR: '인어',       emoji: '🧜', levelMin: 8000,  levelMax: 80000,   hpMult: 1.1, atkMult: 1.5, defMult: 0.9, expMult: 1.6, goldMult: 1.4, isBoss: false, regionTags: ['coast'] },
  { id: 'coast-deepfish',  nameKR: '심해어',     emoji: '🐟', levelMin: 15000, levelMax: 150000,  hpMult: 1.7, atkMult: 1.7, defMult: 1.0, expMult: 1.7, goldMult: 1.4, isBoss: false, regionTags: ['coast'] },

  // ── underground (5종) ──
  { id: 'cave-bat',        nameKR: '박쥐',       emoji: '🦇', levelMin: 1000,  levelMax: 10000,   hpMult: 0.6, atkMult: 1.1, defMult: 0.4, expMult: 1.1, goldMult: 0.9, isBoss: false, regionTags: ['underworld'] },
  { id: 'cave-spider',     nameKR: '거대거미',   emoji: '🕷️', levelMin: 2000,  levelMax: 20000,   hpMult: 0.9, atkMult: 1.3, defMult: 0.7, expMult: 1.3, goldMult: 1.1, isBoss: false, regionTags: ['underworld'] },
  { id: 'cave-miner-ghost',nameKR: '광부영혼',   emoji: '👷', levelMin: 5000,  levelMax: 50000,   hpMult: 1.1, atkMult: 1.2, defMult: 1.0, expMult: 1.4, goldMult: 1.7, isBoss: false, regionTags: ['underworld'] },
  { id: 'cave-golem',      nameKR: '석상골렘',   emoji: '🗿', levelMin: 12000, levelMax: 120000,  hpMult: 2.2, atkMult: 1.4, defMult: 2.5, expMult: 1.6, goldMult: 1.4, isBoss: false, regionTags: ['underworld'] },
  { id: 'cave-salamander', nameKR: '도롱뇽',     emoji: '🦎', levelMin: 800,   levelMax: 12000,   hpMult: 0.7, atkMult: 1.0, defMult: 0.6, expMult: 1.0, goldMult: 1.0, isBoss: false, regionTags: ['underworld'] },

  // ── heaven-realm (5종) ──
  { id: 'heaven-immortal', nameKR: '선동',       emoji: '👼', levelMin: 30000,  levelMax: 300000,  hpMult: 1.5, atkMult: 1.6, defMult: 1.2, expMult: 1.8, goldMult: 1.7, isBoss: false, regionTags: ['heaven-realm'] },
  { id: 'heaven-crane',    nameKR: '학',         emoji: '🦩', levelMin: 25000,  levelMax: 250000,  hpMult: 1.3, atkMult: 1.5, defMult: 1.0, expMult: 1.7, goldMult: 1.5, isBoss: false, regionTags: ['heaven-realm'] },
  { id: 'heaven-horse',    nameKR: '신마',       emoji: '🐎', levelMin: 50000,  levelMax: 500000,  hpMult: 1.8, atkMult: 1.9, defMult: 1.4, expMult: 1.9, goldMult: 1.8, isBoss: false, regionTags: ['heaven-realm'] },
  { id: 'heaven-rabbit',   nameKR: '옥토끼',     emoji: '🐇', levelMin: 20000,  levelMax: 200000,  hpMult: 0.9, atkMult: 1.4, defMult: 0.8, expMult: 1.6, goldMult: 1.4, isBoss: false, regionTags: ['heaven-realm'] },
  { id: 'heaven-phoenix',  nameKR: '봉황',       emoji: '🔥', levelMin: 100000, levelMax: 1000000, hpMult: 2.5, atkMult: 2.3, defMult: 1.8, expMult: 2.1, goldMult: 1.9, isBoss: false, regionTags: ['heaven-realm'] },

  // ── underworld (5종) ──
  { id: 'under-dead',      nameKR: '저승망자',   emoji: '🧟', levelMin: 8000,   levelMax: 80000,   hpMult: 1.4, atkMult: 1.2, defMult: 1.1, expMult: 1.4, goldMult: 1.2, isBoss: false, regionTags: ['underworld'] },
  { id: 'under-reaper',    nameKR: '저승사자',   emoji: '☠️', levelMin: 30000,  levelMax: 300000,  hpMult: 1.7, atkMult: 1.9, defMult: 1.3, expMult: 1.8, goldMult: 1.5, isBoss: false, regionTags: ['underworld'] },
  { id: 'under-maiden',    nameKR: '처녀귀신',   emoji: '👻', levelMin: 5000,   levelMax: 50000,   hpMult: 0.9, atkMult: 1.6, defMult: 0.7, expMult: 1.5, goldMult: 1.3, isBoss: false, regionTags: ['underworld'] },
  { id: 'under-flame',     nameKR: '도깨비불',   emoji: '🔥', levelMin: 15000,  levelMax: 150000,  hpMult: 0.8, atkMult: 2.0, defMult: 0.6, expMult: 1.7, goldMult: 1.4, isBoss: false, regionTags: ['underworld'] },
  { id: 'under-spirit',    nameKR: '사령',       emoji: '🦇', levelMin: 20000,  levelMax: 200000,  hpMult: 1.5, atkMult: 1.5, defMult: 1.2, expMult: 1.6, goldMult: 1.4, isBoss: false, regionTags: ['underworld'] },

  // ── chaos (5종) ──
  { id: 'chaos-shard',     nameKR: '혼돈파편',   emoji: '💥', levelMin: 100000,  levelMax: 1000000,  hpMult: 1.5, atkMult: 1.8, defMult: 1.0, expMult: 1.8, goldMult: 1.5, isBoss: false, regionTags: ['chaos'] },
  { id: 'chaos-eroder',    nameKR: '차원침식체', emoji: '🌀', levelMin: 200000,  levelMax: 2000000,  hpMult: 2.0, atkMult: 2.0, defMult: 1.5, expMult: 2.0, goldMult: 1.7, isBoss: false, regionTags: ['chaos'] },
  { id: 'chaos-mutant',    nameKR: '변이체',     emoji: '👾', levelMin: 150000,  levelMax: 1500000,  hpMult: 1.8, atkMult: 1.9, defMult: 1.3, expMult: 1.9, goldMult: 1.6, isBoss: false, regionTags: ['chaos'] },
  { id: 'chaos-bubble',    nameKR: '시간거품',   emoji: '⏳', levelMin: 300000,  levelMax: 3000000,  hpMult: 2.2, atkMult: 1.7, defMult: 1.8, expMult: 2.1, goldMult: 1.8, isBoss: false, regionTags: ['chaos'] },
  { id: 'chaos-void',      nameKR: '공허파편',   emoji: '🌑', levelMin: 500000,  levelMax: 5000000,  hpMult: 2.5, atkMult: 2.5, defMult: 2.0, expMult: 2.3, goldMult: 2.0, isBoss: false, regionTags: ['chaos'] },

  // ── volcano (5종) ──
  { id: 'volcano-sprite',    nameKR: '화염 정령',     emoji: '🔥', levelMin: 100000, levelMax: 1000000,  hpMult: 2.0, atkMult: 2.2, defMult: 1.5, expMult: 2.0, goldMult: 1.7, isBoss: false, regionTags: ['volcano'] },
  { id: 'volcano-golem',     nameKR: '용암 골렘',     emoji: '🪨', levelMin: 150000, levelMax: 1500000,  hpMult: 2.8, atkMult: 2.0, defMult: 2.5, expMult: 2.1, goldMult: 1.8, isBoss: false, regionTags: ['volcano'] },
  { id: 'volcano-wyrm',      nameKR: '용암룡',       emoji: '🐉', levelMin: 200000, levelMax: 2000000,  hpMult: 3.2, atkMult: 2.5, defMult: 1.8, expMult: 2.3, goldMult: 2.0, isBoss: false, regionTags: ['volcano'] },
  { id: 'volcano-phoenix',   nameKR: '불사조',       emoji: '🦅', levelMin: 300000, levelMax: 3000000,  hpMult: 2.5, atkMult: 2.8, defMult: 1.6, expMult: 2.4, goldMult: 2.1, isBoss: false, regionTags: ['volcano'] },
  { id: 'volcano-lord',      nameKR: '화산의 군주',   emoji: '👹', levelMin: 500000, levelMax: 5000000,  hpMult: 3.5, atkMult: 3.2, defMult: 2.2, expMult: 2.6, goldMult: 2.3, isBoss: false, regionTags: ['volcano'] },

  // ── final-realm (3종) ──
  { id: 'final-shadow',    nameKR: '종말의그림자', emoji: '🖤', levelMin: 1000000, levelMax: Infinity, hpMult: 3.0, atkMult: 2.8, defMult: 2.3, expMult: 2.5, goldMult: 2.0, isBoss: false, regionTags: ['final-realm'] },
  { id: 'final-warrior',   nameKR: '신화전사',     emoji: '⚔️', levelMin: 2000000, levelMax: Infinity, hpMult: 3.5, atkMult: 3.2, defMult: 2.5, expMult: 2.6, goldMult: 2.1, isBoss: false, regionTags: ['final-realm'] },
  { id: 'final-titan',     nameKR: '거신',         emoji: '🗿', levelMin: 5000000, levelMax: Infinity, hpMult: 4.0, atkMult: 3.5, defMult: 3.0, expMult: 2.8, goldMult: 2.2, isBoss: false, regionTags: ['final-realm'] },

  // ── demon-castle (5종) ──
  { id: 'demon-imp',       nameKR: '마족병',       emoji: '👿', levelMin: 400000, levelMax: 4000000,  hpMult: 2.2, atkMult: 2.4, defMult: 1.8, expMult: 2.2, goldMult: 1.9, isBoss: false, regionTags: ['demon-castle'] },
  { id: 'demon-sorcerer',  nameKR: '마술사',       emoji: '🧙', levelMin: 500000, levelMax: 5000000,  hpMult: 1.8, atkMult: 3.0, defMult: 1.5, expMult: 2.4, goldMult: 2.0, isBoss: false, regionTags: ['demon-castle'] },
  { id: 'demon-knight',    nameKR: '마극사',       emoji: '⚔️', levelMin: 600000, levelMax: 6000000,  hpMult: 3.0, atkMult: 2.6, defMult: 2.2, expMult: 2.5, goldMult: 2.2, isBoss: false, regionTags: ['demon-castle'] },
  { id: 'demon-general',   nameKR: '마장',         emoji: '🎖️', levelMin: 800000, levelMax: 8000000,  hpMult: 3.5, atkMult: 2.9, defMult: 2.6, expMult: 2.6, goldMult: 2.4, isBoss: false, regionTags: ['demon-castle'] },
  { id: 'demon-overlord',  nameKR: '마대공',       emoji: '👹', levelMin: 1000000, levelMax: 10000000, hpMult: 4.0, atkMult: 3.5, defMult: 3.0, expMult: 2.8, goldMult: 2.6, isBoss: false, regionTags: ['demon-castle'] },
];

export function getMonstersForLevel(level: number, regionId?: string): Monster[] {
  return MONSTERS.filter(m =>
    m.levelMin <= level &&
    m.levelMax >= level &&
    (m.regionTags.includes('*') || (regionId !== undefined && m.regionTags.includes(regionId)))
  );
}

export function pickMonster(level: number, regionId?: string): Monster {
  const pool = getMonstersForLevel(level, regionId);
  if (pool.length === 0) {
    // Fallback: region-tag 무관 공통 풀
    const commonPool = MONSTERS.filter(m =>
      m.regionTags.includes('*') && m.levelMin <= level && m.levelMax >= level
    );
    if (commonPool.length === 0) return MONSTERS[MONSTERS.length - 1]!;
    return commonPool[Math.floor(Math.random() * commonPool.length)]!;
  }
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function getMonstersForPool(pool: string[]): Monster[] {
  return MONSTERS.filter(m => pool.includes(m.id));
}

export function pickMonsterFromPool(level: number, pool: string[]): Monster {
  if (pool.length === 0) {
    throw new Error('pickMonsterFromPool: pool is empty');
  }
  const candidates = getMonstersForPool(pool);
  if (candidates.length === 0) {
    throw new Error(`pickMonsterFromPool: no valid monster IDs in pool: ${pool.join(',')}`);
  }
  const inRange = candidates.filter(m => m.levelMin <= level && m.levelMax >= level);
  if (inRange.length > 0) {
    return inRange[Math.floor(Math.random() * inRange.length)]!;
  }
  const sorted = [...candidates].sort(
    (a, b) => Math.abs(a.levelMin - level) - Math.abs(b.levelMin - level)
  );
  return sorted[0]!;
}
