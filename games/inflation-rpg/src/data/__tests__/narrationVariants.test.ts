/**
 * Cycle 101 — realmTone dispatcher + 6 realm × 4 variant catalog.
 *
 * 호출 sequence (NarrationVariants.battle/levelUp/drop/levelUpBatch 안):
 *   pick → ageTone → realmTone
 *
 * realmTone 정책:
 *   - realm === null/undefined → text 그대로 (no-op)
 *   - seed === 0 → variant 0 = 원문 그대로 (backward compat)
 *   - else variant = seed % 4. variant 0 → 원문 그대로
 *   - variant 1-3 → "${text} ${suffix}." 형태로 본문 끝에 사이절 어휘 append
 *
 * Composition order:
 *   ageTone 의 `^${age}세에 ` prefix-replace 영역과 realmTone 의 본문-끝-append
 *   영역은 절대 겹치지 않음. 둘 다 적용되어도 충돌 0.
 */
import { describe, expect, it } from 'vitest';
import { realmTone, NarrationVariants, pickWeighted, ALL_NARRATION_TONES, NARRATION_TONE_LABEL_KR, getNarrationToneLabel } from '../narrationVariants';
import type { TaggedVariant } from '../narrationVariants';
import type { RealmId } from '../../types';

describe('Cycle 101 F1 — realmTone dispatcher (backward compat)', () => {
  const SAMPLE = '15세에 늑대를 압도했다.';

  it('seed=0 → 원문 그대로 (모든 realm)', () => {
    const REALMS: RealmId[] = ['base', 'sea', 'volcano', 'underworld', 'heaven', 'chaos'];
    for (const realm of REALMS) {
      expect(realmTone(SAMPLE, realm, 0)).toBe(SAMPLE);
    }
  });

  it('realm=null → 원문 그대로 (어떤 seed 든)', () => {
    expect(realmTone(SAMPLE, null, 0)).toBe(SAMPLE);
    expect(realmTone(SAMPLE, null, 1)).toBe(SAMPLE);
    expect(realmTone(SAMPLE, null, 7)).toBe(SAMPLE);
    expect(realmTone(SAMPLE, null, 42)).toBe(SAMPLE);
  });

  it('realm=undefined → 원문 그대로 (어떤 seed 든)', () => {
    expect(realmTone(SAMPLE, undefined, 0)).toBe(SAMPLE);
    expect(realmTone(SAMPLE, undefined, 1)).toBe(SAMPLE);
    expect(realmTone(SAMPLE, undefined, 13)).toBe(SAMPLE);
  });

  it('seed % 4 === 0 (and seed !== 0) → 원문 그대로 (모든 realm)', () => {
    // variant 0 = 원문 그대로 (backward compat)
    const REALMS: RealmId[] = ['base', 'sea', 'volcano', 'underworld', 'heaven', 'chaos'];
    for (const realm of REALMS) {
      expect(realmTone(SAMPLE, realm, 4)).toBe(SAMPLE);
      expect(realmTone(SAMPLE, realm, 8)).toBe(SAMPLE);
      expect(realmTone(SAMPLE, realm, 100)).toBe(SAMPLE);
    }
  });
});

