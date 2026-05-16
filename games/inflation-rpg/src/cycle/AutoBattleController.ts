import type { CycleEvent, CycleState, CycleResult } from './cycleEvents';
import type { CycleEndReason } from './cycleEvents';
import { SeededRng } from './SeededRng';
import { applyTraitMods, type TraitId, type ResolvedLoadout } from './traits';
import { TRAIT_CATALOG } from '../data/traits';
import { type ControllerLoadout } from './loadoutTypes';
import { HeroDecisionAI } from './HeroDecisionAI';

// Re-export so existing consumers (tests, etc.) can import from AutoBattleController.
export type { ControllerLoadout };

export interface ControllerOptions {
  loadout: ControllerLoadout;
  seed: number;
  traits?: TraitId[];
  // 600ms = existing BattleScene combatTimer. Sim-A reuses to keep economy
  // consistent with manual mode.
  roundMs?: number;
}

const DEFAULT_ROUND_MS = 600;

export class AutoBattleController {
  private rng: SeededRng;
  private state: CycleState;
  private events: CycleEvent[] = [];
  private loadout: ResolvedLoadout;
  private roundMs: number;
  private nextRoundAtMs: number;
  private currentEnemyHp: number = 0;
  private currentEnemyId: string | null = null;
  private enemySpawnCounter: number = 0;
  private expMul: number;
  private goldMul: number;
  private bpCostMul: number;
  private fractionalBp: number = 0;
  private ai: HeroDecisionAI;

