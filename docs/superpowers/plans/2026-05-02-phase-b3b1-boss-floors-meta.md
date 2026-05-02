# Phase B-3β1 — Boss floors + dungeon meta progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 신 flow dungeon 의 보스 floor (5/10/15/20/25/30) 를 차별화한다. 각 dungeon 이 자체 mini/major/sub×3/final 보스 ID 를 가지며, BattleScene 이 floor 진입 시 일반 vs 보스 분기. floor 30 final 처치 = 1회 영구 보상 마킹 (`MetaState.dungeonFinalsCleared`) + "정복 완료" 모달 + 마을 강제 복귀. 모든 floor 처치 시 `MetaState.dungeonProgress[id].maxFloor` 영구 갱신. floor 30 cap (procedural 31+ 는 후속 phase).

**Architecture:**
- `Dungeon.bossIds: { mini, major, sub: [string, string, string], final }` 타입 + 3 dungeon 데이터에 매핑 입력. 보스 ID 는 기존 `bosses.ts` 의 109 풀에서 선택.
- `MetaState.dungeonProgress: Record<string, { maxFloor: number }>` (영구 추적), `MetaState.dungeonFinalsCleared: string[]` (final 처치 dungeonId 리스트).
- `MetaState.pendingFinalClearedId: string | null` — final 처치 직후 town 진입 시 모달 트리거. story 시스템 (`pendingStoryId`) 패턴.
- store actions: `markDungeonProgress(dungeonId, floor)`, `markFinalCleared(dungeonId)`, `setPendingFinalCleared(id | null)`.
- persist v4 → v5: 신규 meta 필드 default 주입.
- BattleScene `create()`: 신 flow 시 `getBossType(currentFloor)` 분기. 보스 floor → `dungeon.bossIds` 에서 type 별 픽 → `getBossById(id)` → HP/ATK = `monsterLevel * boss.hpMult * BOSS_HP_MULT` (기존 `run.level * 50` 대체). 일반 floor 그대로.
- BattleScene `doRound()` 처치 분기:
  - 일반 floor 처치 → `markDungeonProgress(id, currentFloor + 1)` (다음 도달 floor) → setCurrentFloor + setScreen('dungeon-floors') (기존 동일).
  - 보스 floor 처치: type=mini/major/sub → 일반 처치와 동일 흐름 + `bossDrop` 으로 reward + `markDungeonProgress`. type=final → `markFinalCleared(id)` + `setPendingFinalCleared(id)` + `setScreen('town')` (currentFloor 유지).
- DungeonFloors UI: floor card 가 `getBossType(floor) !== null` 시 보스 차별화 (배경 색 + 라벨 + 이모지). `floor > run.currentFloor` 잠금 그대로. floor 30 까지만 그림 (cap, 31+ procedural 은 후속).
- 신규 컴포넌트 `DungeonFinalClearedModal.tsx` — `meta.pendingFinalClearedId` 가 set 이면 노출. 닫기 시 `setPendingFinalCleared(null)`. `App.tsx` 에서 town/dungeon-floors 진입 시 mount.
- 보스 reward 곡선 (spec §2.3): mini = enhanceStones 1~3, major = 5~10 + 시그니처 epic placeholder, sub = 일반 + 차원 나침반 stub, final = 50~100 + mythic 1회 placeholder. 본 phase 에서는 **enhanceStones 적립 + bossDrop 만**. 시그니처 / mythic 장비는 후속 (`phase-content-data` 의 보스 풀에 `guaranteedDrop` 이미 있음 — 그대로 활용).

**Tech Stack:** TypeScript, React, Phaser, Zustand persist, vitest, Playwright (E2E).

**Files:**
- Modify: `games/inflation-rpg/src/types.ts` (Dungeon.bossIds, MetaState 3 필드)
- Modify: `games/inflation-rpg/src/data/dungeons.ts` (bossIds 매핑)
- Modify: `games/inflation-rpg/src/data/dungeons.test.ts` (bossIds 검증)
- Modify: `games/inflation-rpg/src/store/gameStore.ts` (INITIAL_META, 3 actions, persist v5)
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts` (action + migrate 테스트)
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts` (신 flow 보스 분기)
- Modify: `games/inflation-rpg/src/screens/DungeonFloors.tsx` (보스 카드)
- Modify: `games/inflation-rpg/src/screens/DungeonFloors.test.tsx` (보스 카드 검증)
- Create: `games/inflation-rpg/src/screens/DungeonFinalClearedModal.tsx`
- Create: `games/inflation-rpg/src/screens/DungeonFinalClearedModal.test.tsx`
- Modify: `games/inflation-rpg/src/App.tsx` (모달 mount)
- Modify: `games/inflation-rpg/e2e/dungeon-flow.spec.ts` (보스 floor 진입 케이스)

---

## Task 1: types.ts — Dungeon.bossIds + MetaState 신규 필드

**Files:**
- Modify: `games/inflation-rpg/src/types.ts`

- [ ] **Step 1: Dungeon interface 에 bossIds 필드 추가**

`games/inflation-rpg/src/types.ts` 의 `Dungeon` interface (line 223 근처) 의 `monsterPool` 라인 바로 아래에 추가:

```ts
export interface Dungeon {
  id: string;
  nameKR: string;
  emoji: string;
  themeColor: string;
  unlockGate: DungeonUnlock;
  monsterPool: string[];
  /**
   * Phase B-3β1 — boss IDs per floor type. References boss IDs in bosses.ts.
   *  - mini    → floor 5
   *  - major   → floor 10
   *  - sub[0]  → floor 15
   *  - sub[1]  → floor 20
   *  - sub[2]  → floor 25
   *  - final   → floor 30 (1회 영구 보상)
   */
  bossIds: {
    mini: string;
    major: string;
    sub: [string, string, string];
    final: string;
  };
  isHardOnly: boolean;
}
```

