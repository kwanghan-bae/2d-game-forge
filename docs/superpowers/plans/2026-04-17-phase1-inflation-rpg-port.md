# Phase 1 — inflation-rpg 큐레이션 이식 구현 plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**목표:** korea-inflation-rpg 를 `games/inflation-rpg/` 로 이식해 forge 안의
첫 번째 실제 게임으로 만든다. 부팅은 dev-shell 포털을 통해 config 기반
`StartGame()` 엔트리로 수행된다. 메인 플레이 루프, 코어 매니저, 코어 데이터,
수학·세이브·밸런스 불변식 테스트만 남긴다. 포털 경유 end-to-end 플레이와
standalone 웹 빌드 + Capacitor sync 가 모두 성공하는지 검증한다.

**아키텍처:** `games/inflation-rpg/` 는 새 `@forge/*` workspace 가 된다.
Phaser 엔트리는 `StartGame(parent: string)` 에서 `StartGame(config: StartGameConfig)`
로 refactor 되어 dev-shell 포털과 향후 standalone Next 셸이 하나의 엔트리를
공유한다. 에셋 로딩은 `this.load.setBaseURL(config.assetsBasePath)` 을 사용해
같은 게임 코드가 `/games/inflation-rpg/assets/...` (포털) 과 `/assets/...`
(standalone) 양쪽에서 동작한다. 아직 어떤 코드도 `@forge/core` 로 승격되지
않는다 — "3의 규칙"이 게임 A 를 기다린다.

**기술 스택:** Phaser 3.90 (기존), React 19 / Next 16 (기존),
@preact/signals-react, bignumber.js, zod, Capacitor 8, Vitest 4, Playwright 1.57.
모두 korea-inflation-rpg 에서 상속.

**Spec:** `docs/superpowers/specs/2026-04-17-2d-game-forge-initial-design.md`
**이전 plan:** `docs/superpowers/plans/2026-04-17-phase0-bootstrap.md` (Phase 0 완료 — 레포 골격 + @forge/core shell + dev-shell 포털).

**Source 레포:** `/Users/joel/Desktop/git/korea-inflation-rpg/` (이 모노레포 바깥; 수정 금지).

---

## 파일 구조

생성될 파일들 (레포 루트 `/Users/joel/Desktop/git/2d-game-forge/` 기준):

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

각 파일은 하나의 명확한 책임을 가진다. `src/game/` 은 기존 게임 코드를 통째로
옮긴 결과다 (삭제분 제외). `src/startGame.ts` 와 `src/index.ts` 는 forge 의
dev-shell 모드를 위한 새 seam 이다.

---

## 태스크 순서와 의존성

태스크는 순차적으로 실행된다. 각 태스크는 커밋으로 끝난다.

---

### 태스크 1: `games/inflation-rpg/` workspace 골격 생성

**파일:**
- 생성: `games/inflation-rpg/package.json`
- 생성: `games/inflation-rpg/tsconfig.json`
- 생성: `games/inflation-rpg/README.md`
- 삭제: `games/.gitkeep` (이제 불필요)

- [ ] **단계 1: package.json 작성**

`games/inflation-rpg/package.json` 작성:
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

- [ ] **단계 2: tsconfig 작성**

`games/inflation-rpg/tsconfig.json` 작성:
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

- [ ] **단계 3: README 작성**

`games/inflation-rpg/README.md` 작성:
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

- [ ] **단계 4: placeholder 제거**

실행:
```bash
rm games/.gitkeep
```

- [ ] **단계 5: 의존성 설치**

실행: `pnpm install`
예상: `@forge/game-inflation-rpg` 가 workspace 그래프에 등장. phaser, capacitor
등이 다운로드된다.

- [ ] **단계 6: 커밋**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add games/inflation-rpg pnpm-lock.yaml
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" rm games/.gitkeep
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "feat(game-inflation-rpg): scaffold workspace"
```

---

### 태스크 2: korea-inflation-rpg 에서 큐레이션된 소스 트리 복사

벌크 복사 — 아직 수정은 없다. DROP 표시된 항목은 복사하지 않는다.

**Upstream 루트:** `/Users/joel/Desktop/git/korea-inflation-rpg/`
**Target 루트:** `/Users/joel/Desktop/git/2d-game-forge/games/inflation-rpg/`

- [ ] **단계 1: src/game 트리 복사**

레포 루트 (`/Users/joel/Desktop/git/2d-game-forge/`) 에서 실행:
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

- [ ] **단계 2: src/app + src/components 복사 (release-mode 전용)**

실행:
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

- [ ] **단계 3: public/assets 트리 복사 (큐레이션은 태스크 8 에서)**

실행:
```bash
UPSTREAM=/Users/joel/Desktop/git/korea-inflation-rpg
TARGET=games/inflation-rpg

mkdir -p "$TARGET/public"
cp -R "$UPSTREAM/public/assets" "$TARGET/public/assets"

