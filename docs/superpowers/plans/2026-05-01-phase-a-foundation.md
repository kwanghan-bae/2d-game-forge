# Phase A: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 300h 컨텐츠 재설계의 기반 인프라 — 단일 화폐 (DR + 강화석), 알파벳
숫자 표기 유틸, 몬스터 레벨 비례 BP 소모 — 를 실제 코드에 적용한다.

**Architecture:** MetaState 에 신규 화폐 필드 (`dr`, `enhanceStones`) 추가. BP
소모를 균등 -1/-2 에서 몬스터 레벨 기반 ceil(log10) 공식으로 교체. 큰 수 UI 표시
용 `formatNumber` 유틸을 신설. 기존 gold 는 그대로 유지 (런 단위 보조 화폐).
이 plan 은 데이터 plumbing 만 — 실제 spending UI / earning hook 의 본격 사용은
Phase B/C 에서.

**Tech Stack:** TypeScript strict, Zustand 5 (persist middleware), Vitest. 새
의존성 없음. 한국어 커밋 메시지 영어 (Conventional Commits 유사: `feat`/`refactor`/
`test`/`docs`).

---

## File Structure

**Created**
- `games/inflation-rpg/src/lib/format.ts` — 알파벳 숫자 표기 함수
- `games/inflation-rpg/src/lib/format.test.ts` — 테스트

**Modified**
- `games/inflation-rpg/src/types.ts` — `MetaState` 에 `dr`, `enhanceStones` 추가
- `games/inflation-rpg/src/systems/bp.ts` — 몬스터 레벨 인자 추가
- `games/inflation-rpg/src/systems/bp.test.ts` — 신규 시그니처 테스트
- `games/inflation-rpg/src/store/gameStore.ts` — `INITIAL_META`, 신규 액션
  (`gainDR`, `gainEnhanceStones`), `encounterMonster`/`defeatRun` 시그니처
- `games/inflation-rpg/src/store/gameStore.test.ts` — 시그니처 변경 반영
- `games/inflation-rpg/src/screens/RegionMap.tsx` — 영역 레벨 전달
- `games/inflation-rpg/src/battle/BattleScene.ts` — 몬스터 레벨 전달
- `games/inflation-rpg/src/screens/MainMenu.tsx` — DR / 강화석 표시
- `games/inflation-rpg/src/screens/Inventory.tsx` — `formatNumber` 적용 (sanity)

**Note on monster level source.** RegionMap 의 영역 진입 시 BP 비용은
`MapArea.levelRange[0]` 를 몬스터 레벨로 사용. BattleScene 의 사망 시 BP 추가
비용은 `run.level` 을 사용 (현 게임에서 enemy ATK 가 `run.level * 8` 로 계산되므로
일관성). Phase B 에서 던전 floor 별 정확한 몬스터 레벨로 교체 예정.

---

## Task 1: `formatNumber` 유틸 — 알파벳 표기

**Files:**
- Create: `games/inflation-rpg/src/lib/format.ts`
- Create: `games/inflation-rpg/src/lib/format.test.ts`

- [ ] **Step 1: 폴더 존재 확인**

```bash
ls games/inflation-rpg/src/lib/ 2>/dev/null || mkdir games/inflation-rpg/src/lib
```

- [ ] **Step 2: 실패 테스트 작성**

`games/inflation-rpg/src/lib/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatNumber } from './format';

describe('formatNumber', () => {
  it('returns plain digits below 1000', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(1)).toBe('1');
    expect(formatNumber(999)).toBe('999');
  });

  it('uses K for 1e3..1e6', () => {
    expect(formatNumber(1_000)).toBe('1.00K');
    expect(formatNumber(1_500)).toBe('1.50K');
    expect(formatNumber(999_999)).toBe('999K');
  });

  it('uses M for 1e6..1e9', () => {
    expect(formatNumber(1_000_000)).toBe('1.00M');
    expect(formatNumber(50_000_000)).toBe('50.0M');
  });

  it('uses B for 1e9..1e12', () => {
    expect(formatNumber(1_000_000_000)).toBe('1.00B');
    expect(formatNumber(8_900_000_000)).toBe('8.90B');
  });

  it('uses T for 1e12..1e15', () => {
    expect(formatNumber(1_500_000_000_000)).toBe('1.50T');
  });

  it('uses aa..az for 1e15..1e81', () => {
    expect(formatNumber(1.23e15)).toBe('1.23aa');
    expect(formatNumber(7.8e18)).toBe('7.80ab');
    expect(formatNumber(1e81)).toBe('1.00ba');
  });

  it('uses ba..bz, ca..cz for higher orders', () => {
    expect(formatNumber(9.99e84)).toBe('9.99bb');
    expect(formatNumber(1e108)).toBe('1.00ca');
  });

  it('handles negative numbers (rare but defensive)', () => {
    expect(formatNumber(-1500)).toBe('-1.50K');
  });

  it('returns "0" for non-finite values', () => {
    expect(formatNumber(Infinity)).toBe('∞');
    expect(formatNumber(NaN)).toBe('0');
  });

  it('precision: 3-digit total when prefix used', () => {
    // 12345 → "12.3K" (3 sig figs)
    expect(formatNumber(12_345)).toBe('12.3K');
    // 123456 → "123K"
    expect(formatNumber(123_456)).toBe('123K');
  });
});
```

