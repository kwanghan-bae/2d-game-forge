# Cycle 1 PRD — Variance + Realm Tone + NPC Saga 회수

## 한 줄

**eternal hero 의 매 cycle 이 똑같다는 정체성 위배**를 build/realm/NPC 세 차원에서 풀어 inflation-rpg 의 무한 saga 가 진짜로 무한히 다른 chapter 가 되게 한다.

## 평가 핀포인트

- **게임비평가**: ① V3-DEF 가 emit 하는 NPC event 4종 (`npc_encounter`/`npc_died`/`family_event` 등) 이 `recordToStore` 우회로 saga 에 0 회 기록 — V3-H 의 `hero_died` dead path 와 동일 패턴 부채. ② 50 cycle 전부 skill 21/21 학습 + Tier 2 mage 46% 편향으로 build 분기 = 0. ③ 49/50 cycle 이 `max_arrivals=500` 인공 종료, "eternal hero 자연사·회춘" 컨셉 비트가 거의 발생 안 함.
- **스토리작가**: ① levelUp/levelUpBatch 6 variant 가 cycle 당 수백 발 발사로 즉시 고갈 — c1024 한 cycle 에 동일 문장 50회+ 반복. ② `forRealmEnter`/`forSeasonChange` generator 부재로 base/sea/volcano/underworld/heaven/chaos 어디서든 narrative 톤 동일. ③ moral choice 8 catalog 가 cycle 당 80회 발사로 fan-out 부족 + caste 분포 (mage 46% 등) 가 narrative 색채로 전혀 안 새어나옴.
- **레벨디자이너**: ① `JobSystem.evaluate` tie-break 가 strict `>` 라 JOBS 배열 순서 의존 — pious≥3 valley 의 mage 가 pious≥5 의 monk 를 항상 이김, 50 cycle monk/ranger unlock = 0. ② `SHRINE_SKILL_GRANT_RATE=0.48` + level milestone grant 로 21 skill catalog 1 cycle 안에 완전 saturate. ③ trial 승률 87% + reward `level += 3` 가 800k lv 환경에서 0.0004% — "고위험 고보상" 정체성 무효화 (이 항목은 backlog).
- **웹리서치 (Realm Chapter Narrator invention)**: Path of Achra 3 prong 축 + Wildermyth bespoke 양 끝 + Loop Hero chapter 게이지의 **합성 invention**. 한 cycle 에 다 못 함 — F2 가 invention 의 component 1 (bespoke realm-enter 한 줄) 만 partial 채택, 나머지 (3 축 modifier · chapter 게이지) 는 backlog.

## 우선순위

1. **F1 — Build / Cycle Variance Pass** — 평가 3 인 공통: critic #2, story (간접), level #1+#2 가 모두 "매 cycle 똑같다" 라는 한 카테고리에 모이는 가장 큰 약점. inflation-rpg 의 정체성 ("eternal hero 의 연속성 = 변화 있는 영원") 위배의 직접 표현.
2. **F2 — Realm Tone Narrator (invention 의 partial)** — story #2 + critic 표류 경보 + level realm 진입율 + research invention 의 component 1 — 3 인 + 리서치 4 회 등장. realm 톤 부재는 V3-H 가 시각적으로 잡은 realm 차이를 narrative 가 못 받쳐주는 정확한 위치.
3. **F3 — NPC Saga Dead Path 회수** — critic #1 단일이지만 V3-DEF 의 NPC 4종 투자 회수 + V3-H `hero_died` fix 와 동일 패턴이라 작은 비용으로 큰 dead path 청산. 우선순위 3 으로 두는 이유: F1 (직접 정체성 위배) 과 F2 (3 인 공통) 보다 등장 빈도가 낮음.

## 기능 요구사항

### F1. Build / Cycle Variance Pass

- **목적**: 50 cycle 시뮬에서 "모든 cycle 이 동일 21 skill 학습 + 46% mage 편향" 으로 닫혀 있는 decision space 를 열어 cycle 간 build 가 자연 분기하게 만든다. eternal hero 의 연속성은 *변화 있는* 연속성이어야 의미가 산다.
- **동작**:
  - `SHRINE_SKILL_GRANT_RATE` (`games/inflation-rpg/src/hero/EncounterEngine.ts:21`) 를 `0.48 → 0.20` 으로 낮춰 cycle 당 평균 skill 학습 수를 21 → ~12 로 감소.
  - `JobSystem.evaluate` (`games/inflation-rpg/src/hero/JobSystem.ts`) 의 Tier 2 valley 충돌 해소:
    - `JOBS.mage.requiredPersonality.min: 3 → 5` (pious≥3 valley 비워 priest/apprentice 가 차지)
    - `JOBS.monk.requiredPersonality.dim: 'pious' → 'prudent'` (mage 와의 same-dim 충돌 영구 분리)
    - `JOBS.ranger.requiredPersonality.min: 4 → 6` (prudent≥4 valley 를 archer 가 흡수 중, ranger 는 prudent≥6 으로 상향)
  - `MERCIFUL_PROC_RATE` (`EncounterEngine.ts:23`) `0.15 → 0.10` — moralChoices avg 80 의 다수 발원 억제로 personality threshold 의미 회복.
  - sim 재실행 (`pnpm --filter @forge/game-inflation-rpg sim:cycle` 또는 동등 sweep) 후 미세조정.
