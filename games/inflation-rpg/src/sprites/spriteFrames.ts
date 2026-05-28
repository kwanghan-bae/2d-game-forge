/**
 * Sprite frame definitions for Kenney Tiny Dungeon spritesheet.
 * Sheet: tiny_dungeon_sheet.png (192×176, 12 cols × 11 rows, 16×16 tiles)
 *
 * Frame index = row * 12 + col (0-based).
 */

export const DUNGEON_SHEET_KEY = 'tiny_dungeon';
export const SPRITE_FRAME_SIZE = 16;
export const SPRITE_COLS = 12;

function frame(col: number, row: number): number {
  return row * SPRITE_COLS + col;
}

// ─── Hero frames (row 8) ───
export const HERO_FRAMES = {
  knight: frame(0, 8),
  knight2: frame(1, 8),
  mage: frame(2, 8),
  mage2: frame(3, 8),
  rogue: frame(4, 8),
  elf: frame(5, 8),
  dwarf: frame(6, 8),
  cleric: frame(7, 8),
} as const;

// ─── Monster frames (row 9) ───
export const MONSTER_FRAMES = {
  skeleton: frame(0, 9),
  zombie: frame(1, 9),
  goblin: frame(2, 9),
  orc: frame(3, 9),
  demon: frame(4, 9),
  ghost: frame(5, 9),
  bat: frame(6, 9),
  slime: frame(7, 9),
  spider: frame(8, 9),
  snake: frame(9, 9),
  boss_demon: frame(10, 9),
  boss_dragon: frame(11, 9),
} as const;

// ─── Item frames (row 10) ───
export const ITEM_FRAMES = {
  sword: frame(0, 10),
  axe: frame(1, 10),
  staff: frame(2, 10),
  bow: frame(3, 10),
  shield: frame(4, 10),
  helmet: frame(5, 10),
  armor: frame(6, 10),
  potion: frame(7, 10),
  coin: frame(8, 10),
  gem: frame(9, 10),
  key: frame(10, 10),
  scroll: frame(11, 10),
} as const;

// ─── Tile frames (floor area, rows 5-6) ───
export const TILE_FRAMES = {
  floor_1: frame(0, 5),
  floor_2: frame(1, 5),
  floor_3: frame(2, 5),
} as const;

/**
 * Map characterId to hero frame index.
 */
export function getHeroFrame(characterId: string): number {
  const mapping: Record<string, number> = {
    hwarang: HERO_FRAMES.knight,
    geomgaek: HERO_FRAMES.rogue,
    dosa: HERO_FRAMES.mage,
    yacha: HERO_FRAMES.knight2,
    jangsu: HERO_FRAMES.dwarf,
    yongnyeo: HERO_FRAMES.elf,
    seonin: HERO_FRAMES.cleric,
    cheonin: HERO_FRAMES.mage2,
    choui: HERO_FRAMES.knight2,
    geosa: HERO_FRAMES.dwarf,
    uinyeo: HERO_FRAMES.cleric,
    gwishin: HERO_FRAMES.rogue,
    chakho: HERO_FRAMES.rogue,
    mudang: HERO_FRAMES.mage,
    baekje: HERO_FRAMES.knight,
    nangdo: HERO_FRAMES.elf,
  };
  return mapping[characterId] ?? HERO_FRAMES.knight;
}

/**
 * Map monster/boss to frame index (deterministic via id hash).
 */
export function getMonsterFrame(monsterId: string, isBoss: boolean): number {
  if (isBoss) {
    const bossFrames = [MONSTER_FRAMES.boss_demon, MONSTER_FRAMES.boss_dragon];
    return bossFrames[simpleHash(monsterId) % bossFrames.length]!;
  }
  const monsterFrameList = [
    MONSTER_FRAMES.skeleton,
    MONSTER_FRAMES.zombie,
    MONSTER_FRAMES.goblin,
    MONSTER_FRAMES.orc,
    MONSTER_FRAMES.demon,
    MONSTER_FRAMES.ghost,
    MONSTER_FRAMES.bat,
    MONSTER_FRAMES.slime,
    MONSTER_FRAMES.spider,
    MONSTER_FRAMES.snake,
  ];
  return monsterFrameList[simpleHash(monsterId) % monsterFrameList.length]!;
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
