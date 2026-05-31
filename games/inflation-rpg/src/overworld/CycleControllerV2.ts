import { HeroEntity, type HeroSnapshot } from '../hero/HeroEntity';
import { HeroDecisionAI } from '../decisionAI/HeroDecisionAI';
import { EncounterEngine } from './EncounterEngine';
import { SeededRng } from '../cycle/SeededRng';
import { SagaRecorder } from '../saga/SagaRecorder';
import { NarrativeGenerator } from '../saga/NarrativeGenerator';
import { LANDMARK_TYPES, type LandmarkKind } from '../data/landmarks';
import { tiersCrossed, presetForTier, type MilestoneTier } from '../data/milestones';
import { lookupDrop } from './dropTable';
import { findRealm } from '../data/realms';
import { EVENT_NARRATION } from './encounter/EventNarration';
import type { TraitId } from '../cycle/traits';
import type { CycleSaga, DeathCause, SagaEvent } from '../saga/SagaTypes';
import type { OverworldEvent } from './OverworldEvents';
import { useGameStore } from '../store/gameStore';
import { tickNpc, spawnNpc } from '../npc/NpcLifecycle';
import { fieldLevelAtColumn } from '../zone/zoneNavigation';
import { computeFieldDamping } from '../zone/fieldDamping';
import { getFieldDiffThreshold, getRejuvDiscount } from '../buff/buffEffects';
import {
  bossIntroSampleSeed,
  findBossIntroBuff,
  sampleBossIntroCards,
  type BossIntroBuff,
  type BossIntroBuffId,
} from '../buff/bossIntroCatalog';
import {
  REALM_FORK_CATALOG,
  computeRealmForkAutoChoice,
  type RealmForkCard,
  type RealmForkCardId,
} from '../buff/realmForkCatalog';
import { seasonForAge } from '../season/SeasonState';
import { rejuvenationCost } from '../hero/rejuvenation';
import { LevelHistoryBuffer, type LevelSnapshot } from './levelHistory';

/** Cycle 109 F1 — boss intro buff cap. PRD §F1.동작(3): activeBossIntroBuffs
 *  size >= 4 → modal skip + boss_intro_skipped emit. */
const BOSS_INTRO_BUFF_CAP = 4;

/** Cycle 110 F1 — realm fork buff cap. PRD §F1.동작(5/8): activeRealmForkBuffs
 *  size >= 4 → modal skip + realm_fork_skipped emit. Mirrors boss intro cap. */
const REALM_FORK_BUFF_CAP = 4;

/** Cycle-11 C10-B — auto-rejuv tuning constants. Threshold = age 65 (PRD §C10-B
 *  example), max 2 rejuvs/cycle (caps light drain + lets sim aggregate cycles
 *  still reach age 70 → '자연사' for the C10-A criterion). 5-year rollback per
 *  rejuv mirrors the existing manual SpendModal + post-mortem B3 free-rejuv. */
const AUTO_REJUV_AGE_THRESHOLD = 65;
const AUTO_REJUV_MAX_PER_CYCLE = 2;
const AUTO_REJUV_YEARS = 5;

export interface CycleControllerV2Opts {
  seed: number;
  traits: readonly TraitId[];
  heroHpMax: number;
  heroAtkBase: number;
  /** V3-C — buff snapshot 을 매 arrival 마다 새로 읽어오는 callback.
   *  V3-D — damping 필드 추가 (field level 대비 hero 약화). */
  getBuffSnapshot?: () => { dropChanceBonus: number; agingSpeedMul: number; damping: number };
  /** V3-D — boss 처치 시 호출. unlockable next realm 의 id 반환. */
  onBossKill?: (currentRealmId: import('../types').RealmId) => import('../types').RealmId | null;
  /** V3-H B2 — 이어하기 시 기존 hero state 복원. null/undefined 면 새 hero 생성. */
  heroSnapshot?: HeroSnapshot | null;
  /** C830 — Risk Gambit auto-resolve policy. default='always'. */
  gambitPolicy?: 'always' | 'never' | 'hp_above_half';
}

export class CycleControllerV2 {
  private hero: HeroEntity;
  private ai: HeroDecisionAI;
  private encounter: EncounterEngine;
  private saga: SagaRecorder;
  private rng: SeededRng;
  private endCause: DeathCause | null = null;
  private readonly seed: number;
  private kills: number = 0;
  private bossKills: number = 0;
  private drops: number = 0;
  private getBuffSnapshot?: () => { dropChanceBonus: number; agingSpeedMul: number; damping: number };
  private onBossKill?: (currentRealmId: import('../types').RealmId) => import('../types').RealmId | null;
  private currentRealmId: import('../types').RealmId | null = null;
  private unlockedRealms: readonly import('../types').RealmId[] = ['base'];
  /** Cycle 110 F1 — trait list captured at construction for trait-based realm
   *  fork auto-choice. computeRealmForkAutoChoice(this.traits) returns
   *  'risk' | 'safe' deterministically. */
  private readonly traits: readonly TraitId[];
  /** Cycle 106 F1 — per-cycle (= per-controller-instance) milestone tier ledger.
   *  Set<tier> 이미 emit 된 tier 추적. 같은 cycle 안 같은 tier 두 번 emit 금지.
   *  controller 가 cycle 단위로 새로 생성되므로 별도 reset hook 불필요. */
  private milestoneLedger: Set<MilestoneTier> = new Set();

  /** Cycle 108 F1 — per-cycle (= per-controller-instance) fate roll cap.
   *  Marked true as soon as fate_roll_required emits (modal shown), regardless
   *  of accept/decline outcome. PRD §F1.동작(2) lean 단순화. Persist 안 됨 —
   *  controller instance scope only. run-resume 시 새 controller 가 reset. */
  private fateRollConsumed: boolean = false;

  /** Cycle 108 F1 — fate roll pending guard. True between emit and
   *  resolveFateRoll() call. Blocks all handleArrival processing so the
   *  stagger-recover early-return (line 135-152) doesn't auto-revive the hero
   *  while modal is open. cycle 14 클래스 stuck-state risk 방지. */
  private fateRollPending: boolean = false;

  /** Cycle 108 F1 — landmarkId captured at fate_roll_required emit time.
   *  Used as enemyId for the deferred hero_died emit in resolveFateRoll('decline').
   *  null when no fate roll is pending. */
  private fateRollLandmarkId: string | null = null;

  /** Cycle 109 F1 — per-cycle (= per-controller-instance) set of boss landmarkIds
   *  that have already gone through the boss-intro path. PRD §F1.동작(3):
   *  per-boss-landmark cap (vs cycle 108's per-cycle fate roll cap). Once a
   *  landmarkId is in this set, isBossIntroEligible returns false so the inner
   *  resolveEncounter (re-fight) call skips the intro path. controller scope
   *  only — persist 안 됨, run-resume 시 fresh controller. */
  private bossIntroSeenIds: Set<string> = new Set();

  /** Cycle 109 F1 — active transient buffs from boss intro choices.
   *  cycle 종료까지만 유지 (controller instance scope). 4 cap enforced by
   *  isBossIntroEligible. Order = insertion (FIFO) — no replacement. */
  private activeBossIntroBuffs: BossIntroBuff[] = [];

  /** Cycle 109 F1 — boss intro pause guard. True between boss_intro_offered
   *  emit and resolveBossIntro() call. handleArrival no-ops while this is true
   *  so the stagger-recover path doesn't fire and Pathfinder doesn't tick past
   *  this landmark. */
  private bossIntroPending: boolean = false;

  /** Cycle 109 F1 — landmarkId captured at boss_intro_offered emit time.
   *  resolveBossIntro re-enters resolveEncounter with this id so the boss
   *  combat actually runs after the player picks a buff. */
  private bossIntroLandmarkId: string | null = null;

  /** Cycle 109 F1 — 3 cards captured at offer time. resolveBossIntro indexes
   *  into this with chosenIdx (0|1|2) to apply the selected buff. null when
   *  no intro is pending. */
  private bossIntroPendingCards: BossIntroBuff[] | null = null;

  /** Cycle 110 F1 — active transient buffs from realm fork choices.
   *  cycle 종료까지만 유지 (controller instance scope). 4 cap. Order = FIFO.
   *  PRD §F1.동작(5). */
  private activeRealmForkBuffs: RealmForkCard[] = [];

  /** Cycle 110 F1 — realm fork pause guard. True between realm_fork_offered
   *  emit and resolveRealmFork() call. handleArrival no-ops while this is true
   *  so subsequent arrivals don't process while modal is open. */
  private realmForkPending: boolean = false;

  /** Cycle 110 F1 — captured at fork-offered emit time. The deferred realm
   *  transition (this.currentRealmId = newRealm + saga + realm_entered emit)
   *  happens inside resolveRealmFork. null when no fork is pending. */
  private realmForkPendingTransition: {
    from: import('../types').RealmId;
    to: import('../types').RealmId;
  } | null = null;

  /** Cycle 110 F1 — 2 fixed cards captured at offer time. resolveRealmFork
   *  indexes into this with the choice id ('risk' | 'safe'). null when no
   *  fork is pending. */
  private realmForkPendingCards: { risk: RealmForkCard; safe: RealmForkCard } | null = null;

  /** Cycle 111 F1 — adaptive-decimated level history captured per controller
   *  arrival. Read at cycle_end by SagaRecorder.finalize() → CycleSaga.levelHistory
   *  → CycleResultV2's InflationCurveChart. NOT persisted (cycleSliceV2 has
   *  no persist middleware so memory-only by default). */
  private levelHistory: LevelHistoryBuffer = new LevelHistoryBuffer();

  /** Cycle 111 F1 — monotonic snapshot push counter (separate from buffer's
   *  internal stride counter). Becomes the LevelSnapshot.arrivalIndex value
   *  so chart x-axis reflects controller progression even after decimation
   *  drops physical samples. */
  private arrivalCounter: number = 0;

