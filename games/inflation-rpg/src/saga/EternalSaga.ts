import type { EternalSagaState, RealmId } from '../types';
import type { SagaEvent } from './SagaTypes';
import type { Chapter } from '../hero/HeroLifecycle';

export function eraKeyFor(chapter: Chapter, rejuvCount: number): string {
  return rejuvCount === 0 ? `본래 ${chapter}` : `재생 #${rejuvCount} ${chapter}`;
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
