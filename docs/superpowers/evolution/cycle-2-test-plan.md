# Cycle 2 Test Plan

PRD: [`docs/superpowers/evolution/cycle-2-prd.md`](./cycle-2-prd.md)
직전 main HEAD: `7e0a230` / 직전 phase: V3-H Depth + Polish (`81bea39`) + Cycle 1 변경 merge (`9990cf2` 계열)
대상 워크스페이스: `@forge/game-inflation-rpg`
baseline: cycle 1 (seed 1024) + cycle 2 (seed 2048) 합산 100 cycle. 1088 vitest / 50 e2e pass 상태.

## 회귀 위험

- `docs/personas/01-game-planner.md` — F1 의 "절대 금지" 또는 "PRD 포맷" 섹션에 multi-seed 룰 3 줄 삽입. **persona file 의 markdown 구조만 변경 — 테스트 회귀 0**. 다만 implementer 가 다른 섹션을 잘못 건드리면 후속 cycle 의 brainstorming/writing-plans 스킬 체인이 룰을 못 읽음 → grep verify 필요.
- `docs/superpowers/evolution/cycle-2-backlog.md` — F1 이 B1 항목에 cross-link 1 줄 추가. 회귀 0 (doc only).
- `games/inflation-rpg/scripts/sim-cycle-v2.ts` — F2 의 `MAX_ARRIVALS` default `500 → 1000` 상향. `scripts/__tests__/sim-cycle-v2.smoke.test.ts` 의 smoke run 이 maxArrivals 명시 없이 실행되면 sim 시간 2배. test 가 timeout (vitest default 5s) 에 닿을 위험 — smoke test 가 `maxArrivals` opt 명시하는지 implementer 가 확인 필요.
- `games/inflation-rpg/scripts/cycle-1-sim-guards.ts` — cycle 1 의 14 sim guard 가 `maxArrivals=500` 가정 위에서 threshold 작성. F2 가 1000 으로 올리면 `maxLevel` p50 / `skillsLearnedCount` p50 등 모든 측정값이 자연 상승 (단순 시간 2배). **guard 가 sim:v3 옵션으로 maxArrivals 명시하는지 implementer 검증 필수** — guard 가 500 으로 고정 호출하면 기존 14 guard 영향 0, 새 1000 measurement 는 별도 entry.
- `src/overworld/CycleControllerV2.ts` — F2 의 회춘 trigger 확장 (`age >= 30 AND saga.arrivals >= 200` 또는 `age >= 50` 사망률 +1%/year). 기존 `hero_died → auto-rejuv 5년` path 유지. `src/overworld/__tests__/CycleControllerV2.test.ts` 의 `hero_died` 및 `chapter_transition` 케이스가 spy 카운트 변경 가능성 — 신규 trigger 가 cycle 안 narrative-only `rejuvenation` event 를 1+ 추가.
- `src/saga/NarrativeGenerator.ts` — F2 의 `forIdleRejuvenation(age, arrivals)` 신규 export. 기존 `forRejuvenation` 5 variant 회귀 0 필요.
- `src/data/narrationVariants.ts` — F3 의 `LEVELUP_BATCH_VARIANTS` 6 → 15, `MORAL_VARIANTS` 5 → 8, NPC variant 풀 확장. 기존 `NarrativeGenerator.test.ts` 의 levelUpBatch/moralChoice/npcEncounter case 가 첫 variant (seed=0) hard-code 어휘 의존인지 확인 — 의존 시 fixture 갱신 동반 필요.
- `src/screens/SagaBookModal.tsx` — F3 의 `recordToStore` 호출 증가로 NPC line 노출 빈도 증가. cycle 1 의 saga filter "관계" chip 이 이미 4 event type 흡수하므로 filter 매핑 회귀 0. 다만 한 cycle 안 라인 수 증가로 modal scroll 성능 검증 필요 (수동).
- `tests/e2e/v3-h-depth-polish.spec.ts` + `tests/e2e/cycle-1-variance-realm-npc.spec.ts` — F2 의 회춘 비트 추가가 saga line 카운트 증가 → 기존 50 cycle e2e 의 line-count assertion 이 ranges 형식이 아니면 깨질 위험. implementer 가 assertion 형태 확인.
- 시드 sim regression baseline: cycle 1 (seed 1024) + cycle 2 (seed 2048) 의 50 cycle each, `maxArrivals=500`. `maxLevel` p50 ≈ 816k~830k, `endCause=max_arrivals` ≈ 49/50, death rate ≈ 2%, `rejuvenation` 0/100, `hero_died` 1/100. **모든 cycle 2 sim 측정은 Δ-from-baseline 형식 (F1 룰 self-validation)**.