  constructor(opts: CycleControllerV2Opts) {
    this.seed = opts.seed;
    this.traits = opts.traits;
    // V3-H B2: restore from snapshot if present, otherwise create fresh hero.
    this.hero = opts.heroSnapshot
      ? HeroEntity.restore(opts.heroSnapshot)
      : HeroEntity.create({
          seed: opts.seed,
          heroHpMax: opts.heroHpMax,
          heroAtkBase: opts.heroAtkBase,
        });
    this.ai = new HeroDecisionAI(this.hero, { seed: opts.seed, traits: opts.traits });
    this.encounter = new EncounterEngine(new SeededRng(opts.seed ^ 0xdeadbeef), {
      // Cycle 108 F1: wire fate roll eligibility. EncounterEngine emits
      // fate_roll_required when this returns true AND hero would die.
      isFateRollEligible: () => !this.fateRollConsumed,
      // Cycle 109 F1: boss intro eligibility gate = "is this landmark a fresh
      // candidate for the intro flow?". seenIds membership = false (re-fight
      // path or controller re-entry). The 4-buff cap is checked separately by
      // isBossIntroCapped so the engine can still emit boss_intro_skipped
      // (saga marker) at the cap. PRD §F1.동작(3) advisor §4.
      isBossIntroEligible: (landmarkId) => !this.bossIntroSeenIds.has(landmarkId),
      isBossIntroCapped: () => this.activeBossIntroBuffs.length >= BOSS_INTRO_BUFF_CAP,
      pickBossIntroCards: (landmarkId) => this.sampleBossIntroCardsFor(landmarkId),
      getBossIntroAtkMul: () => this.getBossIntroAtkMul(),
      getBossIntroDropBonus: () => this.getBossIntroDropBonus(),
      // Cycle 110 F1: realm fork atk mul (applies to all combat, not just boss).
      getRealmForkAtkMul: () => this.getRealmForkAtkMul(),
    });
    if (opts.gambitPolicy) this.encounter.setGambitPolicy(opts.gambitPolicy);
    this.rng = new SeededRng(opts.seed ^ 0xc0ffee);
    this.saga = new SagaRecorder(this.hero.name, opts.seed);
    this.getBuffSnapshot = opts.getBuffSnapshot;
    this.onBossKill = opts.onBossKill;
  }

  setCurrentRealmId(realmId: import('../types').RealmId): void {
    this.currentRealmId = realmId;
  }

  setUnlockedRealms(realms: readonly import('../types').RealmId[]): void {
    this.unlockedRealms = realms;
  }

  /** Cycle-5 F3: pre-finalize injection point for non-'자연사' causes that the
   *  controller cannot detect on its own (e.g. '무위' = pathfinder
   *  candidates-exhausted, which the OverworldScene observes and forwards
   *  via the `cycle_ended` event payload). Only assigned when truthy; a real
   *  in-game death already set `endCause` during `handleArrival`. */
  setEndCause(cause: DeathCause): void {
    this.endCause = cause;
  }

  /** Cycle-14: clear `endCause` after a '전사' → B3 free-rejuv resurrection.
   *  Without this, the controller is stuck with endCause='전사' for the rest of
   *  the cycle: both `maybeEmitNaturalDeath` and `maybeAutoRejuvenate` early-
   *  return on the truthy gate, hero ages past 70 (B3 keeps the only rejuv
   *  alive at age 65 → 70 → 75 → ...) without ever firing 자연사. Sim driver
   *  has no B3 path so the bug is dev-server-only — exactly the cycle 11
   *  false-PASS pattern dogfooded by cycle 13's sim-real parity rule. */
  clearEndCause(): void {
    this.endCause = null;
  }

  /** Cycle-14: read-only accessor for tests. */
  getEndCause(): DeathCause | null {
    return this.endCause;
  }

  /** Cycle 108 F1: read-only accessor for tests + Runner gating. */
  isFateRollPending(): boolean { return this.fateRollPending; }
  isFateRollConsumed(): boolean { return this.fateRollConsumed; }

  /** Cycle 108 F1 — resolve the pending fate roll.
   *
   *  'accept': spend 1 crackStone, restore HP to ceil(maxHp * 0.5), clear
   *  staggered, *no* death penalty. Saga records fateRoll(outcome=accepted).
   *  Pending guard cleared so the next arrival proceeds normally.
   *
   *  'decline' (or auto-decline on 5s timeout): apply the deferred death
   *  penalty + emit hero_died('전사'). Saga records fateRoll(outcome=declined)
   *  followed by the regular death record. Returns the synthesized hero_died
   *  event so the Runner can drive the B3 free-rejuv timer just as if
   *  EncounterEngine had emitted it directly. PRD §F1.동작(4b).
   *
   *  Guard: if no fate roll is pending, returns [] (no-op). Tests double-call
   *  protection.
   *
   *  Crystal-spend guard: if 'accept' but meta.crackStones < 1, treats as
   *  decline (UI should have disabled the accept option). PRD §F1.동작(2)
   *  edge case — modal still consumes the roll. */
  resolveFateRoll(choice: 'accept' | 'decline'): OverworldEvent[] {
    if (!this.fateRollPending) return [];
    const landmarkId = this.fateRollLandmarkId;
    this.fateRollPending = false;
    this.fateRollLandmarkId = null;

    const events: OverworldEvent[] = [];

    if (choice === 'accept') {
      const meta = useGameStore.getState().meta;
      if (meta.crackStones >= 1) {
        // Spend 1 stone + heal hero to 50% HP + clear staggered.
        useGameStore.setState(s => ({
          ...s,
          meta: { ...s.meta, crackStones: s.meta.crackStones - 1 },
        }));
        this.hero.hp = Math.ceil(this.hero.hpMax * 0.5);
        this.hero.staggered = false;
        events.push({ type: 'fate_roll_resolved', outcome: 'accept' });
        this.recordToStore({
          age: this.hero.age,
          type: 'fateRoll',
          narrativeText: `${this.hero.age}세에 균열석을 소비하여 운명에 저항했다`,
          payload: { outcome: 'accepted' },
        });
        this.pushLevelSnapshot(); // cycle 111 F1: fate roll accept snapshot
        return events;
      }
      // Fall through to decline branch — UI should have disabled accept, but
      // guard defensively. Saga still records the decision moment.
    }

    // Decline path (explicit choice, timeout, or accept-without-stones).
    const { oldLevel, newLevel } = this.hero.applyDeathPenalty();
    events.push({ type: 'fate_roll_resolved', outcome: 'decline' });
    this.recordToStore({
      age: this.hero.age,
      type: 'fateRoll',
      narrativeText: `${this.hero.age}세에 운명을 받아들였다`,
      payload: { outcome: 'declined' },
    });
    // Synthesize the deferred hero_died emit + record. Mirror the death-record
    // path used inside handleArrival's for-loop so saga 와 endCause 가 동등하게
    // wire 된다.
    const heroDiedEv: OverworldEvent = {
      type: 'hero_died',
      cause: '전사',
      ...(landmarkId !== null ? { enemyId: landmarkId } : {}),
      oldLevel,
      newLevel,
    };
    events.push(heroDiedEv);
    this.endCause = '전사';
    const enemyType = landmarkId ? LANDMARK_TYPES.find(t => landmarkId.startsWith(t.id)) : null;
    this.recordToStore({
      age: this.hero.age,
      type: 'death',
      narrativeText: NarrativeGenerator.forDeath({
        age: this.hero.age,
        cause: '전사',
        enemyNameKR: enemyType?.nameKR,
        oldLevel,
        newLevel,
      }),
      payload: { oldLevel, newLevel },
    });
    this.pushLevelSnapshot(); // cycle 111 F1: fate roll decline snapshot
    return events;
  }

  /** Cycle 109 F1 — read-only accessors for tests + Runner gating. */
  isBossIntroPending(): boolean { return this.bossIntroPending; }
  getBossIntroSeenSize(): number { return this.bossIntroSeenIds.size; }
  getActiveBossIntroBuffs(): readonly BossIntroBuff[] { return this.activeBossIntroBuffs; }
  getBossIntroLandmarkId(): string | null { return this.bossIntroLandmarkId; }

  /** Cycle 109 F1 — cumulative ATK multiplier from accepted boss intro buffs.
   *  Returns 1.0 baseline + sum of every atk_mul effect. EncounterEngine boss
   *  combat reads this via the wired callback. */
  getBossIntroAtkMul(): number {
    let mul = 1.0;
    for (const b of this.activeBossIntroBuffs) {
      if (b.effect.kind === 'atk_mul') mul += b.effect.value;
    }
    return mul;
  }

  /** Cycle 109 F1 — cumulative max-HP multiplier delta. Caller applies as
   *  `hero.hpMax * mul`. Currently only consumed by accept-time hp_mul wire. */
  getBossIntroHpMul(): number {
    let mul = 1.0;
    for (const b of this.activeBossIntroBuffs) {
      if (b.effect.kind === 'hp_mul') mul += b.effect.value;
    }
    return mul;
  }

  /** Cycle 109 F1 — cumulative move_mul (passed to OverworldRunner / scene). */
  getBossIntroMoveMul(): number {
    let mul = 1.0;
    for (const b of this.activeBossIntroBuffs) {
      if (b.effect.kind === 'move_mul') mul += b.effect.value;
    }
    return mul;
  }

  /** Cycle 109 F1 — cumulative light_mul (Runner-side light accumulation). */
  getBossIntroLightMul(): number {
    let mul = 1.0;
    for (const b of this.activeBossIntroBuffs) {
      if (b.effect.kind === 'light_mul') mul += b.effect.value;
    }
    return mul;
  }

  /** Cycle 109 F1 — cumulative drop_bonus (additive). Engine adds to baseDropOdds. */
  getBossIntroDropBonus(): number {
    let bonus = 0;
    for (const b of this.activeBossIntroBuffs) {
      if (b.effect.kind === 'drop_bonus') bonus += b.effect.value;
    }
    return bonus;
  }

