# Inflation RPG Phase 3 — 메타 진행 시스템 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 런 간 캐릭터 레벨·장비 슬롯·장비 계승을 구현해 "반복 플레이 이유"를 만든다.

**Architecture:** MetaState에 `equippedItemIds`, `equipSlotCount`, `lastPlayedCharId` 3개 필드를 추가한다. `stats.ts`의 `calcFinalStat`에 `charLevelMult` 파라미터를 추가하고, `BattleScene`이 전체 인벤토리 대신 `equippedItemIds` 기반 아이템만 사용하도록 수정한다. UI는 Inventory(장착 슬롯 영역 추가), Shop(goldThisRun으로 구매), ClassSelect(레벨 배지), GameOver(레벨업 연출) 순으로 변경한다.

**Tech Stack:** Zustand 5, React 18, Phaser 3, @testing-library/react, Vitest 4

---

## File Map

| 파일 | 변경 | 역할 |
|------|------|------|
| `games/inflation-rpg/src/types.ts` | Modify | MetaState에 3개 필드 추가 |
| `games/inflation-rpg/src/systems/stats.ts` | Modify | `calcFinalStat`에 `charLevelMult` 6번째 파라미터 추가 |
| `games/inflation-rpg/src/systems/stats.test.ts` | Modify | charLevelMult 테스트 추가 |
| `games/inflation-rpg/src/systems/equipment.ts` | Modify | `getEquippedItemsList(inv, ids)` 추가 |
| `games/inflation-rpg/src/systems/equipment.test.ts` | Modify | getEquippedItemsList 테스트 추가 |
| `games/inflation-rpg/src/store/gameStore.ts` | Modify | INITIAL_META 업데이트, SLOT_COSTS 상수, 5개 새 action, endRun·sellEquipment 수정 |
| `games/inflation-rpg/src/store/gameStore.test.ts` | Modify | 새 action 테스트 추가 |
| `games/inflation-rpg/src/battle/BattleScene.ts` | Modify | equippedItemIds 기반 + charLevelMult 적용 |
| `games/inflation-rpg/src/screens/Inventory.tsx` | Modify | 장착 슬롯 영역 + 장착/해제 버튼 |
| `games/inflation-rpg/src/screens/Inventory.test.tsx` | Modify | 장착 슬롯 테스트 추가 |
| `games/inflation-rpg/src/screens/Shop.tsx` | Modify | goldThisRun 수정 + 슬롯 확장 섹션 |
| `games/inflation-rpg/src/screens/Shop.test.tsx` | Create | Shop 테스트 (신규) |
| `games/inflation-rpg/src/screens/ClassSelect.tsx` | Modify | CharCard에 캐릭터 레벨 배지 |
| `games/inflation-rpg/src/screens/ClassSelect.test.tsx` | Modify | 레벨 배지 테스트 추가 |
| `games/inflation-rpg/src/screens/GameOver.tsx` | Modify | 캐릭터 레벨업 연출 |

---

## Task 1: types.ts + gameStore — MetaState 확장 + 새 actions

**Files:**
- Modify: `games/inflation-rpg/src/types.ts`
- Modify: `games/inflation-rpg/src/store/gameStore.ts`
- Test: `games/inflation-rpg/src/store/gameStore.test.ts`

> **주의:** types.ts와 gameStore.ts는 같은 커밋에 묶는다. types.ts만 바꾸면 INITIAL_META가 새 필드를 포함하지 않아 타입체크가 깨진다.

- [ ] **Step 0: types.ts MetaState 필드 추가**

`games/inflation-rpg/src/types.ts`의 `MetaState` 인터페이스를 다음으로 교체:

```ts
export interface MetaState {
  inventory: Inventory;
  baseAbilityLevel: number;
  soulGrade: number;
  hardModeUnlocked: boolean;
  characterLevels: Record<string, number>;
  bestRunLevel: number;
  normalBossesKilled: string[];
  hardBossesKilled: string[];
  gold: number;
  equippedItemIds: string[];   // 장착된 아이템 ID 목록 (순서 = 슬롯 순서)
  equipSlotCount: number;      // 현재 보유 슬롯 수. 기본값 1, 최대 10
  lastPlayedCharId: string;    // GameOver에서 캐릭터 레벨 표시용
}
```

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/store/gameStore.test.ts` 파일 끝(기존 `describe` 블록 밖)에 추가:

```ts
describe('GameStore — Phase 3 메타 진행', () => {
  it('INITIAL_META has equippedItemIds=[] and equipSlotCount=1', () => {
    expect(INITIAL_META.equippedItemIds).toEqual([]);
    expect(INITIAL_META.equipSlotCount).toBe(1);
    expect(INITIAL_META.lastPlayedCharId).toBe('');
  });

  it('equipItem: adds itemId to equippedItemIds', () => {
    const item = {
      id: 'w1', name: '검', slot: 'weapon' as const, rarity: 'common' as const,
      stats: { flat: { atk: 10 } }, dropAreaIds: [], price: 0,
    };
    useGameStore.getState().addEquipment(item);
    useGameStore.getState().equipItem('w1');
    expect(useGameStore.getState().meta.equippedItemIds).toContain('w1');
  });

  it('equipItem: ignores when slot full', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, equipSlotCount: 1, equippedItemIds: ['existing'] } }));
    useGameStore.getState().equipItem('w2');
    expect(useGameStore.getState().meta.equippedItemIds).toHaveLength(1);
  });

  it('equipItem: ignores duplicate', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, equipSlotCount: 2, equippedItemIds: ['w1'] } }));
    useGameStore.getState().equipItem('w1');
    expect(useGameStore.getState().meta.equippedItemIds).toHaveLength(1);
  });

  it('unequipItem: removes itemId from equippedItemIds', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, equippedItemIds: ['w1', 'a1'] } }));
    useGameStore.getState().unequipItem('w1');
    expect(useGameStore.getState().meta.equippedItemIds).toEqual(['a1']);
  });

  it('buyEquipSlot: deducts goldThisRun and increments equipSlotCount', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.setState((s) => ({ run: { ...s.run, goldThisRun: 10_000 } }));
    useGameStore.getState().buyEquipSlot();
    const state = useGameStore.getState();
    expect(state.meta.equipSlotCount).toBe(2);
    expect(state.run.goldThisRun).toBe(5_000);
  });

  it('buyEquipSlot: ignores if not enough gold', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.setState((s) => ({ run: { ...s.run, goldThisRun: 100 } }));
    useGameStore.getState().buyEquipSlot();
    expect(useGameStore.getState().meta.equipSlotCount).toBe(1);
  });

  it('buyEquipSlot: ignores if already at max 10 slots', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.setState((s) => ({
      meta: { ...s.meta, equipSlotCount: 10 },
      run: { ...s.run, goldThisRun: 999_999_999 },
    }));
    useGameStore.getState().buyEquipSlot();
    expect(useGameStore.getState().meta.equipSlotCount).toBe(10);
  });

  it('endRun: increments characterLevels for active character', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().endRun();
    expect(useGameStore.getState().meta.characterLevels['hwarang']).toBe(1);
  });

  it('endRun: increments from existing character level', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, characterLevels: { hwarang: 3 } } }));
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().endRun();
    expect(useGameStore.getState().meta.characterLevels['hwarang']).toBe(4);
  });

  it('endRun: sets lastPlayedCharId', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().endRun();
    expect(useGameStore.getState().meta.lastPlayedCharId).toBe('hwarang');
  });

  it('abandonRun: does NOT increment characterLevels', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().abandonRun();
    expect(useGameStore.getState().meta.characterLevels['hwarang']).toBeUndefined();
  });

  it('sellEquipment: also removes from equippedItemIds', () => {
    const item = {
      id: 'w1', name: '검', slot: 'weapon' as const, rarity: 'common' as const,
      stats: { flat: { atk: 10 } }, dropAreaIds: [], price: 100,
    };
    useGameStore.getState().addEquipment(item);
    useGameStore.getState().equipItem('w1');
    useGameStore.getState().sellEquipment('w1', 100);
    expect(useGameStore.getState().meta.equippedItemIds).not.toContain('w1');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run src/store/gameStore.test.ts
```

Expected: FAIL — `INITIAL_META` 새 필드 없음, 새 actions 없음

- [ ] **Step 3: gameStore.ts 구현**

`games/inflation-rpg/src/store/gameStore.ts`를 다음으로 교체:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RunState, MetaState, Screen, Equipment, AllocatedStats } from '../types';
import { STARTING_BP, onEncounter, onDefeat, onBossKill as bpOnBossKill } from '../systems/bp';
import {
  onBossKill as progressionOnBossKill,
  getBaseAbilityLevel,
  isHardModeUnlocked,
} from '../systems/progression';
import { addToInventory, removeFromInventory } from '../systems/equipment';

const INITIAL_ALLOCATED: AllocatedStats = { hp: 0, atk: 0, def: 0, agi: 0, luc: 0 };

export const SLOT_COSTS: Record<number, number> = {
  1: 5_000,
  2: 15_000,
  3: 50_000,
  4: 150_000,
  5: 500_000,
  6: 1_500_000,
  7: 5_000_000,
  8: 15_000_000,
  9: 50_000_000,
};

export const INITIAL_RUN: RunState = {
  characterId: '',
  level: 1,
  exp: 0,
  bp: STARTING_BP,
  statPoints: 0,
  allocated: INITIAL_ALLOCATED,
  currentAreaId: 'village-entrance',
  isHardMode: false,
  monstersDefeated: 0,
  goldThisRun: 0,
};

export const INITIAL_META: MetaState = {
  inventory: { weapons: [], armors: [], accessories: [] },
  baseAbilityLevel: 0,
  soulGrade: 0,
  hardModeUnlocked: false,
  characterLevels: {},
  bestRunLevel: 0,
  normalBossesKilled: [],
  hardBossesKilled: [],
  gold: 0,
  equippedItemIds: [],
  equipSlotCount: 1,
  lastPlayedCharId: '',
};

interface GameStore {
  screen: Screen;
  run: RunState;
  meta: MetaState;
  setScreen: (s: Screen) => void;
  startRun: (characterId: string, isHardMode: boolean) => void;
  endRun: () => void;
  abandonRun: () => void;
  encounterMonster: () => void;
  defeatRun: () => void;
  gainLevels: (levels: number, spGained: number) => void;
  gainExp: (exp: number) => void;
  allocateSP: (stat: keyof AllocatedStats, amount: number) => void;
  bossDrop: (bossId: string, bpReward: number) => void;
  addEquipment: (item: Equipment) => void;
  sellEquipment: (itemId: string, price: number) => void;
  equipItem: (itemId: string) => void;
  unequipItem: (itemId: string) => void;
  buyEquipSlot: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      screen: 'main-menu',
      run: INITIAL_RUN,
      meta: INITIAL_META,

      setScreen: (screen) => set({ screen }),

      startRun: (characterId, isHardMode) =>
        set({ run: { ...INITIAL_RUN, characterId, isHardMode }, screen: 'world-map' }),

      endRun: () => {
        const { run, meta } = get();
        const bestRunLevel = Math.max(meta.bestRunLevel, run.level);
        const charId = run.characterId;
        const prevCharLv = meta.characterLevels[charId] ?? 0;
        set({
          run: INITIAL_RUN,
          meta: {
            ...meta,
            bestRunLevel,
            hardModeUnlocked: isHardModeUnlocked(bestRunLevel),
            characterLevels: { ...meta.characterLevels, [charId]: prevCharLv + 1 },
            lastPlayedCharId: charId,
          },
          screen: 'game-over',
        });
      },

      abandonRun: () => set({ run: INITIAL_RUN, screen: 'main-menu' }),

      encounterMonster: () =>
        set((s) => ({ run: { ...s.run, bp: onEncounter(s.run.bp) } })),

      defeatRun: () =>
        set((s) => ({ run: { ...s.run, bp: onDefeat(s.run.bp, s.run.isHardMode) } })),

      gainLevels: (levels, spGained) =>
        set((s) => ({
          run: { ...s.run, level: s.run.level + levels, statPoints: s.run.statPoints + spGained },
        })),

      gainExp: (exp) =>
        set((s) => ({ run: { ...s.run, exp: s.run.exp + exp } })),

      allocateSP: (stat, amount) =>
        set((s) => {
          if (s.run.statPoints < amount) return s;
          return {
            run: {
              ...s.run,
              statPoints: s.run.statPoints - amount,
              allocated: { ...s.run.allocated, [stat]: s.run.allocated[stat] + amount },
            },
          };
        }),

      bossDrop: (bossId, bpReward) =>
        set((s) => {
          const normalKilled = s.run.isHardMode
            ? s.meta.normalBossesKilled
            : progressionOnBossKill(bossId, s.meta.normalBossesKilled, 9);
          const hardKilled = s.run.isHardMode
            ? progressionOnBossKill(bossId, s.meta.hardBossesKilled, 9)
            : s.meta.hardBossesKilled;
          return {
            run: { ...s.run, bp: bpOnBossKill(s.run.bp, bpReward) },
            meta: {
              ...s.meta,
              normalBossesKilled: normalKilled,
              hardBossesKilled: hardKilled,
              baseAbilityLevel: getBaseAbilityLevel(normalKilled, hardKilled),
            },
          };
        }),

      addEquipment: (item) =>
        set((s) => ({ meta: { ...s.meta, inventory: addToInventory(s.meta.inventory, item) } })),

      sellEquipment: (itemId, price) =>
        set((s) => ({
          meta: {
            ...s.meta,
            inventory: removeFromInventory(s.meta.inventory, itemId),
            equippedItemIds: s.meta.equippedItemIds.filter((id) => id !== itemId),
            gold: s.meta.gold + price,
          },
        })),

      equipItem: (itemId) =>
        set((s) => {
          if (s.meta.equippedItemIds.length >= s.meta.equipSlotCount) return s;
          if (s.meta.equippedItemIds.includes(itemId)) return s;
          return { meta: { ...s.meta, equippedItemIds: [...s.meta.equippedItemIds, itemId] } };
        }),

      unequipItem: (itemId) =>
        set((s) => ({
          meta: { ...s.meta, equippedItemIds: s.meta.equippedItemIds.filter((id) => id !== itemId) },
        })),

      buyEquipSlot: () =>
        set((s) => {
          const cost = SLOT_COSTS[s.meta.equipSlotCount];
          if (!cost || s.run.goldThisRun < cost) return s;
          return {
            run: { ...s.run, goldThisRun: s.run.goldThisRun - cost },
            meta: { ...s.meta, equipSlotCount: s.meta.equipSlotCount + 1 },
          };
        }),
    }),
    {
      name: 'korea_inflation_rpg_save',
      partialize: (state) => ({ meta: state.meta, run: state.run }),
    }
  )
);
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run src/store/gameStore.test.ts
```

Expected: 모든 테스트 통과 (기존 8 + 신규 13 = 21 tests)

- [ ] **Step 5: typecheck 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors

- [ ] **Step 6: 커밋 (types.ts 포함)**

```bash
git add games/inflation-rpg/src/types.ts games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts
git commit -m "feat(game-inflation-rpg): add equip slots, char level, buyEquipSlot to store"
```

---

## Task 3: stats.ts — charLevelMult 파라미터 추가

**Files:**
- Modify: `games/inflation-rpg/src/systems/stats.ts`
- Test: `games/inflation-rpg/src/systems/stats.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/systems/stats.test.ts`의 `describe('Stats System')` 블록 안에 추가:

```ts
it('calcFinalStat: charLevelMult scales the final result', () => {
  // atk: base=10, sp=0, charClassMult=1, noEquip, baseAbility=1, charLevelMult=1.3
  // raw = (10 + 0) * 1 = 10; flat=0; pct=1; floor(10 * 1 * 1 * 1.3) = 13
  expect(calcFinalStat('atk', 0, 1.0, noEquip, 1, 1.3)).toBe(13);
});

it('calcFinalStat: charLevelMult defaults to 1 (backward compat)', () => {
  expect(calcFinalStat('atk', 0, 1.0, noEquip, 1)).toBe(10);
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run src/systems/stats.test.ts
```

Expected: FAIL — `calcFinalStat`이 6번째 인자를 받지 않음

- [ ] **Step 3: stats.ts 구현**

`games/inflation-rpg/src/systems/stats.ts`의 `calcFinalStat`을 다음으로 교체:

```ts
export function calcFinalStat(
  key: StatKey,
  allocated: number,
  charMult: number,
  equipped: Equipment[],
  baseAbilityMult: number,
  charLevelMult = 1
): number {
  const raw = calcRawStat(key, allocated, charMult);
  const flat = calcEquipmentFlat(key, equipped);
  const pct = calcEquipmentPercentMult(key, equipped);
  return Math.floor((raw + flat) * pct * baseAbilityMult * charLevelMult);
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run src/systems/stats.test.ts
```

Expected: 모든 테스트 통과

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/systems/stats.ts games/inflation-rpg/src/systems/stats.test.ts
git commit -m "feat(game-inflation-rpg): add charLevelMult param to calcFinalStat"
```

---

## Task 4: equipment.ts — getEquippedItemsList 추가

**Files:**
- Modify: `games/inflation-rpg/src/systems/equipment.ts`
- Test: `games/inflation-rpg/src/systems/equipment.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/systems/equipment.test.ts` 파일의 **상단 import 구역에** 다음을 추가 (기존 import 아래):

```ts
import { getEquippedItemsList } from './equipment';
import type { Inventory } from '../types';
```

그리고 **파일 끝에** 다음 describe 블록 추가:

const testSword: Equipment = {
  id: 'w-sword', name: '검', slot: 'weapon', rarity: 'common',
  stats: { flat: { atk: 80 } }, dropAreaIds: [], price: 300,
};
const testArmor: Equipment = {
  id: 'a-cloth', name: '갑옷', slot: 'armor', rarity: 'common',
  stats: { flat: { def: 20 } }, dropAreaIds: [], price: 150,
};

describe('getEquippedItemsList', () => {
  const inv: Inventory = {
    weapons: [testSword],
    armors: [testArmor],
    accessories: [],
  };

  it('returns items matching equippedItemIds in order', () => {
    const result = getEquippedItemsList(inv, ['a-cloth', 'w-sword']);
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('a-cloth');
    expect(result[1]!.id).toBe('w-sword');
  });

  it('ignores IDs not found in inventory', () => {
    expect(getEquippedItemsList(inv, ['non-existent'])).toHaveLength(0);
  });

  it('returns empty array when equippedItemIds is empty', () => {
    expect(getEquippedItemsList(inv, [])).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run src/systems/equipment.test.ts
```

Expected: FAIL — `getEquippedItemsList is not a function`

- [ ] **Step 3: equipment.ts 구현**

`games/inflation-rpg/src/systems/equipment.ts` 파일 끝에 추가:

```ts
export function getEquippedItemsList(inv: Inventory, equippedItemIds: string[]): Equipment[] {
  const all = getAllEquipped(inv);
  return equippedItemIds
    .map((id) => all.find((e) => e.id === id))
    .filter((e): e is Equipment => e !== undefined);
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run src/systems/equipment.test.ts
```

Expected: 모든 테스트 통과

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/systems/equipment.ts games/inflation-rpg/src/systems/equipment.test.ts
git commit -m "feat(game-inflation-rpg): add getEquippedItemsList to equipment system"
```

---

## Task 5: BattleScene.ts — equippedItemIds + charLevelMult 적용

**Files:**
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts`

이 파일은 Phaser Scene이라 Vitest로 직접 테스트하지 않는다. 변경 후 전체 테스트 스위트로 회귀 확인한다.

- [ ] **Step 1: import 라인 수정**

`games/inflation-rpg/src/battle/BattleScene.ts` line 6을 다음으로 변경:

```ts
import { getAllEquipped, getEquippedItemsList } from '../systems/equipment';
```

- [ ] **Step 2: doRound() 메서드 내 스탯 계산 수정**

`games/inflation-rpg/src/battle/BattleScene.ts`의 `doRound()` 메서드에서 다음 두 줄을:

```ts
const baseAbility = calcBaseAbilityMult(meta.baseAbilityLevel);
const allEquipped = getAllEquipped(meta.inventory);
```

다음으로 교체:

```ts
const baseAbility = calcBaseAbilityMult(meta.baseAbilityLevel);
const allEquipped = getEquippedItemsList(meta.inventory, meta.equippedItemIds);
const charLv = meta.characterLevels[run.characterId] ?? 0;
const charLevelMult = 1 + charLv * 0.1;
```

- [ ] **Step 3: calcFinalStat 호출 5개에 charLevelMult 추가**

다음 5줄을:

```ts
const playerATK = calcFinalStat('atk', run.allocated.atk, char.statMultipliers.atk, allEquipped, baseAbility);
const playerDEF = calcFinalStat('def', run.allocated.def, char.statMultipliers.def, allEquipped, baseAbility);
const playerHP  = calcFinalStat('hp',  run.allocated.hp,  char.statMultipliers.hp,  allEquipped, baseAbility);
const playerAGI = calcFinalStat('agi', run.allocated.agi, char.statMultipliers.agi, allEquipped, baseAbility);
const playerLUC = calcFinalStat('luc', run.allocated.luc, char.statMultipliers.luc, allEquipped, baseAbility);
```

다음으로 교체:

```ts
const playerATK = calcFinalStat('atk', run.allocated.atk, char.statMultipliers.atk, allEquipped, baseAbility, charLevelMult);
const playerDEF = calcFinalStat('def', run.allocated.def, char.statMultipliers.def, allEquipped, baseAbility, charLevelMult);
const playerHP  = calcFinalStat('hp',  run.allocated.hp,  char.statMultipliers.hp,  allEquipped, baseAbility, charLevelMult);
const playerAGI = calcFinalStat('agi', run.allocated.agi, char.statMultipliers.agi, allEquipped, baseAbility, charLevelMult);
const playerLUC = calcFinalStat('luc', run.allocated.luc, char.statMultipliers.luc, allEquipped, baseAbility, charLevelMult);
```

- [ ] **Step 4: 전체 테스트 통과 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run
```

Expected: 모든 테스트 통과

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/battle/BattleScene.ts
git commit -m "feat(game-inflation-rpg): apply equippedItemIds and charLevelMult in battle"
```

---

## Task 6: Inventory.tsx — 장착 슬롯 UI + 장착/해제 버튼

**Files:**
- Modify: `games/inflation-rpg/src/screens/Inventory.tsx`
- Modify: `games/inflation-rpg/src/screens/Inventory.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/screens/Inventory.test.tsx`를 다음으로 교체:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { Inventory } from './Inventory';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';
import type { Equipment } from '../types';

const sword: Equipment = {
  id: 'w-sword', name: '철검', slot: 'weapon', rarity: 'common',
  stats: { flat: { atk: 80 } }, dropAreaIds: [], price: 300,
};
const cloth: Equipment = {
  id: 'a-cloth', name: '베옷', slot: 'armor', rarity: 'common',
  stats: { flat: { def: 20 } }, dropAreaIds: [], price: 150,
};

beforeEach(() => {
  useGameStore.setState({
    screen: 'inventory',
    run: INITIAL_RUN,
    meta: {
      ...INITIAL_META,
      inventory: { weapons: [sword], armors: [cloth], accessories: [] },
      equipSlotCount: 1,
      equippedItemIds: [],
    },
  });
});

describe('Inventory — 기존 테스트', () => {
  it('shows weapon tab with item count', () => {
    render(<Inventory />);
    expect(screen.getByText(/무기.*1\/10/i)).toBeInTheDocument();
  });

  it('renders the sword item', () => {
    render(<Inventory />);
    expect(screen.getByText('철검')).toBeInTheDocument();
  });

  it('back button returns to previous screen', async () => {
    render(<Inventory />);
    await userEvent.click(screen.getByRole('button', { name: /뒤로/i }));
    expect(['main-menu', 'world-map']).toContain(useGameStore.getState().screen);
  });
});

describe('Inventory — 장착 슬롯', () => {
  it('shows equipped slot count label', () => {
    render(<Inventory />);
    expect(screen.getByText(/장착 슬롯.*0\/1/i)).toBeInTheDocument();
  });

  it('장착 button is enabled when slot available', () => {
    render(<Inventory />);
    const equipBtn = screen.getAllByRole('button', { name: /장착/i })[0];
    expect(equipBtn).not.toBeDisabled();
  });

  it('클릭 장착 → equippedItemIds에 추가', async () => {
    render(<Inventory />);
    const equipBtn = screen.getAllByRole('button', { name: /장착/i })[0];
    await userEvent.click(equipBtn!);
    expect(useGameStore.getState().meta.equippedItemIds).toContain('w-sword');
  });

  it('해제 button appears after equipping', async () => {
    render(<Inventory />);
    const equipBtn = screen.getAllByRole('button', { name: /장착/i })[0];
    await userEvent.click(equipBtn!);
    expect(screen.getByRole('button', { name: /해제/i })).toBeInTheDocument();
  });

  it('클릭 해제 → equippedItemIds에서 제거', async () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, equippedItemIds: ['w-sword'], equipSlotCount: 1 },
    }));
    render(<Inventory />);
    await userEvent.click(screen.getByRole('button', { name: /해제/i }));
    expect(useGameStore.getState().meta.equippedItemIds).not.toContain('w-sword');
  });

  it('장착 button disabled when slots full', async () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, equippedItemIds: ['w-sword'], equipSlotCount: 1 },
    }));
    render(<Inventory />);
    // 방어구 탭으로 전환
    await userEvent.click(screen.getByRole('button', { name: /방어구/i }));
    const equipBtn = screen.queryByRole('button', { name: /^장착$/i });
    expect(equipBtn).toBeDisabled();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run src/screens/Inventory.test.tsx
