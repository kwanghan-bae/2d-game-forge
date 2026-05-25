---
category: 운영
---

# Cycle 125 PRD — N5 Live Ops Mega-phase Spec (server-less seasonal + achievement)

## 한 줄

cycle 105 game critic 의 5 NEW 방향 중 HIGH-impact 유일한 carry-over (N5 Live
Ops) 의 *spec 본 cycle*. 실제 코드는 cycle 126-135 의 sub-cycle 에서 ship. 본
cycle 의 deliverable = 이 PRD 문서 1 개 + cycle 126 QA test plan 진입점. 서버
의존 0, PvP 0, 외부 leaderboard 0 의 server-less 정체성 유지.

## 평가 핀포인트

- **게임비평가 (cycle-105-critic §N5 §86-92)**: "월/주 별 modifier (예: 이번
  시즌 = volcano realm 진입 시 fire trait +1) + 도전과제 + 시즌 token → 균열석
  환전. *deterministic seed (`seasonId = floor(epoch / 30days)`) server-less
  변형이 정체성 유지하면서 부분 달성 가능*. mega-phase, 즉시 ship 부적합. Phase
  5 결합 시 정체성 혼란 — *시즌 = balance modifier, 결제 X* 의 엄격한 경계
  필요". impact HIGH (200 시간 retention 의 유일한 진정한 답).
- **레벨디자이너 (cycle-105-level-critic §N1-N5 cost 표 line 114)**: "enemy +8
  seasonal variant / boss +4 seasonal / equipment +0 / skill trait modifier +0 /
  trait +16 yr seasonal modifier / narrative +30 achievement / asset 5-10 token
  tier icon + season banner / code ~1500+ line. catalog + engine + screen +
  persist v25" — mega 분할 의무. 본 cycle 125 = code 0, 분할 spec only.
- **웹리서처 (cycle-105-research §N5 §146-154)**: "유사 시도 = AFK Journey
  시즌 시스템, Melvor expansion DLC. 메이저 idle 의 retention top driver, 단
  server-side 일반. 차별화 = `seasonId = floor(epoch / 30days)` server-less
  변형이 정체성 유지하면서 부분 달성 가능". 시즌 패스 + FOMO 안티-패턴 경고
  (§194-203) 도 인용 — F3 token 의 *유료 가속 0* 의무.
- **게임기획자 (룰 9 카테고리 균형 자가검증)**: user task brief 인용 — cycle
  121=test fix / 122=fix / 123=meta / 124=meta. meta 2 연속 후 운영 pivot
  허용 (3 연속 미달). 본 PRD `category: 운영` 첫 줄 명시 완료. **cycle 125 가
  자율진화 전체 (v1 1-100 + v2 101-124) 통틀어 *운영* 카테고리 첫 도입**.
- **advisor (사전 호출 8 핀포인트)**: (1) spec cycle 라도 룰 5-8 의 acceptance
  명시 의무, (2) F2 modifier 의 cycle 17 atk-bound 봉인 안전 정의, (3) F3
  token trigger = achievement 만 (rank 0), (4) seasonId determinism = UTC ms +
  cycle 시작 snapshot + `getNow` 주입, (5) 5 starter achievement 의 trivial /
  impossible arith-check, (6) cycle 131 telemetry 의 sim-real parity dual
  evidence, (7) persist v26 (v25 +1) 정정, (8) cycle 132-135 sub-phase 묶음 +
  out of scope 정확히 4 항목.

## 카테고리 룰 9 자가검증

- **직전 4 cycle (user task brief 인용)**: cycle 121 = test fix / 122 = fix /
  123 = meta / 124 = meta. 본 evolution/ 디렉토리에 cycle 121-124 PRD 가 직접
  존재하지 않아 grep 검증 불가 — user task brief 의 premise 로 수용.
- **meta 2 연속 (123+124) 후 cycle 125 = 운영 pivot**: meta 3 연속 미달
  (룰 9 의 3 연속 강제 조건은 본 cycle 에서 발동 X). 단 *카테고리 다양성*
  적극 권고 — user task brief 의 "운영 pivot 허용" 직접 회수.
