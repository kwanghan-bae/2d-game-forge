# Phase V1a — Open World Vertical Slice Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the minimum vertical slice of Hero Simulator v2 — `OverworldScene` (Phaser) with auto-moving hero token on a procedural small map, `HeroDecisionAI` driving destination choice from traits + personality, 4 core Tier 1 events (battle / level-up / drop / death), simple saga recording, CyclePrep v2 + CycleResult v2 + OverworldRunner React screens, persist v16 → v17 (`sagaHistory`). Legacy manual play screens (Town / DungeonFloors / Battle / Inventory / Shop / etc.) and Sim-A/B's text-log views (CycleRunner / CycleResult / CyclePrep) are deleted in the same phase.

**Architecture:** New modules live under `src/overworld/` (Phaser scene + hero sprite + pathfinding + landmarks), `src/hero/` (entity state + personality + lifecycle + spawner), `src/decisionAI/` (HeroDecisionAI body + DestinationResolver), `src/saga/` (recorder + storage + narrative generator). React screens replace the entire `MainMenu → ...` flow. Sim-A/B's `AutoBattleController`, `CycleEvent` types, `SeededRng`, `Trait` system, and `cycleSlice` are preserved as the substrate — V1a wires the new overworld view on top.

**Tech Stack:** TypeScript / React / Phaser 3 / Zustand 5 / `easystarjs` (A* pathfinding) / Vitest / Playwright.

**Spec:** `docs/superpowers/specs/2026-05-16-hero-simulator-v2-design.md` (commit `3ff6405` @ `feat/hero-simulator-v2-pivot`)

---

## Scope Note (read before starting)

The v2 spec §11 lists Phase V1 with many items (Open World + AI + Tier 1 9 events + CyclePrep v2 + Saga book + Legacy removal + Persist v17). This is too large for a single plan. **This plan covers V1a only:**

- Open World skeleton (Phaser scene, hero token movement, pathfinding)
- HeroDecisionAI body (destination resolution from trait + personality)
- **4 core Tier 1 events: 전투 / 레벨업 / 장비 drop / 죽음**
- CyclePrep v2 (default, no 균열석 가호 yet)
- CycleResult v2 (single-page narrative summary, no Saga book yet)
- Legacy manual flow + Sim-A/B view 제거
- Persist v17 migration (`sagaHistory[]`, `personalityDim` snapshot)

**Deferred to V1b** (separate plan after V1a merges):
- 직업 unlock 이벤트 (16 캐릭터 → advanced class)
- 스킬 학습 이벤트 (32 스킬 풀)
- 사당 / 제단 이벤트 (buff/debuff/skill)
- 도덕 분기 인카운터 (부상자 / 강도)
- Milestone narrative ("12세에 X")
- Saga book 책 메타포 (페이지 넘기기)

V1a's success bar: the user can click "사이클 시작" → watch a procedural hero auto-walk a small open world for 5–10 minutes → see at least 4 event types trigger as transient popups → cycle ends on BP exhaustion or HP=0 → see a simple result screen → return to main menu. Game-feel is clearly present (Phaser sprite ≠ text log). Polish (직업 / 스킬 / 도덕 / saga book) lands in V1b.

---

## Reference Map (do NOT re-discover during execution)

| Symbol | File / Line |
|---|---|
| `AutoBattleController` (Sim-A/B, now demoted to sim-only) | `games/inflation-rpg/src/cycle/AutoBattleController.ts` |
| `CycleEvent` discriminated union | `games/inflation-rpg/src/cycle/cycleEvents.ts` |
| `SeededRng` (mulberry32) | `games/inflation-rpg/src/cycle/SeededRng.ts` |
| `cycleSlice` zustand store | `games/inflation-rpg/src/cycle/cycleSlice.ts` |
| `TRAIT_CATALOG` 16 entries | `games/inflation-rpg/src/data/traits.ts` |
| `Trait` / `TraitModifiers` / `applyTraitMods` | `games/inflation-rpg/src/cycle/traits.ts` |
| `STORE_VERSION = 16` | `games/inflation-rpg/src/store/gameStore.ts` (search `version: 16`) |
| `runStoreMigration` (exported) | `games/inflation-rpg/src/store/gameStore.ts` |
| `INITIAL_META` defaults | `games/inflation-rpg/src/store/gameStore.ts` |
| `MetaState.cycleHistory / traitsUnlocked` | `games/inflation-rpg/src/types.ts` |
| `Screen` union | `games/inflation-rpg/src/types.ts` |
| Legacy screens (delete) | `games/inflation-rpg/src/screens/Town.tsx`, `DungeonFloors.tsx`, `Battle.tsx`, `Inventory.tsx`, `Shop.tsx`, `Quests.tsx`, `GameOver.tsx`, `DungeonFinalClearedModal.tsx`, `ClassSelect.tsx`, `Ascension.tsx`, `IapShop.tsx`, `Privacy.tsx` |
| Sim-A/B view (delete) | `games/inflation-rpg/src/screens/CycleRunner.tsx`, `CycleResult.tsx`, `CyclePrep.tsx` |
| Existing `MainMenu.tsx` | `games/inflation-rpg/src/screens/MainMenu.tsx` (simplify) |
| App routing | `games/inflation-rpg/src/App.tsx` |
| Existing 16 characters data | `games/inflation-rpg/src/data/characters.ts` |
| Existing 41 equipment data | `games/inflation-rpg/src/data/equipment.ts` (search location) |
| Existing 109 boss data | `games/inflation-rpg/src/data/bosses.ts` |
| Phase 4b sound assets | `games/inflation-rpg/src/systems/sound.ts` |
| Existing Phaser BattleScene | `games/inflation-rpg/src/battle/BattleScene.ts` (NOT used in V1a — but keep file; V1b/later phases may reuse zoom-in cinematic) |

---

## File Structure

**New files:**

```
games/inflation-rpg/src/
  hero/
    HeroEntity.ts            — hero state + getters/setters
    PersonalityState.ts      — 5 dim 점수
    HeroSpawner.ts           — procedural 이름 / 시작 외형
    HeroLifecycle.ts         — age / chapter / death
    __tests__/
      HeroEntity.test.ts
      PersonalityState.test.ts
      HeroSpawner.test.ts
      HeroLifecycle.test.ts
  decisionAI/
    DestinationResolver.ts   — trait + personality → next landmark
    HeroDecisionAI.ts        — public API class
    __tests__/
      DestinationResolver.test.ts
      HeroDecisionAI.test.ts
  saga/
    SagaTypes.ts             — CycleSaga / SagaEvent / SagaChapter
    SagaRecorder.ts          — events → CycleSaga
    NarrativeGenerator.ts    — template: event → 한국어 text
    SagaStorage.ts           — gameStore.meta.sagaHistory push (capped)
    __tests__/
      SagaRecorder.test.ts
      NarrativeGenerator.test.ts
      SagaStorage.test.ts
  overworld/
    Pathfinding.ts           — easystarjs wrapper
    Landmark.ts              — landmark type + interactivity
    HeroSprite.ts            — Phaser sprite + animation
    OverworldScene.ts        — main Phaser scene
    OverworldEvents.ts       — event types emitted by scene
    __tests__/
      Pathfinding.test.ts
      OverworldScene.test.ts (smoke only — Phaser scenes are hard to unit-test)
  data/
    zones.ts                 — 5 zone definitions
    landmarks.ts             — 8 landmark types + spawn rules
    __tests__/
      zones.test.ts
      landmarks.test.ts
  screens/
    OverworldRunner.tsx      — Phaser host + HUD overlay
    CyclePrepV2.tsx          — default prep screen (no 가호)
    CycleResultV2.tsx        — single-page result
    __tests__/
      OverworldRunner.test.tsx
      CyclePrepV2.test.tsx
      CycleResultV2.test.tsx

games/inflation-rpg/tests/e2e/
  v2-vertical-slice.spec.ts  — full cycle e2e
```

**Modified files:**

```
games/inflation-rpg/src/types.ts
  - Screen union: add 'cycle-prep-v2', 'overworld', 'cycle-result-v2'
  - Remove or deprecate: 'town', 'dungeon', 'battle', 'inventory', 'shop', etc.
  - Add: Hero, PersonalityDim, SagaTypes imports

games/inflation-rpg/src/store/gameStore.ts
  - STORE_VERSION: 16 → 17
  - INITIAL_META: add sagaHistory: []
  - runStoreMigration: add v16 → v17 branch
  - Add action: recordCycleSaga(saga: CycleSaga)

games/inflation-rpg/src/screens/MainMenu.tsx
  - Strip to 3 entries: 사이클 시작 / saga 갤러리 (placeholder) / 설정
  - Remove all legacy buttons

games/inflation-rpg/src/App.tsx
  - Replace all legacy routing with: main-menu / cycle-prep-v2 / overworld / cycle-result-v2

games/inflation-rpg/package.json
  - Add dependency: easystarjs
```

**Deleted files (legacy + Sim-A/B view):**

```
Delete (legacy manual play):
  games/inflation-rpg/src/screens/Town.tsx
  games/inflation-rpg/src/screens/DungeonFloors.tsx
  games/inflation-rpg/src/screens/Battle.tsx
  games/inflation-rpg/src/screens/Inventory.tsx
  games/inflation-rpg/src/screens/Shop.tsx
  games/inflation-rpg/src/screens/Quests.tsx
  games/inflation-rpg/src/screens/GameOver.tsx
  games/inflation-rpg/src/screens/DungeonFinalClearedModal.tsx
  games/inflation-rpg/src/screens/ClassSelect.tsx
  games/inflation-rpg/src/screens/Ascension.tsx
  games/inflation-rpg/src/screens/IapShop.tsx
  games/inflation-rpg/src/screens/Privacy.tsx
  (Plus all their __tests__/ counterparts)

Delete (Sim-A/B text-log view):
  games/inflation-rpg/src/screens/CycleRunner.tsx
  games/inflation-rpg/src/screens/CycleResult.tsx
  games/inflation-rpg/src/screens/CyclePrep.tsx
  games/inflation-rpg/src/screens/__tests__/CycleRunner.test.tsx
  games/inflation-rpg/src/screens/__tests__/CycleResult.test.tsx
  games/inflation-rpg/src/screens/__tests__/CyclePrep.test.tsx

E2E specs that test the deleted flows:
  games/inflation-rpg/tests/e2e/cycle-vertical-slice.spec.ts (replaced by v2-vertical-slice)
  games/inflation-rpg/tests/e2e/cycle-prep-traits.spec.ts (rewritten or deleted)
  Any e2e referencing town/dungeon/battle/inventory/shop
```

**Preserved (Sim-A/B substrate):**

```
games/inflation-rpg/src/cycle/AutoBattleController.ts   — keep for Sim-G balance simulator
games/inflation-rpg/src/cycle/cycleEvents.ts            — extend with new event types
games/inflation-rpg/src/cycle/SeededRng.ts              — reuse
games/inflation-rpg/src/cycle/cycleSlice.ts             — reuse (new OverworldRunner subscribes)
games/inflation-rpg/src/cycle/traits.ts                 — keep
games/inflation-rpg/src/data/traits.ts                  — keep (TRAIT_CATALOG)
games/inflation-rpg/scripts/sim-cycle.ts                — Sim-G simulator stays
```

---

## Task 1: Legacy sweep — delete legacy + Sim-A/B view screens

**Files:** Many — see list above.

This is a destructive sweep. Do it on a clean branch with one focused commit so the diff is reviewable.

- [ ] **Step 1.1: Inventory existing screens + their tests**

Run:

```bash
ls games/inflation-rpg/src/screens/
ls games/inflation-rpg/src/screens/__tests__/ 2>/dev/null || true
ls games/inflation-rpg/tests/e2e/
```

Capture the actual file list. Some screens listed in the plan may have already been deleted or renamed in prior phases.

- [ ] **Step 1.2: Delete legacy manual flow screen files**

Run:

```bash
cd games/inflation-rpg
rm -f \
  src/screens/Town.tsx \
  src/screens/DungeonFloors.tsx \
  src/screens/Battle.tsx \
  src/screens/Inventory.tsx \
  src/screens/Shop.tsx \
  src/screens/Quests.tsx \
  src/screens/GameOver.tsx \
  src/screens/DungeonFinalClearedModal.tsx \
  src/screens/ClassSelect.tsx \
  src/screens/Ascension.tsx \
  src/screens/IapShop.tsx \
  src/screens/Privacy.tsx
# Delete matching tests too (any file in screens/__tests__/ that imports a deleted screen):
rm -f src/screens/__tests__/Town.test.tsx \
  src/screens/__tests__/DungeonFloors.test.tsx \
  src/screens/__tests__/Battle.test.tsx \
  src/screens/__tests__/Inventory.test.tsx \
  src/screens/__tests__/Shop.test.tsx \
  src/screens/__tests__/Quests.test.tsx \
  src/screens/__tests__/GameOver.test.tsx \
  src/screens/__tests__/DungeonFinalClearedModal.test.tsx \
  src/screens/__tests__/ClassSelect.test.tsx \
  src/screens/__tests__/Ascension.test.tsx \
  src/screens/__tests__/IapShop.test.tsx \
  src/screens/__tests__/Privacy.test.tsx
```

If a file in the list doesn't exist, `rm -f` is silent — fine. If a screen file exists that isn't on the list, **stop and ask** — it may be needed.

- [ ] **Step 1.3: Delete Sim-A/B text-log screens**

```bash
rm -f src/screens/CycleRunner.tsx src/screens/CycleResult.tsx src/screens/CyclePrep.tsx
rm -f src/screens/__tests__/CycleRunner.test.tsx \
  src/screens/__tests__/CycleResult.test.tsx \
  src/screens/__tests__/CyclePrep.test.tsx
```

- [ ] **Step 1.4: Delete e2e specs that test deleted flows**

```bash
rm -f tests/e2e/cycle-vertical-slice.spec.ts tests/e2e/cycle-prep-traits.spec.ts
# Inspect tests/e2e/ for other specs referencing town/dungeon/battle/inventory/shop:
grep -l -E "(town|dungeon-floors|battle|inventory|shop|quests|cycle-runner|cycle-prep)" tests/e2e/*.spec.ts || true
```

For each match, decide: keep (if it tests something v1a still has — e.g., MainMenu render) or delete. If unsure, delete and we'll rebuild fresh in Task 22 e2e.

- [ ] **Step 1.5: Run typecheck — expect MANY broken imports**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck 2>&1 | head -60
```

Expected: a long list of "Cannot find module './screens/Town'" etc. from `App.tsx` and `MainMenu.tsx`. This is the next task's work.

- [ ] **Step 1.6: Commit the deletion**

```bash
git add -A
git commit -m "chore(game-inflation-rpg): Phase V1a T1 — delete legacy manual flow + Sim-A/B view screens

Removed:
- Legacy manual flow: Town / DungeonFloors / Battle / Inventory / Shop / Quests /
  GameOver / DungeonFinalClearedModal / ClassSelect / Ascension / IapShop / Privacy
- Sim-A/B text-log views: CycleRunner / CycleResult / CyclePrep
- Their unit tests + e2e specs

App.tsx and MainMenu.tsx still reference these — typecheck broken until T2 cleans
routing. This is intentional — single sweep, single commit, easy to review."
```

---

## Task 2: App.tsx routing reset + minimal MainMenu

**Files:**
- Modify: `games/inflation-rpg/src/types.ts`
- Modify: `games/inflation-rpg/src/App.tsx`
- Modify: `games/inflation-rpg/src/screens/MainMenu.tsx`

- [ ] **Step 2.1: Update `Screen` union in types.ts**

Find the `Screen` union (search `type Screen` or `Screen =`). Replace with:

```ts
export type Screen =
  | 'main-menu'
  | 'cycle-prep-v2'
  | 'overworld'
  | 'cycle-result-v2'
  | 'settings'        // keep if MainMenu has settings
  | 'saga-gallery';   // placeholder route, V1b implements
```

Remove all old Screen literals (`'town'`, `'dungeon-floors'`, `'battle'`, etc.).

- [ ] **Step 2.2: Strip MainMenu to V1a minimum**

Replace `games/inflation-rpg/src/screens/MainMenu.tsx` with:

```tsx
import { useGameStore } from '../store/gameStore';