  /** Cycle 110 F1 — read-only accessors for tests + Runner gating. */
  isRealmForkPending(): boolean { return this.realmForkPending; }
  getActiveRealmForkBuffs(): readonly RealmForkCard[] { return this.activeRealmForkBuffs; }
  getRealmForkPendingTransition(): { from: import('../types').RealmId; to: import('../types').RealmId } | null {
    return this.realmForkPendingTransition;
  }
  getRealmForkPendingCards(): { risk: RealmForkCard; safe: RealmForkCard } | null {
    return this.realmForkPendingCards;
  }
  /** Trait-based auto-choice (sim driver + modal timeout). Deterministic.
   *  Same trait set = same choice. */
  getRealmForkAutoChoice(): RealmForkCardId {
    return computeRealmForkAutoChoice(this.traits);
  }

  /** Cycle 111 F1 — read-only accessor for the level history ring buffer.
   *  Returns the underlying samples array (immutable from caller's view).
   *  Used by SagaRecorder.finalize via the finalize() wrapper below + tests. */
  getLevelHistory(): readonly LevelSnapshot[] {
    return this.levelHistory.get();
  }

  /** Cycle 111 F1 — internal push helper. Called at every handleArrival /
   *  resolve* return path so the buffer captures the most recent hero state.
   *  Single call site per path; arrivalCounter increments monotonically. */
  private pushLevelSnapshot(): void {
    this.levelHistory.push({
      arrivalIndex: this.arrivalCounter,
      level: this.hero.level,
      age: this.hero.age,
    });
    this.arrivalCounter += 1;
  }

  /** Cycle 110 F1 — cumulative ATK multiplier from accepted realm fork buffs.
   *  Mirrors getBossIntroAtkMul but applies to *all* combat (boss + enemy),
   *  not just boss. Engine wires this via the getRealmForkAtkMul callback. */
  getRealmForkAtkMul(): number {
    let mul = 1.0;
    for (const b of this.activeRealmForkBuffs) {
      mul += b.effect.atkBonus;
    }
    return mul;
  }

  /** Cycle 110 F1 — cumulative drop-chance bonus from realm fork buffs.
   *  Additive (e.g. +0.05 = +5 percentage points). Engine sums with V3-C
   *  drop_chance buff + boss intro drop bonus. */
  getRealmForkDropBonus(): number {
    let bonus = 0;
    for (const b of this.activeRealmForkBuffs) {
      bonus += b.effect.dropChanceBonus;
    }
    return bonus;
  }

  /** Cycle 110 F1 — cumulative damping bonus (signed, -0.1/+0.1).
   *  Applied additively to base damping at encounter.setOpts time. Clamp at
   *  call site. */
  getRealmForkDampingBonus(): number {
    let bonus = 0;
    for (const b of this.activeRealmForkBuffs) {
      bonus += b.effect.dampingBonus;
    }
    return bonus;
  }

  /** Cycle 110 F1 — cumulative aging-speed multiplier (multiplicative).
   *  Applied to tickAge's agingMul. 1.0 = no effect, 1.05 = +5% faster aging. */
  getRealmForkAgingMul(): number {
    let mul = 1.0;
    for (const b of this.activeRealmForkBuffs) {
      mul *= 1 + b.effect.agingSpeedMul;
    }
    return mul;
  }

  /** Cycle 110 F1 — combined aging multiplier: base agingSpeedMul (from
   *  V3-C buff snapshot) × realm fork aging mul. tickAge consumers should
   *  call this helper instead of accessing snapshot directly. */
  private getCombinedAgingMul(): number {
    const snap = this.getBuffSnapshot?.().agingSpeedMul ?? 1.0;
    return snap * this.getRealmForkAgingMul();
  }

  /** Cycle 110 F1 — combined encounter opts (snapshot + boss intro + realm
   *  fork) for encounter.setOpts call sites. Centralizes the additive damping
   *  + drop bonus channels so the 3-call-site grep stays clean. */
  private setEncounterOptsForArrival(): void {
    if (this.getBuffSnapshot) {
      const snap = this.getBuffSnapshot();
      const dampingBonus = this.getRealmForkDampingBonus();
      // damping ∈ [0, 1.0] — clamp at sum.
      const damping = Math.max(0, Math.min(1.0, snap.damping + dampingBonus));
      const dropBonus = snap.dropChanceBonus + this.getRealmForkDropBonus();
      this.encounter.setOpts({ dropChanceBonus: dropBonus, damping });
    } else {
      // No buff snapshot — still apply realm fork standalone if any.
      const dampingBonus = this.getRealmForkDampingBonus();
      const dropBonus = this.getRealmForkDropBonus();
      this.encounter.setOpts({
        dropChanceBonus: dropBonus,
        damping: Math.max(0, Math.min(1.0, 1.0 + dampingBonus)),
      });
    }
  }

  /** Cycle 110 F1 — resolve the pending realm fork.
   *
   *  'risk' / 'safe': push the chosen card into activeRealmForkBuffs, emit
   *  realm_fork_resolved, then perform the deferred realm transition (set
   *  currentRealmId + saga record + realm_entered emit).
   *
   *  Guard: if no fork is pending, returns [] (no-op). */
  resolveRealmFork(choice: RealmForkCardId): OverworldEvent[] {
    if (!this.realmForkPending) return [];
    const transition = this.realmForkPendingTransition;
    const cards = this.realmForkPendingCards;
    this.realmForkPending = false;
    this.realmForkPendingTransition = null;
    this.realmForkPendingCards = null;
    if (transition === null || cards === null) return [];

    const events: OverworldEvent[] = [];
    const chosen = choice === 'risk' ? cards.risk : cards.safe;
    this.activeRealmForkBuffs.push(chosen);
    events.push({ type: 'realm_fork_resolved', choice });
    this.recordToStore({
      age: this.hero.age,
      type: 'realmFork',
      narrativeText: `${this.hero.age}세에 ${findRealm(transition.to).nameKR} 입구에서 '${chosen.nameKR}'을(를) 택했다`,
      payload: { choice, from: transition.from, to: transition.to },
    });

    // Deferred realm transition — mirror of handleArrival's exit-landmark
    // branch (lines 970-988 of original code, but with currentRealmId already
    // captured at offer time as transition.from).
    this.currentRealmId = transition.to;
    useGameStore.getState().recordSagaRealmTransition(transition.from, transition.to, this.hero.age, this.hero.chapter);
    this.recordToStore({
      age: this.hero.age,
      type: 'realmEnter',
      narrativeText: NarrativeGenerator.forRealmEnter(
        { age: this.hero.age, realm: transition.to },
        this.rng.int(100000),
      ),
      payload: { from: transition.from, to: transition.to },
    });
    events.push({ type: 'realm_entered', realmId: transition.to });

    // Cycle 110 F3 — mirror handleArrival's V3-E NPC tick + npc_encounter
    // block (lines 1204-1243 of original code). The fork intercept early-
    // returned before reaching the NPC tick, so without this mirror every
    // realm fork arrival would silently drop one NPC tick + the 20%
    // npc_encounter roll. (advisor §"resolveRealmFork drops NPC tick" —
    // new regression in cycle 110, not cycle 109 leftover.)
    const npcState = useGameStore.getState().run.npcs;
    for (const npc of npcState) {
      const wasAlive = npc.isAlive;
      tickNpc(npc);
      if (wasAlive && !npc.isAlive) {
        events.push({ type: 'npc_died', npcInstanceId: npc.instanceId });
        this.recordToStore({
          age: this.hero.age,
          type: 'npcDeath',
          narrativeText: NarrativeGenerator.forNpcDeath(
            { age: this.hero.age, kind: npc.kind, realm: this.currentRealmId },
            this.rng.int(100000),
          ),
          payload: { npcInstanceId: npc.instanceId, kind: npc.kind },
        });
      }
    }
    const candidates = npcState.filter(n => n.isAlive && n.zoneRealmId === this.currentRealmId);
    if (candidates.length > 0 && this.rng.chance(0.2)) {
      const picked = candidates[this.rng.int(candidates.length)];
      events.push({ type: 'npc_encounter', npcInstanceId: picked!.instanceId, npcKind: picked!.kind });
      // Cycle 264: forNpcEncounter NpcEntity['kind'] 6 union 정합 — generatorKind 변환 제거.
      this.recordToStore({
        age: this.hero.age,
        type: 'npcEncounter',
        narrativeText: NarrativeGenerator.forNpcEncounter(
          { age: this.hero.age, kind: picked!.kind, realm: this.currentRealmId },
          this.rng.int(100000),
        ),
        payload: { npcInstanceId: picked!.instanceId, kind: picked!.kind },
      });
    }

    this.pushLevelSnapshot(); // cycle 111 F1: realm-fork resolve snapshot
    return events;
  }

  /** Cycle 109 F1 — deterministic 3-card sample for this landmarkId.
   *  PRD §F1.동작(4): seed = controller.seed ^ landmarkId hash ^ 0xb0551.
   *  Called by EncounterEngine via the wired pickBossIntroCards callback. */
  private sampleBossIntroCardsFor(landmarkId: string): readonly {
    id: BossIntroBuffId; nameKR: string; descKR: string; tier: BossIntroBuff['tier'];
  }[] {
    const seed = bossIntroSampleSeed(this.seed, landmarkId);
    const cards = sampleBossIntroCards(new SeededRng(seed), 3);
    return cards.map(c => ({ id: c.id, nameKR: c.nameKR, descKR: c.descKR, tier: c.tier }));
  }

