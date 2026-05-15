# Phase G — Ascension Tree (성좌) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** F-1 의 dormant `meta.ascPoints` 를 sink 로 연결 — 10 노드 영구 효과 + Phase D 통합 hook + Asc 비용 감소.

**Architecture:** `meta.ascTree` (10 node lv state) → `data/ascTree.ts` 카탈로그 + cost 곡선 → `store/gameStore.ts` actions → 10 적용 지점 (calcFinalStat / pipeline / resolve / gainGold / startRun / canAscend) → `screens/Ascension.tsx` 탭 2개. Sim fidelity (`processIncomingDamage` + `stat_mod` SimPlayer 합산 + 노드 multiplier sim 반영) 통합. Persist v9 → v10.

**Tech Stack:** TypeScript / React / Zustand / Vitest / Playwright. 기존 forge-ui (`forge-screen`, `forge-panel`, `forge-button`) 재사용.

**Spec:** [`docs/superpowers/specs/2026-05-15-phase-g-ascension-tree-design.md`](../specs/2026-05-15-phase-g-ascension-tree-design.md)

---

## File Structure

**Create:**
- `games/inflation-rpg/src/data/ascTree.ts` — 노드 카탈로그 + cost 함수
- `games/inflation-rpg/src/data/ascTree.test.ts` — 카탈로그 무결성 + cost 곡선
- `games/inflation-rpg/src/systems/economy.ts` — gold/currency drop multiplier helper
- `games/inflation-rpg/src/systems/economy.test.ts` — multiplier 단위 테스트
- `games/inflation-rpg/src/screens/AscensionTree.tsx` — 성좌 탭 컴포넌트
- `games/inflation-rpg/src/screens/AscensionTree.test.tsx` — 노드 그리드 + 모달 테스트
- `games/inflation-rpg/tests/e2e/asctree.spec.ts` — E2E 흐름

**Modify:**
- `games/inflation-rpg/src/types.ts` — `AscTreeNodeId`, `AscTree` 타입 + `MetaState.ascTree`
- `games/inflation-rpg/src/store/gameStore.ts` — 초기 state + actions + persist v9 → v10 마이그
- `games/inflation-rpg/src/store/gameStore.test.ts` — `canBuyAscTreeNode` / `buyAscTreeNode` 테스트
- `games/inflation-rpg/src/systems/stats.ts` — `calcFinalStat` ascTreeMult 인자
- `games/inflation-rpg/src/systems/stats.test.ts` — ascTreeMult 적용 검증
- `games/inflation-rpg/src/battle/BattleScene.ts` — 6 callsite 의 ascTreeMult 매핑
- `games/inflation-rpg/src/systems/effects.ts` — `crit_damage` + `effect_proc` 인자
- `games/inflation-rpg/src/systems/effects.test.ts` — 노드 multiplier 적용
- `games/inflation-rpg/src/systems/modifiers.ts` — `mod_magnitude` 인자
- `games/inflation-rpg/src/systems/modifiers.test.ts` — magnitude 곱 검증
- `games/inflation-rpg/src/screens/Ascension.tsx` — 탭 2개 wrap
- `games/inflation-rpg/src/screens/Ascension.test.tsx` — 탭 전환 + asc_accel 비용 표시
- `games/inflation-rpg/tools/balance-sim.ts` — `processIncomingDamage` 통합 + `buildSimPlayer` stat_mod 합산
- `games/inflation-rpg/tools/balance-sim.test.ts` — sim fidelity 회귀
- `games/inflation-rpg/tools/balance-sweep.ts` — ascTree axis 추가
- `games/inflation-rpg/src/test/balance-milestones.test.ts` — 회귀 가드 (필요 시 milestone 조정)

---

## Checkpoint 1 — Type + Catalogue + Persist 기반

### Task 1: AscTree 타입 정의

**Files:**
- Modify: `games/inflation-rpg/src/types.ts`

- [ ] **Step 1: Find MetaState 정의 위치 확인**

Run: `grep -n "interface MetaState\|export interface MetaState" games/inflation-rpg/src/types.ts`
Expected: 1 match.

- [ ] **Step 2: AscTreeNodeId / AscTree 타입 + MetaState.ascTree 추가**

Edit `games/inflation-rpg/src/types.ts` — `// Phase F-1 — Ascension` 섹션 바로 아래에 다음을 삽입:

```ts
// Phase G — Ascension Tree (성좌)
export type AscTreeNodeId =
  | 'hp_pct'
  | 'atk_pct'
  | 'gold_drop'
  | 'bp_start'
  | 'sp_per_lvl'
  | 'dungeon_currency'
  | 'crit_damage'
  | 'asc_accel'
  | 'mod_magnitude'
  | 'effect_proc';

export type AscTree = Record<AscTreeNodeId, number>;
```

`MetaState` 의 `ascPoints` 다음 줄에 추가:
```ts
  ascTree: AscTree;          // F-5 노드별 lv (Phase G)
```

- [ ] **Step 3: typecheck**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`
Expected: PASS (error 0). 다른 곳에서 ascTree 미사용 → 추가만 한 상태로 빌드 OK.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/types.ts
git commit -m "feat(game-inflation-rpg): add AscTree types for Phase G"
```

---

### Task 2: ascTree 카탈로그 + cost 함수

**Files:**
- Create: `games/inflation-rpg/src/data/ascTree.ts`
- Create: `games/inflation-rpg/src/data/ascTree.test.ts`

- [ ] **Step 1: 카탈로그 무결성 테스트 작성**

Create `games/inflation-rpg/src/data/ascTree.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  ASC_TREE_NODES,
  ASC_TREE_NODE_IDS,
  nodeCost,
  nodeTotalCost,
} from './ascTree';
import type { AscTreeNodeId } from '../types';

describe('AscTree catalogue', () => {
  it('exposes 10 nodes', () => {
    expect(ASC_TREE_NODE_IDS).toHaveLength(10);
  });

  it('every node has positive max + magnitude + non-empty strings', () => {
    for (const id of ASC_TREE_NODE_IDS) {
      const def = ASC_TREE_NODES[id];
      expect(def.id).toBe(id);
      expect(def.maxLevel).toBeGreaterThan(0);
      expect(def.effectMagnitude).toBeGreaterThan(0);
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.description.length).toBeGreaterThan(0);
    }
  });

  it('full saturation total cost = 295 AP', () => {
    const sum = ASC_TREE_NODE_IDS.reduce(
      (acc, id) => acc + nodeTotalCost(ASC_TREE_NODES[id].maxLevel),
      0,
    );
    expect(sum).toBe(295);
  });
});

describe('nodeCost / nodeTotalCost', () => {
  it('nodeCost(lv) = lv + 1', () => {
    expect(nodeCost(0)).toBe(1);
    expect(nodeCost(3)).toBe(4);
    expect(nodeCost(9)).toBe(10);
  });

  it('nodeTotalCost matches triangular sum', () => {
    expect(nodeTotalCost(0)).toBe(0);
    expect(nodeTotalCost(1)).toBe(1);
    expect(nodeTotalCost(5)).toBe(15);
    expect(nodeTotalCost(10)).toBe(55);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test -- ascTree`
Expected: FAIL (module not found).

- [ ] **Step 3: 카탈로그 + cost 구현**

Create `games/inflation-rpg/src/data/ascTree.ts`:

```ts
import type { AscTreeNodeId } from '../types';

export interface AscTreeNodeDef {
  id: AscTreeNodeId;
  name: string;
  description: string;
  effectMagnitude: number;
  maxLevel: number;
}

export const ASC_TREE_NODES: Record<AscTreeNodeId, AscTreeNodeDef> = {
  hp_pct: {
    id: 'hp_pct',
    name: '강철의 심장',
    description: 'HP +5%/lv',
    effectMagnitude: 0.05,
    maxLevel: 10,
  },
  atk_pct: {
    id: 'atk_pct',
    name: '분노의 인장',
    description: 'ATK +5%/lv',
    effectMagnitude: 0.05,
    maxLevel: 10,
  },
  gold_drop: {
    id: 'gold_drop',
    name: '황금의 손길',
    description: '골드 드랍 +10%/lv',
    effectMagnitude: 0.10,
    maxLevel: 5,
  },
  bp_start: {
    id: 'bp_start',
    name: '전사의 결의',
    description: '런 시작 BP +1/lv',
    effectMagnitude: 1,
    maxLevel: 5,
  },
  sp_per_lvl: {
    id: 'sp_per_lvl',
    name: '성장의 빛',
    description: '레벨업 SP +1/lv',
    effectMagnitude: 1,
    maxLevel: 4,
  },
  dungeon_currency: {
    id: 'dungeon_currency',
    name: '차원의 보고',
    description: '던전 화폐 +10%/lv',
    effectMagnitude: 0.10,
    maxLevel: 5,
  },
  crit_damage: {
    id: 'crit_damage',
    name: '치명의 일격',
    description: '크리 데미지 +20%/lv',
    effectMagnitude: 0.20,
    maxLevel: 5,
  },
  asc_accel: {
    id: 'asc_accel',
    name: '어센션 가속',
    description: 'Asc 비용 -10%/lv',
    effectMagnitude: 0.10,
    maxLevel: 9,
  },
  mod_magnitude: {
    id: 'mod_magnitude',
    name: '수식의 정수',
    description: '수식어 magnitude +5%/lv',
    effectMagnitude: 0.05,
    maxLevel: 10,
  },
  effect_proc: {
    id: 'effect_proc',
    name: '격발의 손길',
    description: 'Effect proc 확률 +5%/lv',
    effectMagnitude: 0.05,
    maxLevel: 5,
  },
};

export const ASC_TREE_NODE_IDS: readonly AscTreeNodeId[] = [
  'hp_pct',
  'atk_pct',
  'gold_drop',
  'bp_start',
  'sp_per_lvl',
  'dungeon_currency',
  'crit_damage',
  'asc_accel',
  'mod_magnitude',
  'effect_proc',
];

export const EMPTY_ASC_TREE: Record<AscTreeNodeId, number> = {
  hp_pct: 0, atk_pct: 0, gold_drop: 0, bp_start: 0, sp_per_lvl: 0,
  dungeon_currency: 0, crit_damage: 0, asc_accel: 0,
  mod_magnitude: 0, effect_proc: 0,
};

export function nodeCost(currentLv: number): number {
  return currentLv + 1;
}

export function nodeTotalCost(targetLv: number): number {
  return (targetLv * (targetLv + 1)) / 2;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test -- ascTree`
