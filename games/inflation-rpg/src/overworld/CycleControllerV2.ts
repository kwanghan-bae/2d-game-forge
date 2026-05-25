import { HeroEntity, type HeroSnapshot } from '../hero/HeroEntity';
import { HeroDecisionAI } from '../decisionAI/HeroDecisionAI';
import { EncounterEngine } from './EncounterEngine';
import { SeededRng } from '../cycle/SeededRng';
import { SagaRecorder } from '../saga/SagaRecorder';
import { NarrativeGenerator } from '../saga/NarrativeGenerator';
import { LANDMARK_TYPES, type LandmarkKind } from '../data/landmarks';
import { lookupDrop } from './dropTable';
import { findRealm } from '../data/realms';
import type { TraitId } from '../cycle/traits';
import type { CycleSaga, DeathCause, SagaEvent } from '../saga/SagaTypes';
import type { OverworldEvent } from './OverworldEvents';
import { useGameStore } from '../store/gameStore';
import { tickNpc, spawnNpc } from '../npc/NpcLifecycle';
import { fieldLevelAtColumn } from '../zone/zoneNavigation';
import { computeFieldDamping } from '../zone/fieldDamping';
import { getFieldDiffThreshold, getRejuvDiscount } from '../buff/buffEffects';
import { seasonForAge } from '../season/SeasonState';
import { rejuvenationCost } from '../hero/rejuvenation';

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

  constructor(opts: CycleControllerV2Opts) {
    this.seed = opts.seed;
    // V3-H B2: restore from snapshot if present, otherwise create fresh hero.
    this.hero = opts.heroSnapshot
      ? HeroEntity.restore(opts.heroSnapshot)
      : HeroEntity.create({
          seed: opts.seed,
          heroHpMax: opts.heroHpMax,
          heroAtkBase: opts.heroAtkBase,
        });
    this.ai = new HeroDecisionAI(this.hero, { seed: opts.seed, traits: opts.traits });
    this.encounter = new EncounterEngine(new SeededRng(opts.seed ^ 0xdeadbeef));
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

  getUnlockedRealms(): readonly import('../types').RealmId[] { return this.unlockedRealms; }
  getCurrentRealmId(): import('../types').RealmId | null { return this.currentRealmId; }
  getHero(): HeroEntity { return this.hero; }
  getDecisionAI(): HeroDecisionAI { return this.ai; }
  getSeed(): number { return this.seed; }
  getStats(): { kills: number; bossKills: number; drops: number } {
    return { kills: this.kills, bossKills: this.bossKills, drops: this.drops };
  }

  /** Most recent saga events (already batched + narrative-formatted) for the
   *  live OverworldRunner log overlay. */
  getRecentSagaEvents(limit: number): readonly import('../saga/SagaTypes').SagaEvent[] {
    const all = this.saga.getEvents();
    return all.slice(Math.max(0, all.length - limit));
  }

  handleArrival(kind: LandmarkKind, landmarkId: string): OverworldEvent[] {
    // V3-B: staggered hero recovers (hp full, staggered=false) without
    // processing the encounter content. This arrival "costs" the actionCount
    // tick — recovery itself is the cost.
    if (this.hero.staggered) {
      const beforeChapter = this.hero.chapter;
      this.hero.recoverFromStagger();
      const agingMul = this.getBuffSnapshot?.().agingSpeedMul ?? 1.0;
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
      return events;
    }
    const beforeChapter = this.hero.chapter;

    // V3-H F5: trial 은 controller 에서 직접 처리 (fieldLevel / damping 필요)
    if (kind === 'trial') {
      const trialEvents = this.resolveTrialEncounter(landmarkId);
      const agingMulTrial = this.getBuffSnapshot?.().agingSpeedMul ?? 1.0;
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
      return trialEvents;
    }

    if (this.getBuffSnapshot) {
      const snap = this.getBuffSnapshot();
      this.encounter.setOpts({ dropChanceBonus: snap.dropChanceBonus, damping: snap.damping });
    }
    const events = this.encounter.resolveEncounter(this.hero, kind, landmarkId);

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
    const agingMul = this.getBuffSnapshot?.().agingSpeedMul ?? 1.0;
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
        this.recordToStore({
          age: this.hero.age,
          type: 'npcDeath',
          narrativeText: NarrativeGenerator.forNpcDeath(
            { age: this.hero.age, realm: this.currentRealmId },
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
      // npcKind ({mentor,rival,friend,family_*}) → generator kind ({mentor,rival,passerby}) 매핑.
      const generatorKind: 'mentor' | 'rival' | 'passerby' =
        picked!.kind === 'mentor' ? 'mentor'
        : picked!.kind === 'rival' ? 'rival'
        : 'passerby';
      this.recordToStore({
        age: this.hero.age,
        type: 'npcEncounter',
        narrativeText: NarrativeGenerator.forNpcEncounter(
          { age: this.hero.age, kind: generatorKind, realm: this.currentRealmId },
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
    });
  }
}
