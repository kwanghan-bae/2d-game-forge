# Forge-UI Opus 재설계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [2026-04-22 Opus 재설계 스펙](../specs/2026-04-22-forge-ui-opus-redesign-spec.md) 의 Layer A (공용 규격) + Layer B (inflation-rpg 적용) 를 실제 구현하고, Layer C (scaffold) 는 설계 문서로 완성한다.

**Architecture:** 자체 shadcn registry (`packages/registry/`) 를 로컬 모노레포에 구축하고, `@forge/core` 에 얇은 Phaser-React 토큰 브릿지 유틸을 추가한다. inflation-rpg 가 registry 의 첫 소비자가 되어 Layer A 의 실 작동을 검증한다. Layer C 는 문서만 — 구현은 게임 #2 도착 시까지 유보.

**Tech Stack:** TypeScript 5.6, React 19, Next.js 16, Phaser 3.90, Tailwind CSS v4 (`@theme` + `@apply`), shadcn CLI, pnpm workspaces, Turborepo, ESLint v9 flat config + boundaries v5, Vitest 4 (jsdom), Playwright.

---

## 전체 File Structure 맵

### 새로 생성될 파일

```
packages/2d-core/
├── src/
│   ├── theme-bridge.ts                        # Phaser ↔ React 토큰 유틸
│   └── ui-tokens.ts                           # MODIFY: ForgeScreenProps 추가
└── tests/
    └── theme-bridge.test.ts                   # 단위 테스트

packages/registry/                             # 신규 워크스페이스
├── package.json                               # @forge/registry, private: true
├── registry.json                              # shadcn registry 루트 메니페스트
├── README.md                                  # 사용법 문서
├── r/
│   ├── theme-modern-dark-gold.json            # 테마 registry item
│   ├── forge-screen.json
│   ├── forge-button.json
│   ├── forge-panel.json
│   ├── forge-gauge.json
│   └── forge-inventory-grid.json
├── src/
│   ├── themes/
│   │   └── modern-dark-gold.css               # @theme { --forge-* } 블록
│   └── ui/
│       ├── forge-screen.tsx
│       ├── forge-button.tsx
│       ├── forge-panel.tsx
│       ├── forge-gauge.tsx
│       └── forge-inventory-grid.tsx
└── tests/
    └── registry-items.test.ts                 # JSON 스키마/파일 존재 smoke

games/inflation-rpg/
├── components.json                            # shadcn CLI 설정
├── src/
│   ├── components/ui/                         # ← registry add 결과 복사본
│   │   ├── forge-screen.tsx
│   │   ├── forge-button.tsx
│   │   ├── forge-panel.tsx
│   │   ├── forge-gauge.tsx
│   │   └── forge-inventory-grid.tsx
│   ├── lib/utils.ts                           # cn() helper (shadcn 관례)
│   └── styles/modern-dark-gold.css            # ← registry theme add 결과 복사본
```

### 수정될 파일

```
packages/2d-core/src/
├── index.ts                                   # theme-bridge export 추가
└── ui-tokens.ts                               # ForgeScreenProps 추가

games/inflation-rpg/src/
├── battle/BattleScene.ts                      # hex 3 개 → resolveForgeTheme()
├── styles/game.css                            # :root 블록 제거 (테마 파일로 이식됨)
├── app/globals.css                            # modern-dark-gold.css import 추가
└── (여러 화면 tsx 파일)                          # 점진적 ForgeButton/Panel 등 치환 (섹션 B4 에서 개별 task)

docs/
└── CONTRIBUTING.md                            # §12 canonical forge-app 계약 확장

eslint.config.mjs                              # registry element type 추가

pnpm-workspace.yaml                            # 이미 packages/* 포함 — 수정 불필요
```

### 문서 신규

```
docs/superpowers/specs/
└── 2026-04-22-create-game-cli-contract-sketch.md   # Layer C CLI 계약 스케치
```

---

## Layer A — 공용 규격 (Tasks A1-A13)

### Task A1: `ForgeScreenProps` 인터페이스 추가

forge-screen 컴포넌트에 필요한 props 타입을 기존 `ui-tokens.ts` 에 추가한다.

**Files:**
- Modify: `packages/2d-core/src/ui-tokens.ts`
- Modify: `packages/2d-core/src/index.ts` (export 추가)

- [ ] **Step 1: `ui-tokens.ts` 에 `ForgeScreenProps` 인터페이스 추가**

파일 끝에 추가 (기존 인터페이스 네 개 다음):

```typescript
export interface ForgeScreenProps {
  /** safe-area-inset padding 을 수동으로 비활성화. 기본값 true (모든 방향 적용). */
  safeArea?: boolean;
}
```

- [ ] **Step 2: `index.ts` 의 export 에 `ForgeScreenProps` 추가**

기존 `ui-tokens` export 블록을 다음과 같이 수정:

```typescript
export type {
  ForgeCSSTokens,
  ForgeStatToken,
  ForgeButtonProps,
  ForgePanelProps,
  ForgeGaugeProps,
  ForgeInventoryGridProps,
  ForgeScreenProps,
} from './ui-tokens';
```

- [ ] **Step 3: typecheck**

```bash
pnpm --filter @forge/core typecheck
```

Expected: 0 exit.

- [ ] **Step 4: 기존 테스트 모두 통과 확인**

```bash
pnpm --filter @forge/core test
```

Expected: 19 passed (기존 건수).

- [ ] **Step 5: 커밋**

```bash
git add packages/2d-core/src/ui-tokens.ts packages/2d-core/src/index.ts
git commit -m "feat(core): add ForgeScreenProps interface for forge-screen component"
```

---

### Task A2: `theme-bridge.ts` 단위 테스트 작성 (TDD — FAIL first)

Phaser-React 토큰 브릿지의 테스트를 먼저 작성한다. jsdom 환경에서 CSS 변수를 설정하고 파싱 결과를 검증.

**Files:**
- Create: `packages/2d-core/tests/theme-bridge.test.ts`

- [ ] **Step 1: 테스트 파일 작성**

```typescript
// packages/2d-core/tests/theme-bridge.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { readForgeToken, resolveForgeTheme } from '../src/theme-bridge';

const ALL_TOKENS: Record<string, string> = {
  '--forge-bg-base': '#0f0f14',
  '--forge-bg-panel': '#1a1a24',
  '--forge-bg-card': '#1e1e2e',
  '--forge-border': '#2a2a38',
  '--forge-accent': '#f0c060',
  '--forge-accent-dim': '#2a2410',
  '--forge-text-primary': '#e8e0d0',
  '--forge-text-secondary': '#c8b88a',
  '--forge-text-muted': '#666666',
  '--forge-stat-hp': '#60e060',
  '--forge-stat-atk': '#e09060',
  '--forge-stat-def': '#60a0e0',
  '--forge-stat-agi': '#c060e0',
  '--forge-stat-luc': '#e0c060',
  '--forge-stat-bp': '#60c0f0',
  '--forge-danger': '#e05050',
};

describe('theme-bridge', () => {
  beforeEach(() => {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(ALL_TOKENS)) {
      root.style.setProperty(name, value);
    }
  });

  describe('readForgeToken', () => {
    it('converts #RRGGBB hex to 0xRRGGBB number', () => {
      expect(readForgeToken('--forge-bg-base')).toBe(0x0f0f14);
      expect(readForgeToken('--forge-accent')).toBe(0xf0c060);
      expect(readForgeToken('--forge-danger')).toBe(0xe05050);
    });

    it('handles stat color tokens', () => {
      expect(readForgeToken('--forge-stat-hp')).toBe(0x60e060);
      expect(readForgeToken('--forge-stat-atk')).toBe(0xe09060);
      expect(readForgeToken('--forge-stat-def')).toBe(0x60a0e0);
    });
  });

  describe('resolveForgeTheme', () => {
    it('returns object with all ForgeThemeBridge fields', () => {
      const theme = resolveForgeTheme();
      expect(theme.bg).toBe(0x0f0f14);
      expect(theme.panel).toBe(0x1a1a24);
      expect(theme.card).toBe(0x1e1e2e);
      expect(theme.border).toBe(0x2a2a38);
      expect(theme.accent).toBe(0xf0c060);
      expect(theme.text).toBe(0xe8e0d0);
      expect(theme.hp).toBe(0x60e060);
      expect(theme.atk).toBe(0xe09060);
      expect(theme.def).toBe(0x60a0e0);
      expect(theme.agi).toBe(0xc060e0);
      expect(theme.luc).toBe(0xe0c060);
      expect(theme.bp).toBe(0x60c0f0);
      expect(theme.danger).toBe(0xe05050);
    });

    it('produces numeric values suitable for Phaser fillColor', () => {
      const theme = resolveForgeTheme();
      for (const value of Object.values(theme)) {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(0xffffff);
      }
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
pnpm --filter @forge/core test theme-bridge
```

