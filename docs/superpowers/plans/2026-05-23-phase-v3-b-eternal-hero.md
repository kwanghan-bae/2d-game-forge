# Phase V3-B — Eternal Hero (BP 폐기 + aging + 회춘) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** V2 cycle 메타포 (BP 100 = 한 일대기, BP 소진 → 자연사) 를 폐기하고 V3 영원 hero model (action-time aging + 디버프 + 회춘) 으로 전환.

**Architecture:** `HeroEntity` 의 `bp/bpMax/dead/consumeBp` 필드 / 메서드 제거. 새 필드 `actionCount: number` (매 arrival 마다 +1), `rejuvenationCount: number` (재생 마커). 새 helper `HeroLifecycle.ageFromActions(actions): number` 로 action → age 매핑 (70세 = 1000 actions). `EncounterEngine.consumeBp` 호출 제거. `CycleControllerV2.handleArrival` 가 매 호출마다 `hero.tickAge()` 호출. 새 helper `getAgingDebuff(age): { atkMul, hpMul, moveMul }` 가 50/70/100/200세 디버프 곱 반환. `recomputeStats` 가 디버프 적용. `hero.rejuvenate(years)` 메서드 + `rejuvenationCost(age) = (age-5) * 10` helper. `cycleSliceV2.rejuvenateHero(years)` action 이 light 자원 차감 + hero 호출. Saga 의 새 narrative "N세에 빛의 은총으로 M년이 사라졌다 — 재생 #K". Persist v19 = clean reset (모든 v18 state drop, meta.light = 0 부터 시작).

**Tech Stack:** TypeScript / Zustand 5 persist (version 19 migration) / Vitest / 기존 SeededRng / SagaRecorder / HeroEntity / EncounterEngine / CycleControllerV2.

---

## File Structure

**Modify:**
- `games/inflation-rpg/src/hero/HeroEntity.ts` — bp/bpMax/dead 제거, actionCount/rejuvenationCount 추가, tickAge()/rejuvenate()/staggered 추가
- `games/inflation-rpg/src/hero/__tests__/HeroEntity.test.ts` — bp/dead 관련 테스트 제거, action-time aging + rejuvenate 테스트 추가
- `games/inflation-rpg/src/hero/__tests__/HeroEntity.jobUnlock.test.ts` — bpMax opt 제거
- `games/inflation-rpg/src/hero/__tests__/HeroEntity.equipment.test.ts` — bpMax opt 제거
- `games/inflation-rpg/src/hero/HeroLifecycle.ts` — `ageFromActions(actions): number` 추가, `ageFromBpProgress` 제거
- `games/inflation-rpg/src/overworld/EncounterEngine.ts` — `hero.consumeBp(...)` 호출 7군데 모두 제거, `hero.dead` 체크 제거
- `games/inflation-rpg/src/overworld/__tests__/EncounterEngine.test.ts` — bp 관련 assertion 제거
- `games/inflation-rpg/src/overworld/__tests__/EncounterEngine.personality.test.ts` — 동일
- `games/inflation-rpg/src/overworld/CycleControllerV2.ts` — `if hero.dead` 제거, `hero.tickAge()` 호출 추가, `hero.staggered` 처리
- `games/inflation-rpg/src/overworld/__tests__/CycleControllerV2.test.ts` — bpMax 관련 테스트 제거/재작성
- `games/inflation-rpg/src/overworld/__tests__/CycleControllerV2.cycleDriver.test.ts` — 동일
- `games/inflation-rpg/src/overworld/__tests__/cycleSliceV2.test.ts` — bpMax 관련 제거
- `games/inflation-rpg/src/overworld/cycleSliceV2.ts` — `rejuvenateHero` action 추가
- `games/inflation-rpg/src/screens/OverworldRunner.tsx` — HUD 의 BP 자리 → 빛/재생 표시, 임시 회춘 버튼
- `games/inflation-rpg/src/screens/__tests__/OverworldRunner.test.tsx` — bpMax opt 제거 + BP HUD assertion 제거
- `games/inflation-rpg/src/screens/CyclePrepV2.tsx` — bpMax 가 opt 에서 사라지므로 그쪽 default
- `games/inflation-rpg/src/screens/__tests__/CycleResultV2.test.tsx` — bpMax 관련 제거
- `games/inflation-rpg/src/screens/__tests__/CyclePrepV2.test.tsx` — bpMax 관련 제거
- `games/inflation-rpg/src/saga/NarrativeGenerator.ts` — `forRejuvenation(opts)` 메서드 추가
- `games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts` — 재생 narrative 테스트
- `games/inflation-rpg/src/saga/SagaTypes.ts` — `SagaEventType` 에 `'rejuvenation'` 추가
- `games/inflation-rpg/src/store/gameStore.ts` — `version: 18` → `19`, `runStoreMigration` 가 v18 → v19 clean reset, `meta.light` 초기화
- `games/inflation-rpg/src/store/__tests__/gameStore.test.ts` — v19 migration 테스트 (v18 state drop, light=0)
- `games/inflation-rpg/scripts/sim-cycle-v2.ts` — bpMax opt 제거, action-time aging 으로 hero 진행

**Create:**
- `games/inflation-rpg/src/hero/agingDebuff.ts` — `getAgingDebuff(age): { atkMul, hpMul, moveMul }` 순수 함수
- `games/inflation-rpg/src/hero/__tests__/agingDebuff.test.ts`
- `games/inflation-rpg/src/hero/rejuvenation.ts` — `rejuvenationCost(age): number` 순수 함수
- `games/inflation-rpg/src/hero/__tests__/rejuvenation.test.ts`

**Decisions baked in (user-confirmed):**
1. BP 완전 폐기 (no energy reframe).
2. 회춘 cost = `(age - 5) * 10` 빛 (linear, age 5 미만 = 무효).
3. Persist v18 → v19 = clean reset (모든 v18 state drop, `meta.light = 0` 부터 시작).

---

### Task 1: Persist v19 schema + clean reset migration

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts:1216-1218` (version + migrate)
- Modify: `games/inflation-rpg/src/store/__tests__/gameStore.test.ts` (add v19 migration test)

**Why first:** All subsequent tasks rely on the new persist shape (`meta.light` 존재, `sponsorGold` 부재). If we land schema last, intermediate commits will fail tests that read `meta.light`.

- [ ] **Step 1: 새 migration test 작성**

`gameStore.test.ts` 의 적절한 위치 (기존 migration test 옆) 에 추가:

```ts
describe('persist v19 clean reset migration', () => {
  it('drops all v18 state and initializes meta.light = 0', () => {
    const v18State = {
      state: {
        meta: {
          sponsorGold: 1234,
          atkBaseBonus: 50,
          hpBaseBonus: 80,
          cycleHistory: [{ seed: 1, finalAge: 70 }],
        },
        inventory: { weapons: [{ id: 'sword' }], armors: [], accessories: [] },
      },
      version: 18,
    };
    const out = runStoreMigration(v18State, 18) as { meta: { light: number; sponsorGold?: unknown; atkBaseBonus?: unknown; cycleHistory?: unknown } };
    expect(out.meta.light).toBe(0);
    expect(out.meta.sponsorGold).toBeUndefined();
    expect(out.meta.atkBaseBonus).toBeUndefined();
    expect(out.meta.cycleHistory).toBeUndefined();
  });
});
```

(If `runStoreMigration` is the migrate entry point — verify by reading `gameStore.ts` line ~1218. If named differently, use that name.)

- [ ] **Step 2: 테스트 실행 → fail (v19 가 아직 없음)**

```bash
pnpm --filter @forge/game-inflation-rpg test -- gameStore.test.ts
```

Expected: 새 케이스 fail.

- [ ] **Step 3: gameStore.ts 의 version 을 18 → 19 로, migrate 에 v18 → v19 handler 추가**

`games/inflation-rpg/src/store/gameStore.ts:1216-1218` 의 `version: 18` 을 `version: 19, // 18 → 19 (V3-B Eternal Hero — clean reset, meta.light)` 로.

