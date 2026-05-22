import { SeededRng } from '../cycle/SeededRng';
import { LANDMARK_TYPES } from '../data/landmarks';
import type { ZoneId } from '../data/zones';
import type { PlacedLandmark } from './Landmark';

export const GRID_W = 20;
export const GRID_H = 12;
export const TILE_PX = 32;

export interface MapLayout {
  tiles: ZoneId[][]; // [y][x]
  landmarks: PlacedLandmark[];
}

/** Pure helper — Phaser-free. Same RNG schedule as before extraction. */
export function generateMapLayout(seed: number): MapLayout {
  const rng = new SeededRng(seed);

  const tiles: ZoneId[][] = [];
  for (let y = 0; y < GRID_H; y++) {
    const row: ZoneId[] = [];
    for (let x = 0; x < GRID_W; x++) {
      let zone: ZoneId;
      if (x < 3)      zone = 'village';
      else if (x < 8) zone = 'forest';
      else if (x < 12) zone = 'plains';
      else if (x < 17) zone = 'mountains';
      else             zone = 'mystic';
      row.push(zone);
    }
    tiles.push(row);
  }

  const landmarks: PlacedLandmark[] = [];
  const place = (typeId: string, gridX: number, gridY: number, instanceSuffix = '') => {
    const type = LANDMARK_TYPES.find(t => t.id === typeId);
    if (!type) return;
    landmarks.push({
      instanceId: `${typeId}_${gridX}_${gridY}${instanceSuffix}`,
      type,
      gridX,
      gridY,
      consumed: false,
    });
  };

  place('village', 1, Math.floor(GRID_H / 2));

  const ENEMY_TYPES = ['wolf', 'goblin', 'bandit'];
  const ENEMY_ZONE_COL_RANGES = [
    { xMin: 4,  xMax: 7  },
    { xMin: 8,  xMax: 11 },
    { xMin: 12, xMax: 16 },
  ];
  for (let i = 0; i < 12; i++) {
    const enemyTypeId = ENEMY_TYPES[rng.int(ENEMY_TYPES.length)];
    const zoneRange = ENEMY_ZONE_COL_RANGES[rng.int(ENEMY_ZONE_COL_RANGES.length)];
    const x = zoneRange.xMin + rng.int(zoneRange.xMax - zoneRange.xMin + 1);
    const y = rng.int(GRID_H);
    place(enemyTypeId, x, y, `_e${i}`);
  }

  place('wolf_lord', 13 + rng.int(3), rng.int(GRID_H));
  place('wolf_lord', 14 + rng.int(3), rng.int(GRID_H), '_b2');
  place('dragon', 17 + rng.int(2), rng.int(GRID_H));

  place('shrine', 18 + rng.int(2), rng.int(GRID_H));
  place('cave',   15 + rng.int(3), rng.int(GRID_H));
  place('ruin',   12 + rng.int(4), rng.int(GRID_H));

  // V1c-1 — personality drift landmarks. Two of each so prior=0 dim heroes
  // get two visits per cycle and can reach the tier-3 threshold (±6) via
  // ±3 drift × 2. Single-visit per landmark (consumed=true after; no respawn
  // for non-enemy kinds), so instance count = visit budget for the cycle.
  place('watchtower',    3 + rng.int(3),  rng.int(GRID_H));
  place('watchtower',    4 + rng.int(3),  rng.int(GRID_H), '_b');
  place('treasure_cave', 12 + rng.int(3), rng.int(GRID_H));
  place('treasure_cave', 13 + rng.int(3), rng.int(GRID_H), '_b');
  place('holy_ruin',     17 + rng.int(2), rng.int(GRID_H));
  place('holy_ruin',     18 + rng.int(2), rng.int(GRID_H), '_b');
  place('crossroads',    8 + rng.int(3),  rng.int(GRID_H));
  place('crossroads',    9 + rng.int(3),  rng.int(GRID_H), '_b');

  return { tiles, landmarks };
}