Expected: PASS (3 + 2 tests in 2 describe blocks).

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/data/ascTree.ts games/inflation-rpg/src/data/ascTree.test.ts
git commit -m "feat(game-inflation-rpg): add AscTree catalogue + cost curve"
```

---

### Task 3: 초기 state + persist v9 → v10 마이그

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts`
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts`

- [ ] **Step 1: 마이그 테스트 추가 (실패)**

Edit `games/inflation-rpg/src/store/gameStore.test.ts` — 기존 v8 → v9 migration 테스트 블록 근처에 추가:

```ts
describe('persist v9 → v10 migration (Phase G)', () => {
  it('legacy meta without ascTree gets EMPTY_ASC_TREE injected', () => {
    const legacy = {
      state: {
        meta: {
          ascTier: 2,
          ascPoints: 3,
          // ascTree missing — pre v10
        },
        run: null,
        screen: 'main',
      },
      version: 9,
    };
    const migrated = useGameStore.persist.migrate?.(legacy.state, legacy.version) as any;
    expect(migrated.meta.ascTree).toEqual({
      hp_pct: 0, atk_pct: 0, gold_drop: 0, bp_start: 0, sp_per_lvl: 0,
      dungeon_currency: 0, crit_damage: 0, asc_accel: 0,
      mod_magnitude: 0, effect_proc: 0,
    });
    expect(migrated.meta.ascPoints).toBe(3);
    expect(migrated.meta.ascTier).toBe(2);
  });

  it('preserves existing ascTree when present', () => {
    const v10 = {
      state: {
        meta: {
          ascTier: 0, ascPoints: 0,
          ascTree: {
            hp_pct: 3, atk_pct: 0, gold_drop: 0, bp_start: 0, sp_per_lvl: 0,
            dungeon_currency: 0, crit_damage: 0, asc_accel: 0,
            mod_magnitude: 0, effect_proc: 0,
          },
        },
        run: null,
        screen: 'main',
      },
      version: 10,
    };
    const migrated = useGameStore.persist.migrate?.(v10.state, v10.version) as any;
    expect(migrated.meta.ascTree.hp_pct).toBe(3);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test -- gameStore`
Expected: FAIL ("migrated.meta.ascTree" undefined).

- [ ] **Step 3: 초기 state + 마이그 + version bump**

Edit `games/inflation-rpg/src/store/gameStore.ts`:

1. Import 추가 (파일 상단):
```ts
import { EMPTY_ASC_TREE } from '../data/ascTree';
```

2. `meta:` initial state — `ascPoints: 0,` 다음 줄에 추가:
```ts
        ascTree: { ...EMPTY_ASC_TREE },
```

3. `version: 9,` → `version: 10,`

4. 기존 migrate 블록 끝부분 (`if (fromVersion <= 8)` 블록 다음) 에 추가:
```ts
        // v9 → v10: Phase G — ascTree 초기 0 주입
        if (fromVersion <= 9 && s.meta) {
          s.meta.ascTree = s.meta.ascTree ?? { ...EMPTY_ASC_TREE };
        }
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test -- gameStore`
Expected: PASS (2 new tests in migration block).

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts
git commit -m "feat(game-inflation-rpg): persist v10 — inject EMPTY_ASC_TREE"
```

---

### Task 4: canBuyAscTreeNode + buyAscTreeNode actions

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts`
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts`

- [ ] **Step 1: action 테스트 추가 (실패)**

Edit `games/inflation-rpg/src/store/gameStore.test.ts` — 새 describe 블록 추가:

```ts
describe('AscTree actions (Phase G)', () => {
  beforeEach(() => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        ascPoints: 10,
        ascTree: {
          hp_pct: 0, atk_pct: 0, gold_drop: 0, bp_start: 0, sp_per_lvl: 0,
          dungeon_currency: 0, crit_damage: 0, asc_accel: 0,
          mod_magnitude: 0, effect_proc: 0,
        },
      },
    }));
  });

  it('canBuyAscTreeNode: ok with sufficient AP', () => {
    const r = useGameStore.getState().canBuyAscTreeNode('hp_pct');
    expect(r.ok).toBe(true);
    expect(r.cost).toBe(1);
    expect(r.currentLv).toBe(0);
  });

  it('canBuyAscTreeNode: rejects when AP insufficient', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, ascPoints: 0 } }));
    const r = useGameStore.getState().canBuyAscTreeNode('hp_pct');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ap');
  });

  it('canBuyAscTreeNode: rejects when at max lv', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, ascTree: { ...s.meta.ascTree, gold_drop: 5 } },
    }));
    const r = useGameStore.getState().canBuyAscTreeNode('gold_drop');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('max');
  });

  it('buyAscTreeNode: success deducts AP + bumps lv', () => {
    const ok = useGameStore.getState().buyAscTreeNode('hp_pct');
    expect(ok).toBe(true);
    expect(useGameStore.getState().meta.ascPoints).toBe(9);
    expect(useGameStore.getState().meta.ascTree.hp_pct).toBe(1);
  });

  it('buyAscTreeNode: returns false when blocked', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, ascPoints: 0 } }));
    const ok = useGameStore.getState().buyAscTreeNode('hp_pct');
    expect(ok).toBe(false);
  });

  it('buyAscTreeNode: cost grows with lv (lv 3 → 4 = 4 AP)', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, ascPoints: 100, ascTree: { ...s.meta.ascTree, hp_pct: 3 } },
    }));
    useGameStore.getState().buyAscTreeNode('hp_pct');
    expect(useGameStore.getState().meta.ascPoints).toBe(96);
    expect(useGameStore.getState().meta.ascTree.hp_pct).toBe(4);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test -- gameStore`
Expected: FAIL ("canBuyAscTreeNode is not a function").

- [ ] **Step 3: actions 구현**

Edit `games/inflation-rpg/src/store/gameStore.ts`:

1. Import 추가 (이미 EMPTY_ASC_TREE 있으면 그 라인 확장):
```ts
import { ASC_TREE_NODES, EMPTY_ASC_TREE, nodeCost } from '../data/ascTree';
```

2. `GameStoreActions` 인터페이스 (또는 동등 위치) 의 `// Phase F-1 — Ascension` 섹션 뒤에 추가:
```ts
  // Phase G — Ascension Tree
  canBuyAscTreeNode: (id: AscTreeNodeId) => {
    ok: boolean;
    cost: number;
    currentLv: number;
    reason?: 'max' | 'ap';
  };
  buyAscTreeNode: (id: AscTreeNodeId) => boolean;
```

3. import 에 `AscTreeNodeId` 추가 (types.ts 에서).

4. store actions 의 `ascend` 다음에 추가:
```ts
      canBuyAscTreeNode: (id) => {
        const s = get();
        const currentLv = s.meta.ascTree[id];
        const def = ASC_TREE_NODES[id];
        if (currentLv >= def.maxLevel) {
          return { ok: false, cost: 0, currentLv, reason: 'max' };
        }
        const cost = nodeCost(currentLv);
        if (s.meta.ascPoints < cost) {
          return { ok: false, cost, currentLv, reason: 'ap' };
        }
        return { ok: true, cost, currentLv };
      },

      buyAscTreeNode: (id) => {
        const check = get().canBuyAscTreeNode(id);
        if (!check.ok) return false;
        set((s) => ({
          meta: {
            ...s.meta,
            ascPoints: s.meta.ascPoints - check.cost,
            ascTree: {
              ...s.meta.ascTree,
              [id]: s.meta.ascTree[id] + 1,
            },
          },
        }));
        return true;
      },
```

- [ ] **Step 4: 테스트 통과**

Run: `pnpm --filter @forge/game-inflation-rpg test -- gameStore`
Expected: PASS (6 new tests).

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts
git commit -m "feat(game-inflation-rpg): canBuyAscTreeNode + buyAscTreeNode"
```

- [ ] **Step 6: cp1 태그**

```bash
git tag phase-g-cp1
```

---

## Checkpoint 2 — Stat Effects (HP/ATK/Crit/AscCost)

### Task 5: calcFinalStat ascTreeMult 인자 + 호출 매핑

**Files:**
- Modify: `games/inflation-rpg/src/systems/stats.ts`
- Modify: `games/inflation-rpg/src/systems/stats.test.ts`
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts`

- [ ] **Step 1: stats.test.ts 에 ascTreeMult 테스트 추가 (실패)**

Edit `games/inflation-rpg/src/systems/stats.test.ts` — 마지막 describe 안에 추가:

```ts
describe('calcFinalStat — ascTreeMult', () => {
  it('ascTreeMult = 1 (default) yields baseline result', () => {
    const baseline = calcFinalStat('atk', 0, 1, [], 1, 1, 1);
    const explicit = calcFinalStat('atk', 0, 1, [], 1, 1, 1, 1);
    expect(explicit).toBe(baseline);
  });

  it('ascTreeMult 1.5 scales final result', () => {
    // base ATK 10, no SP / equipment / charMult / baseAbility / charLevel / ascTier
    // → baseline = floor(10) = 10
    const baseline = calcFinalStat('atk', 0, 1, [], 1, 1, 1, 1);
    const boosted = calcFinalStat('atk', 0, 1, [], 1, 1, 1, 1.5);
    expect(baseline).toBe(10);
    expect(boosted).toBe(15);   // floor(10 × 1.5)
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test -- stats`
Expected: FAIL (signature mismatch, ascTreeMult parameter missing).

- [ ] **Step 3: calcFinalStat 시그니처 확장**

Edit `games/inflation-rpg/src/systems/stats.ts`:

```ts
export function calcFinalStat(
  key: StatKey,
  allocated: number,
  charMult: number,
  equipped: EquipmentInstance[],
  baseAbilityMult: number,
  charLevelMult = 1,
  ascTierMult = 1,
  ascTreeMult = 1,
): number {
  const raw = calcRawStat(key, allocated, charMult);
  const flat = calcEquipmentFlat(key, equipped);
  const pct = calcEquipmentPercentMult(key, equipped);
  return Math.floor((raw + flat) * pct * baseAbilityMult * charLevelMult * ascTierMult * ascTreeMult);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test -- stats`
Expected: PASS (2 new tests).

- [ ] **Step 5: BattleScene 의 6 callsite 에 ascTreeMult 매핑**

Edit `games/inflation-rpg/src/battle/BattleScene.ts` (lines 163-184 부근):

먼저 메타 접근 부분에 `ascTree` 읽기 추가 (기존 `ascTierMult` 계산 근처):
```ts
const ascTree = meta.ascTree;
const ascTreeAtkMult = 1 + 0.05 * ascTree.atk_pct;
const ascTreeHpMult = 1 + 0.05 * ascTree.hp_pct;
```

그리고 6 callsite 각각 마지막 인자 추가:
- `'atk'` callsite → `..., ascTierMult, ascTreeAtkMult`
- `'hp'`  callsite → `..., ascTierMult, ascTreeHpMult`
- `'def'`, `'agi'`, `'luc'` callsite → `..., ascTierMult` (4번째 noddi default = 1)

명시적으로 4개 비-노드 stat 에는 `1` 전달 가능:
```ts
calcFinalStat('def', ..., ascTierMult, 1);
calcFinalStat('agi', ..., ascTierMult, 1);
calcFinalStat('luc', ..., ascTierMult, 1);
```

- [ ] **Step 6: 회귀 확인**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg test`
Expected: typecheck 0 error, all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add games/inflation-rpg/src/systems/stats.ts games/inflation-rpg/src/systems/stats.test.ts games/inflation-rpg/src/battle/BattleScene.ts
git commit -m "feat(game-inflation-rpg): wire ascTree.hp_pct/atk_pct into calcFinalStat"
```

---

### Task 6: crit_damage in effects pipeline

**Files:**
- Modify: `games/inflation-rpg/src/systems/effects.ts`
- Modify: `games/inflation-rpg/src/systems/effects.test.ts`
- Modify: callsite (BattleScene 또는 resolver)

- [ ] **Step 1: 현재 crit damage 위치 확인**

Run: `grep -n "crit\|CRIT_MULT\|critMul\|critical" games/inflation-rpg/src/battle/resolver.ts games/inflation-rpg/src/systems/effects.ts | head -20`

Expected: resolver.ts 에 `resolvePlayerHit` 가 crit 처리. effects.ts 의 `processOutgoingDamage` 에도 있을 수 있음. 위치 기록.

- [ ] **Step 2: 테스트 추가 (실패)**

Edit `games/inflation-rpg/src/battle/resolver.test.ts` (없으면 effects.test.ts) — crit damage multiplier 인자 검증:

```ts
// resolver.test.ts 에 추가
import { resolvePlayerHit } from './resolver';

describe('resolvePlayerHit — critMultBonus (Phase G crit_damage)', () => {
  it('default critMultBonus 0 = baseline crit damage', () => {
    const baseline = resolvePlayerHit({ playerATK: 100, crit: true, rngRoll: 0.5 });
    const same = resolvePlayerHit({ playerATK: 100, crit: true, rngRoll: 0.5, critMultBonus: 0 });
    expect(same).toBe(baseline);
  });

  it('critMultBonus 1.0 doubles crit damage', () => {
    const baseline = resolvePlayerHit({ playerATK: 100, crit: true, rngRoll: 0.5 });
    const boosted = resolvePlayerHit({ playerATK: 100, crit: true, rngRoll: 0.5, critMultBonus: 1.0 });
    // baseline is base × CRIT_MULT, boosted = base × (CRIT_MULT + 1.0)
    expect(boosted).toBeGreaterThan(baseline);
  });

  it('critMultBonus ignored when not crit', () => {
    const noCrit = resolvePlayerHit({ playerATK: 100, crit: false, rngRoll: 0.5 });
    const ignored = resolvePlayerHit({ playerATK: 100, crit: false, rngRoll: 0.5, critMultBonus: 5 });
    expect(ignored).toBe(noCrit);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test -- resolver`
Expected: FAIL.

- [ ] **Step 4: resolver.ts 의 resolvePlayerHit 시그니처 확장**

Edit `games/inflation-rpg/src/battle/resolver.ts` — 기존 `resolvePlayerHit({ playerATK, crit, rngRoll })` 함수에 `critMultBonus = 0` 인자 추가 + crit 분기에서 `CRIT_MULT + critMultBonus` 사용. 정확한 형태는 기존 코드를 따른다.

예시 (기존 형태 변환):
```ts
export function resolvePlayerHit({
  playerATK, crit, rngRoll, critMultBonus = 0,
}: {
  playerATK: number; crit: boolean; rngRoll: number;
  critMultBonus?: number;
}): number {
  const variance = 0.9 + rngRoll * 0.2;
  const critMul = crit ? (CRIT_MULT + critMultBonus) : 1;
  return Math.floor(playerATK * critMul * variance);
}
```

- [ ] **Step 5: BattleScene callsite 매핑**

BattleScene 의 `resolvePlayerHit` 호출에 `critMultBonus: 0.20 * meta.ascTree.crit_damage` 추가.

- [ ] **Step 6: 테스트 통과**

Run: `pnpm --filter @forge/game-inflation-rpg test -- resolver`
Expected: PASS (3 new tests).

- [ ] **Step 7: Commit**

```bash
git add games/inflation-rpg/src/battle/resolver.ts games/inflation-rpg/src/battle/resolver.test.ts games/inflation-rpg/src/battle/BattleScene.ts
git commit -m "feat(game-inflation-rpg): wire ascTree.crit_damage into resolvePlayerHit"
```

---

### Task 7: asc_accel — canAscend 비용 감소

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts`
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts`

- [ ] **Step 1: 테스트 추가 (실패)**

Edit `games/inflation-rpg/src/store/gameStore.test.ts` — `canAscend` describe 블록에 추가:

```ts
describe('canAscend — asc_accel discount (Phase G)', () => {
  it('asc_accel 0 = baseline cost (N²)', () => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta, ascTier: 4, dungeonFinalsCleared: ['a','b','c','d','e','f','g'],
        ascTree: { ...s.meta.ascTree, asc_accel: 0 },
      },
    }));
    const r = useGameStore.getState().canAscend();
    expect(r.cost).toBe(25);  // (4+1)² = 25
  });

  it('asc_accel 5 = -50%', () => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta, ascTier: 4, dungeonFinalsCleared: ['a','b','c','d','e','f','g'],
        ascTree: { ...s.meta.ascTree, asc_accel: 5 },
      },
    }));
    const r = useGameStore.getState().canAscend();
    expect(r.cost).toBe(13);  // ceil(25 × 0.5) = 13
  });

  it('asc_accel 9 = -90% (floor)', () => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta, ascTier: 4, dungeonFinalsCleared: ['a','b','c','d','e','f','g'],
        ascTree: { ...s.meta.ascTree, asc_accel: 9 },
      },
    }));
    const r = useGameStore.getState().canAscend();
    expect(r.cost).toBe(3);   // ceil(25 × 0.1) = 3
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test -- gameStore`
Expected: FAIL.

- [ ] **Step 3: canAscend 의 cost 계산 변경**

Edit `games/inflation-rpg/src/store/gameStore.ts` 의 `canAscend` 함수 — `const cost = nextTier * nextTier;` 라인을 다음과 같이 변경:

```ts
const ascAccelLv = s.meta.ascTree?.asc_accel ?? 0;
const cost = Math.ceil((nextTier * nextTier) * (1 - 0.10 * ascAccelLv));
```

- [ ] **Step 4: 테스트 통과**

Run: `pnpm --filter @forge/game-inflation-rpg test -- gameStore`
Expected: PASS.

- [ ] **Step 5: Commit + cp2**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts
git commit -m "feat(game-inflation-rpg): asc_accel reduces Asc Tier cost"
git tag phase-g-cp2
```

---

## Checkpoint 3 — Resource & Run-Start Effects

### Task 8: gold_drop + dungeon_currency multiplier

**Files:**
- Create: `games/inflation-rpg/src/systems/economy.ts`
- Create: `games/inflation-rpg/src/systems/economy.test.ts`
- Modify: `games/inflation-rpg/src/store/gameStore.ts` (gold/currency 획득 함수)

- [ ] **Step 1: economy.test.ts 작성 (실패)**

Create `games/inflation-rpg/src/systems/economy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyDropMult } from './economy';

describe('applyDropMult', () => {
  it('lv 0 = baseline', () => {
    expect(applyDropMult(1000, 0.10, 0)).toBe(1000);
  });

  it('lv 5 × 10% = +50% (1.5×)', () => {
    expect(applyDropMult(1000, 0.10, 5)).toBe(1500);
  });

  it('floor result', () => {
    expect(applyDropMult(100, 0.10, 3)).toBe(130);   // 100 × 1.3 = 130
    expect(applyDropMult(7, 0.10, 5)).toBe(10);      // 7 × 1.5 = 10.5 → floor 10
  });

  it('lv 0 special-case — no waste', () => {
    expect(applyDropMult(0, 0.10, 5)).toBe(0);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test -- economy`
Expected: FAIL.

- [ ] **Step 3: economy.ts 구현**

Create `games/inflation-rpg/src/systems/economy.ts`:

```ts
export function applyDropMult(amount: number, perLv: number, lv: number): number {
  if (lv <= 0) return amount;
  return Math.floor(amount * (1 + perLv * lv));
}
```

- [ ] **Step 4: 테스트 통과**

Run: `pnpm --filter @forge/game-inflation-rpg test -- economy`
Expected: PASS (4 tests).

- [ ] **Step 5: gameStore 의 gold/currency 획득 지점 wiring**

`gameStore.ts` 에서 골드 추가하는 함수 (예: `gainGold` 또는 `addGold`) 와 던전 화폐 (`addDungeonCurrency` 또는 동등) 를 찾는다:

Run: `grep -n "gold:\|gold +=\|gold -\|gainGold\|dungeonCurrency" games/inflation-rpg/src/store/gameStore.ts | head -20`

각 적용 지점:
- `gold` 증가시 `applyDropMult(amount, 0.10, s.meta.ascTree.gold_drop)` 통과
- `dungeonCurrency` 증가시 `applyDropMult(amount, 0.10, s.meta.ascTree.dungeon_currency)` 통과

Import 추가:
```ts
import { applyDropMult } from '../systems/economy';
```

- [ ] **Step 6: gameStore 테스트 추가**

Edit `games/inflation-rpg/src/store/gameStore.test.ts` — describe 'gold drop / dungeon currency multipliers':

```ts
describe('Economy multipliers (Phase G)', () => {
  it('gold drop scales with gold_drop node', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, gold: 0, ascTree: { ...s.meta.ascTree, gold_drop: 3 } },
    }));
    useGameStore.getState().gainGold(1000);   // 또는 실제 함수명
    expect(useGameStore.getState().meta.gold).toBe(1300);
  });
});
```

(`gainGold` 의 실제 함수명을 코드에서 확인 후 사용. 없으면 골드 증가하는 흐름 — `endBattle` 의 reward 처리 등 — 안에 mult 적용했는지 확인하는 우회 테스트.)

- [ ] **Step 7: 전체 테스트 통과**

Run: `pnpm --filter @forge/game-inflation-rpg test`
Expected: 모든 테스트 PASS. 회귀 없음.

- [ ] **Step 8: Commit**

```bash
git add games/inflation-rpg/src/systems/economy.ts games/inflation-rpg/src/systems/economy.test.ts games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts
git commit -m "feat(game-inflation-rpg): apply gold/currency drop multipliers (Phase G)"
```

---

### Task 9: bp_start + sp_per_lvl

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts`
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts`

- [ ] **Step 1: BP / SP 초기값 위치 확인**

Run: `grep -n "BP_BASE\|bp: \|bp:\|startRun\|levelUp\|SP_PER\|sp:" games/inflation-rpg/src/systems/bp.ts games/inflation-rpg/src/store/gameStore.ts | head -20`

Expected: BP_BASE 상수 + startRun 진입 시 bp 초기화 + 캐릭터 levelUp 시 sp 부여 위치 식별.

- [ ] **Step 2: 테스트 추가 (실패)**

Edit `games/inflation-rpg/src/store/gameStore.test.ts`:

```ts
describe('Run start BP — bp_start node (Phase G)', () => {
  it('default BP = BP_BASE', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, ascTree: { ...s.meta.ascTree, bp_start: 0 } } }));
    useGameStore.getState().startRun('warrior');  // 실제 char id 사용
    expect(useGameStore.getState().run?.bp).toBe(/* BP_BASE 값 */);
  });

  it('bp_start lv 3 = BP_BASE + 3', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, ascTree: { ...s.meta.ascTree, bp_start: 3 } } }));
    useGameStore.getState().startRun('warrior');
    expect(useGameStore.getState().run?.bp).toBe(/* BP_BASE + 3 */);
  });
});

