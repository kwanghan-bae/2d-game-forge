# Phase 1 — inflation-rpg Curated Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port korea-inflation-rpg into `games/inflation-rpg/` as the first real game in the forge, booted from the dev-shell portal via a config-driven `StartGame()` entry. Keep only the main play loop, core managers, core data, and the math/save/balance invariants as tests. Verify the game plays end-to-end through the portal and that a standalone web build + Capacitor sync succeed.

**Architecture:** `games/inflation-rpg/` becomes a new `@forge/*` workspace. The Phaser entry is refactored from `StartGame(parent: string)` to `StartGame(config: StartGameConfig)` so the dev-shell portal and a future standalone Next shell share one entry. Asset loading uses `this.load.setBaseURL(config.assetsBasePath)` so the same game code works under `/games/inflation-rpg/assets/...` (portal) and `/assets/...` (standalone). No code is promoted to `@forge/core` yet — the "rule of three" waits for game A.

**Tech Stack:** Phaser 3.90 (existing), React 19 / Next 16 (existing), @preact/signals-react, bignumber.js, zod, Capacitor 8, Vitest 4, Playwright 1.57. All inherited from korea-inflation-rpg.

**Spec:** `docs/superpowers/specs/2026-04-17-2d-game-forge-initial-design.md`
**Prior plan:** `docs/superpowers/plans/2026-04-17-phase0-bootstrap.md` (Phase 0 complete — repo skeleton + @forge/core shell + dev-shell portal).

**Source repo:** `/Users/joel/Desktop/git/korea-inflation-rpg/` (NOT inside this monorepo; do NOT modify it).

---

## File Structure

Files created (relative to repo root `/Users/joel/Desktop/git/2d-game-forge/`):

```
games/inflation-rpg/
├── package.json                                 # name: @forge/game-inflation-rpg
├── tsconfig.json                                # extends tsconfig.base.json
├── next.config.ts                               # output: 'export'
├── next-env.d.ts
├── capacitor.config.ts                          # appId: com.korea.inflationrpg
├── playwright.config.ts                         # baseURL: dev-shell portal
├── postcss.config.mjs                           # tailwind v4
├── tailwind.config.ts
├── README.md
├── vitest.config.ts
├── src/
│   ├── index.ts                                 # exports gameManifest + StartGame
│   ├── startGame.ts                             # StartGameConfig + StartGame(config)
│   ├── app/
│   │   ├── layout.tsx                           # release-mode only
│   │   ├── page.tsx                             # release-mode only
│   │   ├── globals.css
│   │   └── favicon.ico
│   ├── components/
│   │   └── PhaserGame.tsx                       # release-mode React wrapper
│   └── game/
│       ├── main.ts                              # internal Phaser config factory
│       ├── EventBus.ts
│       ├── GameState.ts
│       ├── GameStateValidator.ts
│       ├── DataManager.ts
│       ├── StatManager.ts
│       ├── constants.ts
│       ├── constants/Colors.ts
│       ├── core/BossAI.ts
│       ├── core/signals.ts
│       ├── core/SkillManager.ts
│       ├── data/**                              # all 21 files copied as-is
│       ├── i18n/{en,ko}.json
│       ├── i18n/I18nManager.ts
│       ├── physics/{Direction,GridPhysics}.ts
│       ├── scenes/**                            # 14 active/referenced scenes + managers
│       ├── state/GameStateRestorer.ts
│       ├── types/PlayerTypes.ts
│       ├── utils/**                             # 7 utils
│       └── testHooks.ts                         # gated window.* exposure
├── tests/
│   ├── game/                                    # curated vitest set (details in Task 10)
│   └── e2e/
│       ├── full-game-flow.spec.ts               # renamed from game_flow.spec.ts
│       └── helpers/GameTestHelper.ts
└── public/
    └── assets/                                  # curated subset of upstream public/assets
        ├── images/
        ├── sounds/
        └── data/                                # CSVs + tileset_mapping.json (no raw_concept)

apps/dev-shell/
├── next.config.ts                               # MODIFIED: add rewrite for /games/inflation-rpg/assets/*
├── public/games/inflation-rpg/assets            # SYMLINK → ../../../games/inflation-rpg/public/assets
├── src/lib/registry.ts                          # MODIFIED: register inflation-rpg
└── src/app/games/[slug]/page.tsx                # MODIFIED: mount game container, invoke StartGame
```

Each file has one clear responsibility. `src/game/` is the existing game's code moved wholesale (minus deletions); `src/startGame.ts` and `src/index.ts` are new seams for the forge's dev-shell mode.

---

## Task Order and Dependencies

Tasks are sequential. Each ends with a commit.

---

### Task 1: Create `games/inflation-rpg/` workspace skeleton

**Files:**
- Create: `games/inflation-rpg/package.json`
- Create: `games/inflation-rpg/tsconfig.json`
- Create: `games/inflation-rpg/README.md`
- Delete: `games/.gitkeep` (now redundant)

- [ ] **Step 1: Write package.json**

Write `games/inflation-rpg/package.json`:
```json
{
  "name": "@forge/game-inflation-rpg",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./game": "./src/startGame.ts"
  },
  "scripts": {
    "dev": "next dev --port 3100",
    "build": "next build",
    "build:web": "next build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint src tests",
    "e2e": "playwright test",
    "cap:sync": "cap sync",
    "build:ios": "next build && cap sync ios && cap open ios",
    "build:android": "next build && cap sync android && cap open android"
  },
  "dependencies": {
    "@capacitor/android": "^8.0.0",
    "@capacitor/core": "^8.0.0",
    "@capacitor/ios": "^8.0.2",
    "@preact/signals-react": "^3.10.0",
    "bignumber.js": "^9.3.1",
    "next": "16.1.1",
    "phaser": "^3.90.0",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@capacitor/cli": "^8.0.0",
    "@playwright/test": "^1.57.0",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20.0.0",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "jsdom": "^27.4.0",
    "tailwindcss": "^4",
    "typescript": "^5.6.0",
    "vitest": "^4.0.16",
    "@vitest/coverage-v8": "^4.0.16"
  }
}
```

- [ ] **Step 2: Write tsconfig**

