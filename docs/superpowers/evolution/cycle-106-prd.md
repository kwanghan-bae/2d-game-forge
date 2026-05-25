---
category: VFX
---

# Cycle 106 PRD — Inflation Milestone VFX

## 한 줄

레벨 polynomial × 10^n 돌파 시점 (lv 100 / 1k / 10k / 100k / 1M / 10M / 100M / 1G — 8 tier)
에 *체험 가능한* 시각 폭발 + screen shake + (옵션) sound stinger + 사가
highlight pin 을 트리거한다. cycle 1-104 동안 sim 산출에만 갇혀 있던
"1 → 수십만 레벨 폭발" inflation 정체성을 dev server 의 실제 DOM 위로 처음으로
끌어올린다.

## 평가 핀포인트

- **게임비평가 (cycle-105-critic 흥행성 5/10, 약점 §1)**: signature moment
  부재. `grep -rn "ScreenShake\|particle\|VFX" games/inflation-rpg/src` → 0 hit
  (확인 완료, 본문 baseline 절 참조). maxLevel p50 6.98M 이 *체험 channel = HUD
  텍스트 + saga 한 줄* 뿐. 친구 어깨너머 30초 보기 부재.
- **레벨디자이너 (cycle-105-level-critic)**: V3 active mechanical catalog 의
  enemy entity 30 + boss 6 이 lv 1 ~ lv 5M dynamic range 를 cover. 같은 sprite
  로 5,000,000× scale 을 *체험상 invisible* 로 만듦. inflation milestone marker
  현재 0 — 6-8 tier visual 필요 (level-critic §콘텐츠 needs 표).
- **웹리서처 (cycle-105-research §N1 시장 검증)**: Unity Asset Store / Boris FX
  guide 모두 milestone 폭발을 표준 기법으로 분류. Progress Knight (텍스트만,
  niche 머무름) 의 반례. inflation 정체성의 10^n 폭발 → *기하 단위 tier* 차별화
  가능. "검증 완료, 즉시 ship".
- **무료에셋 조사관 (cycle-105-assets)**: Kenney Particle Pack (CC0) + Kenney
  Impact Sounds (CC0) 로 11 asset (8 particle sheet + 3 stinger) 한 cycle scope
  내 통합 가능. 누락 시 silent fallback (`<InflationMilestoneVFX/>` 가 CSS-only
  flash 로 degrade).

3 페르소나 모두 N1 을 1순위로 합의. 게임기획자 §3-rule 의 *inverse*
적용 — narrative tone 4 연속 (cycle 101-104) 직후의 강제 pivot 시그널.

## Baseline 측정 (Δ-from-baseline 의 근거)

**Grep evidence — VFX/particle/screen-shake 어휘 0 hit 확정**:

```bash
grep -rn "ScreenShake\|particle\|VFX" \
  games/inflation-rpg/src --include="*.ts" --include="*.tsx"
```

결과 line 인용:

```
games/inflation-rpg/src/utils/josa.ts:2: * 한국어 조사 (particle) helper.
games/inflation-rpg/src/utils/josa.ts:66: * @returns `word + particle`
```

2 hit 모두 한국어 *조사* (영어 단어 particle 의 *언어학적* 의미) 의 doc
comment. 게임 시각 효과로서의 particle / VFX / ScreenShake 코드 ZERO 확정.
Baseline = 0.

**보조 grep — milestone tier 어휘 / `inflation_milestone` event ZERO**:

```bash
grep -rn "milestone\|inflation_milestone" \
  games/inflation-rpg/src --include="*.ts" --include="*.tsx"
```

결과: 0 hit (예상). 본 PRD 가 *최초 도입*.

## 카테고리 균형 (룰 9)

- 직전 4 cycle (101 / 102 / 103 / 104) = 모두 **narrative** (realm-specific tone
  wiring). advisor cycle 105 entry 가 "narrative 외 카테고리 pivot" 강제.
- 본 cycle = **VFX** (frontmatter `category: VFX`). 직전 4 와 다른 카테고리 →
  룰 9 만족.
- 다음 cycle 107 의 카테고리는 자유. 단 VFX 가 3 연속 (106/107/108) 되면 cycle
  109 는 다시 다른 카테고리 강제.

