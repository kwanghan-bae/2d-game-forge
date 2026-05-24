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

// Cycle-5 F3: '무위' = pathfinder candidates-exhausted (출구 없음 / 길을 잃다).
// 진짜 자연 수명 도달과 명확히 구분되어야 동급 stale-realm bug 가 즉시 보임.
export type DeathCause = '전사' | '자연사' | '영광스러운죽음' | '비극' | '무위';

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
