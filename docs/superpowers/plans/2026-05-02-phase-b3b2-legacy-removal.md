# Phase B-3β2 — Legacy Flow Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove dead code from the legacy `world-map` / `region-map` / `dungeon` (area-stage) flow now that the new dungeon flow is the only active one, simplify `trackKill` to a single argument, add `selectDungeon(null)` on final boss clear, and replace the Quests UI with a "redesign pending" placeholder for the new flow.

**Architecture:** Three groups of changes in dependency order: (1) additive UI updates that don't touch types — Quests placeholder + back-button strings, (2) one atomic core surgery that removes `RunState.currentAreaId` + Screen-union members `'world-map'`/`'dungeon'` along with all callers in store + BattleScene, (3) mechanical cleanups — App routing, file deletions, sound system, remaining test assertions. Each task ends with the toolchain green except for the deferred `next build` failure.

**Tech Stack:** TypeScript, Zustand 5 (persist middleware, version 5→6), Vitest, Phaser 3, Next.js 16, pnpm workspaces.

**Spec:** `docs/superpowers/specs/2026-05-02-phase-b3b2-design.md`

**Branch:** `feat/phase-b3b2-legacy-removal` (created off `main` after `phase-b3b1-complete` + `chore/test-speedup` merge `1cde967`).

**Out of scope (deferred to follow-up phases):**
- `next build` Phaser ESM default-export failure → separate phase **B-fix-phaser-build**.
- Real Quest redesign → Phase F (job tree integration).
- `markRegionVisited` / `MetaState.regionsVisited` removal → coupled with story refactor.
- `pickMonster(level, regionId?)` parameter signature cleanup → naturally falls out once callers reach 0; if any remain after Task 5, defer.

**Per-task verification gates** (every task ends with these — `next build` excluded by design):

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg lint
pnpm --filter @forge/game-inflation-rpg test
```

Final gate (Task 8 only) adds `circular` + `e2e` + manual smoke.

---

## File Structure

**Files modified across the plan:**

- `games/inflation-rpg/src/screens/Quests.tsx` — Task 1 (placeholder UI for dungeon flow)
- `games/inflation-rpg/src/screens/Quests.test.tsx` — Task 1 (placeholder assertion)
- `games/inflation-rpg/src/screens/Battle.tsx` — Task 2 (`'world-map'` → `'town'`)
- `games/inflation-rpg/src/screens/Inventory.tsx` — Task 2 (back-screen string)
- `games/inflation-rpg/src/screens/Inventory.test.tsx` — Task 2 (assertion fix)
- `games/inflation-rpg/src/screens/Shop.tsx` — Task 2 (back-screen string)
- `games/inflation-rpg/src/types.ts` — Task 3 (RunState + Screen union)
- `games/inflation-rpg/src/store/gameStore.ts` — Task 3 (state + actions + persist v6)
- `games/inflation-rpg/src/store/gameStore.test.ts` — Task 3 (assertions + v6 stub)
- `games/inflation-rpg/src/battle/BattleScene.ts` — Task 3 (legacy branches + final cleanup)
- `games/inflation-rpg/src/App.tsx` — Task 4 (drop `'world-map'` + `'dungeon'` routing)
- `games/inflation-rpg/src/systems/sound.ts` — Task 6 (drop `'world-map'`/`'dungeon'` BGM keys)
- `games/inflation-rpg/src/systems/sound.test.ts` — Task 6 (drop assertions)
- `games/inflation-rpg/src/screens/ClassSelect.test.tsx` — Task 7 (route assertion)

**Files deleted:**

- `games/inflation-rpg/src/screens/WorldMap.tsx` — Task 5
- `games/inflation-rpg/src/screens/WorldMap.test.tsx` — Task 5
- `games/inflation-rpg/src/screens/RegionMap.tsx` — Task 5
- `games/inflation-rpg/src/screens/RegionMap.test.tsx` — Task 5
- `games/inflation-rpg/src/screens/Dungeon.tsx` — Task 5
- `games/inflation-rpg/src/screens/Dungeon.test.tsx` — Task 5
- `games/inflation-rpg/src/data/regions.ts` — Task 5
- `games/inflation-rpg/src/data/maps.ts` — Task 5
- `games/inflation-rpg/src/data/maps.test.ts` — Task 5
- `games/inflation-rpg/tests/full-run.spec.ts` — Task 7

---

## Pre-flight: Branch Setup

- [ ] **Step 1: Verify clean main**

Run: `cd /Users/joel/Desktop/git/2d-game-forge && git status --short && git log --oneline -3`
Expected: Empty status. HEAD at `1cde967` (chore/test-speedup merge) or later — must include `phase-b3b2-complete`'s parent state.

- [ ] **Step 2: Create branch**

Run: `git checkout -b feat/phase-b3b2-legacy-removal`
Expected: `Switched to a new branch 'feat/phase-b3b2-legacy-removal'`

- [ ] **Step 3: Baseline gate (capture starting state)**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test`
Expected: typecheck 0 errors, lint clean, vitest 267/267 PASS.

If baseline fails, stop — environment problem must be diagnosed before plan execution.

---

## Task 1 — Quests UI Placeholder for Dungeon Flow

**Files:**
- Modify: `games/inflation-rpg/src/screens/Quests.tsx`
- Modify: `games/inflation-rpg/src/screens/Quests.test.tsx`

**Why:** Quest content will be redesigned in Phase F (job tree). For the new dungeon flow (`currentDungeonId !== null`), show a non-functional placeholder so users aren't confused by quests that can't make progress. Keep monsterId-specific quests' progress tracking alive (handled by `trackKill` in Task 3).

- [ ] **Step 1: Read current Quests.tsx**

Read: `games/inflation-rpg/src/screens/Quests.tsx`

Note that the back button currently routes to `'world-map'` — this is fixed in Task 2, not here.

- [ ] **Step 2: Read current Quests.test.tsx for existing test patterns**

Read: `games/inflation-rpg/src/screens/Quests.test.tsx`