Write `games/inflation-rpg/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "allowJs": true,
    "noEmit": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "src/**/*.ts",
    "src/**/*.tsx",
    "tests/**/*.ts",
    "tests/**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules", ".next", "out", "ios", "android"]
}
```

- [ ] **Step 3: Write README**

Write `games/inflation-rpg/README.md`:
```markdown
# @forge/game-inflation-rpg

First game in the forge. Port of korea-inflation-rpg.

## Platforms

- Web (via dev-shell portal or standalone Next export)
- iOS / Android via Capacitor 8

## Notable scripts

- `pnpm --filter @forge/game-inflation-rpg dev` — standalone Next dev server on :3100.
  For portal-integrated dev, run `pnpm dev` at repo root and visit
  http://localhost:3000/games/inflation-rpg instead.
- `pnpm --filter @forge/game-inflation-rpg build:web` — static export to `out/`.
- `pnpm --filter @forge/game-inflation-rpg build:ios` — Next build + Capacitor sync + open Xcode.
- `pnpm --filter @forge/game-inflation-rpg build:android` — same for Android Studio.

## Public exports

- `StartGame(config: StartGameConfig): Phaser.Game` — the one entry. Used by
  both the dev-shell's `/games/inflation-rpg` route and the game's own
  release-mode React wrapper.
- `gameManifest: GameManifestValue` — manifest consumed by the dev-shell
  registry.

## Dependencies

This package depends only on external runtime deps (phaser, react, etc.).
It does not yet import from `@forge/core` — the `StartGameConfig` type is
local. When a second game lands, we will promote shared pieces (e.g.
SaveManager, EventBus, i18n) to `@forge/core` per the rule of three.
```

- [ ] **Step 4: Remove placeholder**

Run:
```bash
rm games/.gitkeep
```

- [ ] **Step 5: Install deps**

Run: `pnpm install`
Expected: `@forge/game-inflation-rpg` shows up in the workspace graph; phaser, capacitor, etc. downloaded.

- [ ] **Step 6: Commit**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add games/inflation-rpg pnpm-lock.yaml
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" rm games/.gitkeep
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "feat(game-inflation-rpg): scaffold workspace"
```

---

### Task 2: Copy curated source tree from korea-inflation-rpg

Bulk copy — no modifications yet. Items marked DROP are not copied.

**Upstream root:** `/Users/joel/Desktop/git/korea-inflation-rpg/`
**Target root:** `/Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/`

- [ ] **Step 1: Copy src/game tree**

Run (from repo root `/Users/joel/Desktop/git/2d-game-forge/`):
```bash
UPSTREAM=/Users/joel/Desktop/git/korea-inflation-rpg
TARGET=games/inflation-rpg

mkdir -p "$TARGET/src/game"

# Files directly under src/game/
cp "$UPSTREAM/src/game/main.ts"               "$TARGET/src/game/"
cp "$UPSTREAM/src/game/GameState.ts"          "$TARGET/src/game/"
cp "$UPSTREAM/src/game/GameStateValidator.ts" "$TARGET/src/game/"
cp "$UPSTREAM/src/game/DataManager.ts"        "$TARGET/src/game/"
cp "$UPSTREAM/src/game/StatManager.ts"        "$TARGET/src/game/"
cp "$UPSTREAM/src/game/EventBus.ts"           "$TARGET/src/game/"
cp "$UPSTREAM/src/game/constants.ts"          "$TARGET/src/game/"

# Subdirectories under src/game/ (whole dirs)
cp -R "$UPSTREAM/src/game/constants"  "$TARGET/src/game/constants"
cp -R "$UPSTREAM/src/game/core"       "$TARGET/src/game/core"
cp -R "$UPSTREAM/src/game/data"       "$TARGET/src/game/data"
cp -R "$UPSTREAM/src/game/i18n"       "$TARGET/src/game/i18n"
cp -R "$UPSTREAM/src/game/physics"    "$TARGET/src/game/physics"
cp -R "$UPSTREAM/src/game/scenes"     "$TARGET/src/game/scenes"
cp -R "$UPSTREAM/src/game/state"      "$TARGET/src/game/state"
cp -R "$UPSTREAM/src/game/types"      "$TARGET/src/game/types"
cp -R "$UPSTREAM/src/game/utils"      "$TARGET/src/game/utils"

# DO NOT copy src/game/tests — handled in Task 10 with curation.
```

- [ ] **Step 2: Copy src/app + src/components (for release-mode only)**

Run:
```bash
UPSTREAM=/Users/joel/Desktop/git/korea-inflation-rpg
TARGET=games/inflation-rpg

mkdir -p "$TARGET/src/app" "$TARGET/src/components"
cp "$UPSTREAM/src/app/layout.tsx"    "$TARGET/src/app/"
cp "$UPSTREAM/src/app/page.tsx"      "$TARGET/src/app/"
cp "$UPSTREAM/src/app/globals.css"   "$TARGET/src/app/"
cp "$UPSTREAM/src/app/favicon.ico"   "$TARGET/src/app/"
cp "$UPSTREAM/src/components/PhaserGame.tsx" "$TARGET/src/components/"
```

- [ ] **Step 3: Copy public/assets tree (curation happens in Task 8)**

Run:
```bash
UPSTREAM=/Users/joel/Desktop/git/korea-inflation-rpg
TARGET=games/inflation-rpg

mkdir -p "$TARGET/public"
cp -R "$UPSTREAM/public/assets" "$TARGET/public/assets"

# Drop design-only docs that were never shipped.
rm -rf "$TARGET/public/assets/data/raw_concept"
find "$TARGET/public/assets" -name "*.meta" -delete 2>/dev/null || true
```

- [ ] **Step 4: Copy the single E2E helper we will keep**

Run:
```bash
UPSTREAM=/Users/joel/Desktop/git/korea-inflation-rpg
TARGET=games/inflation-rpg