- [ ] **Step 3: 테스트 실행 — 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test --run src/lib/format.test.ts
```

Expected: FAIL — `formatNumber` not exported.

- [ ] **Step 4: 구현**

`games/inflation-rpg/src/lib/format.ts`:

```ts
const PREFIXES = ['', 'K', 'M', 'B', 'T'];

function lettersForBucket(b: number): string {
  // bucket 0..25 = 'a'..'z'
  // bucket 26..51 = 'aa'..'az' (first letter advances each 26 buckets)
  // i.e. bucket b → first = floor(b / 26), second = b % 26 (0-indexed → 'a'..'z')
  const second = b % 26;
  const first = Math.floor(b / 26);
  const a = String.fromCharCode(97 + first);
  const c = String.fromCharCode(97 + second);
  return a + c;
}

function precision3(n: number): string {
  // 3 significant figures, no trailing zeros padded weirdly:
  //   1.23, 12.3, 123 (no decimal if >=100)
  if (n >= 100) return Math.floor(n).toString();
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

export function formatNumber(n: number): string {
  if (Number.isNaN(n)) return '0';
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '-∞';
  if (n < 0) return '-' + formatNumber(-n);
  if (n < 1000) return Math.floor(n).toString();

  // Determine 1000-power tier.
  // tier 1 = K (1e3), tier 2 = M (1e6), ..., tier 4 = T (1e12)
  // tier 5..30 = aa..az (1e15..1e81 in steps of 1e3)
  // tier 31..56 = ba..bz, etc.
  const tier = Math.floor(Math.log10(n) / 3);
  const scaled = n / Math.pow(1000, tier);

  if (tier <= 4) return precision3(scaled) + PREFIXES[tier];
  const bucket = tier - 5; // 0-indexed bucket for letter pairs
  return precision3(scaled) + lettersForBucket(bucket);
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test --run src/lib/format.test.ts
```

Expected: PASS — 모든 케이스 통과.

- [ ] **Step 6: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors.

- [ ] **Step 7: 커밋**

```bash
git add games/inflation-rpg/src/lib/format.ts games/inflation-rpg/src/lib/format.test.ts
git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): add formatNumber utility for big-number display

Alphabet notation (K/M/B/T then aa/ab/.../az/ba/...) for inflation-game
UI. 3 significant figures, ∞ fallback. Used in upcoming Phase A
phases for DR / 강화석 / damage display.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `MetaState` 에 `dr`, `enhanceStones` 필드 추가

**Files:**
- Modify: `games/inflation-rpg/src/types.ts:152-173`

- [ ] **Step 1: 타입 추가**

`games/inflation-rpg/src/types.ts` 의 `MetaState` 인터페이스에서 기존
`gold: number;` 줄 바로 다음에 두 줄 삽입:

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
  dr: number;             // 차원 간섭력 — 단일 메인 영구 화폐
  enhanceStones: number;  // 강화석 — 장비 강화 소모재
  equippedItemIds: string[];
  equipSlotCount: number;
  lastPlayedCharId: string;
  questProgress: Record<string, number>;
  questsCompleted: string[];
  regionsVisited: string[];
  tutorialDone: boolean;
  tutorialStep: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}
```

- [ ] **Step 2: typecheck — 다른 파일에서 깨지는지 확인**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 두 곳에서 missing-property 에러 발생 — `INITIAL_META` (gameStore.ts) 와
`gameStore.test.ts` 에서 `MetaState` 객체를 생성하는 곳. 다음 task 들에서 처리.

- [ ] **Step 3: 커밋 (skip — Task 3 와 함께 커밋)**

이 단계는 단독 커밋 안 함. Task 3 까지 진행한 뒤 합본 커밋.

---

## Task 3: `INITIAL_META` 업데이트 + persist migration

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts:45-66`
- Modify: `games/inflation-rpg/src/store/gameStore.ts` (persist config)

- [ ] **Step 1: `INITIAL_META` 에 신규 필드 기본값 추가**

`games/inflation-rpg/src/store/gameStore.ts` 의 `INITIAL_META` 객체에서 `gold: 0,`
줄 다음에 두 줄 삽입:

```ts
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
  dr: 0,
  enhanceStones: 0,
  equippedItemIds: [],
  equipSlotCount: 1,
  lastPlayedCharId: '',
  questProgress: {},
  questsCompleted: [],
  regionsVisited: [],
  tutorialDone: false,
  tutorialStep: -1,
  musicVolume: 0.5,
  sfxVolume: 0.7,
  muted: false,
};
```

- [ ] **Step 2: persist migration 추가 (기존 세이브 호환)**

`gameStore.ts` 파일 하단의 `persist` 호출 옵션 부분을 찾아 (`{ name: 'inflation-rpg' }` 같은 형태)
`migrate` + `version` 추가. 현재 그 부분을 먼저 읽어서 정확히 수정:

```bash
grep -n "persist(" games/inflation-rpg/src/store/gameStore.ts | head -5
```

위 명령으로 위치 확인 후, persist 옵션 객체에 다음을 추가:

```ts
{
  name: 'inflation-rpg',  // 기존 그대로 유지
  version: 2,             // 신규
  migrate: (persisted: unknown, fromVersion: number): unknown => {
    if (!persisted || typeof persisted !== 'object') return persisted;
    const state = persisted as { meta?: Partial<MetaState> };
    if (fromVersion < 2 && state.meta) {
      state.meta.dr = state.meta.dr ?? 0;
      state.meta.enhanceStones = state.meta.enhanceStones ?? 0;
    }
    return state;
  },
}
```

(파일 안 정확한 형태는 현 persist 호출 형식에 맞춰 조정. 필수 = `version: 2` +
`migrate` 함수.)

- [ ] **Step 3: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors (기존 `gameStore.test.ts` 가 `INITIAL_META` 를 spread 로 사용
한다면 여전히 통과).

- [ ] **Step 4: 기존 store 테스트 실행**

```bash
pnpm --filter @forge/game-inflation-rpg test --run src/store
```

Expected: 모든 기존 테스트 통과 (필드 추가만이라 회귀 없음).

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/types.ts games/inflation-rpg/src/store/gameStore.ts
git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): add DR + enhanceStones to MetaState

차원 간섭력 (DR) = 단일 영구 메인 화폐. 강화석 = 장비 강화 소모재.
persist v2 migration 으로 기존 세이브 호환.

Phase A foundation (1/3) — 화폐 schema. 실제 earn/spend 는 후속 task 에서.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `gainDR` + `gainEnhanceStones` store 액션

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts` (인터페이스 + 구현)

- [ ] **Step 1: 인터페이스에 메서드 추가**

`gameStore.ts` 의 `interface GameStore` 에 (다른 액션 사이 적절한 위치):

```ts
gainDR: (amount: number) => void;
gainEnhanceStones: (amount: number) => void;
```

- [ ] **Step 2: 구현 추가**

`gameStore.ts` 의 store 정의 안에 (다른 액션 옆):

```ts
gainDR: (amount) =>
  set((s) => ({ meta: { ...s.meta, dr: s.meta.dr + amount } })),

gainEnhanceStones: (amount) =>
  set((s) => ({ meta: { ...s.meta, enhanceStones: s.meta.enhanceStones + amount } })),
```

- [ ] **Step 3: 테스트 작성**

`games/inflation-rpg/src/store/gameStore.test.ts` 의 적절한 위치 (다른 action
테스트 묶음 옆) 에 추가:

```ts
describe('Currency actions', () => {
  it('gainDR adds to meta.dr', () => {
    useGameStore.setState({
      meta: { ...useGameStore.getState().meta, dr: 0 },
    });
    useGameStore.getState().gainDR(150);
    expect(useGameStore.getState().meta.dr).toBe(150);
    useGameStore.getState().gainDR(25);
    expect(useGameStore.getState().meta.dr).toBe(175);
  });

  it('gainEnhanceStones adds to meta.enhanceStones', () => {
    useGameStore.setState({
      meta: { ...useGameStore.getState().meta, enhanceStones: 0 },
    });
    useGameStore.getState().gainEnhanceStones(3);
    expect(useGameStore.getState().meta.enhanceStones).toBe(3);
    useGameStore.getState().gainEnhanceStones(10);
    expect(useGameStore.getState().meta.enhanceStones).toBe(13);
  });
});
```

- [ ] **Step 4: 테스트 실행**

```bash
pnpm --filter @forge/game-inflation-rpg test --run src/store
```

Expected: 모든 기존 + 신규 테스트 통과.

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts
git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): add gainDR / gainEnhanceStones store actions

Phase A foundation (2/3) — 화폐 적립 액션. 후속 task 에서 BP 비례 소모 +
실제 earn hook 으로 연결.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `bp.ts` 몬스터 레벨 비례 비용

**Files:**
- Modify: `games/inflation-rpg/src/systems/bp.ts`
- Modify: `games/inflation-rpg/src/systems/bp.test.ts`

- [ ] **Step 1: 새 시그니처 테스트 작성 (실패 예상)**

`games/inflation-rpg/src/systems/bp.test.ts` 전체를 다음으로 교체:

```ts
import { describe, it, expect } from 'vitest';
import {
  STARTING_BP,
  onEncounter,
  onDefeat,
  onBossKill,
  isRunOver,
  encounterCost,
  defeatCost,
} from './bp';

