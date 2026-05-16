# 새 게임 추가 가이드

forge 의 핵심 사용 사례는 **새 게임을 워크스페이스 하나로 추가하는 것**이다.
이 문서는 그 절차를 단계별로 정리한다. 새 콘텐츠 팩 추가, 새 장르 코어 추가
같은 다른 확장 절차도 마지막에 다룬다.

배경 지식이 필요하면 [ARCHITECTURE.md](ARCHITECTURE.md) 부터 읽는다.

## 0. 사전 결정

새 게임을 시작하기 전에 답을 가진다.

- **slug**: kebab-case, 영문/숫자만. 예: `inflation-rpg`, `dungeon-idle`,
  `space-puzzle`. 패키지명은 `@forge/game-<slug>`.
- **title**: 사용자에게 보일 한국어 이름. 매니페스트와 포털 UI 에 표시된다.
- **장르**: 기존 장르 코어가 있으면 의존하고, 없으면 게임 안에 local 로 둔다.
  같은 장르 두 게임이 모이는 시점에 새 `@forge/<genre>-core` 를 만든다
  ("3의 규칙").
- **테마/콘텐츠**: 기존 콘텐츠 팩(`@forge/content-*`)을 재사용할지, 게임 안에
  넣을지 결정. 같은 테마가 두 게임에 쓰이는 시점에 콘텐츠 팩으로 분리.
- **iOS / Android 앱 ID**: 출시 예정이라면 `appId` (역도메인 표기) 를 미리 정한다.

## 1. 워크스페이스 골격

```bash
mkdir -p games/<slug>/src games/<slug>/public/assets games/<slug>/tests
```

`games/<slug>/package.json`:

```json
{
  "name": "@forge/game-<slug>",
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
    "@forge/core": "workspace:*",
    "@capacitor/android": "^8.0.0",
    "@capacitor/core": "^8.0.0",
    "@capacitor/ios": "^8.0.2",
    "next": "16.1.1",
    "phaser": "^3.90.0",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@capacitor/cli": "^8.0.0",
    "@playwright/test": "^1.57.0",
    "@types/node": "^20.0.0",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5.6.0",
    "vitest": "^4.0.16"
  }
}
```

`games/<slug>/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "allowJs": true,
    "noEmit": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": [
    "next-env.d.ts",
    "src/**/*.ts",
    "src/**/*.tsx",
    "tests/**/*.ts",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules", ".next", "out", "ios", "android"]
}
```

`games/<slug>/next.config.ts`:

```ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default config;
```

`games/<slug>/capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.<slug>',     // ← 본인 도메인으로 교체
  appName: '<게임 한국어 이름>',
  webDir: 'out',
};

export default config;
```

설치:

```bash
pnpm install
```

## 2. `StartGame(config)` 작성

게임의 단일 부팅 엔트리. 포털과 릴리스 양쪽에서 호출된다.

`games/<slug>/src/startGame.ts`:

```ts
import Phaser from 'phaser';

export interface StartGameConfig {
  parent: string;
  assetsBasePath: string;
  exposeTestHooks: boolean;
}

export function StartGame(config: StartGameConfig): Phaser.Game {
  const phaserConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    parent: config.parent,
    scene: [/* Boot, Preloader, MainScene, ... */],
  };

  const game = new Phaser.Game(phaserConfig);
  game.registry.set('assetsBasePath', config.assetsBasePath);

  if (config.exposeTestHooks) {
    // 필요한 만큼만 window 에 노출. 기본은 빈 함수.
  }

  return game;
}
```

원칙:

- `window.location` 같은 호스트 환경을 가정하지 않는다.
- 모든 에셋 경로는 `config.assetsBasePath` 에서 파생된다.
- 저장 키는 게임마다 고유해야 한다.
- E2E hook 노출은 `config.exposeTestHooks` 에 의해서만 활성화된다.

## 3. Preloader 패턴

Phaser scene 안에서 에셋을 로드할 때:

```ts
preload() {
  const base = this.game.registry.get('assetsBasePath');
  if (typeof base === 'string' && base.length > 0) {
    this.load.setBaseURL(base);
  }

  this.load.image('background', 'images/background.png');
  this.load.audio('bgm', 'sounds/bgm.ogg');
  // ... 모든 후속 load.* 호출은 baseURL 를 prefix 로 사용한다.
}
```