  constructor(opts: ControllerOptions) {
    const traitIds = opts.traits ?? [];
    const resolved: ResolvedLoadout = applyTraitMods(opts.loadout, traitIds, TRAIT_CATALOG);
    this.loadout = resolved;
    this.expMul = resolved.expMul;
    this.goldMul = resolved.goldMul;
    this.bpCostMul = resolved.bpCostMul;
    // AI is single source of truth for trait list — no duplicate this.traitIds.
    this.ai = new HeroDecisionAI(traitIds);
    this.rng = new SeededRng(opts.seed);
    this.roundMs = opts.roundMs ?? DEFAULT_ROUND_MS;
    this.nextRoundAtMs = this.roundMs;
    this.state = {
      tNowMs: 0,
      characterId: opts.loadout.characterId,
      seed: opts.seed,
      heroLv: 1,
      heroExp: 0,
      heroHp: resolved.heroHpMax,
      heroHpMax: resolved.heroHpMax,
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
      traitIds,
    });
  }

  /** Exposes the HeroDecisionAI for Sim-C decision wiring + testability. */
  getDecisionAI(): HeroDecisionAI {
    return this.ai;
  }

  tick(deltaMs: number): void {
    if (this.state.ended || deltaMs <= 0) return;
    const targetMs = this.state.tNowMs + deltaMs;
    while (!this.state.ended && this.nextRoundAtMs <= targetMs) {
      this.state.tNowMs = this.nextRoundAtMs;
      this.runRound();
      this.nextRoundAtMs += this.roundMs;
    }
    if (!this.state.ended) {
      this.state.tNowMs = targetMs;
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
    const levelCurve: Array<{ t: number; lv: number }> = [{ t: 0, lv: 1 }];
    const expCurve: Array<{ t: number; cumExp: number }> = [{ t: 0, cumExp: 0 }];
    const bpCurve: Array<{ t: number; bp: number }> = [{ t: 0, bp: this.state.bpMax }];
    const byEnemyId: Record<string, number> = {};
    const enemyIsBoss = new Map<string, boolean>();
    let bossKills = 0;
    let cumExp = 0;
    let endEv: CycleEvent | undefined;

    for (const ev of this.events) {
      if (ev.type === 'battle_start') {
        enemyIsBoss.set(ev.enemyId, ev.isBoss);
      }
      if (ev.type === 'level_up') {
        levelCurve.push({ t: ev.t, lv: ev.to });
      }
      if (ev.type === 'enemy_kill') {
        cumExp += ev.expGain;
        expCurve.push({ t: ev.t, cumExp });
        byEnemyId[ev.enemyId] = (byEnemyId[ev.enemyId] ?? 0) + 1;
        if (enemyIsBoss.get(ev.enemyId)) {
          bossKills += 1;
        }
      }
      if (ev.type === 'bp_change') {
        bpCurve.push({ t: ev.t, bp: ev.remaining });
      }
      if (ev.type === 'cycle_end') {
        endEv = ev;
      }
    }

    const reason = endEv?.type === 'cycle_end' ? endEv.reason : 'forced';

    return {
      durationMs: this.state.tNowMs,
      maxLevel: this.state.heroLv,
      levelCurve,
      expCurve,
      bpCurve,
      kills: { total: this.state.cumKills, byEnemyId, bossKills },
      drops: { byItemId: { ...this.state.drops }, rarityHistogram: {} },
      reason,
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
    this.enemySpawnCounter += 1;
    const enemyLevel = this.state.heroLv;
    const enemyMaxHp = Math.max(10, enemyLevel * 20);
    this.currentEnemyId = `sim_enemy_lv${enemyLevel}_#${this.enemySpawnCounter}`;
    this.currentEnemyHp = enemyMaxHp;
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
      // Hero defeat: restore to full and consume extra BP — placeholder until Phase Sim-G balance tuning.
      this.state.heroHp = this.state.heroHpMax;
    }
  }

  private killEnemy(): void {
    if (!this.currentEnemyId) return;
    const exp = Math.max(1, Math.floor(this.state.heroLv * 10 * this.expMul));
    const gold = Math.max(1, Math.floor((this.state.heroLv * 2) * this.goldMul) + this.rng.int(this.state.heroLv));
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
    this.consumeBp(1, 'encounter');
    this.currentEnemyId = null;
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

  private consumeBp(amount: number, cause: string): void {
    // Fractional BP accumulator: avoids floor-clamp swallowing sub-1 costs.
    // e.g. t_swift (bpCostMul 0.9): 9 encounters cost 0.9 each → 8.1 banked
    // after 9; on 10th encounter 9.0 is crossed → 9 integer BP consumed total.
    // t_swift + t_terminal_genius (0.9 × 2.0 = 1.8): correctly averages above
    // 1 BP per encounter rather than silently cancelling to 1 each time.
    this.fractionalBp += amount * this.bpCostMul;
    const intCost = Math.floor(this.fractionalBp);
    this.fractionalBp -= intCost;
    if (intCost === 0) return; // fractional cost banked; no integer BP consumed this encounter
    this.state.bp = Math.max(0, this.state.bp - intCost);
    this.emit({
      t: this.state.tNowMs,
      type: 'bp_change',
      delta: -intCost,
      remaining: this.state.bp,
      cause,
    });
    if (this.state.bp <= 0) {
      this.endCycle('bp_exhausted');
    }
  }

  abandon(): void {
    if (this.state.ended) return;
    this.endCycle('abandoned');
  }

  private endCycle(reason: CycleEndReason): void {
    if (this.state.ended) return;
    this.state.ended = true;
    this.emit({
      t: this.state.tNowMs,
      type: 'cycle_end',
      reason,
      durationMs: this.state.tNowMs,
      maxLevel: this.state.heroLv,
      finalState: {
        heroHp: this.state.heroHp,
        heroExp: this.state.heroExp,
        cumKills: this.state.cumKills,
        cumGold: this.state.cumGold,
      },
    });
  }

  private expRequiredForLevel(lv: number): number {
    // Polynomial curve placeholder. Inflation curve fine-tune in Phase Sim-G.
    return Math.floor(10 * Math.pow(lv, 1.3));
  }
}

function hashLoadout(l: ControllerLoadout): string {
  return `${l.characterId}|hp${l.heroHpMax}|atk${l.heroAtkBase}|bp${l.bpMax}`;
}
