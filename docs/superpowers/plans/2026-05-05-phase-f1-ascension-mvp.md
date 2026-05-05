# Phase F-1 — Ascension MVP + 균열석 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate Ascension Tier progression in inflation-rpg — drop 균열석 (`Math.floor(finishedFloor / 50)` per kill) on deep-floor clears, add a Town-accessible "차원 제단" screen that consumes 균열석 + final boss accumulation to advance `meta.ascTier`, and wire `ascTierMult = 1 + 0.1·ascTier` into `calcFinalStat` so every stat (HP/ATK/DEF/AGI/LUC) auto-scales after each ascend.

**Architecture:** Six tasks in dependency order. Task 1 lays the type + persist scaffolding. Task 2 adds the store actions and unit tests. Task 3 threads the multiplier through `calcFinalStat` with backward-compat default. Task 4 adds the BattleScene drop hook. Task 5 builds the UI (Ascension screen + Town entry + routing + sound). Task 6 is full validation + manual smoke + tag.

**Tech Stack:** TypeScript 5, React 19, Phaser 3, Zustand 5 with persist middleware (v6 → v7 bump), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-05-05-phase-f1-ascension-mvp-design.md`

**Branch:** `feat/phase-f1-ascension-mvp` (created off `main` after `phase-b3b3-complete`).

**Out of scope (deferred):**
- Asc Tree (영구 stat 노드) — F-5.
- Mythic 슬롯 unlocks — separate phase.
- 트리/나침반/유물 reset 분기 — those systems don't exist.
- Tier 5+ milestones (Mythic 유물, 19/20번 던전, "초월" 모드) — content + system additions for later.
- DR as Asc cost — spec says cost is 균열석 only. DR resets but isn't paid.

**Per-task verification gate (every task ends with):**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg lint
pnpm --filter @forge/game-inflation-rpg test
```

Final gate (Task 6 only) adds: `pnpm circular`, `pnpm --filter @forge/game-inflation-rpg build`, `pnpm --filter @forge/game-inflation-rpg e2e`, manual smoke 9 steps.

---

## File Structure

**Files modified:**

- `games/inflation-rpg/src/types.ts` — Task 1 (MetaState 3 fields + Screen union)
- `games/inflation-rpg/src/store/gameStore.ts` — Task 1 (INITIAL_META + persist v7), Task 2 (3 actions)
- `games/inflation-rpg/src/store/gameStore.test.ts` — Task 2 (~7 new tests)
- `games/inflation-rpg/src/systems/stats.ts` — Task 3 (calcFinalStat ascTierMult arg with default 1)
- `games/inflation-rpg/src/systems/stats.test.ts` — Task 3 (1 new test, others compatible via default)
- `games/inflation-rpg/src/battle/BattleScene.ts` — Task 3 (5 calcFinalStat call sites + ascTier read), Task 4 (gainCrackStones drop hook)
- `games/inflation-rpg/src/screens/Town.tsx` — Task 5 (차원 제단 button)
- `games/inflation-rpg/src/App.tsx` — Task 5 (ascension routing)
- `games/inflation-rpg/src/systems/sound.ts` — Task 5 (`ascension: 'lobby'` BGM key)
- `games/inflation-rpg/src/systems/sound.test.ts` — Task 5 (1 new assertion)

**Files created:**

- `games/inflation-rpg/src/screens/Ascension.tsx` — Task 5
- `games/inflation-rpg/src/screens/Ascension.test.tsx` — Task 5

**Files deleted:** None.

---

## Pre-flight: Branch Setup

- [ ] **Step 1: Verify clean main**

Run: `cd /Users/joel/Desktop/git/2d-game-forge && git status --short && git log --oneline -3`
Expected: empty status. HEAD at `d76a2a5` (F-1 spec commit) or later.

- [ ] **Step 2: Create branch**

Run: `git checkout -b feat/phase-f1-ascension-mvp`
Expected: `Switched to a new branch 'feat/phase-f1-ascension-mvp'`

- [ ] **Step 3: Baseline gate**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test`
Expected: typecheck 0 errors, lint clean, vitest 234/234 PASS.

---

## Task 1 — Types + Persist v7

**Files:**
- Modify: `games/inflation-rpg/src/types.ts`
- Modify: `games/inflation-rpg/src/store/gameStore.ts`

**Why:** Lay the data scaffolding for everything else. `MetaState` gets three new fields, `Screen` gets `'ascension'`, persist version bumps with a backward-compat migrate that defaults the new fields to 0.

- [ ] **Step 1: Add fields to MetaState**

Edit: `games/inflation-rpg/src/types.ts`

Find the `pendingFinalClearedId: string | null;` line in `MetaState`. Insert immediately after it:

```ts
  // Phase F-1 — Ascension
  crackStones: number;       // 차원 균열석 — Asc 비용 화폐
  ascTier: number;           // 현재 Asc Tier (시작 0)
  ascPoints: number;         // Tier 진입 시 N 누적 — F-5 Asc Tree 소비처
```

The block ends with the `tutorialDone: boolean;` line (do NOT delete that). The new fields go between `pendingFinalClearedId` and `tutorialDone`.

- [ ] **Step 2: Add `'ascension'` to Screen union**

Same file. Find:
```ts
export type Screen =
  | 'main-menu'
  | 'town'
  | 'dungeon-floors'
  | 'class-select'
  | 'battle'
  | 'stat-alloc'
  | 'inventory'
  | 'shop'
  | 'game-over'
  | 'quests';
```

Replace with:
```ts
export type Screen =
  | 'main-menu'
  | 'town'
  | 'dungeon-floors'
  | 'class-select'
  | 'battle'
  | 'stat-alloc'
  | 'inventory'
  | 'shop'
  | 'game-over'
  | 'quests'
  | 'ascension';
```

- [ ] **Step 3: Add INITIAL_META defaults**

Edit: `games/inflation-rpg/src/store/gameStore.ts`

Find the `INITIAL_META` object — the section ending with `pendingFinalClearedId: null,`. Append three new lines immediately after that line, before the closing `};`:

```ts
  // Phase F-1 — Ascension
  crackStones: 0,
  ascTier: 0,
  ascPoints: 0,
