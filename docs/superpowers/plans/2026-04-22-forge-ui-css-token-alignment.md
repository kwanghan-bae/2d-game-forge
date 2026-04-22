# Forge-UI CSS Token Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `games/inflation-rpg/src/styles/game.css`의 CSS 변수와 클래스명을 `--forge-*` / `.forge-*` 규격으로 리네이밍하고, `@forge/core`에 TypeScript UI 토큰 타입 계약을 추가한다.

**Architecture:** 파일 이동 없이 inflation-rpg 내부에서 리네이밍만 수행한다. `@forge/core`에는 CSS 변수 이름과 컴포넌트 prop 타입만 추가한다 (구현 없음). 이 작업이 완료되면 게임 #2 도착 시 `git mv` + import 교체만으로 `@forge/theme-retro` 패키지 분리가 가능하다.

**Tech Stack:** CSS custom properties, TypeScript, React (JSX className).

---

### Task 1: Pre-flight 베이스라인 확인

**Files:**
- Read: `games/inflation-rpg/src/styles/game.css`
- Read: `games/inflation-rpg/src/**/*.test.*`

- [ ] **Step 1: 현재 테스트 전부 통과하는지 확인**

```bash
cd /path/to/2d-game-forge
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 60개 전부 PASS. 하나라도 실패하면 이 작업을 시작하기 전에 원인을 수정한다.

- [ ] **Step 2: 테스트 파일에 CSS 클래스명 참조가 없음을 확인**

```bash
grep -rn "btn-primary\|btn-secondary\|game-root\|scroll-list\|\.panel\|\.screen\b" \
  games/inflation-rpg/src --include="*.test.*" --include="*.spec.*"
```

Expected: 아무 결과도 출력되지 않아야 한다. 결과가 나오면 해당 test assertion을 Task 4 이후에 같이 수정해야 한다 — 계획에 없는 케이스이므로 멈추고 판단한다.

---

### Task 2: `game.css` 전면 리네이밍

**Files:**
- Modify: `games/inflation-rpg/src/styles/game.css`

기존 파일 전체를 아래 내용으로 교체한다. CSS 변수에 `--forge-` 접두사 추가, 클래스명에 `.forge-` 접두사 추가, `.forge-gauge`와 `.forge-inventory-grid` 신규 추가.

- [ ] **Step 1: `game.css` 전체 교체**

`games/inflation-rpg/src/styles/game.css`를 아래 내용으로 교체한다:

```css
:root {
  --forge-bg-base: #0f0f14;
  --forge-bg-panel: #1a1a24;
  --forge-bg-card: #1e1e2e;
  --forge-border: #2a2a38;
  --forge-accent: #f0c060;
  --forge-accent-dim: #2a2410;
  --forge-text-primary: #e8e0d0;
  --forge-text-secondary: #c8b88a;
  --forge-text-muted: #666;
  --forge-stat-hp: #60e060;
  --forge-stat-atk: #e09060;
  --forge-stat-def: #60a0e0;
  --forge-stat-agi: #c060e0;
  --forge-stat-luc: #e0c060;
  --forge-stat-bp: #60c0f0;
  --forge-danger: #e05050;
}

.forge-ui-root {
  background: var(--forge-bg-base);
  color: var(--forge-text-primary);
  font-family: -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
  min-height: 100dvh;
  max-width: 430px;
  margin: 0 auto;
  position: relative;
  overflow-x: hidden;
}

.forge-screen {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
  box-sizing: border-box;
}

.forge-btn.primary {
  background: var(--forge-accent);
  color: #1a1a24;
  font-weight: 700;
  border: none;
  border-radius: 8px;
  padding: 10px 24px;
  cursor: pointer;
  font-size: 15px;
  min-height: 44px;
  touch-action: manipulation;
}

.forge-btn.secondary {
  background: var(--forge-bg-card);
  color: var(--forge-text-primary);
  border: 1px solid var(--forge-border);
  border-radius: 8px;
  padding: 10px 24px;
  cursor: pointer;
  font-size: 15px;
  min-height: 44px;
  touch-action: manipulation;
}

.forge-panel {
  background: var(--forge-bg-panel);
  border: 1px solid var(--forge-border);
  border-radius: 10px;
  padding: 14px;
}

.forge-scroll-list {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}

