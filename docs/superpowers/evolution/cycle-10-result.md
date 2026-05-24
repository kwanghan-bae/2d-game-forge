# Cycle 10 결과 (Partial — 3/5 PASS, Lifecycle Activation 앞 60%)

> 상태: **partial** — 단일 1-line fix (`MAX_ARRIVALS 500 → 1000`) 가 머지
> 가드 4/4 PASS (vitest 1184 = 1183 + 1 신규 smoke test). 150 cycle
> headless sim 의 PRD 수용 기준 5 항목 중 **3 PASS / 2 FAIL**:
> maxLevel + ageEnd + 마지막 chapter 진입은 PASS, 자연사 endCause + rejuv
> trigger 는 emit path 부재로 FAIL.
> PRD: [`cycle-10-prd.md`](cycle-10-prd.md)

## 변경 한 줄

`scripts/sim-cycle-v2.ts` + `scripts/sim-scenarios.ts` 의 `maxArrivals`
default 500 → 1000. `HeroLifecycle.ageFromActions` 의 산술 (`floor(5 + 65 ×
actions/1000)`) 은 그대로 — cycle 10 정찰이 확정한 1-line root.

`MAX_ARRIVALS=1000` → `floor(5 + 65×1000/1000) = 70` deterministic 도달 가능
→ V3-B lifecycle drama 의 **앞 60%** (노년기 chapter, 마지막 chapter, age
70 도달) 가 활성. **뒤 40%** (자연사 endCause emit + age-threshold rejuv
trigger) 는 emit code path 부재로 활성 못함 — cycle 11 carry-over.

## 1 commit (feature 브랜치)

| ID | 한 줄 | Commit |
|----|-------|--------|
| P0 | `MAX_ARRIVALS 500 → 1000` 두 site + 신규 smoke test `default maxArrivals allows ageEnd ≥ 70` | `8e485d7` |

## 머지 가드 결과

| 가드 | baseline (cycle 9) | cycle 10 | 결과 |
|------|------|--------|------|
| typecheck | PASS | PASS | OK |
| lint | PASS | PASS | OK |
| vitest (inflation-rpg) | 1183 | **1184** | OK (+1 신규 smoke) |
| circular | 1 (baseline) | 1 | OK |

baseline 1 circular = `HeroEntity ↔ JobSystem` (P-1.5 알려진 부채, 10 cycle
누적 보존).

## PRD 수용 기준 5 항목 (150 cycle multi-seed)

| 기준 | baseline (cycle 9 정찰) | cycle 10 | 임계 | 결과 |
|------|-------------------------|----------|------|------|
| maxLevel p50 | 824,133 | **4,800,000** | ≥ 783k (회귀 ≤ 5%) | **PASS** (+483% — inflation 정체성 강화) |
| ageEnd p50 | 37 deterministic | **70** | ≥ 60 | **PASS** |
| 마지막 chapter (70+) 진입 | 0/150 | **150/150** | ≥ 30% (45/150) | **PASS** (+100% — 모든 cycle 도달) |
| rejuv count ≥ 1 cycle | 0/150 | **0/150** | ≥ 20% (30/150) | **FAIL** (auto-trigger 부재) |
| endCause `자연사`/`노화` 비율 | 0.7% (1/150) | **0/150** | ≥ 30% (45/150) | **FAIL** (hero_died emit path 부재) |

3/5 PASS = 활성 가능한 layer 는 모두 활성. 2/5 FAIL = activation 만으로
해소 안 되는 code path 부재 (cycle 11 P0).

## FAIL 2 항목 root cause (sim 직후 분석)

PRD §"반대 기준" 은 **"변경 0 가설 — `MAX_ARRIVALS 1000` 만으로 age 70 도달
→ 기존 회춘 (age threshold-based) 활성 가능"** 을 명시. 150 cycle sim 결과
이 가설이 **부분 falsify** 됨:

- **`자연사` endCause 0/150** — `hero_died('자연사')` emit path 가
  `CycleControllerV2` 또는 `HeroEntity` 에 wired 안 됨. age 70 도달은 cap
  으로 멈추는 게 아니라 `endCause = max_arrivals` 로 종료. 자연사 emit 은
  별도 condition check + emit 호출이 필요.
- **rejuv 0/150** — `auto rejuv` trigger 부재. 회춘 (godSpend `rejuvenate`)
  은 user spend modal 의 manual choice 로만 발사 가능. age-threshold 자동
  trigger 가 wire 안 됨. headless sim 은 modal 을 안 띄우므로 0% trigger.

두 path 모두 **code 변경 (emit + trigger logic)** 이 필요 — cycle 10 의
1-line bump 만으로는 불가. Cycle 11 P0 로 분리.

## Phase G self-check

- **약점 고갈**: ✗. P1 (boss-pick weight) + D1-D7 + C10-A 자연사 emit +
  C10-B auto-rejuv + C10-C maxLevel intent (483% 폭증의 의도성 검증) +
  C10-D jsonl chunked write + 기타 carry-over 누적. 약점 풍부.
- **3 연속 같은 1순위**: cycle 9 = realm cascade → cycle 10 = lifecycle
  activation. 카테고리 다름. cycle 11 1순위 추천 = lifecycle emit (cycle 10
  의 자연 연장) — 2 연속 같은 카테고리이지만 "fix 의 효과 확인" 이 아니라
  "fix 후 발견된 부재 path" 이므로 normal 진화 step.
- **자원 추정**: implementer 1 commit + 1 smoke test + 150 cycle sim
  aggregate 측정 + Δ-from-baseline 5 항목 비교 = 작은 사이즈. finisher
  가드 4 + docs 3 + 머지 + tag = 정상 자원.
