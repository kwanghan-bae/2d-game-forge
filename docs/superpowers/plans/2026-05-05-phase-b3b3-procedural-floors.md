# Phase B-3β3 — Procedural 31+ Floors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unlock F31~∞ procedural progression in inflation-rpg by removing the F30 cap in BattleScene, splitting the final-clear branch into first-time (modal + run-end) vs subsequent (fall-through to procedural), and adding a "심층 진입" panel to DungeonFloors that jumps directly to the deepest unlocked floor.

**Architecture:** Three small tasks. Task 1 surgically modifies the post-kill routing in `BattleScene.doRound()` — first-clear branch keeps the existing modal+termination behavior, subsequent final clears fall through to the regular cap-removed advancement. Task 2 adds a conditional panel below the 30-card grid in `DungeonFloors.tsx`, plus three unit tests. Task 3 is final validation + manual smoke + tag.

**Tech Stack:** TypeScript 5, React 19, Phaser 3, Zustand 5 (no schema change — persist v6 from B-3β2), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-05-05-phase-b3b3-design.md`

**Branch:** `feat/phase-b3b3-procedural-floors` (created off `main` after `phase-b3b2-complete`).

**Out of scope (deferred):**
- 균열석 (crack stone, Ascension currency) wiring → Phase F.
- F30 매번 reward 격상 (spec §1.5 의 "강화석 50~100") → 콘텐츠 균형 패치.
- DungeonFloors 의 procedural floor 별 카드 렌더 → 본 phase 는 단일 panel.
- `pickBossIdByType` round-robin phase 변경 → 콘텐츠 패치.
- `enterFloor` 의 currentFloor 회귀 fix (pre-existing) → 콘텐츠 패치.

**Per-task verification gates:**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg lint
pnpm --filter @forge/game-inflation-rpg test
```

Final gate (Task 3 only) adds:

```bash
pnpm --filter @forge/game-inflation-rpg build
pnpm --filter @forge/game-inflation-rpg e2e
pnpm circular
```

---

## File Structure

**Files modified:**

- `games/inflation-rpg/src/battle/BattleScene.ts` — Task 1 (final 분기 split + cap 제거 in `doRound()` 후처리)
- `games/inflation-rpg/src/screens/DungeonFloors.tsx` — Task 2 (심층 진입 panel + `enterDeep` handler)
- `games/inflation-rpg/src/screens/DungeonFloors.test.tsx` — Task 2 (3 신규 unit test)

**Files created:** None.

**Files deleted:** None.

---

## Pre-flight: Branch Setup

- [ ] **Step 1: Verify clean main**

Run: `cd /Users/joel/Desktop/git/2d-game-forge && git status --short && git log --oneline -3`
Expected: empty status. HEAD at `9e971f8` (spec commit) or later.

- [ ] **Step 2: Create branch**

Run: `git checkout -b feat/phase-b3b3-procedural-floors`
Expected: `Switched to a new branch 'feat/phase-b3b3-procedural-floors'`

- [ ] **Step 3: Baseline gate**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test`
Expected: typecheck 0 errors, lint clean, vitest 231/231 PASS.

---

## Task 1 — BattleScene Final-Clear Split + Cap Removal

**Files:**
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts:223-239`

**Why:** The current final-clear branch unconditionally invokes the modal + `selectDungeon(null) + setScreen('town')` — even on the player's 100th F30 clear. Per spec §1.5, the modal/celebration is "1회 영구 보상" (first-time only); subsequent clears must continue forward into procedural. The `Math.min(finishedFloor + 1, 30)` cap on the non-final branch caps progression at F30, which we must lift for F31+.

- [ ] **Step 1: Read the current BattleScene final-clear and post-kill routing**

Read: `games/inflation-rpg/src/battle/BattleScene.ts:200-251`

Note specifically lines 219-239: the `bossType === 'final'` branch and the subsequent `Math.min(finishedFloor + 1, 30)` non-final branch.

- [ ] **Step 2: Apply the surgical edit**

Edit: `games/inflation-rpg/src/battle/BattleScene.ts`