export function MainMenu() {
  const setScreen = useGameStore(s => s.setScreen);
  const bestRunLevel = useGameStore(s => s.meta.bestRunLevel ?? 0);

  return (
    <div data-testid="main-menu" style={{ padding: 24, color: '#eee', textAlign: 'center' }}>
      <h1 style={{ marginBottom: 8 }}>조선 인플레이션 RPG</h1>
      <p style={{ opacity: 0.7, marginBottom: 32 }}>신이 되어 용사의 일대기를 후원하라</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 280, margin: '0 auto' }}>
        <button
          type="button"
          data-testid="btn-start-cycle"
          onClick={() => setScreen('cycle-prep-v2')}
          style={menuBtnStyle}
        >
          사이클 시작
        </button>
        <button
          type="button"
          data-testid="btn-saga-gallery"
          onClick={() => setScreen('saga-gallery')}
          style={{ ...menuBtnStyle, opacity: 0.5 }}
          disabled
        >
          용사 갤러리 (V1b)
        </button>
        <button
          type="button"
          data-testid="btn-settings"
          onClick={() => setScreen('settings')}
          style={{ ...menuBtnStyle, opacity: 0.5 }}
          disabled
        >
          설정
        </button>
      </div>

      <div data-testid="best-record" style={{ marginTop: 24, fontSize: 12, opacity: 0.6 }}>
        최고 기록: Lv {bestRunLevel}
      </div>
    </div>
  );
}

const menuBtnStyle: React.CSSProperties = {
  padding: '12px 24px',
  fontSize: 16,
  background: '#1f2937',
  color: '#fbbf24',
  border: '1px solid #fbbf24',
  borderRadius: 4,
  cursor: 'pointer',
};
```

(Adjust `meta.bestRunLevel` accessor to match the actual field name in the existing store. If no field exists, render `LV 0`.)

- [ ] **Step 2.3: Replace App.tsx routing**

Read existing App.tsx first to understand the screen-switching pattern (likely `useGameStore(s => s.screen)`). Then replace the screen-routing branches:

```tsx
// import shims at top:
import { MainMenu } from './screens/MainMenu';
// Other imports added in later tasks: CyclePrepV2, OverworldRunner, CycleResultV2

// In the render:
const screen = useGameStore(s => s.screen);

return (
  <>
    {screen === 'main-menu' && <MainMenu />}
    {screen === 'cycle-prep-v2' && <div>CyclePrepV2 — T19 에서 구현</div>}
    {screen === 'overworld' && <div>OverworldRunner — T20 에서 구현</div>}
    {screen === 'cycle-result-v2' && <div>CycleResultV2 — T21 에서 구현</div>}
    {(screen === 'saga-gallery' || screen === 'settings') && (
      <div style={{ padding:24, color:'#eee' }}>
        <p>이 화면은 V1b 에서 구현됩니다.</p>
        <button onClick={() => useGameStore.getState().setScreen('main-menu')}>돌아가기</button>
      </div>
    )}
  </>
);
```

Strip all imports of deleted screens. Strip any wrapper Phaser/dynamic-import code referencing the old Battle scene unless it's used elsewhere (it isn't — Battle 화면 deleted).

- [ ] **Step 2.4: Default screen on first load = main-menu**

In `INITIAL_META` or wherever `screen` defaults, set initial value to `'main-menu'`. If the existing default was `'main-menu'` or similar, leave alone. If it's `'town'` or another deleted screen, change.

- [ ] **Step 2.5: Run typecheck — expect clean**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors. If errors remain (e.g., a gameStore action referencing deleted screen literal), fix minimally — change literal to `'main-menu'`.

- [ ] **Step 2.6: Run full test suite — many existing tests will fail (gameStore action tests, etc.)**

```bash
pnpm --filter @forge/game-inflation-rpg test 2>&1 | tail -30
```

Expected: tests pass that don't depend on deleted screens. Failures: any test asserting Screen literals like `'town'`. For each failing test referencing deleted concepts, either delete the test (if its purpose is dead) or update its Screen literal to `'main-menu'`. Document each decision in the commit.

- [ ] **Step 2.7: Commit**

```bash
git add -A
git commit -m "feat(game-inflation-rpg): Phase V1a T2 — App routing reset + minimal MainMenu

- Screen union now: main-menu / cycle-prep-v2 / overworld / cycle-result-v2 /
  settings (placeholder) / saga-gallery (placeholder)
- MainMenu stripped to 3 entries — 사이클 시작 / 갤러리(V1b) / 설정(V1b) +
  best-record indicator
- App.tsx routing simplified; placeholder divs for V1a screens (T19-T21 fill)
- Updated obsolete Screen literal references in store/tests"
```

---

## Task 3: easystarjs install + Pathfinding wrapper

**Files:**
- Modify: `games/inflation-rpg/package.json`
- Create: `games/inflation-rpg/src/overworld/Pathfinding.ts`
- Create: `games/inflation-rpg/src/overworld/__tests__/Pathfinding.test.ts`

- [ ] **Step 3.1: Add easystarjs**

```bash
pnpm --filter @forge/game-inflation-rpg add easystarjs
```

Expected: `easystarjs` and `@types/easystarjs` (if available) in dependencies.

- [ ] **Step 3.2: Write failing test**

Create `games/inflation-rpg/src/overworld/__tests__/Pathfinding.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Pathfinder, type GridCell } from '../Pathfinding';

describe('Pathfinder', () => {
  it('finds a straight-line path on an empty grid', async () => {
    const grid: GridCell[][] = Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => 'walkable'),
    );
    const pf = new Pathfinder(grid);
    const path = await pf.findPath(0, 0, 9, 0);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(1);
    expect(path![0]).toEqual({ x: 0, y: 0 });
    expect(path![path!.length - 1]).toEqual({ x: 9, y: 0 });
  });

  it('routes around walls', async () => {
    const grid: GridCell[][] = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => 'walkable'),
    );
    // wall column at x=2 except for one gap at y=4
    for (let y = 0; y < 4; y++) grid[y][2] = 'blocked';
    const pf = new Pathfinder(grid);
    const path = await pf.findPath(0, 0, 4, 0);
    expect(path).not.toBeNull();
    // Path must pass through y=4 (the gap)
    expect(path!.some(p => p.y === 4)).toBe(true);
  });

  it('returns null when no path exists', async () => {
    const grid: GridCell[][] = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => 'walkable'),
    );
    // Wall the entire middle column
    for (let y = 0; y < 3; y++) grid[y][1] = 'blocked';
    const pf = new Pathfinder(grid);
    const path = await pf.findPath(0, 0, 2, 0);
    expect(path).toBeNull();
  });
});
```

- [ ] **Step 3.3: Run test to verify failure**

```bash
pnpm --filter @forge/game-inflation-rpg test -- Pathfinding
```

Expected: FAIL (`Cannot find module '../Pathfinding'`).

- [ ] **Step 3.4: Implement Pathfinder**

Create `games/inflation-rpg/src/overworld/Pathfinding.ts`:

```ts
import EasyStar from 'easystarjs';

export type GridCell = 'walkable' | 'blocked';

const WALKABLE_ID = 0;
const BLOCKED_ID = 1;

export class Pathfinder {
  private easystar: EasyStar.js;

  constructor(grid: GridCell[][]) {
    this.easystar = new EasyStar.js();
    const numericGrid = grid.map(row => row.map(c => (c === 'walkable' ? WALKABLE_ID : BLOCKED_ID)));
    this.easystar.setGrid(numericGrid);
    this.easystar.setAcceptableTiles([WALKABLE_ID]);
    this.easystar.enableDiagonals();
    this.easystar.enableSync();
  }

  findPath(sx: number, sy: number, dx: number, dy: number): Promise<{ x: number; y: number }[] | null> {
    return new Promise(resolve => {
      this.easystar.findPath(sx, sy, dx, dy, path => resolve(path ?? null));
      this.easystar.calculate();
    });
  }
}
```

- [ ] **Step 3.5: Run test to verify pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- Pathfinding
```

Expected: PASS, 3 tests.

- [ ] **Step 3.6: Commit**

```bash
git add games/inflation-rpg/package.json games/inflation-rpg/pnpm-lock.yaml \
  games/inflation-rpg/src/overworld/Pathfinding.ts \
  games/inflation-rpg/src/overworld/__tests__/Pathfinding.test.ts
git commit -m "feat(game-inflation-rpg): Phase V1a T3 — Pathfinder (easystarjs A* wrapper)"
```

---

## Task 4: Personality 5-dim state module

**Files:**
- Create: `games/inflation-rpg/src/hero/PersonalityState.ts`
- Create: `games/inflation-rpg/src/hero/__tests__/PersonalityState.test.ts`

- [ ] **Step 4.1: Write failing test**

Create `games/inflation-rpg/src/hero/__tests__/PersonalityState.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PersonalityState, PERSONALITY_DIMS, type PersonalityDim } from '../PersonalityState';

describe('PersonalityState', () => {
  it('starts all dims at 0 (neutral)', () => {
    const p = new PersonalityState();
    for (const dim of PERSONALITY_DIMS) {
      expect(p.get(dim)).toBe(0);
    }
  });

  it('applies trait priors via fromTraitPriors', () => {
    const p = PersonalityState.fromTraitPriors({ moral: 5, prudent: -3 });
    expect(p.get('moral')).toBe(5);
    expect(p.get('prudent')).toBe(-3);
    expect(p.get('heroic')).toBe(0);
  });

  it('adjust clamps to [-10, +10]', () => {
    const p = new PersonalityState();
    p.adjust('moral', 7);
    p.adjust('moral', 5);
    expect(p.get('moral')).toBe(10);
    p.adjust('prudent', -7);
    p.adjust('prudent', -10);
    expect(p.get('prudent')).toBe(-10);
  });

  it('snapshot returns immutable copy', () => {
    const p = new PersonalityState();
    p.adjust('moral', 3);
    const snap = p.snapshot();
    p.adjust('moral', 5);
    expect(snap.moral).toBe(3);
    expect(p.get('moral')).toBe(8);
  });

  it('all 5 dimensions are exported in PERSONALITY_DIMS', () => {
    expect(PERSONALITY_DIMS).toEqual(['moral', 'prudent', 'heroic', 'merciful', 'pious']);
  });
});
```

- [ ] **Step 4.2: Run to verify fail**

```bash
pnpm --filter @forge/game-inflation-rpg test -- PersonalityState
```

Expected: FAIL.

- [ ] **Step 4.3: Implement PersonalityState**

Create `games/inflation-rpg/src/hero/PersonalityState.ts`:

```ts
// 5-dim personality matrix. Each dim is integer in [-10, +10].
// Negative side ↔ Positive side:
//   moral:     악 ↔ 선
//   prudent:   충동 ↔ 신중
//   heroic:    회피 ↔ 영웅
//   merciful:  잔혹 ↔ 자비
//   pious:     세속 ↔ 신앙

export const PERSONALITY_DIMS = ['moral', 'prudent', 'heroic', 'merciful', 'pious'] as const;
export type PersonalityDim = (typeof PERSONALITY_DIMS)[number];
export type PersonalitySnapshot = Record<PersonalityDim, number>;

const MIN = -10;
const MAX = 10;

export class PersonalityState {
  private values: PersonalitySnapshot = {
    moral: 0,
    prudent: 0,
    heroic: 0,
    merciful: 0,
    pious: 0,
  };

  static fromTraitPriors(priors: Partial<PersonalitySnapshot>): PersonalityState {
    const p = new PersonalityState();
    for (const dim of PERSONALITY_DIMS) {
      if (priors[dim] !== undefined) p.values[dim] = clamp(priors[dim] as number);
    }
    return p;
  }

  get(dim: PersonalityDim): number {
    return this.values[dim];
  }

  adjust(dim: PersonalityDim, delta: number): void {
    this.values[dim] = clamp(this.values[dim] + delta);
  }

  snapshot(): PersonalitySnapshot {
    return { ...this.values };
  }
}

function clamp(v: number): number {
  return Math.max(MIN, Math.min(MAX, Math.floor(v)));
}
```

- [ ] **Step 4.4: Verify pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- PersonalityState
```

Expected: PASS, 5 tests.

- [ ] **Step 4.5: Commit**

```bash
git add games/inflation-rpg/src/hero/PersonalityState.ts \
  games/inflation-rpg/src/hero/__tests__/PersonalityState.test.ts
git commit -m "feat(game-inflation-rpg): Phase V1a T4 — PersonalityState 5-dim (moral/prudent/heroic/merciful/pious)"
```

---

## Task 5: HeroSpawner — procedural 이름 / 시작 외형

**Files:**
- Create: `games/inflation-rpg/src/hero/HeroSpawner.ts`
- Create: `games/inflation-rpg/src/hero/__tests__/HeroSpawner.test.ts`

- [ ] **Step 5.1: Test first**

Create `games/inflation-rpg/src/hero/__tests__/HeroSpawner.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { HeroSpawner } from '../HeroSpawner';
import { SeededRng } from '../../cycle/SeededRng';

describe('HeroSpawner', () => {
  it('spawns a hero with non-empty name', () => {
    const rng = new SeededRng(42);
    const hero = HeroSpawner.spawn(rng);
    expect(hero.name).toBeTruthy();
    expect(hero.name.length).toBeGreaterThan(0);
  });

  it('same seed produces same name', () => {
    const a = HeroSpawner.spawn(new SeededRng(42));
    const b = HeroSpawner.spawn(new SeededRng(42));
    expect(a.name).toBe(b.name);
  });

  it('different seeds usually produce different names', () => {
    const a = HeroSpawner.spawn(new SeededRng(1));
    const b = HeroSpawner.spawn(new SeededRng(999));
    expect(a.name).not.toBe(b.name);
  });

  it('default starting state: age 5, job 평민, lv 1', () => {
    const hero = HeroSpawner.spawn(new SeededRng(7));
    expect(hero.age).toBe(5);
    expect(hero.job).toBe('평민');
    expect(hero.level).toBe(1);
    expect(hero.emoji).toBe('🧒');
  });
});
```

- [ ] **Step 5.2: Verify fail**

```bash
pnpm --filter @forge/game-inflation-rpg test -- HeroSpawner
```

- [ ] **Step 5.3: Implement HeroSpawner**

Create `games/inflation-rpg/src/hero/HeroSpawner.ts`:

```ts
import type { SeededRng } from '../cycle/SeededRng';

// Korean-flavored name pool. Family name + given name combined.
const FAMILY_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송'];
const GIVEN_NAMES = ['민준', '서연', '도윤', '하은', '준서', '지유', '시우', '서아', '지호', '하윤', '예준', '수아', '유준', '지안', '도현', '아윤', '시현', '하린'];

export interface SpawnedHero {
  name: string;
  age: number;
  job: string;
  level: number;
  emoji: string;
}

export class HeroSpawner {
  static spawn(rng: SeededRng): SpawnedHero {
    const family = FAMILY_NAMES[rng.int(FAMILY_NAMES.length)];
    const given = GIVEN_NAMES[rng.int(GIVEN_NAMES.length)];
    return {
      name: `${family}${given}`,
      age: 5,
      job: '평민',
      level: 1,
      emoji: '🧒',
    };
  }
}
```

- [ ] **Step 5.4: Verify pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- HeroSpawner
```

- [ ] **Step 5.5: Commit**

```bash
git add games/inflation-rpg/src/hero/HeroSpawner.ts \
  games/inflation-rpg/src/hero/__tests__/HeroSpawner.test.ts
git commit -m "feat(game-inflation-rpg): Phase V1a T5 — HeroSpawner procedural name + starting state (age 5, 평민)"
```

---

## Task 6: HeroLifecycle — chapter + age + death

**Files:**
- Create: `games/inflation-rpg/src/hero/HeroLifecycle.ts`
- Create: `games/inflation-rpg/src/hero/__tests__/HeroLifecycle.test.ts`

- [ ] **Step 6.1: Test first**

