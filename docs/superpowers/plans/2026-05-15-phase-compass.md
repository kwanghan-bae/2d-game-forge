# Phase Compass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** inflation-rpg 에 차원 나침반 (Compass) 시스템을 도입한다 — mini-boss/major-boss 첫 처치 시 던전별 1/2차 나침반 획득 + 모든 mini 처치 시 범우주 자동 부여. Town 의 단일 [던전 입장] 버튼 → 추첨 modal 흐름으로 던전 선택 UX 를 전환한다.

**Architecture:** 독립 모듈 — `data/compass.ts` (정적 데이터 + EMPTY_COMPASS_OWNED) + `systems/compass.ts` (pure functions: award/query/pick) + store actions wrap + BattleScene 4-line hook + UI 3개 파일 (Town 단순화 / DungeonPickModal 신규 / Relics tab 확장). Persist v12 migration.

**Tech Stack:** TypeScript, Zustand 5 (persist middleware), React 19, Vitest, Playwright. Phase E `systems/relics.ts` / `systems/ads.ts` 컨벤션 차용.

**Spec:** `docs/superpowers/specs/2026-05-15-phase-compass-design.md` (commit `2bb48d8`)

---

## File Structure

**Create:**
- `games/inflation-rpg/src/data/compass.ts` — COMPASS_ITEMS (7), ALL_COMPASS_IDS, EMPTY_COMPASS_OWNED, getCompassByDungeon
- `games/inflation-rpg/src/data/compass.test.ts` — 데이터 무결성
- `games/inflation-rpg/src/systems/compass.ts` — award / query / pick pure functions
- `games/inflation-rpg/src/systems/compass.test.ts` — 함수별 unit tests
- `games/inflation-rpg/src/screens/DungeonPickModal.tsx` — 추첨 modal + 자유선택 override
- `games/inflation-rpg/src/screens/DungeonPickModal.test.tsx` — render branch tests
- `games/inflation-rpg/tests/e2e/compass-flow.spec.ts` — 추첨 + 자유선택 e2e (4 logical)

**Modify:**
- `games/inflation-rpg/src/types.ts` — CompassId / CompassEntry / MetaState 3 fields 추가
- `games/inflation-rpg/src/store/gameStore.ts` — STORE_VERSION 12, migrateV11ToV12, INITIAL_META 3 fields, 4 actions
- `games/inflation-rpg/src/store/gameStore.test.ts` — actions / migration / ascend preservation
- `games/inflation-rpg/src/battle/BattleScene.ts` — `getBossType` 직후 4-line award hook
- `games/inflation-rpg/src/screens/Town.tsx` — 던전 그리드 제거 + 단일 [던전 입장] 버튼 + modal mount
- `games/inflation-rpg/src/screens/Town.test.tsx` — 신 UI 검증
- `games/inflation-rpg/src/screens/Relics.tsx` — 3-tab (stack / mythic / compass)
- `games/inflation-rpg/tests/e2e/dungeon-flow.spec.ts` — `town-dungeon-*` testid 제거 + modal 경유로 update
- `games/inflation-rpg/tests/e2e/v9-migration.spec.ts` — v12 chain 검증 추가
- `games/inflation-rpg/tools/balance-sim.ts` — compass regression seed (1 line)

**Total impact: ~15 files** (8 신규 + 7 수정).

---

## Conventions (참고)

- Pure function return = `Partial<MetaState> | null` (Phase E `awardMilestoneMythic` 모델)
- Korean prose ~다체. 코드 + commit message 영어
- `data-testid` kebab-case. Phase E `relic-row` / `mythic-row` 컨벤션
- Migration step = `if (fromVersion <= N && s.meta) { ... default 주입 }` 패턴
- Commit prefix = `feat(game-inflation-rpg)` / `test(game-inflation-rpg)` / `fix(game-inflation-rpg)`
- 각 task 끝에 `pnpm --filter @forge/game-inflation-rpg typecheck` + `pnpm --filter @forge/game-inflation-rpg test` 통과 후 commit

---

## Task 1: Data Model — Types + COMPASS_ITEMS

**Files:**
- Modify: `games/inflation-rpg/src/types.ts`
- Create: `games/inflation-rpg/src/data/compass.ts`
- Test: `games/inflation-rpg/src/data/compass.test.ts`

- [ ] **Step 1: types.ts 에 CompassId / CompassEntry / MetaState fields 추가**

Modify `games/inflation-rpg/src/types.ts` — find the Phase E `RelicId` block (~line 243-251) and add **after** the `MythicEffectType` definition:

```typescript
// Phase Compass — 차원 나침반
export type CompassId =
  | 'plains_first'    | 'plains_second'
  | 'forest_first'    | 'forest_second'
  | 'mountains_first' | 'mountains_second'
  | 'omni';

export interface CompassEntry {
  id: CompassId;
  dungeonId: string | null;     // null = omni (모든 던전)
  tier: 0 | 1 | 2;              // 0 = omni, 1 = mini-boss, 2 = major-boss
  emoji: string;
  nameKR: string;
  descriptionKR: string;
}
```

Then add to the `MetaState` interface (around line 222 just after `adsWatched`):

```typescript
  // Phase Compass — 차원 나침반
  compassOwned: Record<CompassId, boolean>;
  dungeonMiniBossesCleared: string[];   // mini-boss 첫 처치 누적
  dungeonMajorBossesCleared: string[];  // major-boss 첫 처치 누적
```

- [ ] **Step 2: data/compass.ts 작성**

Create `games/inflation-rpg/src/data/compass.ts`:

```typescript
import type { CompassId, CompassEntry } from '../types';

export const COMPASS_ITEMS: Record<CompassId, CompassEntry> = {
  plains_first:    { id: 'plains_first',     dungeonId: 'plains',     tier: 1, emoji: '🧭', nameKR: '평야 나침반 1차',   descriptionKR: '평야 던전 추첨 가중치 ×3' },
  plains_second:   { id: 'plains_second',    dungeonId: 'plains',     tier: 2, emoji: '🗺️', nameKR: '평야 나침반 2차',   descriptionKR: '평야 던전 자유 선택' },
  forest_first:    { id: 'forest_first',     dungeonId: 'forest',     tier: 1, emoji: '🧭', nameKR: '깊은숲 나침반 1차', descriptionKR: '깊은숲 던전 추첨 가중치 ×3' },
  forest_second:   { id: 'forest_second',    dungeonId: 'forest',     tier: 2, emoji: '🗺️', nameKR: '깊은숲 나침반 2차', descriptionKR: '깊은숲 던전 자유 선택' },
  mountains_first: { id: 'mountains_first',  dungeonId: 'mountains',  tier: 1, emoji: '🧭', nameKR: '산악 나침반 1차',   descriptionKR: '산악 던전 추첨 가중치 ×3' },
  mountains_second:{ id: 'mountains_second', dungeonId: 'mountains',  tier: 2, emoji: '🗺️', nameKR: '산악 나침반 2차',   descriptionKR: '산악 던전 자유 선택' },
  omni:            { id: 'omni',             dungeonId: null,         tier: 0, emoji: '🌌', nameKR: '범우주 나침반',    descriptionKR: '모든 던전 자유 선택' },
};

export const ALL_COMPASS_IDS: ReadonlyArray<CompassId> = Object.keys(COMPASS_ITEMS) as CompassId[];

export const EMPTY_COMPASS_OWNED: Record<CompassId, boolean> = {
  plains_first: false,    plains_second: false,
  forest_first: false,    forest_second: false,
  mountains_first: false, mountains_second: false,
  omni: false,
};

export function getCompassByDungeon(dungeonId: string, tier: 1 | 2): CompassId {
  return `${dungeonId}_${tier === 1 ? 'first' : 'second'}` as CompassId;
}
```

- [ ] **Step 3: data/compass.test.ts 작성 (failing 상태)**