```

Expected: 신규 장착 슬롯 테스트들 FAIL

- [ ] **Step 3: Inventory.tsx 구현**

`games/inflation-rpg/src/screens/Inventory.tsx`를 다음으로 교체:

```tsx
import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Equipment, EquipmentSlot } from '../types';
import { SLOT_LIMITS } from '../systems/equipment';

const TABS: { slot: EquipmentSlot; label: string; emoji: string }[] = [
  { slot: 'weapon',    label: '무기',     emoji: '⚔️' },
  { slot: 'armor',     label: '방어구',   emoji: '🛡️' },
  { slot: 'accessory', label: '악세사리', emoji: '💍' },
];

export function Inventory() {
  const [activeSlot, setActiveSlot] = useState<EquipmentSlot>('weapon');
  const meta = useGameStore((s) => s.meta);
  const setScreen = useGameStore((s) => s.setScreen);
  const sellEquipment = useGameStore((s) => s.sellEquipment);
  const equipItem = useGameStore((s) => s.equipItem);
  const unequipItem = useGameStore((s) => s.unequipItem);
  const run = useGameStore((s) => s.run);

  const allItems: Equipment[] = [
    ...meta.inventory.weapons,
    ...meta.inventory.armors,
    ...meta.inventory.accessories,
  ];
  const equippedItems = meta.equippedItemIds
    .map((id) => allItems.find((e) => e.id === id))
    .filter((e): e is Equipment => e !== undefined);

  const tabItems = activeSlot === 'weapon'
    ? meta.inventory.weapons
    : activeSlot === 'armor'
    ? meta.inventory.armors
    : meta.inventory.accessories;

  const isFull = meta.equippedItemIds.length >= meta.equipSlotCount;
  const backScreen = run.characterId ? 'world-map' : 'main-menu';

  return (
    <div className="screen" style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setScreen(backScreen)}>
          ← 뒤로
        </button>
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>인벤토리</span>
        <span style={{ fontSize: 12, color: 'var(--luc-color)' }}>💰 {meta.gold.toLocaleString()}</span>
      </div>

      {/* Equipped Slots */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
          장착 슬롯 ({meta.equippedItemIds.length}/{meta.equipSlotCount})
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Array.from({ length: 10 }).map((_, i) => {
            const item = equippedItems[i];
            const isOwned = i < meta.equipSlotCount;
            if (!isOwned) {
              return (
                <div key={i} style={{ width: 58, height: 58, background: '#111', border: '2px dashed #1a1a1a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 18, opacity: 0.3 }}>🔒</span>
                </div>
              );
            }
            if (item) {
              return (
                <div key={i} onClick={() => unequipItem(item.id)} style={{ width: 58, height: 58, background: 'var(--bg-card)', border: '2px solid var(--accent)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: 'pointer', padding: 2 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textAlign: 'center', lineHeight: 1.2 }}>{item.name}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>해제</div>
                </div>
              );
            }
            return (
              <div key={i} style={{ width: 58, height: 58, background: 'var(--bg-card)', border: '2px dashed #2a4060', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>비어있음</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {TABS.map((tab) => {
          const count = tab.slot === 'weapon' ? meta.inventory.weapons.length
            : tab.slot === 'armor' ? meta.inventory.armors.length
            : meta.inventory.accessories.length;
          return (
            <button
              key={tab.slot}
              onClick={() => setActiveSlot(tab.slot)}
              style={{
                flex: 1,
                background: activeSlot === tab.slot ? 'var(--accent-dim)' : 'var(--bg-card)',
                border: `1px solid ${activeSlot === tab.slot ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 6, padding: '6px 4px', fontSize: 11,
                color: activeSlot === tab.slot ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {tab.emoji} {tab.label} {count}/{SLOT_LIMITS[tab.slot]}
            </button>
          );
        })}
      </div>

      {/* Items */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
        {tabItems.map((item) => {
          const isEquipped = meta.equippedItemIds.includes(item.id);
          return (
            <EquipmentCard
              key={item.id}
              item={item}
              isEquipped={isEquipped}
              canEquip={!isFull && !isEquipped}
              onEquip={() => equipItem(item.id)}
              onUnequip={() => unequipItem(item.id)}
              onSell={() => sellEquipment(item.id, item.price)}
            />
          );
        })}
        {tabItems.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
            장비가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}

function EquipmentCard({ item, isEquipped, canEquip, onEquip, onUnequip, onSell }: {
  item: Equipment;
  isEquipped: boolean;
  canEquip: boolean;
  onEquip: () => void;
  onUnequip: () => void;
  onSell: () => void;
}) {
  const rarityColor: Record<string, string> = {
    common: 'var(--border)', rare: '#c060e0', epic: '#60a0e0', legendary: 'var(--accent)',
  };
  const statStr = Object.entries(item.stats.percent ?? {})
    .map(([k, v]) => `${k.toUpperCase()}+${v}%`)
    .concat(Object.entries(item.stats.flat ?? {}).map(([k, v]) => `${k.toUpperCase()}+${v}`))
    .join(' ');

  return (
    <div style={{ background: 'var(--bg-card)', border: `1px solid ${isEquipped ? 'var(--accent)' : rarityColor[item.rarity]}`, borderRadius: 8, padding: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{item.name}</div>
      <div style={{ fontSize: 11, color: 'var(--atk-color)', marginBottom: 6 }}>{statStr}</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {isEquipped ? (
          <button
            onClick={onUnequip}
            style={{ fontSize: 11, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 4, padding: '2px 6px', color: 'var(--accent)', cursor: 'pointer' }}
          >
            해제
          </button>
        ) : (
          <button
            onClick={onEquip}
            disabled={!canEquip}
            style={{ fontSize: 11, background: canEquip ? 'var(--accent-dim)' : 'none', border: `1px solid ${canEquip ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 4, padding: '2px 6px', color: canEquip ? 'var(--accent)' : 'var(--text-muted)', cursor: canEquip ? 'pointer' : 'default' }}
          >
            장착
          </button>
        )}
        <button
          onClick={onSell}
          style={{ fontSize: 11, background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          매각 {item.price.toLocaleString()}G
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run src/screens/Inventory.test.tsx
```

Expected: 모든 테스트 통과

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/screens/Inventory.tsx games/inflation-rpg/src/screens/Inventory.test.tsx
git commit -m "feat(game-inflation-rpg): redesign inventory with equip slots section"
```

---

## Task 7: Shop.tsx — goldThisRun 수정 + 슬롯 확장 + Shop.test.tsx

**Files:**
- Modify: `games/inflation-rpg/src/screens/Shop.tsx`
- Create: `games/inflation-rpg/src/screens/Shop.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/screens/Shop.test.tsx` 파일을 새로 생성:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { Shop } from './Shop';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';

beforeEach(() => {
  useGameStore.setState({
    screen: 'shop',
    run: { ...INITIAL_RUN, characterId: 'hwarang', goldThisRun: 10_000 },
    meta: { ...INITIAL_META, equipSlotCount: 1 },
  });
});

describe('Shop — 현재 골드 표시', () => {
  it('displays goldThisRun as current gold', () => {
    render(<Shop />);
    expect(screen.getByText(/10,000/)).toBeInTheDocument();
  });
});

describe('Shop — 슬롯 확장', () => {
  it('shows slot expansion button with price', () => {
    render(<Shop />);
    expect(screen.getByText(/슬롯 확장/i)).toBeInTheDocument();
    expect(screen.getByText(/5,000/)).toBeInTheDocument();
  });

  it('slot expansion button is disabled when not enough gold', () => {
    useGameStore.setState((s) => ({ run: { ...s.run, goldThisRun: 100 } }));
    render(<Shop />);
    const slotBtn = screen.getByRole('button', { name: /슬롯 확장/i });
    expect(slotBtn).toBeDisabled();
  });

  it('buying slot increments equipSlotCount', async () => {
    render(<Shop />);
    await userEvent.click(screen.getByRole('button', { name: /슬롯 확장/i }));
    expect(useGameStore.getState().meta.equipSlotCount).toBe(2);
    expect(useGameStore.getState().run.goldThisRun).toBe(5_000);
  });

  it('hides slot expansion when at max 10 slots', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, equipSlotCount: 10 } }));
    render(<Shop />);
    expect(screen.queryByRole('button', { name: /슬롯 확장/i })).not.toBeInTheDocument();
  });
});

describe('Shop — 장비 구매', () => {
  it('장비 구매 button disabled when not enough goldThisRun', () => {
    useGameStore.setState((s) => ({ run: { ...s.run, goldThisRun: 0 } }));
    render(<Shop />);
    const buyBtns = screen.getAllByRole('button').filter(
      (b) => b.textContent?.match(/G$/) && !b.textContent?.includes('슬롯')
    );
    buyBtns.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('구매 후 goldThisRun 차감 및 inventory 추가', async () => {
    useGameStore.setState((s) => ({ run: { ...s.run, goldThisRun: 1_000 } }));
    render(<Shop />);
    // 단도 (100G)
    const btn = screen.getByRole('button', { name: /100/i });
    await userEvent.click(btn);
    expect(useGameStore.getState().run.goldThisRun).toBe(900);
    expect(useGameStore.getState().meta.inventory.weapons.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run src/screens/Shop.test.tsx
```

Expected: FAIL — Shop이 goldThisRun 표시/사용 안 함, 슬롯 확장 없음

- [ ] **Step 3: Shop.tsx 구현**

`games/inflation-rpg/src/screens/Shop.tsx`를 다음으로 교체:

```tsx
import React from 'react';
import { useGameStore, SLOT_COSTS } from '../store/gameStore';
import { EQUIPMENT_CATALOG } from '../data/equipment';
import { canDrop } from '../systems/equipment';

export function Shop() {
  const meta = useGameStore((s) => s.meta);
  const run = useGameStore((s) => s.run);
  const setScreen = useGameStore((s) => s.setScreen);
  const addEquipment = useGameStore((s) => s.addEquipment);
  const buyEquipSlot = useGameStore((s) => s.buyEquipSlot);

  const buyEquipment = (itemId: string, price: number) => {
    if (run.goldThisRun < price) return;
    const item = EQUIPMENT_CATALOG.find((e) => e.id === itemId);
    if (!item || !canDrop(meta.inventory, item.slot)) return;
    addEquipment(item);
    useGameStore.setState((s) => ({ run: { ...s.run, goldThisRun: s.run.goldThisRun - price } }));
  };

  const backScreen = run.characterId ? 'world-map' : 'main-menu';
  const nextSlotCost = SLOT_COSTS[meta.equipSlotCount];

  return (
    <div className="screen" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setScreen(backScreen)}>
          ← 뒤로
        </button>
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>상점</span>
        <span style={{ fontSize: 12, color: 'var(--luc-color)' }}>
          💰 {run.goldThisRun.toLocaleString()}G
        </span>
      </div>

      {/* 슬롯 확장 */}
      {nextSlotCost && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
            🔧 장비 슬롯 확장 (현재 {meta.equipSlotCount}/10)
          </div>
          <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>슬롯 확장</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>장착 슬롯 +1 (영구)</div>
            </div>
            <button
              disabled={run.goldThisRun < nextSlotCost}
              onClick={buyEquipSlot}
              style={{
                background: run.goldThisRun >= nextSlotCost ? 'var(--accent)' : 'var(--bg-card)',
                color: run.goldThisRun >= nextSlotCost ? '#1a1a24' : 'var(--text-muted)',
                border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700,
                cursor: run.goldThisRun >= nextSlotCost ? 'pointer' : 'default',
              }}
            >
              {nextSlotCost.toLocaleString()}G
            </button>
          </div>
        </div>
      )}

      {/* 장비 구매 */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>⚔️ 장비</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {EQUIPMENT_CATALOG.map((item) => {
          const canBuy = run.goldThisRun >= item.price && canDrop(meta.inventory, item.slot);
          const statStr = Object.entries(item.stats.percent ?? {})
            .map(([k, v]) => `${k.toUpperCase()}+${v}%`)
            .concat(Object.entries(item.stats.flat ?? {}).map(([k, v]) => `${k.toUpperCase()}+${v}`))
            .join(' ');
          return (
            <div key={item.id} className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: 'var(--atk-color)' }}>{statStr}</div>
              </div>
              <button
                disabled={!canBuy}
                onClick={() => buyEquipment(item.id, item.price)}
                style={{
                  background: canBuy ? 'var(--accent)' : 'var(--bg-card)',
                  color: canBuy ? '#1a1a24' : 'var(--text-muted)',
                  border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700,
                  cursor: canBuy ? 'pointer' : 'default',
                }}
              >
                {item.price.toLocaleString()}G
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run src/screens/Shop.test.tsx
```

Expected: 모든 테스트 통과

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/screens/Shop.tsx games/inflation-rpg/src/screens/Shop.test.tsx
git commit -m "feat(game-inflation-rpg): implement shop with goldThisRun and slot expansion"
```

---

## Task 8: ClassSelect.tsx — 캐릭터 레벨 배지

**Files:**
- Modify: `games/inflation-rpg/src/screens/ClassSelect.tsx`
- Modify: `games/inflation-rpg/src/screens/ClassSelect.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/screens/ClassSelect.test.tsx`의 `describe('ClassSelect')` 블록 끝에 추가:

```ts
it('shows character level badge when charLv > 0', () => {
  useGameStore.setState((s) => ({
    meta: { ...s.meta, characterLevels: { hwarang: 3 } },
  }));
  render(<ClassSelect />);
  expect(screen.getByText(/Lv\.3/)).toBeInTheDocument();
});

it('does not show level badge when charLv is 0 or absent', () => {
  render(<ClassSelect />);
  expect(screen.queryByText(/Lv\.\d/)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run src/screens/ClassSelect.test.tsx
```

Expected: 신규 2개 테스트 FAIL

- [ ] **Step 3: ClassSelect.tsx 수정**

`games/inflation-rpg/src/screens/ClassSelect.tsx`에서 `ClassSelect` 컴포넌트와 `CharCard` 함수를 다음으로 교체:

```tsx
export function ClassSelect() {
  const [selected, setSelected] = useState<string | null>(null);
  const startRun = useGameStore((s) => s.startRun);
  const setScreen = useGameStore((s) => s.setScreen);
  const meta = useGameStore((s) => s.meta);
  const unlocked = getUnlockedCharacters(meta.soulGrade);
  const unlockedIds = new Set(unlocked.map((c) => c.id));

  const handleStart = () => {
    if (!selected) return;
    startRun(selected, false);
  };

  return (
    <div className="screen" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setScreen('main-menu')}>
          ← 뒤로
        </button>
        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>영웅을 선택하라</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>영혼등급 {meta.soulGrade}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {CHARACTERS.map((char) => {
          const isUnlocked = unlockedIds.has(char.id);
          const isSelected = selected === char.id;
          const charLv = meta.characterLevels[char.id] ?? 0;
          return (
            <CharCard
              key={char.id}
              char={char}
              unlocked={isUnlocked}
              selected={isSelected}
              charLv={charLv}
              onSelect={() => isUnlocked && setSelected(char.id)}
            />
          );
        })}
      </div>

      {selected && (
        <CharDetail char={CHARACTERS.find((c) => c.id === selected)!} />
      )}

      <button
        className="btn-primary"
        style={{ width: '100%', marginTop: 'auto', opacity: selected ? 1 : 0.4 }}
        disabled={!selected}
        onClick={handleStart}
      >
        모험 시작
      </button>
    </div>
  );
}

function CharCard({ char, unlocked, selected, charLv, onSelect }: {
  char: Character;
  unlocked: boolean;
  selected: boolean;
  charLv: number;
  onSelect: () => void;
}) {
  return (
    <button
      role="button"
      aria-label={unlocked ? char.nameKR : '잠김'}
      className={selected ? 'selected' : ''}
      onClick={onSelect}
      style={{
        background: selected ? 'var(--accent-dim)' : 'var(--bg-card)',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 8,
        padding: '8px 4px',
        textAlign: 'center',
        cursor: unlocked ? 'pointer' : 'default',
        opacity: unlocked ? 1 : 0.35,
        position: 'relative',
      }}
    >
      {charLv > 0 && (
        <div style={{ position: 'absolute', top: 2, right: 2, background: 'var(--accent)', color: '#1a1a24', fontSize: 8, fontWeight: 700, borderRadius: 3, padding: '1px 3px', lineHeight: 1.2 }}>
          Lv.{charLv}
        </div>
      )}
      <div style={{ fontSize: 24, lineHeight: 1 }}>{unlocked ? char.emoji : '🔒'}</div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 4 }}>
        {unlocked ? char.nameKR : '???'}
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
        {unlocked ? char.statFocus : ''}
      </div>
    </button>
  );
}
```

`CharDetail` 함수는 기존 그대로 유지.

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run src/screens/ClassSelect.test.tsx
```

Expected: 모든 테스트 통과

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/screens/ClassSelect.tsx games/inflation-rpg/src/screens/ClassSelect.test.tsx
git commit -m "feat(game-inflation-rpg): show character level badge in class select"
```

---

## Task 9: GameOver.tsx — 캐릭터 레벨업 연출

**Files:**
- Modify: `games/inflation-rpg/src/screens/GameOver.tsx`

GameOver는 단순한 표시 변경이므로 테스트 없이 수정한다. (기존 GameOver 테스트 없음)

- [ ] **Step 1: GameOver.tsx 수정**

`games/inflation-rpg/src/screens/GameOver.tsx`를 다음으로 교체:

```tsx
import React from 'react';
import { useGameStore } from '../store/gameStore';

export function GameOver() {
  const meta = useGameStore((s) => s.meta);
  const setScreen = useGameStore((s) => s.setScreen);

  const charId = meta.lastPlayedCharId;
  const newCharLv = charId ? (meta.characterLevels[charId] ?? 1) : 0;
  const prevCharLv = newCharLv - 1;

  return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
      <div style={{ fontSize: 48 }}>💀</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--danger)' }}>런 종료</div>
      <div className="panel" style={{ width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>최고 기록</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>
          Lv.{meta.bestRunLevel.toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          베이스 어빌리티 Lv.{meta.baseAbilityLevel}
          {meta.hardModeUnlocked && <span style={{ color: 'var(--danger)', marginLeft: 8 }}>하드모드 해금!</span>}
        </div>
      </div>
      {charId && newCharLv > 0 && (
        <div className="panel" style={{ width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>캐릭터 성장</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
            캐릭터 레벨 {prevCharLv} → {newCharLv}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            스탯 배율 ×{(1 + newCharLv * 0.1).toFixed(1)}
          </div>
        </div>
      )}
      <button className="btn-primary" style={{ width: '100%' }} onClick={() => setScreen('class-select')}>
        다시 도전
      </button>
      <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setScreen('main-menu')}>
        메인 메뉴
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 전체 테스트 통과 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run
```

Expected: 모든 테스트 통과

- [ ] **Step 3: 커밋**

```bash
git add games/inflation-rpg/src/screens/GameOver.tsx
git commit -m "feat(game-inflation-rpg): show character level up on game over screen"
```

---

## Task 10: 최종 검증 및 머지

- [ ] **Step 1: 전체 테스트**

```bash
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 전체 통과. 기존 69 tests + Task 2의 13 + Task 3의 2 + Task 4의 3 + Task 6의 5 + Task 7의 5 + Task 8의 2 = **99+ tests passed**

- [ ] **Step 2: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors

- [ ] **Step 3: lint**

```bash
pnpm --filter @forge/game-inflation-rpg lint
```

Expected: 0 errors

- [ ] **Step 4: circular dependency check**

```bash
pnpm circular
```

Expected: No circular dependency found

- [ ] **Step 5: 브랜치 머지 및 태그**

feature 브랜치에서 작업했다면:

```bash
git checkout main
git merge --no-ff feat/inflation-rpg-phase3 -m "Merge branch 'feat/inflation-rpg-phase3' — Phase 3 complete"
```

main에서 직접 작업했다면 머지 불필요. 공통으로 태그 부여:

```bash
git tag phase-3-complete
```
