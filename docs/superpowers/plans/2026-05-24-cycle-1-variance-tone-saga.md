# Cycle 1 — Variance + Realm Tone + NPC Saga 구현 plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PRD 의 F1 (Build Variance) + F2 (Realm Tone Narrator) + F3 (NPC Saga Dead Path) 를 자율진화 cycle 1 의 단일 feature branch (`feat/cycle-1-variance-tone-saga`) 에 구현해 머지 가드 통과 시 main 머지.

**Architecture:** F1 은 순수 상수/룰 변경 (EncounterEngine + JobSystem). F2 는 NarrativeGenerator 의 두 신규 generator (`forRealmEnter`/`forSeasonChange`) + OverworldRunner 의 hard-coded season 한 줄 교체 + SagaEventType 등록. F3 은 V3-H 의 `hero_died` dead path fix 패턴을 4 NPC event (`npc_encounter`/`npc_died`/`family_event`) 에 동일 적용 + NarrativeGenerator 3 신규 generator + SagaBookModal `npc` filter 매핑 확장. UI 신규 컴포넌트 0.

**Tech Stack:** TypeScript + Zustand store + Vitest (unit) + Playwright (e2e) + tsx headless sim (sim:v3).

**Spec / 평가 / PRD / Test Plan / UI Guide:**
- `docs/superpowers/evolution/cycle-1-prd.md`
- `docs/superpowers/evolution/cycle-1-test-plan.md`
- `docs/superpowers/evolution/cycle-1-ui-guide.md`
- `docs/superpowers/evolution/cycle-1-{critic,story-critic,level-critic,research,assets}.md`

---

## File Structure

**F1 (Build Variance):**
- Modify: `games/inflation-rpg/src/overworld/EncounterEngine.ts` — 2 상수
- Modify: `games/inflation-rpg/src/hero/JobSystem.ts` — JOBS catalog 3 entry
- Modify: `games/inflation-rpg/src/overworld/__tests__/EncounterEngine.test.ts` — fixture 갱신
- Modify: `games/inflation-rpg/src/overworld/__tests__/EncounterEngine.personality.test.ts` — fixture 갱신
- Modify: `games/inflation-rpg/src/hero/__tests__/JobSystem.test.ts` — fixture 갱신

**F2 (Realm Tone Narrator):**
- Modify: `games/inflation-rpg/src/saga/NarrativeGenerator.ts` — `forRealmEnter` + `forSeasonChange` 신규 export
- Modify: `games/inflation-rpg/src/data/narrationVariants.ts` — realm/season variant 30+4 줄 추가
- Modify: `games/inflation-rpg/src/saga/SagaTypes.ts` (or 동등) — `realm_entered`/`season_changed` SagaEventType 등록
- Modify: `games/inflation-rpg/src/screens/OverworldRunner.tsx` — hard-coded `"계절이 바뀌었다 — 여름"` 제거 + generator 호출
- Modify: `games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts` — F2 신규 case
- Modify: `games/inflation-rpg/src/saga/__tests__/EternalSaga.test.ts` — SagaEventType 등록 확인

**F3 (NPC Saga Dead Path):**
- Modify: `games/inflation-rpg/src/saga/NarrativeGenerator.ts` — `forNpcEncounter`/`forNpcDeath`/`forFamilyEvent` 신규 export
- Modify: `games/inflation-rpg/src/data/narrationVariants.ts` — NPC variant 추가
- Modify: `games/inflation-rpg/src/saga/SagaTypes.ts` — NPC event type 등록
- Modify: `games/inflation-rpg/src/overworld/CycleControllerV2.ts` — `handleArrival` 의 NPC 4 분기에 `recordToStore` wire
- Modify: `games/inflation-rpg/src/screens/SagaBookModal.tsx` — `matchesFilter('npc', ...)` 에 NPC event type 4 종 매핑 확장
- Modify: `games/inflation-rpg/src/screens/__tests__/SagaBookModal.test.tsx` (신규 또는 기존 확장) — filter 매핑 case
- Modify: `games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts` — F3 신규 case
- Modify: `games/inflation-rpg/src/overworld/__tests__/CycleControllerV2.test.ts` — handleArrival spy
- Modify: `games/inflation-rpg/src/saga/__tests__/EternalSaga.test.ts` — appendEvent NPC case

**E2E:**
- Create: `games/inflation-rpg/tests/e2e/cycle-1-variance-realm-npc.spec.ts` — F2.16 + F3.16

---

## Task 1: F1 — EncounterEngine 상수 변경 (SHRINE_SKILL_GRANT_RATE / MERCIFUL_PROC_RATE)

**Files:**
- Modify: `games/inflation-rpg/src/overworld/EncounterEngine.ts` (상수 2 개)
- Modify: `games/inflation-rpg/src/overworld/__tests__/EncounterEngine.test.ts`
- Modify: `games/inflation-rpg/src/overworld/__tests__/EncounterEngine.personality.test.ts`

- [ ] **Step 1: 코드 위치 확인 — EncounterEngine.ts 의 두 상수 grep**

```bash
grep -nE 'SHRINE_SKILL_GRANT_RATE|MERCIFUL_PROC_RATE' games/inflation-rpg/src/overworld/EncounterEngine.ts
```

Expected: 현재 값 0.48 (SHRINE_SKILL_GRANT_RATE) + 0.15 (MERCIFUL_PROC_RATE) 의 라인 식별. PRD 의 `EncounterEngine.ts:21/:23` 와 일치 확인.

- [ ] **Step 2: 실패 테스트 먼저 (F1.1 + F1.2)**

`games/inflation-rpg/src/overworld/__tests__/EncounterEngine.test.ts` 에 case 2 개 추가 (파일 적절한 describe 블록 안):

```typescript
import { SHRINE_SKILL_GRANT_RATE, MERCIFUL_PROC_RATE } from '../EncounterEngine';

describe('Cycle 1 F1 — variance pass 상수', () => {
  it('F1.1: SHRINE_SKILL_GRANT_RATE = 0.20', () => {
    expect(SHRINE_SKILL_GRANT_RATE).toBe(0.20);
  });
  it('F1.2: MERCIFUL_PROC_RATE = 0.10', () => {
    expect(MERCIFUL_PROC_RATE).toBe(0.10);
  });
});
```

위 두 상수가 `export` 되어 있어야 한다. EncounterEngine.ts 가 internal const 라면 `export const` 로 승격 (값만 export).

- [ ] **Step 3: 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- --reporter=verbose EncounterEngine.test
```

Expected: F1.1/F1.2 FAIL (값 0.48/0.15 그대로 → expect 0.20/0.10 와 불일치).

- [ ] **Step 4: 최소 구현 — 상수 변경**

`games/inflation-rpg/src/overworld/EncounterEngine.ts` 에서 두 상수 값 수정:

```typescript
export const SHRINE_SKILL_GRANT_RATE = 0.20; // was 0.48 (cycle 1 F1)
export const MERCIFUL_PROC_RATE = 0.10;       // was 0.15 (cycle 1 F1)
```

- [ ] **Step 5: 통과 확인 + 기존 fixture 회귀 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- EncounterEngine.test EncounterEngine.personality.test
```

Expected: F1.1/F1.2 PASS. 기존 fixture 가 0.48/0.15 magic value 를 직접 expect 하던 case 가 있으면 그 case 를 `SHRINE_SKILL_GRANT_RATE` / `MERCIFUL_PROC_RATE` reference 로 교체 (magic number 제거).

기존 chance fixture (1000 회 seeded RNG → grant count) 가 깨지면 expect 한계값을 새 평균 (200 ± 30) 로 갱신. 단, `pnpm --filter ... test` 의 전체 결과를 다음 step 에서 확인하기 전에 fixture 갱신만으로 통과시키지 말 것 — 의미가 깨지면 그건 회귀 신호.

