---
category: UI
---

# Cycle 111 PRD — Run Statistics View (Inflation Curve Chart)

## 한 줄

CycleResultV2 결과 화면에 *그래프 1 개* — 시간축 (cycle 진행률) × level 축
(log scale) 의 inflation curve. cycle 17 의 polynomial degree 측정 인프라 가
산출하는 곡선을 player 가 직접 본다. 부가 = sim-real parity 시각 검증 도구
(dev 자가 진단 axis).

## 평가 핀포인트

- **게임비평가 (cycle-105-critic §N4)**: cycle 결과 화면의 그래프 1 개 — 시간축
  × level 축 inflation curve. polynomial degree (cycle 17 의 측정 인프라) 를
  player 가 직접 봄. **headline feature 아님** 이지만 streamer/screenshot 친화 +
  *회고적 만족*. cycle 106 의 폭발 VFX (즉각) 의 **2 차 vector** (회상).
- **레벨디자이너 (cycle-105-level-critic §N1-N5 cost)**: code line ~150, asset
  0, catalog 추가 0 — 5 NEW 방향 중 *최저 cost*. balance 영향 0, sim 산출
  영향 0 (read-only ledger).
- **게임 기획자 (cycle 110 PRD §룰 9)**: cycle 108 (system) + cycle 109
  (system) + cycle 110 (system) = **3 연속 system**. cycle 110 PRD §"카테고리
  룰 9 자가검증" 가 cycle 111 의 **system 외 카테고리** 를 명시적 의무화
  (인용 §38-48: "cycle 111 은 *반드시* system 외 카테고리 (narrative / VFX /
  meta / 운영 / UI 중 하나)"). **본 PRD 카테고리 = `UI`** (frontmatter 첫 줄)
  → 룰 9 정합.
- **advisor (사전 호출)**: 4 핀포인트 — (a) ring buffer 60 capacity + arrival
  마다 push = endgame zoom 위험 → **adaptive decimation** 채택, (b) 5 early-
  return path 의 snapshot wiring 명시, (c) log Y axis edge case (lv 1 = log10
  0) 명시, (d) saga 의 levelHistory 가 zustand `partialize` 에서 exclude — R1
  (persist v24 유지) 의 의미 명확화.

## 카테고리 룰 9 자가검증

- **직전 3 cycle**: cycle 108 = system (Fate Roll), cycle 109 = system (Boss
  Intro), cycle 110 = system (Realm Fork). **3 cycle 연속 system 도달**.
- **본 cycle 111 카테고리 태그**: `category: UI` (frontmatter 첫 줄 명시 완료).
  cycle 110 PRD §38-48 의 강제 의무 회수. **system 카테고리 cycle 111 작성
  금지** 의 cycle 110 PRD §48 직접 수용.
- **cycle 112 카테고리 자유** (단 UI 가 3 연속 = 109/110/111 *후속 UI* 패턴
  되면 cycle 112 도 룰 9 발동 — 본 PRD 가 UI 첫 cycle 이므로 cycle 112 는
  UI/system/VFX/narrative/meta/운영 모두 가능).

## Baseline 측정 (Δ-from-baseline 의 근거)

**Grep evidence — visualization / chart / svg 어휘 점검**:

```bash
grep -rn "InflationCurve\|LevelHistory\|levelSnapshot\|InflationCurveChart" \
  games/inflation-rpg/src --include="*.ts" --include="*.tsx"
```

결과: 0 hit. **clean slate** — 본 PRD 가 최초 도입.

```bash
grep -rn "<svg\|polyline\|<chart" \
  games/inflation-rpg/src --include="*.tsx"
```

결과: 0 hit (예상). 본 cycle 의 chart = **첫 inline SVG component**.

```bash
grep -n "lastSaga\|saga.hero" games/inflation-rpg/src/screens/CycleResultV2.tsx
```