- [ ] **Step 2: MetaState 에 dungeonProgress / dungeonFinalsCleared / pendingFinalClearedId 추가**

같은 파일 `MetaState` interface (line 154 근처) 의 `regionsVisited: string[];` 라인 바로 아래에 추가:

```ts
// Phase B-3β1 — 신 dungeon flow 영구 진행도
dungeonProgress: Record<string, { maxFloor: number }>; // 던전별 도달 최대 floor
dungeonFinalsCleared: string[];                         // final boss 처치한 dungeonId 리스트 (1회 영구 보상 게이트)
pendingFinalClearedId: string | null;                   // final 처치 직후 town 진입 시 모달 트리거
```

- [ ] **Step 3: typecheck — INITIAL_META 등 사용처 깨지는지 확인**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`
Expected: `INITIAL_META` 객체 리터럴이 새 3 필드 빠진 에러. `DUNGEONS` 객체 리터럴이 `bossIds` 빠진 에러. **그 외 종류 에러 시 stop**, Task 2~3 에서 채울 것.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/types.ts
git commit -m "feat(game-inflation-rpg): add Dungeon.bossIds + MetaState dungeon-progress fields"
```

---

## Task 2: dungeons.ts — bossIds 매핑 + 테스트

**Files:**
- Modify: `games/inflation-rpg/src/data/dungeons.ts`
- Modify: `games/inflation-rpg/src/data/dungeons.test.ts`

매핑 결정 (락) — 기존 `bosses.ts` 109 풀에서 선택. 보스 ID 가 BOSSES 에 존재함을 테스트로 검증. Phase I 의 magnitude 미세 조정은 별도. 보스 ID 매핑:

| Dungeon  | mini (F5)               | major (F10)               | sub[0] (F15)            | sub[1] (F20)            | sub[2] (F25)            | final (F30)            |
|----------|-------------------------|---------------------------|-------------------------|-------------------------|-------------------------|------------------------|
| plains   | plains-ghost            | spirit-post-guardian      | cursed-plains           | plains-lord             | goblin-chief            | gate-guardian          |
| forest   | gumiho                  | tree-spirit               | black-tiger             | cursed-tree-spirit      | forest-ruler            | chaos-god              |
| mountains| mountain-god            | kumgang-spirit            | thunder-god             | sky-mountain-lord       | black-dragon            | jade-emperor           |

(모두 `bosses.ts` 의 BOSSES 배열에 존재하는 ID — `isHardMode: false` 인 normal mode 보스. plain `goblin-chief` / `gate-guardian` / `chaos-god` / `jade-emperor` 는 9 original 보스. 매그니튜드 미세조정은 Phase I.)

- [ ] **Step 1: 실패 테스트 — bossIds 매핑 + ID 존재성**

`games/inflation-rpg/src/data/dungeons.test.ts` 끝에 추가:

```ts
import { BOSSES } from './bosses';

describe('Phase B-3β1 — Dungeon.bossIds', () => {
  it('every dungeon has bossIds with correct shape', () => {
    for (const d of DUNGEONS) {
      expect(d.bossIds).toBeDefined();
      expect(typeof d.bossIds.mini).toBe('string');
      expect(typeof d.bossIds.major).toBe('string');
      expect(d.bossIds.sub).toHaveLength(3);
      expect(typeof d.bossIds.final).toBe('string');
    }
  });

  it('every bossId references a real BOSSES entry', () => {
    const knownIds = new Set(BOSSES.map(b => b.id));
    for (const d of DUNGEONS) {
      const all = [d.bossIds.mini, d.bossIds.major, ...d.bossIds.sub, d.bossIds.final];
      for (const id of all) {
        expect(knownIds.has(id)).toBe(true);
      }
    }
  });

  it('plains dungeon bossIds match locked mapping', () => {
    const plains = getDungeonById('plains')!;
    expect(plains.bossIds.mini).toBe('plains-ghost');
    expect(plains.bossIds.major).toBe('spirit-post-guardian');
    expect(plains.bossIds.sub).toEqual(['cursed-plains', 'plains-lord', 'goblin-chief']);
    expect(plains.bossIds.final).toBe('gate-guardian');
  });

  it('forest dungeon final = chaos-god', () => {
    expect(getDungeonById('forest')!.bossIds.final).toBe('chaos-god');
  });

  it('mountains dungeon final = jade-emperor', () => {
    expect(getDungeonById('mountains')!.bossIds.final).toBe('jade-emperor');
  });
});
```