  /** Cycle 109 F1 — resolve the pending boss intro.
   *
   *  Applies the chosen card's buff to activeBossIntroBuffs, then re-enters
   *  resolveEncounter so the boss combat actually runs (PRD §F1.동작(8) opt-a).
   *  The inner resolveEncounter call sees bossIntroSeenIds.has(landmarkId)=true
   *  via the wired isBossIntroEligible callback → no infinite recursion.
   *
   *  Returns the synthesized events: boss_intro_resolved + the boss combat
   *  events (battle_started + battle_won/hero_died/fate_roll_required + drops
   *  + level_ups). Caller (OverworldRunner / sim driver) splices these into
   *  the same per-arrival event stream.
   *
   *  Guard: if no intro is pending, returns []. Crystal-spend-style defensive
   *  guard for double-resolve.
   *
   *  Side effect: also calls the post-arrival processing pipeline (NPC tick,
   *  season change, milestone detector, age tick) because the inner
   *  resolveEncounter alone wouldn't trigger those. Mirrors handleArrival's
   *  shape — for boss intro purposes, the outer arrival "completes" only
   *  after the boss is resolved. The simplest implementation: re-run a slim
   *  version of handleArrival's post-encounter steps inline.
   *
   *  PRD §F1.동작(8) — the re-entered resolveEncounter handles its own
   *  battle_started / battle_won. We just need to record battle / drop saga
   *  events and detect level milestones the same way handleArrival does. */
  resolveBossIntro(chosenIdx: 0 | 1 | 2): OverworldEvent[] {
    if (!this.bossIntroPending) return [];
    const landmarkId = this.bossIntroLandmarkId;
    const cards = this.bossIntroPendingCards;
    this.bossIntroPending = false;
    this.bossIntroLandmarkId = null;
    this.bossIntroPendingCards = null;
    if (landmarkId === null || cards === null || cards.length !== 3) return [];

    const events: OverworldEvent[] = [];
    const chosen = cards[chosenIdx]!;
    this.activeBossIntroBuffs.push(chosen);
    // hp_mul takes effect at choice time — bump hero.hpMax + heal proportionally
    // so the next combat (which we are about to run) actually feels the +HP.
    if (chosen.effect.kind === 'hp_mul') {
      const oldHpMax = this.hero.hpMax;
      const newHpMax = Math.ceil(oldHpMax * (1 + chosen.effect.value));
      const heal = newHpMax - oldHpMax;
      this.hero.hpMax = newHpMax;
      this.hero.hp = Math.min(newHpMax, this.hero.hp + heal);
    }
    events.push({ type: 'boss_intro_resolved', chosenIdx, chosenId: chosen.id });
    this.recordToStore({
      age: this.hero.age,
      type: 'bossIntro',
      narrativeText: `${this.hero.age}세에 보스 앞에서 '${chosen.nameKR}'을(를) 선택했다`,
      payload: { chosenIdx, chosenId: chosen.id, tier: chosen.tier },
    });

    // Mark seen *before* re-entering resolveEncounter so the inner call's
    // isBossIntroEligible(landmarkId) returns false (advisor §2 / §3 — clean
    // re-entry guard, no recursion risk).
    this.bossIntroSeenIds.add(landmarkId);

    // Re-enter the encounter pipeline for the actual boss combat. Use the
    // controller's per-arrival post-processing by funneling through a
    // slim inline mirror of handleArrival's boss path. Easier (and safer for
    // sim parity) than calling handleArrival recursively, which would re-tick
    // age + run NPC tick a second time. Instead: run resolveEncounter only,
    // then capture bossKills + level milestones + saga records exactly like
    // handleArrival does for the boss branch.
    this.setEncounterOptsForArrival();
    const combatEvents = this.encounter.resolveEncounter(this.hero, 'boss', landmarkId);

    // Mirror handleArrival's per-event handling — bossKills tick, saga
    // record for battle/drop/level_up/skill_learned/hero_died — so the
    // boss-after-intro path is observable identically to a direct boss kill.
    let levelFrom = -1;
    let levelTo = -1;
    let levelCount = 0;
    for (const ev of combatEvents) {
      if (ev.type === 'battle_won') {
        this.bossKills += 1;
        if (this.onBossKill && this.currentRealmId) {
          const unlocked = this.onBossKill(this.currentRealmId);
          if (unlocked) {
            this.unlockedRealms = [...this.unlockedRealms, unlocked];
            combatEvents.push({ type: 'realm_unlocked', realmId: unlocked });
          }
        }
        const enemyType = LANDMARK_TYPES.find(t => landmarkId.startsWith(t.id)) ?? null;
        const enemyNameKR = enemyType?.nameKR ?? '보스';
        this.recordToStore({
          age: this.hero.age,
          type: 'battle',
          narrativeText: NarrativeGenerator.forBattle({ age: this.hero.age, enemyNameKR, realm: this.currentRealmId }, this.rng.int(100000)),
          payload: { enemyId: landmarkId, expGain: ev.expGain },
        });
        if (ev.dropId) {
          this.drops += 1;
          const dropItem = lookupDrop(ev.dropId);
          const itemNameKR = dropItem?.nameKR ?? ev.dropId;
          this.recordToStore({
            age: this.hero.age,
            type: 'drop',
            narrativeText: NarrativeGenerator.forDrop({ age: this.hero.age, itemNameKR, realm: this.currentRealmId }, this.rng.int(100000)),
            payload: { itemId: ev.dropId },
          });
        }
      }
      if (ev.type === 'level_up') {
        if (levelCount === 0) levelFrom = ev.from;
        levelTo = ev.to;
        levelCount += 1;
      }
      if (ev.type === 'skill_learned') {
        this.recordToStore({
          age: this.hero.age,
          type: 'skillLearned',
          narrativeText: NarrativeGenerator.forSkillLearned({ age: this.hero.age, skillNameKR: ev.skillNameKR, realm: this.currentRealmId }, this.rng.int(100000)),
          payload: { skillId: ev.skillId, atkBefore: ev.atkBefore, atkAfter: ev.atkAfter },
        });
      }
      if (ev.type === 'fate_roll_required') {
        // Boss intro → death → fate roll. Pipe through the normal fate roll
        // pending state so OverworldRunner's existing modal handler picks it up.
        this.fateRollConsumed = true;
        this.fateRollPending = true;
        this.fateRollLandmarkId = ev.enemyId;
      }
      if (ev.type === 'hero_died') {
        this.endCause = ev.cause;
        const enemyType = ev.enemyId ? LANDMARK_TYPES.find(t => ev.enemyId!.startsWith(t.id)) : null;
        this.recordToStore({
          age: this.hero.age,
          type: 'death',
          narrativeText: NarrativeGenerator.forDeath({
            age: this.hero.age,
            cause: ev.cause,
            enemyNameKR: enemyType?.nameKR,
            oldLevel: ev.oldLevel,
            newLevel: ev.newLevel,
          }),
          payload: { oldLevel: ev.oldLevel, newLevel: ev.newLevel },
        });
      }
    }
    if (levelCount > 0) {
      this.recordToStore({
        age: this.hero.age,
        type: 'levelUp',
        narrativeText: NarrativeGenerator.forLevelUpBatch({
          age: this.hero.age, fromLevel: levelFrom, toLevel: levelTo, count: levelCount, realm: this.currentRealmId,
        }, this.rng.int(100000)),
        payload: { from: levelFrom, to: levelTo, count: levelCount },
      });
      // Cycle 106 F1: milestone crossing detector on boss-intro combat too.
      const crossings = tiersCrossed(levelFrom, levelTo);
      for (const tier of crossings) {
        if (this.milestoneLedger.has(tier)) continue;
        this.milestoneLedger.add(tier);
        const preset = presetForTier(tier);
        combatEvents.push({
          type: 'inflation_milestone',
          tier,
          thresholdLv: preset.thresholdLv,
          fromLv: levelFrom,
          toLv: levelTo,
          atAge: this.hero.age,
        });
        this.recordToStore({
          age: this.hero.age,
          type: 'milestone',
          narrativeText: `${this.hero.age}세에 레벨 ${preset.thresholdLv.toLocaleString('en-US')} 돌파`,
          payload: { tier, thresholdLv: preset.thresholdLv, fromLv: levelFrom, toLv: levelTo },
        });
      }
    }

    // Cycle 109 F1 — mirror handleArrival's post-encounter processing for the
    // boss-after-intro arrival (advisor §A): the outer handleArrival exited
    // early on boss_intro_offered, so age tick / NPC tick / season check /
    // auto-rejuv / natural-death / chapter / job-unlock for *this* arrival
    // would otherwise silently disappear. Skip the job-unlock + chapter
    // emission when hero died in combat (parity with handleArrival's
    // staggered guard).
    const beforeChapter = this.hero.chapter;
    if (!this.hero.staggered) {
      const jobs = this.hero.maybeUnlockJobForAge(this.hero.age);
      for (const j of jobs) {
        const jobEv = { type: 'job_unlocked' as const, jobId: j.jobId, jobNameKR: j.jobNameKR, tier: j.tier };
        combatEvents.push(jobEv);
        this.recordToStore({
          age: this.hero.age,
          type: 'jobUnlock',
          narrativeText: NarrativeGenerator.forJobUnlock({ age: this.hero.age, jobNameKR: j.jobNameKR, tier: j.tier, realm: this.currentRealmId }, this.rng.int(100000)),
          payload: { jobId: j.jobId, tier: j.tier },
        });
      }
    }
    const agingMul = this.getCombinedAgingMul();
    this.hero.tickAge(agingMul);
    if (this.hero.chapter !== beforeChapter) {
      combatEvents.push({
        type: 'chapter_transition',
        fromChapter: beforeChapter,
        toChapter: this.hero.chapter,
        atAge: this.hero.age,
      });
    }

    // V3-H F6: season transition check (same shape as handleArrival).
    const newSeason = seasonForAge(this.hero.age);
    const currentMeta = useGameStore.getState().meta;
    if (newSeason !== currentMeta.season.current) {
      useGameStore.setState(s => ({
        ...s,
        meta: { ...s.meta, season: { current: newSeason, startedAtAge: Math.floor(this.hero.age) } },
      }));
      this.recordToStore({
        age: this.hero.age,
        type: 'seasonChange',
        narrativeText: NarrativeGenerator.forSeasonChange(
          { age: this.hero.age, season: newSeason, realm: this.currentRealmId ?? 'base' },
          this.rng.int(100000),
        ),
        payload: { season: newSeason },
      });
      combatEvents.push({ type: 'season_changed', season: newSeason });
    }

    // Cycle 118 — mirror handleArrival's V3-E NPC tick + npc_encounter block
    // (cycle 109 boss intro carry-over, finally회수 after cycle 110 의
    // resolveRealmFork 동일 fix). 보스 인트로 후속 arrival 의 NPC tick
    // 누락 회귀 봉인.
    const npcState118 = useGameStore.getState().run.npcs;
    for (const npc of npcState118) {
      const wasAlive = npc.isAlive;
      tickNpc(npc);
      if (wasAlive && !npc.isAlive) {
        combatEvents.push({ type: 'npc_died', npcInstanceId: npc.instanceId });
        this.recordToStore({
          age: this.hero.age,
          type: 'npcDeath',
          narrativeText: NarrativeGenerator.forNpcDeath(
            { age: this.hero.age, kind: npc.kind, realm: this.currentRealmId },
            this.rng.int(100000),
          ),
          payload: { npcInstanceId: npc.instanceId, kind: npc.kind },
        });
      }
    }
    const candidates118 = npcState118.filter(n => n.isAlive && n.zoneRealmId === this.currentRealmId);
    if (candidates118.length > 0 && this.rng.chance(0.2)) {
      const picked = candidates118[this.rng.int(candidates118.length)];
      combatEvents.push({ type: 'npc_encounter', npcInstanceId: picked!.instanceId, npcKind: picked!.kind });
      // Cycle 264: forNpcEncounter NpcEntity['kind'] 6 union 정합.
      this.recordToStore({
        age: this.hero.age,
        type: 'npcEncounter',
        narrativeText: NarrativeGenerator.forNpcEncounter(
          { age: this.hero.age, kind: picked!.kind, realm: this.currentRealmId },
          this.rng.int(100000),
        ),
        payload: { npcInstanceId: picked!.instanceId, kind: picked!.kind },
      });
    }

    // Cycle-11 C10-B auto-rejuv + C10-A natural death — same order as handleArrival.
    this.maybeAutoRejuvenate();
    this.maybeEmitNaturalDeath(combatEvents);

    events.push(...combatEvents);
    this.pushLevelSnapshot(); // cycle 111 F1: boss-intro resolve snapshot
    return events;
  }

