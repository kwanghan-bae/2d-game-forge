# Phase B-2: Town Screen (간단 ver.) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 새 `'town'` 화면을 추가하여 Phase B-1 의 Dungeon 카탈로그를 UI 에 노출
한다. 기존 MainMenu / WorldMap / RegionMap 흐름은 살린 채, 신규 진입 경로만
추가. RunState 에 `currentDungeonId` 가 추가되어 Phase B-3 가 던전 별 floor
진행에 사용 가능해진다.

**Architecture:** 신규 screen 한 개 (`Town`) + RunState 한 필드 (`currentDungeonId`)
+ 신규 store 액션 한 개 (`selectDungeon`). MainMenu 의 "게임 시작" 버튼 옆에
"마을로" 버튼 추가. Town 에서 던전 선택 → ClassSelect 로 이동. 기존 흐름은
그대로 유지하므로 회귀 위험 작음.

**Tech Stack:** React (forge-* registry components), Zustand 5, Vitest. 새
의존성 없음.

---

## File Structure

**Created**
- `games/inflation-rpg/src/screens/Town.tsx` — 마을 hub 화면 (간단 ver.)
- `games/inflation-rpg/src/screens/Town.test.tsx` — 컴포넌트 테스트

**Modified**
- `games/inflation-rpg/src/types.ts` — `Screen` 에 `'town'` 추가, `RunState`
  에 `currentDungeonId: string | null` 추가
- `games/inflation-rpg/src/store/gameStore.ts` — `INITIAL_RUN.currentDungeonId
  = null`, 신규 액션 `selectDungeon(id)`, persist v3 migration
- `games/inflation-rpg/src/store/gameStore.test.ts` — `selectDungeon` 테스트
- `games/inflation-rpg/src/App.tsx` — `screen === 'town'` 라우팅
- `games/inflation-rpg/src/screens/MainMenu.tsx` — "마을로" 버튼 추가
- `games/inflation-rpg/src/systems/sound.ts` — `bgmIdForScreen` 에 `'town'`
  케이스 추가 (간단히 `'main-menu'` 와 같은 BGM 으로 매핑)

**Untouched**
- `games/inflation-rpg/src/screens/WorldMap.tsx`
- `games/inflation-rpg/src/screens/RegionMap.tsx`
- `games/inflation-rpg/src/data/regions.ts`
- `games/inflation-rpg/src/data/maps.ts`
- 모든 battle 코드

---

## Task 1: 타입 + 초기 상태 추가

**Files:**
- Modify: `games/inflation-rpg/src/types.ts`
- Modify: `games/inflation-rpg/src/store/gameStore.ts` (INITIAL_RUN + persist v3)

- [ ] **Step 1: `types.ts` — `Screen` 에 `'town'` + `RunState` 에 `currentDungeonId`**

`Screen` 타입에 `'town'` 추가:

```ts
export type Screen =
  | 'main-menu'
  | 'town'
  | 'class-select'
  | 'world-map'
  | 'battle'
  | 'dungeon'
  | 'stat-alloc'
  | 'inventory'
  | 'shop'
  | 'game-over'
  | 'quests';
```

`RunState` 인터페이스에 신규 필드 (기존 `currentAreaId: string;` 줄 다음):

```ts
export interface RunState {
  characterId: string;
  level: number;
  exp: number;
  bp: number;
  statPoints: number;
  allocated: AllocatedStats;
  currentAreaId: string;
  currentDungeonId: string | null;   // Phase B-2 — 선택된 던전 ID, 미선택 시 null
  isHardMode: boolean;
  monstersDefeated: number;
  goldThisRun: number;
  currentStage: number;
  dungeonRunMonstersDefeated: number;
}
```

- [ ] **Step 2: `INITIAL_RUN` 업데이트 in `gameStore.ts`**

```ts
export const INITIAL_RUN: RunState = {
  characterId: '',
  level: 1,
  exp: 0,
  bp: STARTING_BP,
  statPoints: 0,
  allocated: INITIAL_ALLOCATED,
  currentAreaId: 'village-entrance',
  currentDungeonId: null,
  isHardMode: false,
  monstersDefeated: 0,
  goldThisRun: 0,
  currentStage: 1,
  dungeonRunMonstersDefeated: 0,
};
```

- [ ] **Step 3: persist v3 migration**

`gameStore.ts` 의 persist 옵션에서 `version: 2` → `version: 3` 으로 올리고
`migrate` 함수 끝부분에 v2 → v3 블록 추가:

```ts
// Phase B-2 — currentDungeonId 추가
if (fromVersion < 3 && s.run) {
  s.run.currentDungeonId = s.run.currentDungeonId ?? null;
}
```