- **운영 카테고리 첫 도입**: STATUS-2026-05-26-cycle-120.md §"카테고리 chain
  (룰 9 검증)" 의 19 cycle 추적 (narrative / VFX / UI / system / meta /
  balance / sim / chore) 어디에도 *운영* 없음. v1 cycle 1-100 도 카테고리
  자체 미도입 시기 (룰 9 는 cycle 105 surface). **본 cycle 의 운영 = 자율진화
  전체 첫 시도**.
- **후속 cycle 126-135 카테고리 가능성**:
  - cycle 126 (QA test plan) = `운영` 또는 `meta` 중 하나. 본 PRD 는 advisor
    권고대로 *QA = 운영* 으로 분류 권고 (live ops 의 acceptance 정의 역시 운영).
  - cycle 127 (AchievementSystem 자료구조) = `system`. 운영 2 연속 후 pivot.
  - cycle 128 (SeasonalModifierEngine) = `system`. system 2 연속.
  - cycle 129 (token + 환전 + persist v26) = `system`. system 3 연속 도달 →
    **cycle 130 강제 pivot 의무**.
  - cycle 130 (SeasonPassScreen + MainMenu 진입) = `UI` (강제 pivot 회수).
  - cycle 131 (telemetry/event hook) = `system` 또는 `운영`.
  - cycle 132-135 (balance + content expansion) = `balance` 또는 `운영`.
- **cycle 138 강제 pivot 의무**: 본 mega-phase 종결 = cycle 135. cycle 136-137
  은 N5 외 자유. **cycle 138 이후의 카테고리 chain 검증은 cycle 135 의 result
  doc 에서 재기록**.

## Mega-phase §N5 roadmap — cycle 125-135

cycle 105 critic 의 §N5 scope = "mega-phase, 즉시 ship 부적합. 3-5 cycle 로 못
끝남, 자율진화 cycle 단위로는 분할 sub-spec 필요". 본 PRD 의 분할:

| Cycle | Sub-deliverable | Scope | 카테고리 | Status |
|---|---|---|---|---|
| **125** | **본 PRD (spec only)** | smallest | **운영** | **본 cycle** |
| 126 | QA test plan + acceptance scaffolding (advisor 권고) | small | 운영 | carry-over |
| 127 | AchievementSystem 자료구조 + 5 starter 도전과제 | medium | system | carry-over |
| 128 | SeasonalModifierEngine + seasonId 산출 | medium | system | carry-over |
| 129 | season token + 균열석 환전 + persist v26 | medium | system | carry-over |
| 130 | SeasonPassScreen + MainMenu 진입 | medium | UI (강제 pivot) | carry-over |
| 131 | telemetry / event hook (achievement progress) | small | system 또는 운영 | carry-over |
| **132-135** | **balance + content expansion (sub-phase 묶음)** | medium-heavy | balance/운영 | carry-over |

**advisor 권고 §7 반영**: cycle 125-135 = 11 cycle 인데 mega-phase scope 상한
"5-10 sub-cycle" 근접. cycle 132-135 의 4 cycle 을 *single sub-phase* (balance
+ content expansion) 로 묶어 표기 — 룰 위반 회피.

**cycle 130 강제 pivot 의무**: 127+128+129 가 system 3 연속. 룰 9 강제 발동.
cycle 130 = `UI` 명시.

## 본 cycle 125 의 deliverable

- ✓ 본 PRD 문서 1 개 (`docs/superpowers/evolution/cycle-125-prd.md`)
- ✗ 코드 변경 0 (실제 implementation = cycle 127+)
- ✗ test 추가 0
- ✗ persist version bump 0 (cycle 129 에서 v25 → v26)

본 cycle 의 PR / merge artifact = 이 spec 문서 단 1 개. 검증 = `pnpm
typecheck && pnpm test` 가 baseline 1408 vitest 유지 + 회귀 0.

## Baseline 측정 (Δ-from-baseline 의 근거)

### Grep evidence — season / achievement / liveOps 어휘 점검

```bash
grep -rn "season\|SEASON\|achievement\|liveOps\|seasonId" \
  games/inflation-rpg/src --include="*.ts" --include="*.tsx" \
  | grep -v "test"
```

기대 결과 (cycle 125 시점 = pre-N5):

- `season/SeasonState.ts` — 기존 age 기반 환경 tint (live ops 아님, naming 충돌
  주의 — cycle 127 에서 `LiveSeasonState` 또는 `OpsSeason` 으로 별도 namespace)
