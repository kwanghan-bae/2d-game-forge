# Phase 0 — Bootstrap 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**목표:** pnpm + Turborepo monorepo 스켈레톤을 생성한다. 빈 포털 앱과 플레이스홀더 `@forge/core` 패키지를 포함한다. `pnpm dev` 실행 시 "아직 게임 없음" 메시지가 있는 포털이 표시되어야 하고, `pnpm turbo run typecheck lint`가 통과되어야 한다.

**아키텍처:** Single-repo monorepo. `apps/dev-shell`은 Next.js 16 앱으로, `games/*`에서 게임을 동적으로 로드한다. `packages/*`에는 재사용 가능한 코드를 둔다. Turborepo는 의존성 그래프에 따라 빌드를 캐싱한다. CI는 typecheck, lint, 의존성 방향 규칙을 강제한다. Phase 0에는 게임 코드가 존재하지 않는다 — Phase 1 계획에서 korea-inflation-rpg를 이식한다.

**Tech Stack:**
- pnpm workspaces (v9+)
- Turborepo v2
- TypeScript 5 (strict)
- Next.js 16 + React 19 (dev-shell)
- Tailwind v4 (dev-shell UI)
- Vitest 4 (공용 타입 단위 테스트)
- Playwright 1.57 (포털 smoke test)
- Zod 4 (manifest schema)
- ESLint 9 + `eslint-plugin-boundaries` (의존성 방향 강제)
- `madge` (순환 의존성 탐지)

**Spec:** `docs/superpowers/specs/2026-04-17-2d-game-forge-initial-design.md`

---

## 파일 구조

이 계획에서 생성하는 파일 목록 (모든 경로는 레포 루트 `/Users/joel/Desktop/git/2d-game-forge/` 기준 상대 경로):

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

각 파일은 단일 책임을 가진다. Phase 0에서 `@forge/core`는 공유 `GameManifest` schema만 제공하여 dev-shell이 타입화된 계약을 갖도록 한다. `@forge/core`의 나머지 내용은 Phase 1을 기다린다.

---

## 태스크 순서와 의존성

태스크는 순차적으로 실행한다. 각 태스크는 commit으로 끝난다. commit 단계를 건너뛰지 않는다 — 롤백과 리뷰가 쉬워진다.

---

### 태스크 1: Node 버전과 패키지 매니저 고정

**파일:**
- 생성: `.nvmrc`
- 생성: `.npmrc`

- [ ] **단계 1: Node 버전을 22 LTS로 고정한다**

`.nvmrc`를 작성한다:
```
22
```

- [ ] **단계 2: pnpm 엄격 모드를 설정한다**

`.npmrc`를 작성한다:
```
engine-strict=true
save-exact=false
auto-install-peers=true
node-linker=isolated
```

- [ ] **단계 3: Node가 사용 가능한지 확인한다**

실행: `node --version`
예상 결과: `v22.x.x`. 아닐 경우 `nvm use 22`로 전환한다.

실행: `corepack --version`
예상 결과: 버전 번호. `corepack`이 없으면 nvm으로 Node 22를 설치한다.

실행: `corepack enable pnpm && pnpm --version`
예상 결과: `9.x` 이상.

- [ ] **단계 4: Commit**

```bash
git add .nvmrc .npmrc
git commit -m "chore: pin node 22 and pnpm via corepack"
```

---

### 태스크 2: 루트 package.json과 workspace 설정

**파일:**
- 생성: `package.json` (루트)
- 생성: `pnpm-workspace.yaml`

- [ ] **단계 1: pnpm workspace glob을 작성한다**

`pnpm-workspace.yaml`을 작성한다:
```yaml
packages:
  - "apps/*"
  - "games/*"
  - "packages/*"
  - "tooling/*"
```

- [ ] **단계 2: 루트 package.json을 작성한다**

`package.json`을 작성한다:
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

- [ ] **단계 3: 루트 dependency를 설치한다**

실행: `pnpm install`
예상 결과: 오류 없이 `Done`. `pnpm-lock.yaml`과 루트 `node_modules`가 생성된다.

- [ ] **단계 4: turbo 호출 가능 여부를 확인한다**