결과:
```
1:import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
8:  const saga = useCycleStoreV2(s => s.lastSaga);
26:  ...saga.hero.name, saga.hero.cause...
```

CycleResultV2 의 saga 소비 path 명확 — mount 위치는 line 38 (`</div>` 후,
`<h3>일대기</h3>` 전) 으로 advisor §4 추천 채택.

**Baseline = visualization 0**.

## 우선순위 (cycle 111)

1. **F1. `LevelSnapshot[]` ring buffer + adaptive decimation** — controller
   field `levelHistory` (60 capacity) + `recordLevelSnapshot(events)` helper
   호출이 `handleArrival` 의 5 early-return path 모두에 1 줄씩. 가치 = chart
   의 data source + sim parity 친화 (read-only ledger).
2. **F2. `<InflationCurveChart/>` inline SVG component** — 60-segment polyline
   + log Y axis + 8 milestone tier horizontal dashed line + axis labels (arrival
   index / 10^N). chart library 외부 의존 0 (R2 보장).
3. **F3. CycleResultV2 마운트 + saga.levelHistory wiring** — cycle_end 시
   controller 가 saga 에 `levelHistory` 첨부 → `CycleResultV2` 가 saga 에서
   읽어 chart 에 prop. zustand `partialize` 에서 exclude (R1 보장).

3 features 한도. 우선순위 F1 > F2 > F3 (advisor §시간 관리: F3 가 가장 risk
낮음, F1+F2 가 진짜 작업).

## 기능 요구사항

### F1. `LevelSnapshot[]` ring buffer + adaptive decimation

- **목적**: cycle 진행 중 hero.level 의 시간축 시계열 capture. 결과 화면의
  chart 가 그릴 데이터 source.

- **타입 정의 (신 file `src/overworld/levelHistory.ts`)**:

  ```ts
  export interface LevelSnapshot {
    readonly arrivalIndex: number;  // 0-based, controller-instance scope
    readonly level: number;         // hero.level at snapshot time (≥ 1)
    readonly age: number;           // hero.age at snapshot time (≥ 5)
  }

  export const LEVEL_HISTORY_CAPACITY = 60;

  /** Adaptive decimation ring buffer.
   *  Push every arrival; on capacity reach, drop every-other entry + double stride.
   *  Invariant: last entry is always the most recent snapshot pushed.
   *  Coverage: any cycle length 1..N produces 30..60 samples spread evenly. */
  export class LevelHistoryBuffer {
    private samples: LevelSnapshot[] = [];
    private stride: number = 1;
    private counter: number = 0;

    push(snapshot: LevelSnapshot): void {
      this.counter += 1;
      if (this.counter % this.stride !== 0) return;
      this.samples.push(snapshot);
      if (this.samples.length > LEVEL_HISTORY_CAPACITY) {
        // Decimate: keep every-other (indices 0, 2, 4, ...) + double stride.
        this.samples = this.samples.filter((_, i) => i % 2 === 0);
        this.stride *= 2;
      }
    }

    get(): readonly LevelSnapshot[] {
      return this.samples;
    }
  }
  ```

- **동작 — 5 handleArrival path enumerate (advisor §1 명시)**:

  `handleArrival` 의 모든 entry 가 **return 직전** `pushLevelSnapshot()` 1 줄
  호출. 5 path:
  1. **fateRollPending early-return** (line 816): NO push — modal 중 frozen
     state. 그러나 `resolveFateRoll` 이 hero_died 후 events 반환 시점에 push
     의무 (cycle 종료 직전 final sample 확보). cycle 종료 path 에서 push 누락
     = chart 의 마지막 sample 이 직전 arrival → 의미 손실. **하한선 = cycle
     종료 시점 final level 이 chart 우상단**.
  2. **bossIntroPending early-return** (line 819): NO push — modal 중 frozen.
     `resolveBossIntro` (boss combat 후) 의 events 반환 시점에 push.
  3. **realmForkPending early-return** (line 822): NO push — modal 중 frozen.
     `resolveRealmFork` (realm transition 후) 의 events 반환 시점에 push.
  4. **staggered recovery branch** (line 827-844): push 의무. recovery 도
     arrival cost.
  5. **trial branch** (line 848-892): push 의무. trial 의 hero.level 변동
     (`level += 3` / `*= 0.85`) 반영.
  6. **normal arrival branch** (line 894-...): push 의무. 모든 battle/level_up
     처리 후 final this.hero.level 반영.

