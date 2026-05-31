/**
 * C845: LateGameScheduler — tracks late-game event pity and density state.
 *
 * Separate from the general pity timer (fightsSinceEvent), this tracks
 * fights since last LATE-game event specifically. When fights > 200 and
 * the player hasn't seen a late event in N fights, the scheduler signals
 * that late-event weights should be boosted.
 */

export const LATE_PITY_THRESHOLD = 15; // fights without late event → boost
export const LATE_PITY_BOOST = 1.5; // multiplier applied to late-event weights during pity

export interface LateGameSchedulerState {
  fightsSinceLateEvent: number;
  totalLateEvents: number;
  lastLateEventFight: number;
}

export class LateGameScheduler {
  private fightsSinceLateEvent = 0;
  private totalLateEvents = 0;
  private lastLateEventFight = 0;

  /** Call after every fight in the 200+ zone */
  recordFight(totalFights: number, lateEventFired: boolean): void {
    if (lateEventFired) {
      this.fightsSinceLateEvent = 0;
      this.totalLateEvents++;
      this.lastLateEventFight = totalFights;
    } else if (totalFights >= 200) {
      this.fightsSinceLateEvent++;
    }
  }

  /** Whether late-event pity boost should apply */
  isPityActive(): boolean {
    return this.fightsSinceLateEvent >= LATE_PITY_THRESHOLD;
  }

  /** Multiplier to apply to late-event weights when pity is active */
  getDensityBoost(): number {
    return this.isPityActive() ? LATE_PITY_BOOST : 1.0;
  }

  /** Snapshot for persistence/stats */
  getState(): LateGameSchedulerState {
    return {
      fightsSinceLateEvent: this.fightsSinceLateEvent,
      totalLateEvents: this.totalLateEvents,
      lastLateEventFight: this.lastLateEventFight,
    };
  }

  /** Restore from persisted state */
  loadState(state: LateGameSchedulerState): void {
    this.fightsSinceLateEvent = state.fightsSinceLateEvent;
    this.totalLateEvents = state.totalLateEvents;
    this.lastLateEventFight = state.lastLateEventFight;
  }

  reset(): void {
    this.fightsSinceLateEvent = 0;
    this.totalLateEvents = 0;
    this.lastLateEventFight = 0;
  }
}
