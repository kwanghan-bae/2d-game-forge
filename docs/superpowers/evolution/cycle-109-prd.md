---
category: system
---

# Cycle 109 PRD — Boss Intro Choice

## 한 줄

Boss 전투 *직전* 3 buff 카드 중 1 택을 surface 해, cycle 105 game critic 의 N2
(Mid-cycle Decision Surface) sub-feature 2/3 를 ship 한다. cycle 108 fate roll
(사망 후 결정) 의 거울상 — 이건 *전투 전* 결정 channel. multi-boss cycle 매번
trigger 라 cycle 당 player decision +0.5 ~ +2.

## 평가 핀포인트

- **게임비평가 (cycle-105-critic §N2)**: 사망 직전 fate roll (cycle 108) 만으로는
  cycle 당 decision +0.7 — 사망 빈도가 cycle 당 0.7 가정이라서. 본 cycle 의
  boss intro 는 사망과 독립된 *사전* 결정 surface. boss 빈도 cycle 당 0.5-2
  (sim baseline 측정 필요). 두 channel 결합 시 cycle 당 decision count
  baseline 1-3 → 2-5 로 확대.
- **게임비평가 §B (Player agency surface area)**: fate roll = "균열석 있을 때만
  의미 있음" 한계 → boss intro = "균열석 무관, 모든 player 에 작동" — 결정
  surface 가 organic. IAP 의존성 없음.
- **inflation 정체성 핀포인트**: boss kill 자체가 진행 milestone (cycle 106
  VFX 의 ×10 tier 와는 다름 — boss = realm 진행 trigger). 그 *직전* 의 결정
  채널이 inflation 곡선 의 "어느 boss 의 어느 방향으로 가속" 의 player agency
  채널이 된다.

## 카테고리 룰 9 자가검증

- **직전 2 cycle**: cycle 107 = UI (SagaBookModal star filter), cycle 108 =
  system (Fate Roll). cycle 108 직후 cycle 109 도 system 은 룰 9 = "3 cycle
  연속 같은 category 금지" 의 경계. cycle 108 의 carry-over (N2 sub-feature
  multi-cycle) 로 정당화 — cycle 108 PRD §"카테고리 룰 9 자가검증" 에 이미
  명시되어 있었다.
- **cycle 109 카테고리 태그**: `category: system` (첫 줄 명시 완료).
- **cycle 110 도 system 후보** (N2 sub-feature 3/3 = Realm Fork). 단 cycle
  108 + 109 + 110 = 3 cycle 연속 system 이 되어 룰 9 위반. 따라서
  **cycle 111 강제 pivot** = system 외 카테고리 (narrative / VFX / meta /
  운영 / UI 중 하나) 로 진행해야 함. 본 PRD 가 *지금 시점에서* 명시한다.
- **cycle 110 의 카테고리는 system 외 후보 (예: meta 또는 운영) 도 검토**
  — cycle 110 시점에서 N2 sub-feature 3/3 vs pivot 의 trade-off 재평가.

## Multi-cycle roadmap §N2 (cycle 108 PRD 와 연결)

| Cycle | Sub-feature | Scope | Status |
|---|---|---|---|
| **108** | Fate Roll on Death | smallest | **ship 완료** (9b500a0) |
| **109** | **Boss Intro Choice** | medium | **본 PRD** |
| 110 | Realm Fork | largest | spec → cycle 110 PRD |

cycle 108 의 controller pause/resume API (`fateRollPending`, `resolveFateRoll`)
패턴이 본 cycle 의 `bossIntroPending`, `resolveBossIntro` 로 mirror. cycle 110
도 동형 (`realmForkPending`, `resolveRealmFork`).

## 우선순위 (cycle 109)

1. **F1. Boss Intro Choice** — N2 sub-feature 2/3. 가치 = boss 전투 전 *사전*
   결정 + buff catalog 첫 transient (cycle 종료까지만 유지) 시스템.
2. **F2. `<BossIntroModal/>`** — 3 카드 시각 + 8초 countdown. cycle 108
   `FateRollModal` 의 시각 패턴 mirror.

3 features 한도 = F1 + F2. 한도 준수. F2 의 generic `<MidCycleDecisionModal/>`
로의 extract 는 *조건부* — §F2 의 "extract trigger" 절 참조.

## 기능 요구사항