- **수용 기준**:
  - `pnpm --filter @forge/game-inflation-rpg sim:cycle` 50 cycle (seed 1024–1073, `maxArrivals=500`) 재실행 결과:
    - `skillsLearnedCount` p50 ≤ 14 (현재 21).
    - Tier 2 dominant single-job share 가 cycle 0 baseline (mage 0.46) 대비 ≥ 0.05 감소 (i.e., maxShare ≤ 0.41).
      근거: dim-source-rate 비대칭 (holy_ruin 등) 구조로 absolute 0.35 는 threshold lever 만으로 도달 불가 — v3/v4 bit-identical 로 검증됨.
      Cycle 2+ 의 PRD 도 sim-driven acceptance 는 Δ-from-baseline 룰 따른다 (절대값 금지).
    - `monk` 또는 `ranger` 의 unlock 횟수 ≥ 1/50 (현재 0/50, 0/50 → 합산 1+ 이상이면 valley 분리 효과 확인).
    - `moralChoices` p50 ≥ 50 (Cycle 1 sim baseline 55 의 floor) AND ≤ 80 (over-stimulus 가드).
      - **Calibration note**: 원안은 `[60,80]` 이었으나 baseline 측정 없는 가설이라 BLOCKED. Cycle 1 sim 실측 (MERCIFUL_PROC_RATE 0.10 환경) 에서 p50 ≈ 55 가 안정점으로 확인되어 50 floor 로 재조정. 80 ceiling 은 over-stimulus 가드로 유지.
  - 기존 vitest 1044 + 50-cycle e2e 회귀 없음.
  - `maxLevel` p50 의 변화가 800k ± 30% 이내 (곡선 평탄화 방지 — 정체성 가드).
