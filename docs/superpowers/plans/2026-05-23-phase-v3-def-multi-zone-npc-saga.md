# Phase V3-DEF — Multi-zone + NPC + 무한 Saga Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** V3-D Multi-zone + V3-E NPC 4종 + V3-F EternalSaga 무한 chapter viewer 를 single mega-phase 로 통합 구현. V3-C 의 buff #6 (field_diff) inert 상태 해제.

**Architecture:**
- 단일 120-wide grid (GRID_W=120) + camera follow + 6 realm column band
- Realm catalog (data) + zoneNavigation (logic) 분리. Field damping = pure selector
- NPC entity = first-class RunState. 4종 (라이벌/멘토/친구/가족) + family 시스템 (부모/결혼/자식)
- EternalSaga = CycleSaga 확장 (chaptersByEra + rejuvenationCount marker). SagaBookModal viewer

**Tech Stack:** TypeScript, Zustand persist v20→v21, Vitest, Playwright, React, Phaser camera follow.

**Sub-spec:** `docs/superpowers/specs/2026-05-23-phase-v3-def-multi-zone-npc-saga-design.md` (commit `1387319`)
**Base commit:** `7a4d958` (main HEAD, V3-C 머지 + STATUS 갱신 후)
**Branch:** `feat/phase-v3-def-multi-zone-npc-saga`

---

## File Structure

**Create (V3-D group):**
- `games/inflation-rpg/src/data/realms.ts` — REALM_CATALOG (6 realm)
- `games/inflation-rpg/src/data/__tests__/realms.test.ts`
- `games/inflation-rpg/src/zone/fieldDamping.ts` — `computeFieldDamping`
- `games/inflation-rpg/src/zone/zoneNavigation.ts` — `canEnterRealm`, `fieldLevelAtColumn`, `realmForColumn`
- `games/inflation-rpg/src/zone/__tests__/fieldDamping.test.ts`
- `games/inflation-rpg/src/zone/__tests__/zoneNavigation.test.ts`
- `games/inflation-rpg/src/store/__tests__/migrateV20ToV21.test.ts`

**Create (V3-E group):**
- `games/inflation-rpg/src/data/npcs.ts` — NPC roster templates
- `games/inflation-rpg/src/npc/NpcLifecycle.ts` — NPC aging, spawn, 사망
- `games/inflation-rpg/src/npc/NpcInteraction.ts` — encounter outcomes
- `games/inflation-rpg/src/npc/__tests__/NpcLifecycle.test.ts`
- `games/inflation-rpg/src/npc/__tests__/NpcInteraction.test.ts`
- `games/inflation-rpg/src/screens/NpcEncounterModal.tsx`

**Create (V3-F group):**
- `games/inflation-rpg/src/saga/EternalSaga.ts` — chaptersByEra + filters
- `games/inflation-rpg/src/saga/__tests__/EternalSaga.test.ts`
- `games/inflation-rpg/src/screens/SagaBookModal.tsx`

**Create (E2E):**
- `games/inflation-rpg/tests/e2e/v3-def-multi-zone-npc-saga.spec.ts`

**Modify:**
- `games/inflation-rpg/src/types.ts` — RealmId, MetaState.unlockedRealms / eternalSaga, RunState.currentRealmId / npcs
- `games/inflation-rpg/src/overworld/mapLayout.ts` — GRID_W = 120 + realm column band
- `games/inflation-rpg/src/overworld/OverworldScene.ts` — camera follow + setBounds 120 wide
- `games/inflation-rpg/src/overworld/CycleControllerV2.ts` — realm state + damping + boss unlock + NPC trigger
- `games/inflation-rpg/src/overworld/EncounterEngine.ts` — damping 곱
- `games/inflation-rpg/src/overworld/Pathfinding.ts` — current realm column bounds
- `games/inflation-rpg/src/overworld/OverworldEvents.ts` — realm_unlocked, npc_encounter, npc_died, family_event
- `games/inflation-rpg/src/decisionAI/HeroDecisionAI.ts` + `DestinationResolver.ts` — exit landmark filter
- `games/inflation-rpg/src/data/landmarks.ts` — exit / 6 realm boss / realm enemy types
- `games/inflation-rpg/src/store/gameStore.ts` — actions + migrate v20→v21
- `games/inflation-rpg/src/screens/OverworldRunner.tsx` — HUD realm + cinematic + modal mount
- `games/inflation-rpg/src/buff/buffEffects.ts` — getFieldDiffThreshold wire (already exists, just consume site)
- `games/inflation-rpg/src/saga/SagaRecorder.ts` — EternalSaga 갱신

---

## Task 1: Branch + 핵심 타입 (RealmId, MetaState/RunState 필드)

**Files:** Modify `games/inflation-rpg/src/types.ts`

- [ ] **Step 1: Branch 생성**

Run:
```bash
git checkout -b feat/phase-v3-def-multi-zone-npc-saga
```

- [ ] **Step 2: types.ts 갱신**

`games/inflation-rpg/src/types.ts` 의 `BuffId` 정의 다음에 추가:

```typescript
export type RealmId = 'base' | 'sea' | 'volcano' | 'underworld' | 'heaven' | 'chaos';

export interface NpcEntity {
  instanceId: string;
  kind: 'rival' | 'mentor' | 'friend' | 'family_parent' | 'family_spouse' | 'family_child';
  nameKR: string;
  emoji: string;
  age: number;
  ageRate: number;
  isAlive: boolean;
  bornChapter: import('./hero/HeroLifecycle').Chapter;
  relationship: number;
  zoneRealmId: RealmId;
  personalityDim?: import('./hero/PersonalityState').PersonalityDim;
}

export interface EternalSagaState {
  events: import('./saga/SagaTypes').SagaEvent[];
  chaptersByEra: Record<string, { eraKey: string; chapter: import('./hero/HeroLifecycle').Chapter; rejuvCount: number; events: import('./saga/SagaTypes').SagaEvent[] }>;
  rejuvenationCount: number;
  realmTransitions: Array<{ from: RealmId; to: RealmId; atAge: number; eraKey: string }>;
}
```

`MetaState` 안에 `buffLevels` 다음 줄에 추가:

```typescript
  /** V3-D — 해금된 realm 목록. 초기 ['base']. */
  unlockedRealms: RealmId[];
  /** V3-F — 무한 saga (재생 chapter 누적). */
  eternalSaga: EternalSagaState;
```

`RunState` 안에 `playerHp` 다음 줄에 추가:

```typescript
  /** V3-D — 현재 hero 가 있는 realm. 초기 'base'. */
  currentRealmId: RealmId;
  /** V3-E — 현재 run 의 NPC roster. */
  npcs: NpcEntity[];
```

- [ ] **Step 3: typecheck**

Run:
```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

기존 `INITIAL_META` / `INITIAL_RUN` 가 새 required 필드 누락으로 typecheck fail 할 것. 다음 task 에서 fix. 일단 type definition 만.

만약 fail 하면 다음 step 으로 즉시 진행 (이 task 의 typecheck 만 사전 검증).

- [ ] **Step 4: INITIAL_META / INITIAL_RUN 갱신**

`games/inflation-rpg/src/store/gameStore.ts` 의 `INITIAL_META` 의 `buffLevels: {},` 다음에 추가:

```typescript
  // Phase V3-D — 해금된 realm
  unlockedRealms: ['base'],
  // Phase V3-F — 무한 saga
  eternalSaga: { events: [], chaptersByEra: {}, rejuvenationCount: 0, realmTransitions: [] },
```

`INITIAL_RUN` 의 `playerHp: null,` 다음에 추가:

```typescript
  // Phase V3-D — 현재 realm
  currentRealmId: 'base',
  // Phase V3-E — NPC roster
  npcs: [],
```

- [ ] **Step 5: typecheck PASS 확인**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/src/types.ts games/inflation-rpg/src/store/gameStore.ts
git commit -m "feat(game-inflation-rpg): V3-DEF foundation types (RealmId + NpcEntity + EternalSagaState)"
```

---

## Task 2: REALM_CATALOG + tests (TDD)

**Files:** Create `games/inflation-rpg/src/data/realms.ts`, `games/inflation-rpg/src/data/__tests__/realms.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/data/__tests__/realms.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { REALM_CATALOG, findRealm } from '../realms';

describe('REALM_CATALOG', () => {
  it('contains 6 entries in order base→sea→volcano→underworld→heaven→chaos', () => {
    expect(REALM_CATALOG).toHaveLength(6);
    expect(REALM_CATALOG.map(r => r.id)).toEqual(['base', 'sea', 'volcano', 'underworld', 'heaven', 'chaos']);
  });

  it('column ranges are contiguous and cover 0-120', () => {
    let prevEnd = 0;
    for (const r of REALM_CATALOG) {
      expect(r.columnRange[0]).toBe(prevEnd);
      expect(r.columnRange[1]).toBeGreaterThan(r.columnRange[0]);
      prevEnd = r.columnRange[1];
    }
    expect(prevEnd).toBe(120);
  });

  it('fieldLevelRange is ascending per realm', () => {
    let prevMax = 0;
    for (const r of REALM_CATALOG) {
      expect(r.fieldLevelRange[1]).toBeGreaterThan(r.fieldLevelRange[0]);
      expect(r.fieldLevelRange[0]).toBeGreaterThanOrEqual(prevMax);
      prevMax = r.fieldLevelRange[1];
    }
  });

  it('nextRealm forms a chain ending in chaos', () => {
    expect(REALM_CATALOG[0].nextRealm).toBe('sea');
    expect(REALM_CATALOG[5].nextRealm).toBeNull();
  });

  it('each realm has bossId + enemyRoster + bgColor + nameKR', () => {
    for (const r of REALM_CATALOG) {
      expect(r.bossId).toBeTruthy();
      expect(r.enemyRoster.length).toBeGreaterThan(0);
      expect(r.bgColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(r.nameKR).toBeTruthy();
    }
  });

  it('findRealm returns correct entry or throws', () => {
    expect(findRealm('base').nameKR).toBe('시작의 들판');
    expect(() => findRealm('bogus' as 'base')).toThrow();
  });
});
```

- [ ] **Step 2: Run + verify failure**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/data/__tests__/realms.test.ts
```

- [ ] **Step 3: realms.ts impl**

`games/inflation-rpg/src/data/realms.ts`:

```typescript
import type { RealmId } from '../types';

export interface RealmDef {
  id: RealmId;
  nameKR: string;
  fieldLevelRange: [number, number];
  bgColor: string;
  columnRange: [number, number];
  enemyRoster: string[];
  bossId: string;
  nextRealm: RealmId | null;
}

export const REALM_CATALOG: readonly RealmDef[] = [
  { id: 'base',       nameKR: '시작의 들판', fieldLevelRange: [1, 50],            columnRange: [0, 20],   bgColor: '#3f6212', enemyRoster: ['wolf','bandit','goblin','dire_wolf','brigand','ogre'], bossId: 'base_boss',       nextRealm: 'sea' },
  { id: 'sea',        nameKR: '폭풍의 바다', fieldLevelRange: [50, 500],          columnRange: [20, 40],  bgColor: '#1e3a8a', enemyRoster: ['sea_serpent','kraken_spawn','tide_wraith','storm_eel'],         bossId: 'sea_boss',        nextRealm: 'volcano' },
  { id: 'volcano',    nameKR: '용암의 화산', fieldLevelRange: [500, 5000],        columnRange: [40, 60],  bgColor: '#7c2d12', enemyRoster: ['flame_drake','lava_golem','magma_imp','salamander'],            bossId: 'volcano_boss',    nextRealm: 'underworld' },
  { id: 'underworld', nameKR: '망자의 명계', fieldLevelRange: [5000, 50000],      columnRange: [60, 80],  bgColor: '#1f2937', enemyRoster: ['wraith','soul_collector','bone_lord','grim_reaper'],            bossId: 'underworld_boss', nextRealm: 'heaven' },
  { id: 'heaven',     nameKR: '천계의 평원', fieldLevelRange: [50000, 500000],    columnRange: [80, 100], bgColor: '#fef3c7', enemyRoster: ['celestial_guardian','angel','seraph','divine_envoy'],           bossId: 'heaven_boss',     nextRealm: 'chaos' },
  { id: 'chaos',      nameKR: '혼돈의 끝',   fieldLevelRange: [500000, 5_000_000], columnRange: [100, 120], bgColor: '#4c1d95', enemyRoster: ['void_horror','chaos_lord','reality_breaker','primordial_shade'], bossId: 'chaos_boss',      nextRealm: null },
];