# Drop design-only docs that were never shipped.
rm -rf "$TARGET/public/assets/data/raw_concept"
find "$TARGET/public/assets" -name "*.meta" -delete 2>/dev/null || true
```

- [ ] **단계 4: 남길 단일 E2E helper 복사**

실행:
```bash
UPSTREAM=/Users/joel/Desktop/git/korea-inflation-rpg
TARGET=games/inflation-rpg

mkdir -p "$TARGET/tests/e2e/helpers"
cp "$UPSTREAM/tests/e2e/helpers/GameTestHelper.ts" "$TARGET/tests/e2e/helpers/"
cp "$UPSTREAM/tests/e2e/game_flow.spec.ts" "$TARGET/tests/e2e/full-game-flow.spec.ts"
```

파일명 변경 주의: `game_flow.spec.ts` → `full-game-flow.spec.ts` (spec §3 Phase 1
의 "full-game-flow.spec.ts" 명명과 일치).

- [ ] **단계 5: vitest 테스트 파일 복사 (디렉터리 전체 — 큐레이션은 태스크 10 에서)**

실행:
```bash
UPSTREAM=/Users/joel/Desktop/git/korea-inflation-rpg
TARGET=games/inflation-rpg

mkdir -p "$TARGET/tests/game"
cp "$UPSTREAM/tests/game/"*.ts "$TARGET/tests/game/"
```

- [ ] **단계 6: 정상성 확인 — 복사된 파일 인벤토리**

실행:
```bash
find games/inflation-rpg -type f | wc -l
find games/inflation-rpg -name "*.ts" -path "*/src/*" | wc -l
find games/inflation-rpg -name "*.test.ts" | wc -l
find games/inflation-rpg/public/assets -type f | wc -l
```

나중의 참조를 위해 숫자를 커밋 본문에 기록한다. 예상 대략적인 규모:
전체 ~300 파일, src/ 아래 소스 .ts ~80개, 테스트 파일 ~35개, 에셋 파일 ~85개.

- [ ] **단계 7: 커밋**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add games/inflation-rpg
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "feat(game-inflation-rpg): bulk copy source and assets from upstream

This commit copies korea-inflation-rpg code as-is, pre-curation. The next
task prunes and refactors. Source path: /Users/joel/Desktop/git/korea-inflation-rpg/."
```

---

### 태스크 3: `StartGameConfig` + `startGame.ts` wrapper 작성 (TDD)

새로운 공개 엔트리. config 객체를 받고, lifecycle 을 소유하며, dev/test 모드에서만
테스트 hook 을 노출한다.

**파일:**
- 생성: `games/inflation-rpg/src/startGame.ts`
- 생성: `games/inflation-rpg/src/game/testHooks.ts`
- 생성: `games/inflation-rpg/vitest.config.ts`
- 생성: `games/inflation-rpg/tests/game/startGame.test.ts`
- 수정: `games/inflation-rpg/src/game/main.ts`

- [ ] **단계 1: vitest config 작성**

`games/inflation-rpg/vitest.config.ts` 작성:
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

- [ ] **단계 2: StartGameConfig shape 에 대한 실패하는 테스트 작성**

`games/inflation-rpg/tests/game/startGame.test.ts` 작성:
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

- [ ] **단계 3: 테스트가 실패하는지 확인**

실행: `pnpm --filter @forge/game-inflation-rpg test`
예상: `Cannot find module '../../src/startGame'` 로 FAIL.

- [ ] **단계 4: testHooks helper 추가**

`games/inflation-rpg/src/game/testHooks.ts` 작성:
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

- [ ] **단계 5: `src/game/main.ts` 를 순수 Phaser config factory 로 refactor**

`games/inflation-rpg/src/game/main.ts` 를 열어 내용을 다음으로 교체:
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

`main.ts` 에 살던 side effect 와 `window.*` 할당은 제거된다. 이들은
`startGame.ts` (다음 단계) 로 옮겨지고, 이제 opt-in 이 된다.

- [ ] **단계 6: `startGame.ts` 작성**

`games/inflation-rpg/src/startGame.ts` 작성:
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

- [ ] **단계 7: 테스트가 통과하는지 확인**

실행: `pnpm --filter @forge/game-inflation-rpg test tests/game/startGame.test.ts`
예상: 1 passed.

- [ ] **단계 8: Typecheck**

실행: `pnpm --filter @forge/game-inflation-rpg typecheck`
예상: exit 0. 다른 테스트 파일이 구 `main.ts` export 를 참조해서 tsc 가
불평하면 **지금은 무시한다** — 태스크 10 이 scope 밖 테스트들을 삭제할 것이다.
이 typecheck 는 `startGame.ts` 와 그것이 import 하는 production 파일에만
관심이 있다. 만약 *production* 파일이 컴파일 실패하면 계속 진행하기 전에
수정한다.

이 태스크 중 typecheck 를 production 만으로 좁히려면 실행:
`pnpm --filter @forge/game-inflation-rpg exec tsc --noEmit --project tsconfig.json 2>&1 | grep -v '^tests/game/'`
후 검사.

