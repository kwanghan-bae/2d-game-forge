import { HeroEntity } from '../hero/HeroEntity';
import { HeroDecisionAI } from '../decisionAI/HeroDecisionAI';
import { EncounterEngine } from './EncounterEngine';
import { SeededRng } from '../cycle/SeededRng';
import { SagaRecorder } from '../saga/SagaRecorder';
import { NarrativeGenerator } from '../saga/NarrativeGenerator';
import { LANDMARK_TYPES, type LandmarkKind } from '../data/landmarks';
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

  constructor(opts: CycleControllerV2Opts) {
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

  handleArrival(kind: LandmarkKind, landmarkId: string): OverworldEvent[] {
    if (this.hero.dead) return [];
    const events = this.encounter.resolveEncounter(this.hero, kind, landmarkId);

    for (const ev of events) {
      if (ev.type === 'battle_won') {
        const enemyType = LANDMARK_TYPES.find(t => landmarkId.startsWith(t.id)) ?? null;
        const enemyNameKR = enemyType?.nameKR ?? '적';
        this.saga.record({
          age: this.hero.age,
          type: 'battle',
          narrativeText: NarrativeGenerator.forBattle({ age: this.hero.age, enemyNameKR }),
          payload: { enemyId: landmarkId, expGain: ev.expGain },
        });
        if (ev.dropId) {
          this.saga.record({
            age: this.hero.age,
            type: 'drop',
            narrativeText: NarrativeGenerator.forDrop({ age: this.hero.age, itemNameKR: ev.dropId }),
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