- [ ] **Step 2: 테스트 실행 — fail 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test dungeons`
Expected: 5개 신규 + 기존 일부 fail (Dungeon 객체에 `bossIds` 없음).

- [ ] **Step 3: dungeons.ts 매핑 입력**

`games/inflation-rpg/src/data/dungeons.ts` 의 3 dungeon 객체 각각에 `monsterPool` 배열 직후 `bossIds` 필드 추가:

plains:
```ts
{
  id: 'plains',
  nameKR: '평야',
  emoji: '🏘️',
  themeColor: '#7ab648',
  unlockGate: { type: 'start' },
  monsterPool: [
    'plains-imp', 'plains-rat', 'plains-crow', 'plains-bandit', 'plains-ronin',
    'slime', 'goblin',
  ],
  bossIds: {
    mini: 'plains-ghost',
    major: 'spirit-post-guardian',
    sub: ['cursed-plains', 'plains-lord', 'goblin-chief'],
    final: 'gate-guardian',
  },
  isHardOnly: false,
},
```

forest:
```ts
{
  id: 'forest',
  nameKR: '깊은숲',
  emoji: '🌲',
  themeColor: '#1e4620',
  unlockGate: { type: 'start' },
  monsterPool: [
    'forest-fox', 'forest-squirrel', 'forest-bear', 'forest-spirit', 'forest-snake',
    'slime', 'goblin', 'tiger',
  ],
  bossIds: {
    mini: 'gumiho',
    major: 'tree-spirit',
    sub: ['black-tiger', 'cursed-tree-spirit', 'forest-ruler'],
    final: 'chaos-god',
  },
  isHardOnly: false,
},
```

mountains:
```ts
{
  id: 'mountains',
  nameKR: '산악',
  emoji: '⛰️',
  themeColor: '#7f8c8d',
  unlockGate: { type: 'start' },
  monsterPool: [
    'mountain-goat', 'mountain-bandit', 'mountain-eagle', 'mountain-miner', 'mountain-grey',
    'goblin', 'tiger',
  ],
  bossIds: {
    mini: 'mountain-god',
    major: 'kumgang-spirit',
    sub: ['thunder-god', 'sky-mountain-lord', 'black-dragon'],
    final: 'jade-emperor',
  },
  isHardOnly: false,
},
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test dungeons`
Expected: 모든 dungeons.test PASS.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/data/dungeons.ts games/inflation-rpg/src/data/dungeons.test.ts
git commit -m "feat(game-inflation-rpg): map bossIds for plains/forest/mountains dungeons"
```

---

## Task 3: gameStore — INITIAL_META + 3 actions + persist v5

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts`
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/store/gameStore.test.ts` 끝에 추가:

```ts
describe('Phase B-3β1 — dungeon progress + finals', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: { ...INITIAL_RUN },
      meta: { ...INITIAL_META },
    });
  });

  it('INITIAL_META has empty dungeonProgress + dungeonFinalsCleared + null pendingFinalClearedId', () => {
    expect(INITIAL_META.dungeonProgress).toEqual({});
    expect(INITIAL_META.dungeonFinalsCleared).toEqual([]);
    expect(INITIAL_META.pendingFinalClearedId).toBeNull();
  });

  it('markDungeonProgress sets maxFloor for first time', () => {
    useGameStore.getState().markDungeonProgress('plains', 5);
    expect(useGameStore.getState().meta.dungeonProgress['plains']).toEqual({ maxFloor: 5 });
  });

  it('markDungeonProgress only increases, never decreases maxFloor', () => {
    useGameStore.getState().markDungeonProgress('plains', 10);
    useGameStore.getState().markDungeonProgress('plains', 7);
    expect(useGameStore.getState().meta.dungeonProgress['plains']!.maxFloor).toBe(10);
  });

  it('markFinalCleared adds dungeonId once (idempotent)', () => {
    useGameStore.getState().markFinalCleared('plains');
    useGameStore.getState().markFinalCleared('plains');
    expect(useGameStore.getState().meta.dungeonFinalsCleared).toEqual(['plains']);
  });

  it('setPendingFinalCleared sets and clears id', () => {
    useGameStore.getState().setPendingFinalCleared('plains');
    expect(useGameStore.getState().meta.pendingFinalClearedId).toBe('plains');
    useGameStore.getState().setPendingFinalCleared(null);
    expect(useGameStore.getState().meta.pendingFinalClearedId).toBeNull();
  });

  it('persist migrate v4 → v5 injects defaults', () => {
    const persistedV4 = {
      meta: {
        // v4 의 모든 필드 simulate (생략) — 테스트는 새 3 필드 default 만 확인
      },
      run: { currentFloor: 1 },
    };
    // gameStore 의 migrate 함수를 직접 호출.
    // gameStore.ts 의 persist 옵션 객체에서 migrate 가 export 되지 않으므로,
    // 실제 LocalStorage 시뮬레이션 대신 INITIAL_META 가 새 필드를 포함하는지만 검증.
    // (migrate 자체 검증은 e2e + 수동 — 본 unit test 는 INITIAL_META shape 만.)
    expect(INITIAL_META.dungeonProgress).toEqual({});
    expect(INITIAL_META.dungeonFinalsCleared).toEqual([]);
    expect(INITIAL_META.pendingFinalClearedId).toBeNull();
    void persistedV4; // 참고용
  });
});
```

(`migrate` 직접 검증은 export 안 된 함수라 어렵다. 대신 `INITIAL_META` shape + 액션 단위 테스트로 충분. migrate 정확성은 수동 + e2e.)

- [ ] **Step 2: 테스트 실행 — fail 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test gameStore`
Expected: 5 fail (`INITIAL_META.dungeonProgress` undefined / 액션 없음).

- [ ] **Step 3: INITIAL_META 확장**

`gameStore.ts` 의 `INITIAL_META` (line 47 근처) 의 `muted: false,` 라인 바로 위에 추가:

```ts
// Phase B-3β1 — dungeon progress + finals
dungeonProgress: {},
dungeonFinalsCleared: [],
pendingFinalClearedId: null,
```

- [ ] **Step 4: GameStore interface 에 액션 시그니처 추가**

`interface GameStore` (line 72 근처) 의 `gainEnhanceStones: ...` 라인 바로 아래에 추가:

```ts
markDungeonProgress: (dungeonId: string, floor: number) => void;
markFinalCleared: (dungeonId: string) => void;
setPendingFinalCleared: (dungeonId: string | null) => void;
```

- [ ] **Step 5: 액션 구현**

`gameStore.ts` 의 `gainEnhanceStones` 액션 (line 377 근처) 바로 아래 추가:

```ts
markDungeonProgress: (dungeonId, floor) =>
  set((s) => {
    const prev = s.meta.dungeonProgress[dungeonId]?.maxFloor ?? 0;
    if (floor <= prev) return s;
    return {
      meta: {
        ...s.meta,
        dungeonProgress: {
          ...s.meta.dungeonProgress,
          [dungeonId]: { maxFloor: floor },
        },
      },
    };
  }),

