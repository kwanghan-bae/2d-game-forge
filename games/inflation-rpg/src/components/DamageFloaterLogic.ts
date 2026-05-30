/**
 * C655: DamageFloater logic — manages floating number entries (damage/heal/exp/critical).
 * Pure logic layer, no React dependency. Used by DamageFloater component.
 */

export type DamageType = 'damage' | 'heal' | 'exp' | 'critical';

export interface DamageEntry {
  value: number;
  type: DamageType;
  id: number;
  createdAt: number;
  progress: number;
}

interface InternalEntry {
  value: number;
  type: DamageType;
  id: number;
  createdAt: number;
}

export class DamageFloaterLogic {
  private entries: InternalEntry[] = [];
  private nextId = 0;
  private readonly duration: number;

  constructor(opts: { duration?: number } = {}) {
    this.duration = opts.duration ?? 800;
  }

  addEntry(input: { value: number; type: DamageType }, now = Date.now()): void {
    this.entries.push({
      value: input.value,
      type: input.type,
      id: this.nextId++,
      createdAt: now,
    });
  }

  getActiveEntries(now = Date.now()): DamageEntry[] {
    this.entries = this.entries.filter(e => now - e.createdAt < this.duration);
    return this.entries.map(e => ({
      ...e,
      progress: Math.min(1, (now - e.createdAt) / this.duration),
    }));
  }

  clear(): void {
    this.entries = [];
  }
}