- [ ] **단계 9: 커밋**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add games/inflation-rpg
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "feat(game-inflation-rpg): replace StartGame(parent) with StartGame(config)

main.ts is now a pure Phaser config factory. startGame.ts owns lifecycle,
assetsBasePath wiring, and opt-in window.* test hooks. The game no longer
leaks globals unless the caller opts in via config.exposeTestHooks."
```

---

### 태스크 4: Preloader 가 registry 에서 `assetsBasePath` 를 읽도록 수정

Preloader 는 현재 `'images/title_bg.png'` 를 상대 경로로 로드한다. Phaser 는
이를 페이지 URL 에 대해 해석하는데, dev-shell 모드에서는 페이지가
`/games/inflation-rpg` 이므로 `images/...` 가 그 경로 기준으로 해석되어 깨진다.
게임별 base URL 을 registry 에서 읽으면 같은 코드가 모든 마운트 모드에서
동작한다.

**파일:**
- 수정: `games/inflation-rpg/src/game/scenes/Preloader.ts`

- [ ] **단계 1: 현재 Preloader 읽기**

실행: `cat games/inflation-rpg/src/game/scenes/Preloader.ts | head -40`
기존 `preload()` 메서드 본문 (약 45~50 행부터 image 로드들이 시작) 을 확인한다.

- [ ] **단계 2: `preload()` 최상단에 `setBaseURL` 호출 추가**

`games/inflation-rpg/src/game/scenes/Preloader.ts` 를 편집한다.
`preload()` 메서드를 찾아, **첫 번째 문장**으로 다음을 삽입:
```ts
    const base = this.game.registry.get('assetsBasePath');
    if (typeof base === 'string' && base.length > 0) {
      this.load.setBaseURL(base);
    }
```

이후의 모든 `this.load.image(...)` / `this.load.spritesheet(...)` /
`this.load.audio(...)` 호출은 그대로 둔다 — 이제 설정된 base URL 에 대해
상대적으로 해석된다.

- [ ] **단계 3: typecheck 로 검증**

실행: `pnpm --filter @forge/game-inflation-rpg typecheck 2>&1 | tail -5`
예상: exit 0 (또는 태스크 10 이 치울 tests/ 에러만).

- [ ] **단계 4: 커밋**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add games/inflation-rpg/src/game/scenes/Preloader.ts
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "feat(game-inflation-rpg): Preloader reads assetsBasePath from registry"
```

---

### 태스크 5: `gameManifest` 와 패키지 `src/index.ts` barrel 추가

게임을 dev-shell registry 에 단일 import 로 노출시킨다.

**파일:**
- 생성: `games/inflation-rpg/src/index.ts`

- [ ] **단계 1: `src/index.ts` 작성**

`games/inflation-rpg/src/index.ts` 작성:
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

- [ ] **단계 2: @forge/core 에 대한 workspace 의존성 추가**

레포 루트에서 실행:
```bash
pnpm --filter @forge/game-inflation-rpg add @forge/core@workspace:*
```
예상: 게임의 package.json 에 `dependencies.@forge/core` 가 추가된다.

- [ ] **단계 3: barrel typecheck**

실행: `pnpm --filter @forge/game-inflation-rpg typecheck 2>&1 | grep -v '^tests/game/' | tail -5`
예상: production 파일에 대해 exit 0.

- [ ] **단계 4: 커밋**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add games/inflation-rpg pnpm-lock.yaml
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "feat(game-inflation-rpg): export gameManifest and StartGame from package root"
```

---

### 태스크 6: Release-mode Next 셸 + Capacitor config

복사된 release-mode React wrapper 가 계속 동작하도록 해,
`pnpm --filter @forge/game-inflation-rpg build` 가 standalone 정적 사이트를
생성하도록 한다.

**파일:**
- 생성: `games/inflation-rpg/next.config.ts`
- 생성: `games/inflation-rpg/next-env.d.ts`
- 생성: `games/inflation-rpg/capacitor.config.ts`
- 생성: `games/inflation-rpg/postcss.config.mjs`
- 생성: `games/inflation-rpg/tailwind.config.ts`
- 수정: `games/inflation-rpg/src/components/PhaserGame.tsx`

- [ ] **단계 1: next.config.ts 작성**

`games/inflation-rpg/next.config.ts` 작성:
```ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default config;
```

- [ ] **단계 2: next-env shim 작성**

`games/inflation-rpg/next-env.d.ts` 작성:
```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **단계 3: capacitor.config.ts 작성**

`games/inflation-rpg/capacitor.config.ts` 작성:
```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.korea.inflationrpg',
  appName: 'KoreaInflationRPG',
  webDir: 'out',
};

export default config;
```

- [ ] **단계 4: postcss + tailwind config 작성**

`games/inflation-rpg/postcss.config.mjs` 작성:
```js
export default {
  plugins: { '@tailwindcss/postcss': {} },
};
```