### F1. Boss Intro Choice

- **목적**: cycle 진행 중 boss 전투 *직전* 1 회 buff 선택 surface. cycle 108
  fate roll 이 "사망 후 결정" 이라면 본 cycle 은 "전투 전 결정". 두 channel
  결합으로 cycle 당 player decision count 1-3 → 2-5 로 확대.

- **동작 — Boss intro 는 *전투 전* 인터셉트 (vs cycle 108 fate roll 의 *전투
  후* 인터셉트). 두 패턴의 명확한 분리가 implementer 의 함정**:
  1. **Intercept 위치 = EncounterEngine `resolveEncounter` 의 boss branch
     line 50 직후 / `battle_started` emit 직전**. `kind === 'boss'` 인 경우만
     check. 따라서 enemy 전투 path 는 영향 0.
  2. **Eligibility check** = controller 가 wire 하는 `isBossIntroEligible?:
     (landmarkId: string) => boolean` callback. true 일 때만 fate roll mirror
     처럼 *abort* + `boss_intro_offered` 이벤트 emit. battle_started + 데미지
     루프 + battle_won 모두 미발생 → boss landmark `consumed` 도 controller
     의 `resolveBossIntro` 호출 후 후행 battle 에서 false 유지.
  3. **per-boss-landmark cap** (advisor §3 핀포인트):
     - per-cycle `fateRollConsumed: boolean` (cycle 108 패턴) 과 **다르다**.
     - 본 PRD = `Set<landmarkId>` of intro 처리된 boss landmarkId 추적.
       `bossIntroSeenIds: Set<string>` controller field.
     - eligibility = `!bossIntroSeenIds.has(landmarkId) && activeBossIntroBuffs.length < 4`
       (advisor §4 의 stack cap 통합).
     - **multi-boss cycle 매번 trigger OK**. boss landmark 마다 1 회. 같은
       boss 가 재진입할 일은 landmark.consumed 가 막으므로 발생 안 함 — 추가
       guard 불필요.
  4. **카드 선정 — deterministic seed** (advisor §1 핀포인트, BUFF_CATALOG 는
     light-spend meta buff 라 *재사용 금지*. 신 catalog 별도 file):
     - 신 file = `src/buff/bossIntroCatalog.ts`. 10 cards × 3 tier (소량 5 / 중량
       3 / 대량 2). Tier 별 magnitude 와 확률 가중치:
       - **소량 tier (5 cards, 가중치 50/5 = 10 each)**: `atk_small (+10%)`,
         `hp_small (+10%)`, `light_small (+5% rate)`, `move_small (+5%)`,
         `drop_small (+3% rate)`.
       - **중량 tier (3 cards, 가중치 30/3 = 10 each)**: `atk_mid (+25%)`,
         `hp_mid (+25%)`, `light_mid (+15% rate)`.
       - **대량 tier (2 cards, 가중치 20/2 = 10 each)**: `atk_big (+50%)`,
         `hp_big (+50%)`.
       - 가중치 normalize (5×10 + 3×10 + 2×10 = 100) 시 소량 50% / 중량 30%
         / 대량 20% 확률 분포.
     - **추첨 seed** = `controller.seed ^ landmarkId 의 string hash ^ 0xb0551`.
       deterministic per-boss-landmark. 같은 seed + 같은 landmarkId = 같은
       3 cards. sim-real parity 보장.
     - **3 cards 선정 알고리즘** = weighted random sample without replacement.
       fate roll 의 `SeededRng` 재사용. 첫 카드 = highest variance roll (player
       perception 신뢰). 두 번째, 세 번째 = 후행 sample.
     - **카드 magnitude 는 controller seed 무관하게 fixed** (위 tier 표
       참조). pool 의 *어떤 카드* 가 뽑히냐만 randomized. 같은 카드 = 같은 효과.
  5. **선택 시 buff apply** — cycle 종료까지만 유지되는 *transient* buff.
     controller field = `activeBossIntroBuffs: BossIntroBuff[]`. 각 buff =
     `{ id: BossIntroBuffId; effect: { kind: 'atk_mul'|'hp_mul'|'move_mul'|...;
     value: number }; sourceLandmarkId: string }`. cycle 끝나면 controller
     instance 가 cycle 단위로 새로 생성되므로 자동 reset. persist 안 됨.
     - **`activeBossIntroBuffs` 의 효과 적용 방식**:
       - `atk_mul`, `hp_mul` = `controller.getBossIntroAtkMul()` /
         `getBossIntroHpMul()` 누적 곱. EncounterEngine 의 boss/enemy 전투
         시작 직전 hero stat 에 multiplicative apply.
       - **단순화 (scope 보호)**: hero 의 `recomputeStats` 에 끼어들지 않는다.
         EncounterEngine 안 즉시 multiplicative 적용 (전투 루프의 `heroAtk =
         Math.max(1, Math.floor(hero.atk * damping * bossIntroAtkMul))` 형태).
         scope 확장 risk 차단.
       - `move_mul` = OverworldRunner 의 `speed * moveMul` 에 곱. controller
         의 selector method `getBossIntroMoveMul()` 노출.
       - `light_mul` = controller 가 `getBossIntroLightMul()` 노출 →
         OverworldRunner 의 light 누적 path 에 곱.
       - `drop_mul` = EncounterEngine 의 `dropChanceBonus` 에 additive 추가.
     - **timeout 시 = cards[0] 자동 선택** (advisor §6 / PRD 명시).
  6. **8초 timeout** (boss 의 무거움 반영, fate roll 5초 보다 길게):
     - `BossIntroModal` mount 시 `setTimeout(() => resolve(0), 8000)`. cleanup
       on resolve. PRD 명시 — implementer 가 fate roll 5s 와 헷갈리지 않게.
  7. **controller pause/resume API** = `bossIntroPending: boolean` flag +
     `bossIntroLandmarkId: string | null` + `bossIntroLandmarkKind:
     LandmarkKind | null` (= 'boss' 고정이지만 명시). `resolveBossIntro(idx:
     0|1|2)` method.
  8. **Boss 전투 실행 = resolveBossIntro 내부에서 직접 호출** (advisor §2
     핀포인트, 옵션 (a) 채택):
     - `resolveBossIntro(idx)` 가 (i) buff apply → (ii)
       `encounter.resolveEncounter(hero, 'boss', captured landmarkId)` 직접 호출
       → (iii) 반환된 events 를 controller 의 normal handleArrival 후처리
       pipeline 에 forward 후 return.
     - **세부 wiring**: `resolveBossIntro` 가 events array 반환. OverworldRunner
       는 fate roll 의 resolve flow 와 동형 처리 — modal close → events 의
       hero_died / level_up / battle_won 등을 기존 handler 와 같은 채널로 emit.
     - **why (a) over (b)**: (b) = landmark 의 consumed=false 유지 → 다음
       arrival 에 re-encounter 후 isBossIntroEligible=false 분기로 자연 진행.
       단 Pathfinder 가 다른 landmark 를 먼저 picking 할 risk + sim driver 의
       1 arrival = 1 boss kill 가정 깨짐. (a) 가 결정적이고 sim parity 깔끔.
     - **단순화 — re-fight 의 isBossIntroEligible 재호출 보호**:
       resolveBossIntro 내부의 encounter.resolveEncounter 호출 시 controller
       의 isBossIntroEligible callback 이 false 반환 (`bossIntroSeenIds.has(
       landmarkId)`). 즉 같은 호출 안에서 재진입 방지가 자연. modal 의 무한
       loop risk 0.
  9. **`boss_intro_offered` 이벤트** — `OverworldEvent` union 에 추가. payload =
     `{ landmarkId: string; cards: ReadonlyArray<{ id: BossIntroBuffId;
     nameKR: string; descKR: string; tier: 'small'|'mid'|'big' }> }`. consumer
     = OverworldRunner (modal mount). controller 가 `boss_intro_resolved` 도
     emit (`{ chosenIdx: number; chosenId: BossIntroBuffId }`).
  10. **lightEmit 의 excluded list 추가**: `boss_intro_offered`,
      `boss_intro_resolved` 도 0 light emit. fate roll mirror.

