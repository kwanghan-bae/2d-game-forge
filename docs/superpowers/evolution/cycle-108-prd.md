---
category: system
---

# Cycle 108 PRD — Fate Roll on Death

## 한 줄

HP 0 직전 *균열석 1 소비 → HP 50% 회복* 1 회 prompt 를 띄워, cycle 진행 중 player
의 *무거운 결정* surface 를 0 에서 1 로 끌어올린다. cycle 105 game critic 의 N2
(Mid-cycle Decision Surface) sub-feature 의 첫 ship — 가장 작은 scope, 가장 명확한
가치.

## 평가 핀포인트

- **게임비평가 (cycle-105-critic 재미 6/10, 약점 §2)**: cycle 진행 중 player
  decision 이 SpendModal 1 채널 + 매우 드문 NPC modal 에만 응축. cycle 당 평균
  1-3 회. idle 정체성 ≠ 0 decision — Cookie Clicker 의 prestige 같은 *무거운 결정*
  부재. inflation-rpg 의 sponsor gold 결정 outcome 도 maxLevel 영향 약함 (cycle
  17). 즉 *결정의 무거움* 도 약함. fate roll = 사망 vs 부활 의 명확한 무게.
- **게임비평가 §A (체험 의 시각화)**: 사망 자체도 saga 한 줄로 환원됨. fate roll
  modal 은 사망 *직전 직접 개입 channel* — 균열석 인프라 (Phase F-1) 가 IAP/Asc
  cost 외 새 용도로 활성화.
- **게임비평가 §B (Player agency surface area)**: 200 시간 idle ≠ 200 시간 0 결정.
  cycle 당 mid-cycle decision 1 회 추가는 cycle 105 §N2 의 정확한 답.

3 페르소나 통합 의견 = N2 multi-cycle (3-5 cycle) 의 첫 ship 으로 fate roll 우선.
boss intro / realm fork 보다 scope 작고 hook 지점이 단일 (EncounterEngine line 63
의 hero_died emit) 이라 implementer risk 최소.

## 카테고리 룰 9 자가검증

- **직전 2 cycle**: cycle 106 = VFX (Inflation Milestone), cycle 107 = UI (cycle
  106 의 sound/HUD 후속). VFX → UI → **system** 은 pivot 정상. 3 cycle 연속 같은
  카테고리 아님.
- **cycle 108 카테고리 태그**: `category: system` (첫 줄 명시 완료).
- **multi-cycle N2 sub-feature 모두 system 카테고리**: cycle 108 / 109 / 110 가
  연속 system 이 되어 룰 9 위반 후보. carry-over 명시 — cycle 111 의 카테고리는
  *반드시* system 외 (narrative / VFX / meta / 운영 / UI 중) 로 강제.

## Multi-cycle roadmap §N2

cycle 105 game critic 의 N2 정의를 3 sub-feature 로 분해. 각 sub-feature 가 별
PRD/spec/sim/smoke 사이클 1 회를 가진다. cycle 109+110 의 PRD 는 본 cycle 의
ship 결과를 reading 후 별도 작성. 본 PRD 는 *roadmap pin* 만 한다 — over-spec 금지.

| Cycle | Sub-feature | Scope | Hook 지점 | Player decision Δ |
|---|---|---|---|---|
| **108** | **Fate Roll on Death** | smallest | EncounterEngine line 63 의 `hero_died` emit 직전 (intercept (a) — 본 PRD §F1.동작) | +1/cycle (사망 빈도 0.7 가정 시) |
| 109 | Boss Intro Choice | medium | boss room 진입 직전 50ms freeze. 3 buff 카드 풀 + pick 1 의 카드 catalog 가 필요 (cycle 109 PRD 에서 정의) | +1/cycle (boss 출현 빈도 ~1.5/cycle) |
| 110 | Realm Fork | largest | realm 전환 entry 직전. 2 path (위험/안전) 의 modifier 풀 + trait 영향 공식 (cycle 110 PRD 에서 정의) | +1-2/cycle (realm 전환 ~3/cycle, 그 중 fork 활성 비율) |

