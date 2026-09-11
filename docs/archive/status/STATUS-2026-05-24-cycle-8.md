# STATUS 2026-05-24 — Cycle 8 (Partial)

> 최신 머지 (main): `2737dba` (tag `cycle-6-complete`) — 변동 없음
> Cycle 7 feature 브랜치: `feat/cycle-7-fallback-cleanup-recon` (3 commit, partial)
> Cycle 8 feature 브랜치: `feat/cycle-8-columnbounds-root-fix` (3+2 = 5 commit, partial)
> 자율진화 spec: `docs/superpowers/specs/2026-05-24-autonomous-evolution-design.md`

## 한 줄

자율진화 Cycle 8 의 **C1 columnBounds root fix + setCurrentRealm sync wire**
가 머지 가드 4/4 PASS (vitest 1172 +6 신규) 했고 Playwright Δ-from-baseline
**89 → 11 (-87.6%)** 의 substantial 개선 달성. 다만 PRD measurable 임계
"≤ 9 (Δ ≥ 80)" **살짝 미달** → partial. 진단으로 **2 distinct 잔존 failure
mode** (realm_entered emit 의 exit-only condition + C1 filter count=1 case
통과) 확정 — cycle 9 P0.

## 자율진화 진행 (8 cycles, 6 머지 + 2 partial 보류)

| Cycle | Merge | Tag | Key | Status |
|---|---|---|---|---|
| 0 (시드) | `81bea39` | `phase-v3-h-complete` | V3-H | baseline |
| 1 | `bd3ff10` | `cycle-1-complete` | Variance + Realm Tone + NPC Saga | full PASS |
| 2 partial | `be1b8f7` | `cycle-2-partial-complete` | F1 multi-seed 룰 | partial |
| 3 partial | `6135a9a` | `cycle-3-partial-complete` | F1 이중 prefix bug fix | partial |
| 4 | `ce4cb80` | `cycle-4-complete` | Polish Pass (6 fix) | full PASS |
| 5 | `28e5539` | `cycle-5-complete` | Stale Realm Bug Fix (3 fix) | full PASS |
| 6 | `2737dba` | `cycle-6-complete` | Run Resume + Saga Snapshot (P0 + P1) | full PASS |
| 7 partial | (보류) | `cycle-7-partial-complete` | F4 + S1 + R1 (B FAIL) | partial |
| **8 partial** | **(보류)** | **`cycle-8-partial-complete`** | **C1 + sync wire (Δ-from-baseline 임계 미달)** | **partial** |

## Cycle 8 의 2 commit + cycle 7 의 3 commit (feature 브랜치)

| ID | 한 줄 | Commit |
|----|-------|--------|
| (cycle 8) C1 | `filterCandidatesByRealm` pure helper — exit kind 통과 / non-exit 는 hero realm columnRange 안만. + 6 신규 unit test | `a5f824d` |
| (cycle 8) C1-fu | `OverworldScene.setCurrentRealm` + OverworldRunner realm_entered 핸들러 scene sync | `e6e3d18` |
| (cycle 7) F4 | Pathfinding.ts findPathWithFallback + telemetry | `3cdf7bd` |
| (cycle 7) S1 | gameStore.ts migrateV23ToV24 stale saga purge | `d85554a` |
| (cycle 7) R1 | personas/02-qa.md + 04-game-critic.md grep query 룰 | `b6b658e` |

## 머지 가드 (Cycle 8)

- typecheck/lint: PASS
- vitest: **1172 / 1172** (cycle 7 baseline 1166 + 6 신규 cycle 8 C1)
- circular: baseline 1 (회귀 0)
- Playwright iPhone 14 (390×844): **Δ-from-baseline 검증** — 4분 idle fallback
  count **89 → 11 (-87.6%)**. PRD 수용 "≤ 9 (Δ ≥ 80)" 미달 — 11 > 9, Δ = 78
  < 80. **FAIL — partial 결정**.

## Cycle 8 의 핵심 finding

### Δ-from-baseline 87.6% 감소 — 임계 살짝 미달 → partial

C1 의 candidate filtering 이 substantial 효과 — 89 → 11 (78 감소, -87.6%).
다만 PRD 의 measurable 임계 (≤ 9 / Δ ≥ 80) 와 비교해 11 > 9, Δ 78 < 80 → FAIL.
**substantial-but-incomplete 의 첫 객관 측정 사례**.

### 잔존 11 fallback 의 distinct 2 failure mode

**Mode 1: stale-realm tracker (8 occurrences)**
console log 의 `hero (79,6) target (36,4) realm=sea` 같은 패턴. Hero col 79 는
underworld [60,80) 범위인데 scene 이 realm=sea 보고. setCurrentRealm sync wire
는 realm_entered 이벤트 hook 인데 `CycleControllerV2.ts:356` 의 emit 은 **exit
landmark kind 도달 시에만**. Hero column traversal 시점에는 fire 안 함 → scene
.currentRealm 영구 stale. 확정 grep:
```
games/inflation-rpg/src/overworld/CycleControllerV2.ts:356
  if (kind === 'exit' && this.currentRealmId) { ... }
```