## 신규 케이스 매트릭스

### F1. Multi-seed Acceptance 룰 (persona doc 패치)

| ID | 케이스 | type | 기대 결과 | 파일 |
|---|---|---|---|---|
| F1.1 | `docs/personas/01-game-planner.md` 에 multi-seed 룰 키워드 존재 | doc-grep | `grep -E "multi-seed\|≥ 3 seeds\|150 cycle" docs/personas/01-game-planner.md` 결과 ≥ 3 line | manual: shell `grep` |
| F1.2 | persona doc 의 룰이 "절대 금지" 또는 "PRD 포맷" 섹션 안에 있음 | doc-grep | `grep -B 30 "multi-seed" docs/personas/01-game-planner.md \| grep -E "절대 금지\|PRD 포맷"` 결과 1+ line | manual |
| F1.3 | persona doc 의 룰이 (a) baseline 명시, (b) Δ-from-baseline 형식, (c) noise 자리 조건 3 요소 모두 언급 | doc-grep | `grep -E "baseline\|Δ\|noise\|자릿수" docs/personas/01-game-planner.md` 결과 ≥ 3 line | manual |
| F1.4 | `cycle-2-backlog.md` B1 항목에 "cycle 3 priest 측정은 multi-seed 룰 적용 prerequisite" 명시 | doc-grep | `grep -A 5 "B1" docs/superpowers/evolution/cycle-2-backlog.md \| grep "multi-seed"` 결과 1+ line | manual |
| F1.5 | F2 의 수용 기준 (cycle-2-prd.md §F2) 이 절대값 0 + Δ-from-baseline + ≥ 3 seed 측정 형식 위반 없음 | doc-grep | `grep -E "Δ baseline\|3 seed\|150 cycle" docs/superpowers/evolution/cycle-2-prd.md` 결과 ≥ 3 line (F2 섹션 안) | manual: implementer 가 PRD §F2 self-validation 으로 사용 |
| F1.6 | F1 룰이 game code 안 assertion 으로 들어가지 않음 (process change 는 doc 전용) | code-grep | `grep -rE "multi-seed\|150-cycle" games/inflation-rpg/src/` 결과 0 line | manual |

### F2. Eternal Hero 회춘·사망 비트 회수

#### F2-a. 회춘 trigger 확장 (단위)

