#!/usr/bin/env tsx
/**
 * V1a/V1b headless cycle driver — replays the actual game flow (Overworld + AI
 * + Encounter) without Phaser. Used for Sim-G inflation curve tuning + V1b
 * variety validation + multi-scenario runs.
 *
 * Logging — two-file split per directive:
 *   runs/<date>/c<seed>.jsonl   — every event raw + stamped (AI-friendly)
 *   runs/<date>/c<seed>.md      — narrative summary (sampled every Nth cycle)
 *   runs/<date>/summary.json    — aggregate stats across the batch
 */
import { writeFileSync, mkdirSync, openSync, writeSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { CycleControllerV2 } from '../src/overworld/CycleControllerV2';
import { generateMapLayout } from '../src/overworld/mapLayout';
import { landmarkToCandidate, filterCandidatesByRealm, type PlacedLandmark } from '../src/overworld/Landmark';
import { LANDMARK_TYPES } from '../src/data/landmarks';
import { SeededRng } from '../src/cycle/SeededRng';
import { findRealm } from '../src/data/realms';
import { computeLightDelta } from '../src/overworld/lightEmit';
import { useGameStore } from '../src/store/gameStore';
import { pickRespawnPlacement } from '../src/overworld/respawn';
import { pickStartingRealm, spawnColumnForRealm } from '../src/overworld/realmRotation';
import { goldFromCycle } from '../src/meta/MetaProgression';
import { SagaStorage } from '../src/saga/SagaStorage';
import { applyEndCycleMeta } from '../src/overworld/cycleSlice.helpers';
import type { TraitId } from '../src/cycle/traits';
import type { RealmId } from '../src/types';
import type { OverworldEvent } from '../src/overworld/OverworldEvents';
import type { CycleSaga } from '../src/saga/SagaTypes';
import type { Chapter } from '../src/hero/HeroLifecycle';

const GRID_H = 12;

export interface SimV2Options {
  count: number;
  seedStart: number;
  heroHpMax: number;
  heroAtkBase: number;
  traits?: TraitId[];
  maxArrivals?: number;
  /** Output directory. JSONL + sampled MD + summary all land here. */
  outDir?: string;
  /** Sample every Nth cycle for the MD narrative. 0 = none. */
  mdSampleEvery?: number;
  /** Optional bonus stats from meta progression (applied to base before curve). */
  atkBonus?: number;
  hpBonus?: number;
  /** Cycle-15 — starting realm for the cycle. Default 'base'. Hero spawns at
   *  `realm.columnRange[0] + 1` and pathfinder bounds derive from realm.
   *  Used for realm-rotation sweep in cycle-15+ batch drivers. */
  startRealm?: import('../src/types').RealmId;
  /** Cycle-15 — list of realms the player has unlocked. Defaults to
   *  `['base']`. Drives `onBossKill` gating + decision AI's realm-aware scoring.
   *  Must always contain `startRealm`. */
  unlockedRealms?: import('../src/types').RealmId[];
}

export interface StampedEvent {
  cycleSeed: number;
  arrival: number;
  heroAge: number;
  heroLevel: number;
  heroHp: number;
  ev: OverworldEvent;
}

export interface SimV2CycleResult {
  seed: number;
  maxLevel: number;
  finalAge: number;
  endCause: string;
  arrivals: number;
  kills: number;
  bossKills: number;
  drops: number;
  hp: number;
  hpMax: number;
  warnings: string[];
  // V1b counters
  jobUnlocks: number;
  skillsLearned: number;
  shrineVisits: number;
  moralChoices: number;
  finalJobId: string | null;
  learnedSkills: string[];
  // Personality at end (numeric snapshot)
  personality: Record<string, number>;
  // Lineage support
  startAtkBase: number;
  startHpBase: number;
  // Cycle-11 C10-B counters — light emitted + auto-rejuv count this cycle.
  lightEmitted: number;
  rejuvCount: number;
  // Cycle-16 — starting realm for this cycle (chained sim verification).
  startRealm: RealmId;
}

export interface SimV2Summary {
  cycleCount: number;
  maxLevel: Percentiles;
  arrivals: Percentiles;
  kills: Percentiles;
  jobUnlocks: Percentiles;
  skillsLearned: Percentiles;
  shrineVisits: Percentiles;
  moralChoices: Percentiles;
  drops: Percentiles;
  endCauses: Record<string, number>;
  jobsUnlocked: Record<string, number>;
  skillsLearnedCount: Record<string, number>;
  // Cycle-11 C10-A/B aggregate diagnostics.
  rejuvCount: Percentiles;
  cyclesWithAnyRejuv: number;
  lightEmitted: Percentiles;
}

export interface Percentiles { min: number; max: number; avg: number; p50: number; p90: number; }

export interface SimV2Output { results: SimV2CycleResult[]; summary: SimV2Summary; }

export function runSimV2(opts: SimV2Options): SimV2Output {
  const results: SimV2CycleResult[] = [];
  // Cycle-11 C10-B: default raised 1000 → 1200 to give 2-rejuv cycles
  // (max cap) enough arrival headroom to still reach age 70 → '자연사'. Without
  // this, every rejuv-active cycle terminated via max_arrivals at finalAge ≈
  // 60-64 and the PRD '자연사 ≥ 30%' criterion is unreachable: rejuvs
  // *prevent* reaching age 70 inside a 1000-arrival window because each rejuv
  // adds ~77 actions of headroom. 2 × 77 = 154 → 1154 arrivals to hit age 70
  // after 2 rejuvs. 1200 is the round number safely above that.
  const maxArrivals = opts.maxArrivals ?? 1200;
  const outDir = opts.outDir;
  const mdSampleEvery = opts.mdSampleEvery ?? 0;

  if (outDir) mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < opts.count; i++) {
    const seed = opts.seedStart + i;
    const { result, events, saga } = runOneCycle(seed, opts, maxArrivals, false);
    results.push(result);

    if (outDir) {
      // Cycle-12 L2: per-event chunked write. `events.map().join('\n')` built one
      // contiguous string per cycle — with 1200 arrivals × ~6000 events the
      // serialized string exceeds V8's `Invalid string length` cap (~512MB) and
      // the whole sim throws. Writing each line via the same fd keeps memory flat
      // and matches the shard layout the recon (`/tmp/cycle-10-recon/runX/c*.jsonl`)
      // already assumed.
      const jsonlPath = join(outDir, `c${seed}.jsonl`);
      const fd = openSync(jsonlPath, 'w');
      try {
        for (const ev of events) {
          writeSync(fd, JSON.stringify(ev) + '\n');
        }
      } finally {
        closeSync(fd);
      }

      if (mdSampleEvery > 0 && i % mdSampleEvery === 0) {
        const mdPath = join(outDir, `c${seed}.md`);
        writeFileSync(mdPath, renderMd(result, saga, events), 'utf-8');
      }
    }
  }

  const summary = buildSummary(results);

  if (outDir) {
    writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf-8');
  }

  return { results, summary };
}