Create `games/inflation-rpg/src/data/compass.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { COMPASS_ITEMS, ALL_COMPASS_IDS, EMPTY_COMPASS_OWNED, getCompassByDungeon } from './compass';

describe('COMPASS_ITEMS data integrity', () => {
  it('contains exactly 7 entries (3 dungeons × 2 + omni)', () => {
    expect(ALL_COMPASS_IDS.length).toBe(7);
  });

  it('each non-omni entry has matching dungeonId and tier', () => {
    expect(COMPASS_ITEMS.plains_first.dungeonId).toBe('plains');
    expect(COMPASS_ITEMS.plains_first.tier).toBe(1);
    expect(COMPASS_ITEMS.plains_second.tier).toBe(2);
    expect(COMPASS_ITEMS.forest_first.dungeonId).toBe('forest');
    expect(COMPASS_ITEMS.mountains_second.dungeonId).toBe('mountains');
  });

  it('omni has dungeonId null and tier 0', () => {
    expect(COMPASS_ITEMS.omni.dungeonId).toBeNull();
    expect(COMPASS_ITEMS.omni.tier).toBe(0);
  });

  it('all entries have non-empty nameKR + descriptionKR + emoji', () => {
    for (const id of ALL_COMPASS_IDS) {
      const entry = COMPASS_ITEMS[id];
      expect(entry.nameKR.length).toBeGreaterThan(0);
      expect(entry.descriptionKR.length).toBeGreaterThan(0);
      expect(entry.emoji.length).toBeGreaterThan(0);
    }
  });
});

describe('EMPTY_COMPASS_OWNED', () => {
  it('has same keys as COMPASS_ITEMS, all false', () => {
    expect(Object.keys(EMPTY_COMPASS_OWNED).sort()).toEqual([...ALL_COMPASS_IDS].sort());
    for (const id of ALL_COMPASS_IDS) {
      expect(EMPTY_COMPASS_OWNED[id]).toBe(false);
    }
  });
});

describe('getCompassByDungeon', () => {
  it('returns first-tier id when tier=1', () => {
    expect(getCompassByDungeon('plains', 1)).toBe('plains_first');
    expect(getCompassByDungeon('forest', 1)).toBe('forest_first');
  });

  it('returns second-tier id when tier=2', () => {
    expect(getCompassByDungeon('plains', 2)).toBe('plains_second');
    expect(getCompassByDungeon('mountains', 2)).toBe('mountains_second');
  });
});
```

- [ ] **Step 4: Typecheck + tests 통과 확인**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg test src/data/compass.test.ts
```
Expected: typecheck 0 errors, 7+ tests pass.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/types.ts \
        games/inflation-rpg/src/data/compass.ts \
        games/inflation-rpg/src/data/compass.test.ts
git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): Phase Compass data model + COMPASS_ITEMS

types.ts + data/compass.ts + tests. 7 entries (3 dungeons × 2 + omni).
EMPTY_COMPASS_OWNED + getCompassByDungeon helper. MetaState 3 fields
(compassOwned, dungeonMiniBossesCleared, dungeonMajorBossesCleared) —
INITIAL_META / migration 은 다음 task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Systems Layer — Award Functions

**Files:**
- Create: `games/inflation-rpg/src/systems/compass.ts`
- Test: `games/inflation-rpg/src/systems/compass.test.ts`

- [ ] **Step 1: 실패하는 award tests 작성**

Create `games/inflation-rpg/src/systems/compass.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { awardMiniBossCompass, awardMajorBossCompass } from './compass';
import { EMPTY_COMPASS_OWNED } from '../data/compass';
import type { MetaState } from '../types';

function baseMeta(): MetaState {
  return {
    compassOwned: { ...EMPTY_COMPASS_OWNED },
    dungeonMiniBossesCleared: [],
    dungeonMajorBossesCleared: [],
  } as unknown as MetaState;
}

describe('awardMiniBossCompass', () => {
  it('first call returns patch with compassOwned[<id>_first] + cleared list updated', () => {
    const m = baseMeta();
    const patch = awardMiniBossCompass(m, 'plains');
    expect(patch).not.toBeNull();
    expect(patch!.compassOwned!.plains_first).toBe(true);
    expect(patch!.dungeonMiniBossesCleared).toEqual(['plains']);
  });

  it('returns null on idempotent re-call', () => {
    const m = baseMeta();
    m.dungeonMiniBossesCleared = ['plains'];
    expect(awardMiniBossCompass(m, 'plains')).toBeNull();
  });

  it('triggers omni when all 3 dungeons cleared', () => {
    const m = baseMeta();
    m.dungeonMiniBossesCleared = ['plains', 'forest'];
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, plains_first: true, forest_first: true };
    const patch = awardMiniBossCompass(m, 'mountains');
    expect(patch).not.toBeNull();
    expect(patch!.compassOwned!.omni).toBe(true);
    expect(patch!.compassOwned!.mountains_first).toBe(true);
    expect(patch!.dungeonMiniBossesCleared).toEqual(['plains', 'forest', 'mountains']);
  });

  it('does not set omni when only 2/3 cleared', () => {
    const m = baseMeta();
    const patch = awardMiniBossCompass(m, 'plains');
    expect(patch!.compassOwned!.omni).toBeUndefined();
  });
});

describe('awardMajorBossCompass', () => {
  it('first call returns patch with compassOwned[<id>_second] + cleared list updated', () => {
    const m = baseMeta();
    const patch = awardMajorBossCompass(m, 'forest');
    expect(patch).not.toBeNull();
    expect(patch!.compassOwned!.forest_second).toBe(true);
    expect(patch!.dungeonMajorBossesCleared).toEqual(['forest']);
  });

  it('returns null on idempotent re-call', () => {
    const m = baseMeta();
    m.dungeonMajorBossesCleared = ['forest'];
    expect(awardMajorBossCompass(m, 'forest')).toBeNull();
  });

  it('does not affect omni regardless of major-boss progress', () => {
    const m = baseMeta();
    m.dungeonMajorBossesCleared = ['plains', 'forest'];
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, plains_second: true, forest_second: true };
    const patch = awardMajorBossCompass(m, 'mountains');
    expect(patch!.compassOwned!.omni).toBeUndefined();
  });
});
```

- [ ] **Step 2: Tests 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test src/systems/compass.test.ts
```
Expected: FAIL with "Cannot find module './compass'" or similar.

- [ ] **Step 3: systems/compass.ts award 함수 구현**

Create `games/inflation-rpg/src/systems/compass.ts`:

```typescript
import { DUNGEONS } from '../data/dungeons';
import { getCompassByDungeon } from '../data/compass';
import type { MetaState } from '../types';

export function awardMiniBossCompass(
  meta: MetaState,
  dungeonId: string
): Partial<MetaState> | null {
  if (meta.dungeonMiniBossesCleared.includes(dungeonId)) return null;
  const compassId = getCompassByDungeon(dungeonId, 1);
  const newCleared = [...meta.dungeonMiniBossesCleared, dungeonId];
  const allClear = newCleared.length >= DUNGEONS.length;
  return {
    compassOwned: {
      ...meta.compassOwned,
      [compassId]: true,
      ...(allClear ? { omni: true } : {}),
    },
    dungeonMiniBossesCleared: newCleared,
  };
}

export function awardMajorBossCompass(
  meta: MetaState,
  dungeonId: string
): Partial<MetaState> | null {
  if (meta.dungeonMajorBossesCleared.includes(dungeonId)) return null;
  const compassId = getCompassByDungeon(dungeonId, 2);
  return {
    compassOwned: {
      ...meta.compassOwned,
      [compassId]: true,
    },
    dungeonMajorBossesCleared: [...meta.dungeonMajorBossesCleared, dungeonId],
  };
}
```

- [ ] **Step 4: Tests 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test src/systems/compass.test.ts
```
Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/systems/compass.ts \
        games/inflation-rpg/src/systems/compass.test.ts
git commit -m "feat(game-inflation-rpg): Phase Compass award functions (mini/major + omni trigger)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Systems Layer — Query + Picker

**Files:**
- Modify: `games/inflation-rpg/src/systems/compass.ts`
- Modify: `games/inflation-rpg/src/systems/compass.test.ts`

- [ ] **Step 1: 실패하는 query/pick tests 추가**

Append to `games/inflation-rpg/src/systems/compass.test.ts`:

```typescript
import { getDungeonWeight, canFreeSelect, hasAnyFreeSelect, pickRandomDungeon } from './compass';
import { DUNGEONS } from '../data/dungeons';