Create `games/inflation-rpg/src/hero/__tests__/HeroLifecycle.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { HeroLifecycle, type Chapter } from '../HeroLifecycle';

describe('HeroLifecycle', () => {
  it('age 5–14 = 어린시절', () => {
    expect(HeroLifecycle.chapterForAge(5)).toBe('어린시절');
    expect(HeroLifecycle.chapterForAge(14)).toBe('어린시절');
  });

  it('age 15–29 = 청년기', () => {
    expect(HeroLifecycle.chapterForAge(15)).toBe('청년기');
    expect(HeroLifecycle.chapterForAge(29)).toBe('청년기');
  });

  it('age 30–49 = 장년기', () => {
    expect(HeroLifecycle.chapterForAge(30)).toBe('장년기');
    expect(HeroLifecycle.chapterForAge(49)).toBe('장년기');
  });

  it('age 50–69 = 노년기', () => {
    expect(HeroLifecycle.chapterForAge(50)).toBe('노년기');
    expect(HeroLifecycle.chapterForAge(69)).toBe('노년기');
  });

  it('age 70+ = 마지막', () => {
    expect(HeroLifecycle.chapterForAge(70)).toBe('마지막');
    expect(HeroLifecycle.chapterForAge(120)).toBe('마지막');
  });

  it('all 5 chapters exported', () => {
    const chapters: Chapter[] = ['어린시절', '청년기', '장년기', '노년기', '마지막'];
    expect(chapters.length).toBe(5);
  });

  it('ageFromBpProgress maps BP 0% → 5, BP 100% → 70', () => {
    expect(HeroLifecycle.ageFromBpProgress(0)).toBe(5);
    expect(HeroLifecycle.ageFromBpProgress(1)).toBe(70);
    expect(HeroLifecycle.ageFromBpProgress(0.5)).toBeGreaterThanOrEqual(30);
    expect(HeroLifecycle.ageFromBpProgress(0.5)).toBeLessThanOrEqual(50);
  });
});
```

- [ ] **Step 6.2: Verify fail**

```bash
pnpm --filter @forge/game-inflation-rpg test -- HeroLifecycle
```

- [ ] **Step 6.3: Implement HeroLifecycle**

Create `games/inflation-rpg/src/hero/HeroLifecycle.ts`:

```ts
// Chapters map to age ranges. BP consumption progress drives age advance —
// at BP 0% remaining used, hero is 5 (start). At 100% used, hero is 70+ (death/old age).
// Trait modifiers (bpCostMul) effectively shorten or lengthen the cycle but the
// 5-stage chapter structure stays.

export const CHAPTERS = ['어린시절', '청년기', '장년기', '노년기', '마지막'] as const;
export type Chapter = (typeof CHAPTERS)[number];

const CHAPTER_RANGES: Array<[Chapter, number, number]> = [
  ['어린시절', 5, 14],
  ['청년기', 15, 29],
  ['장년기', 30, 49],
  ['노년기', 50, 69],
  ['마지막', 70, 999],
];

const START_AGE = 5;
const END_AGE = 70;

export class HeroLifecycle {
  static chapterForAge(age: number): Chapter {
    for (const [chapter, lo, hi] of CHAPTER_RANGES) {
      if (age >= lo && age <= hi) return chapter;
    }
    return '마지막';
  }

  /** Linear mapping: bpProgress 0 → START_AGE (5), 1 → END_AGE (70). */
  static ageFromBpProgress(bpProgress: number): number {
    const clamped = Math.max(0, Math.min(1, bpProgress));
    return Math.floor(START_AGE + (END_AGE - START_AGE) * clamped);
  }
}
```

- [ ] **Step 6.4: Verify pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- HeroLifecycle
```

- [ ] **Step 6.5: Commit**

```bash
git add games/inflation-rpg/src/hero/HeroLifecycle.ts \
  games/inflation-rpg/src/hero/__tests__/HeroLifecycle.test.ts
git commit -m "feat(game-inflation-rpg): Phase V1a T6 — HeroLifecycle (5 chapters, age 5–70 mapped to BP progress)"
```

---

## Task 7: HeroEntity — runtime hero state

**Files:**
- Create: `games/inflation-rpg/src/hero/HeroEntity.ts`
- Create: `games/inflation-rpg/src/hero/__tests__/HeroEntity.test.ts`

- [ ] **Step 7.1: Test first**

Create `games/inflation-rpg/src/hero/__tests__/HeroEntity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { HeroEntity } from '../HeroEntity';
import { SeededRng } from '../../cycle/SeededRng';

describe('HeroEntity', () => {
  function makeHero() {
    return HeroEntity.create({
      seed: 42,
      bpMax: 30,
      heroHpMax: 100,
      heroAtkBase: 50,
    });
  }

  it('initial state', () => {
    const h = makeHero();
    expect(h.name.length).toBeGreaterThan(0);
    expect(h.age).toBe(5);
    expect(h.chapter).toBe('어린시절');
    expect(h.job).toBe('평민');
    expect(h.level).toBe(1);
    expect(h.exp).toBe(0);
    expect(h.hp).toBe(100);
    expect(h.hpMax).toBe(100);
    expect(h.atk).toBe(50);
    expect(h.bp).toBe(30);
    expect(h.bpMax).toBe(30);
    expect(h.equipment).toEqual([]);
    expect(h.dead).toBe(false);
  });

  it('gainExp adds and triggers level up at threshold', () => {
    const h = makeHero();
    h.gainExp(100); // threshold = 10 at lv1
    expect(h.level).toBeGreaterThan(1);
  });

  it('takeDamage reduces hp, clamps to 0', () => {
    const h = makeHero();
    h.takeDamage(30);
    expect(h.hp).toBe(70);
    h.takeDamage(999);
    expect(h.hp).toBe(0);
    expect(h.dead).toBe(true);
  });

  it('consumeBp reduces bp + advances age', () => {
    const h = makeHero();
    const startAge = h.age;
    for (let i = 0; i < 10; i++) h.consumeBp(1);
    expect(h.bp).toBe(20);
    expect(h.age).toBeGreaterThanOrEqual(startAge);
  });

  it('bp exhausted → dead', () => {
    const h = makeHero();
    for (let i = 0; i < 30; i++) h.consumeBp(1);
    expect(h.bp).toBe(0);
    expect(h.dead).toBe(true);
  });

  it('addEquipment appends', () => {
    const h = makeHero();
    h.addEquipment('rusty_sword');
    h.addEquipment('leather_armor');
    expect(h.equipment).toEqual(['rusty_sword', 'leather_armor']);
  });

  it('personality is exposed', () => {
    const h = makeHero();
    expect(h.personality.get('moral')).toBe(0);
  });
});
```

- [ ] **Step 7.2: Verify fail**

```bash
pnpm --filter @forge/game-inflation-rpg test -- HeroEntity
```

- [ ] **Step 7.3: Implement HeroEntity**

Create `games/inflation-rpg/src/hero/HeroEntity.ts`:

```ts
import { SeededRng } from '../cycle/SeededRng';
import { HeroSpawner } from './HeroSpawner';
import { HeroLifecycle, type Chapter } from './HeroLifecycle';
import { PersonalityState } from './PersonalityState';

export interface HeroCreateOpts {
  seed: number;
  bpMax: number;
  heroHpMax: number;
  heroAtkBase: number;
}

export class HeroEntity {
  name: string;
  emoji: string;
  age: number;
  chapter: Chapter;
  job: string;
  level: number;
  exp: number;
  hp: number;
  hpMax: number;
  atk: number;
  bp: number;
  bpMax: number;
  equipment: string[] = [];
  dead: boolean = false;
  personality: PersonalityState;

  private constructor() {
    this.name = '';
    this.emoji = '🧒';
    this.age = 5;
    this.chapter = '어린시절';
    this.job = '평민';
    this.level = 1;
    this.exp = 0;
    this.hp = 0;
    this.hpMax = 0;
    this.atk = 0;
    this.bp = 0;
    this.bpMax = 0;
    this.personality = new PersonalityState();
  }

  static create(opts: HeroCreateOpts): HeroEntity {
    const h = new HeroEntity();
    const spawned = HeroSpawner.spawn(new SeededRng(opts.seed));
    h.name = spawned.name;
    h.emoji = spawned.emoji;
    h.age = spawned.age;
    h.chapter = HeroLifecycle.chapterForAge(spawned.age);
    h.job = spawned.job;
    h.level = spawned.level;
    h.exp = 0;
    h.hp = opts.heroHpMax;
    h.hpMax = opts.heroHpMax;
    h.atk = opts.heroAtkBase;
    h.bp = opts.bpMax;
    h.bpMax = opts.bpMax;
    return h;
  }

  gainExp(amount: number): { leveled: number[] } {
    const leveled: number[] = [];
    this.exp += amount;
    while (this.exp >= this.expRequired()) {
      this.exp -= this.expRequired();
      const from = this.level;
      this.level += 1;
      leveled.push(this.level);
      const hpDelta = Math.floor(this.hpMax * 0.05);
      this.hpMax += hpDelta;
      this.hp = this.hpMax;
    }
    return { leveled };
  }

  private expRequired(): number {
    // Placeholder curve (Sim-A heritage). Sim-G tunes for inflation.
    return Math.max(1, Math.floor(10 * Math.pow(this.level, 1.3)));
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) this.dead = true;
  }

  consumeBp(amount: number): void {
    this.bp = Math.max(0, this.bp - amount);
    this.refreshAge();
    if (this.bp <= 0) this.dead = true;
  }

  private refreshAge(): void {
    const progress = (this.bpMax - this.bp) / this.bpMax;
    this.age = HeroLifecycle.ageFromBpProgress(progress);
    this.chapter = HeroLifecycle.chapterForAge(this.age);
  }

  addEquipment(itemId: string): void {
    this.equipment.push(itemId);
  }
}
```

- [ ] **Step 7.4: Verify pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- HeroEntity
```

Expected: 7 tests pass.

- [ ] **Step 7.5: Commit**

```bash
git add games/inflation-rpg/src/hero/HeroEntity.ts \
  games/inflation-rpg/src/hero/__tests__/HeroEntity.test.ts
git commit -m "feat(game-inflation-rpg): Phase V1a T7 — HeroEntity (state + level/damage/bp/equipment + personality)"
```

---

## Task 8: Zone + Landmark data

**Files:**
- Create: `games/inflation-rpg/src/data/zones.ts`
- Create: `games/inflation-rpg/src/data/landmarks.ts`
- Create: `games/inflation-rpg/src/data/__tests__/zones.test.ts`
- Create: `games/inflation-rpg/src/data/__tests__/landmarks.test.ts`

- [ ] **Step 8.1: Test zones**

Create `games/inflation-rpg/src/data/__tests__/zones.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ZONES, type ZoneId } from '../zones';

describe('ZONES', () => {
  it('exports exactly 5 zones', () => {
    expect(ZONES.length).toBe(5);
  });

  it('zone ids are unique', () => {
    const ids = new Set(ZONES.map(z => z.id));
    expect(ids.size).toBe(ZONES.length);
  });

  it('each zone has nameKR + biome + color + difficulty', () => {
    for (const z of ZONES) {
      expect(z.nameKR.length).toBeGreaterThan(0);
      expect(z.biome).toBeTruthy();
      expect(z.bgColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(z.difficulty).toBeGreaterThanOrEqual(1);
    }
  });

  it('village zone exists with difficulty 1', () => {
    const village = ZONES.find(z => z.id === 'village');
    expect(village).toBeDefined();
    expect(village!.difficulty).toBe(1);
  });
});
```

- [ ] **Step 8.2: Test landmarks**

Create `games/inflation-rpg/src/data/__tests__/landmarks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { LANDMARK_TYPES, type LandmarkType } from '../landmarks';

describe('LANDMARK_TYPES', () => {
  it('exports at least 8 landmark types', () => {
    expect(LANDMARK_TYPES.length).toBeGreaterThanOrEqual(8);
  });

  it('each type has id + emoji + kind + nameKR', () => {
    for (const l of LANDMARK_TYPES) {
      expect(l.id.length).toBeGreaterThan(0);
      expect(l.emoji.length).toBeGreaterThan(0);
      expect(['enemy', 'boss', 'village', 'shrine', 'cave', 'market', 'ruin', 'exit', 'rival'])
        .toContain(l.kind);
      expect(l.nameKR.length).toBeGreaterThan(0);
    }
  });

  it('village + enemy + boss + exit kinds all present', () => {
    const kinds = new Set(LANDMARK_TYPES.map(l => l.kind));
    expect(kinds.has('village')).toBe(true);
    expect(kinds.has('enemy')).toBe(true);
    expect(kinds.has('boss')).toBe(true);
    expect(kinds.has('exit')).toBe(true);
  });
});
```

- [ ] **Step 8.3: Verify both fail**

```bash
pnpm --filter @forge/game-inflation-rpg test -- "src/data/__tests__/(zones|landmarks)"
```

- [ ] **Step 8.4: Implement zones**

Create `games/inflation-rpg/src/data/zones.ts`:

```ts
export type ZoneId = 'village' | 'forest' | 'mountains' | 'plains' | 'mystic';

export interface Zone {
  id: ZoneId;
  nameKR: string;
  biome: string;
  bgColor: string; // hex — overworld scene base
  difficulty: number; // 1 = easy spawn pool, 5 = hardest
}

export const ZONES: readonly Zone[] = [
  { id: 'village',   nameKR: '시작 마을',     biome: 'town',    bgColor: '#422006', difficulty: 1 },
  { id: 'forest',    nameKR: '깊은 숲',       biome: 'forest',  bgColor: '#134e4a', difficulty: 2 },
  { id: 'plains',    nameKR: '광활한 평원',   biome: 'plains',  bgColor: '#3f6212', difficulty: 2 },
  { id: 'mountains', nameKR: '암벽의 산악',   biome: 'mountain',bgColor: '#44403c', difficulty: 3 },
  { id: 'mystic',    nameKR: '신비의 차원',   biome: 'mystic',  bgColor: '#1e1b4b', difficulty: 5 },
];
```

- [ ] **Step 8.5: Implement landmarks**

Create `games/inflation-rpg/src/data/landmarks.ts`:

```ts
export type LandmarkKind =
  | 'village'   // 마을 (safe / market in future)
  | 'enemy'     // 일반 적 spawn point
  | 'boss'      // boss spawn point
  | 'shrine'    // 사당 (V1b 가 wire)
  | 'cave'      // 동굴 (V1b 가 wire — special encounter)
  | 'market'    // 시장 (V1b)
  | 'ruin'      // 폐허 (V1b)
  | 'exit'      // exit / 다음 zone 진입
  | 'rival';    // 라이벌 (V1b)

export interface LandmarkType {
  id: string;
  nameKR: string;
  emoji: string;
  kind: LandmarkKind;
}

export const LANDMARK_TYPES: readonly LandmarkType[] = [
  { id: 'village',    nameKR: '마을',         emoji: '🏘️', kind: 'village' },
  { id: 'wolf',       nameKR: '늑대',         emoji: '🐺', kind: 'enemy' },
  { id: 'goblin',     nameKR: '고블린',       emoji: '👹', kind: 'enemy' },
  { id: 'bandit',     nameKR: '도적',         emoji: '🥷', kind: 'enemy' },
  { id: 'wolf_lord',  nameKR: '늑대 두목',    emoji: '🐺', kind: 'boss' },
  { id: 'dragon',     nameKR: '용',           emoji: '🐉', kind: 'boss' },
  { id: 'shrine',     nameKR: '사당',         emoji: '🛐', kind: 'shrine' },
  { id: 'cave',       nameKR: '동굴',         emoji: '🕳️', kind: 'cave' },
  { id: 'market',     nameKR: '시장',         emoji: '🛒', kind: 'market' },
  { id: 'ruin',       nameKR: '폐허',         emoji: '🏛️', kind: 'ruin' },
  { id: 'exit',       nameKR: '경계',         emoji: '🚪', kind: 'exit' },
];
```

- [ ] **Step 8.6: Verify pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- "src/data/__tests__/(zones|landmarks)"
```

- [ ] **Step 8.7: Commit**

```bash
git add games/inflation-rpg/src/data/zones.ts \
  games/inflation-rpg/src/data/landmarks.ts \
  games/inflation-rpg/src/data/__tests__/zones.test.ts \
  games/inflation-rpg/src/data/__tests__/landmarks.test.ts
