import type { EternalSagaState, RealmId } from '../types';
import type { SagaEvent } from './SagaTypes';
import type { Chapter } from '../hero/HeroLifecycle';

// Cycle 33 (cycle 3 D6 carry-over) — era key dynamic title.
// 0 회: "본래 어린시절" / "본래 청년기" 등 (시초 영혼).
// 1-2 회: "재생 #N 어린시절" — 회춘 의식 후 재시작.
// 3+ 회: "환생 #N 어린시절" — 영원한 영웅의 다회 회춘 변모.
export function eraKeyFor(chapter: Chapter, rejuvCount: number): string {
  if (rejuvCount === 0) return `본래 ${chapter}`;
  if (rejuvCount < 3) return `재생 #${rejuvCount} ${chapter}`;
  return `환생 #${rejuvCount} ${chapter}`;
}

export function appendEvent(
  state: EternalSagaState,
  event: SagaEvent,
  currentChapter: Chapter,
): EternalSagaState {
  const key = eraKeyFor(currentChapter, state.rejuvenationCount);
  const existing = state.chaptersByEra[key];
  const newEra = existing
    ? { ...existing, events: [...existing.events, event] }
    : { eraKey: key, chapter: currentChapter, rejuvCount: state.rejuvenationCount, events: [event] };
  return {
    ...state,
    events: [...state.events, event],
    chaptersByEra: { ...state.chaptersByEra, [key]: newEra },
  };
}

export function recordRejuvenation(state: EternalSagaState): EternalSagaState {
  return { ...state, rejuvenationCount: state.rejuvenationCount + 1 };
}

export function recordRealmTransition(
  state: EternalSagaState,
  from: RealmId,
  to: RealmId,
  atAge: number,
  currentChapter: Chapter,
): EternalSagaState {
  const key = eraKeyFor(currentChapter, state.rejuvenationCount);
  return {
    ...state,
    realmTransitions: [...state.realmTransitions, { from, to, atAge, eraKey: key }],
  };
}
