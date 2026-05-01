# Phase B-1: Dungeon/Floor Data Model + 3 Starter Dungeons

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 던전/floor 데이터 모델을 정의하고 3개 시작 던전 (평야·깊은숲·산악) 을
새 schema 로 채운다. 기존 region/area 모델은 그대로 두고 (UI 영향 없음), Phase
B-2~4 가 점진적으로 신 모델로 갈아탈 수 있게 한다.

**Architecture:** 새 `Dungeon` 타입은 메타데이터 + 몬스터 풀만 가진다. floor
정보 (몬스터 레벨, 보스 타입) 는 데이터로 사전 정의하지 않고 `getFloorInfo()`
함수가 floor 번호로 계산한다. spec Section 2.3 의 floor 구조 (5=mini, 10=major,
15/20/25=sub, 30=final) + Section 11.2 의 레벨 곡선 (`L(F) = floor 1~10:F` 등)
을 함수로 인코딩. 600개 row 를 미리 적지 않으니 데이터 작업이 가볍다.

**Tech Stack:** TypeScript strict, Vitest. 새 의존성 없음.

---

## File Structure

**Created**
- `games/inflation-rpg/src/data/dungeons.ts` — `Dungeon` 카탈로그 (3개)
- `games/inflation-rpg/src/data/dungeons.test.ts`
- `games/inflation-rpg/src/data/floors.ts` — `getFloorInfo()` 함수 + 보스 타입 룰
- `games/inflation-rpg/src/data/floors.test.ts`

**Modified**
- `games/inflation-rpg/src/types.ts` — `Dungeon`, `DungeonUnlock`, `FloorInfo`,
  `BossType` 타입 추가

**Untouched (Phase B-2 이후)**
- `games/inflation-rpg/src/data/regions.ts`
- `games/inflation-rpg/src/data/maps.ts`
- 모든 screen / battle 파일

---

## Task 1: 타입 추가 — `Dungeon`, `DungeonUnlock`, `FloorInfo`, `BossType`

**Files:**
- Modify: `games/inflation-rpg/src/types.ts`

- [ ] **Step 1: 파일 끝에 신규 타입 4개 추가**

`types.ts` 파일 끝 (마지막 export 다음) 에 추가:

```ts
// ── Phase B (300h redesign) — Dungeon/Floor 모델 ──

export type DungeonUnlock =
  | { type: 'start' }
  | { type: 'boss-count'; count: number }
  | { type: 'asc-tier'; tier: number }
  | { type: 'hardmode' };

export interface Dungeon {
  id: string;
  nameKR: string;
  emoji: string;
  themeColor: string;        // CSS color (hex or var() reference) for UI accent
  unlockGate: DungeonUnlock;
  monsterPool: string[];     // monster IDs that spawn in this dungeon
  isHardOnly: boolean;
}

export type BossType = 'mini' | 'major' | 'sub' | 'final';

export interface FloorInfo {
  dungeonId: string;
  floorNumber: number;       // 1-indexed
  monsterLevel: number;      // computed from floor depth
  bossType: BossType | null; // null = 일반 floor
}
```

- [ ] **Step 2: typecheck**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors (새 export 만 추가, 기존 코드 무영향).

- [ ] **Step 3: 커밋**