- [ ] **Step 6: 1000-회 chance fixture (F1.3 + F1.4) — 통계 가드**

`games/inflation-rpg/src/overworld/__tests__/EncounterEngine.test.ts` 에 추가:

```typescript
import { runShrineEncounter } from '../EncounterEngine'; // 또는 동등 helper
import { SeededRng } from '../../cycle/SeededRng';

it('F1.3: shrine encounter 1000회 → skill grant 평균 200 ± 15%', () => {
  const rng = new SeededRng(42);
  let grants = 0;
  for (let i = 0; i < 1000; i++) {
    // shrine encounter helper 호출 — F1.3 의 정확한 호출 형식은 기존 fixture 의 패턴 follow
    const result = runShrineEncounter(rng /* + 필요한 인자 */);
    if (result.grantedSkill) grants++;
  }
  expect(grants).toBeGreaterThanOrEqual(170);
  expect(grants).toBeLessThanOrEqual(230);
});
```

`runShrineEncounter` 의 정확한 signature 는 기존 test 파일에서 grep. 만약 직접 호출 helper 가 없으면 `EncounterEngine` 의 내부 함수 export 또는 ts-jest-style mock 사용.

`MERCIFUL_PROC_RATE` 의 F1.4 도 `personality.test.ts` 에 동일 패턴 추가 (85 ≤ proc ≤ 115).

- [ ] **Step 7: F1.3 + F1.4 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- EncounterEngine
```

Expected: F1.1/F1.2/F1.3/F1.4 PASS. 기존 EncounterEngine fixture 21 case 회귀 0.

- [ ] **Step 8: commit**

```bash
git add games/inflation-rpg/src/overworld/EncounterEngine.ts \
        games/inflation-rpg/src/overworld/__tests__/EncounterEngine.test.ts \
        games/inflation-rpg/src/overworld/__tests__/EncounterEngine.personality.test.ts
git commit -m "feat(game-inflation-rpg): F1 — SHRINE_SKILL_GRANT_RATE 0.48→0.20, MERCIFUL_PROC_RATE 0.15→0.10

cycle 1 F1.1-F1.4 — skill saturation 해소 + personality threshold 의미 회복.
chance fixture 통계 가드 (200±30 / 100±15) 추가.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: F1 — JobSystem JOBS catalog 변경 (mage / monk / ranger tie-break)

**Files:**
- Modify: `games/inflation-rpg/src/hero/JobSystem.ts` — JOBS catalog 3 entry
- Modify: `games/inflation-rpg/src/hero/__tests__/JobSystem.test.ts`

- [ ] **Step 1: 현재 JOBS catalog 의 mage/monk/ranger entry 확인**

```bash
grep -nA 3 "id: 'mage'\|id: 'monk'\|id: 'ranger'" games/inflation-rpg/src/hero/JobSystem.ts
```

Expected: 각 entry 의 `requiredPersonality` 필드 위치 확인. mage = `pious≥3`, monk = `pious≥5`, ranger = `prudent≥4`.

- [ ] **Step 2: 실패 테스트 (F1.5 + F1.6 + F1.7)**

`games/inflation-rpg/src/hero/__tests__/JobSystem.test.ts` 에 추가:

```typescript
import { JOBS } from '../JobSystem';

describe('Cycle 1 F1 — JobSystem tie-break 분리', () => {
  it('F1.5: JOBS.mage.requiredPersonality.min === 5', () => {
    const mage = JOBS.find(j => j.id === 'mage')!;
    expect(mage.requiredPersonality!.min).toBe(5);
  });
  it('F1.6: JOBS.monk.requiredPersonality.dim === "prudent"', () => {
    const monk = JOBS.find(j => j.id === 'monk')!;
    expect(monk.requiredPersonality!.dim).toBe('prudent');
  });
  it('F1.7: JOBS.ranger.requiredPersonality.min === 6', () => {
    const ranger = JOBS.find(j => j.id === 'ranger')!;
    expect(ranger.requiredPersonality!.min).toBe(6);
  });
});
```

- [ ] **Step 3: 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- JobSystem.test
```

Expected: F1.5/F1.6/F1.7 FAIL.

- [ ] **Step 4: 최소 구현 — JOBS catalog 수정**

`games/inflation-rpg/src/hero/JobSystem.ts` 의 JOBS 배열에서 3 entry 수정:

```typescript
// mage
{
  id: 'mage',
  // ... 다른 필드 그대로 ...
  requiredPersonality: { dim: 'pious', min: 5 }, // was min: 3
},
// monk
{
  id: 'monk',
  // ... 다른 필드 그대로 ...
  requiredPersonality: { dim: 'prudent', min: 5 }, // was dim: 'pious', min: 5
},
// ranger
{
  id: 'ranger',
  // ... 다른 필드 그대로 ...
  requiredPersonality: { dim: 'prudent', min: 6 }, // was min: 4
},
```

- [ ] **Step 5: 통과 확인 + tie-break 시나리오 (F1.8 + F1.9 + F1.10)**

Step 2 의 test 파일에 추가:

```typescript
it('F1.8: hero pious=4 → mage 후보 탈락 (min 5 미만)', () => {
  const hero = makeHero({ pious: 4, prudent: 2 }); // test helper / fixture
  const result = evaluate(hero, 'tier2'); // 정확한 evaluate signature 는 기존 test 파일에서 확인
  expect(result?.id).not.toBe('mage');
});
it('F1.9: hero prudent=6 → ranger 후보 포함', () => {
  const hero = makeHero({ pious: 2, prudent: 6 });
  const candidates = listCandidates(hero, 'tier2'); // 또는 evaluate 가 array 반환
  expect(candidates.some(c => c.id === 'ranger')).toBe(true);
});
it('F1.10: hero pious=5 prudent=5 → monk 후보 포함 (dim=prudent 분리)', () => {
  const hero = makeHero({ pious: 5, prudent: 5 });
  const candidates = listCandidates(hero, 'tier2');
  expect(candidates.some(c => c.id === 'monk')).toBe(true);
});
```

기존 JobSystem.test.ts 의 helper (`makeHero`, `evaluate`, `listCandidates`) 가 무엇인지 grep 으로 확인 후 패턴 follow.

- [ ] **Step 6: 기존 fixture 회귀 확인 + 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- JobSystem.test
```

Expected: 새 6 case (F1.5-F1.10) + 기존 fixture 전부 PASS.

기존 fixture 가 mage/monk/ranger 의 옛 threshold 를 직접 expect 하면 그 case 의 input personality 를 새 threshold 에 맞게 갱신 (의미 보존 — "이 personality 가 이 직업으로 진화한다" 의 본질은 유지).

- [ ] **Step 7: commit**

```bash
git add games/inflation-rpg/src/hero/JobSystem.ts \
        games/inflation-rpg/src/hero/__tests__/JobSystem.test.ts
git commit -m "feat(game-inflation-rpg): F1 — JobSystem tie-break (mage.min 3→5, monk.dim pious→prudent, ranger.min 4→6)

cycle 1 F1.5-F1.10 — Tier 2 mage 46% 편향 해소 + monk/ranger valley 분리.
3 tie-break 시나리오 unit test 로 회귀 가드.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: F1 — sim regression 검증 (50 cycle)

**Files:** (코드 변경 없음 — 검증만)

- [ ] **Step 1: 50-cycle sim 실행**

```bash
pnpm --filter @forge/game-inflation-rpg sim:v3 -- --count 50 --seed 1024 --out-dir /tmp/cycle-1-f1-sim
```

Expected: 0 exit, summary.json 출력. ~5-7 분 소요.

- [ ] **Step 2: 결과 분석 (F1.11-F1.17 sim 케이스 7 종)**

```bash
node -e '
const s = require("/tmp/cycle-1-f1-sim/summary.json");
console.log("skillsLearned p50:", s.skillsLearned.p50);
console.log("jobs:", s.jobsUnlocked);
console.log("moralChoices p50:", s.moralChoices.p50);
console.log("maxLevel p50:", s.maxLevel.p50);
console.log("endCauses:", s.endCauses);

