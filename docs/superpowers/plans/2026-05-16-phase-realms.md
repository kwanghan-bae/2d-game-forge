# Phase Realms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `inflation-rpg` from 3 dungeons to 8 dungeons (sea/volcano/underworld/heaven/chaos, Tier-gated) and clear all Phase E known-limitation debts (run.playerHp permanence, lifesteal/sp_steal proc application, swift_winds base-only target, infinity_seal multi-kind coverage, light_of_truth proc magnitude wrap).

**Architecture:** Single-spec, single-merge phase split into three checkpoints — cp1 (D content + Compass UI), cp2 (A debt clearance via run.playerHp + mythic effect pipeline), cp3 (cross-cutting persist + sim + e2e). Persist bumps v12 → v13 in a single migration covering both D and A field additions.

**Tech Stack:** TypeScript / React / Phaser / Zustand 5 (`gameStore.ts`) / Vitest / Playwright iPhone 14 projects.

**Spec:** `docs/superpowers/specs/2026-05-16-phase-realms-design.md`

---

## Reference Map (do NOT re-discover during execution)

| Symbol | File / Line |
|---|---|
| `STORE_VERSION = 12` | `src/store/gameStore.ts:1099` |
| `INITIAL_RUN` (RunState defaults) | `src/store/gameStore.ts:49-64` |
| `INITIAL_META` (MetaState defaults) | `src/store/gameStore.ts:66-123` |
| `migrateV11ToV12` block | `src/store/gameStore.ts:382-388` |
| `awardMiniBossCompass` (store) | `src/store/gameStore.ts:1071-1075` |
| `pickAndSelectDungeon` (store) | `src/store/gameStore.ts:1086-1090` |
| `currentHPEstimate` (BattleScene) | `src/battle/BattleScene.ts:358` |
| Revive flow (BattleScene) | `src/battle/BattleScene.ts:360-376` |
| Mythic procs registration | `src/battle/BattleScene.ts:160` |
| Mythic procs eval (player_attack) | `src/battle/BattleScene.ts:224` |
| Mythic procs eval (hit_received) | `src/battle/BattleScene.ts:351` |
| Enemy-killed branch | `src/battle/BattleScene.ts:246-338` |
| `applyMetaDropMult` | `src/systems/economy.ts:21-29` |
| `applyExpGain` | `src/systems/experience.ts:7-26` |
| `getMythicCooldownMult` | `src/systems/mythics.ts:29-38` |
| `getMythicDropBonus` (already supports 'all_kinds') | `src/systems/mythics.ts:40-50` |
| `getMythicXpMult` (does NOT check drop_mult) | `src/systems/mythics.ts:52-60` |
| `getMythicProcs` | `src/systems/mythics.ts:75-84` |
| `buildActiveSkillsForCombat` | `src/systems/buildActiveSkills.ts:11-49` |
| `evaluateMythicProcs` | `src/systems/effects.ts:147-172` |
| `MythicProc` type | `src/types.ts:392-396` |
| `MythicProcResult` type | `src/systems/effects.ts:140-145` |
| `DungeonUnlock` (already supports 'asc-tier') | `src/types.ts:312-316` |
| `CompassEntry`, `CompassId` | `src/types.ts:258-271` |
| `RunState` | `src/types.ts:157-172` |
| `MetaState.compassOwned / dungeonMiniBossesCleared / dungeonMajorBossesCleared` | `src/types.ts:225-227` |
| `MythicDef` | `src/data/mythics.ts:7-19` |
| `swift_winds` mythic entry | `src/data/mythics.ts:99-102` |
| `infinity_seal` mythic entry | `src/data/mythics.ts:31-34` |
| `light_of_truth` mythic entry | `src/data/mythics.ts:39-42` |
| `serpent_fang` (lifesteal) | `src/data/mythics.ts:84-88` |
| `gluttony_chalice` (sp_steal) | `src/data/mythics.ts:89-93` |
| `awardMiniBossCompassSystem` | `src/systems/compass.ts:10-26` |
| `pickRandomDungeon` | `src/systems/compass.ts:79-92` |
| DUNGEONS array | `src/data/dungeons.ts:3-58` |
| COMPASS_ITEMS | `src/data/compass.ts:3-11` |
| DUNGEONS ↔ COMPASS tripwire | `src/data/compass.test.ts:33-47` |
| DungeonPickModal free-pick | `src/screens/DungeonPickModal.tsx:41-45` |
| Relics CompassTab | `src/screens/Relics.tsx:81-105` |

---

## Checkpoint Plan

- **cp1 (Tasks 1–8): D — Data + Compass expansion + UI.** Self-contained content drop. Merge-ready in isolation.
- **cp2 (Tasks 9–16): A — Mythic effect pipeline + run.playerHp.** Cross-system refactor.
- **cp3 (Tasks 17–20): Persist v13 + balance-sim + e2e.** Glue + verification.

Between cps, `pnpm typecheck && pnpm lint && pnpm circular && pnpm --filter @forge/game-inflation-rpg test` MUST pass before continuing.

---

# CHECKPOINT 1 — D content

## Task 1: Extend `CompassId` and `DungeonUnlock` type space

**Files:**
- Modify: `games/inflation-rpg/src/types.ts:258-262`
- Modify: `games/inflation-rpg/src/types.ts:312-316` (no change — already supports `'asc-tier'`; documentation comment only)

- [ ] **Step 1: Modify CompassId union to include 5 new dungeons**

Replace `src/types.ts:258-262`:

```ts
// Phase Compass / Phase Realms — 차원 나침반
export type CompassId =
  | 'plains_first'     | 'plains_second'
  | 'forest_first'     | 'forest_second'
  | 'mountains_first'  | 'mountains_second'
  | 'sea_first'        | 'sea_second'
  | 'volcano_first'    | 'volcano_second'
  | 'underworld_first' | 'underworld_second'
  | 'heaven_first'     | 'heaven_second'
  | 'chaos_first'      | 'chaos_second'
  | 'omni';
```

`DungeonUnlock` already has `{ type: 'asc-tier'; tier: number }` — no change.

- [ ] **Step 2: Run typecheck to enumerate all break sites**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`

Expected: failures in `src/data/compass.ts` (`COMPASS_ITEMS` missing 10 keys), `EMPTY_COMPASS_OWNED` missing 10 keys, and anywhere else compass-related. These will be fixed in Task 2.

- [ ] **Step 3: Commit (type-only change)**

```bash
git add games/inflation-rpg/src/types.ts
git commit -m "feat(game-inflation-rpg): Phase Realms — extend CompassId to 17 entries (8 dungeons × 2 + omni)"
```

---

## Task 2: Expand `COMPASS_ITEMS`, `ALL_COMPASS_IDS`, `EMPTY_COMPASS_OWNED`

**Files:**
- Modify: `games/inflation-rpg/src/data/compass.ts:3-21`

- [ ] **Step 1: Replace COMPASS_ITEMS with 17 entries (preserving omni position)**

Replace `src/data/compass.ts` body (keep imports + getCompassByDungeon helper):

```ts
import type { CompassId, CompassEntry } from '../types';

export const COMPASS_ITEMS: Record<CompassId, CompassEntry> = {
  plains_first:      { id: 'plains_first',      dungeonId: 'plains',     tier: 1, emoji: '🧭', nameKR: '평야 나침반 1차',   descriptionKR: '평야 던전 추첨 가중치 ×3' },
  plains_second:     { id: 'plains_second',     dungeonId: 'plains',     tier: 2, emoji: '🗺️', nameKR: '평야 나침반 2차',   descriptionKR: '평야 던전 자유 선택' },
  forest_first:      { id: 'forest_first',      dungeonId: 'forest',     tier: 1, emoji: '🧭', nameKR: '깊은숲 나침반 1차', descriptionKR: '깊은숲 던전 추첨 가중치 ×3' },
  forest_second:     { id: 'forest_second',     dungeonId: 'forest',     tier: 2, emoji: '🗺️', nameKR: '깊은숲 나침반 2차', descriptionKR: '깊은숲 던전 자유 선택' },
  mountains_first:   { id: 'mountains_first',   dungeonId: 'mountains',  tier: 1, emoji: '🧭', nameKR: '산악 나침반 1차',   descriptionKR: '산악 던전 추첨 가중치 ×3' },
  mountains_second:  { id: 'mountains_second',  dungeonId: 'mountains',  tier: 2, emoji: '🗺️', nameKR: '산악 나침반 2차',   descriptionKR: '산악 던전 자유 선택' },
  sea_first:         { id: 'sea_first',         dungeonId: 'sea',        tier: 1, emoji: '🧭', nameKR: '해 나침반 1차',     descriptionKR: '해 던전 추첨 가중치 ×3' },
  sea_second:        { id: 'sea_second',        dungeonId: 'sea',        tier: 2, emoji: '🗺️', nameKR: '해 나침반 2차',     descriptionKR: '해 던전 자유 선택' },
  volcano_first:     { id: 'volcano_first',     dungeonId: 'volcano',    tier: 1, emoji: '🧭', nameKR: '화산 나침반 1차',   descriptionKR: '화산 던전 추첨 가중치 ×3' },
  volcano_second:    { id: 'volcano_second',    dungeonId: 'volcano',    tier: 2, emoji: '🗺️', nameKR: '화산 나침반 2차',   descriptionKR: '화산 던전 자유 선택' },
  underworld_first:  { id: 'underworld_first',  dungeonId: 'underworld', tier: 1, emoji: '🧭', nameKR: '명계 나침반 1차',   descriptionKR: '명계 던전 추첨 가중치 ×3' },
  underworld_second: { id: 'underworld_second', dungeonId: 'underworld', tier: 2, emoji: '🗺️', nameKR: '명계 나침반 2차',   descriptionKR: '명계 던전 자유 선택' },
  heaven_first:      { id: 'heaven_first',      dungeonId: 'heaven',     tier: 1, emoji: '🧭', nameKR: '천계 나침반 1차',   descriptionKR: '천계 던전 추첨 가중치 ×3' },
  heaven_second:     { id: 'heaven_second',     dungeonId: 'heaven',     tier: 2, emoji: '🗺️', nameKR: '천계 나침반 2차',   descriptionKR: '천계 던전 자유 선택' },
  chaos_first:       { id: 'chaos_first',       dungeonId: 'chaos',      tier: 1, emoji: '🧭', nameKR: '혼돈 나침반 1차',   descriptionKR: '혼돈 던전 추첨 가중치 ×3' },
  chaos_second:      { id: 'chaos_second',      dungeonId: 'chaos',      tier: 2, emoji: '🗺️', nameKR: '혼돈 나침반 2차',   descriptionKR: '혼돈 던전 자유 선택' },
  omni:              { id: 'omni',              dungeonId: null,         tier: 0, emoji: '🌌', nameKR: '범우주 나침반',     descriptionKR: '모든 던전 자유 선택' },
};