/**
 * Cycle-16 — chained sim driver. State (sagaHistory, unlockedRealms,
 * atkBaseBonus, hpBaseBonus, sponsorGold, light) carries across cycles via
 * the live zustand store; this mirrors what the dev server does between
 * `cycleSliceV2.start()` and `cycleSliceV2.endCycle()` invocations.
 *
 * Differences from `runSimV2`:
 *   - Entry resets meta fields to a clean baseline so a polluted vitest
 *     worker doesn't carry pre-existing sagaHistory in. Later iterations
 *     accumulate naturally.
 *   - Start realm + unlockedRealms are picked from store, not opts. The
 *     rotation picker (`pickStartingRealm`) reads `meta.sagaHistory.length`,
 *     identical to the live `cycleSliceV2.start()` path.
 *   - After each cycle: `SagaStorage.append`, `goldFromCycle` →
 *     `spend('balanced')`, exactly mirroring `cycleSliceV2.endCycle`.
 *     Light is NOT reset.
 *   - `onBossKill` (inside `runOneCycle(chained=true)`) writes the unlock
 *     into the store so the next iteration's rotation sees it.
 *
 * Opts.atkBonus/hpBonus are still honored as the *initial* meta bonus the
 * chained run starts from (e.g. seeding a partially-progressed save). After
 * cycle 0 the bonuses are read fresh from the store each iteration.
 */