실행: `pnpm turbo --version`
예상 결과: `2.x.x`.

- [ ] **단계 5: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore: init pnpm workspace with turbo"
```

---

### 태스크 3: 공용 TypeScript 기본 설정

**파일:**
- 생성: `tsconfig.base.json`

- [ ] **단계 1: 기본 설정을 작성한다**

`tsconfig.base.json`을 작성한다:
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

- [ ] **단계 2: Commit**

```bash
git add tsconfig.base.json
git commit -m "chore: add shared tsconfig.base.json"
```

---

### 태스크 4: Turborepo pipeline 설정

**파일:**
- 생성: `turbo.json`

- [ ] **단계 1: turbo.json을 작성한다**

`turbo.json`을 작성한다:
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

- [ ] **단계 2: turbo가 설정을 파싱하는지 확인한다**

실행: `pnpm turbo run typecheck --dry-run=json | head -20`
예상 결과: 태스크 그래프를 나타내는 유효한 JSON. 아직 workspace가 없으므로 tasks 배열이 비어 있어도 괜찮다.

- [ ] **단계 3: Commit**

```bash
git add turbo.json
git commit -m "chore: add turbo pipeline config"
```

---

### 태스크 5: Prettier 설정

**파일:**
- 생성: `.prettierrc.json`
- 생성: `.prettierignore`

- [ ] **단계 1: prettier 설정을 작성한다**

`.prettierrc.json`을 작성한다:
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

- [ ] **단계 2: prettier ignore를 작성한다**

`.prettierignore`를 작성한다:
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

- [ ] **단계 3: Commit**

```bash
git add .prettierrc.json .prettierignore
git commit -m "chore: add prettier config"
```

---

### 태스크 6: @forge/core 패키지 스켈레톤 생성 (로직 없음)

**파일:**
- 생성: `packages/2d-core/package.json`
- 생성: `packages/2d-core/tsconfig.json`
- 생성: `packages/2d-core/src/index.ts`
- 생성: `packages/2d-core/README.md`

- [ ] **단계 1: 패키지 manifest를 작성한다**

`packages/2d-core/package.json`을 작성한다:
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
    "lint": "eslint src tests"
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

- [ ] **단계 2: tsconfig를 작성한다**

`packages/2d-core/tsconfig.json`을 작성한다:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "noEmit": true
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

`rootDir`는 의도적으로 생략한다: `noEmit: true` 상태에서는 출력 레이아웃에 영향을 주지 않으며, `./src`로 설정하면 `include: tests/**/*`와 충돌한다 (TS6059).

- [ ] **단계 3: README를 작성한다**

`packages/2d-core/README.md`를 작성한다:
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

- [ ] **단계 4: index barrel을 작성한다**

`packages/2d-core/src/index.ts`를 작성한다:
```ts
export { GameManifest, parseGameManifest } from './manifest';
export type { GameManifestInput, GameManifestValue } from './manifest';
```

- [ ] **단계 5: 패키지 dependency를 설치한다**

실행: `pnpm install`
예상 결과: `@forge/core`가 workspace에 링크되고, zod가 다운로드된다.

- [ ] **단계 6: Commit 보류 (manifest 파일은 태스크 7에서 추가됨)**

지금은 commit하지 않는다. 태스크 7에서 `index.ts`가 import하는 `manifest.ts` 파일을 추가하므로, 지금 commit하면 빌드가 깨진 상태가 된다. 태스크 7로 바로 진행한다.

---

### 태스크 7: GameManifest schema (TDD)

**파일:**
- 생성: `packages/2d-core/src/manifest.ts`
- 생성: `packages/2d-core/tests/manifest.test.ts`
- 생성: `packages/2d-core/vitest.config.ts`

- [ ] **단계 1: vitest config를 작성한다**

`packages/2d-core/vitest.config.ts`를 작성한다:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **단계 2: 실패하는 테스트를 작성한다**

`packages/2d-core/tests/manifest.test.ts`를 작성한다:
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

- [ ] **단계 3: 테스트를 실행하여 실패를 확인한다**

실행: `pnpm --filter @forge/core test`
예상 결과: "Cannot find module '../src/manifest'" 또는 동등한 오류로 FAIL.

- [ ] **단계 4: manifest schema를 작성한다**

`packages/2d-core/src/manifest.ts`를 작성한다:
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

- [ ] **단계 5: 테스트를 실행하여 통과를 확인한다**

실행: `pnpm --filter @forge/core test`
예상 결과: 4개 통과.

- [ ] **단계 6: 패키지를 typecheck한다**

실행: `pnpm --filter @forge/core typecheck`
예상 결과: exit 0.

- [ ] **단계 7: Commit**

```bash
git add packages/2d-core pnpm-lock.yaml
git commit -m "feat(core): add GameManifest zod schema"
```

---

### 태스크 8: @forge/dev-shell Next.js 앱 생성

**파일:**
- 생성: `apps/dev-shell/package.json`
- 생성: `apps/dev-shell/tsconfig.json`
- 생성: `apps/dev-shell/next.config.ts`
- 생성: `apps/dev-shell/next-env.d.ts`
- 생성: `apps/dev-shell/postcss.config.mjs`
- 생성: `apps/dev-shell/tailwind.config.ts`
- 생성: `apps/dev-shell/src/app/layout.tsx`
- 생성: `apps/dev-shell/src/app/globals.css`

- [ ] **단계 1: 패키지 manifest를 작성한다**

`apps/dev-shell/package.json`을 작성한다:
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
    "lint": "eslint src tests",
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

- [ ] **단계 2: tsconfig를 작성한다**

`apps/dev-shell/tsconfig.json`을 작성한다:
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

- [ ] **단계 3: next config를 작성한다**

`apps/dev-shell/next.config.ts`를 작성한다:
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

- [ ] **단계 4: Next 타입 shim을 작성한다**

`apps/dev-shell/next-env.d.ts`를 작성한다:
```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **단계 5: PostCSS 설정을 작성한다**