mkdir -p "$TARGET/tests/e2e/helpers"
cp "$UPSTREAM/tests/e2e/helpers/GameTestHelper.ts" "$TARGET/tests/e2e/helpers/"
cp "$UPSTREAM/tests/e2e/game_flow.spec.ts" "$TARGET/tests/e2e/full-game-flow.spec.ts"
```

Note the file rename: `game_flow.spec.ts` → `full-game-flow.spec.ts` (matches the spec §3 Phase 1's "full-game-flow.spec.ts" naming).

- [ ] **Step 5: Copy vitest test files (whole directory — curation in Task 10)**

Run:
```bash
UPSTREAM=/Users/joel/Desktop/git/korea-inflation-rpg
TARGET=games/inflation-rpg

mkdir -p "$TARGET/tests/game"
cp "$UPSTREAM/tests/game/"*.ts "$TARGET/tests/game/"
```

- [ ] **Step 6: Sanity checks — inventory of what's been copied**

Run:
```bash
find games/inflation-rpg -type f | wc -l
find games/inflation-rpg -name "*.ts" -path "*/src/*" | wc -l
find games/inflation-rpg -name "*.test.ts" | wc -l
find games/inflation-rpg/public/assets -type f | wc -l
```

Record the numbers in the commit body for later reference. Expected rough
magnitudes: ~300 total files, ~80 source .ts under src/, ~35 test files,
~85 asset files.

- [ ] **Step 7: Commit**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add games/inflation-rpg
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "feat(game-inflation-rpg): bulk copy source and assets from upstream

This commit copies korea-inflation-rpg code as-is, pre-curation. The next
task prunes and refactors. Source path: /Users/joel/Desktop/git/korea-inflation-rpg/."
```

---

### Task 3: Write `StartGameConfig` + `startGame.ts` wrapper (TDD)

The new public entry. Takes a config object, owns lifecycle, exposes test hooks only in dev/test mode.

**Files:**
- Create: `games/inflation-rpg/src/startGame.ts`
- Create: `games/inflation-rpg/src/game/testHooks.ts`
- Create: `games/inflation-rpg/vitest.config.ts`
- Create: `games/inflation-rpg/tests/game/startGame.test.ts`
- Modify: `games/inflation-rpg/src/game/main.ts`

- [ ] **Step 1: Write the vitest config**

Write `games/inflation-rpg/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/game/**/*.test.ts'],
    setupFiles: [],
  },
});
```

- [ ] **Step 2: Write the failing test for StartGameConfig shape**

Write `games/inflation-rpg/tests/game/startGame.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { StartGameConfig } from '../../src/startGame';

describe('StartGameConfig', () => {
  it('requires parent and assetsBasePath fields', () => {
    const config: StartGameConfig = {
      parent: 'game-container',
      assetsBasePath: '/assets',
      exposeTestHooks: false,
    };
    expect(config.parent).toBe('game-container');
    expect(config.assetsBasePath).toBe('/assets');
    expect(config.exposeTestHooks).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @forge/game-inflation-rpg test`
Expected: FAIL with `Cannot find module '../../src/startGame'`.

- [ ] **Step 4: Add the testHooks helper**

Write `games/inflation-rpg/src/game/testHooks.ts`:
```ts
import type { GameState } from './GameState';
import type { InflationManager } from './utils/InflationManager';
import type { ReincarnationManager } from './utils/ReincarnationManager';
import type Phaser from 'phaser';

export interface TestHookSlots {
  gameState?: GameState;
  inflationManager?: InflationManager;
  ReincarnationManager?: typeof ReincarnationManager;
  phaserGame?: Phaser.Game;
  currentScene?: Phaser.Scene;
  E2E_AUTO_BATTLE?: boolean;
}

/**
 * Attach testing affordances to window only when the caller opts in.
 * In production builds (Capacitor release), the caller must pass
 * exposeTestHooks: false so nothing leaks.
 */
export function exposeTestHooks(slots: TestHookSlots): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(slots)) {
    if (value !== undefined) w[key] = value;
  }
}
```

- [ ] **Step 5: Refactor `src/game/main.ts` to expose a Phaser config factory only**

Open `games/inflation-rpg/src/game/main.ts` and replace the file's contents with:
```ts
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { MainMenu } from './scenes/MainMenu';
import { ClassSelectScene } from './scenes/ClassSelectScene';
import { WorldMap } from './scenes/WorldMap';
import { BattleScene } from './scenes/BattleScene';
import { InventoryScene } from './scenes/InventoryScene';
import { Game as MainGame } from './scenes/Game';
import { GameOver } from './scenes/GameOver';

import { AUTO } from 'phaser';
import Phaser from 'phaser';

export interface PhaserConfigOptions {
  parent: string;
}

export function buildPhaserConfig(opts: PhaserConfigOptions): Phaser.Types.Core.GameConfig {
  return {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: opts.parent,
    backgroundColor: '#028af8',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    scene: [
      Boot,
      Preloader,
      MainMenu,
      ClassSelectScene,
      WorldMap,
      BattleScene,
      InventoryScene,
      MainGame,
      GameOver,
    ],
  };
}
```

This removes the side effects and `window.*` assignments that used to live
in `main.ts`. Those moved to `startGame.ts` (next step) and are now opt-in.

- [ ] **Step 6: Write `startGame.ts`**

Write `games/inflation-rpg/src/startGame.ts`:
```ts
import Phaser from 'phaser';
import { buildPhaserConfig } from './game/main';
import { EventBus } from './game/EventBus';
import { GameState } from './game/GameState';
import { InflationManager } from './game/utils/InflationManager';
import { ReincarnationManager } from './game/utils/ReincarnationManager';
import { exposeTestHooks } from './game/testHooks';

export interface StartGameConfig {
  /** DOM id of the container div into which Phaser will render. */
  parent: string;
  /** Base URL prepended to every asset load (Phaser `load.setBaseURL`). */
  assetsBasePath: string;
  /** If true, attach GameState / managers / scene refs to window for E2E. */
  exposeTestHooks: boolean;
}

export function StartGame(config: StartGameConfig): Phaser.Game {
  const phaserConfig = buildPhaserConfig({ parent: config.parent });
  const game = new Phaser.Game(phaserConfig);

  // Preloader reads the base URL off the game registry before loading.
  game.registry.set('assetsBasePath', config.assetsBasePath);

  if (config.exposeTestHooks) {
    exposeTestHooks({
      gameState: GameState.getInstance(),
      inflationManager: InflationManager.getInstance(),
      ReincarnationManager,
      phaserGame: game,
    });
    EventBus.on('current-scene-ready', (scene: Phaser.Scene) => {
      exposeTestHooks({ currentScene: scene });
    });
  }

  return game;
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm --filter @forge/game-inflation-rpg test tests/game/startGame.test.ts`
Expected: 1 passed.

