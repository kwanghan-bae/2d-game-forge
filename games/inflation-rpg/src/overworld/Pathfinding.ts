import EasyStar from 'easystarjs';

export type GridCell = 'walkable' | 'blocked';

export interface PathfindOpts {
  /** If provided, columns outside [columnBounds[0], columnBounds[1]) are
   *  treated as impassable, restricting movement to the current realm. */
  columnBounds?: [number, number];
}

const WALKABLE_ID = 0;
const BLOCKED_ID = 1;

export class Pathfinder {
  private easystar: EasyStar.js;
  private readonly width: number;
  private readonly height: number;
  private readonly baseGrid: number[][];

  constructor(grid: GridCell[][]) {
    this.height = grid.length;
    this.width = this.height > 0 ? grid[0]!.length : 0;
    this.baseGrid = grid.map(row => row.map(c => (c === 'walkable' ? WALKABLE_ID : BLOCKED_ID)));
    this.easystar = new EasyStar.js();
    this.easystar.setGrid(this.baseGrid.map(r => [...r]));
    this.easystar.setAcceptableTiles([WALKABLE_ID]);
    this.easystar.enableDiagonals();
    this.easystar.enableSync();
  }

  findPath(sx: number, sy: number, dx: number, dy: number, opts?: PathfindOpts): Promise<{ x: number; y: number }[] | null> {
    const inBounds = (x: number, y: number) =>
      x >= 0 && x < this.width && y >= 0 && y < this.height;
    if (!inBounds(sx, sy) || !inBounds(dx, dy)) {
      return Promise.resolve(null);
    }

    if (opts?.columnBounds) {
      const [cMin, cMax] = opts.columnBounds;
      const constrainedGrid = this.baseGrid.map((row, _y) =>
        row.map((cell, x) => (x < cMin || x >= cMax ? BLOCKED_ID : cell))
      );
      this.easystar.setGrid(constrainedGrid);
    } else {
      this.easystar.setGrid(this.baseGrid.map(r => [...r]));
    }

    return new Promise(resolve => {
      this.easystar.findPath(sx, sy, dx, dy, path => resolve(path ?? null));
      this.easystar.calculate();
    });
  }
}

/** Cycle-7 F4: pathfinder columnBounds null fallback retry.
 *
 *  Cycle 5 의 stale realm bug 처럼 hero col 이 currentRealm 의 column
 *  range 밖일 때, columnBounds 적용한 첫 findPath 가 모두 null 을 반환해
 *  hero 가 즉시 stuck → '무위' 종료된다. Cycle 5 가 root cause (run.
 *  currentRealmId reset) 를 해소했지만 미래 동일 카테고리 bug 재발 시
 *  즉시 안전망으로 떨어지도록 본 helper 추가.
 *
 *  동작:
 *  - opts.columnBounds 미지정: 일반 findPath 한 번만 호출 → retried=false
 *  - opts.columnBounds 지정 & 첫 findPath 성공: retried=false
 *  - opts.columnBounds 지정 & 첫 findPath null: bounds 없이 retry. retry
 *    성공/실패 둘 다 retried=true 로 반환 (telemetry 측면 — 첫 stage
 *    의 안전망 발동을 카운트)
 *
 *  반환 path 는 일반 findPath 와 동일 형식 또는 null.
 */
export async function findPathWithFallback(
  pf: Pathfinder,
  sx: number, sy: number, dx: number, dy: number,
  columnBounds?: [number, number],
): Promise<{ path: { x: number; y: number }[] | null; retried: boolean }> {
  if (!columnBounds) {
    const path = await pf.findPath(sx, sy, dx, dy);
    return { path, retried: false };
  }
  const first = await pf.findPath(sx, sy, dx, dy, { columnBounds });
  if (first !== null && first.length >= 2) {
    return { path: first, retried: false };
  }
  // first attempt failed (null or single-step) under columnBounds —
  // retry once without bounds so the hero is never permanently locked
  // out by a stale realm filter.
  const retry = await pf.findPath(sx, sy, dx, dy);
  return { path: retry, retried: true };
}
