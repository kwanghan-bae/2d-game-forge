# Phase 0 — Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `2d-game-forge` pnpm + Turborepo monorepo skeleton with an empty portal app and a placeholder `@forge/core` package. `pnpm dev` must show the portal with a "no games yet" message, and `pnpm turbo run typecheck lint` must pass.

**Architecture:** Single-repo monorepo. `apps/dev-shell` is a Next.js 16 app that will dynamically load games from `games/*`. `packages/*` hosts reusable code. Turborepo caches builds by dependency graph. CI enforces typecheck, lint, and a dependency boundaries rule. No game code exists yet — Phase 1 plan ports korea-inflation-rpg.

**Tech Stack:**
- pnpm workspaces (v9+)
- Turborepo v2
- TypeScript 5 (strict)
- Next.js 16 + React 19 (dev-shell)
- Tailwind v4 (dev-shell UI)
- Vitest 4 (unit tests for shared types)
- Playwright 1.57 (portal smoke)
- Zod 4 (manifest schema)
- ESLint 9 + `eslint-plugin-boundaries` (dependency direction enforcement)
- `madge` (circular dependency detection)

**Spec:** `docs/superpowers/specs/2026-04-17-2d-game-forge-initial-design.md`

---

## File Structure

Files created in this plan (all paths relative to repo root `/Users/joel/Desktop/git/2d-game-forge/`):

```
package.json                              # root (pnpm scripts, devDeps)
pnpm-workspace.yaml                       # workspace globs
turbo.json                                # pipeline config
tsconfig.base.json                        # shared TS config
.npmrc                                    # pnpm settings
.nvmrc                                    # Node version pin
eslint.config.mjs                         # flat config + boundaries rule
.prettierrc.json                          # formatter
.github/workflows/ci.yml                  # CI gate

packages/2d-core/
├── package.json                          # name: @forge/core
├── tsconfig.json
├── README.md
├── src/index.ts                          # re-export barrel
├── src/manifest.ts                       # GameManifest zod schema + type
└── tests/manifest.test.ts                # vitest: schema validation

apps/dev-shell/
├── package.json                          # name: @forge/dev-shell
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── tailwind.config.ts
├── src/app/layout.tsx
├── src/app/page.tsx                      # game selector
├── src/app/globals.css
├── src/app/games/[slug]/page.tsx         # dynamic game loader (placeholder behavior)
├── src/lib/registry.ts                   # reads registered manifests
├── tests/e2e/portal.spec.ts              # playwright: portal loads
└── playwright.config.ts
```

Each file has one responsibility. `@forge/core` in this phase only hosts the shared `GameManifest` schema so the dev-shell has a typed contract. Everything else in `@forge/core` waits until Phase 1.

---

## Task Order and Dependencies

Tasks run sequentially. Each task ends with a commit. Do not skip the commit step — it makes rollback and review easy.

---

### Task 1: Lock Node version and package manager

**Files:**
- Create: `.nvmrc`
- Create: `.npmrc`

- [ ] **Step 1: Pin Node version to 22 LTS**

Write `.nvmrc`:
```
22
```

- [ ] **Step 2: Configure pnpm strictness**

Write `.npmrc`:
```
engine-strict=true
save-exact=false
auto-install-peers=true
node-linker=isolated
```

- [ ] **Step 3: Verify Node is available**

Run: `node --version`
Expected: `v22.x.x`. If not, switch with `nvm use 22`.

Run: `corepack --version`
Expected: a version number. If `corepack` is missing, install Node 22 via nvm.

Run: `corepack enable pnpm && pnpm --version`
Expected: `9.x` or higher.

- [ ] **Step 4: Commit**

```bash
git add .nvmrc .npmrc
git commit -m "chore: pin node 22 and pnpm via corepack"
```

---

### Task 2: Root package.json and workspace config

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`

- [ ] **Step 1: Write pnpm workspace globs**

Write `pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "games/*"
  - "packages/*"
  - "tooling/*"