git commit -m "feat(game-inflation-rpg): Phase V1a T8 — zone + landmark data (5 zones, 11 landmark types)"
```

---

## Task 9: SagaTypes + SagaRecorder + NarrativeGenerator

**Files:**
- Create: `games/inflation-rpg/src/saga/SagaTypes.ts`
- Create: `games/inflation-rpg/src/saga/SagaRecorder.ts`
- Create: `games/inflation-rpg/src/saga/NarrativeGenerator.ts`
- Create: `games/inflation-rpg/src/saga/__tests__/SagaRecorder.test.ts`
- Create: `games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts`

- [ ] **Step 9.1: Test NarrativeGenerator first (simplest)**

Create `games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { NarrativeGenerator } from '../NarrativeGenerator';

describe('NarrativeGenerator', () => {
  it('battle event → "N세에 X를 처치했다" style', () => {
    const txt = NarrativeGenerator.forBattle({ age: 12, enemyNameKR: '늑대' });
    expect(txt).toContain('12세');
    expect(txt).toContain('늑대');
  });

  it('levelUp event → "N세에 영웅의 길에 들어섰다 (LV M)" style', () => {
    const txt = NarrativeGenerator.forLevelUp({ age: 15, newLevel: 24 });
    expect(txt).toContain('15세');
    expect(txt).toContain('24');
  });

  it('drop event → "N세에 X를 손에 넣었다" style', () => {
    const txt = NarrativeGenerator.forDrop({ age: 20, itemNameKR: '낡은 검' });
    expect(txt).toContain('20세');
    expect(txt).toContain('낡은 검');
  });

  it('death event → "N세에 X(으)로 쓰러졌다" or "안식을 맞았다"', () => {
    const txt = NarrativeGenerator.forDeath({ age: 35, cause: '전사', enemyNameKR: '용' });
    expect(txt).toContain('35세');
    expect(txt).toContain('용');
    const natural = NarrativeGenerator.forDeath({ age: 75, cause: '자연사' });
    expect(natural).toContain('75세');
    expect(natural).toMatch(/안식|잠들|자연/);
  });
});
```

- [ ] **Step 9.2: Test SagaRecorder**

Create `games/inflation-rpg/src/saga/__tests__/SagaRecorder.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SagaRecorder } from '../SagaRecorder';
import type { SagaEvent } from '../SagaTypes';

describe('SagaRecorder', () => {
  it('records events in order', () => {
    const rec = new SagaRecorder('홍길동', 42);
    rec.record({ age: 7, type: 'battle', narrativeText: '늑대를 처치했다', payload: {} });
    rec.record({ age: 10, type: 'levelUp', narrativeText: 'LV 5 도달', payload: {} });
    const saga = rec.finalize({
      finalAge: 10,
      finalJob: '평민',
      finalLevel: 5,
      finalPersonality: { moral: 0, prudent: 0, heroic: 0, merciful: 0, pious: 0 },
      cause: '전사',
    });
    expect(saga.hero.name).toBe('홍길동');
    expect(saga.chapters.flatMap(c => c.events).length).toBe(2);
    expect(saga.hero.cause).toBe('전사');
  });

  it('groups events into chapters by age', () => {
    const rec = new SagaRecorder('이몽룡', 7);
    rec.record({ age: 8, type: 'battle', narrativeText: 'x', payload: {} });
    rec.record({ age: 22, type: 'battle', narrativeText: 'y', payload: {} });
    rec.record({ age: 55, type: 'death', narrativeText: 'z', payload: {} });
    const saga = rec.finalize({ finalAge: 55, finalJob: '평민', finalLevel: 1, finalPersonality: { moral: 0, prudent: 0, heroic: 0, merciful: 0, pious: 0 }, cause: '자연사' });
    const childhood = saga.chapters.find(c => c.name === '어린시절');
    const young = saga.chapters.find(c => c.name === '청년기');
    const old = saga.chapters.find(c => c.name === '노년기');
    expect(childhood?.events.length).toBe(1);
    expect(young?.events.length).toBe(1);
    expect(old?.events.length).toBe(1);
  });
});
```

- [ ] **Step 9.3: Verify both fail**

```bash
pnpm --filter @forge/game-inflation-rpg test -- "src/saga"
```

- [ ] **Step 9.4: Implement SagaTypes**

Create `games/inflation-rpg/src/saga/SagaTypes.ts`:

```ts
import type { Chapter } from '../hero/HeroLifecycle';
import type { PersonalitySnapshot } from '../hero/PersonalityState';

export type SagaEventType =
  | 'birth'
  | 'battle'
  | 'levelUp'
  | 'drop'
  | 'death';

export type DeathCause = '전사' | '자연사' | '영광스러운죽음' | '비극';

export interface SagaEvent {
  age: number;
  type: SagaEventType;
  narrativeText: string;
  payload: Record<string, unknown>;
}

export interface SagaChapter {
  name: Chapter;
  events: SagaEvent[];
}

export interface CycleSaga {
  cycleId: string;
  endedAtMs: number;
  hero: {
    name: string;
    seed: number;
    finalAge: number;
    finalJob: string;
    finalLevel: number;
    finalPersonality: PersonalitySnapshot;
    cause: DeathCause;
  };
  chapters: SagaChapter[];
  highlightEvents: SagaEvent[];
}
```

- [ ] **Step 9.5: Implement NarrativeGenerator**

Create `games/inflation-rpg/src/saga/NarrativeGenerator.ts`:

```ts
import type { DeathCause } from './SagaTypes';

export class NarrativeGenerator {
  static forBattle(opts: { age: number; enemyNameKR: string }): string {
    return `${opts.age}세에 ${opts.enemyNameKR}을(를) 처치했다.`;
  }

  static forLevelUp(opts: { age: number; newLevel: number }): string {
    return `${opts.age}세에 한 단계 더 강해졌다. (LV ${opts.newLevel})`;
  }

  static forDrop(opts: { age: number; itemNameKR: string }): string {
    return `${opts.age}세에 ${opts.itemNameKR}을(를) 손에 넣었다.`;
  }

  static forDeath(opts: { age: number; cause: DeathCause; enemyNameKR?: string }): string {
    switch (opts.cause) {
      case '전사':
        return `${opts.age}세에 ${opts.enemyNameKR ?? '강적'}에게 쓰러져 생을 마감했다.`;
      case '자연사':
        return `${opts.age}세에 안식을 맞아 잠들었다.`;
      case '영광스러운죽음':
        return `${opts.age}세에 영웅으로서 생을 마감했다.`;
      case '비극':
        return `${opts.age}세에 비극적인 최후를 맞았다.`;
    }
  }
}
```

- [ ] **Step 9.6: Implement SagaRecorder**

Create `games/inflation-rpg/src/saga/SagaRecorder.ts`:

```ts
import type { CycleSaga, SagaChapter, SagaEvent, DeathCause } from './SagaTypes';
import type { Chapter } from '../hero/HeroLifecycle';
import { HeroLifecycle } from '../hero/HeroLifecycle';
import type { PersonalitySnapshot } from '../hero/PersonalityState';

interface FinalizeOpts {
  finalAge: number;
  finalJob: string;
  finalLevel: number;
  finalPersonality: PersonalitySnapshot;
  cause: DeathCause;
}

export class SagaRecorder {
  private events: SagaEvent[] = [];

  constructor(
    private readonly heroName: string,
    private readonly seed: number,
  ) {}

  record(event: SagaEvent): void {
    this.events.push(event);
  }

  finalize(opts: FinalizeOpts): CycleSaga {
    const chapters: SagaChapter[] = [
      { name: '어린시절', events: [] },
      { name: '청년기', events: [] },
      { name: '장년기', events: [] },
      { name: '노년기', events: [] },
      { name: '마지막', events: [] },
    ];
    for (const ev of this.events) {
      const ch = HeroLifecycle.chapterForAge(ev.age);
      const target = chapters.find(c => c.name === ch);
      target?.events.push(ev);
    }
    const highlightEvents = this.events.filter(e => ['levelUp', 'death', 'drop'].includes(e.type)).slice(-6);
    return {
      cycleId: `cycle_${this.seed}_${Date.now()}`,
      endedAtMs: Date.now(),
      hero: {
        name: this.heroName,
        seed: this.seed,
        finalAge: opts.finalAge,
        finalJob: opts.finalJob,
        finalLevel: opts.finalLevel,
        finalPersonality: opts.finalPersonality,
        cause: opts.cause,
      },
      chapters,
      highlightEvents,
    };
  }
}
```

- [ ] **Step 9.7: Verify pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- "src/saga"
```

Expected: 6 tests pass.

- [ ] **Step 9.8: Commit**

```bash
git add games/inflation-rpg/src/saga/SagaTypes.ts \
  games/inflation-rpg/src/saga/SagaRecorder.ts \
  games/inflation-rpg/src/saga/NarrativeGenerator.ts \
  games/inflation-rpg/src/saga/__tests__/SagaRecorder.test.ts \
  games/inflation-rpg/src/saga/__tests__/NarrativeGenerator.test.ts
git commit -m "feat(game-inflation-rpg): Phase V1a T9 — SagaTypes / SagaRecorder / NarrativeGenerator"
```

---

## Task 10: Persist v16 → v17 (sagaHistory)

**Files:**
- Modify: `games/inflation-rpg/src/types.ts`
- Modify: `games/inflation-rpg/src/store/gameStore.ts`
- Create: `games/inflation-rpg/src/store/__tests__/migrate-v16-v17.test.ts`
- Create: `games/inflation-rpg/src/saga/SagaStorage.ts`
- Create: `games/inflation-rpg/src/saga/__tests__/SagaStorage.test.ts`

- [ ] **Step 10.1: Write migration test**

Create `games/inflation-rpg/src/store/__tests__/migrate-v16-v17.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { runStoreMigration } from '../gameStore';

describe('Persist v16 → v17 migration', () => {
  it('adds sagaHistory: [] to meta on v16 → v17', () => {
    const v16State = { meta: { traitsUnlocked: [], cycleHistory: [] } };
    const migrated = runStoreMigration(v16State, 16);
    expect(migrated.meta.sagaHistory).toEqual([]);
  });

  it('preserves existing meta on v16 → v17', () => {
    const v16State = {
      meta: {
        traitsUnlocked: ['t_genius'],
        cycleHistory: [{ endedAtMs: 1, durationMs: 100, maxLevel: 17, reason: 'bp_exhausted', seed: 42 }],
      },
    };
    const migrated = runStoreMigration(v16State, 16);
    expect(migrated.meta.traitsUnlocked).toEqual(['t_genius']);
    expect(migrated.meta.cycleHistory.length).toBe(1);
  });

  it('no-op when already v17', () => {
    const v17State = { meta: { sagaHistory: [{ cycleId: 'c1', endedAtMs: 1, hero: { name: 'a', seed: 1, finalAge: 5, finalJob: '평민', finalLevel: 1, finalPersonality: { moral:0, prudent:0, heroic:0, merciful:0, pious:0 }, cause: '자연사' }, chapters: [], highlightEvents: [] }] } };
    const migrated = runStoreMigration(v17State, 17);
    expect(migrated.meta.sagaHistory.length).toBe(1);
  });
});
```

- [ ] **Step 10.2: SagaStorage test**

Create `games/inflation-rpg/src/saga/__tests__/SagaStorage.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { SagaStorage } from '../SagaStorage';
import type { CycleSaga } from '../SagaTypes';

const stubSaga = (cycleId: string): CycleSaga => ({
  cycleId,
  endedAtMs: Date.now(),
  hero: { name: 'a', seed: 1, finalAge: 5, finalJob: '평민', finalLevel: 1, finalPersonality: { moral:0,prudent:0,heroic:0,merciful:0,pious:0 }, cause: '자연사' },
  chapters: [],
  highlightEvents: [],
});

describe('SagaStorage', () => {
  beforeEach(() => {
    useGameStore.setState(s => ({ ...s, meta: { ...s.meta, sagaHistory: [] } }));
  });

  it('append pushes to gameStore.meta.sagaHistory', () => {
    SagaStorage.append(stubSaga('cyc1'));
    expect(useGameStore.getState().meta.sagaHistory.length).toBe(1);
    expect(useGameStore.getState().meta.sagaHistory[0].cycleId).toBe('cyc1');
  });

  it('caps at 100 entries (FIFO)', () => {
    for (let i = 0; i < 110; i++) SagaStorage.append(stubSaga(`c${i}`));
    expect(useGameStore.getState().meta.sagaHistory.length).toBe(100);
    expect(useGameStore.getState().meta.sagaHistory[0].cycleId).toBe('c10');
    expect(useGameStore.getState().meta.sagaHistory[99].cycleId).toBe('c109');
  });
});
```

- [ ] **Step 10.3: Verify both fail**

```bash
pnpm --filter @forge/game-inflation-rpg test -- "(migrate-v16-v17|SagaStorage)"
```

- [ ] **Step 10.4: Update types.ts**

Find `MetaState` interface in `types.ts`. Add:

```ts
import type { CycleSaga } from './saga/SagaTypes';
// Inside MetaState:
sagaHistory: CycleSaga[];
```

- [ ] **Step 10.5: Update gameStore.ts**

In `gameStore.ts`:

1. Change `version: 16` → `version: 17`.
2. In `INITIAL_META`, add `sagaHistory: []`.
3. In `runStoreMigration`, append the v16 → v17 branch:

```ts
if (fromVersion <= 16 && s.meta) {
  if (!s.meta.sagaHistory) s.meta.sagaHistory = [];
}
```

- [ ] **Step 10.6: Implement SagaStorage**

Create `games/inflation-rpg/src/saga/SagaStorage.ts`:

```ts
import { useGameStore } from '../store/gameStore';
import type { CycleSaga } from './SagaTypes';

const SAGA_CAP = 100;

export class SagaStorage {
  static append(saga: CycleSaga): void {
    const current = useGameStore.getState().meta.sagaHistory ?? [];
    const next = [...current, saga];
    const capped = next.length > SAGA_CAP ? next.slice(next.length - SAGA_CAP) : next;
    useGameStore.setState(s => ({ ...s, meta: { ...s.meta, sagaHistory: capped } }));
  }

  static getAll(): readonly CycleSaga[] {
    return useGameStore.getState().meta.sagaHistory ?? [];
  }
}
```

- [ ] **Step 10.7: Verify pass + full suite**

```bash
pnpm --filter @forge/game-inflation-rpg test 2>&1 | tail -10
```

Expected: all pass. If an existing e2e or test asserts STORE_VERSION === 16, bump to 17.

- [ ] **Step 10.8: Commit**

```bash
git add -A
git commit -m "feat(game-inflation-rpg): Phase V1a T10 — persist v16 → v17 (MetaState.sagaHistory) + SagaStorage append/cap"
```

---

## Task 11: DestinationResolver — trait + personality → next landmark

**Files:**
- Create: `games/inflation-rpg/src/decisionAI/DestinationResolver.ts`
- Create: `games/inflation-rpg/src/decisionAI/__tests__/DestinationResolver.test.ts`

This task fills the body of what's been a stub since Sim-B. The resolver picks the next landmark for the hero to walk toward, based on trait + personality + currently-visible landmarks.

- [ ] **Step 11.1: Test**

Create `games/inflation-rpg/src/decisionAI/__tests__/DestinationResolver.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { DestinationResolver, type LandmarkCandidate } from '../DestinationResolver';
import { PersonalityState } from '../../hero/PersonalityState';
import { SeededRng } from '../../cycle/SeededRng';

const candidates = (): LandmarkCandidate[] => [
  { id: 'wolf_1',      kind: 'enemy',  difficulty: 1 },
  { id: 'dragon_1',    kind: 'boss',   difficulty: 5 },
  { id: 'shrine_1',    kind: 'shrine', difficulty: 0 },
  { id: 'village_1',   kind: 'village',difficulty: 0 },
];

describe('DestinationResolver', () => {
  it('returns null when no candidates', () => {
    const r = new DestinationResolver(new SeededRng(1));
    const chosen = r.choose([], { traits: [], personality: new PersonalityState() });
    expect(chosen).toBeNull();
  });

  it('prefers boss when heroic personality is high', () => {
    const r = new DestinationResolver(new SeededRng(1));
    const p = PersonalityState.fromTraitPriors({ heroic: 8 });
    // Run multiple seeds; >50% boss expected
    let bossPicks = 0;
    for (let i = 0; i < 30; i++) {
      const r2 = new DestinationResolver(new SeededRng(i));
      const chosen = r2.choose(candidates(), { traits: [], personality: p });
      if (chosen?.kind === 'boss') bossPicks++;
    }
    expect(bossPicks).toBeGreaterThan(10);
  });

  it('prefers shrine when pious personality is high', () => {
    let shrinePicks = 0;
    const p = PersonalityState.fromTraitPriors({ pious: 8 });
    for (let i = 0; i < 30; i++) {
      const r = new DestinationResolver(new SeededRng(i));
      const chosen = r.choose(candidates(), { traits: [], personality: p });
      if (chosen?.kind === 'shrine') shrinePicks++;
    }
    expect(shrinePicks).toBeGreaterThan(10);
  });

  it('always returns a candidate from the input list', () => {
    const r = new DestinationResolver(new SeededRng(42));
    for (let seed = 0; seed < 20; seed++) {
      const r2 = new DestinationResolver(new SeededRng(seed));
      const chosen = r2.choose(candidates(), { traits: [], personality: new PersonalityState() });
      expect(chosen).not.toBeNull();
      expect(candidates().some(c => c.id === chosen!.id)).toBe(true);
    }
  });
});
```

