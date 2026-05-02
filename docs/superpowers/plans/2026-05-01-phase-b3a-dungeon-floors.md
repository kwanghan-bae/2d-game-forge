# Phase B-3α — DungeonFloors 화면 + 신 flow 활성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Town 에서 던전 선택 → DungeonFloors 화면 → floor 클릭 → BattleScene 이 dungeon.monsterPool + getMonsterLevel(floor) 로 몬스터 픽. 신 flow 가 end-to-end playable. 구 flow (WorldMap/RegionMap) 코드는 그대로 두되 진입로 차단.

**Architecture:**
- RunState 에 `currentFloor: number` 추가, persist v3 → v4 bump + migrate default 1 주입.
- Screen union 에 `'dungeon-floors'` 추가.
- `startRun(characterId, isHardMode)` 가 `currentDungeonId !== null` 이면 screen='dungeon-floors', 아니면 기존 'world-map' (구 flow 호환).
- `DungeonFloors.tsx` — floor 1..30 카드 그리드. `floor <= run.currentFloor` 인 것만 활성, 나머지 잠금. 클릭 = setCurrentFloor(N) + encounterMonster + setScreen('dungeon').
- `BattleScene.create/doRound`: `run.currentDungeonId !== null` 분기 → `pickMonsterFromPool(dungeon.monsterPool, getMonsterLevel(run.currentFloor))`. 일반 몹 처치 시 `currentFloor + 1` + setScreen('dungeon-floors'). 사망 시 BP defeat cost 도 monsterLevel 기반.
- `Dungeon.tsx` 헤더: 신 flow 시 던전+floor 표시, 구 flow 는 기존 area+stage.
- `MainMenu`: 구 flow 진입로 ("게임 시작" / "하드모드" / "런 이어하기") 비노출. "마을로" 만 노출. (hasActiveRun + currentDungeonId 시 "이어하기" 만 별도 노출 — dungeon-floors 로.)
- 보스 floor (5/10/15/20/25/30) 차별화는 **B-3β 영역**. B-3α 는 모든 floor 를 일반 floor 로 처리.
- 인플레이션 곡선 (HP=100×1.4^L 등 spec 11.2 Curve 2) 도입은 **Phase I 영역**. B-3α 는 기존 `monsterLevel * 20 * monster.hpMult` 공식 유지하되 `monsterLevel` 만 `getMonsterLevel(floor)` 로 교체.

**Tech Stack:** TypeScript, React, Zustand persist, vitest, Playwright (E2E).

**Files:**
- Create: `games/inflation-rpg/src/screens/DungeonFloors.tsx`
- Create: `games/inflation-rpg/src/screens/DungeonFloors.test.tsx`
- Modify: `games/inflation-rpg/src/types.ts` (RunState + Screen)
- Modify: `games/inflation-rpg/src/store/gameStore.ts` (INITIAL_RUN, persist, setCurrentFloor, startRun)
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts` (currentFloor + startRun 분기 + migrate)
- Modify: `games/inflation-rpg/src/App.tsx` (라우팅)
- Modify: `games/inflation-rpg/src/systems/sound.ts` (SCREEN_BGM 매핑)
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts` (신 flow 분기)
- Modify: `games/inflation-rpg/src/screens/Dungeon.tsx` (헤더 분기)
- Modify: `games/inflation-rpg/src/screens/MainMenu.tsx` (진입로 차단)
- Create: `games/inflation-rpg/e2e/dungeon-flow.spec.ts` (smoke)

---

## Task 1: types.ts — RunState.currentFloor + Screen union

**Files:**
- Modify: `games/inflation-rpg/src/types.ts`

- [ ] **Step 1: RunState 에 currentFloor 추가**

`games/inflation-rpg/src/types.ts` 의 `RunState` interface 찾아서 `currentDungeonId: string | null;` 라인 바로 아래 한 줄 추가:

```ts
currentFloor: number; // B-3α — 신 flow 던전 floor (1..N). 런 종료 시 1 로 리셋.
```

- [ ] **Step 2: Screen union 에 'dungeon-floors' 추가**

같은 파일에서 `Screen` 타입 찾기:

```ts
export type Screen = 'main-menu' | 'class-select' | 'world-map' | ...;
```

`'town'` 뒤에 `'dungeon-floors'` 추가:

```ts
export type Screen = 'main-menu' | 'class-select' | 'world-map' | 'town' | 'dungeon-floors' | ...;
```

(기존 union 의 다른 멤버는 그대로 보존. 정확한 union 멤버 목록은 파일에서 확인.)

- [ ] **Step 3: typecheck 실행 — 다른 파일 깨지는지 확인**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`
Expected: `RunState` 사용처에서 `currentFloor` 빠진 객체 리터럴이 있으면 에러. INITIAL_RUN 에서 폭발할 것 — Task 2 에서 채운다. **현재는 `currentFloor` missing 에러만 허용** (다른 종류 에러 시 stop).

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/types.ts
git commit -m "feat(game-inflation-rpg): add RunState.currentFloor + 'dungeon-floors' Screen"
```

---

## Task 2: gameStore — INITIAL_RUN, persist v4, setCurrentFloor, startRun 분기

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts`
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts`