export function runSimV2Chained(opts: SimV2Options): SimV2Output {
  const results: SimV2CycleResult[] = [];
  const maxArrivals = opts.maxArrivals ?? 1200;
  const outDir = opts.outDir;
  const mdSampleEvery = opts.mdSampleEvery ?? 0;

  if (outDir) mkdirSync(outDir, { recursive: true });

  // Cycle-16 chained: explicit store reset at entry. zustand store is a
  // module-level singleton — without this, a polluted vitest worker would
  // inherit prior tests' sagaHistory/unlockedRealms, breaking the "carry
  // across cycles" measurement at iteration 0. Seed atk/hp bonus from opts
  // so chained-from-save scenarios work.
  useGameStore.setState(s => ({
    ...s,
    meta: {
      ...s.meta,
      sagaHistory: [],
      unlockedRealms: s.meta.unlockedRealms ?? ['base'],
      sponsorGold: 0,
      atkBaseBonus: opts.atkBonus ?? 0,
      hpBaseBonus: opts.hpBonus ?? 0,
      light: 0,
    },
    run: { ...s.run, currentRealmId: 'base', npcs: [] },
  }));

  for (let i = 0; i < opts.count; i++) {
    const seed = opts.seedStart + i;

    // Mirror cycleSliceV2.start() rotation: pick the realm from current
    // unlockedRealms + sagaHistory.length, sync it into run.currentRealmId
    // so runOneCycle(chained=true) sources it from store.
    const stateBefore = useGameStore.getState();
    const cycleNumber = stateBefore.meta.sagaHistory.length;
    const rotated = pickStartingRealm(stateBefore.meta.unlockedRealms, cycleNumber);
    useGameStore.setState(s => ({ ...s, run: { ...s.run, currentRealmId: rotated } }));

    // Cycle-16: re-read accrued bonuses from store each iteration. After
    // cycle 0, these have been mutated by the spend('balanced') call below.
    const metaSnap = useGameStore.getState().meta;
    const chainedOpts: SimV2Options = {
      ...opts,
      atkBonus: metaSnap.atkBaseBonus ?? 0,
      hpBonus: metaSnap.hpBaseBonus ?? 0,
    };

    const { result, events, saga } = runOneCycle(seed, chainedOpts, maxArrivals, true);
    results.push(result);

    // Mirror cycleSliceV2.endCycle(): append saga, accrue gold, auto-spend
    // via balanced strategy, reset currentRealmId/npcs as the stale-realm
    // guard. SagaStorage.append handles the SAGA_CAP (100) trim.
    SagaStorage.append(saga);
    const gold = goldFromCycle({
      maxLevel: result.maxLevel,
      kills: result.kills,
      bossKills: result.bossKills,
      drops: result.drops,
    });
    // Cycle 117 — mirror cycle 116 의 organic crackStones drop (sim-real
    // parity). boss kill 당 1 stone, max 3/cycle.
    const crackStoneReward = Math.min(result.bossKills, 3);
    if (crackStoneReward > 0) {
      useGameStore.getState().gainCrackStones(crackStoneReward);
    }
    // Cycle-18 — sim/real parity. Single helper shared with
    // `cycleSliceV2.endCycle`. Any future change to cycle-end semantics
    // propagates automatically.
    useGameStore.setState(s => applyEndCycleMeta(s, { gold }));

    if (outDir) {
      const jsonlPath = join(outDir, `c${seed}.jsonl`);
      const fd = openSync(jsonlPath, 'w');
      try {
        for (const ev of events) {
          writeSync(fd, JSON.stringify(ev) + '\n');
        }
      } finally {
        closeSync(fd);
      }

      if (mdSampleEvery > 0 && i % mdSampleEvery === 0) {
        const mdPath = join(outDir, `c${seed}.md`);
        writeFileSync(mdPath, renderMd(result, saga, events), 'utf-8');
      }
    }
  }

  const summary = buildSummary(results);
  if (outDir) {
    writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf-8');
  }
  return { results, summary };
}