describe('getDungeonWeight', () => {
  it('returns 3 when first-tier compass owned', () => {
    const m = baseMeta();
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, plains_first: true };
    expect(getDungeonWeight(m, 'plains')).toBe(3);
  });

  it('returns 1 when first-tier compass not owned', () => {
    const m = baseMeta();
    expect(getDungeonWeight(m, 'forest')).toBe(1);
  });

  it('second-tier owned alone yields weight 1 (no weight boost)', () => {
    const m = baseMeta();
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, plains_second: true };
    expect(getDungeonWeight(m, 'plains')).toBe(1);
  });
});

describe('canFreeSelect', () => {
  it('true when omni owned (any dungeon)', () => {
    const m = baseMeta();
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, omni: true };
    expect(canFreeSelect(m, 'plains')).toBe(true);
    expect(canFreeSelect(m, 'forest')).toBe(true);
  });

  it('true when second-tier owned for that dungeon only', () => {
    const m = baseMeta();
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, plains_second: true };
    expect(canFreeSelect(m, 'plains')).toBe(true);
    expect(canFreeSelect(m, 'forest')).toBe(false);
  });

  it('false when nothing owned', () => {
    const m = baseMeta();
    expect(canFreeSelect(m, 'plains')).toBe(false);
  });
});

describe('hasAnyFreeSelect', () => {
  it('true when omni owned', () => {
    const m = baseMeta();
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, omni: true };
    expect(hasAnyFreeSelect(m)).toBe(true);
  });

  it('true when any second-tier owned', () => {
    const m = baseMeta();
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, forest_second: true };
    expect(hasAnyFreeSelect(m)).toBe(true);
  });

  it('false when only first-tier owned', () => {
    const m = baseMeta();
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, plains_first: true, forest_first: true };
    expect(hasAnyFreeSelect(m)).toBe(false);
  });

  it('false when nothing owned', () => {
    const m = baseMeta();
    expect(hasAnyFreeSelect(m)).toBe(false);
  });
});

describe('pickRandomDungeon', () => {
  it('returns a dungeon id from the input list', () => {
    const m = baseMeta();
    const id = pickRandomDungeon(m, DUNGEONS, () => 0.5);
    expect(DUNGEONS.map(d => d.id)).toContain(id);
  });

  it('seeded rng=0 picks first dungeon (uniform weights)', () => {
    const m = baseMeta();
    expect(pickRandomDungeon(m, DUNGEONS, () => 0)).toBe(DUNGEONS[0]!.id);
  });

  it('seeded rng=0.99 picks last dungeon (uniform weights)', () => {
    const m = baseMeta();
    expect(pickRandomDungeon(m, DUNGEONS, () => 0.99)).toBe(DUNGEONS[2]!.id);
  });

  it('weight=3 dungeon dominates distribution over 10000 samples', () => {
    const m = baseMeta();
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, plains_first: true };
    // weights: plains=3, forest=1, mountains=1 → plains expected ~3/5 = 60%
    const counts: Record<string, number> = { plains: 0, forest: 0, mountains: 0 };
    let seed = 1;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 10000; i++) {
      const id = pickRandomDungeon(m, DUNGEONS, rng);
      counts[id]!++;
    }
    expect(counts.plains! / 10000).toBeGreaterThan(0.55);
    expect(counts.plains! / 10000).toBeLessThan(0.65);
    expect(counts.forest! / 10000).toBeGreaterThan(0.15);
    expect(counts.mountains! / 10000).toBeGreaterThan(0.15);
  });
});
```

- [ ] **Step 2: Tests 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test src/systems/compass.test.ts
```
Expected: FAIL with "is not a function" or similar (4 new functions undefined).

- [ ] **Step 3: query + picker 구현**

Append to `games/inflation-rpg/src/systems/compass.ts`:

```typescript
import { COMPASS_ITEMS, ALL_COMPASS_IDS } from '../data/compass';
import type { Dungeon } from '../types';

export function getDungeonWeight(meta: MetaState, dungeonId: string): number {
  return meta.compassOwned[getCompassByDungeon(dungeonId, 1)] ? 3 : 1;
}

export function canFreeSelect(meta: MetaState, dungeonId: string): boolean {
  return meta.compassOwned.omni || meta.compassOwned[getCompassByDungeon(dungeonId, 2)];
}

export function hasAnyFreeSelect(meta: MetaState): boolean {
  if (meta.compassOwned.omni) return true;
  return ALL_COMPASS_IDS.some(
    (id) => COMPASS_ITEMS[id].tier === 2 && meta.compassOwned[id]
  );
}

export function pickRandomDungeon(
  meta: MetaState,
  dungeons: readonly Dungeon[],
  rng: () => number = Math.random
): string {
  const weights = dungeons.map((d) => getDungeonWeight(meta, d.id));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < dungeons.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return dungeons[i]!.id;
  }
  return dungeons[dungeons.length - 1]!.id;
}
```

Note: ensure the existing `import { DUNGEONS } from '../data/dungeons'` line is preserved at the top. The new `import { COMPASS_ITEMS, ALL_COMPASS_IDS } from '../data/compass'` consolidates with the existing `getCompassByDungeon` import (refactor that single import line to include the additions).

- [ ] **Step 4: Tests 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test src/systems/compass.test.ts
```
Expected: 7 + 12 = 19 tests pass.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/systems/compass.ts \
        games/inflation-rpg/src/systems/compass.test.ts
git commit -m "feat(game-inflation-rpg): Phase Compass query + weighted picker

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Persist v12 Migration + INITIAL_META

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts`
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts`

- [ ] **Step 1: 실패하는 migration test 작성**

Append to `games/inflation-rpg/src/store/gameStore.test.ts` (within an appropriate `describe`):

```typescript
describe('Phase Compass — v12 migration', () => {
  it('runStoreMigration injects compassOwned + cleared lists from v8 envelope', () => {
    const v8Persisted = {
      meta: {
        inventory: { weapons: [], armors: [], accessories: [] },
      },
    };
    const migrated = runStoreMigration(v8Persisted, 8) as { meta: any };
    expect(migrated.meta.compassOwned).toBeDefined();
    expect(migrated.meta.compassOwned.plains_first).toBe(false);
    expect(migrated.meta.compassOwned.omni).toBe(false);
    expect(migrated.meta.dungeonMiniBossesCleared).toEqual([]);
    expect(migrated.meta.dungeonMajorBossesCleared).toEqual([]);
  });

  it('runStoreMigration preserves existing compass data from v12 envelope', () => {
    const v12Persisted = {
      meta: {
        inventory: { weapons: [], armors: [], accessories: [] },
        compassOwned: { plains_first: true, plains_second: false, forest_first: false, forest_second: false, mountains_first: false, mountains_second: false, omni: false },
        dungeonMiniBossesCleared: ['plains'],
        dungeonMajorBossesCleared: [],
      },
    };
    const migrated = runStoreMigration(v12Persisted, 12) as { meta: any };
    expect(migrated.meta.compassOwned.plains_first).toBe(true);
    expect(migrated.meta.dungeonMiniBossesCleared).toEqual(['plains']);
  });
});
```

(Ensure `runStoreMigration` is exported from `gameStore.ts` — it already is per existing tests.)

- [ ] **Step 2: Test 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test src/store/gameStore.test.ts -t "v12 migration"
```
Expected: FAIL — `compassOwned` undefined.

- [ ] **Step 3: INITIAL_META 업데이트 + migration step 추가 + STORE_VERSION bump**

In `games/inflation-rpg/src/store/gameStore.ts`:

1. **INITIAL_META** — find the constant (search for `INITIAL_META`) and add to the meta object:

```typescript
  compassOwned: { ...EMPTY_COMPASS_OWNED },
  dungeonMiniBossesCleared: [],
  dungeonMajorBossesCleared: [],
```

Place these near the other Phase E fields (relicStacks etc.).

2. **Import** at the top of the file:

```typescript
import { EMPTY_COMPASS_OWNED } from '../data/compass';
```

3. **Migration step** — find the v10→v11 step in `runStoreMigration` (around line 355) and **append** right after it:

```typescript
  // v11 → v12: Phase Compass — compass owned + dungeon clear tracking
  if (fromVersion <= 11 && s.meta) {
    const m = s.meta as MetaState;
    m.compassOwned                = m.compassOwned                ?? { ...EMPTY_COMPASS_OWNED };
    m.dungeonMiniBossesCleared    = m.dungeonMiniBossesCleared    ?? [];
    m.dungeonMajorBossesCleared   = m.dungeonMajorBossesCleared   ?? [];
  }
```

4. **STORE_VERSION** — find `version: 11` (line 1048) and change to `version: 12`.

- [ ] **Step 4: Test 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg test src/store/gameStore.test.ts
```
Expected: typecheck 0 errors, all gameStore tests pass (new v12 tests + all existing).

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts \
        games/inflation-rpg/src/store/gameStore.test.ts
git commit -m "feat(game-inflation-rpg): Phase Compass persist v12 migration

STORE_VERSION 11→12. INITIAL_META 3 fields + migrateV11ToV12 step.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Store Actions

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts`
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts`

- [ ] **Step 1: 실패하는 action tests 작성**

Append to `gameStore.test.ts`:

```typescript
describe('Phase Compass — store actions', () => {
  beforeEach(() => {
    useGameStore.setState({
      run: { ...INITIAL_RUN },
      meta: { ...INITIAL_META },
    });
  });

  it('awardMiniBossCompass adds compass and updates cleared list', () => {
    useGameStore.getState().awardMiniBossCompass('plains');
    const meta = useGameStore.getState().meta;
    expect(meta.compassOwned.plains_first).toBe(true);
    expect(meta.dungeonMiniBossesCleared).toEqual(['plains']);
  });

  it('awardMiniBossCompass is idempotent', () => {
    useGameStore.getState().awardMiniBossCompass('plains');
    useGameStore.getState().awardMiniBossCompass('plains');
    expect(useGameStore.getState().meta.dungeonMiniBossesCleared).toEqual(['plains']);
  });

  it('awardMiniBossCompass triggers omni on full mini-boss clear', () => {
    const s = useGameStore.getState();
    s.awardMiniBossCompass('plains');
    s.awardMiniBossCompass('forest');
    s.awardMiniBossCompass('mountains');
    expect(useGameStore.getState().meta.compassOwned.omni).toBe(true);
  });

  it('awardMajorBossCompass adds compass and updates cleared list', () => {
    useGameStore.getState().awardMajorBossCompass('forest');
    const meta = useGameStore.getState().meta;
    expect(meta.compassOwned.forest_second).toBe(true);
    expect(meta.dungeonMajorBossesCleared).toEqual(['forest']);
  });

  it('pickAndSelectDungeon sets run.currentDungeonId', () => {
    const id = useGameStore.getState().pickAndSelectDungeon();
    expect(['plains', 'forest', 'mountains']).toContain(id);
    expect(useGameStore.getState().run.currentDungeonId).toBe(id);
  });

  it('selectDungeonFree sets dungeonId when compass owned', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, compassOwned: { ...s.meta.compassOwned, forest_second: true } },
    }));
    useGameStore.getState().selectDungeonFree('forest');
    expect(useGameStore.getState().run.currentDungeonId).toBe('forest');
  });

  it('selectDungeonFree is noop when no compass for that dungeon', () => {
    useGameStore.setState((s) => ({ run: { ...s.run, currentDungeonId: null } }));
    useGameStore.getState().selectDungeonFree('plains');
    expect(useGameStore.getState().run.currentDungeonId).toBe(null);
  });

  it('selectDungeonFree allows any dungeon when omni owned', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, compassOwned: { ...s.meta.compassOwned, omni: true } },
    }));
    useGameStore.getState().selectDungeonFree('mountains');
    expect(useGameStore.getState().run.currentDungeonId).toBe('mountains');
  });
});
```

- [ ] **Step 2: Tests 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test src/store/gameStore.test.ts -t "Phase Compass — store actions"
```
Expected: FAIL — `awardMiniBossCompass is not a function`.

- [ ] **Step 3: 4 actions 구현 in gameStore.ts**

Add to the `GameStore` interface (search for type definitions of existing actions — likely around lines 100-180):

```typescript
  awardMiniBossCompass: (dungeonId: string) => void;
  awardMajorBossCompass: (dungeonId: string) => void;
  pickAndSelectDungeon: () => string;
  selectDungeonFree: (dungeonId: string) => void;
```

Add to the store implementation (within the `create(persist((set, get) => ({...})))` body):

```typescript
      awardMiniBossCompass: (dungeonId) =>
        set((s) => {
          const patch = awardMiniBossCompassSystem(s.meta, dungeonId);
          return patch ? { meta: { ...s.meta, ...patch } } : {};
        }),

      awardMajorBossCompass: (dungeonId) =>
        set((s) => {
          const patch = awardMajorBossCompassSystem(s.meta, dungeonId);
          return patch ? { meta: { ...s.meta, ...patch } } : {};
        }),

      pickAndSelectDungeon: () => {
        const id = pickRandomDungeon(get().meta, DUNGEONS);
        get().selectDungeon(id);
        return id;
      },

      selectDungeonFree: (dungeonId) => {
        if (!canFreeSelect(get().meta, dungeonId)) {
          console.warn('selectDungeonFree denied: no compass for', dungeonId);
          return;
        }
        get().selectDungeon(dungeonId);
      },
```

Add imports at top of `gameStore.ts`:

```typescript
import { DUNGEONS } from '../data/dungeons';
import {
  awardMiniBossCompass as awardMiniBossCompassSystem,
  awardMajorBossCompass as awardMajorBossCompassSystem,
  canFreeSelect,
  pickRandomDungeon,
} from '../systems/compass';
```