```bash
git add games/inflation-rpg/src/types.ts
git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): add Dungeon/Floor types for Phase B-1

Dungeon: id, themeColor, unlockGate, monsterPool, isHardOnly
DungeonUnlock: start | boss-count | asc-tier | hardmode
FloorInfo: dungeonId, floorNumber, monsterLevel, bossType
BossType: mini | major | sub | final

Phase B-1 (1/4) — 데이터 모델만. 데이터 + 함수는 후속 task 에서.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `getFloorInfo()` 함수 구현 (TDD)

**Files:**
- Create: `games/inflation-rpg/src/data/floors.ts`
- Create: `games/inflation-rpg/src/data/floors.test.ts`

**Spec:**
- 보스 floor 룰 (Section 2.3): floor 5 = mini, 10 = major, 15/20/25 = sub, 30 = final
- 그 외 floor 번호 = 일반 (`bossType: null`)
- 레벨 곡선 (Section 11.2):
  - floor 1~10: `monsterLevel = floor` (1, 2, ..., 10)
  - floor 11~30: `monsterLevel = floor² / 5` (소숫점 버림)
  - floor 31~100: `monsterLevel = floor³ / 1000` (소숫점 버림)
  - floor 100+: `monsterLevel = L(100) × 2^((floor - 100) / 30)` (소숫점 버림)

여기서 `L(100)` = `100³ / 1000` = `1000`.

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/data/floors.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getFloorInfo, getBossType, getMonsterLevel } from './floors';

describe('getBossType', () => {
  it('returns null for non-boss floors', () => {
    expect(getBossType(1)).toBeNull();
    expect(getBossType(2)).toBeNull();
    expect(getBossType(11)).toBeNull();
    expect(getBossType(29)).toBeNull();
  });

  it('returns "mini" for floor 5', () => {
    expect(getBossType(5)).toBe('mini');
  });

  it('returns "major" for floor 10', () => {
    expect(getBossType(10)).toBe('major');
  });

  it('returns "sub" for floors 15, 20, 25', () => {
    expect(getBossType(15)).toBe('sub');
    expect(getBossType(20)).toBe('sub');
    expect(getBossType(25)).toBe('sub');
  });

  it('returns "final" for floor 30', () => {
    expect(getBossType(30)).toBe('final');
  });

  it('past floor 30 — boss types repeat in deep dungeon', () => {
    // 심층은 매 5 floor 마다 sub-boss, 매 10 마다 major-style boss 로 반복
    expect(getBossType(35)).toBe('sub');
    expect(getBossType(40)).toBe('sub');
    expect(getBossType(50)).toBe('sub');
    // 30 이후로는 major/mini/final 구분 없이 sub 만 반복 (자세한 룰: floor % 5 === 0)
  });
});

describe('getMonsterLevel', () => {
  it('floor 1..10: level = floor', () => {
    expect(getMonsterLevel(1)).toBe(1);
    expect(getMonsterLevel(2)).toBe(2);
    expect(getMonsterLevel(10)).toBe(10);
  });

  it('floor 11..30: level = floor(floor² / 5)', () => {
    expect(getMonsterLevel(11)).toBe(24);   // 121/5 = 24.2 → 24
    expect(getMonsterLevel(15)).toBe(45);   // 225/5 = 45
    expect(getMonsterLevel(20)).toBe(80);   // 400/5 = 80
    expect(getMonsterLevel(30)).toBe(180);  // 900/5 = 180
  });

  it('floor 31..100: level = floor(floor³ / 1000)', () => {
    expect(getMonsterLevel(31)).toBe(29);    // 29791/1000 = 29.791 → 29
    expect(getMonsterLevel(50)).toBe(125);   // 125000/1000 = 125
    expect(getMonsterLevel(100)).toBe(1000); // 1000000/1000 = 1000
  });

  it('floor 100+: level = floor(L(100) × 2^((F - 100)/30))', () => {
    // L(100) = 1000
    expect(getMonsterLevel(100)).toBe(1000);
    expect(getMonsterLevel(130)).toBe(2000); // 1000 × 2^1 = 2000
    expect(getMonsterLevel(160)).toBe(4000); // 1000 × 2^2 = 4000
    expect(getMonsterLevel(190)).toBe(8000); // 1000 × 2^3 = 8000
  });

  it('throws or returns 1 for invalid floor (<= 0)', () => {
    expect(getMonsterLevel(0)).toBe(1);
    expect(getMonsterLevel(-5)).toBe(1);
  });
});

describe('getFloorInfo', () => {
  it('combines dungeonId + floor + level + bossType', () => {
    const info = getFloorInfo('plains', 5);
    expect(info).toEqual({
      dungeonId: 'plains',
      floorNumber: 5,
      monsterLevel: 5,
      bossType: 'mini',
    });
  });

  it('non-boss floor', () => {
    const info = getFloorInfo('forest', 7);
    expect(info).toEqual({
      dungeonId: 'forest',
      floorNumber: 7,
      monsterLevel: 7,
      bossType: null,
    });
  });

  it('deep floor — uses 100+ curve, sub-boss every 5', () => {
    const info = getFloorInfo('mountains', 130);
    expect(info.monsterLevel).toBe(2000);
    expect(info.bossType).toBe('sub'); // floor % 5 === 0
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg test src/data/floors.test.ts
```

Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

`games/inflation-rpg/src/data/floors.ts`:

```ts
import type { BossType, FloorInfo } from '../types';

export function getBossType(floorNumber: number): BossType | null {
  if (floorNumber === 5) return 'mini';
  if (floorNumber === 10) return 'major';
  if (floorNumber === 15 || floorNumber === 20 || floorNumber === 25) return 'sub';
  if (floorNumber === 30) return 'final';
  // 심층 (floor > 30): 매 5층마다 sub-boss
  if (floorNumber > 30 && floorNumber % 5 === 0) return 'sub';
  return null;
}

export function getMonsterLevel(floorNumber: number): number {
  if (floorNumber <= 0) return 1;
  if (floorNumber <= 10) return floorNumber;
  if (floorNumber <= 30) return Math.floor((floorNumber * floorNumber) / 5);
  if (floorNumber <= 100) return Math.floor((floorNumber ** 3) / 1000);
  // 100+ : L(100) = 1000, ×2 every 30 floors
  const L100 = 1000;
  return Math.floor(L100 * Math.pow(2, (floorNumber - 100) / 30));
}

export function getFloorInfo(dungeonId: string, floorNumber: number): FloorInfo {
  return {
    dungeonId,
    floorNumber,
    monsterLevel: getMonsterLevel(floorNumber),
    bossType: getBossType(floorNumber),
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg test src/data/floors.test.ts
```

Expected: PASS — 모든 테스트 통과 (12 tests 전후).

- [ ] **Step 5: typecheck**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors.

- [ ] **Step 6: 커밋**

```bash
git add games/inflation-rpg/src/data/floors.ts games/inflation-rpg/src/data/floors.test.ts
git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): add getFloorInfo() floor metadata function

Spec Section 2.3 + 11.2 인코딩:
  - 보스 룰: floor 5 mini / 10 major / 15·20·25 sub / 30 final
  - 심층 (>30): 매 5층 sub-boss 반복
  - 레벨 곡선: 1-10 선형, 11-30 quadratic, 31-100 cubic, 100+ exp ×2/30

Phase B-1 (2/4) — floor 정보를 데이터 row 가 아니라 함수로 생성.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 3 시작 던전 카탈로그 (TDD)

**Files:**
- Create: `games/inflation-rpg/src/data/dungeons.ts`
- Create: `games/inflation-rpg/src/data/dungeons.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/data/dungeons.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { DUNGEONS, getDungeonById, getStartDungeons } from './dungeons';