- 위 외 `achievement` / `liveOps` / `seasonId` 어휘 = 0 hit (cycle 127 의 신규
  도입)

### Sim baseline (cycle 120 chained 50-cycle, seed 1024)

cycle 120 STATUS 의 §"신규 시스템" 직접 인용. 신규 sim 실행 의무 X — 본 cycle
의 deliverable 이 spec only 이므로.

| 지표 | baseline | source |
|---|---|---|
| maxLevel p50 | 6.98M | cycle 17 + cycle 31 보정 |
| polynomial degree | 0 | cycle 17 chain |
| natural-death rate | 99.3% | cycle 17 baseline |
| auto-rejuv rate | 99.3% | cycle 17 baseline |
| ageEnd p50 | 70 | cycle 17 baseline |
| arrival p50 / cap | 1154 / 1200 | cycle 17 baseline (cap 근접) |
| atkBonus impact on maxLevel | ratio 1.01 | cycle 17 봉인 |
| start-realm σ/mean | 5.66% | cycle 16 |
| cyclesWithNpc | 0 → 2/cycle | cycle 50 chained |
| vitest PASS | 1408 | cycle 119 |

### Δ-cap 의 의무 (룰 5-6)

본 PRD §F1-F3 의 모든 sim-driven acceptance 는 위 baseline 인용 + Δ-from-baseline
형식 + 단일 seed noise 0.02-0.04 자릿수 이하 시 multi-seed (≥ 3 seeds: 1024,
2048, 4096) 평균 의무. 절대값 가드 금지 (룰 5 cycle 1 yellow flag).

## 우선순위

1. **F1 AchievementSystem** — N5 의 정량 가시화 layer. 5 starter 도전과제로
   self-comparison axis (cycle 105 critic 약점 §C 의 *시간 축 self-comparison*
   직접 해소). cycle 17 atk-bound 봉인 회피 (achievement = read-only, hero
   state mutation 0).
2. **F2 SeasonalModifier** — 시즌 별 variance 주입 layer. trait-roll weight +
   narrative variant 가중 + sprite tint 만. maxLevel cap 무영향 (cycle 17
   finding) 의무.
3. **F3 Token Economy** — achievement → token → 균열석 환전. retention 의 *유료
   가속 0 + maxLevel rank 0* 의 엄격한 trigger 경계.

## 기능 요구사항

### F1. AchievementSystem

- **목적**: cycle 105 critic 약점 §C "외부 비교 axis 0" 의 *시간 축
  self-comparison* 부분 해소. 자기 자신의 plays 와 비교 가능한 정량 axis 도입.
  player decision frequency 의 *진척 motivation* 추가 (cycle 17 atk-bound
  봉인은 maxLevel 의 mutation 0 으로 회피).
- **동작**:
  - `AchievementId` literal 5 starter:
    1. `lv-10m-in-3-cycles` (산술: baseline p50 6.98M → 10M = +43%. 단일 cycle
       p10-20 plausible 이지만 *연속 3 cycle 의 1 회 이상* 으로 정의 — trivial
       reject)
    2. `npc-collect-4-uniques` (산술: cyclesWithNpc 2/cycle, 4 종 유니크 collect
       = 평균 2-3 cycle. moderate, OK as-is)
    3. `realm-conquest-6` (산술: unlockedRealms 6/6 by cycle 5 chained. trivial
       reject → *단일 cycle 안에 6 realm 모두 진입* 으로 재정의)
    4. `aging-master-10` (산술: natural-death 99.3%. 5 회 = trivial. *동일 realm
       자연사 10 회* 로 재정의 — realm 6 중 1 곳 고정 시 평균 60+ cycle. OK)
    5. `inflation-flash-100x` (산술: cycle 17 의 level/prevLevel ≥ 10 단일 jump
       감지. baseline 측정 부재 — cycle 127 의 첫 sim 측정 의무. *단일 cycle
       안에 ×100 jump 3 회* 로 잠정 정의, cycle 127 시점에서 trivial/impossible
       검증 후 재조정)
  - `AchievementProgress` flat record: `{ id, progress: number, completed:
    boolean, completedAt?: number, claimedAt?: number }`
  - `evaluateAchievements(state, cycleEvent)` pure function — cycle event 마다
    progress increment, completed flag 갱신
  - `claimAchievement(id)` action — completed 인 도전과제만 token 지급 (F3 wire)
