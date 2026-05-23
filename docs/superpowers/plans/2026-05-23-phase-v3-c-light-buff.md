# Phase V3-C — Light + Buff Catalog + Spend Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 빛 자원 누적 wire-up + 7 buff full catalog + spend modal UI. V3-B Eternal Hero 위에 신의 후원 layer 를 얹는다.

**Architecture:**
- Controller pure 유지 — light emit 은 OverworldRunner 가 events 로 처리. Headless sim 영향 없음.
- Buff 효과는 selector pattern — 모든 buff effect 는 `buff/buffEffects.ts` 의 순수 selector 로 통일.
- `oneshot_rejuv` 만 catalog entry + cycleSliceV2 path (다른 6개는 gameStore.buyBuff).

**Tech Stack:** TypeScript, Zustand (persist v19→v20), Vitest, Playwright, React. `phaser` 는 dynamic import 유지.

**Sub-spec:** `docs/superpowers/specs/2026-05-23-phase-v3-c-light-buff-design.md` (commit `5a232b6`)
**Base commit:** `3f9cc9e` (main HEAD, V3-A+V3-B 머지 직후)
**Branch:** `feat/phase-v3-c-light-buff`

---

## File Structure

**Create:**
- `games/inflation-rpg/src/buff/catalog.ts` — BUFF_CATALOG def + cost helpers
- `games/inflation-rpg/src/buff/buffEffects.ts` — selector 함수들 (getMoveSpeedMul / getDropChanceBonus / getLightRateMul / getRejuvDiscount / getAgingSpeedMul / getFieldDiffThreshold)
- `games/inflation-rpg/src/buff/__tests__/catalog.test.ts`
- `games/inflation-rpg/src/buff/__tests__/buffEffects.test.ts`
- `games/inflation-rpg/src/buff/__tests__/buyBuff.test.ts`
- `games/inflation-rpg/src/overworld/lightEmit.ts` — computeLightDelta pure helper
- `games/inflation-rpg/src/overworld/__tests__/lightEmit.test.ts`
- `games/inflation-rpg/src/store/__tests__/migrateV19ToV20.test.ts`
- `games/inflation-rpg/src/screens/SpendModal.tsx` — modal UI
- `games/inflation-rpg/e2e/v3-c-spend-modal.spec.ts`

**Modify:**
- `games/inflation-rpg/src/types.ts` — MetaState.buffLevels 추가
- `games/inflation-rpg/src/store/gameStore.ts` — INITIAL_META.buffLevels + buyBuff action + migrateV19ToV20 + STORE_VERSION 20
- `games/inflation-rpg/src/overworld/cycleSliceV2.ts` — rejuvenateHero 의 cost 에 discount 적용
- `games/inflation-rpg/src/hero/__tests__/rejuvenation.test.ts` — discount 케이스 추가 (rejuvenation.ts 자체는 변경 없음)
- `games/inflation-rpg/src/overworld/EncounterEngine.ts` — dropChanceBonus opt
- `games/inflation-rpg/src/overworld/CycleControllerV2.ts` — opts.getBuffSnapshot 으로 buffs 주입 (drop/aging)
- `games/inflation-rpg/src/hero/HeroEntity.ts` — tickAge(agingMul) fractional accumulator
- `games/inflation-rpg/src/screens/OverworldRunner.tsx` — light emit + floating "+N" + 신의 메뉴 button + 회춘 5년 버튼 제거 + move_speed buff applied

---

## Task 1: Branch + BuffId 타입 + MetaState.buffLevels

**Files:**
- Modify: `games/inflation-rpg/src/types.ts`

- [ ] **Step 1: Branch 생성**

Run:
```bash
git checkout -b feat/phase-v3-c-light-buff
```
Expected: `Switched to a new branch 'feat/phase-v3-c-light-buff'`

- [ ] **Step 2: BuffId 타입 + MetaState.buffLevels 추가**

`games/inflation-rpg/src/types.ts` 의 `MetaState` interface 끝부분 (마지막 필드 다음, `}` 직전) 에 추가. 먼저 파일 안에 BuffId 가 이미 정의되어 있는지 grep 으로 확인 — 없으면 `MetaState` 정의 직전에 다음 export 추가:

```typescript
export type BuffId =
  | 'move_speed'
  | 'drop_chance'
  | 'light_rate'
  | 'rejuv_discount'
  | 'aging_slow'
  | 'field_diff'
  | 'oneshot_rejuv';
```

그리고 `MetaState` 안에 (마지막 필드 다음, light: number 가 있는 줄 근처에) 추가:

```typescript
  /** V3-C — buff catalog 의 누적 Lv. oneshot_rejuv 은 저장 안 함. */
  buffLevels: Partial<Record<BuffId, number>>;
```

- [ ] **Step 3: Typecheck**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```
Expected: 0 exit. (다른 곳에서 buffLevels 를 아직 안 쓰므로 type-level 안전.)

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/types.ts
git commit -m "feat(game-inflation-rpg): add BuffId + MetaState.buffLevels (V3-C foundation)"
```

---

## Task 2: BUFF_CATALOG + cost helpers (TDD)

**Files:**
- Create: `games/inflation-rpg/src/buff/catalog.ts`
- Test: `games/inflation-rpg/src/buff/__tests__/catalog.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/buff/__tests__/catalog.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  BUFF_CATALOG,
  singleStepCost,
  nextStepCost,
  maxAffordable,
  findBuff,
} from '../catalog';

describe('BUFF_CATALOG', () => {
  it('contains 7 entries (6 leveled + oneshot_rejuv)', () => {
    expect(BUFF_CATALOG).toHaveLength(7);
    const ids = BUFF_CATALOG.map(b => b.id).sort();
    expect(ids).toEqual([
      'aging_slow', 'drop_chance', 'field_diff', 'light_rate',
      'move_speed', 'oneshot_rejuv', 'rejuv_discount',
    ]);
  });

  it('oneshot_rejuv is flagged isOneShot', () => {
    const o = findBuff('oneshot_rejuv');
    expect(o.isOneShot).toBe(true);
  });

  it('rejuv_discount has cap 0.80, aging_slow has cap 0.50', () => {
    expect(findBuff('rejuv_discount').cap).toBe(0.80);
    expect(findBuff('aging_slow').cap).toBe(0.50);
  });
});

describe('singleStepCost', () => {
  it('lv 0 → baseCost', () => {
    expect(singleStepCost(findBuff('move_speed'), 0)).toBe(100);
  });
  it('lv 1 → baseCost * mul (ceil)', () => {
    // move_speed: 100 * 1.15 = 115
    expect(singleStepCost(findBuff('move_speed'), 1)).toBe(115);
  });
  it('lv 5 of light_rate (500 base, 1.25 mul) → ceil(500 * 1.25^5) = ceil(1525.88) = 1526', () => {
    expect(singleStepCost(findBuff('light_rate'), 5)).toBe(1526);
  });
});

describe('nextStepCost', () => {
  it('count 0 → 0', () => {
    expect(nextStepCost(findBuff('move_speed'), 0, 0)).toBe(0);
  });
  it('count 1 from lv 0 → singleStepCost(0)', () => {
    expect(nextStepCost(findBuff('move_speed'), 0, 1)).toBe(100);
  });
  it('count 10 from lv 0 sums geometric (move_speed: ceil(100), ceil(115), ceil(132), …)', () => {
    const def = findBuff('move_speed');
    let manual = 0;
    for (let i = 0; i < 10; i++) manual += Math.ceil(def.baseCost * Math.pow(def.costMul, i));
    expect(nextStepCost(def, 0, 10)).toBe(manual);
  });
});

describe('maxAffordable', () => {
  it('insufficient light → 0', () => {
    expect(maxAffordable(findBuff('move_speed'), 0, 50)).toBe(0);
  });
  it('exactly 100 light buys 1 step (lv 0 → 1)', () => {
    expect(maxAffordable(findBuff('move_speed'), 0, 100)).toBe(1);
  });
  it('215 light buys 2 steps (100 + 115)', () => {
    expect(maxAffordable(findBuff('move_speed'), 0, 215)).toBe(2);
  });
  it('214 light buys only 1 step', () => {
    expect(maxAffordable(findBuff('move_speed'), 0, 214)).toBe(1);
  });
  it('caps at 1000 to avoid infinite loop on overflow', () => {
    expect(maxAffordable(findBuff('move_speed'), 0, Number.MAX_SAFE_INTEGER)).toBeLessThanOrEqual(1000);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg vitest run src/buff/__tests__/catalog.test.ts
```
Expected: FAIL — "Cannot find module '../catalog'"

- [ ] **Step 3: catalog.ts 구현**