describe('DUNGEONS catalog', () => {
  it('has the 3 starter dungeons', () => {
    expect(DUNGEONS.length).toBe(3);
    const ids = DUNGEONS.map(d => d.id).sort();
    expect(ids).toEqual(['forest', 'mountains', 'plains']);
  });

  it('all 3 starters are unlocked from the start', () => {
    for (const d of DUNGEONS) {
      expect(d.unlockGate.type).toBe('start');
    }
  });

  it('none are hard-only', () => {
    for (const d of DUNGEONS) {
      expect(d.isHardOnly).toBe(false);
    }
  });

  it('each has nameKR + emoji + themeColor', () => {
    for (const d of DUNGEONS) {
      expect(d.nameKR.length).toBeGreaterThan(0);
      expect(d.emoji.length).toBeGreaterThan(0);
      expect(d.themeColor).toMatch(/^#|var\(/);
    }
  });

  it('each has non-empty monster pool', () => {
    for (const d of DUNGEONS) {
      expect(d.monsterPool.length).toBeGreaterThan(0);
    }
  });
});

describe('getDungeonById', () => {
  it('returns dungeon for known id', () => {
    const d = getDungeonById('plains');
    expect(d).toBeDefined();
    expect(d!.nameKR).toBe('평야');
  });

  it('returns undefined for unknown id', () => {
    expect(getDungeonById('foobar')).toBeUndefined();
  });
});

describe('getStartDungeons', () => {
  it('returns only dungeons unlocked from start', () => {
    const start = getStartDungeons();
    expect(start.length).toBe(3);
    for (const d of start) {
      expect(d.unlockGate.type).toBe('start');
    }
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg test src/data/dungeons.test.ts
```

Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

`games/inflation-rpg/src/data/dungeons.ts`:

```ts
import type { Dungeon } from '../types';

export const DUNGEONS: Dungeon[] = [
  {
    id: 'plains',
    nameKR: '평야',
    emoji: '🏘️',
    themeColor: '#7ab648',
    unlockGate: { type: 'start' },
    monsterPool: [
      // plains-specific
      'plains-imp', 'plains-rat', 'plains-crow', 'plains-bandit', 'plains-ronin',
      // universal (low to mid)
      'slime', 'goblin',
    ],
    isHardOnly: false,
  },
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
    isHardOnly: false,
  },
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
    isHardOnly: false,
  },
];

export function getDungeonById(id: string): Dungeon | undefined {
  return DUNGEONS.find(d => d.id === id);
}

export function getStartDungeons(): Dungeon[] {
  return DUNGEONS.filter(d => d.unlockGate.type === 'start');
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg test src/data/dungeons.test.ts
```

Expected: PASS.

- [ ] **Step 5: typecheck**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors.

- [ ] **Step 6: 커밋**

```bash
git add games/inflation-rpg/src/data/dungeons.ts games/inflation-rpg/src/data/dungeons.test.ts
git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): add 3 starter dungeons (plains/forest/mountains)

각 던전 = id + nameKR + emoji + themeColor + unlockGate + monsterPool +
isHardOnly. Helper: getDungeonById, getStartDungeons.

Phase B-1 (3/4) — 시작 던전 3개. 나머지 17개는 Phase H 컨텐츠 카탈로그에서.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Monster picker — 던전 기반 (선택적, TDD)

**Files:**
- Modify: `games/inflation-rpg/src/data/monsters.ts`
- Modify: `games/inflation-rpg/src/data/monsters.test.ts` (or create if absent)

**설계**: 기존 `pickMonster(level, regionId?)` 옆에 신규 `pickMonsterFromPool(level, monsterPool)` 추가. 기존 함수는 유지 (Phase B-2~3 가 마이그레이션 끝낼 때까지 region 기반 호출 사이트가 살아있음).

- [ ] **Step 1: 실패 테스트 작성 (또는 기존 test 파일에 추가)**

`games/inflation-rpg/src/data/monsters.test.ts` 가 있으면 `describe` 블록 추가, 없으면 신규:

```ts
import { describe, it, expect } from 'vitest';
import { MONSTERS, pickMonsterFromPool, getMonstersForPool } from './monsters';

describe('pickMonsterFromPool', () => {
  it('returns a monster from the given pool whose level range contains the player level', () => {
    const pool = ['plains-imp', 'plains-rat'];
    const m = pickMonsterFromPool(5, pool);
    expect(pool).toContain(m.id);
    expect(m.levelMin).toBeLessThanOrEqual(5);
    expect(m.levelMax).toBeGreaterThanOrEqual(5);
  });

  it('falls back to the closest-matching monster in pool when no exact level match', () => {
    // forest-bear: levelMin 2000, levelMax 12000.
    // forest-fox: levelMin 500, levelMax 5000.
    // pool 안에 level 100 만족하는 게 없으면, 가장 가까운 (levelMin 이 작은) 것 반환.
    const pool = ['forest-bear', 'forest-fox'];
    const m = pickMonsterFromPool(100, pool);
    expect(['forest-bear', 'forest-fox']).toContain(m.id);
  });

  it('returns first available when pool is otherwise valid', () => {
    const pool = ['slime'];  // levelMin 1, levelMax 100
    const m = pickMonsterFromPool(50, pool);
    expect(m.id).toBe('slime');
  });

  it('throws or fallback when pool is empty', () => {
    expect(() => pickMonsterFromPool(5, [])).toThrow();
  });

  it('skips IDs that do not exist in MONSTERS catalog', () => {
    const pool = ['nonexistent-id', 'slime'];
    const m = pickMonsterFromPool(5, pool);
    expect(m.id).toBe('slime');
  });
});

describe('getMonstersForPool', () => {
  it('returns monsters from MONSTERS whose IDs are in pool', () => {
    const pool = ['slime', 'goblin'];
    const result = getMonstersForPool(pool);
    expect(result.map(m => m.id).sort()).toEqual(['goblin', 'slime']);
  });

  it('skips unknown ids', () => {
    const pool = ['slime', 'unknown'];
    const result = getMonstersForPool(pool);
    expect(result.map(m => m.id)).toEqual(['slime']);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg test src/data/monsters.test.ts
```

Expected: FAIL — `pickMonsterFromPool` / `getMonstersForPool` 미정의.

- [ ] **Step 3: 구현 추가**

`games/inflation-rpg/src/data/monsters.ts` 의 기존 함수 옆 (파일 끝) 에 추가:

```ts
export function getMonstersForPool(pool: string[]): Monster[] {
  return MONSTERS.filter(m => pool.includes(m.id));
}

export function pickMonsterFromPool(level: number, pool: string[]): Monster {
  if (pool.length === 0) {
    throw new Error('pickMonsterFromPool: pool is empty');
  }
  const candidates = getMonstersForPool(pool);
  if (candidates.length === 0) {
    throw new Error(`pickMonsterFromPool: no valid monster IDs in pool: ${pool.join(',')}`);
  }
  // First, monsters whose level range contains the player level
  const inRange = candidates.filter(m => m.levelMin <= level && m.levelMax >= level);
  if (inRange.length > 0) {
    return inRange[Math.floor(Math.random() * inRange.length)]!;
  }
  // Fallback: closest by levelMin
  const sorted = [...candidates].sort(
    (a, b) => Math.abs(a.levelMin - level) - Math.abs(b.levelMin - level)
  );
  return sorted[0]!;
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg test src/data/monsters.test.ts
```

Expected: PASS.

- [ ] **Step 5: typecheck**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors.

- [ ] **Step 6: 커밋**

```bash
git add games/inflation-rpg/src/data/monsters.ts games/inflation-rpg/src/data/monsters.test.ts
git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): add pickMonsterFromPool / getMonstersForPool

Dungeon 의 monsterPool 기반으로 몬스터를 뽑는 헬퍼. 기존 pickMonster
(region 기반) 는 유지 — Phase B-2~3 가 마이그레이션 완료할 때까지 병행.

Phase B-1 (4/4) — 데이터 모델 마무리.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Final Verification

- [ ] **Step 1: 전 inflation-rpg 검증**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg test && pnpm --filter @forge/game-inflation-rpg lint
```

Expected: 0 typecheck errors, 모든 테스트 통과 (191 + ~20 신규), lint clean.

- [ ] **Step 2: 신규 export 자체 sanity (커맨드 한 줄)**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && grep -h "^export" games/inflation-rpg/src/data/dungeons.ts games/inflation-rpg/src/data/floors.ts
```

Expected: `Dungeon`, `getDungeonById`, `getStartDungeons`, `DUNGEONS`,
`getBossType`, `getMonsterLevel`, `getFloorInfo` 등이 보임.

- [ ] **Step 3: 기존 게임 동작 무영향 확인**

기존 region/area/maps 파일 미변경. 기존 게임 흐름 (WorldMap → RegionMap → Battle)
이 깨지지 않았는지 dev 서버로 빠르게 확인:

```bash
pnpm dev
```

평야 진입 → 전투 → DR 누적 → 사망 → 다시 시작 흐름이 정상이면 OK.

- [ ] **Step 4: 머지 + 태그**

```bash
git checkout main
git merge --no-ff feat/phase-b1-dungeon-data-model -m "Merge Phase B-1: dungeon/floor data model + 3 starter dungeons"
git tag phase-b1-complete
```

(브랜치 이름은 `feat/phase-b1-dungeon-data-model` 으로 사전에 만들어 두기:
`git checkout -b feat/phase-b1-dungeon-data-model`)

---

## Self-Review Checklist (작성자용)

**Spec coverage:**
- [x] `Dungeon` 타입 — Task 1
- [x] `FloorInfo` 함수 (level 곡선 + 보스 룰) — Task 2
- [x] 3 시작 던전 카탈로그 — Task 3
- [x] 던전 monsterPool 기반 picker — Task 4

**Out of scope (B-2 이후):**
- 마을 hub 화면
- 던전 진입 흐름 / floor UI
- 던전 선택 (랜덤 / 차원 나침반)
- 17 추가 던전 카탈로그 (Phase H)
- 보스 ID 매핑 (Phase H — boss IDs per floor)

**Type consistency:**
- `getFloorInfo(dungeonId, floor)` — 호출처 (B-3) 와 일치
- `pickMonsterFromPool(level, pool)` — 호출처 (B-3) 와 일치
- `Dungeon.monsterPool: string[]` — `pickMonsterFromPool(_, pool)` 시그니처 일치

**Placeholder scan:**
- 없음. 모든 코드 블록 즉시 실행 가능.
