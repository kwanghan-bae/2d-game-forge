import { HeroEntity } from '../hero/HeroEntity';
import { HeroDecisionAI } from '../decisionAI/HeroDecisionAI';
import { EncounterEngine } from './EncounterEngine';
import { SeededRng } from '../cycle/SeededRng';
import { SagaRecorder } from '../saga/SagaRecorder';
import { NarrativeGenerator } from '../saga/NarrativeGenerator';
import { LANDMARK_TYPES, type LandmarkKind } from '../data/landmarks';
import { lookupDrop } from './dropTable';
import type { TraitId } from '../cycle/traits';
import type { CycleSaga, DeathCause } from '../saga/SagaTypes';
import type { OverworldEvent } from './OverworldEvents';

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
}

export class CycleControllerV2 {
  private hero: HeroEntity;
  private ai: HeroDecisionAI;
  private encounter: EncounterEngine;
  private saga: SagaRecorder;
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
    this.hero = HeroEntity.create({
      seed: opts.seed,
      heroHpMax: opts.heroHpMax,
      heroAtkBase: opts.heroAtkBase,
    });
    this.ai = new HeroDecisionAI(this.hero, { seed: opts.seed, traits: opts.traits });
    this.encounter = new EncounterEngine(new SeededRng(opts.seed ^ 0xdeadbeef));
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
        this.saga.record({
          age: this.hero.age,
          type: 'battle',
          narrativeText: NarrativeGenerator.forBattle({ age: this.hero.age, enemyNameKR }),
          payload: { enemyId: landmarkId, expGain: ev.expGain },
        });
        if (ev.dropId) {
          this.drops += 1;
          const dropItem = lookupDrop(ev.dropId);
          const itemNameKR = dropItem?.nameKR ?? ev.dropId;
          this.saga.record({
            age: this.hero.age,
            type: 'drop',
            narrativeText: NarrativeGenerator.forDrop({ age: this.hero.age, itemNameKR }),
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
        this.saga.record({
          age: this.hero.age,
          type: 'skillLearned',
          narrativeText: NarrativeGenerator.forSkillLearned({ age: this.hero.age, skillNameKR: ev.skillNameKR }),
          payload: { skillId: ev.skillId, atkBefore: ev.atkBefore, atkAfter: ev.atkAfter },
        });
      }
      if (ev.type === 'shrine_visited') {
        this.saga.record({
          age: this.hero.age,
          type: 'shrine',
          narrativeText: NarrativeGenerator.forShrine({ age: this.hero.age, healed: ev.healed }),
          payload: { landmarkId: ev.landmarkId },
        });
      }
      if (ev.type === 'moral_choice') {
        this.saga.record({
          age: this.hero.age,
          type: 'moralChoice',
          narrativeText: NarrativeGenerator.forMoralChoice({ age: this.hero.age, choiceNameKR: ev.nameKR }),
          payload: { choice: ev.choice, dim: ev.dim, delta: ev.delta },
        });
      }
      if (ev.type === 'hero_died') {
        this.endCause = ev.cause;
        const enemyType = ev.enemyId ? LANDMARK_TYPES.find(t => ev.enemyId!.startsWith(t.id)) : null;
        this.saga.record({
          age: this.hero.age,
          type: 'death',
          narrativeText: NarrativeGenerator.forDeath({
            age: this.hero.age,
            cause: ev.cause,
            enemyNameKR: enemyType?.nameKR,
          }),
          payload: {},
        });
      }
    }

    // Flush the collected level_ups as one saga record. Avoids 수십 줄 spam
    // from late-game `expGain ∝ lv^1.8` (kill 당 70+ level-ups).
    if (levelCount > 0) {
      this.saga.record({
        age: this.hero.age,
        type: 'levelUp',
        narrativeText: NarrativeGenerator.forLevelUpBatch({
          age: this.hero.age, fromLevel: levelFrom, toLevel: levelTo, count: levelCount,
        }),
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
        this.saga.record({
          age: this.hero.age,
          type: 'jobUnlock',
          narrativeText: NarrativeGenerator.forJobUnlock({ age: this.hero.age, jobNameKR: j.jobNameKR, tier: j.tier }),
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
    }
    return events;
  }

  /** Called by cycleSliceV2.rejuvenateHero after hero.rejuvenate(). Records the
   *  saga "재생 #K" marker with the post-rejuvenation age. */
  recordRejuvenation(years: number): void {
    this.saga.record({
      age: this.hero.age,
      type: 'rejuvenation',
      narrativeText: NarrativeGenerator.forRejuvenation({
        age: this.hero.age,
        yearsBack: years,
        rejuvenationCount: this.hero.rejuvenationCount,
      }),
      payload: { years, rejuvenationCount: this.hero.rejuvenationCount },
    });
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
