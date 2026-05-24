# Cycle 3 결과 (Partial)

> 상태: **partial merged** — F1 (이중 prefix bug fix) 만. D1-D7 은 cycle 4 carry-over.
> 머지: `6135a9a` (tag `cycle-3-partial-complete`)

## 변경 한 줄

cycle 1 F2 의 implementation regression bug (`(N세) (N세) 짠 공기가...` 이중 prefix) 해소. multi-seed 룰 (cycle 2 F1) 의 첫 검증 — single-seed 1024 의 priest 0.40 outlier 가 진실 (3-seed 0.453) 로 정정.

## Phase F 머지 가드

- typecheck/lint: PASS
- vitest: 1094 / 1094 (cycle 2 baseline 1088 + 6 신규)
- circular: baseline 1 (회귀 0)
- sim: 이중 prefix grep 32 → 0 (seed 4096, 50 cycle)
- multi-seed (1024+2048+4096, 150 cycle) F1 multi-seed 룰 첫 적용

## 3-seed aggregate (cycle 3 의 입력)

| 지표 | Cycle 0 | Cycle 3 (3-seed) | Δ |
|---|---|---|---|
| maxLevel p50 avg | 829,189 | 825,021 | +0% (곡선 견고) |
| skillsLearned p50 | 21 | 9.0 | **−12 (F1 multi-seed 견고)** |
| Tier 2 maxShare | mage 0.46 | priest 0.453 | -0.007 (single-seed 1024 0.40 outlier 정정) |
| monk + ranger | 0/50 | 1/150 = 0.7% | systemic famine |
| death rate | 0.02 | 0.007 | 회춘 dead path 확정 |
| endCauses | max_arrivals 49/50 | max_arrivals 149/150 | inflation 정체성 미흡 |

## Cycle 4 carry-over (cycle-2-backlog.md 의 cycle-3 section 갱신 + D1-D7)

| ID | Title | 수치 제안 (level-critic) |
|---|---|---|
| D1 | priest saturator structural | MERCIFUL_PROC_RATE 0.10→0.05 + priest.min 3→5 (수용: 3-seed maxShare ≤ 0.30) |
| D2 | prudent dim source famine | PERSONALITY_ENCOUNTERS prudent source 1→2 (수용: monk+ranger ≥ 5%) |
| D3 | MAX_ARRIVALS + idle 회춘 trigger | MAX_ARRIVALS 500→1000 + age/arrivals 임계 회춘 (수용: cyclesWithRejuvenation ≥ 5) |
| D4 | NPC first-vs-recurring 필터 | CycleControllerV2 의 npc id 기반 first/recurring 분기 + recurring_rival variant |
| D5 | spare_enemy moral saturation | PERSONALITY_ENCOUNTERS weighting 조정 또는 spare_enemy variant 8→24 |
| D6 | levelUp 자릿수 톤 | ≤999 / 1k-999k / 1M+ 분기, variant 6→18 |
| D7 | EternalSaga era key chapter title 동적 생성 | Caves of Qud sultan-history 식 |

## Phase G self-check (Cycle 3 종료 후)

- **약점 고갈**: ✗ (D1-D7 + cycle 1+2 carry-over)
- **3 연속 같은 1순위**: cycle 0 saturation → cycle 1 variance → cycle 2 process → cycle 3 prefix bug fix. 4 cycle 모두 다른 카테고리. soft-halt 신호 없음.
- **자원 추정**: **여전히 trigger** (현 추정 ~88% context). cycle 4 진입 매우 어려움.
- **사용자 halt**: 없음
- **Hard halt**: 미발생

**→ Soft halt 재발동**. cycle 4 진입은 hard halt 위험 매우 큼.