- **수용 기준**:
  - **Grep evidence**: `grep -rn "AchievementId\|AchievementProgress" games/inflation-rpg/src/achievement --include="*.ts"`
    = ≥ 1 hit (cycle 127 시점, 본 cycle 125 시점 = 0)
  - **Sim baseline Δ-cap**: `lv-10m-in-3-cycles` 의 expected completion rate =
    baseline 단일 cycle p50 6.98M 의 3 회 max = p10-20 plausible. 단일 seed
    1024 chained 30-cycle 측정 시 rate 0.10-0.40 예상 — single seed noise
    0.02-0.04 자릿수와 *동일 자릿수* → **multi-seed 의무** (seeds 1024 / 2048 /
    4096 평균. 룰 6 적용)
  - **산술충돌 사전 검증 (룰 8)**: 5 starter 각각 trivial / impossible 검증 완료
    (§"동작" 의 산술 인라인). cycle 127 에서 재검증 의무.
  - **Sim-real parity (룰 7)**: cycle 127 의 acceptance = (a) sim driver mirror
    grep `grep -rn "evaluateAchievements\|AchievementProgress" scripts/sim-cycle-v2.ts` ≥ 1
    + (b) Playwright dev server 1-smoke = 10× 속도 30 초 진행 → achievement
    progress event 1 회 이상 emit 확인
- **반대 기준 (NOT this)**:
  - ❌ achievement 완료 시 hero state mutation (atk/hp/level/HP 모두 read-only)
  - ❌ achievement 완료 시 maxLevel boost (cycle 17 atk-bound 봉인 위반)
  - ❌ achievement 완료 시 cycle 진행 중 interrupt (idle 정체성 위반)
  - ❌ achievement 진행도 server sync (server 의존 0)

### F2. SeasonalModifier