.forge-gauge {
  position: relative;
  border-radius: 3px;
  overflow: hidden;
}

.forge-inventory-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
```

- [ ] **Step 2: `pnpm dev` 로 렌더링 확인 (선택적)**

```bash
pnpm dev
```

이 시점에 브라우저에서 inflation-rpg를 열면 UI가 스타일을 잃음 (컴포넌트가 아직 구 클래스명 사용). 이는 정상이다. Task 3-4에서 컴포넌트를 업데이트하면 복원된다.

- [ ] **Step 3: 커밋**

```bash
git add games/inflation-rpg/src/styles/game.css
git commit -m "refactor(game-inflation-rpg): rename game.css to forge-* CSS token convention"
```

---

### Task 3: 모든 컴포넌트 CSS 변수 참조 치환

**Files:**
- Modify: `games/inflation-rpg/src/screens/*.tsx`
- Modify: `games/inflation-rpg/src/screens/StatAlloc.tsx`

컴포넌트 파일에서 `var(--*)` 참조를 전부 `var(--forge-*)` 로 교체한다. sed를 사용하여 일괄 처리한다.

주의: `--accent-dim`을 `--accent`보다 **먼저** 처리한다. 순서가 바뀌면 `--accent-dim`이 `--forge-accent-dim`으로 이중 치환된다.

- [ ] **Step 1: sed로 CSS 변수 일괄 치환**

```bash
find games/inflation-rpg/src \( -name "*.tsx" -o -name "*.ts" \) \
  -not -path "*/node_modules/*" | \
  grep -v "\.test\." | \
  xargs sed -i '' \
    -e 's/var(--accent-dim)/var(--forge-accent-dim)/g' \
    -e 's/var(--accent)/var(--forge-accent)/g' \
    -e 's/var(--bg-base)/var(--forge-bg-base)/g' \
    -e 's/var(--bg-panel)/var(--forge-bg-panel)/g' \
    -e 's/var(--bg-card)/var(--forge-bg-card)/g' \
    -e 's/var(--border)/var(--forge-border)/g' \
    -e 's/var(--text-primary)/var(--forge-text-primary)/g' \
    -e 's/var(--text-secondary)/var(--forge-text-secondary)/g' \
    -e 's/var(--text-muted)/var(--forge-text-muted)/g' \
    -e 's/var(--hp-color)/var(--forge-stat-hp)/g' \
    -e 's/var(--atk-color)/var(--forge-stat-atk)/g' \
    -e 's/var(--def-color)/var(--forge-stat-def)/g' \
    -e 's/var(--agi-color)/var(--forge-stat-agi)/g' \
    -e 's/var(--luc-color)/var(--forge-stat-luc)/g' \
    -e 's/var(--bp-color)/var(--forge-stat-bp)/g' \
    -e 's/var(--danger)/var(--forge-danger)/g'
```

- [ ] **Step 2: 치환 결과 검증 — 구 변수명 잔존 여부 확인**

```bash
grep -rn "var(--accent)\|var(--bg-base)\|var(--bg-panel)\|var(--bg-card)\|var(--border)\|var(--text-primary)\|var(--text-secondary)\|var(--text-muted)\|var(--hp-color)\|var(--atk-color)\|var(--def-color)\|var(--agi-color)\|var(--luc-color)\|var(--bp-color)\|var(--danger)" \
  games/inflation-rpg/src --include="*.tsx" --include="*.ts"
```

Expected: 아무 결과도 없어야 한다. 남은 결과가 있으면 수동으로 교체한다.

- [ ] **Step 3: 테스트 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 60개 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add games/inflation-rpg/src
git commit -m "refactor(game-inflation-rpg): replace --* CSS vars with --forge-* namespace"
```

---

### Task 4: 모든 컴포넌트 className 치환

**Files:**
- Modify: `games/inflation-rpg/src/screens/MainMenu.tsx`
- Modify: `games/inflation-rpg/src/screens/ClassSelect.tsx`
- Modify: `games/inflation-rpg/src/screens/Inventory.tsx`
- Modify: `games/inflation-rpg/src/screens/Shop.tsx`
- Modify: `games/inflation-rpg/src/screens/Battle.tsx`
- Modify: `games/inflation-rpg/src/screens/WorldMap.tsx`
- Modify: `games/inflation-rpg/src/screens/RegionMap.tsx`
- Modify: `games/inflation-rpg/src/screens/GameOver.tsx`
- Modify: `games/inflation-rpg/src/screens/StatAlloc.tsx`
- Modify: `games/inflation-rpg/src/App.tsx`

- [ ] **Step 1: sed로 className 일괄 치환**

```bash
find games/inflation-rpg/src -name "*.tsx" | \
  xargs sed -i '' \
    -e 's/className="screen"/className="forge-screen"/g' \
    -e 's/className="panel"/className="forge-panel"/g' \
    -e 's/className="btn-primary"/className="forge-btn primary"/g' \
    -e 's/className="btn-secondary"/className="forge-btn secondary"/g' \
    -e 's/className="scroll-list"/className="forge-scroll-list"/g' \
    -e 's/className="game-root"/className="forge-ui-root"/g'
```

- [ ] **Step 2: 치환 결과 검증 — 구 클래스명 잔존 여부 확인**

```bash
grep -rn 'className="screen"\|className="panel"\|className="btn-primary"\|className="btn-secondary"\|className="scroll-list"\|className="game-root"' \
  games/inflation-rpg/src --include="*.tsx"
```

Expected: 아무 결과도 없어야 한다.

- [ ] **Step 3: 테스트 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 60개 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add games/inflation-rpg/src
git commit -m "refactor(game-inflation-rpg): rename CSS class names to .forge-* convention"
```

---

### Task 5: `StatAlloc.tsx` — `.forge-gauge` 클래스 적용

**Files:**
- Modify: `games/inflation-rpg/src/screens/StatAlloc.tsx:41-43`

게이지 track div에 `.forge-gauge` 클래스를 적용하고, `game.css`의 `.forge-gauge` 클래스가 담당하는 `borderRadius`를 인라인에서 제거한다.

- [ ] **Step 1: StatAlloc.tsx 게이지 div 수정**

`src/screens/StatAlloc.tsx`의 게이지 track 부분을 찾아 아래와 같이 수정한다.

변경 전 (Task 3 이후 var 이름이 이미 치환된 상태):
```tsx
<div style={{ flex: 1, height: 6, background: 'var(--forge-border)', borderRadius: 3 }}>
  <div style={{ height: '100%', borderRadius: 3, background: color, width: `${Math.min(100, run.allocated[key] / 10)}%` }} />
</div>
```

변경 후:
```tsx
<div className="forge-gauge" style={{ flex: 1, height: 6, background: 'var(--forge-border)' }}>
  <div style={{ height: '100%', background: color, width: `${Math.min(100, run.allocated[key] / 10)}%` }} />
</div>
```

`borderRadius: 3`은 `.forge-gauge` CSS 클래스에 있으므로 인라인에서 제거한다.
fill div의 `borderRadius: 3`도 동일하게 제거한다 (overflow: hidden으로 부모가 처리).

- [ ] **Step 2: 테스트 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 60개 전부 PASS.

---

### Task 6: `Inventory.tsx` — `.forge-inventory-grid` 클래스 적용

**Files:**
- Modify: `games/inflation-rpg/src/screens/Inventory.tsx:109-112`

Items 목록 div에서 grid 레이아웃 인라인 스타일을 `.forge-inventory-grid` 클래스로 옮긴다.

- [ ] **Step 1: Inventory.tsx items div 수정**

`src/screens/Inventory.tsx`의 items 목록 div를 찾아 수정한다.

변경 전 (Task 4 이후 className이 이미 치환된 상태):
```tsx
<div
  className="forge-scroll-list"
  style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, maxHeight: '45vh' }}
>
```

변경 후:
```tsx
<div
  className="forge-scroll-list forge-inventory-grid"
  style={{ maxHeight: '45vh' }}
>
```

`display: grid`, `gridTemplateColumns`, `gap`은 `.forge-inventory-grid` CSS 클래스가 담당하므로 인라인에서 제거한다. `maxHeight: '45vh'`는 이 화면에 특정한 값이므로 인라인 유지.

- [ ] **Step 2: 테스트 통과 확인**

```bash
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 60개 전부 PASS.

- [ ] **Step 3: 커밋**

```bash
git add games/inflation-rpg/src/screens/StatAlloc.tsx \
        games/inflation-rpg/src/screens/Inventory.tsx
git commit -m "refactor(game-inflation-rpg): apply forge-gauge and forge-inventory-grid classes"
```

---

### Task 7: `@forge/core` UI 토큰 타입 계약 신규 생성

**Files:**
- Create: `packages/2d-core/src/ui-tokens.ts`

구현 없는 순수 TypeScript 타입/인터페이스 파일. 이 파일은 "타입·계약 선제 정의"에 해당하며 구현 코드를 포함하지 않는다.

- [ ] **Step 1: `ui-tokens.ts` 신규 생성**

`packages/2d-core/src/ui-tokens.ts`를 아래 내용으로 생성한다:

```ts
export interface ForgeCSSTokens {
  '--forge-bg-base': string;
  '--forge-bg-panel': string;
  '--forge-bg-card': string;
  '--forge-border': string;
  '--forge-accent': string;
  '--forge-accent-dim': string;
  '--forge-text-primary': string;
  '--forge-text-secondary': string;
  '--forge-text-muted': string;
  '--forge-stat-hp': string;
  '--forge-stat-atk': string;
  '--forge-stat-def': string;
  '--forge-stat-agi': string;
  '--forge-stat-luc': string;
  '--forge-stat-bp': string;
  '--forge-danger': string;
}

export type ForgeStatToken = 'hp' | 'atk' | 'def' | 'agi' | 'luc' | 'bp';

export interface ForgeButtonProps {
  variant?: 'primary' | 'secondary' | 'disabled';
}

export interface ForgePanelProps {
  variant?: 'inset' | 'elevated';
}

export interface ForgeGaugeProps {
  value: number;
  stat?: ForgeStatToken;
  label?: string;
}

export interface ForgeInventoryGridProps {
  columns?: 2 | 3 | 4;
}
```

- [ ] **Step 2: typecheck 통과 확인**

```bash
pnpm --filter @forge/core typecheck
```

Expected: 0 errors.

---

### Task 8: `@forge/core` `index.ts` re-export + 최종 검증

**Files:**
- Modify: `packages/2d-core/src/index.ts`

- [ ] **Step 1: `index.ts` 에 ui-tokens export 추가**

`packages/2d-core/src/index.ts` 파일 맨 끝에 아래 줄을 추가한다:

```ts
export type {
  ForgeCSSTokens,
  ForgeStatToken,
  ForgeButtonProps,
  ForgePanelProps,
  ForgeGaugeProps,
  ForgeInventoryGridProps,
} from './ui-tokens';
```

- [ ] **Step 2: 전체 typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors 전체 워크스페이스.

- [ ] **Step 3: 전체 테스트**

```bash
pnpm test
```

Expected: 60개 inflation-rpg + 19개 @forge/core 전부 PASS.

- [ ] **Step 4: lint + circular 의존성 검사**

```bash
pnpm lint && pnpm circular
```

Expected: lint 0 errors (boundaries 위반 없음), circular 0 cycles.

- [ ] **Step 5: E2E 테스트**

```bash
pnpm --filter @forge/game-inflation-rpg e2e
```

Expected: full-game-flow PASS.

- [ ] **Step 6: 최종 커밋**

```bash
git add packages/2d-core/src/ui-tokens.ts \
        packages/2d-core/src/index.ts
git commit -m "feat(core): add Forge-UI CSS token TypeScript contracts to @forge/core"
```

---

## 완료 체크리스트

- [ ] `game.css` — `--forge-*` CSS 변수 16개, `.forge-*` 클래스 8개
- [ ] 모든 컴포넌트 — `var(--forge-*)` 참조만 사용
- [ ] 모든 컴포넌트 — `.forge-btn .primary/.secondary`, `.forge-screen`, `.forge-panel`, `.forge-scroll-list` 사용
- [ ] `StatAlloc.tsx` — `.forge-gauge` 적용
- [ ] `Inventory.tsx` — `.forge-inventory-grid` 적용
- [ ] `@forge/core` — `ui-tokens.ts` 신규, `index.ts` re-export
- [ ] 기존 60개 vitest 테스트 전부 PASS
- [ ] `pnpm typecheck` 0 errors
- [ ] `pnpm lint` 0 errors
- [ ] `pnpm circular` 0 cycles
- [ ] `pnpm e2e` full-game-flow PASS
