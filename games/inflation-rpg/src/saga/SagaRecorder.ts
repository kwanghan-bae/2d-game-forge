import type { CycleSaga, SagaChapter, SagaEvent, DeathCause } from './SagaTypes';
import { HeroLifecycle } from '../hero/HeroLifecycle';
import type { PersonalitySnapshot } from '../hero/PersonalityState';

interface FinalizeOpts {
  finalAge: number;
  finalJob: string;
  finalLevel: number;
  finalPersonality: PersonalitySnapshot;
  cause: DeathCause;
  /** Cycle 6 P1: realm hero was in when the cycle ended. Surfaced as flat
   *  `finalRealm` field on CycleSaga for sagaHistory card UI. Caller (=
   *  CycleControllerV2.finalize) passes `controller.getCurrentRealmId() ??
   *  'base'` so we never produce undefined. Typed as `string` to dodge the
   *  types.ts ↔ SagaTypes.ts cycle (see CycleSaga 정의 주석). */
  finalRealm: string;
}

export class SagaRecorder {
  private events: SagaEvent[] = [];

  constructor(
    private readonly heroName: string,
    private readonly seed: number,
  ) {}

  record(event: SagaEvent): void {
    this.events.push(event);
  }

  /** Read-only accessor for the saga events collected so far. Used by
   *  OverworldRunner's event log overlay to display the same batched
   *  narrative the post-cycle SagaBook will show. */
  getEvents(): readonly SagaEvent[] {
    return this.events;
  }

  finalize(opts: FinalizeOpts): CycleSaga {
    const chapters: SagaChapter[] = [
      { name: '어린시절', events: [] },
      { name: '청년기', events: [] },
      { name: '장년기', events: [] },
      { name: '노년기', events: [] },
      { name: '마지막', events: [] },
    ];
    for (const ev of this.events) {
      const ch = HeroLifecycle.chapterForAge(ev.age);
      const target = chapters.find(c => c.name === ch);
      target?.events.push(ev);
    }
    const highlightEvents = this.events.filter(e => ['levelUp', 'death', 'drop'].includes(e.type)).slice(-6);
    // Cycle 6 P1: snapshot Date.now() once to keep endedAtMs / finishedAt
    // identical — UI / sort 가 둘을 동시에 쓰는 경우 1ms drift 가 없게.
    const finishedAt = Date.now();
    return {
      cycleId: `cycle_${this.seed}_${finishedAt}`,
      endedAtMs: finishedAt,
      hero: {
        name: this.heroName,
        seed: this.seed,
        finalAge: opts.finalAge,
        finalJob: opts.finalJob,
        finalLevel: opts.finalLevel,
        finalPersonality: opts.finalPersonality,
        cause: opts.cause,
      },
      chapters,
      highlightEvents,
      // Cycle 6 P1: flat snapshot aliases (PRD acceptance criterion c).
      finalLevel: opts.finalLevel,
      finalAge: opts.finalAge,
      finalRealm: opts.finalRealm,
      deathCause: opts.cause,
      finishedAt,
    };
  }
}