`games/inflation-rpg/tailwind.config.ts` 작성:
```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
};

export default config;
```

- [ ] **단계 5: `src/components/PhaserGame.tsx` 를 새 StartGame 사용하도록 재작성**

`games/inflation-rpg/src/components/PhaserGame.tsx` 를 열어 내용을 다음으로 교체:
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

- [ ] **단계 6: release-mode Next 셸이 빌드되는지 검증**

실행: `pnpm --filter @forge/game-inflation-rpg build 2>&1 | tail -20`
예상: Next build 성공, `out/` 생성. 실패 시 원인은 보통
`src/app/page.tsx` 가 `@/components/PhaserGame` 에서 `PhaserGame` 을 import 하는
경로가 안 맞을 때이니, import 경로 일치를 확인한다.

`out/` 를 간단히 확인: `ls games/inflation-rpg/out/` — `index.html` 과 정적
에셋 디렉터리가 있어야 한다.

- [ ] **단계 7: 커밋**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add games/inflation-rpg
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "feat(game-inflation-rpg): wire release-mode Next shell and capacitor config"
```

---

### 태스크 7: dev-shell 포털에 inflation-rpg 등록

Phase 0 포털에 게임을 연결해, `http://localhost:3000/games/inflation-rpg`
방문 시 Phaser 게임이 부팅되도록 한다.

**파일:**
- 수정: `apps/dev-shell/src/lib/registry.ts`
- 수정: `apps/dev-shell/src/app/games/[slug]/page.tsx`
- 생성: `apps/dev-shell/src/components/GameMount.tsx`
- 수정: `apps/dev-shell/package.json` (게임에 대한 workspace dep 추가)

- [ ] **단계 1: workspace 의존성 추가**

실행:
```bash
pnpm --filter @forge/dev-shell add @forge/game-inflation-rpg@workspace:*
```

- [ ] **단계 2: registry 업데이트**

`apps/dev-shell/src/lib/registry.ts` 를 다음으로 교체:
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

주의: manifest 는 게임에서 재-import 하지 않고 여기에 인라인된다.
registry 의 manifest 는 메타데이터 — dev-shell 빌드 시점에 직렬화 가능하고
정적 분석 가능해야 한다. `load` 콜백이 실제 게임 코드를 dynamic import 하는
부분이다.

- [ ] **단계 3: 클라이언트 측 mount 컴포넌트 생성**

`apps/dev-shell/src/components/GameMount.tsx` 작성:
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

- [ ] **단계 4: `[slug]/page.tsx` 를 mount 렌더하도록 업데이트**

`apps/dev-shell/src/app/games/[slug]/page.tsx` 를 다음으로 교체:
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

- [ ] **단계 5: Next transpile 목록 업데이트**

`apps/dev-shell/next.config.ts` 를 열어 `transpilePackages` 에 게임을 추가.
다음을:
```ts
  transpilePackages: ['@forge/core'],
```
이렇게 교체:
```ts
  transpilePackages: ['@forge/core', '@forge/game-inflation-rpg'],
```

- [ ] **단계 6: 게임의 에셋을 dev-shell origin 에서 서빙**

dev-shell 의 Next 는 `apps/dev-shell/public/` 만 서빙한다. 게임 에셋은
`games/inflation-rpg/public/assets/` 에 있다. `/games/inflation-rpg/assets/...`
요청이 해석되도록 이들을 연결한다.

실행:
```bash
mkdir -p apps/dev-shell/public/games/inflation-rpg
ln -sf "../../../../games/inflation-rpg/public/assets" apps/dev-shell/public/games/inflation-rpg/assets
ls -la apps/dev-shell/public/games/inflation-rpg/
```
예상: `assets -> ../../../../games/inflation-rpg/public/assets` 가 symlink 로
표시된다.

symlink 가 올바른 디렉터리를 가리키는지 검증:
```bash
ls apps/dev-shell/public/games/inflation-rpg/assets/images/ | head -5
```
예상: `chosun_battle_bg.png` 등.

- [ ] **단계 7: 포털이 게임을 부팅하는지 수동 검증**

dev 서버를 별도 터미널 또는 background 에서 실행: `pnpm dev`.

브라우저에서 `http://localhost:3000/games/inflation-rpg` 를 열고 확인:
- 페이지 헤더에 "조선 인플레이션 RPG" 표시.
- Phaser 캔버스가 렌더된다 (Preloader 화면 → MainMenu).
- 브라우저 DevTools Network 탭에
  `/games/inflation-rpg/assets/images/title_bg.png` 가 200 을 반환.

에셋이 404 면 확인:
- symlink 가 존재하는 디렉터리를 가리키는가.
- `game.registry.get('assetsBasePath')` 가 기대한 문자열을 반환하는가
  (필요하면 `Preloader.preload()` 안에 임시 `console.log` 추가; 커밋 전에
  제거).

