# Cycle 8 결과 (Partial — Δ-from-baseline 87.6% 감소 했으나 PRD 임계 미달)

> 상태: **partial** — 2 fix (C1 filter + setCurrentRealm sync wire) 가 feature
> 브랜치에 머지되었고 머지 가드 4/4 PASS. 다만 Playwright Δ-from-baseline
> 결과 **11 / 4분 idle** (정찰 89 대비 -87.6%) — PRD 수용 "≤ 9" 임계 미달.
> PRD: [`cycle-8-prd.md`](cycle-8-prd.md)
> 진단으로 **2개의 distinct 잔존 failure mode** 발견 → cycle 9 P0 carry-over.

## 변경 한 줄

Cycle 7 finisher Playwright B 발견의 진짜 root cause — `OverworldScene.pickNextDestination`
의 columnBounds 가 target realm 무시하고 currentRealm.columnRange 만 적용해서
cross-realm target 매번 첫 findPath null → cycle 7 F4 fallback 이 hot path 99%
발동 (정찰 baseline = 4분 idle 89회). C1 fix 후 candidate filtering + scene
sync wire 추가했으나 **realm_entered 이벤트가 exit landmark 도달 시에만 emit**
되어 hero column traversal 시점에서는 fire 안 됨 → setCurrentRealm sync 가
일부 transition 만 잡는 잔존 race + 일부 candidate 가 filter 통과한 추가 root.

## 2 commit (cycle 8) + 3 commit (cycle 7 미머지)

| ID | 한 줄 | Commit |
|----|-------|--------|
| C1 | `filterCandidatesByRealm` pure helper — exit kind 통과 / non-exit 는 hero realm columnRange 안만. + 6 신규 unit test | `a5f824d` |
| C1-fu | `OverworldScene.setCurrentRealm` + OverworldRunner realm_entered 이벤트 핸들러에서 scene sync | `e6e3d18` |
| (cycle 7) F4 | Pathfinding.ts findPathWithFallback + telemetry | `3cdf7bd` |
| (cycle 7) S1 | gameStore.ts migrateV23ToV24 stale saga purge | `d85554a` |
| (cycle 7) R1 | personas/02-qa.md + 04-game-critic.md "empty/missing" grep query 룰 | `b6b658e` |

## 머지 가드 결과

| 가드 | baseline (cycle 7) | cycle 8 | 결과 |
|------|------|--------|------|
| typecheck | PASS | PASS | OK |
| lint | PASS | PASS | OK |
| vitest (inflation-rpg) | 1166 | **1172** | OK (+6 신규 cycle 8 C1) |
| circular | 1 (baseline) | 1 | OK |

baseline 1 circular = `HeroEntity ↔ JobSystem` (P-1.5 알려진 부채).

## Playwright Δ-from-baseline 검증

iPhone 14 viewport 390×844. dev `localhost:3000`. 새 cycle → 후원 → 4분 idle.
화면: `.playwright-mcp/cycle-8-postsim/screen-1-cycle-started.png`,
`screen-2-after-4min.png`. console log: `cycle-8-warnings.log`.

### 시나리오 A — C1 root fix Δ-from-baseline

| 단계 | 결과 |
|------|------|
| 정찰 baseline (cycle 7 Playwright B) | 4분 idle = **89회** fallback warn |
| cycle 8 fix 후 4분 idle | **11회** fallback warn |
| Δ-from-baseline | 89 → 11 = **78 감소 (87.6%)** |
| PRD 수용 "≤ 9 (Δ ≥ 80)" | **FAIL** (살짝 미달) |

**진단 — 잔존 11 fallback 의 distinct 2 failure mode**:

**Mode 1: stale-realm tracker (8 occurrences, count=2,5,6,7,8,10,11 등)**
`hero (79,6) target (36,4) realm=sea`. Hero col 79 는 underworld [60,80) 범위
이지만 scene 이 realm=sea 로 보고. setCurrentRealm sync wire 는 realm_entered
이벤트 hook 인데, **CycleControllerV2.ts:356 의 realm_entered emit 은 exit
landmark kind 도달 시에만 발동**. Hero 가 column range 를 column 단위 free walk
로 traverse 할 때는 emit 안 됨 → scene.currentRealm 영구 stale.
실제 grep 증거:
```
games/inflation-rpg/src/overworld/CycleControllerV2.ts:356
  if (kind === 'exit' && this.currentRealmId) { ... }
  events.push({ type: 'realm_entered', realmId: newRealm });
```

**Mode 2: filter bypass on first cycle transition (1 occurrence, count=1)**
`hero (9,7) base → target (79,6)`. Hero col 9 는 base [0,20) 정상. Target col 79
는 underworld [60,80) — non-exit cross-realm 인데 C1 filter 가 제외 안 함.
가능성: candidate kind 가 `exit` 으로 misclassify 되어 filter 의 exit-pass-through
경로로 통과. 또는 첫 cycle 진입 시점에 scene.currentRealm 이 undefined 라서
filter no-op 으로 빠짐.

**평가**: C1 + sync wire 가 real-but-incomplete 한 부분 fix. 87.6% 감소는
substantial 하지만 PRD 의 measurable 임계 (≤ 9) 미달.

### 시나리오 B-D (회귀 가드)

cycle 7 finisher 가 이미 시나리오 A (S1 stale saga purge), C (cycle 5+6 회귀)
PASS 확인. cycle 8 의 변경은 OverworldScene 의 candidate filtering + setter
추가뿐 — store migration / saga finalize / heroSnapshot 영역 무변경 → cycle 5+6+7
회귀 가드는 **head-by-construction PASS**. 추가 Playwright 검증은 cycle 8 partial
결정 후 PRD 의 main 머지 cancel 에 따라 생략.