function runOneCycle(
  seed: number,
  opts: SimV2Options,
  maxArrivals: number,
  /** Cycle-16 — when true, runOneCycle is being driven by the chained sim
   *  loop. Three behavioral differences vs batch mode:
   *    1. light pool is NOT reset (live game has a continuous pool across
   *       cycles; chained mirrors live).
   *    2. onBossKill callback also mutates `useGameStore.meta.unlockedRealms`
   *       so the next chained iteration sees the new unlock. Batch sim only
   *       tracks `currentRealmId` locally for sim continuity.
   *    3. start realm + unlocked realms are sourced from the store (already
   *       written by chained driver) rather than from opts. */
  chained: boolean = false,
): { result: SimV2CycleResult; events: StampedEvent[]; saga: CycleSaga } {
  const startAtkBase = opts.heroAtkBase + (opts.atkBonus ?? 0);
  const startHpBase = opts.heroHpMax + (opts.hpBonus ?? 0);

  if (!chained) {
    // Cycle-11 C10-B: each cycle's light pool starts at 0. Without this, light
    // accumulated across the sim batch would leak between cycles — the live UI
    // game has a continuous light pool, but per-cycle sim aggregates need clean
    // separation to measure rejuv triggers per cycle in isolation.
    useGameStore.setState(s => ({ ...s, meta: { ...s.meta, light: 0 } }));
  }

  // V3-H Bug C: realm tracking state for onBossKill wiring
  // Cycle-15: startRealm param drives rotation sweep — hero spawns at
  // `realm.columnRange[0] + 1` so pathfinder bounds match.
  // Cycle-16 chained: realm comes from store (chained driver already wrote it).
  const startingRealmId: RealmId = chained
    ? useGameStore.getState().run.currentRealmId
    : opts.startRealm ?? 'base';
  let currentRealmId: RealmId = startingRealmId;
  const initialUnlocked: readonly RealmId[] = chained
    ? useGameStore.getState().meta.unlockedRealms
    : opts.unlockedRealms ?? ['base'];

  // Cycle 24: dedup realm_unlocked emits. live cycleSliceV2.unlockRealm has a
  // `!unlockedRealms.includes` guard, sim's inline callback historically did not
  // — same realm could emit realm_unlocked multiple times per cycle when boss
  // respawns. Track unlocks already announced in this run.
  const announcedUnlocks = new Set<RealmId>(initialUnlocked);

  const ctrl = new CycleControllerV2({
    seed,
    traits: opts.traits ?? [],
    heroHpMax: startHpBase,
    heroAtkBase: startAtkBase,
    onBossKill: (current: RealmId) => {
      const realm = findRealm(current);
      if (realm.nextRealm && !announcedUnlocks.has(realm.nextRealm)) {
        announcedUnlocks.add(realm.nextRealm);
        // Cycle-16 chained: also mutate the live store so subsequent chained
        // iterations see the new unlock + rotation picker uses the wider pool.
        if (chained) {
          useGameStore.getState().unlockRealm(realm.nextRealm);
        }
        return realm.nextRealm;
      }
      return null;
    },
  });

  // V3-H Bug C: set initial realm state on controller
  ctrl.setCurrentRealmId(currentRealmId);
  ctrl.setUnlockedRealms(initialUnlocked);
  const hero = ctrl.getHero();
  // Cycle-15: align hero spawn column with realm — pathfinder bounds derive
  // from realm.columnRange; mismatched spawn (col 1 in sea realm) triggers
  // cycle-5 F1's '무위' 5세 즉사. spawnColumnForRealm guarantees the pair.
  const startCol = findRealm(currentRealmId).columnRange[0] + 1;
  hero.gridX = startCol;
  hero.gridY = Math.floor(GRID_H / 2);
  const ai = ctrl.getDecisionAI();
  const layout = generateMapLayout(seed);
  const respawnRng = new SeededRng(seed ^ 0xabcd1234);

  let respawnCounter = 0;
  let arrivals = 0;
  let kills = 0;
  let bossKills = 0;
  let drops = 0;
  let jobUnlocks = 0;
  let skillsLearned = 0;
  let shrineVisits = 0;
  let moralChoices = 0;
  let maxLevel = hero.level;
  let lightEmitted = 0;
  const warnings: string[] = [];
  const stamped: StampedEvent[] = [];
  let lastTypeId: string | null = null;
  let sameTypeStreak = 0;
  let endCause = 'unknown';

  while (arrivals < maxArrivals) {
    // Cycle-12 L1 — mirror OverworldScene.pickNextDestination: drop landmarks
    // that fall outside the hero's current realm BEFORE the AI scores them.
    // Without this filter the sim picks from a larger pool than the live game
    // ever sees, and the cycle-12 respawn bug (base-only zoneForColumn) stayed
    // invisible to the sim while terminating the live game with '무위'. Sim
    // PASS must reflect what the dev server measures.
    const unconsumed = layout.landmarks.filter(l => !l.consumed);
    const reachable = filterCandidatesByRealm(unconsumed, currentRealmId);
    if (reachable.length === 0) { endCause = '무위'; break; }
    const chosenCandidate = ai.chooseDestination(reachable.map(landmarkToCandidate));
    if (!chosenCandidate) { endCause = '무위'; break; }
    const target = reachable.find(c => c.instanceId === chosenCandidate.id);
    if (!target) { endCause = 'target_not_found'; break; }

    const typeId = target.type.id;
    if (lastTypeId === typeId) {
      sameTypeStreak += 1;
      if (sameTypeStreak === 10) warnings.push(`AI picked ${typeId} 10+ in a row at arrival ${arrivals}`);
    } else { sameTypeStreak = 1; lastTypeId = typeId; }

    const arrivalEv: OverworldEvent = { type: 'arrived_at', landmarkId: target.instanceId, landmarkKind: target.type.kind };
    stamped.push({ cycleSeed: seed, arrival: arrivals, heroAge: hero.age, heroLevel: hero.level, heroHp: hero.hp, ev: arrivalEv });

    // Cycle-12 L1 — sync hero.gridX/Y to the target before resolving the
    // arrival. OverworldScene tweens the hero to the landmark cell before
    // firing 'arrived_at', so the hero's column equals the landmark column
    // at resolve time. The controller's resolveTrialEncounter +
    // fieldLevelAtColumn read hero.gridX, so without this mirror the sim's
    // trial damping is computed at col 0 (lvStart of the realm) instead of
    // the actual trial altar column. Doesn't simulate intermediate
    // pathfinding but matches the resolve-time invariant the controller
    // depends on.
    hero.gridX = target.gridX;
    hero.gridY = target.gridY;

    const events = ctrl.handleArrival(target.type.kind, target.instanceId);
    arrivals += 1;
    target.consumed = true;

    // Cycle 108 F1 — sim driver auto-decline policy. PRD §sim-real-parity §1.
    // Sim is frame-based; the 5s wall-clock timeout doesn't exist here. When
    // fate_roll_required emits, immediately invoke resolveFateRoll('decline')
    // and splice the returned events (fate_roll_resolved + hero_died) into
    // the same per-arrival event stream so downstream counters (endCause,
    // hero_died ratio, light) see the synthesized death as if EncounterEngine
    // had emitted it directly. Mirrors dev server's 5s auto-decline outcome.
    //
    // Cycle 109 F1 — auto-choice cards[0] policy. PRD §sim-real-parity §1.
    // When boss_intro_offered emits, invoke resolveBossIntro(0) and splice
    // the returned events into the same stream. cards[0] = the first
    // weighted-sample card (effectively uniform across all 10 catalog
    // entries since weights are equal in current PRD). Mirrors dev server's
    // 8s auto-choose timeout outcome. Order: fate roll first, then boss intro
    // — but they never co-occur in the same arrival (boss intro = before
    // battle, fate roll = after battle).
    let preFate: OverworldEvent[] = events;
    let bossIntroFollowup: OverworldEvent[] = [];
    const hasBossIntro = preFate.some(e => e.type === 'boss_intro_offered');
    if (hasBossIntro) {
      bossIntroFollowup = ctrl.resolveBossIntro(0);
      preFate = [...preFate, ...bossIntroFollowup];
    }
    // Cycle 110 F1 — sim driver trait-based auto-choice. PRD §sim-real-parity §1.
    // When realm_fork_offered emits, invoke resolveRealmFork(autoChoice) with
    // controller.getRealmForkAutoChoice() (deterministic per trait set) and
    // splice the returned events (realm_fork_resolved + realm_entered) into
    // the same stream. Mirrors dev server's 6s auto-choice timeout. Order:
    // realm fork happens at exit-landmark arrival, which is a different
    // arrival kind than boss intro / fate roll — they never co-occur.
    const hasRealmFork = preFate.some(e => e.type === 'realm_fork_offered');
    if (hasRealmFork) {
      const realmForkFollowup = ctrl.resolveRealmFork(ctrl.getRealmForkAutoChoice());
      preFate = [...preFate, ...realmForkFollowup];
    }
    const hasFateRoll = preFate.some(e => e.type === 'fate_roll_required');
    const resolveEvents: OverworldEvent[] = hasFateRoll
      ? ctrl.resolveFateRoll('decline')
      : [];
    const allEvents = hasFateRoll ? [...preFate, ...resolveEvents] : preFate;

    for (const ev of allEvents) {
      stamped.push({ cycleSeed: seed, arrival: arrivals, heroAge: hero.age, heroLevel: hero.level, heroHp: hero.hp, ev });
      if (ev.type === 'battle_won') {
        if (target.type.kind === 'boss') bossKills += 1; else kills += 1;
        if (ev.dropId) drops += 1;
      } else if (ev.type === 'level_up' && ev.to > maxLevel) {
        maxLevel = ev.to;
      } else if (ev.type === 'hero_died') {
        endCause = ev.cause;
      } else if ((ev as { type: string }).type === 'job_unlocked') {
        jobUnlocks += 1;
      } else if ((ev as { type: string }).type === 'skill_learned') {
        skillsLearned += 1;
      } else if ((ev as { type: string }).type === 'shrine_visited') {
        shrineVisits += 1;
      } else if ((ev as { type: string }).type === 'moral_choice') {
        moralChoices += 1;
      } else if (ev.type === 'realm_entered') {
        // V3-H Bug C: track current realm for sim continuity
        currentRealmId = ev.realmId;
      }
    }

    // Cycle-11 C10-B: mirror OverworldRunner light accumulation so the
    // controller's `meta.light` read sees realistic values on the next
    // arrival's auto-rejuv check. Headless sim otherwise leaves light at 0
    // forever and the rejuv gate never opens. Discount/season multipliers
    // (live UI applies these) are omitted for sim purity — base rate only.
    const { delta: lightDelta } = computeLightDelta(events, target.type.kind);
    if (lightDelta > 0) {
      lightEmitted += lightDelta;
      useGameStore.setState(s => ({
        ...s,
        meta: { ...s.meta, light: (s.meta.light ?? 0) + lightDelta },
      }));
    }

    // Break out the moment a natural-death emit lands so we don't keep
    // ticking the dead hero through stagger-recover loops until max_arrivals.
    // The hero_died('자연사') event sets `endCause = '자연사'` above; the loop
    // would otherwise burn ~50 more arrivals here on '자연사' cycles.
    if (endCause === '자연사') break;

    if (target.type.kind === 'enemy') {
      respawnEnemy(layout.landmarks, respawnRng, target, ++respawnCounter, hero.chapter);
    }
  }

  if (endCause === 'unknown') {
    if (arrivals >= maxArrivals) endCause = 'max_arrivals';
  }

  const saga = ctrl.finalize();

  const finalJobId = (hero as unknown as { unlockedJobId?: string | null }).unlockedJobId ?? null;
  const learnedSkills = Array.from(((hero as unknown as { learnedSkillIds?: Set<string> }).learnedSkillIds) ?? []);

  const result: SimV2CycleResult = {
    seed, maxLevel, finalAge: hero.age, endCause,
    arrivals, kills, bossKills, drops,
    hp: hero.hp, hpMax: hero.hpMax,
    warnings,
    jobUnlocks, skillsLearned, shrineVisits, moralChoices,
    finalJobId, learnedSkills,
    personality: hero.personality.snapshot(),
    startAtkBase, startHpBase,
    // Cycle-11 C10-B — final rejuvenationCount on the hero captures auto-rejuv
    // fires this cycle (HeroEntity resets it per cycle via `create`).
    lightEmitted, rejuvCount: hero.rejuvenationCount,
    // Cycle-16 — record the realm the cycle started in (rotation verification).
    startRealm: startingRealmId,
  };

  return { result, events: stamped, saga };
}

