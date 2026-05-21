import { describe, it, expect, vi } from 'vitest';

// Phaser cannot run in a test environment (no canvas/WebGL).
// The only exports we test here are pure helpers that don't touch Phaser at runtime.
// Mock the module so that Phaser's static initialisation does not execute.
// Phaser 3 ESM has no default export — export named members directly.
vi.mock('phaser', () => ({
  Scene: class Scene { constructor(_key: string) {} },
}));

import { generateMapLayout, GRID_W, GRID_H } from '../OverworldScene';

describe('generateMapLayout', () => {
  it('returns a grid sized GRID_W × GRID_H', () => {
    const layout = generateMapLayout(42);
    expect(layout.tiles.length).toBe(GRID_H);
    expect(layout.tiles[0].length).toBe(GRID_W);
  });

  it('includes at least one village landmark', () => {
    const layout = generateMapLayout(42);
    const villages = layout.landmarks.filter(l => l.type.kind === 'village');
    expect(villages.length).toBeGreaterThanOrEqual(1);
  });

  it('places at least 12 enemy/boss landmarks', () => {
    const layout = generateMapLayout(42);
    const combatLandmarks = layout.landmarks.filter(l => l.type.kind === 'enemy' || l.type.kind === 'boss');
    expect(combatLandmarks.length).toBeGreaterThanOrEqual(12);
  });

  it('initial map has at least 19 total landmarks', () => {
    const layout = generateMapLayout(42);
    expect(layout.landmarks.length).toBeGreaterThanOrEqual(19);
  });

  it('landmark coordinates are within grid bounds', () => {
    const layout = generateMapLayout(42);
    for (const lm of layout.landmarks) {
      expect(lm.gridX).toBeGreaterThanOrEqual(0);
      expect(lm.gridX).toBeLessThan(GRID_W);
      expect(lm.gridY).toBeGreaterThanOrEqual(0);
      expect(lm.gridY).toBeLessThan(GRID_H);
    }
  });

  it('same seed produces same layout', () => {
    const a = generateMapLayout(99);
    const b = generateMapLayout(99);
    expect(a.landmarks.map(l => l.instanceId + ':' + l.gridX + ',' + l.gridY))
      .toEqual(b.landmarks.map(l => l.instanceId + ':' + l.gridX + ',' + l.gridY));
  });
});
