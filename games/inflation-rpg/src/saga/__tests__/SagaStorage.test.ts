import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { SagaStorage } from '../SagaStorage';
import type { CycleSaga } from '../SagaTypes';

const stubSaga = (cycleId: string): CycleSaga => ({
  cycleId,
  endedAtMs: Date.now(),
  hero: { name: 'a', seed: 1, finalAge: 5, finalJob: '평민', finalLevel: 1, finalPersonality: { moral:0,prudent:0,heroic:0,merciful:0,pious:0 }, cause: '자연사' },
  chapters: [],
  highlightEvents: [],
});

describe('SagaStorage', () => {
  beforeEach(() => {
    useGameStore.setState(s => ({ ...s, meta: { ...s.meta, sagaHistory: [] } }));
  });

  it('append pushes to gameStore.meta.sagaHistory', () => {
    SagaStorage.append(stubSaga('cyc1'));
    expect(useGameStore.getState().meta.sagaHistory.length).toBe(1);
    expect(useGameStore.getState().meta.sagaHistory[0].cycleId).toBe('cyc1');
  });

  it('caps at 100 entries (FIFO)', () => {
    for (let i = 0; i < 110; i++) SagaStorage.append(stubSaga(`c${i}`));
    expect(useGameStore.getState().meta.sagaHistory.length).toBe(100);
    expect(useGameStore.getState().meta.sagaHistory[0].cycleId).toBe('c10');
    expect(useGameStore.getState().meta.sagaHistory[99].cycleId).toBe('c109');
  });
});