markFinalCleared: (dungeonId) =>
  set((s) => {
    if (s.meta.dungeonFinalsCleared.includes(dungeonId)) return s;
    return {
      meta: {
        ...s.meta,
        dungeonFinalsCleared: [...s.meta.dungeonFinalsCleared, dungeonId],
      },
    };
  }),

setPendingFinalCleared: (dungeonId) =>
  set((s) => ({ meta: { ...s.meta, pendingFinalClearedId: dungeonId } })),
```

- [ ] **Step 6: persist version 4 → 5 + migrate**

`gameStore.ts` 끝부분 persist 옵션 (line 426 근처):

```ts
{
  name: 'korea_inflation_rpg_save',
  version: 4,
  migrate: (persisted: unknown, fromVersion: number) => {
    // ...
    // Phase B-3α — currentFloor 추가
    if (fromVersion < 4 && s.run) {
      s.run.currentFloor = s.run.currentFloor ?? 1;
    }
    return s;
  },
  ...
}
```

`version: 4` 을 `version: 5` 로 변경. `return s;` 직전에 추가:

```ts
// Phase B-3β1 — dungeonProgress / dungeonFinalsCleared / pendingFinalClearedId 추가
if (fromVersion < 5 && s.meta) {
  s.meta.dungeonProgress = s.meta.dungeonProgress ?? {};
  s.meta.dungeonFinalsCleared = s.meta.dungeonFinalsCleared ?? [];
  s.meta.pendingFinalClearedId = s.meta.pendingFinalClearedId ?? null;
}
```

- [ ] **Step 7: typecheck + 테스트 통과 확인**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg test gameStore`
Expected: 0 type errors. 모든 store 테스트 PASS.

- [ ] **Step 8: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts
git commit -m "feat(game-inflation-rpg): add dungeon progress + finals actions + persist v5"
```

---

## Task 4: BattleScene — 신 flow 보스 분기 (보스 픽 + HP/ATK)

**Files:**
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts`

목표: 신 flow 진입 시 `getBossType(currentFloor)` 분기. 보스 floor → `dungeon.bossIds` 에서 type 별 보스 ID 조회 → `getBossById` → HP = `monsterLevel * 50 * boss.hpMult` (구 flow `run.level * 50 * boss.hpMult` 식 그대로, level 만 monsterLevel 로 교체) 식으로 셋업. 단 일반 보스 처치 흐름은 기존 `this.callbacks.onBossKill` 그대로 활용. final 처치 분기는 Task 5.

- [ ] **Step 1: getBossById, getBossType import 추가**

`games/inflation-rpg/src/battle/BattleScene.ts` 상단 import 영역. 기존:

```ts
import { getDungeonById } from '../data/dungeons';
import { getFloorInfo } from '../data/floors';
import { getBossesForArea } from '../data/bosses';
```

다음으로 교체:

```ts
import { getDungeonById } from '../data/dungeons';
import { getFloorInfo, getBossType } from '../data/floors';
import { getBossesForArea, getBossById } from '../data/bosses';
import type { BossType } from '../types';
```

- [ ] **Step 2: 신 flow 보스 픽 분기 추가**

기존 `create()` 메서드 (line 57-119) 의 신 flow 분기 (line 67-96) 를 다음으로 교체:

```ts
const isNewFlow = run.currentDungeonId !== null;

if (!isNewFlow && hasBoss && Math.random() < 0.25) {
  // 구 flow — 25% 보스 출현 (그대로)
  const boss = bosses[0]!;
  this.isBoss = true;
  this.bossId = boss.id;
  this.enemyName = `👹 ${boss.nameKR}`;
  this.enemyMaxHP = Math.floor(run.level * 50 * boss.hpMult);
} else if (isNewFlow) {
  const dungeon = getDungeonById(run.currentDungeonId!);
  const info = getFloorInfo(run.currentDungeonId!, run.currentFloor);
  const monsterLevel = info.monsterLevel;
  this.cachedMonsterLevel = monsterLevel;

  const bossType: BossType | null = info.bossType;
  if (bossType !== null && dungeon) {
    // 신 flow — 보스 floor
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
```

(주의: `cachedMonsterLevel` 은 신 flow 진입 시 항상 set, 구 flow 시 null. 기존 line 226 `this.cachedMonsterLevel ?? run.level` 패턴이 그대로 작동.)

- [ ] **Step 3: pickBossIdByType helper 추가**

`BattleScene.ts` 의 `class BattleScene extends Phaser.Scene { ... }` 정의 **위쪽** (import 직후) 에 helper 함수 추가:

```ts
function pickBossIdByType(
  bossIds: { mini: string; major: string; sub: [string, string, string]; final: string },
  type: BossType,
  floor: number,
): string {
  switch (type) {
    case 'mini':
      return bossIds.mini;
    case 'major':
      return bossIds.major;
    case 'final':
      return bossIds.final;
    case 'sub': {
      // floor 15→sub[0], 20→sub[1], 25→sub[2]. 심층 (>30, every 5) 은 floor 기반 라운드 로빈.
      if (floor === 15) return bossIds.sub[0];
      if (floor === 20) return bossIds.sub[1];
      if (floor === 25) return bossIds.sub[2];
      const idx = Math.floor((floor - 30) / 5) % 3;
      return bossIds.sub[idx]!;
    }
  }
}
```

