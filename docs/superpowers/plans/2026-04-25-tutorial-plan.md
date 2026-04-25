# Phase 4c Tutorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [Tutorial 스펙](../specs/2026-04-25-tutorial-spec.md) 의 7 단계 온보딩 오버레이 구현.

**Architecture:** `TUTORIAL_STEPS` 데이터 + `MetaState.tutorialDone/tutorialStep` + `TutorialOverlay` 컴포넌트 + gameStore 4 actions + MainMenu 자동 시작 / "다시" 버튼.

---

## Task T1: types.ts 확장

**Files:**
- Modify: `games/inflation-rpg/src/types.ts`

- [ ] **Step 1: TutorialStep 인터페이스 추가**

```typescript
export interface TutorialStep {
  id: string;
  screen: Screen;
  textKR: string;
  ctaKR: string;
}
```

- [ ] **Step 2: MetaState 확장**

```typescript
export interface MetaState {
  // 기존 필드 …
  tutorialDone: boolean;
  tutorialStep: number;
}
```

- [ ] **Step 3: typecheck (FAIL — INITIAL_META 누락)**

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/types.ts
git commit -m "feat(game-inflation-rpg): add TutorialStep + MetaState tutorial fields"
```

---

## Task T2: data/tutorial.ts

**Files:**
- Create: `games/inflation-rpg/src/data/tutorial.ts`

- [ ] **Step 1: 7 steps 정의**

```typescript
import type { TutorialStep } from '../types';

export const TUTORIAL_STEPS: TutorialStep[] = [
  { id: 't-1-welcome', screen: 'main-menu',
    textKR: '환영한다. 이제 너의 모험이 시작된다. "시작"을 눌러라.',
    ctaKR: '시작' },
  { id: 't-2-class', screen: 'class-select',
    textKR: '16 클래스 중 하나를 골라라. 각 클래스는 고유 패시브 + 액티브 스킬 2개를 가진다.',
    ctaKR: '다음' },
  { id: 't-3-worldmap', screen: 'world-map',
    textKR: '조선 평야부터 시작한다. region 을 클릭해 첫 area "마을 입구" 로 진입.',
    ctaKR: '다음' },
  { id: 't-4-dungeon', screen: 'dungeon',
    textKR: '던전은 5-10 stage 로 구성된다. 마지막 stage 는 보스. 자동 전투니 지켜만 봐도 된다.',
    ctaKR: '다음' },
  { id: 't-5-inventory', screen: 'inventory',
    textKR: '전투에서 얻은 장비는 여기서 장착한다. 같은 장비 3개로 합성해 다음 등급으로 올릴 수 있다.',
    ctaKR: '다음' },
  { id: 't-6-quests', screen: 'quests',
    textKR: '퀘스트는 region 마다 3-5개. 처치/수집 목표 달성 시 보상 수령.',
    ctaKR: '다음' },
  { id: 't-7-end', screen: 'main-menu',
    textKR: '기본은 끝났다. 사망 시 stage 1 부터 다시. BP 모이면 다음 region 해금. 모험을 즐겨라.',
    ctaKR: '완료' },
];

export function getTutorialStep(index: number): TutorialStep | undefined {
  return TUTORIAL_STEPS[index];
}
```

- [ ] **Step 2: Commit**

```bash
git add games/inflation-rpg/src/data/tutorial.ts
git commit -m "feat(game-inflation-rpg): add 7 tutorial steps"
```

---

## Task T3: gameStore — actions + 마이그레이션

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts`

- [ ] **Step 1: INITIAL_META 에 추가**

```typescript
tutorialDone: false,
tutorialStep: -1,
```

- [ ] **Step 2: 인터페이스에 4 actions 선언**

```typescript
setTutorialStep: (index: number) => void;
advanceTutorial: () => void;
skipTutorial: () => void;
restartTutorial: () => void;
```

- [ ] **Step 3: 구현**

