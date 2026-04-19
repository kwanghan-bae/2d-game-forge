# Inflation RPG Phase 2.5 — 게임 완성도 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** inflation-rpg의 런 상태를 localStorage에 유지하고(새로고침에 살아남음), 활성 런이 있으면 MainMenu에서 이어하기/포기 선택지를 제공하며, WorldMap에서 레벨 미달 구역을 잠근다.

**Architecture:** 세 파일만 변경한다 — `gameStore.ts`에 `run` persist와 `abandonRun()` 추가, `MainMenu.tsx`에 활성 런 감지 UI 분기 추가, `WorldMap.tsx`의 레벨 게이팅 조건을 `levelRange[0] * 0.5`에서 `levelRange[0]`으로 강화하고 잠금 표시 추가. 타입·데이터 파일은 변경 없음.

**Tech Stack:** Zustand 5, React 18, @testing-library/react, Vitest 4

---

## File Map

| 파일 | 역할 |
|------|------|
| `games/inflation-rpg/src/store/gameStore.ts` | `abandonRun()` 추가, `partialize`에 `run` 포함 |
| `games/inflation-rpg/src/screens/MainMenu.tsx` | 활성 런 감지 → 이어하기/새로 시작 분기 |
| `games/inflation-rpg/src/screens/WorldMap.tsx` | 레벨 게이팅 조건 강화 + 잠금 UI |
| `games/inflation-rpg/src/store/gameStore.test.ts` | `abandonRun` 테스트 추가 |
| `games/inflation-rpg/src/screens/MainMenu.test.tsx` | 이어하기/새로 시작 테스트 추가 |
| `games/inflation-rpg/src/screens/WorldMap.test.tsx` | 레벨 게이팅 테스트 추가 |

---