`games/inflation-rpg/src/buff/catalog.ts`:

```typescript
import type { BuffId } from '../types';

export interface BuffDef {
  id: BuffId;
  nameKR: string;
  descKR: string;
  baseCost: number;
  costMul: number;
  perLevel: number;
  cap?: number;
  isOneShot?: boolean;
}

/** Master V3 spec §5.2. Magnitude 는 V3-G balance pass 까지 placeholder. */
export const BUFF_CATALOG: BuffDef[] = [
  { id: 'move_speed',     nameKR: '이동의 가호', descKR: '이동속도 +0.5%',                      baseCost: 100,  costMul: 1.15, perLevel:  0.005 },
  { id: 'drop_chance',    nameKR: '풍요의 손길', descKR: '장비획득 확률 +0.3%',                 baseCost: 150,  costMul: 1.15, perLevel:  0.003 },
  { id: 'light_rate',     nameKR: '빛의 풍요',   descKR: '빛 누적 +1%',                          baseCost: 500,  costMul: 1.25, perLevel:  0.01  },
  { id: 'rejuv_discount', nameKR: '자비의 손길', descKR: '회춘 cost -5%',                        baseCost: 800,  costMul: 1.30, perLevel:  0.05, cap: 0.80 },
  { id: 'aging_slow',     nameKR: '시간의 늪',   descKR: '자연 aging 속도 -1%',                  baseCost: 1000, costMul: 1.30, perLevel: -0.01, cap: 0.50 },
  { id: 'field_diff',     nameKR: '격차의 칼날', descKR: '필드 디버프 한도 +1 (V3-D 도착 시 활성)', baseCost: 300,  costMul: 1.20, perLevel:  1 },
  { id: 'oneshot_rejuv',  nameKR: '빛의 은총',   descKR: '즉시 5년 회춘',                        baseCost: 0,    costMul: 1.0,  perLevel: 0, isOneShot: true },
];

export function findBuff(id: BuffId): BuffDef {
  const b = BUFF_CATALOG.find(x => x.id === id);
  if (!b) throw new Error(`Unknown buff: ${id}`);
  return b;
}

/** 한 단계 (현재 Lv → Lv+1) 의 cost. ceil 처리. */
export function singleStepCost(def: BuffDef, currentLv: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.costMul, currentLv));
}

/** count 단계 누적 cost. count=0 → 0. */
export function nextStepCost(def: BuffDef, currentLv: number, count: number): number {
  if (count <= 0) return 0;
  let total = 0;
  for (let i = 0; i < count; i++) total += singleStepCost(def, currentLv + i);
  return total;
}

/** 주어진 light 으로 살 수 있는 최대 단계 수. 안전 cap 1000. */
export function maxAffordable(def: BuffDef, currentLv: number, light: number): number {
  let count = 0;
  let spent = 0;
  while (count < 1000) {
    const next = singleStepCost(def, currentLv + count);
    if (spent + next > light) break;
    spent += next;
    count += 1;
  }
  return count;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg vitest run src/buff/__tests__/catalog.test.ts
```
Expected: 모든 테스트 PASS

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/buff/catalog.ts games/inflation-rpg/src/buff/__tests__/catalog.test.ts
git commit -m "feat(game-inflation-rpg): BUFF_CATALOG + cost helpers (V3-C)"
```

---

## Task 3: buffEffects selectors (TDD)

**Files:**
- Create: `games/inflation-rpg/src/buff/buffEffects.ts`
- Test: `games/inflation-rpg/src/buff/__tests__/buffEffects.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/buff/__tests__/buffEffects.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import type { MetaState } from '../../types';
import {
  getMoveSpeedMul,
  getDropChanceBonus,
  getLightRateMul,
  getRejuvDiscount,
  getAgingSpeedMul,
  getFieldDiffThreshold,
} from '../buffEffects';

function meta(buffLevels: Partial<Record<string, number>>): MetaState {
  return { buffLevels } as unknown as MetaState;
}

describe('selector baselines (Lv 0)', () => {
  const empty = meta({});
  it('move = 1.0', () => expect(getMoveSpeedMul(empty)).toBe(1.0));
  it('drop = 0', () => expect(getDropChanceBonus(empty)).toBe(0));
  it('light_rate = 1.0', () => expect(getLightRateMul(empty)).toBe(1.0));
  it('rejuv_discount = 0', () => expect(getRejuvDiscount(empty)).toBe(0));
  it('aging = 1.0', () => expect(getAgingSpeedMul(empty)).toBe(1.0));
  it('field_diff = 0', () => expect(getFieldDiffThreshold(empty)).toBe(0));
});

describe('selector Lv 5', () => {
  const m = meta({
    move_speed: 5, drop_chance: 5, light_rate: 5,
    rejuv_discount: 5, aging_slow: 5, field_diff: 5,
  });
  it('move = 1.025', () => expect(getMoveSpeedMul(m)).toBeCloseTo(1.025));
  it('drop = 0.015', () => expect(getDropChanceBonus(m)).toBeCloseTo(0.015));
  it('light_rate = 1.05', () => expect(getLightRateMul(m)).toBeCloseTo(1.05));
  it('rejuv_discount = 0.25', () => expect(getRejuvDiscount(m)).toBeCloseTo(0.25));
  it('aging = 0.95', () => expect(getAgingSpeedMul(m)).toBeCloseTo(0.95));
  it('field_diff = 5', () => expect(getFieldDiffThreshold(m)).toBe(5));
});

describe('cap enforcement', () => {
  it('rejuv_discount Lv 20 → 0.80 cap (would be 1.0 without cap)', () => {
    expect(getRejuvDiscount(meta({ rejuv_discount: 20 }))).toBe(0.80);
  });
  it('rejuv_discount Lv 16 → 0.80 cap (would be 0.80 — boundary)', () => {
    expect(getRejuvDiscount(meta({ rejuv_discount: 16 }))).toBe(0.80);
  });
  it('aging_slow Lv 60 → 0.50 floor (would be 0.40 without floor)', () => {
    expect(getAgingSpeedMul(meta({ aging_slow: 60 }))).toBe(0.50);
  });
  it('aging_slow Lv 100 → 0.50 floor', () => {
    expect(getAgingSpeedMul(meta({ aging_slow: 100 }))).toBe(0.50);
  });
});