Expected: FAIL with message about `theme-bridge` module not found (파일 아직 없음).

---

### Task A3: `theme-bridge.ts` 구현

위 테스트를 통과시키는 최소 구현.

**Files:**
- Create: `packages/2d-core/src/theme-bridge.ts`
- Modify: `packages/2d-core/src/index.ts`

- [ ] **Step 1: `theme-bridge.ts` 작성**

```typescript
// packages/2d-core/src/theme-bridge.ts
import type { ForgeCSSTokens } from './ui-tokens';

/**
 * Read a CSS custom property from :root and parse as 0xRRGGBB.
 * Phaser Graphics / Text 객체의 fillColor / color 속성에 바로 주입 가능.
 * Client-only — Phaser Scene.create() 시점에서만 호출.
 *
 * 제약: CSS 변수 값은 6자리 hex (#RRGGBB) 전제.
 *       3자리 hex / rgb() / hsl() 등은 지원하지 않는다.
 *       토큰 테마 CSS 작성 시 이 제약을 준수해야 한다.
 */
export function readForgeToken(name: keyof ForgeCSSTokens): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return parseInt(raw.replace('#', ''), 16);
}

/**
 * Phaser Scene 에서 소비할 토큰 묶음.
 * 키는 스텟 심볼 (bg/panel/hp 등) 이며, 값은 0xRRGGBB number.
 */
export interface ForgeThemeBridge {
  bg: number;       // --forge-bg-base
  panel: number;    // --forge-bg-panel
  card: number;     // --forge-bg-card
  border: number;   // --forge-border
  accent: number;   // --forge-accent
  text: number;     // --forge-text-primary
  hp: number;       // --forge-stat-hp
  atk: number;      // --forge-stat-atk
  def: number;      // --forge-stat-def
  agi: number;      // --forge-stat-agi
  luc: number;      // --forge-stat-luc
  bp: number;       // --forge-stat-bp
  danger: number;   // --forge-danger
}

/**
 * 편의 팩토리: Phaser Scene 이 한 번에 여러 토큰 소비할 때 사용.
 * 내부적으로 readForgeToken 을 여러 번 호출하는 얇은 wrapper.
 */
export function resolveForgeTheme(): ForgeThemeBridge {
  return {
    bg: readForgeToken('--forge-bg-base'),
    panel: readForgeToken('--forge-bg-panel'),
    card: readForgeToken('--forge-bg-card'),
    border: readForgeToken('--forge-border'),
    accent: readForgeToken('--forge-accent'),
    text: readForgeToken('--forge-text-primary'),
    hp: readForgeToken('--forge-stat-hp'),
    atk: readForgeToken('--forge-stat-atk'),
    def: readForgeToken('--forge-stat-def'),
    agi: readForgeToken('--forge-stat-agi'),
    luc: readForgeToken('--forge-stat-luc'),
    bp: readForgeToken('--forge-stat-bp'),
    danger: readForgeToken('--forge-danger'),
  };
}
```

- [ ] **Step 2: `index.ts` 에 export 추가**

파일 끝에 추가:

```typescript
export { readForgeToken, resolveForgeTheme } from './theme-bridge';
export type { ForgeThemeBridge } from './theme-bridge';
```

- [ ] **Step 3: 테스트 실행 — PASS 확인**

```bash
pnpm --filter @forge/core test theme-bridge
```

Expected: all theme-bridge tests pass.

- [ ] **Step 4: 전체 테스트 회귀 확인**

```bash
pnpm --filter @forge/core test
```

Expected: 19 기존 + 5 신규 = 24 passed.

- [ ] **Step 5: typecheck**

```bash
pnpm --filter @forge/core typecheck
```

Expected: 0 exit.

- [ ] **Step 6: 커밋**

```bash
git add packages/2d-core/src/theme-bridge.ts \
        packages/2d-core/src/index.ts \
        packages/2d-core/tests/theme-bridge.test.ts
git commit -m "feat(core): add Phaser-React theme bridge (readForgeToken, resolveForgeTheme)"
```

---

### Task A4: `@forge/registry` 워크스페이스 스켈레톤 생성

**Files:**
- Create: `packages/registry/package.json`
- Create: `packages/registry/tsconfig.json`
- Create: `packages/registry/README.md`
- Create: `packages/registry/.eslintrc` (없음 — 루트 eslint.config.mjs 가 처리)

- [ ] **Step 1: `package.json` 작성**

```json
{
  "name": "@forge/registry",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Local shadcn registry of Forge-UI components and themes. Sources are copied into each game via `pnpm dlx shadcn add`.",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@forge/core": "workspace:^"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "react": "19.2.3",
    "typescript": "^5.6.0",
    "vitest": "^4.0.16"
  }
}
```

- [ ] **Step 2: `tsconfig.json` 작성**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx",
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests", "r"]
}
```

- [ ] **Step 3: `README.md` 작성**

```markdown
# @forge/registry

로컬 shadcn registry — Forge-UI 의 공용 컴포넌트 및 테마 소스를 호스팅한다.
각 게임은 `pnpm dlx shadcn@latest add file:../../packages/registry/r/<item>.json` 으로
**소스를 자기 워크스페이스에 복사** 하여 사용. npm 의존성이 아님.

## 현재 제공 아이템

| name | type | 용도 |
| --- | --- | --- |
| `theme-modern-dark-gold` | theme | 기본 테마 — Modern Dark + Gold (inflation-rpg 미학) |
| `forge-screen` | ui | 앱 최상위 래퍼. safe-area padding + 100dvh |
| `forge-button` | ui | primary / secondary / disabled 3 variant |
| `forge-panel` | ui | inset / elevated 2 variant |
| `forge-gauge` | ui | 스텟 게이지 바. hp/atk/def/agi/luc/bp 토큰 지원 |
| `forge-inventory-grid` | ui | 2/3/4 컬럼 그리드 |

## 새 게임에서 사용하기

1. `components.json` 생성:
   ```json
   {
     "$schema": "https://ui.shadcn.com/schema.json",
     "tailwind": { "css": "src/app/globals.css", "baseColor": "neutral" },
     "aliases": { "ui": "@/components/ui", "utils": "@/lib/utils" }
   }
   ```
2. 테마 + 컴포넌트 add:
   ```bash
   pnpm dlx shadcn@latest add file:../../packages/registry/r/theme-modern-dark-gold.json
   pnpm dlx shadcn@latest add file:../../packages/registry/r/forge-button.json
   # ...
   ```
3. `src/app/globals.css` 에 테마 CSS import.

## 새 아이템 추가 절차

1. `src/ui/forge-xxx.tsx` 혹은 `src/themes/xxx.css` 소스 작성
2. `r/forge-xxx.json` registry 메타데이터 작성
3. `registry.json` 의 `items` 배열에 참조 추가
4. `tests/registry-items.test.ts` 가 자동 검증
```

- [ ] **Step 4: `pnpm install` 실행하여 워크스페이스 등록**

```bash
pnpm install
```

Expected: `@forge/registry` 가 pnpm workspace list 에 추가됨.

- [ ] **Step 5: 확인**

```bash
pnpm list --depth -1 | grep registry
```

Expected: `@forge/registry 0.1.0` 표시.

- [ ] **Step 6: 커밋**

```bash
git add packages/registry/package.json \
        packages/registry/tsconfig.json \
        packages/registry/README.md \
        pnpm-lock.yaml
git commit -m "feat(registry): add @forge/registry workspace skeleton"
```

---

### Task A5: `lib/utils.ts` (cn helper) 소스 파일 작성

shadcn 컴포넌트 관례로 `cn()` 헬퍼가 필요. registry 쪽에는 소스만 두고, 각 게임이 add 시 `src/lib/utils.ts` 로 복사.

**Files:**
- Create: `packages/registry/src/lib/utils.ts`

- [ ] **Step 1: `utils.ts` 작성**

```typescript
// packages/registry/src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';

