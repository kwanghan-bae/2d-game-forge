import * as Phaser from 'phaser';
import { SeededRng } from '../cycle/SeededRng';
import { ZONES } from '../data/zones';
import { LANDMARK_TYPES } from '../data/landmarks';
import { Pathfinder, findPathWithFallback, type GridCell } from './Pathfinding';
import { findRealm } from '../data/realms';
import type { PlacedLandmark } from './Landmark';
import { landmarkToCandidate, filterCandidatesByRealm } from './Landmark';
import type { OverworldEvent } from './OverworldEvents';
import type { HeroDecisionAI } from '../decisionAI/HeroDecisionAI';
import type { HeroEntity } from '../hero/HeroEntity';
import { generateMapLayout, GRID_H, GRID_W, TILE_PX, type MapLayout } from './mapLayout';
import type { RealmId, SeasonId } from '../types';
import { seasonBgTint } from '../season/SeasonState';
import { pickRespawnPlacement } from './respawn';

export { generateMapLayout, GRID_H, GRID_W };
export type { MapLayout };

interface OverworldSceneData {
  seed: number;
  hero: HeroEntity;
  ai: HeroDecisionAI;
  onEvent: (event: OverworldEvent) => void;
  /** Initial speed multiplier (1 = normal, 10 = 10x). Mutable later via setSpeed(). */
  initialSpeed?: number;
  /** T13: current realm and unlocked realms for exit-landmark filter. */
  currentRealm?: RealmId;
  unlockedRealms?: readonly RealmId[];
  /** V3-H F6: starting season for bg tint. Defaults to 'spring'. */
  currentSeason?: SeasonId;
}

export class OverworldScene extends Phaser.Scene {
  private hero!: HeroEntity;
  private ai!: HeroDecisionAI;
  private onEvent!: (e: OverworldEvent) => void;
  private layout!: MapLayout;
  private heroSprite!: Phaser.GameObjects.Text;
  private landmarkSprites: Map<string, Phaser.GameObjects.Text> = new Map();
  private currentPath: { x: number; y: number }[] = [];
  private currentTarget: PlacedLandmark | null = null;
  private pathfinder!: Pathfinder;
  private sceneRng!: SeededRng;
  private respawnCounter: number = 0;
  private initialSpeed: number = 1;
  private currentRealm: RealmId | undefined;
  private unlockedRealms: readonly RealmId[] | undefined;
  private currentSeason: SeasonId = 'spring';
  /** Cycle 175 — SeasonalModifier cosmeticTint override. null = base season tint. */
  private cosmeticTintOverride: string | null = null;
  /** Cycle-7 F4: count of times pathfinder columnBounds fallback fired.
   *  Surfaced to operator via console.warn on first hit + queryable via
   *  getPathfinderFallbackCount() for future telemetry / e2e assertions. */
  private pathfinderFallbackCount: number = 0;

  constructor() { super('OverworldScene'); }

  init(data: OverworldSceneData) {
    this.hero = data.hero;
    this.ai = data.ai;
    this.onEvent = data.onEvent;
    this.layout = generateMapLayout(data.seed);
    // Scene-level RNG for respawn placement (derived from seed to stay deterministic).
    this.sceneRng = new SeededRng(data.seed ^ 0xabcd1234);
    this.respawnCounter = 0;
    this.initialSpeed = data.initialSpeed ?? 1;
    this.currentRealm = data.currentRealm;
    this.unlockedRealms = data.unlockedRealms;
    this.currentSeason = data.currentSeason ?? 'spring';
  }

  /** V3-H Bug A: sync the scene's unlockedRealms copy after a realm_unlocked
   *  event so DestinationResolver.choose can see the new exit landmark. */
  setUnlockedRealms(realms: readonly RealmId[]): void {
    this.unlockedRealms = realms;
  }

  /** Cycle-8 C1: sync the scene's currentRealm copy after a realm_entered
   *  event. Without this, the C1 candidate filter (and the existing
   *  columnBounds binding on line 200ish) keep applying the previous realm's
   *  column range after a mid-cycle transition — every sea/volcano/... pick
   *  is filtered out or null-pathed, and either '무위' triggers or the F4
   *  fallback re-takes the hot path. Mirrors V3-H Bug A's pattern (a 3-line
   *  setter wired in OverworldRunner.tsx alongside setCurrentRealm store
   *  mutation). */
  setCurrentRealm(realm: RealmId): void {
    this.currentRealm = realm;
  }