  getUnlockedRealms(): readonly import('../types').RealmId[] { return this.unlockedRealms; }
  getCurrentRealmId(): import('../types').RealmId | null { return this.currentRealmId; }
  getHero(): HeroEntity { return this.hero; }
  getDecisionAI(): HeroDecisionAI { return this.ai; }
  getSeed(): number { return this.seed; }
  getStats(): { kills: number; bossKills: number; drops: number } {
    return { kills: this.kills, bossKills: this.bossKills, drops: this.drops };
  }
  // C833: RunStatistics relay
  getRunStatistics() { return this.encounter.getRunStatistics(); }
  // C572: relay relic/prestige state for UI
  getRelics() { return this.encounter.getRelics(); }
  getImprintedRelic() { return this.encounter.getImprintedRelic(); }
  getPrestigeCount() { return this.encounter.getPrestigeCount(); }
  getAtkBreakdownInput() { return this.encounter.getAtkBreakdownInput(); }
  getCombatSummary() { return this.encounter.getCombatSummary(); }
  hasPendingShrineChoice() { return this.encounter.hasPendingShrineChoice(); }
  setShrineChoice(choice: 0 | 1 | 2) { this.encounter.setShrineChoice(choice); }
  getTotalDeaths() { return this.encounter.getTotalDeaths(); }
  getTotalFights() { return this.encounter.getTotalFights(); }
  // C801: Generic event accessors — all per-event methods delegate here
  private resolveEventGeneric(id: import('./encounter/EventOrchestrator').EventId, accept: boolean) {
    this.encounter.resolveEvent(id, accept);
    this.recordEventChoice(id, accept);
  }
  getEventRemaining(id: import('./encounter/EventOrchestrator').EventId) { return this.encounter.getEventRemaining(id); }
  getEventPending(id: import('./encounter/EventOrchestrator').EventId) { return this.encounter.getEventPending(id); }
  resolveEvent(id: import('./encounter/EventOrchestrator').EventId, accept: boolean) { this.resolveEventGeneric(id, accept); }

  // Legacy per-event accessors (kept for existing callers)
  getTrialGroundsRemaining() { return this.encounter.getEventRemaining('trial_grounds'); }
  getTrialGroundsPending() { return this.encounter.getEventPending('trial_grounds'); }
  resolveTrialGrounds(accept: boolean) { this.resolveEventGeneric('trial_grounds', accept); }
  getColosseumRemaining() { return this.encounter.getEventRemaining('colosseum'); }
  getColosseumPending() { return this.encounter.getEventPending('colosseum'); }
  resolveColosseum(accept: boolean) { this.resolveEventGeneric('colosseum', accept); }
  getStormNexusRemaining() { return this.encounter.getEventRemaining('storm_nexus'); }
  getStormNexusPending() { return this.encounter.getEventPending('storm_nexus'); }
  resolveStormNexus(accept: boolean) { this.resolveEventGeneric('storm_nexus', accept); }
  getRainSanctuaryRemaining() { return this.encounter.getEventRemaining('rain_sanctuary'); }
  getRainSanctuaryPending() { return this.encounter.getEventPending('rain_sanctuary'); }
  resolveRainSanctuary(accept: boolean) { this.resolveEventGeneric('rain_sanctuary', accept); }
  getFogAmbushRemaining() { return this.encounter.getEventRemaining('fog_ambush'); }
  getFogAmbushPending() { return this.encounter.getEventPending('fog_ambush'); }
  resolveFogAmbush(accept: boolean) { this.resolveEventGeneric('fog_ambush', accept); }
  getWindGaleRemaining() { return this.encounter.getEventRemaining('wind_gale'); }
  getWindGalePending() { return this.encounter.getEventPending('wind_gale'); }
  resolveWindGale(accept: boolean) { this.resolveEventGeneric('wind_gale', accept); }
  getSnowDriftRemaining() { return this.encounter.getEventRemaining('snow_drift'); }
  getSnowDriftPending() { return this.encounter.getEventPending('snow_drift'); }
  resolveSnowDrift(accept: boolean) { this.resolveEventGeneric('snow_drift', accept); }
  getVoidRiftRemaining() { return this.encounter.getEventRemaining('void_rift'); }
  getVoidRiftPending() { return this.encounter.getEventPending('void_rift'); }
  resolveVoidRift(accept: boolean) { this.resolveEventGeneric('void_rift', accept); }
  hasPendingDangerChoice() { return this.encounter.hasPendingDangerChoice(); }
  setDangerChoice(retreat: boolean) { this.encounter.setDangerChoice(retreat); }
  // C875: Proving Grounds player choice
  setProvingChoice(accept: boolean) { this.encounter.setProvingChoice(accept); }
  // C878: Mercenary Offer player choice
  setMercenaryChoice(accept: boolean) { this.encounter.setMercenaryChoice(accept); }
  // C878: Crossroads path player choice
  setCrossroadsChoice(path: 'atk' | 'exp' | 'gold') { this.encounter.setCrossroadsChoice(path); }
  getAbyssalConvergenceRemaining() { return this.encounter.getEventRemaining('abyssal_convergence'); }
  getAbyssalConvergencePending() { return this.encounter.getEventPending('abyssal_convergence'); }
  resolveAbyssalConvergence(accept: boolean) { this.resolveEventGeneric('abyssal_convergence', accept); }
  getTemporalFissureRemaining() { return this.encounter.getEventRemaining('temporal_fissure'); }
  getTemporalFissurePending() { return this.encounter.getEventPending('temporal_fissure'); }
  resolveTemporalFissure(accept: boolean) { this.resolveEventGeneric('temporal_fissure', accept); }
  getTitanArenaRemaining() { return this.encounter.getEventRemaining('titan_arena'); }
  getTitanArenaPending() { return this.encounter.getEventPending('titan_arena'); }
  resolveTitanArena(accept: boolean) { this.resolveEventGeneric('titan_arena', accept); }
  getGoldCrucibleRemaining() { return this.encounter.getEventRemaining('gold_crucible'); }
  getGoldCruciblePending() { return this.encounter.getEventPending('gold_crucible'); }
  resolveGoldCrucible(accept: boolean) { this.resolveEventGeneric('gold_crucible', accept); }
  getAstralParadoxRemaining() { return this.encounter.getEventRemaining('astral_paradox'); }
  getAstralParadoxPending() { return this.encounter.getEventPending('astral_paradox'); }
  resolveAstralParadox(accept: boolean) { this.resolveEventGeneric('astral_paradox', accept); }
  getEventMomentumAtkRemaining() { return this.encounter.getEventMomentumAtkRemaining(); }
  getEventMomentumDensityRemaining() { return this.encounter.getEventMomentumDensityRemaining(); }
  // C798: Aggregate accessor
  getActiveEventState() { return this.encounter.getActiveEventState(); }

  /** Most recent saga events (already batched + narrative-formatted) for the
   *  live OverworldRunner log overlay. */
  getRecentSagaEvents(limit: number): readonly import('../saga/SagaTypes').SagaEvent[] {
    const all = this.saga.getEvents();
    return all.slice(Math.max(0, all.length - limit));
  }