**Roadmap 비고**:
- cycle 109 의 3 buff 카드 catalog 와 cycle 110 의 trait 영향 공식 은 본 PRD 의
  scope 외. over-spec 회피.
- 3 sub-feature 모두 ship 후 cycle 111 의 fold-up + retro 에서 N2 전체 evaluation
  (player decision freq cycle 당 1-3 → 5-10 의 game critic 가설 검증).
- cycle 108 의 controller pause/resume API 가 109/110 에서 재사용. 따라서 cycle
  108 의 implementation 은 fate-roll-only 가 아니라 *generic decision_required
  event* + *generic MidCycleDecisionModal frame* 의 *최소 1 인스턴스* 로 설계.
  단 본 PRD 의 acceptance criterion 은 fate roll 1 종만 검증한다.

## 우선순위 (cycle 108)

1. **F1. Fate Roll on Death** — N2 sub-feature 1/3. 가치 = 사망 직전 직접 개입 +
   균열석 인프라 V3 path 활성. scope 1 cycle.
2. **F2. MidCycleDecisionModal component** (optional, F1 의존성) — cycle 109/110
   에서 재사용할 generic modal frame. fate roll 은 첫 사용처. 만약 F1 만으로
   scope 닿으면 fate-roll-specific inline modal 로 ship 하고 F2 는 cycle 109 에서
   extract.

3 features 한도 = F1 + F2 (선택). 한도 준수.

## 기능 요구사항

### F1. Fate Roll on Death

- **목적**: cycle 진행 중 player 의 *무거운 결정* surface 를 0 에서 1 로. 균열석
  (Phase F-1 cost 화폐) 의 V3 path 첫 organic 용도. 사망 = 절대 종료 → 사망 = 1 회
  부활 기회 의 design pivot.

- **동작**:
  1. **Intercept 위치 = EncounterEngine 안쪽 (intercept option (a))** —
     `resolveEncounter` line 60-64 의 `hero.staggered` true branch 진입 직후,
     **`hero.applyDeathPenalty()` 호출 *전*** 에 fate-eligible 체크. eligible 시
     `hero_died` 대신 `fate_roll_required` 이벤트 emit → return. level penalty 는
     player 가 옵션 B (사망 수용) 선택 시 후행 적용. **why (a) over (b)**: option
     (b) (controller 에서 hero_died catch → HP 복원 + level rollback) 은
     applyDeathPenalty 의 undo path 추가 필요. (a) 는 *aborting* 이 자연.
  2. Eligible 조건 = (i) 이 cycle 인스턴스에서 fate roll 미사용 (per-controller
     instance in-memory `fateRollConsumed: boolean` flag), 그리고 (ii) `meta.crackStones >= 1`.
     둘 다 false 면 fate roll skip → 기존 hero_died path.
     - **edge case**: meta.crackStones = 0 이지만 fateRollConsumed = false 인
       경우, **modal 자체는 띄운다** (옵션 A disabled + B enabled). 그래야 player
       가 "균열석이 있었으면 살릴 수 있었음" 을 인지하고 IAP 동기 활성. fate roll
       자체는 소비되지 않음 (옵션 A unavailable 의 의도가 fate roll exhaust 가
       아니라 사망 수용이므로). **추가 단순화**: modal 등장 자체로
       `fateRollConsumed = true` 마킹 (옵션 A/B 무관). cycle 당 1 회 cap 의 가장
       lean 한 구현.
  3. `fate_roll_required` 이벤트는 `OverworldEvent` union 에 추가. payload =
     `{ enemyId: string; oldLevel: number; (pendingDeathPenaltyNewLevel: number) }`.
     `pendingDeathPenaltyNewLevel` = penalty 가 적용될 *경우* 의 newLevel (=
     `Math.max(1, Math.floor(oldLevel * 0.9))`). modal UI 의 "수용 시 levelDrop
     미리보기" 에 필요.
  4. CycleControllerV2 가 `fate_roll_required` 이벤트 receive 시: `arrivalPaused
     = true` flag set + 추가 arrival 처리 stop. resume API = `resolveFateRoll('accept'
     | 'decline')` controller method.
     - `'accept'` (옵션 A): `meta.crackStones -= 1`, `hero.hp = ceil(hero.maxHp *
       0.5)`, `hero.staggered = false`. **death penalty 적용 안 함**. saga 에
       `type: 'fateRoll', payload: { outcome: 'accepted' }` 기록. 이후 arrival
       loop resume.
     - `'decline'` (옵션 B): 지연된 `applyDeathPenalty()` 호출 + `hero_died` emit
       (cause: 원본 cause). 기존 사망 path 그대로 후행. saga 에 `type: 'fateRoll',
       payload: { outcome: 'declined' }` 추가 기록.
  5. OverworldRunner 가 `fate_roll_required` 이벤트 catch → `setFateRollModal({
     pendingDeathPenaltyNewLevel, oldLevel })`. NpcEncounterModal 패턴 그대로
     (cycle 105 critic line 30 의 modal pattern grep 확인).
  6. **5 초 timeout**: modal mount 시 `setTimeout(() => resolveFateRoll('decline'),
     5000)`. cleanup 시 clear. player 가 5 초 내 미응답 → 자동 옵션 B. 자동 idle
     게임 정체성 보호.