## 우선순위

1. **F1. milestone 8 tier detector + `inflation_milestone` event emit** —
   `OverworldEvents.ts` 의 `OverworldEvent` discriminated union 에 신규 variant
   추가. `CycleControllerV2.ts` 의 level_up loop (line 216-220) 직후 ×10 경계
   crossing 검사 후 emit. controller 가 sim ↔ real 단일 source of truth →
   sim driver 자동 mirror.
2. **F2. `<InflationMilestoneVFX/>` React component** — 8 tier preset
   (color / size / duration), particle emission (가능 시 PNG, 없으면 CSS-only
   flash), screen shake CSS animation, 옵션 sound trigger (`playSfx` —
   파일 누락 시 silent fallback 기존 패턴 답습).
3. **F3 (우선순위 외 backlog 격하, optional)**: SagaBookModal 의 levelUp
   record 중 milestone tier 도달 line 에 별 (★) 또는 컬러 highlight pin.
   F1 의 payload tier 정보를 SagaRecord 에 첨부.

스코프 = F1 + F2 필수, F3 backlog. 페르소나 §absolute "3 feature 초과 금지"
준수.

## 기능 요구사항

### F1. milestone 8 tier detector + `inflation_milestone` event emit

- **목적**: 레벨이 `[100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000,
  100_000_000, 1_000_000_000]` 8 경계 중 하나를 *crossing* 하는 시점을 단일
  source of truth (controller) 에서 검출 + emit. sim driver / dev server 가
  같은 path 를 통과해 false PASS 방지.

- **동작**:
  - `games/inflation-rpg/src/overworld/OverworldEvents.ts` 에 신규 variant
    추가:

    ```typescript
    | { type: 'inflation_milestone';
        tier: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
        thresholdLv: number;
        fromLv: number; toLv: number;
        atAge: number }
    ```

  - `MILESTONE_THRESHOLDS` 상수 (numeric ascending) 정의 위치 = 동 파일 또는
    `data/milestones.ts` 신규 (executor 재량). 8 tier ↔ 1e2..1e9 매핑.
  - `CycleControllerV2.ts` 의 arrival loop 안 (line 216-220 의 `level_up`
    수집 branch) 직후, 매 `level_up` 마다 prev→curr 경계 crossing 검사. 한
    arrival 안에서 동일 tier 가 두 번 trigger 안 되도록 *crossing 만* (not
    in-band) 검출. (예: fromLevel 95 → toLevel 250 이면 tier 1 = lv 100 한
    번만 emit, tier 2 = lv 1000 안 넘었으니 skip.)
  - 단일 arrival 에서 **여러 tier 동시 crossing 허용** (예: fromLevel 50 →
    toLevel 12000 이면 tier 1 + tier 2 두 이벤트 emit). 단 같은 tier 두 번
    emit 금지.
  - emit 순서: `level_up` (기존) → `inflation_milestone` (신규, tier 오름차순).
  - cycle 시작 시 tier-emit ledger reset. cycle 안에서 같은 tier 두 번 도달
    가능 (예: 사망 후 부활 — 단 V3 에서는 *hero level 이 monotonic non-decreasing*
    이 룰. lifestyle reset 시점에 ledger 도 reset).
  - SagaBookModal 표기를 위해 `recordToStore({ type: 'milestone', tier,
    thresholdLv, ... })` 추가 호출 (saga record). F3 가 우선순위 외라도 데이터
    저장은 F1 에서 같이 처리 → F3 가 빠져도 가공만 안 됨, 데이터는 보존.

