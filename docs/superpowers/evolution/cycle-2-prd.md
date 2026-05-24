# Cycle 2 PRD — Eternal Hero 비트 + Multi-seed Process + Narrative Variance

## 한 줄

cycle 1↔2 의 코드 0 변경에도 priest saturator 가 Δ+0.04 후퇴한 메타 finding 을
**process change (multi-seed acceptance)** 로 못 박고, V3 정체성의 **회춘·사망
비트가 100 cycle 0 회** 인 가장 큰 dead path 를 sim cap 과 trigger 확장으로
회수하며, **NPC/levelUp/moralChoice 의 단일 텍스트 반복** 을 한 pass 로 분산한다.

## 평가 핀포인트

- **게임비평가**: ① **max_arrivals=500 인공 종료 50/50 → eternal hero 회춘·사망
  비트 100 cycle 0 회** (V3 spec 정체성이 sim 환경에서 측정 불가). ② NPC 동일
  한 줄이 한 cycle 에 10+ 회 반복 — variant 풀 3-4 개가 15-20세 9 회 rival
  encounter 를 못 채움. ③ priest saturator Δ +0.04 regression — 단, **코드 0
  변경**이라 seed sampling variance 와 구분 불가, multi-seed 측정 필요.
- **스토리작가**: ① 회춘/사망/family 4 climax 가 50 cycle 발화 비율 0%/0%/4% —
  eternal hero 정체성이 narrator 한 줄에도 안 들어옴. ② levelUpBatch 6 variant
  가 LV 5 → LV 844,531 동안 자릿수 무관 동일 어휘 ("X 단계 폭풍 성장") —
  inflation-rpg 의 인플레가 narrator vocabulary 에 0% 반영. ③ moralChoice
  spare_enemy 가 c2048 단독 49/56 = 87.5% saturate, caste/personality 가 frame
  에 0 영향.
- **레벨디자이너**: ① priest saturator regression (0.40 → 0.44) + monk/ranger
  0/50 봉인 재확립 (prudent source 가 treasure_cave 단 하나로 sparse). ② **1M
  trial 100% lose (0/19 win)** — NEW finding, chaos realm 의 trial 이 punitive
  only, high-risk/high-reward 의 high-reward 가 0. ③ `maxArrivals 500` cap 으로
  Tier 3 unlock + 회춘 측정 prerequisite 미달성 — sim infra 변경 필요.
- **웹리서치 (skipped)**: cycle 1 invention (Loop Hero chapter 게이지 + Caves
  of Qud event-type pool + Wildermyth personality-as-frame) 의 carry-over 가 cycle
  2 약점에 직접 매핑, 신규 dispatch 없음.

## 메타 finding (process)

- **cycle 1 ↔ cycle 2 = 코드 0 변경 + seed 만 다름**. 모든 분포 차이가 seed
  variance.
- 단일 seed 50-cycle 의 priest maxShare measurement noise ≈ 0.04 가 cycle 1
  의 Δ guard threshold (0.05) 와 **같은 자릿수**. 단일 seed 위에서 Δ ≥ 0.05
  를 통과해도 다음 seed 에서 후퇴 검출 불가.
- **3 의 규칙 분석**: cycle 0 1순위 = build saturation. cycle 1 F1 = build
  variance (해결 시도). cycle 2 "build variance 카테고리 1순위" 후보 =
  priest saturator. 그러나 priest 의 Δ +0.04 는 **measurement infra 에서 잡
  히지 않는 noise 자리** — 같은 카테고리 3 회를 build variance 로 못 박으면
  soft-halt trigger. **본 PRD 는 priest 를 backlog 로 옮기고 1순위를 "eternal
  hero 비트 회수" (다른 카테고리, 3 평가 공통) 로 재정렬한다**. 카테고리
  이동의 근거 = 3 의 규칙은 평가 빈도 기준이지 카테고리 carry-over 기준이
  아님.

## 우선순위

1. **F1 — Multi-seed Acceptance 룰 (persona doc 패치)** — cycle 1 의 yellow
   flag 후 cycle 2 에서 priest Δ +0.04 가 seed variance 와 구분 불가로 재확인.
   process change 를 PRD feature 로 명시 deliverable 화 하지 않으면 cycle 3
   의 모든 sim-driven F 가 같은 self-deception 반복. F2 가 즉시 dog food.
