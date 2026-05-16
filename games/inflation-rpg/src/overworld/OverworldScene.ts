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

export const GRID_W = 20;
export const GRID_H = 12;
const TILE_PX = 32;

export interface MapLayout {
  tiles: ZoneId[][]; // [y][x]
  landmarks: PlacedLandmark[];
}

/** Pure helper, testable without Phaser. */
export function generateMapLayout(seed: number): MapLayout {
  const rng = new SeededRng(seed);

  // Tile layout — vertical bands of biomes for simplicity
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

  // Always: a village in village zone
  place('village', 1, Math.floor(GRID_H / 2));

  // 4–6 enemies in forest/plains zones
  for (let i = 0; i < 5; i++) {
    const enemyTypeId = ['wolf', 'goblin', 'bandit'][rng.int(3)];
    const x = 4 + rng.int(8);
    const y = rng.int(GRID_H);
    place(enemyTypeId, x, y, `_e${i}`);
  }

  // 1–2 bosses in mountains/mystic
  place('wolf_lord', 13 + rng.int(3), rng.int(GRID_H));
  place('dragon', 17 + rng.int(2), rng.int(GRID_H));

  // 1 shrine in mystic
  place('shrine', 18 + rng.int(2), rng.int(GRID_H));

  return { tiles, landmarks };
}

interface OverworldSceneData {
  seed: number;
  hero: HeroEntity;
  ai: HeroDecisionAI;
  onEvent: (event: OverworldEvent) => void;
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
  private moveTimer: Phaser.Time.TimerEvent | null = null;
  private pathfinder!: Pathfinder;

  constructor() { super('OverworldScene'); }

  init(data: OverworldSceneData) {
    this.hero = data.hero;
    this.ai = data.ai;
    this.onEvent = data.onEvent;
    this.layout = generateMapLayout(data.seed);
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0e1a');

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
      this.currentTarget = null;
      this.pickNextDestination();
    });
  }

  private heroGridPos(): { x: number; y: number } {
    return {
      x: Math.round((this.heroSprite.x - TILE_PX / 2) / TILE_PX),
      y: Math.round((this.heroSprite.y - TILE_PX / 2) / TILE_PX),
    };
  }
}
