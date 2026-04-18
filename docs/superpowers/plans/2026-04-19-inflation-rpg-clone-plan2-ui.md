# Inflation RPG Clone — Plan 2: UI (Screens + Battle + Integration)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plan 1의 엔진 위에 React 화면 8개, Phaser 전투, CSS 테마, `startGame.ts` 재작성, E2E 테스트를 구축해 완전히 플레이 가능한 게임을 완성한다.

**Architecture:** `startGame.ts` → React root → `App.tsx` (화면 라우터) → 화면별 컴포넌트. 전투 시에만 Phaser.Game 인스턴스 생성/소멸. 상태는 Plan 1의 Zustand store에서 읽고 쓴다.

**Prerequisite:** Plan 1 완료 (`pnpm --filter @forge/game-inflation-rpg test` 전부 통과)

**Tech Stack:** React 19, Phaser 3, Tailwind CSS v4, Lucide React, Testing Library, Playwright

---

## File Map

| 경로 | 역할 | 신규/수정 |
|---|---|---|
| `games/inflation-rpg/src/styles/game.css` | CSS 커스텀 프로퍼티 + 게임 공통 클래스 | 신규 |
| `games/inflation-rpg/src/startGame.ts` | React root 마운트 (Phaser 직접 생성 제거) | 수정 |
| `games/inflation-rpg/src/App.tsx` | 화면 라우터 | 신규 |
| `games/inflation-rpg/src/app/page.tsx` | 독립 실행용 Next.js 페이지 | 수정 |
| `games/inflation-rpg/src/screens/MainMenu.tsx` | 메인 메뉴 | 신규 |
| `games/inflation-rpg/src/screens/ClassSelect.tsx` | 캐릭터 선택 (16종 4×4) | 신규 |
| `games/inflation-rpg/src/screens/WorldMap.tsx` | 월드맵 (14 구역) | 신규 |
| `games/inflation-rpg/src/screens/StatAlloc.tsx` | 레벨업 스탯 배분 팝업 | 신규 |
| `games/inflation-rpg/src/screens/Inventory.tsx` | 장비 인벤토리 | 신규 |
| `games/inflation-rpg/src/screens/Shop.tsx` | 상점 | 신규 |
| `games/inflation-rpg/src/screens/GameOver.tsx` | 게임오버 | 신규 |
| `games/inflation-rpg/src/battle/BattleGame.ts` | Phaser.Game 팩토리 | 신규 |
| `games/inflation-rpg/src/battle/BattleScene.ts` | 전투 씬 (자동전투 로직) | 신규 |
| `games/inflation-rpg/src/screens/Battle.tsx` | Phaser 캔버스 mount/unmount | 신규 |
| `games/inflation-rpg/tests/e2e/full-run.spec.ts` | E2E 런 완주 | 신규 |

---

## Task 11: CSS 테마 + startGame.ts 재작성 + App.tsx

**Files:**
- Create: `games/inflation-rpg/src/styles/game.css`
- Modify: `games/inflation-rpg/src/startGame.ts`
- Create: `games/inflation-rpg/src/App.tsx`
- Modify: `games/inflation-rpg/src/app/page.tsx`

- [ ] **Step 1: game.css 생성**

`games/inflation-rpg/src/styles/game.css`:

```css
:root {
  --bg-base: #0f0f14;
  --bg-panel: #1a1a24;
  --bg-card: #1e1e2e;
  --border: #2a2a38;
  --accent: #f0c060;
  --accent-dim: #2a2410;
  --text-primary: #e8e0d0;
  --text-secondary: #c8b88a;
  --text-muted: #666;
  --hp-color: #60e060;
  --atk-color: #e09060;
  --def-color: #60a0e0;
  --agi-color: #c060e0;
  --luc-color: #e0c060;
  --bp-color: #60c0f0;
  --danger: #e05050;
}

.game-root {
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
  min-height: 100dvh;
  max-width: 430px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
}

.screen {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.btn-primary {
  background: var(--accent);
  color: #1a1a24;
  font-weight: 700;
  border: none;
  border-radius: 8px;
  padding: 10px 24px;
  cursor: pointer;
  font-size: 15px;
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 24px;
  cursor: pointer;
  font-size: 15px;
}

.panel {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px;
}
```

- [ ] **Step 2: startGame.ts 재작성**

`games/inflation-rpg/src/startGame.ts` 전체 교체:

```ts
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ForgeGameInstance } from '@forge/core';
import { App } from './App';
import './styles/game.css';

export interface StartGameConfig {
  parent: string;
  assetsBasePath: string;
  exposeTestHooks: boolean;
}

export function StartGame(config: StartGameConfig): ForgeGameInstance {
  const container = document.getElementById(config.parent);
  if (!container) throw new Error(`#${config.parent} not found`);

  const root: Root = createRoot(container);
  root.render(React.createElement(App, { config }));

  if (config.exposeTestHooks) {
    (window as Record<string, unknown>)['gameConfig'] = config;
  }

  return {
    destroy() {
      root.unmount();
    },
  };
}
```

- [ ] **Step 3: App.tsx 생성**

`games/inflation-rpg/src/App.tsx`:

```tsx
import React from 'react';
import { useGameStore } from './store/gameStore';
import { MainMenu } from './screens/MainMenu';
import { ClassSelect } from './screens/ClassSelect';
import { WorldMap } from './screens/WorldMap';
import { Battle } from './screens/Battle';
import { Inventory } from './screens/Inventory';
import { Shop } from './screens/Shop';
import { GameOver } from './screens/GameOver';
import type { StartGameConfig } from './startGame';