(If `DUNGEONS` is already imported elsewhere — e.g. in adjacent code — don't duplicate.)

- [ ] **Step 4: Tests 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg test src/store/gameStore.test.ts
```
Expected: typecheck 0, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts \
        games/inflation-rpg/src/store/gameStore.test.ts
git commit -m "feat(game-inflation-rpg): Phase Compass store actions (award + pick + free-select)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Ascend Preserves Compass Data

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts`

- [ ] **Step 1: 실패할 수 있는 ascend preservation test 작성**

Append to `gameStore.test.ts`:

```typescript
describe('Phase Compass — ascend preserves compass + cleared lists', () => {
  it('keeps compassOwned / dungeonMini/MajorBossesCleared after ascend', () => {
    // Seed: meet ascend prereqs + own compass
    useGameStore.setState((s) => ({
      run: { ...INITIAL_RUN },
      meta: {
        ...s.meta,
        crackStones: 99999,
        ascTier: 0,
        ascPoints: 0,
        dungeonFinalsCleared: ['plains', 'forest', 'mountains'],   // ≥3 finals for tier 1
        compassOwned: {
          plains_first: true,
          plains_second: false,
          forest_first: true,
          forest_second: true,
          mountains_first: false,
          mountains_second: false,
          omni: false,
        },
        dungeonMiniBossesCleared: ['plains', 'forest'],
        dungeonMajorBossesCleared: ['forest'],
      },
    }));

    const ok = useGameStore.getState().ascend();
    expect(ok).toBe(true);

    const meta = useGameStore.getState().meta;
    expect(meta.ascTier).toBe(1);
    // Compass + clear lists preserved
    expect(meta.compassOwned.plains_first).toBe(true);
    expect(meta.compassOwned.forest_first).toBe(true);
    expect(meta.compassOwned.forest_second).toBe(true);
    expect(meta.dungeonMiniBossesCleared).toEqual(['plains', 'forest']);
    expect(meta.dungeonMajorBossesCleared).toEqual(['forest']);
  });
});
```

- [ ] **Step 2: Test 실행 — Pass or Fail 결정**

```bash
pnpm --filter @forge/game-inflation-rpg test src/store/gameStore.test.ts -t "ascend preserves compass"
```

The existing `ascend()` action (`gameStore.ts` line 738-782) uses `...s.meta` spread + explicit overrides. The overrides do NOT include compass fields, so spread should auto-preserve them.

**If test PASSES** → spread already works. Skip Step 3.
**If test FAILS** → add explicit preservation lines in Step 3.

- [ ] **Step 3 (conditional): explicit preservation 추가**

If Step 2 failed, edit `gameStore.ts` `ascend()` action — find the `newMeta` object assignment (around line 746) and **append** before the closing `}`:

```typescript
            compassOwned: s.meta.compassOwned,
            dungeonMiniBossesCleared: s.meta.dungeonMiniBossesCleared,
            dungeonMajorBossesCleared: s.meta.dungeonMajorBossesCleared,
```

Re-run test — expect PASS now.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.test.ts
# If Step 3 was needed:
# git add games/inflation-rpg/src/store/gameStore.ts
git commit -m "test(game-inflation-rpg): Phase Compass — ascend preserves compass data

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: BattleScene Hook — Mini/Major Boss Award

**Files:**
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts`

- [ ] **Step 1: BattleScene 에 award 호출 추가**

In `games/inflation-rpg/src/battle/BattleScene.ts`, find line ~290 `const bossType = getBossType(finishedFloor);` and **insert immediately after that line**:

```typescript
        // Phase Compass — mini/major-boss 첫 처치 시 compass 부여 (idempotent)
        if (bossType === 'mini') {
          stateAfterKill.awardMiniBossCompass(dungeonId);
        } else if (bossType === 'major') {
          stateAfterKill.awardMajorBossCompass(dungeonId);
        }
```

Verify the surrounding code structure — the hook must execute **before** the `bossType === 'final'` branch (which early-returns at line 308).

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```
Expected: 0 errors.

- [ ] **Step 3: All unit tests still pass**

```bash
pnpm --filter @forge/game-inflation-rpg test
```
Expected: all pass (BattleScene 자체 단위 테스트는 없음 — store action 으로 검증됨).

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/battle/BattleScene.ts
git commit -m "feat(game-inflation-rpg): Phase Compass — BattleScene mini/major boss award hook

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Town.tsx Simplification + Modal Mount

**Files:**
- Modify: `games/inflation-rpg/src/screens/Town.tsx`
- Modify: `games/inflation-rpg/src/screens/Town.test.tsx`

- [ ] **Step 1: 실패하는 Town test 작성**

Open `games/inflation-rpg/src/screens/Town.test.tsx` and check what's there. Append (or refactor existing tests to match new UI):

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Town } from './Town';
import { useGameStore } from '../store/gameStore';

describe('Town — Phase Compass UI', () => {
  it('shows single 던전 입장 button', () => {
    render(<Town />);
    expect(screen.getByTestId('town-enter-dungeon')).toBeInTheDocument();
  });

  it('does not render town-dungeon-<id> grid testids (legacy removed)', () => {
    render(<Town />);
    expect(screen.queryByTestId('town-dungeon-plains')).not.toBeInTheDocument();
    expect(screen.queryByTestId('town-dungeon-forest')).not.toBeInTheDocument();
    expect(screen.queryByTestId('town-dungeon-mountains')).not.toBeInTheDocument();
  });

  it('still shows town facility buttons (보물고 / 차원 제단 / 직업소)', () => {
    render(<Town />);
    expect(screen.getByTestId('town-relics')).toBeInTheDocument();
    expect(screen.getByTestId('town-ascension-altar')).toBeInTheDocument();
    expect(screen.getByTestId('town-skill-progression')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Test 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test src/screens/Town.test.tsx
```
Expected: FAIL — `town-enter-dungeon` not found (current Town renders the dungeon grid).

- [ ] **Step 3: Town.tsx 재작성**

Replace the contents of `games/inflation-rpg/src/screens/Town.tsx`:

```typescript
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { ForgeButton } from '@/components/ui/forge-button';
import { DungeonPickModal } from './DungeonPickModal';

export function Town() {
  const setScreen = useGameStore((s) => s.setScreen);
  const [pickModalOpen, setPickModalOpen] = React.useState(false);

  return (
    <ForgeScreen>
      <h1
        style={{
          textAlign: 'center',
          fontSize: 'var(--forge-font-2xl)',
          marginBottom: 'var(--forge-space-4)',
        }}
      >
        마을
      </h1>
      <p
        style={{
          textAlign: 'center',
          color: 'var(--forge-text-secondary)',
          marginBottom: 'var(--forge-space-6)',
        }}
      >
        차원 너머 던전으로 떠나라
      </p>

      <div style={{ textAlign: 'center', marginBottom: 'var(--forge-space-6)' }}>
        <ForgeButton
          variant="primary"
          onClick={() => setPickModalOpen(true)}
          data-testid="town-enter-dungeon"
        >
          🚪 던전 입장
        </ForgeButton>
      </div>

      <div style={{ textAlign: 'center', marginTop: 'var(--forge-space-4)' }}>
        <ForgeButton
          variant="secondary"
          onClick={() => setScreen('ascension')}
          data-testid="town-ascension-altar"
        >
          🌌 차원 제단
        </ForgeButton>
      </div>

      <div style={{ textAlign: 'center', marginTop: 'var(--forge-space-4)' }}>
        <ForgeButton
          variant="secondary"
          onClick={() => setScreen('skill-progression')}
          data-testid="town-skill-progression"
        >
          🎓 직업소
        </ForgeButton>
      </div>

      <div style={{ textAlign: 'center', marginTop: 'var(--forge-space-4)' }}>
        <ForgeButton
          variant="secondary"
          onClick={() => setScreen('relics')}
          data-testid="town-relics"
        >
          💎 보물고
        </ForgeButton>
      </div>

      <div style={{ textAlign: 'center', marginTop: 'var(--forge-space-6)' }}>
        <ForgeButton variant="secondary" onClick={() => setScreen('main-menu')}>
          돌아가기
        </ForgeButton>
      </div>

      {pickModalOpen && (
        <DungeonPickModal onClose={() => setPickModalOpen(false)} />
      )}
    </ForgeScreen>
  );
}
```

Note: this depends on `DungeonPickModal` (created in Task 9). To keep this task independently testable, create a placeholder stub for `DungeonPickModal` first:

Create `games/inflation-rpg/src/screens/DungeonPickModal.tsx` (stub):

```typescript
import React from 'react';

export function DungeonPickModal({ onClose }: { onClose: () => void }) {
  return <div data-testid="dungeon-pick-modal-stub" onClick={onClose}>stub</div>;
}
```

This stub will be replaced fully in Task 9.

- [ ] **Step 4: Test 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg test src/screens/Town.test.tsx
```
Expected: typecheck 0, Town tests pass.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/screens/Town.tsx \
        games/inflation-rpg/src/screens/Town.test.tsx \
        games/inflation-rpg/src/screens/DungeonPickModal.tsx
git commit -m "feat(game-inflation-rpg): Phase Compass Town simplification (single entry + modal stub)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: DungeonPickModal Component (full implementation)

**Files:**
- Modify: `games/inflation-rpg/src/screens/DungeonPickModal.tsx`
- Create: `games/inflation-rpg/src/screens/DungeonPickModal.test.tsx`

- [ ] **Step 1: 실패하는 modal tests 작성**

Create `games/inflation-rpg/src/screens/DungeonPickModal.test.tsx`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DungeonPickModal } from './DungeonPickModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../store/gameStore';
import { EMPTY_COMPASS_OWNED } from '../data/compass';

describe('DungeonPickModal', () => {
  beforeEach(() => {
    useGameStore.setState({ run: { ...INITIAL_RUN }, meta: { ...INITIAL_META } });
  });

  it('shows pick result with picked dungeon and 입장 button', () => {
    render(<DungeonPickModal onClose={() => {}} />);
    expect(screen.getByTestId('pick-result')).toBeInTheDocument();
    expect(screen.getByTestId('pick-enter')).toBeInTheDocument();
  });

  it('does not show free-select button when no compass owned', () => {
    render(<DungeonPickModal onClose={() => {}} />);
    expect(screen.queryByTestId('pick-free-mode')).not.toBeInTheDocument();
  });

  it('shows free-select button when omni owned', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, compassOwned: { ...EMPTY_COMPASS_OWNED, omni: true } },
    }));
    render(<DungeonPickModal onClose={() => {}} />);
    expect(screen.getByTestId('pick-free-mode')).toBeInTheDocument();
  });

  it('clicking 입장 calls onClose + setScreen(class-select)', () => {
    let closed = false;
    render(<DungeonPickModal onClose={() => { closed = true; }} />);
    act(() => { fireEvent.click(screen.getByTestId('pick-enter')); });
    expect(closed).toBe(true);
    expect(useGameStore.getState().screen).toBe('class-select');
  });

  it('toggling free-mode reveals dungeon cards (only enabled when canFreeSelect)', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, compassOwned: { ...EMPTY_COMPASS_OWNED, forest_second: true } },
    }));
    render(<DungeonPickModal onClose={() => {}} />);
    act(() => { fireEvent.click(screen.getByTestId('pick-free-mode')); });
    expect(screen.getByTestId('free-card-plains')).toBeDisabled();
    expect(screen.getByTestId('free-card-forest')).not.toBeDisabled();
    expect(screen.getByTestId('free-card-mountains')).toBeDisabled();
  });
});
```

- [ ] **Step 2: Test 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test src/screens/DungeonPickModal.test.tsx
```
Expected: FAIL — stub renders only `dungeon-pick-modal-stub`.

