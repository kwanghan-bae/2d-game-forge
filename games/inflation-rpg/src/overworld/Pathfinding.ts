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