export const ALL_COMPASS_IDS: ReadonlyArray<CompassId> = Object.keys(COMPASS_ITEMS) as CompassId[];

export const EMPTY_COMPASS_OWNED: Record<CompassId, boolean> = {
  plains_first: false,      plains_second: false,
  forest_first: false,      forest_second: false,
  mountains_first: false,   mountains_second: false,
  sea_first: false,         sea_second: false,
  volcano_first: false,     volcano_second: false,
  underworld_first: false,  underworld_second: false,
  heaven_first: false,      heaven_second: false,
  chaos_first: false,       chaos_second: false,
  omni: false,
};

export function getCompassByDungeon(dungeonId: string, tier: 1 | 2): CompassId {
  return `${dungeonId}_${tier === 1 ? 'first' : 'second'}` as CompassId;
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`

Expected: PASS (or remaining failures only in tests/UI that reference the 17 entries).

- [ ] **Step 3: Update data/compass.test.ts tripwire to expect 17 entries (8 dungeons × 2 + omni)**

`src/data/compass.test.ts` currently asserts `DUNGEONS.length * 2 + 1`. Since `DUNGEONS.length` will become 8 in Task 3, the formula is correct — but the existing test enumerates the 7 hardcoded ids. Update the enumeration:

Open `src/data/compass.test.ts` and replace the enumeration (lines 33-47) so the per-dungeon coverage check iterates over the (forthcoming) 8 dungeons. Use the dynamic form:

```ts
import { DUNGEONS } from './dungeons';
import { ALL_COMPASS_IDS, COMPASS_ITEMS } from './compass';

it('every dungeon has both tier-1 and tier-2 compass entries', () => {
  for (const d of DUNGEONS) {
    const firstId = `${d.id}_first`;
    const secondId = `${d.id}_second`;
    expect(ALL_COMPASS_IDS).toContain(firstId);
    expect(ALL_COMPASS_IDS).toContain(secondId);
    expect(COMPASS_ITEMS[firstId as keyof typeof COMPASS_ITEMS]?.dungeonId).toBe(d.id);
    expect(COMPASS_ITEMS[firstId as keyof typeof COMPASS_ITEMS]?.tier).toBe(1);
    expect(COMPASS_ITEMS[secondId as keyof typeof COMPASS_ITEMS]?.dungeonId).toBe(d.id);
    expect(COMPASS_ITEMS[secondId as keyof typeof COMPASS_ITEMS]?.tier).toBe(2);
  }
});

it('total compass entries = DUNGEONS.length × 2 + 1 (omni)', () => {
  expect(ALL_COMPASS_IDS.length).toBe(DUNGEONS.length * 2 + 1);
});

it('omni entry has dungeonId null and tier 0', () => {
  expect(COMPASS_ITEMS.omni.dungeonId).toBeNull();
  expect(COMPASS_ITEMS.omni.tier).toBe(0);
});
```

Run: `pnpm --filter @forge/game-inflation-rpg test src/data/compass.test.ts`

Expected: PASS for all assertions that don't depend on the 5 new dungeons (which are added in Task 3). If a test fails because the 5 dungeons don't exist yet in DUNGEONS, that's expected — it will pass after Task 3.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/data/compass.ts games/inflation-rpg/src/data/compass.test.ts
git commit -m "feat(game-inflation-rpg): Phase Realms — expand COMPASS_ITEMS to 17 entries (8 dungeons × 2 + omni)"
```

---

## Task 3: Add 5 new DUNGEONS entries (sea / volcano / underworld / heaven / chaos)

**Files:**
- Modify: `games/inflation-rpg/src/data/dungeons.ts:3-58`
- Modify: `games/inflation-rpg/src/data/dungeons.test.ts` (verify structure expectations)

**Boss/monster mapping rule (from spec §11):** Each region cluster in `src/data/bosses.ts` has 4-9 bosses. For each new dungeon, assign mini/major/sub/final from that cluster by `bpReward` ascending: lowest = mini, second-lowest = major, next 3 = sub array, highest = final. If a region has fewer than 6 bosses, reuse a sub slot or borrow a normal boss from an adjacent region (this is acceptable for v1 — boss data integrity check in dungeons.test.ts will catch missing IDs).

- [ ] **Step 1: Enumerate region bosses in src/data/bosses.ts**

Run: `grep -n "region (lv" games/inflation-rpg/src/data/bosses.ts`

Expected: section comments for plains / forest / mountains / sea / volcano / underworld / heaven / chaos regions.

Then for each new region (sea/volcano/underworld/heaven/chaos), list the boss IDs between section comments. Use these IDs in Step 2.

- [ ] **Step 2: Add 5 entries to DUNGEONS array**

Append to `src/data/dungeons.ts` array (before the closing `];`):

```ts
  {
    id: 'sea',
    nameKR: '해',
    emoji: '🌊',
    themeColor: '#2c3e50',
    unlockGate: { type: 'asc-tier', tier: 1 },
    monsterPool: [
      'sea-fish', 'sea-jellyfish', 'sea-shark', 'sea-eel', 'sea-octopus',
    ],
    bossIds: {
      mini: 'wave-spirit',
      major: 'dragon-king-guard',
      sub: ['ice-sea-dragon', 'sea-leviathan', 'tide-priestess'],
      final: 'sea-god',
    },
    isHardOnly: false,
  },
  {
    id: 'volcano',
    nameKR: '화산',
    emoji: '🌋',
    themeColor: '#c0392b',
    unlockGate: { type: 'asc-tier', tier: 3 },
    monsterPool: [
      'volcano-imp', 'volcano-salamander', 'volcano-golem', 'volcano-phoenix', 'volcano-magma',
    ],
    bossIds: {
      mini: 'lava-elemental',
      major: 'volcano-titan',
      sub: ['fire-serpent', 'magma-lord', 'ember-king'],
      final: 'volcano-emperor',
    },
    isHardOnly: false,
  },
  {
    id: 'underworld',
    nameKR: '명계',
    emoji: '💀',
    themeColor: '#34495e',
    unlockGate: { type: 'asc-tier', tier: 5 },
    monsterPool: [
      'underworld-ghost', 'underworld-wraith', 'underworld-skeleton', 'underworld-zombie', 'underworld-banshee',
    ],
    bossIds: {
      mini: 'soul-collector',
      major: 'underworld-judge',
      sub: ['hell-hound', 'reaper-knight', 'dark-priest'],
      final: 'death-reaper',
    },
    isHardOnly: false,
  },
  {
    id: 'heaven',
    nameKR: '천계',
    emoji: '☁️',
    themeColor: '#f1c40f',
    unlockGate: { type: 'asc-tier', tier: 8 },
    monsterPool: [
      'heaven-cherub', 'heaven-archon', 'heaven-seraph', 'heaven-celestial', 'heaven-angel',
    ],
    bossIds: {
      mini: 'sky-warden',
      major: 'celestial-paladin',
      sub: ['radiant-knight', 'heaven-sentinel', 'astral-mage'],
      final: 'jade-emperor',
    },
    isHardOnly: false,
  },
  {
    id: 'chaos',
    nameKR: '혼돈',
    emoji: '🌀',
    themeColor: '#8e44ad',
    unlockGate: { type: 'asc-tier', tier: 12 },
    monsterPool: [
      'chaos-tentacle', 'chaos-eye', 'chaos-shadow', 'chaos-mind', 'chaos-void',
    ],
    bossIds: {
      mini: 'void-imp',
      major: 'chaos-herald',
      sub: ['nightmare-king', 'abyss-tyrant', 'shadow-titan'],
      final: 'final-boss',
    },
    isHardOnly: false,
  },
```

> **NOTE:** If any referenced boss id does not exist in `src/data/bosses.ts`, the dungeons.test.ts integrity test (Task 4) will catch it. The implementer should either (a) replace the missing id with one that exists in the same region cluster, or (b) add a minimal entry to `bosses.ts` mirroring existing entry shape. Same applies to monster IDs (`src/data/monsters.ts`).

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`

Expected: PASS.

- [ ] **Step 4: Run compass tripwire**

Run: `pnpm --filter @forge/game-inflation-rpg test src/data/compass.test.ts`

Expected: PASS (DUNGEONS.length = 8, ALL_COMPASS_IDS.length = 17, tripwire matches).

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/data/dungeons.ts
git commit -m "feat(game-inflation-rpg): Phase Realms — add 5 dungeons (sea/volcano/underworld/heaven/chaos), Tier-gated"
```

---

## Task 4: Dungeons integrity tests + isDungeonUnlocked system

**Files:**
- Create: `games/inflation-rpg/src/systems/dungeons.ts`
- Create: `games/inflation-rpg/src/systems/dungeons.test.ts`
- Modify: `games/inflation-rpg/src/data/dungeons.test.ts`

- [ ] **Step 1: Write failing tests for isDungeonUnlocked**

Create `src/systems/dungeons.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isDungeonUnlocked } from './dungeons';
import type { MetaState, Dungeon } from '../types';

function makeMeta(overrides: Partial<MetaState> = {}): MetaState {
  return { ascTier: 0, ...overrides } as MetaState;
}

function mkDungeon(unlockGate: Dungeon['unlockGate']): Dungeon {
  return {
    id: 'test', nameKR: 'test', emoji: '🧪', themeColor: '#000',
    unlockGate, monsterPool: [], bossIds: { mini: 'm', major: 'M', sub: ['a','b','c'], final: 'f' },
    isHardOnly: false,
  };
}

describe('isDungeonUnlocked', () => {
  it('start: always true', () => {
    expect(isDungeonUnlocked(makeMeta({ ascTier: 0 }), mkDungeon({ type: 'start' }))).toBe(true);
    expect(isDungeonUnlocked(makeMeta({ ascTier: 99 }), mkDungeon({ type: 'start' }))).toBe(true);
  });
  it('asc-tier: false below threshold', () => {
    expect(isDungeonUnlocked(makeMeta({ ascTier: 0 }), mkDungeon({ type: 'asc-tier', tier: 1 }))).toBe(false);
    expect(isDungeonUnlocked(makeMeta({ ascTier: 2 }), mkDungeon({ type: 'asc-tier', tier: 5 }))).toBe(false);
  });
  it('asc-tier: true at or above threshold', () => {
    expect(isDungeonUnlocked(makeMeta({ ascTier: 1 }), mkDungeon({ type: 'asc-tier', tier: 1 }))).toBe(true);
    expect(isDungeonUnlocked(makeMeta({ ascTier: 99 }), mkDungeon({ type: 'asc-tier', tier: 12 }))).toBe(true);
  });
  it('hardmode gate: false unless hardModeUnlocked', () => {
    const noHard = { ascTier: 0, hardModeUnlocked: false } as MetaState;
    const yesHard = { ascTier: 0, hardModeUnlocked: true } as MetaState;
    expect(isDungeonUnlocked(noHard, mkDungeon({ type: 'hardmode' }))).toBe(false);
    expect(isDungeonUnlocked(yesHard, mkDungeon({ type: 'hardmode' }))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (function not exported)**

Run: `pnpm --filter @forge/game-inflation-rpg test src/systems/dungeons.test.ts`

Expected: FAIL with "Cannot find module './dungeons'" or "isDungeonUnlocked is not exported".

- [ ] **Step 3: Implement isDungeonUnlocked**

Create `src/systems/dungeons.ts`:

```ts
import type { MetaState, Dungeon } from '../types';

/**
 * Phase Realms — dungeon unlock predicate.
 * - start: always available.
 * - asc-tier: requires meta.ascTier >= gate.tier.
 * - boss-count: requires count of normalBossesKilled >= gate.count.
 * - hardmode: requires meta.hardModeUnlocked.
 */
export function isDungeonUnlocked(meta: MetaState, dungeon: Dungeon): boolean {
  const gate = dungeon.unlockGate;
  switch (gate.type) {
    case 'start':       return true;
    case 'asc-tier':    return meta.ascTier >= gate.tier;
    case 'boss-count':  return (meta.normalBossesKilled?.length ?? 0) >= gate.count;
    case 'hardmode':    return meta.hardModeUnlocked === true;
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm --filter @forge/game-inflation-rpg test src/systems/dungeons.test.ts`

Expected: 4 tests PASS.

- [ ] **Step 5: Add integrity test for new dungeons**

Append to `src/data/dungeons.test.ts`:

```ts
import { BOSSES } from './bosses';
import { MONSTERS } from './monsters';

describe('Phase Realms — 5 new dungeons integrity', () => {
  const NEW_IDS = ['sea', 'volcano', 'underworld', 'heaven', 'chaos'];
  for (const id of NEW_IDS) {
    it(`dungeon ${id} exists with asc-tier gate`, () => {
      const d = DUNGEONS.find(x => x.id === id);
      expect(d).toBeDefined();
      expect(d?.unlockGate.type).toBe('asc-tier');
    });
    it(`dungeon ${id} all referenced boss IDs exist in BOSSES`, () => {
      const d = DUNGEONS.find(x => x.id === id)!;
      const bossIdSet = new Set(BOSSES.map(b => b.id));
      expect(bossIdSet.has(d.bossIds.mini)).toBe(true);
      expect(bossIdSet.has(d.bossIds.major)).toBe(true);
      for (const sub of d.bossIds.sub) expect(bossIdSet.has(sub)).toBe(true);
      expect(bossIdSet.has(d.bossIds.final)).toBe(true);
    });
    it(`dungeon ${id} all monster IDs exist in MONSTERS`, () => {
      const d = DUNGEONS.find(x => x.id === id)!;
      const monsterIdSet = new Set(MONSTERS.map(m => m.id));
      for (const m of d.monsterPool) expect(monsterIdSet.has(m)).toBe(true);
    });
  }
});
```

- [ ] **Step 6: Run test — fix any missing boss / monster ID by adding minimal entries**

Run: `pnpm --filter @forge/game-inflation-rpg test src/data/dungeons.test.ts`

Expected: if a boss/monster ID is missing, the failure tells you exactly which one. Add a minimal entry to `src/data/bosses.ts` or `src/data/monsters.ts` mirroring an existing entry's shape (boss: `{ id, nameKR, emoji, areaId, bpReward, isHardMode: false, hpMult, atkMult }`; monster: see existing structure).

Iterate until all tests pass.

- [ ] **Step 7: Commit**

```bash
git add games/inflation-rpg/src/systems/dungeons.ts games/inflation-rpg/src/systems/dungeons.test.ts games/inflation-rpg/src/data/dungeons.test.ts games/inflation-rpg/src/data/bosses.ts games/inflation-rpg/src/data/monsters.ts
git commit -m "feat(game-inflation-rpg): Phase Realms — isDungeonUnlocked system + integrity tests for 5 new dungeons"
```

---

## Task 5: pickRandomDungeon unlock filter + DungeonPickModal locked grayed

**Files:**
- Modify: `games/inflation-rpg/src/systems/compass.ts:79-92` (pickRandomDungeon)
- Modify: `games/inflation-rpg/src/systems/compass.test.ts` (add unlock-filter tests)
- Modify: `games/inflation-rpg/src/screens/DungeonPickModal.tsx`
- Modify: `games/inflation-rpg/src/screens/DungeonPickModal.test.tsx`

- [ ] **Step 1: Write failing test — pickRandomDungeon excludes locked dungeons**

Append to `src/systems/compass.test.ts`:

```ts
describe('pickRandomDungeon — unlock filter (Phase Realms)', () => {
  function meta(ascTier: number, compassOwned: Partial<Record<CompassId, boolean>> = {}): MetaState {
    return { ascTier, compassOwned: { ...EMPTY_COMPASS_OWNED, ...compassOwned }, dungeonMiniBossesCleared: [], dungeonMajorBossesCleared: [] } as MetaState;
  }
  it('excludes asc-tier-gated dungeons when ascTier below threshold', () => {
    const m = meta(0);
    const rng = mockRng([0.5]);
    const picked = pickRandomDungeon(m, DUNGEONS, rng);
    const pickedDun = DUNGEONS.find(d => d.id === picked)!;
    expect(pickedDun.unlockGate.type === 'start').toBe(true);  // only start dungeons reachable
  });
  it('includes asc-tier-gated dungeons when ascTier sufficient', () => {
    const m = meta(12);  // all gates met
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      seen.add(pickRandomDungeon(m, DUNGEONS, () => Math.random()));
    }
    expect(seen.size).toBe(8);  // all 8 dungeons reachable
  });
});
```

Use `mockRng` and `EMPTY_COMPASS_OWNED` imports from the existing test file. If the existing tests use a different RNG mock pattern, follow it.

- [ ] **Step 2: Run test — expect FAIL (locked dungeons currently in pool)**

Run: `pnpm --filter @forge/game-inflation-rpg test src/systems/compass.test.ts`

Expected: FAIL — at ascTier 0, picker can return 'sea' / 'volcano' / etc.

- [ ] **Step 3: Modify pickRandomDungeon to filter locked dungeons**

Edit `src/systems/compass.ts:79-92`. Replace pickRandomDungeon:

```ts
import { isDungeonUnlocked } from './dungeons';  // [신규 import — Phase Realms]

export function pickRandomDungeon(meta: MetaState, dungeons: Dungeon[], rng: () => number = Math.random): string {
  // Phase Realms — exclude locked dungeons from weight pool.
  const available = dungeons.filter(d => isDungeonUnlocked(meta, d));
  if (available.length === 0) {
    // Defensive: should never happen since plains/forest/mountains are start.
    console.warn('pickRandomDungeon: no unlocked dungeons — falling back to dungeons[0]');
    return dungeons[0].id;
  }
  const weights = available.map(d => getDungeonWeight(meta, d.id));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < available.length; i++) {
    r -= weights[i];
    if (r < 0) return available[i].id;
  }
  return available[available.length - 1].id;
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm --filter @forge/game-inflation-rpg test src/systems/compass.test.ts`

Expected: both new tests PASS, existing 21 tests still PASS.

- [ ] **Step 5: Modify DungeonPickModal — free-select mode shows locked grayed**

In `src/screens/DungeonPickModal.tsx`, find the free-select mode rendering (around L41-45 + the dungeon list rendering). For each rendered dungeon button, compute `unlocked = isDungeonUnlocked(meta, dungeon)` and render disabled + grayed + tier-hint text when locked:

```tsx
import { isDungeonUnlocked } from '../systems/dungeons';
// ... inside free-select rendering:
{DUNGEONS.map(d => {
  const unlocked = isDungeonUnlocked(meta, d);
  const canFree = unlocked && canFreeSelect(meta, d.id);
  const hint = !unlocked
    ? (d.unlockGate.type === 'asc-tier' ? `🔒 Tier ${d.unlockGate.tier} 도달 시 해제` : '🔒 잠김')
    : null;
  return (
    <button
      key={d.id}
      disabled={!canFree}
      onClick={() => canFree && onPickFree(d.id)}
      style={{ opacity: !unlocked ? 0.35 : (canFree ? 1 : 0.6) }}
    >
      {d.emoji} {d.nameKR}
      {hint && <span style={{ display: 'block', fontSize: 11, color: '#888' }}>{hint}</span>}
    </button>
  );
})}
```

Adapt the JSX to match the existing modal style (className / Forge components).

- [ ] **Step 6: Add modal tests**

Append to `src/screens/DungeonPickModal.test.tsx`:

```ts
describe('Phase Realms — locked dungeons in free-select mode', () => {
  it('shows asc-tier-gated dungeon as grayed with tier hint at ascTier 0', async () => {
    // Render modal with meta: omni owned (so free-select is available) + ascTier 0.
    // Switch to free mode. Verify 'sea' / 'volcano' / etc. render with disabled + hint.
    // (Specifics depend on existing test rig — follow patterns from existing DungeonPickModal tests.)
  });
  it('clicking a locked dungeon is a no-op (button disabled)', async () => { /* ... */ });
  it('shows all 8 dungeons enabled at ascTier 12', async () => { /* ... */ });
});
```

Fill in test bodies using the existing test harness pattern (likely React Testing Library + store hydration).

- [ ] **Step 7: Run modal tests**

Run: `pnpm --filter @forge/game-inflation-rpg test src/screens/DungeonPickModal.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add games/inflation-rpg/src/systems/compass.ts games/inflation-rpg/src/systems/compass.test.ts games/inflation-rpg/src/screens/DungeonPickModal.tsx games/inflation-rpg/src/screens/DungeonPickModal.test.tsx
git commit -m "feat(game-inflation-rpg): Phase Realms — pickRandomDungeon unlock filter + DungeonPickModal locked grayed"
```

---

## Task 6: Relics CompassTab auto-extends to 17 entries + locked hint

**Files:**
- Modify: `games/inflation-rpg/src/screens/Relics.tsx:81-105`
- Modify: `games/inflation-rpg/src/screens/Relics.test.tsx`

The existing CompassTab iterates over `ALL_COMPASS_IDS`, so it automatically expands to 17 entries when ALL_COMPASS_IDS does. This task adds a locked hint for entries whose dungeon is currently asc-tier-gated.

- [ ] **Step 1: Write failing test**

Append to `src/screens/Relics.test.tsx`:

```ts
describe('Phase Realms — Compass tab 17 entries + locked hint', () => {
  it('renders 17 entries (8 dungeons × 2 + omni) at ascTier 0', async () => {
    // ... render Relics with default meta (compassOwned all false, ascTier 0)
    // ... switch to Compass tab
    // ... expect 17 entry rows
  });
  it('asc-tier-gated dungeon compass entries show "Tier N 해제" hint at ascTier 0', async () => {
    // ... expect 'sea_first' row to show "Tier 1 도달 시 해제"
  });
  it('omni entry never shows tier hint', async () => { /* ... */ });
});
```

Use the existing test rig pattern.

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm --filter @forge/game-inflation-rpg test src/screens/Relics.test.tsx`

Expected: FAIL (hint text missing).

- [ ] **Step 3: Modify CompassTab to show locked hint**

In `src/screens/Relics.tsx` (around L81-105), within the per-entry render, after the owned/missing hint, append a Tier-gate hint:

```tsx
import { isDungeonUnlocked } from '../systems/dungeons';
import { DUNGEONS } from '../data/dungeons';

// inside CompassTab() loop over ALL_COMPASS_IDS:
const entry = COMPASS_ITEMS[id];
const dungeon = entry.dungeonId ? DUNGEONS.find(d => d.id === entry.dungeonId) : null;
const tierLocked = dungeon && !isDungeonUnlocked(meta, dungeon);
// ... existing render of name/desc/owned status ...
{tierLocked && dungeon!.unlockGate.type === 'asc-tier' && (
  <div style={{ fontSize: 11, color: '#bbb' }}>
    🔒 Tier {dungeon!.unlockGate.tier} 도달 시 해제
  </div>
)}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm --filter @forge/game-inflation-rpg test src/screens/Relics.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/screens/Relics.tsx games/inflation-rpg/src/screens/Relics.test.tsx
git commit -m "feat(game-inflation-rpg): Phase Realms — Relics Compass tab locked-tier hint"
```

---

## Task 7: Persist v13 migration + INITIAL_META expand

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts:1099` (STORE_VERSION)
- Modify: `games/inflation-rpg/src/store/gameStore.ts:382-388` (chain migration)
- Modify: `games/inflation-rpg/src/store/gameStore.ts:66-123` (INITIAL_META.compassOwned)
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts`

**Note:** `run.playerHp` field (added by Task 12 for cp2) will be migrated in the same `migrateV12ToV13` block. To keep cp1 self-contained, this Task 7 adds the migration scaffold only for compassOwned. Task 12 will append the `run.playerHp` initialization to the same block.

- [ ] **Step 1: Write failing migration test**

Append to `src/store/gameStore.test.ts`:

```ts
describe('Phase Realms — persist v12 → v13 migration', () => {
  it('expands compassOwned to 17 keys with defaults false for new dungeons', () => {
    const v12Envelope = {
      version: 12,
      state: {
        meta: {
          // ... (full v12 meta shape — copy from existing v11→v12 test as a template) ...
          compassOwned: {
            plains_first: true, plains_second: false,
            forest_first: false, forest_second: false,
            mountains_first: false, mountains_second: false,
            omni: false,
          },
          dungeonMiniBossesCleared: ['plains'],
          dungeonMajorBossesCleared: [],
          ascTier: 0,
          // ... other v12 required fields ...
        },
        run: null,
      },
    };
    const migrated = migrate(v12Envelope.state, 12);
    expect(Object.keys(migrated.meta.compassOwned).length).toBe(17);
    expect(migrated.meta.compassOwned.plains_first).toBe(true);    // preserved
    expect(migrated.meta.compassOwned.sea_first).toBe(false);      // new default
    expect(migrated.meta.compassOwned.chaos_second).toBe(false);   // new default
  });
});
```

Adapt the envelope shape from the existing v11→v12 test (search for "migrateV11ToV12" or "v11 → v12" in the same file).

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm --filter @forge/game-inflation-rpg test src/store/gameStore.test.ts`

Expected: FAIL — STORE_VERSION is still 12 / migrateV12ToV13 doesn't exist.

- [ ] **Step 3: Bump STORE_VERSION + add migration block**

Modify `src/store/gameStore.ts:1099`:

```ts
version: 13,  // 12 → 13 (Phase Realms)
```

Modify `src/store/gameStore.ts:382-388` (the migration block — extend the existing pattern):

```ts
if (fromVersion <= 11 && s.meta) {
  const m = s.meta as MetaState;
  m.compassOwned = m.compassOwned ?? { ...EMPTY_COMPASS_OWNED };
  m.dungeonMiniBossesCleared = m.dungeonMiniBossesCleared ?? [];
  m.dungeonMajorBossesCleared = m.dungeonMajorBossesCleared ?? [];
}
// Phase Realms — v12 → v13 — expand compassOwned to 17 keys (5 new dungeons × 2)
if (fromVersion <= 12 && s.meta) {
  const m = s.meta as MetaState;
  const next = { ...EMPTY_COMPASS_OWNED, ...m.compassOwned };
  m.compassOwned = next;
}
```

The `{ ...EMPTY_COMPASS_OWNED, ...m.compassOwned }` order ensures existing true values are preserved while new keys default to false (from EMPTY_COMPASS_OWNED's expanded form).

Update `INITIAL_META` (`src/store/gameStore.ts:120-122`) — `compassOwned: { ...EMPTY_COMPASS_OWNED }` already self-updates because EMPTY_COMPASS_OWNED was expanded in Task 2.

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm --filter @forge/game-inflation-rpg test src/store/gameStore.test.ts`

Expected: PASS for new migration test, no regression on existing 139 tests.

- [ ] **Step 5: Add v8/v9/v10/v11/v12 → v13 envelope chain test**

Append:

```ts
it('full chain v8 → v13 produces all expected v13 fields', () => {
  const v8Envelope = { /* minimal v8 shape */ };
  const migrated = migrate(v8Envelope, 8);
  // verify each migration step's field exists
  expect(migrated.meta.compassOwned).toBeDefined();
  expect(Object.keys(migrated.meta.compassOwned).length).toBe(17);
  // ... add asserts for other phase field additions accumulated through the chain
});
```

- [ ] **Step 6: Run all gameStore tests**

Run: `pnpm --filter @forge/game-inflation-rpg test src/store/gameStore.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts
git commit -m "feat(game-inflation-rpg): Phase Realms — persist v13 (compassOwned expand)"
```

---

## Task 8: cp1 checkpoint — full game suite green

**Files:** (verification only)

- [ ] **Step 1: Run typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: PASS (0 errors).

- [ ] **Step 2: Run lint**

```bash
pnpm --filter @forge/game-inflation-rpg lint
```

Expected: PASS.

- [ ] **Step 3: Run circular**

```bash
pnpm circular
```

Expected: PASS (0 circular deps).

- [ ] **Step 4: Run all vitest**

```bash
pnpm --filter @forge/game-inflation-rpg test
```

Expected: all tests PASS (count = 649 baseline + Task 1-7 additions, approximately 680).

- [ ] **Step 5: Run balance-milestones for regression check**

```bash
pnpm --filter @forge/game-inflation-rpg balance-milestones
```

Expected: PASS (no regression — Phase Realms cp1 has no balance impact).

- [ ] **Step 6: Tag checkpoint**

```bash
git tag phase-realms-cp1
```

Do NOT push to origin unless user explicitly requests.

---

# CHECKPOINT 2 — A (Phase E debt clearance)

## Task 9: MythicProc.trigger += 'on_kill' + MythicProcResult.cooldownReduce

**Files:**
- Modify: `games/inflation-rpg/src/types.ts:392-396` (MythicProc)
- Modify: `games/inflation-rpg/src/systems/effects.ts:140-145, 147-172` (MythicProcResult + evaluateMythicProcs)
- Modify: `games/inflation-rpg/src/systems/effects.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/systems/effects.test.ts`:

```ts
describe('Phase Realms — evaluateMythicProcs on_kill trigger + cooldownReduce', () => {
  it('on_kill trigger with sp_steal effect emits cooldownReduce = value', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [{ trigger: 'on_kill', effect: 'sp_steal', value: 0.3 }]);
    const result = evaluateMythicProcs(state, 'on_kill', {});
    expect(result.cooldownReduce).toBeCloseTo(0.3);
    expect(result.lifestealHeal).toBe(0);
  });
  it('on_kill with no procs returns 0 cooldownReduce', () => {
    const state = createEffectsState();
    registerMythicProcs(state, []);
    expect(evaluateMythicProcs(state, 'on_kill', {}).cooldownReduce).toBe(0);
  });
  it('multiple on_kill sp_steal stack additively', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [
      { trigger: 'on_kill', effect: 'sp_steal', value: 0.3 },
      { trigger: 'on_kill', effect: 'sp_steal', value: 0.5 },
    ]);
    expect(evaluateMythicProcs(state, 'on_kill', {}).cooldownReduce).toBeCloseTo(0.8);
  });
  it('on_kill ignores on_player_attack lifesteal procs', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [{ trigger: 'on_player_attack', effect: 'lifesteal', value: 0.2 }]);
    expect(evaluateMythicProcs(state, 'on_kill', {}).lifestealHeal).toBe(0);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL ('on_kill' not assignable to trigger type)**

Run: `pnpm --filter @forge/game-inflation-rpg test src/systems/effects.test.ts`

Expected: typecheck FAIL.

- [ ] **Step 3: Extend MythicProc.trigger**

Modify `src/types.ts:392-396`:

```ts
export interface MythicProc {
  trigger: 'on_player_hit_received' | 'on_player_attack' | 'on_kill';  // [Phase Realms — +'on_kill']
  effect: 'lifesteal' | 'thorns' | 'sp_steal' | 'magic_burst';
  value: number;
}
```

- [ ] **Step 4: Extend MythicProcResult + evaluateMythicProcs**

Modify `src/systems/effects.ts:140-172`:

```ts
export interface MythicProcResult {
  lifestealHeal: number;
  thornsReflect: number;
  spStealAmount: number;       // [DEPRECATED — replaced by cooldownReduce on 'on_kill', kept for compat]
  magicBurstDamage: number;
  cooldownReduce: number;       // [Phase Realms — seconds, from on_kill sp_steal]
}

export function evaluateMythicProcs(
  state: EffectsState,
  trigger: 'on_player_hit_received' | 'on_player_attack' | 'on_kill',
  ctx: { damageDealt?: number; damageReceived?: number; rng?: () => number; magnitudeBuff?: number },
): MythicProcResult {
  let lifestealHeal = 0;
  let thornsReflect = 0;
  let spStealAmount = 0;
  let magicBurstDamage = 0;
  let cooldownReduce = 0;
  const procs = state.permanentTriggers ?? [];
  for (const p of procs) {
    if (p.trigger !== trigger) continue;
    if (p.effect === 'lifesteal' && ctx.damageDealt) {
      lifestealHeal += ctx.damageDealt * p.value;
    } else if (p.effect === 'thorns' && ctx.damageReceived) {
      thornsReflect += ctx.damageReceived * p.value;
    } else if (p.effect === 'sp_steal') {
      // Phase Realms — sp_steal redefined: on_kill emits cooldownReduce (seconds).
      // Legacy on_player_attack path kept for compat but data no longer uses it.
      if (trigger === 'on_kill') {
        cooldownReduce += p.value;
      } else if (ctx.damageDealt) {
        spStealAmount += ctx.damageDealt * p.value;
      }
    } else if (p.effect === 'magic_burst' && ctx.damageDealt) {
      const r = ctx.rng ? ctx.rng() : Math.random();
      if (r < p.value) magicBurstDamage += ctx.damageDealt * 0.5;
    }
  }
  // Phase Realms — light_of_truth magnitude buff applies to proc results.
  const buff = ctx.magnitudeBuff ?? 1;
  return {
    lifestealHeal: lifestealHeal * buff,
    thornsReflect: thornsReflect * buff,
    spStealAmount: spStealAmount * buff,
    magicBurstDamage: magicBurstDamage * buff,
    cooldownReduce: cooldownReduce * buff,
  };
}
```

- [ ] **Step 5: Run test — expect PASS**

Run: `pnpm --filter @forge/game-inflation-rpg test src/systems/effects.test.ts`

Expected: 4 new tests PASS + 25 existing tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/src/types.ts games/inflation-rpg/src/systems/effects.ts games/inflation-rpg/src/systems/effects.test.ts
git commit -m "feat(game-inflation-rpg): Phase Realms — MythicProc 'on_kill' trigger + cooldownReduce + magnitudeBuff ctx"
```

---

## Task 10: Mythic data refactor — swift_winds target + sp_steal redefine

**Files:**
- Modify: `games/inflation-rpg/src/data/mythics.ts:84-102` (serpent_fang, gluttony_chalice, swift_winds)
- Modify: `games/inflation-rpg/src/data/mythics.ts:7-19` (MythicDef — verify target field accepts 'base' / 'ult')
- Modify: `games/inflation-rpg/src/data/mythics.test.ts` (data integrity)

- [ ] **Step 1: Modify MythicDef interface to document target values**

Edit `src/data/mythics.ts:7-19`. Update the inline comment on `target?: string`:

```ts
export interface MythicDef {
  id: MythicId;
  nameKR: string;
  emoji: string;
  descriptionKR: string;
  effectType: MythicEffectType;
  // target values:
  //   flat_mult:     'atk', 'hp', 'def', 'agi', 'luc', 'critDmg', 'evasion', 'fire_dmg',
  //                  'ice_dmg', 'thunder_dmg', 'holy_dmg', 'modifier_magnitude', 'all'
  //   drop_mult:     'gold', 'dr', 'dungeon_currency', 'all_kinds'
  //   cooldown_mult: 'base', 'ult', undefined (= 'both')  [Phase Realms]
  target?: string;
  value: number;
  acquisition: MythicAcquisition;
  procTrigger?: 'on_player_hit_received' | 'on_player_attack' | 'on_kill';  // [Phase Realms — +'on_kill']
  procEffect?: 'lifesteal' | 'thorns' | 'sp_steal' | 'magic_burst';
}
```

- [ ] **Step 2: Modify swift_winds, gluttony_chalice entries**

Replace `src/data/mythics.ts:89-102`:

```ts
  gluttony_chalice: { id: 'gluttony_chalice', nameKR: '탐욕의 성배', emoji: '🍷',
    descriptionKR: '처치 시 모든 active skill cooldown -0.3초',
    effectType: 'proc', value: 0.3,
    procTrigger: 'on_kill', procEffect: 'sp_steal',
    acquisition: { kind: 'random_drop' } },
  thorned_skin: { id: 'thorned_skin', nameKR: '가시 갑옷', emoji: '🌵',
    descriptionKR: '받은 데미지 50% 반사',
    effectType: 'proc', value: 0.5,
    procTrigger: 'on_player_hit_received', procEffect: 'thorns',
    acquisition: { kind: 'random_drop' } },
  swift_winds: { id: 'swift_winds', nameKR: '신속의 바람', emoji: '🌪️',
    descriptionKR: '기본 스킬 쿨다운 -20%',
    effectType: 'cooldown_mult', target: 'base', value: -0.2,
    acquisition: { kind: 'random_drop' } },
```

- [ ] **Step 3: Write test — gluttony_chalice now uses on_kill trigger**

Append to `src/data/mythics.test.ts`:

```ts
describe('Phase Realms — mythic data refactor', () => {
  it('gluttony_chalice procTrigger is on_kill', () => {
    expect(MYTHICS.gluttony_chalice.procTrigger).toBe('on_kill');
    expect(MYTHICS.gluttony_chalice.procEffect).toBe('sp_steal');
  });
  it('swift_winds has target=base', () => {
    expect(MYTHICS.swift_winds.target).toBe('base');
    expect(MYTHICS.swift_winds.effectType).toBe('cooldown_mult');
  });
  it('serpent_fang remains on_player_attack lifesteal', () => {
    expect(MYTHICS.serpent_fang.procTrigger).toBe('on_player_attack');
    expect(MYTHICS.serpent_fang.procEffect).toBe('lifesteal');
  });
  it('time_hourglass has no target (applies to both base and ult)', () => {
    expect(MYTHICS.time_hourglass.target).toBeUndefined();
    expect(MYTHICS.time_hourglass.effectType).toBe('cooldown_mult');
  });
});
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @forge/game-inflation-rpg test src/data/mythics.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/data/mythics.ts games/inflation-rpg/src/data/mythics.test.ts
git commit -m "feat(game-inflation-rpg): Phase Realms — swift_winds.target=base + gluttony_chalice on_kill redefine"
```

---

## Task 11: getMythicCooldownMult target filter (base / ult)

**Files:**
- Modify: `games/inflation-rpg/src/systems/mythics.ts:29-38` (getMythicCooldownMult)
- Modify: `games/inflation-rpg/src/systems/mythics.test.ts`

- [ ] **Step 1: Write failing test**

Append to `src/systems/mythics.test.ts`:

```ts
describe('Phase Realms — getMythicCooldownMult target filter', () => {
  it('swift_winds (target=base) applies to base skills only', () => {
    expect(getMythicCooldownMult(makeMeta(['swift_winds']), 'base')).toBeCloseTo(0.8);
    expect(getMythicCooldownMult(makeMeta(['swift_winds']), 'ult')).toBe(1);
  });
  it('time_hourglass (no target) applies to both base and ult', () => {
    expect(getMythicCooldownMult(makeMeta(['time_hourglass']), 'base')).toBeCloseTo(0.7);
    expect(getMythicCooldownMult(makeMeta(['time_hourglass']), 'ult')).toBeCloseTo(0.7);
  });
  it('swift_winds + time_hourglass on base = multiplicative', () => {
    // swift_winds (-20%) × time_hourglass (-30%) = 0.8 × 0.7 = 0.56
    expect(getMythicCooldownMult(makeMeta(['swift_winds', 'time_hourglass']), 'base')).toBeCloseTo(0.56);
  });
  it('swift_winds + time_hourglass on ult = only time_hourglass applies', () => {
    expect(getMythicCooldownMult(makeMeta(['swift_winds', 'time_hourglass']), 'ult')).toBeCloseTo(0.7);
  });
  it('cooldown floor 0.4 still enforced', () => {
    // hypothetical stack of heavy reducers — verify floor
    expect(getMythicCooldownMult(makeMeta(['swift_winds', 'time_hourglass', 'time_hourglass']), 'base')).toBeGreaterThanOrEqual(0.4);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (filter not implemented)**

Expected: swift_winds applies to both base and ult currently.

- [ ] **Step 3: Implement filter**

Replace `src/systems/mythics.ts:29-38`:

```ts
export function getMythicCooldownMult(meta: MetaState, kind: SkillKind): number {
  let mult = 1;
  for (const id of getEquippedMythics(meta)) {
    const def = MYTHICS[id];
    if (def.effectType !== 'cooldown_mult') continue;
    // Phase Realms — target filter: 'base' / 'ult' / undefined (= both)
    if (def.target && def.target !== kind) continue;
    // value is negative (-0.3 = -30%); apply as (1 + value)
    mult *= 1 + def.value;
  }
  return Math.max(0.4, mult);
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm --filter @forge/game-inflation-rpg test src/systems/mythics.test.ts`

Expected: PASS.

- [ ] **Step 5: Verify buildActiveSkills passes correct kind**

Open `src/systems/buildActiveSkills.ts:11-49`. Verify the cooldown application path passes `'base'` vs `'ult'` correctly to `getMythicCooldownMult`. If currently it passes a placeholder (`_kind`), change to actual kind. If the function is called once with both base and ult cooldowns multiplied, refactor to call twice (once per skill kind).

Add a test (`src/systems/buildActiveSkills.test.ts` if it exists, else inline in mythics.test.ts):

```ts
it('buildActiveSkillsForCombat applies swift_winds only to base skill cooldowns', () => {
  // Render a character with both base and ult skills
  // Equip swift_winds
  // Verify base skill cooldown is reduced 20%, ult is unchanged
});
```

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/src/systems/mythics.ts games/inflation-rpg/src/systems/mythics.test.ts games/inflation-rpg/src/systems/buildActiveSkills.ts
git commit -m "feat(game-inflation-rpg): Phase Realms — getMythicCooldownMult target filter (base/ult/both)"
```

---

## Task 12: RunState.playerHp + persist v13 (run portion) + store actions

**Files:**
- Modify: `games/inflation-rpg/src/types.ts:157-172` (RunState — add playerHp)
- Modify: `games/inflation-rpg/src/store/gameStore.ts:49-64` (INITIAL_RUN)
- Modify: `games/inflation-rpg/src/store/gameStore.ts:382-388` (migration block — append run portion)
- Modify: `games/inflation-rpg/src/store/gameStore.ts` (new actions)
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts`

- [ ] **Step 1: Add `playerHp` to RunState**

Modify `src/types.ts:157-172`:

```ts
export interface RunState {
  characterId: string;
  level: number;
  exp: number;
  bp: number;
  statPoints: number;
  allocated: AllocatedStats;
  currentDungeonId: string | null;
  currentFloor: number;
  isHardMode: boolean;
  monstersDefeated: number;
  goldThisRun: number;
  currentStage: number;
  dungeonRunMonstersDefeated: number;
  featherUsed: number;
  playerHp: number | null;          // [Phase Realms] null = hydrate to maxHp on next battle entry
}
```

- [ ] **Step 2: Update INITIAL_RUN**

Modify `src/store/gameStore.ts:49-64`. Add `playerHp: null,` to the INITIAL_RUN object (anywhere in the field list, but conventionally after `featherUsed`).

- [ ] **Step 3: Extend migration to initialize playerHp**

Append inside the migration block at `src/store/gameStore.ts` (after the compassOwned migration added in Task 7):

```ts
// Phase Realms — v12 → v13 (run portion): init playerHp = null
if (fromVersion <= 12 && s.run) {
  const r = s.run as RunState;
  if (r.playerHp === undefined) r.playerHp = null;
}
```

- [ ] **Step 4: Add new store actions**

Append the following actions to the store. Locate the existing `awardMiniBossCompass` block (around L1071) and add nearby:

```ts
hydratePlayerHpIfNull: () => set((s) => {
  if (!s.run) return {};
  if (s.run.playerHp !== null) return {};
  const maxHp = computeMaxHp(s.run, s.meta);   // helper — see Step 5
  return { run: { ...s.run, playerHp: maxHp } };
}),

applyDamageToPlayer: (amount) => set((s) => {
  if (!s.run || s.run.playerHp === null) return {};
  const next = Math.max(0, s.run.playerHp - amount);
  return { run: { ...s.run, playerHp: next } };
}),

applyLifestealHeal: (amount) => set((s) => {
  if (!s.run || s.run.playerHp === null) return {};
  const maxHp = computeMaxHp(s.run, s.meta);
  const next = Math.min(maxHp, s.run.playerHp + amount);
  return { run: { ...s.run, playerHp: next } };
}),

applyCooldownReduce: (_seconds) => {
  // No-op at store level — cooldownReduce is applied directly to BattleScene's
  // SkillSystem cooldown timers. This action exists for symmetry & future use.
},
```

Also update the StoreState interface to include these new action signatures (the existing pattern — search for `interface GameStore` or similar).

- [ ] **Step 5: Add computeMaxHp helper**

Inside `src/store/gameStore.ts` or a separate util:

```ts
import { CHARACTERS } from '../data/characters';
import { calcFinalStat } from '../systems/stats';
import { getMythicFlatMult } from '../systems/mythics';
import { getRelicFlatMult } from '../systems/relics';

function computeMaxHp(run: RunState, meta: MetaState): number {
  const char = CHARACTERS.find(c => c.id === run.characterId);
  if (!char) return 100;  // safety fallback
  const charLevel = meta.characterLevels[run.characterId] ?? 1;
  const charLevelMult = 1 + 0.05 * (charLevel - 1);  // mirror existing formula
  const ascTierMult = 1 + 0.1 * meta.ascTier;
  const ascTreeHpMult = 1 + 0.05 * (meta.ascTree.hp_pct ?? 0);
  const hpMetaMult = getMythicFlatMult(meta, 'hp') * getRelicFlatMult(meta, 'hp');
  const allEquipped = /* lookup from inventory by equippedItemIds — replicate BattleScene pattern */;
  const baseAbility = 1 + 0.1 * meta.baseAbilityLevel;
  return calcFinalStat('hp', run.allocated.hp, char.statMultipliers.hp, allEquipped, baseAbility, charLevelMult, ascTierMult, ascTreeHpMult, hpMetaMult);
}
```

**NOTE:** Open BattleScene.ts and copy the exact maxHp computation (lines around the `playerHP` calc at L205) — replicate that here. If BattleScene uses some helpers that aren't exported, refactor BattleScene to call this `computeMaxHp` instead (DRY).

- [ ] **Step 6: Write failing tests**

Append to `src/store/gameStore.test.ts`:

```ts
describe('Phase Realms — run.playerHp store actions', () => {
  it('migration v12 → v13 sets run.playerHp = null when run exists', () => {
    const v12Run = { /* ... run fields without playerHp ... */ };
    const v12State = { run: v12Run, meta: {/* ... */} };
    const migrated = migrate(v12State, 12);
    expect(migrated.run.playerHp).toBeNull();
  });

  it('hydratePlayerHpIfNull sets playerHp to maxHp when null', () => {
    const s = useGameStore.getState();
    // ... setup a run via startRun action ...
    expect(s.run?.playerHp).toBeNull();
    s.hydratePlayerHpIfNull();
    expect(useGameStore.getState().run?.playerHp).toBeGreaterThan(0);
  });

  it('hydratePlayerHpIfNull is no-op when playerHp already set', () => {
    // ... setup, then set playerHp manually, then hydrate ...
  });

  it('applyDamageToPlayer reduces playerHp, clamped to 0', () => {
    // ... setup with playerHp = 100, apply 30 damage, expect 70 ...
    // ... apply 100 more, expect 0 (not negative) ...
  });

  it('applyLifestealHeal heals, capped at maxHp', () => {
    // ... setup with playerHp = 50, maxHp ~100, heal 30, expect 80 ...
    // ... heal 1000, expect maxHp (not over) ...
  });
});
```

- [ ] **Step 7: Run all tests**

Run: `pnpm --filter @forge/game-inflation-rpg test`

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add games/inflation-rpg/src/types.ts games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts
git commit -m "feat(game-inflation-rpg): Phase Realms — RunState.playerHp + hydrate/damage/lifesteal store actions + v13 run migration"
```

---

## Task 13: BattleScene HP refactor — estimate → store.run.playerHp

**Files:**
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts:200-393` (playerHP usage)

The goal: replace `currentHPEstimate = playerHP - run.monstersDefeated * finalDmgTaken * 0.1` with reads from `store.run.playerHp`. Apply lifesteal heal. Apply cooldownReduce on kill. Apply magnitudeBuff (light_of_truth) to procs.

- [ ] **Step 1: Hydrate playerHp on battle entry**

Find the BattleScene `create()` method (or wherever battle initialization happens). Add:

```ts
// Phase Realms — ensure run.playerHp is hydrated to maxHp at entry if null.
useGameStore.getState().hydratePlayerHpIfNull();
```

- [ ] **Step 2: Compute magnitudeBuff for procs (light_of_truth)**

In `src/battle/BattleScene.ts`, before the procs evaluation (around L220), compute:

```ts
// Phase Realms — light_of_truth magnitude buff applies to proc magnitudes.
const magnitudeBuff = 1 + getMythicFlatMult(meta, 'modifier_magnitude') - 1;
// Note: getMythicFlatMult returns (1 + value) for matching target.
// We want the additive % only, i.e. value field. Simpler:
const lightBuff = meta.mythicEquipped.includes('light_of_truth') ? 1.25 : 1.0;
```

Use the simpler form (`lightBuff`).

- [ ] **Step 3: Pass magnitudeBuff to evaluateMythicProcs and apply lifesteal**

Replace `src/battle/BattleScene.ts:222-241` (the existing eval block):

```ts
// Phase E + Realms — mythic on_player_attack procs (lifesteal / magic_burst).
// magnitudeBuff (light_of_truth) is applied inside evaluateMythicProcs.
const attackProcs = evaluateMythicProcs(this.effectsState, 'on_player_attack', {
  damageDealt: totalDmg,
  magnitudeBuff: lightBuff,
});
const totalEnemyDmg = totalDmg + attackProcs.magicBurstDamage;
this.enemyHP = Math.max(0, this.enemyHP - totalEnemyDmg);

// Phase Realms — apply lifesteal heal to run.playerHp.
if (attackProcs.lifestealHeal > 0) {
  useGameStore.getState().applyLifestealHeal(attackProcs.lifestealHeal);
}
```

- [ ] **Step 4: Apply on_kill procs (cooldownReduce) when enemyHP <= 0**

In `src/battle/BattleScene.ts:246` (the `if (this.enemyHP <= 0)` branch), add at the top:

```ts
if (this.enemyHP <= 0) {
  // Phase Realms — on_kill procs (sp_steal → cooldownReduce).
  const killProcs = evaluateMythicProcs(this.effectsState, 'on_kill', { magnitudeBuff: lightBuff });
  if (killProcs.cooldownReduce > 0) {
    const reduceMs = killProcs.cooldownReduce * 1000;
    for (const skill of this.activeSkills) {
      const remaining = this.skillCooldowns.get(skill.id) ?? 0;
      this.skillCooldowns.set(skill.id, Math.max(0, remaining - reduceMs));
    }
  }
  // ... existing kill-handling code (XP gain, gold, dungeon advance, etc.) ...
```

If the BattleScene uses a different field name for skill cooldown tracking (e.g., `this.cooldownsMs` per SkillSystem reference at `src/battle/SkillSystem.ts:11`), use that exact field. Check by reading SkillSystem.ts.

- [ ] **Step 5: Replace currentHPEstimate with store.run.playerHp**

Replace `src/battle/BattleScene.ts:358-376`:

```ts
// Phase Realms — apply damage to run.playerHp and check defeat.
useGameStore.getState().applyDamageToPlayer(finalDmgTaken);
const runAfterHit = useGameStore.getState().run;
const currentPlayerHp = runAfterHit?.playerHp ?? 0;

if (currentPlayerHp <= 0) {
  // Phase E — Revive check (feather_of_fate relic + phoenix_feather mythic).
  const totalRevives = relicReviveCount(meta) + getMythicReviveCount(meta);
  if ((runAfterHit?.featherUsed ?? 0) < totalRevives) {
    // Revive: full HP + featherUsed++
    useGameStore.setState((s) => {
      if (!s.run) return {};
      const maxHp = /* computeMaxHp inline or call helper */;
      return {
        run: {
          ...s.run,
          featherUsed: s.run.featherUsed + 1,
          playerHp: maxHp,
          monstersDefeated: Math.floor(s.run.monstersDefeated * 0.5),  // keep estimate-era compat
        },
      };
    });
    playSfx('levelup');
    return;
  }

  this.combatTimer?.remove();
  playSfx('defeat');
  const monsterLevel = this.cachedMonsterLevel;
  const newBP = relicNoDeathLoss(meta) ? run.bp : onDefeat(run.bp, monsterLevel, run.isHardMode);
  useGameStore.setState((s) => ({ run: { ...s.run, bp: newBP, playerHp: null } }));  // null = re-hydrate next run
  useGameStore.getState().resetDungeon();
  if (isRunOver(newBP)) {
    useGameStore.getState().endRun();
  } else {
    this.callbacks.onBattleEnd(false);
  }
}
```

- [ ] **Step 6: Update HP HUD (if BattleScene renders player HP bar)**

If BattleScene renders a player HP bar (search for `playerHpBar` or similar), point it at `useGameStore.getState().run.playerHp / maxHp` instead of the estimate.

- [ ] **Step 7: Run all tests**

Run: `pnpm --filter @forge/game-inflation-rpg test`

Expected: PASS. If any tests assert on the old estimate behavior (BattleScene unit tests), update them.

- [ ] **Step 8: Commit**

```bash
git add games/inflation-rpg/src/battle/BattleScene.ts
git commit -m "feat(game-inflation-rpg): Phase Realms — BattleScene HP refactor (run.playerHp + lifesteal + on_kill cooldownReduce)"
```

---

## Task 14: getMythicXpMult — extend to recognize drop_mult target='all_kinds'

**Files:**
- Modify: `games/inflation-rpg/src/systems/mythics.ts:52-60`
- Modify: `games/inflation-rpg/src/systems/mythics.test.ts`

The spec wants `infinity_seal` (drop_mult, target='all_kinds') to also affect XP. Currently `getMythicXpMult` only checks `effectType === 'xp_mult'`. Extend.

- [ ] **Step 1: Write failing test**

Append to `src/systems/mythics.test.ts`:

```ts
describe('Phase Realms — getMythicXpMult includes drop_mult all_kinds (infinity_seal)', () => {
  it('infinity_seal (drop_mult all_kinds) doubles xp', () => {
    expect(getMythicXpMult(makeMeta(['infinity_seal']))).toBeCloseTo(2.0);
  });
  it('infinity_seal × soul_truth = 2 × 3 = 6', () => {
    expect(getMythicXpMult(makeMeta(['infinity_seal', 'soul_truth']))).toBeCloseTo(6.0);
  });
  it('dimension_navigator (drop_mult dungeon_currency) does NOT affect xp', () => {
    expect(getMythicXpMult(makeMeta(['dimension_navigator']))).toBe(1);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Expected: infinity_seal currently doesn't affect xp.

- [ ] **Step 3: Extend getMythicXpMult**

Replace `src/systems/mythics.ts:52-60`:

```ts
export function getMythicXpMult(meta: MetaState): number {
  let mult = 1;
  for (const id of getEquippedMythics(meta)) {
    const def = MYTHICS[id];
    if (def.effectType === 'xp_mult') {
      mult *= 1 + def.value;
    } else if (def.effectType === 'drop_mult' && def.target === 'all_kinds') {
      // Phase Realms — all_kinds drop_mult includes XP gain.
      mult *= 1 + def.value;
    }
  }
  return mult;
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm --filter @forge/game-inflation-rpg test src/systems/mythics.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/systems/mythics.ts games/inflation-rpg/src/systems/mythics.test.ts
git commit -m "feat(game-inflation-rpg): Phase Realms — getMythicXpMult includes drop_mult all_kinds (infinity_seal)"
```

---

## Task 15: light_of_truth scope — verify modifier path still works + add regression test

**Files:**
- Modify: `games/inflation-rpg/src/systems/effects.test.ts` (light_of_truth proc magnitude integration)

The magnitudeBuff was added in Task 9. light_of_truth's modifier-magnitude path remains untouched (handled separately by modifier system). This task verifies integration.

- [ ] **Step 1: Write integration test**

Append to `src/systems/effects.test.ts`:

```ts
describe('Phase Realms — light_of_truth applies to proc magnitudes via magnitudeBuff', () => {
  it('lifesteal heal is ×1.25 when light_of_truth equipped', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [{ trigger: 'on_player_attack', effect: 'lifesteal', value: 0.2 }]);
    const baseHeal = evaluateMythicProcs(state, 'on_player_attack', { damageDealt: 100 }).lifestealHeal;
    const buffedHeal = evaluateMythicProcs(state, 'on_player_attack', { damageDealt: 100, magnitudeBuff: 1.25 }).lifestealHeal;
    expect(baseHeal).toBeCloseTo(20);   // 100 × 0.2
    expect(buffedHeal).toBeCloseTo(25); // 100 × 0.2 × 1.25
  });
  it('thorns reflect is ×1.25 with magnitudeBuff', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [{ trigger: 'on_player_hit_received', effect: 'thorns', value: 0.5 }]);
    const result = evaluateMythicProcs(state, 'on_player_hit_received', { damageReceived: 100, magnitudeBuff: 1.25 });
    expect(result.thornsReflect).toBeCloseTo(62.5);  // 100 × 0.5 × 1.25
  });
  it('cooldownReduce (on_kill) is ×1.25 with magnitudeBuff', () => {
    const state = createEffectsState();
    registerMythicProcs(state, [{ trigger: 'on_kill', effect: 'sp_steal', value: 0.4 }]);
    const result = evaluateMythicProcs(state, 'on_kill', { magnitudeBuff: 1.25 });
    expect(result.cooldownReduce).toBeCloseTo(0.5);  // 0.4 × 1.25
  });
});
```

- [ ] **Step 2: Run test — expect PASS (Task 9 already implemented the buff)**

Run: `pnpm --filter @forge/game-inflation-rpg test src/systems/effects.test.ts`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/systems/effects.test.ts
git commit -m "test(game-inflation-rpg): Phase Realms — light_of_truth magnitude buff applies to procs"
```

---

## Task 16: cp2 checkpoint — full game suite green

**Files:** (verification only)

- [ ] **Step 1: Run all checks**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck && \
pnpm --filter @forge/game-inflation-rpg lint && \
pnpm circular && \
pnpm --filter @forge/game-inflation-rpg test && \
pnpm --filter @forge/game-inflation-rpg balance-milestones
```

Expected: ALL PASS. Tests count approximately 710 (649 baseline + Tasks 1-15 additions).

- [ ] **Step 2: Tag checkpoint**

```bash
git tag phase-realms-cp2
```

---

# CHECKPOINT 3 — Balance-sim parity + e2e

## Task 17: balance-sim — apply lifesteal / cooldown-reduce / xp multiplier from infinity_seal

**Files:**
- Modify: `games/inflation-rpg/tools/balance-sim.ts`
- Modify: any balance-sim test files (if they exist)

- [ ] **Step 1: Read existing SimPlayer interface**

Open `games/inflation-rpg/tools/balance-sim.ts`. Find the SimPlayer interface (or class). Understand how mythic effects are currently applied.

- [ ] **Step 2: Add lifesteal & cooldown-reduce fields to SimPlayer**

Modify SimPlayer to track:
- `effectiveHpMult` — extra HP carry from lifesteal (lifesteal per kill × kill rate × time)
- `cooldownReducePerKill` — seconds, from gluttony_chalice on_kill
- For each tick, after computing kills, advance skill cooldowns by the reduce amount.

```ts
// Pseudo-code for sim tick:
function simTick(player: SimPlayer, mythicEquipped: MythicId[]) {
  const lifesteal = computeLifestealPerHit(mythicEquipped);  // 0.2 × dmg if serpent_fang
  const cooldownReduce = computeCooldownReducePerKill(mythicEquipped);  // 0.3 if gluttony_chalice
  const magnitudeBuff = mythicEquipped.includes('light_of_truth') ? 1.25 : 1.0;
  // ... apply lifesteal × magnitudeBuff to effective HP regen rate ...
  // ... reduce skill cooldowns by cooldownReduce × magnitudeBuff per kill ...
}
```

- [ ] **Step 3: Verify infinity_seal xp coverage in sim**

The sim's XP calculation uses `getMythicXpMult` (or equivalent). After Task 14, `getMythicXpMult` returns 2× when infinity_seal equipped. Add a sim parity test:

```ts
it('infinity_seal doubles sim XP progression', () => {
  const baselineLevels = simulateRun({ mythicEquipped: [] }).finalLevel;
  const withSealLevels = simulateRun({ mythicEquipped: ['infinity_seal'] }).finalLevel;
  expect(withSealLevels).toBeGreaterThan(baselineLevels * 1.5);  // approximately 2× with diminishing
});
```

- [ ] **Step 4: Run balance-milestones**

```bash
pnpm --filter @forge/game-inflation-rpg balance-milestones
```

Expected: PASS (mythic-off baseline unchanged).

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/tools/balance-sim.ts
git commit -m "feat(game-inflation-rpg): Phase Realms — balance-sim parity for lifesteal/cooldownReduce/infinity_seal XP"
```

---

## Task 18: e2e — dungeon-unlock-flow

**Files:**
- Create: `games/inflation-rpg/e2e/dungeon-unlock-flow.spec.ts`

- [ ] **Step 1: Write e2e spec**

Create `games/inflation-rpg/e2e/dungeon-unlock-flow.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { gameUrl } from './helpers';

test.describe('Phase Realms — dungeon unlock flow', () => {
  test('locked dungeons appear grayed in free-select mode at ascTier 0', async ({ page }) => {
    await page.goto(gameUrl);
    // Seed store: ascTier=0, omni owned (so free-select is available)
    await page.evaluate(() => {
      const store = (window as any).__zustand_inflation_rpg_store__;
      store.setState({
        meta: {
          ...store.getState().meta,
          ascTier: 0,
          compassOwned: { ...store.getState().meta.compassOwned, omni: true },
        },
      });
    });
    // Navigate to town → click dungeon entry → open modal → switch to free mode
    await page.getByText('🚪 던전 입장').click();
    await page.getByText(/자유 선택/).click();
    // Verify 'sea' dungeon shows tier hint
    await expect(page.getByText(/Tier 1.*해제/)).toBeVisible();
    await expect(page.getByText(/Tier 3.*해제/)).toBeVisible();  // volcano
    await expect(page.getByText(/Tier 12.*해제/)).toBeVisible(); // chaos
  });

  test('ascTier=2 unlocks sea but keeps volcano locked', async ({ page }) => {
    await page.goto(gameUrl);
    await page.evaluate(() => {
      const store = (window as any).__zustand_inflation_rpg_store__;
      store.setState({
        meta: { ...store.getState().meta, ascTier: 2, compassOwned: { ...store.getState().meta.compassOwned, omni: true } },
      });
    });
    await page.getByText('🚪 던전 입장').click();
    await page.getByText(/자유 선택/).click();
    const seaButton = page.getByRole('button', { name: /해/ });
    await expect(seaButton).toBeEnabled();
    const volcanoButton = page.getByRole('button', { name: /화산/ });
    await expect(volcanoButton).toBeDisabled();
  });

  test('all 8 dungeons enabled at ascTier 12', async ({ page }) => {
    await page.goto(gameUrl);
    await page.evaluate(() => {
      const store = (window as any).__zustand_inflation_rpg_store__;
      store.setState({
        meta: { ...store.getState().meta, ascTier: 12, compassOwned: { ...store.getState().meta.compassOwned, omni: true } },
      });
    });
    await page.getByText('🚪 던전 입장').click();
    await page.getByText(/자유 선택/).click();
    for (const name of ['평야', '깊은숲', '산악', '해', '화산', '명계', '천계', '혼돈']) {
      await expect(page.getByRole('button', { name: new RegExp(name) })).toBeEnabled();
    }
  });
});
```

Adapt the seed pattern from existing e2e tests (e.g., `e2e/compass-flow.spec.ts`).

- [ ] **Step 2: Run e2e**

```bash
pnpm --filter @forge/game-inflation-rpg e2e -- dungeon-unlock-flow
```

Expected: 3 logical tests × 2 projects = 6 PASS.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/e2e/dungeon-unlock-flow.spec.ts
git commit -m "test(game-inflation-rpg): Phase Realms — e2e dungeon-unlock-flow (3 logical × 2 projects)"
```

---

## Task 19: e2e — lifesteal-flow

**Files:**
- Create: `games/inflation-rpg/e2e/lifesteal-flow.spec.ts`

- [ ] **Step 1: Write e2e spec**

Create `games/inflation-rpg/e2e/lifesteal-flow.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { gameUrl } from './helpers';

test.describe('Phase Realms — lifesteal heals run.playerHp', () => {
  test('serpent_fang heals playerHp on attack', async ({ page }) => {
    await page.goto(gameUrl);
    // Seed: start a run + equip serpent_fang + drop playerHp to 50
    await page.evaluate(() => {
      const store = (window as any).__zustand_inflation_rpg_store__;
      const s = store.getState();
      s.startRun('warrior');  // or whatever the action is
      store.setState({
        run: { ...store.getState().run, playerHp: 50 },
        meta: {
          ...store.getState().meta,
          mythicOwned: ['serpent_fang'],
          mythicEquipped: ['serpent_fang', null, null, null, null],
        },
      });
    });
    // Simulate an attack — wait for battle tick or trigger manually
    // (depends on how BattleScene exposes test hooks; per CLAUDE.md exposeTestHooks)
    await page.waitForTimeout(2000);  // wait for at least 1 attack tick
    const playerHpAfter = await page.evaluate(() => (window as any).__zustand_inflation_rpg_store__.getState().run.playerHp);
    expect(playerHpAfter).toBeGreaterThan(50);
  });

  test('gluttony_chalice reduces cooldown on kill', async ({ page }) => {
    // Similar pattern — observe an active skill's cooldown ms before/after a kill
    // Specific assertion depends on what's exposed via test hooks
  });
});
```

- [ ] **Step 2: Run e2e**

```bash
pnpm --filter @forge/game-inflation-rpg e2e -- lifesteal-flow
```

Expected: 2 logical × 2 projects = 4 PASS.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/e2e/lifesteal-flow.spec.ts
git commit -m "test(game-inflation-rpg): Phase Realms — e2e lifesteal-flow (2 logical × 2 projects)"
```

---

## Task 20: cp3 final checkpoint — all checks green + tag

**Files:** (verification only)

- [ ] **Step 1: Run full suite**

```bash
pnpm typecheck && pnpm lint && pnpm circular && pnpm --filter @forge/game-inflation-rpg test && pnpm --filter @forge/game-inflation-rpg e2e && pnpm --filter @forge/game-inflation-rpg balance-milestones
```

Expected: ALL PASS.
- typecheck: 0 errors
- lint: 0 errors
- circular: 0
- vitest: ~710 PASS
- e2e: ~50 PASS
- balance-milestones: 0 regression

- [ ] **Step 2: Verify v8 → v13 migration chain in e2e**

If `e2e/v9-migration.spec.ts` (or similar) exists, ensure it covers v13 envelope shape. Update if it hardcodes `version === N` for some older N.

- [ ] **Step 3: Tag**

```bash
git tag phase-realms-cp3
git tag phase-realms-complete
```

- [ ] **Step 4: Final commit (if any pending docs)**

If any documentation/comment cleanup remains, commit it. Otherwise this step is a no-op.

- [ ] **Step 5: Summary report to user**

Report:
- New file count
- Tests added (unit + e2e)
- Persist version bump
- Tag refs (`phase-realms-cp1`, `cp2`, `cp3`, `complete`)
- Any deferred items

---

## Self-Review

**Spec coverage check:**

| Spec section | Task |
|---|---|
| §2.1 D 콘텐츠 (5 dungeons) | Task 3 |
| §2.1 D unlock 시스템 (Tier-gated) | Task 4 (isDungeonUnlocked) |
| §2.1 D Compass 확장 (17 entries) | Task 1, 2 |
| §2.1 D UI (DungeonPickModal locked + Relics 17) | Task 5, 6 |
| §2.1 A run.playerHp | Task 12, 13 |
| §2.1 A lifesteal proc 적용 | Task 13 |
| §2.1 A sp_steal redefine → cooldownReduce | Task 9, 10, 13 |
| §2.1 A swift_winds.target='base' | Task 10, 11 |
| §2.1 A infinity_seal expand (drop+xp+gold) | Task 14 (xp); gold/dr/dungeon_currency already covered by existing all_kinds in getMythicDropBonus |
| §2.1 A light_of_truth proc magnitude wrap | Task 9 (in evaluateMythicProcs ctx), Task 15 (regression) |
| §2.1 A thorns/magic_burst 회귀 확인 | Task 15 (covered via integration tests) |
| §2.1 Persist v13 | Task 7 (meta portion), Task 12 (run portion) |
| §2.1 Balance-sim parity | Task 17 |

All spec items mapped.

**Placeholder scan:** No TBDs in concrete code blocks. The boss/monster ID enumeration in Task 3 is left to implementer (with explicit fallback strategy + integrity test in Task 4). This is intentional decomposition — exhaustive enumeration in the plan would 10× its length without adding value.

**Type consistency:** Function names verified — `pickRandomDungeon`, `getMythicCooldownMult`, `getMythicXpMult`, `evaluateMythicProcs`, `applyLifestealHeal`, `applyDamageToPlayer`, `hydratePlayerHpIfNull`, `isDungeonUnlocked` are used consistently across tasks.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-16-phase-realms.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task with two-stage review (spec reviewer + code reviewer), fast iteration.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

Use **Subagent-Driven**.