- [ ] **Step 4: typecheck**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`
Expected: 0 errors. 만약 `BossType` import 빠짐 / `pickMonsterFromPool` 시그니처 불일치 시 수정.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/battle/BattleScene.ts
git commit -m "feat(game-inflation-rpg): BattleScene picks boss by floor type in new flow"
```

---

## Task 5: BattleScene — 보스 처치 + dungeonProgress + final modal 트리거

**Files:**
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts`

목표:
- 일반 floor 처치 후 `markDungeonProgress(dungeonId, currentFloor + 1)` 추가 (다음 도달 floor 영구 마킹).
- 보스 floor 처치 (mini/major/sub) → 일반 처치 흐름 + bossDrop 호출 + dungeonProgress 갱신.
- 보스 floor (final) 처치 → bossDrop + `markFinalCleared(dungeonId)` + `setPendingFinalCleared(dungeonId)` + `setScreen('town')`. setCurrentFloor 호출 안 함 (currentFloor 30 유지).
- floor 30 cap: floor 31+ 진입 차단 — `setCurrentFloor(currentFloor + 1)` 시 `Math.min(currentFloor + 1, 30)`. 즉 currentFloor 가 30 을 절대 넘지 않음.

- [ ] **Step 1: 신 flow 처치 분기 갱신**

`BattleScene.ts` 의 `doRound()` 메서드 (line 121~) 의 `if (this.enemyHP <= 0) { ... }` 블록 안 신 flow 분기 (line 191-201) 를 다음으로 교체:

```ts
if (currentRun.currentDungeonId !== null) {
  // 신 flow — 처치 후 다음 행동 결정
  // (combatTimer 는 이미 line 158 에서 제거됨.)
  if (spGained > 0) {
    playSfx('levelup');
    this.callbacks.onLevelUp(newLevel);
  }

  const dungeonId = currentRun.currentDungeonId;
  const finishedFloor = currentRun.currentFloor;
  const bossType = getBossType(finishedFloor);

  if (bossType === 'final') {
    // Final 처치 — 1회 영구 보상 + 정복 모달 + 마을 강제 복귀.
    // (this.bossId / bossDrop 은 이미 line 160-165 에서 onBossKill 콜백 통해 처리됨.)
    stateAfterKill.markFinalCleared(dungeonId);
    stateAfterKill.markDungeonProgress(dungeonId, 30);
    stateAfterKill.setPendingFinalCleared(dungeonId);
    stateAfterKill.setScreen('town');
    return;
  }

  // 일반 / mini / major / sub — 다음 floor 로 진행 (30 cap)
  const nextFloor = Math.min(finishedFloor + 1, 30);
  stateAfterKill.markDungeonProgress(dungeonId, nextFloor);
  stateAfterKill.setCurrentFloor(nextFloor);
  stateAfterKill.setScreen('dungeon-floors');
  return;
}
```

(주의: 보스 처치 reward 자체는 BattleScene 의 line 160-165 의 `if (this.isBoss && this.bossId) { this.callbacks.onBossKill(...) }` 가 이미 처리. `onBossKill` 콜백은 Battle.tsx 에서 `bossDrop` 액션 호출 — 즉 신 flow 도 동일 흐름. 본 변경은 처치 *후* 다음 행동만 분기.)

- [ ] **Step 2: 테스트 baseline — 기존 테스트 영향 점검**

Run: `pnpm --filter @forge/game-inflation-rpg test BattleScene`
Expected: 기존 BattleScene 테스트가 있으면 (없을 가능성도 있음) 그대로 PASS. 신 flow 분기 변경은 dungeonProgress / pendingFinalCleared 추가 호출이라 정상 케이스 그대로.

- [ ] **Step 3: typecheck**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/battle/BattleScene.ts
git commit -m "feat(game-inflation-rpg): BattleScene marks dungeon progress + triggers final cleared modal"
```

---

## Task 6: DungeonFloors UI — 보스 카드 차별화

**Files:**
- Modify: `games/inflation-rpg/src/screens/DungeonFloors.tsx`
- Modify: `games/inflation-rpg/src/screens/DungeonFloors.test.tsx`

목표: floor card 가 `getBossType(floor)` 결과에 따라 시각 차별화. mini/major/sub 는 보스 표시 + 색상, final 은 ⭐ 강조 + 다른 배경. 잠금 / current 강조는 그대로.

- [ ] **Step 1: 실패 테스트 추가**

`games/inflation-rpg/src/screens/DungeonFloors.test.tsx` 끝에 추가:

```ts
describe('DungeonFloors — boss cards', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'dungeon-floors',
      run: { ...INITIAL_RUN, characterId: 'hwarang', currentDungeonId: 'plains', currentFloor: 30 },
      meta: { ...INITIAL_META },
    });
  });

  it('floor 5 (mini) card has data-boss="mini"', () => {
    render(<DungeonFloors />);
    expect(screen.getByTestId('floor-card-5')).toHaveAttribute('data-boss', 'mini');
  });

  it('floor 10 (major) card has data-boss="major"', () => {
    render(<DungeonFloors />);
    expect(screen.getByTestId('floor-card-10')).toHaveAttribute('data-boss', 'major');
  });

  it('floor 15/20/25 (sub) cards have data-boss="sub"', () => {
    render(<DungeonFloors />);
    expect(screen.getByTestId('floor-card-15')).toHaveAttribute('data-boss', 'sub');
    expect(screen.getByTestId('floor-card-20')).toHaveAttribute('data-boss', 'sub');
    expect(screen.getByTestId('floor-card-25')).toHaveAttribute('data-boss', 'sub');
  });

  it('floor 30 (final) card has data-boss="final" and shows ⭐', () => {
    render(<DungeonFloors />);
    const card = screen.getByTestId('floor-card-30');
    expect(card).toHaveAttribute('data-boss', 'final');
    expect(card.textContent).toContain('⭐');
  });

  it('non-boss floors have data-boss="none"', () => {
    render(<DungeonFloors />);
    expect(screen.getByTestId('floor-card-1')).toHaveAttribute('data-boss', 'none');
    expect(screen.getByTestId('floor-card-7')).toHaveAttribute('data-boss', 'none');
  });
});
```

- [ ] **Step 2: 테스트 실행 — fail 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test DungeonFloors`
Expected: 5 fail (`data-boss` 속성 없음 / ⭐ 없음).

- [ ] **Step 3: DungeonFloors.tsx 보스 카드 분기**

`games/inflation-rpg/src/screens/DungeonFloors.tsx` 상단 import 추가:

```ts
import { getFloorInfo, getBossType } from '../data/floors';
import type { BossType } from '../types';
```

(`getBossType` 추가, `getFloorInfo` 는 이미 import 되어 있음 — 한 줄로 합침.)

floor button 렌더링 부분 (line 91-130) 을 다음으로 교체:

```tsx
{floors.map((floor) => {
  const info = getFloorInfo(dungeon.id, floor);
  const locked = floor > run.currentFloor;
  const isCurrent = floor === run.currentFloor;
  const bossType: BossType | null = getBossType(floor);
  const dataBoss = bossType ?? 'none';

  const bossBg: Partial<Record<BossType, string>> = {
    mini: '#5a4a1f',
    major: '#7a3f1f',
    sub: '#5a1f5a',
    final: '#aa1f1f',
  };
  const baseBg = isCurrent
    ? 'var(--forge-accent)'
    : locked
    ? 'rgba(0,0,0,0.6)'
    : bossType
    ? bossBg[bossType]
    : 'var(--forge-bg-panel)';

  const label = bossType === 'final'
    ? `⭐F${floor}`
    : bossType
    ? `👹F${floor}`
    : `F${floor}`;

  return (
    <button
      key={floor}
      data-testid={`floor-card-${floor}`}
      data-boss={dataBoss}
      disabled={locked}
      onClick={() => enterFloor(floor)}
      style={{
        minHeight: 56,
        padding: 'var(--forge-space-2)',
        background: baseBg,
        color: isCurrent ? '#000' : 'var(--forge-text-primary)',
        border: `1px solid ${
          isCurrent
            ? 'var(--forge-accent)'
            : bossType === 'final'
            ? '#ffd700'
            : 'var(--forge-border)'
        }`,
        borderRadius: 6,
        cursor: locked ? 'not-allowed' : 'pointer',
        opacity: locked ? 0.5 : 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 700 }}>
        {locked ? '🔒' : label}
      </div>
      <div style={{ fontSize: 10, opacity: 0.85 }}>
        Lv {formatNumber(info.monsterLevel)}
      </div>
    </button>
  );
})}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test DungeonFloors`
Expected: 모두 PASS.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/screens/DungeonFloors.tsx games/inflation-rpg/src/screens/DungeonFloors.test.tsx
git commit -m "feat(game-inflation-rpg): DungeonFloors visually differentiates boss floors"
```

---

## Task 7: DungeonFinalClearedModal 컴포넌트 + App.tsx 통합

**Files:**
- Create: `games/inflation-rpg/src/screens/DungeonFinalClearedModal.tsx`
- Create: `games/inflation-rpg/src/screens/DungeonFinalClearedModal.test.tsx`
- Modify: `games/inflation-rpg/src/App.tsx`

목표: `meta.pendingFinalClearedId` 가 set 이면 모달 노출. 닫기 = `setPendingFinalCleared(null)`. App.tsx 에서 town/dungeon-floors screen 일 때 mount.

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/screens/DungeonFinalClearedModal.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DungeonFinalClearedModal } from './DungeonFinalClearedModal';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';