describe('undefined buffLevels safety', () => {
  it('meta with no buffLevels → all baselines', () => {
    const m = {} as MetaState;
    expect(getMoveSpeedMul(m)).toBe(1.0);
    expect(getRejuvDiscount(m)).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg vitest run src/buff/__tests__/buffEffects.test.ts
```
Expected: FAIL — "Cannot find module '../buffEffects'"

- [ ] **Step 3: buffEffects.ts 구현**

`games/inflation-rpg/src/buff/buffEffects.ts`:

```typescript
import type { MetaState } from '../types';

function lvOf(meta: MetaState, id: string): number {
  return meta.buffLevels?.[id as keyof MetaState['buffLevels']] ?? 0;
}

/** 1.0 + 0.005 * lv. No cap. */
export function getMoveSpeedMul(meta: MetaState): number {
  return 1.0 + lvOf(meta, 'move_speed') * 0.005;
}

/** 0.003 * lv (additive bonus to drop chance). No cap. */
export function getDropChanceBonus(meta: MetaState): number {
  return lvOf(meta, 'drop_chance') * 0.003;
}

/** 1.0 + 0.01 * lv. No cap. */
export function getLightRateMul(meta: MetaState): number {
  return 1.0 + lvOf(meta, 'light_rate') * 0.01;
}

/** 0.05 * lv, capped at 0.80. */
export function getRejuvDiscount(meta: MetaState): number {
  return Math.min(0.80, lvOf(meta, 'rejuv_discount') * 0.05);
}

/** 1.0 - 0.01 * lv, floored at 0.50. */
export function getAgingSpeedMul(meta: MetaState): number {
  return Math.max(0.50, 1.0 - lvOf(meta, 'aging_slow') * 0.01);
}

/** 1 * lv. V3-C 에서는 unwired (V3-D 의 zone field level damping 이 consume). */
export function getFieldDiffThreshold(meta: MetaState): number {
  return lvOf(meta, 'field_diff');
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg vitest run src/buff/__tests__/buffEffects.test.ts
```
Expected: 모든 테스트 PASS

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/buff/buffEffects.ts games/inflation-rpg/src/buff/__tests__/buffEffects.test.ts
git commit -m "feat(game-inflation-rpg): buff effect selectors (V3-C)"
```

---

## Task 4: INITIAL_META.buffLevels + migrateV19ToV20 + STORE_VERSION 20

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts`
- Test: `games/inflation-rpg/src/store/__tests__/migrateV19ToV20.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/store/__tests__/migrateV19ToV20.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { migrateV19ToV20 } from '../gameStore';

describe('migrateV19ToV20', () => {
  it('inserts empty buffLevels when missing', () => {
    const v19 = { meta: { light: 100 } };
    const result = migrateV19ToV20(v19) as { meta: { buffLevels: Record<string, number>; light: number } };
    expect(result.meta.buffLevels).toEqual({});
    expect(result.meta.light).toBe(100);
  });

  it('preserves existing buffLevels (idempotent)', () => {
    const v20 = { meta: { light: 50, buffLevels: { move_speed: 3 } } };
    const result = migrateV19ToV20(v20) as { meta: { buffLevels: Record<string, number> } };
    expect(result.meta.buffLevels).toEqual({ move_speed: 3 });
  });

  it('null meta is safe', () => {
    expect(migrateV19ToV20({ meta: null })).toEqual({ meta: null });
  });

  it('non-object passthrough', () => {
    expect(migrateV19ToV20(null)).toBe(null);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg vitest run src/store/__tests__/migrateV19ToV20.test.ts
```
Expected: FAIL — "migrateV19ToV20 is not a function"

- [ ] **Step 3: gameStore.ts 에 migrateV19ToV20 + chain entry + INITIAL_META.buffLevels + STORE_VERSION**

`games/inflation-rpg/src/store/gameStore.ts` 의 `migrateV18ToV19` 함수 바로 다음에 추가:

```typescript
export function migrateV19ToV20(persisted: unknown): unknown {
  if (typeof persisted !== 'object' || persisted === null) return persisted;
  const s = persisted as { meta?: Record<string, unknown> | null };
  if (!s.meta || typeof s.meta !== 'object') return persisted;
  const m = s.meta;
  if (m['buffLevels'] === undefined || typeof m['buffLevels'] !== 'object') {
    m['buffLevels'] = {};
  }
  return s;
}
```

`runStoreMigration` 안에서 v18→v19 블록 바로 다음에 추가:

```typescript
  // v19 → v20: Phase V3-C — buffLevels 초기화
  if (fromVersion <= 19) {
    migrateV19ToV20(s);
  }
```

`INITIAL_META` 안 `light: 0,` 줄 바로 다음에 추가:

```typescript
  // Phase V3-C — 신의 buff catalog
  buffLevels: {},
```

`persist` config 의 `version: 19,` 줄을 `version: 20,` 으로 변경. 같은 줄 주석도 갱신:

```typescript
      version: 20,  // 19 → 20 (Phase V3-C — buffLevels)
```

- [ ] **Step 4: 테스트 통과 확인**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg vitest run src/store/__tests__/migrateV19ToV20.test.ts
pnpm --filter @forge/game-inflation-rpg typecheck
```
Expected: 모두 PASS, typecheck 0 exit

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/__tests__/migrateV19ToV20.test.ts
git commit -m "feat(game-inflation-rpg): persist v19→v20 buffLevels migration (V3-C)"
```

---

## Task 5: gameStore.buyBuff action (TDD)

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts` (interface + impl)
- Test: `games/inflation-rpg/src/buff/__tests__/buyBuff.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/buff/__tests__/buyBuff.test.ts`:

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { useGameStore } from '../../store/gameStore';

describe('gameStore.buyBuff', () => {
  beforeEach(() => {
    act(() => {
      useGameStore.setState(s => ({
        ...s,
        meta: { ...s.meta, light: 0, buffLevels: {} },
      }));
    });
  });

  it('insufficient light → no-op + returns ok=false', () => {
    act(() => {
      useGameStore.setState(s => ({ ...s, meta: { ...s.meta, light: 50 } }));
    });
    let result: { ok: boolean; reason?: string } | undefined;
    act(() => { result = useGameStore.getState().buyBuff('move_speed', 1); });
    expect(result?.ok).toBe(false);
    expect(useGameStore.getState().meta.light).toBe(50);
    expect(useGameStore.getState().meta.buffLevels?.move_speed ?? 0).toBe(0);
  });

  it('exact cost → deducts light + increments level', () => {
    act(() => {
      useGameStore.setState(s => ({ ...s, meta: { ...s.meta, light: 100 } }));
    });
    let result: { ok: boolean } | undefined;
    act(() => { result = useGameStore.getState().buyBuff('move_speed', 1); });
    expect(result?.ok).toBe(true);
    expect(useGameStore.getState().meta.light).toBe(0);
    expect(useGameStore.getState().meta.buffLevels?.move_speed).toBe(1);
  });

  it("count='max' buys as many as light allows", () => {
    act(() => {
      // 215 light = exactly 2 steps (100 + 115)
      useGameStore.setState(s => ({ ...s, meta: { ...s.meta, light: 215 } }));
    });
    let result: { ok: boolean; count?: number } | undefined;
    act(() => { result = useGameStore.getState().buyBuff('move_speed', 'max'); });
    expect(result?.ok).toBe(true);
    expect(result?.count).toBe(2);
    expect(useGameStore.getState().meta.light).toBe(0);
    expect(useGameStore.getState().meta.buffLevels?.move_speed).toBe(2);
  });

  it('oneshot_rejuv via buyBuff is rejected (separate path)', () => {
    act(() => {
      useGameStore.setState(s => ({ ...s, meta: { ...s.meta, light: 9999 } }));
    });
    let result: { ok: boolean; reason?: string } | undefined;
    act(() => { result = useGameStore.getState().buyBuff('oneshot_rejuv', 1); });
    expect(result?.ok).toBe(false);
  });

  it('count=0 or negative → ok=false', () => {
    act(() => {
      useGameStore.setState(s => ({ ...s, meta: { ...s.meta, light: 1000 } }));
    });
    let r: { ok: boolean } | undefined;
    act(() => { r = useGameStore.getState().buyBuff('move_speed', 0 as 1); });
    expect(r?.ok).toBe(false);
  });

  it('preserves other meta fields', () => {
    act(() => {
      useGameStore.setState(s => ({
        ...s,
        meta: { ...s.meta, light: 100, gold: 5000, buffLevels: { drop_chance: 3 } },
      }));
    });
    act(() => { useGameStore.getState().buyBuff('move_speed', 1); });
    expect(useGameStore.getState().meta.gold).toBe(5000);
    expect(useGameStore.getState().meta.buffLevels?.drop_chance).toBe(3);
    expect(useGameStore.getState().meta.buffLevels?.move_speed).toBe(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg vitest run src/buff/__tests__/buyBuff.test.ts
```
Expected: FAIL — "buyBuff is not a function"

- [ ] **Step 3: GameStore interface 에 buyBuff 추가**

`games/inflation-rpg/src/store/gameStore.ts` 의 `interface GameStore` 안 (`recordCycleEnd` 다음 줄, `}` 직전) 에 추가:

```typescript
  // Phase V3-C — buff catalog spend
  buyBuff: (
    buffId: BuffId,
    count: 1 | 10 | 'max',
  ) => { ok: boolean; reason?: 'invalid' | 'zero' | 'insufficient' | 'oneshot'; count?: number; cost?: number };
```

파일 top 의 import 에 `BuffId` 추가:

```typescript
import type { RunState, MetaState, Screen, EquipmentInstance, AllocatedStats, AscTreeNodeId, RelicId, MythicId, IapTransaction, BuffId } from '../types';
```

또 catalog import 추가 (다른 import 들 다음 줄):

```typescript
import { findBuff, nextStepCost, maxAffordable } from '../buff/catalog';
```

- [ ] **Step 4: buyBuff impl 추가**

`useGameStore = create(...)((set, get) => ({ ...` 객체 안에서 다른 actions 가 정의된 곳에 추가 (예: `recordCycleEnd` 다음 줄):

```typescript
      buyBuff(buffId, count) {
        const meta = get().meta;
        const def = findBuff(buffId);
        if (def.isOneShot) return { ok: false, reason: 'oneshot' };
        const lv = meta.buffLevels?.[buffId] ?? 0;
        const light = meta.light ?? 0;
        const n = count === 'max' ? maxAffordable(def, lv, light) : count;
        if (typeof n !== 'number' || n <= 0) return { ok: false, reason: 'zero' };
        const cost = nextStepCost(def, lv, n);
        if (light < cost) return { ok: false, reason: 'insufficient' };
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

- [ ] **Step 5: 테스트 통과 확인**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg vitest run src/buff/__tests__/buyBuff.test.ts
pnpm --filter @forge/game-inflation-rpg typecheck
```
Expected: 모두 PASS

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/buff/__tests__/buyBuff.test.ts
git commit -m "feat(game-inflation-rpg): gameStore.buyBuff action (V3-C)"
```

---

## Task 6: computeLightDelta pure helper (TDD)

**Files:**
- Create: `games/inflation-rpg/src/overworld/lightEmit.ts`
- Test: `games/inflation-rpg/src/overworld/__tests__/lightEmit.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/overworld/__tests__/lightEmit.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import type { OverworldEvent } from '../OverworldEvents';
import { computeLightDelta } from '../lightEmit';

describe('computeLightDelta', () => {
  it('empty events → 0', () => {
    const result = computeLightDelta([], 'enemy');
    expect(result.delta).toBe(0);
    expect(result.breakdown).toEqual([]);
  });

  it('battle_won (enemy, no drop) → 1', () => {
    const evs: OverworldEvent[] = [
      { type: 'battle_won', enemyId: 'e1', expGain: 10, dropId: null },
    ];
    const r = computeLightDelta(evs, 'enemy');
    expect(r.delta).toBe(1);
  });

  it('battle_won (boss, no drop) → 10', () => {
    const evs: OverworldEvent[] = [
      { type: 'battle_won', enemyId: 'b1', expGain: 100, dropId: null },
    ];
    const r = computeLightDelta(evs, 'boss');
    expect(r.delta).toBe(10);
  });

  it('battle_won (enemy + drop) → 1 + 0.5 = 1.5', () => {
    const evs: OverworldEvent[] = [
      { type: 'battle_won', enemyId: 'e1', expGain: 10, dropId: 'iron_sword' },
    ];
    const r = computeLightDelta(evs, 'enemy');
    expect(r.delta).toBe(1.5);
  });

  it('battle_won (boss + drop) → 10 + 0.5 = 10.5', () => {
    const evs: OverworldEvent[] = [
      { type: 'battle_won', enemyId: 'b1', expGain: 100, dropId: 'rare_axe' },
    ];
    const r = computeLightDelta(evs, 'boss');
    expect(r.delta).toBe(10.5);
  });

  it('5 level_up events → 5 × 0.5 = 2.5', () => {
    const evs: OverworldEvent[] = Array.from({ length: 5 }, (_, i) => ({
      type: 'level_up' as const, from: i, to: i + 1,
    }));
    const r = computeLightDelta(evs, 'enemy');
    expect(r.delta).toBe(2.5);
  });

  it('shrine_visited / skill_learned / job_unlocked each +1', () => {
    const evs: OverworldEvent[] = [
      { type: 'shrine_visited', landmarkId: 'sh1', healed: 100 },
      { type: 'skill_learned', skillId: 's1', skillNameKR: '풍참', atkBefore: 50, atkAfter: 60 },
      { type: 'job_unlocked', jobId: 'j1', jobNameKR: '용병', tier: 1 },
    ];
    const r = computeLightDelta(evs, 'shrine');
    expect(r.delta).toBe(3);
  });

  it('excluded events emit 0 (moral_choice, chapter_transition, hero_died, tick, arrived_at, battle_started, cycle_ended)', () => {
    const evs: OverworldEvent[] = [
      { type: 'moral_choice', choice: 'mercy', dim: 'mercy_cruelty', delta: 1, nameKR: '자비' },
      { type: 'chapter_transition', fromChapter: 'childhood', toChapter: 'youth', atAge: 15 },
      { type: 'hero_died', cause: '전사' },
      { type: 'tick', t: 1 },
      { type: 'arrived_at', landmarkId: 'l1', landmarkKind: 'enemy' },
      { type: 'battle_started', enemyId: 'e1' },
      { type: 'cycle_ended' },
    ];
    const r = computeLightDelta(evs, 'enemy');
    expect(r.delta).toBe(0);
  });

  it('combined arrival (battle + drop + 3 level_ups) → 1 + 0.5 + 1.5 = 3', () => {
    const evs: OverworldEvent[] = [
      { type: 'battle_won', enemyId: 'e1', expGain: 30, dropId: 'iron_sword' },
      { type: 'level_up', from: 1, to: 2 },
      { type: 'level_up', from: 2, to: 3 },
      { type: 'level_up', from: 3, to: 4 },
    ];
    const r = computeLightDelta(evs, 'enemy');
    expect(r.delta).toBe(3);
  });

  it('breakdown contains source labels', () => {
    const evs: OverworldEvent[] = [
      { type: 'battle_won', enemyId: 'e1', expGain: 10, dropId: 'iron_sword' },
    ];
    const r = computeLightDelta(evs, 'enemy');
    const sources = r.breakdown.map(b => b.source);
    expect(sources).toContain('kill');
    expect(sources).toContain('drop');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg vitest run src/overworld/__tests__/lightEmit.test.ts
```
Expected: FAIL — "Cannot find module '../lightEmit'"

- [ ] **Step 3: lightEmit.ts 구현**

`games/inflation-rpg/src/overworld/lightEmit.ts`:

```typescript
import type { LandmarkKind } from '../data/landmarks';
import type { OverworldEvent } from './OverworldEvents';

export type LightSource = 'kill' | 'boss_kill' | 'drop' | 'level_up' | 'shrine' | 'skill_learned' | 'job_unlocked';

export interface LightBreakdownEntry {
  source: LightSource;
  amount: number;
}

export interface LightDeltaResult {
  delta: number;
  breakdown: LightBreakdownEntry[];
}

/** Spec §5.1 — controller events → light emit. Pure (no store / no buff rate).
 *  Buff #3 (light_rate) 는 호출자가 별도 곱한다.
 *
 *  Excluded events:
 *  - moral_choice (personality drift, not positive)
 *  - chapter_transition (cinematic, not earned)
 *  - hero_died, tick, arrived_at, battle_started, cycle_ended (system events)
 */
export function computeLightDelta(evs: readonly OverworldEvent[], kind: LandmarkKind): LightDeltaResult {
  let delta = 0;
  const breakdown: LightBreakdownEntry[] = [];

  for (const ev of evs) {
    if (ev.type === 'battle_won') {
      const isBoss = kind === 'boss';
      const killAmt = isBoss ? 10 : 1;
      delta += killAmt;
      breakdown.push({ source: isBoss ? 'boss_kill' : 'kill', amount: killAmt });
      if (ev.dropId) {
        delta += 0.5;
        breakdown.push({ source: 'drop', amount: 0.5 });
      }
    } else if (ev.type === 'level_up') {
      delta += 0.5;
      breakdown.push({ source: 'level_up', amount: 0.5 });
    } else if (ev.type === 'shrine_visited') {
      delta += 1;
      breakdown.push({ source: 'shrine', amount: 1 });
    } else if (ev.type === 'skill_learned') {
      delta += 1;
      breakdown.push({ source: 'skill_learned', amount: 1 });
    } else if (ev.type === 'job_unlocked') {
      delta += 1;
      breakdown.push({ source: 'job_unlocked', amount: 1 });
    }
    // 외 모든 type 은 emit 안 함 (spec §4.1 excluded list)
  }

  return { delta, breakdown };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg vitest run src/overworld/__tests__/lightEmit.test.ts
```
Expected: 모든 테스트 PASS

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/overworld/lightEmit.ts games/inflation-rpg/src/overworld/__tests__/lightEmit.test.ts
git commit -m "feat(game-inflation-rpg): computeLightDelta helper (V3-C)"
```

---

## Task 7: OverworldRunner 가 light 누적 + light_rate buff 적용

**Files:**
- Modify: `games/inflation-rpg/src/screens/OverworldRunner.tsx`

- [ ] **Step 1: import 추가**

`games/inflation-rpg/src/screens/OverworldRunner.tsx` 최상단의 import 블록에 추가:

```typescript
import { computeLightDelta } from '../overworld/lightEmit';
import { getLightRateMul } from '../buff/buffEffects';
```

- [ ] **Step 2: handleArrival 의 evs 처리 안에 light 누적 로직 추가**

기존 `controller.handleArrival(event.landmarkKind, event.landmarkId)` 호출 직후 (line 71 근처, `setHudTick` 호출 직전) 에 다음 블록 삽입:

```typescript
          const { delta: rawDelta } = computeLightDelta(evs, event.landmarkKind);
          if (rawDelta > 0) {
            const rateMul = getLightRateMul(useGameStore.getState().meta);
            const finalDelta = rawDelta * rateMul;
            useGameStore.setState(s => ({
              ...s,
              meta: { ...s.meta, light: (s.meta.light ?? 0) + finalDelta },
            }));
          }
```

NB: 기존 코드에서 `evs` 변수명을 그대로 사용한다 (이미 `const evs = controller.handleArrival(...)` 라인이 있음).

- [ ] **Step 3: Typecheck + 기존 테스트 회귀 확인**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg vitest run
```
Expected: typecheck 0 exit, 기존 vitest 모두 PASS.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/screens/OverworldRunner.tsx
git commit -m "feat(game-inflation-rpg): wire light emit + light_rate buff in OverworldRunner (V3-C)"
```

---

## Task 8: Floating "+N" overlay (UI)

**Files:**
- Modify: `games/inflation-rpg/src/screens/OverworldRunner.tsx`

- [ ] **Step 1: useState + helper 추가**

`OverworldRunner` 함수 안에서 `chapterOverlay` 라인 다음에 추가:

```typescript
  const [lightFloaters, setLightFloaters] = useState<Array<{ key: number; amount: number }>>([]);
```

- [ ] **Step 2: light 누적 직후 floater 푸시**

Task 7 의 `if (rawDelta > 0) { ... }` 블록 안의 setState 호출 다음에 추가:

```typescript
            const floaterKey = Date.now() + Math.random();
            setLightFloaters(prev => [...prev, { key: floaterKey, amount: finalDelta }]);
            setTimeout(() => {
              setLightFloaters(prev => prev.filter(f => f.key !== floaterKey));
            }, 1500);
```

- [ ] **Step 3: JSX 에 overlay 추가**

`hud-light` span 다음에 floating overlay 컨테이너 추가. `hud-light` 라인 (`<span data-testid="hud-light">빛 {meta.light ?? 0}</span>`) 을 다음으로 교체:

```jsx
        <span data-testid="hud-light" style={{ position: 'relative' }}>
          빛 {Math.floor(meta.light ?? 0)}
          <span data-testid="light-floaters" style={{ position: 'absolute', left: '100%', top: 0, marginLeft: 8, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            {lightFloaters.map(f => (
              <span
                key={f.key}
                style={{
                  display: 'inline-block',
                  color: '#ffd54f',
                  fontWeight: 700,
                  animation: 'forgeLightFloat 1.5s ease-out forwards',
                  marginRight: 4,
                }}
              >
                +{f.amount.toFixed(1)}
              </span>
            ))}
          </span>
        </span>
```

`hud-light` 의 표시값을 `Math.floor` 처리 — float 누적이 보기 흉하지 않도록.

- [ ] **Step 4: CSS keyframe 추가**

OverworldRunner 의 기존 `<style>` 블록 안 (`@keyframes forgeChapterFade` 다음) 에 추가:

```css
        @keyframes forgeLightFloat {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-12px); }
        }
```

- [ ] **Step 5: Typecheck**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```
Expected: 0 exit

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/src/screens/OverworldRunner.tsx
git commit -m "feat(game-inflation-rpg): floating +N light overlay (V3-C)"
```

---

## Task 9: SpendModal.tsx 컴포넌트

**Files:**
- Create: `games/inflation-rpg/src/screens/SpendModal.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`games/inflation-rpg/src/screens/SpendModal.tsx`:

```tsx
import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { BUFF_CATALOG, type BuffDef, nextStepCost, singleStepCost, maxAffordable } from '../buff/catalog';
import { getRejuvDiscount } from '../buff/buffEffects';
import { rejuvenationCost } from '../hero/rejuvenation';

interface Props {
  onClose: () => void;
}

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 100,
};
const modalStyle: React.CSSProperties = {
  width: 'min(420px, 92vw)', maxHeight: '80vh',
  background: '#1a1d28', color: '#eee',
  borderRadius: 12, border: '1px solid #444',
  display: 'flex', flexDirection: 'column',
  paddingBottom: 'env(safe-area-inset-bottom)',
};
const headerStyle: React.CSSProperties = {
  padding: '12px 16px', borderBottom: '1px solid #333',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};
const bodyStyle: React.CSSProperties = {
  overflowY: 'auto', overscrollBehavior: 'contain',
  padding: '8px 0',
};
const cardStyle: React.CSSProperties = {
  padding: '12px 16px', borderBottom: '1px solid #2a2d38',
};
const btnRowStyle: React.CSSProperties = {
  display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap',
};
const btnStyle = (disabled: boolean): React.CSSProperties => ({
  minHeight: 44, padding: '8px 12px',
  background: disabled ? '#2a2d38' : '#3b4252',
  color: disabled ? '#666' : '#eee',
  border: '1px solid #555', borderRadius: 6,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 13,
});

export function SpendModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const buyBuff = useGameStore(s => s.buyBuff);
  const rejuvenateHero = useCycleStoreV2(s => s.rejuvenateHero);
  const controller = useCycleStoreV2(s => s.controller);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const light = Math.floor(meta.light ?? 0);
  const hero = controller?.getHero();
  const heroAge = hero?.age ?? 5;
  const discount = getRejuvDiscount(meta);
  const oneshotCost = Math.ceil(rejuvenationCost(heroAge) * (1 - discount));
  const oneshotDisabled = light < oneshotCost || heroAge <= 5;

  return (
    <div data-testid="spend-modal-backdrop" style={modalBackdropStyle} onClick={onClose}>
      <div data-testid="spend-modal" style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <strong>신의 메뉴</strong>
          <span data-testid="spend-modal-light">빛: {light}</span>
          <button type="button" data-testid="spend-modal-close" onClick={onClose} style={btnStyle(false)}>✕</button>
        </div>
        <div style={bodyStyle}>
          {BUFF_CATALOG.map(def => def.isOneShot ? (
            <div key={def.id} style={cardStyle}>
              <div><strong>{def.nameKR}</strong></div>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
                {def.descKR} · 현재 hero {heroAge}세 → {Math.max(5, heroAge - 5)}세
              </div>
              <div style={btnRowStyle}>
                <button
                  type="button"
                  data-testid={`buff-oneshot-rejuv-1`}
                  disabled={oneshotDisabled}
                  onClick={() => { if (!oneshotDisabled) rejuvenateHero(5); }}
                  style={btnStyle(oneshotDisabled)}
                >
                  1번 쓰기: {oneshotCost} 빛
                </button>
              </div>
            </div>
          ) : (
            <BuffCard
              key={def.id}
              def={def}
              currentLv={meta.buffLevels?.[def.id] ?? 0}
              light={light}
              onBuy={(count) => buyBuff(def.id, count)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface CardProps {
  def: BuffDef;
  currentLv: number;
  light: number;
  onBuy: (count: 1 | 10 | 'max') => void;
}

function BuffCard({ def, currentLv, light, onBuy }: CardProps) {
  const cost1 = singleStepCost(def, currentLv);
  const cost10 = nextStepCost(def, currentLv, 10);
  const maxN = maxAffordable(def, currentLv, light);
  const costMax = maxN > 0 ? nextStepCost(def, currentLv, maxN) : 0;
  const capReached = def.cap !== undefined &&
    ((def.perLevel > 0 && currentLv * def.perLevel >= def.cap) ||
     (def.perLevel < 0 && 1 + currentLv * def.perLevel <= def.cap));

  return (
    <div style={cardStyle} data-testid={`buff-card-${def.id}`}>
      <div>
        <strong>{def.nameKR}</strong>
        <span style={{ marginLeft: 8, color: '#aaa' }}>Lv {currentLv}</span>
        {capReached && <span style={{ marginLeft: 8, color: '#888', fontSize: 11 }}>최대</span>}
      </div>
      <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{def.descKR}</div>
      <div style={btnRowStyle}>
        <button
          type="button"
          data-testid={`buff-${def.id}-x1`}
          disabled={light < cost1}
          onClick={() => onBuy(1)}
          style={btnStyle(light < cost1)}
        >
          ×1: {cost1}
        </button>
        <button
          type="button"
          data-testid={`buff-${def.id}-x10`}
          disabled={light < cost10}
          onClick={() => onBuy(10)}
          style={btnStyle(light < cost10)}
        >
          ×10: {cost10}
        </button>
        <button
          type="button"
          data-testid={`buff-${def.id}-xmax`}
          disabled={maxN === 0}
          onClick={() => onBuy('max')}
          style={btnStyle(maxN === 0)}
        >
          ×Max: {maxN > 0 ? `${maxN}개 ${costMax}` : '불가'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```
Expected: 0 exit

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/screens/SpendModal.tsx
git commit -m "feat(game-inflation-rpg): SpendModal component (V3-C)"
```

---

## Task 10: OverworldRunner 의 신의 메뉴 버튼 + 회춘 5년 버튼 제거

**Files:**
- Modify: `games/inflation-rpg/src/screens/OverworldRunner.tsx`

- [ ] **Step 1: import + state 추가**

`OverworldRunner.tsx` 최상단 import 블록 끝에 추가:

```typescript
import { SpendModal } from './SpendModal';
```

`OverworldRunner` 함수 안 lightFloaters 다음 줄에 추가:

```typescript
  const [spendModalOpen, setSpendModalOpen] = useState(false);
```

`useCycleStoreV2(s => s.rejuvenateHero)` 라인은 SpendModal 이 자체로 호출하므로 OverworldRunner 에서는 더 이상 직접 쓰지 않는다. 따로 제거하지 않고 둬도 무방하나, 미사용 경고가 뜨면 제거.

- [ ] **Step 2: 회춘 5년 버튼 제거 + 신의 메뉴 버튼 추가**

`<button … data-testid="rejuvenate-button"…> 회춘 5년 (…) </button>` 한 줄 (form line 130-138 부근) 을 다음으로 교체:

```jsx
        <button
          type="button"
          onClick={() => setSpendModalOpen(true)}
          data-testid="open-spend-modal"
          style={{ marginLeft: 8, padding: '4px 8px', fontSize: 12 }}
        >
          신의 메뉴
        </button>
```

또 `rejuvenateHero` import 줄을 제거해도 typecheck OK 인지 확인 후 정리.

- [ ] **Step 3: Modal mount**

`<div ref={containerRef} … />` 다음 줄, `<style>{` 직전에 추가:

```jsx
      {spendModalOpen && <SpendModal onClose={() => setSpendModalOpen(false)} />}
```

- [ ] **Step 4: Typecheck + 기존 vitest 회귀 확인**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg vitest run
```
Expected: typecheck 0 exit, vitest 모두 PASS

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/screens/OverworldRunner.tsx
git commit -m "feat(game-inflation-rpg): replace temp 회춘 button with 신의 메뉴 modal (V3-C)"
```

---

## Task 11: cycleSliceV2.rejuvenateHero 에 discount 적용

**Files:**
- Modify: `games/inflation-rpg/src/overworld/cycleSliceV2.ts`
- Modify: `games/inflation-rpg/src/overworld/__tests__/cycleSliceV2.test.ts` (회귀 + 신규 케이스)

- [ ] **Step 1: 신규 테스트 케이스 작성**

`games/inflation-rpg/src/overworld/__tests__/cycleSliceV2.test.ts` 의 기존 rejuvenateHero describe 블록 안 (또는 새 describe) 에 추가. 먼저 파일을 읽어 기존 패턴 파악 후, 동일 패턴으로:

```typescript
import { useCycleStoreV2 } from '../cycleSliceV2';
import { useGameStore } from '../../store/gameStore';
import { CycleControllerV2 } from '../CycleControllerV2';
// ... (기존 import 들)

describe('rejuvenateHero with discount', () => {
  beforeEach(() => {
    useGameStore.setState(s => ({
      ...s,
      meta: { ...s.meta, light: 10000, buffLevels: {} },
    }));
    useCycleStoreV2.getState().reset();
  });

  it('Lv 0 discount → full cost', () => {
    // 기존 patten 으로 controller start
    useCycleStoreV2.getState().start({ seed: 1 });
    const ctrl = useCycleStoreV2.getState().controller!;
    const hero = ctrl.getHero();
    // hero age 를 인위로 25로 만들기 — actionCount 적당히 시뮬
    // (실제 패턴은 기존 test 파일 확인 후 매칭. 아래는 의도만 표현.)
    while (hero.age < 25) hero.tickAge();
    const baseCost = (hero.age - 5) * 10;
    const lightBefore = useGameStore.getState().meta.light!;
    useCycleStoreV2.getState().rejuvenateHero(5);
    expect(useGameStore.getState().meta.light).toBe(lightBefore - baseCost);
  });

  it('Lv 5 discount (0.25) → cost × 0.75 (ceil)', () => {
    useGameStore.setState(s => ({
      ...s,
      meta: { ...s.meta, light: 10000, buffLevels: { rejuv_discount: 5 } },
    }));
    useCycleStoreV2.getState().start({ seed: 1 });
    const ctrl = useCycleStoreV2.getState().controller!;
    const hero = ctrl.getHero();
    while (hero.age < 25) hero.tickAge();
    const baseCost = (hero.age - 5) * 10;  // 25-5=20*10=200
    const expectedCost = Math.ceil(baseCost * 0.75);  // 150
    const lightBefore = useGameStore.getState().meta.light!;
    useCycleStoreV2.getState().rejuvenateHero(5);
    expect(useGameStore.getState().meta.light).toBe(lightBefore - expectedCost);
  });
});
```

**중요:** 위 코드는 의도 표현용. 실제 작성 시 `cycleSliceV2.test.ts` 의 기존 `start({ seed: 1 })` opts 형태가 다르면 그 패턴에 맞춰 조정. controller opts 의 정확한 minimal config 은 기존 test 의 패턴 따라가기.

- [ ] **Step 2: 테스트 실패 확인 (Lv 5 케이스가 fail)**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg vitest run src/overworld/__tests__/cycleSliceV2.test.ts
```
Expected: "Lv 5 discount" 케이스 FAIL (200 차감 vs 150 기대)

- [ ] **Step 3: cycleSliceV2.rejuvenateHero 에 discount 적용**

`games/inflation-rpg/src/overworld/cycleSliceV2.ts` 의 import 에 추가:

```typescript
import { getRejuvDiscount } from '../buff/buffEffects';
```

`rejuvenateHero(years)` 함수의 cost 계산 부분을 변경. 기존:

```typescript
    const cost = rejuvenationCost(hero.age);
```

다음으로 교체:

```typescript
    const meta = useGameStore.getState().meta;
    const baseCost = rejuvenationCost(hero.age);
    const discount = getRejuvDiscount(meta);
    const cost = Math.ceil(baseCost * (1 - discount));
```

그리고 `const light = useGameStore.getState().meta.light ?? 0;` 줄을 `const light = meta.light ?? 0;` 로 simplify (meta 가 위에서 이미 lookup 됨).

- [ ] **Step 4: 테스트 통과 확인**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg vitest run src/overworld/__tests__/cycleSliceV2.test.ts
```
Expected: 모두 PASS (Lv 0 baseline + Lv 5 discount)

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/overworld/cycleSliceV2.ts games/inflation-rpg/src/overworld/__tests__/cycleSliceV2.test.ts
git commit -m "feat(game-inflation-rpg): apply rejuv_discount buff to cycleSliceV2.rejuvenateHero (V3-C)"
```

---

## Task 12: EncounterEngine dropChanceBonus opt + drop_chance buff wire

**Files:**
- Modify: `games/inflation-rpg/src/overworld/EncounterEngine.ts`
- Modify: `games/inflation-rpg/src/overworld/CycleControllerV2.ts`
- Modify: `games/inflation-rpg/src/screens/OverworldRunner.tsx`

- [ ] **Step 1: EncounterEngine 에 옵션 주입 path 추가**

`games/inflation-rpg/src/overworld/EncounterEngine.ts` 의 class constructor 와 drop chance 계산을 옵션화. 기존:

```typescript
export class EncounterEngine {
  constructor(private rng: SeededRng) {}
  // ...
  resolveEncounter(...) {
    // ...
    const dropOdds = isBoss ? 0.8 : DROP_RATE;
```

다음으로 변경:

```typescript
export interface EncounterEngineOpts {
  /** Additive bonus to drop chance from V3-C drop_chance buff. */
  dropChanceBonus?: number;
}

export class EncounterEngine {
  constructor(private rng: SeededRng, private opts: EncounterEngineOpts = {}) {}
  // ...
  resolveEncounter(...) {
    // ...
    const baseDropOdds = isBoss ? 0.8 : DROP_RATE;
    const dropOdds = Math.min(1, baseDropOdds + (this.opts.dropChanceBonus ?? 0));
```

**중요:** `(this.opts.dropChanceBonus ?? 0)` 가 default 0 이므로 기존 호출자는 영향 없음.

- [ ] **Step 2: CycleControllerV2 에 opts 전달 path 추가**

`games/inflation-rpg/src/overworld/CycleControllerV2.ts` 의 `CycleControllerV2Opts` interface (또는 type) 에 추가:

```typescript
  /** V3-C — buff snapshot 을 매 arrival 마다 새로 읽어오는 callback. */
  getBuffSnapshot?: () => { dropChanceBonus: number; agingSpeedMul: number };
```

`constructor` 안의 `this.encounter = new EncounterEngine(new SeededRng(opts.seed ^ 0xdeadbeef));` 라인을 다음으로 변경:

```typescript
    this.encounter = new EncounterEngine(new SeededRng(opts.seed ^ 0xdeadbeef));
    this.getBuffSnapshot = opts.getBuffSnapshot;
```

class 의 private field 추가 (다른 private field 들과 함께):

```typescript
  private getBuffSnapshot?: () => { dropChanceBonus: number; agingSpeedMul: number };
```

`handleArrival` 진입부에서 EncounterEngine 의 opts 갱신 (resolveEncounter 호출 직전):

```typescript
    if (this.getBuffSnapshot) {
      const snap = this.getBuffSnapshot();
      (this.encounter as EncounterEngine & { opts: EncounterEngineOpts }).opts = {
        ...(this.encounter as unknown as { opts: EncounterEngineOpts }).opts,
        dropChanceBonus: snap.dropChanceBonus,
      };
    }
```

NB: 위 cast 가 보기 흉하면 EncounterEngine 에 `setOpts(opts: EncounterEngineOpts)` 메서드를 추가하고 그것을 호출:

EncounterEngine 에 method 추가:

```typescript
  setOpts(opts: EncounterEngineOpts): void {
    this.opts = { ...this.opts, ...opts };
  }
```

그러면 CycleControllerV2:

```typescript
    if (this.getBuffSnapshot) {
      const snap = this.getBuffSnapshot();
      this.encounter.setOpts({ dropChanceBonus: snap.dropChanceBonus });
    }
```

`EncounterEngineOpts` 와 `EncounterEngine` import 도 추가.

- [ ] **Step 3: OverworldRunner 가 getBuffSnapshot 주입**

`games/inflation-rpg/src/screens/OverworldRunner.tsx` 에서 controller 가 어디서 생성되는지 확인. cycleSliceV2.start(opts) 호출로 생성됨 → cycleSliceV2 의 start 또는 호출 측에 getBuffSnapshot 추가.

`games/inflation-rpg/src/overworld/cycleSliceV2.ts` 의 `start(opts)` 안 controller 생성 직전에 default `getBuffSnapshot` 주입. 기존:

```typescript
  start(opts) {
    const ctrl = new CycleControllerV2(opts);
```

다음으로 변경:

```typescript
  start(opts) {
    const ctrl = new CycleControllerV2({
      ...opts,
      getBuffSnapshot: opts.getBuffSnapshot ?? (() => {
        const meta = useGameStore.getState().meta;
        const { getDropChanceBonus, getAgingSpeedMul } = require('../buff/buffEffects') as typeof import('../buff/buffEffects');
        return { dropChanceBonus: getDropChanceBonus(meta), agingSpeedMul: getAgingSpeedMul(meta) };
      }),
    });
```

**NB:** `require` 가 보기 흉하면 top import 로 옮기기:

```typescript
import { getDropChanceBonus, getAgingSpeedMul } from '../buff/buffEffects';
```

후 default 안에서 직접 사용:

```typescript
      getBuffSnapshot: opts.getBuffSnapshot ?? (() => {
        const meta = useGameStore.getState().meta;
        return {
          dropChanceBonus: getDropChanceBonus(meta),
          agingSpeedMul: getAgingSpeedMul(meta),
        };
      }),
```

- [ ] **Step 4: Headless sim 회귀 확인 (sim:cycle CLI 사용)**

sim driver (예: `scripts/sim-cycle.ts` 등) 가 CycleControllerV2 를 직접 호출 시 getBuffSnapshot 을 전달하지 않으면 buff 영향 없이 baseline 진행. 이것이 의도. Run:

```bash
pnpm --filter @forge/game-inflation-rpg vitest run src/overworld/__tests__
pnpm --filter @forge/game-inflation-rpg typecheck
```
Expected: 모두 PASS

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/overworld/EncounterEngine.ts games/inflation-rpg/src/overworld/CycleControllerV2.ts games/inflation-rpg/src/overworld/cycleSliceV2.ts
git commit -m "feat(game-inflation-rpg): wire drop_chance buff via EncounterEngine opts (V3-C)"
```

---

## Task 13: HeroEntity.tickAge agingMul 파라미터 + aging_slow buff wire

**Files:**
- Modify: `games/inflation-rpg/src/hero/HeroEntity.ts`
- Modify: `games/inflation-rpg/src/overworld/CycleControllerV2.ts`
- Test: `games/inflation-rpg/src/hero/__tests__/HeroEntity.test.ts` (기존 파일 — 패턴 확인 후 추가)

- [ ] **Step 1: 실패 테스트 작성**

기존 `HeroEntity.test.ts` 에 새 describe 추가:

```typescript
describe('tickAge with agingMul (V3-C aging_slow buff)', () => {
  it('agingMul 1.0 (default) advances actionCount by 1 per tick', () => {
    const hero = new HeroEntity({ /* spawn opts — 기존 패턴 따라 */ });
    const start = hero.actionCount;
    hero.tickAge();
    expect(hero.actionCount).toBe(start + 1);
  });

  it('agingMul 0.5 accumulates fractional, advances actionCount on every 2nd tick', () => {
    const hero = new HeroEntity({ /* opts */ });
    const start = hero.actionCount;
    hero.tickAge(0.5);
    expect(hero.actionCount).toBe(start);  // 0.5 누적, 아직 1 미만
    hero.tickAge(0.5);
    expect(hero.actionCount).toBe(start + 1);  // 1.0 누적 → 1 tick
  });

  it('agingMul 0.5 over 10 ticks advances by 5', () => {
    const hero = new HeroEntity({ /* opts */ });
    const start = hero.actionCount;
    for (let i = 0; i < 10; i++) hero.tickAge(0.5);
    expect(hero.actionCount).toBe(start + 5);
  });
});
```

**중요:** `HeroEntity.test.ts` 파일이 없거나 다른 이름이면 기존 hero/__tests__/ 디렉토리 ls 로 확인. 가까운 패턴 따라가기.

- [ ] **Step 2: 테스트 실패 확인**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg vitest run src/hero/__tests__/HeroEntity
```
Expected: agingMul 케이스 FAIL ("tickAge takes 0 args")

- [ ] **Step 3: HeroEntity.tickAge 시그니처 + 누적 accumulator**

`games/inflation-rpg/src/hero/HeroEntity.ts` 의 `actionCount: number = 0;` 근처에 추가:

```typescript
  private agingAccum: number = 0;
```

`tickAge` 변경:

```typescript
  /** V3-B aging mechanic + V3-C aging_slow buff.
   *  agingMul (default 1.0) 가 < 1.0 이면 fractional accumulator 로 늦춤. */
  tickAge(agingMul: number = 1.0): void {
    this.agingAccum += agingMul;
    while (this.agingAccum >= 1.0) {
      this.agingAccum -= 1.0;
      this.actionCount += 1;
    }
    this.age = HeroLifecycle.ageFromActions(this.actionCount);
    this.chapter = HeroLifecycle.chapterForAge(this.age);
    this.recomputeStats();
  }
```

**중요:** 만약 actionCount 가 늘지 않은 turn (0.5 누적) 에서도 chapter/age 재계산 + recomputeStats 가 발생. 이 호출은 idempotent 이라 안전 (action 이 같으면 age 결과도 같음).

- [ ] **Step 4: CycleControllerV2 가 agingMul 전달**

`games/inflation-rpg/src/overworld/CycleControllerV2.ts` 의 `this.hero.tickAge()` 호출 두 곳 (handleArrival 진입부 + 마지막) 을 다음으로 변경:

```typescript
      const agingMul = this.getBuffSnapshot?.().agingSpeedMul ?? 1.0;
      this.hero.tickAge(agingMul);
```

두 호출 모두 동일하게.

- [ ] **Step 5: 테스트 통과 확인**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg vitest run
pnpm --filter @forge/game-inflation-rpg typecheck
```
Expected: 모든 vitest PASS, typecheck 0 exit

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/src/hero/HeroEntity.ts games/inflation-rpg/src/overworld/CycleControllerV2.ts games/inflation-rpg/src/hero/__tests__/
git commit -m "feat(game-inflation-rpg): aging_slow buff via tickAge fractional accumulator (V3-C)"
```

---

## Task 14: OverworldRunner 가 move_speed buff 를 scene speed 에 곱

**Files:**
- Modify: `games/inflation-rpg/src/screens/OverworldRunner.tsx`

- [ ] **Step 1: import 추가**

```typescript
import { getMoveSpeedMul } from '../buff/buffEffects';
```

- [ ] **Step 2: setSceneSpeedRef 호출 부분 변경**

기존:

```typescript
  useEffect(() => {
    setSceneSpeedRef.current?.(speed);
  }, [speed]);
```

다음으로 변경:

```typescript
  const moveMul = getMoveSpeedMul(meta);
  useEffect(() => {
    setSceneSpeedRef.current?.(speed * moveMul);
  }, [speed, moveMul]);
```

bootPhaser 의 `initialSpeed` 인자도 buff 곱 적용:

```typescript
    bootPhaser(
      containerRef.current,
      (event) => { /* ... */ },
      controller.getHero(),
      controller.getDecisionAI(),
      controller.getSeed(),
      speed * moveMul,  // V3-C: move_speed buff 곱
    ).then(/* ... */);
```

NB: `moveMul` 이 effect dep 에 들어가면 buff Lv 변경 시 effect re-run → setSceneSpeedRef 가 새 timeScale 적용. 단 effect 재실행으로 Phaser game 자체가 destroy/recreate 되는 것을 피해야 함. 첫 effect (Phaser boot) 의 deps 는 `[status, controller, onCycleEnd, endCycle]` 그대로 유지 (moveMul 미포함).

- [ ] **Step 3: Typecheck + 회귀 확인**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg vitest run
```
Expected: 모두 PASS

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/screens/OverworldRunner.tsx
git commit -m "feat(game-inflation-rpg): wire move_speed buff to scene tween speed (V3-C)"
```

---

## Task 15: E2E test — spend modal + light emit

**Files:**
- Create: `games/inflation-rpg/e2e/v3-c-spend-modal.spec.ts`

- [ ] **Step 1: 기존 e2e 패턴 확인**

기존 E2E 파일 하나 (예: `e2e/v3-b-aging.spec.ts` 또는 V3-A 의 spec) 를 읽어 dev server 시작 + 사이클 시작 패턴 확인:

```bash
ls games/inflation-rpg/e2e/
```

확인된 패턴을 그대로 따라간다. 아래 코드는 일반 패턴 — 실제 작성 시 기존 file 패턴에 맞춰 조정.

- [ ] **Step 2: E2E test 작성**

`games/inflation-rpg/e2e/v3-c-spend-modal.spec.ts`:

```typescript
import { expect, test } from '@playwright/test';

test.describe('V3-C — spend modal + light emit', () => {
  test('적 처치 후 hud-light 증가 + 신의 메뉴 → 첫 buff 구매', async ({ page }) => {
    await page.goto('/');
    // 사이클 시작 — 기존 e2e 의 시작 버튼 testid 사용
    await page.getByTestId('start-cycle').click();

    // overworld 도착 + 잠시 진행 — 적어도 한번의 arrival
    await page.waitForSelector('[data-testid="hud-light"]', { timeout: 10000 });
    // hud-light 의 텍스트가 "빛 0" 가 아닌 양수로 바뀔 때까지 polling (max 30s)
    await expect(async () => {
      const text = await page.getByTestId('hud-light').innerText();
      const m = text.match(/빛 (\d+)/);
      const value = m ? Number(m[1]) : 0;
      expect(value).toBeGreaterThan(0);
    }).toPass({ timeout: 30000 });

    // 신의 메뉴 열기
    await page.getByTestId('open-spend-modal').click();
    await expect(page.getByTestId('spend-modal')).toBeVisible();

    // 첫 buff (move_speed) ×1 클릭 — light 충분하면 enabled, 부족하면 wait
    // light 100 이상이 될 때까지 modal 닫고 기다린 후 다시 열기
    let enough = false;
    for (let i = 0; i < 10; i++) {
      const txt = await page.getByTestId('hud-light').innerText();
      const m = txt.match(/빛 (\d+)/);
      const v = m ? Number(m[1]) : 0;
      if (v >= 100) { enough = true; break; }
      await page.waitForTimeout(3000);
    }
    expect(enough).toBe(true);

    // modal 다시 열기 (이미 열려있을 수도) + buff buy
    if (!(await page.getByTestId('spend-modal').isVisible())) {
      await page.getByTestId('open-spend-modal').click();
    }
    const buyBtn = page.getByTestId('buff-move_speed-x1');
    await buyBtn.click();

    // close modal + 회춘 5년 임시 버튼이 없는지 확인
    await page.getByTestId('spend-modal-close').click();
    await expect(page.getByTestId('spend-modal')).not.toBeVisible();
    await expect(page.getByTestId('rejuvenate-button')).toHaveCount(0);
  });
});
```

**중요:** `start-cycle` testid 가 실제와 다를 수 있음. 기존 V3-A/B E2E 파일에서 사이클 시작 path 확인 후 동일 testid 사용.

- [ ] **Step 3: E2E 실행**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg e2e v3-c-spend-modal
```
Expected: PASS (1 test)

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/e2e/v3-c-spend-modal.spec.ts
git commit -m "test(game-inflation-rpg): E2E spend modal + light emit (V3-C)"
```

---

## Task 16: 전체 검증 + lint + circular + merge

**Files:** 없음 (검증 + merge)

- [ ] **Step 1: 전체 vitest**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg vitest run
```
Expected: 모든 테스트 PASS (목표: 940+ tests)

- [ ] **Step 2: 전체 typecheck (모든 workspace)**

Run:
```bash
pnpm typecheck
```
Expected: 0 exit

- [ ] **Step 3: Lint + circular**

Run:
```bash
pnpm lint
pnpm circular
```
Expected: 0 exit each

- [ ] **Step 4: 전체 E2E (smoke + V3-A/B/C)**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg e2e
```
Expected: 모든 E2E PASS

- [ ] **Step 5: Manual QA — dev shell 에서 30초 idle**

Run:
```bash
pnpm dev
```
브라우저 `http://localhost:3000` 에서:
- 사이클 시작
- 30초 정도 hero 움직이게 두기
- HUD 의 빛 카운터가 증가하는지 확인
- floating "+N" 텍스트가 적 처치 시 떠오르는지 확인
- "신의 메뉴" 버튼 클릭 → modal 열림 확인
- buff 카드 ×1 클릭 → light 차감 + Lv 1 표시 확인
- modal 외부 클릭 → 닫힘 확인
- 회춘 5년 임시 버튼은 더 이상 없음 확인

- [ ] **Step 6: main 머지 + tag**

`feat/phase-v3-c-light-buff` 의 모든 commit 검토 후 main 으로 머지. **`--no-ff`** 로 머지 (Phase 완료 명시):

```bash
git checkout main
git merge --no-ff feat/phase-v3-c-light-buff -m "Merge feat/phase-v3-c-light-buff: V3-C 신의 빛 + buff catalog + spend modal"
git tag phase-v3-c-complete
```

- [ ] **Step 7: STATUS + memory 업데이트 (사용자 명시 후)**

머지 후 사용자에게 보고. 사용자 명시 시 STATUS 파일 갱신 + memory project entry 추가.

---

## Self-Review

**Spec coverage check** (sub-spec `2026-05-23-phase-v3-c-light-buff-design.md`):
- §1 Scope ✓ (T1-T14 가 7 buff full + modal + light wire)
- §2 결정 사항 9개 ✓ (각 task 에서 구현)
- §3 Architecture (신규/수정 파일) ✓ (모든 파일이 어느 task 에서 만들어지는지 명시)
- §4 Light Emit (excluded list, breakdown) ✓ (T6 unit test 가 excluded 검증)
- §5 Buff Catalog (cap, oneshot, selector wire) ✓ (T2 + T3 + T11/12/13/14)
- §6 Spend Modal UI ✓ (T9 + T10)
- §7 Persist v19→v20 ✓ (T4)
- §8 Testing (unit + E2E) ✓ (T2, T3, T5, T6, T11, T13, T15)
- §9 성공 기준 ✓ (T16 의 manual QA + E2E + 곡선 확인)
- §10 위험 — R6 (rejuvenation.test discount 회귀) → T11 의 unit test 가 회귀 case 포함

**Placeholder scan:**
- Task 11 의 `import` 패턴, Task 13 의 `HeroEntity({...})` opts — 기존 pattern 의 정확한 시그니처는 실행 시 파악 (이미 "기존 패턴 확인 후" 명시함, 이는 placeholder 아닌 reproducible 안내).
- Task 15 의 testid (`start-cycle`) — 기존 E2E 파일에서 확인 명시.

**Type consistency:**
- `BuffId` (T1) → catalog.ts (T2) → buffEffects (T3) → gameStore.buyBuff (T5) → SpendModal (T9) 일관 ✓
- `getBuffSnapshot` callback shape `{ dropChanceBonus, agingSpeedMul }` — T12 정의 ↔ T13 consume ↔ T12 의 cycleSliceV2 default 일치 ✓
- `MetaState.buffLevels: Partial<Record<BuffId, number>>` (T1) → selectors lvOf 안전 lookup (T3) ↔ migrate 의 `{}` 초기화 (T4) 일치 ✓

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-23-phase-v3-c-light-buff.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