`runStoreMigration` 함수 (또는 동등한 migrate 함수) 안 `migrateV13ToV14(s);` 호출 라인 다음 (또는 마지막 미그레이션 단계 다음) 에 추가:

```ts
function migrateV18ToV19(persisted: unknown): unknown {
  if (!persisted || typeof persisted !== 'object') return persisted;
  const s = persisted as Record<string, unknown>;
  const meta = (s.meta ?? {}) as Record<string, unknown>;
  // Clean reset of V2-era cycle meta: sponsorGold, atkBaseBonus, hpBaseBonus,
  // cycleHistory all drop. V3 starts with a single `light` resource.
  delete meta.sponsorGold;
  delete meta.atkBaseBonus;
  delete meta.hpBaseBonus;
  delete meta.cycleHistory;
  meta.light = 0;
  return { ...s, meta };
}
```

Then in the `runStoreMigration` body (after `migrateV13ToV14`):

```ts
migrateV18ToV19(s);
```

(If the existing handlers mutate `s` in place, follow that convention. If they return a new object, capture: `const s2 = migrateV18ToV19(s);` and return s2.)

- [ ] **Step 4: 테스트 재실행 → pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- gameStore.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/__tests__/gameStore.test.ts
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(store): persist v19 — clean reset for V3 eternal hero

V3-B step 1: drop all v18 cycle meta (sponsorGold, atkBaseBonus,
hpBaseBonus, cycleHistory) and initialize meta.light = 0. Version
bumped 18 → 19. No carry — user-confirmed clean start.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: HeroEntity refactor — drop bp/dead, add actionCount + rejuvenationCount + staggered

**Files:**
- Modify: `games/inflation-rpg/src/hero/HeroEntity.ts` (full refactor)
- Modify: `games/inflation-rpg/src/hero/__tests__/HeroEntity.test.ts`
- Modify: `games/inflation-rpg/src/hero/__tests__/HeroEntity.jobUnlock.test.ts`
- Modify: `games/inflation-rpg/src/hero/__tests__/HeroEntity.equipment.test.ts`

**Why:** Core data model for V3-B. Remove BP / dead concepts. Hero is now eternal — defeat → `staggered: true` with hp restored next tick.

- [ ] **Step 1: 새 테스트 작성 (HeroEntity.test.ts)**

기존 `HeroEntity.test.ts` 에서 `bp`, `bpMax`, `dead`, `consumeBp` 를 언급하는 테스트들을 삭제하고 다음 신규 테스트들을 추가:

```ts
describe('HeroEntity action-time aging', () => {
  it('starts at age 5 with actionCount 0 and rejuvenationCount 0', () => {
    const h = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 100 });
    expect(h.age).toBe(5);
    expect(h.actionCount).toBe(0);
    expect(h.rejuvenationCount).toBe(0);
    expect(h.staggered).toBe(false);
  });

  it('tickAge() increments actionCount and updates age via ageFromActions', () => {
    const h = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 100 });
    for (let i = 0; i < 200; i++) h.tickAge();
    expect(h.actionCount).toBe(200);
    expect(h.age).toBeGreaterThan(5);
    expect(h.chapter === '청년기' || h.chapter === '어린시절').toBe(true);
  });

  it('staggered after takeDamage hp = 0, not dead', () => {
    const h = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 100 });
    h.takeDamage(99999);
    expect(h.hp).toBe(0);
    expect(h.staggered).toBe(true);
    // V3-B 의 V3-B does not yet auto-recover from staggered; that runs via
    // controller's per-arrival recovery hook in T5.
  });

  it('rejuvenate(years) reduces actionCount and increments rejuvenationCount', () => {
    const h = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 100 });
    for (let i = 0; i < 500; i++) h.tickAge();
    const ageBefore = h.age;
    h.rejuvenate(5);
    expect(h.age).toBeLessThan(ageBefore);
    expect(h.rejuvenationCount).toBe(1);
  });

  it('rejuvenate cannot push age below 5', () => {
    const h = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 100 });
    h.rejuvenate(100); // huge years — should clamp at age 5
    expect(h.age).toBe(5);
    expect(h.actionCount).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실행 → fail (필드들 없음)**

```bash
pnpm --filter @forge/game-inflation-rpg test -- HeroEntity.test.ts
```

- [ ] **Step 3: HeroEntity 전체 재작성**

`games/inflation-rpg/src/hero/HeroEntity.ts` 의 의미 있는 변경:

1. `HeroCreateOpts` 에서 `bpMax` 제거:

```ts
export interface HeroCreateOpts {
  seed: number;
  heroHpMax: number;
  heroAtkBase: number;
}
```

2. 클래스 필드 — `bp`, `bpMax`, `dead` 제거; `actionCount`, `rejuvenationCount`, `staggered` 추가:

```ts
export class HeroEntity {
  name: string;
  emoji: string;
  age: number;
  chapter: Chapter;
  job: string;
  level: number;
  exp: number;
  hp: number;
  hpMax: number;
  atk: number;
  atkBase: number;
  hpBase: number;
  /** Monotone counter of all hero arrivals; rejuvenate() decreases it. */
  actionCount: number;
  /** Number of times the hero has been rejuvenated (saga marker "재생 #K"). */
  rejuvenationCount: number;
  /** True when hero hp reached 0 — controller recovers next arrival. */
  staggered: boolean = false;
  equipment: string[] = [];
  personality: PersonalityState;
  unlockedJobId: string | null = null;
  unlockedMilestones: Set<JobMilestone> = new Set();
  learnedSkillIds: Set<string> = new Set();