(기존 v1, v2 블록은 그대로 유지.)

- [ ] **Step 4: typecheck**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors.

- [ ] **Step 5: 모든 테스트 실행**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg test
```

Expected: 모두 통과 (229).

- [ ] **Step 6: 커밋**

```bash
git add games/inflation-rpg/src/types.ts games/inflation-rpg/src/store/gameStore.ts
git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): add 'town' screen + RunState.currentDungeonId

Screen union 에 'town' 추가, RunState 에 currentDungeonId: string | null
추가. persist v3 migration 으로 기존 세이브 호환.

Phase B-2 (1/5) — 데이터 schema. 화면 + 액션 + 라우팅은 후속 task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `selectDungeon` store 액션 (TDD)

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts`
- Modify: `games/inflation-rpg/src/store/gameStore.test.ts`

### Step 1: 인터페이스에 메서드 추가

`interface GameStore` 에 (다른 액션 옆 적절한 위치):

```ts
selectDungeon: (dungeonId: string | null) => void;
```

### Step 2: 구현 추가

```ts
selectDungeon: (dungeonId) =>
  set((s) => ({ run: { ...s.run, currentDungeonId: dungeonId } })),
```

### Step 3: 실패 테스트

`gameStore.test.ts` 에 신규 describe 블록 추가:

```ts
describe('selectDungeon', () => {
  it('sets currentDungeonId on run state', () => {
    useGameStore.getState().startRun('hwarang', false);
    expect(useGameStore.getState().run.currentDungeonId).toBeNull();
    useGameStore.getState().selectDungeon('plains');
    expect(useGameStore.getState().run.currentDungeonId).toBe('plains');
  });

  it('can clear with null', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().selectDungeon('forest');
    expect(useGameStore.getState().run.currentDungeonId).toBe('forest');
    useGameStore.getState().selectDungeon(null);
    expect(useGameStore.getState().run.currentDungeonId).toBeNull();
  });

  it('startRun resets currentDungeonId to null', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().selectDungeon('plains');
    useGameStore.getState().startRun('mudang', true);
    expect(useGameStore.getState().run.currentDungeonId).toBeNull();
    expect(useGameStore.getState().run.characterId).toBe('mudang');
    expect(useGameStore.getState().run.isHardMode).toBe(true);
  });
});
```

### Step 4: 테스트 실행

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg test src/store
```

Expected: 모두 통과 (이전 + 3 new).

### Step 5: typecheck

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors.

### Step 6: 커밋

```bash
git add games/inflation-rpg/src/store/gameStore.ts games/inflation-rpg/src/store/gameStore.test.ts
git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): add selectDungeon store action

run.currentDungeonId 를 set/clear 하는 단순 액션. startRun 은 INITIAL_RUN
spread 로 자동 null 리셋.

Phase B-2 (2/5).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `Town` 화면 컴포넌트

**Files:**
- Create: `games/inflation-rpg/src/screens/Town.tsx`
- Create: `games/inflation-rpg/src/screens/Town.test.tsx`

**Design:** Forge UI 토큰 사용, `ForgeScreen` 안에 던전 카드들 그리드. 각 던전
카드 = nameKR + emoji + themeColor accent + "입장" 버튼. 상단에 "마을" 타이틀,
하단에 "돌아가기" 버튼 (→ main-menu).

### Step 1: 다른 screen 의 패턴 확인 (참고용)

```bash
cd /Users/joel/Desktop/git/2d-game-forge && head -40 games/inflation-rpg/src/screens/MainMenu.tsx
```

같은 import / structure 따르기 (`ForgeScreen`, `useGameStore`, `setScreen`,
`forge-*` tokens).

### Step 2: Town.tsx 작성

`games/inflation-rpg/src/screens/Town.tsx`:

```tsx
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { getStartDungeons } from '../data/dungeons';
import { ForgeScreen, ForgeButton, ForgePanel } from '@forge/registry';
import type { Dungeon } from '../types';