- **수용 기준 (Δ-from-baseline + multi-seed)**:

  **Baseline (cycle 107 sim 산출, seed 1024 / 2048 / 4096 평균)**:
  - hero_died emit count per cycle = baseline TBD (smoke 측정 후 PRD §sim 절에
    기입). cycle 17-30 의 default sim 산출 = `endCause === '전사'` ratio ≈ 0.65-0.75.
    즉 사망 빈도 cycle 당 ~0.7 가정.
  - `fate_roll_required` emit count per cycle = 0 (event 자체 신규).
  - `fateRollConsumed` saga record count per cycle = 0.
  - `meta.crackStones` per-cycle delta = 0 (organic drop V3 path 0, IAP 외).

  **수용 기준 (≥ 3 seeds: 1024, 2048, 4096 평균, 50-cycle headless)**:
  - C1. `fate_roll_required` emit count per cycle: baseline 0 → 본 PRD `≥ 0.5` (사망
    빈도 ~0.7 × eligibility 1.0 가정 시 ~0.7 이지만 multi-seed noise 0.02-0.04
    감안 conservative 0.5). Δ ≥ +0.5.
  - C2. sim 의 auto-decline policy (옵션 B 자동 선택, §sim-real-parity 절 참조)
    하에서, `endCause === '전사'` ratio: baseline ≈ 0.65-0.75 (cycle 107 측정값
    confirm 후 기입). 본 PRD 변동 ≤ 0.05 (auto-decline = 기존 동작 보존). Δ ≤ 0.05.
  - C3. `meta.crackStones` per-cycle delta: sim auto-decline policy 하에 변동
    0 보존 (decline 시 균열석 미소비). 산술 검증.
  - C4. **Playwright dev server 1-smoke** (sim-real parity 룰): 10× 속도로 fate
    roll modal 1 회 등장 + 옵션 A click + HP 50% 회복 + crackStones -1 의 *실제
    DOM* 측정. smoke 결과의 modal 등장 1 회 + 옵션 A 결과 = sim policy 외 path
    이지만 dev server 만 측정. smoke 측정 metric = `data-testid="fate-roll-modal"`
    visible count ≥ 1 in 1-2 분 (시드 fixed = 1024, 사망 1 회 발생 보장).

  **Multi-seed acceptance 충돌 검증**:
  - C1 Δ +0.5 는 단일 seed noise 0.02-0.04 초과 → multi-seed 측정 가능.
  - C2 Δ ≤ 0.05 는 noise 자릿수와 동급 → ≥ 3 seeds 평균 강제 (단일 seed 측정 불가).
  - C3 Δ = 0 (산술 0) 는 sim 측정 외, 코드 invariant 로 vitest assertion.