- [ ] **Step 8: Typecheck**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck`
Expected: exit 0. If tsc complains about other test files referring to the
old `main.ts` exports, **ignore them for now** — Task 10 will delete the
out-of-scope tests. This typecheck is scoped to `startGame.ts` and the
production files it imports. If *production* files fail to compile, fix
them before proceeding.

To narrow typecheck to production only during this task, run:
`pnpm --filter @forge/game-inflation-rpg exec tsc --noEmit --project tsconfig.json 2>&1 | grep -v '^tests/game/'`
and inspect.

- [ ] **Step 9: Commit**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add games/inflation-rpg
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "feat(game-inflation-rpg): replace StartGame(parent) with StartGame(config)

main.ts is now a pure Phaser config factory. startGame.ts owns lifecycle,
assetsBasePath wiring, and opt-in window.* test hooks. The game no longer
leaks globals unless the caller opts in via config.exposeTestHooks."
```

---

### Task 4: Update Preloader to use `assetsBasePath` from the registry

The Preloader currently loads `'images/title_bg.png'` as a relative path.
Phaser resolves that against the page URL, which breaks in dev-shell mode
where the page is `/games/inflation-rpg` (so `images/...` would resolve
against that). Reading the per-game base URL off the registry makes the
same code work in every mount mode.

**Files:**
- Modify: `games/inflation-rpg/src/game/scenes/Preloader.ts`

- [ ] **Step 1: Read the current Preloader**

Run: `cat games/inflation-rpg/src/game/scenes/Preloader.ts | head -40`
Note the existing `preload()` method body (starts ~line 45-50 with image loads).

- [ ] **Step 2: Add `setBaseURL` call at the top of `preload()`**

Edit `games/inflation-rpg/src/game/scenes/Preloader.ts`. Locate the
`preload()` method. Insert, as the **first statement** inside `preload()`:
```ts
    const base = this.game.registry.get('assetsBasePath');
    if (typeof base === 'string' && base.length > 0) {
      this.load.setBaseURL(base);
    }
```

Every subsequent `this.load.image(...)` / `this.load.spritesheet(...)` /
`this.load.audio(...)` call remains unchanged — they now resolve relative
to the configured base URL.

- [ ] **Step 3: Verify with typecheck**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck 2>&1 | tail -5`
Expected: exit 0 (or only the tests/ errors Task 10 will clean up).

- [ ] **Step 4: Commit**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add games/inflation-rpg/src/game/scenes/Preloader.ts
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "feat(game-inflation-rpg): Preloader reads assetsBasePath from registry"
```

---

### Task 5: Add `gameManifest` and the package `src/index.ts` barrel

Exposes the game to the dev-shell registry in a single import.

**Files:**
- Create: `games/inflation-rpg/src/index.ts`

- [ ] **Step 1: Write `src/index.ts`**

Write `games/inflation-rpg/src/index.ts`:
```ts
import { parseGameManifest } from '@forge/core/manifest';
import type { GameManifestValue } from '@forge/core/manifest';

export const gameManifest: GameManifestValue = parseGameManifest({
  slug: 'inflation-rpg',
  title: '조선 인플레이션 RPG',
  assetsBasePath: '/games/inflation-rpg/assets',
});

export { StartGame } from './startGame';
export type { StartGameConfig } from './startGame';
```

- [ ] **Step 2: Add workspace dep on @forge/core**

Run (from repo root):
```bash
pnpm --filter @forge/game-inflation-rpg add @forge/core@workspace:*
```
Expected: `dependencies.@forge/core` added to the game's package.json.

- [ ] **Step 3: Typecheck the barrel**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck 2>&1 | grep -v '^tests/game/' | tail -5`
Expected: exit 0 for production files.

- [ ] **Step 4: Commit**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add games/inflation-rpg pnpm-lock.yaml
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "feat(game-inflation-rpg): export gameManifest and StartGame from package root"
```

---

### Task 6: Release-mode Next shell + capacitor config

Keeps the copied release-mode React wrapper working so `pnpm --filter @forge/game-inflation-rpg build` produces a standalone static site.

**Files:**
- Create: `games/inflation-rpg/next.config.ts`
- Create: `games/inflation-rpg/next-env.d.ts`
- Create: `games/inflation-rpg/capacitor.config.ts`
- Create: `games/inflation-rpg/postcss.config.mjs`
- Create: `games/inflation-rpg/tailwind.config.ts`
- Modify: `games/inflation-rpg/src/components/PhaserGame.tsx`

- [ ] **Step 1: Write next.config.ts**

Write `games/inflation-rpg/next.config.ts`:
```ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default config;
```

- [ ] **Step 2: Write next-env shim**

Write `games/inflation-rpg/next-env.d.ts`:
```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 3: Write capacitor.config.ts**

Write `games/inflation-rpg/capacitor.config.ts`:
```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.korea.inflationrpg',
  appName: 'KoreaInflationRPG',
  webDir: 'out',
};

export default config;
```

- [ ] **Step 4: Write postcss + tailwind config**

Write `games/inflation-rpg/postcss.config.mjs`:
```js
export default {
  plugins: { '@tailwindcss/postcss': {} },
};
```

Write `games/inflation-rpg/tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
};

export default config;
```

- [ ] **Step 5: Rewrite `src/components/PhaserGame.tsx` to use the new StartGame**

Open `games/inflation-rpg/src/components/PhaserGame.tsx` and replace its
contents with:
```tsx
'use client';

import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { StartGame } from '../startGame';

export interface PhaserGameProps {
  /** Override the default container id (useful when multiple games share a page). */
  containerId?: string;
  /** Override the asset base path (defaults to "/assets" — right for release mode). */
  assetsBasePath?: string;
  /** Expose test hooks on window (defaults false). */
  exposeTestHooks?: boolean;
}