```typescript
setTutorialStep: (index) => set((s) => ({ meta: { ...s.meta, tutorialStep: index } })),

advanceTutorial: () => set((s) => {
  const next = s.meta.tutorialStep + 1;
  if (next >= 7) {
    return { meta: { ...s.meta, tutorialDone: true, tutorialStep: -1 } };
  }
  return { meta: { ...s.meta, tutorialStep: next } };
}),

skipTutorial: () => set((s) => ({ meta: { ...s.meta, tutorialDone: true, tutorialStep: -1 } })),

restartTutorial: () => set((s) => ({ meta: { ...s.meta, tutorialDone: false, tutorialStep: 0 } })),
```

- [ ] **Step 4: 마이그레이션**

migrate 함수에 추가:
```typescript
tutorialDone: meta.tutorialDone ?? false,
tutorialStep: meta.tutorialStep ?? -1,
```

- [ ] **Step 5: typecheck + test**

- [ ] **Step 6: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts
git commit -m "feat(game-inflation-rpg): add tutorial actions + save migration"
```

---

## Task T4: TutorialOverlay 컴포넌트 + 테스트

**Files:**
- Create: `games/inflation-rpg/src/components/TutorialOverlay.tsx`
- Create: `games/inflation-rpg/src/components/TutorialOverlay.test.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import { useGameStore } from '../store/gameStore';
import { getTutorialStep } from '../data/tutorial';
import { ForgePanel } from '@/components/ui/forge-panel';
import { ForgeButton } from '@/components/ui/forge-button';

export function TutorialOverlay() {
  const meta = useGameStore((s) => s.meta);
  const screen = useGameStore((s) => s.screen);
  const advanceTutorial = useGameStore((s) => s.advanceTutorial);
  const skipTutorial = useGameStore((s) => s.skipTutorial);

  if (meta.tutorialDone) return null;
  if (meta.tutorialStep < 0) return null;
  const step = getTutorialStep(meta.tutorialStep);
  if (!step) return null;
  if (step.screen !== screen) return null;

  return (
    <div
      data-testid="tutorial-overlay"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300, padding: 16,
      }}
    >
      <ForgePanel variant="elevated" style={{ maxWidth: 360, width: '100%' }}>
        <div style={{ fontSize: 12, color: 'var(--forge-text-muted)', marginBottom: 6 }}>
          튜토리얼 {meta.tutorialStep + 1} / 7
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.7, margin: '8px 0 18px' }}>
          {step.textKR}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <ForgeButton variant="primary" style={{ flex: 1 }} onClick={advanceTutorial}>
            {step.ctaKR}
          </ForgeButton>
          <ForgeButton variant="secondary" onClick={skipTutorial}>
            건너뛰기
          </ForgeButton>
        </div>
      </ForgePanel>
    </div>
  );
}
```

- [ ] **Step 2: 단위 테스트**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TutorialOverlay } from './TutorialOverlay';
import { useGameStore } from '../store/gameStore';

describe('TutorialOverlay', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      meta: { ...useGameStore.getState().meta, tutorialDone: false, tutorialStep: 0 },
    } as any);
  });

  it('renders step 1 on main-menu', () => {
    render(<TutorialOverlay />);
    expect(screen.getByText(/환영한다/)).toBeInTheDocument();
    expect(screen.getByText(/튜토리얼 1 \/ 7/)).toBeInTheDocument();
  });

  it('hides when tutorialDone', () => {
    useGameStore.setState({
      meta: { ...useGameStore.getState().meta, tutorialDone: true, tutorialStep: -1 },
    } as any);
    const { queryByTestId } = render(<TutorialOverlay />);
    expect(queryByTestId('tutorial-overlay')).toBeNull();
  });

  it('hides when screen mismatches step.screen', () => {
    useGameStore.setState({ screen: 'inventory' } as any);
    const { queryByTestId } = render(<TutorialOverlay />);
    expect(queryByTestId('tutorial-overlay')).toBeNull();
  });

  it('advance button increments step', () => {
    render(<TutorialOverlay />);
    fireEvent.click(screen.getByText('시작'));
    expect(useGameStore.getState().meta.tutorialStep).toBe(1);
  });

  it('skip button sets done', () => {
    render(<TutorialOverlay />);
    fireEvent.click(screen.getByText('건너뛰기'));
    expect(useGameStore.getState().meta.tutorialDone).toBe(true);
    expect(useGameStore.getState().meta.tutorialStep).toBe(-1);
  });
});
```