describe('Cycle 101 F1 — realmTone catalog (6 realm × 3 non-zero variant)', () => {
  const SAMPLE = '15세에 늑대를 압도했다.';

  it('base realm — variant 1/2/3 어휘 append', () => {
    expect(realmTone(SAMPLE, 'base', 1)).toBe(`${SAMPLE} 들판에서.`);
    expect(realmTone(SAMPLE, 'base', 2)).toBe(`${SAMPLE} 바람에 흔들리며.`);
    expect(realmTone(SAMPLE, 'base', 3)).toBe(`${SAMPLE} 흙냄새 속에서.`);
  });

  it('sea realm — variant 1/2/3 어휘 append', () => {
    expect(realmTone(SAMPLE, 'sea', 1)).toBe(`${SAMPLE} 파도 곁에서.`);
    expect(realmTone(SAMPLE, 'sea', 2)).toBe(`${SAMPLE} 심해의 침묵 속.`);
    expect(realmTone(SAMPLE, 'sea', 3)).toBe(`${SAMPLE} 갯바람을 가르며.`);
  });

  it('volcano realm — variant 1/2/3 어휘 append', () => {
    expect(realmTone(SAMPLE, 'volcano', 1)).toBe(`${SAMPLE} 용암의 열기 속.`);
    expect(realmTone(SAMPLE, 'volcano', 2)).toBe(`${SAMPLE} 검은 재 위에서.`);
    expect(realmTone(SAMPLE, 'volcano', 3)).toBe(`${SAMPLE} 붉은 빛을 받으며.`);
  });

  it('underworld realm — variant 1/2/3 어휘 append', () => {
    expect(realmTone(SAMPLE, 'underworld', 1)).toBe(`${SAMPLE} 황천의 그림자 속.`);
    expect(realmTone(SAMPLE, 'underworld', 2)).toBe(`${SAMPLE} 차가운 손 사이.`);
    expect(realmTone(SAMPLE, 'underworld', 3)).toBe(`${SAMPLE} 꺼진 빛 너머에서.`);
  });

  it('heaven realm — variant 1/2/3 어휘 append', () => {
    expect(realmTone(SAMPLE, 'heaven', 1)).toBe(`${SAMPLE} 빛의 다리 위.`);
    expect(realmTone(SAMPLE, 'heaven', 2)).toBe(`${SAMPLE} 구름의 결 사이.`);
    expect(realmTone(SAMPLE, 'heaven', 3)).toBe(`${SAMPLE} 별빛 가루를 밟으며.`);
  });

  it('chaos realm — variant 1/2/3 어휘 append', () => {
    expect(realmTone(SAMPLE, 'chaos', 1)).toBe(`${SAMPLE} 혼돈의 중심에서.`);
    expect(realmTone(SAMPLE, 'chaos', 2)).toBe(`${SAMPLE} 시간을 잊은 곳.`);
    expect(realmTone(SAMPLE, 'chaos', 3)).toBe(`${SAMPLE} 경계가 흐려진 자리에서.`);
  });
});

describe('Cycle 101 F1 — realmTone determinism + ageTone composition', () => {
  it('동일 (text, realm, seed) → 동일 결과 (deterministic)', () => {
    for (let s = 0; s < 20; s++) {
      const a = realmTone('30세에 도적을 베어넘겼다.', 'sea', s);
      const b = realmTone('30세에 도적을 베어넘겼다.', 'sea', s);
      expect(a).toBe(b);
    }
  });

  it('ageTone × realmTone 동시 적용 시 충돌 0 — prefix replace + suffix append', () => {
    // ageTone 은 `^15세에 ` → `15세 청춘에 ` (variant 1, age 13-29)
    // realmTone 은 본문 끝에 ` 파도 곁에서.` append (sea variant 1)
    // 동시에 적용해도 두 영역이 겹치지 않으므로 둘 다 작동.
    const out = NarrationVariants.battle(
      { age: 15, enemyNameKR: '늑대', realm: 'sea' },
      1,
    );
    // ageTone 적용 결과 prefix
    expect(out.startsWith('15세 청춘에 ')).toBe(true);
    // realmTone 적용 결과 suffix (variant 1 = 파도 곁에서.)
    expect(out.endsWith(' 파도 곁에서.')).toBe(true);
  });
});