dev 서버 정지.

- [ ] **단계 8: 커밋**

symlink 를 git 에 포함 (git 은 symlink 를 그대로 추적한다).
```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add apps/dev-shell pnpm-lock.yaml
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "feat(dev-shell): mount inflation-rpg via dynamic import and expose its assets

The dev-shell registry now ships one game. GameMount renders a client-side
container and calls StartGame with the manifest-declared assetsBasePath.
Assets are surfaced through a symlink under public/ so the same URL pattern
works in dev and static export."
```

---

### 태스크 8: public/assets 큐레이션 — 미사용 제거

코어 플레이 루프에 필요하지 않은 에셋을 제거한다. 아래 목록은 `Preloader.ts`
가 참조하는 것 + 유지한 씬들이 필요로 하는 UI/사운드 파일에서 파생된다.

**파일:**
- `games/inflation-rpg/public/assets/` 아래에서 삭제:
  - `images/*_backup.*` (명시적 "backup" 중복)
  - `Preloader.ts` 의 image/spritesheet 로드가 참조하지 않는 이미지
  - `Preloader.ts` 의 audio 로드가 참조하지 않는 `sounds/` 항목
  - 태스크 2 에서 이미 삭제됨: `data/raw_concept/`, `*.meta`

- [ ] **단계 1: 참조된 에셋 경로 수집**

실행:
```bash
grep -oE "'(images|sounds)/[^']+'" games/inflation-rpg/src/game/scenes/Preloader.ts \
  | sort -u > /tmp/inflation-rpg-assets-used.txt
wc -l /tmp/inflation-rpg-assets-used.txt
head -20 /tmp/inflation-rpg-assets-used.txt
```

- [ ] **단계 2: 현재 배포된 에셋 나열**

실행:
```bash
(cd games/inflation-rpg/public/assets && find images sounds -type f) \
  | sort -u > /tmp/inflation-rpg-assets-present.txt
wc -l /tmp/inflation-rpg-assets-present.txt
```

- [ ] **단계 3: 미참조 집합 계산**

실행:
```bash
sed "s/'//g" /tmp/inflation-rpg-assets-used.txt > /tmp/used-cleaned.txt
comm -23 /tmp/inflation-rpg-assets-present.txt /tmp/used-cleaned.txt > /tmp/unreferenced.txt
wc -l /tmp/unreferenced.txt
cat /tmp/unreferenced.txt
```

- [ ] **단계 4: 미참조 파일별 검토**

`/tmp/unreferenced.txt` 를 연다. 각 항목에 대해:
- 명백한 backup (`*_backup.*`), preview/screenshot, 유지한 sheet 의 구버전
  인 경우 **삭제**.
- Preloader 가 간접적으로 로드하는 경우 (일부 씬이 `Preloader.preload` 밖에서
  `this.load.image` 를 호출) **유지** — `src/game/` 전역에서 파일명을 grep
  해서 확인한다.

명백한 것에 대한 기계적 처리:
```bash
find games/inflation-rpg/public/assets/images \
  -type f \( -name "*_backup.*" -o -name "preview.*" \) -print -delete
```

나머지는 삭제 전에 grep:
```bash
# example for each candidate:
grep -rn "<filename>" games/inflation-rpg/src/ || echo "NOT REFERENCED — safe to delete"
```

참조가 없는 파일만 삭제한다. tilemap JSON, 폰트 파일, 혹은 `Preloader.ts` 에
직접 없어도 게임 런타임이 기대하는 것은 삭제하지 않는다.

- [ ] **단계 5: dev-shell 포털에서 Preloader 재실행**

`pnpm dev` 시작, `http://localhost:3000/games/inflation-rpg` 방문, Network 탭
에서 404 를 확인한다. 참조된 에셋이 없어졌다면 upstream 에서 복원:
```bash
UPSTREAM=/Users/joel/Desktop/git/korea-inflation-rpg
cp "$UPSTREAM/public/assets/<path>" games/inflation-rpg/public/assets/<path>
```

dev 서버 정지.

- [ ] **단계 6: 커밋**

최종 개수를 커밋 메시지에 기록:
```bash
AFTER=$(find games/inflation-rpg/public/assets -type f | wc -l | tr -d ' ')
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add games/inflation-rpg/public
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "chore(game-inflation-rpg): prune unused assets (now $AFTER files)"
```

---

### 태스크 9: `tests/game/` (vitest) 큐레이션 — 수학/세이브/밸런스 불변식만 유지

spec §3 Phase 1 에 따라: `InflationManager`, `StatCalculator`,
`SaveManager.migration`, `Monsters` 밸런스, `KarmaManager`,
`ReincarnationManager`, `SkillManager`, `GameState.migration`, `SkillData`,
`ClassData` 를 유지한다. 나머지는 삭제한다.

**파일:**
- 삭제: 목록에 없는 `games/inflation-rpg/tests/game/*.ts`.

- [ ] **단계 1: scope 밖 테스트 파일 삭제**

