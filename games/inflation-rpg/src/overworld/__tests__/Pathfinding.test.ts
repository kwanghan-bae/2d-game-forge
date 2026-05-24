import { describe, it, expect } from 'vitest';
import { Pathfinder, findPathWithFallback, type GridCell } from '../Pathfinding';

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

// Cycle-7 F4: pathfinder columnBounds null fallback retry pure helper.
//
// 시뮬레이션: 50 col 의 wide grid 에서 hero col 1 (base 범위), currentRealm
// = 'sea' 의 columnRange 21-40 가정. target col 5 (sea 범위 밖) → first
// attempt (columnBounds=[21,41]) 는 모두 col <21 차단으로 null. retry
// (no bounds) 후 정상 path 반환. 본 케이스가 stale-realm bug 의 안전망.
describe('findPathWithFallback — Cycle-7 F4', () => {
  it('Case 1: hero col 1 + sea bounds [21,41] + target col 5 → first null, retry returns path, retried=true', async () => {
    const grid: GridCell[][] = Array.from({ length: 10 }, () => Array(50).fill('walkable' as const));
    const pf = new Pathfinder(grid);
    const result = await findPathWithFallback(pf, 1, 5, 5, 5, [21, 41]);
    expect(result.retried).toBe(true);
    expect(result.path).not.toBeNull();
    expect(result.path![0]).toEqual({ x: 1, y: 5 });
    expect(result.path![result.path!.length - 1]).toEqual({ x: 5, y: 5 });
  });

  it('Case 2: hero col 25 (sea 안) + target col 30 (sea 안) → first attempt 성공, retried=false', async () => {
    const grid: GridCell[][] = Array.from({ length: 10 }, () => Array(50).fill('walkable' as const));
    const pf = new Pathfinder(grid);
    const result = await findPathWithFallback(pf, 25, 5, 30, 5, [21, 41]);
    expect(result.retried).toBe(false);
    expect(result.path).not.toBeNull();
    expect(result.path![0]).toEqual({ x: 25, y: 5 });
    expect(result.path![result.path!.length - 1]).toEqual({ x: 30, y: 5 });
  });

  it('Case 3: columnBounds 미지정 (currentRealm 없음) → retried=false 보장', async () => {
    const grid: GridCell[][] = Array.from({ length: 10 }, () => Array(50).fill('walkable' as const));
    const pf = new Pathfinder(grid);
    const result = await findPathWithFallback(pf, 0, 0, 9, 0);
    expect(result.retried).toBe(false);
    expect(result.path).not.toBeNull();
  });

  it('Case 4: bounds 적용 + retry 도 실패 → path=null, retried=true (telemetry 는 trigger 됨)', async () => {
    // 모든 row 의 모든 col 차단 → 어떤 path 도 불가능.
    const grid: GridCell[][] = Array.from({ length: 5 }, () => Array(5).fill('blocked' as const));
    grid[0][0] = 'walkable';
    grid[0][4] = 'walkable';
    const pf = new Pathfinder(grid);
    const result = await findPathWithFallback(pf, 0, 0, 4, 0, [0, 1]);
    expect(result.path).toBeNull();
    expect(result.retried).toBe(true);
  });

  it('Telemetry: Case 1 발동 시 retried=true 한 번, Case 2 발동 시 0 — 누적 카운트 모델', async () => {
    const grid: GridCell[][] = Array.from({ length: 10 }, () => Array(50).fill('walkable' as const));
    const pf = new Pathfinder(grid);
    let fallbackCount = 0;
    // Case 1 발동
    const r1 = await findPathWithFallback(pf, 1, 5, 5, 5, [21, 41]);
    if (r1.retried) fallbackCount += 1;
    // Case 2 발동 안 함
    const r2 = await findPathWithFallback(pf, 25, 5, 30, 5, [21, 41]);
    if (r2.retried) fallbackCount += 1;
    expect(fallbackCount).toBe(1);
  });
});