| ID | 케이스 | type | 기대 결과 | 파일 |
|---|---|---|---|---|
| F2.1 | `forIdleRejuvenation(age=35, arrivals=250)` → 문자열 반환 + length > 0 | unit | `expect(typeof result).toBe('string') && result.length > 0` | `src/saga/__tests__/NarrativeGenerator.test.ts` |
| F2.2 | `forIdleRejuvenation` 100 회 호출 (seed varied) → ≥ 5 unique variant | unit | `expect(new Set(samples).size).toBeGreaterThanOrEqual(5)` | same |
| F2.3 | `forIdleRejuvenation` 반환에 `age` 포함 (예: `35세`) | unit | `expect(result).toMatch(/\d+세/)` | same |
| F2.4 | `forIdleRejuvenation` 와 기존 `forRejuvenation` 의 텍스트 catalog 가 disjoint (어휘 중복 0) | unit | `expect(IDLE_REJUV_VARIANTS.every(v => !REJUV_VARIANTS.includes(v)))` 또는 sample 비교 | same |
| F2.5 (옵션 a) | `CycleControllerV2.tick` 호출 중 `age == 30 && saga.arrivals >= 200` 시점 → 신규 `rejuvenation` saga event 1 회 push (game state hp/age 변경 0) | unit | spy `recordToStore` → `toHaveBeenCalledWith(expect.objectContaining({ type: 'rejuvenation', payload: expect.objectContaining({ source: 'idle' }) }))` | `src/overworld/__tests__/CycleControllerV2.test.ts` |
| F2.6 (옵션 a) | 같은 trigger 발화 후 `hero.age` 와 `hero.hp` 가 변경 0 (narrative-only) | unit | tick 전후 `hero.age === beforeAge && hero.hp === beforeHp` | same |
| F2.7 (옵션 b) | `age >= 50` 시점부터 `tick` 마다 `hero_died` probability 가 +1%/year 누적 — `age=50` 1%, `age=60` 11% (1000 회 simulation seeded) | unit | `Math.abs(deathRate_at_age_60 - 0.11) < 0.03` (Monte Carlo 3% tolerance) | same |
| F2.8 (옵션 b) | `age < 50` 에서는 신규 death curve 가 발동 0 (회귀 가드) | unit | seed 1024 age 30 1000 회 tick → deathRate <= cycle 1 baseline 2% | same |
| F2.9 | implementer 가 옵션 a / b / both 중 ≥ 1 wire 했음을 grep 으로 확인 | code-grep | `grep -E "idle.*rejuv\|forIdleRejuvenation\|age >= 50.*chance\|age >= 50.*probability" games/inflation-rpg/src/overworld/CycleControllerV2.ts` 결과 ≥ 1 line | manual |

#### F2-b. sim infra 변경

| ID | 케이스 | type | 기대 결과 | 파일 |
|---|---|---|---|---|
| F2.10 | `sim-cycle-v2.ts` 의 `MAX_ARRIVALS` default 가 1000 | code-grep | `grep -E "MAX_ARRIVALS.*=.*1000\|maxArrivals.*\\?\\?.*1000\|parseArg\\('max-arrivals', '1000'\\)" games/inflation-rpg/scripts/sim-cycle-v2.ts` 결과 ≥ 1 line | manual |
| F2.11 | sim smoke test (`sim-cycle-v2.smoke.test.ts`) 가 변경된 default 로 5 sec 내 종료 | unit | vitest run 시 timeout 0. smoke test 가 maxArrivals 명시하면 변경 영향 0 | `games/inflation-rpg/scripts/__tests__/sim-cycle-v2.smoke.test.ts` |
| F2.12 | cycle-1-sim-guards.ts 가 `maxArrivals=500` 명시 호출 → cycle 1 guard 14 가 변경 없이 통과 | unit | `pnpm --filter @forge/game-inflation-rpg test cycle-1-sim-guards` 0 fail | `games/inflation-rpg/scripts/__tests__/cycle-1-sim-guards.smoke.test.ts` (있으면) 또는 manual |

#### F2-c. SagaBookModal 노출 wire (회귀 가드)

| ID | 케이스 | type | 기대 결과 | 파일 |
|---|---|---|---|---|
| F2.13 | `matchesFilter('rejuvenation', '여정')` 또는 적절한 chip 이 `true` | unit | filter mapping test | `src/screens/__tests__/SagaBookModal.test.tsx` |
| F2.14 | `matchesFilter('hero_died', '여정')` 또는 적절한 chip 이 `true` (cycle 1 fix 회귀 가드) | unit | same | same |

#### F2-d. multi-seed sim 측정 (F1 룰 dog food)

baseline: cycle 1 (seed 1024) + cycle 2 (seed 2048) 의 50 cycle each, `maxArrivals=500`. `rejuvenation` 0/100, `hero_died` 1/100, `maxLevel` p50 ≈ 816k~830k.

multi-seed: seed 3072 / 3122 / 3172 × 50 cycle each, `maxArrivals=1000` (F2 변경 후), aggregate 150 cycle.