- **수용 기준 (Δ-from-baseline, multi-seed)**:

  **Baseline (cycle 108 sim 산출 patch)**:
  - `boss_intro_offered` emit per cycle = 0 (event 자체 신규).
  - boss kill count per cycle = sim driver 의 baseline = 측정값 (sim-cycle-v2
    의 `bossKills` 누적). cycle 108 patch 시점 sim 산출 = TBD (smoke 측정 후
    기입). cycle 17-30 sim 산출 = cycle 당 ~0.5-2 boss kill.

  **수용 기준 (≥ 3 seeds: 1024, 2048, 4096 평균, 50-cycle headless)**:
  - C1. `boss_intro_offered` emit count per cycle: baseline 0 → 본 PRD `≥ 0.4`
    (boss 빈도 0.5-2 × 가정 활성 0.8 = 0.4-1.6 의 보수적 하한).
  - C2. boss kill count per cycle: baseline 그대로 보존 (auto-choice cards[0]
    = small/mid/big tier 와 무관, 매번 trigger 되고 매번 boss kill emit).
    Δ ≤ 0.05.
  - C3. maxLevel per cycle: baseline 변동 측정. auto-choice cards[0] = 가장
    가벼운 small tier 카드 (가중치 50% 안의 첫 sample) 라 평균적으로 atk +10%
    또는 hp +10%. maxLevel 의 polynomial degree 변동 ≤ 0.05 (advisor 핀포인트
    의 "buff stack 무한 금지" 의 사후 검증 — cycle 끝나면 reset 이므로 누적
    inflation 영향 0).
  - C4. **vitest unit test** = `BossIntroIntegration.test.ts` 의
    `cards.length === 3` + `bossIntroSeenIds.size += 1 per boss kill` +
    `activeBossIntroBuffs.length` cap 4 enforcement + `resolveBossIntro` reset
    의 `bossIntroPending=false` invariants.
  - C5. **Playwright dev server smoke** = scope 외 (cycle 108 의 fate roll
    smoke 가 modal 패턴 검증 완료). 본 PRD 의 BossIntroModal 은 unit + react
    testing-library integration test 만 검증. dev server smoke 는 cycle 110
    `MidCycleDecisionModal` extract 시점에서 1 회 통합 측정.

  **회귀 검증** (cycle 108 가 새로 추가한 invariants):
  - fate roll path 미손상. 사망 전 boss intro 가 발생해도 fate roll 의
    `fateRollPending` invariant 보존.
  - `hero_died` emit 1:1 ratio 보존 (boss intro = 전투 전 → 전투 후 사망 시
    fate roll path 정상 진입).