## 4. 매니페스트 + 배럴

`games/<slug>/src/index.ts`:

```ts
import { parseGameManifest } from '@forge/core/manifest';
import type { GameManifestValue } from '@forge/core/manifest';

export const gameManifest: GameManifestValue = parseGameManifest({
  slug: '<slug>',
  title: '<게임 한국어 이름>',
  assetsBasePath: '/games/<slug>/assets',
});

export { StartGame } from './startGame';
export type { StartGameConfig } from './startGame';
```

`assetsBasePath` 는 **포털 모드 기준 URL** 이다. 릴리스 모드에서는 `'/assets'`
같은 다른 값을 React wrapper 가 넘긴다.

## 5. 릴리스 모드 React wrapper

`games/<slug>/src/components/PhaserGame.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { StartGame } from '../startGame';

export interface PhaserGameProps {
  containerId?: string;
  assetsBasePath?: string;
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
    gameRef.current = StartGame({ parent: containerId, assetsBasePath, exposeTestHooks });
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [containerId, assetsBasePath, exposeTestHooks]);

  return <div id={containerId} />;
}
```

`games/<slug>/src/app/page.tsx` 가 이 컴포넌트를 마운트한다 (릴리스 빌드의
정적 페이지).

## 6. 포털 등록

dev-shell 의 두 registry 파일에 추가한다.

`apps/dev-shell/src/lib/registry.server.ts` (server-safe, 매니페스트만):

```ts
export const manifests: GameManifestValue[] = [
  // ... 기존 매니페스트 ...
  {
    slug: '<slug>',
    title: '<게임 한국어 이름>',
    assetsBasePath: '/games/<slug>/assets',
  },
];
```

`apps/dev-shell/src/lib/registry.ts` (client, 동적 import 포함):

```ts
export const registeredGames: RegisteredGame[] = [
  // ... 기존 게임 ...
  {
    manifest: { slug: '<slug>', title: '<게임 한국어 이름>', assetsBasePath: '/games/<slug>/assets' },
    load: () => import('@forge/game-<slug>'),
  },
];
```

`apps/dev-shell/next.config.ts` 의 `transpilePackages` 에 추가:

```ts
transpilePackages: ['@forge/core', '@forge/game-inflation-rpg', '@forge/game-<slug>'],
```

dev-shell 이 게임 의존성도 알도록:

```bash
pnpm --filter @forge/dev-shell add @forge/game-<slug>@workspace:*
```

## 7. 에셋 심링크

dev-shell 이 게임의 `public/assets/` 를 자기 origin 에서 서빙하도록 symlink:

```bash
mkdir -p apps/dev-shell/public/games/<slug>
ln -sf "../../../../games/<slug>/public/assets" apps/dev-shell/public/games/<slug>/assets
git add apps/dev-shell/public/games/<slug>/assets
```

git 은 symlink 를 mode 120000 으로 추적한다. macOS / Linux 에서 작동.

## 8. 포털에서 부팅 확인

```bash
pnpm dev
```

브라우저에서 `http://localhost:3000` → 새 게임 카드가 보이는지 확인 →
클릭하여 부팅. Network 탭에서 `/games/<slug>/assets/...` 가 200 으로 떨어지는지
확인.

## 9. 테스트

vitest config (`games/<slug>/vitest.config.ts`):

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
```

Playwright config (`games/<slug>/playwright.config.ts`):

```ts
import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV_SHELL_CWD = path.resolve(__dirname, '../../apps/dev-shell');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm --filter @forge/dev-shell dev',
    url: 'http://localhost:3000',
    cwd: DEV_SHELL_CWD,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

E2E 테스트는 `await page.goto('/games/<slug>')` 로 시작한다.

## 10. 빌드 검증

```bash
# 모든 워크스페이스 typecheck/lint/test
pnpm turbo run typecheck lint test --filter=@forge/game-<slug>...

# 정적 export
pnpm --filter @forge/game-<slug> build

# Capacitor sync (iOS/Android 플랫폼이 추가된 경우)
pnpm --filter @forge/game-<slug> exec cap sync
```