/**
 * 조건부 className 머지 헬퍼. shadcn 관례.
 * clsx 는 falsy 값 필터링 + 배열/오브젝트 변환.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
```

- [ ] **Step 2: `@forge/registry` 의 `package.json` 에 `clsx` 의존성 추가**

`dependencies` 블록에 추가:

```json
{
  "dependencies": {
    "@forge/core": "workspace:^",
    "clsx": "^2.1.1"
  }
}
```

- [ ] **Step 3: `pnpm install` 로 의존성 추가**

```bash
pnpm --filter @forge/registry install
```

Expected: clsx 설치 성공.

- [ ] **Step 4: typecheck**

```bash
pnpm --filter @forge/registry typecheck
```

Expected: 0 exit.

- [ ] **Step 5: 커밋**

```bash
git add packages/registry/src/lib/utils.ts packages/registry/package.json pnpm-lock.yaml
git commit -m "feat(registry): add cn() className helper + clsx dep"
```

---

### Task A6: `theme-modern-dark-gold.css` 테마 CSS 파일 작성

`:root` 스타일을 Tailwind v4 `@theme` 블록으로 이식. 현재 inflation-rpg `game.css:1-18` 의 `--forge-*` 세트를 기준으로 작성.

**Files:**
- Create: `packages/registry/src/themes/modern-dark-gold.css`

- [ ] **Step 1: 테마 CSS 작성**

```css
/* packages/registry/src/themes/modern-dark-gold.css */
/*
 * Forge-UI 기본 테마 — Modern Dark + Gold.
 * inflation-rpg 의 원래 미학 (#0f0f14 배경, 금색 악센트, 라운드 10px 패널).
 *
 * 각 토큰은 6 자리 hex (#RRGGBB) 만 사용한다. readForgeToken 이 3 자리 hex / rgb() /
 * hsl() 을 파싱하지 않는다.
 */

@import "tailwindcss";

@theme {
  --color-forge-bg-base: #0f0f14;
  --color-forge-bg-panel: #1a1a24;
  --color-forge-bg-card: #1e1e2e;
  --color-forge-border: #2a2a38;
  --color-forge-accent: #f0c060;
  --color-forge-accent-dim: #2a2410;
  --color-forge-text-primary: #e8e0d0;
  --color-forge-text-secondary: #c8b88a;
  --color-forge-text-muted: #666666;
  --color-forge-stat-hp: #60e060;
  --color-forge-stat-atk: #e09060;
  --color-forge-stat-def: #60a0e0;
  --color-forge-stat-agi: #c060e0;
  --color-forge-stat-luc: #e0c060;
  --color-forge-stat-bp: #60c0f0;
  --color-forge-danger: #e05050;
}

/*
 * Non-theme CSS 변수 (readForgeToken 용).
 * @theme 블록은 --color-forge-* 네이밍을 강제하지만,
 * ForgeCSSTokens 타입은 --forge-* 네이밍으로 고정되어 있어
 * :root 에 추가 alias 를 선언한다.
 */
:root {
  --forge-bg-base: var(--color-forge-bg-base);
  --forge-bg-panel: var(--color-forge-bg-panel);
  --forge-bg-card: var(--color-forge-bg-card);
  --forge-border: var(--color-forge-border);
  --forge-accent: var(--color-forge-accent);
  --forge-accent-dim: var(--color-forge-accent-dim);
  --forge-text-primary: var(--color-forge-text-primary);
  --forge-text-secondary: var(--color-forge-text-secondary);
  --forge-text-muted: var(--color-forge-text-muted);
  --forge-stat-hp: var(--color-forge-stat-hp);
  --forge-stat-atk: var(--color-forge-stat-atk);
  --forge-stat-def: var(--color-forge-stat-def);
  --forge-stat-agi: var(--color-forge-stat-agi);
  --forge-stat-luc: var(--color-forge-stat-luc);
  --forge-stat-bp: var(--color-forge-stat-bp);
  --forge-danger: var(--color-forge-danger);
}
```

- [ ] **Step 2: 커밋**

```bash
git add packages/registry/src/themes/modern-dark-gold.css
git commit -m "feat(registry): add theme-modern-dark-gold CSS (Tailwind v4 @theme)"
```

---

### Task A7: `theme-modern-dark-gold.json` registry item 메타데이터 작성

shadcn CLI 가 읽는 JSON 스펙. 파일 복사 대상과 의존성 명시.

**Files:**
- Create: `packages/registry/r/theme-modern-dark-gold.json`

- [ ] **Step 1: JSON 작성**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "theme-modern-dark-gold",
  "type": "registry:theme",
  "title": "Modern Dark + Gold theme",
  "description": "Forge-UI 기본 테마 — #0f0f14 배경에 #f0c060 골드 악센트. inflation-rpg 원래 미학.",
  "files": [
    {
      "path": "packages/registry/src/themes/modern-dark-gold.css",
      "type": "registry:theme",
      "target": "src/styles/modern-dark-gold.css"
    }
  ]
}
```

- [ ] **Step 2: 커밋**

```bash
git add packages/registry/r/theme-modern-dark-gold.json
git commit -m "feat(registry): add theme-modern-dark-gold registry item"
```

---

### Task A8: `forge-screen.tsx` 컴포넌트 작성

**Files:**
- Create: `packages/registry/src/ui/forge-screen.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
// packages/registry/src/ui/forge-screen.tsx
import * as React from 'react';
import type { ForgeScreenProps } from '@forge/core';
import { cn } from '@/lib/utils';

/**
 * 앱 최상위 래퍼. 100dvh 높이 + env(safe-area-inset-*) padding.
 * iOS notch / Dynamic Island / Android gesture bar 를 자동 회피.
 */
export const ForgeScreen = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & ForgeScreenProps
>(({ className, safeArea = true, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('forge-screen', !safeArea && 'forge-screen--no-safe-area', className)}
    {...props}
  >
    {children}
  </div>
));
ForgeScreen.displayName = 'ForgeScreen';
```

- [ ] **Step 2: 커밋**

```bash
git add packages/registry/src/ui/forge-screen.tsx
git commit -m "feat(registry): add forge-screen component"
```

---

### Task A9: `forge-screen.json` registry item 작성

**Files:**
- Create: `packages/registry/r/forge-screen.json`

- [ ] **Step 1: JSON 작성**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "forge-screen",
  "type": "registry:ui",
  "title": "ForgeScreen",
  "description": "앱 최상위 래퍼. safe-area padding + 100dvh 높이.",
  "dependencies": ["@forge/core", "clsx"],
  "registryDependencies": [],
  "files": [
    {
      "path": "packages/registry/src/ui/forge-screen.tsx",
      "type": "registry:ui",
      "target": "src/components/ui/forge-screen.tsx"
    },
    {
      "path": "packages/registry/src/lib/utils.ts",
      "type": "registry:lib",
      "target": "src/lib/utils.ts"
    }
  ]
}
```

- [ ] **Step 2: 커밋**

```bash
git add packages/registry/r/forge-screen.json
git commit -m "feat(registry): add forge-screen registry item"
```

---

### Task A10: `forge-button.tsx` + JSON 작성

**Files:**
- Create: `packages/registry/src/ui/forge-button.tsx`
- Create: `packages/registry/r/forge-button.json`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
// packages/registry/src/ui/forge-button.tsx
import * as React from 'react';
import type { ForgeButtonProps } from '@forge/core';
import { cn } from '@/lib/utils';

/**
 * Forge-UI 기본 버튼.
 * variant: primary (골드) / secondary (다크) / disabled (둘 중 하나 + 비활성)
 * 최소 터치 타겟 44px 준수.
 */
export const ForgeButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & ForgeButtonProps
>(({ className, variant = 'primary', disabled, ...props }, ref) => {
  const resolvedVariant = disabled ? 'disabled' : variant;
  return (
    <button
      ref={ref}
      disabled={disabled || variant === 'disabled'}
      className={cn('forge-btn', resolvedVariant, className)}
      {...props}
    />
  );
});
ForgeButton.displayName = 'ForgeButton';
```