function respawnEnemy(
  landmarks: PlacedLandmark[],
  rng: SeededRng,
  consumed: PlacedLandmark,
  counter: number,
  heroChapter: Chapter,
): void {
  // Cycle-12 L1 — delegate to the shared pure helper. Base realm keeps
  // V1e zone-banded narrative; non-base realms place inside `realm.columnRange`
  // with an enemy from `realm.enemyRoster`. See `src/overworld/respawn.ts`
  // for the root-cause writeup.
  const placement = pickRespawnPlacement(consumed.gridX, heroChapter, GRID_H, rng);
  if (!placement) return;
  const landmarkType = LANDMARK_TYPES.find(t => t.id === placement.typeId);
  if (!landmarkType) return;
  landmarks.push({
    instanceId: `${placement.typeId}_respawn_${counter}`,
    type: landmarkType,
    gridX: placement.gridX,
    gridY: placement.gridY,
    consumed: false,
  });
}

function buildSummary(results: SimV2CycleResult[]): SimV2Summary {
  const endCauses: Record<string, number> = {};
  const jobsUnlocked: Record<string, number> = {};
  const skillsLearnedCount: Record<string, number> = {};
  let cyclesWithAnyRejuv = 0;
  for (const r of results) {
    endCauses[r.endCause] = (endCauses[r.endCause] ?? 0) + 1;
    if (r.finalJobId) jobsUnlocked[r.finalJobId] = (jobsUnlocked[r.finalJobId] ?? 0) + 1;
    for (const s of r.learnedSkills) skillsLearnedCount[s] = (skillsLearnedCount[s] ?? 0) + 1;
    if (r.rejuvCount >= 1) cyclesWithAnyRejuv += 1;
  }
  return {
    cycleCount: results.length,
    maxLevel:        stat(results.map(r => r.maxLevel)),
    arrivals:        stat(results.map(r => r.arrivals)),
    kills:           stat(results.map(r => r.kills + r.bossKills)),
    jobUnlocks:      stat(results.map(r => r.jobUnlocks)),
    skillsLearned:   stat(results.map(r => r.skillsLearned)),
    shrineVisits:    stat(results.map(r => r.shrineVisits)),
    moralChoices:    stat(results.map(r => r.moralChoices)),
    drops:           stat(results.map(r => r.drops)),
    endCauses, jobsUnlocked, skillsLearnedCount,
    rejuvCount:      stat(results.map(r => r.rejuvCount)),
    cyclesWithAnyRejuv,
    lightEmitted:    stat(results.map(r => r.lightEmitted)),
  };
}