export function findRealm(id: RealmId): RealmDef {
  const r = REALM_CATALOG.find(x => x.id === id);
  if (!r) throw new Error(`Unknown realm: ${id}`);
  return r;
}
```

- [ ] **Step 4: Test PASS + commit**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/data/__tests__/realms.test.ts
git add games/inflation-rpg/src/data/realms.ts games/inflation-rpg/src/data/__tests__/realms.test.ts
git commit -m "feat(game-inflation-rpg): REALM_CATALOG (V3-D)"
```

---

## Task 3: zoneNavigation pure helpers (TDD)

**Files:** Create `games/inflation-rpg/src/zone/zoneNavigation.ts`, `games/inflation-rpg/src/zone/__tests__/zoneNavigation.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
import { describe, expect, it } from 'vitest';
import type { RealmId } from '../../types';
import { canEnterRealm, fieldLevelAtColumn, realmForColumn, nextRealmOf } from '../zoneNavigation';

describe('canEnterRealm', () => {
  it('base always enterable', () => {
    expect(canEnterRealm(['base'], 'base')).toBe(true);
  });
  it('sea requires unlock', () => {
    expect(canEnterRealm(['base'], 'sea')).toBe(false);
    expect(canEnterRealm(['base', 'sea'], 'sea')).toBe(true);
  });
});

describe('realmForColumn', () => {
  it('column 0-19 → base', () => {
    expect(realmForColumn(0)).toBe('base');
    expect(realmForColumn(19)).toBe('base');
  });
  it('column 20-39 → sea', () => {
    expect(realmForColumn(20)).toBe('sea');
    expect(realmForColumn(39)).toBe('sea');
  });
  it('column 100-119 → chaos', () => {
    expect(realmForColumn(100)).toBe('chaos');
    expect(realmForColumn(119)).toBe('chaos');
  });
  it('out-of-range → null', () => {
    expect(realmForColumn(-1)).toBeNull();
    expect(realmForColumn(120)).toBeNull();
  });
});

describe('fieldLevelAtColumn', () => {
  it('base col 0 → 1, col 19 → ~50', () => {
    expect(fieldLevelAtColumn('base', 0)).toBe(1);
    expect(fieldLevelAtColumn('base', 19)).toBeGreaterThanOrEqual(45);
    expect(fieldLevelAtColumn('base', 19)).toBeLessThanOrEqual(50);
  });
  it('sea col 20 → 50, col 39 → ~500', () => {
    expect(fieldLevelAtColumn('sea', 20)).toBe(50);
    expect(fieldLevelAtColumn('sea', 39)).toBeGreaterThanOrEqual(450);
    expect(fieldLevelAtColumn('sea', 39)).toBeLessThanOrEqual(500);
  });
  it('chaos col 119 → very large', () => {
    expect(fieldLevelAtColumn('chaos', 119)).toBeGreaterThan(1_000_000);
  });
});

describe('nextRealmOf', () => {
  it('base → sea', () => expect(nextRealmOf('base')).toBe('sea'));
  it('chaos → null', () => expect(nextRealmOf('chaos')).toBeNull());
});
```

- [ ] **Step 2: Run + verify failure**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/zone/__tests__/zoneNavigation.test.ts
```

- [ ] **Step 3: zoneNavigation.ts impl**

```typescript
import type { RealmId } from '../types';
import { REALM_CATALOG, findRealm } from '../data/realms';

export function canEnterRealm(unlocked: readonly RealmId[], target: RealmId): boolean {
  return unlocked.includes(target);
}

export function realmForColumn(column: number): RealmId | null {
  for (const r of REALM_CATALOG) {
    if (column >= r.columnRange[0] && column < r.columnRange[1]) return r.id;
  }
  return null;
}

export function fieldLevelAtColumn(realmId: RealmId, column: number): number {
  const realm = findRealm(realmId);
  const [colStart, colEnd] = realm.columnRange;
  const [lvStart, lvEnd] = realm.fieldLevelRange;
  const span = colEnd - colStart;
  if (span <= 0) return lvStart;
  const t = Math.max(0, Math.min(1, (column - colStart) / span));
  return Math.floor(lvStart + t * (lvEnd - lvStart));
}

export function nextRealmOf(id: RealmId): RealmId | null {
  return findRealm(id).nextRealm;
}
```

- [ ] **Step 4: Test PASS + commit**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/zone/__tests__/zoneNavigation.test.ts
git add games/inflation-rpg/src/zone/zoneNavigation.ts games/inflation-rpg/src/zone/__tests__/zoneNavigation.test.ts
git commit -m "feat(game-inflation-rpg): zoneNavigation helpers (V3-D)"
```

---

## Task 4: computeFieldDamping (TDD)

**Files:** Create `games/inflation-rpg/src/zone/fieldDamping.ts`, `games/inflation-rpg/src/zone/__tests__/fieldDamping.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
import { describe, expect, it } from 'vitest';
import { computeFieldDamping } from '../fieldDamping';

describe('computeFieldDamping', () => {
  it('heroLv >= fieldLv → 1.0 (no damping)', () => {
    expect(computeFieldDamping(100, 50, 0)).toBe(1.0);
    expect(computeFieldDamping(100, 100, 0)).toBe(1.0);
  });

  it('diff 20, buff6=0 → 1 / (1 + 0.05*20) = 1/2 = 0.5', () => {
    expect(computeFieldDamping(50, 70, 0)).toBeCloseTo(0.5);
  });

  it('diff 100, buff6=0 → 1 / (1 + 5) ≈ 0.167', () => {
    expect(computeFieldDamping(50, 150, 0)).toBeCloseTo(1 / 6, 3);
  });

  it('buff6 cancels diff entirely', () => {
    expect(computeFieldDamping(50, 70, 20)).toBe(1.0);
  });

  it('buff6 partial cancel', () => {
    // diff=20, buff6=10 → effective=10 → 1/(1+0.5)=2/3
    expect(computeFieldDamping(50, 70, 10)).toBeCloseTo(2 / 3, 3);
  });

  it('huge diff still positive (never 0)', () => {
    const d = computeFieldDamping(1, 1_000_000, 0);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(0.001);
  });
});
```

- [ ] **Step 2: Run + verify failure**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/zone/__tests__/fieldDamping.test.ts
```

- [ ] **Step 3: fieldDamping.ts impl**

```typescript
/** V3-D Multi-zone damping. Spec §4.3.
 *  effectiveDiff = max(0, fieldLv - heroLv - buff6Threshold)
 *  damping = 1 / (1 + 0.05 × effectiveDiff)
 *  Soft log curve. buff #6 (field_diff threshold) 가 diff 의 일부 흡수. */
export function computeFieldDamping(heroLv: number, fieldLv: number, buff6Threshold: number): number {
  const effectiveDiff = Math.max(0, fieldLv - heroLv - buff6Threshold);
  return 1 / (1 + 0.05 * effectiveDiff);
}
```

- [ ] **Step 4: Test PASS + commit**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/zone/__tests__/fieldDamping.test.ts
git add games/inflation-rpg/src/zone/fieldDamping.ts games/inflation-rpg/src/zone/__tests__/fieldDamping.test.ts
git commit -m "feat(game-inflation-rpg): computeFieldDamping (V3-D)"
```

---

## Task 5: migrateV20ToV21 + STORE_VERSION 21 (TDD)

**Files:** Modify `games/inflation-rpg/src/store/gameStore.ts`, Create `games/inflation-rpg/src/store/__tests__/migrateV20ToV21.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
import { describe, expect, it } from 'vitest';
import { migrateV20ToV21 } from '../gameStore';

describe('migrateV20ToV21', () => {
  it('inserts default unlockedRealms + eternalSaga + currentRealmId + npcs', () => {
    const v20 = { meta: { light: 0, buffLevels: {} }, run: { level: 1 } };
    const r = migrateV20ToV21(v20) as { meta: any; run: any };
    expect(r.meta.unlockedRealms).toEqual(['base']);
    expect(r.meta.eternalSaga).toEqual({ events: [], chaptersByEra: {}, rejuvenationCount: 0, realmTransitions: [] });
    expect(r.run.currentRealmId).toBe('base');
    expect(r.run.npcs).toEqual([]);
  });

  it('preserves existing fields (idempotent)', () => {
    const v21 = {
      meta: { unlockedRealms: ['base', 'sea'], eternalSaga: { events: [{ x: 1 }], chaptersByEra: {}, rejuvenationCount: 0, realmTransitions: [] } },
      run: { currentRealmId: 'sea', npcs: [{ id: 'n1' }] },
    };
    const r = migrateV20ToV21(v21) as { meta: any; run: any };
    expect(r.meta.unlockedRealms).toEqual(['base', 'sea']);
    expect(r.meta.eternalSaga.events).toHaveLength(1);
    expect(r.run.currentRealmId).toBe('sea');
    expect(r.run.npcs).toHaveLength(1);
  });

  it('null meta + run safe', () => {
    expect(migrateV20ToV21({ meta: null, run: null })).toEqual({ meta: null, run: null });
  });

  it('non-object passthrough', () => {
    expect(migrateV20ToV21(null)).toBe(null);
  });
});
```

- [ ] **Step 2: Run + verify failure**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/store/__tests__/migrateV20ToV21.test.ts
```

- [ ] **Step 3: gameStore.ts impl**

`migrateV19ToV20` 함수 다음에 추가:

```typescript
export function migrateV20ToV21(persisted: unknown): unknown {
  if (typeof persisted !== 'object' || persisted === null) return persisted;
  const s = persisted as { meta?: Record<string, unknown> | null; run?: Record<string, unknown> | null };
  if (s.meta && typeof s.meta === 'object') {
    if (!Array.isArray(s.meta['unlockedRealms'])) s.meta['unlockedRealms'] = ['base'];
    if (!s.meta['eternalSaga'] || typeof s.meta['eternalSaga'] !== 'object') {
      s.meta['eternalSaga'] = { events: [], chaptersByEra: {}, rejuvenationCount: 0, realmTransitions: [] };
    }
  }
  if (s.run && typeof s.run === 'object') {
    if (typeof s.run['currentRealmId'] !== 'string') s.run['currentRealmId'] = 'base';
    if (!Array.isArray(s.run['npcs'])) s.run['npcs'] = [];
  }
  return s;
}
```

`runStoreMigration` 안 v19→v20 블록 다음에 추가:

```typescript
  // v20 → v21: Phase V3-D/E/F — multi-zone + NPC + eternal saga
  if (fromVersion <= 20) {
    migrateV20ToV21(s);
  }
```

`persist` config 의 `version: 20,` 을 `version: 21,` 으로 + 주석 갱신:

```typescript
      version: 21,  // 20 → 21 (Phase V3-DEF — unlockedRealms + eternalSaga + currentRealmId + npcs)
```

- [ ] **Step 4: Test + typecheck + commit**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/store/__tests__/migrateV20ToV21.test.ts
pnpm --filter @forge/game-inflation-rpg typecheck
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/__tests__/migrateV20ToV21.test.ts
git commit -m "feat(game-inflation-rpg): persist v20→v21 V3-DEF migration"
```

---

## Task 6: GRID_W=120 + mapLayout realm-aware

**Files:** Modify `games/inflation-rpg/src/overworld/mapLayout.ts`

- [ ] **Step 1: GRID_W 변경 + realm 별 column band landmark spawn**

`mapLayout.ts` 의 `GRID_W = 20` 을 `GRID_W = 120` 으로 변경.

기존 generateMapLayout 의 column 0-19 안의 V1e tile/landmark 로직은 유지. column 20-119 에 대해 5 realm band 추가.

`generateMapLayout(seed)` 의 `tiles` 생성 부분 (zone 결정 if/else) 다음으로 갱신:

```typescript
import { REALM_CATALOG } from '../data/realms';

// ... 기존 import 유지

export function generateMapLayout(seed: number): MapLayout {
  const rng = new SeededRng(seed);

  const tiles: ZoneId[][] = [];
  for (let y = 0; y < GRID_H; y++) {
    const row: ZoneId[] = [];
    for (let x = 0; x < GRID_W; x++) {
      let zone: ZoneId;
      // V3-D: column 0-19 = base realm 의 V1e zone band 유지
      if (x < 20) {
        if (x < 3)      zone = 'village';
        else if (x < 8) zone = 'forest';
        else if (x < 12) zone = 'plains';
        else if (x < 17) zone = 'mountains';
        else             zone = 'mystic';
      } else {
        // realm 1-5 의 column band → mystic 한 가지로 통일 (placeholder visual)
        // V3-D 의 enemy roster 는 landmark spawn 단계에서 realm 별 적용
        zone = 'mystic';
      }
      row.push(zone);
    }
    tiles.push(row);
  }

  const landmarks: PlacedLandmark[] = [];
  const place = (typeId: string, gridX: number, gridY: number, instanceSuffix = '') => {
    const type = LANDMARK_TYPES.find(t => t.id === typeId);
    if (!type) return;
    const cx = Math.max(0, Math.min(GRID_W - 1, gridX));
    const cy = Math.max(0, Math.min(GRID_H - 1, gridY));
    landmarks.push({
      instanceId: `${typeId}_${cx}_${cy}${instanceSuffix}`,
      type,
      gridX: cx,
      gridY: cy,
      consumed: false,
    });
  };

  // V3-D: base realm 의 column 0-19 = 기존 V1e 배치 (마을 + 적 + 폐허 + 보스 등 기존 그대로)
  // (기존 place(...) 호출 그대로 유지)

  // V3-D: realm 1-5 별 column band 의 enemy + boss 배치
  for (const realm of REALM_CATALOG) {
    if (realm.id === 'base') continue;  // base 는 기존 V1e 패턴
    const [colStart, colEnd] = realm.columnRange;
    // 각 realm 마다 enemy 4개 + boss 1개 + exit 1개 배치
    let y = 2;
    for (let i = 0; i < Math.min(4, realm.enemyRoster.length); i++) {
      const enemyId = realm.enemyRoster[i];
      const col = colStart + 2 + i * 4;
      place(enemyId, col, y, `_r${realm.id}`);
      y = (y + 3) % (GRID_H - 2) + 1;
    }
    // boss 는 column band 의 마지막 column
    place(realm.bossId, colEnd - 2, Math.floor(GRID_H / 2), `_r${realm.id}`);
    // exit 는 column band 의 마지막 column 직전 (boss 처치 후 활성화)
    if (realm.nextRealm) {
      place('exit', colEnd - 1, Math.floor(GRID_H / 2), `_r${realm.id}`);
    }
  }

  // 기존 base realm landmark place 호출들 그대로 (위 if 블록 안의 V1e 패턴 유지 — 기존 코드 그대로)
  // ... (기존 place 호출들 — wolf/bandit/goblin/village/shrine/cave/market/ruin 등 그대로)

  return { tiles, landmarks };
}
```

**중요:** 기존 base realm 의 landmark place 호출들 (place('village', 1, ...), place('wolf', 4, 3), …) 은 그대로 유지. 새로 추가하는 것은 realm 1-5 의 enemy/boss/exit 만. 기존 코드 위에 새 for loop 추가.

NB: 기존 `landmarks.ts` 의 `LANDMARK_TYPES` 에 realm 1-5 의 enemy id (sea_serpent 등) + bossId (sea_boss 등) 가 아직 없음 — 다음 task 에서 추가. 이 task 의 typecheck 는 `LANDMARK_TYPES.find` 가 undefined 면 place 안 함이라 안전.

- [ ] **Step 2: typecheck + commit**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
git add games/inflation-rpg/src/overworld/mapLayout.ts
git commit -m "feat(game-inflation-rpg): GRID_W=120 + realm column band landmarks (V3-D)"
```

---

## Task 7: landmarks.ts — realm 1-5 enemy + boss types

**Files:** Modify `games/inflation-rpg/src/data/landmarks.ts`

- [ ] **Step 1: 추가**

`LANDMARK_TYPES` 의 마지막 entry (예: `crossroads`) 다음에 추가:

```typescript
  // V3-D realm 1: sea
  { id: 'sea_serpent',       nameKR: '바다뱀',       emoji: '🐍', kind: 'enemy' },
  { id: 'kraken_spawn',      nameKR: '크라켄 새끼',   emoji: '🐙', kind: 'enemy' },
  { id: 'tide_wraith',       nameKR: '조수 망령',     emoji: '🌊', kind: 'enemy' },
  { id: 'storm_eel',         nameKR: '폭풍 장어',     emoji: '⚡', kind: 'enemy' },
  { id: 'sea_boss',          nameKR: '심해의 왕',     emoji: '🦑', kind: 'boss' },

  // V3-D realm 2: volcano
  { id: 'flame_drake',       nameKR: '용암 드레이크', emoji: '🐉', kind: 'enemy' },
  { id: 'lava_golem',        nameKR: '용암 골렘',     emoji: '🗿', kind: 'enemy' },
  { id: 'magma_imp',         nameKR: '마그마 임프',   emoji: '👹', kind: 'enemy' },
  { id: 'salamander',        nameKR: '불도마뱀',      emoji: '🦎', kind: 'enemy' },
  { id: 'volcano_boss',      nameKR: '화염의 군주',   emoji: '🔥', kind: 'boss' },

  // V3-D realm 3: underworld
  { id: 'wraith',            nameKR: '망령',          emoji: '👻', kind: 'enemy' },
  { id: 'soul_collector',    nameKR: '영혼 수집가',   emoji: '💀', kind: 'enemy' },
  { id: 'bone_lord',         nameKR: '뼈의 왕',       emoji: '☠️', kind: 'enemy' },
  { id: 'grim_reaper',       nameKR: '사신',          emoji: '🪦', kind: 'enemy' },
  { id: 'underworld_boss',   nameKR: '명계의 군주',   emoji: '🕯️', kind: 'boss' },

  // V3-D realm 4: heaven
  { id: 'celestial_guardian',nameKR: '천계 수호자',   emoji: '⚔️', kind: 'enemy' },
  { id: 'angel',             nameKR: '천사',          emoji: '😇', kind: 'enemy' },
  { id: 'seraph',            nameKR: '세라핌',        emoji: '👼', kind: 'enemy' },
  { id: 'divine_envoy',      nameKR: '신의 사도',     emoji: '✨', kind: 'enemy' },
  { id: 'heaven_boss',       nameKR: '천계의 대천사', emoji: '🌟', kind: 'boss' },

  // V3-D realm 5: chaos
  { id: 'void_horror',       nameKR: '공허의 공포',   emoji: '🌌', kind: 'enemy' },
  { id: 'chaos_lord',        nameKR: '혼돈의 군주',   emoji: '🌀', kind: 'enemy' },
  { id: 'reality_breaker',   nameKR: '현실 파괴자',   emoji: '⚫', kind: 'enemy' },
  { id: 'primordial_shade',  nameKR: '태초의 그림자', emoji: '🌑', kind: 'enemy' },
  { id: 'chaos_boss',        nameKR: '혼돈의 끝',     emoji: '♾️', kind: 'boss' },

  // base realm boss (column 19 end)
  { id: 'base_boss',         nameKR: '들판의 왕',     emoji: '👑', kind: 'boss' },
```

NB: `exit` landmark type 이 이미 존재 (`{ id: 'exit', nameKR: 'exit', emoji: '🚪', kind: 'exit' }` 또는 비슷한 entry). 없으면 추가:

```typescript
  { id: 'exit',              nameKR: '다음 영역으로', emoji: '🚪', kind: 'exit' },
```

- [ ] **Step 2: typecheck + 회귀 vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/data/landmarks.ts
git commit -m "feat(game-inflation-rpg): realm 1-5 enemy + boss landmark types (V3-D)"
```

---

## Task 8: OverworldScene camera follow + setBounds 120-wide

**Files:** Modify `games/inflation-rpg/src/overworld/OverworldScene.ts`

- [ ] **Step 1: Camera 변경**

`OverworldScene.ts` 의 `this.cameras.main.setBounds(0, 0, GRID_W * TILE_PX, GRID_H * TILE_PX);` 다음에 camera follow + deadzone 추가. 기존 코드 안에서 hero sprite 가 생성되는 지점 (대략 createHero 또는 비슷한 함수) 직후에 추가.

Hero sprite 가 생성된 직후 (existing code 안에서 `this.hero = this.add.text(...)` 또는 비슷한 라인 다음에):

```typescript
    // V3-D: camera follow hero. viewport = 640x384, world = 3840x384.
    this.cameras.main.startFollow(this.heroSprite, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(200, 100);
```

NB: hero sprite 의 변수명을 확인 — `this.heroSprite` 또는 `this.hero` 또는 다른 이름. 기존 코드 읽고 정확한 이름 사용.

만약 hero sprite 가 Text 객체라면 `as Phaser.GameObjects.Text` 캐스트 필요할 수 있음. 그냥 `startFollow` 가 GameObject 타입 받으니 캐스트 없이도 동작.

- [ ] **Step 2: Game canvas width 변경 NO**

`OverworldRunner.tsx` 의 `width: GRID_W * 32` 는 그대로 두면 안 됨 — 이전에는 GRID_W=20 이라 640px 였지만 이제 GRID_W=120 → 3840px. 화면이 너무 넓어짐.

`OverworldRunner.tsx` 의 Phaser.Game config:

```typescript
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: 640,   // V3-D: viewport fixed at 640px regardless of GRID_W
    height: GRID_H * 32,
    backgroundColor: '#0a0e1a',
    scene: OverworldScene,
    physics: { default: 'arcade' },
  });
```

- [ ] **Step 3: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/overworld/OverworldScene.ts games/inflation-rpg/src/screens/OverworldRunner.tsx
git commit -m "feat(game-inflation-rpg): camera follow + viewport 640px (V3-D)"
```

---

## Task 9: OverworldEvents 새 event types

**Files:** Modify `games/inflation-rpg/src/overworld/OverworldEvents.ts`

- [ ] **Step 1: Event type 추가**

기존 `OverworldEvent = | ...` union 끝에 `| { type: 'cycle_ended' };` 직전에 추가:

```typescript
  | { type: 'realm_unlocked'; realmId: import('../types').RealmId }
  | { type: 'realm_entered'; realmId: import('../types').RealmId }
  | { type: 'npc_encounter'; npcInstanceId: string; npcKind: import('../types').NpcEntity['kind'] }
  | { type: 'npc_died'; npcInstanceId: string }
  | { type: 'family_event'; eventKind: 'marriage' | 'child_birth' | 'parent_death' | 'child_grown'; npcInstanceId?: string }
```

- [ ] **Step 2: typecheck + 회귀 vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/overworld/OverworldEvents.ts
git commit -m "feat(game-inflation-rpg): V3-DEF events (realm_unlocked/entered, npc_*, family_*)"
```

---

## Task 10: gameStore actions — unlockRealm + setCurrentRealm

**Files:** Modify `games/inflation-rpg/src/store/gameStore.ts`

- [ ] **Step 1: Interface + impl 추가**

`interface GameStore` 안 (buyBuff 다음에 적당한 위치) 에 추가:

```typescript
  // Phase V3-D — realm unlock + transition
  unlockRealm: (realmId: import('../types').RealmId) => void;
  setCurrentRealm: (realmId: import('../types').RealmId) => void;
```

`useGameStore = create(...)((set, get) => ({ ... })` 의 actions 안에 추가:

```typescript
      unlockRealm(realmId) {
        set(s => {
          if (s.meta.unlockedRealms.includes(realmId)) return s;
          return { ...s, meta: { ...s.meta, unlockedRealms: [...s.meta.unlockedRealms, realmId] } };
        });
      },
      setCurrentRealm(realmId) {
        set(s => ({ ...s, run: { ...s.run, currentRealmId: realmId } }));
      },
```

- [ ] **Step 2: typecheck + 회귀 vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts
git commit -m "feat(game-inflation-rpg): unlockRealm + setCurrentRealm actions (V3-D)"
```

---

## Task 11: EncounterEngine damping 적용

**Files:** Modify `games/inflation-rpg/src/overworld/EncounterEngine.ts`, `games/inflation-rpg/src/overworld/CycleControllerV2.ts`

- [ ] **Step 1: EncounterEngineOpts 확장**

`EncounterEngine.ts` 의 `EncounterEngineOpts` interface 에 추가:

```typescript
export interface EncounterEngineOpts {
  dropChanceBonus?: number;
  /** V3-D — field level damping multiplier (1.0 = no damping, <1.0 = weaker hero). */
  damping?: number;
}
```

`resolveEncounter` 의 battle 로직 안에서 hero 의 effective atk:

```typescript
const damping = this.opts.damping ?? 1.0;
const heroAtk = Math.floor(hero.atk * damping);
// 기존 battle damage 계산이 heroAtk 사용하도록 수정
```

NB: EncounterEngine 의 정확한 battle 로직은 코드를 읽고 정확한 위치 파악 필요. damping 은 hero atk 에 곱.

- [ ] **Step 2: getBuffSnapshot 에 damping 추가**

`CycleControllerV2.ts` 의 `CycleControllerV2Opts` 의 getBuffSnapshot 시그니처 확장:

```typescript
  getBuffSnapshot?: () => { dropChanceBonus: number; agingSpeedMul: number; damping: number };
