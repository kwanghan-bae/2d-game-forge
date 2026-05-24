import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

describe('Cycle 1 F3 — NPC narrative generators', () => {
  it('F3.1: forNpcEncounter(mentor, 22) → string', () => {
    const r = NarrativeGenerator.forNpcEncounter({ age: 22, kind: 'mentor' });
    expect(typeof r).toBe('string');
    expect(r.length).toBeGreaterThan(0);
  });

  it('F3.2: forNpcEncounter 3 kind 각 3+ variant', () => {
    for (const kind of ['mentor', 'rival', 'passerby'] as const) {
      const s = new Set<string>();
      for (let i = 0; i < 100; i++) {
        s.add(NarrativeGenerator.forNpcEncounter({ age: 22 + i, kind }, i));
      }
      expect(s.size).toBeGreaterThanOrEqual(3);
    }
  });

  it('F3.3: forNpcDeath → string + 3+ variant', () => {
    const s = new Set<string>();
    for (let i = 0; i < 100; i++) {
      s.add(NarrativeGenerator.forNpcDeath({ age: 50 + i }, i));
    }
    expect(s.size).toBeGreaterThanOrEqual(3);
    expect(typeof [...s][0]).toBe('string');
  });

  it('F3.4: forFamilyEvent(marriage, 30) → string', () => {
    const r = NarrativeGenerator.forFamilyEvent({ age: 30, type: 'marriage' });
    expect(typeof r).toBe('string');
    expect(r.length).toBeGreaterThan(0);
  });

  it('F3.5: forFamilyEvent 3 type 각 2+ variant', () => {
    for (const type of ['marriage', 'child_born', 'child_grown'] as const) {
      const s = new Set<string>();
      for (let i = 0; i < 50; i++) {
        s.add(NarrativeGenerator.forFamilyEvent({ age: 30 + i, type }, i));
      }
      expect(s.size).toBeGreaterThanOrEqual(2);
    }
  });

  it('F3.6: forNpcEncounter 반환에 "N세" 포함', () => {
    const r = NarrativeGenerator.forNpcEncounter({ age: 22, kind: 'mentor' });
    expect(r).toMatch(/\d+세/);
  });
});

describe('Cycle 3 F1 — 이중 괄호 prefix bug fix', () => {
  // sim-cycle-v2.ts:330 의 renderer 가 `- (${age}세) ${narrativeText}` 형태로
  // prefix 를 prepend 한다. variant 의 leading `(AGE세) ` prefix 가 함께 있으면
  // `(6세) (6세) ...` 이중 prefix 가 된다 (cycle-3-story-critic 발견).
  //
  // 정책 (option A): variant text 는 leading `(N세) ` prefix 로 시작하지 않는다.
  // 본문에 자연어 `${age}세에 ...` 형태로 age 를 포함시켜 cycle-2 baseline 컨벤션과 통일.

  const LEADING_PAREN_PREFIX_RE = /^\(\d+세\)/;

  it('forRealmEnter — 모든 realm × 100 seed: leading "(N세) " prefix 부재', () => {
    const REALMS = ['base', 'sea', 'volcano', 'underworld', 'heaven', 'chaos'] as const;
    for (const realm of REALMS) {
      for (let i = 0; i < 100; i++) {
        const txt = NarrativeGenerator.forRealmEnter({ age: 5 + i, realm }, i);
        expect(txt).not.toMatch(LEADING_PAREN_PREFIX_RE);
      }
    }
  });

  it('forSeasonChange — 4 season × 6 realm × 30 seed: leading "(N세) " prefix 부재', () => {
    const SEASONS = ['spring', 'summer', 'fall', 'winter'] as const;
    const REALMS = ['base', 'sea', 'volcano', 'underworld', 'heaven', 'chaos'] as const;
    for (const season of SEASONS) {
      for (const realm of REALMS) {
        for (let i = 0; i < 30; i++) {
          const txt = NarrativeGenerator.forSeasonChange({ season, age: 20 + i, realm }, i);
          expect(txt).not.toMatch(LEADING_PAREN_PREFIX_RE);
        }
      }
    }
  });

  it('forNpcEncounter — 3 kind × 100 seed: leading "(N세) " prefix 부재', () => {
    for (const kind of ['mentor', 'rival', 'passerby'] as const) {
      for (let i = 0; i < 100; i++) {
        const txt = NarrativeGenerator.forNpcEncounter({ age: 22 + i, kind }, i);
        expect(txt).not.toMatch(LEADING_PAREN_PREFIX_RE);
      }
    }
  });

  it('forNpcDeath — 100 seed: leading "(N세) " prefix 부재', () => {
    for (let i = 0; i < 100; i++) {
      const txt = NarrativeGenerator.forNpcDeath({ age: 50 + i }, i);
      expect(txt).not.toMatch(LEADING_PAREN_PREFIX_RE);
    }
  });

  it('forFamilyEvent — 3 type × 50 seed: leading "(N세) " prefix 부재', () => {
    for (const type of ['marriage', 'child_born', 'child_grown'] as const) {
      for (let i = 0; i < 50; i++) {
        const txt = NarrativeGenerator.forFamilyEvent({ age: 30 + i, type }, i);
        expect(txt).not.toMatch(LEADING_PAREN_PREFIX_RE);
      }
    }
  });

  it('age 정보는 본문에 보존 — 첫 그룹 컨벤션 (`${age}세에 ...`) 과 통일', () => {
    // game UI consumer (SagaBookModal/OverworldRunner/CycleResultV2) 는
    // narrativeText 만 표시하고 prefix 를 prepend 하지 않음.
    // 따라서 age 정보는 본문 자연어에 보존되어야 한다.
    expect(NarrativeGenerator.forRealmEnter({ age: 13, realm: 'sea' })).toMatch(/\d+세/);
    expect(NarrativeGenerator.forSeasonChange({ season: 'summer', age: 20, realm: 'sea' })).toMatch(/\d+세/);
    expect(NarrativeGenerator.forNpcEncounter({ age: 22, kind: 'mentor' })).toMatch(/\d+세/);
    expect(NarrativeGenerator.forNpcDeath({ age: 60 })).toMatch(/\d+세/);
    expect(NarrativeGenerator.forFamilyEvent({ age: 30, type: 'marriage' })).toMatch(/\d+세/);
  });
});

describe('Cycle 1 F2.12 — hard-coded season literal 제거 가드', () => {
  // plan 의 위치는 OverworldRunner.tsx 였으나 코드 정황상 실제 hard-coded
  // interpolation 은 CycleControllerV2.ts:371 에 있었다. 그 라인을
  // NarrativeGenerator.forSeasonChange wire 로 교체했고, 회귀를 방지한다.
  it('F2.12: CycleControllerV2.ts 에 hard-coded "계절이 바뀌었다 — ${" interpolation 부재', () => {
    const src = readFileSync(
      join(__dirname, '..', '..', 'overworld', 'CycleControllerV2.ts'),
      'utf-8',
    );
    // template literal 형태의 hard-coded narrative 부재 검사
    expect(src).not.toMatch(/계절이 바뀌었다 — \$\{/);
    // positive 검사: NarrativeGenerator.forSeasonChange wire 존재
    expect(src).toContain('NarrativeGenerator.forSeasonChange');
  });

  it('F2.12b: CycleControllerV2.ts 에 NarrativeGenerator.forRealmEnter wire 존재', () => {
    const src = readFileSync(
      join(__dirname, '..', '..', 'overworld', 'CycleControllerV2.ts'),
      'utf-8',
    );
    expect(src).toContain('NarrativeGenerator.forRealmEnter');
  });
});