## 11. 자주 하는 실수

- **`assetsBasePath` 와 Preloader 의 `setPath` 가 중복** — `setBaseURL('/x/assets')`
  뒤에 `setPath('assets')` 를 호출하면 `'/x/assets/assets/...'` 가 된다.
  Preloader 는 `if (base) setBaseURL else setPath('assets')` 형태로 분기한다.
- **dev-shell 의 server component 가 `registry.ts` import** — Phaser 가
  server bundle 로 끌려 들어가 SSR 단계에서 `window` 부재로 실패한다.
  server component 는 반드시 `registry.server.ts` 만 사용한다.
- **`exposeTestHooks: true` 를 릴리스 모드에서 켬** — 프로덕션 빌드에
  `window.gameState` 같은 globals 가 노출된다. dev-shell 은
  `process.env.NODE_ENV !== 'production'` 으로 게이트하고, React wrapper 의
  기본값은 `false` 다.
- **`@/game/*` alias 를 새 게임에서 사용** — 게임 내부에서 `@/game/...` 를
  쓰면 dev-shell 의 tsconfig 와 Turbopack alias 에 cross-workspace 경로
  추가가 강제된다. **신규 게임은 내부 import 에 상대 경로를 사용한다**
  (inflation-rpg 만 grandfathered exception).
- **upstream 호환 키를 그대로 둠** — 두 번째 게임이 같은 SaveManager 를
  쓰게 되는 순간 충돌한다. SaveManager 를 `@forge/core` 로 승격할 때
  namespace 를 도입한다.
- **계층을 넘어선 import** — 예: 게임이 다른 게임 파일을 import. ESLint
  boundaries 룰이 차단하지만, 우회하지 말고 정상 화살표 (`game → core`)
  로 되돌린다.

## 12. 게임 외 확장

### 새 콘텐츠 팩 추가

같은 테마 (예: 로마 시대) 가 두 게임에서 쓰이게 되면 `packages/content-roma/`
워크스페이스를 만들어 분리한다.

- `package.json`: `name: '@forge/content-roma'`, dependencies 는 거의 없음
  (필요한 타입은 `@forge/core` 에서 가져옴).
- 안에 `images/`, `sounds/`, `data/`, `i18n/` 같은 디렉터리.
- 게임은 이 패키지를 dependency 에 추가하고 import 한다.

콘텐츠 팩은 코드 의존성을 최소화한다 — 데이터·에셋 위주.

### 새 장르 코어 추가

같은 장르 (예: 퍼즐) 가 두 게임에 모이면 `packages/2d-puzzle-core/` 를 만든다.

- `package.json`: `name: '@forge/puzzle-core'`, dependency 는 `@forge/core` 만.
- 안에 퍼즐 장르 공통 시스템 (그리드 입력, 매치 검사, 점수 등).
- 게임이 이 패키지를 dependency 에 추가하고 import 한다.

장르 코어는 게임 디테일을 모르고, 코어보다 위 계층이다.

### 새 플러그인 추가

장르 독립적이지만 모든 게임이 쓰지 않는 기능 (예: `economy-inflation`,
`achievements`) 은 `packages/<plugin-name>/` 워크스페이스로 만든다.

- `package.json`: `name: '@forge/<plugin-name>'`, dependency 는 `@forge/core`
  만 (장르 코어를 모른다).
- 게임이나 장르 코어가 이 플러그인을 dependency 에 추가하고 통합한다.

## 13. 더 읽을 것

- [ARCHITECTURE.md](ARCHITECTURE.md) — 4계층 케이크, 의존성 단방향 규칙,
  "3의 규칙".
- [packages/2d-core/README.md](../packages/2d-core/README.md) — 코어 패키지
  현재 공개 API.
- [games/inflation-rpg/README.md](../games/inflation-rpg/README.md) — 첫 게임의
  실제 적용 예시.

