---
category: narrative
---

# Cycle 156 Test Plan — 이중 호칭 bug fix (1-line text + 1 신규 it block)

## 한 줄

`CLAIM_NARRATION_VARIANTS[0]` 의 자체 vocative `'용사여, '` 제거 + cycle 134/148
기존 8 assertion 자동 통과 검증 + 신규 it() 1 개 (이중 호칭 occurrence count 가드).
vitest 1486 → 1487. category: narrative (155 system → 156 narrative 전환).

## Baseline grep evidence (cycle 156 진입 시점)

```bash
grep -n "용사여\|그대여\|영웅이여\|친구여\|종이여\|동반자여\|길손이여\|장로여\|손이여" \
  games/inflation-rpg/src/data/claimNarrationVariants.ts
```

**실측 (cycle 155 baseline = ed12205)**:

```
13:  '용사여, 그대의 노고를 치하한다',
32:  '신참': '용사여',
33:  '노련': '오랜 길손이여',
34:  '숙련': '익숙한 손이여',
35:  '마스터': '장로여',
36:  '전설': '오랜 동반자여',
```

**해석**: variant 풀 line 11-27 안에 vocative 어휘는 line 13 단 1 회. 다른 11 줄은
vocative 부재 → `TIER_VOCATIVE_PREFIX` 5 entry 와 합성 시 이중 호칭 발생 0. 즉
**variant 0 만 단독 위험**, 다른 11 variant 는 회귀 가드 불요.

`TIER_VOCATIVE_PREFIX` 5 tier 중 `'용사여'` 와 직접 충돌하는 entry = `'신참'` 단
1 개 (line 32). 다른 4 tier ('길손이여' / '손이여' / '장로여' / '동반자여') 는
variant 풀과 어휘 겹침 0. fix 후 `'용사여'` 의 합성 출현은 *신참 tier × 임의
variant* 의 prefix 1 회뿐 (의도된 단일 호칭).

## 회귀 위험

| 영역 | 기존 테스트 파일 | 위험 사유 |
|---|---|---|
| **reference-comparison blind spot** (구조적 결함) | `claimNarrationVariants.test.ts:19,36,41,42` | 기존 4 assertion 모두 `CLAIM_NARRATION_VARIANTS[0]` *참조 비교* 라 base 자체에 버그가 있어도 양변이 동시에 버그 출력이 되어 통과. cycle 148 의 line 36 assertion 이 이중 호칭 bug 를 *놓친* 진원지. F1.1 신규 assertion 은 `split('용사여').length` 의 **occurrence count** 비교로 reference-equality blind spot 우회 |
| SeasonPassScreen claim feedback | `tests/e2e/cycle-127-live-ops.spec.ts` 패턴 | `pickClaimNarration(seed, tier)` 호출처. 시그니처 변경 0 + 반환형 변경 0 → e2e 영향 0 의무 |
| persist round-trip | `gameStore.persist.test.ts` (cycle 130 신설) | 텍스트 데이터 변경 only. persist version 변동 0 (v26 유지). saved game 영향 0 |
| TIER_VOCATIVE_PREFIX | `claimNarrationVariants.test.ts:45-50` | 5 tier prefix 자체 변경 0. cycle 148 의 5-tier 정의 invariant 보존 |
| 다른 11 variant | line 11-27 | grep 검증 = vocative 어휘 부재 (위 baseline 인용). 회귀 가드 불요지만 풀 크기 `=== 12` invariant 가 line 추가/제거를 차단 |

## 신규 케이스 매트릭스

### F1. CLAIM_NARRATION_VARIANTS[0] vocative 제거

