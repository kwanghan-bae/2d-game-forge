---
category: system
---

# Cycle 110 PRD — Realm Fork

## 한 줄

Realm 전환 *직전* 2 path (위험 / 안전) 카드 surface 로, cycle 105 game critic
의 N2 (Mid-cycle Decision Surface) sub-feature 3/3 = multi-cycle 완결. cycle 108
(사망 후) + cycle 109 (전투 직전) 의 *거울상* — realm 단위의 "한 realm 안 모든
arrival 의 분위기" 결정. cycle 당 realm 전환 ~1-2 → 평균 +1-2 decision.

## 평가 핀포인트

- **게임비평가 (cycle-105-critic §N2 §69)**: "realm 진입 시 길 갈래 2 개 (위험/안전),
  trait 영향" 의 직접 ship. fate roll = 사망 1 회 channel, boss intro = boss 마다
  channel — realm fork = *realm 단위 모드* (소수 빈도지만 영향 가장 큼).
- **3 의 규칙 정통 적용**: cycle 108 + 109 + 110 의 3 instance 도달 → 본 cycle
  의 F2 = generic `<MidCycleDecisionModal/>` 정식 추출 + 3 modal 동시 migrate.
  advisor §"F2 generic extract — this IS the rule-of-3 moment" 직접 수용.
- **inflation 정체성 핀포인트**: realm 전환 = inflation 곡선 의 *국면 전환*. 그
  국면의 위험/안전 색조 가 player agency 채널.
- **trait 영향 첫 활성**: cycle 109 boss intro = trait 무관 (deterministic seed
  sampling). 본 cycle = trait 가 *유의미하게* 자동 선택에 영향. trait 시스템 (cycle
  Sim-B) 의 player-decision surface 첫 wire.

## 카테고리 룰 9 자가검증

- **직전 2 cycle**: cycle 108 = system (Fate Roll), cycle 109 = system (Boss
  Intro). 본 cycle 110 도 `category: system` 으로 **3 cycle 연속 system 도달**.
  cycle 108 PRD 의 §"카테고리 룰 9 자가검증" 에 이미 명시된 예외 — N2 multi-cycle
  sub-feature 의 ship 책임으로 정당화. cycle 109 PRD 의 §"cycle 110 도 system
  후보" 의 reading 도 동일 결론.
- **cycle 110 카테고리 태그**: `category: system` (첫 줄 명시 완료).
- **cycle 111 강제 pivot — 본 PRD 가 명시적 의무화**: cycle 108 + 109 + 110 의
  연속 system 으로 룰 9 의 *상한선 도달*. **cycle 111 은 *반드시* system 외
  카테고리 (narrative / VFX / meta / 운영 / UI 중 하나)**. spec 단계에서 카테고리
  태그 의무. 후보:
  - **N3 Hall of Sagas + Local Leaderboard** (meta, 3-5 cycle) — N2 ship 직후
    *외부 비교 axis 0* (cycle 105 critic §C) 의 첫 해소.
  - **N4 Run Statistics View** (UI, 1 cycle, MEDIUM) — sim curve visualizer +
    cycle 105 critic 약점 §1 의 *2 차 vector*.
  - **N1 후속 (Inflation Milestone 의 saga visual extension, VFX/UI)** — cycle
    106 VFX 의 saga book visual 확장.
  - **운영 (Achievement / Quest 1 종)** — N5 sub-spec 의 가장 작은 ship.
  실제 선택은 cycle 111 spec 단계의 4-페르소나 surface 가 결정. 본 PRD 의 의무 =
  *system 외* 만 강제. **system 카테고리 cycle 111 PRD 작성 금지**.

## Multi-cycle roadmap §N2 — cycle 108 + 109 + 110 의 closure

| Cycle | Sub-feature | Scope | Status |
|---|---|---|---|
| 108 | Fate Roll on Death | smallest | **ship 완료** (9b500a0) |
| 109 | Boss Intro Choice | medium | **ship 완료** (2bb8cf4) |
| **110** | **Realm Fork** | **largest** | **본 PRD** |

cycle 108 의 `fateRollPending` + `resolveFateRoll` 패턴, cycle 109 의
`bossIntroPending` + `resolveBossIntro` + `activeBossIntroBuffs` 패턴 → 본
cycle 의 `realmForkPending` + `resolveRealmFork` + `activeRealmForkBuffs` 로
mirror. **3 instance 패턴 = generic extract 의 시점.**

## 우선순위 (cycle 110)

1. **F1. Realm Fork** — N2 sub-feature 3/3. 가치 = realm 전환 모드 결정 + trait
   시스템의 player-decision channel 첫 wire.
2. **F2. `<MidCycleDecisionModal/>` extract** — 3 instance (Fate / Boss / Realm)
   의 공통점 추출 + 기존 FateRollModal + BossIntroModal 도 같이 migrate.
3. **F3. NPC tick carry-over (cycle 109 leftover)** — `resolveBossIntro` 의
   post-arrival mirror 에 NPC tick + npc_encounter 20% roll + family spawn 의
   chapter branch 회수. cycle 109 advisor §A 의 미회수 항목.