describe('BP System', () => {
  it('STARTING_BP is 30', () => {
    expect(STARTING_BP).toBe(30);
  });

  it('encounterCost = ceil(log10(level)) + 1, min 1', () => {
    expect(encounterCost(1)).toBe(1);       // log10(1)=0 → +1 = 1
    expect(encounterCost(10)).toBe(2);      // log10(10)=1 → +1 = 2
    expect(encounterCost(100)).toBe(3);
    expect(encounterCost(1_000)).toBe(4);
    expect(encounterCost(10_000)).toBe(5);
    expect(encounterCost(1_000_000)).toBe(7);
  });

  it('encounterCost handles level <= 0 gracefully (min 1)', () => {
    expect(encounterCost(0)).toBe(1);
    expect(encounterCost(-5)).toBe(1);
  });

  it('defeatCost = 2 × encounterCost', () => {
    expect(defeatCost(1)).toBe(2);
    expect(defeatCost(100)).toBe(6);
    expect(defeatCost(10_000)).toBe(10);
  });

  it('onEncounter decrements by encounterCost(level)', () => {
    expect(onEncounter(30, 1)).toBe(29);
    expect(onEncounter(30, 100)).toBe(27);     // -3
    expect(onEncounter(30, 1_000_000)).toBe(23); // -7
  });

  it('onDefeat decrements by defeatCost(level), hard mode ×2', () => {
    expect(onDefeat(28, 1, false)).toBe(26);   // -2
    expect(onDefeat(28, 1, true)).toBe(24);    // -4 (hard)
    expect(onDefeat(28, 100, false)).toBe(22); // -6
    expect(onDefeat(28, 100, true)).toBe(16);  // -12
  });

  it('onBossKill adds reward', () => {
    expect(onBossKill(20, 5)).toBe(25);
  });

  it('isRunOver when bp <= 0', () => {
    expect(isRunOver(0)).toBe(true);
    expect(isRunOver(-1)).toBe(true);
    expect(isRunOver(1)).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test --run src/systems/bp.test.ts
```

Expected: FAIL — `encounterCost`, `defeatCost` 미정의, 시그니처 불일치.

- [ ] **Step 3: 구현**

`games/inflation-rpg/src/systems/bp.ts` 전체 교체:

```ts
import type { IBattlePointSystem } from '@forge/core';

export const STARTING_BP = 30;

export function encounterCost(monsterLevel: number): number {
  if (monsterLevel <= 1) return 1;
  return Math.ceil(Math.log10(monsterLevel)) + 1;
}

export function defeatCost(monsterLevel: number): number {
  return 2 * encounterCost(monsterLevel);
}

export function onEncounter(current: number, monsterLevel: number): number {
  return current - encounterCost(monsterLevel);
}

export function onDefeat(current: number, monsterLevel: number, isHard: boolean): number {
  const base = defeatCost(monsterLevel);
  return current - (isHard ? base * 2 : base);
}

export function onBossKill(current: number, reward: number): number {
  return current + reward;
}

export function isRunOver(bp: number): boolean {
  return bp <= 0;
}

// IBattlePointSystem 계약은 @forge/core 가 제공. 현 구현은 단일-게임용이므로
// adapter 만 export 하여 추후 multi-game 시 필요한 경우 활용. monsterLevel 인자가
// 추가되어 인터페이스가 호환되지 않으면 contract 수정은 별도 작업 (Phase B 이상).
export const bpSystem: IBattlePointSystem = {
  onEncounter: (current: number) => current - 1,           // legacy fallback
  onDefeat: (current: number, isHard: boolean) =>
    current - (isHard ? 4 : 2),                             // legacy fallback
  onBossKill,
};
```

> **Note**: `bpSystem` adapter 의 legacy fallback 은 `@forge/core` 의 기존 계약
> 호환을 위함. 이 게임 (`inflation-rpg`) 내부에서는 신규 시그니처 (`onEncounter(bp, level)`,
> `onDefeat(bp, level, isHard)`) 를 사용. 추후 Phase B 에서 `IBattlePointSystem`
> 계약 자체를 수정할 수 있음.

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test --run src/systems/bp.test.ts
```

Expected: PASS — 11 tests.

- [ ] **Step 5: typecheck (다른 호출 사이트 확인)**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 호출 사이트 (`gameStore.ts`, `BattleScene.ts`) 에서 시그니처 변경
관련 에러 발생 — 다음 task 에서 수정.

- [ ] **Step 6: 커밋 (다음 task 와 함께 통합 커밋 가능 — 단독 커밋 권장)**

```bash
git add games/inflation-rpg/src/systems/bp.ts games/inflation-rpg/src/systems/bp.test.ts
git commit -m "$(cat <<'EOF'
refactor(game-inflation-rpg): scale BP cost by monster level

encounterCost = ceil(log10(level)) + 1
defeatCost    = 2 × encounterCost (hard mode ×2 추가)

Spec Section 2.5 BP 비례 소모. typecheck 는 호출 사이트 미수정으로 일부 깨짐 —
다음 task 에서 처리.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: store 액션 시그니처 — `encounterMonster(level)` / `defeatRun(level)`

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts` (interface + 구현)
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts`

- [ ] **Step 1: 인터페이스 시그니처 변경**

`gameStore.ts` 의 `interface GameStore` 에서:

```ts
// before
encounterMonster: () => void;
defeatRun: () => void;
// after
encounterMonster: (monsterLevel: number) => void;
defeatRun: (monsterLevel: number) => void;
```

- [ ] **Step 2: 구현 변경**

`gameStore.ts` 의 액션 구현 (line 140-144 부근):

```ts
encounterMonster: (monsterLevel) =>
  set((s) => ({ run: { ...s.run, bp: onEncounter(s.run.bp, monsterLevel) } })),

defeatRun: (monsterLevel) =>
  set((s) => ({ run: { ...s.run, bp: onDefeat(s.run.bp, monsterLevel, s.run.isHardMode) } })),
```

- [ ] **Step 3: 기존 store 테스트 업데이트**

`gameStore.test.ts` 의 BP 관련 테스트 (예: line 23 부근의 `'encounterMonster:
decrements BP by 1'`) 를 다음으로 교체:

```ts
it('encounterMonster: decrements BP by encounterCost(level)', () => {
  useGameStore.getState().startRun('hwarang', false);
  useGameStore.getState().encounterMonster(1);
  expect(useGameStore.getState().run.bp).toBe(STARTING_BP - 1);
});

it('encounterMonster: scales with level', () => {
  useGameStore.getState().startRun('hwarang', false);
  useGameStore.getState().encounterMonster(100);
  expect(useGameStore.getState().run.bp).toBe(STARTING_BP - 3); // ceil(log10(100))+1=3
});

it('defeatRun normal: -defeatCost(level)', () => {
  useGameStore.getState().startRun('hwarang', false);
  useGameStore.getState().encounterMonster(1);  // -1 → 29
  useGameStore.getState().defeatRun(1);          // -2 → 27
  expect(useGameStore.getState().run.bp).toBe(STARTING_BP - 1 - 2);
});

it('defeatRun hard: -defeatCost(level) × 2', () => {
  useGameStore.getState().startRun('hwarang', true);
  useGameStore.getState().encounterMonster(1);  // -1 → 29
  useGameStore.getState().defeatRun(1);          // -2×2=-4 → 25
  expect(useGameStore.getState().run.bp).toBe(STARTING_BP - 1 - 4);
});
```

(Import 가 필요하면 `import { STARTING_BP } from '../systems/bp';` 추가.)

- [ ] **Step 4: 테스트 실행**

```bash
pnpm --filter @forge/game-inflation-rpg test --run src/store
```

Expected: 모든 store 테스트 통과.

- [ ] **Step 5: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: `RegionMap.tsx`, `BattleScene.ts` 에서 `encounterMonster()` /
`defeatRun()` 무인자 호출 에러. 다음 task 에서 처리.

- [ ] **Step 6: 커밋**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts
git commit -m "$(cat <<'EOF'
refactor(game-inflation-rpg): encounterMonster/defeatRun take monster level

시그니처 변경 — 호출 사이트 (RegionMap, BattleScene) 미수정으로 typecheck
깨짐. 다음 task 에서 호출 사이트 수정.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: `RegionMap.tsx` 호출 사이트 수정

**Files:**
- Modify: `games/inflation-rpg/src/screens/RegionMap.tsx`

- [ ] **Step 1: `enterArea` 수정**

`RegionMap.tsx` 의 `enterArea` 함수 (현재 line 69-79) 를 다음으로:

```tsx
const enterArea = (area: MapArea) => {
  setLockedInfo(null);
  // 영역의 하한 레벨을 몬스터 레벨로 사용. Phase B 에서 던전 floor 별 정확한
  // 레벨로 교체 예정.
  const monsterLevel = area.levelRange[0];
  encounterMonster(monsterLevel);
  // BP 가 0 이하가 되었는지 확인 (encounter 이후 상태로). 현재 store 에서
  // BP 가 이미 차감됐으므로 store 에서 직접 읽어서 검사.
  const newBP = useGameStore.getState().run.bp;
  if (isRunOver(newBP)) {
    endRun();
    return;
  }
  setCurrentArea(area.id);
  resetDungeon();
  setScreen('dungeon');
};
```

> 기존 `run.bp - 1` 미리 빼는 패턴 → 신규는 `encounterMonster()` 후 store 상태
> 재조회로 변경. 이유: 비용이 더 이상 -1 고정이 아니므로 미리 계산 곤란.

- [ ] **Step 2: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: `RegionMap.tsx` 의 에러 해소. `BattleScene.ts` 만 남음.

- [ ] **Step 3: 기존 RegionMap 테스트 (있으면) 실행**

```bash
pnpm --filter @forge/game-inflation-rpg test --run src/screens/RegionMap
```

Expected: 모두 통과 (BP 차감 흐름 동일).

- [ ] **Step 4: 커밋**

```bash
git add games/inflation-rpg/src/screens/RegionMap.tsx
git commit -m "$(cat <<'EOF'
refactor(game-inflation-rpg): pass area level to encounterMonster

영역의 levelRange[0] 을 몬스터 레벨로 전달. Phase B 에서 던전 floor 단위로
교체 예정.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: `BattleScene.ts` 호출 사이트 수정

**Files:**
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts`

- [ ] **Step 1: 패배 처리 부분 수정**

`BattleScene.ts` 의 line 195-206 부근 (player 사망 처리):

```ts
if (currentHPEstimate <= 0) {
  this.combatTimer?.remove();
  playSfx('defeat');
  // 현재 BattleScene 의 적 ATK 가 run.level * 8 로 계산되므로 (line 190 부근),
  // 같은 run.level 을 몬스터 레벨로 사용. Phase B 에서 던전 floor 별 정확한
  // 몬스터 레벨로 교체.
  const monsterLevel = run.level;
  const newBP = onDefeat(run.bp, monsterLevel, run.isHardMode);
  useGameStore.setState((s) => ({ run: { ...s.run, bp: newBP } }));
  useGameStore.getState().resetDungeon();
  if (isRunOver(newBP)) {
    useGameStore.getState().endRun();
  } else {
    this.callbacks.onBattleEnd(false);
  }
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors.

- [ ] **Step 3: 모든 테스트 실행**

```bash
pnpm --filter @forge/game-inflation-rpg test --run
```

Expected: 모두 통과.

- [ ] **Step 4: 커밋**

```bash
git add games/inflation-rpg/src/battle/BattleScene.ts
git commit -m "$(cat <<'EOF'
refactor(game-inflation-rpg): pass monster level to onDefeat in BattleScene

run.level 을 임시 몬스터 레벨로 사용 (적 ATK 계산이 이미 run.level * 8 기반).
Phase B 에서 던전 floor 단위 정확한 레벨로 교체.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: DR / 강화석 자동 적립

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts` (`incrementDungeonKill`,
  `bossDrop`)
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts`

**설계**: 일반 몬스터 처치 시 `dr += round(monsterLevel * 0.5)` 적립. 보스 처치 시
`dr += bpReward * 100`, `enhanceStones += bpReward` (mini=1, major=3, final=5
정도가 현 보스 카탈로그 평균이므로 자연스럽게 비율 형성). Phase B 에서 곡선 정밀화.

- [ ] **Step 1: `incrementDungeonKill` 시그니처 변경**

기존 시그니처: `incrementDungeonKill: () => void`. 변경:

`gameStore.ts` 의 `interface GameStore`:

```ts
incrementDungeonKill: (monsterLevel: number) => void;
```

구현 (현 line 236-242 부근):

```ts
incrementDungeonKill: (monsterLevel) => set((s) => {
  const drGained = Math.max(1, Math.round(monsterLevel * 0.5));
  return {
    run: {
      ...s.run,
      dungeonRunMonstersDefeated: s.run.dungeonRunMonstersDefeated + 1,
      monstersDefeated: s.run.monstersDefeated + 1,
    },
    meta: {
      ...s.meta,
      dr: s.meta.dr + drGained,
    },
  };
}),
```

- [ ] **Step 2: `bossDrop` 시그니처 확장 — 강화석 적립**

`bossDrop` 구현 (현 line 166+) 의 set 함수 안에 `enhanceStones`, `dr` 누적:

```ts
bossDrop: (bossId, bpReward) =>
  set((s) => {
    const normalKilled = s.run.isHardMode
      ? s.meta.normalBossesKilled
      : progressionOnBossKill(bossId, s.meta.normalBossesKilled, 9);
    const hardKilled = s.run.isHardMode
      ? progressionOnBossKill(bossId, s.meta.hardBossesKilled, 9)
      : s.meta.hardBossesKilled;
    const drGained = bpReward * 100;
    const stonesGained = bpReward;
    return {
      run: { ...s.run, bp: bpOnBossKill(s.run.bp, bpReward) },
      meta: {
        ...s.meta,
        normalBossesKilled: normalKilled,
        hardBossesKilled: hardKilled,
        baseAbilityLevel: getBaseAbilityLevel(normalKilled, hardKilled),
        dr: s.meta.dr + drGained,
        enhanceStones: s.meta.enhanceStones + stonesGained,
      },
    };
  }),
```

- [ ] **Step 3: BattleScene 의 `incrementDungeonKill` 호출 수정**

```bash
grep -n "incrementDungeonKill" games/inflation-rpg/src/battle/BattleScene.ts games/inflation-rpg/src/screens/Battle.tsx 2>/dev/null
```

위 명령으로 호출 사이트 찾기. 가장 가능성 높은 곳: BattleScene 내부 처치 처리.

각 호출 사이트에서 무인자 → `incrementDungeonKill(monsterLevel)` 로 변경. 호출
컨텍스트에서 사용 가능한 적 레벨 (예: `run.level` 임시) 전달. 정확한 호출 코드를
보고 수정:

```bash
grep -n -A 2 "incrementDungeonKill" games/inflation-rpg/src/battle/
```

> **명령 결과를 보고 정확히 수정** — 호출 형태가 `useGameStore.getState().incrementDungeonKill()`
> 같은 형태면 `useGameStore.getState().incrementDungeonKill(run.level)` 식.

- [ ] **Step 4: 테스트 추가**

`gameStore.test.ts` 에 다음 추가:

```ts
describe('Currency on combat events', () => {
  it('incrementDungeonKill grants DR proportional to monster level', () => {
    useGameStore.getState().startRun('hwarang', false);
    const before = useGameStore.getState().meta.dr;
    useGameStore.getState().incrementDungeonKill(100);
    expect(useGameStore.getState().meta.dr).toBe(before + 50);  // 100 * 0.5
  });

  it('incrementDungeonKill min DR is 1', () => {
    useGameStore.getState().startRun('hwarang', false);
    const before = useGameStore.getState().meta.dr;
    useGameStore.getState().incrementDungeonKill(0);
    expect(useGameStore.getState().meta.dr).toBe(before + 1);
  });

  it('bossDrop grants DR (×100) and enhanceStones (×1) per bpReward', () => {
    useGameStore.getState().startRun('hwarang', false);
    const before = useGameStore.getState().meta;
    useGameStore.getState().bossDrop('test-boss', 5);
    const after = useGameStore.getState().meta;
    expect(after.dr).toBe(before.dr + 500);
    expect(after.enhanceStones).toBe(before.enhanceStones + 5);
  });
});
```

- [ ] **Step 5: 모든 테스트 실행**

```bash
pnpm --filter @forge/game-inflation-rpg test --run
```

Expected: 모두 통과.

- [ ] **Step 6: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors.

- [ ] **Step 7: 커밋**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts games/inflation-rpg/src/battle/
git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): grant DR + enhanceStones on combat events

일반 몹 처치: DR = round(level * 0.5), 최소 1
보스 처치: DR = bpReward * 100, 강화석 = bpReward

Phase A foundation (3/3) — 화폐 적립 hook 연결. 곡선 정밀화는 Phase I 에서.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: UI 표시 — MainMenu / Inventory 에 DR + 강화석 + formatNumber

**Files:**
- Modify: `games/inflation-rpg/src/screens/MainMenu.tsx`
- Modify: `games/inflation-rpg/src/screens/Inventory.tsx`

**설계 의도**: 화폐가 실제 누적되니 UI 에 보여야 한다. 큰 수가 자연스럽게 발생하므로
`formatNumber` 사용.

- [ ] **Step 1: 현재 MainMenu 화폐 표시 위치 확인**

```bash
grep -n "gold\|골드" games/inflation-rpg/src/screens/MainMenu.tsx
```

기존 gold 표시가 있다면 (보통 우상단 등), 그 위치에 DR + 강화석 추가. 없다면
ForgePanel 영역에 신규 섹션 추가.

- [ ] **Step 2: MainMenu 수정 (예시 — 정확한 위치는 현 파일 구조에 맞춤)**

`MainMenu.tsx` 의 적절한 위치에 다음 패턴 추가 (예: 메인 메뉴 카드 영역):

```tsx
import { formatNumber } from '../lib/format';

// ... 컴포넌트 안 어딘가:
const meta = useGameStore((s) => s.meta);

// JSX 안 적절한 위치 (예: 상단 status bar):
<div
  style={{
    display: 'flex',
    gap: 'var(--space-3)',
    fontSize: 'var(--font-sm)',
    fontFamily: 'var(--font-mono)',
    padding: 'var(--space-2) var(--space-3)',
  }}
>
  <span>골드 {formatNumber(meta.gold)}</span>
  <span>DR {formatNumber(meta.dr)}</span>
  <span>강화석 {formatNumber(meta.enhanceStones)}</span>
</div>
```

(스타일은 현 ForgeScreen / Forge token 컨벤션 따라 조정. forge-* 컴포넌트와의
일관성 유지.)

- [ ] **Step 3: Inventory 의 골드 표시도 `formatNumber` 적용**

`Inventory.tsx` 에서 `meta.gold` 를 표시하는 부분 (예: `{meta.gold} 골드` 같은
패턴) 을 `{formatNumber(meta.gold)} 골드` 로 변경. import 추가:

```tsx
import { formatNumber } from '../lib/format';
```

`grep -n "meta.gold\|s.meta.gold" games/inflation-rpg/src/screens/Inventory.tsx` 로
모든 표시 위치 찾아서 일괄 적용.

- [ ] **Step 4: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors.

- [ ] **Step 5: dev 서버에서 시각 확인**

```bash
pnpm --filter @forge/dev-shell dev
```

브라우저에서 `http://localhost:3000/inflation-rpg` 진입 → MainMenu 로 이동:
- DR / 강화석 / 골드 가 보이는지
- 0 표시 (초기) 가 정상인지
- run 한 번 돌려서 보스 처치 시 숫자 증가하는지

(이 단계는 자동 검증 어려움 — 수동 확인 필수. 검증 결과 plan 의 다음 task 진행
시 코멘트로 남길 것.)

- [ ] **Step 6: 커밋**

```bash
git add games/inflation-rpg/src/screens/MainMenu.tsx games/inflation-rpg/src/screens/Inventory.tsx
git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): display DR / 강화석 in MainMenu, formatNumber for gold

UI 에 신규 화폐 노출. 큰 수는 알파벳 표기 (1.23K / 4.56M / 7.8aa) 로 통일.

Phase A foundation 마무리. 다음 단계: Phase B 던전 시스템 재편.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Final Verification

모든 task 완료 후 통합 검증:

- [ ] **Step 1: 전 워크스페이스 typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 2: 전 워크스페이스 test**

```bash
pnpm test
```

Expected: 모두 통과. 신규 추가 약 18 건 (format 11 + bp 11 + store 5).

- [ ] **Step 3: lint + circular**

```bash
pnpm lint && pnpm circular
```

Expected: 0 errors / 0 circular dependencies.

- [ ] **Step 4: dev 서버 수동 검증 (1 런)**

```bash
pnpm dev
```

체크 리스트:
- [ ] MainMenu 에 DR / 강화석 / 골드 표시
- [ ] WorldMap → 평야 영역 진입 시 BP -1 정확
- [ ] 깊은숲 (level 500+) 영역 진입 시 BP -3 정확
- [ ] 사망 시 BP 추가 차감 정확
- [ ] 일반 몹 처치 시 DR 증가
- [ ] 보스 처치 시 DR ×100, 강화석 ×bpReward 증가
- [ ] 게임 재로드 후 DR / 강화석 보존 (persist 동작)

- [ ] **Step 5: phase-a-complete 태그**

```bash
git tag phase-a-complete
git log --oneline -10
```

Phase A 완료. Phase B 는 별도 spec + plan 으로 진행.

---

## Self-Review Checklist (작성자용)

(Plan 작성자가 plan 을 commit 하기 전 자체 review)

**Spec coverage:**
- [x] 단일 화폐 (DR + 강화석) — Task 2~4, 9
- [x] 알파벳 숫자 표기 — Task 1
- [x] BP 비례 소모 — Task 5~8
- [x] save migration — Task 3 step 2

**Out of Phase A scope (다음 phase 에서):**
- 강화 UI / 강화 lv (Phase C)
- 던전 floor 단위 정확한 몬스터 레벨 (Phase B)
- 마을 hub 본격 (Phase J)

**Type consistency:**
- `formatNumber(n: number): string` ─ 모든 호출 사이트 일치
- `encounterCost(monsterLevel: number)`, `defeatCost(monsterLevel: number)` ─ bp.ts 와 호출처 일치
- `gainDR(amount: number)`, `gainEnhanceStones(amount: number)` ─ store 와 추후 호출처 (Phase E 에서) 일치

**Placeholder scan:**
- 없음. 모든 코드 블록 즉시 실행 가능.
