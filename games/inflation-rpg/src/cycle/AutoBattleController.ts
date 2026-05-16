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
  private currentEnemyHp: number = 0;
  private currentEnemyMaxHp: number = 0;
  private currentEnemyId: string | null = null;

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
    while (!this.state.ended && this.state.tNowMs >= this.nextRoundAtMs) {
      this.runRound();
      this.nextRoundAtMs += this.roundMs;
    }
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

  private runRound(): void {
    if (!this.currentEnemyId) {
      this.spawnEnemy();
    }
    this.heroAttack();
    if (this.currentEnemyHp <= 0) {
      this.killEnemy();
      return;
    }
    this.enemyAttack();
  }

  private spawnEnemy(): void {
    // Sim-A uses a minimal placeholder enemy stat curve. Real monster data
    // integration arrives in Task 5 where we connect to data/monsters.ts.
    const enemyLevel = this.state.heroLv;
    const enemyMaxHp = Math.max(10, enemyLevel * 20);
    this.currentEnemyId = `sim_enemy_lv${enemyLevel}_t${this.state.tNowMs}`;
    this.currentEnemyHp = enemyMaxHp;
    this.currentEnemyMaxHp = enemyMaxHp;
    this.emit({
      t: this.state.tNowMs,
      type: 'battle_start',
      enemyId: this.currentEnemyId,
      isBoss: false,
      heroLv: this.state.heroLv,
      heroHp: this.state.heroHp,
      enemyHp: enemyMaxHp,
    });
  }

  private heroAttack(): void {
    if (!this.currentEnemyId) return;
    const dmg = Math.max(1, this.loadout.heroAtkBase + this.state.heroLv * 2);
    this.currentEnemyHp = Math.max(0, this.currentEnemyHp - dmg);
    this.emit({
      t: this.state.tNowMs,
      type: 'hero_hit',
      enemyId: this.currentEnemyId,
      damage: dmg,
      remaining: this.currentEnemyHp,
    });
  }

  private enemyAttack(): void {
    if (!this.currentEnemyId) return;
    const dmg = Math.max(1, this.state.heroLv * 3);
    this.state.heroHp = Math.max(0, this.state.heroHp - dmg);
    this.emit({
      t: this.state.tNowMs,
      type: 'enemy_hit',
      enemyId: this.currentEnemyId,
      damage: dmg,
      remaining: this.state.heroHp,
    });
    if (this.state.heroHp <= 0) {
      // Hero defeat: restore to full and consume extra BP — placeholder until Task 6.
      this.state.heroHp = this.state.heroHpMax;
    }
  }

  private killEnemy(): void {
    if (!this.currentEnemyId) return;
    const exp = Math.max(1, this.state.heroLv * 10);
    const gold = Math.max(1, this.state.heroLv * 2);
    this.emit({
      t: this.state.tNowMs,
      type: 'enemy_kill',
      enemyId: this.currentEnemyId,
      expGain: exp,
      goldGain: gold,
      dropIds: [],
    });
    this.state.cumKills += 1;
    this.state.cumGold += gold;
    this.state.heroExp += exp;
    this.tryLevelUp();
    this.currentEnemyId = null;
    // bp_change handled in Task 6.
  }

  private tryLevelUp(): void {
    while (this.state.heroExp >= this.expRequiredForLevel(this.state.heroLv)) {
      const cost = this.expRequiredForLevel(this.state.heroLv);
      this.state.heroExp -= cost;
      const from = this.state.heroLv;
      this.state.heroLv = from + 1;
      // Sim-A stat curve placeholder. Tuning to inflation §11.5 happens in Phase Sim-G.
      const hpDelta = Math.floor(this.state.heroHpMax * 0.05);
      this.state.heroHpMax += hpDelta;
      this.state.heroHp = this.state.heroHpMax; // full heal on level
      this.emit({
        t: this.state.tNowMs,
        type: 'level_up',
        from,
        to: this.state.heroLv,
        statDelta: { hp: hpDelta },
      });
    }
  }

  private expRequiredForLevel(lv: number): number {
    // Polynomial curve placeholder. Inflation curve fine-tune in Phase Sim-G.
    return Math.floor(10 * Math.pow(lv, 1.3));
  }
}

function hashLoadout(l: ControllerLoadout): string {
  return `${l.characterId}|hp${l.heroHpMax}|atk${l.heroAtkBase}|bp${l.bpMax}`;
}