```

`handleArrival` 안의 `this.encounter.setOpts({...})` 호출에 damping 추가:

```typescript
    if (this.getBuffSnapshot) {
      const snap = this.getBuffSnapshot();
      this.encounter.setOpts({ dropChanceBonus: snap.dropChanceBonus, damping: snap.damping });
    }
```

`cycleSliceV2.ts` 의 default getBuffSnapshot 콜백 갱신:

```typescript
import { computeFieldDamping } from '../zone/fieldDamping';
import { fieldLevelAtColumn } from '../zone/zoneNavigation';
// ...

      getBuffSnapshot: opts.getBuffSnapshot ?? (() => {
        const state = useGameStore.getState();
        const meta = state.meta;
        const heroLv = ctrl?.getHero?.()?.level ?? 1;  // ctrl 미정 시 default
        const currentRealm = state.run.currentRealmId;
        const heroCol = /* hero current column — controller exposed via getter, or default 0 */ 0;
        const fieldLv = fieldLevelAtColumn(currentRealm, heroCol);
        const buff6 = getFieldDiffThreshold(meta);
        return {
          dropChanceBonus: getDropChanceBonus(meta),
          agingSpeedMul: getAgingSpeedMul(meta),
          damping: computeFieldDamping(heroLv, fieldLv, buff6),
        };
      }),
```

**중요:** controller 의 `start()` 안에서는 ctrl 가 아직 존재하지 않으므로 closure 에서 `ctrl` 참조 불가. 패턴 변경: `() => { const ctrl = get().controller; ... }` 사용. 또는 controller 의 getHero/getCurrentColumn 을 옵션 closure 안에서 lazy 호출.

cycleSliceV2.start 의 callback 작성:

```typescript
      getBuffSnapshot: opts.getBuffSnapshot ?? (() => {
        const state = useGameStore.getState();
        const meta = state.meta;
        const ctrl = useCycleStoreV2.getState().controller;
        const hero = ctrl?.getHero();
        const heroLv = hero?.level ?? 1;
        const heroCol = hero?.gridX ?? 0;
        const currentRealm = state.run.currentRealmId;
        const fieldLv = fieldLevelAtColumn(currentRealm, heroCol);
        const buff6 = getFieldDiffThreshold(meta);
        return {
          dropChanceBonus: getDropChanceBonus(meta),
          agingSpeedMul: getAgingSpeedMul(meta),
          damping: computeFieldDamping(heroLv, fieldLv, buff6),
        };
      }),
```

NB: HeroEntity 가 gridX 를 가지고 있는지 확인. 없으면 controller 의 getCurrentColumn() getter 추가 필요. 임시 default 0 사용.

import 추가:

```typescript
import { computeFieldDamping } from '../zone/fieldDamping';
import { fieldLevelAtColumn } from '../zone/zoneNavigation';
import { getFieldDiffThreshold } from '../buff/buffEffects';
```

- [ ] **Step 3: typecheck + 회귀 vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/overworld/EncounterEngine.ts games/inflation-rpg/src/overworld/CycleControllerV2.ts games/inflation-rpg/src/overworld/cycleSliceV2.ts
git commit -m "feat(game-inflation-rpg): field damping wire in EncounterEngine + cycleSliceV2 (V3-D)"
```

---

## Task 12: Boss 처치 시 unlockNextRealm + realm_unlocked event

**Files:** Modify `games/inflation-rpg/src/overworld/CycleControllerV2.ts`

- [ ] **Step 1: handleArrival 의 boss 처치 분기 확장**

`handleArrival` 의 `if (ev.type === 'battle_won')` 안에서 `if (kind === 'boss')` 처리 부분 다음에:

```typescript
import { findRealm } from '../data/realms';
import { useGameStore } from '../store/gameStore';
// (이미 import 되어 있을 수 있음 — 중복 안 되게)
```

```typescript
        if (kind === 'boss') {
          this.bossKills += 1;
          // V3-D: realm unlock chain
          const state = useGameStore.getState();
          const currentRealm = state.run.currentRealmId;
          const realm = findRealm(currentRealm);
          if (realm.nextRealm && !state.meta.unlockedRealms.includes(realm.nextRealm)) {
            state.unlockRealm(realm.nextRealm);
            events.push({ type: 'realm_unlocked', realmId: realm.nextRealm });
          }
        } else {
          this.kills += 1;
        }
```

NB: 기존 코드의 boss/enemy 분기 패턴 확인 후 새 unlock 분기를 boss 분기 안에 추가. `useGameStore` 가 controller (headless sim) 안에서 사용되면 sim 의 isolated state 와 충돌 위험 — controller 의 getBuffSnapshot 처럼 callback 으로 옮기는 게 더 깔끔. 단 V3-D 의 first wire 로는 직접 import 도 OK (CycleControllerV2 가 이미 useGameStore 를 일부 호출).

만약 controller pure 유지가 우선이면, opts 에 `onBossKill?: (currentRealm) => RealmId | null` 추가하고 boss 처치 시 호출. cycleSliceV2 가 default 콜백으로 `useGameStore.getState().unlockRealm` 호출.

**선택:** controller pure 유지. opts.onBossKill callback 추가:

`CycleControllerV2Opts` 에:

```typescript
  /** V3-D — boss 처치 시 호출. unlockable next realm 의 id 반환. */
  onBossKill?: (currentRealmId: import('../types').RealmId) => import('../types').RealmId | null;
```

CycleControllerV2 의 boss 처치 안에:

```typescript
        if (kind === 'boss') {
          this.bossKills += 1;
          // V3-D realm unlock — controller 는 pure 유지, callback 으로 처리
          if (this.opts.onBossKill && this.currentRealmId) {
            const unlocked = this.opts.onBossKill(this.currentRealmId);
            if (unlocked) {
              events.push({ type: 'realm_unlocked', realmId: unlocked });
            }
          }
        } else {
          this.kills += 1;
        }
```

CycleControllerV2 class 안에 private field 추가:

```typescript
  private currentRealmId: import('../types').RealmId | null = null;
  
  setCurrentRealmId(realmId: import('../types').RealmId): void {
    this.currentRealmId = realmId;
  }
```

`cycleSliceV2.start(opts)` 에서 default onBossKill:

```typescript
      onBossKill: opts.onBossKill ?? ((current) => {
        const state = useGameStore.getState();
        const realm = findRealm(current);
        if (realm.nextRealm && !state.meta.unlockedRealms.includes(realm.nextRealm)) {
          state.unlockRealm(realm.nextRealm);
          return realm.nextRealm;
        }
        return null;
      }),
```

그리고 cycleSliceV2.start 가 controller 생성 후 setCurrentRealmId 호출:

```typescript
    const ctrl = new CycleControllerV2({...});
    ctrl.setCurrentRealmId(useGameStore.getState().run.currentRealmId);
    set({ ... });
```

- [ ] **Step 2: typecheck + 회귀 vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/overworld/CycleControllerV2.ts games/inflation-rpg/src/overworld/cycleSliceV2.ts
git commit -m "feat(game-inflation-rpg): boss kill → unlockNextRealm via callback (V3-D)"
```

---

## Task 13: HeroDecisionAI — exit landmark 의 unlock-aware filter

**Files:** Modify `games/inflation-rpg/src/decisionAI/HeroDecisionAI.ts` + `DestinationResolver.ts`

- [ ] **Step 1: HeroDecisionAI.chooseDestination 변경**

Read existing `DestinationResolver.ts` to understand the choose flow. Add filter logic.

`DestinationResolver.ts` 의 `choose` 함수 첫 줄에 candidates filter 추가:

```typescript
import { findRealm } from '../data/realms';
import type { RealmId } from '../types';

// ... 기존 DestinationResolver class
class DestinationResolver {
  choose(candidates: readonly LandmarkCandidate[], ctx: { traits: readonly TraitId[]; personality: PersonalityState; currentRealm?: RealmId; unlockedRealms?: readonly RealmId[] }): LandmarkCandidate | null {
    // V3-D: exit landmark filter — next realm 이 unlocked 일 때만 valid
    let filtered = candidates;
    if (ctx.currentRealm && ctx.unlockedRealms) {
      const realm = findRealm(ctx.currentRealm);
      filtered = candidates.filter(c => {
        if (c.landmark.type.kind !== 'exit') return true;
        if (!realm.nextRealm) return false;
        return ctx.unlockedRealms!.includes(realm.nextRealm);
      });
    }
    // 기존 choose 로직 (filtered 대상으로)
    // ...
  }
}
```

NB: `DestinationResolver.choose` 의 정확한 시그니처 + ctx 객체 구조는 기존 코드 확인. 새 fields `currentRealm`, `unlockedRealms` 만 추가하고 기존 chosen 로직 그대로.

`HeroDecisionAI.chooseDestination` 가 ctx 에 새 fields 전달:

```typescript
  chooseDestination(candidates: readonly LandmarkCandidate[], extras?: { currentRealm?: RealmId; unlockedRealms?: readonly RealmId[] }): LandmarkCandidate | null {
    return this.resolver.choose(candidates, {
      traits: this.opts.traits,
      personality: this.hero.personality,
      currentRealm: extras?.currentRealm,
      unlockedRealms: extras?.unlockedRealms,
    });
  }
```

CycleControllerV2 가 chooseDestination 호출 시 extras 전달:

Read existing call site in `CycleControllerV2.ts`. Find `this.ai.chooseDestination(...)` and pass:

```typescript
    const candidate = this.ai.chooseDestination(candidates, {
      currentRealm: this.currentRealmId ?? 'base',
      unlockedRealms: useGameStore.getState().meta.unlockedRealms,
    });
```

**대안 (pure-friendly):** controller 가 `currentRealmId` + `unlockedRealms` 를 setter 로 주입받고 그것 사용. 위 방식이 단순.

- [ ] **Step 2: typecheck + 회귀 vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/decisionAI/HeroDecisionAI.ts games/inflation-rpg/src/decisionAI/DestinationResolver.ts games/inflation-rpg/src/overworld/CycleControllerV2.ts
git commit -m "feat(game-inflation-rpg): HeroDecisionAI exit landmark unlock filter (V3-D)"
```

---

## Task 14: Hero exit 도착 시 realm 전환 (cinematic + setRealm)

**Files:** Modify `games/inflation-rpg/src/overworld/CycleControllerV2.ts`, `games/inflation-rpg/src/screens/OverworldRunner.tsx`

- [ ] **Step 1: CycleControllerV2 가 exit 도착 시 realm_entered event 발화**

`handleArrival` 안의 events 처리 끝부분 (chapter_transition 발화 다음) 에 추가:

```typescript
    // V3-D: hero 가 exit landmark 도착 시 realm 전환
    if (kind === 'exit' && this.currentRealmId) {
      const realm = findRealm(this.currentRealmId);
      const state = useGameStore.getState();
      if (realm.nextRealm && state.meta.unlockedRealms.includes(realm.nextRealm)) {
        const newRealm = realm.nextRealm;
        this.currentRealmId = newRealm;
        state.setCurrentRealm(newRealm);
        events.push({ type: 'realm_entered', realmId: newRealm });
      }
    }
```

NB: `kind` 는 `LandmarkKind` ('enemy'|'boss'|'exit'|...). exit 도착 분기.

- [ ] **Step 2: OverworldRunner cinematic overlay 추가**

OverworldRunner 의 `chapterOverlay` state 패턴 따라 `realmOverlay` state 추가:

```typescript
  const [realmOverlay, setRealmOverlay] = useState<{ realmId: import('../types').RealmId; key: number } | null>(null);
```

handleArrival 의 evs 처리 안에서 `realm_entered` 추출 후 overlay 표시:

```typescript
          const realmEntered = evs.find(e => e.type === 'realm_entered');
          if (realmEntered && realmEntered.type === 'realm_entered') {
            setRealmOverlay({ realmId: realmEntered.realmId, key: Date.now() });
            setTimeout(() => setRealmOverlay(null), 2000);
          }
```

JSX 에 overlay 추가 (chapterOverlay 옆에):

```jsx
      {realmOverlay && (
        <div
          key={realmOverlay.key}
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#ffd54f',
            fontSize: 24,
            fontWeight: 700,
            background: 'rgba(0,0,0,0.7)',
            padding: '12px 24px',
            borderRadius: 8,
            animation: 'forgeChapterFade 2s ease-in-out forwards',
            pointerEvents: 'none',
            zIndex: 50,
          }}
        >
          다음 영역: {(() => {
            const r = REALM_CATALOG.find(rr => rr.id === realmOverlay.realmId);
            return r?.nameKR ?? realmOverlay.realmId;
          })()}
        </div>
      )}
```

`import { REALM_CATALOG } from '../data/realms';` 추가.

- [ ] **Step 3: typecheck + 회귀 vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/overworld/CycleControllerV2.ts games/inflation-rpg/src/screens/OverworldRunner.tsx
git commit -m "feat(game-inflation-rpg): hero exit → realm transition + cinematic (V3-D)"
```

---

## Task 15: HUD 에 현재 realm + unlocked count 표시

**Files:** Modify `games/inflation-rpg/src/screens/OverworldRunner.tsx`

- [ ] **Step 1: HUD 에 realm badge 추가**

기존 HUD span (`hud-name`, `hud-age`, ...) 들 다음 + speed buttons 직전에 추가:

```jsx
        <span data-testid="hud-realm" style={{ marginLeft: 8 }}>
          {(() => {
            const r = REALM_CATALOG.find(rr => rr.id === run.currentRealmId);
            return `🌍 ${r?.nameKR ?? '?'} (${meta.unlockedRealms.length}/${REALM_CATALOG.length})`;
          })()}
        </span>
```

`const run = useGameStore(s => s.run)` 가 이미 있는지 확인. 없으면 추가:

```typescript
  const run = useGameStore(s => s.run);
```

- [ ] **Step 2: typecheck + 회귀 vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/screens/OverworldRunner.tsx
git commit -m "feat(game-inflation-rpg): HUD realm badge + unlocked count (V3-D)"
```

---

## Task 16: NPC entity data + roster templates

**Files:** Create `games/inflation-rpg/src/data/npcs.ts`

- [ ] **Step 1: NPC roster + spawn rules**

```typescript
import type { Chapter } from '../hero/HeroLifecycle';
import type { NpcEntity } from '../types';
import type { PersonalityDim } from '../hero/PersonalityState';

export interface NpcTemplate {
  kind: NpcEntity['kind'];
  candidateNames: string[];
  emojis: string[];
  ageRate: number;
  spawnChapter: Chapter | 'any';
  initialAge: number;
  personalityDim?: PersonalityDim;
}

export const NPC_TEMPLATES: readonly NpcTemplate[] = [
  // 라이벌
  { kind: 'rival',         candidateNames: ['검은별','은검','폭풍','잿불','북풍'],   emojis: ['🗡️','⚔️','🔪'], ageRate: 1.0, spawnChapter: '어린시절', initialAge: 8 },
  // 멘토
  { kind: 'mentor',        candidateNames: ['현자 솔','대지의 인','별빛 노인','지팡이의 사도'], emojis: ['🧙','📜','🕯️'], ageRate: 1.5, spawnChapter: '청년기', initialAge: 50 },
  // 친구
  { kind: 'friend',        candidateNames: ['로빈','데이지','시오','메이','준'],    emojis: ['🙂','😊','🤝'], ageRate: 1.2, spawnChapter: 'any',     initialAge: 10 },
  // 가족 — 부모
  { kind: 'family_parent', candidateNames: ['아버지','어머니'],                      emojis: ['👨','👩'],       ageRate: 1.8, spawnChapter: '어린시절', initialAge: 30 },
  // 가족 — 배우자
  { kind: 'family_spouse', candidateNames: ['반려자 미르','연인 라엘'],              emojis: ['💑','💕'],       ageRate: 1.0, spawnChapter: '청년기', initialAge: 20 },
  // 가족 — 자식
  { kind: 'family_child',  candidateNames: ['아들','딸'],                            emojis: ['👦','👧'],       ageRate: 1.5, spawnChapter: '장년기', initialAge: 1 },
];
```

- [ ] **Step 2: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/data/npcs.ts
git commit -m "feat(game-inflation-rpg): NPC templates (V3-E)"
```

---

## Task 17: NpcLifecycle (TDD)

**Files:** Create `games/inflation-rpg/src/npc/NpcLifecycle.ts`, `games/inflation-rpg/src/npc/__tests__/NpcLifecycle.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
import { describe, expect, it } from 'vitest';
import type { NpcEntity } from '../../types';
import { tickNpc, isAliveAge, spawnNpc } from '../NpcLifecycle';

function npc(overrides: Partial<NpcEntity> = {}): NpcEntity {
  return {
    instanceId: 'n1',
    kind: 'rival',
    nameKR: 'X',
    emoji: '🗡️',
    age: 10,
    ageRate: 1.0,
    isAlive: true,
    bornChapter: '어린시절',
    relationship: 50,
    zoneRealmId: 'base',
    ...overrides,
  };
}

describe('tickNpc', () => {
  it('age increases by ageRate per tick', () => {
    const n = npc({ age: 10, ageRate: 1.5 });
    tickNpc(n);
    expect(n.age).toBeCloseTo(11.5);
  });
  it('isAlive=false stops aging', () => {
    const n = npc({ age: 80, isAlive: false });
    tickNpc(n);
    expect(n.age).toBe(80);
  });
});

describe('isAliveAge', () => {
  it('age < 80 → alive', () => expect(isAliveAge(70, 'rival')).toBe(true));
  it('age >= 80 → dead (probabilistic threshold)', () => expect(isAliveAge(150, 'rival')).toBe(false));
  it('family_child max ~70', () => expect(isAliveAge(75, 'family_child')).toBe(false));
});

describe('spawnNpc', () => {
  it('creates NpcEntity from template', () => {
    const n = spawnNpc('rival', { realmId: 'base', seed: 1 });
    expect(n).not.toBeNull();
    expect(n?.kind).toBe('rival');
    expect(n?.zoneRealmId).toBe('base');
    expect(n?.isAlive).toBe(true);
  });
  it('unknown kind → null', () => {
    expect(spawnNpc('bogus' as 'rival', { realmId: 'base', seed: 1 })).toBeNull();
  });
});
```

- [ ] **Step 2: Run + verify failure**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/npc/__tests__/NpcLifecycle.test.ts
```

- [ ] **Step 3: NpcLifecycle.ts impl**

```typescript
import type { NpcEntity, RealmId } from '../types';
import { NPC_TEMPLATES } from '../data/npcs';
import { SeededRng } from '../cycle/SeededRng';

export function tickNpc(npc: NpcEntity): void {
  if (!npc.isAlive) return;
  npc.age += npc.ageRate;
  if (!isAliveAge(npc.age, npc.kind)) {
    npc.isAlive = false;
  }
}

const MAX_AGE_BY_KIND: Record<NpcEntity['kind'], number> = {
  rival: 100,
  mentor: 100,
  friend: 90,
  family_parent: 80,
  family_spouse: 95,
  family_child: 70,
};

export function isAliveAge(age: number, kind: NpcEntity['kind']): boolean {
  return age < (MAX_AGE_BY_KIND[kind] ?? 80);
}

export interface SpawnOpts {
  realmId: RealmId;
  seed: number;
}

let nextInstanceId = 1;

export function spawnNpc(kind: NpcEntity['kind'], opts: SpawnOpts): NpcEntity | null {
  const tmpl = NPC_TEMPLATES.find(t => t.kind === kind);
  if (!tmpl) return null;
  const rng = new SeededRng(opts.seed);
  const name = tmpl.candidateNames[rng.intBelow(tmpl.candidateNames.length)];
  const emoji = tmpl.emojis[rng.intBelow(tmpl.emojis.length)];
  return {
    instanceId: `npc_${nextInstanceId++}_${opts.seed}`,
    kind,
    nameKR: name,
    emoji,
    age: tmpl.initialAge,
    ageRate: tmpl.ageRate,
    isAlive: true,
    bornChapter: tmpl.spawnChapter === 'any' ? '어린시절' : tmpl.spawnChapter,
    relationship: 50,
    zoneRealmId: opts.realmId,
    personalityDim: tmpl.personalityDim,
  };
}
```

NB: `SeededRng.intBelow(n)` 의 정확한 메서드명은 기존 SeededRng 코드 확인. 만약 `next()` 만 있으면 `Math.floor(rng.next() * n)` 사용.

- [ ] **Step 4: Test PASS + commit**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/npc/__tests__/NpcLifecycle.test.ts
git add games/inflation-rpg/src/npc/NpcLifecycle.ts games/inflation-rpg/src/npc/__tests__/NpcLifecycle.test.ts
git commit -m "feat(game-inflation-rpg): NpcLifecycle (tick, spawn, isAliveAge) (V3-E)"
```

---

## Task 18: NpcInteraction outcomes (TDD)

**Files:** Create `games/inflation-rpg/src/npc/NpcInteraction.ts`, `games/inflation-rpg/src/npc/__tests__/NpcInteraction.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
import { describe, expect, it } from 'vitest';
import type { NpcEntity, MetaState } from '../../types';
import type { PersonalityState } from '../../hero/PersonalityState';
import { computeNpcOutcome } from '../NpcInteraction';

function npc(kind: NpcEntity['kind']): NpcEntity {
  return {
    instanceId: 'n1', kind, nameKR: 'X', emoji: '🗡️',
    age: 30, ageRate: 1.0, isAlive: true, bornChapter: '어린시절',
    relationship: 50, zoneRealmId: 'base',
  };
}

function pers(overrides: Partial<PersonalityState>): PersonalityState {
  return {
    moral: 0, prudent: 0, heroic: 0, merciful: 0, pious: 0,
    ...overrides,
  } as PersonalityState;
}

describe('computeNpcOutcome', () => {
  it('rival + heroic high → 결투 (combat)', () => {
    const r = computeNpcOutcome(npc('rival'), pers({ heroic: 5 }));
    expect(r.outcome).toBe('duel');
  });
  it('rival + prudent high → 회피', () => {
    const r = computeNpcOutcome(npc('rival'), pers({ prudent: 5 }));
    expect(r.outcome).toBe('evade');
  });
  it('mentor + pious high → 스킬 전수', () => {
    const r = computeNpcOutcome(npc('mentor'), pers({ pious: 5 }));
    expect(r.outcome).toBe('skill_taught');
  });
  it('friend → talk by default', () => {
    const r = computeNpcOutcome(npc('friend'), pers({}));
    expect(['talk','help']).toContain(r.outcome);
  });
  it('returns relationship delta', () => {
    const r = computeNpcOutcome(npc('friend'), pers({ merciful: 3 }));
    expect(typeof r.relationshipDelta).toBe('number');
  });
});
```

- [ ] **Step 2: Run + verify failure**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/npc/__tests__/NpcInteraction.test.ts
```

- [ ] **Step 3: NpcInteraction.ts impl**