This tells you the import and beforeEach setup conventions.

- [ ] **Step 3: Write the failing test for placeholder mode**

Edit: `games/inflation-rpg/src/screens/Quests.test.tsx`

Add a new `it()` case at the end of the existing `describe` block:

```tsx
it('shows "재설계 예정" placeholder when in dungeon flow', () => {
  useGameStore.setState((s) => ({
    run: { ...s.run, currentDungeonId: 'plains' },
    meta: {
      ...s.meta,
      // Force a quest to be claimable in legacy flow so we can confirm the button is hidden.
      questProgress: { ...s.meta.questProgress, ...QUESTS.reduce((acc, q) => ({ ...acc, [q.id]: q.target.count }), {}) },
    },
  }));
  render(<Quests />);
  // Placeholder label appears at least once.
  expect(screen.getAllByText(/재설계 예정/).length).toBeGreaterThan(0);
  // No "보상 수령" button visible while in dungeon flow.
  expect(screen.queryByRole('button', { name: /보상 수령/ })).toBeNull();
});
```

If `QUESTS` is not already imported in the test file, add: `import { QUESTS } from '../data/quests';` at the top.

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm --filter @forge/game-inflation-rpg test -- Quests.test`
Expected: FAIL with the new case (placeholder text not present, OR claim button still rendered).

- [ ] **Step 5: Implement placeholder UI in Quests.tsx**

Edit: `games/inflation-rpg/src/screens/Quests.tsx`

Replace the entire file body with:

```tsx
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { QUESTS } from '../data/quests';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { ForgePanel } from '@/components/ui/forge-panel';
import { ForgeButton } from '@/components/ui/forge-button';

export function Quests() {
  const meta = useGameStore((s) => s.meta);
  const currentDungeonId = useGameStore((s) => s.run.currentDungeonId);
  const completeQuest = useGameStore((s) => s.completeQuest);
  const setScreen = useGameStore((s) => s.setScreen);

  const inDungeonFlow = currentDungeonId !== null;

  return (
    <ForgeScreen>
      <div style={{ padding: '14px 16px' }}>
        <h2 style={{ color: 'var(--forge-accent)', margin: 0 }}>퀘스트</h2>
      </div>
      <div style={{ paddingBottom: 16 }}>
        {QUESTS.map((q) => {
          const progress = meta.questProgress[q.id] ?? 0;
          const completed = meta.questsCompleted.includes(q.id);
          const claimable = !inDungeonFlow && !completed && progress >= q.target.count;
          return (
            <ForgePanel
              key={q.id}
              style={{
                margin: '8px 16px',
                opacity: inDungeonFlow ? 0.55 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>{q.nameKR}</span>
                <span style={{ fontSize: 11, color: 'var(--forge-text-secondary)' }}>
                  {q.regionId}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--forge-text-secondary)', margin: '6px 0' }}>
                {q.description}
              </div>
              <div style={{ fontSize: 12 }}>
                진행: {Math.min(progress, q.target.count)} / {q.target.count}
              </div>
              <div style={{ fontSize: 11, color: 'var(--forge-accent)', marginTop: 4 }}>
                보상: {q.reward.gold ? `${q.reward.gold}G ` : ''}
                {q.reward.bp ? `BP+${q.reward.bp} ` : ''}
                {q.reward.equipmentId ? `${q.reward.equipmentId}` : ''}
              </div>
              {inDungeonFlow && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--forge-text-secondary)', fontStyle: 'italic' }}>
                  재설계 예정 — Phase F
                </div>
              )}
              {claimable && (
                <ForgeButton variant="primary" style={{ marginTop: 8 }} onClick={() => completeQuest(q.id)}>
                  보상 수령
                </ForgeButton>
              )}
              {completed && !inDungeonFlow && (
                <div style={{ marginTop: 8, color: 'var(--forge-stat-hp)', fontSize: 12 }}>
                  ✅ 완료
                </div>
              )}
            </ForgePanel>
          );
        })}
      </div>
      <div style={{ padding: '0 16px 16px' }}>
        <ForgeButton variant="secondary" style={{ width: '100%' }} onClick={() => setScreen('world-map')}>
          돌아가기
        </ForgeButton>
      </div>
    </ForgeScreen>
  );
}
```

NOTE: the back button still says `'world-map'` here. Task 2 changes it. Don't change it now or you'll touch the same file twice unnecessarily.

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @forge/game-inflation-rpg test -- Quests.test`
Expected: All Quests tests PASS, including the new placeholder case.

- [ ] **Step 7: Run full task gate**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test`
Expected: typecheck 0, lint clean, vitest all PASS.

- [ ] **Step 8: Commit**

```bash
git add games/inflation-rpg/src/screens/Quests.tsx games/inflation-rpg/src/screens/Quests.test.tsx
git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): Quests UI shows "재설계 예정" placeholder in dungeon flow

When run.currentDungeonId !== null (new dungeon flow), each quest card is
dimmed, claim buttons are hidden, and a "재설계 예정 — Phase F" subtitle is
shown. Quest progress display continues so any partial monster-id-specific
tracking remains visible. Real quest redesign deferred to Phase F.

Phase B-3β2 Task 1.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Screen Component Back Buttons: `'world-map'` → `'town'`

**Files:**
- Modify: `games/inflation-rpg/src/screens/Battle.tsx:32`
- Modify: `games/inflation-rpg/src/screens/Inventory.tsx:47`
- Modify: `games/inflation-rpg/src/screens/Inventory.test.tsx:45`
- Modify: `games/inflation-rpg/src/screens/Shop.tsx:24`
- Modify: `games/inflation-rpg/src/screens/Quests.tsx` (back button line at end of file from Task 1)