```

- [ ] **Step 2: Write root package.json**

Write `package.json`:
```json
{
  "name": "2d-game-forge",
  "private": true,
  "version": "0.1.0",
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "dev": "turbo run dev --filter=@forge/dev-shell",
    "build": "turbo run build",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "e2e": "turbo run e2e",
    "circular": "madge --circular --extensions ts,tsx apps packages games",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "eslint": "^9.0.0",
    "madge": "^8.0.0",
    "prettier": "^3.3.0",
    "turbo": "^2.3.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 3: Install root deps**

Run: `pnpm install`
Expected: `Done` with no errors. Creates `pnpm-lock.yaml` and root `node_modules`.

- [ ] **Step 4: Verify turbo is callable**

Run: `pnpm turbo --version`
Expected: `2.x.x`.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore: init pnpm workspace with turbo"
```

---

### Task 3: Shared TypeScript base config

**Files:**
- Create: `tsconfig.base.json`

- [ ] **Step 1: Write base config**

Write `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": false,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "incremental": true
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add tsconfig.base.json
git commit -m "chore: add shared tsconfig.base.json"
```

---

### Task 4: Turborepo pipeline config

**Files:**
- Create: `turbo.json`

- [ ] **Step 1: Write turbo.json**

Write `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["tsconfig.base.json", ".nvmrc"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**", "out/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "outputs": ["**/*.tsbuildinfo"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "e2e": {
      "dependsOn": ["^build"],
      "cache": false,
      "outputs": ["playwright-report/**", "test-results/**"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

- [ ] **Step 2: Verify turbo parses the config**

Run: `pnpm turbo run typecheck --dry-run=json | head -20`
Expected: valid JSON describing the task graph, no workspaces yet (empty tasks array is fine).

- [ ] **Step 3: Commit**

```bash
git add turbo.json
git commit -m "chore: add turbo pipeline config"
```

---

### Task 5: Prettier config

**Files:**
- Create: `.prettierrc.json`
- Create: `.prettierignore`

- [ ] **Step 1: Write prettier config**

Write `.prettierrc.json`:
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "endOfLine": "lf"
}
```

- [ ] **Step 2: Write prettier ignore**

Write `.prettierignore`:
```
node_modules
.next
out
dist
coverage
playwright-report
test-results
.turbo
pnpm-lock.yaml
```

- [ ] **Step 3: Commit**

```bash
git add .prettierrc.json .prettierignore
git commit -m "chore: add prettier config"
```

---

### Task 6: Create @forge/core package skeleton (no logic yet)

**Files:**
- Create: `packages/2d-core/package.json`
- Create: `packages/2d-core/tsconfig.json`
- Create: `packages/2d-core/src/index.ts`
- Create: `packages/2d-core/README.md`

- [ ] **Step 1: Write package manifest**

Write `packages/2d-core/package.json`:
```json
{
  "name": "@forge/core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./manifest": "./src/manifest.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint src"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "eslint": "^9.0.0",
    "typescript": "^5.6.0",
    "vitest": "^4.0.16"
  },
  "dependencies": {
    "zod": "^4.3.6"
  }
}
```

- [ ] **Step 2: Write tsconfig**

Write `packages/2d-core/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "noEmit": true
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: Write README**

Write `packages/2d-core/README.md`:
```markdown
# @forge/core

Shared bootstrap layer for every 2d-game-forge game. In Phase 0 this package
exposes only the `GameManifest` schema. Additional utilities (EventBus,
SaveManager, i18n, Capacitor helpers, E2E hooks) are promoted from games on
demand per the "rule of three" — see the initial design spec.

## Public exports

- `GameManifest` (zod schema + inferred type): describes how the dev-shell
  loads a game.
```

- [ ] **Step 4: Write index barrel**

Write `packages/2d-core/src/index.ts`:
```ts
export { GameManifest, parseGameManifest } from './manifest';
export type { GameManifestInput } from './manifest';
```

- [ ] **Step 5: Install package deps**

Run: `pnpm install`
Expected: `@forge/core` is linked into the workspace, zod is downloaded.

- [ ] **Step 6: Commit (manifest file added in Task 7)**

Do not commit yet. Task 7 adds the `manifest.ts` file that `index.ts` imports
from, so committing now would leave a broken build. Proceed directly to Task 7.

---

### Task 7: GameManifest schema (TDD)

**Files:**
- Create: `packages/2d-core/src/manifest.ts`
- Create: `packages/2d-core/tests/manifest.test.ts`
- Create: `packages/2d-core/vitest.config.ts`

- [ ] **Step 1: Write vitest config**

Write `packages/2d-core/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 2: Write the failing test**

Write `packages/2d-core/tests/manifest.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseGameManifest } from '../src/manifest';

describe('parseGameManifest', () => {
  it('accepts a minimal valid manifest', () => {
    const input = {
      slug: 'inflation-rpg',
      title: '조선 인플레이션 RPG',
      assetsBasePath: '/games/inflation-rpg/assets',
    };
    const result = parseGameManifest(input);
    expect(result.slug).toBe('inflation-rpg');
    expect(result.title).toBe('조선 인플레이션 RPG');
    expect(result.assetsBasePath).toBe('/games/inflation-rpg/assets');
  });

  it('rejects slug with uppercase or spaces', () => {
    expect(() =>
      parseGameManifest({
        slug: 'Inflation RPG',
        title: 'x',
        assetsBasePath: '/a',
      }),
    ).toThrow();
  });

  it('rejects an empty title', () => {
    expect(() =>
      parseGameManifest({
        slug: 'ok',
        title: '',
        assetsBasePath: '/a',
      }),
    ).toThrow();
  });

  it('requires assetsBasePath to start with "/"', () => {
    expect(() =>
      parseGameManifest({
        slug: 'ok',
        title: 'ok',
        assetsBasePath: 'assets',
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @forge/core test`
Expected: FAIL with "Cannot find module '../src/manifest'" or equivalent.

- [ ] **Step 4: Write the manifest schema**

Write `packages/2d-core/src/manifest.ts`:
```ts
import { z } from 'zod';

export const GameManifest = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'slug must be lowercase kebab-case'),
  title: z.string().min(1, 'title must not be empty'),
  assetsBasePath: z
    .string()
    .startsWith('/', 'assetsBasePath must start with "/"'),
});

export type GameManifestInput = z.input<typeof GameManifest>;
export type GameManifestValue = z.output<typeof GameManifest>;

export function parseGameManifest(input: unknown): GameManifestValue {
  return GameManifest.parse(input);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @forge/core test`
Expected: 4 passed.

- [ ] **Step 6: Typecheck the package**

Run: `pnpm --filter @forge/core typecheck`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add packages/2d-core pnpm-lock.yaml
git commit -m "feat(core): add GameManifest zod schema"
```

---

### Task 8: Create @forge/dev-shell Next.js app

**Files:**
- Create: `apps/dev-shell/package.json`
- Create: `apps/dev-shell/tsconfig.json`
- Create: `apps/dev-shell/next.config.ts`
- Create: `apps/dev-shell/next-env.d.ts`
- Create: `apps/dev-shell/postcss.config.mjs`
- Create: `apps/dev-shell/tailwind.config.ts`
- Create: `apps/dev-shell/src/app/layout.tsx`
- Create: `apps/dev-shell/src/app/globals.css`

- [ ] **Step 1: Write package manifest**

Write `apps/dev-shell/package.json`:
```json
{
  "name": "@forge/dev-shell",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start --port 3000",
    "typecheck": "tsc --noEmit",
    "lint": "next lint",
    "e2e": "playwright test"
  },
  "dependencies": {
    "@forge/core": "workspace:*",
    "next": "16.1.1",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@playwright/test": "^1.57.0",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20.0.0",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint-config-next": "16.1.1",
    "tailwindcss": "^4",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Write tsconfig**

Write `apps/dev-shell/tsconfig.json`:
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
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules", ".next", "out"]
}
```

- [ ] **Step 3: Write next config**

Write `apps/dev-shell/next.config.ts`:
```ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  typedRoutes: false,
  transpilePackages: ['@forge/core'],
};

export default config;
```

- [ ] **Step 4: Write Next type shim**

Write `apps/dev-shell/next-env.d.ts`:
```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 5: Write PostCSS config**

Write `apps/dev-shell/postcss.config.mjs`:
```js
export default {
  plugins: { '@tailwindcss/postcss': {} },
};
```

- [ ] **Step 6: Write Tailwind config**

Write `apps/dev-shell/tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
};

export default config;
```

- [ ] **Step 7: Write root layout**

Write `apps/dev-shell/src/app/layout.tsx`:
```tsx
import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: '2d-game-forge Dev Shell',
  description: 'Local portal for running forge games in the browser.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Write globals CSS**

Write `apps/dev-shell/src/app/globals.css`:
```css
@import 'tailwindcss';

html,
body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
}
```

- [ ] **Step 9: Install deps**

Run: `pnpm install`
Expected: `Done`. `@forge/core` is linked via `workspace:*`.

- [ ] **Step 10: Do not commit yet — Task 9 adds the pages**

The app does not yet have any page. Next will fail to build. Proceed to Task 9.

---

### Task 9: Portal selector page and game loader route (no games registered yet)

**Files:**
- Create: `apps/dev-shell/src/lib/registry.ts`
- Create: `apps/dev-shell/src/app/page.tsx`
- Create: `apps/dev-shell/src/app/games/[slug]/page.tsx`

- [ ] **Step 1: Write the empty registry**

Write `apps/dev-shell/src/lib/registry.ts`:
```ts
import type { GameManifestValue } from '@forge/core/manifest';

export interface RegisteredGame {
  manifest: GameManifestValue;
  load: () => Promise<unknown>;
}

export const registeredGames: RegisteredGame[] = [];

export function findGame(slug: string): RegisteredGame | undefined {
  return registeredGames.find((g) => g.manifest.slug === slug);
}
```

Phase 1 will push manifests into this array when `games/inflation-rpg` is
registered. For Phase 0 it stays empty.

- [ ] **Step 2: Write the selector page**

Write `apps/dev-shell/src/app/page.tsx`:
```tsx
import Link from 'next/link';
import { registeredGames } from '@/lib/registry';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold">2d-game-forge</h1>
      <p className="mt-2 text-slate-400">Local dev portal.</p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Games</h2>
        {registeredGames.length === 0 ? (
          <p
            data-testid="no-games"
            className="mt-3 rounded-md border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300"
          >
            아직 등록된 게임이 없습니다. Phase 1 에서 inflation-rpg 가 추가됩니다.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {registeredGames.map(({ manifest }) => (
              <li key={manifest.slug}>
                <Link
                  href={`/games/${manifest.slug}`}
                  className="block rounded-md border border-slate-800 bg-slate-900 p-4 hover:bg-slate-800"
                >
                  <div className="font-medium">{manifest.title}</div>
                  <div className="text-xs text-slate-500">/{manifest.slug}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Write the dynamic game route**

Write `apps/dev-shell/src/app/games/[slug]/page.tsx`:
```tsx
import { notFound } from 'next/navigation';
import { findGame } from '@/lib/registry';

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const game = findGame(slug);
  if (!game) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-bold">{game.manifest.title}</h1>
      <p
        data-testid="game-placeholder"
        className="mt-3 text-sm text-slate-400"
      >
        게임 로더는 Phase 1 에서 `StartGame(config)` 을 호출하도록 연결됩니다.
      </p>
    </main>
  );
}
```

- [ ] **Step 4: Start the dev server**

Run: `pnpm --filter @forge/dev-shell dev` (in a separate terminal or background)
Expected: `Ready` message. `http://localhost:3000` shows the home page with
the "아직 등록된 게임이 없습니다" message.

Manual check: open the URL in a browser.

- [ ] **Step 5: Stop the dev server**

Ctrl+C or kill the background job.

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @forge/dev-shell typecheck`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add apps/dev-shell pnpm-lock.yaml
git commit -m "feat(dev-shell): add portal selector and game route"
```

---

### Task 10: Portal smoke E2E (Playwright)

**Files:**
- Create: `apps/dev-shell/playwright.config.ts`
- Create: `apps/dev-shell/tests/e2e/portal.spec.ts`

- [ ] **Step 1: Write the failing smoke test**

Write `apps/dev-shell/tests/e2e/portal.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('portal shows empty state when no games are registered', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '2d-game-forge' })).toBeVisible();
  await expect(page.getByTestId('no-games')).toContainText(
    '아직 등록된 게임이 없습니다',
  );
});

test('unknown game slug renders 404', async ({ page }) => {
  const response = await page.goto('/games/does-not-exist');
  expect(response?.status()).toBe(404);
});
```

- [ ] **Step 2: Write the Playwright config**

Write `apps/dev-shell/playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: Install Playwright browsers**

Run: `pnpm --filter @forge/dev-shell exec playwright install chromium`
Expected: chromium downloaded.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @forge/dev-shell e2e`
Expected: 2 passed. (Playwright starts its own dev server via `webServer`.)

- [ ] **Step 5: Commit**

```bash
git add apps/dev-shell
git commit -m "test(dev-shell): add portal smoke e2e"
```

---

### Task 11: ESLint flat config with boundary enforcement

**Files:**
- Create: `eslint.config.mjs`

- [ ] **Step 1: Install eslint-plugin-boundaries**

Run:
```bash
pnpm add -Dw eslint-plugin-boundaries @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

Expected: deps added to root `package.json`.

- [ ] **Step 2: Write the flat config**

Write `eslint.config.mjs`:
```js
import boundaries from 'eslint-plugin-boundaries';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'core', pattern: 'packages/2d-core/**' },
        { type: 'genre', pattern: 'packages/2d-*-core/**' },
        { type: 'plugin', pattern: 'packages/economy-*/**' },
        { type: 'content', pattern: 'packages/content-*/**' },
        { type: 'game', pattern: 'games/*/**' },
        { type: 'app', pattern: 'apps/*/**' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'core', allow: [] },
            { from: 'genre', allow: ['core'] },
            { from: 'plugin', allow: ['core'] },
            { from: 'content', allow: ['core', 'genre'] },
            { from: 'game', allow: ['core', 'genre', 'plugin', 'content'] },
            { from: 'app', allow: ['core', 'genre', 'plugin', 'content', 'game'] },
          ],
        },
      ],
    },
  },
];
```

- [ ] **Step 3: Add lint script hook at root**

No root change needed — each workspace's `lint` script runs `eslint` with the
repo-level flat config because ESLint 9 flat configs are discovered upward from
the file being linted.

- [ ] **Step 4: Run lint across workspaces**

Run: `pnpm turbo run lint`
Expected: workspaces without a `lint` script are skipped; `@forge/dev-shell`
passes (Next built-in lint) and `@forge/core` passes.

If either fails on the current source, fix the lint error before committing.
Do not disable the rule.

- [ ] **Step 5: Commit**

```bash
git add eslint.config.mjs package.json pnpm-lock.yaml
git commit -m "chore: add eslint flat config with layer boundaries"
```

---

### Task 12: Circular dependency guard

**Files:**
- Modify: `package.json` (already has `circular` script from Task 2)

- [ ] **Step 1: Run the circular check**

Run: `pnpm circular`
Expected: `No circular dependency found!` (madge default success message).

If any circulars surface, fix them before proceeding — do not commit with a
circular dependency present.

- [ ] **Step 2: Commit (no new files — checkpoint only)**

Skip the commit for this task; the command is already wired and green.

---

### Task 13: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the CI workflow**

Write `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Get pnpm store path
        id: pnpm-store
        run: echo "dir=$(pnpm store path)" >> "$GITHUB_OUTPUT"

      - uses: actions/cache@v4
        with:
          path: ${{ steps.pnpm-store.outputs.dir }}
          key: pnpm-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}

      - run: pnpm install --frozen-lockfile

      - run: pnpm turbo run typecheck lint test
      - run: pnpm circular

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @forge/dev-shell exec playwright install --with-deps chromium
      - run: pnpm --filter @forge/dev-shell e2e
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "chore: add CI with typecheck, lint, test, e2e, circular"
```

---

### Task 14: End-to-end verification on a clean checkout

**Files:** (none — verification only)

- [ ] **Step 1: Clean install**

Run:
```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install --frozen-lockfile
```
Expected: no errors. `pnpm-lock.yaml` is unchanged.

- [ ] **Step 2: Run full pipeline**

Run: `pnpm turbo run typecheck lint test`
Expected: all workspaces green.

- [ ] **Step 3: Run circular check**

Run: `pnpm circular`
Expected: `No circular dependency found!`.

- [ ] **Step 4: Run E2E**

Run: `pnpm --filter @forge/dev-shell e2e`
Expected: 2 passed.

- [ ] **Step 5: Manual browser verification**

Run: `pnpm dev` (background).

Open http://localhost:3000 in a local browser.
Confirm:
- Heading reads "2d-game-forge".
- Empty-state message "아직 등록된 게임이 없습니다" is visible.
- http://localhost:3000/games/does-not-exist returns the Next.js 404 page.

Stop the dev server.

- [ ] **Step 6: Tag the checkpoint**

```bash
git tag phase-0-complete
git log --oneline | head -20
```

Do not push the tag automatically — confirm with the user before pushing.

---

## Self-Review Notes

**Spec coverage:**
- §1 레포 구조 → Tasks 2, 6, 8 create the layout described.
- §1 패키지 네임스페이스 → `@forge/core` (Task 6) and `@forge/dev-shell` (Task 8) created with exact names from spec.
- §1 의존성 방향 규칙 → Task 11 enforces `core → genre → plugin → content → game → app` via eslint-plugin-boundaries; Task 12 adds madge for circular detection.
- §1 Day 1 상태 → Task 6 creates `@forge/core` as a near-empty shell holding only the manifest schema. `2d-rpg-core`, `economy-inflation`, `content-korean-folklore` are **intentionally not created** (matches spec's "존재하지 않음").
- §1 공용 설정 → Task 3 (tsconfig.base.json), Task 4 (turbo pipeline).
- §2 개발 모드 포털 → Task 9 creates the `/` selector and `/games/[slug]` route. The registry is empty in Phase 0, to be populated in Phase 1.
- §2 동일 `StartGame` 엔트리 원칙 → Not implemented yet (no game exists). `RegisteredGame.load` field in `registry.ts` is the slot where Phase 1 will wire `StartGame(config)`.
- §2 매니페스트 기반 부팅 → Task 7 defines `GameManifest` schema; Phase 1 will add `StartGameConfig` when porting the real entry.
- §2 CI 파이프라인 → Task 13 runs typecheck + lint + test + e2e + circular on PR.
- §4 테스트 계층 → Task 7 pattern establishes `packages/*/tests/`; Task 10 establishes `apps/dev-shell/tests/e2e/`. Phase 1 will add `games/<name>/tests/`.
- §4 의존성 방향 린트 → Task 11.
- §4 순환 참조 탐지 → Tasks 2 & 12 (madge script).
- §4 번들 크기 스모크 → **Deferred to Phase 1** when a real game produces a bundle. Not a Phase 0 gap.
- §3 Phase 0 산출물 요구 → "`pnpm dev` 로 포털이 뜸, 아직 게임 없음" satisfied by Task 14 Step 5.

**Placeholder scan:** No TBD/TODO left. All code blocks complete. No "similar to Task N" short-hands.

**Type consistency:** `parseGameManifest` (Task 7) is imported in `apps/dev-shell/src/lib/registry.ts` (Task 9) via `GameManifestValue` type, not the function itself. Matches. `RegisteredGame.manifest` typed as `GameManifestValue`, which is what Task 7 exports.

**Known deferrals (intentional, documented in plan):**
- Bundle-size smoke → Phase 1.
- Real `StartGame(config)` entry wiring → Phase 1.
- `@forge/core` runtime utilities (EventBus, SaveManager, etc.) → promoted later per Phase 2 rule of three.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-17-phase0-bootstrap.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for a 14-task scaffolding plan where each task is small and independent.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
