# Content Expansion Layer 2 — Dungeon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [Content Expansion 스펙](../specs/2026-04-25-content-expansion-spec.md) 의 **Layer 2 (던전 구조)** 구현. 모든 area 를 단일 전투 → 5-10 stage 던전으로 재정의.

**Architecture:** `MapArea` 확장 (stageCount/stageMonsterCount/finalStageIsBoss) → `RunState` 확장 (currentStage/dungeonRunMonstersDefeated) → 신규 `Dungeon.tsx` 화면 (Stage progress UI) → BattleScene stage 단위 종료 콜백 → 사망 시 stage 1 리셋.

**Tech Stack:** TypeScript 5.6, React 19, Phaser 3.90, Zustand 5, Vitest 4 (jsdom), Tailwind v4 + forge-ui registry components.

---

## File Structure

### 신규
```
games/inflation-rpg/
├── src/screens/Dungeon.tsx                 # 신규: Stage 진행 wrapper
└── src/screens/Dungeon.test.tsx            # 신규: 단위 테스트
```

### 수정
```
games/inflation-rpg/src/
├── types.ts                # MapArea/RunState/Screen 확장
├── data/maps.ts            # 모든 area 에 stage 필드 기본값
├── data/maps.test.ts       # stage 필드 무결성 검증
├── store/gameStore.ts      # stage 진행 actions + save 마이그레이션
├── battle/BattleScene.ts   # stage 단위 종료 콜백
├── screens/Battle.tsx      # Dungeon 의 child 로 적용
├── screens/RegionMap.tsx   # 진입 → Dungeon 화면 전환
└── e2e/full-run.spec.ts    # E2E: stage 진행 검증
```

---

## Task L2-1: 타입 확장 (types.ts)

**Files:**
- Modify: `games/inflation-rpg/src/types.ts`

- [ ] **Step 1: `MapArea` 확장**

기존 인터페이스 끝에 3 필드 추가:

```typescript
export interface MapArea {
  id: string;
  nameKR: string;
  regionId: string;
  levelRange: [number, number];
  bossId?: string;
  isHardOnly: boolean;
  mapX: number;
  mapY: number;
  icon: string;
  stageCount: number;        // 신규: 던전 stage 수 (5-10)
  stageMonsterCount: number; // 신규: stage 당 몬스터 수 (기본 5)
  finalStageIsBoss: boolean; // 신규: 마지막 stage 가 보스인가
}
```

- [ ] **Step 2: `RunState` 확장**

```typescript
export interface RunState {
  characterId: string;
  level: number;
  exp: number;
  bp: number;
  statPoints: number;
  allocated: AllocatedStats;
  currentAreaId: string;
  isHardMode: boolean;
  monstersDefeated: number;
  goldThisRun: number;
  currentStage: number;              // 신규: 현재 stage 번호 (1부터)
  dungeonRunMonstersDefeated: number; // 신규: 현재 던전에서 처치한 몬스터 수
}
```

- [ ] **Step 3: `Screen` union 에 `'dungeon'` 추가**

```typescript
export type Screen =
  | 'main-menu'
  | 'class-select'
  | 'world-map'
  | 'battle'
  | 'dungeon'        // 신규
  | 'stat-alloc'
  | 'inventory'
  | 'shop'
  | 'game-over';
```

- [ ] **Step 4: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

**Expected**: FAILS — `MAP_AREAS` 의 모든 area entry 가 새 필드 누락. 다음 task L2-2 에서 fix. 이번 task 의 typecheck 실패는 의도된 것.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/types.ts
git commit -m "feat(game-inflation-rpg): extend MapArea/RunState/Screen for dungeon structure"
```

---

## Task L2-2: maps.ts 의 모든 area 에 stage 필드 기본값 추가

**Files:**
- Modify: `games/inflation-rpg/src/data/maps.ts`

**전략**: 120 area 전체에 일괄 기본값 추가. 보스 area 는 `stageCount: 10`, 일반 area 는 `stageCount: 7`. `stageMonsterCount: 5` 일괄. `finalStageIsBoss: bossId !== undefined`.

- [ ] **Step 1: 모든 area entry 에 3 필드 추가**

각 entry 의 패턴은:
```typescript
{ id: '...', nameKR: '...', regionId: '...', levelRange: [...], bossId: ..., isHardOnly: ..., mapX: ..., mapY: ..., icon: '...' }
```

다음 패턴으로 변환:
```typescript
{ id: '...', ..., icon: '...', stageCount: <7 or 10>, stageMonsterCount: 5, finalStageIsBoss: <bossId 존재 여부> }
```

쉬운 방법: text editor 의 일괄 replacement.
1. `bossId: undefined,` 가 있는 area → `stageCount: 7, stageMonsterCount: 5, finalStageIsBoss: false`
2. `bossId: 'something',` 가 있는 area → `stageCount: 10, stageMonsterCount: 5, finalStageIsBoss: true`

또는 sed:
```bash
# 각 entry 의 끝 (} 직전) 에 추가
# 패턴: },\n 의 직전을 매칭하기 어렵 — 손으로 한 번에 처리하는 게 빠름
```

가장 안정적: 파일 전체를 읽고, 각 entry 마다 sed 또는 직접 편집.

```bash
# 1. bossId 없는 area: stageCount 7
sed -i '' "s|bossId: undefined, \(.*\)icon: '\([a-z-]*\)' }|bossId: undefined, \1icon: '\2', stageCount: 7, stageMonsterCount: 5, finalStageIsBoss: false }|g" games/inflation-rpg/src/data/maps.ts

