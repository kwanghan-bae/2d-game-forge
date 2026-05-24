import * as Phaser from 'phaser';
import { SeededRng } from '../cycle/SeededRng';
import { ZONES } from '../data/zones';
import { LANDMARK_TYPES } from '../data/landmarks';
import { ENEMY_ZONES, selectEnemyTypeId, zoneForColumn, type EnemyZone } from '../data/enemyTiers';
import { Pathfinder, findPathWithFallback, type GridCell } from './Pathfinding';
import { findRealm } from '../data/realms';
import type { PlacedLandmark } from './Landmark';
import { landmarkToCandidate } from './Landmark';
import type { OverworldEvent } from './OverworldEvents';
import type { HeroDecisionAI } from '../decisionAI/HeroDecisionAI';
import type { HeroEntity } from '../hero/HeroEntity';
import { generateMapLayout, GRID_H, GRID_W, TILE_PX, type MapLayout } from './mapLayout';
import type { RealmId, SeasonId } from '../types';
import { seasonBgTint } from '../season/SeasonState';

export { generateMapLayout, GRID_H, GRID_W };
export type { MapLayout };

/** Column bands per enemy zone — used by respawn when the consumed enemy's
 *  position fell outside any band (extremely rare, just a safety net). */
const ENEMY_ZONE_COL_RANGES: Record<EnemyZone, { xMin: number; xMax: number }> = {
  forest:    { xMin: 3,  xMax: 7  },
  plains:    { xMin: 8,  xMax: 11 },
  mountains: { xMin: 12, xMax: 16 },
};

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

  /** Cycle-7 F4: telemetry accessor for pathfinder fallback retry count.
   *  Tests / e2e assertions can check this after a run to confirm the
   *  fallback did NOT fire in normal gameplay (count = 0). A non-zero
   *  count signals a stale-realm regression and should also have emitted
   *  a console.warn at the point of trigger. */
  getPathfinderFallbackCount(): number {
    return this.pathfinderFallbackCount;
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

    // Hero spawn at first village
    const village = this.layout.landmarks.find(l => l.type.kind === 'village')!;
    this.heroSprite = this.add.text(
      village.gridX * TILE_PX + TILE_PX / 2,
      village.gridY * TILE_PX + TILE_PX / 2,
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
    const candidates = this.layout.landmarks
      .filter(l => !l.consumed)
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
    const columnBounds = this.currentRealm
      ? findRealm(this.currentRealm).columnRange
      : undefined;
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

  /** Spawn a replacement enemy in the same zone as the consumed landmark,
   *  picking the enemy type that matches the hero's current chapter so the
   *  narrative ages along with him (V1e). */
  private respawnEnemyNear(consumed: PlacedLandmark): void {
    // Determine the zone band from the consumed landmark's x position.
    const zone: EnemyZone =
      zoneForColumn(consumed.gridX) ??
      ENEMY_ZONES[this.sceneRng.int(ENEMY_ZONES.length)]!;
    const range = ENEMY_ZONE_COL_RANGES[zone];
    const typeId = selectEnemyTypeId(zone, this.hero.chapter);
    const landmarkType = LANDMARK_TYPES.find(t => t.id === typeId);
    if (!landmarkType) return;

    const x = range.xMin + this.sceneRng.int(range.xMax - range.xMin + 1);
    const y = this.sceneRng.int(GRID_H);
    this.respawnCounter += 1;
    const instanceId = `${typeId}_respawn_${this.respawnCounter}`;

    const newLandmark: PlacedLandmark = {
      instanceId,
      type: landmarkType,
      gridX: x,
      gridY: y,
      consumed: false,
    };
    this.layout.landmarks.push(newLandmark);

    // Render the new landmark sprite.
    const text = this.add.text(
      x * TILE_PX + TILE_PX / 2,
      y * TILE_PX + TILE_PX / 2,
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