- **반대 기준 (NOT this)**:
  - **Buff stack 무한 금지** (advisor §4) — `activeBossIntroBuffs.length >= 4`
    이면 *modal 자체를 띄우지 않음* (boss intro skip, 전투 직행). replacement
    정책 (oldest pop) 은 player 가 어떤 buff 사라졌는지 인지 어려움 → saga
    record 추가 필요 → scope 확장. skip 이 lean.
  - **Buff stack ≠ 4 종 초과 stack 금지** = "한 cycle 안에 4 cards 까지만
    선택 가능. 5번째 boss 등장 시 modal 자체 skip + saga 에 'boss intro
    skipped (cap)' 기록 1 줄". Δ-from-baseline 검증 시 boss kill count 보존.
  - **per-cycle stack persist 금지** — controller instance scope only. cycle
    끝나면 자동 reset. persist 안 됨. **persist v24 → v25 bump 불필요**.
  - **enemy 전투 path 영향 0** — kind === 'boss' 일 때만 intercept.
  - **8초 timeout 의 player-configurable 금지** — fixed 8000ms hard. settings
    의 timeout 토글은 cycle 109+ 의 fold-up 의 carry-over.
  - **카드 magnitude 동적 scaling 금지** — fixed +10%/+25%/+50% (atk/hp).
    hero level 에 비례한 scaling 디자인 보류 — 본 PRD scope 외.
  - **fate roll path 의 코드 변경 금지** — boss intro 의 invariants 가
    fate roll path 의 코드를 만지지 않게 격리. 두 패턴이 *별 controller field*
    + *별 method* + *별 event*.

### F2. `<BossIntroModal/>` component

- **목적**: cycle 108 `FateRollModal` 의 시각 패턴 mirror. 3 cards + 8초
  countdown + tier 별 시각 디자인.