```

- [ ] **Step 4: Bump persist version + add v6→v7 migrate**

Same file. Find:
```ts
      name: 'korea_inflation_rpg_save',
      version: 6,
      migrate: (persisted: unknown, fromVersion: number) => {
        const s = persisted as { meta?: Partial<MetaState>; run?: (Partial<RunState> & { currentAreaId?: string }) };
```

Replace with:
```ts
      name: 'korea_inflation_rpg_save',
      version: 7,
      migrate: (persisted: unknown, fromVersion: number) => {
        const s = persisted as { meta?: Partial<MetaState>; run?: (Partial<RunState> & { currentAreaId?: string }) };
```

Then find the end of the migrate body — the `// Phase B-3β2 — currentAreaId 제거` block:
```ts
        // Phase B-3β2 — currentAreaId 제거 (legacy world-map flow)
        if (fromVersion < 6 && s.run) {
          delete s.run.currentAreaId;
        }
        return s;
      },
```

Replace with:
```ts
        // Phase B-3β2 — currentAreaId 제거 (legacy world-map flow)
        if (fromVersion < 6 && s.run) {
          delete s.run.currentAreaId;
        }
        // Phase F-1 — Ascension fields
        if (fromVersion < 7 && s.meta) {
          s.meta.crackStones = s.meta.crackStones ?? 0;
          s.meta.ascTier = s.meta.ascTier ?? 0;
          s.meta.ascPoints = s.meta.ascPoints ?? 0;
        }
        return s;
      },
```

- [ ] **Step 5: Run task gate**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test`
Expected: typecheck 0, lint clean, vitest 234/234 PASS.

The `Screen` union expansion is additive — no existing code references the new value yet — so nothing else breaks.

- [ ] **Step 6: Commit**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && git add games/inflation-rpg/src/types.ts games/inflation-rpg/src/store/gameStore.ts && git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): add Ascension types + persist v7 (F-1 Task 1)

Adds MetaState fields crackStones / ascTier / ascPoints (all default 0),
extends the Screen union with 'ascension', and bumps persist version
6→7 with a backward-compat migrate that injects defaults for the three
new fields.

Phase F-1 Task 1.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Store Actions + Unit Tests

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts` (interface + 3 action implementations)
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts` (new describe block with ~7 tests)

**Why:** `gainCrackStones` is the BattleScene drop sink. `canAscend` exposes a structured availability check (next tier, cost, finals required, cleared count, blocking reason). `ascend` performs the gated reset. Unit tests pin down the reset-vs-persist matrix.

- [ ] **Step 1: Write failing tests**

Edit: `games/inflation-rpg/src/store/gameStore.test.ts`

Append a new `describe` block at the end of the file (after the last `});` of `describe('Phase B-3β2 — INITIAL_RUN shape', ...)`):

```ts

