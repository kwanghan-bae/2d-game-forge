import * as Phaser from 'phaser';
import { SeededRng } from '../cycle/SeededRng';
import { ZONES, type ZoneId } from '../data/zones';
import { LANDMARK_TYPES } from '../data/landmarks';
import { Pathfinder, type GridCell } from './Pathfinding';
import type { PlacedLandmark } from './Landmark';
import { landmarkToCandidate } from './Landmark';
import type { OverworldEvent } from './OverworldEvents';
import type { HeroDecisionAI } from '../decisionAI/HeroDecisionAI';
import type { HeroEntity } from '../hero/HeroEntity';
import { generateMapLayout, GRID_H, GRID_W, TILE_PX, type MapLayout } from './mapLayout';

export { generateMapLayout, GRID_H, GRID_W };
export type { MapLayout };

/** Zones that are eligible for enemy respawn by column range. */
const ENEMY_ZONE_RANGES: Array<{ zone: ZoneId; xMin: number; xMax: number }> = [
  { zone: 'forest',    xMin: 3,  xMax: 7  },
  { zone: 'plains',    xMin: 8,  xMax: 11 },
  { zone: 'mountains', xMin: 12, xMax: 16 },
];

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

    // Build walkable grid (all walkable for V1a — no obstacles)
    const grid: GridCell[][] = this.layout.tiles.map(row => row.map(() => 'walkable' as const));
    this.pathfinder = new Pathfinder(grid);

    // Start moving
    this.pickNextDestination();
  }

  private async pickNextDestination(): Promise<void> {
    if (this.hero.dead) {
      this.onEvent({ type: 'cycle_ended' });
      return;
    }

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
    // Wait 400ms (lets React resolve the encounter and update hero state) then continue
    this.time.delayedCall(400, () => {
      target.consumed = true;
      const sprite = this.landmarkSprites.get(target.instanceId);
      sprite?.setAlpha(0.3);
      // Enemy landmarks respawn immediately after being consumed.
      // Villages, shrines, caves, ruins do NOT respawn.
      if (target.type.kind === 'enemy') {
        this.respawnEnemyNear(target);
      }
      this.currentTarget = null;
      this.pickNextDestination();
    });
  }

  /** Spawn a replacement enemy in the same zone as the consumed landmark. */
  private respawnEnemyNear(consumed: PlacedLandmark): void {
    // Determine the zone band from the consumed landmark's x position.
    let range = ENEMY_ZONE_RANGES.find(r => consumed.gridX >= r.xMin && consumed.gridX <= r.xMax);
    if (!range) {
      // Fallback: pick any of the 3 enemy zone ranges.
      range = ENEMY_ZONE_RANGES[this.sceneRng.int(ENEMY_ZONE_RANGES.length)];
    }
    const ENEMY_TYPES = ['wolf', 'goblin', 'bandit'];
    const typeId = ENEMY_TYPES[this.sceneRng.int(ENEMY_TYPES.length)];
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
