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
  bpMax: number;
  heroHpMax: number;
  heroAtkBase: number;
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

  constructor(opts: CycleControllerV2Opts) {
    this.seed = opts.seed;
    this.hero = HeroEntity.create({
      seed: opts.seed,
      bpMax: opts.bpMax,
      heroHpMax: opts.heroHpMax,
      heroAtkBase: opts.heroAtkBase,
    });
    this.ai = new HeroDecisionAI(this.hero, { seed: opts.seed, traits: opts.traits });
    this.encounter = new EncounterEngine(new SeededRng(opts.seed ^ 0xdeadbeef));
    this.saga = new SagaRecorder(this.hero.name, opts.seed);
  }

  getHero(): HeroEntity { return this.hero; }
  getDecisionAI(): HeroDecisionAI { return this.ai; }
  getSeed(): number { return this.seed; }
  getStats(): { kills: number; bossKills: number; drops: number } {
    return { kills: this.kills, bossKills: this.bossKills, drops: this.drops };
  }

  handleArrival(kind: LandmarkKind, landmarkId: string): OverworldEvent[] {
    if (this.hero.dead) return [];
    const events = this.encounter.resolveEncounter(this.hero, kind, landmarkId);

    for (const ev of events) {
      if (ev.type === 'battle_won') {
        if (kind === 'boss') this.bossKills += 1; else this.kills += 1;
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
        this.saga.record({
          age: this.hero.age,
          type: 'levelUp',
          narrativeText: NarrativeGenerator.forLevelUp({ age: this.hero.age, newLevel: ev.to }),
          payload: { from: ev.from, to: ev.to },
        });
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

    // After resolving the encounter, the hero's age may have advanced via BP
    // drain. Check for job-unlock milestones.
    if (!this.hero.dead) {
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
    return events;
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