- **사용자 halt**: 없음 (자율 위임).
- **Hard halt**: 미발생.

→ **partial main fold 진행 가능**. cycle 11 진입 시 C10-A + C10-B 묶음을
P0 로.

## Cycle 11 carry-over

### 1순위 추천 (cycle 10 의 직접 carry-over)

- **C10-A 자연사 emit path 추가** — `CycleControllerV2` (또는
  `HeroEntity.advanceAge`) 에서 `age >= 70` 도달 시 `hero_died('자연사')`
  emit + cycle 종료. PRD `≥ 30% endCause '자연사'/'노화'` 충족 검증.
- **C10-B Auto-rejuv trigger** — age threshold (예: age ≥ 65) 자동 발사 +
  god light budget check + rejuvenate buff 적용. PRD `≥ 20% rejuv count ≥ 1`
  충족 검증. **A 와 묶어서 한 phase** 권장 (둘 다 lifecycle emit path
  추가, code 영역 동일).

### 2순위

- **C10-C maxLevel 483% 폭증의 의도성 검증** — baseline 824k → 4.8M 은 PRD
  임계 (회귀 ≤ 5%) 안에 들지 않음 (+483%). PRD §수용 기준은 "회귀" 만
  명시했고 "급등" 은 제한 없음 → 형식상 PASS 이지만 inflation-rpg 정체성
  ("수십만 ~ 수백만 레벨 폭발") 에 적합한지 user 의도 확인 필요.
  ageEnd 70 까지 늘면 actions 도 2 배 → atk×lv inflate 가 cascade → maxLevel
  cap-less 폭증. 의도된 inflation 이면 OK, 균형 조정 필요면 cycle 11+.
- **C10-D jsonl chunked write** — 150 cycle sim 의 large jsonl 출력 시
  메모리/IO 부담 측정 + chunked write 도입 검토 (informational).
- **P1 boss-pick weight** (cycle 10 정찰 P1, 분리 보류).
- **D1-D7** 누적 backlog.
- **HeroSnapshot `staggered` field** (cycle 6 carry-over).
- **PRD fixture schema bug** (cycle 7).
- **C2 pathfinderFallbackCount saga 기록** (cycle 7+8+9 informational only).

### 3순위 — 페르소나 doc patch 후보 (cycle 10 의 system 발견)

- **정찰 단계의 "변경 0 가설" emit path 검증 룰**. cycle 10 PRD §"반대 기준"
  은 "변경 0 만으로 회춘/자연사 활성" 가설을 명시. sim 실측이 부분 falsify
  (3/5 PASS / 2/5 FAIL). 향후 PRD 가 "변경 0 가설" 을 세울 때, 정찰 단계
  에서 **trigger emit path 의 실존 grep** 을 강제 (`grep -rE
  "hero_died\(['\"]자연사['\"]\)|emit.*hero_died" src` 등). 부재면 PRD 가
  사전 의도적으로 변경 1+ 으로 격상. cycle 11 페르소나 patch (02-qa.md 또는
  03-product-owner.md) 후보.

## 자율진화 시스템 회고 — 10 cycle 누적

### 룰 정착 evidence

- **Δ-from-baseline 룰** (cycle 7 도입 → 8 첫 적용 → 9 100% 감소 입증 →
  **10 multi-항목 적용**). cycle 10 의 5 항목 baseline 표는 룰 의 최대
  fidelity 적용 — 5 항목 각각 baseline + threshold + actual 명시.
- **R1 grep query 룰** (cycle 7 personas patch). cycle 10 PRD 의 root
  grep (`grep -rnE "MAX_ARRIVALS"`) 가 정찰을 1-line root 로 directly 안내.
  **3 cycle 연속 grep 활용**.

### 신규 finding — PRD §"반대 기준" 부분 falsification

자율진화 system 의 cycle 10 신규 failure mode:

- Cycle 5: PRD 후보 (a-e) 외 채택 (endCycle reset) — **후보 닫힌 set 아님**
- Cycle 9: PRD 후보 (a-c) 외 채택 (boundary expand) — **후보 닫힌 set 아님**
- **Cycle 10: PRD §"반대 기준" 의 "변경 0 가설" 부분 falsify** — 후보가
  아니라 **"NOT this" 의 가설이 sim 으로 입증되지 않음**. 새 failure mode.

이 패턴은 **PRD 의 negative claim 도 실증 검증 대상** 임을 보여준다. cycle
5+9 의 "PRD 후보 외 채택" 은 implementer 의 root 재발견, cycle 10 의
"PRD §반대 기준 부분 falsify" 는 implementer 가 PRD 의 가설을 sim 으로
반증. 두 패턴 모두 자율진화 system 의 **PRD 의 자체 학습** 신호.

페르소나 doc patch 후보 (위 §Cycle 11 carry-over 3순위):
- 03-product-owner.md (PRD 작성자) → "변경 0 가설" 작성 시 emit path
  실존 grep 의무화
- 02-qa.md (정찰) → "변경 0 가설" 발견 시 trigger emit grep 추가

### Partial 비율 누적

10 cycle 중 partial = 4 (cycle 2, 3, 7→9 fold 시 partial 1+1, **cycle 10
partial**). 실효 partial (history fold 후) = 3 (cycle 2, 3, 10). false
PASS 0, false NEGATIVE 0. partial 은 negative signal 아닌 **measurable
threshold + emit path 검증 entail 한 정직성의 evidence**.

cycle 10 의 partial 은 cycle 7+8 의 "Δ 임계 미달 partial" 과 결을 달리함
— cycle 7+8 은 fix 효과 부분 적용, cycle 10 은 fix 효과 full + 추가 emit
path 부재 발견. **두 종류의 partial** 은 system 의 진화를 정확히 추적.