export function Town() {
  const setScreen = useGameStore((s) => s.setScreen);
  const selectDungeon = useGameStore((s) => s.selectDungeon);

  const dungeons = getStartDungeons();

  const enterDungeon = (d: Dungeon) => {
    selectDungeon(d.id);
    setScreen('class-select');
  };

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
        던전을 선택하여 모험을 시작한다
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--forge-space-4)',
          padding: 'var(--forge-space-4)',
        }}
      >
        {dungeons.map((d) => (
          <ForgePanel
            key={d.id}
            data-testid={`town-dungeon-${d.id}`}
            style={{
              borderLeft: `4px solid ${d.themeColor}`,
              padding: 'var(--forge-space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--forge-space-2)',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '3rem' }}>{d.emoji}</div>
            <div style={{ fontSize: 'var(--forge-font-lg)', fontWeight: 600 }}>
              {d.nameKR}
            </div>
            <ForgeButton onClick={() => enterDungeon(d)}>입장</ForgeButton>
          </ForgePanel>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 'var(--forge-space-6)' }}>
        <ForgeButton variant="ghost" onClick={() => setScreen('main-menu')}>
          돌아가기
        </ForgeButton>
      </div>
    </ForgeScreen>
  );
}
```

> **참고**: `ForgeButton.variant='ghost'` 가 registry 에 있는지 확인. 없으면 단
> 순 onClick 만 있는 ForgeButton 으로 대체. 다른 screen 에서 어떤 variant 를
> 쓰는지 grep:
>
> ```bash
> grep -rn "ForgeButton" games/inflation-rpg/src/screens/ | head -5
> ```

### Step 3: Town.test.tsx 작성

`games/inflation-rpg/src/screens/Town.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Town } from './Town';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';

describe('Town screen', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'town',
      run: INITIAL_RUN,
      meta: INITIAL_META,
    });
  });

  it('renders town title and 3 starter dungeons', () => {
    render(<Town />);
    expect(screen.getByText('마을')).toBeInTheDocument();
    expect(screen.getByTestId('town-dungeon-plains')).toBeInTheDocument();
    expect(screen.getByTestId('town-dungeon-forest')).toBeInTheDocument();
    expect(screen.getByTestId('town-dungeon-mountains')).toBeInTheDocument();
  });

  it('selecting a dungeon sets currentDungeonId and navigates to class-select', () => {
    render(<Town />);
    const enterButtons = screen.getAllByText('입장');
    // First button = plains
    fireEvent.click(enterButtons[0]!);
    expect(useGameStore.getState().run.currentDungeonId).toBe('plains');
    expect(useGameStore.getState().screen).toBe('class-select');
  });

  it('back button returns to main-menu', () => {
    render(<Town />);
    fireEvent.click(screen.getByText('돌아가기'));
    expect(useGameStore.getState().screen).toBe('main-menu');
  });
});
```

### Step 4: 테스트 실행

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg test src/screens/Town
```

Expected: 3 tests pass.

### Step 5: typecheck

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors.

### Step 6: 커밋

```bash
git add games/inflation-rpg/src/screens/Town.tsx games/inflation-rpg/src/screens/Town.test.tsx
git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): add Town screen for dungeon selection

3 시작 던전 카드 그리드. 던전 선택 시 selectDungeon + setScreen('class-select').
"돌아가기" 버튼 → main-menu. forge-* registry 토큰 사용.

Phase B-2 (3/5).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: App 라우팅 + sound BGM 매핑

**Files:**
- Modify: `games/inflation-rpg/src/App.tsx`
- Modify: `games/inflation-rpg/src/systems/sound.ts`

### Step 1: App.tsx 라우팅

`App.tsx` 의 import 에 `Town` 추가:

```tsx
import { Town } from './screens/Town';
```

JSX 의 screen 분기에 (예: MainMenu 다음 줄):

```tsx
{screen === 'main-menu'    && <MainMenu />}
{screen === 'town'         && <Town />}
{screen === 'class-select' && <ClassSelect />}
```

### Step 2: sound.ts BGM 매핑

`bgmIdForScreen` 함수를 찾아 `'town'` 케이스 추가. 단순히 `'main-menu'` 와
같은 BGM 매핑:

```bash
cd /Users/joel/Desktop/git/2d-game-forge && grep -n "bgmIdForScreen" games/inflation-rpg/src/systems/sound.ts
```

함수를 읽어서 switch / map 에 `'town': 'town-bgm'` 또는 기존 main-menu 와
동일 BGM ID 추가. (예: `case 'town': return 'menu-bgm';`)

정확한 형태는 현 sound.ts 구조에 따라 결정.

### Step 3: typecheck

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors.

### Step 4: 모든 테스트 실행

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg test
```

Expected: 모두 통과.

### Step 5: 커밋

