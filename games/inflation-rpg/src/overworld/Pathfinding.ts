import EasyStar from 'easystarjs';

export type GridCell = 'walkable' | 'blocked';

const WALKABLE_ID = 0;
const BLOCKED_ID = 1;

export class Pathfinder {
  private easystar: EasyStar.js;
  private readonly width: number;
  private readonly height: number;

  constructor(grid: GridCell[][]) {
    this.height = grid.length;
    this.width = this.height > 0 ? grid[0]!.length : 0;
    this.easystar = new EasyStar.js();
    const numericGrid = grid.map(row => row.map(c => (c === 'walkable' ? WALKABLE_ID : BLOCKED_ID)));
    this.easystar.setGrid(numericGrid);
    this.easystar.setAcceptableTiles([WALKABLE_ID]);
    this.easystar.enableDiagonals();
    this.easystar.enableSync();
  }

  findPath(sx: number, sy: number, dx: number, dy: number): Promise<{ x: number; y: number }[] | null> {
    const inBounds = (x: number, y: number) =>
      x >= 0 && x < this.width && y >= 0 && y < this.height;
    if (!inBounds(sx, sy) || !inBounds(dx, dy)) {
      return Promise.resolve(null);
    }
    return new Promise(resolve => {
      this.easystar.findPath(sx, sy, dx, dy, path => resolve(path ?? null));
      this.easystar.calculate();
    });
  }
}