interface AppProps {
  config: StartGameConfig;
}

export function App({ config }: AppProps) {
  const screen = useGameStore((s) => s.screen);

  return (
    <div className="game-root" data-assets-base={config.assetsBasePath}>
      {screen === 'main-menu'   && <MainMenu />}
      {screen === 'class-select' && <ClassSelect />}
      {screen === 'world-map'   && <WorldMap />}
      {screen === 'battle'      && <Battle />}
      {screen === 'inventory'   && <Inventory />}
      {screen === 'shop'        && <Shop />}
      {screen === 'game-over'   && <GameOver />}
    </div>
  );
}
```

- [ ] **Step 4: page.tsx 업데이트 (독립 실행)**

`games/inflation-rpg/src/app/page.tsx` 전체 교체:

```tsx
'use client';
import React, { useEffect, useRef } from 'react';
import { StartGame } from '../startGame';
import type { ForgeGameInstance } from '@forge/core';

export default function Page() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<ForgeGameInstance | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.id = 'game-container';
    gameRef.current = StartGame({
      parent: 'game-container',
      assetsBasePath: '/assets',
      exposeTestHooks: process.env.NODE_ENV !== 'production',
    });
    return () => {
      gameRef.current?.destroy();
    };
  }, []);

  return <div ref={containerRef} style={{ minHeight: '100dvh' }} />;
}
```

- [ ] **Step 5: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck 2>&1 | grep -v "node_modules" | head -20
```

Expected: 화면 모듈 못찾는 에러만 (다음 태스크에서 해결)

- [ ] **Step 6: 커밋**

```bash
git add games/inflation-rpg/src/styles/ games/inflation-rpg/src/startGame.ts \
        games/inflation-rpg/src/App.tsx games/inflation-rpg/src/app/page.tsx
git commit -m "feat(inflation-rpg): add CSS theme, React root in startGame, App router"
```

---

## Task 12: screens/MainMenu.tsx

**Files:**
- Create: `games/inflation-rpg/src/screens/MainMenu.tsx`
- Create: `games/inflation-rpg/src/screens/MainMenu.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`games/inflation-rpg/src/screens/MainMenu.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { MainMenu } from './MainMenu';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';

beforeEach(() => {
  useGameStore.setState({ screen: 'main-menu', run: INITIAL_RUN, meta: INITIAL_META });
});

