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

  it('rejuvenation → "N세에 빛의 은총으로 M년이 사라졌다 — 재생 #K"', () => {
    const txt = NarrativeGenerator.forRejuvenation({ age: 30, yearsBack: 5, rejuvenationCount: 2 });
    expect(txt).toContain('30세');
    expect(txt).toContain('5년');
    expect(txt).toContain('재생 #2');
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

describe('Cycle 1 F2 — forRealmEnter', () => {
  const REALMS = ['base', 'sea', 'volcano', 'underworld', 'heaven', 'chaos'] as const;

  it.each(REALMS)('F2.1-F2.7: forRealmEnter(%s, age) → string + 5+ unique variant', (realm) => {
    const samples = new Set<string>();
    for (let i = 0; i < 100; i++) {
      samples.add(NarrativeGenerator.forRealmEnter({ age: 13 + i, realm }, i));
    }
    expect(samples.size).toBeGreaterThanOrEqual(5);
    samples.forEach((s) => {
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    });
  });

  it('F2.8: forRealmEnter 결과에 "N세" 포함', () => {
    const result = NarrativeGenerator.forRealmEnter({ age: 13, realm: 'sea' });
    expect(result).toMatch(/\d+세/);
  });
});

describe('Cycle 1 F2 — forSeasonChange', () => {
  it('F2.9: forSeasonChange("spring", 20, "base") → string', () => {
    const r = NarrativeGenerator.forSeasonChange({ season: 'spring', age: 20, realm: 'base' });
    expect(typeof r).toBe('string');
    expect(r.length).toBeGreaterThan(0);
  });

  it('F2.10: 4 season 모두 throw 0', () => {
    for (const s of ['spring', 'summer', 'fall', 'winter'] as const) {
      expect(() => NarrativeGenerator.forSeasonChange({ season: s, age: 20, realm: 'base' })).not.toThrow();
    }
  });

  it('F2.11: realm-flavor prefix — sea/volcano summer 결과 다름', () => {
    const seaSet = new Set<string>();
    const volcanoSet = new Set<string>();
    for (let i = 0; i < 30; i++) {
      seaSet.add(NarrativeGenerator.forSeasonChange({ season: 'summer', age: 20 + i, realm: 'sea' }, i));
      volcanoSet.add(NarrativeGenerator.forSeasonChange({ season: 'summer', age: 20 + i, realm: 'volcano' }, i));
    }
    expect([...seaSet].some((s) => !volcanoSet.has(s))).toBe(true);
  });
});