## Task 1: gameStore — `abandonRun()` + run persist

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts`
- Test: `games/inflation-rpg/src/store/gameStore.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/store/gameStore.test.ts` 파일 끝에 추가:

```ts
it('abandonRun: resets run to INITIAL_RUN and screen to main-menu', () => {
  useGameStore.getState().startRun('hwarang', false);
  useGameStore.getState().gainLevels(50, 100);
  useGameStore.getState().abandonRun();
  const state = useGameStore.getState();
  expect(state.run.characterId).toBe('');
  expect(state.run.level).toBe(1);
  expect(state.run.statPoints).toBe(0);
  expect(state.screen).toBe('main-menu');
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run src/store/gameStore.test.ts
```

Expected: FAIL — `useGameStore.getState().abandonRun is not a function`

- [ ] **Step 3: `abandonRun` 구현 + run persist 추가**

`games/inflation-rpg/src/store/gameStore.ts`를 다음과 같이 수정:

**Interface에 추가 (line 46 근처, `endRun` 다음):**

```ts
interface GameStore {
  screen: Screen;
  run: RunState;
  meta: MetaState;
  setScreen: (s: Screen) => void;
  startRun: (characterId: string, isHardMode: boolean) => void;
  endRun: () => void;
  abandonRun: () => void;              // ← 추가
  encounterMonster: () => void;
  defeatRun: () => void;
  gainLevels: (levels: number, spGained: number) => void;
  gainExp: (exp: number) => void;
  allocateSP: (stat: keyof AllocatedStats, amount: number) => void;
  bossDrop: (bossId: string, bpReward: number) => void;
  addEquipment: (item: Equipment) => void;
  sellEquipment: (itemId: string, price: number) => void;
}
```

**Store 구현에 추가 (line 76 근처, `endRun` 다음):**

```ts
      abandonRun: () => set({ run: INITIAL_RUN, screen: 'main-menu' }),
```

**partialize 변경 (file 마지막 부분):**

```ts
    {
      name: 'korea_inflation_rpg_save',
      partialize: (state) => ({ meta: state.meta, run: state.run }),
    }
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run src/store/gameStore.test.ts
```

Expected: `8 tests passed` (기존 7 + 신규 1)

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts
git commit -m "feat(game-inflation-rpg): persist run state, add abandonRun action"
```

---

## Task 2: MainMenu — 이어하기 / 새로 시작 UI

**Files:**
- Modify: `games/inflation-rpg/src/screens/MainMenu.tsx`
- Test: `games/inflation-rpg/src/screens/MainMenu.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/screens/MainMenu.test.tsx`를 다음으로 교체:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { MainMenu } from './MainMenu';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';

const activeRun = { ...INITIAL_RUN, characterId: 'hwarang', level: 15 };

beforeEach(() => {
  useGameStore.setState({ screen: 'main-menu', run: INITIAL_RUN, meta: INITIAL_META });
});

describe('MainMenu — no active run', () => {
  it('renders game title', () => {
    render(<MainMenu />);
    expect(screen.getByText(/INFLATION/i)).toBeInTheDocument();
  });

  it('게임 시작 button navigates to class-select', async () => {
    render(<MainMenu />);
    await userEvent.click(screen.getByRole('button', { name: /게임 시작/i }));
    expect(useGameStore.getState().screen).toBe('class-select');
  });

  it('인벤토리 button navigates to inventory', async () => {
    render(<MainMenu />);
    await userEvent.click(screen.getByRole('button', { name: /인벤토리/i }));
    expect(useGameStore.getState().screen).toBe('inventory');
  });

  it('런 이어하기 button is NOT shown when no active run', () => {
    render(<MainMenu />);
    expect(screen.queryByRole('button', { name: /런 이어하기/i })).not.toBeInTheDocument();
  });
});

describe('MainMenu — active run exists', () => {
  beforeEach(() => {
    useGameStore.setState({ screen: 'main-menu', run: activeRun, meta: INITIAL_META });
  });

  it('런 이어하기 button is shown when active run exists', () => {
    render(<MainMenu />);
    expect(screen.getByRole('button', { name: /런 이어하기/i })).toBeInTheDocument();
  });

  it('게임 시작 button is NOT shown when active run exists', () => {
    render(<MainMenu />);
    expect(screen.queryByRole('button', { name: /게임 시작/i })).not.toBeInTheDocument();
  });

  it('런 이어하기 navigates to world-map', async () => {
    render(<MainMenu />);
    await userEvent.click(screen.getByRole('button', { name: /런 이어하기/i }));
    expect(useGameStore.getState().screen).toBe('world-map');
  });

  it('새로 시작 resets run and navigates to class-select', async () => {
    render(<MainMenu />);
    await userEvent.click(screen.getByRole('button', { name: /새로 시작/i }));
    const state = useGameStore.getState();
    expect(state.run.characterId).toBe('');
    expect(state.screen).toBe('class-select');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run src/screens/MainMenu.test.tsx
```

Expected: 4개 이상 FAIL — `런 이어하기` 버튼이 없으므로

- [ ] **Step 3: MainMenu 구현**

`games/inflation-rpg/src/screens/MainMenu.tsx`를 다음으로 교체:

```tsx
import React from 'react';
import { useGameStore } from '../store/gameStore';

export function MainMenu() {
  const setScreen = useGameStore((s) => s.setScreen);
  const abandonRun = useGameStore((s) => s.abandonRun);
  const meta = useGameStore((s) => s.meta);
  const runCharacterId = useGameStore((s) => s.run.characterId);

  const hasActiveRun = runCharacterId !== '';

  return (
    <div className="screen" style={{ background: 'linear-gradient(180deg,#1a1030 0%,#0f0f1a 100%)', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--accent)', letterSpacing: 2 }}>
          INFLATION
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--danger)', letterSpacing: 2 }}>
          RPG
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          배틀 포인트를 소비해 최고 레벨을 달성하라
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 200 }}>
        {hasActiveRun ? (
          <>
            <button className="btn-primary" onClick={() => setScreen('world-map')}>
              런 이어하기
            </button>
            <button
              className="btn-secondary"
              onClick={() => { abandonRun(); setScreen('class-select'); }}
            >
              새로 시작
            </button>
          </>
        ) : (
          <>
            <button className="btn-primary" onClick={() => setScreen('class-select')}>
              게임 시작
            </button>
            {meta.hardModeUnlocked && (
              <button
                className="btn-primary"
                style={{ background: 'var(--danger)' }}
                onClick={() => setScreen('class-select')}
              >
                하드모드
              </button>
            )}
          </>
        )}
        <button className="btn-secondary" onClick={() => setScreen('inventory')}>
          인벤토리
        </button>
        <button className="btn-secondary" onClick={() => setScreen('shop')}>
          상점
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
        최고 기록: Lv.{meta.bestRunLevel.toLocaleString()}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run src/screens/MainMenu.test.tsx
```

Expected: `7 tests passed`

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/screens/MainMenu.tsx games/inflation-rpg/src/screens/MainMenu.test.tsx
git commit -m "feat(game-inflation-rpg): show resume/abandon options when active run exists"
```

---

## Task 3: WorldMap — 레벨 게이팅 강화

**Files:**
- Modify: `games/inflation-rpg/src/screens/WorldMap.tsx`
- Test: `games/inflation-rpg/src/screens/WorldMap.test.tsx`

**배경:** 현재 코드는 `run.level >= area.levelRange[0] * 0.5`로 50% 완화된 조건을 쓴다. 스펙은 `run.level >= area.levelRange[0]` (정확한 최솟값)으로 강화하고, 잠긴 구역은 오른쪽에 `"Lv.X 필요"` 빨간 텍스트를 표시한다.

`주막 거리`의 `levelRange[0]`은 30이다. 레벨 15 캐릭터는 현재 코드(`>= 15`)에서 진입 가능하지만, 변경 후(`>= 30`)에는 잠겨야 한다.

- [ ] **Step 1: 실패 테스트 작성**

`games/inflation-rpg/src/screens/WorldMap.test.tsx`를 다음으로 교체:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { WorldMap } from './WorldMap';
import { useGameStore, INITIAL_META } from '../store/gameStore';

const runWithChar = {
  characterId: 'hwarang', level: 1, exp: 0, bp: 28, statPoints: 0,
  allocated: { hp: 0, atk: 0, def: 0, agi: 0, luc: 0 },
  currentAreaId: 'village-entrance', isHardMode: false,
  monstersDefeated: 0, goldThisRun: 0,
};

beforeEach(() => {
  useGameStore.setState({ screen: 'world-map', run: runWithChar, meta: INITIAL_META });
});

describe('WorldMap', () => {
  it('shows current BP', () => {
    render(<WorldMap />);
    expect(screen.getByText(/BP.*28/i)).toBeInTheDocument();
  });

  it('shows current level', () => {
    render(<WorldMap />);
    expect(screen.getByText(/Lv.*1/i)).toBeInTheDocument();
  });

  it('마을 입구 (minLevel 1) is accessible at level 1', () => {
    render(<WorldMap />);
    expect(screen.getByRole('button', { name: /마을 입구/i })).not.toBeDisabled();
  });

  it('주막 거리 (minLevel 30) is locked at level 15', () => {
    useGameStore.setState({ run: { ...runWithChar, level: 15 } });
    render(<WorldMap />);
    const btn = screen.getByRole('button', { name: /주막 거리/i });
    expect(btn).toBeDisabled();
  });

  it('주막 거리 shows Lv.30 필요 text when locked', () => {
    render(<WorldMap />); // level 1
    expect(screen.getByText(/Lv\.30 필요/i)).toBeInTheDocument();
  });

  it('주막 거리 is accessible at exactly level 30', () => {
    useGameStore.setState({ run: { ...runWithChar, level: 30 } });
    render(<WorldMap />);
    expect(screen.getByRole('button', { name: /주막 거리/i })).not.toBeDisabled();
  });

  it('entering area triggers battle screen after BP deduct', async () => {
    render(<WorldMap />);
    await userEvent.click(screen.getByRole('button', { name: /마을 입구/i }));
    const state = useGameStore.getState();
    expect(state.screen).toBe('battle');
    expect(state.run.bp).toBe(27); // 28 - 1
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run src/screens/WorldMap.test.tsx
```

Expected: `주막 거리 (minLevel 30) is locked at level 15` FAIL (현재 `* 0.5` 조건으로 level 15에서 unlock됨)
Expected: `주막 거리 shows Lv.30 필요 text` FAIL (해당 텍스트 없음)

- [ ] **Step 3: WorldMap 구현**

`games/inflation-rpg/src/screens/WorldMap.tsx`를 다음으로 교체:

```tsx
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { getAvailableAreas } from '../data/maps';
import { isRunOver } from '../systems/bp';
import type { MapArea } from '../types';

export function WorldMap() {
  const run = useGameStore((s) => s.run);
  const setScreen = useGameStore((s) => s.setScreen);
  const encounterMonster = useGameStore((s) => s.encounterMonster);
  const endRun = useGameStore((s) => s.endRun);

  const areas = getAvailableAreas(run.isHardMode);

  const enterArea = (area: MapArea) => {
    encounterMonster(); // BP -1
    if (isRunOver(run.bp - 1)) {
      endRun();
      return;
    }
    useGameStore.setState((s) => ({ run: { ...s.run, currentAreaId: area.id } }));
    setScreen('battle');
  };

  return (
    <div className="screen" style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ background: 'var(--bg-card)', border: '1px solid #2a4060', borderRadius: 6, padding: '4px 12px', color: 'var(--bp-color)', fontWeight: 700, fontSize: 14 }}>
          ⚡ BP: {run.bp}
        </span>
        <span style={{ background: 'var(--bg-card)', border: '1px solid #2a4a2a', borderRadius: 6, padding: '4px 12px', color: 'var(--hp-color)', fontWeight: 700, fontSize: 14 }}>
          Lv.{run.level.toLocaleString()}
        </span>
      </div>

      {/* Area list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {areas.map((area) => {
          const isLocked = run.level < area.levelRange[0];
          return (
            <button
              key={area.id}
              role="button"
              aria-label={area.nameKR}
              disabled={isLocked}
              onClick={isLocked ? undefined : () => enterArea(area)}
              style={{
                background: area.bossId ? '#1a0a0a' : 'var(--bg-card)',
                border: `1px solid ${area.bossId ? 'var(--danger)' : 'var(--border)'}`,
                borderRadius: 8,
                padding: '10px 14px',
                textAlign: 'left',
                cursor: isLocked ? 'default' : 'pointer',
                opacity: isLocked ? 0.4 : 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 700, color: area.bossId ? 'var(--danger)' : 'var(--text-secondary)' }}>
                {area.nameKR}
                {area.bossId && <span style={{ fontSize: 10, background: 'var(--danger)', color: '#fff', borderRadius: 3, padding: '0 5px', marginLeft: 6 }}>BOSS</span>}
              </span>
              {isLocked ? (
                <span style={{ fontSize: 11, color: 'var(--danger)' }}>
                  Lv.{area.levelRange[0].toLocaleString()} 필요
                </span>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {area.levelRange[0].toLocaleString()}~{area.levelRange[1] === Infinity ? '∞' : area.levelRange[1].toLocaleString()}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom nav */}
      <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', gap: 8 }}>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setScreen('inventory')}>
          인벤토리
        </button>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setScreen('shop')}>
          상점
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run src/screens/WorldMap.test.tsx
```

Expected: `7 tests passed`

- [ ] **Step 5: 전체 테스트 확인**

```bash
cd games/inflation-rpg && pnpm exec vitest run
```

Expected: `10 test files passed`, `62+ tests passed` (기존 60 + Task 1의 1 + Task 2의 4 + Task 3의 3)

- [ ] **Step 6: typecheck 확인**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors

- [ ] **Step 7: 커밋**

```bash
git add games/inflation-rpg/src/screens/WorldMap.tsx games/inflation-rpg/src/screens/WorldMap.test.tsx
git commit -m "feat(game-inflation-rpg): enforce level gating on world map areas"
```

---

## 최종 완료 체크리스트

- [ ] `pnpm --filter @forge/game-inflation-rpg test` — 62개 이상 통과
- [ ] `pnpm --filter @forge/game-inflation-rpg typecheck` — 0 errors
- [ ] `pnpm --filter @forge/game-inflation-rpg lint` — 0 errors
- [ ] `pnpm circular` — No circular dependency found