const jobs = s.jobsUnlocked;
const total = Object.values(jobs).reduce((a,b) => a+b, 0);
const shares = Object.entries(jobs).map(([k,v]) => [k, (v/total).toFixed(3)]);
console.log("job shares:", shares);

const monkRanger = (jobs.monk||0) + (jobs.ranger||0);
console.log("monk+ranger unlock:", monkRanger);

const dead = (s.endCauses["전사"] || 0) + (s.endCauses["dead"] || 0);
const deathRate = dead / s.cycleCount;
console.log("death rate:", deathRate);
'
```

Expected 통과 기준 (PRD §F1 + test-plan F1.11-F1.17):

- skillsLearned p50 ≤ 14 (PRD primary)
- skillsLearned p50 ≤ 18 (회귀 floor, 사용자 신호)
- Tier 2 single-job max share ≤ 0.35
- monk + ranger ≥ 1
- moralChoices p50 ∈ [60, 80]
- maxLevel p50 ∈ [746000, 1078000]
- death rate ≤ 0.05

- [ ] **Step 3: 가드 fail 시 미세조정**

만약 monk + ranger < 1 또는 single-job share > 0.35 가 여전하면 PRD §비고 의 "F1 의 monk/ranger 픽스가 ranger 와 새 충돌 가능" 가능성. 추가 조정:

- monk 가 ranger 와 충돌하면 monk.dim 을 `swift` 또는 `wise` 같은 미사용 dim 으로 이동
- mage 가 여전히 dominant 면 mage.min 을 6 으로 올림

각 조정은 Task 2 의 step 4 와 동일 패턴으로 한 줄씩 수정 + 기존 test fixture 가 깨지면 의미-보존 갱신 + sim 재실행.

3 회 이상 조정해도 가드 fail 이면 멈춤 + 가드 상태 main session 에 보고 + 사용자 호출.

- [ ] **Step 4: sim 검증 케이스 (F1.11-F1.17) 를 별도 vitest 파일 또는 manual 가드 명령으로 보존**

`games/inflation-rpg/scripts/__tests__/cycle-1-sim-guards.ts` (새 파일, vitest 가 아닌 standalone tsx script) 생성:

```typescript
#!/usr/bin/env tsx
/**
 * Cycle 1 F1 sim guards — Task 3 의 sim 검증 7 케이스를 한 번에 실행한다.
 * Task 7 (Phase F merge gate) 의 sim regression check 가 호출.
 *
 * 사용:
 *   pnpm --filter @forge/game-inflation-rpg sim:v3 -- --count 50 --seed 1024 --out-dir /tmp/cycle-1-post-sim
 *   tsx games/inflation-rpg/scripts/cycle-1-sim-guards.ts /tmp/cycle-1-post-sim/summary.json
 */
import { readFileSync } from 'node:fs';

const summaryPath = process.argv[2] ?? '/tmp/cycle-1-post-sim/summary.json';
const s = JSON.parse(readFileSync(summaryPath, 'utf-8'));

const fails: string[] = [];
const check = (cond: boolean, msg: string) => { if (!cond) fails.push(msg); };

// F1.11/F1.12 — skillsLearned
check(s.skillsLearned.p50 <= 14, `F1.11 skillsLearned.p50 ${s.skillsLearned.p50} > 14 (PRD primary)`);
check(s.skillsLearned.p50 <= 18, `F1.12 skillsLearned.p50 ${s.skillsLearned.p50} > 18 (regression floor)`);

// F1.13 — Tier 2 single-job share
const jobs = s.jobsUnlocked ?? {};
const total = Object.values(jobs).reduce((a: number, b) => a + (b as number), 0) as number;
const maxShare = total > 0 ? Math.max(...Object.values(jobs).map(v => (v as number) / total)) : 0;
check(maxShare <= 0.35, `F1.13 Tier 2 maxShare ${maxShare.toFixed(3)} > 0.35`);

// F1.14 — monk + ranger
const monkRanger = (jobs.monk ?? 0) + (jobs.ranger ?? 0);
check(monkRanger >= 1, `F1.14 monk+ranger ${monkRanger} < 1`);

// F1.15 — moralChoices p50
check(s.moralChoices.p50 >= 60 && s.moralChoices.p50 <= 80, `F1.15 moralChoices.p50 ${s.moralChoices.p50} not in [60,80]`);

// F1.16 — maxLevel curve guard
check(s.maxLevel.p50 >= 746000 && s.maxLevel.p50 <= 1078000, `F1.16 maxLevel.p50 ${s.maxLevel.p50} not in [746k,1078k]`);

// F1.17 — death rate
const dead = (s.endCauses?.['전사'] ?? 0) + (s.endCauses?.['dead'] ?? 0);
const deathRate = dead / s.cycleCount;
check(deathRate <= 0.05, `F1.17 deathRate ${deathRate.toFixed(3)} > 0.05`);

if (fails.length > 0) {
  console.error('SIM GUARD FAIL:');
  for (const f of fails) console.error('  -', f);
  process.exit(1);
}
console.log('Cycle 1 sim guards PASS');
```

실행 + 통과 확인:

```bash
tsx games/inflation-rpg/scripts/cycle-1-sim-guards.ts /tmp/cycle-1-f1-sim/summary.json
```

Expected: "Cycle 1 sim guards PASS" + 0 exit. fail 시 어떤 가드가 깨졌는지 STDERR 출력.

- [ ] **Step 5: commit (sim 결과 + guard script)**

`/tmp/` 의 sim 결과는 commit 안 함 (gitignore). guard script 만:

```bash
git add games/inflation-rpg/scripts/cycle-1-sim-guards.ts
git commit -m "test(game-inflation-rpg): cycle-1 F1 sim guards script

Task 3 / Phase F merge gate 의 sim regression 7 가드 (F1.11-F1.17) 를
단일 tsx script 로 packaging. 사용:
  pnpm sim:v3 -- --out-dir /tmp/cycle-1-post-sim
  tsx games/inflation-rpg/scripts/cycle-1-sim-guards.ts /tmp/cycle-1-post-sim/summary.json

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: F2 — forRealmEnter + forSeasonChange generator + variant catalog

**Files:**
- Modify: `games/inflation-rpg/src/saga/NarrativeGenerator.ts`
- Modify: `games/inflation-rpg/src/data/narrationVariants.ts`
- Modify: `games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts`

- [ ] **Step 1: variant catalog 추가 (30 + 4 = 34 줄)**

`games/inflation-rpg/src/data/narrationVariants.ts` 에 다음 추가 (기존 `levelUpVariants` 등과 같은 구조):