- [ ] **Step 3: DungeonPickModal full implementation**

Replace `games/inflation-rpg/src/screens/DungeonPickModal.tsx`:

```typescript
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { DUNGEONS, getDungeonById } from '../data/dungeons';
import { canFreeSelect, hasAnyFreeSelect, getDungeonWeight } from '../systems/compass';
import { ForgeButton } from '@/components/ui/forge-button';
import { ForgePanel } from '@/components/ui/forge-panel';

interface Props {
  onClose: () => void;
}

export function DungeonPickModal({ onClose }: Props) {
  const meta = useGameStore((s) => s.meta);
  const pickAndSelect = useGameStore((s) => s.pickAndSelectDungeon);
  const selectFree = useGameStore((s) => s.selectDungeonFree);
  const setScreen = useGameStore((s) => s.setScreen);

  const [pickedId, setPickedId] = React.useState<string | null>(null);
  const [freeMode, setFreeMode] = React.useState(false);

  React.useEffect(() => {
    setPickedId(pickAndSelect());
  }, [pickAndSelect]);

  const picked = pickedId ? getDungeonById(pickedId) : null;
  const canAnyFree = hasAnyFreeSelect(meta);

  const enter = () => {
    onClose();
    setScreen('class-select');
  };

  const onPickFree = (id: string) => {
    selectFree(id);
    setPickedId(id);
    setFreeMode(false);
  };

  return (
    <div
      role="dialog"
      data-testid="dungeon-pick-modal"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        padding: 'var(--forge-space-4)',
      }}
    >
      <ForgePanel style={{ maxWidth: 480, width: '100%', padding: 'var(--forge-space-6)' }}>
        {!freeMode && picked && (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: 'var(--forge-space-4)' }}>
              차원 추첨
            </h2>
            <div data-testid="pick-result" style={{ textAlign: 'center', marginBottom: 'var(--forge-space-4)' }}>
              <div style={{ fontSize: '3rem' }}>{picked.emoji}</div>
              <div style={{ fontSize: 'var(--forge-font-lg)', fontWeight: 600 }}>{picked.nameKR}</div>
              <div style={{ fontSize: 'var(--forge-font-sm)', color: 'var(--forge-text-secondary)' }}>
                가중치 {getDungeonWeight(meta, picked.id)} 적용됨
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--forge-space-2)' }}>
              <ForgeButton variant="primary" onClick={enter} data-testid="pick-enter">
                입장
              </ForgeButton>
              {canAnyFree && (
                <ForgeButton
                  variant="secondary"
                  onClick={() => setFreeMode(true)}
                  data-testid="pick-free-mode"
                >
                  🗺️ 자유 선택 (나침반)
                </ForgeButton>
              )}
              <ForgeButton variant="secondary" onClick={onClose} data-testid="pick-cancel">
                취소
              </ForgeButton>
            </div>
          </>
        )}

        {freeMode && (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: 'var(--forge-space-4)' }}>자유 선택</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--forge-space-2)', marginBottom: 'var(--forge-space-4)' }}>
              {DUNGEONS.map((d) => {
                const free = canFreeSelect(meta, d.id);
                return (
                  <ForgeButton
                    key={d.id}
                    variant={free ? 'primary' : 'secondary'}
                    disabled={!free}
                    onClick={() => onPickFree(d.id)}
                    data-testid={`free-card-${d.id}`}
                  >
                    {d.emoji} {d.nameKR}
                  </ForgeButton>
                );
              })}
            </div>
            <ForgeButton
              variant="secondary"
              onClick={() => setFreeMode(false)}
              data-testid="pick-back-to-random"
            >
              ← 추첨으로
            </ForgeButton>
          </>
        )}
      </ForgePanel>
    </div>
  );
}
```

- [ ] **Step 4: Tests 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg test src/screens/DungeonPickModal.test.tsx
```
Expected: typecheck 0, 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/screens/DungeonPickModal.tsx \
        games/inflation-rpg/src/screens/DungeonPickModal.test.tsx
git commit -m "feat(game-inflation-rpg): Phase Compass — DungeonPickModal (추첨 + 자유선택 override)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Relics.tsx — Compass Tab

**Files:**
- Modify: `games/inflation-rpg/src/screens/Relics.tsx`

- [ ] **Step 1: Relics.tsx 에 compass tab 추가**

In `games/inflation-rpg/src/screens/Relics.tsx`:

1. **Add imports** at the top (right after existing imports):

```typescript
import { COMPASS_ITEMS, ALL_COMPASS_IDS } from '../data/compass';
import { getDungeonById } from '../data/dungeons';
```

2. **Change tab state type**:

```typescript
const [tab, setTab] = React.useState<'stack' | 'mythic' | 'compass'>('stack');
```

3. **Add compass tab button** — in the tab row (right after the `mythic` button):

```typescript
<button
  onClick={() => setTab('compass')}
  data-testid="relics-tab-compass"
  style={{ background: tab === 'compass' ? 'var(--forge-accent)' : 'var(--forge-panel)' }}
>
  🧭 나침반