| ID | 케이스 | type | 기대 결과 | 파일 |
|---|---|---|---|---|
| F1.1 | **신규 it()** — `pickClaimNarration(0, tier).split('용사여').length` occurrence count 가드 | unit | `pickClaimNarration(0, '신참').split('용사여').length === 2` (분리 1 회 = prefix 만, base 깨끗). `pickClaimNarration(0, '전설').split('용사여').length === 1` (분리 0 회 = '오랜 동반자여' prefix + cleaned base). 한 it() block 안 두 expect — vitest 1486 → **1487** (+1) | `games/inflation-rpg/src/data/__tests__/claimNarrationVariants.test.ts` |
| F1.2 | 풀 크기 `CLAIM_NARRATION_VARIANTS.length === 12` 유지 | unit | 기존 line 7-9 의 `toBeGreaterThanOrEqual(12)` 변경 0 통과. 신규 line 추가/제거 0. fix 는 *교체* only | same (line 7-9 기존) |
| F1.3 | legacy 8 assertion 변경 0 통과 | unit | line 19/20/21 (seed deterministic), line 24-26 (no-arg), line 30-31 (negative seed), line 36/37 (tier prefix), line 41/42 (tier undefined), line 45-50 (5 tier 정의) 모두 본문 수정 0 통과. **변경되는 *값*** = `pickClaimNarration(0)` 반환이 `'용사여, 그대의 노고를 치하한다'` → `'그대의 노고를 치하한다'`. assertion 은 `CLAIM_NARRATION_VARIANTS[0]` *참조 비교* 라 array 의 변경이 양변 동시 반영 → 자동 통과. **단 reference-comparison blind spot 잔존** — F1.1 신규 it() 이 이 결함 우회 가드 | same (기존 8 it() block) |
| F1.4 | vitest count `1486 → 1487` (회귀 0) | aggregate | `pnpm --filter @forge/game-inflation-rpg test` 결과 PASS = 1487. 1486 (no-op = scope drift) / 1485 이하 (회귀) / 1488 이상 (scope creep) 시 falsify | repo-wide |
| F1.5 | dev smoke — `'용사여, 용사여'` 부재 (수동) | manual | dev server 1× 30s 안 `/inflation-rpg` 진입 → 임의 cycle 진행 → claim → feedback 영역 텍스트에 `'용사여, 용사여'` substring 부재 (육안). Playwright 자동화 의무 X (PRD §"Sim-real parity 룰 미적용" 직접 회수) | dev server manual |
| F1.6 | **invariant** — line 13 글자 수 ≤ 50 자 | unit | 기존 line 11-15 의 `expect(v.length).toBeLessThanOrEqual(50)` for-loop 안에서 자동 검증. 실측 = `'그대의 노고를 치하한다'` 12자 (PRD §F1.4 의 "14자" 는 typo, 실측 12자) | same (기존 line 11-15) |

**F1 invariant**:
- `pickClaimNarration` 시그니처 / 반환형 변경 0 (PRD §"NOT this — pickClaimNarration 시그니처 확장")
- 풀 크기 12 (PRD §F1.3)
- TIER_VOCATIVE_PREFIX 5 entry 변경 0 (PRD §"NOT this — TIER_VOCATIVE_PREFIX 변경")
- 다른 11 variant 텍스트 변경 0 (PRD §F1 동작)

### 신규 it() block 예시 (F1.1 의 실체)

```ts
// Cycle 156 — 이중 호칭 bug 회귀 가드 (story-writer #2).
it('cycle 156 — variant 0 fix 후 이중 호칭 부재 (occurrence count 가드)', () => {
  // 신참 tier — prefix 1 회 + base 깨끗 → split 결과 길이 2 (분리 1 회)
  expect(pickClaimNarration(0, '신참').split('용사여').length).toBe(2);
  // 전설 tier — '오랜 동반자여' prefix + cleaned base → '용사여' 어휘 부재 → split 결과 길이 1
  expect(pickClaimNarration(0, '전설').split('용사여').length).toBe(1);
});
```

한 it() block 안 두 expect = vitest count 1 증가 (+1). 신참 + 전설 양방향 동시
검증으로 reference-equality blind spot 우회.

## 검증 명령