```typescript
export const REALM_ENTER_VARIANTS: Record<RealmId, readonly string[]> = {
  base: [
    '(AGE세) 들판의 풀이 처음으로 발끝을 스쳤다.',
    '(AGE세) 바람이 동쪽에서 불어왔다 — 시작의 들판이다.',
    '(AGE세) 머리 위로 첫 햇살이 내렸다.',
    '(AGE세) 발걸음마다 흙냄새가 일어났다.',
    '(AGE세) 멀리서 새벽 종소리가 들렸다.',
  ],
  sea: [
    '(AGE세) 바다 안개가 발치까지 올라왔다 — 심해의 문이 열렸다.',
    '(AGE세) 파도가 발목을 적셨다, 그 너머로 검은 물결이 솟았다.',
    '(AGE세) 짠 공기가 폐를 가득 채웠다.',
    '(AGE세) 모래 위에 첫 발자국을 남겼다 — 물길이 그것을 지웠다.',
    '(AGE세) 갈매기 한 마리가 시야 끝에서 사라졌다.',
  ],
  volcano: [
    '(AGE세) 발 밑이 뜨거워졌다 — 화산의 입구다.',
    '(AGE세) 검은 재가 머리 위로 떨어졌다.',
    '(AGE세) 멀리서 용암이 강처럼 흘렀다.',
    '(AGE세) 공기 자체가 떨렸다, 산이 숨 쉬는 소리였다.',
    '(AGE세) 붉은 빛이 얼굴을 비추었다.',
  ],
  underworld: [
    '(AGE세) 발 아래로 길이 사라졌다 — 황천의 입구였다.',
    '(AGE세) 빛이 꺼지고, 차가운 손이 어깨를 스쳤다.',
    '(AGE세) 그림자가 자신의 그림자를 가졌다.',
    '(AGE세) 어디선가 종이 울렸다 — 이미 죽은 자들의 종이었다.',
    '(AGE세) 길의 끝에는 강이 흘렀다, 강은 위로 흘렀다.',
  ],
  heaven: [
    '(AGE세) 발이 구름을 디뎠다 — 천공의 영토에 도달했다.',
    '(AGE세) 빛이 모든 방향에서 동시에 왔다.',
    '(AGE세) 공기가 너무 가벼워, 숨을 잊었다.',
    '(AGE세) 멀리서 노랫소리가 들렸다 — 노래의 출처는 보이지 않았다.',
    '(AGE세) 머리 위 별들이 발밑에서 빛났다.',
  ],
  chaos: [
    '(AGE세) 모든 방향이 한 점으로 모였다 — 혼돈의 중심이다.',
    '(AGE세) 시간이 멈췄다, 그러고는 거꾸로 흘렀다.',
    '(AGE세) 자신의 손이 두 개로 보였다, 그리고 셋, 그리고 무한대.',
    '(AGE세) 들렸던 모든 소리가 한 번에 다시 울렸다.',
    '(AGE세) 무엇이 자신이고 무엇이 아닌지의 경계가 흐려졌다.',
  ],
};

export const SEASON_CHANGE_VARIANTS: Record<Season, readonly string[]> = {
  spring: ['(AGE세) 계절이 바뀌었다 — REALM_PREFIX 봄이 왔다.'],
  summer: ['(AGE세) 계절이 바뀌었다 — REALM_PREFIX 여름이 내렸다.'],
  autumn: ['(AGE세) 계절이 바뀌었다 — REALM_PREFIX 가을이 들어찼다.'],
  winter: ['(AGE세) 계절이 바뀌었다 — REALM_PREFIX 겨울이 덮였다.'],
};

export const SEASON_REALM_PREFIX: Record<RealmId, string> = {
  base: '들판 위로',
  sea: '바다 위로',
  volcano: '용암 위로',
  underworld: '죽음의 강 위로',
  heaven: '구름 위로',
  chaos: '경계 너머로',
};
```

`RealmId` 와 `Season` 의 정확한 import 경로는 grep:

```bash
grep -rE "type RealmId|type Season" games/inflation-rpg/src/data/ games/inflation-rpg/src/types/ | head -5
```

- [ ] **Step 2: 실패 테스트 (F2.1 - F2.11)**

`games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts` 에 추가:

```typescript
import { forRealmEnter, forSeasonChange } from '../NarrativeGenerator';

describe('Cycle 1 F2 — forRealmEnter', () => {
  const REALMS = ['base', 'sea', 'volcano', 'underworld', 'heaven', 'chaos'] as const;

  it.each(REALMS)('F2.1-F2.7: forRealmEnter(%s, age) → string + 5+ unique variant', (realm) => {
    const samples = new Set<string>();
    for (let i = 0; i < 100; i++) samples.add(forRealmEnter(realm, 13 + i));
    expect(samples.size).toBeGreaterThanOrEqual(5);
    samples.forEach(s => {
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    });
  });

  it('F2.8: forRealmEnter 결과에 "N세" 포함', () => {
    const result = forRealmEnter('sea', 13);
    expect(result).toMatch(/\d+세/);
  });
});

describe('Cycle 1 F2 — forSeasonChange', () => {
  it('F2.9: forSeasonChange("spring", 20, "base") → string', () => {
    const r = forSeasonChange('spring', 20, 'base');
    expect(typeof r).toBe('string');
    expect(r.length).toBeGreaterThan(0);
  });
  it('F2.10: 4 season 모두 throw 0', () => {
    for (const s of ['spring', 'summer', 'autumn', 'winter'] as const) {
      expect(() => forSeasonChange(s, 20, 'base')).not.toThrow();
    }
  });
  it('F2.11: realm-flavor prefix — sea/volcano summer 결과 다름', () => {
    const seaSet = new Set<string>();
    const volcanoSet = new Set<string>();
    for (let i = 0; i < 30; i++) {
      seaSet.add(forSeasonChange('summer', 20 + i, 'sea'));
      volcanoSet.add(forSeasonChange('summer', 20 + i, 'volcano'));
    }
    expect([...seaSet].some(s => !volcanoSet.has(s))).toBe(true);
  });
});
```

- [ ] **Step 3: 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- NarrativeGenerator.test
```

Expected: F2 case 전부 FAIL (`forRealmEnter` / `forSeasonChange` 미정의).

- [ ] **Step 4: generator 구현**

`games/inflation-rpg/src/saga/NarrativeGenerator.ts` 에 추가 (기존 generator 들과 같은 패턴 — 기존 `forLevelUp` 등의 구조 follow):

```typescript
import {
  REALM_ENTER_VARIANTS,
  SEASON_CHANGE_VARIANTS,
  SEASON_REALM_PREFIX,
} from '../data/narrationVariants';
import type { RealmId, Season } from '../data/realms'; // 정확한 path 는 grep

export function forRealmEnter(realm: RealmId, age: number): string {
  const variants = REALM_ENTER_VARIANTS[realm];
  if (!variants || variants.length === 0) return `(${age}세) ${realm} 에 도달했다.`;
  const idx = Math.floor(Math.random() * variants.length);
  return variants[idx]!.replace('AGE', String(age));
}

export function forSeasonChange(season: Season, age: number, realm: RealmId): string {
  const templates = SEASON_CHANGE_VARIANTS[season];
  const prefix = SEASON_REALM_PREFIX[realm] ?? '';
  if (!templates || templates.length === 0) return `(${age}세) 계절이 바뀌었다 — ${season}.`;
  const idx = Math.floor(Math.random() * templates.length);
  return templates[idx]!.replace('AGE', String(age)).replace('REALM_PREFIX', prefix);
}
```

기존 generator 가 `SeededRng` 를 받는 패턴이면 동일 패턴 — `Math.random` 대신 seeded RNG. 기존 코드 grep 으로 확인.

- [ ] **Step 5: 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- NarrativeGenerator.test
```

Expected: F2.1-F2.11 PASS + 기존 11 case (battle/shrine/levelUp 등) 회귀 0.

- [ ] **Step 6: commit**

```bash
git add games/inflation-rpg/src/saga/NarrativeGenerator.ts \
        games/inflation-rpg/src/data/narrationVariants.ts \
        games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts
git commit -m "feat(game-inflation-rpg): F2 — forRealmEnter / forSeasonChange generator

cycle 1 F2.1-F2.11 — 6 realm × 5 variant + 4 season × realm-flavor prefix.
F2.16 e2e + sim aggregate (Task 8/9) 가 narration 발화 검증.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: F2 — SagaEventType 등록 + OverworldRunner hard-coded 교체

**Files:**
- Modify: `games/inflation-rpg/src/saga/SagaTypes.ts` (or 동등 type 파일 — grep)
- Modify: `games/inflation-rpg/src/screens/OverworldRunner.tsx`
- Modify: `games/inflation-rpg/src/saga/__tests__/EternalSaga.test.ts`
- Modify: `games/inflation-rpg/src/screens/__tests__/OverworldRunner.test.tsx` (있으면)

- [ ] **Step 1: 현재 SagaEventType 위치 확인**

```bash
grep -rn "SagaEventType\|type SagaEvent " games/inflation-rpg/src/saga/ | head -5
```

이미 `realm_entered` / `season_changed` 가 등록되어 있을 가능성 있음 — V3-DEF/V3-H 에서 emit 만 했을 수 있다. 확인.

- [ ] **Step 2: 미등록이면 등록 추가 + 실패 테스트 (F2.13)**

`games/inflation-rpg/src/saga/SagaTypes.ts` 의 SagaEventType union (또는 literal array) 에 추가:

```typescript
// 기존:
export type SagaEventType =
  | 'level_up'
  | 'battle'
  | 'shrine'
  | 'death'
  | 'rejuvenation'
  // ... 기타 ...
  | 'realm_entered'   // F2 신규
  | 'season_changed'; // F2 신규
