import { describe, it, expect } from 'vitest';
import { Pathfinder, type GridCell } from '../Pathfinding';

describe('Pathfinder', () => {
  it('finds a straight-line path on an empty grid', async () => {
    const grid: GridCell[][] = Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => 'walkable'),
    );
    const pf = new Pathfinder(grid);
    const path = await pf.findPath(0, 0, 9, 0);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(1);
    expect(path![0]).toEqual({ x: 0, y: 0 });
    expect(path![path!.length - 1]).toEqual({ x: 9, y: 0 });
  });

  it('routes around walls', async () => {
    const grid: GridCell[][] = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => 'walkable'),
    );
    // wall column at x=2 except for one gap at y=4
    for (let y = 0; y < 4; y++) grid[y][2] = 'blocked';
    const pf = new Pathfinder(grid);
    const path = await pf.findPath(0, 0, 4, 0);
    expect(path).not.toBeNull();
    // Path must pass through y=4 (the gap)
    expect(path!.some(p => p.y === 4)).toBe(true);
  });

  it('returns null when no path exists', async () => {
    const grid: GridCell[][] = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => 'walkable'),
    );
    // Wall the entire middle column
    for (let y = 0; y < 3; y++) grid[y][1] = 'blocked';
    const pf = new Pathfinder(grid);
    const path = await pf.findPath(0, 0, 2, 0);
    expect(path).toBeNull();
  });
});

describe('Pathfinding bounds', () => {
  it('returns null when start coords out of grid', async () => {
    const grid: GridCell[][] = Array.from({ length: 5 }, () => Array(5).fill('walkable' as const));
    const pf = new Pathfinder(grid);
    expect(await pf.findPath(-1, 0, 2, 2)).toBeNull();
    expect(await pf.findPath(0, 5, 2, 2)).toBeNull();
  });

  it('returns null when destination coords out of grid', async () => {
    const grid: GridCell[][] = Array.from({ length: 5 }, () => Array(5).fill('walkable' as const));
    const pf = new Pathfinder(grid);
    expect(await pf.findPath(0, 0, 5, 2)).toBeNull();
    expect(await pf.findPath(0, 0, 2, -1)).toBeNull();
  });

  it('returns all nodes inside the grid for a valid path', async () => {
    const grid: GridCell[][] = Array.from({ length: 5 }, () => Array(5).fill('walkable' as const));
    const pf = new Pathfinder(grid);
    const path = await pf.findPath(0, 0, 4, 4);
    expect(path).not.toBeNull();
    for (const node of path!) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThan(5);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThan(5);
    }
  });
});