  private constructor() {
    this.name = '';
    this.emoji = '🧒';
    this.age = 5;
    this.chapter = '어린시절';
    this.job = '평민';
    this.level = 1;
    this.exp = 0;
    this.hp = 0;
    this.hpMax = 0;
    this.atk = 0;
    this.atkBase = 0;
    this.hpBase = 0;
    this.actionCount = 0;
    this.rejuvenationCount = 0;
    this.personality = new PersonalityState();
  }
```

3. `create` 의 spawn — `h.bp / h.bpMax` 라인 삭제. `h.actionCount = 0` 은 constructor default 로 충분 (별도 라인 불필요).

```ts
static create(opts: HeroCreateOpts): HeroEntity {
  const h = new HeroEntity();
  const spawned = HeroSpawner.spawn(new SeededRng(opts.seed));
  h.name = spawned.name;
  h.emoji = spawned.emoji;
  h.age = spawned.age;
  h.chapter = HeroLifecycle.chapterForAge(spawned.age);
  h.job = spawned.job;
  h.level = spawned.level;
  h.exp = 0;
  h.atkBase = opts.heroAtkBase;
  h.hpBase = opts.heroHpMax;
  h.atk = heroAtkAtLevel(h.atkBase, h.level);
  h.hpMax = heroHpMaxAtLevel(h.hpBase, h.level);
  h.hp = h.hpMax;
  h.personality = PersonalityState.fromTraitPriors(spawned.personalityPriors);
  return h;
}
```

4. `takeDamage` — `dead = true` 제거, `staggered = true`:

```ts
takeDamage(amount: number): void {
  this.hp = Math.max(0, this.hp - amount);
  if (this.hp <= 0) this.staggered = true;
}
```

5. `consumeBp` 메서드 **완전 제거**. `refreshAge` (private) 메서드 **완전 제거**.

6. 새 메서드들 추가:

```ts
tickAge(): void {
  this.actionCount += 1;
  this.age = HeroLifecycle.ageFromActions(this.actionCount);
  this.chapter = HeroLifecycle.chapterForAge(this.age);
}

rejuvenate(years: number): void {
  // Convert "years" back to actionCount delta via the inverse curve.
  const targetAge = Math.max(5, this.age - years);
  const targetActions = HeroLifecycle.actionsForAge(targetAge);
  this.actionCount = Math.max(0, targetActions);
  this.age = HeroLifecycle.ageFromActions(this.actionCount);
  this.chapter = HeroLifecycle.chapterForAge(this.age);
  this.rejuvenationCount += 1;
}

recoverFromStagger(): void {
  this.staggered = false;
  this.hp = this.hpMax;
}
```

7. `maybeUnlockJobForAge` 와 `gainExp` 와 `recomputeStats` 와 `heal` 와 `addEquipment` — **변경 없음**. 단 `recomputeStats` 는 T6 에서 aging debuff 곱하기 hook 추가.

- [ ] **Step 4: jobUnlock / equipment 테스트의 bpMax opt 제거**

`HeroEntity.jobUnlock.test.ts` 와 `HeroEntity.equipment.test.ts` 안의 `HeroEntity.create({...})` 호출에서 `bpMax: ...` 라인을 모두 삭제. (단순 sed.) 예:

```ts
// before
const h = HeroEntity.create({ seed: 42, bpMax: 30, heroHpMax: 100, heroAtkBase: 100 });
// after
const h = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 100 });
```

`HeroEntity.test.ts` 안의 bp/dead 관련 케이스들 (예: `it('consumeBp drains and triggers dead at 0')`) 완전 삭제. 신규 케이스로 대체 (Step 1).

- [ ] **Step 5: 테스트 재실행 → 일부 통과; HeroLifecycle.ageFromActions 가 아직 없어서 fail 발생할 것**

```bash
pnpm --filter @forge/game-inflation-rpg test -- HeroEntity
```

이 시점에서는 ageFromActions / actionsForAge 미정의로 컴파일 실패 가능. Task 3 에서 채워짐. 일단 Task 3 으로 넘어가서 묶어서 다시 본다.

- [ ] **Step 6: Commit (with Task 3, 부분 commit 가능)**

T2 + T3 을 한 묶음으로 commit 하기 위해 T3 의 step 끝에서 git add 한다. 이 task 끝나는 시점에서는 의도적으로 commit 하지 않음.

만약 implementer 가 T2 만 단독으로 commit 하고 싶으면, ageFromActions 의 minimal stub 을 T3 으로 미루지 말고 여기서 같이 만든 후 commit. 그러나 권장 = T3 끝에서 한 번에 commit.

---

### Task 3: HeroLifecycle — ageFromActions + actionsForAge curve

**Files:**
- Modify: `games/inflation-rpg/src/hero/HeroLifecycle.ts`
- Create: `games/inflation-rpg/src/hero/__tests__/HeroLifecycle.test.ts` (없으면)

**Why:** Action → age 매핑 함수. 70세 도달 = 1000 actions 가설 (spec §4.1). 단순 선형.

- [ ] **Step 1: 테스트 작성**

`HeroLifecycle.test.ts` (없으면 새로 만들기):

```ts
import { describe, it, expect } from 'vitest';
import { HeroLifecycle } from '../HeroLifecycle';

describe('HeroLifecycle ageFromActions', () => {
  it('0 actions → age 5 (start)', () => {
    expect(HeroLifecycle.ageFromActions(0)).toBe(5);
  });

  it('1000 actions → age 70 (end of 노년기, entering 마지막)', () => {
    expect(HeroLifecycle.ageFromActions(1000)).toBeGreaterThanOrEqual(70);
  });

  it('500 actions → roughly mid-life (장년기 range, 30-49)', () => {
    const age = HeroLifecycle.ageFromActions(500);
    expect(age).toBeGreaterThanOrEqual(30);
    expect(age).toBeLessThanOrEqual(50);
  });

  it('beyond 1000 actions → age keeps increasing (eternal hero)', () => {
    expect(HeroLifecycle.ageFromActions(2000)).toBeGreaterThan(HeroLifecycle.ageFromActions(1000));
  });

  it('actionsForAge is the inverse of ageFromActions for in-range ages', () => {
    for (const age of [5, 15, 30, 50, 70]) {
      const actions = HeroLifecycle.actionsForAge(age);
      expect(HeroLifecycle.ageFromActions(actions)).toBe(age);
    }
  });
});
```

- [ ] **Step 2: 테스트 실행 → fail (함수 없음)**

```bash
pnpm --filter @forge/game-inflation-rpg test -- HeroLifecycle.test.ts
```

- [ ] **Step 3: HeroLifecycle 에 두 메서드 추가, ageFromBpProgress 제거**

`games/inflation-rpg/src/hero/HeroLifecycle.ts` 전체:

```ts
export const CHAPTERS = ['어린시절', '청년기', '장년기', '노년기', '마지막'] as const;
export type Chapter = (typeof CHAPTERS)[number];

const CHAPTER_RANGES: Array<[Chapter, number, number]> = [
  ['어린시절', 5, 14],
  ['청년기', 15, 29],
  ['장년기', 30, 49],
  ['노년기', 50, 69],
  ['마지막', 70, 999],
];

const START_AGE = 5;
const END_AGE = 70;
/** 70세 (마지막 chapter 진입) 까지 걸리는 action 수의 baseline.
 *  V3-G balance pass 에서 sim 측정 후 조정될 수 있다. */
const ACTIONS_FOR_END_AGE = 1000;

export class HeroLifecycle {
  static chapterForAge(age: number): Chapter {
    for (const [chapter, lo, hi] of CHAPTER_RANGES) {
      if (age >= lo && age <= hi) return chapter;
    }
    return '마지막';
  }

  /** Action-time aging: 0 actions → 5세, ACTIONS_FOR_END_AGE → 70세, 그 이상은
   *  선형 외삽 (영원 hero). */
  static ageFromActions(actions: number): number {
    const ratio = actions / ACTIONS_FOR_END_AGE;
    return Math.floor(START_AGE + (END_AGE - START_AGE) * ratio);
  }

  /** Inverse — minimum actions needed to be at-least the given age. Used for
   *  rejuvenate(years) to compute the new actionCount. */
  static actionsForAge(age: number): number {
    if (age <= START_AGE) return 0;
    const ratio = (age - START_AGE) / (END_AGE - START_AGE);
    return Math.ceil(ratio * ACTIONS_FOR_END_AGE);
  }
}
```

- [ ] **Step 4: 테스트 재실행 → HeroLifecycle + HeroEntity 모두 PASS**

```bash
pnpm --filter @forge/game-inflation-rpg test -- HeroLifecycle.test.ts
pnpm --filter @forge/game-inflation-rpg test -- HeroEntity
```

Step 3 의 inverse 정확성: `actionsForAge(age) = ceil((age-5)/65 * 1000)`. 예시: age=15 → ceil(10/65*1000) = 154. `ageFromActions(154) = floor(5 + 65 * 154/1000) = floor(15.01) = 15`. ✓

- [ ] **Step 5: T2 + T3 묶어서 commit**

```bash
git add games/inflation-rpg/src/hero/HeroEntity.ts games/inflation-rpg/src/hero/HeroLifecycle.ts \
        games/inflation-rpg/src/hero/__tests__/HeroEntity.test.ts \
        games/inflation-rpg/src/hero/__tests__/HeroEntity.jobUnlock.test.ts \
        games/inflation-rpg/src/hero/__tests__/HeroEntity.equipment.test.ts \
        games/inflation-rpg/src/hero/__tests__/HeroLifecycle.test.ts
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(hero): action-time aging — drop BP/dead, add actionCount + rejuvenate