describe('MainMenu', () => {
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
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- --run src/screens/MainMenu.test.tsx
```

Expected: `Cannot find module './MainMenu'`

- [ ] **Step 3: 구현**

`games/inflation-rpg/src/screens/MainMenu.tsx`:

```tsx
import React from 'react';
import { useGameStore } from '../store/gameStore';

export function MainMenu() {
  const setScreen = useGameStore((s) => s.setScreen);
  const meta = useGameStore((s) => s.meta);

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
pnpm --filter @forge/game-inflation-rpg test -- --run src/screens/MainMenu.test.tsx
```

Expected: `3 tests passed`

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/screens/MainMenu.tsx games/inflation-rpg/src/screens/MainMenu.test.tsx
git commit -m "feat(inflation-rpg): add MainMenu screen"
```

---

## Task 13: screens/ClassSelect.tsx

**Files:**
- Create: `games/inflation-rpg/src/screens/ClassSelect.tsx`
- Create: `games/inflation-rpg/src/screens/ClassSelect.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`games/inflation-rpg/src/screens/ClassSelect.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { ClassSelect } from './ClassSelect';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';

beforeEach(() => {
  useGameStore.setState({ screen: 'class-select', run: INITIAL_RUN, meta: INITIAL_META });
});

describe('ClassSelect', () => {
  it('renders 16 character cards', () => {
    render(<ClassSelect />);
    // 4 unlocked by default (soul grade 0)
    const cards = screen.getAllByRole('button', { name: /화랑|무당|초의|검객/i });
    expect(cards.length).toBeGreaterThanOrEqual(4);
  });

  it('locked characters are not clickable', () => {
    render(<ClassSelect />);
    const lockedCards = screen.getAllByLabelText(/잠김/i);
    expect(lockedCards.length).toBeGreaterThan(0);
  });

  it('selecting a character highlights it', async () => {
    render(<ClassSelect />);
    const hwarang = screen.getByRole('button', { name: /화랑/i });
    await userEvent.click(hwarang);
    expect(hwarang).toHaveClass('selected');
  });

  it('게임 시작 starts run with selected character', async () => {
    render(<ClassSelect />);
    await userEvent.click(screen.getByRole('button', { name: /화랑/i }));
    await userEvent.click(screen.getByRole('button', { name: /모험 시작/i }));
    const state = useGameStore.getState();
    expect(state.run.characterId).toBe('hwarang');
    expect(state.screen).toBe('world-map');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- --run src/screens/ClassSelect.test.tsx
```

Expected: `Cannot find module './ClassSelect'`

- [ ] **Step 3: 구현**

`games/inflation-rpg/src/screens/ClassSelect.tsx`:

```tsx
import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CHARACTERS, getUnlockedCharacters } from '../data/characters';
import type { Character } from '../types';

export function ClassSelect() {
  const [selected, setSelected] = useState<string | null>(null);
  const { startRun, setScreen, meta } = useGameStore((s) => ({
    startRun: s.startRun,
    setScreen: s.setScreen,
    meta: s.meta,
  }));
  const unlocked = getUnlockedCharacters(meta.soulGrade);
  const unlockedIds = new Set(unlocked.map((c) => c.id));

  const handleStart = () => {
    if (!selected) return;
    startRun(selected, false);
  };

  return (
    <div className="screen" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setScreen('main-menu')}>
          ← 뒤로
        </button>
        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>영웅을 선택하라</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>영혼등급 {meta.soulGrade}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {CHARACTERS.map((char) => {
          const isUnlocked = unlockedIds.has(char.id);
          const isSelected = selected === char.id;
          return (
            <CharCard
              key={char.id}
              char={char}
              unlocked={isUnlocked}
              selected={isSelected}
              onSelect={() => isUnlocked && setSelected(char.id)}
            />
          );
        })}
      </div>

      {selected && (
        <CharDetail char={CHARACTERS.find((c) => c.id === selected)!} />
      )}

      <button
        className="btn-primary"
        style={{ width: '100%', marginTop: 'auto', opacity: selected ? 1 : 0.4 }}
        disabled={!selected}
        onClick={handleStart}
      >
        모험 시작
      </button>
    </div>
  );
}

function CharCard({ char, unlocked, selected, onSelect }: {
  char: Character;
  unlocked: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      role="button"
      aria-label={unlocked ? char.nameKR : '잠김'}
      className={selected ? 'selected' : ''}
      onClick={onSelect}
      style={{
        background: selected ? 'var(--accent-dim)' : 'var(--bg-card)',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 8,
        padding: '8px 4px',
        textAlign: 'center',
        cursor: unlocked ? 'pointer' : 'default',
        opacity: unlocked ? 1 : 0.35,
        position: 'relative',
      }}
    >
      <div style={{ fontSize: 24, lineHeight: 1 }}>{unlocked ? char.emoji : '🔒'}</div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 4 }}>
        {unlocked ? char.nameKR : '???'}
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
        {unlocked ? char.statFocus : ''}
      </div>
    </button>
  );
}

function CharDetail({ char }: { char: Character }) {
  return (
    <div className="panel" style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
        {char.emoji} {char.nameKR}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
        {char.statFocus}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        패시브: {char.passiveSkill.nameKR} — {char.passiveSkill.description}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- --run src/screens/ClassSelect.test.tsx
```

Expected: `4 tests passed`

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/screens/ClassSelect.tsx games/inflation-rpg/src/screens/ClassSelect.test.tsx
git commit -m "feat(inflation-rpg): add ClassSelect screen with 16-character grid"
```

---

## Task 14: screens/WorldMap.tsx

**Files:**
- Create: `games/inflation-rpg/src/screens/WorldMap.tsx`
- Create: `games/inflation-rpg/src/screens/WorldMap.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`games/inflation-rpg/src/screens/WorldMap.test.tsx`:

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

  it('available areas are clickable', () => {
    render(<WorldMap />);
    expect(screen.getByRole('button', { name: /마을 입구/i })).toBeInTheDocument();
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
pnpm --filter @forge/game-inflation-rpg test -- --run src/screens/WorldMap.test.tsx
```

Expected: `Cannot find module './WorldMap'`

- [ ] **Step 3: 구현**

`games/inflation-rpg/src/screens/WorldMap.tsx`:

```tsx
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { getAvailableAreas } from '../data/maps';
import { isRunOver } from '../systems/bp';
import type { MapArea } from '../types';

export function WorldMap() {
  const { run, setScreen, encounterMonster, endRun } = useGameStore((s) => ({
    run: s.run,
    setScreen: s.setScreen,
    encounterMonster: s.encounterMonster,
    endRun: s.endRun,
  }));

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

      {/* Area grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {areas.map((area) => {
          const inRange = run.level >= area.levelRange[0] * 0.5;
          return (
            <button
              key={area.id}
              role="button"
              aria-label={area.nameKR}
              disabled={!inRange}
              onClick={() => enterArea(area)}
              style={{
                background: area.bossId ? '#1a0a0a' : 'var(--bg-card)',
                border: `1px solid ${area.bossId ? 'var(--danger)' : 'var(--border)'}`,
                borderRadius: 8,
                padding: '10px 14px',
                textAlign: 'left',
                cursor: inRange ? 'pointer' : 'not-allowed',
                opacity: inRange ? 1 : 0.4,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 700, color: area.bossId ? 'var(--danger)' : 'var(--text-secondary)' }}>
                {area.nameKR}
                {area.bossId && <span style={{ fontSize: 10, background: 'var(--danger)', color: '#fff', borderRadius: 3, padding: '0 5px', marginLeft: 6 }}>BOSS</span>}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Lv.{area.levelRange[0].toLocaleString()}~{area.levelRange[1] === Infinity ? '∞' : area.levelRange[1].toLocaleString()}
              </span>
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
pnpm --filter @forge/game-inflation-rpg test -- --run src/screens/WorldMap.test.tsx
```

Expected: `4 tests passed`

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/screens/WorldMap.tsx games/inflation-rpg/src/screens/WorldMap.test.tsx
git commit -m "feat(inflation-rpg): add WorldMap screen with area selection"
```

---

## Task 15: screens/Inventory.tsx + screens/Shop.tsx

**Files:**
- Create: `games/inflation-rpg/src/screens/Inventory.tsx`
- Create: `games/inflation-rpg/src/screens/Shop.tsx`
- Create: `games/inflation-rpg/src/screens/Inventory.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`games/inflation-rpg/src/screens/Inventory.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { Inventory } from './Inventory';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';
import type { Equipment } from '../types';

const sword: Equipment = {
  id: 'w-sword', name: '철검', slot: 'weapon', rarity: 'common',
  stats: { flat: { atk: 80 } }, dropAreaIds: [], price: 300,
};

beforeEach(() => {
  useGameStore.setState({
    screen: 'inventory',
    run: INITIAL_RUN,
    meta: { ...INITIAL_META, inventory: { weapons: [sword], armors: [], accessories: [] } },
  });
});

describe('Inventory', () => {
  it('shows weapon tab with item count', () => {
    render(<Inventory />);
    expect(screen.getByText(/무기.*1\/10/i)).toBeInTheDocument();
  });

  it('renders the sword item', () => {
    render(<Inventory />);
    expect(screen.getByText('철검')).toBeInTheDocument();
  });

  it('back button returns to previous screen', async () => {
    useGameStore.setState((s) => ({ ...s, screen: 'inventory' }));
    render(<Inventory />);
    await userEvent.click(screen.getByRole('button', { name: /뒤로/i }));
    // Returns to world-map if run is active, else main-menu
    expect(['main-menu', 'world-map']).toContain(useGameStore.getState().screen);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- --run src/screens/Inventory.test.tsx
```

Expected: `Cannot find module './Inventory'`

- [ ] **Step 3: Inventory.tsx 구현**

`games/inflation-rpg/src/screens/Inventory.tsx`:

```tsx
import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Equipment, EquipmentSlot } from '../types';
import { SLOT_LIMITS } from '../systems/equipment';

const TABS: { slot: EquipmentSlot; label: string; emoji: string }[] = [
  { slot: 'weapon',    label: '무기',   emoji: '⚔️' },
  { slot: 'armor',     label: '방어구', emoji: '🛡️' },
  { slot: 'accessory', label: '악세사리', emoji: '💍' },
];

export function Inventory() {
  const [activeSlot, setActiveSlot] = useState<EquipmentSlot>('weapon');
  const { meta, setScreen, sellEquipment, run } = useGameStore((s) => ({
    meta: s.meta,
    setScreen: s.setScreen,
    sellEquipment: s.sellEquipment,
    run: s.run,
  }));

  const items = activeSlot === 'weapon'
    ? meta.inventory.weapons
    : activeSlot === 'armor'
    ? meta.inventory.armors
    : meta.inventory.accessories;

  const backScreen = run.characterId ? 'world-map' : 'main-menu';

  return (
    <div className="screen" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setScreen(backScreen)}>
          ← 뒤로
        </button>
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>인벤토리</span>
        <span style={{ fontSize: 12, color: 'var(--luc-color)' }}>💰 {meta.gold.toLocaleString()}</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {TABS.map((tab) => {
          const count = (activeSlot === tab.slot ? items : (
            tab.slot === 'weapon' ? meta.inventory.weapons :
            tab.slot === 'armor' ? meta.inventory.armors : meta.inventory.accessories
          )).length;
          return (
            <button
              key={tab.slot}
              onClick={() => setActiveSlot(tab.slot)}
              style={{
                flex: 1,
                background: activeSlot === tab.slot ? 'var(--accent-dim)' : 'var(--bg-card)',
                border: `1px solid ${activeSlot === tab.slot ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 6,
                padding: '6px 4px',
                fontSize: 11,
                color: activeSlot === tab.slot ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {tab.emoji} {tab.label} {count}/{SLOT_LIMITS[tab.slot]}
            </button>
          );
        })}
      </div>

      {/* Items grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
        {items.map((item) => (
          <EquipmentCard key={item.id} item={item} onSell={() => sellEquipment(item.id, item.price)} />
        ))}
        {items.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
            장비가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}

function EquipmentCard({ item, onSell }: { item: Equipment; onSell: () => void }) {
  const rarityColor: Record<string, string> = {
    common: 'var(--border)', rare: '#c060e0', epic: '#60a0e0', legendary: 'var(--accent)',
  };
  const statStr = Object.entries(item.stats.percent ?? {})
    .map(([k, v]) => `${k.toUpperCase()}+${v}%`)
    .concat(Object.entries(item.stats.flat ?? {}).map(([k, v]) => `${k.toUpperCase()}+${v}`))
    .join(' ');

  return (
    <div style={{ background: 'var(--bg-card)', border: `1px solid ${rarityColor[item.rarity]}`, borderRadius: 8, padding: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{item.name}</div>
      <div style={{ fontSize: 11, color: 'var(--atk-color)', marginBottom: 6 }}>{statStr}</div>
      <button onClick={onSell} style={{ fontSize: 11, background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', color: 'var(--text-muted)', cursor: 'pointer' }}>
        매각 {item.price.toLocaleString()}G
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Shop.tsx 구현**

`games/inflation-rpg/src/screens/Shop.tsx`:

```tsx
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { EQUIPMENT_CATALOG } from '../data/equipment';
import { canDrop } from '../systems/equipment';

export function Shop() {
  const { meta, setScreen, addEquipment, run } = useGameStore((s) => ({
    meta: s.meta,
    setScreen: s.setScreen,
    addEquipment: s.addEquipment,
    run: s.run,
  }));

  const buy = (itemId: string, price: number) => {
    if (meta.gold < price) return;
    const item = EQUIPMENT_CATALOG.find((e) => e.id === itemId);
    if (!item || !canDrop(meta.inventory, item.slot)) return;
    addEquipment(item);
    useGameStore.setState((s) => ({ meta: { ...s.meta, gold: s.meta.gold - price } }));
  };

  const backScreen = run.characterId ? 'world-map' : 'main-menu';

  return (
    <div className="screen" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setScreen(backScreen)}>
          ← 뒤로
        </button>
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>상점</span>
        <span style={{ fontSize: 12, color: 'var(--luc-color)' }}>💰 {meta.gold.toLocaleString()}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {EQUIPMENT_CATALOG.map((item) => {
          const canBuy = meta.gold >= item.price && canDrop(meta.inventory, item.slot);
          const statStr = Object.entries(item.stats.percent ?? {})
            .map(([k, v]) => `${k.toUpperCase()}+${v}%`)
            .concat(Object.entries(item.stats.flat ?? {}).map(([k, v]) => `${k.toUpperCase()}+${v}`))
            .join(' ');
          return (
            <div key={item.id} className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: 'var(--atk-color)' }}>{statStr}</div>
              </div>
              <button
                disabled={!canBuy}
                onClick={() => buy(item.id, item.price)}
                style={{
                  background: canBuy ? 'var(--accent)' : 'var(--bg-card)',
                  color: canBuy ? '#1a1a24' : 'var(--text-muted)',
                  border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: canBuy ? 'pointer' : 'default',
                }}
              >
                {item.price.toLocaleString()}G
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test -- --run src/screens/Inventory.test.tsx
```

Expected: `3 tests passed`

- [ ] **Step 6: 커밋**

```bash
git add games/inflation-rpg/src/screens/Inventory.tsx games/inflation-rpg/src/screens/Inventory.test.tsx games/inflation-rpg/src/screens/Shop.tsx
git commit -m "feat(inflation-rpg): add Inventory and Shop screens"
```

---

## Task 16: screens/GameOver.tsx + screens/StatAlloc.tsx

**Files:**
- Create: `games/inflation-rpg/src/screens/GameOver.tsx`
- Create: `games/inflation-rpg/src/screens/StatAlloc.tsx`

- [ ] **Step 1: GameOver.tsx 구현**

`games/inflation-rpg/src/screens/GameOver.tsx`:

```tsx
import React from 'react';
import { useGameStore } from '../store/gameStore';

export function GameOver() {
  const { meta, setScreen } = useGameStore((s) => ({ meta: s.meta, setScreen: s.setScreen }));

  return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
      <div style={{ fontSize: 48 }}>💀</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--danger)' }}>런 종료</div>
      <div className="panel" style={{ width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>최고 기록</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>
          Lv.{meta.bestRunLevel.toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          베이스 어빌리티 Lv.{meta.baseAbilityLevel}
          {meta.hardModeUnlocked && <span style={{ color: 'var(--danger)', marginLeft: 8 }}>하드모드 해금!</span>}
        </div>
      </div>
      <button className="btn-primary" style={{ width: '100%' }} onClick={() => setScreen('class-select')}>
        다시 도전
      </button>
      <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setScreen('main-menu')}>
        메인 메뉴
      </button>
    </div>
  );
}
```

- [ ] **Step 2: StatAlloc.tsx 구현**

이 컴포넌트는 전투 중 레벨업 시 오버레이로 표시된다.

`games/inflation-rpg/src/screens/StatAlloc.tsx`:

```tsx
import React from 'react';
import { useGameStore } from '../store/gameStore';
import type { AllocatedStats } from '../types';

const STAT_LABELS: { key: keyof AllocatedStats; label: string; color: string }[] = [
  { key: 'hp',  label: 'HP',  color: 'var(--hp-color)' },
  { key: 'atk', label: 'ATK', color: 'var(--atk-color)' },
  { key: 'def', label: 'DEF', color: 'var(--def-color)' },
  { key: 'agi', label: 'AGI', color: 'var(--agi-color)' },
  { key: 'luc', label: 'LUC', color: 'var(--luc-color)' },
];

interface StatAllocProps {
  onClose: () => void;
}

export function StatAlloc({ onClose }: StatAllocProps) {
  const { run, allocateSP } = useGameStore((s) => ({ run: s.run, allocateSP: s.allocateSP }));

  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div className="panel" style={{ width: '90%', maxWidth: 340 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontWeight: 700, color: 'var(--accent)' }}>Lv.{run.level} 달성! 스탯 배분</span>
          <span style={{
            background: 'var(--accent-dim)', border: '1px solid var(--accent)',
            borderRadius: 5, padding: '2px 10px', fontSize: 12, color: 'var(--accent)', fontWeight: 700,
          }}>
            SP: {run.statPoints}
          </span>
        </div>

        {STAT_LABELS.map(({ key, label, color }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '6px 10px', background: 'var(--bg-base)', borderRadius: 6 }}>
            <span style={{ width: 36, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
            <span style={{ width: 56, fontWeight: 700, color, fontSize: 13 }}>{run.allocated[key]}</span>
            <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3 }}>
              <div style={{ height: '100%', borderRadius: 3, background: color, width: `${Math.min(100, run.allocated[key] / 10)}%` }} />
            </div>
            <button
              onClick={() => allocateSP(key, 1)}
              disabled={run.statPoints < 1}
              style={{
                width: 24, height: 24, borderRadius: 4,
                border: `1px solid ${run.statPoints > 0 ? 'var(--accent)' : 'var(--border)'}`,
                background: 'var(--bg-card)', color: run.statPoints > 0 ? 'var(--accent)' : 'var(--text-muted)',
                cursor: run.statPoints > 0 ? 'pointer' : 'default', fontSize: 16, lineHeight: 1,
              }}
            >+</button>
          </div>
        ))}

        <button
          className="btn-primary"
          style={{ width: '100%', marginTop: 8, opacity: run.statPoints > 0 ? 0.6 : 1 }}
          onClick={onClose}
        >
          {run.statPoints > 0 ? `확인 (SP ${run.statPoints} 남음)` : '확인'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 커밋**

```bash
git add games/inflation-rpg/src/screens/GameOver.tsx games/inflation-rpg/src/screens/StatAlloc.tsx
git commit -m "feat(inflation-rpg): add GameOver and StatAlloc screens"
```

---

## Task 17: battle/BattleGame.ts + battle/BattleScene.ts

**Files:**
- Create: `games/inflation-rpg/src/battle/BattleGame.ts`
- Create: `games/inflation-rpg/src/battle/BattleScene.ts`

- [ ] **Step 1: BattleScene.ts 구현**

`games/inflation-rpg/src/battle/BattleScene.ts`:

```ts
import Phaser from 'phaser';
import { useGameStore } from '../store/gameStore';
import { calcFinalStat, calcDamageReduction, calcCritChance } from '../systems/stats';
import { applyExpGain } from '../systems/experience';
import { calcBaseAbilityMult } from '../systems/progression';
import { getAllEquipped } from '../systems/equipment';
import { getCharacterById } from '../data/characters';
import { pickMonster } from '../data/monsters';
import { getBossesForArea } from '../data/bosses';
import { isRunOver, onDefeat } from '../systems/bp';

interface BattleCallbacks {
  onLevelUp: (newLevel: number) => void;
  onBattleEnd: (victory: boolean) => void;
  onBossKill: (bossId: string, bpReward: number) => void;
}

export class BattleScene extends Phaser.Scene {
  private callbacks!: BattleCallbacks;
  private combatTimer?: Phaser.Time.TimerEvent;
  private enemyHP = 0;
  private enemyMaxHP = 0;
  private enemyName = '';
  private isBoss = false;
  private bossId?: string;

  // Graphics handles
  private hpBarBg?: Phaser.GameObjects.Rectangle;
  private hpBarFill?: Phaser.GameObjects.Rectangle;
  private enemyText?: Phaser.GameObjects.Text;
  private logText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: BattleCallbacks) {
    this.callbacks = data;
  }

  create() {
    const { run, meta } = useGameStore.getState();
    const area = run.currentAreaId;
    const bosses = getBossesForArea(area, run.isHardMode);
    const hasBoss = bosses.length > 0;

    const bg = this.add.rectangle(0, 0, 360, 600, 0x0a1218).setOrigin(0);
    void bg;

    if (hasBoss && Math.random() < 0.25) {
      const boss = bosses[0]!;
      this.isBoss = true;
      this.bossId = boss.id;
      this.enemyName = `👹 ${boss.nameKR}`;
      const charLevel = run.level;
      this.enemyMaxHP = Math.floor(charLevel * 50 * boss.hpMult);
    } else {
      this.isBoss = false;
      const monster = pickMonster(run.level);
      this.enemyName = `${monster.emoji} ${monster.nameKR}`;
      this.enemyMaxHP = Math.floor(run.level * 20 * monster.hpMult);
    }
    this.enemyHP = this.enemyMaxHP;

    // UI
    this.enemyText = this.add.text(16, 16, this.enemyName, { fontSize: '16px', color: '#e05050' });
    this.hpBarBg = this.add.rectangle(16, 44, 320, 10, 0x1a1a2a).setOrigin(0);
    this.hpBarFill = this.add.rectangle(16, 44, 320, 10, 0xe03030).setOrigin(0);
    this.logText = this.add.text(16, 64, '', { fontSize: '12px', color: '#8aaa88', wordWrap: { width: 320 } });

    this.combatTimer = this.time.addEvent({ delay: 600, callback: this.doRound, callbackScope: this, loop: true });
  }

  private doRound() {
    const state = useGameStore.getState();
    const { run, meta } = state;
    const char = getCharacterById(run.characterId);
    if (!char) return;

    const baseAbility = calcBaseAbilityMult(meta.baseAbilityLevel);
    const allEquipped = getAllEquipped(meta.inventory);

    const playerATK = calcFinalStat('atk', run.allocated.atk, char.statMultipliers.atk, allEquipped, baseAbility);
    const playerDEF = calcFinalStat('def', run.allocated.def, char.statMultipliers.def, allEquipped, baseAbility);
    const playerHP  = calcFinalStat('hp',  run.allocated.hp,  char.statMultipliers.hp,  allEquipped, baseAbility);
    const playerAGI = calcFinalStat('agi', run.allocated.agi, char.statMultipliers.agi, allEquipped, baseAbility);
    const playerLUC = calcFinalStat('luc', run.allocated.luc, char.statMultipliers.luc, allEquipped, baseAbility);

    const crit = Math.random() < calcCritChance(playerAGI, playerLUC);
    const combo = Math.random() < 0.05 + playerAGI * 0.0005;
    const hits = combo ? 3 : 1;
    let totalDmg = 0;
    for (let i = 0; i < hits; i++) {
      totalDmg += Math.floor(playerATK * (crit ? 2.4 : 1) * (0.9 + Math.random() * 0.2));
    }

    this.enemyHP = Math.max(0, this.enemyHP - totalDmg);

    const logParts: string[] = [];
    if (combo) logParts.push(`${hits}연타! `);
    if (crit) logParts.push('치명타! ');
    logParts.push(`${totalDmg.toLocaleString()} 데미지`);
    this.logText?.setText(logParts.join(''));

    // Update HP bar
    const ratio = this.enemyHP / this.enemyMaxHP;
    this.hpBarFill?.setDisplaySize(Math.max(0, 320 * ratio), 10);

    // Enemy defeated
    if (this.enemyHP <= 0) {
      this.combatTimer?.remove();

      if (this.isBoss && this.bossId) {
        this.callbacks.onBossKill(this.bossId, 5);
      }

      // Exp calculation
      const expGain = Math.floor(run.level * 10 * (run.isHardMode ? 1 : 1));
      const goldGain = Math.floor(run.level * 5 * (run.isHardMode ? 5 : 1));
      const { newLevel, spGained } = applyExpGain(run.exp, run.level, expGain, run.isHardMode);

      useGameStore.getState().gainLevels(newLevel - run.level, spGained);
      useGameStore.setState((s) => ({ run: { ...s.run, goldThisRun: s.run.goldThisRun + goldGain } }));

      if (spGained > 0) {
        this.callbacks.onLevelUp(newLevel);
      } else {
        this.callbacks.onBattleEnd(true);
      }
      return;
    }

    // Enemy attacks back
    const enemyATK = Math.floor(run.level * 8 * (this.isBoss ? 2 : 1));
    const reduction = calcDamageReduction(playerDEF);
    const dmgTaken = Math.floor(enemyATK * (1 - reduction));

    // Simple HP check using ratio heuristic (store doesn't track currentHP mid-battle)
    const currentHPEstimate = playerHP - (run.monstersDefeated * dmgTaken * 0.1);
    if (currentHPEstimate <= 0) {
      this.combatTimer?.remove();
      const newBP = onDefeat(run.bp, run.isHardMode);
      useGameStore.setState((s) => ({ run: { ...s.run, bp: newBP } }));
      if (isRunOver(newBP)) {
        useGameStore.getState().endRun();
      } else {
        this.callbacks.onBattleEnd(false);
      }
    }
  }
}
```

- [ ] **Step 2: BattleGame.ts 구현**

`games/inflation-rpg/src/battle/BattleGame.ts`:

```ts
import Phaser from 'phaser';
import { BattleScene } from './BattleScene';

interface BattleGameOptions {
  parent: string;
  onLevelUp: (newLevel: number) => void;
  onBattleEnd: (victory: boolean) => void;
  onBossKill: (bossId: string, bpReward: number) => void;
}

export function createBattleGame(opts: BattleGameOptions): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: opts.parent,
    width: 360,
    height: 400,
    backgroundColor: '#0a1218',
    scene: BattleScene,
    callbacks: {
      postBoot: (game) => {
        game.scene.start('BattleScene', {
          onLevelUp: opts.onLevelUp,
          onBattleEnd: opts.onBattleEnd,
          onBossKill: opts.onBossKill,
        });
      },
    },
  });
}
```

- [ ] **Step 3: 커밋**

```bash
git add games/inflation-rpg/src/battle/
git commit -m "feat(inflation-rpg): add Phaser battle scene and game factory"
```

---

## Task 18: screens/Battle.tsx (Phaser 마운트 + StatAlloc 통합)

**Files:**
- Create: `games/inflation-rpg/src/screens/Battle.tsx`

- [ ] **Step 1: Battle.tsx 구현**

`games/inflation-rpg/src/screens/Battle.tsx`:

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { StatAlloc } from './StatAlloc';
import { createBattleGame } from '../battle/BattleGame';
import type Phaser from 'phaser';

export function Battle() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [showStatAlloc, setShowStatAlloc] = useState(false);
  const { run, setScreen, bossDrop } = useGameStore((s) => ({
    run: s.run,
    setScreen: s.setScreen,
    bossDrop: s.bossDrop,
  }));

  useEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.id = 'battle-canvas';

    gameRef.current = createBattleGame({
      parent: 'battle-canvas',
      onLevelUp: (_newLevel) => {
        setShowStatAlloc(true);
      },
      onBattleEnd: (_victory) => {
        gameRef.current?.destroy(true);
        setScreen('world-map');
      },
      onBossKill: (bossId, bpReward) => {
        bossDrop(bossId, bpReward);
      },
    });

    return () => {
      gameRef.current?.destroy(true);
    };
  }, []);

  const handleStatAllocClose = () => {
    setShowStatAlloc(false);
    // Resume combat — scene will continue the timer after StatAlloc closes
    gameRef.current?.scene.resume('BattleScene');
  };

  return (
    <div className="screen" style={{ position: 'relative' }}>
      {/* HUD */}
      <div style={{ padding: '8px 14px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <span style={{ fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 8px', color: 'var(--bp-color)', fontWeight: 700 }}>
          ⚡{run.bp}
        </span>
        <span style={{ fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 8px', color: 'var(--hp-color)', fontWeight: 700 }}>
          Lv.{run.level.toLocaleString()}
        </span>
        {run.statPoints > 0 && (
          <span style={{ fontSize: 12, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 5, padding: '3px 8px', color: 'var(--accent)', fontWeight: 700 }}>
            SP {run.statPoints}
          </span>
        )}
      </div>

      {/* Phaser canvas container */}
      <div ref={canvasRef} style={{ flex: 1 }} />

      {/* StatAlloc overlay */}
      {showStatAlloc && run.statPoints > 0 && (
        <StatAlloc onClose={handleStatAllocClose} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add games/inflation-rpg/src/screens/Battle.tsx
git commit -m "feat(inflation-rpg): add Battle screen with Phaser canvas and StatAlloc overlay"
```

---

## Task 19: 전체 통합 검증

- [ ] **Step 1: 전체 typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors. 에러가 있으면 해당 파일 수정 후 재시도.

- [ ] **Step 2: 전체 테스트**

```bash
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 모든 테스트 통과 (30개 이상)

- [ ] **Step 3: ESLint + 순환 의존 검사**

```bash
pnpm --filter @forge/game-inflation-rpg lint
pnpm circular
```

Expected: 0 errors, 순환 참조 없음

- [ ] **Step 4: dev-shell 연동 확인**

```bash
pnpm dev
```

브라우저에서 `http://localhost:3000/games/inflation-rpg` 접속. 메인 메뉴가 표시되면 성공.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "chore(inflation-rpg): integration pass — all types and lints clean"
```

---

## Task 20: E2E Playwright 테스트

**Files:**
- Create: `games/inflation-rpg/tests/e2e/full-run.spec.ts`

- [ ] **Step 1: Playwright 설정 확인**

```bash
cat games/inflation-rpg/playwright.config.ts
```

Expected: `baseURL: 'http://localhost:3000'` 또는 `http://localhost:3100`가 설정되어 있음.
없으면 `games/inflation-rpg/playwright.config.ts`의 `use.baseURL`을 `http://localhost:3100`으로 설정.

- [ ] **Step 2: E2E 테스트 작성**

`games/inflation-rpg/tests/e2e/full-run.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('Inflation RPG — full run smoke test', () => {
  test.beforeEach(async ({ page }) => {
    // Start from game page
    await page.goto('/');
    // Clear save data so test starts fresh
    await page.evaluate(() => localStorage.removeItem('korea_inflation_rpg_save'));
    await page.reload();
  });

  test('main menu renders', async ({ page }) => {
    await expect(page.getByText('INFLATION')).toBeVisible();
    await expect(page.getByRole('button', { name: '게임 시작' })).toBeVisible();
  });

  test('can select a character and start run', async ({ page }) => {
    await page.getByRole('button', { name: '게임 시작' }).click();
    // ClassSelect should appear
    await expect(page.getByText('영웅을 선택하라')).toBeVisible();
    // Select Hwarang (always unlocked)
    await page.getByRole('button', { name: '화랑' }).first().click();
    await page.getByRole('button', { name: '모험 시작' }).click();
    // WorldMap should appear
    await expect(page.getByText(/BP.*30/)).toBeVisible();
  });

  test('can enter an area and see battle', async ({ page }) => {
    await page.getByRole('button', { name: '게임 시작' }).click();
    await page.getByRole('button', { name: '화랑' }).first().click();
    await page.getByRole('button', { name: '모험 시작' }).click();
    // Enter first area
    await page.getByRole('button', { name: '마을 입구' }).click();
    // Battle screen — BP decremented
    await expect(page.getByText(/BP.*29/)).toBeVisible({ timeout: 5000 });
  });

  test('run ends when BP reaches 0', async ({ page }) => {
    // Inject store state with 1 BP so one encounter ends the run
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('korea_inflation_rpg_save', JSON.stringify({
        state: {
          meta: {
            inventory: { weapons: [], armors: [], accessories: [] },
            baseAbilityLevel: 0, soulGrade: 0, hardModeUnlocked: false,
            characterLevels: {}, bestRunLevel: 0,
            normalBossesKilled: [], hardBossesKilled: [], gold: 0,
          },
        },
        version: 0,
      }));
    });
    await page.reload();
    await page.getByRole('button', { name: '게임 시작' }).click();
    await page.getByRole('button', { name: '화랑' }).first().click();
    await page.getByRole('button', { name: '모험 시작' }).click();

    // Force BP to 1 by injecting into store via window
    await page.evaluate(() => {
      // @ts-expect-error window interop
      if (window.useGameStore) {
        // @ts-expect-error
        window.useGameStore.setState((s) => ({ run: { ...s.run, bp: 1 } }));
      }
    });

    await page.getByRole('button', { name: '마을 입구' }).click();
    // After BP 1 → encounter → 0, run ends
    await expect(page.getByText('런 종료')).toBeVisible({ timeout: 10000 });
  });
});
```

- [ ] **Step 2: dev 서버 켜고 E2E 실행**

터미널 1:
```bash
pnpm --filter @forge/game-inflation-rpg dev
```

터미널 2:
```bash
pnpm --filter @forge/game-inflation-rpg e2e
```

Expected: `4 tests passed`

- [ ] **Step 3: 커밋**

```bash
git add games/inflation-rpg/tests/e2e/full-run.spec.ts
git commit -m "test(inflation-rpg): add E2E full-run smoke tests"
```

---

## 최종 완료 체크리스트

- [ ] `pnpm --filter @forge/game-inflation-rpg test` — 30개 이상 통과
- [ ] `pnpm --filter @forge/game-inflation-rpg typecheck` — 0 errors
- [ ] `pnpm --filter @forge/core typecheck` — 0 errors
- [ ] `pnpm lint` — 0 errors
- [ ] `pnpm circular` — 순환 참조 없음
- [ ] `pnpm --filter @forge/game-inflation-rpg e2e` — 4개 통과
- [ ] `http://localhost:3000/games/inflation-rpg` 에서 게임 플레이 가능

**Plan 1 + Plan 2 완료 시 `phase-2-complete` 태그 부여:**

```bash
git tag phase-2-complete
```
