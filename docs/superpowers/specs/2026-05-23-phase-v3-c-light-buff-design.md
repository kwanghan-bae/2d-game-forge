# Phase V3-C — 신의 빛 + Buff Catalog + Spend Modal

**Status:** Design (brainstorming 산출물)
**Date:** 2026-05-23
**Author:** kwanghan-bae + Claude (Opus 4.7)
**Base commit:** `3f9cc9e` (main HEAD — V3-B Eternal Hero 머지 직후)
**Branch:** `feat/phase-v3-c-light-buff` (예정)
**Master spec:** `docs/superpowers/specs/2026-05-23-v3-eternal-hero-idle-sponsor-design.md` §5, §9

---

## 0. 이 sub-spec 의 의미

Master V3 spec 의 §5 (자원 + buff catalog) + §9 V3-C (4-6h estimate) 가 큰 그림은
정의했지만, V3-C 구현 단계에서 결정해야 할 디테일이 추가 발생했다. V3-A / V3-B
는 plan 만 작성했지만 V3-C 는 decision surface 가 더 넓어 sub-spec 으로
정착시킨다. 다음 디테일들이 sub-spec 의 가치:

- Cost cap (rejuv_discount, aging_slow) — master spec 미정
- Encounter positive 정의 (어떤 event 가 +1 인지)
- Buff 효과 wire path (selector pattern + controller pure 유지)
- Buff #6 의 V3-D 까지 inert 처리
- Persist v19 → v20 마이그레이션

---

## 1. Scope

Master spec §5.2 의 7 buff 전체 + spend modal + light wire-up 의 풀 구현.
MVP 축소 아님. V3-G balance pass 가 cost/effect 의 magnitude 를 재검토하지만
V3-C 단계의 placeholder 는 master spec §5.1 / §5.2 의 값 그대로.