  handleArrival(kind: LandmarkKind, landmarkId: string): OverworldEvent[] {
    // Cycle 108 F1: while fate roll modal is open, freeze all arrival
    // processing. Prevents stagger-recover early-return (line 135-152) from
    // auto-resurrecting the hero (hp full, staggered=false) before the player
    // can choose accept/decline. Same class of stuck-state risk as cycle 14's
    // endCause='전사' regression — that one stuck the controller in the gate
    // direction; this one would silently bypass the modal entirely.
    if (this.fateRollPending) return [];
    // Cycle 109 F1: same guard for boss intro pending. Modal open → no further
    // arrivals processed until resolveBossIntro is invoked.
    if (this.bossIntroPending) return [];
    // Cycle 110 F1: same guard for realm fork pending. Modal open → no further
    // arrivals processed until resolveRealmFork is invoked.
    if (this.realmForkPending) return [];

    // V3-B: staggered hero recovers (hp full, staggered=false) without
    // processing the encounter content. This arrival "costs" the actionCount
    // tick — recovery itself is the cost.
    if (this.hero.staggered) {
      const beforeChapter = this.hero.chapter;
      this.hero.recoverFromStagger();
      const agingMul = this.getCombinedAgingMul();
      this.hero.tickAge(agingMul);
      const events: OverworldEvent[] = [];
      if (this.hero.chapter !== beforeChapter) {
        events.push({
          type: 'chapter_transition',
          fromChapter: beforeChapter,
          toChapter: this.hero.chapter,
          atAge: this.hero.age,
        });
      }
      this.maybeAutoRejuvenate();
      this.maybeEmitNaturalDeath(events);
      this.pushLevelSnapshot(); // cycle 111 F1: staggered recovery snapshot
      return events;
    }
    const beforeChapter = this.hero.chapter;

    // V3-H F5: trial 은 controller 에서 직접 처리 (fieldLevel / damping 필요)
    if (kind === 'trial') {
      // Cycle 106 F1: capture pre-trial level so direct hero.level mutations
      // (resolveTrialEncounter writes hero.level += 3 / *= 0.85) still feed
      // the crossing detector. Trial is the only V3 path where hero level
      // changes outside the level_up event channel.
      const preTrialLevel = this.hero.level;
      const trialEvents = this.resolveTrialEncounter(landmarkId);
      // Apply milestone detector on the trial-win delta. resolveTrialEncounter
      // already returns the `trial_resolved` event with outcome; we don't
      // synthesize a level_up event (trial isn't xp-based), but the milestone
      // crossing rule still applies — fromLv < threshold ≤ toLv.
      const trialCrossings = tiersCrossed(preTrialLevel, this.hero.level);
      for (const tier of trialCrossings) {
        if (this.milestoneLedger.has(tier)) continue;
        this.milestoneLedger.add(tier);
        const preset = presetForTier(tier);
        trialEvents.push({
          type: 'inflation_milestone',
          tier,
          thresholdLv: preset.thresholdLv,
          fromLv: preTrialLevel,
          toLv: this.hero.level,
          atAge: this.hero.age,
        });
        this.recordToStore({
          age: this.hero.age,
          type: 'milestone',
          narrativeText: `${this.hero.age}세에 레벨 ${preset.thresholdLv.toLocaleString('en-US')} 돌파`,
          payload: { tier, thresholdLv: preset.thresholdLv, fromLv: preTrialLevel, toLv: this.hero.level },
        });
      }
      const agingMulTrial = this.getCombinedAgingMul();
      this.hero.tickAge(agingMulTrial);
      if (this.hero.chapter !== beforeChapter) {
        trialEvents.push({
          type: 'chapter_transition',
          fromChapter: beforeChapter,
          toChapter: this.hero.chapter,
          atAge: this.hero.age,
        });
      }
      this.maybeAutoRejuvenate();
      this.maybeEmitNaturalDeath(trialEvents);
      this.pushLevelSnapshot(); // cycle 111 F1: trial-branch snapshot
      return trialEvents;
    }

    this.setEncounterOptsForArrival();
    const events = this.encounter.resolveEncounter(this.hero, kind, landmarkId);

    // Cycle 108 F1: fate roll required → controller pauses. No NPC tick, no
    // season transition, no age tick beyond the encounter's own internal
    // mutations. The fate roll outcome path (resolveFateRoll) re-enters the
    // arrival pipeline. We still need to capture the event into our flags
    // before returning, mirror the early-return shape used by stagger-recover.
    const fateEvIdx = events.findIndex(e => e.type === 'fate_roll_required');
    if (fateEvIdx >= 0) {
      const fateEv = events[fateEvIdx]!;
      if (fateEv.type === 'fate_roll_required') {
        this.fateRollConsumed = true;
        this.fateRollPending = true;
        this.fateRollLandmarkId = fateEv.enemyId;
      }
      return events;
    }

    // Cycle 109 F1: boss intro offered → controller pauses. Same shape as the
    // fate roll guard above — capture the cards + landmarkId so resolveBossIntro
    // can re-enter the encounter. Skip the normal post-arrival processing.
    const introIdx = events.findIndex(e => e.type === 'boss_intro_offered');
    if (introIdx >= 0) {
      const introEv = events[introIdx]!;
      if (introEv.type === 'boss_intro_offered') {
        this.bossIntroPending = true;
        this.bossIntroLandmarkId = introEv.landmarkId;
        // Resolve catalog entries from the lightweight payload card list.
        this.bossIntroPendingCards = introEv.cards.map(c => findBossIntroBuff(c.id));
      }
      return events;
    }

    // Cycle 109 F1: boss intro skipped (cap reached) → record saga marker but
    // continue with the regular boss combat events that follow inline.
    const skipIdx = events.findIndex(e => e.type === 'boss_intro_skipped');
    if (skipIdx >= 0) {
      const skipEv = events[skipIdx]!;
      if (skipEv.type === 'boss_intro_skipped') {
        // Mark seen so the next encounter on this landmark doesn't re-trigger.
        // (In practice landmark.consumed already guards re-encounter, but the
        // sentinel keeps controller state consistent for tests.)
        this.bossIntroSeenIds.add(skipEv.landmarkId);
        this.recordToStore({
          age: this.hero.age,
          type: 'bossIntro',
          narrativeText: `${this.hero.age}세에 보스 앞에서 빛이 꺾였다 — 너무 많은 가호가 깃들어 있었다`,
          payload: { reason: 'cap_reached', landmarkId: skipEv.landmarkId },
        });
      }
      // fall through to the rest of handleArrival processing — the boss combat
      // events are already in `events` after the skip marker.
    }

    // Collect level_ups for end-of-arrival batched record.
    let levelFrom = -1;
    let levelTo = -1;
    let levelCount = 0;

    for (const ev of events) {
      if (ev.type === 'battle_won') {
        if (kind === 'boss') {
          this.bossKills += 1;
          // V3-D realm unlock — controller 는 pure 유지, callback 으로 처리
          if (this.onBossKill && this.currentRealmId) {
            const unlocked = this.onBossKill(this.currentRealmId);
            if (unlocked) {
              // T13: keep local unlockedRealms in sync so exit filter is
              // immediately correct in the same cycle.
              this.unlockedRealms = [...this.unlockedRealms, unlocked];
              events.push({ type: 'realm_unlocked', realmId: unlocked });
            }
          }
        } else {
          this.kills += 1;
        }
        const enemyType = LANDMARK_TYPES.find(t => landmarkId.startsWith(t.id)) ?? null;
        const enemyNameKR = enemyType?.nameKR ?? '적';
        this.recordToStore({
          age: this.hero.age,
          type: 'battle',
          narrativeText: NarrativeGenerator.forBattle({ age: this.hero.age, enemyNameKR, realm: this.currentRealmId }, this.rng.int(100000)),
          payload: { enemyId: landmarkId, expGain: ev.expGain },
        });
        if (ev.dropId) {
          this.drops += 1;
          const dropItem = lookupDrop(ev.dropId);
          const itemNameKR = dropItem?.nameKR ?? ev.dropId;
          this.recordToStore({
            age: this.hero.age,
            type: 'drop',
            narrativeText: NarrativeGenerator.forDrop({ age: this.hero.age, itemNameKR, realm: this.currentRealmId }, this.rng.int(100000)),
            payload: { itemId: ev.dropId },
          });
        }
      }
      if (ev.type === 'level_up') {
        if (levelCount === 0) levelFrom = ev.from;
        levelTo = ev.to;
        levelCount += 1;
      }
      // job_unlocked events come only from the post-arrival maybeUnlockJobForAge
      // hook below — never from resolveEncounter — so no branch here.
      if (ev.type === 'skill_learned') {
        this.recordToStore({
          age: this.hero.age,
          type: 'skillLearned',
          narrativeText: NarrativeGenerator.forSkillLearned({ age: this.hero.age, skillNameKR: ev.skillNameKR, realm: this.currentRealmId }, this.rng.int(100000)),
          payload: { skillId: ev.skillId, atkBefore: ev.atkBefore, atkAfter: ev.atkAfter },
        });
      }
      if (ev.type === 'shrine_visited') {
        this.recordToStore({
          age: this.hero.age,
          type: 'shrine',
          narrativeText: NarrativeGenerator.forShrine({ age: this.hero.age, healed: ev.healed, realm: this.currentRealmId }, this.rng.int(100000)),
          payload: { landmarkId: ev.landmarkId },
        });
      }
      if (ev.type === 'meditation_done') {
        // V3-H F4: shrine 20% 변형 — pious +3 (이미 EncounterEngine 에서 조정됨), saga 기록
        this.recordToStore({
          age: this.hero.age,
          type: 'meditation',
          narrativeText: `${this.hero.age}세에 사당에서 깊은 명상에 잠겼다 — 신앙이 깊어졌다`,
          payload: { landmarkId: ev.landmarkId },
        });
      }
      if (ev.type === 'sightseeing_arrived') {
        // V3-H F3: 절경 랜드마크 — personality dim +1 (랜덤)
        const DIMS = ['heroic', 'pious', 'merciful'] as const;
        const dim = DIMS[this.rng.int(DIMS.length)]!;
        this.hero.personality.adjust(dim, 1);
        this.recordToStore({
          age: this.hero.age,
          type: 'sightseeing',
          narrativeText: `${ev.landmarkNameKR}에서 잠시 멈춰섰다`,
          payload: { dim, landmarkId: ev.landmarkId },
        });
      }
      if (ev.type === 'moral_choice') {
        this.recordToStore({
          age: this.hero.age,
          type: 'moralChoice',
          narrativeText: NarrativeGenerator.forMoralChoice({ age: this.hero.age, choiceNameKR: ev.nameKR, realm: this.currentRealmId }, this.rng.int(100000)),
          payload: { choice: ev.choice, dim: ev.dim, delta: ev.delta },
        });
      }
      if (ev.type === 'hero_died') {
        this.endCause = ev.cause;
        const enemyType = ev.enemyId ? LANDMARK_TYPES.find(t => ev.enemyId!.startsWith(t.id)) : null;
        this.recordToStore({
          age: this.hero.age,
          type: 'death',
          narrativeText: NarrativeGenerator.forDeath({
            age: this.hero.age,
            cause: ev.cause,
            enemyNameKR: enemyType?.nameKR,
            oldLevel: ev.oldLevel,
            newLevel: ev.newLevel,
          }),
          payload: { oldLevel: ev.oldLevel, newLevel: ev.newLevel },
        });
      }
    }

    // Flush the collected level_ups as one saga record. Avoids 수십 줄 spam
    // from late-game `expGain ∝ lv^1.8` (kill 당 70+ level-ups).
    if (levelCount > 0) {
      this.recordToStore({
        age: this.hero.age,
        type: 'levelUp',
        narrativeText: NarrativeGenerator.forLevelUpBatch({
          age: this.hero.age, fromLevel: levelFrom, toLevel: levelTo, count: levelCount, realm: this.currentRealmId,
        }, this.rng.int(100000)),
        payload: { from: levelFrom, to: levelTo, count: levelCount },
      });

      // Cycle 106 F1: 8-tier inflation milestone crossing detector.
      // levelFrom→levelTo 사이의 모든 ×10 경계 crossing 을 ascending 으로 emit.
      // ledger 가 이미 emit 한 tier 차단 (cycle 단위 in-memory). saga 도 같이 기록.
      const crossings = tiersCrossed(levelFrom, levelTo);
      for (const tier of crossings) {
        if (this.milestoneLedger.has(tier)) continue;
        this.milestoneLedger.add(tier);
        const preset = presetForTier(tier);
        events.push({
          type: 'inflation_milestone',
          tier,
          thresholdLv: preset.thresholdLv,
          fromLv: levelFrom,
          toLv: levelTo,
          atAge: this.hero.age,
        });
        this.recordToStore({
          age: this.hero.age,
          type: 'milestone',
          narrativeText: `${this.hero.age}세에 레벨 ${preset.thresholdLv.toLocaleString('en-US')} 돌파`,
          payload: { tier, thresholdLv: preset.thresholdLv, fromLv: levelFrom, toLv: levelTo },
        });
      }
    }

    // After resolving the encounter, check for job-unlock milestones.
    // Skip if the encounter staggered the hero (they'll recover next arrival).
    if (!this.hero.staggered) {
      const jobs = this.hero.maybeUnlockJobForAge(this.hero.age);
      for (const j of jobs) {
        const jobEv = { type: 'job_unlocked' as const, jobId: j.jobId, jobNameKR: j.jobNameKR, tier: j.tier };
        events.push(jobEv);
        this.recordToStore({
          age: this.hero.age,
          type: 'jobUnlock',
          narrativeText: NarrativeGenerator.forJobUnlock({ age: this.hero.age, jobNameKR: j.jobNameKR, tier: j.tier, realm: this.currentRealmId }, this.rng.int(100000)),
          payload: { jobId: j.jobId, tier: j.tier },
        });
      }
    }
    const agingMul = this.getCombinedAgingMul();
    this.hero.tickAge(agingMul);
    if (this.hero.chapter !== beforeChapter) {
      events.push({
        type: 'chapter_transition',
        fromChapter: beforeChapter,
        toChapter: this.hero.chapter,
        atAge: this.hero.age,
      });

      // V3-E: chapter milestone NPC spawn
      const newChapter = this.hero.chapter;
      const seed = this.seed ^ Math.floor(this.kills * 7919);
      const state = useGameStore.getState();

      // 어린시절 시작 시 부모 spawn (이미 있으면 skip)
      if (newChapter === '어린시절' && !state.run.npcs.some(n => n.kind === 'family_parent')) {
        const parent = spawnNpc('family_parent', { realmId: this.currentRealmId ?? 'base', seed });
        if (parent) {
          state.addNpc(parent);
        }
      }

      // 청년기 라이벌 spawn (60%)
      if (newChapter === '청년기' && !state.run.npcs.some(n => n.kind === 'rival') && this.rng.chance(0.6)) {
        const rival = spawnNpc('rival', { realmId: this.currentRealmId ?? 'base', seed: seed + 1 });
        if (rival) state.addNpc(rival);
      }

      // 청년기 멘토 spawn (30%)
      if (newChapter === '청년기' && !state.run.npcs.some(n => n.kind === 'mentor') && this.rng.chance(0.3)) {
        const mentor = spawnNpc('mentor', { realmId: this.currentRealmId ?? 'base', seed: seed + 2 });
        if (mentor) state.addNpc(mentor);
      }

      // 장년기 결혼 + 자식 (50%)
      if (newChapter === '장년기' && !state.run.npcs.some(n => n.kind === 'family_spouse') && this.rng.chance(0.5)) {
        const spouse = spawnNpc('family_spouse', { realmId: this.currentRealmId ?? 'base', seed: seed + 3 });
        if (spouse) {
          state.addNpc(spouse);
          events.push({ type: 'family_event', eventKind: 'marriage', npcInstanceId: spouse.instanceId });
          // Cycle-1 F3: dead path 회수 — family marriage 를 saga 에 기록.
          this.recordToStore({
            age: this.hero.age,
            type: 'familyEvent',
            narrativeText: NarrativeGenerator.forFamilyEvent(
              { age: this.hero.age, type: 'marriage', realm: this.currentRealmId },
              this.rng.int(100000),
            ),
            payload: { eventKind: 'marriage', npcInstanceId: spouse.instanceId },
          });
        }
        const child = spawnNpc('family_child', { realmId: this.currentRealmId ?? 'base', seed: seed + 4 });
        if (child) {
          state.addNpc(child);
          events.push({ type: 'family_event', eventKind: 'child_birth', npcInstanceId: child.instanceId });
          // Cycle-1 F3: dead path 회수 — child_birth (event union) → child_born (generator) 매핑.
          this.recordToStore({
            age: this.hero.age,
            type: 'familyEvent',
            narrativeText: NarrativeGenerator.forFamilyEvent(
              { age: this.hero.age, type: 'child_born', realm: this.currentRealmId },
              this.rng.int(100000),
            ),
            payload: { eventKind: 'child_birth', npcInstanceId: child.instanceId },
          });
        }
      }
    }

    // V3-D: hero 가 exit landmark 도착 시 realm 전환
    if (kind === 'exit' && this.currentRealmId) {
      const realm = findRealm(this.currentRealmId);
      if (realm.nextRealm && this.unlockedRealms.includes(realm.nextRealm)) {
        const newRealm = realm.nextRealm;
        const oldRealm = this.currentRealmId;

        // Cycle 110 F1: realm fork intercept. If active buffs cap (4) reached
        // → emit realm_fork_skipped + saga marker + proceed with normal
        // transition. Otherwise → emit realm_fork_offered + pause arrival
        // pipeline. resolveRealmFork performs the deferred transition.
        if (this.activeRealmForkBuffs.length >= REALM_FORK_BUFF_CAP) {
          events.push({
            type: 'realm_fork_skipped',
            oldRealm,
            newRealm,
            reason: 'cap_reached',
          });
          this.recordToStore({
            age: this.hero.age,
            type: 'realmFork',
            narrativeText: `${this.hero.age}세, ${findRealm(newRealm).nameKR} 입구의 갈래길이 닫혀 있었다`,
            payload: { reason: 'cap_reached', from: oldRealm, to: newRealm },
          });
          // Fall through to normal transition below.
        } else {
          // Offer the fork — capture state + pause. resolveRealmFork performs
          // the actual transition.
          const pair = { risk: REALM_FORK_CATALOG.risk, safe: REALM_FORK_CATALOG.safe };
          const autoChoice = computeRealmForkAutoChoice(this.traits);
          this.realmForkPending = true;
          this.realmForkPendingTransition = { from: oldRealm, to: newRealm };
          this.realmForkPendingCards = pair;
          events.push({
            type: 'realm_fork_offered',
            oldRealm,
            newRealm,
            riskCard: pair.risk,
            safeCard: pair.safe,
            autoChoice,
          });
          // Return early — skip the rest of post-arrival processing. The
          // deferred transition + realm_entered + post-arrival mirror happen
          // inside resolveRealmFork (cycle 110 F3 helper).
          return events;
        }

        // Normal transition path (cap reached → skip-then-transition).
        this.currentRealmId = newRealm;
        useGameStore.getState().recordSagaRealmTransition(oldRealm, newRealm, this.hero.age, this.hero.chapter);
        // Cycle-1 F2: realm 진입 saga 이벤트 emit (NarrativeGenerator.forRealmEnter wire)
        this.recordToStore({
          age: this.hero.age,
          type: 'realmEnter',
          narrativeText: NarrativeGenerator.forRealmEnter(
            { age: this.hero.age, realm: newRealm },
            this.rng.int(100000),
          ),
          payload: { from: oldRealm, to: newRealm },
        });
        events.push({ type: 'realm_entered', realmId: newRealm });
      }
    }

    // V3-E: NPC encounter + lifecycle
    const npcState = useGameStore.getState().run.npcs;
    for (const npc of npcState) {
      const wasAlive = npc.isAlive;
      tickNpc(npc);
      if (wasAlive && !npc.isAlive) {
        events.push({ type: 'npc_died', npcInstanceId: npc.instanceId });
        // Cycle-1 F3: dead path 회수 — NPC 사망을 saga 에 기록.
        // Cycle 256: kind-aware 분기 (rival/mentor/family 화법 정합).
        this.recordToStore({
          age: this.hero.age,
          type: 'npcDeath',
          narrativeText: NarrativeGenerator.forNpcDeath(
            { age: this.hero.age, kind: npc.kind, realm: this.currentRealmId },
            this.rng.int(100000),
          ),
          payload: { npcInstanceId: npc.instanceId, kind: npc.kind },
        });
      }
    }
    // Encounter trigger: 현재 realm 거주 + alive NPC 중 1명 (20% 확률)
    const candidates = npcState.filter(n => n.isAlive && n.zoneRealmId === this.currentRealmId);
    if (candidates.length > 0 && this.rng.chance(0.2)) {
      const picked = candidates[this.rng.int(candidates.length)];
      events.push({ type: 'npc_encounter', npcInstanceId: picked!.instanceId, npcKind: picked!.kind });
      // Cycle-1 F3: dead path 회수 — NPC 조우를 saga 에 기록.
      // Cycle 264: NpcEntity['kind'] 6 union 정합, generator 변환 제거.
      this.recordToStore({
        age: this.hero.age,
        type: 'npcEncounter',
        narrativeText: NarrativeGenerator.forNpcEncounter(
          { age: this.hero.age, kind: picked!.kind, realm: this.currentRealmId },
          this.rng.int(100000),
        ),
        payload: { npcInstanceId: picked!.instanceId, kind: picked!.kind },
      });
    }

    // V3-H F6: season transition check (after age tick + NPC tick).
    // Note: stagger/trial early-return paths above also tick age, so a season
    // crossing in those paths is caught on the following regular arrival — one
    // arrival late, which is intentional (stagger is a recovery beat).
    const newSeason = seasonForAge(this.hero.age);
    const currentMeta = useGameStore.getState().meta;
    if (newSeason !== currentMeta.season.current) {
      useGameStore.setState(s => ({
        ...s,
        meta: {
          ...s.meta,
          season: { current: newSeason, startedAtAge: Math.floor(this.hero.age) },
        },
      }));
      // Cycle-1 F2: hard-coded literal 제거 → NarrativeGenerator.forSeasonChange wire
      this.recordToStore({
        age: this.hero.age,
        type: 'seasonChange',
        narrativeText: NarrativeGenerator.forSeasonChange(
          { age: this.hero.age, season: newSeason, realm: this.currentRealmId ?? 'base' },
          this.rng.int(100000),
        ),
        payload: { season: newSeason },
      });
      events.push({ type: 'season_changed', season: newSeason });
    }

    // Cycle-11 C10-B: preventive auto-rejuv when hero crosses the threshold
    // (age >= 65) and has enough light + headroom under the per-cycle cap. Must
    // run BEFORE the natural-death check below so a successful rejuv (age 65 →
    // 60) prevents the same arrival's `>= 70` check from firing. tickAge ran in
    // either branch above by the time we reach here.
    this.maybeAutoRejuvenate();

    // Cycle-11 C10-A: emit hero_died('자연사') when hero crosses age 70 in this
    // arrival. Gated on `!this.endCause` so an in-combat '전사' from
    // EncounterEngine already this arrival wins. Sets staggered=true (parallels
    // '전사') so the next arrival's stagger early-return path fires without
    // re-emitting death — and the natural-death emit itself uses the current
    // level for oldLevel/newLevel (no -10% penalty; aging isn't a battle loss).
    this.maybeEmitNaturalDeath(events);
    this.pushLevelSnapshot(); // cycle 111 F1: normal-arrival snapshot
    return events;
  }