## 결정 — main 머지 보류 (cycle-8-partial)

PRD 의 measurable 임계 (Δ ≥ 80, ≤ 9 fallback) 미달. PRD §머지 가드: "Playwright
Δ-from-baseline fallback count ≤ 9". 측정 11 > 9 → main 보류. Cycle 7 의 R1+S1+F4
도 cycle 8 와 함께 fold 하기로 했으나 cycle 8 partial → **cycle 7 carry-over
는 계속 carry-over** (`cycle-7-partial-complete` tag 보존). feature 브랜치 tag
= `cycle-8-partial-complete`.

## Phase G self-check (Cycle 8 종료 후)

- **약점 고갈**: ✗ (cycle 9 carry-over: realm_entered emit site 재설계,
  C1 filter audit, D1-D7, run.* 전수, realm 정체).
- **3 연속 같은 1순위**: cycle 5 stale-realm endCycle reset → 6 store↔UI sync
  → 7 carry-over 정리 → 8 column-bounds root path. 4 cycle 모두 다른 카테고리.
- **자원 추정**: implementer 가 2 commit (filter + sync wire) 으로 PRD full
  수행, vitest +6. finisher 가 머지 가드 4 + 4분 Playwright Δ measurement +
  console log 진단 + carry-over 정리. cycle 9 이 PRD 의 후보 (a)+(d) 확장 또는
  realm_entered emit site 재설계 필요.
- **사용자 halt**: 없음.
- **Hard halt**: 미발생.

**→ cycle 9 진입 가능 (cycle 8 partial 상태)**. cycle 9 P0 = realm_entered
emit site 의 column-driven 재설계 + C1 filter 의 count=1 case audit.

## Cycle 9 carry-over

### 1순위 (cycle 9 P0)

- **R1. realm_entered emit site column-driven 재설계** — 현재
  `CycleControllerV2.ts:356` 가 `kind === 'exit'` 일 때만 emit. Hero column
  traversal 시점에는 fire 안 함 → setCurrentRealm sync miss. fix 후보:
  (a) hero position 의 column 으로 realm 동적 추론 + 변경 시 emit, (b) exit
  landmark + column boundary 양쪽 모두 emit, (c) scene 의 currentRealm 을
  store.run.currentRealmId 의 reactive subscription 으로 대체.
- **R2. C1 filterCandidatesByRealm audit (count=1 case)** — `hero (9,7) base
  → target (79,6) underworld` 의 non-exit 후보가 filter 통과한 root 확인.
  candidate kind 검사 + filter no-op 분기 (currentRealm undefined) 추적.

### 2순위 (이월)

- **C2. pathfinderFallbackCount cycle 종료 saga 기록** (cycle 7+8 모두 미수행).
- **HeroSnapshot `staggered` field** (cycle 6 carry-over).
- **PRD fixture schema bug** — `sagaHistory[].hero.deathCause` vs canonical
  `hero.cause + top-level deathCause` (cycle 7 발견).
- **realm 정체** — cycle 6 의 stage progression rate 측정.

### 3순위 (D1-D7, 누적 carry-over)

D1-D7 — cycle 9+ 진입 시 검토.

## 자율진화 시스템 회고 — R1 + Δ-from-baseline 룰 첫 자연 적용

Cycle 7 에서 도입된 두 룰이 cycle 8 의 finisher 단계에서 **첫 자연 적용**:

1. **Δ-from-baseline 룰** (cycle 7 R1 의 자연 확장 — 정찰 시점에서 measurable
   baseline 사전 측정 권장) → cycle 8 PRD §정찰 보고에서 baseline 89 명시,
   §수용 §Playwright 에서 ≤ 9 (90% 감소) 측정 가능 임계 명시. finisher 가
   "11 vs 89, Δ 78, 임계 미달 → partial" 의 **객관적 결정** 가능. 이전이라면
   "많이 줄었으니 PASS" 의 subjective rounding 가능성.

2. **R1 grep query 룰** (personas/02-qa.md + 04-game-critic.md) → cycle 8
   PRD §정찰 보고에서 확정 grep 1개 명시
   (`grep -n "columnBounds = .*currentRealm" ...`) → implementer 가 hot path
   정확히 짚음, finisher 가 진단 시 같은 grep 으로 잔존 root cause (CycleControllerV2.ts:356
   `kind === 'exit'`) 확정 가능.

8 cycle 누적 룰 정착 — 자율진화 루프의 self-improving 결과. 다만 **partial
4번째** (cycle 2, 3, 7, 8) — 측정 가능한 임계가 도입되면서 false PASS 가 줄어
partial 비율 상승. 이는 system maturity 의 정상 신호 (false negative >
false positive).

## 자율 머지 cycle 연속

| Cycle | Status |
|-------|--------|
| 4 | merged |
| 5 | merged |
| 6 | merged |
| 7 | partial |
| 8 | **partial** |

자율 main 머지 연속 = 3 (cycle 4-6), cycle 7-8 둘 다 partial 로 끊김 상태 유지.
cycle 9 root-cause fix 완주 시 cycle 7+8 carry-over 와 함께 fold → 5 연속
복원 (cycle 4-6+9 fold) 가능.

## 사용자 보고 status

cycle 8 의 87.6% fallback 감소는 사용자 체감에서 가시적 — 4분 idle 의 console
noise 가 89 → 11 로 줄어 prod 빌드의 console 0 정찰 결과와 더 가까워짐.
hero stuck / 무위 종료 / saga 손실 같은 game-breaking 영향은 cycle 5+6 의 fix
가 이미 fold 되어 영향 0. 자율 위임 5 cycle 연속 (사용자 보고 0건).