export default function PhaserGame({
  containerId = 'game-container',
  assetsBasePath = '/assets',
  exposeTestHooks = false,
}: PhaserGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) return;
    gameRef.current = StartGame({
      parent: containerId,
      assetsBasePath,
      exposeTestHooks,
    });
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [containerId, assetsBasePath, exposeTestHooks]);

  return <div id={containerId} />;
}
```

- [ ] **Step 6: Verify release-mode Next shell builds**

Run: `pnpm --filter @forge/game-inflation-rpg build 2>&1 | tail -20`
Expected: Next build succeeds, produces `out/`. If it fails because of
references to code in `src/app/page.tsx` that imports `PhaserGame` from
`@/components/PhaserGame`, ensure the import path matches.

Inspect `out/` briefly: `ls games/inflation-rpg/out/` — should contain
`index.html` and static asset directories.

- [ ] **Step 7: Commit**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add games/inflation-rpg
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "feat(game-inflation-rpg): wire release-mode Next shell and capacitor config"
```

---

### Task 7: Register inflation-rpg with the dev-shell portal

Hook the game into the Phase 0 portal so visiting
`http://localhost:3000/games/inflation-rpg` boots the Phaser game.

**Files:**
- Modify: `apps/dev-shell/src/lib/registry.ts`
- Modify: `apps/dev-shell/src/app/games/[slug]/page.tsx`
- Create: `apps/dev-shell/src/components/GameMount.tsx`
- Modify: `apps/dev-shell/package.json` (add workspace dep on game)

- [ ] **Step 1: Add workspace dep**

Run:
```bash
pnpm --filter @forge/dev-shell add @forge/game-inflation-rpg@workspace:*
```

- [ ] **Step 2: Update the registry**

Replace `apps/dev-shell/src/lib/registry.ts` with:
```ts
import type { GameManifestValue } from '@forge/core/manifest';

export interface RegisteredGame {
  manifest: GameManifestValue;
  load: () => Promise<{
    StartGame: (config: {
      parent: string;
      assetsBasePath: string;
      exposeTestHooks: boolean;
    }) => unknown;
  }>;
}

export const registeredGames: RegisteredGame[] = [
  {
    manifest: {
      slug: 'inflation-rpg',
      title: '조선 인플레이션 RPG',
      assetsBasePath: '/games/inflation-rpg/assets',
    },
    load: () => import('@forge/game-inflation-rpg'),
  },
];

export function findGame(slug: string): RegisteredGame | undefined {
  return registeredGames.find((g) => g.manifest.slug === slug);
}
```

Note: the manifest is inlined here rather than re-imported from the game.
Manifests in the registry are metadata — they must be serializable and
statically analyzable at dev-shell build time. The `load` callback is where
the game's actual code is dynamically imported.

- [ ] **Step 3: Create the client-side mount component**

Write `apps/dev-shell/src/components/GameMount.tsx`:
```tsx
'use client';

import { useEffect, useRef } from 'react';
import type { RegisteredGame } from '@/lib/registry';

export interface GameMountProps {
  game: RegisteredGame;
}

export default function GameMount({ game }: GameMountProps) {
  const containerId = `game-container-${game.manifest.slug}`;
  const instanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (instanceRef.current) return;
    let destroyed = false;
    let gameInstance: { destroy?: (removeCanvas?: boolean) => void } | null = null;

    game.load().then((mod) => {
      if (destroyed) return;
      gameInstance = mod.StartGame({
        parent: containerId,
        assetsBasePath: game.manifest.assetsBasePath,
        exposeTestHooks: true,
      }) as typeof gameInstance;
      instanceRef.current = gameInstance;
    });

    return () => {
      destroyed = true;
      gameInstance?.destroy?.(true);
      instanceRef.current = null;
    };
  }, [game, containerId]);

  return <div id={containerId} className="mx-auto" />;
}
```

- [ ] **Step 4: Update `[slug]/page.tsx` to render the mount**

Replace `apps/dev-shell/src/app/games/[slug]/page.tsx` with:
```tsx
import { notFound } from 'next/navigation';
import { findGame } from '@/lib/registry';
import GameMount from '@/components/GameMount';

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const game = findGame(slug);
  if (!game) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-xl font-semibold" data-testid="game-title">
        {game.manifest.title}
      </h1>
      <div className="mt-4">
        <GameMount game={game} />
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Update Next transpile list**

Open `apps/dev-shell/next.config.ts` and add the game to `transpilePackages`.
Replace:
```ts
  transpilePackages: ['@forge/core'],
```
with:
```ts
  transpilePackages: ['@forge/core', '@forge/game-inflation-rpg'],
```

- [ ] **Step 6: Serve the game's assets through the dev-shell origin**

The dev-shell's Next serves only `apps/dev-shell/public/`. The game's
assets live in `games/inflation-rpg/public/assets/`. Link them so requests
to `/games/inflation-rpg/assets/...` resolve.

Run:
```bash
mkdir -p apps/dev-shell/public/games/inflation-rpg
ln -sf "../../../../games/inflation-rpg/public/assets" apps/dev-shell/public/games/inflation-rpg/assets
ls -la apps/dev-shell/public/games/inflation-rpg/
```
Expected: `assets -> ../../../../games/inflation-rpg/public/assets` shown
as a symlink.

Verify the link targets the right directory:
```bash
ls apps/dev-shell/public/games/inflation-rpg/assets/images/ | head -5
```
Expected: `chosun_battle_bg.png`, etc.

- [ ] **Step 7: Manually verify the portal boots the game**

Run the dev server (in a separate terminal, or background): `pnpm dev`.

Open `http://localhost:3000/games/inflation-rpg` in a browser and confirm:
- Page header shows "조선 인플레이션 RPG".
- Phaser canvas renders (the Preloader screen, then the MainMenu).
- Browser DevTools Network tab shows `/games/inflation-rpg/assets/images/title_bg.png` returning 200.

If assets 404, check:
- Symlink points to an existing directory.
- `game.registry.get('assetsBasePath')` returns the expected string
  (add a `console.log` inside `Preloader.preload()` temporarily if needed;
  remove it before commit).