describe('Phase F-1 — Ascension', () => {
  beforeEach(() => {
    useGameStore.setState({ screen: 'main-menu', run: INITIAL_RUN, meta: INITIAL_META });
  });

  it('INITIAL_META has crackStones=0, ascTier=0, ascPoints=0', () => {
    expect(INITIAL_META.crackStones).toBe(0);
    expect(INITIAL_META.ascTier).toBe(0);
    expect(INITIAL_META.ascPoints).toBe(0);
  });

  it('gainCrackStones increments meta.crackStones', () => {
    useGameStore.getState().gainCrackStones(5);
    expect(useGameStore.getState().meta.crackStones).toBe(5);
    useGameStore.getState().gainCrackStones(3);
    expect(useGameStore.getState().meta.crackStones).toBe(8);
  });

  it('canAscend reports finals-blocked when fewer than nextTier+2 dungeons cleared', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, dungeonFinalsCleared: ['plains'], crackStones: 100 },
    }));
    const result = useGameStore.getState().canAscend();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('finals');
    expect(result.nextTier).toBe(1);
    expect(result.finalsRequired).toBe(3);
    expect(result.finalsCleared).toBe(1);
    expect(result.cost).toBe(1);
  });

  it('canAscend reports stones-blocked when crackStones < cost', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, dungeonFinalsCleared: ['plains', 'forest', 'mountains'], crackStones: 0 },
    }));
    const result = useGameStore.getState().canAscend();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('stones');
    expect(result.cost).toBe(1);
  });

  it('canAscend returns ok when conditions met (Tier 0 → 1)', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, dungeonFinalsCleared: ['plains', 'forest', 'mountains'], crackStones: 1 },
    }));
    const result = useGameStore.getState().canAscend();
    expect(result.ok).toBe(true);
    expect(result.nextTier).toBe(1);
    expect(result.cost).toBe(1);
    expect(result.reason).toBeNull();
  });

  it('ascend returns false and does not mutate when blocked', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, dungeonFinalsCleared: ['plains'], crackStones: 0 },
    }));
    const before = useGameStore.getState().meta;
    expect(useGameStore.getState().ascend()).toBe(false);
    expect(useGameStore.getState().meta.ascTier).toBe(before.ascTier);
    expect(useGameStore.getState().meta.crackStones).toBe(before.crackStones);
  });

  it('ascend applies reset, advances tier, deducts stones, accrues points (Tier 0 → 1)', () => {
    useGameStore.setState((s) => ({
      run: { ...s.run, characterId: 'hwarang', level: 50, currentDungeonId: 'plains', currentFloor: 25 },
      meta: {
        ...s.meta,
        dungeonFinalsCleared: ['plains', 'forest', 'mountains'],
        crackStones: 5,
        dr: 1000,
        soulGrade: 3,
        characterLevels: { hwarang: 7 },
        normalBossesKilled: ['gate-guardian'],
        enhanceStones: 42,
      },
    }));

    expect(useGameStore.getState().ascend()).toBe(true);

    const state = useGameStore.getState();
    // Reset 적용
    expect(state.run.characterId).toBe('');
    expect(state.run.currentFloor).toBe(1);
    expect(state.run.currentDungeonId).toBeNull();
    expect(state.screen).toBe('main-menu');
    expect(state.meta.dr).toBe(0);
    expect(state.meta.soulGrade).toBe(0);
    expect(state.meta.characterLevels).toEqual({});
    expect(state.meta.normalBossesKilled).toEqual([]);
    expect(state.meta.enhanceStones).toBe(0);
    expect(state.meta.dungeonProgress).toEqual({});

    // 보존 + 수정
    expect(state.meta.ascTier).toBe(1);
    expect(state.meta.crackStones).toBe(4); // 5 - 1
    expect(state.meta.ascPoints).toBe(1); // 0 + 1
    expect(state.meta.dungeonFinalsCleared).toEqual(['plains', 'forest', 'mountains']);
  });

  it('ascend keeps equipped items, drops unequipped from inventory', () => {
    const equippedSword = {
      id: 'sword-eq', name: '검', slot: 'weapon' as const, rarity: 'common' as const,
      stats: { flat: { atk: 10 } }, dropAreaIds: [], price: 0,
    };
    const unequippedSword = {
      id: 'sword-uneq', name: '도', slot: 'weapon' as const, rarity: 'common' as const,
      stats: { flat: { atk: 5 } }, dropAreaIds: [], price: 0,
    };
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        dungeonFinalsCleared: ['plains', 'forest', 'mountains'],
        crackStones: 1,
        inventory: { weapons: [equippedSword, unequippedSword], armors: [], accessories: [] },
        equippedItemIds: ['sword-eq'],
      },
    }));
    expect(useGameStore.getState().ascend()).toBe(true);
    const inv = useGameStore.getState().meta.inventory;
    expect(inv.weapons).toHaveLength(1);
    expect(inv.weapons[0]!.id).toBe('sword-eq');
    expect(useGameStore.getState().meta.equippedItemIds).toEqual(['sword-eq']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @forge/game-inflation-rpg test -- gameStore.test`
Expected: FAIL on the new cases — `gainCrackStones`, `canAscend`, `ascend` not defined on the store.

- [ ] **Step 3: Add interface members + implementations**

Edit: `games/inflation-rpg/src/store/gameStore.ts`

Find the `GameStore` interface (begins around line 76 with `interface GameStore {`). Find:
```ts
  markDungeonProgress: (dungeonId: string, floor: number) => void;
  markFinalCleared: (dungeonId: string) => void;
  setPendingFinalCleared: (dungeonId: string | null) => void;
  pendingStoryId: string | null;
  setPendingStory: (storyId: string | null) => void;
```

Replace with:
```ts
  markDungeonProgress: (dungeonId: string, floor: number) => void;
  markFinalCleared: (dungeonId: string) => void;
  setPendingFinalCleared: (dungeonId: string | null) => void;
  // Phase F-1 — Ascension
  gainCrackStones: (amount: number) => void;
  canAscend: () => {
    ok: boolean;
    nextTier: number;
    cost: number;
    finalsRequired: number;
    finalsCleared: number;
    reason: 'finals' | 'stones' | null;
  };
  ascend: () => boolean;
  pendingStoryId: string | null;
  setPendingStory: (storyId: string | null) => void;
```

- [ ] **Step 4: Add the three action implementations**

Same file. Find the `setPendingFinalCleared` action (around line 413):

```ts
      setPendingFinalCleared: (dungeonId) =>
        set((s) => ({ meta: { ...s.meta, pendingFinalClearedId: dungeonId } })),
```

Insert immediately after it (before `craft:` action):

```ts
      // Phase F-1 — Ascension
      gainCrackStones: (amount) =>
        set((s) => ({ meta: { ...s.meta, crackStones: s.meta.crackStones + amount } })),

      canAscend: () => {
        const s = get();
        const nextTier = s.meta.ascTier + 1;
        const finalsRequired = nextTier + 2;
        const finalsCleared = s.meta.dungeonFinalsCleared.length;
        const cost = nextTier * nextTier;
        if (finalsCleared < finalsRequired) {
          return { ok: false, nextTier, cost, finalsRequired, finalsCleared, reason: 'finals' };
        }
        if (s.meta.crackStones < cost) {
          return { ok: false, nextTier, cost, finalsRequired, finalsCleared, reason: 'stones' };
        }
        return { ok: true, nextTier, cost, finalsRequired, finalsCleared, reason: null };
      },

      ascend: () => {
        const check = get().canAscend();
        if (!check.ok) return false;
        const { nextTier, cost } = check;
        set((s) => {
          const equippedSet = new Set(s.meta.equippedItemIds);
          const keepEquipped = (list: Equipment[]) => {
            const seen = new Set<string>();
            return list.filter((it) => {
              if (!equippedSet.has(it.id)) return false;
              if (seen.has(it.id)) return false;
              seen.add(it.id);
              return true;
            });
          };
          return {
            run: INITIAL_RUN,
            screen: 'main-menu',
            meta: {
              ...s.meta,
              soulGrade: 0,
              dr: 0,
              enhanceStones: 0,
              characterLevels: {},
              normalBossesKilled: [],
              hardBossesKilled: [],
              baseAbilityLevel: 0,
              questProgress: {},
              questsCompleted: [],
              regionsVisited: [],
              dungeonProgress: {},
              pendingFinalClearedId: null,
              inventory: {
                weapons: keepEquipped(s.meta.inventory.weapons),
                armors: keepEquipped(s.meta.inventory.armors),
                accessories: keepEquipped(s.meta.inventory.accessories),
              },
              crackStones: s.meta.crackStones - cost,
              ascTier: nextTier,
              ascPoints: s.meta.ascPoints + nextTier,
            },
          };
        });
        return true;
      },
```

Note: `Equipment` is already imported at the top of the file (line 3 `import type { ... Equipment, AllocatedStats } from '../types';`). No new import needed.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @forge/game-inflation-rpg test -- gameStore.test`
Expected: ALL gameStore tests PASS, including the new Phase F-1 cases.

- [ ] **Step 6: Run full task gate**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test`
Expected: typecheck 0, lint clean, vitest all PASS (234 + 7 new = 241).

- [ ] **Step 7: Commit**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts && git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): add gainCrackStones / canAscend / ascend store actions (F-1 Task 2)

gainCrackStones increments meta.crackStones. canAscend computes next-tier
availability with structured reason ('finals' | 'stones' | null). ascend
applies the spec'd reset matrix: zeros run + soulGrade + dr +
enhanceStones + characterLevels + dungeonProgress etc., keeps equipped
inventory items only (drops unequipped + duplicates), advances ascTier,
deducts cost, accrues ascPoints.

7 unit tests cover defaults, gain, both blocked branches, ok branch,
ascend mutation matrix, and equipped-only inventory retention.

Phase F-1 Task 2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — `calcFinalStat` ascTierMult + BattleScene Wiring

**Files:**
- Modify: `games/inflation-rpg/src/systems/stats.ts`
- Modify: `games/inflation-rpg/src/systems/stats.test.ts`
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts`

**Why:** Multiplier `1 + 0.1·ascTier` must apply to the final stat result for ATK/HP/DEF/AGI/LUC. Adding it as a 7th parameter to `calcFinalStat` with a default of `1` preserves all existing call sites; BattleScene's 7 calls (5 in doRound + 2 in create) get explicit pass-through.

- [ ] **Step 1: Write a failing test for ascTierMult**

Edit: `games/inflation-rpg/src/systems/stats.test.ts`

Find the existing test:
```ts
  it('calcFinalStat: charLevelMult defaults to 1 (backward compat)', () => {
    expect(calcFinalStat('atk', 0, 1.0, noEquip, 1)).toBe(10);
  });
```

Insert immediately after it (before the closing `});` of the describe block):

```ts

  it('calcFinalStat: ascTierMult scales the final result (Tier 1 = ×1.1)', () => {
    // base atk 10, sp 0, charMult 1, no equip, baseAbility 1, charLevelMult 1, ascTierMult 1.1
    // floor(10 * 1 * 1 * 1.1) = 11
    expect(calcFinalStat('atk', 0, 1.0, noEquip, 1, 1, 1.1)).toBe(11);
  });

  it('calcFinalStat: ascTierMult defaults to 1 (backward compat)', () => {
    expect(calcFinalStat('atk', 0, 1.0, noEquip, 1, 1)).toBe(10);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @forge/game-inflation-rpg test -- stats.test`
Expected: FAIL on the `Tier 1 = ×1.1` case (current signature has only 6 params, returns 10).

- [ ] **Step 3: Add ascTierMult to calcFinalStat**

Edit: `games/inflation-rpg/src/systems/stats.ts`

Find:
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

Replace with:
```ts
export function calcFinalStat(
  key: StatKey,
  allocated: number,
  charMult: number,
  equipped: Equipment[],
  baseAbilityMult: number,
  charLevelMult = 1,
  ascTierMult = 1
): number {
  const raw = calcRawStat(key, allocated, charMult);
  const flat = calcEquipmentFlat(key, equipped);
  const pct = calcEquipmentPercentMult(key, equipped);
  return Math.floor((raw + flat) * pct * baseAbilityMult * charLevelMult * ascTierMult);
}
```

(Adds `ascTierMult = 1` to signature and `* ascTierMult` to the return expression.)

- [ ] **Step 4: Run stats tests**

Run: `pnpm --filter @forge/game-inflation-rpg test -- stats.test`
Expected: ALL stats tests PASS, including both new cases.

- [ ] **Step 5: Wire ascTierMult through BattleScene.create()**

Edit: `games/inflation-rpg/src/battle/BattleScene.ts`

Find:
```ts
    // Cache player stats and active skills for skill system
    const char = getCharacterById(run.characterId);
    if (char) {
      this.activeSkills = [...char.activeSkills];
      const { meta } = useGameStore.getState();
      const baseAbility = calcBaseAbilityMult(meta.baseAbilityLevel);
      const allEquipped = getEquippedItemsList(meta.inventory, meta.equippedItemIds);
      const charLv = meta.characterLevels[run.characterId] ?? 0;
      const charLevelMult = 1 + charLv * 0.1;
      this.cachedPlayerAtk = calcFinalStat('atk', run.allocated.atk, char.statMultipliers.atk, allEquipped, baseAbility, charLevelMult);
      this.cachedPlayerHpMax = calcFinalStat('hp', run.allocated.hp, char.statMultipliers.hp, allEquipped, baseAbility, charLevelMult);
    }
```

Replace with:
```ts
    // Cache player stats and active skills for skill system
    const char = getCharacterById(run.characterId);
    if (char) {
      this.activeSkills = [...char.activeSkills];
      const { meta } = useGameStore.getState();
      const baseAbility = calcBaseAbilityMult(meta.baseAbilityLevel);
      const allEquipped = getEquippedItemsList(meta.inventory, meta.equippedItemIds);
      const charLv = meta.characterLevels[run.characterId] ?? 0;
      const charLevelMult = 1 + charLv * 0.1;
      const ascTierMult = 1 + 0.1 * meta.ascTier;
      this.cachedPlayerAtk = calcFinalStat('atk', run.allocated.atk, char.statMultipliers.atk, allEquipped, baseAbility, charLevelMult, ascTierMult);
      this.cachedPlayerHpMax = calcFinalStat('hp', run.allocated.hp, char.statMultipliers.hp, allEquipped, baseAbility, charLevelMult, ascTierMult);
    }
```

- [ ] **Step 6: Wire ascTierMult through BattleScene.doRound()**

Same file. Find:
```ts
  private doRound() {
    const state = useGameStore.getState();
    const { run, meta } = state;
    const char = getCharacterById(run.characterId);
    if (!char) return;

    const baseAbility = calcBaseAbilityMult(meta.baseAbilityLevel);
    const allEquipped = getEquippedItemsList(meta.inventory, meta.equippedItemIds);
    const charLv = meta.characterLevels[run.characterId] ?? 0;
    const charLevelMult = 1 + charLv * 0.1;

    const playerATK = calcFinalStat('atk', run.allocated.atk, char.statMultipliers.atk, allEquipped, baseAbility, charLevelMult);
    const playerDEF = calcFinalStat('def', run.allocated.def, char.statMultipliers.def, allEquipped, baseAbility, charLevelMult);
    const playerHP  = calcFinalStat('hp',  run.allocated.hp,  char.statMultipliers.hp,  allEquipped, baseAbility, charLevelMult);
    const playerAGI = calcFinalStat('agi', run.allocated.agi, char.statMultipliers.agi, allEquipped, baseAbility, charLevelMult);
    const playerLUC = calcFinalStat('luc', run.allocated.luc, char.statMultipliers.luc, allEquipped, baseAbility, charLevelMult);
```

Replace with:
```ts
  private doRound() {
    const state = useGameStore.getState();
    const { run, meta } = state;
    const char = getCharacterById(run.characterId);
    if (!char) return;

    const baseAbility = calcBaseAbilityMult(meta.baseAbilityLevel);
    const allEquipped = getEquippedItemsList(meta.inventory, meta.equippedItemIds);
    const charLv = meta.characterLevels[run.characterId] ?? 0;
    const charLevelMult = 1 + charLv * 0.1;
    const ascTierMult = 1 + 0.1 * meta.ascTier;

    const playerATK = calcFinalStat('atk', run.allocated.atk, char.statMultipliers.atk, allEquipped, baseAbility, charLevelMult, ascTierMult);
    const playerDEF = calcFinalStat('def', run.allocated.def, char.statMultipliers.def, allEquipped, baseAbility, charLevelMult, ascTierMult);
    const playerHP  = calcFinalStat('hp',  run.allocated.hp,  char.statMultipliers.hp,  allEquipped, baseAbility, charLevelMult, ascTierMult);
    const playerAGI = calcFinalStat('agi', run.allocated.agi, char.statMultipliers.agi, allEquipped, baseAbility, charLevelMult, ascTierMult);
    const playerLUC = calcFinalStat('luc', run.allocated.luc, char.statMultipliers.luc, allEquipped, baseAbility, charLevelMult, ascTierMult);
```

(Adds the `ascTierMult` const after `charLevelMult` and threads it as the 7th argument on all 5 calcFinalStat calls.)

- [ ] **Step 7: Run task gate**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test`
Expected: typecheck 0, lint clean, vitest all PASS (241 + 2 new = 243).

- [ ] **Step 8: Commit**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && git add games/inflation-rpg/src/systems/stats.ts games/inflation-rpg/src/systems/stats.test.ts games/inflation-rpg/src/battle/BattleScene.ts && git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): wire ascTierMult through calcFinalStat (F-1 Task 3)

calcFinalStat gets a 7th parameter ascTierMult (default 1, backward
compat). Final result multiplied by ascTierMult so Tier N gives
×(1+0.1·N) on every stat (HP/ATK/DEF/AGI/LUC). BattleScene's create()
and doRound() compute ascTierMult = 1 + 0.1·meta.ascTier and pass it to
all 7 calcFinalStat call sites.

2 new stats unit tests verify the multiplier and the default.

Phase F-1 Task 3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — BattleScene 균열석 Drop

**Files:**
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts`

**Why:** Per spec §10.5: "심층 floor / 50 per 클리어". On every floor clear, `Math.floor(finishedFloor / 50)` 균열석 added. F30 and below = 0. F50 = 1. F100 = 2. F500 = 10. The drop must fire BEFORE the final-clear branch's run termination so that even the first F30 clear (which can't actually drop anything since 30/50 = 0) doesn't bypass the hook.

- [ ] **Step 1: Add the drop call**

Edit: `games/inflation-rpg/src/battle/BattleScene.ts`

Find:
```ts
        const dungeonId = currentRun.currentDungeonId;
        const finishedFloor = currentRun.currentFloor;
        const bossType = getBossType(finishedFloor);

        if (bossType === 'final') {
```

Replace with:
```ts
        const dungeonId = currentRun.currentDungeonId;
        const finishedFloor = currentRun.currentFloor;
        const bossType = getBossType(finishedFloor);

        // Phase F-1: 심층 floor 균열석 drop (floor / 50, 0 for floor < 50).
        const stonesGained = Math.floor(finishedFloor / 50);
        if (stonesGained > 0) {
          stateAfterKill.gainCrackStones(stonesGained);
        }

        if (bossType === 'final') {
```

(Inserts the drop call between the `bossType` declaration and the `if (bossType === 'final')` check. The drop fires on every floor clear before any branching.)

- [ ] **Step 2: Run task gate**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test`
Expected: typecheck 0, lint clean, vitest all PASS (243).

BattleScene unit tests don't exist (Phaser dependency); this hook's correctness is verified manually in Task 6 smoke step 8.

- [ ] **Step 3: Commit**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && git add games/inflation-rpg/src/battle/BattleScene.ts && git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): drop 균열석 on deep-floor clear (F-1 Task 4)

Every floor clear in BattleScene.doRound() now calls
gainCrackStones(Math.floor(finishedFloor / 50)). F30 and below = 0.
F50 = +1, F100 = +2, F500 = +10, F50000 = +1000 (per spec §10.5).

The hook fires before the final-clear branch so it stays consistent
across both first-clear (run-end) and subsequent procedural paths.

Phase F-1 Task 4.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Ascension Screen + Town Entry + Routing

**Files:**
- Create: `games/inflation-rpg/src/screens/Ascension.tsx`
- Create: `games/inflation-rpg/src/screens/Ascension.test.tsx`
- Modify: `games/inflation-rpg/src/screens/Town.tsx`
- Modify: `games/inflation-rpg/src/App.tsx`
- Modify: `games/inflation-rpg/src/systems/sound.ts`
- Modify: `games/inflation-rpg/src/systems/sound.test.ts`

**Why:** Players need a UI surface to inspect Ascension status and trigger the ascend action. The Town gets a 차원 제단 button as the entry point. App routing maps `'ascension'` to the new screen. Sound system gets a BGM mapping.

- [ ] **Step 1: Write failing tests for Ascension screen**

Create: `games/inflation-rpg/src/screens/Ascension.test.tsx`

Content:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Ascension } from './Ascension';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';

describe('Ascension screen', () => {
  beforeEach(() => {
    useGameStore.setState({ screen: 'ascension', run: INITIAL_RUN, meta: INITIAL_META });
  });

  it('shows current Tier 0 with ×1.00 multiplier on a fresh profile', () => {
    render(<Ascension />);
    expect(screen.getByTestId('ascension-status').textContent).toContain('Tier 0');
    expect(screen.getByTestId('ascension-status').textContent).toContain('×1.00');
  });

  it('shows finals-blocked message when fewer than nextTier+2 cleared', () => {
    render(<Ascension />);
    const blocked = screen.getByTestId('ascension-blocked');
    expect(blocked.textContent).toContain('정복한 던전이 부족');
    expect(screen.queryByTestId('ascension-ascend')).toBeNull();
  });

  it('shows stones-blocked message when finals met but stones short', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, dungeonFinalsCleared: ['plains', 'forest', 'mountains'], crackStones: 0 },
    }));
    render(<Ascension />);
    const blocked = screen.getByTestId('ascension-blocked');
    expect(blocked.textContent).toContain('균열석이 부족');
  });

  it('shows ascend button when conditions met (3 finals + 1 stone)', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, dungeonFinalsCleared: ['plains', 'forest', 'mountains'], crackStones: 1 },
    }));
    render(<Ascension />);
    const btn = screen.getByTestId('ascension-ascend');
    expect(btn).toBeInTheDocument();
    expect(btn.textContent).toContain('Tier 1');
  });

  it('confirm dialog triggers ascend and navigates to main-menu', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, dungeonFinalsCleared: ['plains', 'forest', 'mountains'], crackStones: 1 },
    }));
    render(<Ascension />);
    fireEvent.click(screen.getByTestId('ascension-ascend'));
    fireEvent.click(screen.getByTestId('ascension-confirm'));
    expect(useGameStore.getState().screen).toBe('main-menu');
    expect(useGameStore.getState().meta.ascTier).toBe(1);
  });

  it('cancel hides confirm dialog without ascending', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, dungeonFinalsCleared: ['plains', 'forest', 'mountains'], crackStones: 1 },
    }));
    render(<Ascension />);
    fireEvent.click(screen.getByTestId('ascension-ascend'));
    expect(screen.getByTestId('ascension-confirm')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ascension-cancel'));
    expect(screen.queryByTestId('ascension-confirm')).toBeNull();
    expect(useGameStore.getState().meta.ascTier).toBe(0);
  });

  it('back button navigates to town', () => {
    render(<Ascension />);
    fireEvent.click(screen.getByRole('button', { name: /마을로/ }));
    expect(useGameStore.getState().screen).toBe('town');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @forge/game-inflation-rpg test -- Ascension.test`
Expected: FAIL — `Ascension` import error (file doesn't exist yet).

- [ ] **Step 3: Create Ascension.tsx**

Create: `games/inflation-rpg/src/screens/Ascension.tsx`

Content:
```tsx
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { ForgePanel } from '@/components/ui/forge-panel';
import { ForgeButton } from '@/components/ui/forge-button';
import { formatNumber } from '../lib/format';

export function Ascension() {
  const meta = useGameStore((s) => s.meta);
  const setScreen = useGameStore((s) => s.setScreen);
  const ascend = useGameStore((s) => s.ascend);
  const canAscend = useGameStore((s) => s.canAscend);
  const result = canAscend();
  const [confirming, setConfirming] = React.useState(false);

  const currentMult = 1 + 0.1 * meta.ascTier;
  const nextMult = 1 + 0.1 * result.nextTier;

  const handleAscend = () => {
    const ok = ascend();
    if (ok) {
      setConfirming(false);
    }
  };

  return (
    <ForgeScreen>
      <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ForgeButton variant="secondary" onClick={() => setScreen('town')}>← 마을로</ForgeButton>
        <h2 style={{ color: 'var(--forge-accent)', margin: 0 }}>🌌 차원 제단</h2>
        <span />
      </div>

      <ForgePanel data-testid="ascension-status" style={{ margin: '8px 16px' }}>
        <div style={{ fontSize: 14 }}>
          현재 <strong>Tier {meta.ascTier}</strong> (×{currentMult.toFixed(2)})
        </div>
        <div style={{ fontSize: 12, color: 'var(--forge-text-secondary)', marginTop: 4 }}>
          누적 균열석: <strong>{formatNumber(meta.crackStones)}</strong>
        </div>
        <div style={{ fontSize: 12, color: 'var(--forge-text-secondary)' }}>
          던전 정복: <strong>{result.finalsCleared}</strong> / 총 3
        </div>
      </ForgePanel>

      <ForgePanel data-testid="ascension-next" style={{ margin: '16px 16px' }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>
          다음: Tier {result.nextTier} (×{nextMult.toFixed(2)})
        </div>
        <div style={{ fontSize: 12, color: 'var(--forge-text-secondary)', marginTop: 6 }}>
          정복 던전 필요: {result.finalsCleared} / {result.finalsRequired}
        </div>
        <div style={{ fontSize: 12, color: 'var(--forge-text-secondary)' }}>
          균열석 필요: {formatNumber(meta.crackStones)} / {formatNumber(result.cost)}
        </div>

        {!result.ok && (
          <div data-testid="ascension-blocked" style={{ marginTop: 8, fontSize: 12, color: 'var(--forge-danger)' }}>
            {result.reason === 'finals' && '아직 정복한 던전이 부족하다.'}
            {result.reason === 'stones' && '균열석이 부족하다.'}
          </div>
        )}

        {result.ok && !confirming && (
          <ForgeButton
            data-testid="ascension-ascend"
            variant="primary"
            style={{ width: '100%', marginTop: 8 }}
            onClick={() => setConfirming(true)}
          >
            초월 — Tier {result.nextTier}
          </ForgeButton>
        )}

        {confirming && (
          <div style={{ marginTop: 12, padding: 12, border: '1px solid var(--forge-danger)', borderRadius: 4 }}>
            <div style={{ fontSize: 12, marginBottom: 8 }}>
              진행 중인 모든 진척이 사라진다. (장착된 장비, 균열석, Asc Tier 는 보존)
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <ForgeButton
                data-testid="ascension-confirm"
                variant="primary"
                style={{ flex: 1 }}
                onClick={handleAscend}
              >
                확인
              </ForgeButton>
              <ForgeButton
                data-testid="ascension-cancel"
                variant="secondary"
                style={{ flex: 1 }}
                onClick={() => setConfirming(false)}
              >
                취소
              </ForgeButton>
            </div>
          </div>
        )}
      </ForgePanel>
    </ForgeScreen>
  );
}
```

- [ ] **Step 4: Run Ascension tests**

Run: `pnpm --filter @forge/game-inflation-rpg test -- Ascension.test`
Expected: ALL Ascension tests PASS (7 tests).

- [ ] **Step 5: Add Town 차원 제단 button**

Edit: `games/inflation-rpg/src/screens/Town.tsx`

Find:
```tsx
      <div style={{ textAlign: 'center', marginTop: 'var(--forge-space-6)' }}>
        <ForgeButton variant="secondary" onClick={() => setScreen('main-menu')}>
          돌아가기
        </ForgeButton>
      </div>
    </ForgeScreen>
```

Replace with:
```tsx
      <div style={{ textAlign: 'center', marginTop: 'var(--forge-space-4)' }}>
        <ForgeButton
          variant="secondary"
          onClick={() => setScreen('ascension')}
          data-testid="town-ascension-altar"
        >
          🌌 차원 제단
        </ForgeButton>
      </div>

      <div style={{ textAlign: 'center', marginTop: 'var(--forge-space-6)' }}>
        <ForgeButton variant="secondary" onClick={() => setScreen('main-menu')}>
          돌아가기
        </ForgeButton>
      </div>
    </ForgeScreen>
```

(Adds a new centered div containing the 차원 제단 button before the existing 돌아가기 div. Spacing slightly tighter — `space-4` instead of `space-6` — so the two centered actions visually group.)

- [ ] **Step 6: Add Ascension routing in App.tsx**

Edit: `games/inflation-rpg/src/App.tsx`

Find:
```tsx
import { Quests } from './screens/Quests';
```

Replace with:
```tsx
import { Quests } from './screens/Quests';
import { Ascension } from './screens/Ascension';
```

Find:
```tsx
      {screen === 'quests'       && <Quests />}
      <TutorialOverlay />
```

Replace with:
```tsx
      {screen === 'quests'       && <Quests />}
      {screen === 'ascension'    && <Ascension />}
      <TutorialOverlay />
```

- [ ] **Step 7: Add Ascension BGM mapping**

Edit: `games/inflation-rpg/src/systems/sound.ts`

Find:
```ts
const SCREEN_BGM: Partial<Record<Screen, string>> = {
  'main-menu': 'lobby',
  'town': 'lobby',
  'dungeon-floors': 'lobby',
  'class-select': 'lobby',
  inventory: 'field',
  shop: 'field',
  quests: 'field',
  battle: 'battle',
};
```

Replace with:
```ts
const SCREEN_BGM: Partial<Record<Screen, string>> = {
  'main-menu': 'lobby',
  'town': 'lobby',
  'dungeon-floors': 'lobby',
  'class-select': 'lobby',
  ascension: 'lobby',
  inventory: 'field',
  shop: 'field',
  quests: 'field',
  battle: 'battle',
};
```

- [ ] **Step 8: Add sound test for ascension**

Edit: `games/inflation-rpg/src/systems/sound.test.ts`

Find:
```ts
  it('bgmIdForScreen maps known screens', () => {
    expect(bgmIdForScreen('main-menu')).toBe('lobby');
    expect(bgmIdForScreen('class-select')).toBe('lobby');
    expect(bgmIdForScreen('town')).toBe('lobby');
    expect(bgmIdForScreen('dungeon-floors')).toBe('lobby');
    expect(bgmIdForScreen('inventory')).toBe('field');
    expect(bgmIdForScreen('battle')).toBe('battle');
  });
```

Replace with:
```ts
  it('bgmIdForScreen maps known screens', () => {
    expect(bgmIdForScreen('main-menu')).toBe('lobby');
    expect(bgmIdForScreen('class-select')).toBe('lobby');
    expect(bgmIdForScreen('town')).toBe('lobby');
    expect(bgmIdForScreen('dungeon-floors')).toBe('lobby');
    expect(bgmIdForScreen('ascension')).toBe('lobby');
    expect(bgmIdForScreen('inventory')).toBe('field');
    expect(bgmIdForScreen('battle')).toBe('battle');
  });
```

- [ ] **Step 9: Run full task gate**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test`
Expected: typecheck 0, lint clean, vitest all PASS (243 + 7 new = 250).

- [ ] **Step 10: Commit**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && git add games/inflation-rpg/src/screens/Ascension.tsx games/inflation-rpg/src/screens/Ascension.test.tsx games/inflation-rpg/src/screens/Town.tsx games/inflation-rpg/src/App.tsx games/inflation-rpg/src/systems/sound.ts games/inflation-rpg/src/systems/sound.test.ts && git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): Ascension screen + Town 차원 제단 entry (F-1 Task 5)

Adds the 🌌 차원 제단 screen showing current Tier + multiplier, next-Tier
requirements (finals + 균열석), and an ascend button gated by canAscend().
Confirmation dialog warns about run progress loss before triggering
ascend(). Town adds a 차원 제단 button between the dungeon grid and the
main-menu back button. App.tsx routes 'ascension' to the new screen.
sound.ts maps 'ascension' to lobby BGM.

7 unit tests cover status display, blocked branches, confirmation flow,
cancel, and back navigation.

Phase F-1 Task 5.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Final Validation + Manual Smoke + Tag

**Files:** None modified (verification only).

**Why:** Confirm full toolchain green (typecheck + lint + test + circular + build + e2e) and walk through the BattleScene drop + Asc reset integration manually, since BattleScene has no unit tests for the drop hook.

- [ ] **Step 1: Full automated validation**

Run from repo root:
```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test && pnpm circular && pnpm --filter @forge/game-inflation-rpg build
```

Expected: typecheck 0, lint 0, vitest 250 PASS, no circular deps, `next build` ✓ Compiled successfully.

- [ ] **Step 2: E2E**

Run: `pnpm --filter @forge/game-inflation-rpg e2e`
Expected: 18/18 PASS.

- [ ] **Step 3: Manual smoke — set up dev server**

Run: `pnpm dev`
Open browser to the inflation-rpg game URL. Clear save: in devtools console, `localStorage.removeItem('korea_inflation_rpg_save')`. Reload.

- [ ] **Step 4: Manual smoke — Town entry to Ascension**

1. MainMenu → 마을로 → Town shows three dungeon cards + "🌌 차원 제단" button.
2. Click 차원 제단 → Ascension screen appears.
3. Status shows "Tier 0 (×1.00)", "누적 균열석: 0", "던전 정복: 0 / 총 3".
4. Next panel: "다음: Tier 1 (×1.10)", "정복 던전 필요: 0 / 3", "균열석 필요: 0 / 1".
5. Blocked message: "아직 정복한 던전이 부족하다." No ascend button visible.

- [ ] **Step 5: Manual smoke — simulate state to test ascend**

In devtools, run:
```js
useGameStore.setState((s) => ({ meta: { ...s.meta, dungeonFinalsCleared: ['plains', 'forest', 'mountains'], crackStones: 1 } }))
```

Reload Ascension screen (back to Town → 차원 제단).

6. Now: "Tier 0 (×1.00)", "누적 균열석: 1", "던전 정복: 3 / 총 3". "초월 — Tier 1" button visible.

- [ ] **Step 6: Manual smoke — perform ascend**

7. Click "초월 — Tier 1". Confirmation dialog appears.
8. Click "확인". Screen → MainMenu. In devtools verify:
   - `useGameStore.getState().meta.ascTier === 1`
   - `useGameStore.getState().meta.crackStones === 0`
   - `useGameStore.getState().meta.ascPoints === 1`
   - `useGameStore.getState().meta.dr === 0`
   - `useGameStore.getState().meta.dungeonFinalsCleared` = `['plains', 'forest', 'mountains']` (preserved)
   - `useGameStore.getState().run.characterId === ''` (reset)

- [ ] **Step 7: Manual smoke — verify multiplier in battle**

9. Town → 평야 → ClassSelect → 화랑 + 모험 시작 → DungeonFloors.
10. Click floor-card-1. Battle scene starts. Player should be measurably stronger than Tier 0 (×1.10 on all stats).
11. Win the battle. (Visually: enemy dies faster than at Tier 0.)

- [ ] **Step 8: Manual smoke — 균열석 drop**

In devtools, set state to deep-floor for direct test:
```js
useGameStore.setState((s) => ({ run: { ...s.run, currentFloor: 50 }, meta: { ...s.meta, dungeonProgress: { ...s.meta.dungeonProgress, plains: { maxFloor: 50 } } } }))
```

12. Click 심층 진입 → battle → win F50.
13. After win, verify in devtools: `useGameStore.getState().meta.crackStones === 1` (was 0, gained 1 from Math.floor(50/50)).

- [ ] **Step 9: Manual smoke — verify Tier 2 blocked**

14. Town → 차원 제단. "Tier 1 (×1.10)" + "다음: Tier 2 (×1.20)". Required: 4 finals + 4 stones. Cleared: 3, stones: 1. Blocked-finals message ("아직 정복한 던전이 부족하다") since 3 < 4.

- [ ] **Step 10: Skip if smoke fails**

If any smoke step exposes a regression, return to the relevant Task and iterate. Add tests where possible.

- [ ] **Step 11: Tag**

Run: `cd /Users/joel/Desktop/git/2d-game-forge && git tag phase-f1-complete && git tag --list | grep f`
Expected: shows `phase-f1-complete`.

- [ ] **Step 12: Report branch ready for merge**

Branch `feat/phase-f1-ascension-mvp` ready. Tag `phase-f1-complete`. All gates green. Manual smoke 9 steps passed (or note any deferred verification).

User merges via `--no-ff` per CLAUDE.md convention.

---

## Self-Review Checklist (run before handoff)

Auto-completed by author at write time:

- **Spec coverage:**
  - §4.1 types + persist v7 → Task 1 (verbatim).
  - §4.2 store actions (gainCrackStones / canAscend / ascend) → Task 2 (interface + impl + tests).
  - §4.3 stats.ts ascTierMult → Task 3 (signature + 7 BattleScene call sites).
  - §4.4 BattleScene 균열석 drop → Task 4 (Math.floor(finishedFloor / 50) hook).
  - §4.5 Ascension UI + Town entry + App routing + sound BGM → Task 5.
  - §4.6 신규 unit tests → Task 2 (~7 gameStore), Task 3 (2 stats), Task 5 (7 Ascension + 1 sound) = 17 new tests total.
  - §5 검증 게이트 + smoke 9 step → Task 6.
- **Placeholders:** None — every step has exact code, paths, commands.
- **Type consistency:**
  - `MetaState.crackStones / ascTier / ascPoints` declared in Task 1, defaulted in Task 1 INITIAL_META, persisted via v7 migrate, used in Task 2 actions, multiplied in Task 3 (`ascTier`), incremented in Task 4 (`gainCrackStones`), displayed in Task 5 UI. All consistent.
  - `canAscend` return shape uses `nextTier / cost / finalsRequired / finalsCleared / reason` — same fields referenced in Task 2 tests, Task 5 UI, and Task 5 tests.
  - `ascend(): boolean` — same signature in interface (Task 2 Step 3), impl (Task 2 Step 4), test (Task 2 Step 1), UI usage (Task 5 Step 3 — `const ok = ascend(); if (ok) ...`).
  - `calcFinalStat` signature: 7 params with `charLevelMult = 1` and `ascTierMult = 1` defaults. Stats tests use 5/6/7-arg forms (backward compat verified). BattleScene's 7 call sites all explicit-pass `ascTierMult`.
  - `Screen` type: `'ascension'` declared in Task 1, routed in Task 5, mapped in sound.ts in Task 5.
  - Persist v6 → v7 monotonic — earlier migrations preserved.