Find:
```ts
        const dungeonId = currentRun.currentDungeonId;
        const finishedFloor = currentRun.currentFloor;
        const bossType = getBossType(finishedFloor);

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

        // 일반 / mini / major / sub — 다음 floor 로 진행 (30 cap)
        const nextFloor = Math.min(finishedFloor + 1, 30);
        stateAfterKill.markDungeonProgress(dungeonId, nextFloor);
        stateAfterKill.setCurrentFloor(nextFloor);
        stateAfterKill.setScreen('dungeon-floors');
        return;
```

Replace with:
```ts
        const dungeonId = currentRun.currentDungeonId;
        const finishedFloor = currentRun.currentFloor;
        const bossType = getBossType(finishedFloor);

        if (bossType === 'final') {
          const isFirstClear = !stateAfterKill.meta.dungeonFinalsCleared.includes(dungeonId);
          if (isFirstClear) {
            // 첫 final 처치 — 정복자 의식 + 1회 영구 보상 + 마을 강제 복귀.
            // (this.bossId / bossDrop 은 이미 위쪽 onBossKill 콜백 통해 처리됨.)
            stateAfterKill.markFinalCleared(dungeonId);
            stateAfterKill.markDungeonProgress(dungeonId, 31); // unlock 심층
            stateAfterKill.setPendingFinalCleared(dungeonId);
            stateAfterKill.selectDungeon(null);
            stateAfterKill.setScreen('town');
            return;
          }
          // 두 번째 이후 final — 일반 procedural 진행 (모달 X, run 계속).
          // bossDrop 은 이미 onBossKill 통해 처리됨. fall through to advancement.
        }

        // 일반 / mini / major / sub / subsequent-final — 다음 floor 로 진행 (cap 없음).
        const nextFloor = finishedFloor + 1;
        stateAfterKill.markDungeonProgress(dungeonId, nextFloor);
        stateAfterKill.setCurrentFloor(nextFloor);
        stateAfterKill.setScreen('dungeon-floors');
        return;
```

Critical changes:
- New `isFirstClear` check inside `bossType === 'final'`.
- First-clear branch unchanged in spirit, but `markDungeonProgress(dungeonId, 31)` instead of `30` — this is the unlock signal for the 심층 panel in Task 2.
- Subsequent-final: falls through to the advancement block (no early return).
- Advancement: `Math.min(finishedFloor + 1, 30)` → `finishedFloor + 1` (cap removed).

- [ ] **Step 3: Run task gate**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test`
Expected: typecheck 0 errors, lint clean, vitest 231/231 PASS.

If typecheck reports errors mentioning `markDungeonProgress` (the action exists since B-3β1) or `dungeonFinalsCleared` (since B-3β1), STOP — those should be present.

If vitest fails, the failure is most likely in `gameStore.test.ts` (B-3β1's `'markDungeonProgress only increases, never decreases'` test) because the new behavior writes 31 instead of 30 on first clear. That test asserts on direct `markDungeonProgress` calls, NOT on the BattleScene path, so it should still pass. Verify by re-reading the test if it fails.

- [ ] **Step 4: Commit**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && git add games/inflation-rpg/src/battle/BattleScene.ts && git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): split final-clear into first-time vs subsequent + remove F30 cap

First final clear in a dungeon keeps the existing celebration: markFinalCleared
+ pendingFinalClearedId modal + selectDungeon(null) + back to town. New:
markDungeonProgress is set to 31 (not 30) to unlock the 심층 panel.

Subsequent final clears (when dungeonFinalsCleared already includes the id)
fall through to the regular advancement block — no modal, no run termination.
The advancement block also drops the Math.min(..., 30) cap so floor numbers
can grow indefinitely.

Phase B-3β3 Task 1.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — DungeonFloors 심층 진입 Panel

**Files:**
- Modify: `games/inflation-rpg/src/screens/DungeonFloors.tsx`
- Modify: `games/inflation-rpg/src/screens/DungeonFloors.test.tsx`

**Why:** Once the player has cleared a dungeon's final boss, they need a way to jump back into procedural F31+ in a fresh run without walking F1-F30 every time. The panel renders only when `meta.dungeonFinalsCleared.includes(dungeonId)`, and clicking it bypasses the named-floor `enterFloor` guard via a dedicated `enterDeep` handler.

- [ ] **Step 1: Write the failing tests**

Edit: `games/inflation-rpg/src/screens/DungeonFloors.test.tsx`

Append these three test cases at the end of the existing `describe('DungeonFloors — boss cards', ...)` block. Insert them BEFORE the final closing `});` of that describe block:

```tsx
});