Stop the dev server.

- [ ] **Step 8: Commit**

Include the symlink in git (git tracks symlinks as-is).
```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add apps/dev-shell pnpm-lock.yaml
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "feat(dev-shell): mount inflation-rpg via dynamic import and expose its assets

The dev-shell registry now ships one game. GameMount renders a client-side
container and calls StartGame with the manifest-declared assetsBasePath.
Assets are surfaced through a symlink under public/ so the same URL pattern
works in dev and static export."
```

---

### Task 8: Curate public/assets — drop unused

Removes assets that aren't needed for the core play loop. The list below
is derived from what `Preloader.ts` references plus UI/sound files needed
by the scenes we kept.

**Files:**
- Delete under `games/inflation-rpg/public/assets/`:
  - `images/*_backup.*` (explicit "backup" duplicates)
  - any image NOT referenced by `Preloader.ts` image/spritesheet loads
  - `sounds/` entries NOT referenced by `Preloader.ts` audio loads
  - already deleted in Task 2: `data/raw_concept/`, `*.meta`

- [ ] **Step 1: Collect the referenced asset paths**

Run:
```bash
grep -oE "'(images|sounds)/[^']+'" games/inflation-rpg/src/game/scenes/Preloader.ts \
  | sort -u > /tmp/inflation-rpg-assets-used.txt
wc -l /tmp/inflation-rpg-assets-used.txt
head -20 /tmp/inflation-rpg-assets-used.txt
```

- [ ] **Step 2: List currently shipped assets**

Run:
```bash
(cd games/inflation-rpg/public/assets && find images sounds -type f) \
  | sort -u > /tmp/inflation-rpg-assets-present.txt
wc -l /tmp/inflation-rpg-assets-present.txt
```

- [ ] **Step 3: Compute the unreferenced set**

Run:
```bash
sed "s/'//g" /tmp/inflation-rpg-assets-used.txt > /tmp/used-cleaned.txt
comm -23 /tmp/inflation-rpg-assets-present.txt /tmp/used-cleaned.txt > /tmp/unreferenced.txt
wc -l /tmp/unreferenced.txt
cat /tmp/unreferenced.txt
```

- [ ] **Step 4: Review each unreferenced file**

Open `/tmp/unreferenced.txt`. For each listed file, decide:
- **Delete** if it's a clear backup (`*_backup.*`), preview/screenshot, or an
  older version of a kept sheet.
- **Keep** if the Preloader loads it indirectly (some scenes call
  `this.load.image` outside `Preloader.preload` — grep for the filename
  across `src/game/` to be sure).

Suggested mechanical pass for the obvious ones:
```bash
find games/inflation-rpg/public/assets/images \
  -type f \( -name "*_backup.*" -o -name "preview.*" \) -print -delete
```

For anything else on the unreferenced list, grep before deleting:
```bash
# example for each candidate:
grep -rn "<filename>" games/inflation-rpg/src/ || echo "NOT REFERENCED — safe to delete"
```

Delete only the files with no references. Do not delete tilemap JSON,
font files, or anything the game's runtime expects even if it's not in
`Preloader.ts` directly.

- [ ] **Step 5: Re-run the Preloader in the dev-shell portal**

Start `pnpm dev`, visit `http://localhost:3000/games/inflation-rpg`, and
watch the Network tab for any 404s. If any referenced asset is missing,
restore it from the upstream repo:
```bash
UPSTREAM=/Users/joel/Desktop/git/korea-inflation-rpg
cp "$UPSTREAM/public/assets/<path>" games/inflation-rpg/public/assets/<path>
```

Stop the dev server.

- [ ] **Step 6: Commit**

Record the final count in the commit message:
```bash
AFTER=$(find games/inflation-rpg/public/assets -type f | wc -l | tr -d ' ')
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add games/inflation-rpg/public
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "chore(game-inflation-rpg): prune unused assets (now $AFTER files)"
```

---

### Task 9: Curate `tests/game/` (vitest) — keep math/save/balance invariants only

Per spec §3 Phase 1: keep `InflationManager`, `StatCalculator`,
`SaveManager.migration`, `Monsters` balance, `KarmaManager`,
`ReincarnationManager`, `SkillManager`, `GameState.migration`, `SkillData`,
`ClassData`. Drop the rest.

**Files:**
- Delete: `games/inflation-rpg/tests/game/*.ts` except the listed keepers.

- [ ] **Step 1: Delete out-of-scope test files**

Run (from repo root):
```bash
cd games/inflation-rpg/tests/game

# KEEP (do not list here — we delete everything NOT keeper):
KEEP=(
  "InflationManager.test.ts"
  "InflationManager.autoTrigger.test.ts"
  "InflationEventManager.test.ts"
  "InflationEventManager.autoTrigger.test.ts"
  "InflationIntegration.test.ts"
  "StatCalculator.test.ts"
  "SaveManager.test.ts"
  "SaveManager.migration.test.ts"
  "GameState.migration.test.ts"
  "Monsters.test.ts"
  "MonsterRewards.balance.test.ts"
  "KarmaManager.test.ts"
  "ReincarnationManager.test.ts"
  "SkillManager.test.ts"
  "SkillData.test.ts"
  "ClassData.test.ts"
  "NumberFormatter.test.ts"
  "BossMonster.test.ts"
  "boss-unlock.test.ts"
  "DataManager.test.ts"
  "I18nManager.test.ts"
  "I18nIntegrity.test.ts"
  "BossAI.test.ts"
)

# Build a grep alt pattern for KEEP and delete the rest.
for f in *.test.ts *.spec.ts; do
  keep=no
  for k in "${KEEP[@]}"; do
    [[ "$f" == "$k" ]] && keep=yes && break
  done
  if [[ "$keep" == no ]]; then
    echo "DELETE $f"
    rm -f "$f"
  fi
done

cd -
```

