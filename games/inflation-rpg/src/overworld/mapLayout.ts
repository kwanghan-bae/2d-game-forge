import { SeededRng } from '../cycle/SeededRng';
import { LANDMARK_TYPES } from '../data/landmarks';
import { ENEMY_ZONES, selectEnemyTypeId, type EnemyZone } from '../data/enemyTiers';
import { REALM_CATALOG } from '../data/realms';
import type { ZoneId } from '../data/zones';
import type { PlacedLandmark } from './Landmark';

export const GRID_W = 120;
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
      // V3-D: column 0-19 = base realm 의 V1e zone band 유지
      if (x < 20) {
        if (x < 3)       zone = 'village';
        else if (x < 8)  zone = 'forest';
        else if (x < 12) zone = 'plains';
        else if (x < 17) zone = 'mountains';
        else             zone = 'mystic';
      } else {
        // realm 1-5 의 column band → mystic 한 가지로 통일 (placeholder visual)
        zone = 'mystic';
      }
      row.push(zone);
    }
    tiles.push(row);
  }

  const landmarks: PlacedLandmark[] = [];
  const place = (typeId: string, gridX: number, gridY: number, instanceSuffix = '') => {
    const type = LANDMARK_TYPES.find(t => t.id === typeId);
    if (!type) return;
    const cx = Math.max(0, Math.min(GRID_W - 1, gridX));
    const cy = Math.max(0, Math.min(GRID_H - 1, gridY));
    landmarks.push({
      instanceId: `${typeId}_${cx}_${cy}${instanceSuffix}`,
      type,
      gridX: cx,
      gridY: cy,
      consumed: false,
    });
  };

  place('village', 1, Math.floor(GRID_H / 2));

  // V1e — zone-tiered initial enemy placement. Each zone always spawns its
  // 어린시절 row enemy; respawns walk the chapter axis as the hero ages.
  const ENEMY_ZONE_COL_RANGES: Record<EnemyZone, { xMin: number; xMax: number }> = {
    forest:    { xMin: 4,  xMax: 7  },
    plains:    { xMin: 8,  xMax: 11 },
    mountains: { xMin: 12, xMax: 16 },
  };
  for (let i = 0; i < 12; i++) {
    const zone = ENEMY_ZONES[rng.int(ENEMY_ZONES.length)]!;
    const range = ENEMY_ZONE_COL_RANGES[zone];
    const x = range.xMin + rng.int(range.xMax - range.xMin + 1);
    const y = rng.int(GRID_H);
    const enemyTypeId = selectEnemyTypeId(zone, '어린시절');
    place(enemyTypeId, x, y, `_e${i}`);
  }

  // V1e — 4 distinct boss types so the cycle's boss-fight peaks aren't all
  // the same emoji. wolf_lord/chimera_lord in mountains, dragon/lich_king
  // in mystic — placement bands unchanged.
  place('wolf_lord',    13 + rng.int(3), rng.int(GRID_H));
  place('chimera_lord', 14 + rng.int(3), rng.int(GRID_H), '_b2');
  place('dragon',       17 + rng.int(2), rng.int(GRID_H));
  place('lich_king',    18 + rng.int(2), rng.int(GRID_H), '_b2');

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

  // V3-D / V3-H: realm 별 column band 의 enemy + boss + 양쪽 경계 exit 배치
  for (let idx = 0; idx < REALM_CATALOG.length; idx++) {
    const realm = REALM_CATALOG[idx];
    const [colStart, colEnd] = realm.columnRange;

    // realm 1-5 의 enemy + boss (base 는 V1e 기존 배치 유지)
    if (realm.id !== 'base') {
      let y = 2;
      for (let i = 0; i < Math.min(4, realm.enemyRoster.length); i++) {
        const enemyId = realm.enemyRoster[i];
        const col = colStart + 2 + i * 4;
        place(enemyId, col, y, `_r${realm.id}`);
        y = (y + 3) % (GRID_H - 2) + 1;
      }
      place(realm.bossId, colEnd - 2, Math.floor(GRID_H / 2), `_r${realm.id}`);
    }

    // V3-H Bug B fix: 양쪽 경계 exit (모든 realm 포함, base 도)
    if (realm.nextRealm) {
      const nextRealm = REALM_CATALOG[idx + 1];
      // current realm 측 exit: col = colEnd - 1 (current realm 의 마지막 column)
      place('exit', colEnd - 1, Math.floor(GRID_H / 2), `_${realm.id}_to_${realm.nextRealm}_a`);
      // next realm 측 exit: col = nextRealm.columnRange[0] (next realm 의 첫 column)
      if (nextRealm) {
        const nextRow = Math.min(GRID_H - 1, Math.floor(GRID_H / 2) + 1);
        place('exit', nextRealm.columnRange[0], nextRow, `_${realm.nextRealm}_from_${realm.id}_b`);
      }
    }
  }

  return { tiles, landmarks };
}