| ID | 케이스 | type | 기대 결과 (Δ-from-baseline) | 파일 |
|---|---|---|---|---|
| F2.15 | seed 3072 × 50 cycle, maxArrivals=1000 → `rejuvenation` 비율 | sim | Δ ≥ +4/50 (= cycle 별 baseline 0/50 대비) | manual: `pnpm --filter @forge/game-inflation-rpg sim:v3 -- --count 50 --seed 3072 --max-arrivals 1000 --out-dir /tmp/cycle-2-seed-3072` |
| F2.16 | seed 3122 × 50 cycle, maxArrivals=1000 → `rejuvenation` 비율 | sim | Δ ≥ +4/50 | same with --seed 3122 |
| F2.17 | seed 3172 × 50 cycle, maxArrivals=1000 → `rejuvenation` 비율 | sim | Δ ≥ +4/50 | same with --seed 3172 |
| F2.18 | **3-seed aggregate**: 150 cycle 합산 `rejuvenation` events 비율 | sim aggregate | Δ baseline 0/100 → ≥ 8/150 (= **≥ 5%**) | manual aggregate: 3 jsonl 합산 grep `"type":"rejuvenation"` |
| F2.19 | **3-seed aggregate**: 150 cycle 합산 `hero_died` events 비율 | sim aggregate | Δ baseline 1/100 → ≥ 3/150 (= **≥ 2%**) | same aggregate grep `"type":"death"` 또는 `"type":"hero_died"` |
| F2.20 | **3-seed aggregate**: `maxLevel` p50 곡선 평탄화 가드 | sim aggregate | p50 ∈ [baseline × 0.7, baseline × 1.3] = [571k, 1.08M] (단, 1000 arrival 로 자연 상승 가능 — multiply 가드는 *형상* 변화만 잡음) | same aggregate p50 계산 |
| F2.21 | 3-seed aggregate narrative grep — `재생\|회춘\|영웅이 사망\|시련을 받았\|안식을 맞아` | sim grep | `grep -E "재생\|회춘\|영웅이 사망" /tmp/cycle-2-seed-{3072,3122,3172}/c*.md \| wc -l` ≥ 10 line | manual |
| F2.22 | 회귀: 기존 vitest 1088 + 50-cycle e2e 회귀 0 | full-run | `pnpm --filter @forge/game-inflation-rpg test` exit 0; `pnpm --filter @forge/game-inflation-rpg e2e` exit 0 | manual |
| F2.23 | V3 컨셉 가드: `MAX_ARRIVALS 1000` 이 게임 코드 안 hard-coded cap 아님 (sim infra 만) | code-grep | `grep -rE "MAX_ARRIVALS\|maxArrivals" games/inflation-rpg/src/` 결과 0 line (src/ 내부) | manual |

### F3. Narrative Variance Pass

baseline: cycle 2 sim (seed 2048, 50 cycle, maxArrivals=500) 의 `c2048-*.md` 에서 "한 cycle 안 동일 한 줄 반복 횟수" 최대값 = 88 (levelUpBatch `"미친 듯이 강해졌다 — LV X → Y"`).

#### F3-a. levelUpBatch 자릿수 톤 분기 (단위)