V3-B step 2-3: HeroEntity 의 bp/bpMax/dead 폐기. 새 필드 actionCount /
rejuvenationCount / staggered 추가. tickAge() 메서드 가 actionCount
증가 + age 갱신. rejuvenate(years) 가 actionCount 감소 + 재생 카운터
증가. HeroLifecycle 에 ageFromActions / actionsForAge 추가 (선형,
1000 actions = 70세). ageFromBpProgress 제거.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: EncounterEngine — remove consumeBp + dead checks

**Files:**
- Modify: `games/inflation-rpg/src/overworld/EncounterEngine.ts`
- Modify: `games/inflation-rpg/src/overworld/__tests__/EncounterEngine.test.ts`
- Modify: `games/inflation-rpg/src/overworld/__tests__/EncounterEngine.personality.test.ts`

**Why:** `hero.consumeBp(...)` 호출이 7군데 (line 53/91/103/115/126/144 + Boss line 53). 모두 V3-B 에서 무의미. `hero.dead` 체크 (line 39/43/85) 도 V3-B 에서는 항상 false 라 제거 / 또는 `hero.staggered` 로 의미 재정의.

- [ ] **Step 1: 기존 테스트의 `consumeBp` 호출 의존성 grep + 제거**

```bash
grep -n 'bpMax\|consumeBp\|hero\.bp\|hero\.dead' games/inflation-rpg/src/overworld/__tests__/EncounterEngine.test.ts
grep -n 'bpMax\|consumeBp\|hero\.bp\|hero\.dead' games/inflation-rpg/src/overworld/__tests__/EncounterEngine.personality.test.ts
```

각 hit 마다:
- `HeroEntity.create({...bpMax: ..., ...})` 호출에서 `bpMax: ...` 줄 제거
- `expect(hero.bp).toBe(...)` 또는 `expect(hero.dead).toBe(...)` 줄은 삭제 (or 동등한 assertion 재작성: `staggered` 또는 `actionCount` 검사로)

`consumeBp` 호출이 production 코드 안에만 있고 테스트엔 직접 없으면 skip.

- [ ] **Step 2: EncounterEngine 의 consumeBp 호출 7군데 모두 삭제 + dead 체크 변경**

`games/inflation-rpg/src/overworld/EncounterEngine.ts` 의 `resolveEncounter` 메서드 안:

- **Line 39 / 43 / 85** 의 `!hero.dead` / `if (hero.dead)` — `hero.staggered` 로 의미 재정의. Hero is staggered = 전투 불가, encounter 자체 skip. Or: 전투 중 (line 39 의 while loop) 만 staggered 체크.

  결정: `while (eHp > 0 && !hero.staggered)` (line 39), `if (hero.staggered)` (line 43) — staggered 시 전투 즉시 중단. Line 85 의 `if (hero.dead)` 는 `if (hero.staggered)` 로 변환.

- **Line 53 (`hero.consumeBp(isBoss ? 3 : 1)`)**: 완전 삭제. (전투 후 BP 소비 → V3 에서는 controller 가 `hero.tickAge()` 호출).

- **Line 91 / 103 / 115 / 126 / 144 (`hero.consumeBp(0)`)**: 완전 삭제. 이미 0 소비라 effectively dead code 였음.

- **Line 145 (`hero_died` 이벤트 emit 부분)**: `hero.dead` 가 true 였던 분기는 이제 `hero.staggered` 가 됐을 때 발생 가능. 그러나 V3 에서는 hero_died 이벤트 자체가 무의미 (영원 hero). 이 emit 라인을 삭제하거나 `staggered` 이벤트로 변경.

  결정: hero_died emit 삭제. (V3 에서 controller 가 staggered 처리.) 단 OverworldEvent union 에서 `hero_died` 자체는 유지 (legacy, dormant).

- [ ] **Step 3: 테스트 실행**

```bash
pnpm --filter @forge/game-inflation-rpg test -- EncounterEngine
```

`hero_died` 또는 `dead` 를 검증하던 케이스는 fail 할 것. 해당 케이스를 staggered 검증으로 재작성하거나 삭제.

- [ ] **Step 4: 신규 staggered 테스트 추가 (EncounterEngine.test.ts)**

```ts
describe('EncounterEngine — staggered hero', () => {
  it('does not run battle when hero is staggered, skips encounter', () => {
    const hero = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 100 });
    hero.staggered = true;
    const engine = new EncounterEngine(new SeededRng(42));
    const events = engine.resolveEncounter(hero, 'enemy', 'wolf_1');
    expect(events.filter(e => e.type === 'battle_started').length).toBe(0);
  });
});
```

(staggered 시 battle 자체 skip — 의도된 동작. 실제로는 controller 가 staggered hero 를 recover 시켜야 하지만 그건 T5.)