- **반대 기준 (NOT this)**:
  - HP 회복량 변동 금지 — **fixed 50% (`ceil(maxHp * 0.5)`)**. 비율 가변 디자인
    (예: "trait 에 따라 30-70%") 금지.
  - 균열석 cost 변동 금지 — **fixed 1**. tier 별 cost (예: "boss 사망 시 3 균열석")
    금지.
  - cycle 당 2 회 이상 금지 — **fixed 1 cap per controller instance**.
  - timeout 시 idle 무한 대기 금지 — **5 초 hard timeout** 후 자동 옵션 B.
  - "자동 옵션 A (균열석 자동 소비)" 금지. player 의 *적극 결정* (click 옵션 A) 만
    가치 있음. 미응답 = decline 이 디자인 정합.
  - run-resume 시 fate roll 재사용 가능. `fateRollConsumed` 는 per-controller-
    instance in-memory only — persist 안 됨. run-resume 시 새 controller instance
    spawn 되므로 자연히 reset. **persist v24 → v25 bump 불필요**. (advisor §4
    decision.)

### F2. MidCycleDecisionModal component (optional)

- **목적**: cycle 109 (boss intro) / 110 (realm fork) 에서 재사용할 generic modal
  frame. fate roll 이 첫 사용처. F1 만으로 cycle 108 scope 닿으면 F2 는 defer.

- **동작**:
  1. `<MidCycleDecisionModal/>` props = `{ title, descriptionKR, options: { id,
     labelKR, disabled?, danger?, onClick }[], timeoutMs?, onTimeout? }`.
  2. NpcEncounterModal 의 backdrop / centering / data-testid 패턴 재사용.
  3. fate roll = `title: '운명의 기로', options: [{ id: 'accept', labelKR: '균열석
     1 소비 (HP 50% 회복)', disabled: meta.crackStones < 1 }, { id: 'decline',
     labelKR: '운명을 받아들인다' }], timeoutMs: 5000`.

- **수용 기준**:
  - C5. F2 component 존재 시 F1 의 fate roll modal 이 F2 frame 으로 구현. F2 없이
     ship 시 inline modal 로 구현 + cycle 109 prep PRD 의 carry-over 에 "F2
     extract from FateRollModal" 명시.

- **반대 기준**:
  - cycle 109/110 의 design 을 본 F2 의 props shape 에 미리 반영 금지. fate roll
    의 *현재 필요* 만 cover. cycle 109 에서 props extend 가능 (예: `cards: BuffCard[]`).

## Baseline 측정 (Δ-from-baseline 의 근거)

**Grep evidence — 1차 인프라 점검**:
- `grep -rn "균열석\|crackStones" games/inflation-rpg/src` → `types.ts:248` (Asc
  cost 화폐), `gameStore.ts:1026/1038/1071/1303/1310/1333/1340` (spend/gain
  selectors 8 hits), `BattleScene.ts:313` (legacy organic drop, V3 path 미사용),
  `IapCatalog.ts` 4 hits (IAP 공급), `RerollModal.tsx:13` (1 consumer). 결론 =
  **균열석 인프라 완비, V3 path organic 공급 0**.
- `grep -rn "hero_died" games/inflation-rpg/src/overworld` → `EncounterEngine.ts:63`
  (intra-battle, intercept target), `CycleControllerV2.ts:302/597` (consumer +
  age-cap emit, 자연사 path 는 본 PRD scope 외), `OverworldEvents.ts:16` (union
  type). 결론 = **intercept 위치 명확**.
- `grep -rn "Modal" games/inflation-rpg/src/screens` → `NpcEncounterModal.tsx`,
  `SpendModal.tsx`, `SagaBookModal.tsx`, `StatusModal.tsx`. 결론 = **modal
  pattern 4 reference 확보**.

**Persist version**: `gameStore.ts:1478` → `version: 24` (cycle-7 S1). F1 의
in-memory `fateRollConsumed` 는 controller instance scope → persist bump 불필요.
**v24 유지**.

**Organic crackStones 공급 (advisor §3)**: V3 overworld path 에서 crackStones 의
organic drop = **0** (BattleScene 의 floor>=50 drop 은 legacy world-map flow,
phase-b3b2-complete 에서 제거됨). 따라서 cycle 108 ship 시 fate roll 의 옵션 A
선택 가능성 = `P(IAP 구매 or 누적 stones > 0)`. 본 PRD 의 player decision Δ +1
산술은 **IAP 또는 dev test seed 의 stones 보유** 전제. **Organic 공급 0 은 알려진
제한** — 균형 패치 별도 cycle 에서 처리 (예: cycle 111+ 의 fold-up 의 carry-over,
또는 cycle 110 realm fork 의 부수 보상).