- **동작**:
  1. props = `{ cards: ReadonlyArray<{ id; nameKR; descKR; tier }>;
     onResolve: (idx: 0|1|2) => void }`. (cycle 108 의 `oldLevel`,
     `pendingDeathPenaltyNewLevel` 같은 추가 metadata 는 cards prop 안에 포함.)
  2. NpcEncounterModal / FateRollModal 의 backdrop / centering / data-testid
     패턴 재사용. data-testid="boss-intro-modal",
     data-testid="boss-intro-card-{0|1|2}", data-testid="boss-intro-countdown".
  3. tier 색 = small (회색), mid (파랑), big (보라/금).
  4. 8초 timeout 시 `onResolve(0)` 자동 호출.
  5. `BossIntroBuffSummary` (id → nameKR / descKR / tier 매핑) = catalog
     에서 import — modal 은 catalog 의 source of truth 를 lookup.

- **수용 기준**:
  - C6. modal mount → 3 buttons render → click idx=1 → `onResolve(1)` 호출.
  - C7. modal mount 후 8초 idle → `onResolve(0)` 자동 호출.
  - C8. countdown text 가 1 초 단위 감소 (cycle 108 FateRollModal 패턴 mirror).
  - C9. 첫 카드 button 의 visual emphasis (default focus) → keyboard ENTER 시
    cards[0] 선택. fate roll modal 의 button focus 패턴 mirror.

- **반대 기준**:
  - **F2 의 generic `<MidCycleDecisionModal/>` extract 는 cycle 109 scope 외**.
    advisor §5 핀포인트 — extract 의 조건 = FateRollModal 도 같이 migrate 가능.
    cycle 108 ship 직후이고, fate roll 의 `disabled` 분기 + `oldLevel`/`pendingDeathPenaltyNewLevel`
    metadata 의 generic 화 risk 있음. **cycle 110 prep PRD 에 carry-over**:
    cycle 110 = Realm Fork 의 modal 도 도착하면 *3 instances* 의 공통점 추출
    이 더 안전. cycle 110 PRD 에서 `MidCycleDecisionModal` 정식 extract +
    FateRollModal + BossIntroModal 도 같이 migrate 결정.
  - **modal 외 화면 dimmer 의 blur 효과 추가 금지** — fate roll modal 과
    동일한 backdrop (rgba(0,0,0,0.75)) 만. visual consistency.

  - **F2 extract trigger (조건부)**: cycle 109 ship 시 BossIntroModal 의 시각
    구조가 FateRollModal 과 *50% 이상* 중복이면 cycle 109 patch 의 후속 commit
    으로 `<MidCycleDecisionModal/>` 도입 가능. 단 *시간 부족이면 skip*.

## Baseline 측정

**Grep evidence — 1차 인프라 점검**:
- `grep -rn "kind === 'boss'\|isBoss" games/inflation-rpg/src/overworld` →
  `EncounterEngine.ts:51` (kind === 'boss' branch), `CycleControllerV2.ts:350`
  (kills/bossKills 분기). 결론 = **intercept 위치 명확 = EncounterEngine 안쪽**.
- `grep -rn "fate_roll_required" games/inflation-rpg/src --include="*.ts"` →
  cycle 108 의 event + handler 8 hits. boss_intro_offered 는 동형 추가.
- `grep -rn "BUFF_CATALOG" games/inflation-rpg/src --include="*.ts"` → 7 hits,
  모두 light-spend meta buff. boss intro 의 transient buff 는 별 catalog 필요.
- `grep -rn "boss_intro\|BossIntro\|bossIntro" games/inflation-rpg/src` →
  0 hits. **clean slate** — naming 충돌 0.

**Persist version**: gameStore.ts:1478 → version: 24. 본 cycle 의
`activeBossIntroBuffs` / `bossIntroSeenIds` 모두 controller instance scope.
**persist v24 유지** (cycle 108 동일).

## Sim-real parity 검증 (cycle 12 false PASS 룰)

**1. Sim driver mirror 검증 grep (의무)**:
- `grep -rn "boss_intro_offered\|resolveBossIntro" games/inflation-rpg/scripts/sim-cycle-v2.ts` —
  expected: sim driver 가 (a) `boss_intro_offered` 이벤트 receive 시 auto-choice
  policy (cards[0]) 호출, (b) controller 의 `resolveBossIntro(0)` invoke, (c)
  반환 events (`boss_intro_resolved` + battle_won 등) 를 same per-arrival event
  stream 으로 splice.