- **수용 기준**:
  - 8 tier 모두 emit 가능. unit test: 합성 level 곡선 (cycle 1 측정 기반 = lv
    1 → 1e6+ 이 한 cycle 안에 도달) 으로 8 tier 중 ≥ 6 tier 가 50-cycle
    headless sim 1 회당 ≥ 1 회 emit. tier 7 (1e8) + tier 8 (1e9) 는 도달률 낮음
    (cycle 17 maxLevel p50 6.96M = tier 6 = 1e7 도달, tier 7+ 는 outlier seed)
    이라 sim 측정 floor 에서 제외 — F1 의 *logic* 이 8 tier 정확히 매핑하는지는
    unit test 합성 case 로 cover.
  - Δ-from-baseline (multi-seed ≥ 3 = seeds 1024 / 2048 / 4096, 각 50-cycle
    headless sim): `inflation_milestone` event 총 emit 수 baseline 0 대비
    **3-seed 합산 Δ ≥ 30**. 산술: cycle 17 의 maxLevel p50 6.96M = 평균 cycle
    당 tier 1-6 모두 cover ≈ 6 milestone × 50 cycle × 3 seeds × 도달률 60%
    floor ≈ 540. Δ ≥ 30 은 expected 의 ~5.6%, 부족 도달률까지 cover.
  - Vitest unit test 신규: (a) 합성 level 곡선 단일 step (95 → 250) 의 tier 1
    한 번 emit, (b) 동일 arrival 다단 step (50 → 12000) 의 tier 1 + tier 2
    동시 emit, (c) same-tier 두 번 emit 금지 (cycle 동안 ledger), (d) cycle
    종료 시 ledger reset. 4 case + smoke 1 = 5 추가.
  - `pnpm typecheck` / `pnpm lint` / `pnpm circular` baseline 유지.
  - **Sim driver mirror 검증 grep** (페르소나 §rule 6.1 의무):

    ```bash
    grep -n "inflation_milestone\|MILESTONE_THRESHOLDS\|emitMilestone" \
      games/inflation-rpg/src/overworld/CycleControllerV2.ts \
      scripts/sim-cycle-v2.ts
    ```

    기대 결과: controller 가 emit + sim driver 가 같은 controller class 를
    instantiate (cycle 101 의 sim ↔ real 단일 source 패턴 답습). sim driver 별도
    mirror 코드 추가 금지 — controller direct instantiation 으로 자동 mirror.
    기대 line 인용 (cycle 101 PRD 의 grep 답습):
    ```
    OverworldEvents.ts:NN: | { type: 'inflation_milestone'; tier: ... }
    CycleControllerV2.ts:NN: events.push({ type: 'inflation_milestone', ... })
    sim-cycle-v2.ts:NN: const controller = new CycleControllerV2(...)
    ```

- **반대 기준 (NOT this)**:
  - 매 `level_up` 마다 milestone emit 금지 — 8 tier 경계 *crossing* 만.
  - lv 100 미만 (tier 1 below) 의 합성 milestone 추가 금지 (lv 10, 50 등). 8
    tier 고정.
  - milestone 도달이 hero stat / atkBonus / hpBonus 등 *combat metric 에 영향*
    주는 일 금지 — visual + saga record 만 (level-critic §"power spike" 제안은
    별도 cycle backlog).
  - 균열석 영구 보상 + arrival 가속 (level-critic 의 §"수치 제안표") 도입 금지
     — 별도 cycle.
  - persist version bump 금지 (v23 유지). milestone ledger 는 cycle 단위 in-memory.
    cycle 종료 시 reset, save 안 함.

### F2. `<InflationMilestoneVFX/>` React component

- **목적**: F1 이 emit 한 `inflation_milestone` 이벤트를 dev server DOM 위의
  *체험 가능한* 시각 폭발 + screen shake + (옵션) sound 로 환원. inflation
  정체성의 1 차 시각 표상.