describe('DungeonFloors — 심층 panel', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'dungeon-floors',
      run: { ...INITIAL_RUN, characterId: 'hwarang', currentDungeonId: 'plains', currentFloor: 1, bp: 30 },
      meta: { ...INITIAL_META },
    });
  });

  it('hides the 심층 panel before first final clear', () => {
    render(<DungeonFloors />);
    expect(screen.queryByTestId('dungeon-deep-panel')).toBeNull();
  });

  it('shows the 심층 panel after first final clear with F31 label', () => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        dungeonFinalsCleared: ['plains'],
        dungeonProgress: { plains: { maxFloor: 31 } },
      },
    }));
    render(<DungeonFloors />);
    const panel = screen.getByTestId('dungeon-deep-panel');
    expect(panel).toBeInTheDocument();
    expect(panel.textContent).toContain('F31');
  });

  it('clicking 심층 진입 enters battle at the deepest unlocked floor', () => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        dungeonFinalsCleared: ['plains'],
        dungeonProgress: { plains: { maxFloor: 47 } },
      },
    }));
    render(<DungeonFloors />);
    fireEvent.click(screen.getByTestId('dungeon-deep-enter'));
    expect(useGameStore.getState().run.currentFloor).toBe(47);
    expect(useGameStore.getState().screen).toBe('battle');
  });
```

NOTE: The opening `});` at the top of the snippet closes the previous `describe('DungeonFloors — boss cards', ...)` block. Insert the new code so the file ends with TWO closing `});` (one for the new describe, one for the previous). If your editor adds a trailing newline, the structure should look like:

```tsx
  it('non-boss floors have data-boss="none"', () => {
    render(<DungeonFloors />);
    expect(screen.getByTestId('floor-card-1')).toHaveAttribute('data-boss', 'none');
    expect(screen.getByTestId('floor-card-7')).toHaveAttribute('data-boss', 'none');
  });
});