2. **F2 — Eternal Hero 회춘·사망 비트 회수** — critic #1 + story #1 + level
   sim-artifact box: **3 평가 공통 약점**. V3 spec 의 "eternal hero idle
   sponsor + 자연사 후 회춘" 정체성이 100 cycle 0 회 발화 — sim cap 과 trigger
   조건의 합성 dead path. F1 의 첫 적용 대상.
3. **F3 — Narrative Variance Pass** — story #1+#2+#3 (3 약점 모두 narrator
   variant) + critic #2 + cycle 1 backlog #4·#5 carry-over. levelUp 자릿수
   톤 + moralChoice caste frame + NPC variant 확장을 단일 pass 로 묶고 통합
   acceptance 1 개 (반복 가장 심한 한 줄의 비율 감소) 로 검증.

## 기능 요구사항

### F1. Multi-seed Acceptance 룰 (persona doc 패치)

- **목적**: cycle 1 의 yellow flag (3 recalibration) 가 cycle 2 의 코드 0 변경
  priest Δ +0.04 로 재발현 — **단일 seed 50-cycle measurement noise (~0.04) 가
  Δ guard threshold (0.05) 와 같은 자릿수**. 단일 seed 위 acceptance 는 다음
  seed 에서 -X% 후퇴해도 측정 자체로 잡지 못함. process 를 PRD feature 로
  명시 deliverable 화 하여 cycle 3 부터 강제 적용.
- **동작**:
  - `docs/personas/01-game-planner.md` 의 "절대 금지" 섹션에 룰 추가:
    > sim-driven acceptance criterion 은 (a) cycle 0/baseline sim 실측을 명시,
    > (b) Δ-from-baseline 형식으로 작성 (절대값 금지), (c) Δ 가 단일 seed
    > 50-cycle measurement noise 와 같은 자릿수 (예: 0.05 미만의 maxShare Δ)
    > 면 multi-seed (≥ 3 seeds × 50 cycle = 150 cycle 합산) 위에서 측정한다.
  - 위 룰의 첫 적용 대상은 본 PRD 의 F2 — 같은 cycle 안에서 dog food.
  - cycle-2-backlog.md 의 B1 (priest saturator) 와 B2 (planner baseline-측정
    의무화) 에 cross-link 추가 — cycle 3 이 priest 손댈 때 multi-seed 측정
    prerequisite 명시.
- **수용 기준**:
  - `docs/personas/01-game-planner.md` 의 "절대 금지" 또는 "PRD 포맷" 섹션에
    multi-seed 룰 3 줄이 존재 (grep 으로 확인 가능).
  - cycle-2-backlog.md 의 B1 항목에 "cycle 3 priest 측정은 multi-seed 룰 적용
    prerequisite" 명시.
  - **F2 의 수용 기준이 이 룰을 위반 없이 인용한다** (절대값 0, Δ-from-baseline
    + multi-seed 측정).
- **반대 기준 (NOT this)**:
  - sim infra (`sim-cycle-v2.ts`) 의 multi-seed run 자동화 — sim CLI 변경은
    별도 backlog. 본 cycle 은 룰만, 측정은 수동 (`pnpm sim:cycle --seed N` 3
    회 반복).
  - 새 sim 보고 포맷 정의 — 본 cycle scope 외.
  - 룰을 game code 안 assertion 으로 추가 — process change 는 doc 에만.

### F2. Eternal Hero 회춘·사망 비트 회수

- **목적**: V3 spec 의 "eternal hero idle sponsor + 자연사 후 회춘" 정체성이
  sim 환경에서 100 cycle 도합 `rejuvenation 0 / hero_died 0 / family_event 2`
  로 측정 — narrative 한 줄도 안 들어옴. (a) sim cap 의 인공 종료 + (b)
  회춘/사망 trigger 의 좁은 조건 합성 dead path. 둘 다 해소하여 V3 정체성의
  핵심 비트가 sim 에서 측정 가능하게 만든다.