- **동작**:
  - 신규 파일: `games/inflation-rpg/src/components/InflationMilestoneVFX.tsx`.
  - props: `{ tier: 1-8; thresholdLv: number; onDone?: () => void; }`.
  - 마운트 시 즉시 시작, `setTimeout` 으로 self-unmount (duration 은 tier 별
    preset).
  - 8 tier preset 표:

    | tier | thresholdLv | color | size | duration | shake amplitude | sfx id |
    |---:|---:|---|---:|---:|---:|---|
    | 1 | 100 | `#88ff88` (연두) | 120px | 600ms | 4px | `milestone-small` |
    | 2 | 1_000 | `#88ddff` (시안) | 180px | 800ms | 6px | `milestone-small` |
    | 3 | 10_000 | `#ffdd44` (금) | 240px | 1000ms | 8px | `milestone-medium` |
    | 4 | 100_000 | `#ff8844` (오렌지) | 320px | 1200ms | 12px | `milestone-medium` |
    | 5 | 1_000_000 | `#ff44aa` (마젠타) | 400px | 1500ms | 16px | `milestone-large` |
    | 6 | 10_000_000 | `#aa44ff` (보라) | 480px | 1800ms | 20px | `milestone-large` |
    | 7 | 100_000_000 | `#ffffff` (백광) | 560px | 2100ms | 24px | `milestone-mega` |
    | 8 | 1_000_000_000 | `#ff0000` + rainbow gradient | 640px | 2500ms | 32px | `milestone-mega` |

  - **VFX 구성** (3 layer, 모두 CSS-only fallback 가능):
    1. **중앙 폭발**: radial-gradient `<div>`, 0% → 100% scale + opacity 1 →
       0 transition. tier color.
    2. **Screen shake**: `<body>` 또는 root `<div>` 에 `keyframes
       milestone-shake-{N}` 적용 (translate(±amplitude) 200ms × 3 회).
    3. **Particle layer (선택)**: `public/assets/images/particles/milestone-tier-{1..8}.png`
       있으면 `<img>` 12개를 radial scatter 로 animation, 없으면 layer 1 의
       CSS-only 폭발 만으로 degrade. 누락 감지 = `<img onError>` 또는 build-time
       presence check (executor 재량).
  - **Sound**: `playSfx('milestone-{small|medium|large|mega}')`. `sound.ts` 의
    silent fallback 패턴 답습 — `.ogg` 파일 누락 시 `console.warn` + 무음. tier
    1-2 = small, 3-4 = medium, 5-6 = large, 7-8 = mega.
  - **이벤트 → VFX wiring**:
    - 옵션 A: `OverworldScene` 또는 `OverworldRunner` 가 cycle event consumer →
      neue React state `pendingMilestones: MilestoneEvent[]`. 큐 head 를 props 로
      pass.
    - 옵션 B: zustand store 의 `useGameStore` 안에 `recentMilestones[]` 추가
      (cycle reset 시 clear). 모든 screen 에서 hooks 로 구독 가능.
    - 결정: 옵션 B 선호 (단일 source). 단 store schema 변경이 persist v23 에
      *write* 되지 않게 partialize blacklist 처리 (Sim-A 의 in-memory `bp`
      패턴 답습). executor 가 store schema 신중 분리.
  - **연속 milestone 큐잉**: 한 arrival 에서 tier 1 + tier 2 동시 emit 가능 →
    각각 600ms / 800ms duration, 끝나는 대로 자동 dequeue. 사용자가 짧은
    창에서 2 개 폭발을 본다.

- **수용 기준**:
  - **Sim-real parity smoke** (페르소나 §rule 6.2 의무, Playwright dev server
    1× 속도 90s 또는 10× 속도 30s 이상):
    - dev server 진입 → MainMenu → cycle 시작 → hero level 이 100 (tier 1)
      crossing 시점에 DOM 에 `<div data-testid="inflation-milestone-vfx"
      data-tier="1">` 또는 동등 marker 1 개 이상 존재. (testid 명명은 executor
      재량, PRD 는 *DOM 존재* 만 강제.)
    - smoke 측정 metric = `await page.waitForSelector('[data-testid^="inflation-milestone"]',
      { timeout: 90_000 })`. timeout 시 fail.
    - **smoke 측정값 = sim 측정 metric 과 동등** (event emit 됨 = DOM render
      됨, 둘 다 ≥ 1).
  - **Sim measurement** (multi-seed ≥ 3 = seeds 1024 / 2048 / 4096, 50-cycle
    headless): VFX 자체는 visual 이므로 sim driver mirror **무관** (controller
    가 emit 만 하면 sim driver 가 자동 mirror). F2 의 sim 측정 = "이벤트 → store
    push" 의 store assertion 만. 실 VFX 폭발은 DOM 의존이라 sim 측정 불가능 —
    smoke 가 단독 검증 layer.
    - store assertion: 합성 3-seed 50-cycle 시 `useGameStore.getState().recentMilestones`
      에 cycle 종료 직전 tier 1-6 record 가 history (또는 별도 saga record)
      안에 ≥ 30 entry (F1 sim Δ 와 동일 floor).
  - Vitest unit test 신규: (a) `<InflationMilestoneVFX tier=1 thresholdLv=100/>`
    mount → DOM 에 marker 존재, (b) `setTimeout` 만료 후 unmount (`onDone` fire),
    (c) tier=8 ↔ tier=1 의 color / size diff, (d) PNG fallback (mock fetch
    fail → CSS-only render path 유지). 4 case 추가.
  - `pnpm e2e` smoke 1 spec 신규 = `e2e/inflation-milestone-smoke.spec.ts`,
    Playwright dev server, 1× 속도 90s (또는 10× 30s) 안에 tier 1 DOM marker
    발견.
  - 누락 에셋 (`milestone-tier-1.png`, `milestone-small.ogg` 등) 부재 시 dev
    server 가 crash 안 함. silent fallback 검증 (cycle 4b sound 패턴).