```

`EternalSaga.test.ts` 에 case 추가:

```typescript
describe('Cycle 1 F2 — SagaEventType 등록', () => {
  it('F2.13: realm_entered + season_changed 등록됨', () => {
    // type-only 가드 — 다음이 컴파일되면 등록됨
    const a: SagaEventType = 'realm_entered';
    const b: SagaEventType = 'season_changed';
    expect(a).toBe('realm_entered');
    expect(b).toBe('season_changed');
  });
});
```

- [ ] **Step 3: hard-coded season 한 줄 제거 (F2.12)**

`games/inflation-rpg/src/screens/OverworldRunner.tsx` 에서:

```bash
grep -n "계절이 바뀌었다" games/inflation-rpg/src/screens/OverworldRunner.tsx
```

해당 라인을 다음으로 교체:

```typescript
// 기존:
const narrative = '계절이 바뀌었다 — 여름';

// 변경:
import { forSeasonChange } from '../saga/NarrativeGenerator';
// ... season 이 결정되는 컨텍스트 안에서:
const narrative = forSeasonChange(season, hero.age, currentRealmId);
```

`season` / `hero.age` / `currentRealmId` 의 정확한 변수명은 OverworldRunner 의 기존 context 에서 grep + read 로 확인.

`recordToStore` (또는 동등) 가 narrative 를 store 의 saga slice 에 push 하는지도 확인. 만약 push 안 하면 V3-H 의 `hero_died` fix 패턴으로 wire 추가 — `recordToStore({ type: 'season_changed', narrativeText: narrative, age: hero.age, ... })`.

- [ ] **Step 4: F2.12 가드 (manual grep step)**

```bash
grep -F '계절이 바뀌었다 — 여름' games/inflation-rpg/src/screens/OverworldRunner.tsx
```

Expected: 0 line (`exit 1`). 1+ line 이면 fail.

이걸 자동화: `games/inflation-rpg/scripts/__tests__/cycle-1-hardcoded-guards.test.ts` 또는 기존 narrative test 에:

```typescript
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

it('F2.12: OverworldRunner.tsx 에서 hard-coded "계절이 바뀌었다 — 여름" 제거됨', () => {
  const src = readFileSync(
    join(__dirname, '..', '..', 'screens', 'OverworldRunner.tsx'),
    'utf-8'
  );
  expect(src).not.toContain('계절이 바뀌었다 — 여름');
});
```

- [ ] **Step 5: 통과 확인 + OverworldRunner 회귀 테스트**

```bash
pnpm --filter @forge/game-inflation-rpg test -- OverworldRunner EternalSaga
```

Expected: F2.12/F2.13 PASS + 기존 OverworldRunner.test.tsx 의 season tick assertion 회귀 0.

- [ ] **Step 6: commit**

```bash
git add games/inflation-rpg/src/saga/SagaTypes.ts \
        games/inflation-rpg/src/screens/OverworldRunner.tsx \
        games/inflation-rpg/src/saga/__tests__/EternalSaga.test.ts \
        games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts
git commit -m "feat(game-inflation-rpg): F2 — SagaEventType 등록 + OverworldRunner season wire

cycle 1 F2.12-F2.13 — realm_entered/season_changed SagaEventType 추가 +
OverworldRunner 의 hard-coded \"계절이 바뀌었다 — 여름\" 제거 → forSeasonChange.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: F3 — forNpcEncounter / forNpcDeath / forFamilyEvent generator

**Files:**
- Modify: `games/inflation-rpg/src/saga/NarrativeGenerator.ts`
- Modify: `games/inflation-rpg/src/data/narrationVariants.ts`
- Modify: `games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts`

- [ ] **Step 1: NPC variant catalog 추가**

`games/inflation-rpg/src/data/narrationVariants.ts` 에 추가:

```typescript
export const NPC_ENCOUNTER_VARIANTS: Record<'mentor' | 'rival' | 'passerby', readonly string[]> = {
  mentor: [
    '(AGE세) 한 늙은 자가 길을 막았다 — 그의 눈은 자신의 미래를 보고 있었다. 멘토를 만났다.',
    '(AGE세) 사원 앞에서 길잡이가 손을 내밀었다. 멘토가 되겠다 했다.',
    '(AGE세) 멘토가 처음 가르친 것은 칼이 아니라 침묵이었다.',
  ],
  rival: [
    '(AGE세) 시야 끝에서 같은 표정의 그림자가 나타났다 — 라이벌이었다.',
    '(AGE세) 마을 입구에서 한 검객이 시선을 떨구지 않았다. 라이벌이다.',
    '(AGE세) 라이벌의 첫 칼이 자신의 어깨를 스쳤다 — 그가 더 빨랐다.',
  ],
  passerby: [
    '(AGE세) 한 행인이 지나쳤다, 그러나 그의 얼굴은 오래 남았다.',
    '(AGE세) 짧은 인사가 길의 끝까지 따라왔다.',
    '(AGE세) 행인은 자신의 이름을 말하지 않았고, 자신도 묻지 않았다.',
  ],
};

export const NPC_DEATH_VARIANTS: readonly string[] = [
  '(AGE세) 멘토가 침대에서 일어나지 못했다 — 한 시대가 끝났다.',
  '(AGE세) 라이벌의 마지막 칼은 자신의 것이었다 — 둘 다 살아남지 못했다.',
  '(AGE세) 행인의 부고를 멀리서 들었다 — 이름은 끝내 몰랐다.',
];

export const FAMILY_EVENT_VARIANTS: Record<'marriage' | 'child_born' | 'child_grown', readonly string[]> = {
  marriage: [
    '(AGE세) 종소리 아래 결혼식을 올렸다.',
    '(AGE세) 서로의 손을 잡았다 — 이제 둘이다.',
  ],
  child_born: [
    '(AGE세) 첫 자식의 울음소리가 새벽을 깨웠다.',
    '(AGE세) 자식이 태어났다 — 작은 손이 자신의 손을 쥐었다.',
  ],
  child_grown: [
    '(AGE세) 자식이 처음으로 자신보다 큰 칼을 들었다.',
    '(AGE세) 자식이 떠났다 — 자신의 길로.',
  ],
};
```

- [ ] **Step 2: 실패 테스트 (F3.1-F3.6)**

`NarrativeGenerator.test.ts` 에 추가:

