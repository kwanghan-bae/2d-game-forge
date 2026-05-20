import type { Chapter } from '../hero/HeroLifecycle';
import type { PersonalitySnapshot } from '../hero/PersonalityState';

export type SagaEventType =
  | 'birth'
  | 'battle'
  | 'levelUp'
  | 'drop'
  | 'jobUnlock'
  | 'skillLearned'
  | 'shrine'
  | 'moralChoice'
  | 'death';

export type DeathCause = '전사' | '자연사' | '영광스러운죽음' | '비극';

export interface SagaEvent {
  age: number;
  type: SagaEventType;
  narrativeText: string;
  payload: Record<string, unknown>;
}

export interface SagaChapter {
  name: Chapter;
  events: SagaEvent[];
}

export interface CycleSaga {
  cycleId: string;
  endedAtMs: number;
  hero: {
    name: string;
    seed: number;
    finalAge: number;
    finalJob: string;
    finalLevel: number;
    finalPersonality: PersonalitySnapshot;
    cause: DeathCause;
  };
  chapters: SagaChapter[];
  highlightEvents: SagaEvent[];
}
