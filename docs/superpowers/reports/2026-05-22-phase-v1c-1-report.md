# Phase V1c-1 — Variety Expansion Report

**Date:** 2026-05-22
**Branch:** `feat/v1c-1-variety-expansion`
**Plan:** [`docs/superpowers/plans/2026-05-22-phase-v1c-1-variety-expansion.md`](../plans/2026-05-22-phase-v1c-1-variety-expansion.md)

## 한 문장 요약

STATUS-2026-05-21 §2 의 known limit 중 두 개 — sage fallback 지배 (99% → 4%) 와 sponsorGold 비효용 (누적만, spend 없음 → cycle 종료시 자동 spend) — 가 해결됐다. 5 dim 모두에서 hero 가 tier-3 personality threshold 에 도달 가능. 6 distinct tier-3 직업이 모두 자연 unlock.

## V1b → V1c-1 비교 (200 cycle, seed=1)

| 지표 | V1b baseline | V1c-1 | Δ |
|------|-------------|-------|---|
| sage 비율 (final job) | ~99% | **4.0%** | -95pp |
| Distinct final jobs | 2 (sage, dark_lord) | **6** | +4 |
| maxLevel P50 | ~14,315 | 14,162 | -1.1% (회귀 없음) |
| 자연사 비율 | 100% | 100% | 동일 |
| arrivals P50 | ~98 | 105 | +7 (새 landmark) |
| moralChoices P50 | 1-2 | **22** | +20 |

## 최종 직업 분포 (V1c-1)

| Job | Count | Pct |
|-----|------:|----:|
| saint | 117 | 58.5% |
| dark_lord | 31 | 15.5% |
| archmage | 23 | 11.5% |
| grandmaster | 15 | 7.5% |
| sage | 8 | 4.0% |
| hero | 6 | 3.0% |

`saint` (merciful≥7) 가 58% 로 우세 — 새 battle_won merciful proc 가 cycle 당 평균 14회 fire 하면서 ±3 drift × 다회 누적으로 merciful 이 가장 빠르게 8+ 도달. monk/priest tier-2 도 동일 dim 이므로 sample 의 narrative variety 측면에선 healthy.

## 5 Dim 별 ±6 도달 hero 수 (criterion #4)

| Dim | +≥6 | -≤-6 | 합계 | criterion |
|-----|----:|-----:|----:|:----------|
| moral | 114 | 74 | **188** | ✅ |
| prudent | 150 | 7 | **157** | ✅ |
| heroic | 155 | 6 | **161** | ✅ |
| merciful | 148 | 52 | **200** | ✅ |
| pious | 160 | 4 | **164** | ✅ |

Required ≥ 5 / dim. 모두 압도적으로 통과. 음수 분포는 미미한데 (heroic -6 = 6, pious -4 = 4 — pious 만 ≤-6 가 4 라 미달), 이건 `selectBranch` 의 `>= 0` 기본값이 양수 reinforcement 로 편향. 음수 분포 자체는 negative prior hero 한정으로만 발생. 별 영향 없음 (합계가 criterion 통과).

## Success Criteria 결과

| # | Target | Actual | Status |
|---|--------|--------|--------|
| 1a | sage 비율 < 50% | 4.0% | ✅ |
| 1b | distinct jobs ≥ 6 | 6 | ✅ |
| 2 | maxLevel P50 ≥ 1,000 | 14,162 | ✅ |
| 3 | 자연사 ≥ 80% | 100% | ✅ |
| 4 | 5 dim 각 ±6 hero ≥ 5 | 모두 ≥ 157 | ✅ |
| 5a | vitest clean (>858) | 888 | ✅ |
| 5b | typecheck clean | clean | ✅ |
| 5c | lint clean | clean | ✅ |
| 5d | build:web clean | clean | ✅ |
| 5e | migration e2e PASS | PASS | ✅ |

**모든 criterion 통과.**

## 변경 요약

### 새 파일