```typescript
import type { NpcEntity } from '../types';
import type { PersonalityState } from '../hero/PersonalityState';

export type NpcOutcomeKind =
  | 'duel' | 'cooperate' | 'evade'        // rival
  | 'skill_taught' | 'ordinary'           // mentor
  | 'talk' | 'help' | 'farewell'          // friend
  | 'family_meal' | 'family_milestone';   // family

export interface NpcOutcome {
  outcome: NpcOutcomeKind;
  narrativeKR: string;
  relationshipDelta: number;
}

export function computeNpcOutcome(npc: NpcEntity, personality: PersonalityState): NpcOutcome {
  switch (npc.kind) {
    case 'rival': {
      if (personality.heroic >= 3 || personality.moral <= -3) {
        return { outcome: 'duel', narrativeKR: `${npc.nameKR}와 결투했다`, relationshipDelta: -10 };
      }
      if (personality.merciful >= 3) {
        return { outcome: 'cooperate', narrativeKR: `${npc.nameKR}와 잠시 협력했다`, relationshipDelta: 10 };
      }
      if (personality.prudent >= 3) {
        return { outcome: 'evade', narrativeKR: `${npc.nameKR}를 회피했다`, relationshipDelta: -2 };
      }
      return { outcome: 'duel', narrativeKR: `${npc.nameKR}와 만났다`, relationshipDelta: 0 };
    }
    case 'mentor': {
      if (personality.pious >= 3) {
        return { outcome: 'skill_taught', narrativeKR: `${npc.nameKR}이 새 기술을 전수했다`, relationshipDelta: 15 };
      }
      return { outcome: 'ordinary', narrativeKR: `${npc.nameKR}과 잠시 대화했다`, relationshipDelta: 3 };
    }
    case 'friend':
    case 'family_spouse': {
      if (personality.heroic >= 3) {
        return { outcome: 'help', narrativeKR: `${npc.nameKR}를 도왔다`, relationshipDelta: 8 };
      }
      return { outcome: 'talk', narrativeKR: `${npc.nameKR}와 잡담했다`, relationshipDelta: 3 };
    }
    case 'family_parent':
    case 'family_child': {
      return { outcome: 'family_meal', narrativeKR: `${npc.nameKR}와 식사했다`, relationshipDelta: 5 };
    }
    default:
      return { outcome: 'talk', narrativeKR: `${npc.nameKR}와 만났다`, relationshipDelta: 0 };
  }
}
```

- [ ] **Step 4: Test PASS + commit**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/npc/__tests__/NpcInteraction.test.ts
git add games/inflation-rpg/src/npc/NpcInteraction.ts games/inflation-rpg/src/npc/__tests__/NpcInteraction.test.ts
git commit -m "feat(game-inflation-rpg): NpcInteraction outcomes (V3-E)"
```

---

## Task 19: NPC encounter trigger 시스템 (CycleControllerV2)

**Files:** Modify `games/inflation-rpg/src/overworld/CycleControllerV2.ts`

- [ ] **Step 1: handleArrival 에 NPC encounter trigger 추가**

`handleArrival` 의 events 처리 끝부분 (chapter_transition + realm_entered 다음) 에 추가:

```typescript
import { useGameStore } from '../store/gameStore';
// (이미 import 되어 있다면 중복 안 함)
import { tickNpc } from '../npc/NpcLifecycle';

// handleArrival 안에서:
    // V3-E: NPC encounter + lifecycle
    const state = useGameStore.getState();
    const npcs = state.run.npcs;
    for (const npc of npcs) {
      tickNpc(npc);
      if (!npc.isAlive) {
        events.push({ type: 'npc_died', npcInstanceId: npc.instanceId });
      }
    }
    // Encounter trigger: 현재 realm 거주 + alive NPC 중 1명 (20% 확률)
    const candidates = npcs.filter(n => n.isAlive && n.zoneRealmId === this.currentRealmId);
    if (candidates.length > 0 && this.encounterRng.chance(0.2)) {
      const picked = candidates[this.encounterRng.intBelow(candidates.length)];
      events.push({ type: 'npc_encounter', npcInstanceId: picked.instanceId, npcKind: picked.kind });
    }
```

NB: `this.encounterRng` 가 이미 존재하는지 확인. 없으면 controller 의 rng 사용 또는 별도 RNG 생성. SeededRng의 `chance(p)` / `intBelow(n)` 메서드 존재 확인.

- [ ] **Step 2: typecheck + 회귀 vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/overworld/CycleControllerV2.ts
git commit -m "feat(game-inflation-rpg): NPC encounter trigger + lifecycle tick (V3-E)"
```

---

## Task 20: NPC spawn on chapter milestone

**Files:** Modify `games/inflation-rpg/src/overworld/CycleControllerV2.ts`, `games/inflation-rpg/src/store/gameStore.ts`

- [ ] **Step 1: gameStore 의 spawnNpc action**

`gameStore.ts` interface 에 추가:

```typescript
  // Phase V3-E — NPC spawn
  addNpc: (npc: import('../types').NpcEntity) => void;
  updateNpc: (instanceId: string, patch: Partial<import('../types').NpcEntity>) => void;
```

actions 안에 impl:

```typescript
      addNpc(npc) {
        set(s => ({ ...s, run: { ...s.run, npcs: [...s.run.npcs, npc] } }));
      },
      updateNpc(instanceId, patch) {
        set(s => ({ ...s, run: { ...s.run, npcs: s.run.npcs.map(n => n.instanceId === instanceId ? { ...n, ...patch } : n) } }));
      },
```

- [ ] **Step 2: CycleControllerV2 가 chapter_transition 시 NPC spawn 시도**

`handleArrival` 의 `chapter_transition` event 처리 안에 추가:

```typescript
import { spawnNpc } from '../npc/NpcLifecycle';

// chapter_transition 발화 이후, hero 의 새 chapter 에 따라 NPC spawn 검사
const newChapter = this.hero.chapter;
const seed = this.opts.seed ^ Math.floor(this.kills * 7919);  // 결정적 seed
const state = useGameStore.getState();

// 어린시절 시작 시 부모 spawn (이미 있으면 skip)
if (newChapter === '어린시절' && !state.run.npcs.some(n => n.kind === 'family_parent')) {
  const father = spawnNpc('family_parent', { realmId: this.currentRealmId ?? 'base', seed });
  if (father) {
    state.addNpc(father);
    events.push({ type: 'family_event', eventKind: 'parent_death', npcInstanceId: undefined });  // narrative anchor
  }
}

// 어린시절 후반 ~ 청년기: 라이벌 1명 spawn (확률)
if ((newChapter === '청년기') && !state.run.npcs.some(n => n.kind === 'rival') && this.encounterRng.chance(0.6)) {
  const rival = spawnNpc('rival', { realmId: this.currentRealmId ?? 'base', seed: seed + 1 });
  if (rival) state.addNpc(rival);
}

// 청년기: 멘토 spawn (확률 30%)
if (newChapter === '청년기' && !state.run.npcs.some(n => n.kind === 'mentor') && this.encounterRng.chance(0.3)) {
  const mentor = spawnNpc('mentor', { realmId: this.currentRealmId ?? 'base', seed: seed + 2 });
  if (mentor) state.addNpc(mentor);
}

// 장년기: 결혼 + 자식 spawn
if (newChapter === '장년기' && !state.run.npcs.some(n => n.kind === 'family_spouse') && this.encounterRng.chance(0.5)) {
  const spouse = spawnNpc('family_spouse', { realmId: this.currentRealmId ?? 'base', seed: seed + 3 });
  if (spouse) {
    state.addNpc(spouse);
    events.push({ type: 'family_event', eventKind: 'marriage', npcInstanceId: spouse.instanceId });
  }
  const child = spawnNpc('family_child', { realmId: this.currentRealmId ?? 'base', seed: seed + 4 });
  if (child) {
    state.addNpc(child);
    events.push({ type: 'family_event', eventKind: 'child_birth', npcInstanceId: child.instanceId });
  }
}
```

NB: 이 logic 은 chapter_transition 의 event push 직후에 넣음. controller 의 hero.chapter 값을 사용 (transition 후 newChapter).

- [ ] **Step 3: typecheck + 회귀 vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/overworld/CycleControllerV2.ts
git commit -m "feat(game-inflation-rpg): NPC spawn on chapter milestone (V3-E)"
```

---

## Task 21: NpcEncounterModal UI

**Files:** Create `games/inflation-rpg/src/screens/NpcEncounterModal.tsx`

- [ ] **Step 1: Modal component**

```tsx
import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { computeNpcOutcome } from '../npc/NpcInteraction';

interface Props {
  npcInstanceId: string;
  onClose: () => void;
}

export function NpcEncounterModal({ npcInstanceId, onClose }: Props) {
  const npc = useGameStore(s => s.run.npcs.find(n => n.instanceId === npcInstanceId));
  const updateNpc = useGameStore(s => s.updateNpc);
  const controller = useCycleStoreV2(s => s.controller);
  const hero = controller?.getHero();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!npc || !hero) return null;

  const outcome = computeNpcOutcome(npc, hero.personality);
  const confirm = () => {
    updateNpc(npc.instanceId, { relationship: Math.max(0, Math.min(100, npc.relationship + outcome.relationshipDelta)) });
    onClose();
  };

  return (
    <div data-testid="npc-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div data-testid="npc-modal" style={{ width: 'min(360px, 92vw)', background: '#1a1d28', color: '#eee', borderRadius: 12, padding: 16, border: '1px solid #444' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>{npc.emoji} {npc.nameKR}</div>
        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 12 }}>{npc.age.toFixed(0)}세 · 관계 {npc.relationship}</div>
        <div style={{ fontSize: 14, marginBottom: 16 }}>{outcome.narrativeKR}</div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>관계 변화: {outcome.relationshipDelta >= 0 ? '+' : ''}{outcome.relationshipDelta}</div>
        <button type="button" data-testid="npc-modal-confirm" onClick={confirm} style={{ minHeight: 44, padding: '8px 16px', background: '#3b4252', color: '#eee', border: '1px solid #555', borderRadius: 6, fontSize: 13, width: '100%' }}>
          확인
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: typecheck + commit**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
git add games/inflation-rpg/src/screens/NpcEncounterModal.tsx
git commit -m "feat(game-inflation-rpg): NpcEncounterModal (V3-E)"
```

---

## Task 22: OverworldRunner — NPC modal mount + family event handler

**Files:** Modify `games/inflation-rpg/src/screens/OverworldRunner.tsx`

- [ ] **Step 1: state + mount**

```typescript
  const [npcModal, setNpcModal] = useState<{ npcInstanceId: string } | null>(null);
```

handleArrival 의 evs 처리에 추가:

```typescript
          const npcEncounter = evs.find(e => e.type === 'npc_encounter');
          if (npcEncounter && npcEncounter.type === 'npc_encounter') {
            setNpcModal({ npcInstanceId: npcEncounter.npcInstanceId });
          }
```

JSX 에 mount:

```jsx
      {npcModal && <NpcEncounterModal npcInstanceId={npcModal.npcInstanceId} onClose={() => setNpcModal(null)} />}
```

import 추가:

```typescript
import { NpcEncounterModal } from './NpcEncounterModal';
```

- [ ] **Step 2: typecheck + 회귀 vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/screens/OverworldRunner.tsx
git commit -m "feat(game-inflation-rpg): NpcEncounterModal mount in OverworldRunner (V3-E)"
```

---

## Task 23: SagaRecorder 확장 (EternalSaga structure)

**Files:** Modify `games/inflation-rpg/src/saga/SagaRecorder.ts`, Create `games/inflation-rpg/src/saga/EternalSaga.ts`

- [ ] **Step 1: EternalSaga helper**

`games/inflation-rpg/src/saga/EternalSaga.ts`:

```typescript
import type { EternalSagaState } from '../types';
import type { SagaEvent } from './SagaTypes';
import type { Chapter } from '../hero/HeroLifecycle';

export function eraKeyFor(chapter: Chapter, rejuvCount: number): string {
  return rejuvCount === 0 ? `본래 ${chapter}` : `재생 #${rejuvCount} ${chapter}`;
}

export function appendEvent(state: EternalSagaState, event: SagaEvent, currentChapter: Chapter): EternalSagaState {
  const key = eraKeyFor(currentChapter, state.rejuvenationCount);
  const existing = state.chaptersByEra[key];
  const newEra = existing
    ? { ...existing, events: [...existing.events, event] }
    : { eraKey: key, chapter: currentChapter, rejuvCount: state.rejuvenationCount, events: [event] };
  return {
    ...state,
    events: [...state.events, event],
    chaptersByEra: { ...state.chaptersByEra, [key]: newEra },
  };
}

export function recordRejuvenation(state: EternalSagaState): EternalSagaState {
  return { ...state, rejuvenationCount: state.rejuvenationCount + 1 };
}

export function recordRealmTransition(state: EternalSagaState, from: import('../types').RealmId, to: import('../types').RealmId, atAge: number, currentChapter: Chapter): EternalSagaState {
  const key = eraKeyFor(currentChapter, state.rejuvenationCount);
  return {
    ...state,
    realmTransitions: [...state.realmTransitions, { from, to, atAge, eraKey: key }],
  };
}
```

- [ ] **Step 2: tests**

`games/inflation-rpg/src/saga/__tests__/EternalSaga.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { eraKeyFor, appendEvent, recordRejuvenation, recordRealmTransition } from '../EternalSaga';