## 14. Canonical forge-app 디렉토리 구조

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
│   │   ├── globals.css       # @import "../styles/<theme>.css" (CSS @import 은 @/alias 못 씀)
│   │   └── page.tsx          # <Game /> 마운트 지점
│   ├── components/
│   │   └── ui/               # registry 에서 복사된 forge-* 컴포넌트 (수동 복사 — CLI 미지원)
│   ├── lib/
│   │   └── utils.ts          # cn() helper (registry/src/lib/utils.ts 에서 복사)
│   ├── styles/
│   │   └── <theme>.css       # registry/src/themes/<theme>.css 에서 복사
│   ├── startGame.ts          # StartGameFn 구현 (ForgeGameInstance 반환)
│   └── index.ts              # 패키지 엔트리
└── e2e/
    └── smoke.spec.ts         # 최소 smoke test (메인 메뉴 렌더 + 클릭)
```

### 14.1. 필수 스크립트 (package.json)

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

### 14.2. 워크스페이스 deps 최소 세트

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

### 14.3. 초기 registry 복사 시퀀스

**현재 방식 (수동 복사)** — shadcn CLI 의 `file:` 경로 지원 미비로 수동 복사가 표준.

```bash
cd games/<new-game>

# 1. lib helper + theme CSS
mkdir -p src/lib src/styles src/components/ui
cp ../../packages/registry/src/lib/utils.ts src/lib/utils.ts
cp ../../packages/registry/src/themes/modern-dark-gold.css src/styles/modern-dark-gold.css

# 2. UI 컴포넌트 (필요한 것만)
cp ../../packages/registry/src/ui/forge-screen.tsx src/components/ui/forge-screen.tsx
cp ../../packages/registry/src/ui/forge-button.tsx src/components/ui/forge-button.tsx
# ... 필요한 추가 컴포넌트

# 3. clsx 의존성
pnpm add clsx@^2.1.1
```

**참고**: shadcn CLI 의 `pnpm dlx shadcn@latest add file:...` 는 2026-04 현재 `file:` URL scheme 을 지원하지 않음. 공식 지원 추가 혹은 자체 CLI (Layer C create-game) 구현 시 변경될 예정.

### 14.4. dev-shell 등록

[`apps/dev-shell/src/lib/registry.ts`](../apps/dev-shell/src/lib/registry.ts) 와
[`registry.server.ts`](../apps/dev-shell/src/lib/registry.server.ts) 에 새 게임 엔트리를 추가한다.
server 쪽은 매니페스트만, client 쪽은 dynamic import 콜백을 등록.

dev-shell 의 `tsconfig.json` 과 `next.config.ts` 에 새 게임의 `@/components/ui/*`, `@/lib/*` alias 도 cross-workspace 로 등록해야 dev-shell 에서 게임 화면이 렌더된다.

### 14.5. ESLint boundaries element 자동 인식

새 게임은 `eslint.config.mjs` 의 `games/*/**` 패턴에 의해 자동으로 `game` element 로 분류된다.
별도 설정 불필요.

## §15 Monetization (Phase 5+)

inflation-rpg uses three monetization channels:

- **AdMob** (광고): `@capacitor-community/admob` — Rewarded + Banner.
  Test IDs in `games/inflation-rpg/src/config/monetization.config.ts` are safe
  to commit. Real IDs swap at release time via env var. (TODO: wire env-var
  injection — currently config is hardcoded; replace before submission.)

- **원스토어 IAP** (한국 마켓): **local Capacitor plugin** at
  `games/inflation-rpg/native/onestore-iap/` (3-rule: never promoted to
  `packages/*` until a 2nd game uses 원스토어). Kotlin currently ships as a
  **compile-only stub** — real V21 PurchaseClient wire deferred to Phase 5a-1
  (`docs/superpowers/specs/2026-05-16-phase-5a-1-onestore-native-wire-design.md`).

- **개인정보처리방침**: GitHub Pages at `docs/privacy-policy/` (host:
  `https://kwanghan-bae.github.io/2d-game-forge/privacy-policy/ko/`). Edit
  `ko/index.html` and the bundled fallback
  `games/inflation-rpg/public/privacy-policy.html` in lockstep.

For new games using monetization, **copy the plugin scaffolding pattern locally
to the game's `native/` dir** — do NOT promote `onestore-iap/` to a shared
package. The 3-rule applies.

For Google Play / App Store cuts (Phase 5b/5c), see future specs at
`docs/superpowers/specs/2026-*-phase-5b-*.md` / `phase-5c-*.md`.