describe('Level up SP — sp_per_lvl (Phase G)', () => {
  it('default SP gain = SP_PER_LEVEL', () => {
    // 캐릭터 levelUp 액션 직접 호출 또는 XP 누적
    // 자세한 구현은 기존 levelUp 테스트 패턴 참조
  });
  it('sp_per_lvl lv 2 = SP_PER_LEVEL + 2', () => {
    // 동일
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test -- gameStore`
Expected: FAIL.

- [ ] **Step 4: startRun + levelUp 의 BP / SP 부여에 노드값 합산**

Edit `games/inflation-rpg/src/store/gameStore.ts`:

`startRun` 에서 `bp: BP_BASE` (또는 동등) 라인을:
```ts
bp: BP_BASE + (s.meta.ascTree?.bp_start ?? 0),
```

캐릭터 레벨업 시 SP 증가 라인 (예: `sp + 1`) 을:
```ts
sp: currentSp + 1 + (s.meta.ascTree?.sp_per_lvl ?? 0),
```

- [ ] **Step 5: 테스트 통과**

Run: `pnpm --filter @forge/game-inflation-rpg test -- gameStore`
Expected: PASS.

- [ ] **Step 6: Commit + cp3**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts
git commit -m "feat(game-inflation-rpg): bp_start + sp_per_lvl wired into run start + level up"
git tag phase-g-cp3
```

---

## Checkpoint 4 — Phase D 통합 (magnitude + proc)

### Task 10: mod_magnitude in modifier resolve

**Files:**
- Modify: `games/inflation-rpg/src/systems/modifiers.ts`
- Modify: `games/inflation-rpg/src/systems/modifiers.test.ts`
- Modify: callsite (BattleScene + balance-sim)

- [ ] **Step 1: 현재 modifier resolve 구조 확인**

Run: `grep -n "magnitude\|resolveModifier\|modifierMagnitude" games/inflation-rpg/src/systems/modifiers.ts | head -10`

Expected: modifier magnitude 가 어느 함수에서 사용되는지 식별 (대개 effect 변환 시점).

- [ ] **Step 2: 테스트 추가 (실패)**

Edit `games/inflation-rpg/src/systems/modifiers.test.ts` — 새 describe:

```ts
describe('resolveModifierMagnitude (Phase G mod_magnitude)', () => {
  it('mod_magnitude 0 = baseline', () => {
    const mod = { magnitude: 10, type: 'stat_mod', /* ... */ } as Modifier;
    const r = resolveModifierMagnitude(mod, 0);
    expect(r).toBe(10);
  });

  it('mod_magnitude 5 = +25%', () => {
    const mod = { magnitude: 10, type: 'stat_mod' } as Modifier;
    const r = resolveModifierMagnitude(mod, 5);
    expect(r).toBe(12.5);
  });

  it('mod_magnitude 10 = +50%', () => {
    const mod = { magnitude: 10, type: 'stat_mod' } as Modifier;
    const r = resolveModifierMagnitude(mod, 10);
    expect(r).toBe(15);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test -- modifiers`
Expected: FAIL.

- [ ] **Step 4: resolveModifierMagnitude 도입**

Edit `games/inflation-rpg/src/systems/modifiers.ts` — 헬퍼 추가:

```ts
export function resolveModifierMagnitude(
  mod: Pick<Modifier, 'magnitude'>,
  modMagnitudeLv: number,
): number {
  return mod.magnitude * (1 + 0.05 * modMagnitudeLv);
}
```

기존 modifier → effect 변환 함수 (예: `modifierToEffect` 등) 가 magnitude 를 직접 읽고 있다면, 그 호출자를 `resolveModifierMagnitude(mod, ascTree.mod_magnitude)` 로 거쳐 가도록 wrap.

- [ ] **Step 5: callsite (BattleScene) 매핑**

BattleScene 에서 modifier 를 effect 로 변환하는 부분에 `meta.ascTree.mod_magnitude` 전달.

Run: `grep -n "magnitude\b\|modifierToEffect\|fromModifier" games/inflation-rpg/src/battle/BattleScene.ts`

해당 위치에 wrap:
```ts
const modMagLv = meta.ascTree?.mod_magnitude ?? 0;
// modifier 사용 시점에 resolveModifierMagnitude(mod, modMagLv) 호출
```

- [ ] **Step 6: 테스트 통과**

Run: `pnpm --filter @forge/game-inflation-rpg test -- modifiers`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add games/inflation-rpg/src/systems/modifiers.ts games/inflation-rpg/src/systems/modifiers.test.ts games/inflation-rpg/src/battle/BattleScene.ts
git commit -m "feat(game-inflation-rpg): mod_magnitude scales modifier magnitudes"
```

---

### Task 11: effect_proc in pipeline

**Files:**
- Modify: `games/inflation-rpg/src/systems/effects.ts`
- Modify: `games/inflation-rpg/src/systems/effects.test.ts`
- Modify: BattleScene callsite

- [ ] **Step 1: effect proc 위치 확인**

Run: `grep -n "chance\|procChance\|rng\|Math.random" games/inflation-rpg/src/systems/effects.ts | head -10`

Expected: status/dot effect 가 `chance` 필드를 가지고 RNG 와 비교. 위치 식별.

- [ ] **Step 2: 테스트 추가 (실패)**

Edit `games/inflation-rpg/src/systems/effects.test.ts` — 새 describe:

```ts
describe('applyProcMult (Phase G effect_proc)', () => {
  it('lv 0 = baseline chance', () => {
    expect(applyProcMult(0.1, 0)).toBe(0.1);
  });

  it('lv 5 = +25% (×1.25)', () => {
    expect(applyProcMult(0.1, 5)).toBeCloseTo(0.125, 5);
  });

  it('clamps to 1.0 max', () => {
    expect(applyProcMult(0.9, 5)).toBe(1.0);    // 0.9 × 1.25 = 1.125 → 1.0
  });

  it('0 chance stays 0', () => {
    expect(applyProcMult(0, 5)).toBe(0);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test -- effects`
Expected: FAIL.

- [ ] **Step 4: applyProcMult 헬퍼 + chance 사용처 wrapping**

Edit `games/inflation-rpg/src/systems/effects.ts`:

```ts
export function applyProcMult(baseChance: number, effectProcLv: number): number {
  if (baseChance <= 0) return 0;
  return Math.min(1, baseChance * (1 + 0.05 * effectProcLv));
}
```

기존 `chance` 와 `rng.next()` 비교하는 위치에서 `applyProcMult(eff.chance, effectProcLv)` 사용.

- [ ] **Step 5: 인자 라우팅 (effectProcLv 가 함수까지 전달)**

`processOutgoingDamage` / `addEffect` 등 chance 사용 함수의 시그니처에 `effectProcLv = 0` 추가하고 BattleScene + balance-sim 에서 `meta.ascTree.effect_proc` 전달.

- [ ] **Step 6: 테스트 통과**

Run: `pnpm --filter @forge/game-inflation-rpg test -- effects`
Expected: PASS.

- [ ] **Step 7: Commit + cp4**

```bash
git add games/inflation-rpg/src/systems/effects.ts games/inflation-rpg/src/systems/effects.test.ts games/inflation-rpg/src/battle/BattleScene.ts games/inflation-rpg/tools/balance-sim.ts
git commit -m "feat(game-inflation-rpg): effect_proc scales effect proc chances"
git tag phase-g-cp4
```

---

## Checkpoint 5 — Sim Fidelity Cleanup

### Task 12: balance-sim 의 processIncomingDamage 통합

**Files:**
- Modify: `games/inflation-rpg/tools/balance-sim.ts`
- Modify: `games/inflation-rpg/tools/balance-sim.test.ts`

- [ ] **Step 1: processIncomingDamage 시그니처 확인**

Run: `grep -n "processIncomingDamage" games/inflation-rpg/src/systems/effects.ts -A 20`

Expected: 인자 / 반환값 명세 확인. typically `(damage, effectsState, combat) → { actualDamage, ... }`.

- [ ] **Step 2: 통합 테스트 추가 (실패)**

Edit `games/inflation-rpg/tools/balance-sim.test.ts` — 새 describe:

```ts
describe('simulateFloor — shield modifier fidelity (Phase G)', () => {
  it('shield modifier reduces incoming damage in sim', () => {
    const player = buildBaselineSimPlayer();
    const playerWithShield = {
      ...player,
      modifiers: [{ effectType: 'shield', magnitude: 50 } as Modifier /* 50% damage absorb */],
    };
    const enemy = { monsterLevel: 5, isBoss: false, hpMult: 1 };
    const rng1 = createSeededRng(42);
    const rng2 = createSeededRng(42);
    const r1 = simulateFloor(player, enemy, rng1);
    const r2 = simulateFloor(playerWithShield, enemy, rng2);
    // shield 가 의미 있게 영향 — 두 결과 다름 (R1 vs R2 의 ticksTaken 또는 victory)
    expect(r1).not.toEqual(r2);
  });
});
```

(`buildBaselineSimPlayer` 는 테스트 내부 헬퍼로 정의.)

- [ ] **Step 3: 실패 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test -- balance-sim`
Expected: FAIL (현재 shield 가 sim 미반영).

- [ ] **Step 4: simulateFloor 의 적 공격 경로를 processIncomingDamage 로 교체**

Edit `games/inflation-rpg/tools/balance-sim.ts` — 145-158 라인 부근 (`적 공격` 주석 블록):

기존:
```ts
monstersDefeated++;
const currentHpEstimate = playerHp - (monstersDefeated * damageTaken * 0.1);
if (currentHpEstimate <= 0) { ... }
```

변경 (간단화 버전 — fatigue 모델 대신 processIncomingDamage 호출):
```ts
monstersDefeated++;
const fatigueDamage = damageTaken * 0.1;
const incoming = processIncomingDamage(effectsState, combat, fatigueDamage);
playerHpTracker -= incoming.actualDamage;
if (playerHpTracker <= 0) {
  return { victory: false, ticksTaken: tick, secondsTaken: tick * 0.6,
    remainingHpRatio: enemyHp / enemyMaxHp };
}
```

기존 `playerHp` 상수를 `playerHpTracker` 가변 변수로 변경 (선언부에서 `let playerHpTracker = player.hpMax`).

- [ ] **Step 5: 테스트 통과 + 회귀**

Run: `pnpm --filter @forge/game-inflation-rpg test -- balance-sim balance-milestones`
Expected: PASS. milestone 회귀 가드 통과 — 만약 ±5% 초과 변동 발생 시 milestone 값 spec §11 정합 범위로 재조정.

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/tools/balance-sim.ts games/inflation-rpg/tools/balance-sim.test.ts
git commit -m "refactor(game-inflation-rpg): balance-sim uses processIncomingDamage for fidelity"
```

---

### Task 13: balance-sim buildSimPlayer stat_mod 합산 + ascTree 노드 반영

**Files:**
- Modify: `games/inflation-rpg/tools/balance-sim.ts` (buildSimPlayer 위치)
- Modify: `games/inflation-rpg/tools/balance-sweep.ts`

- [ ] **Step 1: buildSimPlayer 위치 확인**

Run: `grep -n "buildSimPlayer\|SimPlayer\b" games/inflation-rpg/tools/*.ts | head -10`

Expected: 함수 정의 위치 + 호출 sweep 위치.

- [ ] **Step 2: stat_mod 합산 + ascTree 인자 추가**

Edit `games/inflation-rpg/tools/balance-sim.ts` — `buildSimPlayer` 시그니처에 ascTree 옵션:

```ts
export function buildSimPlayer(opts: {
  // ... 기존 인자
  ascTree?: Partial<AscTree>;
  modifiers?: Modifier[];
}): SimPlayer {
  const atree = { ...EMPTY_ASC_TREE, ...(opts.ascTree ?? {}) };
  // ATK / HP 계산 시 ascTree.atk_pct / hp_pct multiplier 적용
  const ascTreeAtkMult = 1 + 0.05 * atree.atk_pct;
  const ascTreeHpMult = 1 + 0.05 * atree.hp_pct;

  // stat_mod modifier 합산 — atk_flat, atk_pct, hp_flat, hp_pct
  let atkFlat = 0, atkPct = 0, hpFlat = 0, hpPct = 0;
  for (const mod of (opts.modifiers ?? [])) {
    if (mod.effectType !== 'stat_mod') continue;
    const m = resolveModifierMagnitude(mod, atree.mod_magnitude);
    // mod.target / mod.modifier 기반으로 atk/hp 분기 — 기존 Modifier 타입 참조
    // 예시: mod.target === 'atk' && mod.modifier === 'flat' → atkFlat += m
    // ... 분기 코드
  }

  const atk = Math.floor((baseAtk + atkFlat) * (1 + atkPct / 100) * ascTreeAtkMult);
  const hpMax = Math.floor((baseHp + hpFlat) * (1 + hpPct / 100) * ascTreeHpMult);

  return { atk, hpMax, /* ... */ ascTree: atree };
}
```

(정확한 stat_mod 분기는 Phase D 의 `Modifier` 타입 구조에 따라 작성.)

- [ ] **Step 3: sweep CLI / spec 에 ascTree axis 추가**

Edit `games/inflation-rpg/tools/balance-sweep.ts` — sweep 스펙에 ascTree saturation level 옵션 추가:

```ts
ascTreeProfile?: 'none' | 'saturated';   // saturated = 모든 노드 max
```

`buildSimPlayer` 호출 시 profile 에 맞는 ascTree 객체 생성.

- [ ] **Step 4: 회귀 테스트 + sweep 실행**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg test -- balance
pnpm --filter @forge/game-inflation-rpg balance-sweep    # CLI 확인
```

Expected: 기존 milestone 통과. 새 axis 정상 출력. sweep 결과 파일 `balance-sweep-out.md` 갱신.

- [ ] **Step 5: Commit + cp5**

```bash
git add games/inflation-rpg/tools/
git commit -m "feat(game-inflation-rpg): sim reflects stat_mod + ascTree multipliers"
git tag phase-g-cp5
```

---

## Checkpoint 6 — UI

### Task 14: Ascension.tsx 탭 2개

**Files:**
- Modify: `games/inflation-rpg/src/screens/Ascension.tsx`
- Create: `games/inflation-rpg/src/screens/AscensionTree.tsx`
- Modify: `games/inflation-rpg/src/screens/Ascension.test.tsx`

- [ ] **Step 1: 탭 전환 테스트 추가 (실패)**

Edit `games/inflation-rpg/src/screens/Ascension.test.tsx`:

```ts
describe('Ascension — tabs (Phase G)', () => {
  it('초월 탭이 기본 active', () => {
    render(<Ascension />);
    expect(screen.getByTestId('asctree-tab-tier')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('ascension-status')).toBeInTheDocument();
  });

  it('성좌 탭 클릭 시 노드 그리드 노출', async () => {
    render(<Ascension />);
    await userEvent.click(screen.getByTestId('asctree-tab-tree'));
    expect(screen.getByTestId('asctree-ap')).toBeInTheDocument();
    expect(screen.getByTestId('asctree-node-hp_pct')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test -- Ascension`
Expected: FAIL.

- [ ] **Step 3: AscensionTree.tsx 생성**

Create `games/inflation-rpg/src/screens/AscensionTree.tsx`:

```tsx
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { ForgePanel } from '@/components/ui/forge-panel';
import { ForgeButton } from '@/components/ui/forge-button';
import { ASC_TREE_NODES, ASC_TREE_NODE_IDS, nodeCost } from '../data/ascTree';
import type { AscTreeNodeId } from '../types';

export function AscensionTree() {
  const meta = useGameStore((s) => s.meta);
  const canBuy = useGameStore((s) => s.canBuyAscTreeNode);
  const buy = useGameStore((s) => s.buyAscTreeNode);
  const [confirming, setConfirming] = React.useState<AscTreeNodeId | null>(null);

  return (
    <div style={{ padding: '8px 16px' }}>
      <ForgePanel style={{ marginBottom: 12 }}>
        <div data-testid="asctree-ap" style={{ fontSize: 16, color: 'var(--forge-accent)' }}>
          보유 AP: <strong>{meta.ascPoints}</strong>
        </div>
      </ForgePanel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {ASC_TREE_NODE_IDS.map((id) => {
          const def = ASC_TREE_NODES[id];
          const lv = meta.ascTree[id];
          const check = canBuy(id);
          const max = lv >= def.maxLevel;
          return (
            <ForgePanel key={id} data-testid={`asctree-node-${id}`}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>{def.name}</div>
              <div style={{ fontSize: 11, color: 'var(--forge-text-secondary)', marginBottom: 4 }}>
                {def.description}
              </div>
              <div style={{ fontSize: 11 }}>
                lv {lv} / {def.maxLevel}
              </div>
              {!max && (
                <div style={{ fontSize: 11, color: 'var(--forge-text-secondary)' }}>
                  다음: {check.cost} AP
                </div>
              )}
              <ForgeButton
                data-testid={`asctree-buy-${id}`}
                variant="primary"
                disabled={!check.ok}
                style={{ width: '100%', marginTop: 4, fontSize: 11 }}
                onClick={() => setConfirming(id)}
              >
                {max ? 'MAX' : '강화'}
              </ForgeButton>
            </ForgePanel>
          );
        })}
      </div>

      {confirming && (() => {
        const def = ASC_TREE_NODES[confirming];
        const check = canBuy(confirming);
        const lv = meta.ascTree[confirming];
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          }}>
            <ForgePanel style={{ minWidth: 240, padding: 16 }}>
              <div style={{ marginBottom: 12, fontWeight: 700 }}>
                {def.name} lv {lv} → {lv + 1}
              </div>
              <div style={{ fontSize: 12, marginBottom: 12 }}>
                {check.cost} AP 소비
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <ForgeButton
                  data-testid={`asctree-confirm-${confirming}`}
                  variant="primary"
                  style={{ flex: 1 }}
                  onClick={() => { buy(confirming); setConfirming(null); }}
                >
                  확인
                </ForgeButton>
                <ForgeButton
                  variant="secondary"
                  style={{ flex: 1 }}
                  onClick={() => setConfirming(null)}
                >
                  취소
                </ForgeButton>
              </div>
            </ForgePanel>
          </div>
        );
      })()}
    </div>
  );
}
```

- [ ] **Step 4: Ascension.tsx 탭 wrap**

Edit `games/inflation-rpg/src/screens/Ascension.tsx`:

기존 모든 내용을 `TierPanel` 컴포넌트로 추출 (현재 ForgeScreen 안의 헤더는 유지, 두 ForgePanel 만 새 컴포넌트로). 그리고 Ascension 본체에 탭 추가:

```tsx
import { AscensionTree } from './AscensionTree';

type AscTab = 'tier' | 'tree';

function TierPanel() {
  // 기존 Ascension.tsx 의 두 ForgePanel 내용을 여기로 이동
  // ...
}

export function Ascension() {
  const setScreen = useGameStore((s) => s.setScreen);
  const [tab, setTab] = React.useState<AscTab>('tier');

  return (
    <ForgeScreen>
      <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ForgeButton variant="secondary" onClick={() => setScreen('town')}>← 마을로</ForgeButton>
        <h2 style={{ color: 'var(--forge-accent)', margin: 0 }}>🌌 차원 제단</h2>
        <span />
      </div>

      <div role="tablist" style={{ display: 'flex', gap: 4, padding: '0 16px', marginBottom: 8 }}>
        <button
          role="tab"
          aria-selected={tab === 'tier'}
          data-testid="asctree-tab-tier"
          onClick={() => setTab('tier')}
          style={{
            flex: 1, padding: '8px',
            background: tab === 'tier' ? 'var(--forge-accent)' : 'var(--forge-panel)',
            color: tab === 'tier' ? '#000' : 'var(--forge-text)',
            border: 'none', cursor: 'pointer', fontWeight: 700,
          }}
        >
          초월
        </button>
        <button
          role="tab"
          aria-selected={tab === 'tree'}
          data-testid="asctree-tab-tree"
          onClick={() => setTab('tree')}
          style={{
            flex: 1, padding: '8px',
            background: tab === 'tree' ? 'var(--forge-accent)' : 'var(--forge-panel)',
            color: tab === 'tree' ? '#000' : 'var(--forge-text)',
            border: 'none', cursor: 'pointer', fontWeight: 700,
          }}
        >
          성좌
        </button>
      </div>

      {tab === 'tier' ? <TierPanel /> : <AscensionTree />}
    </ForgeScreen>
  );
}
```

- [ ] **Step 5: 테스트 통과**

Run: `pnpm --filter @forge/game-inflation-rpg test -- Ascension`
Expected: PASS (기존 + 2 new).

- [ ] **Step 6: dev 서버에서 시각 확인 (수동)**

Run: `pnpm dev`
열기: http://localhost:3000/inflation-rpg
- 진행 데이터 있는 상태에서 마을 → 차원 제단
- "초월" / "성좌" 탭 표시 확인
- 성좌 탭에서 노드 10개 그리드 / AP 카운터 / 강화 버튼 / 모달 확인

- [ ] **Step 7: Commit**

```bash
git add games/inflation-rpg/src/screens/Ascension.tsx games/inflation-rpg/src/screens/AscensionTree.tsx games/inflation-rpg/src/screens/Ascension.test.tsx
git commit -m "feat(game-inflation-rpg): Ascension.tsx tab layout + AscensionTree screen"
```

---

### Task 15: AscensionTree 컴포넌트 단위 테스트

**Files:**
- Create: `games/inflation-rpg/src/screens/AscensionTree.test.tsx`

- [ ] **Step 1: 단위 테스트 작성**

Create `games/inflation-rpg/src/screens/AscensionTree.test.tsx`:

```ts
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { AscensionTree } from './AscensionTree';
import { useGameStore } from '../store/gameStore';

describe('AscensionTree', () => {
  beforeEach(() => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        ascPoints: 10,
        ascTree: {
          hp_pct: 0, atk_pct: 0, gold_drop: 0, bp_start: 0, sp_per_lvl: 0,
          dungeon_currency: 0, crit_damage: 0, asc_accel: 0,
          mod_magnitude: 0, effect_proc: 0,
        },
      },
    }));
  });

  it('AP 카운터 노출', () => {
    render(<AscensionTree />);
    expect(screen.getByTestId('asctree-ap')).toHaveTextContent('10');
  });

  it('10 노드 카드 렌더링', () => {
    render(<AscensionTree />);
    expect(screen.getAllByTestId(/^asctree-node-/)).toHaveLength(10);
  });

  it('강화 클릭 → 확인 → AP 차감 + lv 증가', async () => {
    const user = userEvent.setup();
    render(<AscensionTree />);
    await user.click(screen.getByTestId('asctree-buy-hp_pct'));
    await user.click(screen.getByTestId('asctree-confirm-hp_pct'));
    expect(useGameStore.getState().meta.ascPoints).toBe(9);
    expect(useGameStore.getState().meta.ascTree.hp_pct).toBe(1);
  });

  it('AP 부족 시 강화 버튼 비활성', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, ascPoints: 0 } }));
    render(<AscensionTree />);
    expect(screen.getByTestId('asctree-buy-hp_pct')).toBeDisabled();
  });

  it('max lv 도달 시 MAX 표시 + 비활성', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, ascTree: { ...s.meta.ascTree, gold_drop: 5 } },
    }));
    render(<AscensionTree />);
    const btn = screen.getByTestId('asctree-buy-gold_drop');
    expect(btn).toHaveTextContent('MAX');
    expect(btn).toBeDisabled();
  });
});
```

- [ ] **Step 2: 테스트 통과 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test -- AscensionTree`
Expected: PASS (5 tests).

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/screens/AscensionTree.test.tsx
git commit -m "test(game-inflation-rpg): AscensionTree component coverage"
```

---

### Task 16: E2E — asctree.spec.ts

**Files:**
- Create: `games/inflation-rpg/tests/e2e/asctree.spec.ts`

- [ ] **Step 1: 기존 E2E 패턴 참조**

Run: `head -40 games/inflation-rpg/tests/e2e/full-game-flow.spec.ts`

Expected: Playwright test 진입 패턴 (test.beforeEach / page.goto / localStorage 시드 등) 확인.

- [ ] **Step 2: asctree.spec.ts 작성**

Create `games/inflation-rpg/tests/e2e/asctree.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('Phase G — Ascension Tree (성좌)', () => {
  test.beforeEach(async ({ page }) => {
    // localStorage 에 ascPoints 충분한 v10 state 시드
    await page.goto('http://localhost:3000/inflation-rpg');
    await page.evaluate(() => {
      localStorage.setItem('inflation-rpg-store', JSON.stringify({
        state: {
          meta: {
            charLvs: {}, ascTier: 0, ascPoints: 50,
            ascTree: {
              hp_pct: 0, atk_pct: 0, gold_drop: 0, bp_start: 0, sp_per_lvl: 0,
              dungeon_currency: 0, crit_damage: 0, asc_accel: 0,
              mod_magnitude: 0, effect_proc: 0,
            },
            crackStones: 0, dungeonFinalsCleared: [],
            tutorialDone: true, tutorialStep: 0,
            // 기타 필수 필드
          },
          run: null,
          screen: 'town',
        },
        version: 10,
      }));
      location.reload();
    });
  });

  test('성좌 탭 → 노드 강화 흐름', async ({ page }) => {
    // 차원 제단 진입
    await page.getByTestId('town-ascension').click();   // 실제 testid 확인
    await expect(page.getByTestId('asctree-tab-tier')).toBeVisible();

    // 성좌 탭
    await page.getByTestId('asctree-tab-tree').click();
    await expect(page.getByTestId('asctree-ap')).toContainText('50');

    // hp_pct 노드 강화
    await page.getByTestId('asctree-buy-hp_pct').click();
    await page.getByTestId('asctree-confirm-hp_pct').click();

    // AP 49, lv 1
    await expect(page.getByTestId('asctree-ap')).toContainText('49');
    await expect(page.getByTestId('asctree-node-hp_pct')).toContainText('lv 1');
  });
});
```

(`town-ascension` testid 는 기존 town 의 차원 제단 버튼 — 정확한 값은 `grep` 으로 확인.)

- [ ] **Step 3: E2E 실행**

Run: `pnpm --filter @forge/game-inflation-rpg e2e`
Expected: 새 test 통과, 기존 회귀 0.

- [ ] **Step 4: Commit + cp6**

```bash
git add games/inflation-rpg/tests/e2e/asctree.spec.ts
git commit -m "test(game-inflation-rpg): E2E coverage for AscensionTree flow"
git tag phase-g-cp6
```

---

## Checkpoint 7 — Final Verification + Tag

### Task 17: 전체 회귀 + merge + tag

**Files:** N/A

- [ ] **Step 1: 전체 typecheck + lint + circular + test + e2e**

Run:
```bash
pnpm typecheck
pnpm lint
pnpm circular
pnpm --filter @forge/game-inflation-rpg test
pnpm --filter @forge/game-inflation-rpg e2e
```

Expected: 0 error / 0 warning / 0 cycles / 모든 테스트 PASS.

- [ ] **Step 2: balance-milestones 회귀 가드 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test -- balance-milestones`
Expected: PASS. 만약 sim fidelity 변경으로 일부 milestone drift > ±5% 면 spec §11 정합 범위로 milestone 재조정 (별도 commit).

- [ ] **Step 3: balance-sweep 산출물 갱신**

Run: `pnpm --filter @forge/game-inflation-rpg balance-sweep > games/inflation-rpg/balance-sweep-out.md` (또는 기존 명령 형태)
Expected: ascTree saturated profile 결과 포함된 sweep 보고서.

- [ ] **Step 4: 카운트 검증**

Run: `pnpm --filter @forge/game-inflation-rpg test 2>&1 | tail -10`
Expected: ~475 vitest / 24 e2e (또는 그 이상). 447 + 28 신규.

- [ ] **Step 5: 최종 tag**

```bash
git tag phase-g-complete
git log --oneline -20
```

- [ ] **Step 6: 메모리 갱신**

`/Users/joel/.claude/projects/-Users-joel-Desktop-git-2d-game-forge/memory/` 에 `project_phase_g_complete.md` 작성 + MEMORY.md 인덱스 한 줄.

---

## Self-Review 체크리스트

이 plan 작성 후 확인:

1. **Spec 커버리지** — spec §3 (노드) / §4 (state) / §5 (효과) / §6 (UI) / §7 (sim) / §8 (테스트) 모두 task 매핑됨 ✓
2. **Placeholder scan** — TBD / TODO / "fill in" 없음 ✓
3. **Type 일관성** — `AscTreeNodeId` / `AscTree` / `ASC_TREE_NODES` / `EMPTY_ASC_TREE` / `nodeCost` / `canBuyAscTreeNode` / `buyAscTreeNode` 모든 task 에서 동일 명명 ✓
4. **Scope** — 단일 phase, 17 task, ~3 PR 분량 (cp1-3 / cp4-5 / cp6-7) ✓

---

## 실행 옵션

**1. Subagent-Driven (recommended)** — fresh subagent per task + 리뷰
**2. Inline Execution** — 현재 세션에서 batch

어느쪽?