- [ ] **Step 1: 실패 테스트 — INITIAL_RUN.currentFloor 기본값**

`games/inflation-rpg/src/store/gameStore.test.ts` 끝에 추가:

```ts
describe('Phase B-3α — currentFloor + dungeon-floors routing', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: { ...INITIAL_RUN },
      meta: { ...INITIAL_META },
    });
  });

  it('INITIAL_RUN.currentFloor === 1', () => {
    expect(INITIAL_RUN.currentFloor).toBe(1);
  });

  it('setCurrentFloor updates run.currentFloor', () => {
    useGameStore.getState().setCurrentFloor(7);
    expect(useGameStore.getState().run.currentFloor).toBe(7);
  });

  it('startRun routes to dungeon-floors when currentDungeonId is set', () => {
    useGameStore.getState().selectDungeon('plains');
    useGameStore.getState().startRun('hwarang', false);
    expect(useGameStore.getState().screen).toBe('dungeon-floors');
    expect(useGameStore.getState().run.currentDungeonId).toBe('plains');
    expect(useGameStore.getState().run.currentFloor).toBe(1);
  });

  it('startRun routes to world-map when currentDungeonId is null (legacy flow)', () => {
    useGameStore.getState().selectDungeon(null);
    useGameStore.getState().startRun('hwarang', false);
    expect(useGameStore.getState().screen).toBe('world-map');
  });

  it('endRun resets currentFloor to 1', () => {
    useGameStore.getState().selectDungeon('plains');
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().setCurrentFloor(15);
    useGameStore.getState().endRun();
    expect(useGameStore.getState().run.currentFloor).toBe(1);
  });
});
```

(파일 상단에 `INITIAL_RUN`, `INITIAL_META` import 가 이미 있는지 확인. 없으면 `import { useGameStore, INITIAL_RUN, INITIAL_META } from './gameStore';` 보강.)

- [ ] **Step 2: 테스트 실행 — fail 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test gameStore`
Expected: 5개 새 테스트 모두 fail (INITIAL_RUN.currentFloor undefined / setCurrentFloor not a function / startRun 분기 없음).

- [ ] **Step 3: INITIAL_RUN.currentFloor = 1 추가**

`gameStore.ts` 의 `INITIAL_RUN` 정의 (line 30 근처) 에서 `currentDungeonId: null,` 바로 아래 추가:

```ts
currentFloor: 1,
```

- [ ] **Step 4: GameStore interface 에 setCurrentFloor 추가**

`interface GameStore` (line 71 근처) 의 `selectDungeon` 라인 아래에 추가:

```ts
setCurrentFloor: (floor: number) => void;
```

- [ ] **Step 5: setCurrentFloor 액션 구현**

`selectDungeon` 액션 (line 246 근처) 바로 아래 추가:

```ts
setCurrentFloor: (floor) =>
  set((s) => ({ run: { ...s.run, currentFloor: floor } })),
```

- [ ] **Step 6: startRun 에 라우팅 분기 추가**

기존 `startRun` (line 123 근처):

```ts
startRun: (characterId, isHardMode) =>
  set((s) => ({
    run: {
      ...INITIAL_RUN,
      characterId,
      isHardMode,
      currentDungeonId: s.run.currentDungeonId,
    },
    screen: 'world-map',
  })),
```

다음으로 교체:

```ts
startRun: (characterId, isHardMode) =>
  set((s) => ({
    run: {
      ...INITIAL_RUN,
      characterId,
      isHardMode,
      currentDungeonId: s.run.currentDungeonId,
    },
    screen: s.run.currentDungeonId !== null ? 'dungeon-floors' : 'world-map',
  })),
```

(`INITIAL_RUN.currentFloor = 1` 이므로 spread 결과 자동으로 1 이 됨. `endRun` 의 `INITIAL_RUN` spread 도 같은 이유로 OK.)

- [ ] **Step 7: persist version 3 → 4 + migrate 분기**

`gameStore.ts` 끝부분 (line 422 근처) 의 persist 옵션:

```ts
{
  name: 'korea_inflation_rpg_save',
  version: 3,
  migrate: (persisted: unknown, fromVersion: number) => {
    // ... 기존 로직 ...
    // Phase B-2 — currentDungeonId 추가
    if (fromVersion < 3 && s.run) {
      s.run.currentDungeonId = s.run.currentDungeonId ?? null;
    }
    return s;
  },
  ...
}
```

`version: 3` 을 `version: 4` 로 변경. 마이그레이트 함수의 `return s;` 직전에 추가:

```ts
// Phase B-3α — currentFloor 추가
if (fromVersion < 4 && s.run) {
  s.run.currentFloor = s.run.currentFloor ?? 1;
}
```

- [ ] **Step 8: 테스트 + typecheck 통과 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test gameStore && pnpm --filter @forge/game-inflation-rpg typecheck`
Expected: 모든 store 테스트 PASS (236+5 = 241 정도). typecheck 0 errors.