- **6-site (5 path + 3 resolve) push enumerate**:

  | site | line (현재) | push timing |
  |---|---:|---|
  | staggered recovery return | 843 (`return events`) | 직전 |
  | trial return | 891 (`return trialEvents`) | 직전 |
  | normal arrival return | 1090 (end of method) | 직전 |
  | resolveFateRoll return | 315 (`return events`) | 직전 — cycle 종료 path |
  | resolveBossIntro return | (handlePostArrival 후) | 직전 |
  | resolveRealmFork return | (handlePostArrival 후) | 직전 |

  fateRollPending / bossIntroPending / realmForkPending 의 early-return 3 곳은
  push 안 함 (frozen — hero state 변동 0). resolve 단계가 *후속 final push*
  담당. **invariant: 매 controller.handleArrival 호출 *후* (resolve 포함)
  history.length 가 단조 비감소**.

- **helper 시그니처 (controller 안 private method)**:

  ```ts
  private pushLevelSnapshot(): void {
    this.levelHistory.push({
      arrivalIndex: this.arrivalCounter,
      level: this.hero.level,
      age: this.hero.age,
    });
    this.arrivalCounter += 1;
  }
  ```

- **arrivalCounter 의미 — task 의 모호 정정**:
  - **arrivalCounter = controller-instance 전체 push count** (0-based).
    `LevelHistoryBuffer` 의 `counter` 와 별 — buffer 의 counter 는 decimation
    stride 계산용, controller 의 arrivalCounter 는 *snapshot 의 x-axis 값*.
  - decimation 이 실제 sample 을 drop 해도 *arrivalIndex 는 보존* (= push
    호출 시점의 controller counter). chart x-axis 가 cycle 진행률 → 비균등
    sample 분포를 의도적으로 보여줌.

- **수용 기준 (Δ-from-baseline)**:
  - C1. `LevelHistoryBuffer` overflow test: 70 push → length 35 (60 → 30 + 다음 5 → 35),
    stride 2 → 4. property-test 60+1 push → length 31 (`Math.ceil(31 / 2) = 16` 이 아니라
    `LEVEL_HISTORY_CAPACITY/2 = 30` 후 추가 push 31 → 32 등). **정확 산식**:
    n push 누적 시 length = `⌈n / stride⌉ ≤ 60`. push 60 → length 60 (stride 1).
    push 61 → length 30 (decimate) + 1 → **31, stride 2**.
    push 120 (stride 2 동안 60 push, length 30 + 30 = 60) → 다음 1 push (121st):
    length 60 → 30 + 1 = 31, stride 4. **테스트 = push 121 → length 31, stride 4**.
  - C2. `LevelHistoryBuffer.get()` 의 immutability — readonly array 반환,
    consumer 가 mutation 시도 시 typecheck fail. runtime defensive copy 불필요
    (TypeScript readonly 충분). property-test 1 줄.
  - C3. controller integration: 50-arrival cycle 종료 후 `levelHistory.length`
    ∈ [25, 50] (decimation 발동 안 함, stride 1). 1200-arrival cycle 후
    `levelHistory.length` ∈ [30, 60] (decimation 5-6 회 발동, stride ≥ 16).
  - C4. last-entry invariant: 매 push 후 `samples[samples.length - 1]` 의
    `level === this.hero.level` + `age === this.hero.age` 동등. property test.