describe('Cycle 101 F2 — NarrationVariants ctx.realm wiring', () => {
  it('battle: realm 누락 또는 null → 원문 그대로 (graceful degrade)', () => {
    // seed=0 → variant 0 (원문 그대로)
    const noRealm = NarrationVariants.battle({ age: 12, enemyNameKR: '늑대' }, 0);
    const nullRealm = NarrationVariants.battle({ age: 12, enemyNameKR: '늑대', realm: null }, 0);
    const undefRealm = NarrationVariants.battle({ age: 12, enemyNameKR: '늑대', realm: undefined }, 0);
    expect(noRealm).toBe(nullRealm);
    expect(noRealm).toBe(undefRealm);
  });

  it('battle: realm=sea, seed=1 → sea 어휘 (파도 곁에서) suffix', () => {
    const out = NarrationVariants.battle(
      { age: 12, enemyNameKR: '늑대', realm: 'sea' },
      1,
    );
    expect(out).toContain('파도 곁에서');
  });

  it('drop: realm=volcano, seed=1 → volcano 어휘 (용암의 열기 속) suffix', () => {
    const out = NarrationVariants.drop(
      { age: 20, itemNameKR: '낡은 검', realm: 'volcano' },
      1,
    );
    expect(out).toContain('용암의 열기 속');
  });

  it('levelUp: realm=heaven, seed=1 → heaven 어휘 (빛의 다리 위) suffix', () => {
    const out = NarrationVariants.levelUp(
      { age: 30, newLevel: 24, realm: 'heaven' },
      1,
    );
    expect(out).toContain('빛의 다리 위');
  });

  it('levelUpBatch: realm=underworld, seed=1 → underworld 어휘 (황천의 그림자 속) suffix', () => {
    const out = NarrationVariants.levelUpBatch(
      { age: 35, fromLevel: 100, toLevel: 150, count: 50, realm: 'underworld' },
      1,
    );
    expect(out).toContain('황천의 그림자 속');
  });

  it('regression: 기존 호출자 (ctx 에 realm 없음) — battle 호출이 throw 0', () => {
    // 회귀 보호: legacy test fixture 가 realm 없이 호출해도 동작.
    expect(() => NarrationVariants.battle({ age: 5, enemyNameKR: '늑대' }, 0)).not.toThrow();
    expect(() => NarrationVariants.battle({ age: 5, enemyNameKR: '늑대' }, 7)).not.toThrow();
    expect(() => NarrationVariants.drop({ age: 5, itemNameKR: '검' }, 7)).not.toThrow();
    expect(() => NarrationVariants.levelUp({ age: 5, newLevel: 2 }, 7)).not.toThrow();
  });
});

describe('Cycle 102 F1 — 5 additional channels (shrine/moral/skill/job)', () => {
  it('shrineHealed: realm wired — heaven suffix 등장', () => {
    const out = NarrationVariants.shrineHealed({ age: 30, healed: 500, realm: 'heaven' }, 1);
    expect(out).toContain('빛의 다리 위');
  });

  it('shrineCalm: realm wired — sea suffix 등장', () => {
    const out = NarrationVariants.shrineCalm({ age: 25, realm: 'sea' }, 1);
    expect(out).toContain('파도 곁에서');
  });

  it('moralChoice: realm wired — volcano suffix 등장', () => {
    const out = NarrationVariants.moralChoice({ age: 40, choiceNameKR: '구원의 길', realm: 'volcano' }, 2);
    expect(out).toContain('검은 재 위에서');
  });

  it('skillLearned: realm wired — underworld suffix 등장', () => {
    const out = NarrationVariants.skillLearned({ age: 45, skillNameKR: '죽음의 일격', realm: 'underworld' }, 3);
    expect(out).toContain('꺼진 빛 너머에서');
  });

  it('jobUnlock: realm wired — chaos suffix 등장', () => {
    const out = NarrationVariants.jobUnlock({ age: 50, jobNameKR: '광기의 마도사', tier: 3, realm: 'chaos' }, 1);
    expect(out).toContain('혼돈의 중심에서');
  });

  it('regression: 5 channel — realm 없이 호출 throw 0', () => {
    expect(() => NarrationVariants.shrineHealed({ age: 5, healed: 100 }, 7)).not.toThrow();
    expect(() => NarrationVariants.shrineCalm({ age: 5 }, 7)).not.toThrow();
    expect(() => NarrationVariants.moralChoice({ age: 5, choiceNameKR: '결단' }, 7)).not.toThrow();
    expect(() => NarrationVariants.skillLearned({ age: 5, skillNameKR: '검술' }, 7)).not.toThrow();
    expect(() => NarrationVariants.jobUnlock({ age: 5, jobNameKR: '전사', tier: 1 }, 7)).not.toThrow();
  });

  it('seed=0 backward compat: 5 channel 모두 realm 무시', () => {
    const realms: RealmId[] = ['base', 'sea', 'volcano', 'underworld', 'heaven', 'chaos'];
    for (const realm of realms) {
      const a = NarrationVariants.shrineHealed({ age: 30, healed: 100, realm }, 0);
      const b = NarrationVariants.shrineHealed({ age: 30, healed: 100 }, 0);
      expect(a).toBe(b);
    }
  });
});