- [ ] **Step 9: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts
git commit -m "feat(game-inflation-rpg): add setCurrentFloor + startRun dungeon-floors routing + persist v4"
```

---

## Task 3: DungeonFloors.tsx 화면 + 테스트

**Files:**
- Create: `games/inflation-rpg/src/screens/DungeonFloors.tsx`
- Create: `games/inflation-rpg/src/screens/DungeonFloors.test.tsx`

UX 결정 (락):
- floor 1..30 까지 표시 (named floor 끝). 31+ 심층은 후속 phase.
- `floor <= run.currentFloor` 면 활성 (클릭 가능), `floor > run.currentFloor` 면 잠금 (🔒). currentFloor 강조 표시.
- 클릭: setCurrentFloor(floor) → encounterMonster(getMonsterLevel(floor)) → BP 0 면 endRun, 아니면 setScreen('dungeon').
- 뒤로가기 ("마을로"): selectDungeon(null) + setScreen('town'). 던전 변경하려면 마을에서 다시 선택.

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/screens/DungeonFloors.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DungeonFloors } from './DungeonFloors';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';

describe('DungeonFloors', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'dungeon-floors',
      run: { ...INITIAL_RUN, characterId: 'hwarang', currentDungeonId: 'plains', currentFloor: 1 },
      meta: { ...INITIAL_META },
    });
  });

  it('renders floor cards 1..30', () => {
    render(<DungeonFloors />);
    expect(screen.getByTestId('floor-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('floor-card-30')).toBeInTheDocument();
    // floor 31 should not exist
    expect(screen.queryByTestId('floor-card-31')).not.toBeInTheDocument();
  });

  it('locks floors past run.currentFloor', () => {
    useGameStore.setState({
      run: { ...INITIAL_RUN, characterId: 'hwarang', currentDungeonId: 'plains', currentFloor: 5 },
    });
    render(<DungeonFloors />);
    // floor 5 active, floor 6 locked
    expect(screen.getByTestId('floor-card-5')).not.toHaveAttribute('disabled');
    expect(screen.getByTestId('floor-card-6')).toHaveAttribute('disabled');
  });

  it('click on accessible floor sets currentFloor + transitions to dungeon', () => {
    useGameStore.setState({
      run: { ...INITIAL_RUN, characterId: 'hwarang', currentDungeonId: 'plains', currentFloor: 3, bp: 30 },
    });
    render(<DungeonFloors />);
    fireEvent.click(screen.getByTestId('floor-card-2'));
    expect(useGameStore.getState().run.currentFloor).toBe(2);
    expect(useGameStore.getState().screen).toBe('dungeon');
  });

  it('back button returns to town and clears currentDungeonId', () => {
    render(<DungeonFloors />);
    fireEvent.click(screen.getByTestId('dungeon-floors-back'));
    expect(useGameStore.getState().screen).toBe('town');
    expect(useGameStore.getState().run.currentDungeonId).toBeNull();
  });

  it('renders dungeon name in header', () => {
    render(<DungeonFloors />);
    expect(screen.getByText(/평야/)).toBeInTheDocument();
  });
});
```

(테스트 환경의 `@testing-library/jest-dom` matcher 가 이미 vitest setup 에 등록되어 있는지 확인 — 다른 .test.tsx 가 `toBeInTheDocument` 쓰면 OK.)

- [ ] **Step 2: 테스트 실행 — fail 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test DungeonFloors`
Expected: "Cannot find module './DungeonFloors'" 또는 컴포넌트 없음.

- [ ] **Step 3: DungeonFloors.tsx 구현**

```tsx
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { getDungeonById } from '../data/dungeons';
import { getFloorInfo } from '../data/floors';
import { isRunOver } from '../systems/bp';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { ForgeButton } from '@/components/ui/forge-button';
import { ForgePanel } from '@/components/ui/forge-panel';
import { formatNumber } from '../lib/format';