const empty = { events: [], chaptersByEra: {}, rejuvenationCount: 0, realmTransitions: [] };

describe('eraKeyFor', () => {
  it('rejuvCount 0 → "본래 X"', () => expect(eraKeyFor('어린시절', 0)).toBe('본래 어린시절'));
  it('rejuvCount 2 → "재생 #2 X"', () => expect(eraKeyFor('청년기', 2)).toBe('재생 #2 청년기'));
});

describe('appendEvent', () => {
  it('appends to events + chaptersByEra', () => {
    const e = { age: 10, type: 'battle' as const, narrativeText: '...', payload: {} as any };
    const next = appendEvent(empty, e, '어린시절');
    expect(next.events).toHaveLength(1);
    expect(next.chaptersByEra['본래 어린시절'].events).toHaveLength(1);
  });
  it('grouping by era key', () => {
    const e1 = { age: 10, type: 'battle' as const, narrativeText: '1', payload: {} as any };
    const e2 = { age: 12, type: 'battle' as const, narrativeText: '2', payload: {} as any };
    let s = appendEvent(empty, e1, '어린시절');
    s = appendEvent(s, e2, '어린시절');
    expect(s.chaptersByEra['본래 어린시절'].events).toHaveLength(2);
  });
});

describe('recordRejuvenation', () => {
  it('increments rejuvenationCount', () => {
    const next = recordRejuvenation(empty);
    expect(next.rejuvenationCount).toBe(1);
  });
});

describe('recordRealmTransition', () => {
  it('appends transition', () => {
    const next = recordRealmTransition(empty, 'base', 'sea', 25, '청년기');
    expect(next.realmTransitions).toHaveLength(1);
    expect(next.realmTransitions[0].to).toBe('sea');
  });
});
```

- [ ] **Step 3: Test + commit**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run src/saga/__tests__/EternalSaga.test.ts
git add games/inflation-rpg/src/saga/EternalSaga.ts games/inflation-rpg/src/saga/__tests__/EternalSaga.test.ts
git commit -m "feat(game-inflation-rpg): EternalSaga helpers (V3-F)"
```

---

## Task 24: gameStore — eternalSaga record actions

**Files:** Modify `games/inflation-rpg/src/store/gameStore.ts`

- [ ] **Step 1: interface + actions**

```typescript
  // Phase V3-F — eternal saga
  recordSagaEvent: (event: import('../saga/SagaTypes').SagaEvent, chapter: import('../hero/HeroLifecycle').Chapter) => void;
  recordSagaRejuvenation: () => void;
  recordSagaRealmTransition: (from: import('../types').RealmId, to: import('../types').RealmId, atAge: number, chapter: import('../hero/HeroLifecycle').Chapter) => void;
```

impl:

```typescript
      recordSagaEvent(event, chapter) {
        set(s => ({ ...s, meta: { ...s.meta, eternalSaga: appendEvent(s.meta.eternalSaga, event, chapter) } }));
      },
      recordSagaRejuvenation() {
        set(s => ({ ...s, meta: { ...s.meta, eternalSaga: recordRejuvenation(s.meta.eternalSaga) } }));
      },
      recordSagaRealmTransition(from, to, atAge, chapter) {
        set(s => ({ ...s, meta: { ...s.meta, eternalSaga: recordRealmTransition(s.meta.eternalSaga, from, to, atAge, chapter) } }));
      },
```

imports:

```typescript
import { appendEvent, recordRejuvenation, recordRealmTransition } from '../saga/EternalSaga';
```

- [ ] **Step 2: typecheck + commit**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
git add games/inflation-rpg/src/store/gameStore.ts
git commit -m "feat(game-inflation-rpg): eternalSaga store actions (V3-F)"
```

---

## Task 25: cycleSliceV2 + CycleControllerV2 가 saga 기록

**Files:** Modify `games/inflation-rpg/src/overworld/cycleSliceV2.ts`, `games/inflation-rpg/src/overworld/CycleControllerV2.ts`

- [ ] **Step 1: cycleSliceV2 의 rejuvenateHero 가 sagaRejuvenation 기록**

`cycleSliceV2.ts` 의 `rejuvenateHero(years)` 안 hero.rejuvenate(years) 호출 후 추가:

```typescript
    useGameStore.getState().recordSagaRejuvenation();
```

- [ ] **Step 2: CycleControllerV2 가 realm 전환 시 sagaRealmTransition 기록**

handleArrival 의 realm_entered event push 직후에 추가:

```typescript
        useGameStore.getState().recordSagaRealmTransition(
          this.currentRealmId,  // old realm before update
          newRealm,
          this.hero.age,
          this.hero.chapter,
        );
```

NB: 위에서 `this.currentRealmId = newRealm` 으로 update 전에 old realm 변수 capture 필요. 작은 refactor:

```typescript
    if (kind === 'exit' && this.currentRealmId) {
      const realm = findRealm(this.currentRealmId);
      const state = useGameStore.getState();
      if (realm.nextRealm && state.meta.unlockedRealms.includes(realm.nextRealm)) {
        const newRealm = realm.nextRealm;
        const oldRealm = this.currentRealmId;
        this.currentRealmId = newRealm;
        state.setCurrentRealm(newRealm);
        state.recordSagaRealmTransition(oldRealm, newRealm, this.hero.age, this.hero.chapter);
        events.push({ type: 'realm_entered', realmId: newRealm });
      }
    }
```

- [ ] **Step 3: SagaRecorder 도 eternalSaga 에 event 기록 (optional, V3-F 의 핵심은 기존 record + 새 store action 호출)**

기존 SagaRecorder.record 가 controller 내부의 saga 만 다룸. EternalSaga 는 store-side. controller 의 record(event) 호출 site 마다 store 의 `recordSagaEvent(event, chapter)` 도 호출하면 됨.

CycleControllerV2 의 saga.record(...) 가 호출되는 모든 위치 (battle, drop, level_up, shrine, moral, hero_died 등) 마다 직후에:

```typescript
    useGameStore.getState().recordSagaEvent(sagaEvent, this.hero.chapter);
```

NB: 너무 많은 site 가 있으면 helper 함수 추출:

```typescript
private recordToStore(event: SagaEvent) {
  this.saga.record(event);
  useGameStore.getState().recordSagaEvent(event, this.hero.chapter);
}
```

그리고 모든 `this.saga.record(...)` 호출을 `this.recordToStore(...)` 로 치환.

- [ ] **Step 4: typecheck + 회귀 vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/overworld/cycleSliceV2.ts games/inflation-rpg/src/overworld/CycleControllerV2.ts
git commit -m "feat(game-inflation-rpg): controller writes to eternalSaga (V3-F)"
```

---

## Task 26: SagaBookModal — timeline scroll viewer

**Files:** Create `games/inflation-rpg/src/screens/SagaBookModal.tsx`

- [ ] **Step 1: Modal**

```tsx
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { REALM_CATALOG } from '../data/realms';

interface Props {
  onClose: () => void;
}

type EventFilter = 'all' | 'battle' | 'drop' | 'levelUp' | 'realm' | 'npc' | 'rejuv';

export function SagaBookModal({ onClose }: Props) {
  const saga = useGameStore(s => s.meta.eternalSaga);
  const [filter, setFilter] = useState<EventFilter>('all');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // group by era, sorted
  const eras = Object.values(saga.chaptersByEra).sort((a, b) => {
    if (a.rejuvCount !== b.rejuvCount) return a.rejuvCount - b.rejuvCount;
    const order = ['어린시절','청년기','장년기','노년기','마지막'];
    return order.indexOf(a.chapter) - order.indexOf(b.chapter);
  });

  return (
    <div data-testid="saga-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div data-testid="saga-modal" style={{ width: 'min(560px, 96vw)', maxHeight: '88vh', background: '#1a1d28', color: '#eee', borderRadius: 12, border: '1px solid #444', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <strong>인생의 기록</strong>
          <span style={{ fontSize: 12, color: '#aaa' }}>재생 #{saga.rejuvenationCount}</span>
          <button type="button" data-testid="saga-modal-close" onClick={onClose} style={{ minHeight: 44, padding: '6px 12px', background: '#3b4252', color: '#eee', border: '1px solid #555', borderRadius: 6, fontSize: 13 }}>✕</button>
        </div>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #333', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['all','battle','drop','levelUp','realm','npc','rejuv'] as EventFilter[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              data-testid={`saga-filter-${f}`}
              style={{ padding: '4px 8px', background: filter === f ? '#3b4252' : '#262830', color: '#eee', border: '1px solid #555', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
            >
              {f === 'all' ? '전체' : f}
            </button>
          ))}
        </div>
        <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', padding: '8px 16px' }}>
          {eras.map(era => {
            const filteredEvents = era.events.filter(e => filter === 'all' ? true : e.type === filter);
            if (filteredEvents.length === 0) return null;
            return (
              <div key={era.eraKey} style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: era.rejuvCount > 0 ? '#ffd54f' : '#eee',
                  borderBottom: era.rejuvCount > 0 ? '2px solid #ffd54f' : '1px solid #555',
                  padding: '6px 0', marginBottom: 6,
                }}>
                  {era.eraKey}
                </div>
                {filteredEvents.map((ev, i) => (
                  <div key={i} data-testid="saga-event" style={{ fontSize: 12, color: '#ccc', padding: '4px 0', borderLeft: '2px solid #444', paddingLeft: 8, marginBottom: 2 }}>
                    <span style={{ color: '#888', marginRight: 6 }}>{ev.age}세</span>
                    {ev.narrativeText}
                  </div>
                ))}
              </div>
            );
          })}
          {saga.realmTransitions.length > 0 && (filter === 'all' || filter === 'realm') && (
            <div style={{ marginTop: 16, borderTop: '1px solid #333', paddingTop: 8 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>영역 전환 기록</div>
              {saga.realmTransitions.map((t, i) => {
                const fromName = REALM_CATALOG.find(r => r.id === t.from)?.nameKR ?? t.from;
                const toName = REALM_CATALOG.find(r => r.id === t.to)?.nameKR ?? t.to;
                return (
                  <div key={i} style={{ fontSize: 12, color: '#ccc' }}>
                    <span style={{ color: '#888' }}>{t.atAge}세</span> {fromName} → {toName}
                  </div>
                );
              })}
            </div>
          )}
          {eras.length === 0 && (
            <div data-testid="saga-empty" style={{ textAlign: 'center', color: '#666', padding: 24 }}>
              아직 기록된 사건이 없다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: typecheck + commit**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
git add games/inflation-rpg/src/screens/SagaBookModal.tsx
git commit -m "feat(game-inflation-rpg): SagaBookModal timeline viewer (V3-F)"
```

---

## Task 27: OverworldRunner — 기록 버튼 + Saga modal mount

**Files:** Modify `games/inflation-rpg/src/screens/OverworldRunner.tsx`

- [ ] **Step 1: state + button + mount**

state 추가:

```typescript
  const [sagaModalOpen, setSagaModalOpen] = useState(false);
```

HUD 의 speed buttons 다음 (또는 신의 메뉴 버튼 옆) 에 기록 버튼:

```jsx
        <button
          type="button"
          onClick={() => setSagaModalOpen(true)}
          data-testid="open-saga-modal"
          style={{ marginLeft: 8, padding: '4px 8px', fontSize: 12 }}
        >
          📖 기록
        </button>
```

JSX modal mount:

```jsx
      {sagaModalOpen && <SagaBookModal onClose={() => setSagaModalOpen(false)} />}
```

import:

```typescript
import { SagaBookModal } from './SagaBookModal';
```

- [ ] **Step 2: typecheck + 회귀 vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/screens/OverworldRunner.tsx
git commit -m "feat(game-inflation-rpg): 기록 button + SagaBookModal mount (V3-F)"
```

---

## Task 28: Hero gridX exposure (HeroEntity)

**Files:** Modify `games/inflation-rpg/src/hero/HeroEntity.ts`

- [ ] **Step 1: gridX getter 추가**

`HeroEntity` 안에 추가:

```typescript
  /** V3-D — current grid column. Updated by OverworldScene movement tween. */
  public gridX: number = 0;
  public gridY: number = 0;
```

`OverworldScene` 의 hero movement (tween onComplete) 안에서 hero.gridX/gridY 갱신:

기존 코드 (OverworldScene.ts) 의 tween onComplete:

```typescript
      onComplete: () => {
        this.hero.gridX = next.x;  // pathfinder next step coord
        this.hero.gridY = next.y;
        // ... 기존 onComplete 로직 (arrival emit 등)
      },