- **반대 기준 (NOT this)**:
  - 매 `level_up` 마다 VFX 금지 — milestone tier 만 (F1 의 8 tier 경계).
  - audio 외부 의존 금지 — `.ogg` 파일 없으면 silent (warn 로그만). cycle 4b
    SoundManager 의 fallback 패턴 답습 의무.
  - persist v24+ bump 금지 — 본 cycle 무관. milestone ledger 는 in-memory only.
  - VFX 가 hero stat / combat / 점수 에 영향 금지 — visual 전용. (level-critic
    §"power spike" 제안은 별도 cycle.)
  - `setInterval` / RAF 무한 loop 금지 — `setTimeout` self-unmount 단발.
  - `OverworldScene` Phaser 안에서 직접 render 금지 — React DOM 위 overlay 만
    (Phaser bundle 의 SSR risk 회피).
  - 균열석 / 영구 보상 / arrival 가속 동반 금지 (level-critic §"수치 제안표" 의
    cell 단위 변경은 별도 cycle).
  - F3 (saga highlight pin) 이 우선순위 외이므로 F2 가 F3 의존 금지 — F3 미구현
    상태에서도 F2 의 수용 기준 모두 PASS.

## 우선순위 외 backlog

### F3 (옵션). SagaBookModal milestone highlight pin

F1 의 saga record (`type: 'milestone'`, tier 첨부) 를 SagaBookModal 에서
별 (★) 또는 컬러 highlight pin 으로 강조. EventFilter 에 `'milestone'` 추가.

- 동작: SagaBookModal 의 record list rendering 에서 `type === 'milestone'` 항목
  앞에 ★ + tier 색상 (F2 의 8 tier color 와 동일) 표기. EventFilter 추가 +
  per-tier badge.
- 수용 기준: 합성 saga (tier 1 record 1개 + battle record 9개) 입력 시
  SagaBookModal 에 ★ 1 개 + battle 9 개 표기. unit test 1 case.
- **반대 기준**: F2 가 F3 의존 금지 (F3 미구현 상태에서도 F2 smoke / unit 모두
  PASS).

이번 cycle 에서 F3 를 *implement 해도 ok, skip 해도 ok*. F3 만 의무인 작업
없음.

### 차기 cycle 후보 (이번 cycle 무관)

- **Milestone 영구 보상 (균열석 / arrival 가속)**: cycle-105-level-critic §"수치
  제안표" 의 lv 100k / 1M / 10M / 100M 도달 시 균열석 +1/3/5/10. 별도 cycle 후보.
- **Power spike (level ×10 jump 1-cycle atk burst)**: cycle-105-level-critic
  §3. mid-cycle decision N2 와 합쳐 cycle 107+ 후보.
- **Milestone bgm transient sting**: 현재 BGM 위에 0.5s overlay sting (현 SoundManager
  미지원 API). cycle 후속.
- **VFX 카테고리 2-3 cycle 연속 시 룰 9 inverse trigger 점검**.

## 비고

### 리스크

- **R1 — store partialize 누락 시 persist v23 schema drift**: F2 옵션 B 의
  zustand `recentMilestones` 가 persist 에 *write* 되면 v23 schema 어긋남.
  mitigation = `useGameStore` partialize blacklist 에 `recentMilestones` 명시
  + unit test (in-memory only 확인). PRD §F2 §동작에 명시.