- [ ] **Step 2: JSON 작성**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "forge-button",
  "type": "registry:ui",
  "title": "ForgeButton",
  "description": "Forge-UI 기본 버튼. primary / secondary / disabled variant.",
  "dependencies": ["@forge/core", "clsx"],
  "registryDependencies": [],
  "files": [
    {
      "path": "packages/registry/src/ui/forge-button.tsx",
      "type": "registry:ui",
      "target": "src/components/ui/forge-button.tsx"
    },
    {
      "path": "packages/registry/src/lib/utils.ts",
      "type": "registry:lib",
      "target": "src/lib/utils.ts"
    }
  ]
}
```

- [ ] **Step 3: 커밋**

```bash
git add packages/registry/src/ui/forge-button.tsx packages/registry/r/forge-button.json
git commit -m "feat(registry): add forge-button component and item"
```

---

### Task A11: `forge-panel.tsx` + JSON 작성

**Files:**
- Create: `packages/registry/src/ui/forge-panel.tsx`
- Create: `packages/registry/r/forge-panel.json`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
// packages/registry/src/ui/forge-panel.tsx
import * as React from 'react';
import type { ForgePanelProps } from '@forge/core';
import { cn } from '@/lib/utils';

/**
 * Forge-UI 레이아웃 컨테이너.
 * variant: inset (기본, 테두리 + 둥근 10px) / elevated (그림자 강조)
 */
export const ForgePanel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & ForgePanelProps
>(({ className, variant = 'inset', children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('forge-panel', variant, className)}
    {...props}
  >
    {children}
  </div>
));
ForgePanel.displayName = 'ForgePanel';
```

- [ ] **Step 2: JSON 작성**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "forge-panel",
  "type": "registry:ui",
  "title": "ForgePanel",
  "description": "Forge-UI 레이아웃 컨테이너. inset / elevated variant.",
  "dependencies": ["@forge/core", "clsx"],
  "registryDependencies": [],
  "files": [
    {
      "path": "packages/registry/src/ui/forge-panel.tsx",
      "type": "registry:ui",
      "target": "src/components/ui/forge-panel.tsx"
    },
    {
      "path": "packages/registry/src/lib/utils.ts",
      "type": "registry:lib",
      "target": "src/lib/utils.ts"
    }
  ]
}
```

- [ ] **Step 3: 커밋**

```bash
git add packages/registry/src/ui/forge-panel.tsx packages/registry/r/forge-panel.json
git commit -m "feat(registry): add forge-panel component and item"
```

---

### Task A12: `forge-gauge.tsx` + JSON 작성

**Files:**
- Create: `packages/registry/src/ui/forge-gauge.tsx`
- Create: `packages/registry/r/forge-gauge.json`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
// packages/registry/src/ui/forge-gauge.tsx
import * as React from 'react';
import type { ForgeGaugeProps, ForgeStatToken } from '@forge/core';
import { cn } from '@/lib/utils';

const STAT_COLORS: Record<ForgeStatToken, string> = {
  hp: 'var(--forge-stat-hp)',
  atk: 'var(--forge-stat-atk)',
  def: 'var(--forge-stat-def)',
  agi: 'var(--forge-stat-agi)',
  luc: 'var(--forge-stat-luc)',
  bp: 'var(--forge-stat-bp)',
};

/**
 * Forge-UI 스텟 게이지 바.
 * value: 0-1 사이 비율. stat 토큰에 따라 채움 색상 자동 선택.
 */
export const ForgeGauge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & ForgeGaugeProps
>(({ className, value, stat = 'hp', label, ...props }, ref) => {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const color = STAT_COLORS[stat];
  return (
    <div
      ref={ref}
      className={cn('forge-gauge', className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      {...props}
    >
      <div
        className="forge-gauge__fill"
        style={{ width: `${pct}%`, background: color, height: '100%' }}
      />
    </div>
  );
});
ForgeGauge.displayName = 'ForgeGauge';
```

- [ ] **Step 2: JSON 작성**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "forge-gauge",
  "type": "registry:ui",
  "title": "ForgeGauge",
  "description": "Forge-UI 스텟 게이지 바. hp/atk/def/agi/luc/bp 토큰 지원.",
  "dependencies": ["@forge/core", "clsx"],
  "registryDependencies": [],
  "files": [
    {
      "path": "packages/registry/src/ui/forge-gauge.tsx",
      "type": "registry:ui",
      "target": "src/components/ui/forge-gauge.tsx"
    },
    {
      "path": "packages/registry/src/lib/utils.ts",
      "type": "registry:lib",
      "target": "src/lib/utils.ts"
    }
  ]
}
```

- [ ] **Step 3: 커밋**

```bash
git add packages/registry/src/ui/forge-gauge.tsx packages/registry/r/forge-gauge.json
git commit -m "feat(registry): add forge-gauge component and item"
```

---

### Task A13: `forge-inventory-grid.tsx` + JSON 작성

**Files:**
- Create: `packages/registry/src/ui/forge-inventory-grid.tsx`
- Create: `packages/registry/r/forge-inventory-grid.json`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
// packages/registry/src/ui/forge-inventory-grid.tsx
import * as React from 'react';
import type { ForgeInventoryGridProps } from '@forge/core';
import { cn } from '@/lib/utils';

/**
 * Forge-UI 인벤토리 그리드.
 * columns: 2 / 3 / 4 (기본 2). CSS grid-template-columns 자동 설정.
 */
export const ForgeInventoryGrid = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & ForgeInventoryGridProps
>(({ className, columns = 2, style, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('forge-inventory-grid', className)}
    style={{
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
));
ForgeInventoryGrid.displayName = 'ForgeInventoryGrid';
```

- [ ] **Step 2: JSON 작성**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "forge-inventory-grid",
  "type": "registry:ui",
  "title": "ForgeInventoryGrid",
  "description": "Forge-UI 인벤토리 그리드. 2/3/4 컬럼 지원.",
  "dependencies": ["@forge/core", "clsx"],
  "registryDependencies": [],
  "files": [
    {
      "path": "packages/registry/src/ui/forge-inventory-grid.tsx",
      "type": "registry:ui",
      "target": "src/components/ui/forge-inventory-grid.tsx"
    },
    {
      "path": "packages/registry/src/lib/utils.ts",
      "type": "registry:lib",
      "target": "src/lib/utils.ts"
    }
  ]
}
```

- [ ] **Step 3: 커밋**

```bash
git add packages/registry/src/ui/forge-inventory-grid.tsx \
        packages/registry/r/forge-inventory-grid.json
git commit -m "feat(registry): add forge-inventory-grid component and item"
```

---

### Task A14: `registry.json` 루트 매니페스트 작성

shadcn CLI 가 레지스트리 전체 인덱스로 읽는 루트 파일.

**Files:**
- Create: `packages/registry/registry.json`

- [ ] **Step 1: `registry.json` 작성**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "@forge/registry",
  "homepage": "https://github.com/kwanghan-bae/2d-game-forge",
  "items": [
    {
      "name": "theme-modern-dark-gold",
      "type": "registry:theme",
      "title": "Modern Dark + Gold theme"
    },
    {
      "name": "forge-screen",
      "type": "registry:ui",
      "title": "ForgeScreen"
    },
    {
      "name": "forge-button",
      "type": "registry:ui",
      "title": "ForgeButton"
    },
    {
      "name": "forge-panel",
      "type": "registry:ui",
      "title": "ForgePanel"
    },
    {
      "name": "forge-gauge",
      "type": "registry:ui",
      "title": "ForgeGauge"
    },
    {
      "name": "forge-inventory-grid",
      "type": "registry:ui",
      "title": "ForgeInventoryGrid"
    }
  ]
}
```

- [ ] **Step 2: 커밋**

```bash
git add packages/registry/registry.json
git commit -m "feat(registry): add registry.json root manifest (6 items)"
```

---

### Task A15: registry items smoke test 작성

각 `r/*.json` 아이템이 참조하는 `files[].path` 가 실제 존재하는지 검증하는 단위 테스트.