- **동작**:
  - sim infra: `games/inflation-rpg/scripts/sim-cycle-v2.ts` (또는 동등 entry)
    의 `MAX_ARRIVALS` default `500 → 1000` 상향. 단일 cycle peak age 37 →
    예상 50+ 도달. **게임 코드 평탄화 아님 — sim config 만**.
  - 회춘 trigger 확장: `CycleControllerV2.ts` 의 회춘 발화 조건을 현재의
    `hero_died → auto-rejuv 5년` 단일 경로 외에 다음 idle-friendly 조건 추가:
    - `age >= 30 AND saga.arrivals >= 200 (또는 chapter_transition 직후)` 시
      narrative-only rejuvenation 비트 발화 (game state 변경은 V3-H 의 기존
      death-rejuv path 유지, narrative 만 추가 emit).
    - 또는 V3 spec §6 의 chapter 별 사망률 curve fit (장년기 ~5% / 노년기
      ~25% / age≥80 자연사 100%) 의 가벼운 첫 단계 — `age >= 50` 시 hero_died
      probability +1%/year 누적 (sim 단계에서 측정 후 cycle 3 에서 미세조정).
    - 구체 구현 선택은 구현 단계에서 sim feedback 으로 — 본 PRD 는 두 trigger
      중 ≥ 1 wire 가 deliverable.
  - `NarrativeGenerator.ts` 에 `forIdleRejuvenation(age, arrivals)` generator
    추가 — 5 variant (story-critic 예시 catalog 참조).
  - `SagaEventType` 의 `rejuvenation` / `hero_died` event 가 SagaBookModal 의
    "여정" filter 에 chapter 헤더로 표시되도록 wire 확인 (V3-H 의 `hero_died`
    fix 와 동일 패턴 — 이미 wire 됐으면 grep 으로 verify 만).
- **수용 기준** (F1 의 multi-seed 룰 dog food):
  - **baseline 측정**: cycle 1+2 합산 100 cycle (seed 1024 + 2048 batch) 의
    `rejuvenation` events = 0/100, `hero_died` events = 1/100.
  - **multi-seed 측정**: 본 cycle 머지 후 sim 3 seed (예: 3072 / 3122 / 3172)
    × 50 cycle = 150 cycle 합산.
    - `rejuvenation` events 비율 ≥ 5% (= 150 cycle 중 ≥ 8 cycle 에서 발화) —
      Δ baseline 0/100 대비 명백 상승.
    - `hero_died` events 비율 ≥ 2% (= 150 cycle 중 ≥ 3 cycle) — narrative-only
      trigger 가 game state 손상 없이 비트 발사 확인.
    - `maxLevel` p50 의 변화가 cycle 1+2 baseline (816k~830k) 대비 ± 30%
      이내 (곡선 평탄화 가드 — `maxArrivals 1000` 이 곡선 형상 자체를 바꾸지
      않는지 확인).
  - sim aggregate narrative grep "`재생\|회춘\|영웅이 사망`" ≥ 10 hit (150
    cycle 합산).
  - 기존 vitest 1044 + 50-cycle e2e 회귀 없음. NarrativeGenerator 신규 함수
    단위 테스트 ≥ 3 추가 (variant 5 개의 정상 호출).
  - V3 컨셉 가드: trigger 확장이 "death 의존 회춘" → "idle-friendly 회춘" 으로
    eternal hero idle 의 강화. 평탄화·skip 아님.
- **반대 기준 (NOT this)**:
  - hero_died 의 game state 영향 자체 변경 (V3-H 의 -10% 페널티 등) — 본
    cycle 은 narrative 비트 emit 회수만. 페널티/회복 메커니즘은 별도 phase.
  - V3 spec §6 의 chapter 사망률 curve fit 완전 구현 — 본 cycle 은 첫
    단계만, 곡선 전체는 별도 phase (cycle 3+ 또는 V3-G sweep).
  - chaos realm trial 난이도 변경 — level-critic 의 1M trial 100% lose 는
    backlog 로 분리 (별도 combat balance).
  - EternalSaga era key 의 chapter title 동적 생성 — backlog.
  - sim CLI 자체의 multi-seed 자동화 — F1 의 NOT 참조.

### F3. Narrative Variance Pass