describe('DungeonFloors — 심층 panel', () => {
  // ... beforeEach ...
  // ... three tests ...
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @forge/game-inflation-rpg test -- DungeonFloors.test`
Expected: FAIL on all three new cases — `dungeon-deep-panel` not found / clicked element not present.

- [ ] **Step 3: Add the panel + enterDeep handler in DungeonFloors.tsx**

Edit: `games/inflation-rpg/src/screens/DungeonFloors.tsx`

Find:
```tsx
export function DungeonFloors() {
  const run = useGameStore((s) => s.run);
  const setScreen = useGameStore((s) => s.setScreen);
  const setCurrentFloor = useGameStore((s) => s.setCurrentFloor);
  const selectDungeon = useGameStore((s) => s.selectDungeon);
  const encounterMonster = useGameStore((s) => s.encounterMonster);
  const endRun = useGameStore((s) => s.endRun);

  const dungeon = run.currentDungeonId
    ? getDungeonById(run.currentDungeonId)
    : undefined;
```

Replace with:
```tsx
export function DungeonFloors() {
  const run = useGameStore((s) => s.run);
  const meta = useGameStore((s) => s.meta);
  const setScreen = useGameStore((s) => s.setScreen);
  const setCurrentFloor = useGameStore((s) => s.setCurrentFloor);
  const selectDungeon = useGameStore((s) => s.selectDungeon);
  const encounterMonster = useGameStore((s) => s.encounterMonster);
  const endRun = useGameStore((s) => s.endRun);

  const dungeon = run.currentDungeonId
    ? getDungeonById(run.currentDungeonId)
    : undefined;
```

(Adds `const meta = useGameStore((s) => s.meta);` immediately after the `run` selector.)

Then find:
```tsx
  const enterFloor = (floor: number) => {
    if (floor > run.currentFloor) return;
    const info = getFloorInfo(dungeon.id, floor);
    setCurrentFloor(floor);
    encounterMonster(info.monsterLevel);
    const newBP = useGameStore.getState().run.bp;
    if (isRunOver(newBP)) {
      endRun();
      return;
    }
    setScreen('battle');
  };

  const backToTown = () => {
    selectDungeon(null);
    setScreen('town');
  };
```

Replace with:
```tsx
  const enterFloor = (floor: number) => {
    if (floor > run.currentFloor) return;
    const info = getFloorInfo(dungeon.id, floor);
    setCurrentFloor(floor);
    encounterMonster(info.monsterLevel);
    const newBP = useGameStore.getState().run.bp;
    if (isRunOver(newBP)) {
      endRun();
      return;
    }
    setScreen('battle');
  };

  const enterDeep = () => {
    const deepest = Math.max(31, meta.dungeonProgress[dungeon.id]?.maxFloor ?? 0);
    const info = getFloorInfo(dungeon.id, deepest);
    setCurrentFloor(deepest);
    encounterMonster(info.monsterLevel);
    const newBP = useGameStore.getState().run.bp;
    if (isRunOver(newBP)) {
      endRun();
      return;
    }
    setScreen('battle');
  };

  const backToTown = () => {
    selectDungeon(null);
    setScreen('town');
  };
```

(Adds `enterDeep` between `enterFloor` and `backToTown`. Note: `dungeon` is in scope because of the early `if (!dungeon) return ...` guard above this block.)

Then find the closing of the floor-card grid container:
```tsx
              <div style={{ fontSize: 10, opacity: 0.85 }}>
                Lv {formatNumber(info.monsterLevel)}
              </div>
            </button>
          );
        })}
      </div>
    </ForgeScreen>
  );
}
```

Replace with:
```tsx
              <div style={{ fontSize: 10, opacity: 0.85 }}>
                Lv {formatNumber(info.monsterLevel)}
              </div>
            </button>
          );
        })}
      </div>
      {meta.dungeonFinalsCleared.includes(dungeon.id) && (() => {
        const deepest = Math.max(31, meta.dungeonProgress[dungeon.id]?.maxFloor ?? 0);
        const deepInfo = getFloorInfo(dungeon.id, deepest);
        return (
          <ForgePanel
            data-testid="dungeon-deep-panel"
            style={{ margin: 'var(--forge-space-4) var(--forge-space-2)' }}
          >
            <ForgeButton
              onClick={enterDeep}
              data-testid="dungeon-deep-enter"
              variant="primary"
              style={{ width: '100%' }}
            >
              🌌 심층 진입 (F{deepest})
            </ForgeButton>
            <div style={{ fontSize: 11, color: 'var(--forge-text-secondary)', marginTop: 6, textAlign: 'center' }}>
              Lv {formatNumber(deepInfo.monsterLevel)}
            </div>
          </ForgePanel>
        );
      })()}
    </ForgeScreen>
  );
}
```

(Inserts the conditional panel after the closing `</div>` of the floor-card grid, before the closing `</ForgeScreen>`. The IIFE pattern computes `deepest` and `deepInfo` once per render only when the panel is visible.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @forge/game-inflation-rpg test -- DungeonFloors.test`
Expected: All DungeonFloors tests PASS, including the three new 심층 panel cases.

If any existing test fails (e.g. the boss-card tests because the meta state inadvertently triggers the panel), recheck the beforeEach setup — the new describe block's `beforeEach` resets meta to `INITIAL_META` (no finals cleared) so the panel should be hidden by default.