</button>
```

4. **Add compass tab body** — after the existing `{tab === 'mythic' && (...)}` block:

```typescript
{tab === 'compass' && (
  <div data-testid="compass-tab">
    <p style={{ fontSize: 'var(--forge-font-sm)', marginBottom: 12, color: 'var(--forge-text-secondary)' }}>
      mini-boss / major-boss 첫 처치 시 획득. 던전 추첨 가중치 ×3 또는 자유 선택 부여.
    </p>
    <div style={{ display: 'grid', gap: 8 }}>
      {ALL_COMPASS_IDS.map((id) => {
        const def = COMPASS_ITEMS[id];
        const owned = meta.compassOwned[id];
        const hint =
          id === 'omni'
            ? '모든 던전 mini-boss 첫 처치 시 자동 부여'
            : def.tier === 1
              ? `${getDungeonById(def.dungeonId!)?.nameKR ?? def.dungeonId} 던전 floor 5 mini-boss 첫 처치`
              : `${getDungeonById(def.dungeonId!)?.nameKR ?? def.dungeonId} 던전 floor 10 major-boss 첫 처치`;
        return (
          <div
            key={id}
            data-testid={`compass-row-${id}`}
            style={{
              padding: 12,
              border: '1px solid var(--forge-border)',
              borderRadius: 8,
              opacity: owned ? 1 : 0.55,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.5rem' }}>{def.emoji}</span>
              <div>
                <div style={{ fontWeight: 600 }}>{def.nameKR}</div>
                <div style={{ fontSize: 'var(--forge-font-sm)', color: 'var(--forge-text-secondary)' }}>
                  {def.descriptionKR}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 'var(--forge-font-sm)' }}>
                {owned ? '✓ 보유' : '미보유'}
              </div>
            </div>
            {!owned && (
              <div style={{ fontSize: 'var(--forge-font-xs)', marginTop: 6, color: 'var(--forge-text-secondary)' }}>
                {hint}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```
Expected: 0 errors.

- [ ] **Step 3: All unit tests still pass**

```bash
pnpm --filter @forge/game-inflation-rpg test
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/screens/Relics.tsx
git commit -m "feat(game-inflation-rpg): Phase Compass — Relics.tsx 나침반 tab (3rd tab)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: dungeon-flow.spec.ts — Update to Modal Flow

**Files:**
- Modify: `games/inflation-rpg/tests/e2e/dungeon-flow.spec.ts`

- [ ] **Step 1: 현재 spec 검토 + town-dungeon-* 호출 식별**

Grep for `town-dungeon-` usage:
```bash
grep -n "town-dungeon-\|town-enter-dungeon\|pick-result\|pick-enter" games/inflation-rpg/tests/e2e/dungeon-flow.spec.ts
```

4 occurrences of `town-dungeon-plains` (line 32, 54, 64, 73 per earlier scan).

- [ ] **Step 2: 각 occurrence 를 새 modal flow 로 교체**

Replace blocks like:
```typescript
    await page
      .getByTestId('town-dungeon-plains')
      .getByRole('button', { name: '입장' })
      .click();
```

With:
```typescript
    // Town: [던전 입장] 클릭 → modal 추첨
    await page.getByTestId('town-enter-dungeon').click();
    // The modal mounts and auto-picks; switch to free-select 모드 (seed compass) OR just enter
    // For tests not seeding compass: just click 입장 — pick result is random across 3 dungeons.
    await page.getByTestId('pick-enter').click();
```

For the test `'back to town clears currentDungeonId'` (line 60+), the assertion `expect(page.getByTestId('town-dungeon-plains')).toBeVisible()` must change. Replace with:
```typescript
    await expect(page.getByTestId('town-enter-dungeon')).toBeVisible();
```

For the test `'town → 평야 던전 → ClassSelect ...'` that specifically expects `평야` — the new modal flow doesn't guarantee `평야` is picked (random 1/3). Options:
- (A) Use seed via localStorage (compass 가 다른 던전 자유선택을 막아두고, plains 자유 선택만 가능하도록 seed)
- (B) Change the test name to "town → random dungeon → ..." and replace `평야` assertion with "ClassSelect 가 표시됨" (dungeon-agnostic)

**Choose (B) for simplicity** — rename test + replace dungeon-name assertion:
```typescript
test('town → modal pick → ClassSelect → DungeonFloors → floor 1 entry', async ({ page }) => {
  await page.getByRole('button', { name: /마을로/ }).click();

  // Town: 던전 입장 → modal → 입장
  await page.getByTestId('town-enter-dungeon').click();
  await expect(page.getByTestId('pick-result')).toBeVisible();
  await page.getByTestId('pick-enter').click();

  // ClassSelect
  await page.getByRole('button', { name: '화랑' }).first().click();
  await page.getByRole('button', { name: '모험 시작' }).click();

  // DungeonFloors: floor 1
  await expect(page.getByTestId('floor-card-1')).toBeVisible();
  await expect(page.getByTestId('floor-card-1')).not.toBeDisabled();
  await expect(page.getByTestId('floor-card-2')).toBeDisabled();

  await page.getByTestId('floor-card-1').click();
  await expect(page.getByTestId('battle-header')).toBeVisible({ timeout: 5000 });
});
```

Apply similar updates to the other tests (`back to town`, `boss floor cards`).

- [ ] **Step 3: E2E 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg e2e dungeon-flow.spec.ts
```
Expected: all dungeon-flow tests pass.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/tests/e2e/dungeon-flow.spec.ts
git commit -m "test(game-inflation-rpg): Phase Compass — dungeon-flow e2e to modal flow

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: compass-flow.spec.ts — New E2E

**Files:**
- Create: `games/inflation-rpg/tests/e2e/compass-flow.spec.ts`

- [ ] **Step 1: 새 e2e spec 작성**

Create `games/inflation-rpg/tests/e2e/compass-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

function seedV12SaveWithCompass(opts: {
  plains_first?: boolean;
  forest_second?: boolean;
  omni?: boolean;
}) {
  return {
    state: {
      meta: {
        // Phase E baseline subset — only fields needed for boot
        compassOwned: {
          plains_first: !!opts.plains_first,
          plains_second: false,
          forest_first: false,
          forest_second: !!opts.forest_second,
          mountains_first: false,
          mountains_second: false,
          omni: !!opts.omni,
        },
        dungeonMiniBossesCleared: [],
        dungeonMajorBossesCleared: [],
        tutorialDone: true,
        tutorialStep: -1,
        inventory: { weapons: [], armors: [], accessories: [] },
        equippedItemIds: [],
      },
    },
    version: 12,
  };
}

async function dismissTutorial(page: import('@playwright/test').Page) {
  const overlay = page.getByTestId('tutorial-overlay');
  if (await overlay.isVisible()) {
    await page.getByRole('button', { name: '건너뛰기' }).click();
    await overlay.waitFor({ state: 'hidden', timeout: 3000 });
  }
}

test.describe('Phase Compass — flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), SAVE_KEY);
  });

  test('default flow — single entry → modal → 입장', async ({ page }) => {
    await page.reload();
    await page.waitForSelector('.forge-screen', { timeout: 10000 });
    await dismissTutorial(page);

    // Navigate Main → Town
    await page.getByRole('button', { name: /마을로/ }).click();

    // Town: single entry
    await expect(page.getByTestId('town-enter-dungeon')).toBeVisible();
    await expect(page.getByTestId('town-dungeon-plains')).toHaveCount(0);

    // Open modal
    await page.getByTestId('town-enter-dungeon').click();
    await expect(page.getByTestId('dungeon-pick-modal')).toBeVisible();
    await expect(page.getByTestId('pick-result')).toBeVisible();

    // No compass — free-mode button hidden
    await expect(page.getByTestId('pick-free-mode')).toHaveCount(0);

    // Enter
    await page.getByTestId('pick-enter').click();

    // class-select 화면 진입
    await expect(page.getByRole('button', { name: '화랑' }).first()).toBeVisible();
  });

  test('with second-tier compass — free-mode allows that one dungeon', async ({ page }) => {
    await page.evaluate(([key, save]) => localStorage.setItem(key as string, save as string),
      [SAVE_KEY, JSON.stringify(seedV12SaveWithCompass({ forest_second: true }))]);
    await page.reload();
    await page.waitForSelector('.forge-screen', { timeout: 10000 });
    await dismissTutorial(page);

    await page.getByRole('button', { name: /마을로/ }).click();
    await page.getByTestId('town-enter-dungeon').click();
    await expect(page.getByTestId('pick-free-mode')).toBeVisible();

    await page.getByTestId('pick-free-mode').click();
    await expect(page.getByTestId('free-card-forest')).not.toBeDisabled();
    await expect(page.getByTestId('free-card-plains')).toBeDisabled();
    await expect(page.getByTestId('free-card-mountains')).toBeDisabled();

    await page.getByTestId('free-card-forest').click();
    // class-select 진입 (자유 선택 후 setPickedId → modal 다시 추첨 화면으로 돌아오지 않고 enter 안 함 — 사용자 의도 = "선택 후 다시 추첨 화면" or "바로 입장"?)
    // 본 spec § 6.2 노트: 자유 선택 → setPickedId 갱신 + freeMode false → 다시 추첨 모드. enter 별도 클릭 필요.
    await expect(page.getByTestId('pick-result')).toBeVisible();
    await page.getByTestId('pick-enter').click();

    await expect(page.getByRole('button', { name: '화랑' }).first()).toBeVisible();
  });

  test('with omni compass — free-mode allows all dungeons', async ({ page }) => {
    await page.evaluate(([key, save]) => localStorage.setItem(key as string, save as string),
      [SAVE_KEY, JSON.stringify(seedV12SaveWithCompass({ omni: true }))]);
    await page.reload();
    await page.waitForSelector('.forge-screen', { timeout: 10000 });
    await dismissTutorial(page);

    await page.getByRole('button', { name: /마을로/ }).click();
    await page.getByTestId('town-enter-dungeon').click();
    await page.getByTestId('pick-free-mode').click();

    await expect(page.getByTestId('free-card-plains')).not.toBeDisabled();
    await expect(page.getByTestId('free-card-forest')).not.toBeDisabled();
    await expect(page.getByTestId('free-card-mountains')).not.toBeDisabled();
  });

  test('Relics screen — compass tab shows 7 rows', async ({ page }) => {
    await page.reload();
    await page.waitForSelector('.forge-screen', { timeout: 10000 });
    await dismissTutorial(page);

    await page.getByRole('button', { name: /마을로/ }).click();
    await page.getByTestId('town-relics').click();
    await page.getByTestId('relics-tab-compass').click();
    await expect(page.getByTestId('compass-tab')).toBeVisible();
    await expect(page.getByTestId('compass-row-plains_first')).toBeVisible();
    await expect(page.getByTestId('compass-row-omni')).toBeVisible();
    // 미보유 — hint 표시 검증 (특정 row 의 hint text)
    await expect(page.getByTestId('compass-row-plains_first')).toContainText('floor 5 mini-boss');
  });
});
```

- [ ] **Step 2: E2E 실행 확인**

```bash
pnpm --filter @forge/game-inflation-rpg e2e compass-flow.spec.ts
```
Expected: 4 logical × 2 projects (chromium + mobile-iphone) = 8 tests pass.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/tests/e2e/compass-flow.spec.ts
git commit -m "test(game-inflation-rpg): Phase Compass — e2e flow (추첨 + 자유선택 + omni + Relics tab)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: v9-migration.spec.ts — Extend to v12

**Files:**
- Modify: `games/inflation-rpg/tests/e2e/v9-migration.spec.ts`

- [ ] **Step 1: 기존 spec 의 v11 검증 부분 식별**

Grep for the assertions checking v11 (`relicStacks`, `mythicSlotCap`, etc.):
```bash
grep -n "relicStacks\|mythicSlotCap\|version" games/inflation-rpg/tests/e2e/v9-migration.spec.ts
```

- [ ] **Step 2: 테스트 제목 + 검증부 확장**

Update the test description from `"...v9→v10→v11 with auto-rolled modifiers + ascTree + Phase E defaults"` to `"...v9→v10→v11→v12 ... + Phase Compass defaults"`.

Add assertions after existing v11 checks (find them via grep above):

```typescript
  // Phase Compass v12 defaults
  const compassOwned = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const env = JSON.parse(raw);
    return env.state?.meta?.compassOwned ?? null;
  }, SAVE_KEY);
  expect(compassOwned).not.toBeNull();
  expect(compassOwned.plains_first).toBe(false);
  expect(compassOwned.omni).toBe(false);

  const cleared = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const env = JSON.parse(raw);
    return {
      mini: env.state?.meta?.dungeonMiniBossesCleared,
      major: env.state?.meta?.dungeonMajorBossesCleared,
    };
  }, SAVE_KEY);
  expect(cleared!.mini).toEqual([]);
  expect(cleared!.major).toEqual([]);

  // Persist version should be 12 now
  const version = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw).version : null;
  }, SAVE_KEY);
  expect(version).toBe(12);