| ID | 케이스 | type | 기대 결과 | 파일 |
|---|---|---|---|---|
| F3.1 | `LEVELUP_BATCH_VARIANTS_TIER1` (≤999) 가 5 variant 보유 | code-grep | `grep -A 30 "LEVELUP_BATCH_VARIANTS_TIER1\|LEVELUP_TIER_LOW\|levelUpBatch.*low" src/data/narrationVariants.ts` 결과에서 array literal 길이 5 | manual + unit |
| F3.2 | `LEVELUP_BATCH_VARIANTS_TIER2` (1k–999k) 5 variant 보유 | code-grep | same with `TIER2`/`MID` | manual + unit |
| F3.3 | `LEVELUP_BATCH_VARIANTS_TIER3` (≥1M) 5 variant 보유 | code-grep | same with `TIER3`/`HIGH` | manual + unit |
| F3.4 | 총 15 distinct variant (3 tier 합산) | unit | `expect(new Set([...tier1, ...tier2, ...tier3]).size).toBe(15)` | `src/saga/__tests__/NarrativeGenerator.test.ts` |
| F3.5 | `forLevelUpBatch({age:13, fromLevel:5, toLevel:48, count:43})` → tier1 어휘 (신체적: "팔" / "호흡" / "근육") | unit | `expect(result).toMatch(/팔\|호흡\|근육\|키\|체력/)` | same |
| F3.6 | `forLevelUpBatch({age:25, fromLevel:1000, toLevel:50000, count:49000})` → tier2 어휘 (추상적: "법칙" / "격") | unit | `expect(result).toMatch(/법칙\|격\|단\|경지\|차원/)` | same |
| F3.7 | `forLevelUpBatch({age:40, fromLevel:1_000_000, toLevel:5_000_000, count:4_000_000})` → tier3 어휘 (우주적: "차원" / "별") | unit | `expect(result).toMatch(/차원\|별\|우주\|섭리\|영원/)` | same |
| F3.8 | tier 분기 boundary: `toLevel === 999` → tier1, `toLevel === 1000` → tier2, `toLevel === 999_999` → tier2, `toLevel === 1_000_000` → tier3 | unit | 4 boundary 케이스 vocabulary regex 일치 | same |

#### F3-b. moralChoice caste frame (단위)

| ID | 케이스 | type | 기대 결과 | 파일 |
|---|---|---|---|---|
| F3.9 | `MORAL_VARIANTS` 가 8 frame 으로 확장 (기본 5 + caste 3) | code-grep + unit | `expect(MORAL_VARIANTS.length).toBe(8)` 또는 catalog 추론 | `src/saga/__tests__/NarrativeGenerator.test.ts` |
| F3.10 | hero `personality.pious >= 7` 시 `forMoralChoice` 반환에 `기도\|신앙\|성스` 키워드 포함 | unit | personality fixture 주입 후 `expect(result).toMatch(/기도\|신앙\|성스/)` | same |
| F3.11 | hero `personality.merciful >= 10` 시 반환에 `이미 정해진\|당연한\|손이었다` 키워드 포함 | unit | `expect(result).toMatch(/이미 정해진\|당연한\|손이었다/)` | same |
| F3.12 | hero `personality.heroic <= -3` 시 반환에 `망설이지\|한 번도` 키워드 포함 | unit | `expect(result).toMatch(/망설이지\|한 번도/)` | same |
| F3.13 | personality 우세 dim 없음 (모든 dim 0~3) 시 기본 5 frame 중 하나 반환 (caste-tag 어휘 0) | unit | `expect(result).not.toMatch(/기도\|이미 정해진\|망설이지/)` | same |
| F3.14 | `raw spare_enemy.nameKR` catalog 변경 0 (F3 NOT this 가드) | code-grep | `git diff` 의 `MORAL_VARIANTS` 변경만 + `spare_enemy.nameKR` 정의 변경 0 | manual |

#### F3-c. NPC variant 확장 (단위)

| ID | 케이스 | type | 기대 결과 | 파일 |
|---|---|---|---|---|
| F3.15 | `forNpcEncounter({kind:'rival'})` 100 회 sampling → ≥ 8 unique variant | unit | `expect(new Set(samples).size).toBeGreaterThanOrEqual(8)` | `src/saga/__tests__/NarrativeGenerator.test.ts` |
| F3.16 | `forNpcEncounter({kind:'mentor'})` 100 회 → ≥ 5 unique variant | unit | `expect(new Set(samples).size).toBeGreaterThanOrEqual(5)` | same |
| F3.17 | `forNpcEncounter({kind:'passerby'})` 100 회 → ≥ 5 unique variant | unit | `expect(new Set(samples).size).toBeGreaterThanOrEqual(5)` | same |
| F3.18 | `forNpcDeath` 100 회 → ≥ 6 unique variant | unit | `expect(new Set(samples).size).toBeGreaterThanOrEqual(6)` | same |
| F3.19 | 총 24 distinct NPC variant (rival 8 + mentor 5 + passerby 5 + death 6) | unit | catalog 합산 set 크기 24 | same |
| F3.20 | 회귀: 기존 `forNpcEncounter` 3 kind 모두 0 throw, `forFamilyEvent` 3 type 모두 0 throw | unit | cycle 1 의 F3.1 / F3.2 / F3.4 / F3.5 그대로 통과 | same |
| F3.21 | age-bucket 톤 modifier 가 본 cycle scope 외임을 확인 (NOT this 가드) | code-grep | `grep -E "ageBucket\|age_bucket\|15-20세\|30\\+세" src/saga/NarrativeGenerator.ts src/data/narrationVariants.ts` 결과 0 line | manual |