레포 루트에서 실행:
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

예상 삭제: 모든 `BattleScene*.test.ts` (.ui, .rewards, .class, .test, Effects),
`GumihoGimmick.test.ts`, `ShopScene*.test.ts`, `InventoryScene.ui.test.ts`,
`skill-usage.spec.ts`, `StatManager.signals.test.ts`, `yaksu.test.ts`,
`BalanceSimulation.test.ts`, `GridPhysics.test.ts`. 태스크 3 의
`tests/game/startGame.test.ts` 는 scope 에 있으니 유지된다.

태스크 3 의 TDD 테스트도 유지 확인:
`ls games/inflation-rpg/tests/game/startGame.test.ts` — 없으면 잘못 삭제된
것이니 복원한다.

- [ ] **단계 2: 테스트 `import` 경로 조정**

upstream 테스트는 path alias `@/game/...` (`@` → `src/`) 로 import 한다. 우리
`tsconfig.json` 이 `@/*` 를 `./src/*` 로 매핑하고 있어 경로는 그대로 동작한다.
검증:
```bash
grep -h "from '@/" games/inflation-rpg/tests/game/*.ts | head -5
```
예상: `from '@/game/utils/InflationManager'` 형태의 라인. 우리 tsconfig path
map 에 정상 해석된다.

- [ ] **단계 3: 큐레이션된 vitest suite 실행**

실행: `pnpm --filter @forge/game-inflation-rpg test 2>&1 | tail -20`
예상: 높은 통과율. 정확한 카운트를 기록한다.

실패가 발생하면, 태스크 3 의 `main.ts` refactor 또는 삭제된 유틸을 간접 로드
하는 테스트로 인한 것이니 각 실패를 검사한다. 선택:
- 유지 테스트가 이제 삭제된 helper 를 import 한다면, upstream 레포에서
  **helper 를 다시 추가**한다 (명시적 keep 목록엔 없지만 keeper 의 의존성으로
  필요).
- 유지 테스트가 `window.gameState` 의 자동 노출에 의존한다면, 테스트를 업데이트
  해 명시적으로 `exposeTestHooks({...})` 를 호출하게 하거나, 오래된 누수성
  초기화에 결합된 테스트라면 깨진 채 받아들인다 (리포트에 문서화).

- [ ] **단계 4: 커밋**

숫자 기록:
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

### 태스크 10: Playwright E2E — 포털에 고정된 full game flow

`full-game-flow.spec.ts` (태스크 2 에서 이미 이름 변경) 만 유지한다. 포털 URL
을 target 으로 만든다. `GameTestHelper.ts` 는 유지한다 (이미 복사됨).

**파일:**
- 생성: `games/inflation-rpg/playwright.config.ts`
- 수정: `games/inflation-rpg/tests/e2e/full-game-flow.spec.ts` (라우트 업데이트)
- 수정: `games/inflation-rpg/tests/e2e/helpers/GameTestHelper.ts` (hardcoded 경로 업데이트)

- [ ] **단계 1: Playwright config 작성**

`games/inflation-rpg/playwright.config.ts` 작성:
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

주의: `workers: 1` 은 dev-shell 이 단일 dev 서버이고 게임이 하나의
localStorage 키에 write 하기 때문이다. 병렬 worker 는 race 가 난다.

- [ ] **단계 2: spec 이 포털을 경유하도록 업데이트**

`games/inflation-rpg/tests/e2e/full-game-flow.spec.ts` 를 연다. 그 `page.goto('/')`
호출들은 현재 게임이 루트에 있다고 기대한다. 모든 `page.goto('/')` 를
`page.goto('/games/inflation-rpg')` 로 교체한다.

파일 내 검색·교체:
```bash
sed -i '' "s|page\\.goto('/')|page.goto('/games/inflation-rpg')|g" \
  games/inflation-rpg/tests/e2e/full-game-flow.spec.ts
sed -i '' "s|page\\.goto(\"/\")|page.goto(\"/games/inflation-rpg\")|g" \
  games/inflation-rpg/tests/e2e/full-game-flow.spec.ts
```

수동 검증:
```bash
grep -n "page.goto" games/inflation-rpg/tests/e2e/full-game-flow.spec.ts
```
모든 `page.goto` 호출이 `/games/inflation-rpg` (또는 그 하위 경로) 를 가리켜야
한다.

- [ ] **단계 3: helper 도 동일하게 업데이트**

helper 에 동일한 sed 적용:
```bash
sed -i '' "s|page\\.goto('/')|page.goto('/games/inflation-rpg')|g" \
  games/inflation-rpg/tests/e2e/helpers/GameTestHelper.ts
sed -i '' "s|page\\.goto(\"/\")|page.goto(\"/games/inflation-rpg\")|g" \
  games/inflation-rpg/tests/e2e/helpers/GameTestHelper.ts
grep -n "page.goto" games/inflation-rpg/tests/e2e/helpers/GameTestHelper.ts
```

