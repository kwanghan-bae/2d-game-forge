import EasyStar from 'easystarjs';

export type GridCell = 'walkable' | 'blocked';

const WALKABLE_ID = 0;
const BLOCKED_ID = 1;

export class Pathfinder {
  private easystar: EasyStar.js;

  constructor(grid: GridCell[][]) {
    this.easystar = new EasyStar.js();
    const numericGrid = grid.map(row => row.map(c => (c === 'walkable' ? WALKABLE_ID : BLOCKED_ID)));
    this.easystar.setGrid(numericGrid);
    this.easystar.setAcceptableTiles([WALKABLE_ID]);
    this.easystar.enableDiagonals();
    this.easystar.enableSync();
  }

  findPath(sx: number, sy: number, dx: number, dy: number): Promise<{ x: number; y: number }[] | null> {
    return new Promise(resolve => {
      this.easystar.findPath(sx, sy, dx, dy, path => resolve(path ?? null));
      this.easystar.calculate();
    });
  }
}