**Why:** All "back" navigation that currently goes to `'world-map'` must redirect to `'town'` (which is the new flow's hub) so removing the `'world-map'` Screen member in Task 3 leaves no callers behind. `'town'` is already a member of the Screen union, so this is a pure string substitution and stays typecheck-green.

- [ ] **Step 1: Update Battle.tsx**

Edit: `games/inflation-rpg/src/screens/Battle.tsx`

Find:
```tsx
        setScreen('world-map');
```
(at line 32, inside the `onBattleEnd` callback)

Replace with:
```tsx
        setScreen('town');
```

- [ ] **Step 2: Update Inventory.tsx**

Edit: `games/inflation-rpg/src/screens/Inventory.tsx`

Find:
```tsx
  const backScreen = run.characterId ? 'world-map' : 'main-menu';
```

Replace with:
```tsx
  const backScreen = run.characterId ? 'town' : 'main-menu';
```

- [ ] **Step 3: Update Inventory.test.tsx**

Edit: `games/inflation-rpg/src/screens/Inventory.test.tsx`

Find:
```tsx
    expect(['main-menu', 'world-map']).toContain(useGameStore.getState().screen);
```

Replace with:
```tsx
    expect(['main-menu', 'town']).toContain(useGameStore.getState().screen);
```

- [ ] **Step 4: Update Shop.tsx**

Edit: `games/inflation-rpg/src/screens/Shop.tsx`

Find:
```tsx
  const backScreen = run.characterId ? 'world-map' : 'main-menu';
```

Replace with:
```tsx
  const backScreen = run.characterId ? 'town' : 'main-menu';
```

- [ ] **Step 5: Update Quests.tsx back button**

Edit: `games/inflation-rpg/src/screens/Quests.tsx`

Find:
```tsx
        <ForgeButton variant="secondary" style={{ width: '100%' }} onClick={() => setScreen('world-map')}>
```

Replace with:
```tsx
        <ForgeButton variant="secondary" style={{ width: '100%' }} onClick={() => setScreen('town')}>
```

- [ ] **Step 6: Run task gate**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test`
Expected: typecheck 0, lint clean, vitest all PASS.

- [ ] **Step 7: Commit**

```bash
git add games/inflation-rpg/src/screens/Battle.tsx games/inflation-rpg/src/screens/Inventory.tsx games/inflation-rpg/src/screens/Inventory.test.tsx games/inflation-rpg/src/screens/Shop.tsx games/inflation-rpg/src/screens/Quests.tsx
git commit -m "$(cat <<'EOF'
refactor(game-inflation-rpg): redirect back buttons from 'world-map' to 'town'

Battle / Inventory / Shop / Quests back buttons now route to 'town' (new
dungeon flow's hub). Prepares Task 3 to remove 'world-map' from the Screen
union without orphaned callers.

Phase B-3β2 Task 2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Core Surgery: types.ts + gameStore.ts + BattleScene.ts (atomic)

**Files:**
- Modify: `games/inflation-rpg/src/types.ts`
- Modify: `games/inflation-rpg/src/store/gameStore.ts`
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts`
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts`

**Why:** `RunState.currentAreaId` and the Screen-union members `'world-map'`/`'dungeon'` are referenced together by store + BattleScene. Removing them in separate tasks would leave typecheck red between commits. This task ships all three files together so the toolchain stays green.

This task also (a) simplifies `trackKill` to a single argument and drops region-wide quest matching, (b) bumps persist v5→v6 to strip `currentAreaId` from old saves, (c) removes the legacy 25%-boss and legacy-normal branches in `BattleScene.create()`, (d) drops the `MAP_AREAS` lookup in `BattleScene.doRound()` post-kill, (e) changes `setScreen('world-map')` → `setScreen('town')` in `BattleScene.onDungeonComplete()`, and (f) calls `selectDungeon(null)` on final boss clear so the run terminates cleanly.

- [ ] **Step 1: Update types.ts — RunState and Screen union**

Edit: `games/inflation-rpg/src/types.ts`

Find:
```ts
export interface RunState {
  characterId: string;
  level: number;
  exp: number;
  bp: number;
  statPoints: number;
  allocated: AllocatedStats;
  currentAreaId: string;
  currentDungeonId: string | null;   // Phase B-2 — 선택된 던전 ID, 미선택 시 null
```

Replace with:
```ts
export interface RunState {
  characterId: string;
  level: number;
  exp: number;
  bp: number;
  statPoints: number;
  allocated: AllocatedStats;
  currentDungeonId: string | null;   // Phase B-2 — 선택된 던전 ID, 미선택 시 null
```

(Remove the `currentAreaId: string;` line entirely.)

Find:
```ts
export type Screen =
  | 'main-menu'
  | 'town'
  | 'dungeon-floors'
  | 'class-select'
  | 'world-map'
  | 'battle'
  | 'dungeon'
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
  | 'quests';
```

(Remove `| 'world-map'` and `| 'dungeon'` lines.)

- [ ] **Step 2: Update gameStore.ts — INITIAL_RUN, action interface, action implementations, persist**

Edit: `games/inflation-rpg/src/store/gameStore.ts`

**(a) Remove `currentAreaId` from `INITIAL_RUN`:**

Find:
```ts
export const INITIAL_RUN: RunState = {
  characterId: '',
  level: 1,
  exp: 0,
  bp: STARTING_BP,
  statPoints: 0,
  allocated: INITIAL_ALLOCATED,
  currentAreaId: 'village-entrance',
  currentDungeonId: null,
```

Replace with:
```ts
export const INITIAL_RUN: RunState = {
  characterId: '',
  level: 1,
  exp: 0,
  bp: STARTING_BP,
  statPoints: 0,
  allocated: INITIAL_ALLOCATED,
  currentDungeonId: null,
```

**(b) Remove `setCurrentArea` from the GameStore interface:**

Find:
```ts
  buyEquipSlot: () => void;
  setCurrentArea: (areaId: string) => void;
  selectDungeon: (dungeonId: string | null) => void;
```

Replace with:
```ts
  buyEquipSlot: () => void;
  selectDungeon: (dungeonId: string | null) => void;
```

**(c) Change `trackKill` signature in the GameStore interface:**

Find:
```ts
  trackKill: (monsterId: string, regionId: string) => void;
```

Replace with:
```ts
  trackKill: (monsterId: string) => void;
```

**(d) Simplify `startRun` — always navigate to `dungeon-floors`:**

Find:
```ts
      startRun: (characterId, isHardMode) =>
        set((s) => ({
          run: {
            ...INITIAL_RUN,
            characterId,
            isHardMode,
            currentDungeonId: s.run.currentDungeonId, // preserve dungeon selection from Town
          },
          screen: s.run.currentDungeonId !== null ? 'dungeon-floors' : 'world-map',
        })),
```

Replace with:
```ts
      startRun: (characterId, isHardMode) =>
        set((s) => ({
          run: {
            ...INITIAL_RUN,
            characterId,
            isHardMode,
            currentDungeonId: s.run.currentDungeonId, // preserve dungeon selection from Town
          },
          screen: 'dungeon-floors',
        })),
```

**(e) Remove the `setCurrentArea` action implementation:**

Find:
```ts
      setCurrentArea: (areaId) => set((s) => ({ run: { ...s.run, currentAreaId: areaId } })),
```

Delete that entire line.

**(f) Simplify `trackKill` body — single argument, no region-wide matching:**

Find:
```ts
      trackKill: (monsterId, regionId) => {
        const state = get();
        for (const q of QUESTS) {
          if (q.type !== 'kill_count') continue;
          if (state.meta.questsCompleted.includes(q.id)) continue;
          const matchesMonster = q.target.monsterId === monsterId;
          const matchesRegion = q.target.monsterId === undefined && q.regionId === regionId;
          if (matchesMonster || matchesRegion) {
            get().incrementQuestProgress(q.id);
          }
        }
      },
```

Replace with:
```ts
      trackKill: (monsterId) => {
        const state = get();
        for (const q of QUESTS) {
          if (q.type !== 'kill_count') continue;
          if (state.meta.questsCompleted.includes(q.id)) continue;
          if (q.target.monsterId === monsterId) {
            get().incrementQuestProgress(q.id);
          }
        }
      },
```

**(g) Bump persist version to 6 + add v5→v6 migrate case:**

Find:
```ts
      name: 'korea_inflation_rpg_save',
      version: 5,
      migrate: (persisted: unknown, fromVersion: number) => {
        const s = persisted as { meta?: Partial<MetaState>; run?: Partial<RunState> };
```

Replace with:
```ts
      name: 'korea_inflation_rpg_save',
      version: 6,
      migrate: (persisted: unknown, fromVersion: number) => {
        const s = persisted as { meta?: Partial<MetaState>; run?: (Partial<RunState> & { currentAreaId?: string }) };
```

(The cast intersection lets us reference the now-removed field for stripping without a type error.)

Find the end of the existing migrate body (right before `return s;`):
```ts
        // Phase B-3β1 — dungeonProgress / dungeonFinalsCleared / pendingFinalClearedId 추가
        if (fromVersion < 5 && s.meta) {
          s.meta.dungeonProgress = s.meta.dungeonProgress ?? {};
          s.meta.dungeonFinalsCleared = s.meta.dungeonFinalsCleared ?? [];
          s.meta.pendingFinalClearedId = s.meta.pendingFinalClearedId ?? null;
        }
        return s;
      },
```

Replace with:
```ts
        // Phase B-3β1 — dungeonProgress / dungeonFinalsCleared / pendingFinalClearedId 추가
        if (fromVersion < 5 && s.meta) {
          s.meta.dungeonProgress = s.meta.dungeonProgress ?? {};
          s.meta.dungeonFinalsCleared = s.meta.dungeonFinalsCleared ?? [];
          s.meta.pendingFinalClearedId = s.meta.pendingFinalClearedId ?? null;
        }
        // Phase B-3β2 — currentAreaId 제거 (legacy world-map flow)
        if (fromVersion < 6 && s.run) {
          delete s.run.currentAreaId;
        }
        return s;
      },
```

- [ ] **Step 3: Update gameStore.test.ts — fix world-map assertions and add v6 stub**

Edit: `games/inflation-rpg/src/store/gameStore.test.ts`

**(a) Fix the original `startRun` test (lines 15-22):**

Find:
```ts
  it('startRun: sets characterId, resets run, navigates to world-map', () => {
    useGameStore.getState().startRun('hwarang', false);
    const state = useGameStore.getState();
    expect(state.run.characterId).toBe('hwarang');
    expect(state.run.bp).toBe(30);
    expect(state.run.level).toBe(1);
    expect(state.screen).toBe('world-map');
  });
```

Replace with:
```ts
  it('startRun: sets characterId, resets run, navigates to dungeon-floors', () => {
    useGameStore.getState().startRun('hwarang', false);
    const state = useGameStore.getState();
    expect(state.run.characterId).toBe('hwarang');
    expect(state.run.bp).toBe(30);
    expect(state.run.level).toBe(1);
    expect(state.screen).toBe('dungeon-floors');
  });
```

**(b) Delete the legacy-fallback test (lines 333-337):**

Find:
```ts
  it('startRun routes to world-map when currentDungeonId is null (legacy flow)', () => {
    useGameStore.getState().selectDungeon(null);
    useGameStore.getState().startRun('hwarang', false);
    expect(useGameStore.getState().screen).toBe('world-map');
  });
```

Delete the entire `it()` block (the test is no longer a valid scenario — startRun always routes to dungeon-floors now).

**(c) Add a stub test confirming v6 strips currentAreaId.**

Find the `describe('Phase B-3β1 — dungeon progress + finals',` block. After the closing `});` of that block (end of file before final closing `});` if there is one — append at file end if needed), add:

```ts
describe('Phase B-3β2 — persist v6 strips currentAreaId', () => {
  it('INITIAL_RUN has no currentAreaId field', () => {
    expect((INITIAL_RUN as unknown as { currentAreaId?: string }).currentAreaId).toBeUndefined();
  });
});
```

This is a stub mirroring the B-3β1 pattern (the real migrate path is exercised by manual + e2e). The cast-through-unknown sidesteps strict-mode "missing property" if the test file is compiled under a stricter config.

- [ ] **Step 4: Update BattleScene.ts — drop legacy branches, add selectDungeon(null)**

Edit: `games/inflation-rpg/src/battle/BattleScene.ts`

**(a) Remove the `MAP_AREAS` import:**

Find:
```ts
import { MAP_AREAS } from '../data/maps';
```

Delete that line entirely.

**(b) Drop the legacy `getBossesForArea` import (used only by the 25% legacy branch):**

Find:
```ts
import { getBossesForArea, getBossById } from '../data/bosses';
```

Replace with:
```ts
import { getBossById } from '../data/bosses';
```

**(c) Remove the `pickMonster` import (legacy normal branch):**

Find:
```ts
import { pickMonster, pickMonsterFromPool } from '../data/monsters';
```

Replace with:
```ts
import { pickMonsterFromPool } from '../data/monsters';
```

**(d) Replace `create()` body — drop legacy area/boss branches:**

Find the entire block starting at:
```ts
  create() {
    const theme = resolveForgeTheme();
    const { run } = useGameStore.getState();
    const area = run.currentAreaId;
    const bosses = getBossesForArea(area, run.isHardMode);
    const hasBoss = bosses.length > 0;

    const bg = this.add.rectangle(0, 0, 360, 600, theme.bg).setOrigin(0);
    void bg;

    const isNewFlow = run.currentDungeonId !== null;

    if (!isNewFlow && hasBoss && Math.random() < 0.25) {
      // 구 flow — 25% 보스 출현 (그대로)
      const boss = bosses[0]!;
      this.isBoss = true;
      this.bossId = boss.id;
      this.enemyName = `👹 ${boss.nameKR}`;
      this.enemyMaxHP = Math.floor(run.level * 50 * boss.hpMult);
    } else if (isNewFlow) {
```

…ending at the closing `} else {` and the legacy-normal branch through to:
```ts
    } else {
      // 구 flow — 일반 (기존)
      this.isBoss = false;
      this.cachedMonsterLevel = null;
      const currentArea = MAP_AREAS.find(a => a.id === area);
      const monster = pickMonster(run.level, currentArea?.regionId);
      this.currentMonsterId = monster.id;
      this.enemyName = `${monster.emoji} ${monster.nameKR}`;
      this.enemyMaxHP = Math.floor(run.level * 20 * monster.hpMult);
    }
    this.enemyHP = this.enemyMaxHP;
```

Replace the whole block with:
```ts
  create() {
    const theme = resolveForgeTheme();
    const { run } = useGameStore.getState();

    const bg = this.add.rectangle(0, 0, 360, 600, theme.bg).setOrigin(0);
    void bg;

    // 신 flow only — currentDungeonId is invariant non-null at this point.
    const dungeon = getDungeonById(run.currentDungeonId!);
    const info = getFloorInfo(run.currentDungeonId!, run.currentFloor);
    const monsterLevel = info.monsterLevel;
    this.cachedMonsterLevel = monsterLevel;

    const bossType: BossType | null = info.bossType;
    if (bossType !== null && dungeon) {
      const bossId = pickBossIdByType(dungeon.bossIds, bossType, run.currentFloor);
      const boss = getBossById(bossId);
      if (boss) {
        this.isBoss = true;
        this.bossId = boss.id;
        const bossEmoji = bossType === 'final' ? '⭐' : '👹';
        this.enemyName = `${bossEmoji} ${boss.nameKR}`;
        this.enemyMaxHP = Math.floor(monsterLevel * 50 * boss.hpMult);
      } else {
        // 데이터 결함 — 일반 몹으로 fallback
        this.isBoss = false;
        const monster = pickMonsterFromPool(monsterLevel, dungeon.monsterPool);
        this.currentMonsterId = monster.id;
        this.enemyName = `${monster.emoji} ${monster.nameKR}`;
        this.enemyMaxHP = Math.floor(monsterLevel * 20 * monster.hpMult);
      }
    } else {
      // 신 flow — 일반 floor
      this.isBoss = false;
      const monster = pickMonsterFromPool(monsterLevel, dungeon!.monsterPool);
      this.currentMonsterId = monster.id;
      this.enemyName = `${monster.emoji} ${monster.nameKR}`;
      this.enemyMaxHP = Math.floor(monsterLevel * 20 * monster.hpMult);
    }
    this.enemyHP = this.enemyMaxHP;
```

**(e) Drop the `MAP_AREAS` lookup in `doRound()` post-kill trackKill call:**

Find:
```ts
      if (!this.isBoss) {
        // Non-boss: DR = round(level * 0.5), counter increments owned by incrementDungeonKill
        useGameStore.getState().incrementDungeonKill(run.level);
        const storeState = useGameStore.getState();
        const currentArea = MAP_AREAS.find(a => a.id === storeState.run.currentAreaId);
        if (currentArea) {
          storeState.trackKill(this.currentMonsterId, currentArea.regionId);
        }
      }
```

Replace with:
```ts
      if (!this.isBoss) {
        // Non-boss: DR = round(level * 0.5), counter increments owned by incrementDungeonKill
        useGameStore.getState().incrementDungeonKill(run.level);
        if (this.currentMonsterId) {
          useGameStore.getState().trackKill(this.currentMonsterId);
        }
      }
```

**(f) Remove the legacy stage-progression branch in `doRound()`:**

Find:
```ts
      // 구 flow — stage threshold 진행.
      const area = MAP_AREAS.find(a => a.id === currentRun.currentAreaId);
      if (area) {
        const stageThreshold = currentRun.currentStage * area.stageMonsterCount;
        if (currentRun.dungeonRunMonstersDefeated >= stageThreshold) {
          if (currentRun.currentStage >= area.stageCount) {
            this.onDungeonComplete();
            return;
          } else {
            stateAfterKill.advanceStage();
          }
        }
      }

      if (spGained > 0) {
        playSfx('levelup');
        this.callbacks.onLevelUp(newLevel);
      } else {
        this.callbacks.onBattleEnd(true);
      }
      return;
    }
```

Replace with (the legacy branch is unreachable now — `currentDungeonId !== null` is invariant — so we can just drop it; the post-kill routing already returns inside the dungeon-flow branch above):
```ts
      // currentDungeonId is invariant non-null in new flow — the dungeon-flow branch above always returns.
      // Defensive: if we somehow reach here, end the battle as a level-up or normal victory.
      if (spGained > 0) {
        playSfx('levelup');
        this.callbacks.onLevelUp(newLevel);
      } else {
        this.callbacks.onBattleEnd(true);
      }
      return;
    }
```

**(g) Add `selectDungeon(null)` to the final boss clear branch:**

Find:
```ts
        if (bossType === 'final') {
          // Final 처치 — 1회 영구 보상 + 정복 모달 + 마을 강제 복귀.
          // (this.bossId / bossDrop 은 이미 위쪽 onBossKill 콜백 통해 처리됨.)
          stateAfterKill.markFinalCleared(dungeonId);
          stateAfterKill.markDungeonProgress(dungeonId, 30);
          stateAfterKill.setPendingFinalCleared(dungeonId);
          stateAfterKill.setScreen('town');
          return;
        }
```

Replace with:
```ts
        if (bossType === 'final') {
          // Final 처치 — 1회 영구 보상 + 정복 모달 + 마을 강제 복귀.
          // (this.bossId / bossDrop 은 이미 위쪽 onBossKill 콜백 통해 처리됨.)
          stateAfterKill.markFinalCleared(dungeonId);
          stateAfterKill.markDungeonProgress(dungeonId, 30);
          stateAfterKill.setPendingFinalCleared(dungeonId);
          stateAfterKill.selectDungeon(null);
          stateAfterKill.setScreen('town');
          return;
        }
```

**(h) Update `onDungeonComplete` (now unreachable in new flow but kept for safety) — point to 'town':**

Find:
```ts
  private onDungeonComplete() {
    useGameStore.getState().resetDungeon();
    useGameStore.getState().setScreen('world-map');
  }
```

Replace with:
```ts
  private onDungeonComplete() {
    useGameStore.getState().resetDungeon();
    useGameStore.getState().setScreen('town');
  }
```

- [ ] **Step 5: Run task gate**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test`
Expected: typecheck 0, lint clean, vitest all PASS.

If typecheck has residual errors mentioning `currentAreaId`, `MAP_AREAS`, `'world-map'`, or `'dungeon'` (Screen variant), they reveal a missed call site — fix and rerun.

- [ ] **Step 6: Manual visual check (optional but recommended)**

Run: `pnpm --filter @forge/game-inflation-rpg dev`
In a browser, run through: ClassSelect → start a run → enter dungeon → reach floor 30 final → modal appears → close → returns to town with no dungeon selected.

(Skipping is OK; Task 8 does the formal manual smoke.)

- [ ] **Step 7: Commit**

```bash
git add games/inflation-rpg/src/types.ts games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts games/inflation-rpg/src/battle/BattleScene.ts
git commit -m "$(cat <<'EOF'
refactor(game-inflation-rpg): remove legacy world-map flow surface (core surgery)

Removes RunState.currentAreaId, Screen-union members 'world-map' and
'dungeon', setCurrentArea action, and all legacy branches in BattleScene
(25% boss + legacy-normal + stage-progression branches). Simplifies
trackKill to a single argument (drops region-wide quest matching, which is
unreachable now). Bumps persist version 5→6 to strip currentAreaId from
old saves. Adds selectDungeon(null) on final boss clear so the run
terminates cleanly.

This is one atomic task because the type change cascades into store and
BattleScene — splitting would leave typecheck red between commits.

Phase B-3β2 Task 3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — App.tsx Routing Cleanup

**Files:**
- Modify: `games/inflation-rpg/src/App.tsx`

**Why:** With Screen union no longer including `'world-map'` or `'dungeon'`, the `App.tsx` routing branches that gate on those values are unreachable and import-leftovers will block file deletion in Task 5.

- [ ] **Step 1: Update App.tsx imports and routing**

Edit: `games/inflation-rpg/src/App.tsx`

Find:
```tsx
import { WorldMap } from './screens/WorldMap';
import { Dungeon } from './screens/Dungeon';
```

Delete both lines.

Find:
```tsx
      {screen === 'world-map'    && <WorldMap />}
      {screen === 'battle'       && <Battle />}
      {screen === 'dungeon'      && <Dungeon />}
      {screen === 'inventory'    && <Inventory />}
```

Replace with:
```tsx
      {screen === 'battle'       && <Battle />}
      {screen === 'inventory'    && <Inventory />}
```

(Removes the `'world-map'` and `'dungeon'` routing lines.)

- [ ] **Step 2: Run task gate**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test`
Expected: typecheck 0, lint clean, vitest all PASS.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/App.tsx
git commit -m "$(cat <<'EOF'
refactor(game-inflation-rpg): drop world-map / dungeon routing from App.tsx

Removes WorldMap + Dungeon imports and the screen===world-map /
screen===dungeon routing branches. Both Screen union variants were removed
in Task 3, making the routing unreachable.

Phase B-3β2 Task 4.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Delete Legacy Files

**Files (deleted):**
- `games/inflation-rpg/src/screens/WorldMap.tsx`
- `games/inflation-rpg/src/screens/WorldMap.test.tsx`
- `games/inflation-rpg/src/screens/RegionMap.tsx`
- `games/inflation-rpg/src/screens/RegionMap.test.tsx`
- `games/inflation-rpg/src/screens/Dungeon.tsx`
- `games/inflation-rpg/src/screens/Dungeon.test.tsx`
- `games/inflation-rpg/src/data/regions.ts`
- `games/inflation-rpg/src/data/maps.ts`
- `games/inflation-rpg/src/data/maps.test.ts`

**Why:** All callers were redirected or removed by Tasks 2-4. The files are now dead code.

- [ ] **Step 1: Confirm zero remaining imports**

Run from repo root:
```bash
cd /Users/joel/Desktop/git/2d-game-forge && grep -rn --include='*.ts' --include='*.tsx' -e "from '\\./WorldMap'" -e "from '\\./RegionMap'" -e "from '\\./screens/WorldMap'" -e "from '\\./screens/RegionMap'" -e "from '\\./screens/Dungeon'" -e "from '\\.\\./screens/WorldMap'" -e "from '\\.\\./screens/RegionMap'" -e "from '\\./regions'" -e "from '\\./maps'" -e "from '\\.\\./data/regions'" -e "from '\\.\\./data/maps'" -e "MAP_AREAS" -e "REGIONS" games/inflation-rpg/src
```

Expected: 0 hits. (`Dungeon.tsx`'s own self-references inside the file being deleted don't count, but its imports may show — that's fine since the file is being deleted next step.)

If any non-self hits remain, fix them (likely a missed back-button or import) before deleting.

- [ ] **Step 2: Delete the files**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && rm games/inflation-rpg/src/screens/WorldMap.tsx games/inflation-rpg/src/screens/WorldMap.test.tsx games/inflation-rpg/src/screens/RegionMap.tsx games/inflation-rpg/src/screens/RegionMap.test.tsx games/inflation-rpg/src/screens/Dungeon.tsx games/inflation-rpg/src/screens/Dungeon.test.tsx games/inflation-rpg/src/data/regions.ts games/inflation-rpg/src/data/maps.ts games/inflation-rpg/src/data/maps.test.ts
```

- [ ] **Step 3: Run task gate**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test && pnpm --filter @forge/game-inflation-rpg circular`
Expected: typecheck 0, lint clean, vitest PASS, circular clean.

- [ ] **Step 4: Commit**

```bash
git add -A games/inflation-rpg/src/screens/ games/inflation-rpg/src/data/
git commit -m "$(cat <<'EOF'
chore(game-inflation-rpg): delete legacy world-map / region-map / dungeon files

Removes WorldMap.tsx, RegionMap.tsx, Dungeon.tsx (+ tests) and the legacy
data modules regions.ts, maps.ts, maps.test.ts. All callers were
redirected or removed in Tasks 2-4, leaving these as dead code.

Phase B-3β2 Task 5.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Sound System Cleanup

**Files:**
- Modify: `games/inflation-rpg/src/systems/sound.ts`
- Modify: `games/inflation-rpg/src/systems/sound.test.ts`

**Why:** The `SCREEN_BGM` map references screen IDs that no longer exist in the Screen union. typecheck will flag the unknown keys — drop them.

- [ ] **Step 1: Update sound.ts SCREEN_BGM map**

Edit: `games/inflation-rpg/src/systems/sound.ts`

Find:
```ts
const SCREEN_BGM: Partial<Record<Screen, string>> = {
  'main-menu': 'lobby',
  'town': 'lobby',
  'dungeon-floors': 'lobby',
  'class-select': 'lobby',
  'world-map': 'field',
  inventory: 'field',
  shop: 'field',
  quests: 'field',
  dungeon: 'battle',
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
  inventory: 'field',
  shop: 'field',
  quests: 'field',
  battle: 'battle',
};
```

(Removes the `'world-map': 'field',` and `dungeon: 'battle',` lines.)

- [ ] **Step 2: Update sound.test.ts assertions**

Edit: `games/inflation-rpg/src/systems/sound.test.ts`

Find:
```ts
  it('bgmIdForScreen maps known screens', () => {
    expect(bgmIdForScreen('main-menu')).toBe('lobby');
    expect(bgmIdForScreen('class-select')).toBe('lobby');
    expect(bgmIdForScreen('world-map')).toBe('field');
    expect(bgmIdForScreen('inventory')).toBe('field');
    expect(bgmIdForScreen('dungeon')).toBe('battle');
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
    expect(bgmIdForScreen('inventory')).toBe('field');
    expect(bgmIdForScreen('battle')).toBe('battle');
  });
```

- [ ] **Step 3: Run task gate**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test`
Expected: typecheck 0, lint clean, vitest all PASS.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/systems/sound.ts games/inflation-rpg/src/systems/sound.test.ts
git commit -m "$(cat <<'EOF'
chore(game-inflation-rpg): drop world-map / dungeon BGM mappings

Removes the obsolete SCREEN_BGM entries for the deleted Screen-union
variants. Adds 'town' / 'dungeon-floors' assertions in their place to
cover the new flow's screens.

Phase B-3β2 Task 6.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — Remaining Test / E2E Cleanup

**Files:**
- Modify: `games/inflation-rpg/src/screens/ClassSelect.test.tsx`
- Delete: `games/inflation-rpg/tests/full-run.spec.ts`

**Why:** ClassSelect's existing test asserts `screen === 'world-map'` after `모험 시작`. The new flow always routes to `dungeon-floors`, so the test needs the dungeon set first. The full-run e2e is already skipped (legacy flow assumption); now is the time to delete it.

- [ ] **Step 1: Update ClassSelect.test.tsx**

Edit: `games/inflation-rpg/src/screens/ClassSelect.test.tsx`

Find:
```tsx
  it('게임 시작 starts run with selected character', async () => {
    render(<ClassSelect />);
    await userEvent.click(screen.getByRole('button', { name: /화랑/i }));
    await userEvent.click(screen.getByRole('button', { name: /모험 시작/i }));
    const state = useGameStore.getState();
    expect(state.run.characterId).toBe('hwarang');
    expect(state.screen).toBe('world-map');
  });
```

Replace with:
```tsx
  it('게임 시작 starts run with selected character', async () => {
    // New flow requires a dungeon to be selected before startRun (invariant).
    useGameStore.getState().selectDungeon('plains');
    render(<ClassSelect />);
    await userEvent.click(screen.getByRole('button', { name: /화랑/i }));
    await userEvent.click(screen.getByRole('button', { name: /모험 시작/i }));
    const state = useGameStore.getState();
    expect(state.run.characterId).toBe('hwarang');
    expect(state.screen).toBe('dungeon-floors');
  });
```

- [ ] **Step 2: Delete full-run.spec.ts**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && rm games/inflation-rpg/tests/full-run.spec.ts
```

- [ ] **Step 3: Final residual grep**

Run from repo root:
```bash
cd /Users/joel/Desktop/git/2d-game-forge && grep -rn --include='*.ts' --include='*.tsx' -e "currentAreaId" -e "setCurrentArea" -e "'world-map'" -e "MAP_AREAS" -e "REGIONS" games/inflation-rpg/src games/inflation-rpg/tests
```

Expected: 0 hits.

If any hits remain, they must be cleaned before proceeding.

- [ ] **Step 4: Run task gate**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test`
Expected: typecheck 0, lint clean, vitest all PASS.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/screens/ClassSelect.test.tsx games/inflation-rpg/tests/full-run.spec.ts
git commit -m "$(cat <<'EOF'
test(game-inflation-rpg): update ClassSelect assertion + delete legacy E2E

ClassSelect 모험 시작 now routes to 'dungeon-floors' (preceded by a
selectDungeon call in the test setup to satisfy the new flow's invariant).
full-run.spec.ts (already skipped, legacy flow assumption) deleted.

Phase B-3β2 Task 7.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 — Final Validation + Manual Smoke

**Files:** None modified (verification only).

**Why:** Confirm full toolchain passes (build excluded by spec) and perform manual smoke of the end-to-end final-clear flow that this phase modifies.

- [ ] **Step 1: Full automated validation**

Run from repo root:
```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test && pnpm --filter @forge/game-inflation-rpg circular
```

Expected: All pass cleanly (typecheck 0, lint 0, vitest all PASS, no circular deps).

- [ ] **Step 2: E2E (chromium + iphone14)**

Run: `pnpm --filter @forge/game-inflation-rpg e2e`
Expected: All E2E specs PASS (note `full-run.spec.ts` is gone; remaining `dungeon-flow.spec.ts` tests should still pass).

- [ ] **Step 3: Skip `next build` (out of scope)**

Do NOT run `pnpm --filter @forge/game-inflation-rpg build`. The Phaser ESM default-export failure is pre-existing and tracked as a separate phase **B-fix-phaser-build**. Confirming this is by design — see spec §3 / §7.

- [ ] **Step 4: Manual smoke — start dev server**

Run: `pnpm dev`
Open browser to `http://localhost:3000` (or the inflation-rpg game URL surfaced by the portal).

- [ ] **Step 5: Manual smoke — full final-clear flow**

In the browser:

1. Start a fresh profile (or clear localStorage for `korea_inflation_rpg_save`).
2. Walk: ClassSelect → Town → select dungeon → see `dungeon-floors` screen.
3. Reach floor 30 and defeat the final boss. Confirm "정복 완료" modal appears.
4. Close modal. Confirm screen is `'town'` and the dungeon-selection UI is restored (currentDungeonId === null).
5. Return to MainMenu. Confirm "런 이어하기" is either hidden or disabled (run is fully ended).
6. Re-enter a dungeon. From battle, navigate to Inventory / Shop / Quests via available paths and confirm each "back" button returns to `'town'`.
7. While `currentDungeonId !== null` (mid-run), open Quests. Confirm every quest card is dimmed with the "재설계 예정 — Phase F" subtitle and no "보상 수령" button is visible.

If any step fails, return to the relevant task and iterate.

- [ ] **Step 6: Persist v6 migration smoke (optional)**

If you have an old save (v5) in localStorage from before this branch:

1. Load the game with that save.
2. Confirm no error in console.
3. In devtools, inspect `localStorage['korea_inflation_rpg_save']` — `state.run.currentAreaId` should be absent.

This is "nice to verify" but not blocking — the v6 migrate is exercised by stub test in Task 3 + manual.

- [ ] **Step 7: Tag**

```bash
git tag phase-b3b2-complete
```

- [ ] **Step 8: Push branch + ask user to merge**

```bash
git push -u origin feat/phase-b3b2-legacy-removal
```

Report the branch name to the user. The user merges via `--no-ff` to `main` per project convention (see CLAUDE.md "브랜치 작업"). Pushing the tag (`git push origin phase-b3b2-complete`) happens after merge confirmation.

---

## Self-Review Checklist (run before handoff)

Auto-completed by author at write time:

- **Spec coverage:** Each spec section maps to at least one task —
  - §4.1 file deletions → Task 5
  - §4.1 types changes → Task 3
  - §4.1 store changes → Task 3
  - §4.1 BattleScene changes → Task 3
  - §4.1 back-button changes → Task 2
  - §4.1 Quests UI placeholder → Task 1
  - §4.1 sound cleanup → Task 6
  - §4.1 test updates → Tasks 1, 2, 3, 6, 7
  - §4.1 e2e deletion → Task 7
  - §4.2 selectDungeon(null) on final → Task 3 (Step 4g)
  - §4.2 trackKill simplification → Task 3 (Step 2c, 2f)
  - §6 task ordering → mirrored 1:1 in plan
- **Placeholders:** None. Every step has exact paths, exact code, exact commands.
- **Type consistency:**
  - `trackKill(monsterId)` (single arg) used in interface (Task 3 Step 2c), action body (Task 3 Step 2f), and BattleScene call site (Task 3 Step 4e). ✅
  - `selectDungeon(null)` already exists in store (per type definition); only added at one new call site (Task 3 Step 4g). ✅
  - `'town'` already in Screen union; substituted for `'world-map'` consistently. ✅
  - persist version `5 → 6`; migrate guard `fromVersion < 6`. ✅