## Sim-real parity 검증 (cycle 12 false PASS 룰)

**1. Sim driver mirror 검증 grep (의무)**:
- `grep -rn "fate_roll_required\|resolveFateRoll" scripts/sim-cycle-v2.ts` —
  expected: sim driver 가 (a) `fate_roll_required` 이벤트 receive 시 auto-decline
  policy (옵션 B) 호출, (b) controller 의 `resolveFateRoll('decline')` method
  invoke, (c) frame-based wall clock 환산 *없음* (sim 은 deterministic, timeout
  자체가 frame loop 의 1 tick 안에 해소).
- **결과 line 인용 의무** — implementer 가 sim driver 수정 후 PRD result.md 에
  3 line 인용 첨부.

**2. Playwright dev server 1-smoke (의무)**:
- 1× 또는 10× 속도, seed = 1024 fixed, 사망 1 회 발생 보장 시드.
- 측정 항목 = `data-testid="fate-roll-modal"` visible count ≥ 1 + 옵션 A click 후
  store `meta.crackStones` -1 + `hero.hp` 회복 + controller resume confirm.
- C4 의 dev server smoke 가 sim policy (auto-decline) 외 path = 옵션 A path 를
  실제 DOM 측정. sim 단독 PASS 불가.

**3. 산술 충돌 사전 검증 (cycle 11 룰)**:
- C1 (`fate_roll_required ≥ 0.5/cycle`) + C2 (`endCause === '전사'` ratio Δ ≤
  0.05) 결합 가능성:
  - sim 의 auto-decline 정책 → fate_roll_required 발생 시 *반드시* 옵션 B 후행
    → hero_died (cause: '전사') emit. 즉 fate roll emit ↔ 전사 emit 1:1.
  - 본 PRD ship 전 baseline = 전사 ratio ~0.7, fate roll = 0.
  - 본 PRD ship 후 = 전사 ratio ~0.7 (auto-decline 보존), fate roll = ~0.7.
  - Δ 산술: C1 Δ ≥ +0.5 (✓ 만족), C2 Δ ≤ 0.05 (✓ auto-decline 가 보존하므로
    실제 변동 ≈ 0). **충돌 없음**.

## 사용자 가치 측정

**Baseline (cycle 107 측정 또는 cycle 17-30 sim 산출 confirm 필요)**:
- Player decision count per cycle (sponsor gold spend + NPC encounter dialog) =
  1-3. (cycle 105 critic 핀포인트.)

**Cycle 108 ship 후 (organic crackStones 가정 또는 IAP/test seed 보유 가정)**:
- Player decision count per cycle = baseline 1-3 + (fate roll 발생 시 +1, 사망
  빈도 ~0.7 가정 → 평균 +0.7) = **1.7-3.7** (반올림 1-4).
- Δ-from-baseline: **+0.7 (expected)**. 단일 seed noise 0.02-0.04 자릿수보다 큼.

**Limit (organic 0 의 시나리오)**:
- `meta.crackStones = 0` (IAP 미구매 + dev seed 보유 없음) 상황에서 fate roll
  modal 은 등장 + 옵션 A disabled + 자동 옵션 B 5 초 후. player decision count Δ
  = **0** (옵션 A click 불가 → 결정 surface 활성 안 됨).
- **그러나 modal 자체 등장 = inflation 정체성의 *체험 channel*** — IAP 동기 활성.
  cycle 105 §A 의 "체험 의 시각화" 와 연결.

## 우선순위 외 backlog

- Organic crackStones 공급 V3 path. 별 cycle.
- cycle 109 = Boss Intro Choice (multi-cycle N2 sub-feature 2/3). 본 PRD 의 F2
  component reuse.
- cycle 110 = Realm Fork (multi-cycle N2 sub-feature 3/3). 본 PRD 의 F2 component
  + controller pause/resume API reuse.
- fate roll 의 *trait 영향* (예: 'courageous' trait 시 옵션 A click 확률 +N%).
  cycle 110 realm fork 의 trait 영향 공식 정의 후 동형 적용. 본 PRD scope 외.