**Files:**
- Create: `packages/registry/tests/registry-items.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// packages/registry/tests/registry-items.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');

interface RegistryItem {
  name: string;
  type: string;
  files: Array<{ path: string; type: string; target: string }>;
}

const ITEMS = [
  'theme-modern-dark-gold',
  'forge-screen',
  'forge-button',
  'forge-panel',
  'forge-gauge',
  'forge-inventory-grid',
];

describe('registry items', () => {
  it('registry.json references all known items', () => {
    const manifestPath = resolve(here, '../registry.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const names = manifest.items.map((i: { name: string }) => i.name).sort();
    expect(names).toEqual([...ITEMS].sort());
  });

  ITEMS.forEach((name) => {
    it(`item "${name}" has valid r/*.json with existing file paths`, () => {
      const itemPath = resolve(here, `../r/${name}.json`);
      expect(existsSync(itemPath)).toBe(true);
      const item: RegistryItem = JSON.parse(readFileSync(itemPath, 'utf-8'));
      expect(item.name).toBe(name);
      expect(item.files.length).toBeGreaterThan(0);

      for (const f of item.files) {
        const abs = join(repoRoot, f.path);
        expect(existsSync(abs), `${name}: ${f.path} does not exist`).toBe(true);
        expect(f.target).toMatch(/^src\//);
      }
    });
  });
});
```

- [ ] **Step 2: vitest 설정 생성**

**Files:**
- Create: `packages/registry/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: 테스트 실행 — PASS 확인**

```bash
pnpm --filter @forge/registry test
```

Expected: 7 passed (1 manifest + 6 items).

- [ ] **Step 4: 커밋**

```bash
git add packages/registry/tests/registry-items.test.ts \
        packages/registry/vitest.config.ts
git commit -m "test(registry): verify registry.json and r/*.json file references"
```

---

### Task A16: ESLint boundaries 룰에 `registry` element 추가

`eslint.config.mjs` 를 수정하여 `registry` 패턴과 허용 규칙을 등록한다.

**Files:**
- Modify: `eslint.config.mjs`

- [ ] **Step 1: `boundaries/elements` 에 `registry` 추가**

기존 배열:
```javascript
'boundaries/elements': [
  { type: 'core', pattern: 'packages/2d-core/**', mode: 'full' },
  { type: 'genre', pattern: 'packages/2d-*-core/**', mode: 'full' },
  { type: 'plugin', pattern: 'packages/economy-*/**', mode: 'full' },
  { type: 'content', pattern: 'packages/content-*/**', mode: 'full' },
  { type: 'game', pattern: 'games/*/**', mode: 'full' },
  { type: 'app', pattern: 'apps/*/**', mode: 'full' },
],
```

`game` 위에 추가:
```javascript
'boundaries/elements': [
  { type: 'core', pattern: 'packages/2d-core/**', mode: 'full' },
  { type: 'genre', pattern: 'packages/2d-*-core/**', mode: 'full' },
  { type: 'plugin', pattern: 'packages/economy-*/**', mode: 'full' },
  { type: 'content', pattern: 'packages/content-*/**', mode: 'full' },
  { type: 'registry', pattern: 'packages/registry/**', mode: 'full' },
  { type: 'game', pattern: 'games/*/**', mode: 'full' },
  { type: 'app', pattern: 'apps/*/**', mode: 'full' },
],
```

- [ ] **Step 2: `boundaries/element-types` 의 rules 에 registry 규칙 추가**

기존 rules 배열:
```javascript
rules: [
  { from: 'core', allow: ['core'] },
  { from: 'genre', allow: ['core', 'genre'] },
  { from: 'plugin', allow: ['core', 'plugin'] },
  { from: 'content', allow: ['core', 'genre', 'content'] },
  { from: 'game', allow: ['core', 'genre', 'plugin', 'content', 'game'] },
  { from: 'app', allow: ['core', 'genre', 'plugin', 'content', 'game', 'app'] },
],
```

다음과 같이 수정:
```javascript
rules: [
  { from: 'core', allow: ['core'] },
  { from: 'genre', allow: ['core', 'genre'] },
  { from: 'plugin', allow: ['core', 'plugin'] },
  { from: 'content', allow: ['core', 'genre', 'content'] },
  { from: 'registry', allow: ['core'] },
  { from: 'game', allow: ['core', 'genre', 'plugin', 'content', 'game', 'registry'] },
  { from: 'app', allow: ['core', 'genre', 'plugin', 'content', 'game', 'app'] },
],
```

- [ ] **Step 3: ESLint 전체 실행**

```bash
pnpm lint
```

Expected: 0 errors. registry 내부가 @forge/core 만 import 하는지 확인.

- [ ] **Step 4: 순환 검사**

```bash
pnpm circular
```

Expected: No circular dependencies.

- [ ] **Step 5: 커밋**

```bash
git add eslint.config.mjs
git commit -m "chore(eslint): add 'registry' element type to boundaries v5 rules"
```

---

## Layer B — inflation-rpg 적용 (Tasks B1-B8)

### Task B1: inflation-rpg 에 `components.json` 생성

shadcn CLI 설정. aliases 는 기존 코드 패턴과 호환되도록 `@/components/ui` 로.

**Files:**
- Create: `games/inflation-rpg/components.json`

- [ ] **Step 1: `components.json` 작성**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "utils": "@/lib/utils",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add games/inflation-rpg/components.json
git commit -m "chore(game-inflation-rpg): add components.json for shadcn CLI"
```

---

### Task B2: `theme-modern-dark-gold` 를 inflation-rpg 에 add

**Files:**
- Modify (via shadcn): `games/inflation-rpg/src/styles/modern-dark-gold.css` (신규 복사본)
- Modify: `games/inflation-rpg/src/app/globals.css` (import 추가)

- [ ] **Step 1: shadcn add 실행**

```bash
cd games/inflation-rpg
pnpm dlx shadcn@latest add file:../../packages/registry/r/theme-modern-dark-gold.json
```

Expected: `src/styles/modern-dark-gold.css` 파일이 registry 소스로부터 복사됨.

- [ ] **Step 2: `globals.css` 에 import 추가**

현재 파일 상단 (기존 `@import "tailwindcss";` 는 복사된 테마 CSS 가 이미 포함하므로 제거):

**Before** (`src/app/globals.css` 기존):
```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

/* (이하는 현재 globals.css 파일의 기존 내용 — prefers-color-scheme, html/body, #game-container, canvas 블록) */
```

**After**:
```css
@import "@/styles/modern-dark-gold.css";

:root {
  --background: var(--forge-bg-base);
  --foreground: var(--forge-text-primary);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: var(--forge-bg-base);
    --foreground: var(--forge-text-primary);
  }
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: auto;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
}

#game-container {
  width: 100vw;
  height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: center;
}

canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
```

- [ ] **Step 3: dev 서버 실행해서 시각 회귀 확인**

```bash
pnpm dev
```