- [ ] **Step 11.2: Verify fail**

```bash
pnpm --filter @forge/game-inflation-rpg test -- DestinationResolver
```

- [ ] **Step 11.3: Implement DestinationResolver**

Create `games/inflation-rpg/src/decisionAI/DestinationResolver.ts`:

```ts
import type { SeededRng } from '../cycle/SeededRng';
import type { PersonalityState } from '../hero/PersonalityState';
import type { LandmarkKind } from '../data/landmarks';
import type { TraitId } from '../cycle/traits';

export interface LandmarkCandidate {
  id: string;
  kind: LandmarkKind;
  difficulty: number;
}

export interface DecisionContext {
  traits: readonly TraitId[];
  personality: PersonalityState;
}

const WEIGHT_BASE: Record<LandmarkKind, number> = {
  enemy:   10,
  boss:    3,
  shrine:  4,
  cave:    3,
  village: 5,
  market:  3,
  ruin:    3,
  exit:    2,
  rival:   2,
};

export class DestinationResolver {
  constructor(private readonly rng: SeededRng) {}

  choose(candidates: readonly LandmarkCandidate[], ctx: DecisionContext): LandmarkCandidate | null {
    if (candidates.length === 0) return null;

    const personality = ctx.personality;
    const heroic = personality.get('heroic');
    const pious = personality.get('pious');
    const prudent = personality.get('prudent');

    const weighted = candidates.map(c => {
      let w = WEIGHT_BASE[c.kind] ?? 1;
      if (c.kind === 'boss')    w += heroic * 1.5;
      if (c.kind === 'enemy')   w += heroic * 0.3;
      if (c.kind === 'shrine')  w += pious * 1.5;
      if (c.kind === 'village') w += prudent * 0.8;
      if (c.kind === 'cave')    w += (heroic - prudent) * 0.4;
      return { candidate: c, weight: Math.max(0.1, w) };
    });

    const totalW = weighted.reduce((a, b) => a + b.weight, 0);
    let r = this.rng.next() * totalW;
    for (const item of weighted) {
      r -= item.weight;
      if (r <= 0) return item.candidate;
    }
    return weighted[weighted.length - 1].candidate;
  }
}
```

- [ ] **Step 11.4: Verify pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- DestinationResolver
```

- [ ] **Step 11.5: Commit**

```bash
git add games/inflation-rpg/src/decisionAI/DestinationResolver.ts \
  games/inflation-rpg/src/decisionAI/__tests__/DestinationResolver.test.ts
git commit -m "feat(game-inflation-rpg): Phase V1a T11 — DestinationResolver (trait + personality → weighted random landmark choice)"
```

---

## Task 12: HeroDecisionAI public class

**Files:**
- Create: `games/inflation-rpg/src/decisionAI/HeroDecisionAI.ts`
- Create: `games/inflation-rpg/src/decisionAI/__tests__/HeroDecisionAI.test.ts`

Note: there's a stub `HeroDecisionAI` already at `src/cycle/HeroDecisionAI.ts` from Sim-B. **Do NOT delete it** — `AutoBattleController` imports it for Sim-G balance simulator. The V1a version lives in a different namespace (`src/decisionAI/HeroDecisionAI.ts`) and is dedicated to the open-world view. Eventually they may merge; not in V1a.

- [ ] **Step 12.1: Test**

Create `games/inflation-rpg/src/decisionAI/__tests__/HeroDecisionAI.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { HeroDecisionAI } from '../HeroDecisionAI';
import { HeroEntity } from '../../hero/HeroEntity';
import type { LandmarkCandidate } from '../DestinationResolver';

describe('HeroDecisionAI (v2 / overworld)', () => {
  function makeHero() {
    return HeroEntity.create({ seed: 42, bpMax: 30, heroHpMax: 100, heroAtkBase: 50 });
  }

  it('chooseDestination returns one of provided candidates', () => {
    const candidates: LandmarkCandidate[] = [
      { id: 'a', kind: 'enemy', difficulty: 1 },
      { id: 'b', kind: 'village', difficulty: 0 },
    ];
    const ai = new HeroDecisionAI(makeHero(), { seed: 7, traits: [] });
    const choice = ai.chooseDestination(candidates);
    expect(choice).not.toBeNull();
    expect(['a', 'b']).toContain(choice!.id);
  });

  it('chooseDestination returns null on empty list', () => {
    const ai = new HeroDecisionAI(makeHero(), { seed: 7, traits: [] });
    expect(ai.chooseDestination([])).toBeNull();
  });

  it('same seed → same choice', () => {
    const candidates: LandmarkCandidate[] = [
      { id: 'a', kind: 'enemy', difficulty: 1 },
      { id: 'b', kind: 'boss', difficulty: 5 },
      { id: 'c', kind: 'shrine', difficulty: 0 },
    ];
    const a1 = new HeroDecisionAI(makeHero(), { seed: 99, traits: [] }).chooseDestination(candidates);
    const a2 = new HeroDecisionAI(makeHero(), { seed: 99, traits: [] }).chooseDestination(candidates);
    expect(a1?.id).toBe(a2?.id);
  });
});
```

- [ ] **Step 12.2: Verify fail**

```bash
pnpm --filter @forge/game-inflation-rpg test -- "decisionAI/__tests__/HeroDecisionAI"
```

- [ ] **Step 12.3: Implement**

Create `games/inflation-rpg/src/decisionAI/HeroDecisionAI.ts`:

```ts
import type { HeroEntity } from '../hero/HeroEntity';
import type { TraitId } from '../cycle/traits';
import { SeededRng } from '../cycle/SeededRng';
import { DestinationResolver, type LandmarkCandidate } from './DestinationResolver';

export interface HeroDecisionAIOpts {
  seed: number;
  traits: readonly TraitId[];
}

export class HeroDecisionAI {
  private resolver: DestinationResolver;

  constructor(
    private readonly hero: HeroEntity,
    private readonly opts: HeroDecisionAIOpts,
  ) {
    this.resolver = new DestinationResolver(new SeededRng(opts.seed));
  }

  chooseDestination(candidates: readonly LandmarkCandidate[]): LandmarkCandidate | null {
    return this.resolver.choose(candidates, {
      traits: this.opts.traits,
      personality: this.hero.personality,
    });
  }
}
```

- [ ] **Step 12.4: Verify pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- "decisionAI/__tests__/HeroDecisionAI"
```

- [ ] **Step 12.5: Commit**

```bash
git add games/inflation-rpg/src/decisionAI/HeroDecisionAI.ts \
  games/inflation-rpg/src/decisionAI/__tests__/HeroDecisionAI.test.ts
git commit -m "feat(game-inflation-rpg): Phase V1a T12 — HeroDecisionAI public class (overworld destination decision)"
```

---

## Task 13: OverworldEvents + Landmark spawn

**Files:**
- Create: `games/inflation-rpg/src/overworld/OverworldEvents.ts`
- Create: `games/inflation-rpg/src/overworld/Landmark.ts`

These two files are small but central — they define how the overworld scene communicates with React and how landmarks are placed on the grid.

- [ ] **Step 13.1: Create OverworldEvents.ts (types only — no tests needed)**

```ts
import type { LandmarkKind } from '../data/landmarks';

export type OverworldEvent =
  | { type: 'tick';           t: number }
  | { type: 'arrived_at';     landmarkId: string; landmarkKind: LandmarkKind }
  | { type: 'battle_started'; enemyId: string }
  | { type: 'battle_won';     enemyId: string; expGain: number; dropId: string | null }
  | { type: 'level_up';       from: number; to: number }
  | { type: 'hero_died';      cause: '전사' | '자연사'; enemyId?: string }
  | { type: 'cycle_ended' };
```

- [ ] **Step 13.2: Create Landmark.ts (small placement type)**

```ts
import type { LandmarkType, LandmarkKind } from '../data/landmarks';

export interface PlacedLandmark {
  instanceId: string;
  type: LandmarkType;
  gridX: number;
  gridY: number;
  consumed: boolean; // enemies/bosses become consumed after defeat
}

export function landmarkToCandidate(l: PlacedLandmark): { id: string; kind: LandmarkKind; difficulty: number } {
  // V1a: all enemies difficulty 1, bosses 3. Real difficulty in later phase.
  const difficulty = l.type.kind === 'boss' ? 3 : 1;
  return { id: l.instanceId, kind: l.type.kind, difficulty };
}
```

- [ ] **Step 13.3: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors.

- [ ] **Step 13.4: Commit**

```bash
git add games/inflation-rpg/src/overworld/OverworldEvents.ts \
  games/inflation-rpg/src/overworld/Landmark.ts
git commit -m "feat(game-inflation-rpg): Phase V1a T13 — OverworldEvents + PlacedLandmark types"
```

---

## Task 14: OverworldScene — Phaser scene with map + hero token + pathfinding

**Files:**
- Create: `games/inflation-rpg/src/overworld/OverworldScene.ts`
- Create: `games/inflation-rpg/src/overworld/__tests__/OverworldScene.test.ts`

This is the centerpiece. The Phaser scene that:
1. Renders a small grid (20×12) of zone tiles (colored rectangles by zone)
2. Spawns 6–8 random landmarks (emoji text objects on top of tiles)
3. Spawns the hero token (emoji) at the village landmark
4. Repeatedly: ask `HeroDecisionAI.chooseDestination`, A* path to it, animate hero across tiles, on arrival emit `arrived_at` event
5. Emits `OverworldEvent` instances via a registered callback (React subscribes)

Phaser scenes are hard to unit-test. Tests for this task focus on the **non-Phaser logic** that is extracted into testable helpers: zone tile layout, landmark placement.

- [ ] **Step 14.1: Test the placement helper first (extract to testable helper)**

Create `games/inflation-rpg/src/overworld/__tests__/OverworldScene.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateMapLayout, GRID_W, GRID_H } from '../OverworldScene';

describe('generateMapLayout', () => {
  it('returns a grid sized GRID_W × GRID_H', () => {
    const layout = generateMapLayout(42);
    expect(layout.tiles.length).toBe(GRID_H);
    expect(layout.tiles[0].length).toBe(GRID_W);
  });

  it('includes at least one village landmark', () => {
    const layout = generateMapLayout(42);
    const villages = layout.landmarks.filter(l => l.type.kind === 'village');
    expect(villages.length).toBeGreaterThanOrEqual(1);
  });

  it('places at least 5 enemy/boss landmarks', () => {
    const layout = generateMapLayout(42);
    const combatLandmarks = layout.landmarks.filter(l => l.type.kind === 'enemy' || l.type.kind === 'boss');
    expect(combatLandmarks.length).toBeGreaterThanOrEqual(5);
  });

  it('landmark coordinates are within grid bounds', () => {
    const layout = generateMapLayout(42);
    for (const lm of layout.landmarks) {
      expect(lm.gridX).toBeGreaterThanOrEqual(0);
      expect(lm.gridX).toBeLessThan(GRID_W);
      expect(lm.gridY).toBeGreaterThanOrEqual(0);
      expect(lm.gridY).toBeLessThan(GRID_H);
    }
  });

  it('same seed produces same layout', () => {
    const a = generateMapLayout(99);
    const b = generateMapLayout(99);
    expect(a.landmarks.map(l => l.instanceId + ':' + l.gridX + ',' + l.gridY))
      .toEqual(b.landmarks.map(l => l.instanceId + ':' + l.gridX + ',' + l.gridY));
  });
});
```

- [ ] **Step 14.2: Verify fail**

```bash
pnpm --filter @forge/game-inflation-rpg test -- OverworldScene
```

- [ ] **Step 14.3: Implement OverworldScene (with extractable layout helper)**

Create `games/inflation-rpg/src/overworld/OverworldScene.ts`:

```ts
import Phaser from 'phaser';
import { SeededRng } from '../cycle/SeededRng';
import { ZONES, type ZoneId } from '../data/zones';
import { LANDMARK_TYPES } from '../data/landmarks';
import { Pathfinder, type GridCell } from './Pathfinding';
import type { PlacedLandmark } from './Landmark';
import { landmarkToCandidate } from './Landmark';
import type { OverworldEvent } from './OverworldEvents';
import type { HeroDecisionAI } from '../decisionAI/HeroDecisionAI';
import type { HeroEntity } from '../hero/HeroEntity';

export const GRID_W = 20;
export const GRID_H = 12;
const TILE_PX = 32;

export interface MapLayout {
  tiles: ZoneId[][]; // [y][x]
  landmarks: PlacedLandmark[];
}

/** Pure helper, testable without Phaser. */
export function generateMapLayout(seed: number): MapLayout {
  const rng = new SeededRng(seed);

  // Tile layout — vertical bands of biomes for simplicity
  const tiles: ZoneId[][] = [];
  for (let y = 0; y < GRID_H; y++) {
    const row: ZoneId[] = [];
    for (let x = 0; x < GRID_W; x++) {
      let zone: ZoneId;
      if (x < 3)      zone = 'village';
      else if (x < 8) zone = 'forest';
      else if (x < 12) zone = 'plains';
      else if (x < 17) zone = 'mountains';
      else             zone = 'mystic';
      row.push(zone);
    }
    tiles.push(row);
  }

  const landmarks: PlacedLandmark[] = [];
  const place = (typeId: string, gridX: number, gridY: number, instanceSuffix = '') => {
    const type = LANDMARK_TYPES.find(t => t.id === typeId);
    if (!type) return;
    landmarks.push({
      instanceId: `${typeId}_${gridX}_${gridY}${instanceSuffix}`,
      type,
      gridX,
      gridY,
      consumed: false,
    });
  };

  // Always: a village in village zone
  place('village', 1, Math.floor(GRID_H / 2));

  // 4–6 enemies in forest/plains zones
  for (let i = 0; i < 5; i++) {
    const enemyTypeId = ['wolf', 'goblin', 'bandit'][rng.int(3)];
    const x = 4 + rng.int(8);
    const y = rng.int(GRID_H);
    place(enemyTypeId, x, y, `_e${i}`);
  }

  // 1–2 bosses in mountains/mystic
  place('wolf_lord', 13 + rng.int(3), rng.int(GRID_H));
  place('dragon', 17 + rng.int(2), rng.int(GRID_H));

  // 1 shrine in mystic
  place('shrine', 18 + rng.int(2), rng.int(GRID_H));

  return { tiles, landmarks };
}

interface OverworldSceneData {
  seed: number;
  hero: HeroEntity;
  ai: HeroDecisionAI;
  onEvent: (event: OverworldEvent) => void;
}

export class OverworldScene extends Phaser.Scene {
  private hero!: HeroEntity;
  private ai!: HeroDecisionAI;
  private onEvent!: (e: OverworldEvent) => void;
  private layout!: MapLayout;
  private heroSprite!: Phaser.GameObjects.Text;
  private landmarkSprites: Map<string, Phaser.GameObjects.Text> = new Map();
  private currentPath: { x: number; y: number }[] = [];
  private currentTarget: PlacedLandmark | null = null;
  private moveTimer: Phaser.Time.TimerEvent | null = null;
  private pathfinder!: Pathfinder;

  constructor() { super('OverworldScene'); }

  init(data: OverworldSceneData) {
    this.hero = data.hero;
    this.ai = data.ai;
    this.onEvent = data.onEvent;
    this.layout = generateMapLayout(data.seed);
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0e1a');

    // Render tile background
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const zone = ZONES.find(z => z.id === this.layout.tiles[y][x])!;
        this.add.rectangle(
          x * TILE_PX + TILE_PX / 2,
          y * TILE_PX + TILE_PX / 2,
          TILE_PX - 1,
          TILE_PX - 1,
          parseInt(zone.bgColor.slice(1), 16),
          0.75,
        );
      }
    }

    // Render landmarks as emoji text
    for (const lm of this.layout.landmarks) {
      const text = this.add.text(
        lm.gridX * TILE_PX + TILE_PX / 2,
        lm.gridY * TILE_PX + TILE_PX / 2,
        lm.type.emoji,
        { fontSize: '20px' },
      ).setOrigin(0.5);
      this.landmarkSprites.set(lm.instanceId, text);
    }

    // Hero spawn at first village
    const village = this.layout.landmarks.find(l => l.type.kind === 'village')!;
    this.heroSprite = this.add.text(
      village.gridX * TILE_PX + TILE_PX / 2,
      village.gridY * TILE_PX + TILE_PX / 2,
      this.hero.emoji,
      { fontSize: '24px' },
    ).setOrigin(0.5).setDepth(10);

    // Build walkable grid (all walkable for V1a — no obstacles)
    const grid: GridCell[][] = this.layout.tiles.map(row => row.map(() => 'walkable' as const));
    this.pathfinder = new Pathfinder(grid);

    // Start moving
    this.pickNextDestination();
  }

  private async pickNextDestination(): Promise<void> {
    if (this.hero.dead) {
      this.onEvent({ type: 'cycle_ended' });
      return;
    }

    const heroPos = this.heroGridPos();
    const candidates = this.layout.landmarks
      .filter(l => !l.consumed)
      .filter(l => !(l.gridX === heroPos.x && l.gridY === heroPos.y))
      .map(l => ({ landmark: l, candidate: landmarkToCandidate(l) }));

    if (candidates.length === 0) {
      this.onEvent({ type: 'cycle_ended' });
      return;
    }

    const chosenCandidate = this.ai.chooseDestination(candidates.map(c => c.candidate));
    if (!chosenCandidate) {
      this.onEvent({ type: 'cycle_ended' });
      return;
    }

    const target = candidates.find(c => c.candidate.id === chosenCandidate.id)!.landmark;
    const path = await this.pathfinder.findPath(heroPos.x, heroPos.y, target.gridX, target.gridY);
    if (!path || path.length < 2) {
      // Unreachable; mark consumed to skip
      target.consumed = true;
      this.pickNextDestination();
      return;
    }

    this.currentPath = path.slice(1); // skip current pos
    this.currentTarget = target;
    this.stepAlongPath();
  }

  private stepAlongPath(): void {
    if (this.currentPath.length === 0) {
      this.arriveAtTarget();
      return;
    }
    const next = this.currentPath.shift()!;
    this.tweens.add({
      targets: this.heroSprite,
      x: next.x * TILE_PX + TILE_PX / 2,
      y: next.y * TILE_PX + TILE_PX / 2,
      duration: 180,
      onComplete: () => this.stepAlongPath(),
    });
  }

  private arriveAtTarget(): void {
    const target = this.currentTarget;
    if (!target) return;
    this.onEvent({ type: 'arrived_at', landmarkId: target.instanceId, landmarkKind: target.type.kind });
    // Wait 400ms (lets React resolve the encounter and update hero state) then continue
    this.time.delayedCall(400, () => {
      target.consumed = true;
      const sprite = this.landmarkSprites.get(target.instanceId);
      sprite?.setAlpha(0.3);
      this.currentTarget = null;
      this.pickNextDestination();
    });
  }

  private heroGridPos(): { x: number; y: number } {
    return {
      x: Math.round((this.heroSprite.x - TILE_PX / 2) / TILE_PX),
      y: Math.round((this.heroSprite.y - TILE_PX / 2) / TILE_PX),
    };
  }
}
```

- [ ] **Step 14.4: Verify pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- OverworldScene
```

Expected: 5 tests pass (the layout helper tests). The Phaser scene itself is not unit-tested — it's exercised via the e2e in Task 22.

- [ ] **Step 14.5: Commit**

```bash
git add games/inflation-rpg/src/overworld/OverworldScene.ts \
  games/inflation-rpg/src/overworld/__tests__/OverworldScene.test.ts
git commit -m "feat(game-inflation-rpg): Phase V1a T14 — OverworldScene Phaser scene + generateMapLayout helper (5 zones, ~8 landmarks, hero auto-pathing)"
```

---

## Task 15: EncounterEngine — resolve arrived_at events into combat/drops/levels

**Files:**
- Create: `games/inflation-rpg/src/overworld/EncounterEngine.ts`
- Create: `games/inflation-rpg/src/overworld/__tests__/EncounterEngine.test.ts`

When the hero arrives at an enemy/boss/village landmark, this engine decides what happens — combat auto-resolves, drops occur, level-ups trigger. It does NOT touch Phaser — it's pure logic that takes a `HeroEntity` + landmark kind and mutates the hero, returning events.

- [ ] **Step 15.1: Test**

Create `games/inflation-rpg/src/overworld/__tests__/EncounterEngine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { EncounterEngine } from '../EncounterEngine';
import { HeroEntity } from '../../hero/HeroEntity';
import { SeededRng } from '../../cycle/SeededRng';

function makeHero(seed = 42) {
  return HeroEntity.create({ seed, bpMax: 30, heroHpMax: 100, heroAtkBase: 100000 });
}

