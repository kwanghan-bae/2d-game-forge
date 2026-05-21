import { describe, it, expect } from 'vitest';
import { SagaRecorder } from '../SagaRecorder';
import type { SagaEvent } from '../SagaTypes';

describe('SagaRecorder', () => {
  it('records events in order', () => {
    const rec = new SagaRecorder('홍길동', 42);
    rec.record({ age: 7, type: 'battle', narrativeText: '늑대를 처치했다', payload: {} });
    rec.record({ age: 10, type: 'levelUp', narrativeText: 'LV 5 도달', payload: {} });
    const saga = rec.finalize({
      finalAge: 10,
      finalJob: '평민',
      finalLevel: 5,
      finalPersonality: { moral: 0, prudent: 0, heroic: 0, merciful: 0, pious: 0 },
      cause: '전사',
    });
    expect(saga.hero.name).toBe('홍길동');
    expect(saga.chapters.flatMap(c => c.events).length).toBe(2);
    expect(saga.hero.cause).toBe('전사');
  });

  it('groups events into chapters by age', () => {
    const rec = new SagaRecorder('이몽룡', 7);
    rec.record({ age: 8, type: 'battle', narrativeText: 'x', payload: {} });
    rec.record({ age: 22, type: 'battle', narrativeText: 'y', payload: {} });
    rec.record({ age: 55, type: 'death', narrativeText: 'z', payload: {} });
    const saga = rec.finalize({ finalAge: 55, finalJob: '평민', finalLevel: 1, finalPersonality: { moral: 0, prudent: 0, heroic: 0, merciful: 0, pious: 0 }, cause: '자연사' });
    const childhood = saga.chapters.find(c => c.name === '어린시절');
    const young = saga.chapters.find(c => c.name === '청년기');
    const old = saga.chapters.find(c => c.name === '노년기');
    expect(childhood?.events.length).toBe(1);
    expect(young?.events.length).toBe(1);
    expect(old?.events.length).toBe(1);
  });
});
