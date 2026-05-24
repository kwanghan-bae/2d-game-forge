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
      return events;
    }
    const beforeChapter = this.hero.chapter;
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
          narrativeText: NarrativeGenerator.forBattle({ age: this.hero.age, enemyNameKR }, this.rng.int(100000)),
          payload: { enemyId: landmarkId, expGain: ev.expGain },
        });
        if (ev.dropId) {
          this.drops += 1;
          const dropItem = lookupDrop(ev.dropId);
          const itemNameKR = dropItem?.nameKR ?? ev.dropId;
          this.recordToStore({
            age: this.hero.age,
            type: 'drop',
            narrativeText: NarrativeGenerator.forDrop({ age: this.hero.age, itemNameKR }, this.rng.int(100000)),
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
          narrativeText: NarrativeGenerator.forSkillLearned({ age: this.hero.age, skillNameKR: ev.skillNameKR }, this.rng.int(100000)),
          payload: { skillId: ev.skillId, atkBefore: ev.atkBefore, atkAfter: ev.atkAfter },
        });
      }
      if (ev.type === 'shrine_visited') {
        this.recordToStore({
          age: this.hero.age,
          type: 'shrine',
          narrativeText: NarrativeGenerator.forShrine({ age: this.hero.age, healed: ev.healed }, this.rng.int(100000)),
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
          narrativeText: NarrativeGenerator.forMoralChoice({ age: this.hero.age, choiceNameKR: ev.nameKR }, this.rng.int(100000)),
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
          age: this.hero.age, fromLevel: levelFrom, toLevel: levelTo, count: levelCount,
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
          narrativeText: NarrativeGenerator.forJobUnlock({ age: this.hero.age, jobNameKR: j.jobNameKR, tier: j.tier }, this.rng.int(100000)),
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
        }
        const child = spawnNpc('family_child', { realmId: this.currentRealmId ?? 'base', seed: seed + 4 });
        if (child) {
          state.addNpc(child);
          events.push({ type: 'family_event', eventKind: 'child_birth', npcInstanceId: child.instanceId });
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
      }
    }
    // Encounter trigger: 현재 realm 거주 + alive NPC 중 1명 (20% 확률)
    const candidates = npcState.filter(n => n.isAlive && n.zoneRealmId === this.currentRealmId);
    if (candidates.length > 0 && this.rng.chance(0.2)) {
      const picked = candidates[this.rng.int(candidates.length)];
      events.push({ type: 'npc_encounter', npcInstanceId: picked!.instanceId, npcKind: picked!.kind });
    }

    return events;
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
    });
  }
}