  /** Cycle-7 F4: telemetry accessor for pathfinder fallback retry count.
   *  Tests / e2e assertions can check this after a run to confirm the
   *  fallback did NOT fire in normal gameplay (count = 0). A non-zero
   *  count signals a stale-realm regression and should also have emitted
   *  a console.warn at the point of trigger. */
  getPathfinderFallbackCount(): number {
    return this.pathfinderFallbackCount;
  }

  /** Cycle-9 R1: compute pathfinder columnBounds that always include the
   *  hero's start column and the chosen target's column, on top of the
   *  current realm's columnRange. Boundary-frame transitions (hero at
   *  realm.colEnd-1 after realm_entered flips to next realm, OR target at
   *  nextRealm.columnRange[0] = current colEnd) would otherwise BLOCK the
   *  start/target cell and force the F4 fallback. With expansion the bounds
   *  always cover the legitimate path while still rejecting picks 2+ realms
   *  away (R2 already filters those out of the candidate pool anyway).
   *
   *  Returns undefined when currentRealm is undefined (parity with the
   *  original branch — pathfinder runs unconstrained).
   *
   *  Visible for testing. */
  computeColumnBounds(heroCol: number, targetCol: number): [number, number] | undefined {
    if (!this.currentRealm) return undefined;
    const [colStart, colEnd] = findRealm(this.currentRealm).columnRange;
    // bounds are half-open [cMin, cMax) in Pathfinding.ts. Include hero
    // start (must be walkable: x >= cMin) AND target column (must satisfy
    // x < cMax → cMax >= targetCol + 1) AND hero column (cMax >= heroCol + 1
    // covers the case where hero sits at colEnd after a transition).
    const cMin = Math.min(colStart, heroCol, targetCol);
    const cMax = Math.max(colEnd, heroCol + 1, targetCol + 1);
    return [cMin, cMax];
  }

  /** Scale both tween duration (movement) and delayedCall (post-arrival pause)
   *  by the same factor so the cycle plays uniformly faster. Callable while
   *  the scene is running — OverworldRunner uses this for the speed buttons. */
  setSpeed(multiplier: number): void {
    const clamped = Math.max(0.25, Math.min(20, multiplier));
    this.tweens.timeScale = clamped;
    this.time.timeScale = clamped;
  }

  /** V3-H F6: update camera background tint when the season changes. */
  setSeason(s: SeasonId): void {
    this.currentSeason = s;
    this.cameras.main.setBackgroundColor(seasonBgTint(s));
    this.reapplyCosmeticTint();
  }

  /**
   * Cycle 175 — SeasonalModifier cosmeticTint override (cycle 159+167 wire 6/n).
   * `hex` 가 string 이면 setBackgroundColor 로 override, null 이면 base season
   * tint 로 복원 (`setSeason` 의 색 다시 적용). 호출자 (OverworldRunner) 가
   * `getActiveCosmeticTint` + `cosmeticTintToHex` 의 chain 결과를 전달.
   */
  setCosmeticTintOverride(hex: string | null): void {
    this.cosmeticTintOverride = hex;
    this.reapplyCosmeticTint();
  }

  private reapplyCosmeticTint(): void {
    if (this.cosmeticTintOverride) {
      this.cameras.main.setBackgroundColor(this.cosmeticTintOverride);
    } else {
      this.cameras.main.setBackgroundColor(seasonBgTint(this.currentSeason));
    }
  }