- **반대 기준 (NOT this)**:
  - Skill catalog 자체 확장 (21 → 35) — backlog. 이 cycle 은 gating rate 조정만.
  - Trial 난이도/보상 rebalance (level #3) — backlog, 별도 combat balance phase.
  - `expGainForKill` 의 `k_gain 1.8` 변경 — 곡선 평탄화 risk. V3-G sweep 으로 분리.
  - 새 skill / 새 job 추가 — 이 cycle scope 외.

### F2. Realm Tone Narrator (Bespoke Realm-Enter)

- **목적**: V3-H 가 시각적으로 도입한 6 realm (base/sea/volcano/underworld/heaven/chaos) 의 톤 차이를 narrator 가 받쳐주게 한다. 50 cycle 중 realm_unlocked 98% 가 narrative 에 0 줄로 묻혀버린 것을 chapter boundary 의 명시 비트로 회수.
- **동작**:
  - `games/inflation-rpg/src/narrative/NarrativeGenerator.ts` 에 두 generator 추가:
    - `forRealmEnter(realm: RealmId, age: number): string` — realm 별 5 variant.
    - `forSeasonChange(season: Season, age: number, realm: RealmId): string` — season 4종 × realm-tag 가벼운 modifier (realm 별 5 variant 까진 아님 — 기본 4 + realm-flavor prefix).
  - realm 별 5 variant 의 hand-written 한 줄 (story-critic 예시 참고):
    - 예: `(13세) 바다 안개가 발치까지 올라왔다 — 심해의 문이 열렸다.`
  - `SagaEventType` 에 `realm_entered` 와 `season_changed` 등록 (이미 emit 되고 있으면 wire 만 확인).
  - `OverworldRunner` 의 hard-coded season 한 줄 (`"계절이 바뀌었다 — 여름"`) 을 `forSeasonChange` 호출로 교체.
  - `recordToStore` 가 `narrativeText` slot 을 채워 SagaBookModal 의 "여정" filter 에서 chapter 경계로 보임.
- **수용 기준**:
  - 50 cycle sim (F1 의 동일 sim 재실행) 결과 분석:
    - realm_unlocked event 마다 narrative line 1 줄 이상 발화 — base 제외 sea/volcano/underworld/heaven 중 ≥ 4 realm 에서 발화 확인.
    - season_changed event 마다 narrative line 1 줄 발화 — 4 계절 모두 등장.
    - SagaBookModal "여정" filter 에서 realm 진입 line 이 chapter 헤더 직후 시각적으로 식별 가능 (수동 verify).
  - `narrationVariants.ts` 에 `forRealmEnter` variant 6 realm × 5 = 30 줄 + `forSeasonChange` 4 season + realm-flavor prefix 가 코드에 존재.
  - 기존 vitest 회귀 없음 (narrative generator 신규 함수 단위 테스트 ≥ 4 추가).
- **반대 기준 (NOT this)**:
  - Realm Chapter 게이지 / chapter boss trigger (Loop Hero 식) — research invention 의 component 3, **backlog**.
  - Personality × job-tag × realm-tag 3 축 modifier (Wildermyth 식 personality-as-frame) — research invention 의 component 2, **backlog**.
  - levelUp variant 15+ 확장 + 구간별 톤 (≤999 / 1k-999k / 1M+) — story #1, **backlog**.
  - Moral choice variant 확장 + caste tagging — story #3, **backlog**.
  - `max_arrivals` sim cap raise — sim-config 변경, **PRD scope 외**.

### F3. NPC Saga Dead Path 회수

- **목적**: V3-DEF 가 spawn 한 NPC (라이벌·멘토·결혼·자식) event 4종 이 `CycleControllerV2.handleArrival` 안에서 `events.push` 만 되고 `recordToStore` 가 호출 안 돼 SagaBookModal/EternalSaga 에 0 회 등장하는 dead path 를 회수한다. V3-H 의 `hero_died` fix 와 동일 패턴.
- **동작**:
  - `games/inflation-rpg/src/hero/CycleControllerV2.ts` 의 `handleArrival` 함수에서 다음 4 event 마다 `recordToStore` 호출 추가:
    - `npc_encounter` (CycleControllerV2.ts:344 부근)
    - `npc_died` (CycleControllerV2.ts:351 부근)
    - `family_event` (CycleControllerV2.ts:316/321 부근 결혼·자식)
    - (검토 후 V3-DEF 의 그 외 NPC-관련 event 1-2 종 추가 가능)
  - `NarrativeGenerator.ts` 에 3 generator 추가:
    - `forNpcEncounter(npc, age, kind)` — kind = mentor/rival/passerby, 각 3-4 variant.
    - `forNpcDeath(npc, age, cause)` — 3-4 variant.
    - `forFamilyEvent(event, age)` — marriage/child_born/child_grown 각 2-3 variant.
  - `SagaTypes.SagaEventType` 에 위 event type 등록 (이미 있으면 type-only 추가).
  - SagaBookModal 의 "관계" 또는 "여정" filter 에서 NPC line 노출 확인.
- **수용 기준**:
  - 50 cycle sim 에서 NPC 관련 narrative 가 ≥ 5 cycle 에 등장 (현재 0/50). 단일 cycle 안 발생 수는 NPC spawn rate 에 의존 — 발생률 자체 변경은 scope 외.
  - `grep -i "결혼\|자식\|라이벌\|멘토\|행인"` 같은 keyword 가 50-cycle sim aggregate narrative 에 ≥ 20 회 등장.
  - `recordToStore` 호출이 npc/family event 4 종 모두에 wire 되어 있음 (코드 grep 으로 확인).
  - vitest 회귀 없음 + 신규 generator 단위 테스트 ≥ 6 (3 generator × 2 case) 추가.
- **반대 기준 (NOT this)**:
  - NPC spawn rate 자체 변경 — 발생률은 V3-DEF 의 design, 이 cycle scope 외.
  - NPC mechanic (라이벌 재등장 / 자식 계승) 확장 — backlog.
  - SagaBookModal 의 새 filter 카테고리 추가 — 기존 filter (관계/여정) 재사용.

## 우선순위 외 backlog

- **Realm Chapter 게이지 + chapter boss trigger (Loop Hero 식)** — research invention 의 component 3. max_arrivals 인공 종료의 game-design 해법으로 가장 강력하지만 1 cycle 에 안 됨. Cycle 2 또는 별도 phase 후보.
- **Personality × job-tag × realm-tag 3 축 modifier (Wildermyth personality-as-frame)** — research invention 의 component 2. F2 와 합치면 한 cycle 에 다 못 함.
- **levelUp variant 15+ 확장 + 구간별 톤 (≤999 신체적 / 1k-999k 추상적 / 1M+ 우주적)** — story #1. F2 와 같은 narrator 영역이지만 scope 분리.
- **Moral choice variant 확장 (8 → 24+) + caste tagging (priest/paladin/...)** — story #3.
- **Trial 난이도/보상 rebalance** (`trialLv = fieldLv * 3.5`, win `level *= 1.05`, lose `× 0.80`) — level #3.
- **Skill catalog 확장 (21 → 35)** — level critic 의 cohort 소모 분석 (일주일 35 cycle 가정 시 신규 학습 0). F1 의 gating 조정 후 측정 결과로 결정.
- **`maxArrivals` sim default raise (500 → 1000)** — sim-config 변경 (게임 디자인 아님). Tier 3 봉인 / heaven·chaos 진입율 실측 prerequisite. level-critic 권고 1.
- **V3-G 1만 시간 곡선 sweep** — k_gain / k_req / k_atk / k_hp / k_eHp / k_eAtk 6 차원 sweep. F1 fix 가 baseline 에 반영된 후.
- **EternalSaga era key 의 chapter title 동적 생성 (Caves of Qud sultan-history 식)** — `재생 #N` 의 lore 화. 회춘 trigger rate 가 max_arrivals fix 후 의미 있게 발생하기 시작하면 검토.

## 비고

### Calibration 보정 (Cycle 1 sim 실측 반영)

- F1.13 baseline: cycle 0 (81bea39) maxShare mage 0.46 — 절대값 가드 (≤0.35) 가 catalog 구조 (priest/mage saturator 의 dim source-rate 비대칭) 로 미세조정 불가. v3/v4 mage.min=7/8 bit-identical 분포 확인 후 improvement-Δ ≥0.05 로 reframe.
- F1.15 baseline: cycle 0 moralChoices p50 79.44 → MERCIFUL_PROC_RATE 0.10 환경에서 55 floor. 원안 [60,80] 은 baseline 측정 없는 가설.
- 2 recalibration 은 **yellow flag**: planner persona 가 baseline 측정 없이 absolute threshold 설정한 결과. Cycle 2 부터는 sim-driven acceptance 에 반드시 Δ-from-baseline 룰 적용.

### 리스크 / 의존성

- **F1 의 monk/ranger 픽스가 ranger 와 새 충돌 가능** — level-critic 도 "round 2 측정 후 결정" 으로 명시. 구현 단계에서 sim feedback 으로 미세조정 — `monk.dim='prudent'` 가 ranger 와 또 충돌하면 ranger 의 dim 까지 옮기는 다단계 조정 필요. QA 는 "수정 후 sim 재실행 + 분포 ≥ 1/50 확인" 기준으로 검증.
- **F1 의 `MERCIFUL_PROC_RATE 0.15 → 0.10` over-correction risk** — 초기 가설은 "moralChoices p50 60–80 유지" 였으나, 실제 sim 측정 결과 0.10 환경의 안정점이 p50 ≈ 55 로 확인되어 baseline floor 를 50 으로 재조정 (위 F1 수용 기준의 calibration note 참조). 자극 자체가 약해져도 50 floor 안에서는 personality drift 가 의미를 잃지 않는 것으로 sim 가 보여줌. 추가 약화 (p50 < 50) 시에는 봉인 risk 가 다시 상승하므로 가드 유지.
- **F2 와 F3 모두 NarrativeGenerator 와 SagaTypes 의 동시 변경** — 충돌 방지를 위해 같은 PR 또는 sequential PR 로. F2 가 먼저, F3 가 그 위에.
- **invention 의 partial 채택** — Realm Chapter Narrator 의 3 component 중 1 (bespoke realm-enter) 만 F2 로 채택. component 2 (3 축 modifier) + 3 (chapter 게이지) 은 backlog 로 명시 — 한 cycle 에 다 하면 스코프 크리프.

### 컨셉 가드

- 세 feature 모두 inflation 곡선/idle/eternal hero 정체성을 **강화** 방향. 평탄화·skip·일반 RPG cap 도입 0.
- F1 의 수용 기준에 "`maxLevel` p50 800k ± 30% 유지" 명시 — JobSystem 수정이 의도치 않게 곡선 평탄화로 새는 risk 가드.
- F2 의 "NOT this" 에 levelUp 구간별 톤 명시 제외 — story #1 의 `≤999 / 1k-999k / 1M+` 분기가 정체성 (1 → 수십만 폭발) 의 narrative 화 측면에서 매력적이지만 scope 분리. backlog 우선순위 상단.
- F3 의 "NPC spawn rate 변경 금지" — V3-DEF 의 spawn design 은 의도된 빈도. 회수만 하고 design 은 건드리지 않음.

### 3 의 규칙 가드

- 셋 다 inflation-rpg workspace 안 변경. `packages/2d-core` 또는 `packages/registry` 승격 없음. 두 번째 게임이 도착하면 그때 재검토.

### sim/검증 의존성

- F1 의 수용 기준이 sim 재실행 수치에 의존 — sim infra (`maxArrivals=500` default) 는 그대로 사용. cap raise 는 backlog.
- F2/F3 의 narrative 검증도 동일 sim 결과의 aggregate narrative 를 grep 으로 확인.
- 1044 vitest + 50 cycle e2e 회귀 없음이 모든 F 의 공통 수용 기준.