- **목적**: levelUp/moralChoice/NPC 세 hot path 의 단일 텍스트 반복 (c2048 의
  한 줄 88 회·49 회·10 회) 을 한 cycle 안에서 분산. cycle 1 backlog #4·#5 의
  levelUp 자릿수 톤 + moralChoice caste tagging 을 NPC variant 확장과 묶어
  단일 narrator pass 로 처리. inflation 의 인플레가 narrator vocabulary 에 처음
  반영된다 (LV 5 의 신체적 어휘 vs LV 844k 의 우주적 어휘).
- **동작** (3 sub-deliverable 한 묶음):
  - **levelUpBatch 자릿수 톤 분기** — `narrationVariants.ts` 의
    `LEVELUP_BATCH_VARIANTS` 를 `toLevel` 자릿수로 3 tier 분기:
    - `≤999`: 신체적 5 variant (`"팔이 굵어졌다"` / `"호흡이 깊어졌다"` 등)
    - `1k–999k`: 추상적 5 variant (`"법칙이 굽어졌다"` / `"격이 한 단 올랐다"`)
    - `≥1M`: 우주적 5 variant (`"차원이 영웅 쪽으로 기울었다"` / `"별이 새
      자리를 잡았다"`)
    - 총 15 distinct (현재 6 → 15, story-critic 예시 catalog 의 hand-written 사용).
  - **moralChoice caste frame** — `MORAL_VARIANTS` 에 personality 우세 dim
    분기 추가 (현재 5 frame caste-agnostic):
    - `pious ≥ 7`: `"기도의 결과였다 — ..."`
    - `merciful ≥ 10`: `"이미 정해진 손이었다 — ..."`
    - `heroic ≤ -3`: `"영웅은 망설이지 않았다. 한 번도 망설인 적이 없었다 — ..."`
    - 기본 5 frame + 위 3 caste-tag frame = 8 frame. raw `spare_enemy.nameKR`
      자체 변경은 backlog (catalog 8 → 24 는 별도 task).
  - **NPC variant 확장** — `forNpcEncounter` 의 rival 분기 `3 → 8 variant`,
    mentor `2 → 5 variant`, passerby `3 → 5 variant`. `forNpcDeath` 3 → 6.
    age-bucket 톤 modifier (15-20세 rival 첫 등장 vs 30+세 재회 vs 노년 추모)
    는 backlog — 본 cycle 은 평면 variant 풀 확장만.
- **수용 기준** (통합 1 개 지표 + sub-deliverable minimum):
  - **통합**: cycle 2 sim baseline (seed 2048, 50 cycle) 의 c2048 narrative md
    에서 "한 cycle 안 동일 한 줄 반복 횟수" 최대값 = 88 회 (levelUpBatch
    `"미친 듯이 강해졌다 — LV X → Y"`). 본 cycle 머지 후 같은 seed 의 c2048
    재측정에서 **최대 반복 횟수 ≤ 40 회** (= baseline × 0.5 이하).
  - **sub-deliverable minimum**:
    - levelUpBatch 3 tier × 5 variant = 15 distinct 가 코드에 존재 + 자릿수별
      분기 함수가 unit test 로 3 tier 모두 호출 성공.
    - moralChoice 가 personality 우세 dim 으로 frame 선택, 3 caste-tag frame
      코드에 존재 + unit test ≥ 3.
    - NPC variant: `rival 8 / mentor 5 / passerby 5 / death 6` 총 24 distinct
      코드에 존재 + unit test ≥ 3.
  - 기존 vitest 1044 + 50-cycle e2e 회귀 없음. 신규 unit test ≥ 9.
  - **multi-seed 가드 면제**: 본 F3 의 acceptance 는 narrative repetition count
    (categorical, seed variance 가 maxShare 처럼 누적 측정에 영향 없음 — 한
    cycle 안 직접 grep count) 라 단일 seed 위 측정 정당. F1 의 룰은 "Δ 가
    noise 와 같은 자릿수면" 적용이지 모든 sim 측정 강제 아님.