`apps/dev-shell/postcss.config.mjs`를 작성한다:
```js
export default {
  plugins: { '@tailwindcss/postcss': {} },
};
```

- [ ] **단계 6: Tailwind 설정을 작성한다**

`apps/dev-shell/tailwind.config.ts`를 작성한다:
```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
};

export default config;
```

- [ ] **단계 7: 루트 레이아웃을 작성한다**

`apps/dev-shell/src/app/layout.tsx`를 작성한다:
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

- [ ] **단계 8: globals CSS를 작성한다**

`apps/dev-shell/src/app/globals.css`를 작성한다:
```css
@import 'tailwindcss';

html,
body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
}
```

- [ ] **단계 9: dependency를 설치한다**

실행: `pnpm install`
예상 결과: `Done`. `@forge/core`가 `workspace:*`를 통해 링크된다.

- [ ] **단계 10: 아직 commit하지 않는다 — 태스크 9에서 페이지를 추가함**

앱에 아직 페이지가 없다. Next가 빌드에 실패한다. 태스크 9로 진행한다.

---

### 태스크 9: 포털 selector 페이지와 game loader 라우트 (아직 게임 없음)

**파일:**
- 생성: `apps/dev-shell/src/lib/registry.ts`
- 생성: `apps/dev-shell/src/app/page.tsx`
- 생성: `apps/dev-shell/src/app/games/[slug]/page.tsx`

- [ ] **단계 1: 빈 registry를 작성한다**

`apps/dev-shell/src/lib/registry.ts`를 작성한다:
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

Phase 1에서 `games/inflation-rpg`가 등록될 때 manifest를 이 배열에 push한다. Phase 0에서는 비어 있는 상태를 유지한다.

- [ ] **단계 2: selector 페이지를 작성한다**

`apps/dev-shell/src/app/page.tsx`를 작성한다:
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

- [ ] **단계 3: 동적 game 라우트를 작성한다**

`apps/dev-shell/src/app/games/[slug]/page.tsx`를 작성한다:
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

- [ ] **단계 4: dev 서버를 시작한다**

실행: `pnpm --filter @forge/dev-shell dev` (별도 터미널 또는 백그라운드에서)
예상 결과: `Ready` 메시지. `http://localhost:3000`에서 "아직 등록된 게임이 없습니다" 메시지가 있는 홈 페이지가 표시된다.