  /** Cycle-11 C10-B — auto-rejuv trigger. Called after every tickAge.
   *  Fires when:
   *    - hero is alive (not staggered post-battle)
   *    - hero.age >= AUTO_REJUV_AGE_THRESHOLD (65)
   *    - hero.rejuvenationCount < AUTO_REJUV_MAX_PER_CYCLE (2)
   *    - meta.light >= rejuvenationCost(age) * (1 - rejuvDiscount)
   *  Side effects mirror cycleSliceV2.rejuvenateHero so the live UI path stays
   *  the source of truth for cost / discount: deducts light from the store,
   *  rolls the hero's age back AUTO_REJUV_YEARS, and records the saga
   *  '재생 #K' marker via the existing recordRejuvenation hook.
   *  No-op when the controller has already set endCause (cycle ending) or hero
   *  is staggered. */
  private maybeAutoRejuvenate(): void {
    if (this.endCause) return;
    if (this.hero.staggered) return;
    if (this.hero.age < AUTO_REJUV_AGE_THRESHOLD) return;
    if (this.hero.rejuvenationCount >= AUTO_REJUV_MAX_PER_CYCLE) return;
    const meta = useGameStore.getState().meta;
    const baseCost = rejuvenationCost(this.hero.age);
    const discount = getRejuvDiscount(meta);
    const cost = Math.ceil(baseCost * (1 - discount));
    const light = meta.light ?? 0;
    if (light < cost) return;
    useGameStore.setState(s => ({
      ...s,
      meta: { ...s.meta, light: (s.meta.light ?? 0) - cost },
    }));
    this.hero.rejuvenate(AUTO_REJUV_YEARS);
    this.recordRejuvenation(AUTO_REJUV_YEARS);
    // Cycle-1 F2 parity: cycleSliceV2.rejuvenateHero forwards to the saga
    // store's recordSagaRejuvenation. Mirror that here so live UI saga sees
    // the era boundary the same way as a SpendModal-triggered rejuv.
    useGameStore.getState().recordSagaRejuvenation();
  }