Expected deletions: all `BattleScene*.test.ts` (includes .ui, .rewards,
.class, .test, Effects), `GumihoGimmick.test.ts`, `ShopScene*.test.ts`,
`InventoryScene.ui.test.ts`, `skill-usage.spec.ts`, `StatManager.signals.test.ts`,
`yaksu.test.ts`, `BalanceSimulation.test.ts`, `GridPhysics.test.ts`, and
`tests/game/startGame.test.ts` from Task 3 stays (it's in scope).

Also keep the TDD test from Task 3: re-check by running
`ls games/inflation-rpg/tests/game/startGame.test.ts` — if missing, it was
incorrectly deleted. Restore if needed.

- [ ] **Step 2: Adjust test `import` paths**

Upstream tests import with path alias `@/game/...` (`@` → `src/`). Our
`tsconfig.json` already maps `@/*` to `./src/*`, so paths work unchanged.
Verify:
```bash
grep -h "from '@/" games/inflation-rpg/tests/game/*.ts | head -5
```
Expected: lines like `from '@/game/utils/InflationManager'`. These resolve
correctly against our tsconfig path map.

- [ ] **Step 3: Run the curated vitest suite**

Run: `pnpm --filter @forge/game-inflation-rpg test 2>&1 | tail -20`
Expected: a high pass rate. Record the exact count.

If any test fails due to the Task 3 `main.ts` refactor or a test that
indirectly loads a deleted utility, examine the failure. Options:
- If a kept test imports a now-deleted helper, **add the helper back** from
  the upstream repo (it's not in the explicit keep list but is needed as a
  dependency of a keeper).
- If a kept test depends on `window.gameState` being auto-exposed, update
  the test to explicitly call `exposeTestHooks({...})` or accept the break
  if it was coupling to the old leaky initialization (document in report).

- [ ] **Step 4: Commit**

Record the numbers:
```bash
BEFORE=$(git -C /Users/joel/Desktop/git/korea-inflation-rpg ls-files "tests/game/" | wc -l | tr -d ' ')
AFTER=$(ls games/inflation-rpg/tests/game/ | wc -l | tr -d ' ')
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add games/inflation-rpg/tests
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "chore(game-inflation-rpg): curate vitest suite ($BEFORE → $AFTER files)

Keeps math/save/balance/data invariants per spec §3 Phase 1. Drops UI
snapshot, battle-scene implementation-detail, and E2E-redundant tests.
Remaining suite is the rule-of-three safety net for later promotion to
@forge/core."
```

---

### Task 10: Playwright E2E — portal-anchored full game flow

Keep only `full-game-flow.spec.ts` (already renamed in Task 2). Make it
target the portal URL. Keep `GameTestHelper.ts` (already copied).

**Files:**
- Create: `games/inflation-rpg/playwright.config.ts`
- Modify: `games/inflation-rpg/tests/e2e/full-game-flow.spec.ts` (update routes)
- Modify: `games/inflation-rpg/tests/e2e/helpers/GameTestHelper.ts` (update any hardcoded paths)

- [ ] **Step 1: Write Playwright config**

Write `games/inflation-rpg/playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const DEV_SHELL_CWD = path.resolve(__dirname, '../../apps/dev-shell');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm --filter @forge/dev-shell dev',
    url: 'http://localhost:3000',
    cwd: DEV_SHELL_CWD,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

Note: `workers: 1` because the dev-shell is a single dev server and the
game writes to one localStorage key; parallel workers would race.

- [ ] **Step 2: Update the spec to navigate through the portal**

Open `games/inflation-rpg/tests/e2e/full-game-flow.spec.ts`. Its `page.goto('/')`
calls currently expect the game at the root. Replace every
`page.goto('/')` with `page.goto('/games/inflation-rpg')`.

Search and replace within the file:
```bash
sed -i '' "s|page\\.goto('/')|page.goto('/games/inflation-rpg')|g" \
  games/inflation-rpg/tests/e2e/full-game-flow.spec.ts
sed -i '' "s|page\\.goto(\"/\")|page.goto(\"/games/inflation-rpg\")|g" \
  games/inflation-rpg/tests/e2e/full-game-flow.spec.ts
```

Verify manually:
```bash
grep -n "page.goto" games/inflation-rpg/tests/e2e/full-game-flow.spec.ts
```
All `page.goto` calls must target `/games/inflation-rpg` (or deeper paths).

- [ ] **Step 3: Update the helper the same way**

Same sed treatment on the helper:
```bash
sed -i '' "s|page\\.goto('/')|page.goto('/games/inflation-rpg')|g" \
  games/inflation-rpg/tests/e2e/helpers/GameTestHelper.ts
sed -i '' "s|page\\.goto(\"/\")|page.goto(\"/games/inflation-rpg\")|g" \
  games/inflation-rpg/tests/e2e/helpers/GameTestHelper.ts
grep -n "page.goto" games/inflation-rpg/tests/e2e/helpers/GameTestHelper.ts
```

- [ ] **Step 4: Install Playwright browsers for the new workspace**

Run: `pnpm --filter @forge/game-inflation-rpg exec playwright install chromium`
Expected: chromium available (may reuse the dev-shell install).

- [ ] **Step 5: Run the E2E**

Run: `pnpm --filter @forge/game-inflation-rpg e2e 2>&1 | tail -10`
Expected: `1 passed`.

If failures:
- Exact failure at the first Phaser-dependent step → the game did not boot
  in the portal. Check Network for asset 404s, console for errors.
- Timeout waiting for `window.gameState` → `exposeTestHooks: true` missing
  or testHooks.ts branch broken.
- Missing selector on the MainMenu → verify Preloader finished (slow CI).
  Increase the wait timeout in the helper if it's a flake.

- [ ] **Step 6: Commit**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add games/inflation-rpg/playwright.config.ts games/inflation-rpg/tests/e2e
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "test(game-inflation-rpg): wire full-game-flow e2e through the portal"
```

---

### Task 11: End-to-end verification, turbo pipeline, release build

- [ ] **Step 1: Clean install**

Run:
```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules games/*/node_modules
pnpm install --frozen-lockfile
```
Expected: no errors. Lockfile unchanged.

- [ ] **Step 2: Full turbo pipeline**

Run: `pnpm turbo run typecheck lint test --force 2>&1 | tail -15`
Expected: all workspaces green. The game's vitest suite runs the curated
tests.

- [ ] **Step 3: Circular dependency check**

Run: `pnpm circular 2>&1 | tail -3`
Expected: `No circular dependency found!`.

- [ ] **Step 4: Portal E2E**

Run: `pnpm --filter @forge/game-inflation-rpg e2e 2>&1 | tail -8`
Expected: `1 passed`.

- [ ] **Step 5: Portal smoke still green**

Run: `pnpm --filter @forge/dev-shell e2e 2>&1 | tail -6`
Expected: `2 passed`. (Phase 0 smoke still works — now one of the two
tests covers a state where inflation-rpg IS registered. Update the Phase 0
test if necessary: if the "no games registered" assertion now fails because
a game IS registered, rewrite the test to assert the portal lists at least
one game. This is a **permitted Phase 0 test update**, documented inline.)

If the Phase 0 smoke fails on that assertion, open
`apps/dev-shell/tests/e2e/portal.spec.ts` and replace the first test body:
```ts
test('portal lists registered games', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '2d-game-forge' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: /조선 인플레이션 RPG/ }),
  ).toBeVisible();
});
```

- [ ] **Step 6: Release build verification**

Run: `pnpm --filter @forge/game-inflation-rpg build 2>&1 | tail -15`
Expected: Next emits to `games/inflation-rpg/out/`. Verify:
```bash
ls games/inflation-rpg/out/
test -f games/inflation-rpg/out/index.html && echo "HTML OK"
test -d games/inflation-rpg/out/assets && echo "ASSETS OK"
```
Both should print `OK`.

- [ ] **Step 7: Capacitor sync smoke**

Run: `pnpm --filter @forge/game-inflation-rpg exec cap sync 2>&1 | tail -15`
Expected: Capacitor reports success. If this is the first run, it may ask
to add platforms — that is acceptable: add iOS and Android via the commands
Capacitor suggests, or skip if the sync step alone returns exit 0.

Do NOT attempt `build:ios` or `build:android` in this task — they open
native IDEs and require platform SDKs. Leave those for manual
verification by the user.

- [ ] **Step 8: Manual portal play-through (human gate)**

Run `pnpm dev`. Open `http://localhost:3000/games/inflation-rpg`.

Verify manually:
- MainMenu → "새 게임" (or equivalent) starts the flow.
- Class select screen appears.
- After picking Hwarang, world map appears.
- Stepping into an encounter starts a battle.
- After a battle win, gold and XP update.
- Opening Inventory / Shop works without console errors.
- Refreshing the page restores state (SaveManager with original key
  `'korea_inflation_rpg_save'` is still working).

Stop the dev server.

- [ ] **Step 9: Final commit if any test updates were made, then tag**

If Step 5 required a Phase 0 smoke update, commit it now:
```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add apps/dev-shell/tests
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "test(dev-shell): portal smoke now asserts at least one game is registered"
```

Tag the result:
```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" tag phase-1-complete
git log --oneline | head -20
```

Do NOT push the tag automatically — confirm with the user.

---

## Self-Review

**1. Spec coverage:**

| Spec section | Task |
|---|---|
| §0 Phase 1 success #1 (inflation-rpg plays with curated tests) | Tasks 2, 4, 9, 10, 11 |
| §0 Phase 1 success #2 (`pnpm dev` loads inflation-rpg) | Task 7 |
| §0 Phase 1 success #3 (iOS/Android build command exists) | Tasks 1 (scripts), 6 (capacitor config), 11 (smoke) |
| §2 동일 `StartGame` 엔트리 | Task 3 (config-driven), Task 6 (release), Task 7 (portal) |
| §2 매니페스트 기반 부팅 | Task 5 (gameManifest), Task 7 (registry uses it) |
| §2 저장 네임스페이스 | **Not applied in Phase 1** — spec says "승격 시 리팩터 분리". `SaveManager` stays inside inflation-rpg with the upstream key. Phase 2 or later handles namespacing. |
| §2 전역 테스트 훅 격리 | Task 3 — `exposeTestHooks` is opt-in via `StartGameConfig.exposeTestHooks`. |
| §3 Phase 1 code curation (scenes, managers) | Task 2 (only the listed files are copied — orphaned experiments like `suggest_csv/`, `docs/`, `scripts/` are not copied in the first place) |
| §3 Phase 1 asset curation | Task 8 |
| §3 Phase 1 test curation (Vitest 100-150, one E2E) | Tasks 9 (Vitest) and 10 (Playwright) |
| §3 Phase 1 stopping condition (tests green, manual play ok) | Task 11 |

**2. Placeholder scan:** No TBD/TODO. Every code block is complete. All
decisions the implementer must make (asset keep/delete judgement calls in
Task 8, Phase 0 smoke update in Task 11 Step 5) are accompanied by the
exact criterion and the exact replacement text.

**3. Type consistency:**
- `StartGameConfig` (Task 3) fields `parent`, `assetsBasePath`,
  `exposeTestHooks` match usage in Task 6 (PhaserGame.tsx), Task 7
  (registry and GameMount), and Task 10 (e2e doesn't reference config
  directly — uses `window.gameState` via helper).
- `GameManifestValue` (from `@forge/core/manifest`) is used identically in
  Task 5 (barrel), Task 7 (registry). `gameManifest` object literal in
  both Task 5 and Task 7 Step 2 has identical `slug`/`title`/`assetsBasePath`
  values.
- `buildPhaserConfig({ parent })` (Task 3 main.ts) is called by
  `StartGame(config)` passing `{ parent: config.parent }` — signature matches.
- `exposeTestHooks(slots)` (Task 3 testHooks.ts) keys match the fields
  used in `startGame.ts` — `gameState`, `inflationManager`,
  `ReincarnationManager`, `phaserGame`, `currentScene`.

**4. Scope check:** Everything in scope for Phase 1 per spec §3. No
package promotion (`packages/2d-core` remains `GameManifest`-only), no
content pack split (Korean folklore stays inside `games/inflation-rpg/`),
no genre core created.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-17-phase1-inflation-rpg-port.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best fit for the 11-task arc where some tasks (bulk copy, asset curation, test curation) have real judgement calls.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