#### F3-d. 통합 acceptance (sim regression)

baseline: cycle 2 sim (seed 2048, 50 cycle, maxArrivals=500) 의 `c2048-*.md` 한 줄 반복 max = 88. F3 변경 후 같은 seed/options 로 재측정.

| ID | 케이스 | type | 기대 결과 (Δ-from-baseline) | 파일 |
|---|---|---|---|---|
| F3.22 | 같은 seed 2048 × 50 cycle, maxArrivals=500 재측정 → c2048 모든 cycle 의 "한 cycle 안 동일 한 줄 반복 횟수 최대값" | sim grep | `expect(maxRepeat).toBeLessThanOrEqual(40)` (Δ baseline 88 대비 ×0.5 이하) | manual: `pnpm --filter @forge/game-inflation-rpg sim:v3 -- --count 50 --seed 2048 --max-arrivals 500 --out-dir /tmp/cycle-2-post-f3` + per-cycle 한 줄 grep count 최대 |
| F3.23 | levelUpBatch 변경의 sub-deliverable: 그 cycle 의 `c2048-cycle-*.md` 에서 자릿수 LV 5→48 / LV 1k→50k / LV 1M+ 케이스 각각 ≥ 1 회 발화 + tier별 어휘 일치 | sim grep | `grep "팔\|호흡" cycle-low.md && grep "법칙\|격" cycle-mid.md && grep "차원\|별" cycle-high.md` 각각 1+ | manual |
| F3.24 | F1 룰 면제 가드: F3 acceptance 가 "categorical count" (한 cycle 안 grep, seed variance 누적 영향 없음) 임을 PRD §F3 의 multi-seed 면제 가드 라인이 인용 | doc-grep | `grep "categorical\|multi-seed 면제\|단일 seed.*직접 grep" docs/superpowers/evolution/cycle-2-prd.md` 결과 1+ line | manual |
| F3.25 | 통합 회귀: 1088 vitest + 50 e2e 회귀 0, F3 신규 unit ≥ 9 추가 | full-run | `pnpm --filter @forge/game-inflation-rpg test` exit 0, 새 case 카운트 ≥ 9 | manual |

## 검증 명령