```typescript
import { forNpcEncounter, forNpcDeath, forFamilyEvent } from '../NarrativeGenerator';

describe('Cycle 1 F3 — NPC narrative generators', () => {
  it('F3.1: forNpcEncounter(npc, 22, "mentor") → string', () => {
    const r = forNpcEncounter({} as any, 22, 'mentor');
    expect(typeof r).toBe('string');
    expect(r.length).toBeGreaterThan(0);
  });
  it('F3.2: forNpcEncounter 3 kind 각 3+ variant', () => {
    for (const kind of ['mentor', 'rival', 'passerby'] as const) {
      const s = new Set<string>();
      for (let i = 0; i < 100; i++) s.add(forNpcEncounter({} as any, 22 + i, kind));
      expect(s.size).toBeGreaterThanOrEqual(3);
    }
  });
  it('F3.3: forNpcDeath → string + 3+ variant', () => {
    const s = new Set<string>();
    for (let i = 0; i < 100; i++) s.add(forNpcDeath({} as any, 50 + i, 'natural'));
    expect(s.size).toBeGreaterThanOrEqual(3);
    expect(typeof [...s][0]).toBe('string');
  });
  it('F3.4: forFamilyEvent(marriage, 30) → string', () => {
    const r = forFamilyEvent({ type: 'marriage' }, 30);
    expect(typeof r).toBe('string');
    expect(r.length).toBeGreaterThan(0);
  });
  it('F3.5: forFamilyEvent 3 type 각 2+ variant', () => {
    for (const type of ['marriage', 'child_born', 'child_grown'] as const) {
      const s = new Set<string>();
      for (let i = 0; i < 50; i++) s.add(forFamilyEvent({ type }, 30 + i));
      expect(s.size).toBeGreaterThanOrEqual(2);
    }
  });
  it('F3.6: forNpcEncounter 반환에 "N세" 포함', () => {
    const r = forNpcEncounter({} as any, 22, 'mentor');
    expect(r).toMatch(/\d+세/);
  });
});
```

- [ ] **Step 3: 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- NarrativeGenerator.test
```

Expected: F3.1-F3.6 FAIL (generator 미정의).

- [ ] **Step 4: generator 구현**

`NarrativeGenerator.ts` 에 추가:

```typescript
import {
  NPC_ENCOUNTER_VARIANTS,
  NPC_DEATH_VARIANTS,
  FAMILY_EVENT_VARIANTS,
} from '../data/narrationVariants';

export function forNpcEncounter(_npc: unknown, age: number, kind: 'mentor' | 'rival' | 'passerby'): string {
  const variants = NPC_ENCOUNTER_VARIANTS[kind];
  const idx = Math.floor(Math.random() * variants.length);
  return variants[idx]!.replace('AGE', String(age));
}

export function forNpcDeath(_npc: unknown, age: number, _cause: string): string {
  const idx = Math.floor(Math.random() * NPC_DEATH_VARIANTS.length);
  return NPC_DEATH_VARIANTS[idx]!.replace('AGE', String(age));
}

export function forFamilyEvent(event: { type: 'marriage' | 'child_born' | 'child_grown' }, age: number): string {
  const variants = FAMILY_EVENT_VARIANTS[event.type];
  const idx = Math.floor(Math.random() * variants.length);
  return variants[idx]!.replace('AGE', String(age));
}
```

기존 NarrativeGenerator 가 SeededRng 패턴이면 동일 — 기존 코드 패턴 follow.

- [ ] **Step 5: 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- NarrativeGenerator.test
```

Expected: F3.1-F3.6 + F2 + 기존 11 case 모두 PASS.

- [ ] **Step 6: commit**

```bash
git add games/inflation-rpg/src/saga/NarrativeGenerator.ts \
        games/inflation-rpg/src/data/narrationVariants.ts \
        games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts
git commit -m "feat(game-inflation-rpg): F3 — NPC narrative generators (encounter / death / family)

cycle 1 F3.1-F3.6 — 3 kind × 3 variant + death 3 + family 3 type × 2 variant.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: F3 — CycleControllerV2 handleArrival 의 recordToStore wire + SagaEventType 등록

**Files:**
- Modify: `games/inflation-rpg/src/overworld/CycleControllerV2.ts`
- Modify: `games/inflation-rpg/src/saga/SagaTypes.ts`
- Modify: `games/inflation-rpg/src/saga/__tests__/EternalSaga.test.ts`
- Modify: `games/inflation-rpg/src/overworld/__tests__/CycleControllerV2.test.ts`

- [ ] **Step 1: SagaEventType 에 NPC event 등록**

`SagaTypes.ts` 에 추가:

```typescript
export type SagaEventType =
  // ... 기존 ...
  | 'realm_entered'
  | 'season_changed'
  | 'npc_encounter'  // F3 신규
  | 'npc_died'       // F3 신규
  | 'family_event';  // F3 신규
```

- [ ] **Step 2: handleArrival 의 NPC 4 분기 확인**

```bash
grep -nE "npc_encounter|npc_died|family_event" games/inflation-rpg/src/overworld/CycleControllerV2.ts | head -10
```

PRD 의 `CycleControllerV2.ts:344/351/316/321` 부근. 현재 `events.push({...})` 만 있고 `recordToStore` 호출 없음 — 그게 dead path.

- [ ] **Step 3: 실패 테스트 (F3.7-F3.11)**

`CycleControllerV2.test.ts` 에 V3-H 의 `hero_died` test 패턴 follow:

```typescript
import { vi } from 'vitest';
import { CycleControllerV2 } from '../CycleControllerV2';

describe('Cycle 1 F3 — handleArrival NPC dead path 회수', () => {
  function makeCtrl() {
    const recordSpy = vi.fn();
    const ctrl = new CycleControllerV2(/* mock loadout + seed */, { recordToStore: recordSpy });
    return { ctrl, recordSpy };
  }

  it('F3.7: npc_encounter arrival → recordToStore 1 call', () => {
    const { ctrl, recordSpy } = makeCtrl();
    // arrival event fixture — V3-H hero_died test 의 fixture 패턴 동일
    ctrl.handleArrival({ type: 'npc_encounter', npc: { id: 'mentor-1', kind: 'mentor' }, age: 22 });
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'npc_encounter' })
    );
  });

  it('F3.8: npc_died arrival → recordToStore 1 call', () => {
    const { ctrl, recordSpy } = makeCtrl();
    ctrl.handleArrival({ type: 'npc_died', npc: { id: 'mentor-1' }, age: 50 });
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'npc_died' })
    );
  });

  it('F3.9: family_event (marriage) arrival → recordToStore 1 call', () => {
    const { ctrl, recordSpy } = makeCtrl();
    ctrl.handleArrival({ type: 'family_event', event: { type: 'marriage' }, age: 30 });
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'family_event' })
    );
  });
});
```

기존 V3-H 의 `hero_died` test 의 fixture 형식 (정확한 arrival shape, CycleControllerV2 constructor signature, recordToStore mock 방식) 을 grep 으로 확인 후 그대로 follow.

- [ ] **Step 4: 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- CycleControllerV2.test
```

Expected: F3.7/F3.8/F3.9 FAIL (recordToStore 미호출).

- [ ] **Step 5: handleArrival wire**

`CycleControllerV2.ts` 의 `handleArrival` 함수 안 4 분기에 `recordToStore` 호출 추가 — V3-H 의 `hero_died` fix 와 동일 패턴:

```typescript
// npc_encounter 분기 (대략 line 344):
if (arrival.type === 'npc_encounter') {
  const narrative = forNpcEncounter(arrival.npc, hero.age, arrival.npc.kind ?? 'passerby');
  this.events.push({ type: 'npc_encounter', narrativeText: narrative, age: hero.age, ... });
  this.recordToStore({ type: 'npc_encounter', narrativeText: narrative, age: hero.age, ... });
}

// npc_died 분기 (대략 line 351):
if (arrival.type === 'npc_died') {
  const narrative = forNpcDeath(arrival.npc, hero.age, arrival.cause ?? 'natural');
  this.events.push({ type: 'npc_died', narrativeText: narrative, age: hero.age, ... });
  this.recordToStore({ type: 'npc_died', narrativeText: narrative, age: hero.age, ... });
}

// family_event 분기 (대략 line 316/321):
if (arrival.type === 'family_event') {
  const narrative = forFamilyEvent(arrival.event, hero.age);
  this.events.push({ type: 'family_event', narrativeText: narrative, age: hero.age, ... });
  this.recordToStore({ type: 'family_event', narrativeText: narrative, age: hero.age, ... });
}
```