- **결과 line 인용 의무** — implementer 가 sim driver 수정 후 PR diff 의
  sim-cycle-v2.ts 변경 line 3 줄 인용.

**2. Playwright dev server 1-smoke (scope 외)**:
- cycle 108 의 fate roll modal smoke 가 modal 패턴 검증 완료. 본 PRD =
  vitest unit + react testing-library integration 만. cycle 110 에서
  `MidCycleDecisionModal` 통합 시점 1 회 smoke 측정 (PRD §우선순위 외).

**3. 산술 충돌 사전 검증 (cycle 11 룰)**:
- C1 (`boss_intro_offered ≥ 0.4/cycle`) + C2 (boss kill count Δ ≤ 0.05) 결합:
  - sim 의 auto-choice cards[0] policy → boss_intro 발생 시 *반드시* 선택 후
    boss 전투 진행 → battle_won (boss) emit. 즉 boss_intro emit 과 boss kill
    1:1 또는 boss kill ≤ boss_intro (4 cap skip 시).
  - 본 PRD ship 전 baseline boss kill = ~0.5-2/cycle, boss_intro = 0.
  - 본 PRD ship 후 = boss kill ~0.5-2/cycle (auto-choice 보존), boss_intro =
    ~0.4-1.6 (≤ boss kill).
  - Δ 산술: C1 Δ ≥ +0.4 (✓ 만족), C2 Δ ≤ 0.05 (✓ auto-choice 가 보존). 충돌 없음.

## 사용자 가치 측정

**Baseline (cycle 108 sim 산출 + cycle 105 critic 핀포인트)**:
- Player decision count per cycle (sponsor gold + NPC dialog + fate roll) =
  1-3 + fate roll 발생 시 +0.7 (cycle 108) = **1.7-3.7**.

**Cycle 109 ship 후**:
- Boss intro 매 boss kill 마다 1 회 modal (4 cap 까지). 평균 boss kill
  ~0.5-2/cycle 가정 → player decision 추가 +0.5 ~ +2.
- Total player decision count per cycle = baseline 1.7-3.7 + 0.5-2 =
  **2.2-5.7**. cycle 105 critic 의 cycle 당 5-10 target 의 *중간* 위치.
- Δ-from-baseline: **+0.5 ~ +2** (expected). cycle 108 ship 의 +0.7 보다 변동
  폭 큼 (boss 빈도 0.5-2 의 dispersion).

**Limit (boss intro cap=4 의 사후 시나리오)**:
- 5번째 boss 등장 시 modal skip. cycle 후반 boss 의 player decision Δ = 0.
- **그러나 modal 의 등장 빈도 = boss kill 빈도 의 80% 이상** (cap 도달 시점이
  대부분 cycle 후반). cycle 105 §N2 의 cycle 당 decision count 1-3 → 5-10
  target 의 충분 조건은 boss intro 4 cap 이라도 hold.

## 우선순위 외 backlog

- **F2 generic `<MidCycleDecisionModal/>` extract** — cycle 110 prep PRD 에서
  3 instances (fate / boss / realm) 의 공통점 추출. 본 cycle 의 BossIntroModal
  은 standalone 으로 ship.
- **resolveBossIntro 의 NPC tick + npc_encounter 누락** (cycle 109 advisor §A
  fix 의 carry-over). handleArrival boss path 의 post-encounter 7 항목 중
  6 (age tick / job-unlock / chapter / season / auto-rejuv / natural-death)
  는 inline 으로 복제됐으나, **NPC tick + npc_encounter chance roll + family
  spawn 의 chapter_transition branch** 는 제외. boss intro 의 cycle 당
  영향 = boss intro 빈도 ~0.5-2/cycle × NPC encounter chance 20% ≈ 0.1-0.4
  npc encounter 누락/cycle. cycle 110 의 첫 task 로 inline 복제 또는 helper
  추출 (`postArrivalProcess(events)`).
- cycle 110 = Realm Fork (multi-cycle N2 sub-feature 3/3). 본 cycle 의
  controller pause/resume + per-instance event payload 패턴 reuse.
- Organic crackStones 공급 V3 path (cycle 108 carry-over) — 본 PRD 영향 없음.
- Boss intro card magnitude 의 *trait 영향* (예: 'mighty' trait 시 atk_big
  카드 가중치 +N%). cycle 110 realm fork 의 trait 영향 공식 정의 후 동형 적용.