- **목적**: cycle 간 신규 콘텐츠 비율 0% 문제 (cycle-105-level-critic §"재방문
  곡선") 의 *외부 변동성 주입* 해소. 시즌 별 variance 주입. cycle 17 atk-bound
  봉인 회피 (modifier = trait roll weight + narrative weight + cosmetic 만).
- **동작**:
  - `seasonId = floor((getNow() - epoch0) / SEASON_MS)` deterministic.
    - `getNow: () => number` 의존성 주입 (테스트 mock 가능)
    - `epoch0` = `Date.UTC(2026, 0, 1)` UTC ms 고정
    - `SEASON_MS` = 30 days = `30 * 24 * 60 * 60 * 1000`
    - cycle 시작 시점 `cycleStartSeasonId` snapshot → persist (mid-cycle clock
      change 면역 = advisor 권고 §4 직접 회수)
  - `SeasonalModifier` literal — 5 starter:
    1. `volcano-fire-trait-boost` — volcano realm 진입 시 fire 계열 trait 추첨
       가중 ×2 (advisor 권고 §2 의 정확한 mechanic 정의)
    2. `chaos-narrative-elegy` — chaos realm narrative variant 의 *애가/비극*
       tone weight ×1.5
    3. `field-cosmetic-spring` — field realm sprite tint = 봄 색조 (cosmetic only)
    4. `npc-encounter-boost` — NPC 등장률 가중 ×1.3
    5. `legendary-buff-card-bias` — N2 boss intro choice 의 legendary card
       등장률 가중 ×1.5
  - `applyModifier(seasonId, context) → modifier[]` pure function — 시즌마다
    1-2 modifier active
- **수용 기준**:
  - **Grep evidence**: `grep -rn "seasonId\|SeasonalModifier\|applyModifier"
    games/inflation-rpg/src/liveOps --include="*.ts"` = ≥ 1 hit (cycle 128 시점)
  - **Sim baseline Δ-cap (maxLevel cap 무영향 검증)**: `modifier active` vs
    `modifier inactive` 의 maxLevel p50 차이 ≤ baseline noise (0.02-0.04 자릿수).
    측정 의무 = multi-seed (1024 / 2048 / 4096) × `modifier active / inactive`
    × 30-cycle chained = 180 cycles sim. 절대값 가드 금지 — `|Δ maxLevel p50| ≤
    baseline 6.98M 의 ±5%` (0.04 자릿수 의 2 배 = 0.08 자릿수 — 룰 6 의 multi-seed
    enabled 후의 합산 noise).
  - **산술충돌 사전 검증 (룰 8)**: 5 modifier 모두 maxLevel 의 lid (cycle 17
    arrival cap 1200 + atk_bonus 봉인) 우회. trait weight 변경 = trait *선택*
    분포만 변경 (sim 측정 시 maxLevel 영향 통계적 noise 내). narrative weight =
    sim 산출과 무관 (텍스트만). cosmetic = 0 영향.
  - **Sim-real parity (룰 7)**: cycle 128 의 acceptance = (a) sim driver mirror
    grep `grep -rn "applyModifier\|seasonId" scripts/sim-cycle-v2.ts` ≥ 1 + (b)
    Playwright 1-smoke = volcano realm 진입 → fire 계열 trait 추첨 가중 확인
    (HeroDecisionAI trait pick log 인용)
  - **Determinism 검증**: `applyModifier(1, ctx) === applyModifier(1, ctx)` 의
    referential equality. `getNow` mock 으로 같은 seasonId 산출 검증.
- **반대 기준 (NOT this)**:
  - ❌ atk/hp flat bonus 추가 (cycle 17 봉인 직격, advisor 권고 §2 직접 회수)
  - ❌ MAX_ARRIVALS 상향 (cycle 17 의 진짜 lid, advisor 권고 §2 직접 회수)
  - ❌ realm fieldLevelRange 변경 (inflation 정체성 변동)
  - ❌ server-side seasonId 의존 (deterministic local only)
  - ❌ 시즌 종료 후 modifier persist (시즌마다 reset)

### F3. Token Economy

- **목적**: achievement 완료 → seasonToken 누적 → 균열석 환전. 영구 보상 axis
  제공. cycle 105 critic 약점 §3 "long-term retention engine 부재" 의 *유료
  가속 0 + maxLevel rank 0* 의 엄격한 변형. 균열석 inactive 현 상태 (cycle 105
  level-critic 의 milestone reward) 의 *organic 활성화 channel* 신규.
- **동작**:
  - `seasonToken` numeric counter (persist), `lastTokenSeasonId` snapshot.
  - achievement 완료 시 `seasonToken += <id 별 정수 1-5>`.
  - 시즌 종료 (`seasonId` 변경) 시 `seasonToken` reset → 시즌 종료 modal 에서
    *시즌 종료 전 환전 권고* (FOMO 회피 — 자동 환전 default).
  - 환전 비율: `seasonToken 10 → 균열석 1` (cycle 129 시점 sim 측정 후 재조정
    가능). 5 starter achievement 총 token = 1+2+2+3+5 = **13/시즌 plausible**
    → 균열석 1/시즌 plausible. cycle 116 의 organic crackStones drop (boss kill
    당 1, max 3/cycle) 대비 1/30 days = 매우 보조 axis.
  - 환전 트리거 = SeasonPassScreen 의 button (player explicit) 또는 시즌 종료
    auto.
- **수용 기준**:
  - **Grep evidence**: `grep -rn "seasonToken\|exchangeToken" games/inflation-rpg/src
    --include="*.ts"` = ≥ 1 hit (cycle 129 시점)
  - **Sim baseline Δ-cap**: token economy 가 maxLevel 에 무영향 — *현재 균열석
    이 V3 에서 inactive* 상태 (cycle 105 level-critic 인용). 시즌 환전 균열석은
    *Phase F-1 ascension 비용* 으로만 쓰임 (cycle 17 의 atk-bound 봉인 회피).
    sim 측정 의무 X — read-only economy.
  - **산술충돌 사전 검증 (룰 8)**: 5 starter total token / 시즌 = 13. 환전 비율
    10:1 → 균열석 1/시즌. cycle 116 의 organic 3/cycle × 30 cycle/시즌 = 90.
    13 token / 90 organic = ~14% 보조 → impossible 아님, trivial 도 아님.
  - **트리거 검증 (advisor 권고 §3)**: token 발생 = achievement 진행도만,
    maxLevel rank 0. grep `grep -rn "maxLevel.*seasonToken\|rank.*seasonToken"
    games/inflation-rpg/src --include="*.ts"` = 0 hit (cycle 129 의 invariant).
- **반대 기준 (NOT this)**:
  - ❌ token 의 유료 결제 (Phase 5 결합 0, FOMO 회피)
  - ❌ token 의 광고 boost (광고 = adFreeOwned + organic crack 만)
  - ❌ token 발생 트리거 = maxLevel rank (외부 leaderboard 본질 차단, advisor
    권고 §3 직접 회수)
  - ❌ 시즌 종료 시 token 영구 환전 (FOMO 없이 자동 default)
  - ❌ token 의 server sync (server 의존 0)

## 우선순위 외 backlog

- F2 modifier 의 시즌별 catalog 확장 (cycle 132-135 의 content expansion)
- achievement 카탈로그 5 → 20+ 확장 (cycle 132-135)
- SeasonPassScreen 의 visual polish (cycle 130 첫 ship + 추후)
- achievement progress 의 SagaBookModal 인용 (saga 와 achievement 의 weave)
- seasonId UTC vs 사용자 timezone (현재 UTC 만 — 향후 timezone 인용 옵션)
- 환전 비율 (10:1) sim 측정 후 재조정 (cycle 129 carry-over)
- F2 modifier 가 N2 boss intro choice 의 buff card pool 에 미치는 영향 (cycle
  131 의 telemetry 후 측정)

## Out of scope (정확히 4 항목 — advisor 권고 §7 반영)

1. **Phase 5 IAP integration** — token 의 유료 결제 0, FOMO 0
2. **서버 운영** — deterministic seasonId 로 server-less 유지
3. **광고 boost** — token 가속 광고 0 (광고 = adFreeOwned + organic crack 만)
4. **12개월 카탈로그 확장** — 본 mega-phase = 5 starter achievement + 5 starter
   modifier. 12개월 분량 카탈로그는 별도 mega-phase

## 비고 — 9 persona rule 자가검증

| 룰 | 본 PRD 의 검증 |
|---|---|
| 1. 컨셉 일관성 | V3 정체성 (eternal hero idle sponsor) 유지. F1-F3 모두 server-less + read-only + cycle 17 atk-bound 봉인 회피. |
| 2. 3 의 규칙 | N5 = cycle 105 surface 의 5 NEW 중 HIGH-impact 유일한 carry-over. v1+v2 통틀어 0 회 시도 → 3 회 미달이지만 *carry-over* 가 *3 의 규칙 inverse* (narrative tone 4 회 = saturation) 의 반대 신호 (운영 0 회 = pivot 의무). |
| 3. YAGNI | 본 cycle = spec only, code 0. cycle 127+ 의 각 sub-cycle 도 5 starter / 5 modifier 의 minimum. 12개월 카탈로그 out of scope. |
| 4. 승격 기준 | 본 mega-phase 의 산출 (`AchievementSystem`, `SeasonalModifierEngine`) 모두 inflation-rpg 워크스페이스 안. `@forge/core` 승격은 게임 #2 도착 시. |
| 5. Δ-from-baseline | F1-F3 의 sim-driven acceptance 모두 cycle 120 baseline (maxLevel p50 6.98M / arrival p50 1154 / natural-death 99.3% / ageEnd p50 70 / atkBonus 1.01) 인용 + Δ 형식. 절대값 가드 0. |
| 6. Multi-seed | F1 의 `lv-10m-in-3-cycles` rate = 0.10-0.40 (단일 seed noise 0.02-0.04 자릿수 동일) → seeds 1024/2048/4096 평균 의무. F2 의 maxLevel Δ 측정 동일. |
| 7. Sim-real parity | F1 의 cycle 127 acceptance = (a) sim driver mirror grep + (b) Playwright 1-smoke 의 dual evidence. F2 의 cycle 128 acceptance 동일. F3 의 cycle 129 는 read-only economy 이므로 sim 측정 의무 면제 (대신 grep evidence 만). |
| 8. 산술충돌 사전 검증 | F1 의 5 starter 각각 trivial / impossible arith-check 완료 (§"동작" 인라인). F2 의 5 modifier maxLevel cap 무영향 검증. F3 의 token 환전 비율 13/시즌 vs organic 90/시즌 검증. |
| 9. 카테고리 균형 | `category: 운영` 첫 줄 명시. user task brief 인용 (123/124 = meta 2 연속, 본 cycle 125 = 운영 pivot 허용 — 3 연속 미달). 자율진화 전체 *운영* 첫 도입. cycle 127-129 의 system 3 연속 → cycle 130 강제 UI pivot 의무 명시. |

## 비고 — 리스크, 의존성, 컨셉 가드

### 리스크

- **R1**: `season/SeasonState.ts` (기존 age 기반 환경 tint) 과 F2 의 `LiveSeason` /
  `OpsSeason` 의 naming 충돌 → cycle 127 에서 신규 namespace (예:
  `liveOps/SeasonalModifierEngine.ts`) 명시.
- **R2**: cycle 105 critic line 89 의 "persist v25" 인용은 stale (cycle 113
  carry-over 의 v25 bump 가 cycle 122 에 적용 완료, 현재 v25). 본 PRD §F3 의
  실 bump = v25 → **v26** (cycle 129 시점). advisor 권고 §7 직접 회수.
- **R3**: deterministic seasonId 의 클럭 변경 (사용자 device 시간 조작) →
  cycleStartSeasonId persist snapshot 으로 mid-cycle 면역. 다만 cycle 간 변경은
  intended (사용자가 device 시간 30 일 앞당기면 다음 cycle 시즌 진입은 정상
  flow).
- **R4**: F2 의 trait weight 가중이 *통계적으로* maxLevel 영향 0 인지의 검증은
  multi-seed (룰 6) 의무. 단일 seed sim 측정 시 noise 안에 묻힐 위험.
- **R5**: cycle 127 의 5 starter achievement 가 cycle 16 chained sim 의 30
  cycle 안에 모두 trigger 되는지 = trivial / impossible 재검증. cycle 127 의
  실측 후 starter 의 정의 재조정 가능.

### 의존성

- F1 → cycleEvents.ts 의 event bus (cycle 113 의 hall storage 같은 패턴)
- F2 → realm rotation (cycle 16 의 `unlocked[n % unlocked.length]`) + trait
  추첨 weight (cycle 76 의 HeroDecisionAI)
- F3 → 균열석 inactive 현 상태 (cycle 105 level-critic) → cycle 116 organic
  drop 의 보조 axis
- 외부 출처 / 시장 검증 = cycle 105 research §N5 + AFK Journey Resonance (auto
  share level + 시즌 분리) + Lifeidle (life score → global)

### 컨셉 가드

- **V3 정체성 (eternal hero idle sponsor)**: F2 의 modifier 가 *cosmetic +
  variance 만*. hero life cycle, sponsor decision, idle progression 어느 layer
  도 변경 없음.
- **Server-less idle**: F2 의 seasonId = `Math.floor((Date.now() - epoch0) /
  SEASON_MS)` 의 deterministic. server fetch 0, sync 0.
- **광고 / 결제 분리 (Phase 5)**: F3 token 의 트리거 = achievement 진행도만.
  광고 / 결제 channel 0. Phase 5 monetization layer 와 strict 경계.
- **maxLevel cap 무영향 (cycle 17 finding)**: F2 의 모든 modifier 가 atk_bonus /
  arrival cap / fieldLevelRange 어느 것도 mutation 0. trait weight + narrative
  weight + sprite tint 만. cycle 17 의 atk-bound 봉인 회피.
- **외부 leaderboard 0 (N3 와 분리)**: F3 token 의 트리거 = achievement
  진행도만, *maxLevel rank* 0. N3 (Hall of Sagas, cycle 112-114 완료) 의 self-
  referential 과 strict 경계.

## 마무리 한 줄

> **cycle 125 = N5 mega-phase spec only.** code 0, deliverable 1 spec doc.
> cycle 126 = QA test plan, cycle 127 = F1 AchievementSystem, cycle 128 = F2
> SeasonalModifier, cycle 129 = F3 Token Economy + persist v26, cycle 130 =
> SeasonPassScreen + MainMenu (UI 강제 pivot), cycle 131 = telemetry, cycle
> 132-135 = balance + content expansion sub-phase. 자율진화 전체 *운영*
> 카테고리 첫 도입. 9 룰 모두 자가검증 PASS. server-less + V3 정체성 + cycle 17
> atk-bound 봉인 안전 유지.