/** Cycle 207 — ALL_NARRATION_TONES length 5 invariant. union 변경 시 동기화 가드. */
describe('Cycle 207 — ALL_NARRATION_TONES', () => {
  it('5 tone 모두 정의 (cycle 161 union 정합)', () => {
    expect(ALL_NARRATION_TONES.length).toBe(5);
    expect(ALL_NARRATION_TONES).toContain('elegy');
    expect(ALL_NARRATION_TONES).toContain('tragedy');
    expect(ALL_NARRATION_TONES).toContain('ode');
    expect(ALL_NARRATION_TONES).toContain('hymn');
    expect(ALL_NARRATION_TONES).toContain('neutral');
  });
});

/** Cycle 218 — getNarrationToneLabel unknown string → undefined invariant. */
describe('Cycle 218 — getNarrationToneLabel', () => {
  it('unknown string → undefined', () => {
    expect(getNarrationToneLabel('not-a-tone')).toBeUndefined();
    expect(getNarrationToneLabel('')).toBeUndefined();
  });
  it('정의된 tone → label', () => {
    expect(getNarrationToneLabel('elegy')).toBe('비가');
    expect(getNarrationToneLabel('ode')).toBe('송가');
  });
});

/** Cycle 213 — NARRATION_TONE_LABEL_KR invariant: 5 tone 모두 1-5자 한국어 label. */
describe('Cycle 213 — NARRATION_TONE_LABEL_KR', () => {
  it('5 tone 모두 1-5자 한국어 label', () => {
    for (const tone of ['elegy', 'tragedy', 'ode', 'hymn', 'neutral'] as const) {
      const label = NARRATION_TONE_LABEL_KR[tone];
      expect(label, `${tone} label`).toBeDefined();
      expect(label.length, `${tone} label length`).toBeGreaterThanOrEqual(1);
      expect(label.length, `${tone} label length`).toBeLessThanOrEqual(5);
    }
  });
});

/** Cycle 161 — pickWeighted helper (story-writer #1 wire 의 type-foundation). */
describe('Cycle 161 — pickWeighted helper', () => {
  // 3-variant pool: ode / hymn / neutral
  const pool: TaggedVariant<{ name: string }>[] = [
    { fn: (c) => `${c.name} 의 송가`, tone: 'ode' },
    { fn: (c) => `${c.name} 의 찬미`, tone: 'hymn' },
    { fn: (c) => `${c.name} 의 평범한 한 줄`, tone: 'neutral' },
  ];

  it('weights 미지정 → plain modulo (기존 pick 동등)', () => {
    expect(pickWeighted(pool, { name: 'A' }, 0)).toBe('A 의 송가');
    expect(pickWeighted(pool, { name: 'A' }, 1)).toBe('A 의 찬미');
    expect(pickWeighted(pool, { name: 'A' }, 2)).toBe('A 의 평범한 한 줄');
    // wrap
    expect(pickWeighted(pool, { name: 'A' }, 3)).toBe('A 의 송가');
  });

  it('ode ×2 weight + seed != 0 → ode 가 더 자주 등장', () => {
    // total weight = 2 + 1 + 1 = 4. seed 1 → pickPoint 1 < 2 (ode).
    expect(pickWeighted(pool, { name: 'A' }, 1, { ode: 2 })).toBe('A 의 송가');
    // seed 5 → pickPoint 1 → ode 영역 (1 < 2).
    expect(pickWeighted(pool, { name: 'A' }, 5, { ode: 2 })).toBe('A 의 송가');
  });

  it('ode weight=0 → ode 후보 제외', () => {
    // total = 0 + 1 + 1 = 2. seed 1 → pickPoint 1, hymn=1+1=2, ode skip.
    expect(pickWeighted(pool, { name: 'A' }, 1, { ode: 0 })).toBe('A 의 평범한 한 줄');
  });

  it('seed=0 + weights → 첫 non-zero weight variant (deterministic)', () => {
    expect(pickWeighted(pool, { name: 'A' }, 0, { ode: 2 })).toBe('A 의 송가');
    // ode=0 + hymn=2 → 첫 non-zero = hymn (idx 1)
    expect(pickWeighted(pool, { name: 'A' }, 0, { ode: 0, hymn: 2 })).toBe('A 의 찬미');
  });

  it('all weights 0 → fallback plain modulo', () => {
    expect(pickWeighted(pool, { name: 'A' }, 1, { ode: 0, hymn: 0, neutral: 0 })).toBe('A 의 찬미');
  });

  it('empty array → throw', () => {
    expect(() => pickWeighted([], { name: 'A' }, 0)).toThrow();
  });
});