```bash
# 1. vitest baseline (1486 → 1487)
pnpm --filter @forge/game-inflation-rpg test

# 2. 영역 좁은 실행 (cycle 156 fix verify)
pnpm --filter @forge/game-inflation-rpg test src/data/__tests__/claimNarrationVariants

# 3. typecheck — pickClaimNarration 시그니처 변경 0 검증
pnpm --filter @forge/game-inflation-rpg typecheck

# 4. grep evidence — fix 후 1 hit (line 32 TIER_VOCATIVE_PREFIX 만), variant 풀 0 hit
grep -n "용사여" games/inflation-rpg/src/data/claimNarrationVariants.ts
# 기대 (fix 후): line 32 단 1 hit ('신참': '용사여'). line 13 의 hit 사라짐.

# 5. 다른 11 variant 의 vocative 부재 재확인 (회귀 가드)
grep -n "그대여\|영웅이여\|친구여\|종이여\|동반자여\|길손이여\|장로여\|손이여" \
  games/inflation-rpg/src/data/claimNarrationVariants.ts
# 기대 (fix 후): line 33-36 의 4 prefix entry 만 hit. variant 풀 line 11-27 = 0 hit.

# 6. dev smoke (선택 — PRD §F1.5)
pnpm --filter @forge/game-inflation-rpg dev
# → http://localhost:3000/inflation-rpg → cycle 진행 → claim → feedback 텍스트 육안

# 7. lint + circular (cycle 종료 의무)
pnpm lint
pnpm circular
```

## 통과 기준

- **vitest pass rate**: 100%, count = **1487** (+1 정확). 1486 → no-op, 1485↓ → 회귀, 1488↑ → scope creep.
- **typecheck**: 0 exit. `pickClaimNarration` 시그니처 / 반환형 변경 0.
- **lint / circular**: 0 exit. data file 변경 only — boundary 영향 0.
- **grep evidence (fix 후)**:
  - `grep -n "용사여" claimNarrationVariants.ts` → **1 hit** (line 32, TIER_VOCATIVE_PREFIX '신참')
  - variant 풀 line 11-27 → 0 hit
- **manual smoke (선택)**: dev server claim feedback 에 `'용사여, 용사여'` substring 부재.
- **e2e**: 추가 없음. 기존 chromium + iphone14 100% PASS 유지 (텍스트 데이터 변경이라 영향 0).
- **headless sim**: 측정 없음. PRD §"Δ-from-baseline 룰 미적용" + §"Sim-real parity 룰 미적용" 직접 회수.

## Sim-real parity 룰 적용 면제 사유

본 cycle 은 **sim-driven acceptance 0**. acceptance 5 항목 (F1.1~F1.5) 모두
unit test + manual smoke 단위. sim driver mirror 의무 / Playwright dual evidence
의무 모두 면제 (PRD §"Sim-real parity 검증 룰 미적용" 직접 회수). 향후 cycle
157 (balance) / cycle 163 (50-cycle sim) 진입 시점에서 dual evidence 룰 재
복귀.

## DoD 요약

- `claimNarrationVariants.ts:13` 텍스트 `'용사여, '` prefix 제거 (17자 → 12자, 글자 수 변동 -5. PRD §"변경 surface 추정" 의 "-2 자" 및 §F1.4 "14 자" 는 실측 시 모두 typo — `'용사여, '` = 5 chars (comma+space 포함) 제거가 실체)
- `claimNarrationVariants.test.ts` 신규 it() 1 개 추가 (F1.1, +5~8 줄)
- vitest **1487** PASS / 회귀 0
- typecheck / lint / circular 0 exit
- grep evidence 2 회 (baseline + fix 후) 모두 PRD §F1.1 의 occurrence count 가드와 정합

## 마무리 한 줄

> cycle 156 = **1-line text fix + 1 신규 it()**. deliverable 무게는 *reference-comparison blind spot 우회 가드*
> (F1.1 신규 occurrence-count assertion) 와 *carry-over 0 단일 cycle 완결* (slow-walk 패턴 끊기). variant 0 이
> 이중 호칭의 *유일한* 진원지 = grep 으로 확정. fix 후 `'용사여'` 의 출현은 신참 tier × 임의 variant 의
> prefix 1 회뿐. category: narrative (155 system → 156 narrative, 룰 9 안전).