- **반대 기준 (NOT this)**:
  - **persist v24 → v25 bump 금지** (R1). `levelHistory` 는 controller instance
    scope only. `gameStore` 의 `partialize` (cycleStore 가 persist 안 됨 — 기존
    pattern 그대로). saga 의 levelHistory 도 *cycle_end 후 lastSaga 안에만*
    유지, persist storage write 안 됨. zustand 가 lastSaga 를 persist 한다면
    F3 의 partialize 확인 의무.
  - **chart library 외부 의존 추가 금지** (R2). recharts / chart.js / d3 등
    package.json 추가 0. 전 inline SVG.
  - **per-arrival overhead < 1ms 의 측정 보장** (R3). ring buffer push = O(1)
    amortized (decimation 발동 시 O(n) = max 60), `Date.now()` 호출 0, 외부
    callout 0. MAX_ARRIVALS 1200 cycle 의 누적 overhead ≤ 60 ms (1200 × 0.05ms).
  - **arrival counter persist 금지** — controller instance scope. 새 cycle
    start 시 0 reset.

### F2. `<InflationCurveChart/>` inline SVG component

- **목적**: F1 의 ring buffer 데이터를 시각화. log Y scale + 8 milestone tier
  marker + axis labels.

- **신 file `src/screens/InflationCurveChart.tsx`**:

  ```tsx
  import { MILESTONE_PRESETS } from '../data/milestones';
  import type { LevelSnapshot } from '../overworld/levelHistory';

  interface Props {
    history: readonly LevelSnapshot[];
    width?: number;   // default 280
    height?: number;  // default 160
  }

  export function InflationCurveChart({
    history,
    width = 280,
    height = 160,
  }: Props) { ... }
  ```

- **렌더링 결정**:
  1. **viewBox** = `0 0 ${width} ${height}`. SVG responsive (CSS width/height
     consumer 가 override 가능).
  2. **padding** = `{ top: 8, right: 8, bottom: 24, left: 32 }`. axis label 공간.
  3. **plot area** = `width - padding.left - padding.right` ×
     `height - padding.top - padding.bottom`.
  4. **X scale (linear)** = `xMin = 0`, `xMax = Math.max(1, lastArrivalIndex)`.
     `xPx(arrivalIndex) = padding.left + (arrivalIndex / xMax) * plotW`.
  5. **Y scale (log10)** — advisor §3 edge case:
     - `yMin = 0` (= log10(1), hero.level 시작값).
     - `yMax = Math.max(2, Math.log10(maxLevel))` (min 2 = log10(100), 시작
       cycle 일찍 죽어도 chart 가 빈 곡선 안 보임).
     - `yPx(level) = padding.top + plotH * (1 - (Math.log10(Math.max(1, level)) - yMin) / (yMax - yMin))`.
     - hero.level 0 절대 없음 (game invariant) 이지만 defensive `Math.max(1, level)`.
  6. **polyline** = 60-segment, `points="x1,y1 x2,y2 ..."`. stroke `var(--color-accent-gold, #fbbf24)`,
     stroke-width 1.5, fill none.
  7. **8 milestone marker** — Y axis horizontal dashed line + label:
     - 각 `MILESTONE_PRESETS` 항목: `yPx(preset.thresholdLv)` 에 horizontal
       `<line>` (stroke-dasharray="2 2", stroke `var(${preset.cssVarName})`,
       opacity 0.4).
     - label 텍스트 = `10^N` 표기 (lv 100 → "100", lv 1000 → "1k", lv 1_000_000 → "1M",
       lv 1_000_000_000 → "1G"). `<text>` element, fontSize 8, fill same css var.
     - **yMax 미만 marker 만 render** (chart 위로 안 넘침).
  8. **X axis label**: bottom 에 3 tick — "0" / "절반" / "${xMax}". `<text>` 8px.
  9. **Y axis label**: 좌측에 "레벨 (log scale)" 회전 90°. `<text>` 8px.
  10. **empty / single-point handling**:
      - history.length === 0: `<text>` "데이터 없음" centered. polyline / marker
        render 0.
      - history.length === 1: 단일 `<circle>` (r=3) 위치 = (xPx(0), yPx(level)).
        marker 라인 render, polyline 0.
      - history.length ≥ 2: polyline + marker + axis.

