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
  | 'rejuvenation'
  | 'death'
  // V3-H F3/F4/F5: new event types
  | 'sightseeing'
  | 'meditation'
  | 'trial'
  | 'seasonChange'
  // Cycle-1 F2: realm transition saga record (forRealmEnter wire)
  | 'realmEnter'
  // Cycle-1 F3: NPC dead-path 회수 (handleArrival recordToStore wire)
  | 'npcEncounter'
  | 'npcDeath'
  | 'familyEvent';

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