3 features 한도 = F1 + F2 + F3. 한도 준수.

## 기능 요구사항

### F1. Realm Fork

- **목적**: realm 전환 = inflation 곡선 의 국면 전환. 그 *직전* 1 회 위험/안전
  path 선택으로 다음 realm 안 모든 arrival 의 분위기 결정.

- **동작 — Realm fork 는 *realm 단위* 인터셉트 (vs fate roll = 사망 단위, boss
  intro = boss 단위). 패턴 분리가 implementer 의 함정**:
  1. **Intercept 위치 = CycleControllerV2 `handleArrival` 안의 exit-landmark
     branch (line 970-988 의 `this.currentRealmId = newRealm` 직전)**.
     `kind === 'exit'` + `currentRealmId !== null` + `realm.nextRealm` 정의됨 +
     `unlockedRealms.includes(realm.nextRealm)` 의 4 조건 만족 시 인터셉트.
  2. **Eligibility check** = `!realmForkPending` 만 (per-controller-instance
     in-memory). 같은 realm 진입은 cycle 당 ≤ 1 회 (realm.nextRealm 의
     unique chain 구조) 라 추가 dedupe 불필요. 만약 future spec 가 *realm
     역방향* 등을 추가하면 별 cycle 에서 dedupe 추가.
  3. **카드 선정 — deterministic seed + trait 영향 (advisor 핀포인트)**:
     - **2 cards = `riskCard` + `safeCard`** fixed shape. cycle 109 의 3 카드
       random sample 과 다름. realm fork = *결정의 무거움* 강조 → 2 명확한 갈래.
     - **카드 effect (fixed magnitude, controller seed 무관)**:
       - **`risk` card** (위험 path):
         - `atkBonus = +20%` (hero atk multiplicative).
         - `dropChanceBonus = +5%` (additive to dropChanceBonus snapshot).
         - **damping bonus** = **`-0.1`** (damping 0 ≤ d ≤ 1.0, 작을수록 hero
           약화 → 적 강화. *task 의 "위험 = 적 강화" 의 정정 해석*. advisor
           §"damping 방향" 핀포인트의 *반대 방향* 채택). 즉 `effectiveDamping
           = base damping + buffDamping = base − 0.1`. base damping 보통
           0.5-0.9 → 0.4-0.8 로 hero 더 약화. **위험 = atk +20% 로 자기 강화
           +적 환경 +10% 더 강화 의 *trade-off***.
         - **drop bonus 의 의미** = encounter 의 dropChanceBonus snapshot 에
           additive. cycle 109 boss intro 의 `drop_small` 패턴 mirror.
       - **`safe` card** (안전 path):
         - `atkBonus = 0` (영향 없음).
         - `dropChanceBonus = 0`.
         - **damping bonus** = **`+0.1`** (effectiveDamping = base + 0.1, hero
           강화). 만약 base = 0.7, safe path = 0.8. 위험과의 net swing 0.2.
         - **`agingSpeedMul = +0.05`** (시간 흐름 +5%). hero.tickAge 의 곱.
           기존 1.0 → 1.05. **안전 = 평탄, 그러나 시간 +5% 소요**. realm 1 개
           안의 ~수십 arrival 동안 누적.
       - **damping clamp**: `Math.max(0, Math.min(1.0, base + bonus))` 로
         clamping. base damping 의 정의역 보호.
     - **카드 nameKR / descKR**:
       - risk: `nameKR='위험한 길'`, `descKR='적이 강해진다 (damping −0.1), 그러나
         공격력 +20% / 드롭율 +5%'`.
       - safe: `nameKR='안전한 길'`, `descKR='평탄한 여정 (damping +0.1), 그러나
         시간이 5% 더 흐른다'`.
  4. **trait 영향 — auto-choice policy (advisor "heroic/prudent traits don't
     exist" 핀포인트 수용)**:
     - **task 의 `heroic > 5 / prudent > 5` 는 catalog 무관 metric** → 본 PRD
       는 catalog 의 16 trait 을 **heroic-aligned / prudent-aligned / neutral**
       3 그룹으로 매핑하고 그 *count* 로 결정.
     - **heroic-aligned (5)**: `t_challenge`, `t_thrill`, `t_berserker`,
       `t_boss_hunter`, `t_zealot`.
     - **prudent-aligned (4)**: `t_timid`, `t_fragile`, `t_iron`, `t_miser`.
     - **neutral (7)**: `t_swift`, `t_explorer`, `t_fortune`, `t_genius`,
       `t_terminal_genius`, `t_prodigy`, `t_lucky`.
     - **auto-choice (sim driver + 6초 timeout 시)**:
       - `let heroicCnt = traits.filter(t ∈ heroic-aligned).length`.
       - `let prudentCnt = traits.filter(t ∈ prudent-aligned).length`.
       - if `heroicCnt > prudentCnt` → **위험 path 선택 (idx=0)**.
       - else if `prudentCnt > heroicCnt` → **안전 path 선택 (idx=1)**.
       - else (동률 또는 0=0) → **안전 path (idx=1)** (보수적 default —
         "운명 받아들이기" 와 cycle 108 fate roll 의 auto-decline 정신과 같은
         결).
     - **single trait 도 영향** (hero 가 보통 1-3 trait 보유 — `traitsUnlocked`
       의 초기값은 cycle Sim-B 의 4 catalog seed 등 prior). `> 5` 임계는 비현
       실적 → `> 0 && majority` 로 정정.
     - **deterministic — same trait set + same fork = same auto-choice**.
       sim-real parity 보장.
  5. **선택 시 buff apply** — realm 종료 (다음 realm 전환) 까지만 유지되는
     *transient* buff. controller field = `activeRealmForkBuffs:
     RealmForkBuff[]`. (현재 cycle 109 의 `activeBossIntroBuffs` 는 cycle 종료
     까지 — 본 cycle 의 `activeRealmForkBuffs` 도 동일 *cycle 종료 reset* 채택,
     scope 단순화. 다음 realm 전환마다 이전 buff *추가 append* 가 되어버리는
     risk 있지만, cycle 당 realm 전환 ~1-2 = 평균 ≤ 2 buff stack — *반대 기준*
     의 cap 4 적용 (cycle 109 boss intro 와 동형)).
     - **`activeRealmForkBuffs` cap = 4** (cycle 109 와 동형). 5 번째 realm fork
       시 *modal 자체 skip* + saga record 'realmForkSkipped'.
     - **buff effect 적용**:
       - `atkBonus` (multiplicative) → `getRealmForkAtkMul()` selector (cycle
         109 의 `getBossIntroAtkMul` mirror). EncounterEngine 의 `encounter.setOpts`
         호출 시 다음 phase에서 hero atk 에 multiplicative. **단순화** = 본
         cycle 의 atk buff 는 boss intro 의 atk buff 와 *동일 channel*
         (`getBossIntroAtkMul` 의 누적과 합성 = `getCombinedAtkMul` 신설 또는
         별 selector + 양쪽 곱). **명시: 신 selector `getRealmForkAtkMul`
         별도 + EncounterEngine 의 contract 가 양쪽 곱** (advisor §"mirror
         BossIntro, not external snapshot" 직접 수용).
       - `dropChanceBonus` (additive) → `getRealmForkDropBonus()` selector.
         `encounter.setOpts({ dropChanceBonus: snap.dropChanceBonus +
         getBossIntroDropBonus() + getRealmForkDropBonus() })` 의 3-합 채널.
       - `dampingBonus` (additive, ±0.1) → `getRealmForkDampingBonus()`
         selector. `encounter.setOpts({ damping: clamp(snap.damping +
         getRealmForkDampingBonus(), 0, 1) })`. **base damping 이 1.0 한도라
         safe path bonus +0.1 의 효과 = 한도 위로 안 감 (clamp)**.
       - `agingSpeedMul` (multiplicative) → `getRealmForkAgingMul()` selector.
         `tickAge` 호출 시 `agingMul = (getBuffSnapshot?.().agingSpeedMul ?? 1) *
         getRealmForkAgingMul()`. **단순화** = 본 cycle 의 controller 의
         tickAge 4 호출 site (line 540, 613, 662, 899) 의 `agingMul` 식 모두
         realm fork mul 곱하기. 4-site grep + replace.
  6. **`realm_fork_offered` 이벤트** — `OverworldEvent` union 에 추가. payload =
     `{ oldRealm: RealmId; newRealm: RealmId; riskCard: RealmForkCard; safeCard:
     RealmForkCard }`. `RealmForkCard` = `{ id: 'risk' | 'safe'; nameKR;
     descKR; effect: { atkBonus, dropChanceBonus, dampingBonus, agingSpeedMul } }`.
     consumer = OverworldRunner (modal mount). controller 가 `realm_fork_resolved`
     도 emit (`{ choice: 'risk' | 'safe' }`).
  7. **realm 전환 = resolveRealmFork 내부에서 직접 호출** (cycle 109 옵션 (a)
     mirror):
     - `resolveRealmFork(choice: 'risk' | 'safe'): OverworldEvent[]` =
       (i) `realmForkPending = false`.
       (ii) `activeRealmForkBuffs.push(chosen)` (cap 4 enforcement: 4 도달 시
            modal 자체 skip 되므로 이 line 은 < 4 가정.
       Wait — cap 4 = modal skip 의 정확한 timing 은 *intercept* 단계에서 체크.
       resolveRealmFork 단계는 *이미 modal* 띄운 후 = cap < 4. 그러므로 push
       무조건 OK).
       (iii) `realm_fork_resolved` 이벤트 push.
       (iv) **deferred realm transition** = `this.currentRealmId = newRealm` +
            `recordSagaRealmTransition` + `realmEnter` saga record + `realm_entered`
            이벤트 push. (= line 974-987 의 원본 코드 그대로, intercept 단계
            에서 skip 됐던 부분을 후행 실행).
       (v) **post-arrival processing — 본 cycle 의 carry-over 인 F3 회수 동시
           처리**. handleArrival 의 line 884-1009 (job-unlock + tickAge +
           chapter transition + NPC tick + npc_encounter + family spawn) 의
           *해당 arrival 의 잔여* 를 resolveRealmFork 안에서 실행. cycle 109
           resolveBossIntro 의 post-arrival mirror (line 519-577) 패턴 mirror.
  8. **5 번째 realm fork = modal skip + saga record** (cycle 109 boss intro
     cap 4 mirror):
     - `activeRealmForkBuffs.length >= 4` 이면 `realm_fork_offered` 대신 직접
       *normal realm transition* (line 970-988 의 원본 path) 수행 + saga 에
       `type: 'realmForkSkipped'` 1 줄 기록. modal 미등장.
  9. **`realm_fork_skipped` 이벤트** — `OverworldEvent` union 에 추가.
     `{ oldRealm: RealmId; newRealm: RealmId; reason: 'cap_reached' }`. 이벤트
     자체는 normal realm_entered 와 같이 emit 되어 OverworldRunner 의 modal
     mount 회피.
  10. **6 초 timeout** (fate roll 5초 + boss intro 8초 사이의 중간값. realm
      fork 의 "결정의 무거움" 보존):
      - `RealmForkModal` (또는 `MidCycleDecisionModal`) mount 시 `setTimeout(()
        => resolve(autoChoice), 6000)`. autoChoice = §F1.동작(4) 의 trait 기반.
      - **dev server smoke 외 sim driver 는 즉시 resolve (frame-based, no wall
        clock)**.
  11. **controller pause/resume API**:
      - `realmForkPending: boolean` flag.
      - `realmForkPendingTransition: { from: RealmId; to: RealmId } | null` —
        intercept 단계에서 capture.
      - `realmForkPendingCards: { risk: RealmForkBuff; safe: RealmForkBuff } |
        null` — fixed shape, deterministic.
      - `resolveRealmFork(choice: 'risk' | 'safe'): OverworldEvent[]` method.
  12. **lightEmit 의 excluded list 추가**: `realm_fork_offered`,
      `realm_fork_resolved`, `realm_fork_skipped` 모두 0 light emit. fate +
      boss intro mirror.

- **수용 기준 (Δ-from-baseline, multi-seed)**:

  **Baseline (cycle 109 ship sim 산출 patch)**:
  - `realm_fork_offered` emit per cycle = 0 (event 자체 신규).
  - realm 전환 (`realm_entered` emit) count per cycle = baseline 측정값 (cycle
    109 patch 시점 sim 산출 = TBD smoke 측정 후 patch). cycle 17-30 sim 산출
    참고 = cycle 당 ~1-3 realm 전환.

  **수용 기준 (≥ 3 seeds: 1024, 2048, 4096 평균, 50-cycle headless)**:
  - C1. `realm_fork_offered` emit count per cycle: baseline 0 → 본 PRD `≥ 0.3`
    (realm 전환 ~1-3 × eligibility 0.5-1.0 = 0.5-3, 보수적 하한 0.3).
  - C2. realm 전환 count per cycle: baseline 보존. auto-choice (trait-based)
    가 realm 전환 *skip* 안 함 — 매번 realm_entered 후행. Δ ≤ 0.05.
  - C3. **trait-based auto-choice deterministic** = vitest unit test = same
    trait set + same fork = same choice. property test.
  - C4. **vitest integration** = realm fork modal mount → trait-based auto
    choice 6초 후 + realm_entered emit + activeRealmForkBuffs += 1.
  - C5. **Playwright dev server smoke** (cycle 110 generic extract 후 1 회
    smoke 측정): `data-testid="mid-cycle-decision-modal"` 또는 *3 instance 의
    공통 testid* visible count ≥ 1 in 1-2 분 (seed = 1024 fixed). 위 cycle 109
    PRD §sim-real-parity §2 의 carry-over 의 회수.
  - C6. **maxLevel per cycle Δ ≤ 0.1** (auto-choice 가 보수 default = safe path
    50% 비율 → damping +0.1 → hero 강화 → maxLevel 약간 ↑ but agingSpeedMul
    +5% → 시간 +5% → arrival 수 약간 ↓ → 평균 net ≈ 0). 50-cycle headless 평균.

  **회귀 검증** (cycle 108 + 109 가 새로 추가한 invariants):
  - fate roll path 미손상. realm fork 가 fate roll 의 `fateRollPending`
    invariant 보존 (둘 다 controller-instance scope 의 별 flag).
  - boss intro path 미손상. activeBossIntroBuffs 의 atk mul 과 realm fork 의
    atk mul 이 *별 selector* + EncounterEngine 안 *양쪽 곱* 으로 합성.
  - `realm_entered` emit count : `realm_fork_resolved` + `realm_fork_skipped`
    의 합 == 본 cycle ship 후 1:1.

- **반대 기준 (NOT this)**:
  - **fork 후 buff 영구 stack 금지** — controller instance scope only. cycle
    끝나면 자동 reset. persist 안 됨. **persist v24 → v25 bump 불필요**.
  - **realm 진입 외 trigger 금지** — handleArrival 의 exit-landmark branch
    안에서만. boss room 진입 / 사망 / NPC encounter 등 다른 trigger 0.
  - **fork 후 buff 즉시 retire 금지** — 다음 realm 전환 또는 cycle 종료까지
    유지. boss intro 의 cycle-scope retention 과 동형.
  - **3 path 이상 갈래 금지** — fixed 2 paths (risk / safe). 3 path 디자인 =
    boss intro 의 3 cards 와 의미 중복 + 결정 무거움 약화.
  - **damping bonus 의 절대값 변동 금지** — fixed ±0.1. trait 별 magnitude
    scaling 디자인 금지.
  - **fate roll + boss intro 의 코드 변경 금지** — 단, F2 generic extract 시
    공통 frame migrate 는 허용 (advisor 핀포인트). 즉 *frame extract* = OK,
    *fate roll 의 disabled 분기 등의 의미 변경* = 금지.
  - **organic IAP 의존성 0** — fate roll = 균열석 의존 / boss intro = 무의존 /
    realm fork = 무의존. realm fork 가 *모든 player 에 작동*.

### F2. `<MidCycleDecisionModal/>` extract (advisor "this IS the rule-of-3 moment" 수용)

- **목적**: cycle 108 FateRollModal + cycle 109 BossIntroModal + 본 cycle
  RealmForkModal 의 *3 instance* 공통점 추출. cycle 108 + 109 의 carry-over.

- **동작**:
  1. 신 component = `src/screens/MidCycleDecisionModal.tsx`. generic shape:

     ```ts
     interface MidCycleDecisionOption {
       id: string;
       labelKR: string;
       descKR?: string;
       tier?: 'small' | 'mid' | 'big' | 'risk' | 'safe' | 'default';
       disabled?: boolean;
       danger?: boolean;
     }

     interface Props {
       title: string;
       descriptionKR: string;
       options: ReadonlyArray<MidCycleDecisionOption>;
       timeoutMs: number;
       /** Index of option to auto-pick when timeout fires (cycle 108 fate
        *  roll = 'decline' = last option; cycle 109 boss intro = cards[0] =
        *  first option; cycle 110 realm fork = trait-based caller-supplied). */
       autoPickIdx: number;
       onResolve: (idx: number) => void;
       /** data-testid prefix — `${testIdPrefix}-modal`,
        *  `${testIdPrefix}-option-${idx}`, `${testIdPrefix}-countdown`. */
       testIdPrefix: string;
       /** modal 의 outer color theme. */
       accentColor?: string;
     }
     ```
  2. **FateRollModal migrate** = 신 wrapper:
     - props 변환: `oldLevel` + `pendingDeathPenaltyNewLevel` 은 descKR 안에
       text 로 splice (`수용 시 레벨 패널티: LV ${oldLevel} → ${pendingDeathPenaltyNewLevel}`).
     - options = `[{ id: 'accept', labelKR: '균열석 1 소비 (HP 50% 회복) · 보유
       N', disabled: crackStones < 1, tier: 'default' }, { id: 'decline',
       labelKR: '운명을 받아들인다', tier: 'default' }]`.
     - autoPickIdx = 1 (decline).
     - timeoutMs = 5000.
     - testIdPrefix = `fate-roll`.
     - accentColor = `#8b5cf6` (보라).
     - **외부 wrapper 가 store 의 crackStones 읽고 props 변환**. FateRollModal
       자체는 stateful 유지 (mount 직후 controller mark `fateRollConsumed=true`
       의 semantic 보존).
  3. **BossIntroModal migrate** = 신 wrapper:
     - props 변환: cards (3) → options (3). tier 그대로 transit.
     - autoPickIdx = 0 (첫 카드).
     - timeoutMs = 8000.
     - testIdPrefix = `boss-intro`.
     - accentColor = `#fde68a` (금).
     - keyboard 1/2/3 shortcut 보존 = MidCycleDecisionModal 안 generic
       (option idx ↔ Digit1/Digit2/Digit3 mapping).
  4. **RealmForkModal** = 신 wrapper:
     - options 2 (risk / safe). descKR 의 magnitude text 포함.
     - autoPickIdx = trait-based (heroicCnt vs prudentCnt 비교 결과; 위 §F1.동작(4)).
     - timeoutMs = 6000.
     - testIdPrefix = `realm-fork`.
     - accentColor = `#ef4444` (위험 측 색 강조).
  5. **migrate scope**:
     - 신 component 1 + 3 wrapper. 3 existing modal file 의 export 시그니처
       *불변*. internal 만 generic 으로 교체.
     - **단순 migration risk 최소화** = 신 component 의 test 1 + 3 wrapper 의
       test 회귀 0 보장 (기존 BossIntroModal.test.tsx 통과 + FateRollModal
       관련 OverworldRunner.test.tsx 통과).

- **수용 기준**:
  - C7. `<MidCycleDecisionModal/>` mount → options 의 button N render +
    timeout 시 autoPickIdx onResolve.
  - C8. FateRollModal wrapper migrate 후 기존 OverworldRunner.test.tsx 의 fate
    roll path 회귀 0.
  - C9. BossIntroModal wrapper migrate 후 기존 BossIntroModal.test.tsx 회귀 0.
  - C10. RealmForkModal wrapper = 위 §F1.동작(10) 의 trait-based autoPickIdx
    + 6초 timeout.

- **반대 기준**:
  - **3 modal 의 시각 디자인 변경 금지** — visual consistency 유지. accentColor
    / tier color 가 기존 file 의 동일값.
  - **TypeScript strict mode 위반 금지** — autoPickIdx 의 idx 가 options.length
    범위 검증 = compile-time (literal idx) 또는 runtime guard.
  - **store/store/gameStore 의 직접 access 제거 금지** — FateRollModal wrapper
    는 store 의 crackStones 직접 access 유지 (props 화 = scope 증대 risk).
  - **time pressure 시 inline ship 허용**: F2 의 generic extract 가 시간 부족
    시 RealmForkModal *standalone* ship + F2 = cycle 111 carry-over. 단 cycle
    111 = system 외 강제 → 카테고리 우회용 *후속 refactor cycle* 별도 필요.

### F3. NPC tick carry-over (cycle 109 leftover)

- **목적**: cycle 109 advisor §A 의 *resolveBossIntro 의 post-arrival mirror*
  의 NPC tick + npc_encounter + family spawn chapter branch 누락 회수. 동일
  누락이 본 cycle 의 `resolveRealmFork` 에도 발생 가능 — preventive 통합.

- **동작**:
  1. **helper extract** = `handlePostArrival(events, beforeChapter)` helper
     (cycle 109 advisor §A 의 "별 helper 추출" 후속).
     - input: `events: OverworldEvent[]` (mutated), `beforeChapter: Chapter`.
     - 처리: job-unlock + tickAge + chapter_transition + chapter milestone NPC
       spawn (parent / rival / mentor / spouse) + season change + auto-rejuv
       + natural death + NPC tick (every NPC 의 tickNpc + npc_died) +
       npc_encounter 20% roll. 즉 line 884-1009 의 *모든* post-arrival
       processing 을 통합.
  2. **3 caller site** = handleArrival (normal path), resolveBossIntro (cycle
     109 mirror), resolveRealmFork (본 cycle).
  3. **회기 검증** = 기존 handleArrival 의 test 회기 0. cycle 109 의
     resolveBossIntro 의 post-arrival mirror block 의 *순수 inline 복제* 가
     helper 호출로 교체.

- **수용 기준**:
  - C11. handleArrival + resolveBossIntro + resolveRealmFork 의 post-arrival
    behavior 가 동일 helper 호출 (단 staggered guard 의 분기는 helper 안
    branch).
  - C12. cycle 109 advisor §A 의 누락 (boss intro 직후 NPC tick + family spawn
    chapter branch 0) 의 명시적 회귀 = 50-cycle sim 의 family_event 의 cycle
    당 emit count = baseline 회복.

- **반대 기준**:
  - **F3 의 scope 확장 금지** — helper 시그니처는 inputs/outputs 명확 = 2 input,
    events mutation. resolveTrialEncounter / fate roll path 의 helper 사용은
    별 cycle 의 carry-over (시그니처 변경 가능).
  - **F3 의 시간 부족 시 inline ship 허용** = resolveRealmFork 의 post-arrival
    mirror 도 cycle 109 처럼 *inline 복제*. cycle 111 carry-over (단 cycle
    111 = system 외 강제 → 별 cycle 의 후속 refactor).

## Baseline 측정

**Grep evidence — 1차 인프라 점검**:
- `grep -n "realm_entered\|currentRealmId.*=" games/inflation-rpg/src/overworld/CycleControllerV2.ts` →
  `970-988` (exit landmark + nextRealm + unlockedRealms 의 4 조건). 결론 =
  **intercept 위치 명확 = handleArrival 의 exit branch 안**.
- `grep -rn "boss_intro\|BossIntro\|bossIntro" games/inflation-rpg/src` → 약
  60 hits. realm fork 도 동형 추가. 패턴 명확.
- `grep -rn "TRAIT_CATALOG\|TraitId\|t_challenge" games/inflation-rpg/src` →
  16 trait 의 catalog 명확. heroic/prudent 매핑 PRD 안 enumerate 완료
  (§F1.동작(4)).
- `grep -rn "realm_fork\|RealmFork\|realmFork" games/inflation-rpg/src` →
  0 hits. **clean slate** — naming 충돌 0.
- `grep -rn "MidCycleDecisionModal\|MidCycleDecision" games/inflation-rpg/src`
  → 0 hits. **clean slate** F2.

**Persist version**: gameStore.ts:1478 → version: 24 (task 의 "v23 유지" 는
오기 — 본 PRD 가 정정. 실제는 v24 → v24 유지). cycle 108 + 109 + 110 의
realm-fork / boss-intro / fate-roll buff stack 모두 controller instance scope.
**persist v24 유지** (advisor "task says v23 but is v24" 핀포인트 수용).

## Sim-real parity 검증 (cycle 12 false PASS 룰)

**1. Sim driver mirror 검증 grep (의무)**:
- `grep -rn "realm_fork_offered\|resolveRealmFork" games/inflation-rpg/scripts/sim-cycle-v2.ts` —
  expected: sim driver 가 (a) `realm_fork_offered` 이벤트 receive 시 controller
  의 trait-based auto-choice (`getRealmForkAutoChoice()` selector 제공) 호출,
  (b) `resolveRealmFork(choice)` invoke, (c) 반환 events 를 per-arrival event
  stream 으로 splice. 기존 boss intro splice (line 441-443) 패턴 동형.
- **결과 line 인용 의무** — implementer 가 sim driver 수정 후 PR diff 의
  sim-cycle-v2.ts 변경 line 3 줄 인용.

**2. Playwright dev server 1-smoke (의무)**:
- cycle 109 의 "MidCycleDecisionModal extract 시점 1 회 smoke 측정" 의 carry-over
  회수. 본 cycle F2 ship 후 *3 modal 통합 smoke 1 회* — fate roll OR boss intro
  OR realm fork 중 *발생하는 첫 modal* 의 testIdPrefix-modal visibility.
- 측정 항목 = `data-testid$="modal"` matching `fate-roll-modal | boss-intro-modal |
  realm-fork-modal` 의 visibility count ≥ 1 in 1-2 분 (seed = 1024 fixed,
  realm 전환 1 회 보장 시드).

**3. 산술 충돌 사전 검증 (cycle 11 룰)**:
- C1 (`realm_fork_offered ≥ 0.3/cycle`) + C2 (realm 전환 Δ ≤ 0.05) + C6
  (maxLevel Δ ≤ 0.1) 결합:
  - sim 의 auto-choice (trait-based, 동률 → safe) 정책 → realm_fork_offered
    발생 시 *반드시* resolveRealmFork 후행 → realm_entered emit. 1:1.
  - sim 의 default cycle (trait 0) = 동률 → safe path 100%. safe = damping
    +0.1 (hero 강화) + agingSpeedMul +5% (시간 +5%). 두 효과 의 net = +0.05
    (maxLevel 약간 ↑) - (시간 +5% → arrival 수 약간 ↓ → maxLevel 약간 ↓) ≈ 0.
  - Δ 산술: C1 Δ ≥ +0.3 (✓), C2 Δ ≤ 0.05 (✓), C6 Δ ≤ 0.1 (✓ net ≈ 0).
    **충돌 없음**.

## 사용자 가치 측정

**Baseline (cycle 109 ship 후)**:
- Player decision count per cycle (sponsor gold + NPC + fate roll + boss intro)
  = 1.7-5.7 (cycle 109 PRD 산출).

**Cycle 110 ship 후**:
- realm 전환 매번 1 회 modal (cap 4 까지). 평균 realm 전환 ~1-3/cycle 가정 →
  player decision 추가 +1 ~ +3.
- Total per cycle = baseline 1.7-5.7 + 1-3 = **2.7-8.7**. cycle 105 critic
  의 cycle 당 5-10 target 의 *중간-상한* 위치. **N2 multi-cycle 의 완결 가치**
  ≈ +1-3 decision/cycle 가 본 cycle 의 spec 통합 가치.
- Δ-from-baseline: **+1 ~ +3** (expected). 세 sub-feature 중 최대 변동폭.

**Limit (cap=4 시나리오)**:
- 5번째 realm 전환 시 modal skip. cycle 후반 realm 의 player decision Δ = 0.
- **그러나 cycle 당 realm 전환 ~1-3 의 *상한* 이 cap 4 이내** → 거의 모든
  realm 전환이 modal 등장. cap 도달은 *희귀 outlier case* (cycle 전체에서 5+
  realm 전환). cycle 105 critic 의 cycle 당 5-10 decision target 의 충분 조건
  hold.

## 우선순위 외 backlog

- **cycle 111 강제 pivot — 룰 9 자가검증 §명시** = system 외 카테고리.
  N3 / N4 / N1 후속 / 운영 중 택.
- **F3 helper 의 fate roll path 적용** = 본 cycle 의 scope 외. resolveFateRoll
  안에 helper 호출 추가는 별 cycle (cycle 111 system 외 카테고리 충돌이라 *후속
  refactor* 가 system 카테고리로 잡아야 함 → cycle 112+ 이후).
- **realm fork 의 *카드 catalog 확장*** = 본 PRD 의 risk/safe 2 fixed → 미래
  엔 위험/안전 각각 2-3 variant (예: "위험-공격적 / 위험-드롭 우선" 등). cycle
  N2 의 *deepening* 후속 cycle 의 spec.
- **F2 의 외부 player-configurable timeout** = 본 PRD 의 fixed 5/6/8 초 외 (settings
  토글 추가). cycle 109 carry-over 와 동일.
- **trait magnitude 조정** (heroic-aligned 가중치 변동, threshold 변경) =
  본 PRD 의 단순 count 비교 → 미래 *weighted score* 도 가능. balance patch.
- **organic crackStones 공급 V3 path** (cycle 108 carry-over) — 본 PRD 영향
  없음. 별 cycle.
- **audio sting** (realm fork modal 등장 시 deep realm 전환 stinger). cycle
  106 sound infra 재사용. backlog.

## 비고

**리스크 메모**:

- **R1. heroic/prudent trait 의 catalog 부재 risk** (advisor §1): PRD
  §F1.동작(4) 에 16 trait 의 *3 그룹 매핑* enumerate. `> 5` 임계의 정정 = `> 0
  && majority` 로 단순화.
- **R2. damping 방향 confusion risk** (advisor §3): PRD §F1.동작(3) 에 damping
  의 정의 (0 ≤ d ≤ 1.0, 작을수록 hero 약화) + 위험 = `-0.1`, 안전 = `+0.1` 의
  명시 + base damping 합 + clamp. task 의 "위험 = 적 강화" 의 정정 해석 명시.
- **R3. atk channel 충돌 risk** (advisor §"mirror BossIntro, not external
  snapshot"): PRD §F1.동작(5) 에 신 selector `getRealmForkAtkMul` 별도 +
  EncounterEngine 의 contract 가 양쪽 곱 명시. BossIntro 의 atk mul 채널은
  *불변*.
- **R4. F2 generic extract 의 부분 추출 부채 risk** (advisor §"this IS the
  rule-of-3 moment"): cycle 110 = 3 instance 도달 → 정식 추출. cycle 111 강제
  pivot 이라 carry-over 의 후속 cycle 위치 없음 → 본 cycle 내 ship 의무.
- **R5. F3 helper 추출의 부채 risk**: helper 시그니처 명시 + 3 caller site
  명시. 시간 부족 시 resolveRealmFork inline 복제 + helper 추출 별 cycle —
  단 cycle 111 system 외 강제라 cycle 112+ carry-over.
- **R6. Sim driver auto-choice mirror 누락 risk**: cycle 109 의 boss intro
  sim splice 패턴과 동형. controller 의 `getRealmForkAutoChoice` selector
  제공 → sim driver 가 trait-based auto-choice 호출.
- **R7. persist v24/v23 표기 오류** (advisor §"task says v23 but is v24"):
  본 PRD 가 v24 정정. controller-instance scope only → bump 0.

**의존성**:

- `OverworldEvents.ts` 의 `OverworldEvent` union 에 `realm_fork_offered`,
  `realm_fork_resolved`, `realm_fork_skipped` 추가.
- `lightEmit.ts` 의 excluded events list 에 3 event 추가.
- 신 file `src/buff/realmForkCatalog.ts` — 2 fixed cards (risk / safe) +
  effect 정의 + helper (`computeRealmForkAutoChoice(traits)`).
- F2 = 신 file `src/screens/MidCycleDecisionModal.tsx` + 3 wrapper migrate
  (FateRollModal.tsx / BossIntroModal.tsx / 신 RealmForkModal.tsx).
- F3 = `CycleControllerV2.ts` 안 `handlePostArrival(events, beforeChapter)`
  helper extract + 3 caller migrate (handleArrival, resolveBossIntro,
  resolveRealmFork).

**8 페르소나 룰 자가검증**:
- **게임비평가**: §N2 sub-feature 3/3 = cycle 105 §N2 의 완결.
- **게임 기획자**: 3 instance 도달 → F2 정식 extract. 3 의 규칙 정통 적용.
- **implementer**: §F1.동작 의 12 step + §F2 generic frame shape + §F3 helper
  시그니처 명시 → implementer 의 선택 risk 0.
- **테스트 작성자**: §수용 기준 C1-C12 = vitest 10+ test (catalog + controller
  + modal + helper).
- **sim driver 작성자**: §sim-real-parity §1 = grep 검증 + 3 line 인용 의무.
  trait-based auto-choice selector 제공.
- **balance 진단자**: C6 maxLevel polynomial degree Δ ≤ 0.1 — auto-choice 의
  safe path 100% (default trait 0) 보장 net ≈ 0.
- **persist 진단자**: controller instance scope only. persist v24 유지.
- **advisor**: §리스크 메모 R1-R7 = 본 advisor 호출의 7 핀포인트 모두 PRD
  명시 + mitigation 명시.

**3 의 규칙 평가**:
- N2 sub-feature 가 cycle 108 + 109 + 110 의 3 cycle 에 걸친 multi-cycle 작업
  완결. cycle 111 의 fold-up 에서 N2 전체 evaluation (player decision freq
  baseline 1-3 → 본 cycle 후 2.7-8.7 = cycle 105 critic 의 5-10 target 달성
  여부).
- F2 의 generic `<MidCycleDecisionModal/>` = **3 instance 도달의 정통 발화점**.
  본 cycle 에서 extract.

**룰 9 자가검증 (재확인)**:
- cycle 108 + 109 + 110 = 3 cycle 연속 system. **cycle 111 의 카테고리는
  *반드시* system 외**. spec 단계 의 카테고리 태그 의무.
- 본 PRD 의 §"카테고리 룰 9 자가검증" 절에 cycle 111 후보 (N3 / N4 / N1 후속 /
  운영) 명시.

**완료 정의 (DoD)**:

- C1-C12 모든 acceptance 통과.
- PR diff 의 EncounterEngine 영향 grep (atk channel 양쪽 곱 확인).
- Sim driver mirror grep + dev server smoke 1 회 (cycle 12 룰 의무).
- carry-over 3 항: cycle 111 강제 pivot (system 외) / F3 fate roll path 적용
  (별 cycle) / realm fork card catalog 확장 (별 cycle).
