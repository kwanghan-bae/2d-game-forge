/**
 * C914: DurationBuffTracker — generic duration-decrement tracker.
 * Replaces 35+ individual `*Remaining` fields in EncounterEngine.
 * Pure data structure, no side effects.
 */

import { getBuffNameKR } from './BuffCatalog';

/** C942: structured buff info for UI consumption. */
export interface BuffInfo {
  name: string;
  magnitude: number;
  remaining: number; // -1 for permanent
}

export class DurationBuffTracker {
  private readonly durations = new Map<string, number>();
  private readonly magnitudes = new Map<string, number>();

  /** Activate a buff for `duration` fights. Overwrites if already active. */
  activate(buffId: string, duration: number, magnitude?: number): void {
    if (duration > 0) {
      this.durations.set(buffId, duration);
      if (magnitude !== undefined) this.magnitudes.set(buffId, magnitude);
    }
  }

  /** Decrement all active buffs by 1. Removes expired ones. */
  tick(): void {
    for (const [id, remaining] of this.durations) {
      if (remaining <= 1) {
        this.durations.delete(id);
      } else {
        this.durations.set(id, remaining - 1);
      }
    }
  }

  /** Check if a buff is currently active (remaining > 0). */
  isActive(buffId: string): boolean {
    return (this.durations.get(buffId) ?? 0) > 0;
  }

  /** Get remaining duration for a buff. Returns 0 if not active. */
  remaining(buffId: string): number {
    return this.durations.get(buffId) ?? 0;
  }

  /** Deactivate a specific buff (remove it). */
  deactivate(buffId: string): void {
    this.durations.delete(buffId);
    this.magnitudes.delete(buffId);
  }

  /** Remove all active buffs. */
  reset(): void {
    this.durations.clear();
    this.magnitudes.clear();
  }

  /** Get all active buff IDs. */
  activeBuffs(): string[] {
    return [...this.durations.keys()];
  }

  /** C942: Get structured info for all active buffs. */
  getActiveBuffInfos(): BuffInfo[] {
    const infos: BuffInfo[] = [];
    for (const [id, remaining] of this.durations) {
      infos.push({ name: getBuffNameKR(id), magnitude: this.magnitudes.get(id) ?? 0, remaining });
    }
    return infos;
  }

  /** Get count of active buffs. */
  get size(): number {
    return this.durations.size;
  }

  /** C945: Tick all buffs and return map of which were active before tick. */
  tickAndCapture(): Map<string, boolean> {
    const wasActive = new Map<string, boolean>();
    for (const [id] of this.durations) {
      wasActive.set(id, true);
    }
    this.tick();
    return wasActive;
  }
}