- **R2 — 한 arrival 다단 tier crossing 의 동시 VFX 가시성**: tier 1 (600ms) +
  tier 2 (800ms) 가 같은 arrival 에서 emit 시 큐 head 부터 순차 재생. 합쳐
  ~1.4s. cycle 17 polynomial degree 0 이라 *시간상 균등* → tier 1-2 동시
  crossing 은 매우 짧은 초기 ramp 1-2 회만 (cycle 시작 직후). mitigation =
  큐가 단순 FIFO 로 충분. *동시 render* (3 개 이상 겹침) 는 cycle 17 측정 기반
  으로 빈도 ≤ 1% 추정 — 첫 cycle 측정 후 carry-over 결정.
- **R3 — F3 의 EventFilter 추가 누락 시 saga 표기 손실**: F3 가 우선순위 외라
  미구현 가능. 그 경우 F1 의 saga record `type: 'milestone'` 가 SagaBookModal
  의 `EventFilter` 매핑 (line 10) 에 없으니 `'all'` 필터에서만 보이고 별 표기
  없음. *데이터는 손실 안 됨* — F3 가 차기 cycle 에 채우면 됨. PRD 본문
  §F1 §동작 의 "F3 가 우선순위 외라도 데이터 저장은 F1 에서 같이 처리" 가
  보존 명시.
- **R4 — Playwright smoke 90s 안 tier 1 도달 못함 risk**: cycle 17 측정 baseline
  의 maxLevel p50 6.96M = tier 1 (lv 100) 은 cycle 시작 ~1-5 초 내 도달 (산술:
  expGain ∝ lv^1.8 가속, cycle 1 의 arrival 30 회 안에 lv 100 통과). 90s 1×
  속도 = arrival 90~200 회 estimate. tier 1 미달 risk ≤ 1%. carry-over 후보:
  smoke 가 flaky 면 10× 속도 30s 또는 SpendModal 초기 buff 강제.

### 의존성

- F1 → F2: F1 의 event emit 이 F2 의 store push 의 source. F1 부재 시 F2 의
  smoke + sim measurement 모두 fail.
- F2 → F3: F3 는 F1 의 saga record 만 의존, F2 의 DOM render 와 무관. F3
  미구현 시 F2 영향 0.
- Sim driver: `scripts/sim-cycle-v2.ts` 가 `CycleControllerV2` 를 직접
  instantiate → F1 의 emit 이 자동 mirror. 별도 driver 코드 변경 없음.

### 컨셉 가드 메모

- **V3 정체성 (eternal hero idle sponsor) 무영향**: F1 + F2 는 visual + saga
  record 만. hero combat / lifecycle / sponsor gold 에 영향 0.
- **"1 → 수십만 레벨 폭발" 직접 강화**: inflation 정체성을 *체험* 으로 환원.
  cycle 31 의 "maxLevel design intent close" 가 *숫자만* 닫혔던 부분을 *체험*
  으로 닫음 (critic Why HIGH 인용).
- **3 의 규칙 (CLAUDE.md)**: VFX 컴포넌트 + milestone detector 는 1 게임
  (inflation-rpg) 에만 적용. `@forge/core` 로 승격 금지. 워크스페이스 내부
  유지. 향후 게임 #2 가 VFX 도입 시 승격 검토.
- **카테고리 균형 (룰 9)**: VFX = 직전 4 cycle (narrative) 와 다른 카테고리.
  pivot 시그널 만족.

### Persona doc 8 + 1 rules 자가 검증

1. **Δ-from-baseline**: ✓ baseline 0 grep-증거 명시 (본문 §Baseline 측정),
   F1 Δ ≥ 30 (3-seed 합산), F2 smoke Δ ≥ 1 DOM marker.
2. **R1 grep query**: ✓ §Baseline 의 `grep -rn "ScreenShake\|particle\|VFX"`
   결과 line 인용 (2 hit, 모두 한국어 조사 doc comment).
3. **Multi-seed acceptance**: ✓ ≥ 3 seeds (1024 / 2048 / 4096), 합산 측정.
4. **Mode 실증 재해석**: ✓ N/A (이번 cycle 은 mode 변경 없음).
5. **Negative claim 검증**: ✓ "현재 milestone VFX 0" 는 grep-사실 (조사 hit
   만 제외), 가설 아님.