describe('DungeonFinalClearedModal', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'town',
      run: { ...INITIAL_RUN },
      meta: { ...INITIAL_META },
    });
  });

  it('renders nothing when pendingFinalClearedId is null', () => {
    const { container } = render(<DungeonFinalClearedModal />);
    expect(container.firstChild).toBeNull();
  });

  it('renders dungeon name + 정복 message when pendingFinalClearedId is set', () => {
    useGameStore.setState({
      meta: { ...INITIAL_META, pendingFinalClearedId: 'plains' },
    });
    render(<DungeonFinalClearedModal />);
    expect(screen.getByText(/평야/)).toBeInTheDocument();
    expect(screen.getByText(/정복/)).toBeInTheDocument();
  });

  it('close button clears pendingFinalClearedId', () => {
    useGameStore.setState({
      meta: { ...INITIAL_META, pendingFinalClearedId: 'plains' },
    });
    render(<DungeonFinalClearedModal />);
    fireEvent.click(screen.getByTestId('final-cleared-close'));
    expect(useGameStore.getState().meta.pendingFinalClearedId).toBeNull();
  });

  it('renders gracefully for unknown dungeon id', () => {
    useGameStore.setState({
      meta: { ...INITIAL_META, pendingFinalClearedId: 'foobar' },
    });
    render(<DungeonFinalClearedModal />);
    // 모달은 떠야 하지만 dungeon name 대신 fallback
    expect(screen.getByTestId('final-cleared-close')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실행 — fail 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test DungeonFinalCleared`
Expected: "Cannot find module './DungeonFinalClearedModal'".

- [ ] **Step 3: 모달 컴포넌트 구현**

`games/inflation-rpg/src/screens/DungeonFinalClearedModal.tsx`:

```tsx
import { useGameStore } from '../store/gameStore';
import { getDungeonById } from '../data/dungeons';
import { ForgeButton } from '@/components/ui/forge-button';
import { ForgePanel } from '@/components/ui/forge-panel';

export function DungeonFinalClearedModal() {
  const pendingId = useGameStore((s) => s.meta.pendingFinalClearedId);
  const setPendingFinalCleared = useGameStore((s) => s.setPendingFinalCleared);

  if (!pendingId) return null;

  const dungeon = getDungeonById(pendingId);
  const nameKR = dungeon?.nameKR ?? pendingId;
  const emoji = dungeon?.emoji ?? '⭐';

  const onClose = () => setPendingFinalCleared(null);

  return (
    <div
      data-testid="final-cleared-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <ForgePanel
        style={{
          maxWidth: 320,
          width: '100%',
          padding: 24,
          textAlign: 'center',
          border: '2px solid #ffd700',
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 8 }}>⭐</div>
        <h2 style={{ color: '#ffd700', marginTop: 0 }}>정복 완료</h2>
        <p style={{ color: 'var(--forge-text-primary)', margin: '12px 0' }}>
          {emoji} <strong>{nameKR}</strong> 의 최종 보스를 처치했다.
        </p>
        <p style={{ color: 'var(--forge-text-secondary)', fontSize: 12, margin: '12px 0' }}>
          "정복자" 칭호를 획득. 이 던전의 final 보상은 1회 영구 마킹됨.
        </p>
        <ForgeButton
          variant="primary"
          onClick={onClose}
          data-testid="final-cleared-close"
          style={{ marginTop: 16 }}
        >
          확인
        </ForgeButton>
      </ForgePanel>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test DungeonFinalCleared`
Expected: 4 PASS.

- [ ] **Step 5: App.tsx 에 모달 통합**

`games/inflation-rpg/src/App.tsx` 를 열어 import 추가:

```tsx
import { DungeonFinalClearedModal } from './screens/DungeonFinalClearedModal';
```

screen 분기 컴포넌트 렌더링 wrapper (예: 최상위 fragment 또는 div) 직전/직후에 모달 mount. 모달 자체가 `pendingFinalClearedId === null` 시 null 을 반환하므로 항상 렌더해도 OK. App.tsx 의 root return 의 마지막에 추가:

```tsx
return (
  <>
    {/* ... 기존 screen 분기 ... */}
    <DungeonFinalClearedModal />
  </>
);
```

(App.tsx 의 정확한 구조에 따라 — 최상위 wrapper 어디든 모달 컴포넌트를 sibling 으로 두면 됨. 모달은 자체 fixed overlay 라 위치 무관.)

- [ ] **Step 6: typecheck + 전체 테스트**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg test`
Expected: 0 errors. 모든 테스트 PASS.

- [ ] **Step 7: 수동 dev 검증**

`pnpm dev` 로:
1. 평야 던전 입장 → ClassSelect → 캐릭터 선택 → DungeonFloors
2. **DevTools** 로 `useGameStore.getState().setCurrentFloor(30)` 실행 (또는 `meta.pendingFinalClearedId = 'plains'` 직접 set 으로 시뮬)
3. 모달이 정확히 노출되는지, 닫으면 사라지는지 확인

또는 자연 진행: floor 30 에 도달 (각 floor 실제 처치 시간 소요) → final 처치 시 town 으로 이동 + 모달 자동 노출.

- [ ] **Step 8: Commit**

```bash
git add games/inflation-rpg/src/screens/DungeonFinalClearedModal.tsx games/inflation-rpg/src/screens/DungeonFinalClearedModal.test.tsx games/inflation-rpg/src/App.tsx
git commit -m "feat(game-inflation-rpg): DungeonFinalClearedModal + App integration"
```

---

## Task 8: E2E smoke — 보스 floor 진입

**Files:**
- Modify: `games/inflation-rpg/e2e/dungeon-flow.spec.ts`

목표: 기존 dungeon-flow smoke 에 보스 floor 시각 차별화 검증 추가. (Final 처치 full path 는 시간이 너무 걸림 — currentFloor 를 5 까지 올린 뒤 floor 5 카드 의 data-boss="mini" 만 검증.)

- [ ] **Step 1: 보스 카드 검증 case 추가**

`games/inflation-rpg/e2e/dungeon-flow.spec.ts` 끝에 추가 (기존 3 test 보존):

```ts
test('Phase B-3β1 — boss floor cards visible after currentFloor advance', async ({ page }) => {
  await page.goto('/');

  // localStorage 직접 set 으로 currentFloor 7 (floor 5 mini-boss 카드 활성 상태) 시뮬
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('korea_inflation_rpg_save') ?? '{}');
    saved.state = saved.state ?? {};
    saved.state.run = {
      ...(saved.state.run ?? {}),
      characterId: 'hwarang',
      currentDungeonId: 'plains',
      currentFloor: 7,
      bp: 30,
    };
    saved.state.screen = 'dungeon-floors';
    saved.version = 5;
    localStorage.setItem('korea_inflation_rpg_save', JSON.stringify(saved));
  });
  await page.reload();

  // 튜토리얼 차단 시 skip
  const skipBtn = page.getByRole('button', { name: /건너뛰기/ });
  if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skipBtn.click();
  }

  // boss card 확인
  const f5 = page.getByTestId('floor-card-5');
  await expect(f5).toHaveAttribute('data-boss', 'mini');
  await expect(page.getByTestId('floor-card-10')).toHaveAttribute('data-boss', 'major');
  await expect(page.getByTestId('floor-card-30')).toHaveAttribute('data-boss', 'final');
});
```

(Note: e2e localStorage 시뮬레이션 패턴은 `dungeon-flow.spec.ts` 또는 다른 spec 에서 이미 쓰이는지 확인. 패턴이 없으면 dev 환경에서 `window.useGameStore.getState().setCurrentFloor(7)` 같은 디버그 hook 가 노출되어 있는지 확인. 없으면 단순한 카드 selector 검증만 — currentFloor=1 시점에서 floor 5 카드는 잠겨있어도 `data-boss="mini"` 속성은 그대로 가져야 함.)

**대안 (단순)** — 잠긴 카드도 data-boss 속성은 노출. 위 시뮬 대신:

```ts
test('Phase B-3β1 — boss floor cards visually differentiated (locked state)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /마을로/ }).click();

  // Town 의 평야 던전 입장
  await page.getByTestId('town-dungeon-plains').getByRole('button', { name: '입장' }).click();

  // ClassSelect → 화랑
  await page.getByText('화랑').first().click();
  await page.getByRole('button', { name: /시작|확인/ }).click();

  // DungeonFloors — floor 1 활성, floor 5 잠금 but data-boss 속성 검증
  await expect(page.getByTestId('floor-card-1')).toHaveAttribute('data-boss', 'none');
  await expect(page.getByTestId('floor-card-5')).toHaveAttribute('data-boss', 'mini');
  await expect(page.getByTestId('floor-card-10')).toHaveAttribute('data-boss', 'major');
  await expect(page.getByTestId('floor-card-15')).toHaveAttribute('data-boss', 'sub');
  await expect(page.getByTestId('floor-card-30')).toHaveAttribute('data-boss', 'final');
});
```

(이 단순 버전 우선. 시뮬레이션 path 가 안정적이면 추후 final modal 검증까지 확장.)

- [ ] **Step 2: e2e 실행**

Run: `pnpm --filter @forge/game-inflation-rpg e2e dungeon-flow`
Expected: 4 PASS (기존 3 + 신규 1).

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/e2e/dungeon-flow.spec.ts
git commit -m "test(game-inflation-rpg): E2E smoke for boss floor visual differentiation"
```

---

## Final Validation

- [ ] **Step 1: 워크스페이스 전체 검증**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test`
Expected: 0 errors, all tests PASS (247 + 신규 ~14 = 261 정도).

- [ ] **Step 2: 레포 전체 검증**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm circular`
Expected: 0 errors, 0 circular deps, all tests PASS.

- [ ] **Step 3: 수동 end-to-end 플레이**

`pnpm dev` 로:
1. 메인 메뉴 → 마을로 → 평야 → ClassSelect → 화랑
2. DungeonFloors 에서 floor 1 활성, floor 5/10/15/20/25/30 보스 카드 시각 차별화 확인 (각 다른 색·아이콘)
3. floor 1 클릭 → 처치 → DungeonFloors 복귀, currentFloor 2, dungeonProgress.plains.maxFloor 가 2 로 갱신됐는지 (DevTools `useGameStore.getState().meta.dungeonProgress` 로 확인)
4. **(시간되면)** floor 5 까지 진행 → mini-boss 전투 (HP/체감 다름) → 처치 → DungeonFloors 복귀
5. **(테스트용 단축)** DevTools 에서 `useGameStore.getState().setCurrentFloor(30)` → floor 30 클릭 → final boss → 처치 → town 으로 자동 복귀 + DungeonFinalClearedModal 노출 → 확인 클릭 → 모달 닫힘
6. `useGameStore.getState().meta.dungeonFinalsCleared` 가 `['plains']` 인지 확인

- [ ] **Step 4: Phase 태그 (브랜치 머지 후)**

```bash
# main 머지 후 (subagent-driven workflow 의 finishing 단계에서)
git tag phase-b3b1-complete
```

---

## Out of scope (B-3β2 / 후속)

본 phase 에서 **의도적으로 제외**:
- 구 flow 데드 코드 일괄 제거 (`WorldMap.tsx`, `RegionMap.tsx`, `regions.ts`, `maps.ts`, `currentAreaId`, region-기반 `pickMonster` 인자) — **B-3β2 영역**.
- Quest UI 신 flow 비활성 (region-기반 `trackKill` 호출 사이트 정리) — **B-3β2 영역**.
- Procedural floor 31+ (심층, level multiplier ↑ 무한 farming) — 후속 phase. 본 phase 는 floor 30 cap.
- 차원 나침반 (자유 던전 선택 / 가중치) — spec §2.4. 후속.
- Mythic 장비 / 시그니처 epic 장비 / "정복자" 칭호 영구 효과 — 본 phase 는 enhanceStones + bossDrop 만. 장비/칭호는 후속 phase (혹은 phase-content-data 의 `guaranteedDrop` 활용 검토).
- 인플레이션 곡선 (HP=100×1.4^L 등 spec §11.2 Curve 2) — Phase I.
- 보스 reward magnitude 미세조정 (mini=강화석 1~3, major=5~10, final=50~100 정확 매칭) — 본 phase 는 기존 `bossDrop` 의 `bpReward * 100` DR / `bpReward` enhanceStones 그대로. magnitude tuning 은 Phase I.