const NAMED_FLOOR_COUNT = 30;

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

  if (!dungeon) {
    return (
      <ForgeScreen>
        <ForgePanel style={{ margin: 16 }}>
          <p style={{ color: 'var(--forge-danger)' }}>던전 정보를 찾을 수 없다.</p>
          <ForgeButton onClick={() => setScreen('town')}>마을로</ForgeButton>
        </ForgePanel>
      </ForgeScreen>
    );
  }

  const enterFloor = (floor: number) => {
    if (floor > run.currentFloor) return; // safeguard
    const info = getFloorInfo(dungeon.id, floor);
    setCurrentFloor(floor);
    encounterMonster(info.monsterLevel);
    const newBP = useGameStore.getState().run.bp;
    if (isRunOver(newBP)) {
      endRun();
      return;
    }
    setScreen('dungeon');
  };

  const backToTown = () => {
    selectDungeon(null);
    setScreen('town');
  };

  const floors = Array.from({ length: NAMED_FLOOR_COUNT }, (_, i) => i + 1);

  return (
    <ForgeScreen>
      <div
        style={{
          padding: '14px 16px',
          background: 'var(--forge-bg-panel)',
          borderBottom: '1px solid var(--forge-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <ForgeButton variant="secondary" onClick={backToTown} data-testid="dungeon-floors-back">
          ← 마을로
        </ForgeButton>
        <span style={{ fontWeight: 700, color: 'var(--forge-accent)' }}>
          {dungeon.emoji} {dungeon.nameKR}
        </span>
        <span style={{ fontSize: 12, color: 'var(--forge-text-secondary)' }}>
          ⚡ BP {formatNumber(run.bp)}
        </span>
      </div>
      <div
        style={{
          padding: 'var(--forge-space-4)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
          gap: 'var(--forge-space-2)',
          overflowY: 'auto',
        }}
      >
        {floors.map((floor) => {
          const info = getFloorInfo(dungeon.id, floor);
          const locked = floor > run.currentFloor;
          const isCurrent = floor === run.currentFloor;
          return (
            <button
              key={floor}
              data-testid={`floor-card-${floor}`}
              disabled={locked}
              onClick={() => enterFloor(floor)}
              style={{
                minHeight: 56,
                padding: 'var(--forge-space-2)',
                background: isCurrent
                  ? 'var(--forge-accent)'
                  : locked
                  ? 'rgba(0,0,0,0.6)'
                  : 'var(--forge-bg-panel)',
                color: isCurrent ? '#000' : 'var(--forge-text-primary)',
                border: `1px solid ${isCurrent ? 'var(--forge-accent)' : 'var(--forge-border)'}`,
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
                {locked ? '🔒' : `F${floor}`}
              </div>
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

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test DungeonFloors`
Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/screens/DungeonFloors.tsx games/inflation-rpg/src/screens/DungeonFloors.test.tsx
git commit -m "feat(game-inflation-rpg): add DungeonFloors screen with floor 1..30 grid"
```

---

## Task 4: App.tsx + sound.ts 라우팅

**Files:**
- Modify: `games/inflation-rpg/src/App.tsx`
- Modify: `games/inflation-rpg/src/systems/sound.ts`

- [ ] **Step 1: App.tsx 에 dungeon-floors 분기 추가**

App.tsx 파일을 열어 screen switch 또는 conditional rendering 부분을 찾는다 (보통 'town' 분기와 같은 자리). town 분기 바로 아래 추가:

```tsx
import { DungeonFloors } from './screens/DungeonFloors';

// ... 기존 분기들 ...
{screen === 'town' && <Town />}
{screen === 'dungeon-floors' && <DungeonFloors />}
```

(파일 정확한 구조에 맞춰 — `case` switch 든 `&&` 패턴이든 기존 town 처리와 동일 형식으로.)

- [ ] **Step 2: sound.ts SCREEN_BGM 매핑 추가**

`games/inflation-rpg/src/systems/sound.ts` 의 SCREEN_BGM 객체 찾아 `'town'` 항목 옆에 추가:

```ts
export const SCREEN_BGM: Record<Screen, BGMTrack | null> = {
  // ... 기존 ...
  'town': 'bgm-town',
  'dungeon-floors': 'bgm-town', // B-3α — 던전 입구 톤. B-3β 에서 별도 트랙 검토.
  // ... 기존 ...
};
```

(town 과 동일 트랙 임시. dungeon BGM 분리는 후속.)

- [ ] **Step 3: typecheck — Screen union 빠짐없는지 확인**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`
Expected: 0 errors. 만약 SCREEN_BGM 이 `Record<Screen, ...>` 타입인데 'dungeon-floors' 가 빠지면 TS2741 등 명확한 에러로 잡혀야 함. 그 경우 추가.

- [ ] **Step 4: 수동 dev 검증**

Run: `pnpm dev` (background OK)
브라우저에서 main-menu → 마을로 → 던전 선택 → ClassSelect → 캐릭터 선택 → DungeonFloors 화면이 보이는지 확인. floor 1 만 활성, 나머지 잠금. 뒤로가기 → town 으로 돌아오는지.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/App.tsx games/inflation-rpg/src/systems/sound.ts
git commit -m "feat(game-inflation-rpg): wire 'dungeon-floors' into App routing + sound"
```

---

## Task 5: BattleScene + Dungeon.tsx 신 flow 분기

**Files:**
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts`
- Modify: `games/inflation-rpg/src/screens/Dungeon.tsx`
- Modify: `games/inflation-rpg/src/screens/Dungeon.test.tsx` (있으면)

목표:
- `run.currentDungeonId !== null` 시 신 flow:
  - 몬스터 = `pickMonsterFromPool(dungeon.monsterPool, monsterLevel)`
  - monsterLevel = `getMonsterLevel(run.currentFloor)`
  - HP = `monsterLevel * 20 * monster.hpMult` (기존 `run.level` → `monsterLevel` 만 교체)
  - 적 ATK = `monsterLevel * 8`
  - 처치 시 → `setCurrentFloor(currentFloor + 1)` + `setScreen('dungeon-floors')` (stage threshold 무시)
  - 사망 시 BP defeat cost 도 `monsterLevel` 기반
- `run.currentDungeonId === null` 시 기존 구 flow 유지 (코드 변경 없음).
- `Dungeon.tsx` 헤더: 신 flow 시 던전+floor 표시.

- [ ] **Step 1: 실패 테스트 — Dungeon.tsx 신 flow 헤더**

`games/inflation-rpg/src/screens/Dungeon.test.tsx` 가 이미 있다면 새 describe 추가, 없으면 새 파일:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dungeon } from './Dungeon';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';

describe('Dungeon — new flow header', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'dungeon',
      run: {
        ...INITIAL_RUN,
        characterId: 'hwarang',
        currentDungeonId: 'plains',
        currentFloor: 7,
      },
      meta: { ...INITIAL_META },
    });
  });

  it('renders dungeon name + floor in new flow', () => {
    render(<Dungeon />);
    expect(screen.getByText(/평야/)).toBeInTheDocument();
    expect(screen.getByText(/F7|Floor 7/)).toBeInTheDocument();
  });
});
```

(기존 Dungeon.test.tsx 의 구 flow 테스트는 그대로 — `currentDungeonId === null` 케이스. 영향 없음.)

- [ ] **Step 2: 테스트 실행 — fail 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test Dungeon`
Expected: 신 flow 테스트 fail (기존 헤더는 area 못 찾으면 폴백 "구역을 찾을 수 없다").

- [ ] **Step 3: Dungeon.tsx 신 flow 헤더 분기**

`games/inflation-rpg/src/screens/Dungeon.tsx` 의 `if (!area) { ... }` 폴백 직전, area 찾기 직후에 신 flow 분기 추가. 기존 area 헤더 부분 전체를 다음으로 교체:

```tsx
import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { MAP_AREAS } from '../data/maps';
import { getDungeonById } from '../data/dungeons';
import { Battle } from './Battle';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { ForgePanel } from '@/components/ui/forge-panel';
import { ForgeButton } from '@/components/ui/forge-button';

export function Dungeon() {
  const run = useGameStore((s) => s.run);
  const setScreen = useGameStore((s) => s.setScreen);

  const isNewFlow = run.currentDungeonId !== null;
  const dungeon = isNewFlow ? getDungeonById(run.currentDungeonId!) : undefined;

  const area = useMemo(
    () => MAP_AREAS.find((a) => a.id === run.currentAreaId),
    [run.currentAreaId],
  );

  // 신 flow 진행 화면 — area 폴백 무시
  if (isNewFlow) {
    if (!dungeon) {
      return (
        <ForgeScreen>
          <ForgePanel style={{ margin: 16 }}>
            <p style={{ color: 'var(--forge-danger)' }}>던전을 찾을 수 없다.</p>
            <ForgeButton onClick={() => setScreen('town')}>마을로</ForgeButton>
          </ForgePanel>
        </ForgeScreen>
      );
    }
    return (
      <ForgeScreen>
        <div
          data-testid="dungeon-header"
          style={{
            padding: '14px 16px',
            background: 'var(--forge-bg-panel)',
            borderBottom: '1px solid var(--forge-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 700, color: 'var(--forge-accent)' }}>
            {dungeon.emoji} {dungeon.nameKR}
          </span>
          <span style={{ fontSize: 12, color: 'var(--forge-text-secondary)' }}>
            F{run.currentFloor}
          </span>
        </div>
        <Battle />
      </ForgeScreen>
    );
  }

  // 구 flow — 기존 area + stage 헤더
  if (!area) {
    return (
      <ForgeScreen>
        <ForgePanel style={{ margin: 16 }}>
          <p style={{ color: 'var(--forge-danger)' }}>구역을 찾을 수 없다.</p>
          <ForgeButton onClick={() => setScreen('world-map')}>월드맵</ForgeButton>
        </ForgePanel>
      </ForgeScreen>
    );
  }

  const isFinalStage = run.currentStage >= area.stageCount;
  const totalMonsters = area.stageMonsterCount * area.stageCount;
  const stageProgress = totalMonsters > 0
    ? Math.min(1, run.dungeonRunMonstersDefeated / totalMonsters)
    : 0;

  return (
    <ForgeScreen>
      <div
        data-testid="dungeon-header"
        style={{
          padding: '14px 16px',
          background: 'var(--forge-bg-panel)',
          borderBottom: '1px solid var(--forge-border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 700, color: 'var(--forge-accent)' }}>
            {area.nameKR}
          </span>
          <span style={{ fontSize: 12, color: 'var(--forge-text-secondary)' }}>
            Stage {run.currentStage} / {area.stageCount}
            {isFinalStage && area.finalStageIsBoss ? ' · BOSS' : ''}
          </span>
        </div>
        <div
          style={{
            height: 4,
            background: 'var(--forge-border)',
            marginTop: 8,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${stageProgress * 100}%`,
              height: '100%',
              background: isFinalStage
                ? 'var(--forge-danger)'
                : 'var(--forge-accent)',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>
      <Battle />
    </ForgeScreen>
  );
}
```

- [ ] **Step 4: Dungeon 테스트 통과 확인**

Run: `pnpm --filter @forge/game-inflation-rpg test Dungeon`
Expected: 새 신 flow 테스트 + 기존 구 flow 테스트 모두 PASS.

- [ ] **Step 5: BattleScene 신 flow 분기 — 몬스터 픽**

`games/inflation-rpg/src/battle/BattleScene.ts` 의 `create()` 메서드 (line 53 근처) 에서 monster 픽 부분:

```ts
} else {
  this.isBoss = false;
  const currentArea = MAP_AREAS.find(a => a.id === area);
  const monster = pickMonster(run.level, currentArea?.regionId);
  this.currentMonsterId = monster.id;
  this.enemyName = `${monster.emoji} ${monster.nameKR}`;
  this.enemyMaxHP = Math.floor(run.level * 20 * monster.hpMult);
}
```

이 블록을 교체. 또한 import 추가 (파일 상단):

```ts
import { pickMonster, pickMonsterFromPool } from '../data/monsters';
import { getDungeonById } from '../data/dungeons';
import { getFloorInfo } from '../data/floors';
```

create() 의 else 블록 (일반 몹) 을 다음으로 교체:

```ts
} else {
  this.isBoss = false;
  const isNewFlow = run.currentDungeonId !== null;
  if (isNewFlow) {
    const dungeon = getDungeonById(run.currentDungeonId!);
    const info = getFloorInfo(run.currentDungeonId!, run.currentFloor);
    const monsterLevel = info.monsterLevel;
    const monster = pickMonsterFromPool(dungeon!.monsterPool, monsterLevel);
    this.currentMonsterId = monster.id;
    this.enemyName = `${monster.emoji} ${monster.nameKR}`;
    this.enemyMaxHP = Math.floor(monsterLevel * 20 * monster.hpMult);
  } else {
    const currentArea = MAP_AREAS.find(a => a.id === area);
    const monster = pickMonster(run.level, currentArea?.regionId);
    this.currentMonsterId = monster.id;
    this.enemyName = `${monster.emoji} ${monster.nameKR}`;
    this.enemyMaxHP = Math.floor(run.level * 20 * monster.hpMult);
  }
}
```

또한 신 flow 에서는 보스 출현 25% 분기 (line 63) 도 무시해야 한다 (B-3α 는 보스 X). 보스 확률 분기를 다음으로 보강:

```ts
const isNewFlowOuter = run.currentDungeonId !== null;
if (!isNewFlowOuter && hasBoss && Math.random() < 0.25) {
  // ... 기존 보스 분기 그대로
} else {
  this.isBoss = false;
  // ... 위의 신/구 분기
}
```

(주의: `isNewFlow` 두 번 선언되지 않도록 outer 변수명 분리. 또는 outer 만 두고 inner 에서 재사용.)

- [ ] **Step 6: BattleScene doRound — 일반 몹 처치 시 신 flow 분기**

`doRound()` 의 enemyHP <= 0 블록 (line 137 근처). 일반 몹 처치 후 `if (!this.isBoss)` 블록 (line 156) 다음에 stage 진행 처리 (line 168 부터) 가 있다. 신 flow 시 stage threshold 대신 currentFloor + 1 + setScreen('dungeon-floors').

기존 stage 진행 코드 (line 168~181):

```ts
const stateAfterKill = useGameStore.getState();
const currentRun = stateAfterKill.run;
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
```

다음으로 교체:

```ts
const stateAfterKill = useGameStore.getState();
const currentRun = stateAfterKill.run;

if (currentRun.currentDungeonId !== null) {
  // 신 flow — 1 floor = 1 처치 → 다음 floor 로 + DungeonFloors 로 복귀
  this.combatTimer?.remove();
  stateAfterKill.setCurrentFloor(currentRun.currentFloor + 1);
  stateAfterKill.setScreen('dungeon-floors');
  return;
} else {
  // 구 flow — stage threshold 진행
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
}
```

(combatTimer 제거 + return 으로 onLevelUp / onBattleEnd 호출 안 됨에 주의 — 하지만 setScreen 이 React 가 BattleScene unmount 시키므로 OK. 단 spGained 처리는 setScreen 전에 호출되도록 보강 필요.)

**보강** — spGained / level-up 콜백을 setScreen 전에 처리. 위 코드 직전 단계의 `gainLevels` / `gainExp` 처리는 그대로 두되, `if (spGained > 0) callbacks.onLevelUp` 발동도 신 flow 진입 전에 처리되도록. 기존 line 183-187 (`if (spGained > 0)`) 가 이미 신/구 분기 *뒤에* 위치한 게 문제. 신 flow return 전에 먼저 해소:

수정안 — 신 flow 분기를 다음과 같이:

```ts
if (currentRun.currentDungeonId !== null) {
  this.combatTimer?.remove();
  if (spGained > 0) {
    playSfx('levelup');
    this.callbacks.onLevelUp(newLevel);
  }
  stateAfterKill.setCurrentFloor(currentRun.currentFloor + 1);
  stateAfterKill.setScreen('dungeon-floors');
  return;
}
// 구 flow — stage threshold 진행
const area = MAP_AREAS.find(a => a.id === currentRun.currentAreaId);
// ... 기존 ...
```

그리고 구 flow 의 `if (spGained > 0)` 도 그대로 유지.

- [ ] **Step 7: BattleScene doRound — 사망 시 신 flow 분기**

`doRound()` 의 사망 처리 (line 197-211) 에서 `monsterLevel = run.level` 인 부분:

```ts
if (currentHPEstimate <= 0) {
  this.combatTimer?.remove();
  playSfx('defeat');
  const monsterLevel = run.level;
  const newBP = onDefeat(run.bp, monsterLevel, run.isHardMode);
  ...
}
```

다음으로 교체:

```ts
if (currentHPEstimate <= 0) {
  this.combatTimer?.remove();
  playSfx('defeat');
  const monsterLevel = run.currentDungeonId !== null
    ? getFloorInfo(run.currentDungeonId, run.currentFloor).monsterLevel
    : run.level;
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

- [ ] **Step 8: BattleScene doRound — 적 ATK 도 신 flow 시 monsterLevel**

`doRound()` 의 line 192 근처:

```ts
const enemyATK = Math.floor(run.level * 8 * (this.isBoss ? 2 : 1));
```

다음으로 교체:

```ts
const monsterLevelForAtk = run.currentDungeonId !== null
  ? getFloorInfo(run.currentDungeonId, run.currentFloor).monsterLevel
  : run.level;
const enemyATK = Math.floor(monsterLevelForAtk * 8 * (this.isBoss ? 2 : 1));
```

- [ ] **Step 9: typecheck + 테스트 실행**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg test`
Expected: 0 type errors, all tests PASS.

기존 BattleScene 테스트가 `currentDungeonId: null` 로 setup 되어 있을 것이므로 구 flow 그대로 검증. 깨지면 setup 확인.

- [ ] **Step 10: 수동 dev 검증**

`pnpm dev` 로:
- 마을 → 던전 (예: 평야) → ClassSelect → 캐릭터 선택 → DungeonFloors (floor 1 만 활성) → floor 1 클릭 → BattleScene 진입, 평야 풀 몬스터 출현 (예: plains-imp), HP/ATK 가 monsterLevel(1) 기반.
- 처치 → DungeonFloors 로 자동 복귀, currentFloor 가 2 가 됨, floor 2 활성.
- floor 2 클릭 → 다시 전투, monsterLevel 이 floor 2 기반으로 약간 상승.

- [ ] **Step 11: Commit**

```bash
git add games/inflation-rpg/src/battle/BattleScene.ts games/inflation-rpg/src/screens/Dungeon.tsx games/inflation-rpg/src/screens/Dungeon.test.tsx
git commit -m "feat(game-inflation-rpg): BattleScene+Dungeon new flow branch (monsterPool + floor level)"
```

---

## Task 6: MainMenu — 구 flow 진입로 차단

**Files:**
- Modify: `games/inflation-rpg/src/screens/MainMenu.tsx`
- Modify: `games/inflation-rpg/src/screens/MainMenu.test.tsx` (있으면)

목표:
- `hasActiveRun` X 시: "게임 시작" / "하드모드" 버튼 제거. "마을로" 만 노출.
- `hasActiveRun` 시: "런 이어하기" 가 `currentDungeonId !== null` 시 dungeon-floors 로, 아니면 town 으로 (구 flow 진입 차단). "새로 시작" 은 abandonRun + class-select 유지 (단 abandonRun 시 currentDungeonId 도 null 화 — 마을 선택 강제).

- [ ] **Step 1: 실패 테스트 (선택적, 패턴 따라)**

기존 MainMenu.test.tsx 가 있는지 확인. 없으면 생략, 있으면 추가:

```tsx
it('MainMenu: hasActiveRun X 시 "게임 시작" 버튼 안 보인다', () => {
  useGameStore.setState({
    run: { ...INITIAL_RUN }, // characterId === ''
    meta: { ...INITIAL_META },
  });
  render(<MainMenu />);
  expect(screen.queryByText(/게임 시작/)).not.toBeInTheDocument();
  expect(screen.queryByText(/하드모드/)).not.toBeInTheDocument();
  expect(screen.getByText(/마을로/)).toBeInTheDocument();
});

it('MainMenu: hasActiveRun + currentDungeonId 시 "이어하기" 가 dungeon-floors 로 라우팅', () => {
  useGameStore.setState({
    run: { ...INITIAL_RUN, characterId: 'hwarang', currentDungeonId: 'plains' },
    meta: { ...INITIAL_META },
  });
  render(<MainMenu />);
  fireEvent.click(screen.getByText(/이어하기/));
  expect(useGameStore.getState().screen).toBe('dungeon-floors');
});
```

- [ ] **Step 2: MainMenu.tsx 수정**

기존 hasActiveRun 분기 (line 38-67) 를 다음으로 교체:

```tsx
{hasActiveRun ? (
  <>
    <ForgeButton
      variant="primary"
      onClick={() => {
        const dungeonId = useGameStore.getState().run.currentDungeonId;
        setScreen(dungeonId !== null ? 'dungeon-floors' : 'town');
      }}
    >
      런 이어하기
    </ForgeButton>
    <ForgeButton
      variant="secondary"
      onClick={() => { abandonRun(); setScreen('town'); }}
    >
      새로 시작
    </ForgeButton>
  </>
) : (
  <ForgeButton variant="primary" onClick={() => setScreen('town')}>
    🏘️ 마을로
  </ForgeButton>
)}
```

(B-2 의 "(B-2 신규)" 표기 제거. "게임 시작" / "하드모드" 버튼 삭제. "새로 시작" 도 abandonRun → town 으로. ClassSelect 진입은 town 의 던전 선택을 통해서만.)

또한 `abandonRun` 후 `currentDungeonId` 도 reset 되어야 함. `gameStore.ts` 의 `abandonRun` 액션 확인:

```ts
abandonRun: () => set({ run: INITIAL_RUN, screen: 'main-menu' }),
```

`INITIAL_RUN.currentDungeonId === null` 이므로 자동 null 화. OK.

- [ ] **Step 3: 테스트 + typecheck**

Run: `pnpm --filter @forge/game-inflation-rpg test MainMenu && pnpm --filter @forge/game-inflation-rpg typecheck`
Expected: PASS.

- [ ] **Step 4: 기존 MainMenu 테스트 영향 점검**

MainMenu.test.tsx 가 "게임 시작" 버튼 클릭 같은 케이스를 가졌다면 깨질 것. 그 테스트들은 **삭제 또는 town 진입 테스트로 변경** (구 flow 차단 의도에 정합).

- [ ] **Step 5: 수동 dev 검증**

main-menu 에서 "게임 시작" / "하드모드" 가 없는지, "마을로" 만 있는지. hasActiveRun 시 "런 이어하기" → dungeon-floors 로 가는지.

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/src/screens/MainMenu.tsx games/inflation-rpg/src/screens/MainMenu.test.tsx
git commit -m "feat(game-inflation-rpg): MainMenu only exposes new flow entry (마을로)"
```

---

## Task 7: E2E smoke — 던전 진입 flow

**Files:**
- Create: `games/inflation-rpg/e2e/dungeon-flow.spec.ts`

(기존 e2e 디렉토리 패턴 확인 — `games/inflation-rpg/e2e/full-game-flow.spec.ts` 같은 게 있다면 그 패턴 따라.)

- [ ] **Step 1: e2e spec 작성**

```ts
import { test, expect } from '@playwright/test';

test('Phase B-3α dungeon flow smoke — town → DungeonFloors → battle', async ({ page }) => {
  await page.goto('/');

  // 메인 메뉴 → 마을로
  await page.getByRole('button', { name: /마을로/ }).click();

  // 마을 → 평야 던전 입장
  await page.getByTestId('town-dungeon-plains').getByRole('button', { name: '입장' }).click();

  // ClassSelect → 화랑 (또는 무난한 첫 캐릭터) 선택
  await page.getByText('화랑').first().click();
  await page.getByRole('button', { name: /시작|확인/ }).click();

  // DungeonFloors 화면 확인
  await expect(page.getByText(/평야/)).toBeVisible();
  await expect(page.getByTestId('floor-card-1')).toBeVisible();
  await expect(page.getByTestId('floor-card-2')).toBeDisabled();

  // floor 1 진입 → battle
  await page.getByTestId('floor-card-1').click();
  // 던전 화면 전환 (BattleScene canvas 또는 dungeon-header 표시)
  await expect(page.getByTestId('dungeon-header')).toBeVisible();
});
```

(ClassSelect 의 정확한 button label / character selection UX 는 실제 화면에서 확인 후 보강. 이 spec 은 smoke 로 entry 까지만 확인.)

- [ ] **Step 2: e2e 실행**

Run: `pnpm --filter @forge/game-inflation-rpg e2e dungeon-flow`
Expected: PASS. 실패 시 selector / button label 조정.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/e2e/dungeon-flow.spec.ts
git commit -m "test(game-inflation-rpg): E2E smoke for new dungeon flow"
```

---

## Final Validation

- [ ] **Step 1: Full test 실행**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg lint && pnpm --filter @forge/game-inflation-rpg test`
Expected: 0 errors, 모든 테스트 PASS (236 + 신규 ~10 = 246 정도).

- [ ] **Step 2: 전체 레포 검증**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm circular`
Expected: 0 errors, 0 circular deps, all tests PASS.

- [ ] **Step 3: 수동 end-to-end 플레이**

`pnpm dev` 로:
1. 메인 메뉴 → 마을로
2. 평야 던전 입장 → 캐릭터 선택 (화랑)
3. DungeonFloors: floor 1 활성, 2-30 잠금
4. floor 1 클릭 → BattleScene 평야 풀 몬스터 출현
5. 처치 → DungeonFloors 자동 복귀, floor 2 잠금 풀림
6. floor 2 진입 → 약간 더 강한 몹
7. 마을로 → currentDungeonId 클리어 → 깊은숲 선택 → 같은 흐름

- [ ] **Step 4: Phase 태그**

```bash
git tag phase-b3a-complete
```

---

## Out of scope (B-3β / 후속)

다음 기능은 B-3α 에서 **의도적으로 제외**:
- 보스 floor (5/10/15/20/25/30) 차별화 — `dungeon.bossIds` 필드, 보스 풀, 처치 시 1회 영구 보상 (`MetaState.dungeonFinalsCleared`).
- `MetaState.dungeonProgress[id].maxFloor` 영구 추적 (런 종료 후 다음 런에서 도달 floor 표시 등).
- 자동 하강 UX (floor 클릭 없이 자동 다음 floor 진입).
- 31+ 심층 floor (procedural).
- 인플레이션 곡선 (HP=100×1.4^L 등 spec 11.2 Curve 2 도입). 현재는 기존 `monsterLevel * 20 * monster.hpMult` 유지.
- 구 flow 코드 (`WorldMap.tsx`, `RegionMap.tsx`, `regions.ts`, `maps.ts`, region-based `pickMonster`, `currentAreaId`) 제거 — 진입로만 차단됨, 코드 자체는 dormant. **B-3β 에서 일괄 정리.**
- 차원 나침반 (자유 던전 선택) — Section 2.4 spec 영역.