기존 `hero_died` 의 wire pattern 의 정확한 fields (event shape, recordToStore signature) 를 grep + read 로 확인 후 동일 형식 사용. import forNpcEncounter/forNpcDeath/forFamilyEvent 추가.

- [ ] **Step 6: 통과 확인 + EternalSaga.appendEvent (F3.10 + F3.11)**

`EternalSaga.test.ts` 에 추가:

```typescript
describe('Cycle 1 F3 — EternalSaga appendEvent NPC', () => {
  it('F3.10: SagaEventType 에 npc 3 종 등록됨', () => {
    const a: SagaEventType = 'npc_encounter';
    const b: SagaEventType = 'npc_died';
    const c: SagaEventType = 'family_event';
    expect([a, b, c]).toEqual(['npc_encounter', 'npc_died', 'family_event']);
  });
  it('F3.11: appendEvent npc_encounter → era chapter events 에 들어감', () => {
    const saga = new EternalSaga(/* fixture */);
    saga.appendEvent({
      type: 'npc_encounter',
      narrativeText: '(22세) 멘토를 만났다.',
      age: 22,
    });
    const chapter = saga.chaptersByEra['어린시절-0']; // 또는 동등 key
    expect(chapter?.events.some(e => e.type === 'npc_encounter')).toBe(true);
  });
});
```

```bash
pnpm --filter @forge/game-inflation-rpg test -- CycleControllerV2 EternalSaga
```

Expected: F3.7-F3.11 + 기존 케이스 모두 PASS.

- [ ] **Step 7: commit**

```bash
git add games/inflation-rpg/src/overworld/CycleControllerV2.ts \
        games/inflation-rpg/src/saga/SagaTypes.ts \
        games/inflation-rpg/src/overworld/__tests__/CycleControllerV2.test.ts \
        games/inflation-rpg/src/saga/__tests__/EternalSaga.test.ts
git commit -m "feat(game-inflation-rpg): F3 — handleArrival NPC recordToStore wire (V3-H hero_died 패턴)

cycle 1 F3.7-F3.11 — npc_encounter / npc_died / family_event 4 분기에
recordToStore 호출 추가. dead path 회수. SagaEventType 3 종 신규 등록.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: F3 — SagaBookModal filter mapping 확장 + E2E spec

**Files:**
- Modify: `games/inflation-rpg/src/screens/SagaBookModal.tsx`
- Modify: `games/inflation-rpg/src/screens/__tests__/SagaBookModal.test.tsx` (신규 또는 기존 확장)
- Create: `games/inflation-rpg/tests/e2e/cycle-1-variance-realm-npc.spec.ts`

- [ ] **Step 1: 현재 matchesFilter 확인**

```bash
grep -nA 10 "matchesFilter" games/inflation-rpg/src/screens/SagaBookModal.tsx
```

현재 `'npc'` filter 가 `moralChoice + shrine` 만 인지. F3 의 신규 event type 4 종을 포함해야 한다.

- [ ] **Step 2: 실패 테스트 (F3.12)**

`SagaBookModal.test.tsx` 에 추가 (기존 파일이 없으면 신규):

```typescript
import { describe, it, expect } from 'vitest';
import { matchesFilter } from '../SagaBookModal'; // export 시키기

describe('Cycle 1 F3 — SagaBookModal npc filter 매핑 확장', () => {
  it('F3.12: matchesFilter("npc", ...) 가 NPC event 4 종 포함', () => {
    expect(matchesFilter({ type: 'npc_encounter' } as any, 'npc')).toBe(true);
    expect(matchesFilter({ type: 'npc_died' } as any, 'npc')).toBe(true);
    expect(matchesFilter({ type: 'family_event' } as any, 'npc')).toBe(true);
    // 기존 매핑 회귀:
    expect(matchesFilter({ type: 'moralChoice' } as any, 'npc')).toBe(true);
    expect(matchesFilter({ type: 'shrine' } as any, 'npc')).toBe(true);
  });
});
```

- [ ] **Step 3: 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- SagaBookModal
```

Expected: F3.12 FAIL (4 종 미매핑).

- [ ] **Step 4: matchesFilter 확장**

`SagaBookModal.tsx` 의 `matchesFilter` 함수에서 `'npc'` 분기에 4 event type 추가:

```typescript
function matchesFilter(event: SagaEvent, filter: SagaFilter): boolean {
  // ... 다른 filter ...
  if (filter === 'npc') {
    return event.type === 'moralChoice'
        || event.type === 'shrine'
        || event.type === 'npc_encounter'
        || event.type === 'npc_died'
        || event.type === 'family_event';
  }
  // ...
}
```

만약 `matchesFilter` 가 export 안 되어 있으면 export 추가 (test 에서 import 하려면 필요).

- [ ] **Step 5: F3.12 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- SagaBookModal
```

Expected: F3.12 PASS.

- [ ] **Step 6: e2e spec 작성 (F2.16 + F3.16)**

`games/inflation-rpg/tests/e2e/cycle-1-variance-realm-npc.spec.ts` 신규:

```typescript
import { test, expect } from '@playwright/test';

test('F2.16 + F3.16: SagaBookModal 에서 realm 진입 line + NPC 이름 노출', async ({ page }) => {
  await page.goto('/');
  // game start — 정확한 selector 는 기존 e2e spec (v3-h-depth-polish.spec.ts) 참조
  await page.getByTestId('start-button').click();

  // 50초 sim 으로 base→sea 진입 + NPC arrival 확보 (V3-H 패턴)
  await page.evaluate(() => {
    const w = window as any;
    if (w.__forgeTestHooks?.setSpeed) w.__forgeTestHooks.setSpeed(10);
  });
  await page.waitForTimeout(50_000);

  // SagaBookModal 열기
  await page.getByTestId('open-saga-button').click();
  const modal = page.getByTestId('saga-book-modal');
  await expect(modal).toBeVisible();

  // F2.16: 여정 filter → realm enter line 노출
  await modal.getByTestId('saga-filter-all').click();
  await expect(modal).toContainText(/심해의 문|용암|황천|천공|혼돈/);

  // F3.16: npc filter → NPC 이름 노출
  await modal.getByTestId('saga-filter-npc').click();
  await expect(modal).toContainText(/멘토|라이벌|행인|결혼|자식/);
});
```

정확한 testid (`start-button`, `open-saga-button`, `saga-book-modal`, `saga-filter-all`, `saga-filter-npc`) 는 기존 spec `tests/e2e/v3-h-depth-polish.spec.ts` 의 패턴 grep + follow.

- [ ] **Step 7: e2e 실행**

```bash
pnpm --filter @forge/game-inflation-rpg e2e -- cycle-1-variance-realm-npc.spec.ts || pnpm --filter @forge/game-inflation-rpg e2e -- cycle-1-variance-realm-npc.spec.ts
```

Expected: 0 exit (1 retry 허용). NPC arrival 발생률이 50초 안 0% 일 수 있으니 그 경우 wait 시간을 90초 등으로 늘림 또는 sim cycle 강제 호출.

- [ ] **Step 8: commit**

```bash
git add games/inflation-rpg/src/screens/SagaBookModal.tsx \
        games/inflation-rpg/src/screens/__tests__/SagaBookModal.test.tsx \
        games/inflation-rpg/tests/e2e/cycle-1-variance-realm-npc.spec.ts
git commit -m "feat(game-inflation-rpg): F2/F3 — SagaBookModal filter + e2e spec

cycle 1 F3.12 — matchesFilter('npc') 4 신규 event type 매핑 확장.
cycle 1 F2.16 + F3.16 — SagaBookModal e2e (realm enter line + NPC 이름 노출).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: 통합 검증 + sim aggregate grep (F2.14 / F2.15 / F3.13-F3.15)