# 2. bossId 있는 area: stageCount 10, finalStageIsBoss true
sed -i '' "s|bossId: '\([a-z-]*\)', \(.*\)icon: '\([a-z-]*\)' }|bossId: '\1', \2icon: '\3', stageCount: 10, stageMonsterCount: 5, finalStageIsBoss: true }|g" games/inflation-rpg/src/data/maps.ts
```

(sed 가 잘 안 되면 직접 Edit 으로 한 entry 씩 수정. 또는 awk/python script.)

- [ ] **Step 2: typecheck 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 exit. 모든 area 가 신규 3 필드 포함.

- [ ] **Step 3: 카운트 검증**

```bash
echo "Areas total: $(grep -c "stageCount:" games/inflation-rpg/src/data/maps.ts)"
echo "stageCount 7: $(grep -c "stageCount: 7" games/inflation-rpg/src/data/maps.ts)"
echo "stageCount 10: $(grep -c "stageCount: 10" games/inflation-rpg/src/data/maps.ts)"
```

Expected: total 120. 7 + 10 = 120.

- [ ] **Step 4: 테스트**

```bash
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 120 passed (Layer 1 의 무결성 테스트 포함).

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/data/maps.ts
git commit -m "feat(game-inflation-rpg): add stageCount/stageMonsterCount to all 120 areas"
```

---

## Task L2-3: maps.test.ts 의 stage 필드 무결성 검증 추가

**Files:**
- Modify: `games/inflation-rpg/src/data/maps.test.ts`

- [ ] **Step 1: 새 describe 블록 추가**

```typescript
describe('Layer 2 dungeon structure', () => {
  it('every area has stageCount in [5, 10]', () => {
    for (const area of MAP_AREAS) {
      expect(area.stageCount, `${area.id} stageCount`).toBeGreaterThanOrEqual(5);
      expect(area.stageCount, `${area.id} stageCount`).toBeLessThanOrEqual(10);
    }
  });

  it('every area has stageMonsterCount > 0', () => {
    for (const area of MAP_AREAS) {
      expect(area.stageMonsterCount, `${area.id} stageMonsterCount`).toBeGreaterThan(0);
    }
  });

  it('finalStageIsBoss matches bossId presence', () => {
    for (const area of MAP_AREAS) {
      const expected = area.bossId !== undefined;
      expect(area.finalStageIsBoss, `${area.id}`).toBe(expected);
    }
  });
});
```

- [ ] **Step 2: 테스트 실행**

```bash
pnpm --filter @forge/game-inflation-rpg test data/maps.test
```

Expected: 모두 통과.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/data/maps.test.ts
git commit -m "test(game-inflation-rpg): verify stage fields integrity across 120 areas"
```

---

## Task L2-4: gameStore 확장 — stage 진행 actions + save 마이그레이션

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts`

- [ ] **Step 1: `RunState` 초기값에 신규 필드 추가**

찾기:
```bash
grep -n "currentAreaId\|monstersDefeated\|goldThisRun" games/inflation-rpg/src/store/gameStore.ts
```

`RunState` 가 default 로 초기화되는 곳에 신규 2 필드 추가:
```typescript
currentStage: 1,
dungeonRunMonstersDefeated: 0,
```

(여러 곳일 수 있음 — `INITIAL_RUN_STATE` 또는 `startRun` 액션 등.)

- [ ] **Step 2: 신규 actions 추가**

스토어에 다음 actions 추가:

```typescript
advanceStage: () => void;           // 현재 stage +1
resetDungeon: () => void;           // currentStage = 1, dungeonRunMonstersDefeated = 0
incrementDungeonKill: () => void;   // dungeonRunMonstersDefeated +1 + monstersDefeated +1
```

구현 (set 함수 패턴):
```typescript
advanceStage: () => set(state => ({
  run: { ...state.run, currentStage: state.run.currentStage + 1 }
})),

