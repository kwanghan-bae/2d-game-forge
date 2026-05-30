/**
 * C788: EventOrchestrator — owns event SM registration + accept/decline effects.
 * Extracted from EncounterEngine to reduce God Object (~85 lines removed).
 * Delegates: pending checks, resolve calls, decline consolation.
 * Duration counters remain in EncounterEngine (deeply coupled to combat calcs).
 */
import { EventStateMachine } from './EventStateMachine';
import {
  TRIAL_GROUNDS_DURATION,
  STORM_NEXUS_DURATION,
  RAIN_SANCTUARY_DURATION,
  RAIN_SANCTUARY_HEAL_RATE,
  FOG_AMBUSH_DURATION,
  WIND_GALE_DURATION,
  SNOW_DRIFT_DURATION,
  RELIC_MAX_LEVEL,
  EVENT_DECLINE_GOLD_RATE,
  EVENT_DECLINE_GOLD_CAP,
  ABYSSAL_CONVERGENCE_DURATION,
} from './constants';

export type EventId =
  | 'colosseum' | 'trial_grounds' | 'storm_nexus'
  | 'rain_sanctuary' | 'fog_ambush' | 'wind_gale'
  | 'snow_drift' | 'void_rift' | 'abyssal_convergence';

export interface EventAcceptEffects {
  colosseumRemaining: number;
  voidRiftRemaining: number;
  voidRiftRelicLevels: number[] | null;
  trialGroundsRemaining: number;
  stormNexusRemaining: number;
  rainSanctuaryRemaining: number;
  rainSanctuaryHeal: number;
  fogAmbushRemaining: number;
  windGaleRemaining: number;
  snowDriftRemaining: number;
  abyssalConvergenceRemaining: number;
  declineGold: number;
}

const EMPTY_EFFECTS: EventAcceptEffects = {
  colosseumRemaining: 0, voidRiftRemaining: 0, voidRiftRelicLevels: null,
  trialGroundsRemaining: 0, stormNexusRemaining: 0, rainSanctuaryRemaining: 0,
  rainSanctuaryHeal: 0, fogAmbushRemaining: 0, windGaleRemaining: 0,
  snowDriftRemaining: 0, abyssalConvergenceRemaining: 0, declineGold: 0,
};

export interface EventOrchestratorCtx {
  heroHpMax: number;
  heroGold: number;
  comboStreak: number;
  relicLevels: number[];
}

export class EventOrchestrator {
  private readonly sm = new EventStateMachine();
  private lastEffects: EventAcceptEffects = { ...EMPTY_EFFECTS };

  constructor() {
    this.registerAll();
  }

  private registerAll(): void {
    this.sm.register('colosseum', { onAccept: () => {}, onDecline: () => {} });
    this.sm.register('void_rift', { onAccept: () => {}, onDecline: () => {} });
    this.sm.register('trial_grounds', { onAccept: () => {}, onDecline: () => {} });
    this.sm.register('storm_nexus', { onAccept: () => {}, onDecline: () => {} });
    this.sm.register('rain_sanctuary', { onAccept: () => {}, onDecline: () => {} });
    this.sm.register('fog_ambush', { onAccept: () => {}, onDecline: () => {} });
    this.sm.register('wind_gale', { onAccept: () => {}, onDecline: () => {} });
    this.sm.register('snow_drift', { onAccept: () => {}, onDecline: () => {} });
    this.sm.register('abyssal_convergence', { onAccept: () => {}, onDecline: () => {} });
  }

  trigger(id: EventId): void { this.sm.trigger(id); }
  getPending(id: EventId): boolean { return this.sm.getPending(id); }
  getAllPending(): string[] { return this.sm.getAllPending(); }

  /**
   * Resolve an event and return effects to apply.
   * Caller (EncounterEngine) applies effects to its own state.
   */
  resolve(id: EventId, accept: boolean, ctx: EventOrchestratorCtx): EventAcceptEffects {
    this.lastEffects = { ...EMPTY_EFFECTS };
    if (accept) {
      switch (id) {
        case 'colosseum': this.lastEffects.colosseumRemaining = 5; break;
        case 'void_rift': {
          this.lastEffects.voidRiftRemaining = 3;
          if (ctx.relicLevels.length > 0) {
            const idx = Math.floor(Math.random() * ctx.relicLevels.length);
            const levels = [...ctx.relicLevels];
            const currentLevel = levels[idx] || 1;
            if (currentLevel < RELIC_MAX_LEVEL) {
              levels[idx] = currentLevel + 1;
              this.lastEffects.voidRiftRelicLevels = levels;
            }
          }
          break;
        }
        case 'trial_grounds': this.lastEffects.trialGroundsRemaining = TRIAL_GROUNDS_DURATION; break;
        case 'storm_nexus': this.lastEffects.stormNexusRemaining = STORM_NEXUS_DURATION; break;
        case 'rain_sanctuary':
          this.lastEffects.rainSanctuaryRemaining = RAIN_SANCTUARY_DURATION;
          this.lastEffects.rainSanctuaryHeal = Math.floor(ctx.heroHpMax * RAIN_SANCTUARY_HEAL_RATE);
          break;
        case 'fog_ambush': this.lastEffects.fogAmbushRemaining = FOG_AMBUSH_DURATION; break;
        case 'wind_gale': this.lastEffects.windGaleRemaining = WIND_GALE_DURATION; break;
        case 'snow_drift': this.lastEffects.snowDriftRemaining = SNOW_DRIFT_DURATION; break;
        case 'abyssal_convergence': this.lastEffects.abyssalConvergenceRemaining = ABYSSAL_CONVERGENCE_DURATION; break;
      }
    } else {
      this.lastEffects.declineGold = Math.min(EVENT_DECLINE_GOLD_CAP,
        Math.max(1, Math.floor(ctx.heroGold * EVENT_DECLINE_GOLD_RATE * ctx.comboStreak)));
    }
    this.sm.resolve(id, accept);
    return this.lastEffects;
  }

  getLastEffects(): EventAcceptEffects { return this.lastEffects; }
}