```

- [ ] **Step 3: E2E 실행 확인**

```bash
pnpm --filter @forge/game-inflation-rpg e2e v9-migration.spec.ts
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/tests/e2e/v9-migration.spec.ts
git commit -m "test(game-inflation-rpg): Phase Compass — v8→v12 migration E2E chain

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: balance-sim Regression Seed (compass-on)

**Files:**
- Modify: `games/inflation-rpg/tools/balance-sim.ts`

- [ ] **Step 1: 변경 위치 식별**

Read `games/inflation-rpg/tools/balance-sim.ts` around line 80-100 (the `phaseE_meta` block). The seed is environment-variable-driven (per Phase E memory). Compass affects nothing in sim (stat / drop multiplier 비관여), so the regression is essentially `compass_on` mode == baseline.

- [ ] **Step 2: 간단한 1-line note + (optional) regression mode**

If the sim has an env-var based phase toggle (e.g. `PHASE_E_MYTHIC_ON`), add a comment line referencing compass:

Locate the existing comment near `phaseE_meta` and append:

```typescript
// Phase Compass — compass items have no stat/drop multiplier impact.
// Regression invariant: enabling all compass owned == baseline milestones (unchanged).
```

No code path needed — compass simply is not exercised by the sim. The regression check is purely conceptual unless we add a flag. **Skip explicit toggle**.

- [ ] **Step 3: Sim 실행 (기존 동일 baseline 확인)**

```bash
pnpm --filter @forge/game-inflation-rpg balance-sim 2>&1 | tail -30
```

Expected: same milestones as before Phase Compass (regression 0). Compare against `games/inflation-rpg/balance-sweep-out.md` if needed.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/tools/balance-sim.ts
git commit -m "docs(game-inflation-rpg): Phase Compass — sim regression note

Compass items affect no stat/drop mult — baseline milestones unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Final Verification + Tag

**Files:** (none — verification only)

- [ ] **Step 1: 전체 typecheck**

```bash
pnpm typecheck
```
Expected: 0 errors across all workspaces.

- [ ] **Step 2: 전체 lint**

```bash
pnpm lint
```
Expected: 0 errors (boundaries rule + ESLint).

- [ ] **Step 3: 전체 unit tests**

```bash
pnpm test
```
Expected: all packages pass. Inflation-rpg test count = 598 (Phase E) + ~20 new = ~618.

- [ ] **Step 4: 전체 e2e**

```bash
pnpm e2e
```
Expected: 32 (Phase E) + 8 (new compass-flow × 2 projects) = 40 tests. dungeon-flow + v9-migration 변경분도 포함.

- [ ] **Step 5: Circular dependency check**

```bash
pnpm circular
```
Expected: 0 circular dependencies.

- [ ] **Step 6: balance-sim baseline 회귀 확인**

```bash
pnpm --filter @forge/game-inflation-rpg balance-sim 2>&1 | tail -20
```
Compare milestones vs Phase E baseline — expect identical.

- [ ] **Step 7: Tag phase-compass-complete**

After merge to main (per repo convention `--no-ff` merge):
```bash
git checkout main
git merge --no-ff feat/phase-compass -m "Merge feat/phase-compass: Phase Compass — 차원 나침반"
git tag phase-compass-complete
git push origin main
git push origin phase-compass-complete
```

(If working directly on main without feature branch, just tag the latest commit.)

---

## Self-Review Notes

Spec coverage check:
- §1 Data model → Task 1 ✓
- §2 Persist v12 → Task 4 ✓
- §3 Systems layer → Task 2 + Task 3 ✓
- §4 Store actions → Task 5 ✓
- §5 BattleScene → Task 7 ✓
- §6 UI (Town / DungeonPickModal / Relics) → Task 8 + Task 9 + Task 10 ✓
- §7 Sim parity → Task 14 ✓
- §8 Test plan (unit + e2e) → Tasks 1, 2, 3, 4, 5, 6, 8, 9, 11, 12, 13 ✓
- §9 영향 파일 → Task 1-14 cover all 15 files ✓
- §10 Out of scope → 명시적으로 not implemented (광고 path, 20 던전, 알림 modal 등) ✓
- §11 다음 단계 → Task 15 (tag) ✓
- Asc reset 보존 (§2.4) → Task 6 ✓

Type consistency: `awardMiniBossCompass` named identically across Tasks 2, 5, 7. Re-named via alias `awardMiniBossCompassSystem` in Task 5 to avoid store-action / pure-fn collision. `pickRandomDungeon` / `canFreeSelect` / `hasAnyFreeSelect` consistent. `compassOwned` / `dungeonMiniBossesCleared` / `dungeonMajorBossesCleared` field names consistent.

Placeholder scan: 0 TBD / TODO. All code shown in full.