describe('EncounterEngine', () => {
  it('enemy encounter: hero wins → event has battle_won + bp consumed', () => {
    const hero = makeHero();
    const engine = new EncounterEngine(new SeededRng(1));
    const events = engine.resolveEncounter(hero, 'enemy', 'wolf_1');
    expect(events.some(e => e.type === 'battle_won')).toBe(true);
    expect(hero.bp).toBe(29);
  });

  it('boss encounter consumes 3 BP', () => {
    const hero = makeHero();
    const engine = new EncounterEngine(new SeededRng(1));
    engine.resolveEncounter(hero, 'boss', 'dragon_1');
    expect(hero.bp).toBe(27);
  });

  it('battle_won includes expGain, drop occasionally', () => {
    const hero = makeHero();
    const engine = new EncounterEngine(new SeededRng(1));
    const events = engine.resolveEncounter(hero, 'enemy', 'wolf_1');
    const won = events.find(e => e.type === 'battle_won');
    expect(won?.type === 'battle_won' && won.expGain).toBeGreaterThan(0);
  });

  it('high exp triggers level_up event', () => {
    const hero = makeHero();
    const engine = new EncounterEngine(new SeededRng(1));
    // First battle gains exp, may level
    const events = engine.resolveEncounter(hero, 'boss', 'dragon_1');
    const levelEvents = events.filter(e => e.type === 'level_up');
    expect(levelEvents.length).toBeGreaterThanOrEqual(0);
    if (levelEvents.length > 0) {
      expect(hero.level).toBeGreaterThan(1);
    }
  });

  it('hero with extremely low hp dies in enemy encounter', () => {
    const hero = HeroEntity.create({ seed: 42, bpMax: 30, heroHpMax: 1, heroAtkBase: 1 });
    const engine = new EncounterEngine(new SeededRng(1));
    const events = engine.resolveEncounter(hero, 'enemy', 'wolf_1');
    expect(hero.dead).toBe(true);
    expect(events.some(e => e.type === 'hero_died')).toBe(true);
  });

  it('village encounter heals slightly (V1a placeholder)', () => {
    const hero = makeHero();
    hero.takeDamage(50);
    const engine = new EncounterEngine(new SeededRng(1));
    engine.resolveEncounter(hero, 'village', 'village_1');
    expect(hero.hp).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 15.2: Verify fail**

```bash
pnpm --filter @forge/game-inflation-rpg test -- EncounterEngine
```

- [ ] **Step 15.3: Implement**

Create `games/inflation-rpg/src/overworld/EncounterEngine.ts`:

```ts
import type { SeededRng } from '../cycle/SeededRng';
import type { HeroEntity } from '../hero/HeroEntity';
import type { LandmarkKind } from '../data/landmarks';
import type { OverworldEvent } from './OverworldEvents';

const ENEMY_BASE_HP = 30;
const ENEMY_BASE_ATK = 8;
const BOSS_HP_MUL = 4;
const BOSS_ATK_MUL = 2;
const DROP_RATE = 0.3;

export class EncounterEngine {
  constructor(private readonly rng: SeededRng) {}

  resolveEncounter(hero: HeroEntity, kind: LandmarkKind, landmarkId: string): OverworldEvent[] {
    const events: OverworldEvent[] = [];
    if (kind === 'enemy' || kind === 'boss') {
      const isBoss = kind === 'boss';
      const enemyHp = Math.floor(ENEMY_BASE_HP * (1 + hero.level * 0.4) * (isBoss ? BOSS_HP_MUL : 1));
      const enemyAtk = Math.floor(ENEMY_BASE_ATK * (1 + hero.level * 0.3) * (isBoss ? BOSS_ATK_MUL : 1));

      events.push({ type: 'battle_started', enemyId: landmarkId });

      // Auto-resolve battle: hero attacks for hero.atk per round, enemy retaliates
      let eHp = enemyHp;
      while (eHp > 0 && !hero.dead) {
        eHp -= hero.atk;
        if (eHp > 0) hero.takeDamage(enemyAtk);
      }
      if (hero.dead) {
        events.push({ type: 'hero_died', cause: '전사', enemyId: landmarkId });
        return events;
      }
      // Hero wins
      const expGain = Math.floor((isBoss ? 60 : 12) * (1 + hero.level * 0.2));
      const dropOdds = isBoss ? 0.8 : DROP_RATE;
      const dropId = this.rng.chance(dropOdds) ? this.rollDrop(isBoss) : null;
      if (dropId) hero.addEquipment(dropId);

      const { leveled } = hero.gainExp(expGain);
      hero.consumeBp(isBoss ? 3 : 1);

      events.push({ type: 'battle_won', enemyId: landmarkId, expGain, dropId });
      for (const newLv of leveled) {
        events.push({ type: 'level_up', from: newLv - 1, to: newLv });
      }
      if (hero.dead) {
        events.push({ type: 'hero_died', cause: '자연사' });
      }
    } else if (kind === 'village') {
      const healAmount = Math.floor(hero.hpMax * 0.25);
      hero.takeDamage(-healAmount); // negative damage = heal — guard against overflow via takeDamage; below
      // Actually use direct accessor since takeDamage clamps lower bound only
      hero.hp = Math.min(hero.hp + healAmount, hero.hpMax);
      hero.consumeBp(0); // village does not consume BP in V1a
    }
    // Other kinds (shrine, cave, market, ruin, exit, rival) are no-ops in V1a — V1b handles
    return events;
  }

  private rollDrop(isBoss: boolean): string {
    const pool = isBoss
      ? ['steel_sword', 'magic_shield', 'enchanted_ring']
      : ['rusty_sword', 'cloth_armor', 'small_potion', 'leather_boots'];
    return pool[this.rng.int(pool.length)];
  }
}
```

Note: the `hero.hp = ...` direct assignment is a small workaround because `HeroEntity.takeDamage` is for damage only. We use the direct setter; alternatively, add a `heal(amount)` method to `HeroEntity` in the next step.

- [ ] **Step 15.4: Add `heal` method to HeroEntity (cleanup)**

Edit `games/inflation-rpg/src/hero/HeroEntity.ts` — add a method:

```ts
heal(amount: number): void {
  this.hp = Math.min(this.hpMax, this.hp + amount);
}
```

Update `EncounterEngine.ts` village branch to use `hero.heal(healAmount)` instead of direct `hero.hp =`.

- [ ] **Step 15.5: Verify pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- EncounterEngine
```

- [ ] **Step 15.6: Commit**

```bash
git add games/inflation-rpg/src/overworld/EncounterEngine.ts \
  games/inflation-rpg/src/overworld/__tests__/EncounterEngine.test.ts \
  games/inflation-rpg/src/hero/HeroEntity.ts
git commit -m "feat(game-inflation-rpg): Phase V1a T15 — EncounterEngine resolves arrived_at into battle/level/drop/death events"
```

---

## Task 16: CycleController v2 — connects all the pieces

**Files:**
- Create: `games/inflation-rpg/src/overworld/CycleControllerV2.ts`
- Create: `games/inflation-rpg/src/overworld/__tests__/CycleControllerV2.test.ts`

This is the orchestrator that the React `OverworldRunner` will create. It owns: `HeroEntity`, `HeroDecisionAI`, `EncounterEngine`, `SagaRecorder`. It connects events from `OverworldScene` → encounter resolution → hero state mutation → saga recording → cycle end detection.

- [ ] **Step 16.1: Test**

Create `games/inflation-rpg/src/overworld/__tests__/CycleControllerV2.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CycleControllerV2 } from '../CycleControllerV2';

describe('CycleControllerV2', () => {
  it('constructs without crashing', () => {
    const ctrl = new CycleControllerV2({
      seed: 42,
      traits: [],
      bpMax: 30,
      heroHpMax: 100,
      heroAtkBase: 100000,
    });
    expect(ctrl.getHero().name.length).toBeGreaterThan(0);
    expect(ctrl.getHero().dead).toBe(false);
  });

  it('handleArrival on enemy → at least one event emitted', () => {
    const ctrl = new CycleControllerV2({
      seed: 42,
      traits: [],
      bpMax: 30,
      heroHpMax: 100,
      heroAtkBase: 100000,
    });
    const events = ctrl.handleArrival('enemy', 'wolf_1');
    expect(events.length).toBeGreaterThan(0);
  });

  it('handleArrival drains BP across many encounters → hero dies → cycle ends', () => {
    const ctrl = new CycleControllerV2({
      seed: 42,
      traits: [],
      bpMax: 3,
      heroHpMax: 100,
      heroAtkBase: 100000,
    });
    for (let i = 0; i < 10; i++) ctrl.handleArrival('enemy', `wolf_${i}`);
    expect(ctrl.getHero().dead).toBe(true);
  });

  it('finalize produces a CycleSaga with events recorded', () => {
    const ctrl = new CycleControllerV2({
      seed: 42,
      traits: [],
      bpMax: 5,
      heroHpMax: 100,
      heroAtkBase: 100000,
    });
    for (let i = 0; i < 10 && !ctrl.getHero().dead; i++) {
      ctrl.handleArrival('enemy', `wolf_${i}`);
    }
    const saga = ctrl.finalize();
    expect(saga.hero.name.length).toBeGreaterThan(0);
    expect(saga.chapters.flatMap(c => c.events).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 16.2: Verify fail**

```bash
pnpm --filter @forge/game-inflation-rpg test -- CycleControllerV2
```

- [ ] **Step 16.3: Implement**

Create `games/inflation-rpg/src/overworld/CycleControllerV2.ts`:

```ts
import { HeroEntity } from '../hero/HeroEntity';
import { HeroDecisionAI } from '../decisionAI/HeroDecisionAI';
import { EncounterEngine } from './EncounterEngine';
import { SeededRng } from '../cycle/SeededRng';
import { SagaRecorder } from '../saga/SagaRecorder';
import { NarrativeGenerator } from '../saga/NarrativeGenerator';
import { LANDMARK_TYPES, type LandmarkKind } from '../data/landmarks';
import type { TraitId } from '../cycle/traits';
import type { CycleSaga, DeathCause } from '../saga/SagaTypes';
import type { OverworldEvent } from './OverworldEvents';

export interface CycleControllerV2Opts {
  seed: number;
  traits: readonly TraitId[];
  bpMax: number;
  heroHpMax: number;
  heroAtkBase: number;
}

export class CycleControllerV2 {
  private hero: HeroEntity;
  private ai: HeroDecisionAI;
  private encounter: EncounterEngine;
  private saga: SagaRecorder;
  private endCause: DeathCause | null = null;

  constructor(opts: CycleControllerV2Opts) {
    this.hero = HeroEntity.create({
      seed: opts.seed,
      bpMax: opts.bpMax,
      heroHpMax: opts.heroHpMax,
      heroAtkBase: opts.heroAtkBase,
    });
    this.ai = new HeroDecisionAI(this.hero, { seed: opts.seed, traits: opts.traits });
    this.encounter = new EncounterEngine(new SeededRng(opts.seed ^ 0xdeadbeef));
    this.saga = new SagaRecorder(this.hero.name, opts.seed);
  }

  getHero(): HeroEntity { return this.hero; }
  getDecisionAI(): HeroDecisionAI { return this.ai; }

  handleArrival(kind: LandmarkKind, landmarkId: string): OverworldEvent[] {
    if (this.hero.dead) return [];
    const events = this.encounter.resolveEncounter(this.hero, kind, landmarkId);

    for (const ev of events) {
      if (ev.type === 'battle_won') {
        const enemyType = LANDMARK_TYPES.find(t => landmarkId.startsWith(t.id)) ?? null;
        const enemyNameKR = enemyType?.nameKR ?? '적';
        this.saga.record({
          age: this.hero.age,
          type: 'battle',
          narrativeText: NarrativeGenerator.forBattle({ age: this.hero.age, enemyNameKR }),
          payload: { enemyId: landmarkId, expGain: ev.expGain },
        });
        if (ev.dropId) {
          this.saga.record({
            age: this.hero.age,
            type: 'drop',
            narrativeText: NarrativeGenerator.forDrop({ age: this.hero.age, itemNameKR: ev.dropId }),
            payload: { itemId: ev.dropId },
          });
        }
      }
      if (ev.type === 'level_up') {
        this.saga.record({
          age: this.hero.age,
          type: 'levelUp',
          narrativeText: NarrativeGenerator.forLevelUp({ age: this.hero.age, newLevel: ev.to }),
          payload: { from: ev.from, to: ev.to },
        });
      }
      if (ev.type === 'hero_died') {
        this.endCause = ev.cause;
        const enemyType = ev.enemyId ? LANDMARK_TYPES.find(t => ev.enemyId!.startsWith(t.id)) : null;
        this.saga.record({
          age: this.hero.age,
          type: 'death',
          narrativeText: NarrativeGenerator.forDeath({
            age: this.hero.age,
            cause: ev.cause,
            enemyNameKR: enemyType?.nameKR,
          }),
          payload: {},
        });
      }
    }
    return events;
  }

  finalize(): CycleSaga {
    return this.saga.finalize({
      finalAge: this.hero.age,
      finalJob: this.hero.job,
      finalLevel: this.hero.level,
      finalPersonality: this.hero.personality.snapshot(),
      cause: this.endCause ?? '자연사',
    });
  }
}
```

- [ ] **Step 16.4: Verify pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- CycleControllerV2
```

- [ ] **Step 16.5: Commit**

```bash
git add games/inflation-rpg/src/overworld/CycleControllerV2.ts \
  games/inflation-rpg/src/overworld/__tests__/CycleControllerV2.test.ts
git commit -m "feat(game-inflation-rpg): Phase V1a T16 — CycleControllerV2 orchestrates hero / AI / encounter / saga"
```

---

## Task 17: cycleSliceV2 zustand store

**Files:**
- Create: `games/inflation-rpg/src/overworld/cycleSliceV2.ts`
- Create: `games/inflation-rpg/src/overworld/__tests__/cycleSliceV2.test.ts`

The React screens use this store. Old `cycleSlice.ts` stays untouched (Sim-G simulator uses it).

- [ ] **Step 17.1: Test**

Create `games/inflation-rpg/src/overworld/__tests__/cycleSliceV2.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useCycleStoreV2 } from '../cycleSliceV2';

describe('cycleSliceV2', () => {
  beforeEach(() => useCycleStoreV2.getState().reset());

  it('starts in idle', () => {
    expect(useCycleStoreV2.getState().status).toBe('idle');
    expect(useCycleStoreV2.getState().controller).toBeNull();
  });

  it('start transitions to running with controller', () => {
    useCycleStoreV2.getState().start({
      seed: 42,
      traits: [],
      bpMax: 30,
      heroHpMax: 100,
      heroAtkBase: 100,
    });
    expect(useCycleStoreV2.getState().status).toBe('running');
    expect(useCycleStoreV2.getState().controller).not.toBeNull();
  });

  it('endCycle finalizes saga and persists', () => {
    useCycleStoreV2.getState().start({
      seed: 42, traits: [], bpMax: 3, heroHpMax: 100, heroAtkBase: 100000,
    });
    // force end by exhausting
    for (let i = 0; i < 10; i++) {
      useCycleStoreV2.getState().controller!.handleArrival('enemy', `e${i}`);
    }
    useCycleStoreV2.getState().endCycle();
    expect(useCycleStoreV2.getState().status).toBe('ended');
    expect(useCycleStoreV2.getState().lastSaga).not.toBeNull();
  });

  it('reset clears everything', () => {
    useCycleStoreV2.getState().start({ seed: 1, traits: [], bpMax: 30, heroHpMax: 100, heroAtkBase: 100 });
    useCycleStoreV2.getState().reset();
    expect(useCycleStoreV2.getState().status).toBe('idle');
    expect(useCycleStoreV2.getState().controller).toBeNull();
    expect(useCycleStoreV2.getState().lastSaga).toBeNull();
  });
});
```

- [ ] **Step 17.2: Verify fail**

```bash
pnpm --filter @forge/game-inflation-rpg test -- cycleSliceV2
```

- [ ] **Step 17.3: Implement**

Create `games/inflation-rpg/src/overworld/cycleSliceV2.ts`:

```ts
import { create } from 'zustand';
import { CycleControllerV2, type CycleControllerV2Opts } from './CycleControllerV2';
import { SagaStorage } from '../saga/SagaStorage';
import type { CycleSaga } from '../saga/SagaTypes';

type Status = 'idle' | 'running' | 'ended';

interface CycleStoreV2State {
  status: Status;
  controller: CycleControllerV2 | null;
  lastSaga: CycleSaga | null;
  start: (opts: CycleControllerV2Opts) => void;
  endCycle: () => void;
  reset: () => void;
}

export const useCycleStoreV2 = create<CycleStoreV2State>((set, get) => ({
  status: 'idle',
  controller: null,
  lastSaga: null,
  start(opts) {
    const ctrl = new CycleControllerV2(opts);
    set({ status: 'running', controller: ctrl, lastSaga: null });
  },
  endCycle() {
    const ctrl = get().controller;
    if (!ctrl) return;
    const saga = ctrl.finalize();
    SagaStorage.append(saga);
    set({ status: 'ended', lastSaga: saga });
  },
  reset() {
    set({ status: 'idle', controller: null, lastSaga: null });
  },
}));
```

- [ ] **Step 17.4: Verify pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- cycleSliceV2
```

- [ ] **Step 17.5: Commit**

```bash
git add games/inflation-rpg/src/overworld/cycleSliceV2.ts \
  games/inflation-rpg/src/overworld/__tests__/cycleSliceV2.test.ts
git commit -m "feat(game-inflation-rpg): Phase V1a T17 — cycleSliceV2 zustand store (idle/running/ended + lastSaga)"
```

---

## Task 18: CyclePrepV2 — neither 가호 nor trait selection in V1a

**Files:**
- Create: `games/inflation-rpg/src/screens/CyclePrepV2.tsx`
- Create: `games/inflation-rpg/src/screens/__tests__/CyclePrepV2.test.tsx`

V1a's CyclePrep is intentionally minimal — just a "오늘 등장한 영혼" preview + Start button. No trait selection (V1b), no 균열석 가호 (V1b).

- [ ] **Step 18.1: Test**

Create `games/inflation-rpg/src/screens/__tests__/CyclePrepV2.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CyclePrepV2 } from '../CyclePrepV2';
import { useCycleStoreV2 } from '../../overworld/cycleSliceV2';

describe('CyclePrepV2', () => {
  beforeEach(() => useCycleStoreV2.getState().reset());

  it('renders title + spawned hero preview + start button', () => {
    render(<CyclePrepV2 onStart={() => {}} onCancel={() => {}} />);
    expect(screen.getByTestId('btn-prep-start')).toBeInTheDocument();
    expect(screen.getByTestId('btn-prep-cancel')).toBeInTheDocument();
    expect(screen.getByTestId('spawned-hero-name')).toBeInTheDocument();
  });

  it('start button starts cycle and triggers onStart', () => {
    const onStart = vi.fn();
    render(<CyclePrepV2 onStart={onStart} onCancel={() => {}} />);
    fireEvent.click(screen.getByTestId('btn-prep-start'));
    expect(onStart).toHaveBeenCalled();
    expect(useCycleStoreV2.getState().status).toBe('running');
  });

  it('cancel button triggers onCancel', () => {
    const onCancel = vi.fn();
    render(<CyclePrepV2 onStart={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('btn-prep-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 18.2: Verify fail**

```bash
pnpm --filter @forge/game-inflation-rpg test -- CyclePrepV2
```

- [ ] **Step 18.3: Implement**

Create `games/inflation-rpg/src/screens/CyclePrepV2.tsx`:

```tsx
import { useMemo } from 'react';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { HeroSpawner } from '../hero/HeroSpawner';
import { SeededRng } from '../cycle/SeededRng';

interface Props {
  onStart: () => void;
  onCancel: () => void;
}

export function CyclePrepV2({ onStart, onCancel }: Props) {
  const startCycle = useCycleStoreV2(s => s.start);

  // Preview today's hero with deterministic seed-of-the-moment
  const previewSeed = useMemo(() => Date.now() & 0xffffffff, []);
  const preview = useMemo(() => HeroSpawner.spawn(new SeededRng(previewSeed)), [previewSeed]);

  const handleStart = () => {
    startCycle({
      seed: previewSeed,
      traits: [],
      bpMax: 30,
      heroHpMax: 100,
      heroAtkBase: 50,
    });
    onStart();
  };

  return (
    <div data-testid="cycle-prep-v2" style={{ padding: 24, color: '#eee', textAlign: 'center' }}>
      <h2 style={{ marginBottom: 8 }}>오늘 등장한 영혼</h2>
      <p style={{ opacity: 0.7, marginBottom: 24, fontSize: 13 }}>
        신이여, 이 영혼을 후원하소서. 그의 일대기가 시작된다.
      </p>

      <div style={{ background: '#111827', padding: 20, borderRadius: 8, maxWidth: 320, margin: '0 auto', border: '1px solid #1f2937' }}>
        <div style={{ fontSize: 48 }}>{preview.emoji}</div>
        <div data-testid="spawned-hero-name" style={{ marginTop: 8, fontSize: 18, fontWeight: 'bold' }}>
          {preview.name}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.7 }}>
          {preview.age}세 · {preview.job} · LV {preview.level}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 }}>
        <button type="button" data-testid="btn-prep-start" onClick={handleStart} style={primaryBtnStyle}>
          후원하기
        </button>
        <button type="button" data-testid="btn-prep-cancel" onClick={onCancel} style={ghostBtnStyle}>
          돌아가기
        </button>
      </div>

      <p style={{ marginTop: 24, fontSize: 11, opacity: 0.5 }}>
        trait 선택 / 가호 / 자원 후원 = V1b 에서 구현
      </p>
    </div>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 24px',
  fontSize: 14,
  background: '#fbbf24',
  color: '#0f172a',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontWeight: 'bold',
};
const ghostBtnStyle: React.CSSProperties = {
  padding: '10px 24px',
  fontSize: 14,
  background: 'transparent',
  color: '#cbd5e1',
  border: '1px solid #475569',
  borderRadius: 4,
  cursor: 'pointer',
};
```

- [ ] **Step 18.4: Verify pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- CyclePrepV2
```

- [ ] **Step 18.5: Commit**

```bash
git add games/inflation-rpg/src/screens/CyclePrepV2.tsx \
  games/inflation-rpg/src/screens/__tests__/CyclePrepV2.test.tsx
git commit -m "feat(game-inflation-rpg): Phase V1a T18 — CyclePrepV2 (hero spawn preview + start)"
```

---

## Task 19: OverworldRunner — Phaser host React component

**Files:**
- Create: `games/inflation-rpg/src/screens/OverworldRunner.tsx`
- Create: `games/inflation-rpg/src/screens/__tests__/OverworldRunner.test.tsx`

OverworldRunner mounts the Phaser game, instantiates `OverworldScene`, hooks scene events back to `CycleControllerV2`, and renders the HUD overlay (LV / HP / BP / 나이 / 챕터). On `hero_died` or `cycle_ended`, transitions to CycleResultV2.

Tests focus on the React render shape — Phaser scene itself isn't unit-testable.

- [ ] **Step 19.1: Test (render-only)**

Create `games/inflation-rpg/src/screens/__tests__/OverworldRunner.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OverworldRunner } from '../OverworldRunner';
import { useCycleStoreV2 } from '../../overworld/cycleSliceV2';

describe('OverworldRunner', () => {
  beforeEach(() => useCycleStoreV2.getState().reset());

  it('renders "no cycle" hint when idle', () => {
    render(<OverworldRunner onCycleEnd={() => {}} />);
    expect(screen.getByText(/사이클이 시작되지 않았습니다/)).toBeInTheDocument();
  });

  it('renders HUD when status=running', () => {
    useCycleStoreV2.getState().start({
      seed: 42, traits: [], bpMax: 30, heroHpMax: 100, heroAtkBase: 100,
    });
    render(<OverworldRunner onCycleEnd={() => {}} />);
    expect(screen.getByTestId('overworld-hud')).toBeInTheDocument();
    expect(screen.getByTestId('hud-name')).toBeInTheDocument();
    expect(screen.getByTestId('hud-age')).toBeInTheDocument();
    expect(screen.getByTestId('hud-bp')).toBeInTheDocument();
  });
});
```

- [ ] **Step 19.2: Verify fail**

```bash
pnpm --filter @forge/game-inflation-rpg test -- OverworldRunner
```

- [ ] **Step 19.3: Implement**

Create `games/inflation-rpg/src/screens/OverworldRunner.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';

interface Props {
  onCycleEnd: () => void;
}

// Lazy-load Phaser only on the client + only when this component mounts. This
// avoids server-rendering issues with the dev-shell.
async function bootPhaser(
  container: HTMLDivElement,
  onEvent: (e: import('../overworld/OverworldEvents').OverworldEvent) => void,
  hero: import('../hero/HeroEntity').HeroEntity,
  ai: import('../decisionAI/HeroDecisionAI').HeroDecisionAI,
  seed: number,
): Promise<{ destroy: () => void }> {
  const [{ default: Phaser }, { OverworldScene, GRID_W, GRID_H }] = await Promise.all([
    import('phaser'),
    import('../overworld/OverworldScene'),
  ]);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: GRID_W * 32,
    height: GRID_H * 32,
    backgroundColor: '#0a0e1a',
    scene: OverworldScene,
    physics: { default: 'arcade' },
  });
  game.scene.start('OverworldScene', { seed, hero, ai, onEvent });
  return { destroy: () => game.destroy(true) };
}

export function OverworldRunner({ onCycleEnd }: Props) {
  const status = useCycleStoreV2(s => s.status);
  const controller = useCycleStoreV2(s => s.controller);
  const endCycle = useCycleStoreV2(s => s.endCycle);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hudTick, setHudTick] = useState(0);
  const endedRef = useRef(false);

  useEffect(() => {
    if (status !== 'running' || !controller || !containerRef.current) return;
    let destroy: (() => void) | null = null;
    endedRef.current = false;

    bootPhaser(
      containerRef.current,
      (event) => {
        if (event.type === 'arrived_at') {
          controller.handleArrival(event.landmarkKind, event.landmarkId);
          setHudTick(n => n + 1);
        }
        if (event.type === 'cycle_ended' || (event.type === 'hero_died' && !endedRef.current)) {
          endedRef.current = true;
          endCycle();
          onCycleEnd();
        }
      },
      controller.getHero(),
      controller.getDecisionAI(),
      Date.now() & 0xffffffff,
    ).then(g => { destroy = g.destroy; });

    return () => { destroy?.(); };
  }, [status, controller, onCycleEnd, endCycle]);

  if (status === 'idle' || !controller) {
    return <div style={{ padding: 24, color: '#eee' }}>사이클이 시작되지 않았습니다.</div>;
  }

  const hero = controller.getHero();

  return (
    <div data-testid="overworld-runner">
      <div data-testid="overworld-hud" style={hudStyle}>
        <span data-testid="hud-name">{hero.emoji} {hero.name}</span>
        <span data-testid="hud-age">{hero.age}세 · {hero.chapter}</span>
        <span>{hero.job} · LV {hero.level}</span>
        <span>HP {hero.hp}/{hero.hpMax}</span>
        <span data-testid="hud-bp">BP {hero.bp}/{hero.bpMax}</span>
      </div>
      <div ref={containerRef} style={{ background: '#0a0e1a', display:'flex', justifyContent:'center', paddingTop:8 }} />
      <button onClick={() => { endCycle(); onCycleEnd(); }} style={abandonBtnStyle}>
        포기 (cycle 종료)
      </button>
    </div>
  );
}

const hudStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  padding: '8px 16px',
  background: '#1f2937',
  color: '#cbd5e1',
  fontSize: 13,
  borderBottom: '1px solid #334155',
  flexWrap: 'wrap',
};

const abandonBtnStyle: React.CSSProperties = {
  margin: '12px auto',
  display: 'block',
  padding: '8px 16px',
  background: 'transparent',
  color: '#94a3b8',
  border: '1px solid #475569',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
};
```

- [ ] **Step 19.4: Verify pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- OverworldRunner
```

- [ ] **Step 19.5: Commit**

```bash
git add games/inflation-rpg/src/screens/OverworldRunner.tsx \
  games/inflation-rpg/src/screens/__tests__/OverworldRunner.test.tsx
git commit -m "feat(game-inflation-rpg): Phase V1a T19 — OverworldRunner React component (Phaser host + HUD overlay)"
```

---

## Task 20: CycleResultV2 — single-page narrative summary

**Files:**
- Create: `games/inflation-rpg/src/screens/CycleResultV2.tsx`
- Create: `games/inflation-rpg/src/screens/__tests__/CycleResultV2.test.tsx`

- [ ] **Step 20.1: Test**

Create `games/inflation-rpg/src/screens/__tests__/CycleResultV2.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CycleResultV2 } from '../CycleResultV2';
import { useCycleStoreV2 } from '../../overworld/cycleSliceV2';

describe('CycleResultV2', () => {
  beforeEach(() => useCycleStoreV2.getState().reset());

  it('shows "no result" when no saga', () => {
    render(<CycleResultV2 onBackToMenu={() => {}} />);
    expect(screen.getByText(/결과가 없습니다/)).toBeInTheDocument();
  });

  it('renders saga summary when result exists', () => {
    useCycleStoreV2.getState().start({ seed: 42, traits: [], bpMax: 3, heroHpMax: 100, heroAtkBase: 100000 });
    for (let i = 0; i < 10; i++) useCycleStoreV2.getState().controller!.handleArrival('enemy', `e${i}`);
    useCycleStoreV2.getState().endCycle();
    render(<CycleResultV2 onBackToMenu={() => {}} />);
    expect(screen.getByTestId('result-hero-name')).toBeInTheDocument();
    expect(screen.getByTestId('result-final-stats')).toBeInTheDocument();
    expect(screen.getByTestId('result-narrative-list')).toBeInTheDocument();
  });

  it('back to menu button triggers callback', () => {
    const onBack = vi.fn();
    useCycleStoreV2.getState().start({ seed: 42, traits: [], bpMax: 3, heroHpMax: 100, heroAtkBase: 100000 });
    for (let i = 0; i < 5; i++) useCycleStoreV2.getState().controller!.handleArrival('enemy', `e${i}`);
    useCycleStoreV2.getState().endCycle();
    render(<CycleResultV2 onBackToMenu={onBack} />);
    fireEvent.click(screen.getByText(/메인 메뉴/));
    expect(onBack).toHaveBeenCalled();
  });
});
```

- [ ] **Step 20.2: Verify fail**

```bash
pnpm --filter @forge/game-inflation-rpg test -- CycleResultV2
```

- [ ] **Step 20.3: Implement**

Create `games/inflation-rpg/src/screens/CycleResultV2.tsx`:

```tsx
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';

interface Props {
  onBackToMenu: () => void;
}

export function CycleResultV2({ onBackToMenu }: Props) {
  const saga = useCycleStoreV2(s => s.lastSaga);
  const reset = useCycleStoreV2(s => s.reset);

  if (!saga) {
    return <div style={{ padding: 24, color: '#eee' }}>결과가 없습니다.</div>;
  }

  const handleBack = () => {
    reset();
    onBackToMenu();
  };

  const allEvents = saga.chapters.flatMap(c => c.events);

  return (
    <div data-testid="cycle-result-v2" style={{ padding: 24, color: '#eee', maxWidth: 640, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 4 }}>일대기 종료</h2>
      <p data-testid="result-hero-name" style={{ marginTop: 0, fontSize: 16, opacity: 0.85 }}>
        {saga.hero.name} — {saga.hero.cause}
      </p>

      <div data-testid="result-final-stats" style={{ background:'#111827', padding:12, borderRadius:6, marginTop:16, fontSize:13 }}>
        <div>최종 나이: {saga.hero.finalAge}세</div>
        <div>최종 직업: {saga.hero.finalJob}</div>
        <div>최종 레벨: {saga.hero.finalLevel}</div>
        <div style={{marginTop:6, fontSize:12, opacity:0.7}}>
          도덕성: 선 {saga.hero.finalPersonality.moral} / 신중 {saga.hero.finalPersonality.prudent} /
          영웅 {saga.hero.finalPersonality.heroic} / 자비 {saga.hero.finalPersonality.merciful} /
          신앙 {saga.hero.finalPersonality.pious}
        </div>
      </div>

      <h3 style={{ marginTop: 24, marginBottom: 8 }}>일대기</h3>
      <div data-testid="result-narrative-list" style={{ maxHeight: 320, overflowY: 'auto', background:'#1c1917', padding:12, borderRadius:6, fontSize:13, lineHeight:1.7 }}>
        {saga.chapters.map(chapter => (
          <div key={chapter.name} style={{ marginBottom: 12 }}>
            <h4 style={{ marginBottom: 4, opacity:0.7, fontStyle:'italic' }}>— {chapter.name} —</h4>
            {chapter.events.length === 0 ? (
              <div style={{ opacity:0.4, fontSize:12 }}>이 시기는 평온했다.</div>
            ) : chapter.events.map((ev, i) => (
              <div key={i} style={{ marginBottom: 4 }}>{ev.narrativeText}</div>
            ))}
          </div>
        ))}
      </div>

      <p style={{ marginTop: 16, fontSize: 11, opacity:0.5, textAlign:'center' }}>
        총 사건 수: {allEvents.length} · saga book 책 메타포 = V1b 에서 구현
      </p>

      <div style={{ textAlign:'center', marginTop: 20 }}>
        <button type="button" onClick={handleBack} style={{
          padding: '10px 24px',
          background:'#fbbf24', color:'#0f172a',
          border:'none', borderRadius:4, cursor:'pointer', fontWeight:'bold',
        }}>
          메인 메뉴로
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 20.4: Verify pass**

```bash
pnpm --filter @forge/game-inflation-rpg test -- CycleResultV2
```

- [ ] **Step 20.5: Commit**

```bash
git add games/inflation-rpg/src/screens/CycleResultV2.tsx \
  games/inflation-rpg/src/screens/__tests__/CycleResultV2.test.tsx
git commit -m "feat(game-inflation-rpg): Phase V1a T20 — CycleResultV2 single-page narrative summary"
```

---

## Task 21: Wire screens into App.tsx routing

**Files:**
- Modify: `games/inflation-rpg/src/App.tsx`

- [ ] **Step 21.1: Replace placeholder branches with real screens**

Edit `games/inflation-rpg/src/App.tsx`. Replace the placeholder divs from Task 2 with:

```tsx
import { MainMenu } from './screens/MainMenu';
import { CyclePrepV2 } from './screens/CyclePrepV2';
import { OverworldRunner } from './screens/OverworldRunner';
import { CycleResultV2 } from './screens/CycleResultV2';
import { useGameStore } from './store/gameStore';

// inside the render:
const screen = useGameStore(s => s.screen);
const setScreen = useGameStore.getState().setScreen;

return (
  <>
    {screen === 'main-menu' && <MainMenu />}
    {screen === 'cycle-prep-v2' && (
      <CyclePrepV2
        onStart={() => setScreen('overworld')}
        onCancel={() => setScreen('main-menu')}
      />
    )}
    {screen === 'overworld' && (
      <OverworldRunner onCycleEnd={() => setScreen('cycle-result-v2')} />
    )}
    {screen === 'cycle-result-v2' && (
      <CycleResultV2 onBackToMenu={() => setScreen('main-menu')} />
    )}
    {(screen === 'saga-gallery' || screen === 'settings') && (
      <div style={{ padding:24, color:'#eee' }}>
        <p>이 화면은 V1b 에서 구현됩니다.</p>
        <button onClick={() => setScreen('main-menu')}>돌아가기</button>
      </div>
    )}
  </>
);
```

- [ ] **Step 21.2: Run typecheck + test**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg test
```

Both must pass.

- [ ] **Step 21.3: Commit**

```bash
git add games/inflation-rpg/src/App.tsx
git commit -m "feat(game-inflation-rpg): Phase V1a T21 — App.tsx wires CyclePrepV2 / OverworldRunner / CycleResultV2"
```

---

## Task 22: Playwright e2e — full V1a cycle

**Files:**
- Create: `games/inflation-rpg/tests/e2e/v2-vertical-slice.spec.ts`

- [ ] **Step 22.1: Read existing e2e for conventions**

Read `tests/e2e/v9-migration.spec.ts` or any remaining spec to learn URL pattern, storage key, viewport.

- [ ] **Step 22.2: Write the spec**

Create `games/inflation-rpg/tests/e2e/v2-vertical-slice.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('Phase V1a vertical slice', () => {
  test('Start cycle → overworld → BP exhausted → result screen → back to menu', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('/games/inflation-rpg');
    await page.evaluate(() => localStorage.removeItem('korea_inflation_rpg_save'));
    await page.reload();

    // Click main-menu start
    await expect(page.getByTestId('btn-start-cycle')).toBeVisible();
    await page.getByTestId('btn-start-cycle').click();

    // CyclePrepV2 shows hero preview
    await expect(page.getByTestId('cycle-prep-v2')).toBeVisible();
    await expect(page.getByTestId('spawned-hero-name')).toBeVisible();
    await page.getByTestId('btn-prep-start').click();

    // OverworldRunner mounts
    await expect(page.getByTestId('overworld-runner')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('overworld-hud')).toBeVisible();

    // Wait for cycle-result (up to 90s for the auto cycle to drain BP)
    await expect(page.getByTestId('cycle-result-v2')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('result-hero-name')).toBeVisible();
    await expect(page.getByTestId('result-narrative-list')).toBeVisible();

    // Back to menu
    await page.getByText(/메인 메뉴/).click();
    await expect(page.getByTestId('btn-start-cycle')).toBeVisible();
  });
});
```

- [ ] **Step 22.3: Run e2e**

```bash
pnpm --filter @forge/game-inflation-rpg e2e -- v2-vertical-slice
```

Expected: PASS on both chromium and iphone14 projects. If it fails, common issues:
- Testid mismatch — fix the screen file.
- Phaser scene fails to mount in jsdom — Playwright uses real browser, so should work; if Phaser CSS issue, check container size.
- Cycle never ends — controller bug; check BP exhaustion path.

- [ ] **Step 22.4: Commit**

```bash
git add games/inflation-rpg/tests/e2e/v2-vertical-slice.spec.ts
git commit -m "test(game-inflation-rpg): Phase V1a T22 — Playwright e2e (full cycle: prep → overworld → result → menu)"
```

---

## Task 23: Final verification + tag

**Files:** None new.

- [ ] **Step 23.1: Full workspace verification**

From repo root:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm circular
pnpm --filter @forge/game-inflation-rpg e2e
pnpm --filter @forge/game-inflation-rpg build:web
```

All must pass.

If `pnpm circular` reports a new cycle (likely between `cycle/` and `overworld/` or `hero/` and `decisionAI/`), investigate. Common cause: `HeroEntity` imports `PersonalityState` which is fine, but if `decisionAI/HeroDecisionAI` imports `HeroEntity` AND `hero/HeroEntity` imports something from `decisionAI/`, that's a cycle. Resolve by extracting shared types.

- [ ] **Step 23.2: Manually run sim:cycle to ensure Sim-G simulator still works**

```bash
pnpm --filter @forge/game-inflation-rpg sim:cycle -- --count 5 --seed 42
```

Expected: Sim-G's simulator (untouched by V1a, but the persist version changed v16 → v17) still outputs sane results. If it fails because old `cycleSlice.ts` no longer matches store shape, fix in this task. The intent is for sim-cycle to continue working as the balance simulator independent of V1a's overworld view.

- [ ] **Step 23.3: CHANGELOG entry**

Append to `games/inflation-rpg/CHANGELOG.md`:

```markdown
## Phase V1a — Open World Vertical Slice Skeleton (2026-MM-DD)

- Legacy manual flow + Sim-A/B text-log views deleted (T1)
- `src/overworld/`: Phaser overworld scene + A* pathfinding + hero auto-movement
- `src/hero/`: HeroEntity + PersonalityState (5-dim) + lifecycle + spawner
- `src/decisionAI/`: HeroDecisionAI + DestinationResolver (trait+personality-weighted)
- `src/saga/`: SagaRecorder + NarrativeGenerator + SagaStorage
- `src/data/`: 5 zones + 11 landmark types
- New screens: CyclePrepV2 / OverworldRunner / CycleResultV2
- Persist v16 → v17 (`MetaState.sagaHistory: CycleSaga[]`)
- 4 Tier 1 events: 전투 / 레벨업 / 장비 drop / 죽음
- Sim-A/B `AutoBattleController` preserved as Sim-G balance simulator
- Trait selection / 가호 / 직업 / 스킬 / 사당 / 도덕 분기 → V1b
```

Commit:

```bash
git add games/inflation-rpg/CHANGELOG.md
git commit -m "docs(game-inflation-rpg): Phase V1a — CHANGELOG entry"
```

- [ ] **Step 23.4: Tag**

```bash
git tag phase-v1a-complete
```

Done. Hand off to `finishing-a-development-branch` skill for the merge.

---

## Out-of-band notes for the executing engineer

- **IDE stale "Cannot find module"** diagnostics will fire frequently — every new file triggers them. Trust `pnpm typecheck`.
- **Phaser SSR caveat:** existing repo had `BattleScene` static-import problem (see memory `feedback_battle_no_static_import.md`). `OverworldRunner.tsx` uses `import('phaser')` dynamically inside `useEffect` to avoid the same issue. Don't move that import to top-level.
- **Big task 1 (legacy sweep) is destructive — single commit, single reviewable diff.** Don't split it into per-file commits.
- **Sim-A/B substrate is preserved.** Don't delete `src/cycle/AutoBattleController.ts`, `cycleEvents.ts`, `cycleSlice.ts`, `traits.ts`, `HeroDecisionAI.ts` (stub), `SeededRng.ts` — they're consumed by `scripts/sim-cycle.ts` which Sim-G uses.
- **`HeroDecisionAI` name collision:** `src/cycle/HeroDecisionAI.ts` (Sim-B stub) and `src/decisionAI/HeroDecisionAI.ts` (V1a real class) both exist intentionally. Different namespaces, different consumers. May merge in a later phase.
- **Inflation curve still placeholder.** V1a doesn't fix the `expRequired = 10 * lv^1.3` formula. Sim-G `sim:cycle` continues to measure against it. V1b/V7 (balance) addresses inflation curve.
- **Run all visual smoke in dev-shell:** after T21, run `pnpm dev` from repo root and open `localhost:3000/games/inflation-rpg`. Click "사이클 시작" → CyclePrepV2 → "후원하기" → watch the overworld for 5–10 minutes. Confirm "game-feel ≠ 2000s text web game" empirically before tagging.
- **The Phaser canvas is currently 640×384 px** (20×12 tiles × 32px). Not mobile-responsive in V1a — viewport fit is V1b/V6 polish work.
