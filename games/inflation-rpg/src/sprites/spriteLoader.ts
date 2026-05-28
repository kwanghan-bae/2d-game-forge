import Phaser from 'phaser';
import { DUNGEON_SHEET_KEY, SPRITE_FRAME_SIZE, SPRITE_COLS } from './spriteFrames';

/**
 * Resolve the assets base path from DOM or fallback.
 */
function getAssetsBase(): string {
  if (typeof document !== 'undefined') {
    const el = document.querySelector('[data-assets-base]');
    if (el) return el.getAttribute('data-assets-base') ?? '/assets';
  }
  return '/assets';
}

/**
 * Load the dungeon spritesheet in a Phaser scene's preload phase.
 */
export function preloadDungeonSheet(scene: Phaser.Scene): void {
  const base = getAssetsBase();
  scene.load.spritesheet(DUNGEON_SHEET_KEY, `${base}/images/tiny_dungeon_sheet.png`, {
    frameWidth: SPRITE_FRAME_SIZE,
    frameHeight: SPRITE_FRAME_SIZE,
    spacing: 0,
    margin: 0,
  });
}

/**
 * Create a sprite from the dungeon sheet at a specific frame.
 * Rendered at 2x scale (16px → 32px) by default for TILE_PX=32 contexts,
 * or 3x (16px → 48px) for battle display.
 */
export function createDungeonSprite(
  scene: Phaser.Scene,
  x: number,
  y: number,
  frameIndex: number,
  scale = 2,
): Phaser.GameObjects.Sprite {
  const sprite = scene.add.sprite(x, y, DUNGEON_SHEET_KEY, frameIndex);
  sprite.setScale(scale);
  return sprite;
}

// Re-export for convenience
export { DUNGEON_SHEET_KEY, SPRITE_FRAME_SIZE, SPRITE_COLS };