브라우저에서 URL을 열어 수동으로 확인한다.

- [ ] **단계 5: dev 서버를 종료한다**

Ctrl+C 또는 백그라운드 작업을 종료한다.

- [ ] **단계 6: Typecheck를 실행한다**

실행: `pnpm --filter @forge/dev-shell typecheck`
예상 결과: exit 0.

- [ ] **단계 7: Commit**

```bash
git add apps/dev-shell pnpm-lock.yaml
git commit -m "feat(dev-shell): add portal selector and game route"
```

---

### 태스크 10: 포털 smoke E2E (Playwright)

**파일:**
- 생성: `apps/dev-shell/playwright.config.ts`
- 생성: `apps/dev-shell/tests/e2e/portal.spec.ts`

- [ ] **단계 1: 실패하는 smoke test를 작성한다**

`apps/dev-shell/tests/e2e/portal.spec.ts`를 작성한다:
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

- [ ] **단계 2: Playwright config를 작성한다**

`apps/dev-shell/playwright.config.ts`를 작성한다:
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

- [ ] **단계 3: Playwright 브라우저를 설치한다**

실행: `pnpm --filter @forge/dev-shell exec playwright install chromium`
예상 결과: chromium이 다운로드된다.

- [ ] **단계 4: 테스트를 실행하여 통과를 확인한다**

실행: `pnpm --filter @forge/dev-shell e2e`
예상 결과: 2개 통과. (Playwright가 `webServer`를 통해 자체 dev 서버를 시작한다.)

- [ ] **단계 5: Commit**

```bash
git add apps/dev-shell
git commit -m "test(dev-shell): add portal smoke e2e"
```

---

### 태스크 11: boundary 강제가 포함된 ESLint flat config

**파일:**
- 생성: `eslint.config.mjs`

- [ ] **단계 1: eslint-plugin-boundaries를 설치한다**