- [ ] **단계 4: 새 workspace 에 Playwright 브라우저 설치**

실행: `pnpm --filter @forge/game-inflation-rpg exec playwright install chromium`
예상: chromium 가용 (dev-shell 설치 재사용 가능).

- [ ] **단계 5: E2E 실행**

실행: `pnpm --filter @forge/game-inflation-rpg e2e 2>&1 | tail -10`
예상: `1 passed`.

실패 시:
- Phaser 의존 첫 단계에서 정확히 실패 → 포털에서 게임이 부팅되지 않았다.
  asset 404 또는 콘솔 에러를 확인.
- `window.gameState` 대기 timeout → `exposeTestHooks: true` 누락이거나
  testHooks.ts 브랜치가 깨짐.
- MainMenu 의 selector 누락 → Preloader 가 끝났는지 검증 (느린 CI).
  flake 라면 helper 의 wait timeout 을 늘린다.

- [ ] **단계 6: 커밋**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add games/inflation-rpg/playwright.config.ts games/inflation-rpg/tests/e2e
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "test(game-inflation-rpg): wire full-game-flow e2e through the portal"
```

---

### 태스크 11: End-to-end 검증, turbo pipeline, release 빌드

- [ ] **단계 1: Clean install**

실행:
```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules games/*/node_modules
pnpm install --frozen-lockfile
```
예상: 에러 없음. Lockfile 변경 없음.

- [ ] **단계 2: 전체 turbo pipeline**

실행: `pnpm turbo run typecheck lint test --force 2>&1 | tail -15`
예상: 모든 workspace 가 녹색. 게임의 vitest suite 가 큐레이션된 테스트를
실행한다.

- [ ] **단계 3: 순환 의존성 검사**

실행: `pnpm circular 2>&1 | tail -3`
예상: `No circular dependency found!`.

- [ ] **단계 4: 포털 E2E**

실행: `pnpm --filter @forge/game-inflation-rpg e2e 2>&1 | tail -8`
예상: `1 passed`.

- [ ] **단계 5: 포털 smoke 가 여전히 녹색인지**

실행: `pnpm --filter @forge/dev-shell e2e 2>&1 | tail -6`
예상: `2 passed`. (Phase 0 smoke 가 여전히 동작 — 이제 둘 중 하나는
inflation-rpg 가 등록된 상태를 검증한다. 필요하면 Phase 0 테스트 업데이트:
"no games registered" assertion 이 이제 게임이 등록되어 실패한다면, 포털이
적어도 하나의 게임을 나열하는지 검증하도록 테스트를 다시 쓴다. 이는 **허용된
Phase 0 테스트 업데이트**로, 인라인에 기록된다.)

Phase 0 smoke 가 해당 assertion 에서 실패하면,
`apps/dev-shell/tests/e2e/portal.spec.ts` 를 열어 첫 테스트 본문을 다음으로
교체:
```ts
test('portal lists registered games', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '2d-game-forge' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: /조선 인플레이션 RPG/ }),
  ).toBeVisible();
});
```

- [ ] **단계 6: Release 빌드 검증**

실행: `pnpm --filter @forge/game-inflation-rpg build 2>&1 | tail -15`
예상: Next 가 `games/inflation-rpg/out/` 으로 emit. 검증:
```bash
ls games/inflation-rpg/out/
test -f games/inflation-rpg/out/index.html && echo "HTML OK"
test -d games/inflation-rpg/out/assets && echo "ASSETS OK"
```
둘 다 `OK` 를 출력해야 한다.

- [ ] **단계 7: Capacitor sync smoke**

실행: `pnpm --filter @forge/game-inflation-rpg exec cap sync 2>&1 | tail -15`
예상: Capacitor 가 성공을 보고한다. 첫 실행이라면 플랫폼 추가를 요청할 수
있는데, 이는 허용된다: Capacitor 가 제안하는 명령으로 iOS 와 Android 를
추가하거나, sync 단계만 exit 0 이면 건너뛴다.

이 태스크에서 `build:ios` 나 `build:android` 는 **시도하지 않는다** — 네이티브
IDE 를 열고 플랫폼 SDK 를 요구한다. 사용자의 수동 검증으로 남긴다.

- [ ] **단계 8: 수동 포털 플레이 스루 (human gate)**

`pnpm dev` 실행. `http://localhost:3000/games/inflation-rpg` 를 연다.

수동 검증:
- MainMenu → "새 게임" (또는 동등한 메뉴) 가 플로우를 시작한다.
- Class select 화면이 나타난다.
- 화랑을 고르면 world map 이 나타난다.
- 인카운터에 들어가면 전투가 시작된다.
- 전투 승리 후 골드와 XP 가 갱신된다.
- Inventory / Shop 열기가 콘솔 에러 없이 동작한다.
- 페이지 새로고침이 상태를 복원한다 (SaveManager 가 원본 키
  `'korea_inflation_rpg_save'` 로 여전히 작동).

dev 서버 정지.

- [ ] **단계 9: 테스트 업데이트가 있었으면 최종 커밋, 그리고 태그**

단계 5 에서 Phase 0 smoke 업데이트가 필요했다면 지금 커밋:
```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add apps/dev-shell/tests
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "test(dev-shell): portal smoke now asserts at least one game is registered"
```

결과에 태그:
```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" tag phase-1-complete
git log --oneline | head -20
```

태그를 자동으로 push 하지 않는다 — 사용자가 확인한다.

---

## 셀프 리뷰

**1. Spec 커버리지:**

| Spec 섹션 | 태스크 |
|---|---|
| §0 Phase 1 성공 #1 (큐레이션 테스트와 함께 inflation-rpg 플레이) | 태스크 2, 4, 9, 10, 11 |
| §0 Phase 1 성공 #2 (`pnpm dev` 로 inflation-rpg 로드) | 태스크 7 |
| §0 Phase 1 성공 #3 (iOS/Android 빌드 명령 존재) | 태스크 1 (스크립트), 6 (capacitor config), 11 (smoke) |
| §2 동일 `StartGame` 엔트리 | 태스크 3 (config 기반), 태스크 6 (release), 태스크 7 (portal) |
| §2 manifest 기반 부팅 | 태스크 5 (gameManifest), 태스크 7 (registry 가 이를 사용) |
| §2 저장 namespace | **Phase 1 에서 적용 안 함** — spec 이 "승격 시 refactor 분리"라고 명시. `SaveManager` 는 upstream 키 그대로 inflation-rpg 안에 남는다. Phase 2 이후에서 namespace 처리. |
| §2 전역 테스트 hook 격리 | 태스크 3 — `exposeTestHooks` 는 `StartGameConfig.exposeTestHooks` 로 opt-in. |
| §3 Phase 1 코드 큐레이션 (씬, 매니저) | 태스크 2 (목록 파일만 복사 — `suggest_csv/`, `docs/`, `scripts/` 같은 orphan 실험은 애초에 복사되지 않음) |
| §3 Phase 1 에셋 큐레이션 | 태스크 8 |
| §3 Phase 1 테스트 큐레이션 (Vitest 100~150, E2E 하나) | 태스크 9 (Vitest) 와 10 (Playwright) |
| §3 Phase 1 중단 조건 (테스트 녹색, 수동 플레이 OK) | 태스크 11 |

**2. Placeholder 스캔:** TBD/TODO 없음. 모든 코드 블록이 완전하다. 구현자가
내려야 할 결정 (태스크 8 의 asset keep/delete judgement, 태스크 11 단계 5 의
Phase 0 smoke 업데이트) 은 정확한 기준과 정확한 교체 텍스트와 함께 제공된다.

**3. 타입 일관성:**
- `StartGameConfig` (태스크 3) 필드 `parent`, `assetsBasePath`,
  `exposeTestHooks` 가 태스크 6 (PhaserGame.tsx), 태스크 7 (registry 와
  GameMount), 태스크 10 (e2e 는 config 직접 참조 안 하고 helper 를 통해
  `window.gameState` 사용) 과 일치.
- `GameManifestValue` (from `@forge/core/manifest`) 이 태스크 5 (barrel),
  태스크 7 (registry) 에서 동일하게 사용. `gameManifest` 객체 리터럴이 태스크
  5 와 태스크 7 단계 2 에서 `slug`/`title`/`assetsBasePath` 값이 동일.
- `buildPhaserConfig({ parent })` (태스크 3 main.ts) 가 `StartGame(config)` 가
  `{ parent: config.parent }` 를 넘기며 호출 — signature 가 일치.
- `exposeTestHooks(slots)` (태스크 3 testHooks.ts) 의 key 가 `startGame.ts` 에서
  사용하는 필드들 — `gameState`, `inflationManager`, `ReincarnationManager`,
  `phaserGame`, `currentScene` — 과 일치.

**4. Scope 체크:** spec §3 기준 Phase 1 scope 안의 모든 것. 패키지 승격 없음
(`packages/2d-core` 는 `GameManifest` 전용 유지), 콘텐츠 팩 분리 없음 (한국
설화는 `games/inflation-rpg/` 안에 유지), 장르 코어 생성 없음.

---

## 실행 핸드오프

plan 완료, `docs/superpowers/plans/2026-04-17-phase1-inflation-rpg-port.md` 에
저장됨. 실행 옵션 두 가지:

1. **Subagent 방식 (권장)** — 태스크마다 fresh subagent 를 dispatch, 태스크
   사이 리뷰, 빠른 반복. 11-태스크 아크 중 일부 태스크 (벌크 복사, asset
   큐레이션, 테스트 큐레이션) 가 실제 판단을 요구하는 경우에 적합.
2. **Inline 실행** — executing-plans 로 이 세션에서 실행, 체크포인트와 함께
   batch 실행.

어느 쪽?