```bash
# unit + integration
pnpm --filter @forge/game-inflation-rpg test

# e2e (chromium + iphone14 projects 전부)
pnpm --filter @forge/game-inflation-rpg e2e

# repo-wide static checks
pnpm typecheck && pnpm lint && pnpm circular

# F1 grep verify (persona doc)
grep -E "multi-seed|≥ 3 seeds|150 cycle" docs/personas/01-game-planner.md
grep -A 5 "B1" docs/superpowers/evolution/cycle-2-backlog.md | grep "multi-seed"
grep -rE "multi-seed|150-cycle" games/inflation-rpg/src/  # expected: 0 line

# F2 multi-seed sim (3 seed × 50 cycle = 150 cycle, ~18 min wall)
pnpm --filter @forge/game-inflation-rpg sim:v3 -- --count 50 --seed 3072 --max-arrivals 1000 --out-dir /tmp/cycle-2-seed-3072
pnpm --filter @forge/game-inflation-rpg sim:v3 -- --count 50 --seed 3122 --max-arrivals 1000 --out-dir /tmp/cycle-2-seed-3122
pnpm --filter @forge/game-inflation-rpg sim:v3 -- --count 50 --seed 3172 --max-arrivals 1000 --out-dir /tmp/cycle-2-seed-3172

# F2 aggregate: rejuvenation 비율 ≥ 8/150, hero_died 비율 ≥ 3/150
grep -lE '"type":"rejuvenation"' /tmp/cycle-2-seed-{3072,3122,3172}/c*.jsonl | wc -l
grep -lE '"type":"death"|"type":"hero_died"' /tmp/cycle-2-seed-{3072,3122,3172}/c*.jsonl | wc -l

# F2 narrative aggregate grep — ≥ 10 line
grep -E "재생|회춘|영웅이 사망" /tmp/cycle-2-seed-{3072,3122,3172}/c*.md | wc -l

# F3 sim regression (same seed 2048 as cycle 2 baseline, post-change)
pnpm --filter @forge/game-inflation-rpg sim:v3 -- --count 50 --seed 2048 --max-arrivals 500 --out-dir /tmp/cycle-2-post-f3

# F3 per-cycle max-repeat check (한 줄 동일 반복 최대값 ≤ 40)
for f in /tmp/cycle-2-post-f3/c*.md; do
  sort "$f" | uniq -c | sort -rn | head -1
done | awk '{ if ($1+0 > max) max = $1+0 } END { print "max-repeat:", max }'
# 기대 출력: max-repeat: <= 40

# F1 룰 self-validation: F2 의 PRD §F2 수용 기준이 절대값 0 + Δ + multi-seed 형식
grep -E "Δ baseline|3 seed|150 cycle" docs/superpowers/evolution/cycle-2-prd.md
```

수동 verify 2 건 (자동화 불가):
- F1.2 — multi-seed 룰이 persona doc 의 적절한 섹션 ("절대 금지" 또는 "PRD 포맷") 안에 위치하는지 시각적 확인. grep 만으로 섹션 구분 어려움.
- F2.21 (sim 시간 monitoring) — 3 seed × 50 cycle aggregate wall time 이 18 min 이내인지 확인. 더 길면 자율 cycle 예산 초과 (backlog B9 의 multi-seed CLI 자동화 우선순위 상승 신호).

## 통과 기준

- vitest pass rate: 100% (기존 1088 + F1/F2/F3 신규 case 전부)
- e2e (chromium + iphone14): 100% (기존 50 + F2/F3 신규 spec 포함, 신규 e2e 추가는 선택)
- `pnpm typecheck` 0 exit
- `pnpm lint` 0 exit
- `pnpm circular` 0 exit
- F1 doc-grep: persona doc 의 multi-seed 룰 3 요소 (baseline / Δ / noise 자리) 존재; cycle-2-backlog.md B1 cross-link 존재; PRD §F2 수용 기준이 룰 위반 0
- F2 multi-seed sim regression (Δ-from-baseline 형식, ≥ 3 seeds × 50 cycle):
  - `rejuvenation` events 비율: baseline 0/100 → 측정값 ≥ 8/150 (≥ 5%)
  - `hero_died` events 비율: baseline 1/100 → 측정값 ≥ 3/150 (≥ 2%)
  - `maxLevel` p50 ∈ [baseline × 0.7, baseline × 1.3] (곡선 형상 평탄화 가드)
  - narrative aggregate grep `재생\|회춘\|영웅이 사망` ≥ 10 hit
  - sim wall time 3 seed 합산 ≤ 18 min (예산 가드)
- F3 통합 acceptance:
  - cycle 2 seed 2048 baseline 한 줄 반복 max 88 → 측정값 ≤ 40 (×0.5 이하)
  - levelUpBatch 15 distinct + 3 tier 모두 sim 안 발화
  - moralChoice 8 frame + caste-tag 3 unit test ≥ 3 통과
  - NPC variant rival 8 / mentor 5 / passerby 5 / death 6 합산 24 + unit test ≥ 3 통과
  - 신규 unit test 총 ≥ 9
- F2/F3 dead path 회귀: SagaBookModal 의 신규/기존 NPC + rejuvenation + hero_died filter 매핑 회귀 0
- Cycle 1 의 14 sim guard 통과 유지 (`maxArrivals=500` 명시 호출로 변경 영향 0)