- **반대 기준 (NOT this)**:
  - moralChoice `spare_enemy.nameKR` catalog 8 → 24 확장 (raw text 분기) —
    backlog. 본 cycle 은 frame variant 확장만.
  - NPC age-bucket 톤 modifier (15-20세 vs 30+세 vs 노년) — backlog.
  - levelUp **single** (`forLevelUp` 6 variant) 분기 — 본 cycle 은 batch 만
    (story-critic 측정 대상). single 도 동일 패턴 분기는 cycle 3 후보.
  - Personality × job-tag × realm-tag 3 축 modifier (Wildermyth 의 component
    2) — backlog. 본 cycle 은 caste-frame 만, 3 축 합성은 별도.
  - Realm Chapter 게이지 (Loop Hero 의 component 3) — backlog.

## 우선순위 외 backlog

### Cycle 2 에서 신규 발견

- **B5. chaos trial 1M 100% lose** (level-critic NEW finding). `trialLv =
  fieldLv * 2 → 1.5 (chaos realm 한정)`. 19/19 lose → ~60% win 목표.
  realm-aware difficulty 가 game balance pass 라 본 cycle scope 외. cycle 3
  combat balance 후보.
- **B6. levelUp single 자릿수 톤** (F3 의 batch 만 처리 후 single 도 같은
  패턴 분기 필요).
- **B7. moralChoice spare_enemy nameKR catalog 8 → 24** (raw text variant).
- **B8. NPC age-bucket 톤 modifier** (rival 첫 등장 vs 재회 vs 추모).
- **B9. sim CLI multi-seed 자동화** — F1 룰의 측정이 수동인 한계. `pnpm
  sim:cycle --seeds 3072,3122,3172 --aggregate` 같은 CLI 옵션.

### Cycle 1 backlog 그대로 carry-over

- **B1 priest saturator** — cycle 3 에서 multi-seed 측정 후 손댐. cycle 2
  의 0.44 가 noise 인지 진짜 후퇴인지 prerequisite 측정 필요.
- **B1.5 NPC spawn distribution sparse** — F3 가 variant 확장만, spawn
  distribution 자체는 carry-over.
- **B2 planner baseline 의무화** — F1 으로 partial 채택 완료, cycle-2-backlog
  B2 항목 close 가능 (multi-seed 룰 추가로 강화 형태).
- **B3 NPC spawn-rate calibration** — F2 의 maxArrivals 1000 이 NPC 도달율을
  올리므로 prerequisite 만족. cycle 3 측정 후 결정.
- **B4 winter season** — F2 의 maxArrivals 1000 으로 hero age 45 도달 가능,
  실측 후 cycle 3 결정.
- **Realm Chapter 게이지** (Loop Hero, invention component 3)
- **Personality × job-tag × realm-tag 3 축 modifier** (Wildermyth, component 2)
- **Skill catalog 확장 (21 → 35)**
- **V3-G 1만 시간 곡선 sweep**
- **EternalSaga era key 의 chapter title 동적 생성**
- **prudent dim source-rate 평탄화** (monk/ranger 봉인 해소, B1 옵션 c 의
  prudent 측 carry-over)

## 비고

### 3 의 규칙 / soft-halt 판단

- cycle 0 1순위 = build saturation. cycle 1 F1 = build variance (해결 시도).
- cycle 2 의 "build variance 카테고리 1순위" 후보 = priest saturator. 그러나
  priest Δ +0.04 는 단일 seed measurement noise 와 같은 자릿수라 **카테고리
  carry-over 라기보다 measurement infra 의 미해결**. process 차원 (F1) 으로
  먼저 잡지 않으면 cycle 3 도 같은 self-deception 반복.