function stat(values: number[]): Percentiles {
  if (values.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p90: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return { min: sorted[0]!, max: sorted[sorted.length - 1]!, avg: sum / sorted.length, p50: sorted[Math.floor(sorted.length * 0.5)]!, p90: sorted[Math.floor(sorted.length * 0.9)]! };
}

function renderMd(result: SimV2CycleResult, saga: CycleSaga, events: StampedEvent[]): string {
  const lines: string[] = [];
  lines.push(`# ${saga.hero.name}의 일대기 (seed=${result.seed})`);
  lines.push('');
  lines.push(`- **최종 직업:** ${saga.hero.finalJob}`);
  lines.push(`- **최종 레벨:** Lv ${result.maxLevel.toLocaleString()}`);
  lines.push(`- **최종 나이:** ${result.finalAge}세 (${result.endCause})`);
  lines.push(`- **여정:** ${result.arrivals} arrivals, ${result.kills + result.bossKills} kills (boss ${result.bossKills}), ${result.drops} drops`);
  lines.push(`- **사건 요약:** 직업 unlock ${result.jobUnlocks} · 스킬 ${result.skillsLearned} · 사당 ${result.shrineVisits} · 도덕 ${result.moralChoices}`);
  lines.push(`- **성향:** ${Object.entries(result.personality).map(([k, v]) => `${k}:${v}`).join(' / ')}`);
  if (result.learnedSkills.length > 0) lines.push(`- **배운 스킬:** ${result.learnedSkills.join(', ')}`);
  lines.push('');
  const CHAPTER_RANGES_LABEL: Record<string, string> = {
    '어린시절': '5-14세',
    '청년기':   '15-29세',
    '장년기':   '30-49세',
    '노년기':   '50-69세',
    '마지막':   '70세+',
  };
  for (const ch of saga.chapters) {
    if (ch.events.length === 0) continue;
    lines.push(`## ${ch.name} (${CHAPTER_RANGES_LABEL[ch.name] ?? ''})`);
    lines.push('');
    for (const e of ch.events) {
      lines.push(`- (${e.age}세) ${e.narrativeText}`);
    }
    lines.push('');
  }
  lines.push(`---`);
  lines.push(`*총 ${events.length} stamped events. JSONL: \`c${result.seed}.jsonl\`.*`);
  return lines.join('\n');
}

if (process.argv[1]?.endsWith('sim-cycle-v2.ts')) {
  const argv = process.argv.slice(2);
  const parseArg = (name: string, fallback: string): string => {
    const idx = argv.findIndex(a => a === `--${name}`);
    return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1]! : fallback;
  };
  const count = parseInt(parseArg('count', '10'), 10);
  const seedStart = parseInt(parseArg('seed', '42'), 10);
  const hp = parseInt(parseArg('hp', '100'), 10);
  const atk = parseInt(parseArg('atk', '50'), 10);
  const atkBonus = parseInt(parseArg('atk-bonus', '0'), 10);
  const hpBonus = parseInt(parseArg('hp-bonus', '0'), 10);
  const outDir = parseArg('out-dir', `runs/${new Date().toISOString().slice(0, 10)}`);
  const traitsRaw = parseArg('traits', '');
  const traits = traitsRaw ? (traitsRaw.split(',').map(s => s.trim()) as TraitId[]) : undefined;
  const maxArrivals = parseInt(parseArg('max-arrivals', '1200'), 10);
  const mdSampleEvery = parseInt(parseArg('md-every', '25'), 10);
  const startRealm = parseArg('start-realm', 'base') as import('../src/types').RealmId;
  const unlockedRaw = parseArg('unlocked', '');
  const unlockedRealms = unlockedRaw
    ? (unlockedRaw.split(',').map(s => s.trim()) as import('../src/types').RealmId[])
    : undefined;
  // Cycle-16: --chained mode carries store state across cycles.
  const chained = argv.includes('--chained');

  const runner = chained ? runSimV2Chained : runSimV2;
  const result = runner({
    count, seedStart,
    heroHpMax: hp, heroAtkBase: atk,
    atkBonus, hpBonus,
    traits, maxArrivals, outDir, mdSampleEvery,
    startRealm, unlockedRealms,
  });

  console.log(`Wrote ${result.results.length} cycle results to ${outDir}/ (${chained ? 'chained' : 'batch'})`);
  console.log(`Summary:`, JSON.stringify(result.summary, null, 2));
}