- Audio sting (boss intro modal 등장 시 deep cinematic stinger). cycle 106
  sound infra 재사용. backlog.
- **cycle 111 강제 pivot** (룰 9 자가검증 §명시) — system 외 카테고리.

## 비고

**리스크 메모**:

- **R1. Implementer 가 BUFF_CATALOG 를 만지는 risk** (advisor §1): PRD §F1.동작(4)
  에 *신 catalog 별 file 명시*. bossIntroCatalog.ts. PR diff review 에서
  buff/catalog.ts 의 BUFF_CATALOG 가 unchanged 인지 grep 확인 의무.
- **R2. Re-fight wiring 의 (b) path risk** (advisor §2): PRD §F1.동작(8) 의
  옵션 (a) 명시 + 옵션 (b) 의 Pathfinder risk 명시. implementer 가 (b) 채택
  시 sim driver 의 1 arrival = 1 boss kill 가정 깨짐 (sim-real parity 깨짐).
- **R3. fateRollConsumed (cycle 108) ↔ bossIntroSeenIds (본 cycle) 의 패턴
  혼동 risk** (advisor §3): PRD §F1.동작(3) 에 *per-cycle vs per-landmark cap*
  의 명확한 분리 명시. fate roll = 한 cycle 1회. boss intro = 한 boss 1회 +
  cycle 당 4 cap.
- **R4. Buff stack 무한 risk** (advisor §4): activeBossIntroBuffs cap 4 +
  modal skip 정책. PRD §F1.동작(3) 의 eligibility 함수에 포함.
- **R5. F2 extract 의 부분 추출 부채 risk** (advisor §5): PRD §F2.반대 기준
  에 *cycle 110 까지 defer* 명시. 본 cycle 의 BossIntroModal 은 standalone.
- **R6. Sim driver auto-choice cards[0] mirror 누락 risk** (advisor §6):
  PRD §sim-real-parity §1 의 grep evidence 의무. cycle 108 fate roll 의
  auto-decline 직후에 boss_intro_offered → resolveBossIntro(0) splice 패턴.

**의존성**:

- `OverworldEvents.ts` 의 `OverworldEvent` union 에 `boss_intro_offered`,
  `boss_intro_resolved` 추가. consumer = `CycleControllerV2.ts` (pause) +
  `OverworldRunner.tsx` (modal mount) + `sim-cycle-v2.ts` (auto-choice).
- `lightEmit.ts` 의 excluded events list 에 `boss_intro_offered`,
  `boss_intro_resolved` 추가.
- 신 file `src/buff/bossIntroCatalog.ts` — 10 cards × 3 tier + magnitude +
  weighted sample helper.

**8 페르소나 룰 자가검증**:
- **게임비평가**: §N2 sub-feature 2/3 = cycle 105 §"NEW 방향" §N2 의 직접 실현.
- **게임 기획자**: cycle 108 fate roll 패턴 mirror — controller pause/resume API
  reuse. 구조적 일관성.
- **implementer**: §F1.동작 의 8 step + 옵션 (a)/(b) 비교 명시 →
  implementer 의 선택 risk 0.
- **테스트 작성자**: §수용 기준 C4 = vitest 10+ test (3 area: catalog +
  controller + EncounterEngine intercept).
- **sim driver 작성자**: §sim-real-parity §1 = grep 검증 + 3 line 인용 의무.
- **balance 진단자**: §C3 maxLevel polynomial degree Δ ≤ 0.05 — auto-choice
  cards[0] 의 가장 가벼운 영향 보장.
- **persist 진단자**: controller instance scope only. persist v24 유지.
- **advisor**: §리스크 메모 R1-R6 = 본 advisor 호출의 6 핀포인트 모두 PRD
  명시 + mitigation 명시.

**3 의 규칙 평가**:
- N2 sub-feature 는 cycle 108 + 109 + 110 의 3 cycle 에 걸친 multi-cycle 작업.
  cycle 110 ship 후 cycle 111 의 fold-up 에서 N2 전체 evaluation (player
  decision freq 1-3 → 5-10 의 game critic 가설 검증).
- F2 의 generic `<MidCycleDecisionModal/>` 은 3 instances 도달 (fate + boss +
  realm) 시 정식 추출 — *3 의 룰 의 정통 적용*.