resetDungeon: () => set(state => ({
  run: { ...state.run, currentStage: 1, dungeonRunMonstersDefeated: 0 }
})),

incrementDungeonKill: () => set(state => ({
  run: {
    ...state.run,
    dungeonRunMonstersDefeated: state.run.dungeonRunMonstersDefeated + 1,
    monstersDefeated: state.run.monstersDefeated + 1,
  }
})),
```

- [ ] **Step 3: save load 마이그레이션**

`loadFromSave` 또는 `JSON.parse` 후 `setState` 부분 찾기:
```bash
grep -n "JSON.parse\|loadFromSave\|persist\|hydrate" games/inflation-rpg/src/store/gameStore.ts
```

로드된 `run` 객체에 신규 필드 누락 시 기본값 주입:
```typescript
function migrateRunState(loaded: any): RunState {
  return {
    ...loaded,
    currentStage: loaded.currentStage ?? 1,
    dungeonRunMonstersDefeated: loaded.dungeonRunMonstersDefeated ?? 0,
  };
}
```

(zustand persist middleware 사용 시 — `migrate` option 또는 `onRehydrateStorage` 에서 처리)

- [ ] **Step 4: typecheck + test**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg test
```

Expected: 0 exit, 120+ passed.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts
git commit -m "feat(game-inflation-rpg): add dungeon stage actions + save migration"
```

---

## Task L2-5: Dungeon.tsx 신규 컴포넌트

**Files:**
- Create: `games/inflation-rpg/src/screens/Dungeon.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import React, { useEffect, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { MAP_AREAS } from '../data/maps';
import { Battle } from './Battle';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { ForgePanel } from '@/components/ui/forge-panel';
import { ForgeButton } from '@/components/ui/forge-button';

export function Dungeon() {
  const run = useGameStore(s => s.run);
  const setScreen = useGameStore(s => s.setScreen);
  const resetDungeon = useGameStore(s => s.resetDungeon);

  const area = useMemo(
    () => MAP_AREAS.find(a => a.id === run.currentAreaId),
    [run.currentAreaId],
  );

  useEffect(() => {
    if (run.currentStage === 1 && run.dungeonRunMonstersDefeated === 0) {
      // 새 던전 진입 — state 초기화는 이미 advanceArea 등에서 처리되어 있어야 함
    }
  }, [run.currentAreaId]);

  if (!area) {
    return (
      <ForgeScreen>
        <ForgePanel>
          <p style={{ color: 'var(--forge-danger)' }}>구역을 찾을 수 없다.</p>
          <ForgeButton onClick={() => setScreen('world-map')}>월드맵</ForgeButton>
        </ForgePanel>
      </ForgeScreen>
    );
  }

  const isFinalStage = run.currentStage >= area.stageCount;
  const stageProgress = run.dungeonRunMonstersDefeated / (area.stageMonsterCount * area.stageCount);

  return (
    <ForgeScreen>
      <div style={{
        padding: '14px 16px',
        background: 'var(--forge-bg-panel)',
        borderBottom: '1px solid var(--forge-border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: 'var(--forge-accent)' }}>
            {area.nameKR}
          </span>
          <span style={{ fontSize: 12, color: 'var(--forge-text-secondary)' }}>
            Stage {run.currentStage} / {area.stageCount}
            {isFinalStage && area.finalStageIsBoss && ' · BOSS'}
          </span>
        </div>
        <div style={{
          height: 4,
          background: 'var(--forge-border)',
          marginTop: 8,
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.min(100, stageProgress * 100)}%`,
            height: '100%',
            background: isFinalStage ? 'var(--forge-danger)' : 'var(--forge-accent)',
            transition: 'width 0.3s',
          }} />
        </div>
      </div>
      <Battle />
    </ForgeScreen>
  );
}
```

- [ ] **Step 2: 단위 테스트 추가**

Create `games/inflation-rpg/src/screens/Dungeon.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dungeon } from './Dungeon';
import { useGameStore } from '../store/gameStore';

describe('Dungeon', () => {
  beforeEach(() => {
    useGameStore.setState({
      run: {
        characterId: 'warrior',
        level: 1,
        exp: 0,
        bp: 0,
        statPoints: 0,
        allocated: { hp: 0, atk: 0, def: 0, agi: 0, luc: 0 },
        currentAreaId: 'village-entrance',
        isHardMode: false,
        monstersDefeated: 0,
        goldThisRun: 0,
        currentStage: 1,
        dungeonRunMonstersDefeated: 0,
      },
    } as any);
  });

  it('renders stage indicator', () => {
    render(<Dungeon />);
    expect(screen.getByText(/Stage 1 \/ 7/)).toBeInTheDocument();
  });

  it('displays area name', () => {
    render(<Dungeon />);
    expect(screen.getByText(/마을 입구/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 테스트 실행**

```bash
pnpm --filter @forge/game-inflation-rpg test screens/Dungeon
```

Expected: 통과.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/screens/Dungeon.tsx \
        games/inflation-rpg/src/screens/Dungeon.test.tsx
git commit -m "feat(game-inflation-rpg): add Dungeon screen with stage progress UI"
```

---

## Task L2-6: BattleScene stage 단위 종료 콜백

**Files:**
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts`

- [ ] **Step 1: monstersDefeated counter → stage 진행 트리거**

기존 BattleScene 의 몬스터 처치 로직에 stage progression 추가.

찾기:
```bash
grep -n "monstersDefeated\|incrementDungeonKill\|advanceStage" games/inflation-rpg/src/battle/BattleScene.ts
```

기존 `monstersDefeated++` 패턴을 `incrementDungeonKill()` store action 호출로 대체:

```typescript
// 기존 (예시):
this.run.monstersDefeated += 1;

// 신규:
useGameStore.getState().incrementDungeonKill();

// stage 종료 체크:
const run = useGameStore.getState().run;
const area = MAP_AREAS.find(a => a.id === run.currentAreaId);
if (area && run.dungeonRunMonstersDefeated >= run.currentStage * area.stageMonsterCount) {
  // 현재 stage 완료
  if (run.currentStage >= area.stageCount) {
    // 던전 클리어
    this.onDungeonComplete();
  } else {
    useGameStore.getState().advanceStage();
  }
}
```

- [ ] **Step 2: `onDungeonComplete` 메서드 추가**

```typescript
private onDungeonComplete() {
  // 보스 처치 + 보장 drop + 월드맵으로 복귀
  useGameStore.getState().resetDungeon();
  useGameStore.getState().setScreen('world-map');
}
```

- [ ] **Step 3: 사망 시 stage 1 리셋**

기존 사망 처리 (HP 0) 부분 찾고:
```bash
grep -n "gameOver\|hp.*<= 0\|setScreen.*game-over" games/inflation-rpg/src/battle/BattleScene.ts
```

사망 핸들러에 추가:
```typescript
useGameStore.getState().resetDungeon();
```

- [ ] **Step 4: typecheck + test**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg test
```

Expected: 0 exit, 122+ passed (Dungeon tests 포함).

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/battle/BattleScene.ts
git commit -m "feat(game-inflation-rpg): wire BattleScene to stage progression and dungeon complete"
```

---

## Task L2-7: RegionMap → Dungeon 진입 연결

**Files:**
- Modify: `games/inflation-rpg/src/screens/RegionMap.tsx`
- Modify: `games/inflation-rpg/src/App.tsx` 또는 main router (Screen 이 'dungeon' 일 때 Dungeon 렌더)

- [ ] **Step 1: RegionMap area 클릭 핸들러 변경**

기존:
```bash
grep -n "setScreen.*battle\|enterArea\|setCurrentArea" games/inflation-rpg/src/screens/RegionMap.tsx
```

기존 `setScreen('battle')` → `setScreen('dungeon')`. 또한 area 진입 시 `resetDungeon` 호출 (새 던전 시작):

```typescript
const enterArea = (areaId: string) => {
  setCurrentArea(areaId);
  resetDungeon();
  setScreen('dungeon');
};
```

- [ ] **Step 2: App.tsx 또는 화면 router 에 'dungeon' case 추가**

```bash
grep -n "screen ===\|case 'battle'" games/inflation-rpg/src/App.tsx
```

기존 `case 'battle': return <Battle />` 옆에:
```typescript
case 'dungeon': return <Dungeon />;
```

import 추가:
```typescript
import { Dungeon } from './screens/Dungeon';
```

(Battle 은 Dungeon 의 child 가 되었으므로, 직접 'battle' screen 으로 진입하는 path 는 제거해도 됨. 단 기존 save 호환을 위해 'battle' case 도 유지하되 redirect 로 처리:)

```typescript
case 'battle':
case 'dungeon':
  return <Dungeon />;
```

- [ ] **Step 3: dev 확인 — 수동 smoke test (생략 가능)**

(자동화 어려우므로 typecheck/test 통과로 갈음)

- [ ] **Step 4: typecheck + test**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg test
```

Expected: 0 exit, 122+ passed.

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/screens/RegionMap.tsx \
        games/inflation-rpg/src/App.tsx
git commit -m "feat(game-inflation-rpg): route area entry through Dungeon screen"
```

---

## Task L2-8: E2E smoke test 갱신

**Files:**
- Modify: `games/inflation-rpg/e2e/full-run.spec.ts` (또는 적절한 spec)

- [ ] **Step 1: 기존 E2E 가 'battle' 화면을 가정하는지 확인**

```bash
grep -n "battle\|dungeon\|Stage" games/inflation-rpg/e2e/*.spec.ts
```

- [ ] **Step 2: dungeon 진입 + stage 표시 확인**

기존 area 클릭 → battle 진입 → 몬스터 처치 흐름을 dungeon 으로 갱신:
- area 클릭 후 `Stage 1 / 7` 또는 `Stage 1 / 10` 텍스트가 화면에 보이는지 확인.

```typescript
test('dungeon stage progression', async ({ page }) => {
  // 기존 setup: 캐릭터 선택, 첫 area 진입까지
  // ...
  await expect(page.getByText(/Stage 1 \/ \d+/)).toBeVisible();
});
```

- [ ] **Step 3: 빌드 + E2E 실행**

```bash
pnpm --filter @forge/game-inflation-rpg build:web
pnpm --filter @forge/game-inflation-rpg e2e
```

Expected: 통과.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/e2e/
git commit -m "test(game-inflation-rpg): update E2E for dungeon stage UI"
```

---

## Task L2-9: 통합 검증 + Phase tag

**Files:**
- (수정 없음)

- [ ] **Step 1: 전체 검증**

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm circular
pnpm --filter @forge/game-inflation-rpg build:web
```

Expected: 모두 0 exit. tests 122+ passed.

- [ ] **Step 2: 정량 검증**

```bash
echo "Areas with stageCount: $(grep -c "stageCount:" games/inflation-rpg/src/data/maps.ts)"
# Expected: 120
```

- [ ] **Step 3: Layer 2 phase tag**

```bash
git tag phase-content-dungeon-complete
git log --oneline phase-content-data-complete..HEAD
```

Expected: Layer 2 의 모든 commit 요약.

---

## 요약

Layer 2 완료 시:
- 모든 120 area 가 stage 던전 구조 (stageCount 5-10)
- 새 `Dungeon.tsx` 화면 (stage 진행 UI)
- BattleScene stage 단위 종료 + 사망 시 stage 1 리셋
- save 마이그레이션 (currentStage, dungeonRunMonstersDefeated)
- E2E smoke 갱신

다음: Layer 3 (크래프트 + 퀘스트) — `2026-04-27-content-layer3-craft-quest-plan.md`.

---

## 알려진 주의사항

| 주의 | 대응 |
| --- | --- |
| L2-2 의 sed 가 모든 entry 를 정확히 매칭하지 않을 수 있음 | sed 결과 후 grep 으로 누락 entry 식별 → 수동 fix |
| BattleScene 의 monstersDefeated 위치가 여러 곳일 수 있음 | grep 결과 모두 incrementDungeonKill 로 변경 |
| 사용자가 진행 중인 save 의 currentStage 누락 | 마이그레이션에서 1 로 주입 (안전 default) |
| Dungeon 화면이 Battle 의 React 셸을 wrap 하므로 layout 충돌 가능 | Dungeon header 가 ForgeScreen 내부 상단 — 기존 Battle 의 absolute positioning 과 충돌 시 spacing 조정 |
| E2E 가 hard-mode 또는 기존 'battle' 직접 진입 사용 시 'dungeon' redirect 누락 | RegionMap 외에도 진입 path 모두 확인 (예: GameOver 의 "다시" 버튼) |

---

**End of Layer 2 plan. Total tasks: 9. Estimated commits: 9.**