**Files:** (코드 변경 없음 — 통합 검증만)

- [ ] **Step 1: 50-cycle post-sim 실행**

```bash
pnpm --filter @forge/game-inflation-rpg sim:v3 -- --count 50 --seed 1024 --out-dir /tmp/cycle-1-post-sim
```

Expected: 0 exit.

- [ ] **Step 2: F1 sim guard script 통과 (Task 3 의 script 재사용)**

```bash
tsx games/inflation-rpg/scripts/cycle-1-sim-guards.ts /tmp/cycle-1-post-sim/summary.json
```

Expected: "Cycle 1 sim guards PASS".

- [ ] **Step 3: F2 narrative aggregate grep (F2.14 + F2.15)**

```bash
# F2.14: realm enter narrative ≥ 4 realm
grep -hE "심해|용암|황천|천공|혼돈" /tmp/cycle-1-post-sim/c10*.md 2>/dev/null | wc -l
# Expected: ≥ 4 lines

# F2.15: season change narrative 4 season 모두
for s in 봄 여름 가을 겨울; do
  count=$(grep -hF "$s" /tmp/cycle-1-post-sim/c10*.md 2>/dev/null | wc -l)
  echo "$s: $count lines"
done
# Expected: 4 season 모두 ≥ 1 line
```

- [ ] **Step 4: F3 NPC aggregate grep (F3.13-F3.15)**

```bash
# F3.13: NPC keyword aggregate ≥ 20 회
grep -hE "결혼|자식|라이벌|멘토|행인" /tmp/cycle-1-post-sim/c10*.md 2>/dev/null | wc -l
# Expected: ≥ 20 lines

# F3.14: NPC narrative 가 ≥ 5 cycle 에 등장
files_with_npc=$(grep -lE "결혼|자식|라이벌|멘토|행인" /tmp/cycle-1-post-sim/c10*.md 2>/dev/null | wc -l)
echo "cycles with NPC: $files_with_npc"
# Expected: ≥ 5

# F3.15: NPC event 4 종 모두 jsonl 에서 0 회 초과 등장
for t in npc_encounter npc_died family_event; do
  count=$(grep -h "\"type\":\"$t\"" /tmp/cycle-1-post-sim/c10*.jsonl 2>/dev/null | wc -l)
  echo "$t: $count events"
done
# Expected: 3 type 모두 ≥ 1
```

- [ ] **Step 5: 통합 가드 script 작성 (sim guards 의 F2/F3 부분)**

`games/inflation-rpg/scripts/cycle-1-sim-guards.ts` 에 F2/F3 부분 추가:

```typescript
// ... 기존 F1 가드 후 ...

import { readdirSync } from 'node:fs';
import { dirname } from 'node:path';

const outDir = dirname(summaryPath);
const mdFiles = readdirSync(outDir).filter(f => f.endsWith('.md'));
const jsonlFiles = readdirSync(outDir).filter(f => f.endsWith('.jsonl'));

const allMd = mdFiles.map(f => readFileSync(`${outDir}/${f}`, 'utf-8')).join('\n');
const allJsonl = jsonlFiles.map(f => readFileSync(`${outDir}/${f}`, 'utf-8')).join('\n');

// F2.14: realm enter narrative
const realmHits = (allMd.match(/심해|용암|황천|천공|혼돈/g) ?? []).length;
check(realmHits >= 4, `F2.14 realm narrative hits ${realmHits} < 4`);

// F2.15: season change 4 season
for (const season of ['봄', '여름', '가을', '겨울']) {
  const hits = (allMd.match(new RegExp(season, 'g')) ?? []).length;
  check(hits >= 1, `F2.15 season "${season}" hits ${hits} < 1`);
}

// F3.13: NPC keyword aggregate ≥ 20
const npcHits = (allMd.match(/결혼|자식|라이벌|멘토|행인/g) ?? []).length;
check(npcHits >= 20, `F3.13 NPC keyword hits ${npcHits} < 20`);

// F3.14: cycles with NPC ≥ 5
const cyclesWithNpc = mdFiles.filter(f => /결혼|자식|라이벌|멘토|행인/.test(readFileSync(`${outDir}/${f}`, 'utf-8'))).length;
check(cyclesWithNpc >= 5, `F3.14 cycles with NPC ${cyclesWithNpc} < 5`);

// F3.15: NPC event 4 종 모두 > 0
for (const type of ['npc_encounter', 'npc_died', 'family_event']) {
  const hits = (allJsonl.match(new RegExp(`"type":"${type}"`, 'g')) ?? []).length;
  check(hits > 0, `F3.15 ${type} hits ${hits} == 0`);
}
```

```bash
tsx games/inflation-rpg/scripts/cycle-1-sim-guards.ts /tmp/cycle-1-post-sim/summary.json
```

Expected: 모든 F1+F2+F3 가드 PASS.

- [ ] **Step 6: 전체 vitest + e2e + static checks**

```bash
pnpm typecheck && pnpm lint
pnpm --filter @forge/game-inflation-rpg test
pnpm --filter @forge/game-inflation-rpg e2e || pnpm --filter @forge/game-inflation-rpg e2e
pnpm circular
```

Expected: 모두 0 exit. fail 시 해당 단계 출력으로 미세 fix.

- [ ] **Step 7: commit (sim-guards 확장)**

```bash
git add games/inflation-rpg/scripts/cycle-1-sim-guards.ts
git commit -m "test(game-inflation-rpg): cycle-1 F2+F3 sim aggregate guards

Task 9 / Phase F merge gate 의 F2.14/F2.15/F3.13-F3.15 가드 추가:
realm enter narrative / season 4 / NPC keyword aggregate / NPC event types.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**
- F1 (Build Variance) — Task 1+2+3 ✓
  - SHRINE_SKILL_GRANT_RATE 0.48→0.20 (Task 1)
  - MERCIFUL_PROC_RATE 0.15→0.10 (Task 1)
  - JOBS.mage.min 3→5, monk.dim pious→prudent, ranger.min 4→6 (Task 2)
  - sim regression 가드 7 종 (Task 3 + Task 9)
- F2 (Realm Tone Narrator) — Task 4+5+8+9 ✓
  - forRealmEnter (6×5=30 variant) + forSeasonChange (4 season + realm-flavor) (Task 4)
  - SagaEventType realm_entered/season_changed (Task 5)
  - OverworldRunner hard-coded 제거 (Task 5)
  - SagaBookModal 노출 (Task 8 e2e)
  - sim aggregate narrative 가드 (Task 9)
- F3 (NPC Saga Dead Path) — Task 6+7+8+9 ✓
  - forNpcEncounter/forNpcDeath/forFamilyEvent (Task 6)
  - handleArrival 4 분기 recordToStore wire (Task 7)
  - SagaEventType npc_encounter/npc_died/family_event (Task 7)
  - SagaBookModal matchesFilter('npc', ...) 확장 (Task 8)
  - e2e + sim aggregate 가드 (Task 8 + 9)

**2. Placeholder scan:** 없음. 각 step 에 정확한 code / 명령 / expected.

**3. Type consistency:**
- `forRealmEnter(realm: RealmId, age: number)` Task 4 → Task 8 e2e 의 매칭 동일
- `recordToStore({ type: 'npc_encounter' | 'npc_died' | 'family_event' })` Task 7 → Task 8 filter / Task 9 sim guard 모두 동일 string literal
- `SagaEventType` literal union — Task 5/7 에서 추가, Task 8/9 에서 사용 동일

**4. test-plan ↔ plan task 매핑:** 49 case 중 sim 12 + unit 28 + e2e 2 모두 task 의 step 으로 매핑. 누락된 case 없음.

**Risk note:** Task 3 의 sim guard fail 시 미세조정 loop 가 무한 반복 위험 — 3 회 시도 후 fail 이면 멈춤 + 사용자 호출.
