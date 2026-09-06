// Deterministic seeded RNG (mulberry32). Drop-in replacement for Math.random()
// within AutoBattleController so cycle replays are reproducible.

export class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    t ^= t + (Math.imul(t ^ (t >>> 7), t | 61) >>> 0);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Readable aliases used by systems that consume a unit interval roll. */
  float(): number {
    return this.next();
  }

  random(): number {
    return this.next();
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }
}