- [ ] **Step 3: 테스트**

```bash
pnpm --filter @forge/game-inflation-rpg test components/TutorialOverlay
```

Expected: 5 passed.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/components/TutorialOverlay.tsx \
        games/inflation-rpg/src/components/TutorialOverlay.test.tsx
git commit -m "feat(game-inflation-rpg): add TutorialOverlay component"
```

---

## Task T5: App.tsx 에 마운트

**Files:**
- Modify: `games/inflation-rpg/src/App.tsx`

- [ ] **Step 1: TutorialOverlay import + 렌더**

App.tsx 의 ForgeScreen 또는 root 레벨 끝에:
```tsx
import { TutorialOverlay } from './components/TutorialOverlay';

// JSX 끝에 (다른 모든 화면 outlet 후):
<TutorialOverlay />
```

- [ ] **Step 2: typecheck + test**

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/App.tsx
git commit -m "feat(game-inflation-rpg): mount TutorialOverlay at app root"
```

---

## Task T6: MainMenu 자동 시작 + "다시" 버튼

**Files:**
- Modify: `games/inflation-rpg/src/screens/MainMenu.tsx`

- [ ] **Step 1: 자동 시작 useEffect**

```tsx
const meta = useGameStore((s) => s.meta);
const setTutorialStep = useGameStore((s) => s.setTutorialStep);

React.useEffect(() => {
  if (!meta.tutorialDone && meta.tutorialStep === -1) {
    setTutorialStep(0);
  }
}, [meta.tutorialDone, meta.tutorialStep]);
```

- [ ] **Step 2: "튜토리얼 다시" 버튼 추가**

```tsx
const restartTutorial = useGameStore((s) => s.restartTutorial);

// Existing buttons 영역에:
<ForgeButton variant="secondary" onClick={restartTutorial}>
  튜토리얼 다시
</ForgeButton>
```

- [ ] **Step 3: typecheck + test**

```bash
pnpm --filter @forge/game-inflation-rpg test screens/MainMenu
```

기존 MainMenu 테스트 — `meta.tutorialDone: true` 등 fixture 추가 필요할 수 있음 (자동 시작 트리거 막기).

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/screens/MainMenu.tsx
# (테스트 fix 필요 시)
git add games/inflation-rpg/src/screens/MainMenu.test.tsx
git commit -m "feat(game-inflation-rpg): MainMenu auto-start + restart tutorial button"
```

---

## Task T7: 통합 검증 + phase tag

- [ ] **Step 1: 전체 검증**

```bash
pnpm typecheck && pnpm test && pnpm lint && pnpm circular
pnpm --filter @forge/game-inflation-rpg build:web
```

Expected: 0 exit, 192+ passed (162 + 5 TutorialOverlay).

- [ ] **Step 2: Phase tag**

```bash
git tag phase-4c-tutorial-complete
```

- [ ] **Step 3: 카운트 검증**

```bash
echo "Tutorial steps: $(grep -c 'id: ' games/inflation-rpg/src/data/tutorial.ts)"
# Expected: 7
```

---

## 요약

7 task, 7+ commits, ~7 tutorial steps + overlay component + auto-start + restart button.

다음: Phase 4b (Sound) — `2026-04-26-sound-spec.md` 별도 phase.

**End of Phase 4c plan. Total tasks: 7.**