- **data-testid**:
  - `inflation-curve-chart` (root `<svg>`).
  - `inflation-curve-polyline` (polyline element — N ≥ 2 시만).
  - `inflation-curve-empty` (empty state text — N === 0 시만).

- **수용 기준**:
  - C5. snapshot test: empty (0 samples) / single-point (1 sample) / typical
    (10 samples) / full (60 samples) 의 4 fixture render → `<svg>` outerHTML
    구조 check. exact DOM 비교 (vitest @testing-library/react `render` +
    `container.innerHTML`).
  - C6. polyline d-attr coordinate sanity: 10-sample fixture 의 `points` attr
    파싱 → 10 좌표 추출 → 모두 padding.left ≤ x ≤ width-padding.right + padding.top ≤
    y ≤ height-padding.bottom. property test.
  - C7. milestone marker count = `MILESTONE_PRESETS.filter(p => p.thresholdLv ≤ yMaxLevel).length`.
    예: maxLevel=500 → marker 1 (lv 100 만). maxLevel=1e6 → marker 5.

- **반대 기준**:
  - **외부 chart library import 금지** (R2). package.json 추가 0.
  - **animation 금지** — static SVG. CSS transition / SVG <animate> 0. cycle
    111 의 *결과 화면 chart* = readout, 즉시 final state 표시.
  - **interactivity 금지** — hover tooltip / click zoom 등 0. 본 cycle scope
    out. cycle 112+ backlog.
  - **multi-line overlay 금지** — sim 산출과 dev server 의 *비교* line 은 본
    cycle 의 dev tool 차원에서 별 spec. 본 chart 는 single polyline only.

### F3. CycleResultV2 마운트 + saga.levelHistory wiring

- **목적**: cycle_end 시점에 controller 의 levelHistory 가 saga 에 첨부 →
  CycleResultV2 가 chart 에 prop 전달.

- **동작**:
  1. **`SagaTypes.Saga` 에 신 field 추가**: `levelHistory?: readonly LevelSnapshot[]`
     (optional — backward compat, 기존 saga payload 가 field 없어도 OK).
  2. **controller `getLevelHistory(): readonly LevelSnapshot[]` getter**:
     `return this.levelHistory.get()`.
  3. **cycle_end 시점 wiring** — `CycleControllerV2` 의 saga finalize path
     (`getFinalSaga()` 또는 cycle_end emit) 에서 saga 에 `levelHistory` 첨부.
     SagaRecorder 의 finalize API 가 levelHistory 받도록 확장 또는 controller
     레벨에서 직접 setter 호출.
  4. **CycleResultV2 mount**:
     - `import { InflationCurveChart } from './InflationCurveChart'`.
     - `const history = saga.levelHistory ?? []`.
     - mount 위치 = line 38 (`</div>` 결과 stats 후, line 40 `<h3>일대기</h3>`
       전). advisor §4 추천.
     - JSX: `<div data-testid="result-curve-section" style={{ marginTop: 16 }}>
       <h3>인플레이션 곡선</h3> <InflationCurveChart history={history} /> </div>`.
  5. **zustand `partialize` exclude** (R1 명시):
     - `cycleSliceV2` 가 persist 되는지 grep 확인 의무.
     - persist 되면 `partialize: (state) => ({ ...state, lastSaga: state.lastSaga
       ? { ...state.lastSaga, levelHistory: undefined } : null })` 로 levelHistory
       제외. persist 안 되면 작업 0.

