/** Cycle-12 L1 — pure respawn placement helper shared by `OverworldScene`
 *  (live game) and `sim-cycle-v2` (headless driver).
 *
 *  Root cause this file extracts and fixes:
 *  The previous in-line respawn logic in both call sites used `zoneForColumn`
 *  (which only covers base realm columns 3-16). For any consumed enemy in
 *  realms beyond base (sea col 20-39, volcano 40-59, ...), `zoneForColumn`
 *  returned null and fell back to a random base zone. Respawned enemies
 *  always landed in columns 3-16, OUTSIDE the hero's current realm
 *  `columnRange`. `filterCandidatesByRealm` then excluded every respawn from
 *  the candidate pool, and the initial 4-enemy non-base pool drained to 0
 *  → `cycle_ended '무위'` at ageEnd ≈ 5-11 (the live game's "11세 사망"
 *  reproducible via Playwright).
 *
 *  The sim never surfaced this bug because it didn't run
 *  `filterCandidatesByRealm` — its base-band respawns stayed in the unfiltered
 *  pool. Cycle-11's "자연사 99.3%" was a false PASS for that reason.
 *
 *  Fix: choose placement based on the consumed enemy's *realm*, not its
 *  *zone*. Base realm keeps the V1e zone-banded narrative (forest/plains/
 *  mountains × chapter). Non-base realms use `realm.columnRange` for
 *  placement and `realm.enemyRoster` for the enemy type (chapter index
 *  mapped into the roster array). When both inputs are unknown (e.g.
 *  consumed enemy stranded outside any realm column band) we fall back to
 *  the original random-base behavior to keep the helper total.
 *
 *  This module is Phaser-free + side-effect-free so it can be unit tested
 *  and used directly by the headless sim.
 */
import { findRealm, REALM_CATALOG } from '../data/realms';
import { realmForColumn } from '../zone/zoneNavigation';
import {
  ENEMY_ZONES,
  selectEnemyTypeId,
  zoneForColumn,
  type EnemyZone,
} from '../data/enemyTiers';
import type { Chapter } from '../hero/HeroLifecycle';
import type { RealmId } from '../types';

/** Column bands per enemy zone — base realm only. Other realms use the
 *  realm's `columnRange` directly. */
export const ENEMY_ZONE_COL_RANGES: Record<EnemyZone, { xMin: number; xMax: number }> = {
  forest:    { xMin: 3,  xMax: 7  },
  plains:    { xMin: 8,  xMax: 11 },
  mountains: { xMin: 12, xMax: 16 },
};

/** Index of a chapter in `CHAPTERS`. Used to map chapter → roster index. */
const CHAPTER_INDEX: Record<Chapter, number> = {
  '어린시절': 0,
  '청년기':   1,
  '장년기':   2,
  '노년기':   3,
  '마지막':   4,
};

export interface RespawnRng {
  int(maxExclusive: number): number;
}

export interface RespawnPlacement {
  typeId: string;
  gridX: number;
  gridY: number;
}

/** Decide replacement enemy position + type for a consumed enemy.
 *
 *  - consumedCol: gridX of the consumed enemy (used to derive realm + zone).
 *  - chapter:     hero's current chapter (for V1e enemy aging in base; for
 *                 roster index in non-base).
 *  - gridH:       map height (used to clamp the random y).
 *  - rng:         seeded RNG. int(N) returns 0..N-1.
 *
 *  Pre-fix behavior preserved for base realm (col 0-19): zone-banded
 *  placement, chapter-axis enemy type. For non-base realms: placement
 *  inside `realm.columnRange`, enemy type from `realm.enemyRoster` keyed
 *  by chapter index (clamped to roster length).
 *
 *  Returns null when the realm's enemyRoster is empty (defensive — should
 *  not happen for the catalog as of cycle 12). */
export function pickRespawnPlacement(
  consumedCol: number,
  chapter: Chapter,
  gridH: number,
  rng: RespawnRng,
): RespawnPlacement | null {
  const realmId: RealmId | null = realmForColumn(consumedCol);

  // Base realm path — keep the existing V1e zone-banded narrative. This
  // covers consumed col 0-19 and the safety-net fallback (consumed col
  // outside any realm column band, which technically can't happen with
  // the current 0-120 catalog but the guard stays for resilience).
  if (!realmId || realmId === 'base') {
    const zone: EnemyZone =
      zoneForColumn(consumedCol) ?? ENEMY_ZONES[rng.int(ENEMY_ZONES.length)]!;
    const range = ENEMY_ZONE_COL_RANGES[zone];
    const typeId = selectEnemyTypeId(zone, chapter);
    return {
      typeId,
      gridX: range.xMin + rng.int(range.xMax - range.xMin + 1),
      gridY: rng.int(gridH),
    };
  }

  // Non-base realms — place inside the realm's columnRange + pick from
  // its enemyRoster. We clamp the chapter index to the roster length so
  // late-chapter heroes don't index past the array (mythic-only rosters
  // could be shorter than the 5 chapters).
  const realm = findRealm(realmId);
  const [colStart, colEnd] = realm.columnRange;
  const span = Math.max(1, colEnd - colStart);
  if (realm.enemyRoster.length === 0) return null;
  const rosterIdx = Math.min(CHAPTER_INDEX[chapter], realm.enemyRoster.length - 1);
  const typeId = realm.enemyRoster[rosterIdx]!;
  return {
    typeId,
    gridX: colStart + rng.int(span),
    gridY: rng.int(gridH),
  };
}

/** Re-export for callers that want the realm catalog handy. */
export { REALM_CATALOG };