- [ ] **Step 5: Run full task gate**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test`
Expected: typecheck 0, lint clean, vitest all PASS (231 + 3 new = 234).

- [ ] **Step 6: Commit**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && git add games/inflation-rpg/src/screens/DungeonFloors.tsx games/inflation-rpg/src/screens/DungeonFloors.test.tsx && git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): add 심층 진입 panel to DungeonFloors after first final clear

Once meta.dungeonFinalsCleared includes the current dungeon id, a
"🌌 심층 진입 (F{n})" panel appears below the 30-card grid. Clicking it
calls enterDeep() which jumps the run directly to the deepest unlocked
floor (max(31, dungeonProgress.maxFloor)) — bypassing the F1-F30 walk.

Panel hidden when dungeonFinalsCleared lacks the dungeon id. Three unit
tests cover hidden / visible / click-jump behavior.

Phase B-3β3 Task 2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Final Validation + Manual Smoke + Tag

**Files:** None modified (verification only).

**Why:** Confirm full toolchain green (typecheck + lint + test + build + circular + e2e) and walk through the procedural progression manually, since the BattleScene first-vs-subsequent split has no unit-test coverage (BattleScene relies on Phaser and is e2e-tested only).

- [ ] **Step 1: Full automated validation**

Run from repo root:
```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test && pnpm circular && pnpm --filter @forge/game-inflation-rpg build
```

Expected: All pass cleanly. typecheck 0, lint 0, vitest 234 PASS, no circular deps, `next build` ✓ Compiled successfully.

- [ ] **Step 2: E2E (chromium + iphone14)**

Run: `pnpm --filter @forge/game-inflation-rpg e2e`
Expected: 18/18 PASS (no new e2e cases added in this phase; we rely on existing dungeon-flow.spec coverage of the named-floor portion).

- [ ] **Step 3: Manual smoke — set up dev server**

Run: `pnpm dev`
Open browser to the inflation-rpg game URL (typically `http://localhost:3000/games/inflation-rpg` via the portal).

Clear any existing save: in devtools, run `localStorage.removeItem('korea_inflation_rpg_save')`. Reload.

- [ ] **Step 4: Manual smoke — pre-conquest behavior**

1. MainMenu → 마을로 → Town shows three dungeon cards (plains, forest, mountains).
2. 평야 입장 → ClassSelect → 화랑 + 모험 시작 → DungeonFloors.
3. Verify the 심층 panel is HIDDEN (no `🌌 심층 진입` button visible).
4. Click `floor-card-1`. Battle scene loads. (You can leave it running — the auto-battle will progress through floors. To speed up, in devtools run `useGameStore.setState((s) => ({ run: { ...s.run, currentFloor: 30, bp: 100 }, meta: { ...s.meta, dungeonProgress: { ...s.meta.dungeonProgress, plains: { maxFloor: 30 } } } }))` and click `floor-card-30` directly.)

- [ ] **Step 5: Manual smoke — first F30 clear**

5. Reach floor 30 and defeat the final boss.
6. Confirm the "정복 완료" modal appears with the dungeon name.
7. Close the modal. Screen should be `town`. The dungeon-selection cards should be visible (currentDungeonId === null).
8. In devtools, verify: `useGameStore.getState().meta.dungeonFinalsCleared` includes `'plains'`. `useGameStore.getState().meta.dungeonProgress.plains.maxFloor === 31`.

- [ ] **Step 6: Manual smoke — post-conquest 심층 entry**

9. From Town, 평야 입장 again → ClassSelect → 화랑 + 모험 시작 → DungeonFloors.
10. The 심층 panel should now be VISIBLE with label `🌌 심층 진입 (F31)` and `Lv 184` (per spec §11.2 anchor table).
11. Click the panel button. Battle scene loads at F31 (a non-boss floor — `getBossType(31) === null`).
12. Defeat the F31 monster. After battle, screen should return to `dungeon-floors`. `useGameStore.getState().run.currentFloor === 32`. The 심층 panel should now show `F32` (because `dungeonProgress.plains.maxFloor === 32`).

- [ ] **Step 7: Manual smoke — F35 sub-boss + procedural advancement**