브라우저에서 `http://localhost:3000` (포털) → inflation-rpg 실행 → 메인 메뉴가 기존과 동일한 색감 (#0f0f14 배경, 금색 제목) 인지 확인. Ctrl-C 로 종료.

- [ ] **Step 4: 커밋**

```bash
git add games/inflation-rpg/src/styles/modern-dark-gold.css \
        games/inflation-rpg/src/app/globals.css
git commit -m "feat(game-inflation-rpg): add theme-modern-dark-gold via shadcn registry"
```

---

### Task B3: `game.css` 의 `:root` 블록 제거 (중복 제거)

테마 파일이 `--forge-*` 를 제공하므로 `game.css` 의 `:root` 선언은 제거.

**Files:**
- Modify: `games/inflation-rpg/src/styles/game.css`

- [ ] **Step 1: `game.css` 상단 `:root` 블록 제거**

**Before** (line 1-18):
```css
:root {
  --forge-bg-base: #0f0f14;
  --forge-bg-panel: #1a1a24;
  /* (ForgeCSSTokens 의 나머지 13 개 토큰 — bg-card / border / accent / accent-dim /
     text-primary / text-secondary / text-muted / stat-hp / stat-atk / stat-def /
     stat-agi / stat-luc / stat-bp) */
  --forge-danger: #e05050;
}

.forge-ui-root { /* (기존 선언 전체 유지) */ }
```

**After**:
```css
/*
 * --forge-* CSS 변수는 @/styles/modern-dark-gold.css (theme registry item) 가 정의한다.
 * 여기에는 .forge-* 클래스 선언만 남긴다. 이 블록은 grandfathered 이며,
 * 신규 컴포넌트는 registry 를 통해 추가한다.
 */

.forge-ui-root { ... }
```

- [ ] **Step 2: dev 서버 재확인**

```bash
pnpm dev
```

inflation-rpg 전 화면에서 색상 동일한지 확인.

- [ ] **Step 3: typecheck + 테스트**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg test
```

Expected: 0 exit, 60 기존 테스트 통과.

- [ ] **Step 4: 커밋**

```bash
git add games/inflation-rpg/src/styles/game.css
git commit -m "refactor(game-inflation-rpg): remove :root --forge-* duplicates (theme file owns)"
```

---

### Task B4: 5 개 registry 아이템 (screen/button/panel/gauge/inventory-grid) add

**Files:**
- Create (via shadcn): `games/inflation-rpg/src/components/ui/forge-screen.tsx`
- Create (via shadcn): `games/inflation-rpg/src/components/ui/forge-button.tsx`
- Create (via shadcn): `games/inflation-rpg/src/components/ui/forge-panel.tsx`
- Create (via shadcn): `games/inflation-rpg/src/components/ui/forge-gauge.tsx`
- Create (via shadcn): `games/inflation-rpg/src/components/ui/forge-inventory-grid.tsx`
- Create (via shadcn): `games/inflation-rpg/src/lib/utils.ts`

- [ ] **Step 1: 5 아이템 add**

```bash
cd games/inflation-rpg
pnpm dlx shadcn@latest add file:../../packages/registry/r/forge-screen.json
pnpm dlx shadcn@latest add file:../../packages/registry/r/forge-button.json
pnpm dlx shadcn@latest add file:../../packages/registry/r/forge-panel.json
pnpm dlx shadcn@latest add file:../../packages/registry/r/forge-gauge.json
pnpm dlx shadcn@latest add file:../../packages/registry/r/forge-inventory-grid.json
```

Expected: 각 컴포넌트 `src/components/ui/` 에 복사, `src/lib/utils.ts` 1 회만 복사 (중복 덮어쓰기 skip).

- [ ] **Step 2: `clsx` 의존성 추가**

```bash
cd games/inflation-rpg
pnpm add clsx@^2.1.1
```

- [ ] **Step 3: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 exit. (컴포넌트 소스가 `@forge/core` 타입 import, cn 헬퍼 import 한 상태)

- [ ] **Step 4: 커밋**

```bash
git add games/inflation-rpg/src/components/ui/ \
        games/inflation-rpg/src/lib/utils.ts \
        games/inflation-rpg/package.json \
        pnpm-lock.yaml
git commit -m "feat(game-inflation-rpg): add 5 forge-* components via registry"
```

---

### Task B5: inflation-rpg 화면들에서 인라인 JSX → `<ForgeButton>` 치환

점진적 교체. 이번 task 에서는 MainMenu · Battle · Shop · Inventory · StatAlloc · ClassSelect · GameOver 7 개 screen 에서 `<button className="forge-btn primary|secondary">` 를 `<ForgeButton variant="...">` 로 치환.

**Files:**
- Modify: `games/inflation-rpg/src/screens/MainMenu.tsx`
- Modify: `games/inflation-rpg/src/screens/Battle.tsx`
- Modify: `games/inflation-rpg/src/screens/Shop.tsx`
- Modify: `games/inflation-rpg/src/screens/Inventory.tsx`
- Modify: `games/inflation-rpg/src/screens/StatAlloc.tsx`
- Modify: `games/inflation-rpg/src/screens/ClassSelect.tsx`
- Modify: `games/inflation-rpg/src/screens/GameOver.tsx`

- [ ] **Step 1: 각 파일에서 `<button className="forge-btn primary">` 패턴 찾기**

```bash
grep -rn 'forge-btn' games/inflation-rpg/src/screens/
```

결과를 기록한다.

- [ ] **Step 2: 각 `<button>` 을 `<ForgeButton>` 으로 치환**

각 파일 상단에 import 추가:

```tsx
import { ForgeButton } from '@/components/ui/forge-button';
```

JSX 교체 규칙:
- `<button className="forge-btn primary" onClick={...}>X</button>` → `<ForgeButton variant="primary" onClick={...}>X</ForgeButton>`
- `<button className="forge-btn secondary" disabled={x}>Y</button>` → `<ForgeButton variant="secondary" disabled={x}>Y</ForgeButton>`
- 추가 className 이 있는 경우: `<ForgeButton variant="primary" className="extra-class">X</ForgeButton>` (컴포넌트가 `cn` 으로 합침)

- [ ] **Step 3: dev 확인**

```bash
pnpm dev
```

모든 버튼 클릭/hover 상태 기존과 동일한지 확인.

- [ ] **Step 4: 테스트 실행**

```bash
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 기존 60 테스트 통과 (button 구조가 동일하므로 테스트 영향 없음).

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/screens/
git commit -m "refactor(game-inflation-rpg): replace inline <button> with <ForgeButton>"
```

---

### Task B6: `<ForgePanel>`, `<ForgeGauge>`, `<ForgeInventoryGrid>`, `<ForgeScreen>` 치환

나머지 4 개 컴포넌트도 같은 방식으로 점진 치환.

**Files:**
- Modify: `games/inflation-rpg/src/screens/*.tsx` (모든 forge-* 클래스 사용처)
- Modify: `games/inflation-rpg/src/App.tsx` (최상위 `<div className="forge-ui-root forge-screen">` → `<ForgeScreen>`)

- [ ] **Step 1: `forge-panel` 사용처 찾기 및 치환**

```bash
grep -rn 'className="forge-panel' games/inflation-rpg/src/
```

각 결과를 `<ForgePanel variant="inset|elevated">` 로 치환. 상단 import 추가.

- [ ] **Step 2: `forge-gauge` 사용처 찾기 및 치환**

```bash
grep -rn 'className="forge-gauge' games/inflation-rpg/src/
```

`<div className="forge-gauge"><div style={{ width: pct }} /></div>` 패턴을
`<ForgeGauge value={x/max} stat="hp" label="HP" />` 로 전환.

- [ ] **Step 3: `forge-inventory-grid` 치환**

```bash
grep -rn 'className="forge-inventory-grid' games/inflation-rpg/src/
```

각 결과를 `<ForgeInventoryGrid columns={2|3|4}>` 로 치환.

- [ ] **Step 4: `App.tsx` 의 최상위 래퍼 치환**

**Before**:
```tsx
<div className="forge-ui-root forge-screen">
  {/* ... */}
</div>
```

**After**:
```tsx
import { ForgeScreen } from '@/components/ui/forge-screen';
// ...
<ForgeScreen className="forge-ui-root">
  {/* ... */}
</ForgeScreen>
```

- [ ] **Step 5: dev 확인**

```bash
pnpm dev
```

전 화면 시각 회귀 없이 렌더 되는지 확인.

- [ ] **Step 6: 테스트 + typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg test
```

Expected: 0 exit, 60 통과.

- [ ] **Step 7: 커밋**

```bash
git add games/inflation-rpg/src/
git commit -m "refactor(game-inflation-rpg): replace inline JSX with ForgePanel/Gauge/InventoryGrid/Screen"
```

---

### Task B7: `BattleScene` hex 3 개 → `resolveForgeTheme()` 치환

Phaser 씬 내부의 hard-code hex 를 토큰 브릿지로 교체.

**Files:**
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts`

- [ ] **Step 1: import 추가**

파일 상단에 추가:

```typescript
import { resolveForgeTheme } from '@forge/core';
```

- [ ] **Step 2: hex 3 개 치환**

**Before** (line 45, 63, 64):
```typescript
const bg = this.add.rectangle(0, 0, 360, 600, 0x0a1218).setOrigin(0);
// ...
this.hpBarBg = this.add.rectangle(16, 44, 320, 10, 0x1a1a2a).setOrigin(0);
this.hpBarFill = this.add.rectangle(16, 44, 320, 10, 0xe03030).setOrigin(0);
```

**After**:
```typescript
// create() 함수 시작부에 한 줄 추가
const theme = resolveForgeTheme();

const bg = this.add.rectangle(0, 0, 360, 600, theme.bg).setOrigin(0);
// ...
this.hpBarBg = this.add.rectangle(16, 44, 320, 10, theme.panel).setOrigin(0);
this.hpBarFill = this.add.rectangle(16, 44, 320, 10, theme.hp).setOrigin(0);
```

주의: `theme.hp` 는 `0x60e060` (녹색) — 기존 `0xe03030` (빨강) 과 색상이 **다르다**. HP 바 색상은 보통 녹색이 관례 (HP 높을 때). 기존 빨강은 아마 "위험" 색이 의도. 두 가지 선택:
- **녹색 유지** (stat/hp 토큰 사용) — 일반 관례
- **위험 시 빨강 전환** — 추가 로직 필요, 이번 task 에서는 녹색으로 통일. 조건부 danger 색은 별도 task.

이 task 에서는 `theme.hp` (녹색) 로 통일한다. 조건부 색상은 B8 이후의 별도 작업으로 유보.

- [ ] **Step 3: dev 확인**

```bash
pnpm dev
```

전투 진입해서 HP 바가 **녹색** 으로 표시되는지 확인 (기존 빨강에서 변경).

- [ ] **Step 4: 테스트 + typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg test
```

Expected: 0 exit. 기존 테스트는 색상을 검증하지 않으므로 영향 없음.

- [ ] **Step 5: 커밋**