- **3 의 규칙 정밀 적용**: 평가 빈도 기준 → eternal hero 비트 = critic #1 +
  story #1 + level sim-artifact box = **3 평가 공통**. priest 는 2 평가
  (critic #3 + level #1). **1순위 카테고리 이동 정당화**: 3 의 규칙은 평가
  빈도이지 cycle-간 카테고리 carry-over 의무가 아님.
- cycle 3 도 다음 두 조건 중 하나면 soft-halt:
  - F1 의 multi-seed 룰 측정 후에도 priest 같은 build variance issue 가 3rd
    평가로 등장
  - cycle 1+2+3 의 3 cycle 연속으로 PRD 가 2+ recalibration 발생

### F1 dog-food / F2 self-validation

- F2 의 수용 기준이 **F1 의 룰을 위반 없이 인용**. baseline 명시 (cycle 1+2
  100 cycle), Δ-from-baseline 형식 (0/100 → ≥ 8/150), multi-seed 측정 (3
  seeds × 50 cycle). F1 의 룰이 vapor 가 아닌 게 같은 cycle 안에서 증명된다.

### 리스크 / 의존성

- **F2 의 `MAX_ARRIVALS 1000` 이 sim 실행 시간 2배** — cycle 1 의 50 cycle
  sim ~3 min 가정 시 ~6 min. multi-seed × 3 = ~18 min. 자율 cycle 의 토큰/
  시간 예산 ↑. 본 cycle 의 검증 단계에서 sim 시간 monitoring.
- **F2 의 회춘 trigger 확장이 V3 컨셉 위배 아님** — "death 의존 회춘" 의
  design 완화는 eternal hero idle 강화 (death 없이도 무한 saga 가 흐른다는
  V3 spec 의 원래 정체성). 컨셉 가드 통과.
- **F3 의 통합 acceptance (반복 횟수 ≤ 40) 가 sub-deliverable 의 minimum 만
  으로 도달 안 할 risk** — levelUpBatch 6 → 15 variant 만으로도 88 → ~35 회
  계산 가능 (88 × 6/15 = 35.2). moralChoice/NPC 는 추가 분산. minimum 조건이
  satisfied 면 통합 acceptance 도 자연히 통과.
- **F1 룰의 측정 manual 부담** — sim 3 seed 수동 실행 + jsonl aggregate 수동.
  B9 (CLI 자동화) 까지 한 cycle 만 manual 감수.

### 컨셉 가드

- F1 (process): 게임 코드 변경 0. 컨셉 영향 0.
- F2 (eternal hero): V3 spec §6 의 정체성 강화 방향. `MAX_ARRIVALS 1000` 은
  sim infra (게임 평탄화 아님), 회춘 trigger 확장은 idle-friendly 회춘 (death
  의존 완화 = eternal hero 정체성의 design 의도).
- F3 (narrative): 모든 변경이 narrator vocabulary 확장 (game state 영향 0).
  inflation-rpg 의 인플레가 narrator 에 반영 — 컨셉 강화.
- 평탄화·skip·일반 RPG cap 도입 0건.

### 3 의 규칙 / 승격

- 셋 다 inflation-rpg workspace 안 변경 (F1 은 docs 만, F2/F3 는 game code
  + sim infra). `packages/2d-core` 또는 `packages/registry` 승격 없음. F1 의
  룰은 게임 #2 도착 시 공통 process 로 재검토 candidate.

### sim/검증 의존성

- F1: 수용 기준이 doc grep — sim 의존 없음.
- F2: baseline = cycle 1 (seed 1024) + cycle 2 (seed 2048) 의 100 cycle
  rejuvenation 0 / hero_died 1. 본 cycle 머지 후 seed 3072/3122/3172 × 50
  cycle = 150 cycle 의 multi-seed 측정.
- F3: cycle 2 sim baseline (seed 2048, 50 cycle, MAX_ARRIVALS=500 그대로) 의
  c2048 narrative md 의 한 줄 반복 횟수 88 → ≤ 40. F2 의 MAX_ARRIVALS 1000
  변경과 독립.
- 1044 vitest + 50 cycle e2e 회귀 없음이 모든 F 의 공통 수용 기준.

### Cycle 1 calibration 패턴 재발 방지

- Cycle 1 PRD 의 "Calibration 보정" 섹션은 baseline 측정 없이 absolute
  threshold 를 작성한 결과 3 recalibration 발생. cycle 2 PRD 는 **모든 sim
  acceptance 가 baseline 명시 + Δ 형식 + (Δ 가 noise 자리 일 때) multi-seed
  강제** 의 F1 룰을 그대로 따른다.
- F2 의 수용 기준은 baseline 100 cycle + Δ-from-baseline + 3 seed × 50 cycle
  으로 작성 완료. F3 는 sim Δ 가 아닌 단일 grep count 라 multi-seed 면제 가드
  명시.
