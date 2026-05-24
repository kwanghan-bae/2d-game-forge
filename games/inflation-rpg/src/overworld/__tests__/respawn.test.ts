import { describe, it, expect } from 'vitest';
import { pickRespawnPlacement, type RespawnRng } from '../respawn';
import { findRealm } from '../../data/realms';
import { realmForColumn } from '../../zone/zoneNavigation';
import { LANDMARK_TYPES } from '../../data/landmarks';

/** Cycle-12 L1 — respawn placement guard tests.
 *
 *  Pre-fix, `OverworldScene.respawnEnemyNear` + sim `respawnEnemy` used
 *  `zoneForColumn` which only knew base columns 3-16. Any non-base consumed
 *  enemy fell back to a random base zone and the respawn landed at col 3-16
 *  → filterCandidatesByRealm excluded it for non-base realms → live game's
 *  `cycle_ended '무위'` at age 5-11.
 *
 *  These tests pin the post-fix invariants:
 *  - Base consumed → base zone-banded placement (col 3-16) — preserved.
 *  - Non-base consumed → placement inside realm.columnRange + enemy from
 *    realm.enemyRoster.
 *  - Type returned is always a known LandmarkType id (so OverworldScene's
 *    `LANDMARK_TYPES.find` does not silently null-out the respawn).
 */

class StubRng implements RespawnRng {
  private idx = 0;
  constructor(private readonly values: number[]) {}
  int(max: number): number {
    const v = this.values[this.idx % this.values.length] ?? 0;
    this.idx += 1;
    // clamp to maxExclusive in case the stub value is too large
    return Math.min(Math.max(0, v), Math.max(0, max - 1));
  }
}

describe('pickRespawnPlacement', () => {
  describe('base realm — preserves V1e zone-banded narrative', () => {
    it('consumed in forest band (col 5) places in forest band (col 3-7) with chapter-axis enemy', () => {
      const out = pickRespawnPlacement(5, '어린시절', 12, new StubRng([0, 0, 0]));
      expect(out).not.toBeNull();
      expect(out!.gridX).toBeGreaterThanOrEqual(3);
      expect(out!.gridX).toBeLessThanOrEqual(7);
      // 어린시절 forest → wolf
      expect(out!.typeId).toBe('wolf');
    });

    it('consumed in plains band (col 9) places in plains band (col 8-11)', () => {
      const out = pickRespawnPlacement(9, '청년기', 12, new StubRng([0, 0, 0]));
      expect(out).not.toBeNull();
      expect(out!.gridX).toBeGreaterThanOrEqual(8);
      expect(out!.gridX).toBeLessThanOrEqual(11);
      expect(out!.typeId).toBe('brigand'); // 청년기 plains
    });

    it('consumed in mountains band (col 14) places in mountains band (col 12-16)', () => {
      const out = pickRespawnPlacement(14, '장년기', 12, new StubRng([0, 0, 0]));
      expect(out).not.toBeNull();
      expect(out!.gridX).toBeGreaterThanOrEqual(12);
      expect(out!.gridX).toBeLessThanOrEqual(16);
      expect(out!.typeId).toBe('troll'); // 장년기 mountains
    });

    it('consumed at col 0 (outside any zone band) falls back to random base zone', () => {
      // first int() picks the random ENEMY_ZONES[0] = 'forest' → col 3-7
      const out = pickRespawnPlacement(0, '어린시절', 12, new StubRng([0, 0, 0]));
      expect(out).not.toBeNull();
      expect(out!.gridX).toBeGreaterThanOrEqual(3);
      expect(out!.gridX).toBeLessThanOrEqual(16);
    });
  });

  describe('non-base realm — pre-fix bug regression guard', () => {
    it('consumed in sea (col 30) places in sea.columnRange [20, 40)', () => {
      const sea = findRealm('sea');
      expect(realmForColumn(30)).toBe('sea');
      const out = pickRespawnPlacement(30, '어린시절', 12, new StubRng([5, 0]));
      expect(out).not.toBeNull();
      expect(out!.gridX).toBeGreaterThanOrEqual(sea.columnRange[0]);
      expect(out!.gridX).toBeLessThan(sea.columnRange[1]);
      // sea.enemyRoster[0] = 'sea_serpent'
      expect(out!.typeId).toBe(sea.enemyRoster[0]);
    });

    it('consumed in volcano (col 45) places in volcano.columnRange [40, 60)', () => {
      const volcano = findRealm('volcano');
      expect(realmForColumn(45)).toBe('volcano');
      const out = pickRespawnPlacement(45, '어린시절', 12, new StubRng([3, 0]));
      expect(out).not.toBeNull();
      expect(out!.gridX).toBeGreaterThanOrEqual(volcano.columnRange[0]);
      expect(out!.gridX).toBeLessThan(volcano.columnRange[1]);
      // volcano.enemyRoster[0] = 'flame_drake' (어린시절 → index 0)
      expect(out!.typeId).toBe(volcano.enemyRoster[0]);
    });

    it('chapter index clamps to roster length', () => {
      // sea.enemyRoster has 4 entries; '마지막' = index 4 would overrun. Clamp
      // to roster.length - 1 = 3 = 'storm_eel'.
      const sea = findRealm('sea');
      const out = pickRespawnPlacement(25, '마지막', 12, new StubRng([0, 0]));
      expect(out).not.toBeNull();
      expect(out!.typeId).toBe(sea.enemyRoster[sea.enemyRoster.length - 1]);
    });

    it('every realm in REALM_CATALOG yields a valid LANDMARK_TYPES id when respawned at its col', () => {
      const realms = ['base', 'sea', 'volcano', 'underworld', 'heaven', 'chaos'] as const;
      const chapters = ['어린시절', '청년기', '장년기', '노년기', '마지막'] as const;
      for (const realmId of realms) {
        const realm = findRealm(realmId);
        const col = realm.columnRange[0] + 2;
        for (const ch of chapters) {
          const out = pickRespawnPlacement(col, ch, 12, new StubRng([0, 0]));
          expect(out, `${realmId}/${ch}`).not.toBeNull();
          const lt = LANDMARK_TYPES.find(t => t.id === out!.typeId);
          expect(lt, `${realmId}/${ch}: typeId=${out!.typeId} is not a known LandmarkType`).toBeTruthy();
        }
      }
    });

    it('respawn placement stays within realm bounds for ALL non-base realms (cycle-12 regression)', () => {
      // The bug: zoneForColumn(col >= 20) → null → respawn lands at col 3-16.
      // Post-fix: respawn must land inside the consumed enemy's realm
      // columnRange so filterCandidatesByRealm(currentRealm) keeps it visible.
      const nonBase = ['sea', 'volcano', 'underworld', 'heaven', 'chaos'] as const;
      for (const realmId of nonBase) {
        const realm = findRealm(realmId);
        const consumedCol = realm.columnRange[0] + 5; // inside realm
        for (let trial = 0; trial < 10; trial++) {
          const out = pickRespawnPlacement(consumedCol, '청년기', 12, new StubRng([trial, trial]));
          expect(out, `${realmId} trial ${trial}`).not.toBeNull();
          expect(
            out!.gridX,
            `${realmId} respawn ended at col ${out!.gridX}, expected ∈ [${realm.columnRange[0]}, ${realm.columnRange[1]})`,
          ).toBeGreaterThanOrEqual(realm.columnRange[0]);
          expect(out!.gridX).toBeLessThan(realm.columnRange[1]);
        }
      }
    });
  });
});
