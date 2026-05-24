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
  // Cycle 6 P1: flat snapshot aliases — sagaHistory[] item 을 단일 카드 UI 에서
  // 한 번에 binding 하기 위함. nested `hero.finalXxx` 와 동일 값. finalRealm 은
  // 신규 (이전엔 어디에도 없었음).
  //
  // PRD scope 명시: 기존 cycle 5 이전 stale item 은 retroactive migration 안 함.
  // 즉 v23 이하 persist 에서 깨어난 stale item 은 본 field 가 `undefined` 일 수
  // 있다 → `?:` optional 로 type 정직성 유지. UI 소비자는 `??` fallback 처리.
  // 새 finalize() 가 만든 item 은 항상 5 field 모두 채워진다 (PRD 수용 c).
  finalLevel?: number;
  finalAge?: number;
  finalRealm?: import('../types').RealmId;
  deathCause?: DeathCause;
  finishedAt?: number;
}