6. **Sim-real parity**: ✓ §F1 §수용 기준의 sim driver mirror grep + §F2 §수용
   기준의 Playwright smoke 90s 의무. metric = DOM marker presence (=sim store
   push) 동등.
7. **PRD 산술 충돌 사전 검증**: ✓ F1 Δ ≥ 30 floor 와 expected 540 의 ~5.6%
   부족 도달률 cover. F2 smoke 90s 의 tier 1 도달 risk R4 산술 estimate.
   다항 결합 수용 기준 (F1 sim AND F2 smoke) 동시 충족 가능성 확인 — F1 store
   push 의 same path 가 F2 smoke 의 source, 분기 없음.
8. **Sim smoke 누적 slow-down**: ✓ headless sim 50 cycle × 3 seed = 150
   total — cycle 20 baseline 600s 안 늘림. Vitest 신규 5+4=9 case 모두 short
   (~1s 추정). Playwright e2e 1 spec 추가 = cycle 86+ e2e baseline 60+ 1 spec
   증가.
9. **카테고리 균형 (룰 9)**: ✓ frontmatter `category: VFX` + 직전 4 cycle
   (narrative) 와 pivot 확인. §"카테고리 균형" 절 의무 표기.

### Implementation 비계 (planner → executor 인계용)

- 변경 파일 추정:
  - `games/inflation-rpg/src/overworld/OverworldEvents.ts` — `inflation_milestone`
    variant 추가.
  - `games/inflation-rpg/src/data/milestones.ts` (신규) — `MILESTONE_THRESHOLDS`
    상수 + tier 별 preset (color/size/duration/shake/sfxId).
  - `games/inflation-rpg/src/overworld/CycleControllerV2.ts` — level_up loop
    직후 crossing 검사 + emit + ledger (line 216-220 인근).
  - `games/inflation-rpg/src/state/gameStore.ts` (또는 cycleSliceV2) —
    `recentMilestones[]` slice + `pushMilestone` action + partialize blacklist.
  - `games/inflation-rpg/src/components/InflationMilestoneVFX.tsx` (신규) — VFX
    component.
  - `games/inflation-rpg/src/components/InflationMilestoneVFX.test.tsx` (신규)
    — 4 case.
  - `games/inflation-rpg/src/components/InflationMilestoneVFX.css` 또는
    inline-style — keyframes shake / radial-gradient (executor 재량).
  - `games/inflation-rpg/src/overworld/__tests__/CycleControllerV2.milestone.test.ts`
    (신규) — F1 의 4 unit case.
  - `games/inflation-rpg/e2e/inflation-milestone-smoke.spec.ts` (신규) —
    Playwright smoke.
  - `games/inflation-rpg/src/screens/SagaBookModal.tsx` (F3 옵션) — EventFilter
    `'milestone'` 추가 + ★ rendering.
  - `games/inflation-rpg/public/assets/images/particles/` (옵션) — Kenney 8
    sheet manual 배치 (없으면 silent fallback).
  - `games/inflation-rpg/public/sounds/sfx/` (옵션) — milestone-small/medium/
    large/mega.ogg manual 배치 (없으면 silent).
- 변경 line 수 추정: +320 / -5. 신규 file 5 (data/milestones, component, 2
  test, e2e smoke).
- 예상 cycle 시간: 1 mega-phase (subagent-driven), ~8-12 task.

### 산출 후 self-check

1. `pnpm --filter @forge/game-inflation-rpg test` — vitest 1257+ → 1266+ (9
   추가) PASS.
2. `pnpm --filter @forge/game-inflation-rpg e2e -- --grep "inflation-milestone-smoke"`
   — smoke PASS, tier 1 DOM marker ≥ 1.
3. `pnpm circular` — baseline 1 유지.
4. `pnpm typecheck` / `pnpm lint` — 0 error.
5. cycle-106-result.md 작성 시 sim 측정 raw (per-tier emit count per seed) +
   smoke screenshot 또는 DOM dump 첨부.
6. `recentMilestones` partialize blacklist 확인 — persist 후 새로고침 시 빈
   배열 (R1 검증).
