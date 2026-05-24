import { describe, expect, it } from 'vitest';
import { eraKeyFor, appendEvent, recordRejuvenation, recordRealmTransition } from '../EternalSaga';
import type { EternalSagaState } from '../../types';
import type { SagaEventType } from '../SagaTypes';

const empty: EternalSagaState = { events: [], chaptersByEra: {}, rejuvenationCount: 0, realmTransitions: [] };

describe('eraKeyFor', () => {
  it('rejuvCount 0 → "본래 X"', () => expect(eraKeyFor('어린시절', 0)).toBe('본래 어린시절'));
  it('rejuvCount 2 → "재생 #2 X"', () => expect(eraKeyFor('청년기', 2)).toBe('재생 #2 청년기'));
});

describe('appendEvent', () => {
  it('appends to events + chaptersByEra', () => {
    const e = { age: 10, type: 'battle' as const, narrativeText: '...', payload: {} as Record<string, unknown> };
    const next = appendEvent(empty, e, '어린시절');
    expect(next.events).toHaveLength(1);
    expect(next.chaptersByEra['본래 어린시절'].events).toHaveLength(1);
  });
  it('grouping by era key', () => {
    const e1 = { age: 10, type: 'battle' as const, narrativeText: '1', payload: {} as Record<string, unknown> };
    const e2 = { age: 12, type: 'battle' as const, narrativeText: '2', payload: {} as Record<string, unknown> };
    let s = appendEvent(empty, e1, '어린시절');
    s = appendEvent(s, e2, '어린시절');
    expect(s.chaptersByEra['본래 어린시절'].events).toHaveLength(2);
  });
  it('different chapters create separate era entries', () => {
    const e1 = { age: 10, type: 'battle' as const, narrativeText: '1', payload: {} as Record<string, unknown> };
    const e2 = { age: 20, type: 'levelUp' as const, narrativeText: '2', payload: {} as Record<string, unknown> };
    let s = appendEvent(empty, e1, '어린시절');
    s = appendEvent(s, e2, '청년기');
    expect(Object.keys(s.chaptersByEra)).toHaveLength(2);
    expect(s.events).toHaveLength(2);
  });
});

describe('recordRejuvenation', () => {
  it('increments rejuvenationCount', () => {
    const next = recordRejuvenation(empty);
    expect(next.rejuvenationCount).toBe(1);
  });
  it('double increment', () => {
    const next = recordRejuvenation(recordRejuvenation(empty));
    expect(next.rejuvenationCount).toBe(2);
  });
});

describe('recordRealmTransition', () => {
  it('appends transition', () => {
    const next = recordRealmTransition(empty, 'base', 'sea', 25, '청년기');
    expect(next.realmTransitions).toHaveLength(1);
    expect(next.realmTransitions[0].to).toBe('sea');
  });
  it('stores correct eraKey', () => {
    const next = recordRealmTransition(empty, 'base', 'volcano', 30, '장년기');
    expect(next.realmTransitions[0].eraKey).toBe('본래 장년기');
    expect(next.realmTransitions[0].atAge).toBe(30);
  });
});

describe('Cycle 1 F2 — SagaEventType 등록', () => {
  it('F2.13: realmEnter + seasonChange 등록됨 (camelCase 컨벤션 유지)', () => {
    // type-only 가드 — 다음이 컴파일되면 등록된 것
    const a: SagaEventType = 'realmEnter';
    const b: SagaEventType = 'seasonChange';
    expect(a).toBe('realmEnter');
    expect(b).toBe('seasonChange');
  });
  it('F2.13b: appendEvent realmEnter → era chapter events 에 들어감', () => {
    const ev = {
      age: 25,
      type: 'realmEnter' as const,
      narrativeText: '(25세) 바다 안개가 발치까지 올라왔다.',
      payload: { from: 'base', to: 'sea' } as Record<string, unknown>,
    };
    const next = appendEvent(empty, ev, '청년기');
    expect(next.events).toHaveLength(1);
    expect(next.chaptersByEra['본래 청년기'].events[0].type).toBe('realmEnter');
  });
});