```

NB: `next.x` / `next.y` 의 정확한 변수명은 기존 onComplete 코드에서 확인. tween target 의 좌표.

- [ ] **Step 2: typecheck + 회귀 vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/hero/HeroEntity.ts games/inflation-rpg/src/overworld/OverworldScene.ts
git commit -m "feat(game-inflation-rpg): HeroEntity.gridX/gridY for field damping (V3-D)"
```

---

## Task 29: Pathfinding bounds — current realm only

**Files:** Modify `games/inflation-rpg/src/overworld/Pathfinding.ts`

- [ ] **Step 1: navigation bounds**

`Pathfinding.findPath(start, goal, …)` 또는 비슷한 함수에 옵션 추가. 기존 코드 읽고 정확한 signature 파악 후 column range 제약 추가:

```typescript
export interface PathfindOpts {
  /** V3-D — column range [start, end). 외 column 은 navigation 차단. */
  columnBounds?: [number, number];
}

export function findPath(start: Coord, goal: Coord, blocked: Set<string>, opts: PathfindOpts = {}): Coord[] | null {
  const { columnBounds } = opts;
  // A* 의 neighbor expansion 안에서:
  // if (columnBounds && (n.x < columnBounds[0] || n.x >= columnBounds[1])) continue;
  // ... 기존 로직
}
```

OverworldScene 의 pathfind 호출 site 에서 columnBounds 전달:

```typescript
import { findRealm } from '../data/realms';
// ...
const realm = findRealm(this.currentRealmId ?? 'base');
const path = findPath(start, goal, blocked, { columnBounds: realm.columnRange });
```

NB: OverworldScene 이 currentRealmId 를 어떻게 알지? `scene.init` 또는 props 에서. cycleSliceV2.start 가 scene 에 props 전달 시 currentRealmId 도 같이. 또는 useGameStore.getState().run.currentRealmId 직접 read (scene 안에서).

scene 안에서 store read:

```typescript
import { useGameStore } from '../store/gameStore';
// scene update 또는 navigation 안에서:
const currentRealmId = useGameStore.getState().run.currentRealmId;
```

- [ ] **Step 2: typecheck + 회귀 vitest**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/overworld/Pathfinding.ts games/inflation-rpg/src/overworld/OverworldScene.ts
git commit -m "feat(game-inflation-rpg): pathfinding columnBounds = current realm (V3-D)"
```

---

## Task 30: SagaBookModal — 회춘 marker visual

**Files:** Modify `games/inflation-rpg/src/screens/SagaBookModal.tsx`

- [ ] **Step 1: 회춘 divider 추가**

SagaBookModal 의 era loop 안에서, era.rejuvCount 의 첫 era (= 새 재생 시작) 일 때 큰 divider 표시.

기존 era div 의 헤더에 이미 `color: era.rejuvCount > 0 ? '#ffd54f' : '#eee'` 가 있지만, era 의 첫 chapter 일 때 추가 visual:

```jsx
            return (
              <div key={era.eraKey} style={{ marginBottom: 16 }}>
                {era.rejuvCount > 0 && era.chapter === '어린시절' && (
                  <div data-testid={`saga-rejuv-marker-${era.rejuvCount}`} style={{
                    fontSize: 16, fontWeight: 700, color: '#ffd54f',
                    textAlign: 'center', padding: '12px 0',
                    background: 'linear-gradient(90deg, transparent, rgba(255,213,79,0.2), transparent)',
                    margin: '16px -16px 8px',
                  }}>
                    ✨ 재생 #{era.rejuvCount} ✨
                  </div>
                )}
                <div style={{ fontSize: 14, fontWeight: 700, color: era.rejuvCount > 0 ? '#ffd54f' : '#eee', borderBottom: era.rejuvCount > 0 ? '2px solid #ffd54f' : '1px solid #555', padding: '6px 0', marginBottom: 6 }}>
                  {era.eraKey}
                </div>
                {/* events ... 기존 그대로 */}
              </div>
            );
```

- [ ] **Step 2: typecheck + commit**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
git add games/inflation-rpg/src/screens/SagaBookModal.tsx
git commit -m "feat(game-inflation-rpg): 회춘 marker visual in SagaBookModal (V3-F)"
```

---

## Task 31: Buff #6 effect site (getFieldDiffThreshold 의 wire 자리는 이미 V3-C, consume 는 Task 11 에서 이미 완료) — verify

**Files:** none (verification)

- [ ] **Step 1: Buff #6 wire 확인**

이미 Task 11 에서 `getBuffSnapshot` 의 damping 계산에 `getFieldDiffThreshold(meta)` 를 buff6 으로 전달. 추가 wire 없이 자동으로 active.

Verify:

```bash
grep -n "getFieldDiffThreshold" games/inflation-rpg/src/overworld/cycleSliceV2.ts
```
Expected: damping callback 안에 1 호출.

- [ ] **Step 2: 별도 unit test 가 buff #6 effect verify**

`games/inflation-rpg/src/zone/__tests__/fieldDamping.test.ts` 가 이미 cap + buff6 partial cancel 검증. 추가 없이 OK.

- [ ] **Step 3: 기존 test 의 buff #6 wire 검증 케이스 추가 (선택)**

`games/inflation-rpg/src/buff/__tests__/buffEffects.test.ts` 에 한 줄 추가:

```typescript
  it('field_diff Lv 10 → threshold 10 (V3-D 의 damping 흡수)', () => {
    expect(getFieldDiffThreshold(meta({ field_diff: 10 }))).toBe(10);
  });
```

이미 V3-C 의 Lv 5 케이스가 있으면 skip.

- [ ] **Step 4: vitest 회귀**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run
```

- [ ] **Step 5: Commit (if test added)**

```bash
git add games/inflation-rpg/src/buff/__tests__/buffEffects.test.ts
git commit -m "test(game-inflation-rpg): verify field_diff wire (V3-D)" || true
```

Note: `|| true` because the commit may be empty if no changes.

---

## Task 32: E2E v3-def 통합 test

**Files:** Create `games/inflation-rpg/tests/e2e/v3-def-multi-zone-npc-saga.spec.ts`

- [ ] **Step 1: E2E spec**

기존 `v3-c-spend-modal.spec.ts` 의 패턴 따라:

```typescript
import { expect, test } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

test.describe('V3-DEF — Multi-zone + NPC + Saga', () => {
  test.setTimeout(300_000);

  test('zone unlock, NPC encounter, saga viewer 동작', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => { localStorage.removeItem(key); }, SAVE_KEY);
    await page.reload();

    // 시작
    await page.getByTestId('btn-start-cycle').click();
    await page.getByTestId('btn-prep-start').click();
    await page.waitForSelector('[data-testid="overworld-runner"]', { timeout: 10000 });

    // 가속
    await page.getByTestId('speed-10x').click();

    // HUD 의 realm 표시 확인
    await expect(page.getByTestId('hud-realm')).toBeVisible({ timeout: 30000 });
    const realmText = await page.getByTestId('hud-realm').innerText();
    expect(realmText).toContain('시작의 들판');
    expect(realmText).toContain('/6');  // 총 6 realm

    // 기록 버튼 열기
    await page.getByTestId('open-saga-modal').click();
    await expect(page.getByTestId('saga-modal')).toBeVisible();
    await page.getByTestId('saga-modal-close').click();
    await expect(page.getByTestId('saga-modal')).not.toBeVisible();

    // 충분히 진행 시 NPC encounter 모달 발생 (40s budget)
    await page.waitForTimeout(40_000);

    // close any NPC modal if it appeared
    const npcModal = page.getByTestId('npc-modal');
    if (await npcModal.isVisible().catch(() => false)) {
      await page.getByTestId('npc-modal-confirm').click();
    }

    // saga viewer 에 event 있음 확인
    await page.getByTestId('open-saga-modal').click();
    await expect(page.getByTestId('saga-modal')).toBeVisible();
    const sagaEvents = await page.getByTestId('saga-event').count();
    expect(sagaEvents).toBeGreaterThan(0);
  });
});
```

NB: `btn-start-cycle` / `btn-prep-start` / `overworld-runner` / `speed-10x` testids 는 기존 V3-C E2E spec 의 패턴에서 확인. 다르면 조정.

- [ ] **Step 2: E2E 실행**

```bash
pnpm --filter @forge/game-inflation-rpg exec playwright test tests/e2e/v3-def-multi-zone-npc-saga.spec.ts
```
Expected: PASS (chromium + iphone14)

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/tests/e2e/v3-def-multi-zone-npc-saga.spec.ts
git commit -m "test(game-inflation-rpg): E2E v3-def multi-zone + NPC + saga"
```

---

## Task 33: 전체 검증 + main 머지 prep

**Files:** none (validation + merge prep)

- [ ] **Step 1: 전체 vitest**

```bash
pnpm --filter @forge/game-inflation-rpg exec vitest run
```
Expected: all PASS

- [ ] **Step 2: typecheck (모든 workspace)**

```bash
pnpm typecheck
```

- [ ] **Step 3: Lint**

```bash
pnpm lint
```

- [ ] **Step 4: 전체 E2E**

```bash
pnpm --filter @forge/game-inflation-rpg e2e
```

NB: `v2-vertical-slice.spec.ts` 는 V3-B 부터의 pre-existing 부채 (cycle-end never reached). Skip 또는 fail 이라도 V3-DEF scope 가 아님.

- [ ] **Step 5: Verification report**

다음 항목 다 정리:
- 총 vitest tests
- 총 e2e tests
- 모든 commits since `7a4d958` (V3-DEF branch 기준)
- 새 파일 수 + 수정 파일 수
- Known pre-existing 부채 (v2-vertical-slice, circular)

**DO NOT 머지 to main, DO NOT tag** — user 명시 후 진행. Branch `feat/phase-v3-def-multi-zone-npc-saga` 그대로 두고 verification report 만 보고.

- [ ] **Step 6: Commit 없음** (this task is verification only)

---

## Self-Review

**Spec coverage check** (sub-spec `2026-05-23-phase-v3-def-multi-zone-npc-saga-design.md`):
- §1 Scope ✓ (T1-T15 V3-D, T16-T22 V3-E, T23-T30 V3-F, T31-T33 verify+merge)
- §2 결정 사항 9개 ✓ (각 task 에 매핑)
- §3 Architecture ✓ (신규/수정 파일 매핑)
- §4 V3-D Multi-zone ✓ (T2-T15)
- §5 V3-E NPC ✓ (T16-T22)
- §6 V3-F EternalSaga ✓ (T23-T30)
- §7 Persist v20→v21 ✓ (T5)
- §8 Testing ✓ (T2-T4, T17-T18, T23, T32)
- §9 위험 — R6 (Hero AI 의 exit landmark 선택 priority) → T13 의 filter, R7 (Pathfinder 성능) → T29

**Placeholder scan:**
- Task 6: 기존 mapLayout 의 place 호출들은 "기존 코드 그대로 유지" 명시. NB 표기.
- Task 11: cycleSliceV2 의 default 콜백 의 closure 안에서 ctrl 참조 패턴 — NB 명시 (lazy `useCycleStoreV2.getState().controller`).
- Task 17: SeededRng의 메서드 (intBelow / next) 확인 NB.
- Task 28-29: OverworldScene 의 hero sprite 변수명 + pathfind 호출 site — "기존 코드 확인" NB.

**Type consistency:**
- `RealmId` (T1) → `REALM_CATALOG` (T2) → `zoneNavigation` (T3) → cycleSliceV2 / CycleControllerV2 (T11-T14) 일관 ✓
- `NpcEntity` (T1) → `NpcLifecycle.spawnNpc` (T17) → `NpcInteraction` (T18) → store actions (T20) → modal (T21) 일관 ✓
- `EternalSagaState` (T1) → `EternalSaga.ts` helpers (T23) → store actions (T24) → SagaBookModal (T26) 일관 ✓
- `getBuffSnapshot` shape `{ dropChanceBonus, agingSpeedMul, damping }` — T11 에서 확장 ↔ T11 consume 일관 ✓

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-23-phase-v3-def-multi-zone-npc-saga.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks. 33 task = 35+ subagent dispatch. 10h+ 자율 적합.

**2. Inline Execution** — executing-plans, batch with checkpoints

Which approach?