- **수용 기준**:
  - C8. CycleResultV2 render 시 `data-testid="inflation-curve-chart"` 가 visible.
  - C9. saga.levelHistory 가 있으면 chart 가 history prop 받음, 없으면 empty
    state ("데이터 없음") 표시.
  - C10. integration test: full cycle (sim driver 10-arrival 등 short) → cycle_end
    → CycleResultV2 mount → chart svg + 1+ polyline visible.

- **반대 기준**:
  - **persist storage 에 levelHistory write 금지** (R1). partialize / persist
    skip 필수. zustand-persist 의 cycleSliceV2 가 이미 persist 안 된 상태일 수
    있음 — grep 확인 후 작업.
  - **lastSaga 의 기존 shape 변경 금지** — optional field 만 추가. 기존
    consumer (CycleResultV2 의 saga.hero / saga.chapters 접근) 회귀 0.
  - **시간 부족 시 ad-hoc placement 허용**: F3 의 line 38 위치가 design 충돌이면
    페이지 하단 (메인 메뉴 버튼 직전) 으로 대체. chart 자체 mount 가 의무.

## Baseline 측정

**Grep evidence — 1차 인프라 점검**:
- `grep -rn "LevelHistory\|levelSnapshot\|InflationCurve" games/inflation-rpg/src` → 0 hit.
  **clean slate**. naming 충돌 0.
- `grep -n "MAX_ARRIVALS\|arrivalIndex" games/inflation-rpg/src/overworld/CycleControllerV2.ts` →
  controller 내부에 `arrivalIndex` 변수 없음 (현재). 본 PRD 가 `arrivalCounter`
  field 신규 도입.
- `grep -n "lastSaga\|getFinalSaga\|saga finalize" games/inflation-rpg/src/saga` →
  saga finalize path 확인 의무 (구현 시).
- `grep -rn "partialize\|persist" games/inflation-rpg/src/overworld/cycleSliceV2.ts` →
  persist 여부 확인 (구현 단계).

**Persist version**: `gameStore.ts:1478 → version: 24`. cycle 110 PRD 의 v24 정정
인용. 본 cycle = **persist v24 유지** (R1). controller instance scope + saga
의 levelHistory 가 partialize 에서 exclude 보장 시 schema 변경 0.

## Sim-real parity 검증 (cycle 12 false PASS 룰)

**1. Sim driver mirror 검증 (의무)**:
- F1 의 ring buffer + arrivalCounter 가 **controller 내부 동작** 이므로 sim
  driver mirror 필요 없음 — sim driver 가 `controller.handleArrival()` 호출
  하기만 하면 levelHistory 자동 build. **sim 산출은 chart 가 안 보이지만
  data 는 동일하게 build**.
- 단 sim 의 cycle_end 시점에 levelHistory 첨부 path 도 동일 — `sim-cycle-v2.ts`
  의 saga finalize 호출 site 가 controller 의 finalize 와 동일 함수 호출 시 자동
  propagate. grep 확인 의무.
- **구현 단계 grep**: `grep -n "getFinalSaga\|cycle_ended" games/inflation-rpg/scripts/sim-cycle-v2.ts`
  → sim 의 saga build path 확인.

**2. Playwright dev server smoke (의무)**:
- cycle_end 후 CycleResultV2 mount 시 `data-testid="inflation-curve-chart"`
  visibility check. 1-2 분 dev server smoke (seed = 1024 fixed).
- short cycle (death by age 11) 시 chart 가 single-point 또는 empty state 둘
  중 하나 — fail 아님 (정상 path).

**3. 산술 충돌 사전 검증 (cycle 11 룰)**:
- C1-C10 모두 read-only. controller 의 hero state mutation 0. balance 영향 0.
  maxLevel / arrival count 등 sim 산출 metric Δ = 0.
- per-arrival overhead < 1ms (R3) 의 amortized O(1) + decimation max O(60)
  보장 → 1200 arrival 누적 ≤ 60ms (1200 × 0.05ms 평균). cycle 길이 영향 ≤ 0.5%
  (전체 cycle ~10s 가정).