**Out of scope (다른 phase):**
- Zone field level system → V3-D
- Hero level vs field level 디버프 → V3-D (buff #6 의 실제 효과 wire 시점)
- NPC encounter 의 light emit → V3-E
- 1만시간 곡선 balance → V3-G

---

## 2. 결정 사항 요약 (brainstorming 산출물)

| # | 결정 | 값 |
|---|---|---|
| 1 | V3-C scope | Spec §5 그대로 7 buff full |
| 2 | HUD 회춘 버튼 정리 | 완전 제거. "신의 메뉴" 버튼 단일 입구 |
| 3 | Light HUD 표시 | 카운터 + floating "+N" 텍스트 (debounced) |
| 4 | Quick buy 정책 | `×1` / `×10` / `×Max` 3 버튼 고정 |
| 5 | Buff #6 (필드 디버프 한도) | Catalog 포함, V3-D 까지 inert. 카드에 "V3-D 도착 시 활성" 표시 |
| 6 | Balance baseline | Spec §5.1 / §5.2 값 그대로 placeholder, V3-G 에서 pass |
| 7 | Cost cap | `rejuv_discount` 0.80 / `aging_slow` 0.50 floor. V3-G 재검토 (master spec 에 없는 V3-C 결정) |
| 8 | Encounter positive 정의 | `shrine_visited` + `skill_learned` + `job_unlocked` 3종 |
| 9 | Modal 게임 일시정지 | 안 함. Modal 열려도 hero action 진행 (idle 의 의미) |

---

## 3. Architecture

### 3.1 신규 파일

| 경로 | 책임 |
|---|---|
| `games/inflation-rpg/src/buff/catalog.ts` | `BUFF_CATALOG: BuffDef[]` + `BuffId` 타입 + `nextStepCost(buffId, currentLv, count)` |
| `games/inflation-rpg/src/buff/buffEffects.ts` | 순수 selector 모음 (`getMoveSpeedMul`, `getDropChanceBonus`, `getLightRateMul`, `getRejuvDiscount`, `getAgingSpeedMul`, `getFieldDiffThreshold`) |
| `games/inflation-rpg/src/overworld/lightEmit.ts` | Pure helper `computeLightDelta(evs, kind) → { delta, breakdown[] }` |
| `games/inflation-rpg/src/screens/SpendModal.tsx` | Modal UI (7 buff 카드 + oneshot 카드) |
| `games/inflation-rpg/src/buff/__tests__/catalog.test.ts` | Cost geometric 계산 검증 |
| `games/inflation-rpg/src/buff/__tests__/buffEffects.test.ts` | Selector 결과 검증 |
| `games/inflation-rpg/src/overworld/__tests__/lightEmit.test.ts` | computeLightDelta 검증 |

### 3.2 수정 파일

| 경로 | 변경 |
|---|---|
| `games/inflation-rpg/src/types.ts` | `MetaState.buffLevels: Record<BuffId, number>` 추가 |
| `games/inflation-rpg/src/store/gameStore.ts` | `buyBuff(buffId, count: 1 \| 10 \| 'max')` action + `INITIAL_META.buffLevels = {}` + `STORE_VERSION 20` + `migrateV19ToV20` |
| `games/inflation-rpg/src/overworld/cycleSliceV2.ts` | `rejuvenateHero` 의 cost 계산이 `getRejuvDiscount(meta)` 적용 |
| `games/inflation-rpg/src/hero/__tests__/rejuvenation.test.ts` | Discount 적용 케이스 추가 |
| `games/inflation-rpg/src/screens/OverworldRunner.tsx` | (a) 임시 회춘 5년 버튼 제거 → "신의 메뉴" 버튼 (b) handleArrival 후 `computeLightDelta(evs, kind)` → buff #3 rate 곱 → meta.light setState (c) Floating "+N" overlay |
| `games/inflation-rpg/src/store/gameStore.test.ts` | migrateV19ToV20 + buyBuff 테스트 |

### 3.3 핵심 디자인 결정

- **Controller pure 유지.** `CycleControllerV2.handleArrival` 가 light 을 emit
  하지 않음. Pure events 만 반환. Headless sim 은 light 무관.
  OverworldRunner 가 events 를 보고 light 누적.
- **Selector pattern.** 모든 buff 효과는 `buff/buffEffects.ts` 의 selector
  로 통일. 코드 안에서 `meta.buffLevels.move_speed` 직접 lookup 금지.
  V3-G 의 magnitude tune 이 catalog 만 바꾸면 끝.
- **`oneshot_rejuv` 은 catalog entry + cycleSliceV2 path.** Modal 의 카드는
  catalog 에 데이터로 존재하나, 클릭 핸들러는 `cycleSliceV2.rejuvenateHero(5)`
  를 호출. `buffLevels` 에 저장 안 함 (Lv 개념 없음).

---

## 4. Light Emit 상세

### 4.1 Spec §5.1 baseline (placeholder)

| Source | Delta | Detection (event-driven) |
|---|---|---|
| 적 처치 (잡몹) | +1 | `ev.type === 'battle_won' && kind === 'enemy'` |
| 적 처치 (보스) | +10 | `ev.type === 'battle_won' && kind === 'boss'` |
| Drop | +0.5 | `ev.type === 'battle_won' && ev.dropId !== undefined` |
| `shrine_visited` | +1 | encounter resolve |
| `skill_learned` | +1 | encounter resolve |
| `job_unlocked` | +1 | post-arrival milestone |
| Level up | +0.5 × deltaLevel | `ev.type === 'level_up'` (batched) |

**제외 (positive 가 아니거나 시스템성 event):**
- `moral_choice` — personality drift 이고 자비/잔혹 어디든 갈 수 있어 "positive" 정의 모호
- `chapter_transition` — V3-A 의 cinematic event. 시스템성.
- `hero_died` — V3-B 의 패배 event (negative)

### 4.2 흐름

```
controller.handleArrival(kind, id) → evs[]
   ↓
computeLightDelta(evs, kind) → { delta, breakdown[] }   // pure helper
   ↓
rateMul = getLightRateMul(meta)                          // buff #3
finalDelta = delta × rateMul                             // float
   ↓
useGameStore.setState(s => ({
  meta: { ...s.meta, light: s.meta.light + finalDelta }
}))
   ↓
React state: setFloatingTexts(prev => [...prev, { id, amount: finalDelta }])
setTimeout(remove, 1500ms)
```

### 4.3 Floating "+N" debounce

한 arrival 에 여러 events (battle + drop + 10 level_up) 가 동시에 발생 가능
→ breakdown 의 합산 amount 한 줄로 표시. 1.5s rise + fade. CSS keyframes
사용 (chapter_transition 패턴 재사용).

### 4.4 BigInt 도입 시점

`light` 은 number 그대로 V3-G 까지 사용. spec §5.1 의 baseline 으로는
1만 시간 동안 number safe max (2^53 ≈ 9e15) 까지 도달 불가. V3-G 의 balance
pass 가 emit/cost scale 을 inflate 하면 그때 BigInt 검토.

---

## 5. Buff Catalog 상세

### 5.1 `BUFF_CATALOG`

```ts
type BuffId = 'move_speed' | 'drop_chance' | 'light_rate' | 'rejuv_discount'
            | 'aging_slow' | 'field_diff' | 'oneshot_rejuv';

interface BuffDef {
  id: BuffId;
  nameKR: string;
  descKR: string;       // "이동속도 +0.5% (per Lv)"
  baseCost: number;     // first purchase
  costMul: number;      // geometric ratio
  perLevel: number;     // effect delta (signed)
  cap?: number;         // optional effect cap (0..1 range typically)
  isOneShot?: boolean;  // true → no Lv, dynamic cost, calls cycleSliceV2
}

export const BUFF_CATALOG: BuffDef[] = [
  { id: 'move_speed',      nameKR: '이동의 가호', descKR: '이동속도 +0.5%',         baseCost: 100,  costMul: 1.15, perLevel:  0.005 },
  { id: 'drop_chance',     nameKR: '풍요의 손길', descKR: '장비획득 확률 +0.3%',    baseCost: 150,  costMul: 1.15, perLevel:  0.003 },
  { id: 'light_rate',      nameKR: '빛의 풍요',   descKR: '빛 누적 +1%',            baseCost: 500,  costMul: 1.25, perLevel:  0.01  },
  { id: 'rejuv_discount',  nameKR: '자비의 손길', descKR: '회춘 cost -5%',           baseCost: 800,  costMul: 1.30, perLevel:  0.05, cap: 0.80 },
  { id: 'aging_slow',      nameKR: '시간의 늪',   descKR: '자연 aging 속도 -1%',     baseCost: 1000, costMul: 1.30, perLevel: -0.01, cap: 0.50 },
  { id: 'field_diff',      nameKR: '격차의 칼날', descKR: '필드 디버프 한도 +1 (V3-D 도착 시 활성)', baseCost: 300, costMul: 1.20, perLevel: 1 },
  { id: 'oneshot_rejuv',   nameKR: '빛의 은총',   descKR: '즉시 5년 회춘',           baseCost: 0,    costMul: 1.0,  perLevel: 0, isOneShot: true },
];
```

### 5.2 `nextStepCost(buffId, currentLv, count)`

기하급수 누적 — `count` 개 단계 더 사는 데 드는 총 cost.

```ts
// 단일 단계 cost = baseCost * costMul^lv
function singleStepCost(def: BuffDef, lv: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.costMul, lv));
}

// count 개 누적
function nextStepCost(def: BuffDef, currentLv: number, count: number): number {
  let total = 0;
  for (let i = 0; i < count; i++) total += singleStepCost(def, currentLv + i);
  return total;
}

// ×Max — 현재 light 으로 살 수 있는 최대 count
function maxAffordable(def: BuffDef, currentLv: number, light: number): number {
  let count = 0;
  let spent = 0;
  while (true) {
    const next = singleStepCost(def, currentLv + count);
    if (spent + next > light) break;
    spent += next;
    count += 1;
    if (count > 1000) break;  // safety bound
  }
  return count;
}
```

### 5.3 Selector — buff 효과 wire

```ts
// buffEffects.ts
export function getMoveSpeedMul(meta: MetaState): number {
  const lv = meta.buffLevels?.move_speed ?? 0;
  return 1 + lv * 0.005;
}
export function getDropChanceBonus(meta: MetaState): number {
  const lv = meta.buffLevels?.drop_chance ?? 0;
  return lv * 0.003;
}
export function getLightRateMul(meta: MetaState): number {
  const lv = meta.buffLevels?.light_rate ?? 0;
  return 1 + lv * 0.01;
}
export function getRejuvDiscount(meta: MetaState): number {
  const lv = meta.buffLevels?.rejuv_discount ?? 0;
  return Math.min(0.80, lv * 0.05);          // cap 0.80
}
export function getAgingSpeedMul(meta: MetaState): number {
  const lv = meta.buffLevels?.aging_slow ?? 0;
  return Math.max(0.50, 1 - lv * 0.01);      // cap 0.50 floor
}
export function getFieldDiffThreshold(meta: MetaState): number {
  return meta.buffLevels?.field_diff ?? 0;   // V3-D 가 consume
}
```

### 5.4 Selector wire 지점

| Selector | Wired 위치 | 비고 |
|---|---|---|
| `getMoveSpeedMul` | `OverworldScene` 의 hero tween duration 곱 | spec §5.2 #1 |
| `getDropChanceBonus` | `dropTable` 또는 `EncounterEngine` 의 drop roll base chance 에 가산 | spec §5.2 #2 |
| `getLightRateMul` | OverworldRunner 의 finalDelta 계산 | spec §5.2 #3 |
| `getRejuvDiscount` | `cycleSliceV2.rejuvenateHero` 의 cost 계산 + SpendModal 의 oneshot 카드 cost 표시 | spec §5.2 #4 |
| `getAgingSpeedMul` | `HeroEntity.tickAge` 의 delta 곱 (또는 controller side) | spec §5.2 #5 |
| `getFieldDiffThreshold` | (V3-D 도착 시 zone field level damping logic 에서) | V3-C 에서는 unwired |

### 5.5 `buyBuff(buffId, count)` action

```ts
// gameStore.ts
buyBuff: (buffId, count) => {
  const meta = get().meta;
  const def = BUFF_CATALOG.find(b => b.id === buffId);
  if (!def || def.isOneShot) return { ok: false, reason: 'invalid' };
  const lv = meta.buffLevels?.[buffId] ?? 0;
  const n = count === 'max' ? maxAffordable(def, lv, meta.light ?? 0) : count;
  if (n <= 0) return { ok: false, reason: 'zero' };
  const cost = nextStepCost(def, lv, n);
  if ((meta.light ?? 0) < cost) return { ok: false, reason: 'insufficient' };
  set(s => ({
    ...s,
    meta: {
      ...s.meta,
      light: (s.meta.light ?? 0) - cost,
      buffLevels: { ...(s.meta.buffLevels ?? {}), [buffId]: lv + n },
    },
  }));
  return { ok: true, count: n, cost };
},
```

---

## 6. Spend Modal UI

### 6.1 HUD 변경 (OverworldRunner)

**제거:**
- 임시 `회춘 5년 (N 빛)` 버튼 + `data-testid="rejuvenate-button"` (V3-B 산출물)

**유지:**
- `hud-light`, `hud-rejuvenation`, `hud-name`, `hud-age`, `hud-hp`, speed buttons

**신규:**
- `[신의 메뉴]` 버튼 (`data-testid="open-spend-modal"`) — 회춘 버튼 자리
- Floating "+N" overlay 영역 (`position: absolute; pointer-events: none;`)

### 6.2 SpendModal.tsx 레이아웃

```
┌─────────────────────────────────┐
│ 신의 메뉴               [✕]      │
│ 빛: 12,345                       │
├─────────────────────────────────┤
│ 🌟 이동의 가호      Lv 5         │
│ 이동속도 +0.5%/Lv                │
│ 다음 효과: 이동속도 +3.0%        │
│ [×1: 152] [×10: 2,030] [×Max:71]│
├─────────────────────────────────┤
│ ... (7 cards scrollable)         │
└─────────────────────────────────┘
```

**카드 구성 (6 일반 buff):**
- 헤더: `nameKR` + 현재 `Lv X`
- 효과: `descKR` (per Lv) + 다음 단계 누적 (Lv → Lv+1 누적 값)
- Cap 도달 시: "최대 도달 (Lv N 부터 효과 동일)" 라벨, 단 buy 는 가능
- 3 버튼: `×1` / `×10` / `×Max` 각 cost 표시
- 비활성: `light < cost` → grey out + click 불가

**`oneshot_rejuv` 카드 (특별):**
- 헤더: `빛의 은총` (Lv 표시 없음)
- 본문: `즉시 5년 회춘 — 현재 hero {age}세 → {age-5}세`
- 단일 버튼: `[1번 쓰기: N 빛]` (`N = rejuvenationCost(age) × (1 - getRejuvDiscount(meta))`)
- Disabled: `light < cost` 또는 `hero.age <= 5`
- 클릭 핸들러: `cycleSliceV2.rejuvenateHero(5)` 호출

### 6.3 Modal interaction

- 외부 클릭 close
- ESC 키 close
- **게임 멈추지 않음** — Modal 열려있는 동안에도 controller 의 action tick 진행
  (Phaser 가 React state 무관하게 돌고 있음). idle 의 의미를 살림.
- buyBuff 후 즉시 cost / level / light 갱신 (modal 내 reactive)

### 6.4 Mobile UX (V3-A layer 준수)

- Safe area CSS (`padding-bottom: env(safe-area-inset-bottom)`)
- Touch target 44×44px 최소
- 스크롤 영역 `overscroll-behavior: contain`
- Modal 닫힘 애니메이션 200ms

---

## 7. Persist v19 → v20

### 7.1 마이그레이션

```ts
export function migrateV19ToV20(persisted: unknown): unknown {
  if (typeof persisted !== 'object' || persisted === null) return persisted;
  const p = persisted as { state?: Record<string, unknown> };
  if (!p.state || typeof p.state !== 'object') return persisted;
  const m = (p.state['meta'] ?? {}) as Record<string, unknown>;
  if (m['buffLevels'] === undefined || typeof m['buffLevels'] !== 'object') {
    m['buffLevels'] = {};
  }
  return persisted;
}
```

### 7.2 `STORE_VERSION` 19 → 20

`migrationConfig` 의 chain 에 `{ from: 19, to: 20, fn: migrateV19ToV20 }` 추가.
기존 v19 의 meta.light / hero / saga 그대로 carry.

### 7.3 `INITIAL_META.buffLevels = {}`

`gameStore.ts` 의 `INITIAL_META` 에 `buffLevels: {}` 필드 추가.
새 사용자는 모든 buff Lv 0 으로 시작.

---

## 8. Testing

### 8.1 Unit

- `buff/__tests__/catalog.test.ts`
  - `singleStepCost` 의 geometric 정확성 (lv=0 → baseCost, lv=N → baseCost × mul^N)
  - `nextStepCost(def, lv, 10)` 의 10단계 합
  - `maxAffordable` 의 정확한 역산 (light=1000, baseCost=100, mul=1.15 → 정확한 count)

- `buff/__tests__/buffEffects.test.ts`
  - 각 selector 의 Lv 0 baseline (move=1.0, drop=0, light_rate=1.0, …)
  - Lv 5, Lv 50 의 결과
  - Cap 적용 (`rejuv_discount` Lv 20 → 0.80, `aging_slow` Lv 100 → 0.50)

- `buff/__tests__/buyBuff.test.ts`
  - light 부족 시 no-op + return `{ ok: false, reason: 'insufficient' }`
  - 정확한 light 차감 + level 증가
  - `count: 'max'` 의 결과
  - `oneshot_rejuv` 호출 시 reject (`isOneShot`)

- `overworld/__tests__/lightEmit.test.ts`
  - 빈 evs → delta 0
  - 1 battle_won (kind=enemy) → 1
  - 1 battle_won (kind=boss) → 10
  - 1 battle_won + dropId → 1.5 / 10.5
  - 5 level_up batched → 2.5
  - shrine_visited / skill_learned / job_unlocked 각 +1
  - moral_choice / chapter_transition / hero_died → 0 (excluded)

- `hero/__tests__/rejuvenation.test.ts`
  - 기존 baseline test 유지
  - 신규: `rejuv_discount` 적용 시 effective cost 계산 검증

- `store/__tests__/migrateV19ToV20.test.ts`
  - v19 state → buffLevels = {} 자동 초기화
  - idempotent (v20 state → 변경 없음)

### 8.2 E2E (Playwright)

`e2e/v3-c-spend-modal.spec.ts`:
1. dev shell 시작 → "스폰서 시작" 클릭
2. 적 처치 후 `hud-light` 의 값이 증가하는지 확인
3. `open-spend-modal` 버튼 클릭 → modal 열림 (`data-testid="spend-modal"` 보임)
4. 첫 buff 카드의 `×1` 버튼 클릭 → light 차감 + Lv 1 표시 확인
5. modal 외부 클릭 → modal 닫힘 + hero action 계속 진행

---

## 9. 성공 기준 (master spec §12 V3-C)

- ✅ Spend modal 에서 buff Lv 1 → Lv 5 까지 사보고 cost 곡선 자연
- ✅ Idle 30분 켜놓고 자원 누적 → 의미 있는 결정 1-2개 (manual QA)
- ✅ 모든 unit + E2E 통과
- ✅ Persist v19 → v20 자동 마이그레이션 (기존 사용자 light/hero 유지)
- ✅ `hud-light` floating "+N" 가 visible (manual QA, V3-A 의 chapter overlay 와 유사)
- ✅ HUD 의 임시 회춘 버튼 제거됨

---

## 10. 위험

- **R1. Buff cap 의 V3-G 재검토.** `rejuv_discount` 0.80 / `aging_slow` 0.50
  은 V3-C 의 placeholder 결정. V3-G balance pass 가 cap 자체를 폐기하거나
  더 낮출 가능성. Mitigation: V3-G 의 balance task 에 cap 재검토 명시.
- **R2. Floating "+N" 의 성능.** 한 arrival 에 10+ events 가 발생할 때 React
  state 의 floating list 가 N개 동시 mount. Mitigation: source 별 합산
  1 줄로 묶기 + 1.5s 후 cleanup.
- **R3. Modal 게임 멈춤 안 함 의 UX.** Player 가 buff 카드 읽는 동안에도
  hero 가 죽거나 chapter 가 넘어갈 수 있음. Idle 의 의미 vs 신중한 결정
  사이 trade-off. Mitigation: V3-D 이후 user feedback 으로 재검토.
- **R4. `light` 의 number 범위.** V3-C placeholder 에선 1e15 미만이라 안전,
  V3-G inflate 시 BigInt 필요. Mitigation: V3-G plan 에 number→BigInt 전환
  task 명시.
- **R5. Buff #6 의 inert 상태.** Player 가 사면서 효과 없음에 짜증.
  Mitigation: 카드에 "V3-D 도착 시 활성" 명시 + cost 도 낮게 시작 (300 ~ 다른
  buff 보다 저렴).
- **R6. `cycleSliceV2.rejuvenateHero` 의 discount 적용.** 기존
  `rejuvenation.test.ts` 는 discount=0 baseline 만 검증. 회귀 없도록
  discount=0 케이스를 첫 케이스로 유지 + discount>0 케이스 추가.

---

## 11. 다음 phase

V3-C 완료 후 → V3-D (Multi-zone, 4-6h). V3-D 가 `getFieldDiffThreshold`
selector 의 실제 효과 wire (zone field level vs hero level damping).

— V3-C sub-spec 작성 (2026-05-23, brainstorming 산출물)
