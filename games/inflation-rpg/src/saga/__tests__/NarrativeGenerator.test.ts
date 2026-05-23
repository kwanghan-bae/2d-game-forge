import { describe, it, expect } from 'vitest';
import { NarrativeGenerator } from '../NarrativeGenerator';

describe('NarrativeGenerator', () => {
  it('battle event → "N세에 X를 처치했다" style', () => {
    const txt = NarrativeGenerator.forBattle({ age: 12, enemyNameKR: '늑대' });
    expect(txt).toContain('12세');
    expect(txt).toContain('늑대');
  });

  it('battle event picks correct josa — 받침 없음 → 를', () => {
    expect(NarrativeGenerator.forBattle({ age: 5, enemyNameKR: '늑대' })).toContain('늑대를');
    expect(NarrativeGenerator.forBattle({ age: 5, enemyNameKR: '치유' })).toContain('치유를');
  });

  it('battle event picks correct josa — 받침 있음 → 을', () => {
    expect(NarrativeGenerator.forBattle({ age: 5, enemyNameKR: '고블린' })).toContain('고블린을');
    expect(NarrativeGenerator.forBattle({ age: 5, enemyNameKR: '도적' })).toContain('도적을');
  });

  it('shrine with heal=0 uses a "평온" fallback narrative', () => {
    const zero = NarrativeGenerator.forShrine({ age: 5, healed: 0 });
    expect(zero).toContain('5세');
    expect(zero).toMatch(/평온|마음|안식/);
    expect(zero).not.toContain('0 회복');
  });

  it('shrine with heal>0 still uses the heal narrative', () => {
    const txt = NarrativeGenerator.forShrine({ age: 30, healed: 1500 });
    expect(txt).toContain('30세');
    expect(txt).toContain('1,500');
  });

  it('levelUp event → "N세에 영웅의 길에 들어섰다 (LV M)" style', () => {
    const txt = NarrativeGenerator.forLevelUp({ age: 15, newLevel: 24 });
    expect(txt).toContain('15세');
    expect(txt).toContain('24');
  });

  it('levelUp batch → "N세에 LV A → LV B 까지 C단계 폭풍 성장" form when count > 1', () => {
    const txt = NarrativeGenerator.forLevelUpBatch({ age: 35, fromLevel: 1200, toLevel: 1280, count: 80 });
    expect(txt).toContain('35세');
    expect(txt).toContain('1200');
    expect(txt).toContain('1280');
    expect(txt).toContain('80단계');
  });

  it('levelUp batch with count 1 → falls back to single-form', () => {
    const txt = NarrativeGenerator.forLevelUpBatch({ age: 15, fromLevel: 23, toLevel: 24, count: 1 });
    expect(txt).toBe(NarrativeGenerator.forLevelUp({ age: 15, newLevel: 24 }));
  });

  it('drop event → "N세에 X를 손에 넣었다" style', () => {
    const txt = NarrativeGenerator.forDrop({ age: 20, itemNameKR: '낡은 검' });
    expect(txt).toContain('20세');
    expect(txt).toContain('낡은 검');
  });

  it('death event → "N세에 X(으)로 쓰러졌다" or "안식을 맞았다"', () => {
    const txt = NarrativeGenerator.forDeath({ age: 35, cause: '전사', enemyNameKR: '용' });
    expect(txt).toContain('35세');
    expect(txt).toContain('용');
    const natural = NarrativeGenerator.forDeath({ age: 75, cause: '자연사' });
    expect(natural).toContain('75세');
    expect(natural).toMatch(/안식|잠들|자연/);
  });
});