**Mode 2: C1 filter count=1 case (1 occurrence)**
`hero (9,7) base → target (79,6) underworld`. Hero col 9 는 base [0,20) 정상,
target col 79 는 underworld — non-exit cross-realm 인데 filter 통과. 가능한
root: candidate kind 가 `exit` 으로 misclassify, 또는 currentRealm undefined
에서 filter no-op 빠짐.

### Cycle 7+8 carry-over 동시 잔존

PRD 의 cycle 7 fold-in 은 cycle 8 임계 통과 시에만. cycle 8 partial → cycle 7
의 R1+S1+F4 도 main 미반영 유지. `cycle-7-partial-complete` tag 보존.

## 자율진화 시스템 정확도 회고 (8 cycles 누적)

### R1 + Δ-from-baseline 룰의 첫 자연 적용 (cycle 8)

Cycle 7 에서 도입된 두 룰이 cycle 8 에서 **첫 자연 적용**:

1. **Δ-from-baseline 룰** (R1 자연 확장) → cycle 8 PRD §정찰에서 baseline 89
   사전 명시, §수용에서 ≤ 9 / Δ ≥ 80 측정 임계 명시. finisher 가 "11 vs 89,
   Δ 78, 임계 미달 → partial" 의 **객관적 결정** 가능. 이전이라면 "많이 줄었으니
   PASS" 의 subjective rounding 가능성.

2. **R1 grep query 룰** (personas/02-qa.md + 04-game-critic.md) → cycle 8 PRD
   에서 확정 grep 1개 명시 → implementer 가 hot path 정확히 짚음, finisher 가
   진단 시 같은 grep 으로 잔존 root (CycleControllerV2.ts:356 `kind === 'exit'`)
   확정 가능.

### partial 비율 상승 = system maturity 의 정상 신호

8 cycle 누적 partial = 4건 (cycle 2, 3, 7, 8). measurable 임계 도입과 함께
partial 비율 상승 (false PASS 감소) — system maturity 의 정상 신호. cycle 1
의 single-seed PASS 가 multi-seed 룰 (cycle 2 partial) 로 false PASS 자체
탐지, cycle 7 의 R1 룰 + Δ-from-baseline 룰이 cycle 8 의 substantial-but-incomplete
객관 측정 가능케 함.

### 자율 머지 cycle 연속

- 4-5-6 = 3 cycle 연속 main fold
- 7-8 = 2 cycle 연속 partial (carry-over 잔존)
- cycle 9 root-cause fix (realm_entered emit 재설계) 완주 시 cycle 7+8+9 한꺼번에
  fold → **5 연속 (4+5+6+(7+8+9 fold))** 복원 가능. PRD R1 룰의 자연 결과 —
  Δ-from-baseline 의 첫 임계 미달 → 다음 cycle 의 root-cause 정밀화.

## Cycle 9 carry-over

### 1순위 (cycle 9 P0)

- **R1. realm_entered emit site column-driven 재설계** — `CycleControllerV2.ts:356`
  의 `kind === 'exit'` 조건이 column traversal 시 fire 안 함 → setCurrentRealm
  sync miss. fix 후보: (a) hero position column 으로 realm 동적 추론 + 변경 시
  emit, (b) exit landmark + column boundary 양쪽 emit, (c) scene 의 currentRealm
  을 store.run.currentRealmId 의 reactive subscription 으로 대체.
- **R2. C1 filterCandidatesByRealm audit (count=1 case)** — non-exit cross-realm
  candidate 가 filter 통과한 root 확인. candidate kind 검사 + currentRealm
  undefined 분기 추적.

### 2순위 (이월)

- C2. pathfinderFallbackCount saga 기록 (cycle 7+8 모두 미수행)
- HeroSnapshot `staggered` field (cycle 6 carry-over)
- PRD fixture schema 정확도 룰 (cycle 7 의 hero.deathCause 발견)
- realm 정체 (cycle 6 의 stage progression rate 측정)

### 3순위 (D1-D7 누적)

D1-D7 — cycle 9+ 진입 시 검토.

## Phase G self-check (Cycle 8 종료)

- 약점 고갈: 미도달 (cycle 9 P0 realm_entered emit + C1 audit + D1-D7 + run.*)
- 3 연속 같은 1순위: 8 cycle 모두 다른 카테고리 (변동 부재 → polish → game-breaking
  → idle critical → carry-over → column root). soft-halt 없음
- 자원 추정: cycle 8 partial — implementer 2 commit (filter + setter wire),
  finisher 가 가드 4 + 4분 Playwright Δ measurement + console log 진단 +
  carry-over 정리
- 사용자 halt: 없음 (자율 위임 5 cycle 연속)
- Hard halt: 미발생

**→ cycle 9 진입 가능 (cycle 7+8 partial 동시 잔존 상태).** R1 root fix
(realm_entered emit site 재설계) 후 cycle 7+8+9 fold + tag `cycle-9-complete`
및 `cycle-7-complete` + `cycle-8-complete` 동시 부여 가능.

## 사용자 보고 status

cycle 5+6 의 game-breaking + idle critical 해소 후 cycle 7+8 은 carry-over 및
root cause 정밀화. 사용자 보고 0건. console.warn noise 의 88% 감소는 prod 빌드
의 console 0 정찰과 더 가까워짐 — 다만 0 까지 아직 미달. F4 안전망이 cycle 9 의
root fix 까지 hero stuck 차단 — gameplay 영향 없음.