- 5 초 timeout 의 player-configurable (settings 의 "timeout 10s/15s/off" toggle).
  cycle 109+ 의 fold-up 에서 retention metric 측정 후 결정.
- Audio sting 사망/부활 단서. cycle 106 의 sound infra 재사용. backlog.

## 비고

**리스크 메모**:

- **R1. Implementer 가 intercept (b) 로 가는 risk**: advisor §1 지적. PRD §F1.동작
  (1) 에 *(a) over (b) 명시* + level penalty 후행 화살표 강조. result.md 의 PR diff
  review 에서 EncounterEngine.ts line 60-64 의 `applyDeathPenalty()` 호출 위치가
  fate roll 분기 *후행* 인지 grep 확인 의무.
- **R2. Sim driver 5 초 timeout 환산 누락 risk**: advisor §2 지적. sim 은 frame
  based — wall clock 없음. sim driver 의 fate_roll_required handler 가 *즉시*
  resolveFateRoll('decline') 호출 (timeout 시뮬레이션 = 0 frame). dev server smoke
  만 wall clock 5s 측정. PRD §sim-real-parity §1 의 grep 결과로 검증.
- **R3. crackStones organic 0 의 사용자 가치 0 수렴 risk**: advisor §3 지적. PRD
  §사용자 가치 측정 §Limit 절에 명시. fate roll modal 등장 자체가 *체험 channel*
  이라는 정당화 + IAP 동기 활성 reframe. 균형 패치 carry-over 명시.
- **R4. run-resume 시 fate roll 재사용 가능성**: advisor §4 지적. per-controller-
  instance in-memory only. persist v24 유지. PRD §F1.동작 (2) 의 단순화 명시.

**의존성**:

- `OverworldEvents.ts` 의 `OverworldEvent` union 에 `fate_roll_required` type 추가.
  consumer = `CycleControllerV2.ts` (controller pause) + `OverworldRunner.tsx`
  (modal mount).
- `lightEmit.ts` line 22 의 excluded events list (현재: moral_choice,
  chapter_transition, hero_died, tick, arrived_at, battle_started, cycle_ended).
  `fate_roll_required` 도 excluded 추가 (signature moment 의 light emit 은 fate
  roll 등장이 아니라 *옵션 A 선택 시* 의 추가 검토 필요 — 본 PRD 는 단순화로 emit
  0 채택. cycle 109+ retro 에서 재평가).
- CycleControllerV2 의 `recordToStore` saga record schema 에 `type: 'fateRoll'`
  추가. SagaBookModal 의 type filter 도 update.

**컨셉 가드**:

- V3 정체성 = eternal hero idle sponsor. fate roll = *sponsor 의 개입* (균열석
  소비) 으로 hero 의 운명을 1 회 바꾸는 행위 → 정체성 정합 ✓.
- 자동 idle 게임 정체성 보호 = 5 초 timeout 의 자동 옵션 B. ✓.
- inflation 정체성 (1 → 수십만 폭발) 과의 정합 = 사망 = level penalty 10% 인
  현재 mechanic 에 *부활 chance* 추가 → 폭발 곡선 보존, 단지 1 회 회복 path
  활성. ✓.

**카테고리 자가검증 (재확인)**:

- 직전 2 cycle: 106 VFX / 107 UI. 본 cycle = system. 3 연속 같은 카테고리 아님 ✓.
- cycle 109/110 도 system 카테고리 (N2 sub-feature 모두 system). 즉 108-109-110
  이 3 연속 system → **cycle 111 의 카테고리는 system 외 강제** (룰 9 inverse
  signal). 본 PRD 의 carry-over 에 명시.

**완료 정의 (DoD)**:

- C1-C5 모든 acceptance 통과 (단 F2 = optional).
- PR diff 에 advisor R1 의 intercept 위치 확인 grep 결과 포함.
- Sim driver mirror grep + dev server smoke 1 회 (cycle 12 룰 의무).
- carry-over 3 항: organic crackStones 공급 0 / F2 extract (F1 inline ship 시) /
  cycle 111 카테고리 system 외 강제.
