/**
 * C914: DurationBuffTracker — generic duration-decrement tracker.
 * Replaces 35+ individual `*Remaining` fields in EncounterEngine.
 * Pure data structure, no side effects.
 */

export class DurationBuffTracker {
  private readonly durations = new Map<string, number>();

  /** Activate a buff for `duration` fights. Overwrites if already active. */
  activate(buffId: string, duration: number): void {
    if (duration > 0) {
      this.durations.set(buffId, duration);
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

  /** Remove all active buffs. */
  reset(): void {
    this.durations.clear();
  }

  /** Get all active buff IDs. */
  activeBuffs(): string[] {
    return [...this.durations.keys()];
  }

  /** Get count of active buffs. */
  get size(): number {
    return this.durations.size;
  }
}