  /** Cycle-11 C10-A: emit `hero_died('자연사')` once when hero reaches the
   *  age-70 cap during any aging tick. Sets `this.endCause = '자연사'` so the
   *  saga finalize records the cause explicitly (rather than relying on the
   *  finalize-time default fallback). Marks the hero staggered so subsequent
   *  arrivals follow the existing recover-from-stagger pattern instead of
   *  resolving encounters. Idempotent via the `!this.endCause` guard. */
  private maybeEmitNaturalDeath(events: OverworldEvent[]): void {
    if (this.endCause) return;
    if (this.hero.staggered) return;
    if (this.hero.age < 70) return;
    this.endCause = '자연사';
    this.hero.staggered = true;
    events.push({
      type: 'hero_died',
      cause: '자연사',
      oldLevel: this.hero.level,
      newLevel: this.hero.level,
    });
    this.recordToStore({
      age: this.hero.age,
      type: 'death',
      narrativeText: NarrativeGenerator.forDeath({
        age: this.hero.age,
        cause: '자연사',
        oldLevel: this.hero.level,
        newLevel: this.hero.level,
        realm: this.currentRealmId,
        seed: this.rng.int(100000),
      }),
      payload: { oldLevel: this.hero.level, newLevel: this.hero.level },
    });
  }

  /** Called by cycleSliceV2.rejuvenateHero after hero.rejuvenate(). Records the
   *  saga "재생 #K" marker with the post-rejuvenation age. */
  recordRejuvenation(years: number): void {
    this.recordToStore({
      age: this.hero.age,
      type: 'rejuvenation',
      narrativeText: NarrativeGenerator.forRejuvenation({
        age: this.hero.age,
        yearsBack: years,
        rejuvenationCount: this.hero.rejuvenationCount,
      }, this.rng.int(100000)),
      payload: { years, rejuvenationCount: this.hero.rejuvenationCount },
    });
  }

  /** V3-H F5: 시련의 제단 — fieldLevel * 2 강도의 적과 모의 전투.
   *  승리: LV +3 / 패배: LV ×0.85 (최소 1). */
  private resolveTrialEncounter(landmarkId: string): OverworldEvent[] {
    const events: OverworldEvent[] = [];
    const meta = useGameStore.getState().meta;
    const heroCol = this.hero.gridX;
    const fieldLv = fieldLevelAtColumn(this.currentRealmId ?? 'base', heroCol);
    const trialLv = Math.max(1, fieldLv * 2);
    const buff6 = getFieldDiffThreshold(meta);
    const damping = computeFieldDamping(this.hero.level, trialLv, buff6);
    const heroAtk = Math.max(1, Math.floor(this.hero.atk * damping));
    const enemyHp = trialLv * 30;
    const enemyAtk = trialLv * 2;

    let eHp = enemyHp;
    let hHp = this.hero.hp;
    while (eHp > 0 && hHp > 0) {
      eHp -= heroAtk;
      if (eHp > 0) hHp -= enemyAtk;
    }

    if (eHp <= 0) {
      // 승리
      this.hero.level += 3;
      this.hero.recomputeStats();
      this.recordToStore({
        age: this.hero.age,
        type: 'trial',
        narrativeText: `${this.hero.age}세에 시련을 이겨냈다 — LV +3`,
        payload: { trialLv, outcome: 'win', landmarkId },
      });
      events.push({ type: 'trial_resolved', trialLv, outcome: 'win' });
    } else {
      // 패배
      const oldLv = this.hero.level;
      this.hero.level = Math.max(1, Math.floor(this.hero.level * 0.85));
      this.hero.recomputeStats();
      this.recordToStore({
        age: this.hero.age,
        type: 'trial',
        narrativeText: `${this.hero.age}세에 시련에 무너졌다 — LV ${oldLv} → ${this.hero.level}`,
        payload: { trialLv, outcome: 'lose', oldLevel: oldLv, newLevel: this.hero.level, landmarkId },
      });
      events.push({ type: 'trial_resolved', trialLv, outcome: 'lose', oldLevel: oldLv, newLevel: this.hero.level });
    }
    return events;
  }

  private recordToStore(event: SagaEvent): void {
    this.saga.record(event);
    useGameStore.getState().recordSagaEvent(event, this.hero.chapter);
  }

  // C786: Record event choice to saga with flavor narration
  private recordEventChoice(eventId: string, accept: boolean): void {
    const narration = EVENT_NARRATION[eventId];
    if (!narration) return;
    const text = accept ? narration.accept : narration.decline;
    this.recordToStore({
      age: this.hero.age,
      type: 'eventChoice',
      narrativeText: text,
      payload: { eventId, action: accept ? 'accept' : 'decline' },
    });
  }

  finalize(): CycleSaga {
    return this.saga.finalize({
      finalAge: this.hero.age,
      finalJob: this.hero.job,
      finalLevel: this.hero.level,
      finalPersonality: this.hero.personality.snapshot(),
      cause: this.endCause ?? '자연사',
      // Cycle 6 P1: finalRealm 신규 flat field — hero 가 어느 realm 에서
      // 죽었는지 sagaHistory 카드에 표시하기 위함. cycleSliceV2.endCycle 의
      // currentRealmId reset 은 본 finalize() 호출 이후이므로 controller 의
      // local currentRealmId 가 사망 직전 값. setCurrentRealmId 를 한 번도
      // 호출 안 한 unit-test 경로는 'base' 로 fallback.
      finalRealm: this.currentRealmId ?? 'base',
      // Cycle 111 F1+F3: attach the captured level history so the post-cycle
      // result screen can render the inflation curve chart. Memory-only —
      // cycleSliceV2 has no persist middleware.
      levelHistory: this.levelHistory.get(),
    });
  }
}