```bash
git add games/inflation-rpg/src/battle/BattleScene.ts
git commit -m "refactor(game-inflation-rpg): Phaser BattleScene hex -> resolveForgeTheme()"
```

---

### Task B8: Playwright E2E smoke 통과 확인

**Files:**
- (수정 없음 — 기존 E2E 가 정상 동작하는지만 확인)

- [ ] **Step 1: build 가능 여부**

```bash
pnpm --filter @forge/game-inflation-rpg build:web
```

Expected: Next.js static export 성공, `out/` 디렉토리 생성.

- [ ] **Step 2: E2E smoke 실행**

```bash
pnpm --filter @forge/game-inflation-rpg e2e
```

Expected: iPhone 14 smoke test 통과. HP 바 색상 변경 관련 assertion 이 있으면 조정.

- [ ] **Step 3: 실패 시 원인 분석**

E2E 가 색상 값을 assert 하는 경우 — 예: `expect(hpFill).toHaveCSS('background-color', 'rgb(224, 48, 48)')` — 해당 assertion 을 `rgb(96, 224, 96)` 으로 갱신.

없는 경우 Step 4.

- [ ] **Step 4: lint + circular 검사**

```bash
pnpm lint && pnpm circular
```

Expected: 0 exit.

- [ ] **Step 5: 통합 커밋 (E2E 수정 있었을 때만)**

```bash
git add games/inflation-rpg/e2e/
git commit -m "test(game-inflation-rpg): update E2E color assertions for theme tokens"
```

- [ ] **Step 6: Layer B 완료 태그**

Layer B 구현 완료를 명시적으로 표시:

```bash
git tag phase-forge-ui-layer-b-complete
```

---

## Layer C — scaffold 설계 문서 (Tasks C1-C2)

### Task C1: `docs/CONTRIBUTING.md` §12 확장 — canonical forge-app 계약

새 게임이 반드시 가져야 할 디렉토리 구조를 문서화.

**Files:**
- Modify: `docs/CONTRIBUTING.md` (§12 확장)

- [ ] **Step 1: 현재 §12 내용 읽기**

```bash
grep -n "§12\|## 12" docs/CONTRIBUTING.md
```

현재 §12 끝을 찾는다 (또는 새 섹션으로 추가).

- [ ] **Step 2: canonical 구조 섹션 추가**

파일 끝에 다음 섹션 추가 (§13 으로 또는 §12 확장):

````markdown

## 13. Canonical forge-app 디렉토리 구조

새 게임 워크스페이스 (`games/<new-game>/`) 는 반드시 다음 최소 구조를 가진다.
이 계약은 [Forge-UI Opus 재설계 스펙](./superpowers/specs/2026-04-22-forge-ui-opus-redesign-spec.md) Layer C 가 정의하며,
`@forge/create-game` CLI (미구현) 가 장래에 이 구조를 자동 생성한다.

```
games/<new-game>/
├── package.json              # name: "@forge/game-<name>", type: "module"
├── tsconfig.json             # extends: "../../tsconfig.base.json"
├── next.config.ts            # output: 'export'
├── capacitor.config.ts       # ios/android 타겟
├── components.json           # shadcn CLI 설정 (aliases: components/ui, utils)
├── playwright.config.ts
├── vitest.config.ts
├── public/
│   └── manifest.json         # @forge/core GameManifest (Zod 검증)
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── globals.css       # @import "@/styles/<theme>.css"
│   │   └── page.tsx          # <Game /> 마운트 지점
│   ├── components/
│   │   └── ui/               # ← registry 에서 add 된 forge-* 컴포넌트 복사본 (빈 디렉토리 OK)
│   ├── lib/
│   │   └── utils.ts          # cn() helper (registry 에서 자동 복사)
│   ├── styles/
│   │   └── <theme>.css       # registry 에서 theme item add 한 결과
│   ├── startGame.ts          # StartGameFn 구현 (ForgeGameInstance 반환)
│   └── index.ts              # 패키지 엔트리
└── e2e/
    └── smoke.spec.ts         # 최소 smoke test (메인 메뉴 렌더 + 클릭)
```

### 13.1. 필수 스크립트 (package.json)

```json
{
  "scripts": {
    "dev": "next dev --port <assigned-port>",
    "build": "next build",
    "build:web": "next build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint src tests",
    "e2e": "playwright test",
    "cap:sync": "cap sync",
    "build:ios": "next build && cap sync ios && cap open ios",
    "build:android": "next build && cap sync android && cap open android"
  }
}
```

### 13.2. 워크스페이스 deps 최소 세트

```json
{
  "dependencies": {
    "@capacitor/android": "^8.0.0",
    "@capacitor/core": "^8.0.0",
    "@capacitor/ios": "^8.0.0",
    "@forge/core": "workspace:^",
    "clsx": "^2.1.1",
    "next": "^16.1.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "tailwindcss": "^4"
  }
}
```

Phaser 등 엔진 의존성은 **게임이 실제로 사용할 때만** 추가한다 (YAGNI).

### 13.3. 초기 registry add 시퀀스

```bash
cd games/<new-game>
pnpm dlx shadcn@latest add file:../../packages/registry/r/theme-modern-dark-gold.json
pnpm dlx shadcn@latest add file:../../packages/registry/r/forge-screen.json
# 필요한 추가 컴포넌트 …
```

### 13.4. dev-shell 등록

[`apps/dev-shell/src/lib/registry.ts`](../apps/dev-shell/src/lib/registry.ts) 와
[`registry.server.ts`](../apps/dev-shell/src/lib/registry.server.ts) 에 새 게임 엔트리를 추가한다.
server 쪽은 매니페스트만, client 쪽은 dynamic import 콜백을 등록.

### 13.5. ESLint boundaries element 자동 인식

새 게임은 `eslint.config.mjs` 의 `games/*/**` 패턴에 의해 자동으로 `game` element 로 분류된다.
별도 설정 불필요.
````

- [ ] **Step 3: 커밋**

```bash
git add docs/CONTRIBUTING.md
git commit -m "docs(contributing): add canonical forge-app directory contract (§13)"
```

---

### Task C2: `create-game` CLI 계약 스케치 문서 작성

본 문서는 CLI 의 **예상 동작** 을 명세한다. 실제 구현은 유보.

**Files:**
- Create: `docs/superpowers/specs/2026-04-22-create-game-cli-contract-sketch.md`

- [ ] **Step 1: 문서 작성**

```markdown
# `@forge/create-game` CLI 계약 스케치

> **상태**: Design sketch, 2026-04-22
> **구현 상태**: **유보 중** — 착수 조건 ([Forge-UI Opus 재설계 스펙](./2026-04-22-forge-ui-opus-redesign-spec.md#43-구현-착수-조건)) 미충족.

본 문서는 `@forge/create-game` CLI 의 기대 동작을 명시한다. 게임 #2 가 실존하고 inflation-rpg 와
공통 scaffold 패턴이 3 개 이상 드러날 때 이 문서를 기반으로 구현 스펙을 작성한다.

## 1. 호출 규약

```bash
pnpm dlx @forge/create-game <name> [options]
```

### 1.1. 필수 인자

- `<name>` — 게임 워크스페이스 이름. `@forge/game-<name>` 로 등록. kebab-case 권장.

### 1.2. 옵션 플래그

| 플래그 | 기본값 | 의미 |
| --- | --- | --- |
| `--theme=<name>` | `modern-dark-gold` | 초기 테마 registry item |
| `--components=<a,b,c>` | `forge-screen,forge-button,forge-panel` | 초기 UI 컴포넌트 set |
| `--genre=<name>` | (없음) | genre-core 패키지 의존성 자동 추가 (예: `rpg`, `idle`, `puzzle`) |
| `--engine=<name>` | (없음) | 엔진 의존성 추가 (`phaser`, `pixi`, 등) |
| `--port=<number>` | 자동 할당 | dev 서버 포트 |

## 2. 동작 순서

1. **Preflight 검증**
   - `<name>` 이 pnpm workspace 규칙에 맞는지 확인
   - `games/<name>/` 이 이미 존재하지 않는지 확인
   - `pnpm` 이 설치되어 있는지 확인

2. **디렉토리 복제**
   - [CONTRIBUTING §13](../../CONTRIBUTING.md#13-canonical-forge-app-디렉토리-구조) 의 canonical 구조 템플릿을 `games/<name>/` 에 복제
   - 템플릿 내부 placeholder (`{{GAME_NAME}}`, `{{PORT}}`) 치환

3. **package.json 생성**
   - §13.1 스크립트 + §13.2 최소 deps
   - `--engine=phaser` 시 `"phaser": "^3.90.0"` 추가
   - `--genre=rpg` 시 `"@forge/2d-rpg-core": "workspace:^"` 추가 (해당 패키지 존재 시)

4. **registry add 실행**
   - `pnpm dlx shadcn@latest add file:../../packages/registry/r/theme-<theme>.json`
   - 각 `--components` 에 대해 동일 add 실행

5. **dev-shell 등록**
   - [`apps/dev-shell/src/lib/registry.ts`](../../../apps/dev-shell/src/lib/registry.ts) 와
     [`registry.server.ts`](../../../apps/dev-shell/src/lib/registry.server.ts) 에 새 게임 엔트리 자동 추가
   - 수동 편집 후 커밋 제안

6. **pnpm install**
   - 루트에서 `pnpm install` 실행 → 새 워크스페이스 심볼릭 링크 생성

7. **smoke 실행**
   - `pnpm --filter @forge/game-<name> typecheck` 통과 확인
   - `pnpm --filter @forge/game-<name> test` (0 테스트여도 0 exit)

## 3. 산출물 검증

CLI 완료 후 다음이 모두 성립해야 한다:

- `pnpm --filter @forge/game-<name> dev` 로 dev 서버 기동 가능
- `pnpm lint` 0 exit (새 게임이 boundaries v5 의 `game` element 로 인식)
- 포털 `http://localhost:3000` 에서 새 게임이 목록에 나타남