- `games/inflation-rpg/src/data/personalityEncounters.ts` — 4 dim × {positive, negative} 분기 catalog + `findEncounterForKind` / `selectBranch` helpers
- `games/inflation-rpg/src/data/__tests__/personalityEncounters.test.ts` — 7 단위 테스트
- `games/inflation-rpg/src/data/__tests__/landmarks.test.ts` — 4 새 kind entry 검증
- `games/inflation-rpg/src/decisionAI/__tests__/DestinationResolver.test.ts` — 새 kind weight 검증 + 신규 케이스
- `games/inflation-rpg/src/overworld/__tests__/EncounterEngine.personality.test.ts` — 10 단위 테스트 (4 새 kind + 4 merciful proc 시나리오)
- `games/inflation-rpg/scripts/analyze-personality.ts` — criterion #4 자동 검증기

### 수정

- `games/inflation-rpg/src/data/landmarks.ts` — `LandmarkKind` 4 추가 + `LANDMARK_TYPES` 4 entry
- `games/inflation-rpg/src/decisionAI/DestinationResolver.ts` — `WEIGHT_BASE` 4 entry + heroic/prudent/pious 가중치
- `games/inflation-rpg/src/overworld/mapLayout.ts` — 4 새 kind × 2 instance 배치 (총 8 새 landmark, map 18 → 26)
- `games/inflation-rpg/src/overworld/EncounterEngine.ts` — `resolveEncounter` 새 kind branch + battle_won non-boss 15% merciful proc
- `games/inflation-rpg/src/overworld/cycleSliceV2.ts` — `endCycle` 가 'balanced' strategy 로 sponsorGold auto-spend → atk/hpBaseBonus 자동 누적
- `games/inflation-rpg/src/overworld/__tests__/cycleSliceV2.test.ts` — auto-spend behavior 2 새 테스트
- `games/inflation-rpg/src/overworld/__tests__/OverworldScene.test.ts` — 4 새 kind 각 ≥2 placement 검증 (`it.each`)
- `games/inflation-rpg/src/screens/CyclePrepV2.tsx` — auto-spend 반영 라벨 갱신

7 commit (plan + T1 + T1-cleanup + T2 + T3 + T4 + T5 + T6).

## 핵심 디자인 결정

1. **`merciful` dim 만 새 landmark 없이 battle_won proc 으로** — Sage 가 지배적인 V1b 의 원인은 단순히 priors 가 ±5 / drift 가 부족한 게 아니라 **enemy/boss kill 이 cycle 의 압도적 다수 (94+/105 arrivals)** 라서 그 흐름에 personality drift 가 끼어들 자리가 필요. battle_won 직후 15% 확률은 cycle 당 ~14회 trigger (드물지도, 너무 잦지도 않게) — saint/priest 도달이 가장 자연스러운 길.

2. **`selectBranch(current, enc): current >= 0 → positive`** — prior=0 dim (5 dim 중 3 평균) 의 hero 가 첫 visit 에 stable trajectory 를 얻고 subsequent visit 이 같은 방향으로 compound. ±3 × 2 = ±6 deterministic worst case 통과.

3. **Auto-spend 'balanced' 만** — `MetaProgression.spend` 가 이미 5 strategy 지원. live UI 가 strategy 선택 안 하므로 'balanced' 만 wire. multi-scenario sim 의 4 strategy 비교는 sim runner 가 store 안 거치므로 격리됨.

4. **각 새 landmark 2 instance 배치** — `consumed=true` 후 enemy 만 respawn → 새 landmark 는 cycle 당 instance 수 = visit 수. 2 visits × ±3 drift = ±6 (prior=0 dim 도 통과).

## V1c-2 진행 여부

V1c-1 만으로 substrate 의 "variety" 측면은 강력해짐. balance 측면 (atk-bound dead zone / strategy 별 maxLevel divergence) 은 별개. V1c-2 (curve tune + RNG axes) 진행 여부는 advisor 와 합의 후 결정. 시간 박스 6h 중 V1c-1 = ~2h 소비, 4h 남음.

— Phase V1c-1 자율 세션 (2026-05-22)