## 사용자 가치 측정

**Baseline (cycle 110 ship 후)**:
- visualization count per cycle = 0 (chart 부재).

**Cycle 111 ship 후**:
- visualization count per cycle = 1 (CycleResultV2 의 chart 1 개).
- Δ-from-baseline: **+1 chart** — task 의 명시 기준 (≥ 1) 정확 달성.
- 부가 가치 = sim-real parity 시각 검증 도구. dev 가 sim 산출과 dev server 의
  curve 가 같은 shape 인지 *눈으로* 확인 가능 (cycle 12 false PASS 룰의 보조
  검증 axis).

## 우선순위 외 backlog

- **multi-line overlay (sim vs real 비교)**: 본 cycle 의 single polyline 외에
  sim baseline (cycle 17 측정 curve) 를 *gray dashed* 로 같이 render. 본 cycle
  scope out. cycle 112+ backlog.
- **interactivity** (hover tooltip / click zoom / arrival index 별 detail).
  본 cycle out. cycle 112+ backlog.
- **MainMenu 통계 dashboard** — 누적 cycle 의 maxLevel/ageEnd 등 trend chart.
  본 cycle 의 chart component 재사용 가능. cycle 113+ backlog.
- **export to PNG** — screenshot 친화 (cycle 105 critic §N4 의 streamer
  axis). 본 cycle out.
- **cycle 110 carry-over: F2 generic extract 의 별 cycle refactor** (cycle 110
  R4) — system 카테고리라 본 cycle 회수 불가. cycle 112+ carry-over.
- **cycle 110 carry-over: F3 helper (handlePostArrival) 의 fate roll path
  적용** (cycle 110 R5) — 본 cycle scope out. cycle 112+ carry-over.

## 비고

**리스크 메모**:

- **R1. persist v24 → v25 bump 금지** (task 명시): F3 의 saga.levelHistory 가
  zustand persist 의 partialize 에서 exclude 의무. cycleSliceV2 의 persist
  여부 grep 확인 후 작업. partialize 미적용 시 PR 차단.
- **R2. chart library 외부 의존 추가 금지** (task 명시, bundle size 보호):
  package.json 변경 0. inline SVG only. recharts / chart.js / d3 import 0.
- **R3. per-arrival overhead < 1ms** (task 명시): ring buffer push = O(1)
  amortized, decimation 발동 시 O(60). Date.now / console / 외부 callout 0.
  1200 arrival 누적 ≤ 60ms 보장.
- **R4. log Y axis edge case** (advisor §3): hero.level 시작 = 1 → log10(1)=0.
  yMin=0 고정. defensive `Math.max(1, level)` 적용. yMax 가 너무 작으면 (단명
  cycle) `Math.max(2, log10(maxLevel))` 의 floor 2 = lv 100 까지 보이는 chart
  최소 범위 보장.
- **R5. adaptive decimation 의 stride 정확 산식 검증** (advisor §A): push N 회
  후 length 와 stride 의 정확값 = property test 로 enumerate (N=60/61/120/121/240/241).
  naive FIFO 의 endgame zoom 위험 회피 보장.
- **R6. saga finalize wiring 의 누락 risk**: cycle_end 시 controller.getLevelHistory()
  → saga.levelHistory 첨부의 single point. grep `getFinalSaga` 등으로 사이트
  enumerate 후 1 줄 추가. 누락 시 chart 가 항상 empty.
- **R7. CycleResultV2 mount 위치 design risk**: line 38 추천 (advisor §4) 이
  최선. 기존 layout 의 결과 stats → chart → narrative list 순서 = inflation
  identity 의 *수치 → 곡선 → 텍스트* 의 자연 흐름. 시간 부족 시 ad-hoc 하단
  placement 허용 (반대 기준 명시).

**의존성**:

- 신 file: `src/overworld/levelHistory.ts` (~50 LOC).
- 신 file: `src/screens/InflationCurveChart.tsx` (~120 LOC).
- 수정: `src/overworld/CycleControllerV2.ts` — `arrivalCounter` field + 6 push
  site (5 path 의 return-direct + 3 resolve 의 final push). `getLevelHistory()`
  getter.
- 수정: `src/saga/SagaTypes.ts` — `Saga.levelHistory?: readonly LevelSnapshot[]`
  optional field.
- 수정: `src/saga/SagaRecorder.ts` (또는 controller.getFinalSaga) — finalize
  단계의 levelHistory 첨부.
- 수정: `src/screens/CycleResultV2.tsx` — chart mount 1 줄.
- 수정 (조건부): `src/overworld/cycleSliceV2.ts` — persist + partialize 가 있다면
  levelHistory exclude.

**8 페르소나 룰 자가검증**:
- **게임비평가**: cycle-105-critic §N4 직접 수용. polynomial degree → player
  체험. 회고적 만족 axis.
- **레벨디자이너**: §N1-N5 cost 표의 최저 cost (code ~150) 활용. balance 영향 0.
- **웹리서처**: chart library 외부 의존 없이 inline SVG 가능 — 표준 web platform.
  외부 dependency 추가 0 의 cost-benefit 최선.
- **게임 기획자**: 카테고리 룰 9 정합 (UI = system 외) + cycle 110 PRD §38-48
  의 카테고리 강제 의무 직접 회수.
- **implementer**: §F1-F3 의 6 push site 명시 + ring buffer 정확 산식 +
  SVG layout 좌표계 식 + mount 위치 line 38 = 헷갈릴 여지 0.
- **테스트 작성자**: C1-C10 = 10 acceptance. C1+C2 ring buffer 4-5 test,
  C5+C6+C7 chart 3 test, C8+C9+C10 integration 1 test = **8+ 추가** (task 명시).
- **sim driver 작성자**: §Sim-real parity §1 = controller 내부 + saga finalize
  자동 propagate. grep 의무. sim 산출 metric Δ = 0.
- **balance 진단자**: hero state mutation 0, sim 산출 0 영향. balance 회귀 0.
- **persist 진단자**: R1 partialize exclude 명시 + cycleSliceV2 persist 여부
  grep 확인 후 작업. v24 유지 보장.
- **advisor**: §advisor (사전 호출) 4 핀포인트 모두 PRD 명시 + mitigation 명시.

**3 의 규칙 평가**:
- visualization / chart 어휘 = **0 회 시도** (baseline grep 확정). spec 정식화
  시점 아님 — 단, cycle 105 critic §N4 의 명시적 surface + cycle 110 PRD §38-48
  의 카테고리 강제 의무 → *advisor inverse* 적용 (rule of 3 의 강제 pivot 신호).
  cycle 111 = N4 의 첫 ship, cycle 112+ 의 추가 시도 (interactivity, multi-line,
  export) 가 모이면 3-rule promote 가능.

**룰 9 자가검증 (재확인)**:
- cycle 108 + 109 + 110 = 3 cycle 연속 system. cycle 110 PRD §38-48 이 cycle
  111 의 system 외 카테고리 의무. **본 PRD 카테고리 = `UI`** → 룰 9 정합.
- cycle 112 카테고리 자유. 단 UI 가 3 연속 (111+112+113) 패턴이면 cycle 114
  강제 pivot.

**완료 정의 (DoD)**:

- C1-C10 모든 acceptance 통과.
- vitest count baseline 1374 + 8+ 추가 (회귀 0).
- typecheck PASS.
- lint PASS (eslint boundaries 위반 0).
- circular 1 (baseline).
- grep 검증: package.json 의 chart library import 0 (R2 보장).
- carry-over: multi-line overlay / interactivity / MainMenu dashboard / export
  / cycle 110 의 F2 extract refactor / handlePostArrival fate roll path 모두
  cycle 112+ backlog.