## 4. 기각된 설계 대안

| 대안 | 기각 사유 |
| --- | --- |
| Yeoman generator | pnpm workspace 생태계와 어색함, 의존성 무거움 |
| Turbo의 `turbo gen` | Turborepo 종속성 강화, 유연성 낮음 |
| Git template repo | 매 업데이트마다 복제 내용 drift, 유지보수 부담 |
| 대화형 wizard (prompts) | 초기엔 플래그 기반으로 충분, 나중에 추가 가능 |

## 5. 미정 항목

- CLI 실행 시 업데이트된 `apps/dev-shell` 등록 자동화 범위 — server+client 둘 다 자동? 아니면 수동 편집 안내만?
- 테마 2 개 이상을 `--theme=a,b` 형태로 add 가능한지 — 현재는 1 개만 전제
- 초기 smoke 테스트 템플릿 내용 — 게임 엔진별로 다를 것
- 실패 시 rollback — 중간 실패 시 `games/<name>/` 디렉토리 삭제할지 여부

위 항목들은 실제 구현 스펙 작성 시점에 확정한다.

## 6. 구현 착수 조건 (재인용)

본 CLI 실제 구현은 다음 조건이 모두 충족될 때 착수:

- 게임 #2 가 실존 (별도 워크스페이스로 존재)
- inflation-rpg 와 게임 #2 사이에 **공통 scaffold 패턴이 3 개 이상** 실제 나타남
- 두 게임이 Layer A 의 registry 를 각각 소비하며 공통 병목이 식별됨

조건 미충족 상태에서 구현 착수는 [CLAUDE.md](../../../CLAUDE.md#1-3의-규칙--구현-코드는-게임-2-가-실제-쓰기-전까지-승격-금지) "3의 규칙" 위반.
```

- [ ] **Step 2: 커밋**

```bash
git add docs/superpowers/specs/2026-04-22-create-game-cli-contract-sketch.md
git commit -m "docs: add create-game CLI contract sketch (Layer C design-only)"
```

---

## 최종 검증 단계

### Task Z1: 전체 통합 검증

모든 Layer A + B 구현이 완료되었는지 최종 확인.

- [ ] **Step 1: 전체 typecheck**

```bash
pnpm typecheck
```

Expected: 모든 워크스페이스 0 exit.

- [ ] **Step 2: 전체 테스트**

```bash
pnpm test
```

Expected:
- `@forge/core`: 24 passed (19 기존 + 5 신규 theme-bridge)
- `@forge/registry`: 7 passed (1 manifest + 6 items)
- `@forge/game-inflation-rpg`: 60 passed (기존 건수)

- [ ] **Step 3: lint + circular**

```bash
pnpm lint && pnpm circular
```

Expected: 0 errors, no circular dependencies.

- [ ] **Step 4: E2E**

```bash
pnpm e2e
```

Expected: 모든 smoke 통과.

- [ ] **Step 5: build 모든 게임**

```bash
pnpm --filter @forge/game-inflation-rpg build:web
```

Expected: Next.js static export 성공.

- [ ] **Step 6: 최종 태그**

```bash
git tag forge-ui-opus-complete
git log --oneline phase-2.5-complete..HEAD
```

Expected: Layer A + B 의 모든 커밋이 요약 출력.

---

## 요약: 완료 시점의 repo 상태

- **새 워크스페이스**: `packages/registry/` (6 registry items + smoke test)
- **@forge/core 확장**: `theme-bridge.ts` (얇은 Phaser-React 브릿지) + `ForgeScreenProps` 타입
- **inflation-rpg 변경**:
  - `components.json` 추가 (shadcn CLI 설정)
  - `src/components/ui/` 에 5 개 forge-* 컴포넌트 소스 (registry 복사본)
  - `src/styles/modern-dark-gold.css` (테마 복사본)
  - `src/lib/utils.ts` (cn helper)
  - 화면 JSX 에서 인라인 `<button className="forge-btn">` → `<ForgeButton variant>` 등 치환
  - `BattleScene` hex 3 개 → `resolveForgeTheme()` 호출
- **docs**: `CONTRIBUTING.md §13` canonical forge-app 계약 추가, `create-game` CLI 계약 스케치 문서 신규
- **ESLint**: `registry` element type 추가, boundaries v5 룰에 등록
- **Layer C 구현은 유보** — 게임 #2 도착 시까지 대기

---

## 구현 중 발생 가능한 문제와 대응

| 문제 | 대응 |
| --- | --- |
| shadcn CLI 가 `file:` 경로를 받지 않음 | npx 최신 버전으로 재시도, 안 되면 JSON 수동 복사 스크립트로 우회. 우회 구현은 별도 task 로 추가. |
| Tailwind v4 `@theme` 블록이 `:root` 와 충돌 | `@theme` 는 `--color-forge-*` 네임스페이스, `:root` 는 `--forge-*` alias — 분리 가능. `packages/registry/src/themes/modern-dark-gold.css` 파일에 이미 분리 반영. |
| `readForgeToken` 이 jsdom 에서 CSS 변수 값을 빈 문자열로 반환 | `beforeEach` 에서 `document.documentElement.style.setProperty` 로 수동 설정 (이미 테스트에 반영). 실제 브라우저 에서는 테마 CSS 가 :root 에 설정. |
| Phaser BattleScene hex 치환으로 시각 회귀 발생 | HP 바가 녹색으로 변경되는 건 **의도된 변화** (stat/hp 토큰 사용). 기존 빨강은 "danger" 토큰을 조건부 적용하는 별도 task 로 분리하여 나중에 처리. |
| shadcn add 시 `src/lib/utils.ts` 가 여러 번 덮어씌워짐 | shadcn CLI 가 중복 경로를 자동으로 skip 하므로 문제 없음. 만약 안 되면 첫 add 후 나머지는 `--yes` skip 으로 대응. |
| ESLint boundaries v5 가 `registry` element 를 인식 못 함 | `mode: 'full'` 확인. 그래도 안 되면 `mode: 'file'` 로 변경. boundaries v6 로 업그레이드 금지 (CLAUDE.md 명시). |
| `@forge/registry` 의 tsconfig 가 path alias `@/lib/utils` 를 해결 못 함 | 복사 대상 파일 (`src/ui/forge-button.tsx`) 은 registry 자체에서 빌드되지 않고, 게임으로 복사된 후 게임의 path alias 에서 해결. registry 의 tsconfig 은 "소스 보관용" 일 뿐 — typecheck 실패 시 `paths` 설정으로 우회하지 말고 **컴포넌트 소스의 import 를 상대 경로로 둔다**. (판단 필요 시: "import { cn } from '@/lib/utils'" → "import { cn } from '../lib/utils'" 로 바꾸면 registry 내부 빌드 가능. 단 shadcn CLI 가 복사 시 path alias 변환 지원하므로 `@/` 유지 권장.) |

---

**End of plan. Total tasks: 23 (A1-A16 + B1-B8 + C1-C2 + Z1).**