- [ ] **Step 5: 테스트 재실행 → all pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- EncounterEngine
```

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/src/overworld/EncounterEngine.ts \
        games/inflation-rpg/src/overworld/__tests__/EncounterEngine.test.ts \
        games/inflation-rpg/src/overworld/__tests__/EncounterEngine.personality.test.ts
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(overworld): EncounterEngine — drop consumeBp, replace dead with staggered

V3-B step 4: hero.consumeBp(N) 호출 7군데 모두 제거. hero.dead 체크
3군데를 hero.staggered 로 의미 재정의. hero_died 이벤트 emit 1군데
삭제 (V3 영원 hero 라 자연사 없음).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: CycleControllerV2 — tickAge per arrival + staggered recovery

**Files:**
- Modify: `games/inflation-rpg/src/overworld/CycleControllerV2.ts`
- Modify: `games/inflation-rpg/src/overworld/__tests__/CycleControllerV2.test.ts`
- Modify: `games/inflation-rpg/src/overworld/__tests__/CycleControllerV2.cycleDriver.test.ts`

**Why:** 매 arrival 마다 `hero.tickAge()` 호출. `hero.dead` 체크 제거. `hero.staggered` 라면 한 arrival 통째로 skip + 다음 arrival 부터 회복.

- [ ] **Step 1: 신규 테스트 작성 (CycleControllerV2.test.ts)**

```ts
describe('CycleControllerV2 action-time aging', () => {
  it('handleArrival increments hero.actionCount and advances age', () => {
    const ctrl = new CycleControllerV2({ seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100000 });
    const before = ctrl.getHero().actionCount;
    ctrl.handleArrival('enemy', 'wolf_1');
    const after = ctrl.getHero().actionCount;
    expect(after).toBe(before + 1);
  });

  it('crosses 어린시절 → 청년기 within ~150-200 arrivals (action-time curve)', () => {
    const ctrl = new CycleControllerV2({ seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100000 });
    let crossed = false;
    for (let i = 0; i < 300; i++) {
      const evs = ctrl.handleArrival('enemy', `wolf_${i}`);
      if (evs.some(e => e.type === 'chapter_transition')) {
        crossed = true;
        break;
      }
    }
    expect(crossed).toBe(true);
    expect(ctrl.getHero().chapter).toBe('청년기');
  });

  it('staggered hero recovers next arrival', () => {
    const ctrl = new CycleControllerV2({ seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100000 });
    const hero = ctrl.getHero();
    hero.staggered = true;
    hero.hp = 0;
    ctrl.handleArrival('enemy', 'wolf_1');
    expect(hero.staggered).toBe(false);
    expect(hero.hp).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 기존 테스트의 bpMax opt 제거 + dead 관련 단언 정리**

`CycleControllerV2.test.ts` 의 모든 `new CycleControllerV2({...bpMax: ..., ...})` 호출에서 `bpMax: N, ` 줄 삭제 + `traits: [], ` 가 옆에 그대로 있으면 유지. `dead` 단언은 `staggered` 단언으로 또는 삭제.

`CycleControllerV2.cycleDriver.test.ts` 도 동일 sweep — bpMax opt 제거.

`CycleControllerV2Opts` 에서 `bpMax` 가 없어졌으므로 컴파일 자동으로 모든 호출자에 빨간줄. 한꺼번에 처리.

- [ ] **Step 3: CycleControllerV2 코드 변경**

`games/inflation-rpg/src/overworld/CycleControllerV2.ts` 의:

- **interface CycleControllerV2Opts** — `bpMax` 필드 제거. (HeroCreateOpts 도 이미 T2 에서 제거됐으므로 type 통일.)
- **constructor** — `HeroEntity.create({ ...bpMax: opts.bpMax, ... })` 라인의 `bpMax` 제거.
- **handleArrival 의 시작부**: 

  Current:
  ```ts
  handleArrival(kind: LandmarkKind, landmarkId: string): OverworldEvent[] {
    if (this.hero.dead) return [];
    const beforeChapter = this.hero.chapter;
    ...
  ```

  After:
  ```ts
  handleArrival(kind: LandmarkKind, landmarkId: string): OverworldEvent[] {
    // V3-B: staggered hero recovers (hp full, staggered=false) without
    // processing the encounter content. This arrival "costs" the actionCount
    // tick — recovery itself is the cost.
    if (this.hero.staggered) {
      this.hero.recoverFromStagger();
      this.hero.tickAge();
      return [];
    }
    const beforeChapter = this.hero.chapter;
    ...
  ```

- **handleArrival 의 끝부 (return events 직전)**:

  현재 chapter_transition 푸시 블록 다음, return 직전에 `this.hero.tickAge();` 추가:

  ```ts
    if (this.hero.chapter !== beforeChapter) {
      events.push({
        type: 'chapter_transition',
        fromChapter: beforeChapter,
        toChapter: this.hero.chapter,
        atAge: this.hero.age,
      });
    }
    this.hero.tickAge();
    return events;
  }
  ```

  주의: `tickAge` 가 `chapter_transition` push 후에 호출되면, tickAge 의 chapter 변화는 다음 arrival 에서 잡힌다. 이것이 의도 (한 arrival 안 chapter 가 두 번 바뀌지 않게).

- [ ] **Step 4: 테스트 실행 → 새 케이스 + 기존 케이스 모두 통과**

```bash
pnpm --filter @forge/game-inflation-rpg test -- CycleControllerV2
```

Expected: chapter_transition 가 ~150-200 arrival 안 발생 (5 → 15 age 가 actions ≈ 154 에서 도달).

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/overworld/CycleControllerV2.ts \
        games/inflation-rpg/src/overworld/__tests__/CycleControllerV2.test.ts \
        games/inflation-rpg/src/overworld/__tests__/CycleControllerV2.cycleDriver.test.ts
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(overworld): CycleControllerV2 calls hero.tickAge() per arrival

V3-B step 5: bpMax opt 제거. handleArrival 시작부 가 staggered 라면
recoverFromStagger + tickAge 후 즉시 return (encounter skip). 정상
처리 끝나면 tickAge 호출. 새 chapter_transition push 는 tickAge 전에
체크하므로 한 arrival 안 chapter 가 두 번 바뀌지 않음.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Aging debuff system

**Files:**
- Create: `games/inflation-rpg/src/hero/agingDebuff.ts`
- Create: `games/inflation-rpg/src/hero/__tests__/agingDebuff.test.ts`
- Modify: `games/inflation-rpg/src/hero/HeroEntity.ts` (recomputeStats 가 debuff 적용)

**Why:** Spec §4.2 — 50세부터 작은 디버프, 70세부터 본격, 100세 거의 정지, 200세 사실상 멈춤. 단 죽지 않음.

- [ ] **Step 1: 테스트 작성**

`games/inflation-rpg/src/hero/__tests__/agingDebuff.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getAgingDebuff } from '../agingDebuff';

describe('getAgingDebuff', () => {
  it('age 5-49 → no debuff (all multipliers = 1)', () => {
    for (const age of [5, 20, 30, 49]) {
      const d = getAgingDebuff(age);
      expect(d.atkMul).toBe(1);
      expect(d.hpMul).toBe(1);
      expect(d.moveMul).toBe(1);
    }
  });

  it('age 50-69 → small debuff: atkMul/hpMul ~0.95, moveMul ~0.98', () => {
    const d = getAgingDebuff(50);
    expect(d.atkMul).toBeLessThan(1);
    expect(d.atkMul).toBeGreaterThan(0.9);
    expect(d.moveMul).toBeLessThan(1);
    expect(d.moveMul).toBeGreaterThan(0.95);
  });

  it('age 70+ → bigger debuff: atkMul ~0.8, moveMul ~0.85', () => {
    const d = getAgingDebuff(70);
    expect(d.atkMul).toBeLessThanOrEqual(0.85);
    expect(d.atkMul).toBeGreaterThan(0.7);
  });

  it('age 100+ → severe debuff: atkMul ~0.5, moveMul ~0.5', () => {
    const d = getAgingDebuff(100);
    expect(d.atkMul).toBeLessThanOrEqual(0.55);
    expect(d.atkMul).toBeGreaterThan(0.4);
  });

  it('age 200+ → near-frozen: atkMul ~0.1, moveMul ~0.1, but > 0', () => {
    const d = getAgingDebuff(200);
    expect(d.atkMul).toBeLessThanOrEqual(0.15);
    expect(d.atkMul).toBeGreaterThan(0);
  });

  it('age 1000 → still > 0 (never zero, hero is eternal)', () => {
    const d = getAgingDebuff(1000);
    expect(d.atkMul).toBeGreaterThan(0);
    expect(d.moveMul).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 테스트 실행 → fail (모듈 없음)**

```bash
pnpm --filter @forge/game-inflation-rpg test -- agingDebuff
```

- [ ] **Step 3: agingDebuff.ts 작성**

`games/inflation-rpg/src/hero/agingDebuff.ts`:

```ts
export interface AgingDebuff {
  /** Multiplier applied to hero attack stat after level scaling. */
  atkMul: number;
  /** Multiplier applied to hero hpMax. */
  hpMul: number;
  /** Multiplier applied to overworld move speed (used by V3-C+ scenes). */
  moveMul: number;
}

const ONE: AgingDebuff = { atkMul: 1, hpMul: 1, moveMul: 1 };

/** Age → multiplicative debuff (1 = unaffected, 0 = frozen). Piecewise:
 *  - <50 : no debuff
 *  - 50-69 : light (-2-5% per stat, growing)
 *  - 70-99 : medium (-10-15% per stat per decade)
 *  - 100-199 : severe (~-50% at 100, ~-80% at 200)
 *  - 200+ : near-frozen but never zero — hero is eternal.
 *  V3-G balance pass 에서 magnitude 조정 가능. */
export function getAgingDebuff(age: number): AgingDebuff {
  if (age < 50) return { ...ONE };
  if (age < 70) {
    const t = (age - 50) / 20; // 0..1 across [50,70)
    return {
      atkMul: 1 - 0.05 * t,
      hpMul: 1 - 0.05 * t,
      moveMul: 1 - 0.02 * t,
    };
  }
  if (age < 100) {
    const t = (age - 70) / 30; // 0..1 across [70,100)
    return {
      atkMul: 0.95 - 0.40 * t,  // 0.95 → 0.55
      hpMul:  0.95 - 0.40 * t,
      moveMul: 0.98 - 0.48 * t, // 0.98 → 0.50
    };
  }
  if (age < 200) {
    const t = (age - 100) / 100; // 0..1
    return {
      atkMul: 0.55 - 0.45 * t,  // 0.55 → 0.10
      hpMul:  0.55 - 0.45 * t,
      moveMul: 0.50 - 0.40 * t,
    };
  }
  // 200+ : decay slowly toward 0 but clamp at small positive value.
  const decay = 0.10 / (1 + (age - 200) / 100);
  return {
    atkMul: Math.max(0.005, decay),
    hpMul:  Math.max(0.005, decay),
    moveMul: Math.max(0.005, decay),
  };
}
```

- [ ] **Step 4: HeroEntity.recomputeStats 에서 디버프 적용**

`games/inflation-rpg/src/hero/HeroEntity.ts` 의 `recomputeStats` 메서드:

기존:

```ts
recomputeStats(): void {
  this.atk = heroAtkAtLevel(this.atkBase, this.level);
  this.hpMax = heroHpMaxAtLevel(this.hpBase, this.level);
}
```

새 버전:

```ts
recomputeStats(): void {
  const debuff = getAgingDebuff(this.age);
  this.atk = Math.floor(heroAtkAtLevel(this.atkBase, this.level) * debuff.atkMul);
  this.hpMax = Math.floor(heroHpMaxAtLevel(this.hpBase, this.level) * debuff.hpMul);
  // Note: hp 는 hpMax 변화 시 clamp 만 — 자연 회복 / 손실 의도 없음.
  if (this.hp > this.hpMax) this.hp = this.hpMax;
}
```

상단에 `import { getAgingDebuff } from './agingDebuff';` 추가.

`tickAge()` 끝에 `this.recomputeStats()` 추가 (age 가 바뀌면 디버프 곱이 바뀌므로):

```ts
tickAge(): void {
  this.actionCount += 1;
  this.age = HeroLifecycle.ageFromActions(this.actionCount);
  this.chapter = HeroLifecycle.chapterForAge(this.age);
  this.recomputeStats();
}
```

`rejuvenate(years)` 끝에도 동일:

```ts
rejuvenate(years: number): void {
  const targetAge = Math.max(5, this.age - years);
  const targetActions = HeroLifecycle.actionsForAge(targetAge);
  this.actionCount = Math.max(0, targetActions);
  this.age = HeroLifecycle.ageFromActions(this.actionCount);
  this.chapter = HeroLifecycle.chapterForAge(this.age);
  this.rejuvenationCount += 1;
  this.recomputeStats();
}
```

- [ ] **Step 5: 테스트 재실행 → all PASS**

```bash
pnpm --filter @forge/game-inflation-rpg test -- agingDebuff
pnpm --filter @forge/game-inflation-rpg test -- HeroEntity
```

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/src/hero/agingDebuff.ts \
        games/inflation-rpg/src/hero/__tests__/agingDebuff.test.ts \
        games/inflation-rpg/src/hero/HeroEntity.ts
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(hero): aging debuff applied at recomputeStats

V3-B step 6: getAgingDebuff(age) piecewise function — none <50,
light 50-69, medium 70-99, severe 100-199, near-frozen 200+.
recomputeStats 가 atk/hpMax 에 곱 적용. tickAge/rejuvenate 호출 시
recomputeStats 호출되어 디버프 자동 갱신.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Rejuvenation cost + meta.light slice + saga 재생 narrative

**Files:**
- Create: `games/inflation-rpg/src/hero/rejuvenation.ts`
- Create: `games/inflation-rpg/src/hero/__tests__/rejuvenation.test.ts`
- Modify: `games/inflation-rpg/src/saga/SagaTypes.ts` (SagaEventType 에 'rejuvenation' 추가)
- Modify: `games/inflation-rpg/src/saga/NarrativeGenerator.ts` (forRejuvenation)
- Modify: `games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts`
- Modify: `games/inflation-rpg/src/overworld/cycleSliceV2.ts` (rejuvenateHero action)
- Modify: `games/inflation-rpg/src/overworld/__tests__/cycleSliceV2.test.ts`

**Why:** Spec §4.3 + §8.1. 회춘 cost = `(age - 5) * 10`. cycleSliceV2 의 새 action 이 meta.light 차감 + hero.rejuvenate + saga record. 5세 미만 또는 light 부족 시 no-op.

- [ ] **Step 1: rejuvenation.ts 테스트 + 코드**

`games/inflation-rpg/src/hero/__tests__/rejuvenation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { rejuvenationCost } from '../rejuvenation';

describe('rejuvenationCost', () => {
  it('age 5 → 0 빛 (no cost at minimum age)', () => {
    expect(rejuvenationCost(5)).toBe(0);
  });

  it('age 15 → 100 빛 (linear)', () => {
    expect(rejuvenationCost(15)).toBe(100);
  });

  it('age 50 → 450 빛', () => {
    expect(rejuvenationCost(50)).toBe(450);
  });

  it('age 100 → 950 빛', () => {
    expect(rejuvenationCost(100)).toBe(950);
  });

  it('clamps non-positive age to 0', () => {
    expect(rejuvenationCost(0)).toBe(0);
    expect(rejuvenationCost(-100)).toBe(0);
  });
});
```

`games/inflation-rpg/src/hero/rejuvenation.ts`:

```ts
/** Light-resource cost for one rejuvenation step. Linear in age beyond 5.
 *  Spec §4.3 — magnitude tuned in V3-G balance pass. */
export function rejuvenationCost(age: number): number {
  if (age <= 5) return 0;
  return (age - 5) * 10;
}
```

- [ ] **Step 2: SagaTypes 의 SagaEventType 에 'rejuvenation' 추가**

`games/inflation-rpg/src/saga/SagaTypes.ts:4` 의 union 에 `'rejuvenation' |` 추가. (정확한 위치는 read.)

- [ ] **Step 3: NarrativeGenerator 에 forRejuvenation 추가**

```ts
static forRejuvenation(opts: { age: number; yearsBack: number; rejuvenationCount: number }): string {
  return `${opts.age}세에 빛의 은총으로 ${opts.yearsBack}년이 사라졌다 — 재생 #${opts.rejuvenationCount}.`;
}
```

테스트 `NarrativeGenerator.test.ts` 에 케이스 추가:

```ts
it('rejuvenation → "N세에 빛의 은총으로 M년이 사라졌다 — 재생 #K"', () => {
  const txt = NarrativeGenerator.forRejuvenation({ age: 30, yearsBack: 5, rejuvenationCount: 2 });
  expect(txt).toContain('30세');
  expect(txt).toContain('5년');
  expect(txt).toContain('재생 #2');
});
```

- [ ] **Step 4: cycleSliceV2 에 `rejuvenateHero` action 추가**

기존 `endCycle`, `start`, `reset` 옆에:

```ts
rejuvenateHero(years: number) {
  const ctrl = get().controller;
  if (!ctrl) return;
  const hero = ctrl.getHero();
  const cost = rejuvenationCost(hero.age);
  const light = useGameStore.getState().meta.light ?? 0;
  if (light < cost) return; // not enough light, no-op
  // Pay + apply.
  useGameStore.setState(s => ({
    ...s,
    meta: { ...s.meta, light: (s.meta.light ?? 0) - cost },
  }));
  hero.rejuvenate(years);
  // Record saga marker.
  ctrl.recordRejuvenation(years);
},
```

위 코드에서 `ctrl.recordRejuvenation(years)` 가 필요 → CycleControllerV2 에 새 메서드:

```ts
recordRejuvenation(years: number): void {
  this.saga.record({
    age: this.hero.age,
    type: 'rejuvenation',
    narrativeText: NarrativeGenerator.forRejuvenation({
      age: this.hero.age,
      yearsBack: years,
      rejuvenationCount: this.hero.rejuvenationCount,
    }),
    payload: { years, rejuvenationCount: this.hero.rejuvenationCount },
  });
}
```

(추가로 cycleSliceV2.ts 상단 import: `import { rejuvenationCost } from '../hero/rejuvenation';`.)

State interface 에 `rejuvenateHero: (years: number) => void;` 추가.

- [ ] **Step 5: cycleSliceV2 테스트 — rejuvenateHero 통합 케이스**

`cycleSliceV2.test.ts` 끝에:

```ts
describe('rejuvenateHero action', () => {
  it('decreases hero age, spends light, increments rejuvenationCount', () => {
    useGameStore.setState(s => ({ ...s, meta: { ...s.meta, light: 1000 } }));
    const store = useCycleStoreV2.getState();
    store.start({ seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100 });
    const ctrl = useCycleStoreV2.getState().controller!;
    const hero = ctrl.getHero();
    // Age up via tickAge so the rejuvenation is meaningful.
    for (let i = 0; i < 200; i++) hero.tickAge();
    const ageBefore = hero.age;
    const lightBefore = useGameStore.getState().meta.light ?? 0;
    useCycleStoreV2.getState().rejuvenateHero(5);
    expect(hero.age).toBeLessThan(ageBefore);
    expect(hero.rejuvenationCount).toBe(1);
    expect(useGameStore.getState().meta.light).toBeLessThan(lightBefore);
  });

  it('no-op when meta.light < cost', () => {
    useGameStore.setState(s => ({ ...s, meta: { ...s.meta, light: 0 } }));
    const store = useCycleStoreV2.getState();
    store.start({ seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100 });
    const ctrl = useCycleStoreV2.getState().controller!;
    const hero = ctrl.getHero();
    for (let i = 0; i < 200; i++) hero.tickAge();
    const ageBefore = hero.age;
    useCycleStoreV2.getState().rejuvenateHero(5);
    expect(hero.age).toBe(ageBefore);
    expect(hero.rejuvenationCount).toBe(0);
  });
});
```

- [ ] **Step 6: 테스트 실행 → all pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- rejuvenation
pnpm --filter @forge/game-inflation-rpg test -- NarrativeGenerator
pnpm --filter @forge/game-inflation-rpg test -- cycleSliceV2
```

- [ ] **Step 7: Commit**

```bash
git add games/inflation-rpg/src/hero/rejuvenation.ts \
        games/inflation-rpg/src/hero/__tests__/rejuvenation.test.ts \
        games/inflation-rpg/src/saga/SagaTypes.ts \
        games/inflation-rpg/src/saga/NarrativeGenerator.ts \
        games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts \
        games/inflation-rpg/src/overworld/CycleControllerV2.ts \
        games/inflation-rpg/src/overworld/cycleSliceV2.ts \
        games/inflation-rpg/src/overworld/__tests__/cycleSliceV2.test.ts
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(hero): rejuvenation cost + meta.light spend + saga 재생 marker

V3-B step 7: rejuvenationCost(age) = (age-5) * 10 빛. cycleSliceV2 에
rejuvenateHero(years) action — meta.light 차감 + hero.rejuvenate +
saga 'rejuvenation' record. light 부족 시 no-op. 한국어 narrative
"N세에 빛의 은총으로 M년이 사라졌다 — 재생 #K".

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: HUD update — BP 제거, 빛/재생 표시, 임시 회춘 버튼

**Files:**
- Modify: `games/inflation-rpg/src/screens/OverworldRunner.tsx`
- Modify: `games/inflation-rpg/src/screens/__tests__/OverworldRunner.test.tsx`
- Modify: `games/inflation-rpg/src/screens/CyclePrepV2.tsx` (bpMax opt 사용 부분 제거)
- Modify: `games/inflation-rpg/src/screens/__tests__/CyclePrepV2.test.tsx`
- Modify: `games/inflation-rpg/src/screens/__tests__/CycleResultV2.test.tsx`

**Why:** HUD 가 `BP {hero.bp}/{hero.bpMax}` 를 표시하지만 hero.bp 가 더 이상 존재 안 함 → 컴파일 실패. 대체 = `빛 N · 재생 K`. V3-C 의 spend modal 은 다음 phase, 일단 임시 "회춘 5년" 버튼만 추가하여 end-to-end 검증 가능.

- [ ] **Step 1: OverworldRunner.tsx 의 HUD BP span 교체**

`<span data-testid="hud-bp">BP {hero.bp}/{hero.bpMax}</span>` 를 다음으로 교체:

```tsx
<span data-testid="hud-light">빛 {meta.light ?? 0}</span>
<span data-testid="hud-rejuvenation">재생 #{hero.rejuvenationCount}</span>
<button
  type="button"
  onClick={() => rejuvenateHero(5)}
  disabled={(meta.light ?? 0) < rejuvenationCost(hero.age)}
  data-testid="rejuvenate-button"
  style={{ marginLeft: 8, padding: '4px 8px', fontSize: 12 }}
>
  회춘 5년 ({rejuvenationCost(hero.age)} 빛)
</button>
```

상단 import 추가:
- `import { rejuvenationCost } from '../hero/rejuvenation';`
- `const meta = useGameStore(s => s.meta);` (또는 기존 selector 패턴 따라)
- `const rejuvenateHero = useCycleStoreV2(s => s.rejuvenateHero);`

(만약 `useGameStore` import 가 없으면 추가. `useCycleStoreV2` 는 이미 import 됨.)

- [ ] **Step 2: OverworldRunner.test.tsx 의 BP 단언 정리**

기존 `expect(screen.getByTestId('hud-bp')).toHaveTextContent(...)` 같은 단언 삭제 또는 `hud-light` 단언으로 교체.

새 케이스 (optional):

```ts
it('회춘 버튼 disabled when meta.light < cost', () => {
  // setup with light = 0
  // expect button has disabled attr
});
```

- [ ] **Step 3: CyclePrepV2 의 bpMax 관련 코드 정리**

`grep -n 'bpMax' games/inflation-rpg/src/screens/CyclePrepV2.tsx` 의 hit 모두 제거. `controller.start({...bpMax: ...})` 형태가 있으면 그 줄 삭제.

- [ ] **Step 4: 다른 화면 테스트 sweep**

`CyclePrepV2.test.tsx`, `CycleResultV2.test.tsx` 의 bpMax 단언 삭제. 컴파일 실패가 안내해줌.

- [ ] **Step 5: 테스트 실행 → all pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- screens
```

- [ ] **Step 6: typecheck + lint**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint
```

- [ ] **Step 7: Commit**

```bash
git add games/inflation-rpg/src/screens/OverworldRunner.tsx \
        games/inflation-rpg/src/screens/__tests__/OverworldRunner.test.tsx \
        games/inflation-rpg/src/screens/CyclePrepV2.tsx \
        games/inflation-rpg/src/screens/__tests__/CyclePrepV2.test.tsx \
        games/inflation-rpg/src/screens/__tests__/CycleResultV2.test.tsx
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(screens): HUD — drop BP, show 빛/재생, temp rejuvenate button

V3-B step 8: HUD 의 hud-bp 자리 → hud-light + hud-rejuvenation +
rejuvenate-button. 회춘 5년 임시 버튼은 V3-C spend modal 의 precursor.
CyclePrepV2 / Result / Prep 테스트의 bpMax opt 제거.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Final verify + sweep — sim-cycle-v2 + AutoBattleController + 기타 dangling refs

**Files:**
- Modify: `games/inflation-rpg/scripts/sim-cycle-v2.ts` (bpMax / dead 잔여 제거)
- Modify: `games/inflation-rpg/src/cycle/AutoBattleController.ts` (만약 bp/dead 참조 있으면)
- Modify: 기타 grep 결과 잔여 파일

**Why:** T2-T8 사이 큰 변경 후 typecheck/lint 가 모든 caller 를 잡아냄. T9 가 마지막 sweep.

- [ ] **Step 1: 전 워크스페이스 typecheck**

```bash
pnpm typecheck
```

Errors 가 떨어지면 각 file 의 잔여 `bpMax`, `hero.bp`, `hero.dead`, `consumeBp` 등을 grep + 정리.

- [ ] **Step 2: 전 워크스페이스 lint**

```bash
pnpm lint
```

- [ ] **Step 3: vitest 전체 실행**

```bash
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 모든 케이스 통과. 일부 케이스는 의미적으로 obsolete (BP-bounded death 검증 등) → 삭제 또는 staggered 로 의미 재정의.

- [ ] **Step 4: e2e**

```bash
pnpm --filter @forge/game-inflation-rpg e2e -- --reporter=list
```

기존 6 e2e 중 bp/dead 의존하는 케이스가 있다면 수정. (`v9-migration.spec.ts` 는 v8→v18 migration 테스트인데 V3-B 가 v18→v19 추가했으므로 expected store version 만 19 로 업데이트하면 됨.)

- [ ] **Step 5: dev shell 수동 sanity (optional)**

```bash
pnpm dev
```

- 새 cycle 시작 → HUD 의 BP 가 안 보이고 "빛 0 · 재생 #0 · 회춘 5년" 버튼 보이는지
- 1-2분 켜놓고 chapter_transition (어린→청년) 정상
- meta.light 가 어떻게 누적되는지는 V3-C scope — V3-B 는 단지 "light 자원이 존재" 만 보장

- [ ] **Step 6: V3-B 머지 + tag (controller 책임)**

이 task 는 implementer 가 직접 머지/태그 하지 않는다. 모든 검증 통과 후 controller 가 `finishing-a-development-branch` skill 로 main 에 머지하고 `phase-v3-b-complete` tag 부착.

- [ ] **Step 7: Step 1-4 가 모두 green 이면 별도 commit 없음 (검증만). 만약 sweep 으로 file 수정했으면:**

```bash
git add <touched files>
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
chore(v3-b): final sweep — dangling bp/dead references

V3-B step 9: post-refactor cleanup of bpMax / hero.bp / hero.dead /
consumeBp residue in sim-cycle-v2 scripts and tests. typecheck +
lint + vitest + e2e all green.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage (§9 V3-B):**

| Spec bullet | Task |
|---|---|
| `HeroEntity.bp` 폐기 | T2 (field drop + opts removal) |
| Action-time aging tick | T3 (ageFromActions) + T5 (tickAge per arrival) |
| 디버프 시스템 (age >= N) | T6 (getAgingDebuff + recomputeStats) |
| 회춘 spend handler | T7 (rejuvenationCost + cycleSliceV2.rejuvenateHero) |
| saga "재생 #K" marker | T7 (NarrativeGenerator.forRejuvenation + SagaEventType 'rejuvenation') |
| persist v19 migration | T1 (clean reset) |

§9 V3-B 의 6 bullet 모두 task mapping 됨.

**Decisions baked in:**
1. BP 완전 폐기 ✓ (T2 가 필드 자체 삭제)
2. 회춘 cost = `(age-5) * 10` 빛 ✓ (T7 의 `rejuvenationCost`)
3. v19 = clean reset ✓ (T1 의 `migrateV18ToV19` 가 모든 v18 state drop)

**Placeholder scan:**
- T1 Step 3 의 "If named differently, use that name" 는 implementer 가 한 grep 으로 즉시 확인 가능 (실패 placeholder 아님 — 단순 grep guidance).
- T8 의 "또는 기존 selector 패턴 따라" — 동등하게, 단일 grep 으로 확인 가능.
- T9 의 v9-migration.spec.ts 업데이트 — 구체적 hint 제공 ("expected store version 만 19 로").
- 실제 "TBD"/"TODO" 표기 없음.

**Type consistency:**
- `ageFromActions(actions)` / `actionsForAge(age)` — T3 정의, T2 의 `tickAge`/`rejuvenate` 와 일치
- `getAgingDebuff(age): { atkMul, hpMul, moveMul }` — T6 정의, T6 의 `recomputeStats` 와 일치
- `rejuvenationCost(age): number` — T7 정의, T7/T8 양쪽 사용
- `SagaEventType` 의 `'rejuvenation'` 추가 — T7 SagaTypes + T7 NarrativeGenerator/cycleSliceV2 일관 사용
- `HeroCreateOpts` 의 `bpMax` 제거 — T2 정의, T5 (CycleControllerV2Opts 도 추가 제거 명시) 와 일관

**Scope estimate:**
- T1: ~20분 (migration + 1 test case)
- T2: ~45분 (HeroEntity 큰 refactor + 3-4 테스트 파일 sweep)
- T3: ~20분 (HeroLifecycle helper + test)
- T4: ~30분 (EncounterEngine sweep 7 호출 + 3-4 케이스 정리)
- T5: ~30분 (Controller + 두 test file sweep)
- T6: ~25분 (debuff helper + recomputeStats hook)
- T7: ~35분 (rejuvenation + saga + slice + 테스트)
- T8: ~20분 (HUD + 5 file sweep)
- T9: ~15분 (final verify, sweep 잔여)

총 ~4h 20분 → spec 4-6h 범위.

**Risks:**
- T2 의 ripple — bpMax opt 제거 시 모든 caller (8-10 파일) 가 컴파일 깨짐. T2 의 sweep + T5 / T8 / T9 가 cleanup. 만약 ripple 이 너무 크면 T2 를 두 commit 으로 쪼개기 (코드 변경 + 테스트 sweep).
- T7 의 useGameStore.setState 패턴 — 기존 cycleSliceV2 에서 이미 사용하므로 OK.
- v9-migration.spec.ts 의 store version 단언 — 19 로 업데이트 필요. T9 에서 잡힘.

---

— Plan 작성 완료 (2026-05-23, writing-plans v3 산출물).
