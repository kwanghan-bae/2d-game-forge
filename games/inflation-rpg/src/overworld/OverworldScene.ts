import * as Phaser from 'phaser';
import { SeededRng } from '../cycle/SeededRng';
import { ZONES } from '../data/zones';
import { LANDMARK_TYPES } from '../data/landmarks';
import { ENEMY_ZONES, selectEnemyTypeId, zoneForColumn, type EnemyZone } from '../data/enemyTiers';
import { Pathfinder, type GridCell } from './Pathfinding';
import type { PlacedLandmark } from './Landmark';
import { landmarkToCandidate } from './Landmark';
import type { OverworldEvent } from './OverworldEvents';
import type { HeroDecisionAI } from '../decisionAI/HeroDecisionAI';
import type { HeroEntity } from '../hero/HeroEntity';
import { generateMapLayout, GRID_H, GRID_W, TILE_PX, type MapLayout } from './mapLayout';

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
  }

  /** Scale both tween duration (movement) and delayedCall (post-arrival pause)
   *  by the same factor so the cycle plays uniformly faster. Callable while
   *  the scene is running — OverworldRunner uses this for the speed buttons. */
  setSpeed(multiplier: number): void {
    const clamped = Math.max(0.25, Math.min(20, multiplier));
    this.tweens.timeScale = clamped;
    this.time.timeScale = clamped;
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0e1a');
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
      this.onEvent({ type: 'cycle_ended' });
      return;
    }

    const chosenCandidate = this.ai.chooseDestination(candidates.map(c => c.candidate));
    if (!chosenCandidate) {
      this.onEvent({ type: 'cycle_ended' });
      return;
    }

    const target = candidates.find(c => c.candidate.id === chosenCandidate.id)!.landmark;
    const path = await this.pathfinder.findPath(heroPos.x, heroPos.y, target.gridX, target.gridY);
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
      onComplete: () => this.stepAlongPath(),
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
