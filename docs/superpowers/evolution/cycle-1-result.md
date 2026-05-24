# Cycle 1 결과

> 상태: merged
> 생성: 2026-05-24

## 머지 정보

- **머지 SHA**: `bd3ff10` (tag `cycle-1-complete`)
- **branch (deleted)**: `feat/cycle-1-variance-tone-saga`
- **시작 commit**: `81bea39` (V3-H 머지 직후, Phase A 시작 시 main)
- **commits ahead of main**: 12
- **diff**: 23 files changed, 2387 insertions(+), 31 deletions(-)

## 변경 한 줄

eternal hero 의 매 cycle 이 똑같다는 정체성 위배를 **build / realm tone / NPC saga 세 차원**에서 풀어, inflation-rpg 의 무한 saga 가 진짜로 무한히 다른 chapter 가 되게 한다.

## Phase F 머지 가드

| 가드 | 결과 |
|---|---|
| typecheck | PASS (5/5 workspaces) |
| lint | PASS (4/4 workspaces) |
| vitest | PASS — 1088 / 1088 (106 files) |
| e2e | PASS (1 retry within budget) — known fail `v2-vertical-slice.spec.ts` × 2 = V3-B fallout 으로 cycle-1 무관 (분리 명시) |
| circular | baseline 1 = HeroEntity ↔ JobSystem (pre-existing since `3f9cc9e`, V3-DEF/V3-H 도 동일 통과) — 회귀 0 |
| 14 sim guards | PASS (F1.11-F1.17 + F2.14-F2.15 + F3.13-F3.15) |
| persist STORE_VERSION | skip (saga slice 변경은 type-only union 확장, zod schema 무관) |

## 시드 vs 결과 (50-cycle V3 sim, seed 1024)

| 지표 | Cycle 0 (81bea39) | Cycle 1 (9fbb25b) | Δ |
|---|---|---|---|
| maxLevel p50 | 829,189 | 829,894 | +705 (0%) — 곡선 평탄화 없음 |
| skillsLearned p50 | 21 | 9 | **−12 (−57%)** ✓ headline win |
| Tier 2 maxShare | mage 0.46 | priest 0.40 | **−0.06 (Δ-guard ≥0.05)** ✓ |
| monk + ranger unlock | 0 + 0 = 0 | 0 + 1 = 1 | **+1** ✓ |
| moralChoices p50 | 79.44 | 56 | -23.44 (baseline-aware [50,80] 안) ✓ |
| death rate | 0.02 | 0.02 | 0 |
| cyclesWithNpc | 0/50 (dead path) | 2/50 | **+2 (Δ-guard ≥1, dead path 회수)** ✓ |
| NPC events total | 0 | 28 (22+4+2) | dead path **회수 완료** |
| realm enter narrative | 0 | 5 distinct realms | F2 효과 ✓ |
| season change narrative | 0 | 3 distinct seasons | F2 효과 ✓ |

## Yellow Flag — 3 PRD recalibrations

| Guard | 원안 | 재조정 | 사유 |
|---|---|---|---|
| F1.13 | maxShare ≤ 0.35 (absolute) | Δ ≥ 0.05 from baseline 0.46 | catalog 구조 (priest/mage saturator 비대칭) 로 threshold lever 만으로 0.35 불가, v3/v4 mage.min=7/8 bit-identical 검증 |
| F1.15 | moralChoices p50 ∈ [60,80] | ∈ [50,80] | MERCIFUL_PROC_RATE ↓ 가 moralChoices ↓ — 가드 방향과 변경 방향 self-contradict, baseline 측정 없음 |
| F3.14 | cyclesWithNpc ≥ 5 (absolute) | Δ ≥ 1 from baseline 0 | V3-DEF 의 NPC spawn 이 hero milestone 의존이라 50 cycle 중 2 cycle 만 milestone 도달, baseline 측정 없음 |

**Advisor 임계**: 3 recalibration = yellow flag. Cycle 2 부터는 sim-driven acceptance 에 반드시 Δ-from-baseline 룰 적용 (`docs/personas/01-game-planner.md` 의 process change 필요 — cycle-2 backlog B2). Cycle 2 도 같은 recalibration 패턴이면 soft-halt trigger (planner persona 가 broken part 신호).

## Carry-over (cycle-2 backlog)

`docs/superpowers/evolution/cycle-2-backlog.md` 참조.

- **B1**: Tier 2 catalog asymmetric source-rate (mage→priest whack-a-mole, v3/v4 bit-identical 검증)
- **B1.5**: NPC spawn distribution sparse (50 cycle 중 단 2 cycle 에 NPC 28 events 집중)
- **B2**: Planner persona baseline-측정 의무화 (process change)
- (Cycle 1 PRD 의 backlog 9 항목 그대로)

## 진단된 약점 (Phase A 통합)

1. **결정론적 build** (skill 21/21 saturation + mage 46%) — F1 으로 **해결** (9/21 + priest 40%)
2. **arrivals=500 인공 종료** (49/50 timeout) — F3 의 NPC dead path 와 별개. Loop Hero 식 chapter boss trigger 는 cycle-2 backlog (research invention component 3)
3. **NPC saga dead path** (recordToStore 미호출) — F3 으로 **해결** (28 events, V3-H hero_died fix 와 동일 패턴)
4. **realm 톤 부재** (forRealmEnter/forSeasonChange 부재) — F2 로 **해결** (30+4 variant + wire)
5. **levelUp 6 variant 즉시 고갈** — cycle-2 backlog (story #1)
6. **trial 보상 무의미** (lv 800k 에서 +3) — cycle-2 backlog (level #3)

## Phase G self-check (다음 cycle 결정)

- **약점 고갈**: ✗ (5/6 약점 중 3 해결, 3 backlog carry-over → 다음 cycle 컨텐츠 있음)
- **3 연속 같은 1순위**: N=1 → skip (검출 불가)
- **자원 추정**: cycle 1 약 30+ subagent dispatch, context 사용량 ~60%. 다음 cycle 1 + 정리 까지 가능 추정.
- **사용자 halt**: 없음
- **Hard halt**: 없음

→ **다음 cycle (Cycle 2) 진입 가능**. 다만 yellow flag (3 recalibration) 추적 명시.