  create() {
    // V3-H F6: apply season-based bg tint from the start (not hardcoded dark).
    this.cameras.main.setBackgroundColor(seasonBgTint(this.currentSeason));
    this.cameras.main.setBounds(0, 0, GRID_W * TILE_PX, GRID_H * TILE_PX);
    this.setSpeed(this.initialSpeed);

    // Render tile background
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const zone = ZONES.find(z => z.id === this.layout.tiles[y]![x])!;
        this.add.rectangle(
          x * TILE_PX + TILE_PX / 2,
          y * TILE_PX + TILE_PX / 2,
          TILE_PX - 1,
          TILE_PX - 1,
          parseInt(zone.bgColor.slice(1), 16),
          0.75,
        );
      }
    }

    // Render landmarks as emoji text
    for (const lm of this.layout.landmarks) {
      const text = this.add.text(
        lm.gridX * TILE_PX + TILE_PX / 2,
        lm.gridY * TILE_PX + TILE_PX / 2,
        lm.type.emoji,
        { fontSize: '20px' },
      ).setOrigin(0.5);
      this.landmarkSprites.set(lm.instanceId, text);
    }

    // Hero spawn — use hero entity's gridX/gridY which cycleSliceV2.start()
    // sets via realmRotation. Cycle-15: rotated realms spawn at
    // `realm.columnRange[0] + 1`, not the legacy base village. Fall back to
    // base village (col 1) only if the hero hasn't been positioned yet
    // (gridX === 0, the default before snapshot/rotation).
    const spawnX = this.hero.gridX > 0
      ? this.hero.gridX
      : this.layout.landmarks.find(l => l.type.kind === 'village')!.gridX;
    const spawnY = this.hero.gridX > 0
      ? this.hero.gridY
      : this.layout.landmarks.find(l => l.type.kind === 'village')!.gridY;
    this.heroSprite = this.add.text(
      spawnX * TILE_PX + TILE_PX / 2,
      spawnY * TILE_PX + TILE_PX / 2,
      this.hero.emoji,
      { fontSize: '24px' },
    ).setOrigin(0.5).setDepth(10);

    // V3-D: camera follow hero. viewport = 640x384, world = 3840x384.
    this.cameras.main.startFollow(this.heroSprite, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(200, 100);

    // Build walkable grid (all walkable for V1a — no obstacles)
    const grid: GridCell[][] = this.layout.tiles.map(row => row.map(() => 'walkable' as const));
    this.pathfinder = new Pathfinder(grid);

    // Start moving
    this.pickNextDestination();
  }

  private async pickNextDestination(): Promise<void> {
    const heroPos = this.heroGridPos();
    // Cycle-8 C1: drop landmarks whose column lies outside the hero's
    // current realm BEFORE the AI scores candidates. The pathfinder still
    // applies `columnBounds = currentRealm.columnRange` below, so leaving
    // cross-realm landmarks in the candidate set meant every such pick
    // produced a null path and pushed the F4 fallback to do the recovery —
    // 89 firings/cycle in the cycle-7 finisher's 4-minute idle baseline.
    // exit landmarks pass through unconditionally (they are the legitimate
    // cross-realm transition path).
    const reachable = filterCandidatesByRealm(
      this.layout.landmarks.filter(l => !l.consumed),
      this.currentRealm,
    );
    const candidates = reachable
      .filter(l => !(l.gridX === heroPos.x && l.gridY === heroPos.y))
      .map(l => ({ landmark: l, candidate: landmarkToCandidate(l) }));

    if (candidates.length === 0) {
      // Cycle-5 F3: pathfinder candidates-exhausted = stuck hero. Tag cause
      // explicitly so the resulting saga shows '무위' rather than a misleading
      // '자연사'. Future stale-realm bugs surface immediately in saga log.
      this.onEvent({ type: 'cycle_ended', cause: '무위' });
      return;
    }

    const chosenCandidate = this.ai.chooseDestination(candidates.map(c => c.candidate), {
      currentRealm: this.currentRealm,
      unlockedRealms: this.unlockedRealms,
    });
    if (!chosenCandidate) {
      // Cycle-5 F3: AI picked nothing despite candidates — same exit-lost
      // condition; emit '무위' for parity.
      this.onEvent({ type: 'cycle_ended', cause: '무위' });
      return;
    }

    const target = candidates.find(c => c.candidate.id === chosenCandidate.id)!.landmark;
    // Cycle-9 R1: expand columnBounds to always include hero start AND target
    // columns. Without this, the boundary case fires the F4 fallback even
    // after R2 cleans up cross-realm exit picks:
    //   - hero arrives at exit_a (col = realm.colEnd - 1, inside current
    //     realm), controller emits realm_entered, scene.currentRealm flips
    //     to next realm. Next pickNextDestination computes
    //     columnBounds = nextRealm.columnRange = [colEnd, colEnd+20]. Hero
    //     gridX is still at colEnd-1 (= one tile *outside* the new bounds),
    //     pathfinder marks start cell BLOCKED → null → F4 retries.
    //   - hero picks exit_b at nextRealm.columnRange[0] = colEnd (the
    //     legitimate cross-realm entry), but currentRealm bounds [colStart,
    //     colEnd) exclude colEnd → target BLOCKED → null → F4 retries.
    // The expanded bounds keep stale-realm protection (still rejects targets
    // 2+ realms away) while letting boundary-frame paths through cleanly.
    const columnBounds = this.computeColumnBounds(heroPos.x, target.gridX);
    // Cycle-7 F4: columnBounds null fallback retry. If the hero is stuck
    // outside the currentRealm column range (a stale-realm regression
    // category that cycle-5 F2 already root-fixed), retry the same target
    // without bounds so the run never lock-steps into '무위'.
    const { path, retried } = await findPathWithFallback(
      this.pathfinder,
      heroPos.x, heroPos.y, target.gridX, target.gridY,
      columnBounds,
    );
    if (retried) {
      this.pathfinderFallbackCount += 1;
      console.warn(
        `[OverworldScene] Pathfinder columnBounds fallback fired (count=${this.pathfinderFallbackCount}) — hero (${heroPos.x},${heroPos.y}) target (${target.gridX},${target.gridY}) realm=${this.currentRealm ?? 'none'}. Possible stale-realm regression.`
      );
    }
    if (!path || path.length < 2) {
      // Unreachable; mark consumed to skip
      target.consumed = true;
      this.pickNextDestination();
      return;
    }

    this.currentPath = path.slice(1); // skip current pos
    this.currentTarget = target;
    this.stepAlongPath();
  }

  private stepAlongPath(): void {
    if (this.currentPath.length === 0) {
      this.arriveAtTarget();
      return;
    }
    const next = this.currentPath.shift()!;
    this.tweens.add({
      targets: this.heroSprite,
      x: next.x * TILE_PX + TILE_PX / 2,
      y: next.y * TILE_PX + TILE_PX / 2,
      duration: 180,
      onComplete: () => {
        this.hero.gridX = next.x;
        this.hero.gridY = next.y;
        this.stepAlongPath();
      },
    });
  }

  private arriveAtTarget(): void {
    const target = this.currentTarget;
    if (!target) return;
    this.onEvent({ type: 'arrived_at', landmarkId: target.instanceId, landmarkKind: target.type.kind });
    // V3-A: variable pause (300-800ms) + brief alpha pulse on the hero so the
    // idle feels like the hero is looking around before deciding next move.
    const pauseMs = 300 + this.sceneRng.int(500);
    this.tweens.add({
      targets: this.heroSprite,
      alpha: 0.55,
      duration: Math.floor(pauseMs / 2),
      yoyo: true,
      ease: 'Sine.InOut',
    });
    this.time.delayedCall(pauseMs, () => {
      target.consumed = true;
      const sprite = this.landmarkSprites.get(target.instanceId);
      sprite?.setAlpha(0.3);
      // Enemy landmarks respawn immediately after being consumed.
      // Villages, shrines, caves, ruins do NOT respawn.
      if (target.type.kind === 'enemy') {
        this.respawnEnemyNear(target);
      }
      this.heroSprite.setAlpha(1);
      this.currentTarget = null;
      this.pickNextDestination();
    });
  }

  /** Cycle-12 L1 — Spawn a replacement enemy inside the consumed enemy's
   *  realm. Base realm keeps the V1e zone-banded narrative (forest/plains/
   *  mountains × chapter); non-base realms place inside the realm's
   *  `columnRange` with an enemy from the realm's `enemyRoster`.
   *
   *  Pre-fix: `zoneForColumn(consumed.gridX)` returned null for any col ≥ 20
   *  and fell back to a random base zone. Respawns always landed in cols
   *  3-16, OUTSIDE the hero's current realm columnRange. `filterCandidatesByRealm`
   *  excluded all of them and the cycle terminated with '무위' once the
   *  ~4 initial non-base enemies drained. Delegating to `pickRespawnPlacement`
   *  (pure helper) so the sim driver applies the same placement logic. */
  private respawnEnemyNear(consumed: PlacedLandmark): void {
    const placement = pickRespawnPlacement(
      consumed.gridX,
      this.hero.chapter,
      GRID_H,
      this.sceneRng,
    );
    if (!placement) return;
    const landmarkType = LANDMARK_TYPES.find(t => t.id === placement.typeId);
    if (!landmarkType) return;

    this.respawnCounter += 1;
    const instanceId = `${placement.typeId}_respawn_${this.respawnCounter}`;

    const newLandmark: PlacedLandmark = {
      instanceId,
      type: landmarkType,
      gridX: placement.gridX,
      gridY: placement.gridY,
      consumed: false,
    };
    this.layout.landmarks.push(newLandmark);

    // Render the new landmark sprite.
    const text = this.add.text(
      placement.gridX * TILE_PX + TILE_PX / 2,
      placement.gridY * TILE_PX + TILE_PX / 2,
      landmarkType.emoji,
      { fontSize: '20px' },
    ).setOrigin(0.5).setAlpha(0.8);
    this.landmarkSprites.set(instanceId, text);
  }

  private heroGridPos(): { x: number; y: number } {
    return {
      x: Math.round((this.heroSprite.x - TILE_PX / 2) / TILE_PX),
      y: Math.round((this.heroSprite.y - TILE_PX / 2) / TILE_PX),
    };
  }
}
