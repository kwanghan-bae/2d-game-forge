import type { CycleEvent, CycleState, CycleResult } from './cycleEvents';
import { SeededRng } from './SeededRng';

export interface ControllerLoadout {
  characterId: string;
  bpMax: number;
  heroHpMax: number;
  heroAtkBase: number;
  // Later phases extend: equipped / ascension / relics / mythics / traits / unlockedSkills
}

export interface ControllerOptions {
  loadout: ControllerLoadout;
  seed: number;
  // 600ms = existing BattleScene combatTimer. Sim-A reuses to keep economy
  // consistent with manual mode.
  roundMs?: number;
}

const DEFAULT_ROUND_MS = 600;

export class AutoBattleController {
  private rng: SeededRng;
  private state: CycleState;
  private events: CycleEvent[] = [];
  private loadout: ControllerLoadout;
  private roundMs: number;
  private nextRoundAtMs: number;

  constructor(opts: ControllerOptions) {
    this.loadout = opts.loadout;
    this.rng = new SeededRng(opts.seed);
    this.roundMs = opts.roundMs ?? DEFAULT_ROUND_MS;
    this.nextRoundAtMs = this.roundMs;
    this.state = {
      tNowMs: 0,
      characterId: opts.loadout.characterId,
      seed: opts.seed,
      heroLv: 1,
      heroExp: 0,
      heroHp: opts.loadout.heroHpMax,
      heroHpMax: opts.loadout.heroHpMax,
      bp: opts.loadout.bpMax,
      bpMax: opts.loadout.bpMax,
      currentFloor: 1,
      cumKills: 0,
      cumGold: 0,
      drops: {},
      ended: false,
    };
    this.emit({
      t: 0,
      type: 'cycle_start',
      loadoutHash: hashLoadout(opts.loadout),
      seed: opts.seed,
      characterId: opts.loadout.characterId,
    });
  }

  tick(deltaMs: number): void {
    if (this.state.ended || deltaMs <= 0) return;
    this.state.tNowMs += deltaMs;
    // Battle round trigger logic arrives in Task 4.
  }

  getEvents(): readonly CycleEvent[] {
    return this.events;
  }

  getState(): CycleState {
    return { ...this.state, drops: { ...this.state.drops } };
  }

  getResult(): CycleResult | null {
    if (!this.state.ended) return null;
    // Full aggregation arrives in Task 7. Stub returns minimal shape.
    return {
      durationMs: this.state.tNowMs,
      maxLevel: this.state.heroLv,
      levelCurve: [],
      expCurve: [],
      bpCurve: [],
      kills: { total: this.state.cumKills, byEnemyId: {}, bossKills: 0 },
      drops: { byItemId: { ...this.state.drops }, rarityHistogram: {} },
      reason: 'bp_exhausted',
    };
  }

  protected emit(e: CycleEvent): void {
    this.events.push(e);
  }
}

function hashLoadout(l: ControllerLoadout): string {
  return `${l.characterId}|hp${l.heroHpMax}|atk${l.heroAtkBase}|bp${l.bpMax}`;
}