13. To save manual time, in devtools: `useGameStore.setState((s) => ({ run: { ...s.run, currentFloor: 34 }, meta: { ...s.meta, dungeonProgress: { ...s.meta.dungeonProgress, plains: { maxFloor: 34 } } } }))`. The 심층 panel should show `F34`.
14. Click 심층 진입. Battle at F34 (non-boss). Win.
15. After F34, currentFloor should be 35. Click 심층 진입ón again. Battle at F35 — this time a sub-boss (👹 prefix on the enemy name, per BattleScene `bossEmoji = bossType === 'final' ? '⭐' : '👹'`).
16. Win. F35 → F36. The progression continues forward without any modal/cap.

- [ ] **Step 8: Manual smoke — subsequent F30 clear (no modal)**

17. In devtools: `useGameStore.setState((s) => ({ run: { ...s.run, currentFloor: 30, bp: 100 }, meta: { ...s.meta } }))`.
18. From DungeonFloors, click `floor-card-30`. Battle at F30 final boss.
19. Win. The 정복 modal should NOT appear. The screen should be `dungeon-floors` (NOT `town`). `useGameStore.getState().run.currentDungeonId === 'plains'` (NOT null). `useGameStore.getState().run.currentFloor === 31`.

- [ ] **Step 9: Manual smoke — death and restart**

20. To verify death path is intact, set BP very low: `useGameStore.setState((s) => ({ run: { ...s.run, bp: 1 } }))`.
21. Click 심층 진입 → fight. The encounterMonster cost will likely take BP to 0 → endRun fires → game-over screen → MainMenu.
22. Confirm no console errors during this transition.

- [ ] **Step 10: Skip if smoke fails**

If any smoke step exposes a regression, return to the relevant Task and iterate. The implementer adds tests for the regression where possible, then re-runs the gate before re-running the smoke.

- [ ] **Step 11: Tag**

Run: `cd /Users/joel/Desktop/git/2d-game-forge && git tag phase-b3b3-complete && git tag --list | grep b3b`
Expected: shows `phase-b3b1-complete`, `phase-b3b2-complete`, `phase-b3b3-complete`.

- [ ] **Step 12: Report branch ready for merge**

Tell the user:
- Branch `feat/phase-b3b3-procedural-floors` ready.
- Tag `phase-b3b3-complete` created.
- All gates green.
- Manual smoke 9 steps passed (or note any deferred verification).

User merges via `--no-ff` per CLAUDE.md convention. Pushing happens after user confirmation.

---

## Self-Review Checklist (run before handoff)

Auto-completed by author at write time:

- **Spec coverage:**
  - §4.1 BattleScene final 분기 split + cap 제거 → Task 1 Step 2 (verbatim diff).
  - §4.2 DungeonFloors 심층 진입 panel → Task 2 Step 3.
  - §4.3 신규 3 unit test → Task 2 Step 1 (Quests pattern matched: hidden / visible / click-jump).
  - §4.4 e2e 신규 케이스 → SKIPPED (spec marked it conditional on `__forgeStore` test hook; we don't have that hook wired up). Manual smoke Step 6-9 covers the same flows.
  - §5 검증 게이트 → Task 1/2/3 each end with the prescribed gate. Task 3 adds build + e2e.
  - §5 수동 smoke 7 step → Task 3 Step 4-9 (expanded to 9 finer-grained sub-steps for clarity).
  - §6 분해 3 task → mirrored 1:1.
- **Placeholders:** None. Every step has exact paths, exact code, exact commands.
- **Type consistency:**
  - `meta.dungeonFinalsCleared.includes(dungeonId)` used in Task 1 (BattleScene) and Task 2 (DungeonFloors panel render gate). Both reference the same `MetaState` field. ✅
  - `meta.dungeonProgress[id]?.maxFloor ?? 0` used in Task 2's `enterDeep` and panel render. Same shape, optional-chained. ✅
  - `markDungeonProgress(dungeonId, 31)` (first-clear) and `markDungeonProgress(dungeonId, finishedFloor + 1)` (advancement) — both call the existing store action with `(string, number)`. ✅
  - `getFloorInfo(dungeonId, floor)` already imported in DungeonFloors.tsx (line 4). Reused for `enterDeep` and panel monster-level display. ✅