실행:
```bash
pnpm add -Dw eslint-plugin-boundaries @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

예상 결과: 루트 `package.json`에 dependency가 추가된다.

- [ ] **단계 2: `eslint-plugin-boundaries@^5`를 설치한다**

실행: `pnpm add -Dw eslint-plugin-boundaries@^5.0.0 eslint-plugin-import eslint-import-resolver-typescript`

이유: boundaries v6에서 `element-types`가 `dependencies`로 이름이 바뀌었으며, 기존 이름은 아무 동작도 하지 않는 deprecated silent alias로 남아 있다. v5는 아래 설정이 실제로 규칙을 강제하는 마지막 버전이다.

- [ ] **단계 3: flat config를 작성한다**

`eslint.config.mjs`를 작성한다:
```js
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import boundaries from 'eslint-plugin-boundaries';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

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
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
        node: true,
      },
      'boundaries/root-path': repoRoot,
      'boundaries/include': [
        'packages/**/*.{ts,tsx}',
        'apps/**/*.{ts,tsx}',
        'games/**/*.{ts,tsx}',
      ],
      'boundaries/elements': [
        { type: 'core', pattern: 'packages/2d-core/**', mode: 'full' },
        { type: 'genre', pattern: 'packages/2d-*-core/**', mode: 'full' },
        { type: 'plugin', pattern: 'packages/economy-*/**', mode: 'full' },
        { type: 'content', pattern: 'packages/content-*/**', mode: 'full' },
        { type: 'game', pattern: 'games/*/**', mode: 'full' },
        { type: 'app', pattern: 'apps/*/**', mode: 'full' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'core', allow: ['core'] },
            { from: 'genre', allow: ['core', 'genre'] },
            { from: 'plugin', allow: ['core', 'plugin'] },
            { from: 'content', allow: ['core', 'genre', 'content'] },
            { from: 'game', allow: ['core', 'genre', 'plugin', 'content', 'game'] },
            { from: 'app', allow: ['core', 'genre', 'plugin', 'content', 'game', 'app'] },
          ],
        },
      ],
    },
  },
];
```

주의할 세 가지 사항:
- `boundaries/root-path`: 이 설정이 없으면 패턴이 lint 실행 시점의 CWD를 기준으로 매칭된다. turbo가 패키지 내부에서 `eslint src tests`를 실행할 때 `packages/2d-core/**` 같은 패턴이 더 이상 매칭되지 않아 모든 파일이 "no element" 상태로 통과된다.
- `mode: 'full'`: 기본 folder 모드는 조상 디렉터리 매칭을 허용하므로 `apps/dev-shell/src/app/games/[slug]/page.tsx`가 `games/[slug]`처럼 보여 `game`으로 분류될 수 있다. Full 모드는 패턴을 루트 기준 상대 파일 경로에 고정한다.
- 모든 element에 자기 자신 허용 (`allow: ['core']` 등): `default: 'disallow'`를 사용하면 같은 계층의 import도 허용 목록에 없으면 차단된다. `packages/2d-core/tests/`의 테스트 파일이 `../src/manifest`를 import하는 것은 `core → core` import이므로 허용되어야 한다.

- [ ] **단계 3: 루트에 lint script hook을 추가한다**

루트 변경은 필요 없다 — ESLint 9 flat config는 lint 대상 파일에서 위 방향으로 탐색되므로 각 workspace의 `lint` 스크립트가 `eslint`를 실행할 때 레포 레벨 flat config가 자동으로 사용된다.

- [ ] **단계 4: workspace 전체에서 lint를 실행한다**

실행: `pnpm turbo run lint`
예상 결과: `lint` 스크립트가 없는 workspace는 건너뜀; `@forge/dev-shell`과 `@forge/core` 모두 통과.

현재 소스에서 lint 오류가 발생하면 commit 전에 수정한다. 규칙을 비활성화하지 않는다.

- [ ] **단계 5: Commit**

```bash
git add eslint.config.mjs package.json pnpm-lock.yaml
git commit -m "chore: add eslint flat config with layer boundaries"
```

---

### 태스크 12: 순환 의존성 검사

**파일:**
- 수정: `package.json` (태스크 2에서 이미 `circular` 스크립트 포함)

- [ ] **단계 1: 순환 검사를 실행한다**

실행: `pnpm circular`
예상 결과: `No circular dependency found!` (madge 기본 성공 메시지).

순환 의존성이 발생하면 진행 전에 수정한다 — 순환 의존성이 있는 상태로 commit하지 않는다.

- [ ] **단계 2: Commit 없음 (새 파일 없음 — 체크포인트만)**

이 태스크는 commit을 건너뛴다; 명령이 이미 연결되어 있고 통과 상태다.

---

### 태스크 13: CI 워크플로우

**파일:**
- 생성: `.github/workflows/ci.yml`

- [ ] **단계 1: CI 워크플로우를 작성한다**

`.github/workflows/ci.yml`을 작성한다:
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

- [ ] **단계 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "chore: add CI with typecheck, lint, test, e2e, circular"
```

---

### 태스크 14: 클린 체크아웃으로 전체 검증

**파일:** (없음 — 검증만)

- [ ] **단계 1: 클린 설치**

실행:
```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install --frozen-lockfile
```
예상 결과: 오류 없음. `pnpm-lock.yaml`이 변경되지 않음.

- [ ] **단계 2: 전체 pipeline을 실행한다**

실행: `pnpm turbo run typecheck lint test`
예상 결과: 모든 workspace 통과.

- [ ] **단계 3: 순환 검사를 실행한다**

실행: `pnpm circular`
예상 결과: `No circular dependency found!`.

- [ ] **단계 4: E2E를 실행한다**

실행: `pnpm --filter @forge/dev-shell e2e`
예상 결과: 2개 통과.

- [ ] **단계 5: 브라우저 수동 검증**

실행: `pnpm dev` (백그라운드).

로컬 브라우저에서 http://localhost:3000을 연다.
확인:
- 헤딩이 "2d-game-forge"로 표시된다.
- 빈 상태 메시지 "아직 등록된 게임이 없습니다"가 보인다.
- http://localhost:3000/games/does-not-exist에서 Next.js 404 페이지가 반환된다.

dev 서버를 종료한다.

- [ ] **단계 6: 체크포인트를 태그한다**

```bash
git tag phase-0-complete
git log --oneline | head -20
```

태그를 자동으로 push하지 않는다 — push 전에 사용자에게 확인한다.

---

## 셀프 리뷰 노트

**Spec 커버리지:**
- §1 레포 구조 → 태스크 2, 6, 8에서 명세된 레이아웃을 생성한다.
- §1 패키지 네임스페이스 → `@forge/core` (태스크 6)와 `@forge/dev-shell` (태스크 8)이 spec에 명시된 정확한 이름으로 생성된다.
- §1 의존성 방향 규칙 → 태스크 11에서 eslint-plugin-boundaries를 통해 `core → genre → plugin → content → game → app`을 강제하고, 태스크 12에서 순환 탐지용 madge를 추가한다.
- §1 Day 1 상태 → 태스크 6에서 `@forge/core`를 manifest schema만 보유한 거의 빈 shell로 생성한다. `2d-rpg-core`, `economy-inflation`, `content-korean-folklore`는 **의도적으로 생성하지 않는다** (spec의 "존재하지 않음"에 부합).
- §1 공용 설정 → 태스크 3 (tsconfig.base.json), 태스크 4 (turbo pipeline).
- §2 개발 모드 포털 → 태스크 9에서 `/` selector와 `/games/[slug]` 라우트를 생성한다. Phase 0에서 registry는 비어 있으며, Phase 1에서 채워진다.
- §2 동일 `StartGame` 엔트리 원칙 → 아직 구현되지 않음 (게임이 존재하지 않음). `registry.ts`의 `RegisteredGame.load` 필드가 Phase 1에서 `StartGame(config)`를 연결할 슬롯이다.
- §2 매니페스트 기반 부팅 → 태스크 7에서 `GameManifest` schema를 정의하고, Phase 1에서 실제 엔트리 이식 시 `StartGameConfig`를 추가한다.
- §2 CI 파이프라인 → 태스크 13에서 PR 시 typecheck + lint + test + e2e + circular를 실행한다.
- §4 테스트 계층 → 태스크 7 패턴으로 `packages/*/tests/`를 정립하고, 태스크 10으로 `apps/dev-shell/tests/e2e/`를 정립한다. Phase 1에서 `games/<name>/tests/`가 추가된다.
- §4 의존성 방향 lint → 태스크 11.
- §4 순환 참조 탐지 → 태스크 2 & 12 (madge 스크립트).
- §4 번들 크기 smoke → **Phase 1로 연기**. 실제 게임이 번들을 생성할 때까지 Phase 0에서는 해당 없음.
- §3 Phase 0 산출물 요구 → "`pnpm dev` 로 포털이 뜸, 아직 게임 없음"은 태스크 14 단계 5에서 충족된다.

**플레이스홀더 검사:** TBD/TODO 없음. 모든 코드 블록 완성. "태스크 N과 유사" 형태의 단축 표현 없음.

**타입 일관성:** `parseGameManifest` (태스크 7)는 `apps/dev-shell/src/lib/registry.ts` (태스크 9)에서 함수 자체가 아닌 `GameManifestValue` 타입으로 import된다. 일치함. `RegisteredGame.manifest`의 타입은 `GameManifestValue`로, 태스크 7에서 export하는 것과 동일하다.

**의도적 연기 항목 (계획에 문서화됨):**
- 번들 크기 smoke → Phase 1.
- 실제 `StartGame(config)` 엔트리 연결 → Phase 1.
- `@forge/core` 런타임 유틸리티 (EventBus, SaveManager 등) → Phase 2의 rule of three에 따라 이후 승격.

---

## 실행 핸드오프

계획이 완성되어 `docs/superpowers/plans/2026-04-17-phase0-bootstrap.md`에 저장된다. 두 가지 실행 방식이 있다:

1. **Subagent 방식 (권장)** — 태스크별로 새 subagent를 dispatch하고, 태스크 사이에 리뷰를 진행한다. 반복이 빠르다. 각 태스크가 작고 독립적인 14개 태스크 scaffold 계획에 최적이다.
2. **인라인 실행** — 현재 세션에서 executing-plans를 사용해 체크포인트와 함께 태스크를 일괄 실행한다.

어떤 방식으로 진행할까?