```bash
git add games/inflation-rpg/src/App.tsx games/inflation-rpg/src/systems/sound.ts
git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): wire 'town' screen into App routing + sound

App.tsx 라우팅에 town 케이스 추가. sound.ts 의 bgmIdForScreen 에서 town =
main-menu BGM 매핑 (간단 ver., Phase B-J 마을 hub 본격 디자인 시 별도 BGM).

Phase B-2 (4/5).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: MainMenu 에 "마을로" 버튼 추가

**Files:**
- Modify: `games/inflation-rpg/src/screens/MainMenu.tsx`

### Step 1: 현재 MainMenu 구조 확인

```bash
cd /Users/joel/Desktop/git/2d-game-forge && cat games/inflation-rpg/src/screens/MainMenu.tsx
```

### Step 2: "마을로" 버튼 추가

기존 "게임 시작" 버튼 (또는 동등한 entry 버튼) 옆 / 아래에 신규 버튼:

```tsx
<ForgeButton onClick={() => setScreen('town')}>
  🏘️ 마을로 (B-2 신규)
</ForgeButton>
```

> 정확한 추가 위치는 MainMenu 의 현 구조에 따라 결정. 기존 버튼 그룹 안에
> 자연스럽게 합류하는 위치 선택.

> "B-2 신규" 라벨은 dev 검증 단계 동안만 — 최종 버전에서 마을 hub 가 메인
> 진입점이 되면 라벨에서 제거. Phase B-J 에서 처리.

### Step 3: 기존 MainMenu 테스트 영향 확인

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg test src/screens/MainMenu
```

Expected: 기존 테스트 모두 통과 (텍스트 매칭 변경 없음, 신규 버튼만 추가).

### Step 4: typecheck

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 errors.

### Step 5: 커밋

```bash
git add games/inflation-rpg/src/screens/MainMenu.tsx
git commit -m "$(cat <<'EOF'
feat(game-inflation-rpg): add "마을로" entry button on MainMenu

Phase B-2 의 신 던전 진입 흐름 (MainMenu → Town → ClassSelect → ...)
시작점. 기존 "게임 시작" 흐름은 그대로 유지.

Phase B-2 (5/5).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Final Verification

- [ ] **Step 1: 전 검증**

```bash
cd /Users/joel/Desktop/git/2d-game-forge && pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg test && pnpm --filter @forge/game-inflation-rpg lint
```

Expected: 0 errors / 모두 통과 / lint clean.

- [ ] **Step 2: 수동 dev 검증**

```bash
pnpm dev
```

체크 리스트:
- [ ] MainMenu 에 "마을로" 버튼 노출
- [ ] 마을로 → Town 화면, 3 던전 카드 (평야·깊은숲·산악) 보임
- [ ] 각 카드 emoji + nameKR + themeColor accent 정상
- [ ] 던전 클릭 → ClassSelect 로 이동, run.currentDungeonId 가 그 던전 ID
  (브라우저 devtools store 확인)
- [ ] "돌아가기" → MainMenu 복귀
- [ ] 기존 "게임 시작" 흐름 정상 (회귀 없음)
- [ ] 게임 재로드 시 currentDungeonId 가 null 로 잘 보존 (persist v3 동작)

- [ ] **Step 3: 머지 + 태그**

```bash
git checkout main
git merge --no-ff feat/phase-b2-town-screen -m "Merge Phase B-2: town screen + dungeon selection entry"
git tag phase-b2-complete
```

(브랜치는 `feat/phase-b2-town-screen` 으로 미리 생성: `git checkout -b
feat/phase-b2-town-screen`)

---

## Self-Review Checklist (작성자용)

**Spec coverage:**
- [x] 'town' screen 추가 — Task 1 + Task 4
- [x] currentDungeonId schema — Task 1
- [x] selectDungeon 액션 — Task 2
- [x] Town UI (3 던전 카드) — Task 3
- [x] App 라우팅 + BGM — Task 4
- [x] MainMenu 진입점 — Task 5

**Out of scope (B-3 / B-4):**
- 던전 진입 후 floor 진행 흐름 (B-3 가 RegionMap 대체)
- 던전 선택 random 추첨 (B-4)
- 차원 나침반 시스템 (B-4)
- 마을 hub 본격 디자인 (Section 3 deferred — 별도 spec 으로 Phase B-J)
- 캐릭터 영입소 / 보물고 / Asc 제단 등 시설 진입 placeholder

**Type consistency:**
- `Screen union` 에 `'town'` 정확히 추가, App.tsx 의 분기 + sound.ts 의
  매핑과 일치
- `currentDungeonId: string | null` — selectDungeon 시그니처와 일치
- `getStartDungeons()` 반환 = `Dungeon[]` (Phase B-1 에서 정의)

**Placeholder scan:**
- Task 5 의 "B-2 신규" 라벨은 의도된 임시 표시 (Phase B-J 에서 정리). 그
  외엔 placeholder 없음.
