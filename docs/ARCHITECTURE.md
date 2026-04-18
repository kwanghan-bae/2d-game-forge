# 아키텍처

이 문서는 2d-game-forge 의 구조 결정과 그 이유를 설명한다. "왜 이렇게
나누었는가"를 알아야 새 코드를 어디에 두어야 할지 판단할 수 있다.

상세 설계 의도와 토론 흐름은
[설계 스펙](superpowers/specs/2026-04-17-2d-game-forge-initial-design.md)에
박제되어 있다. 이 문서는 그 결과를 압축한 운영 가이드다.

forge 는 **2D 게임 프레임워크**다. 특정 장르나 테마에 묶이지 않는다. 4계층
케이크의 각 슬롯은 새 패키지를 추가하는 방식으로 확장된다 — 새 장르 코어
(`2d-puzzle-core` 등), 새 플러그인, 새 콘텐츠 팩(`content-roma`,
`content-fantasy` 등). 첫 작업으로 한국 테마와 RPG 장르를 다루지만, 그 자체는
프레임워크의 제약이 아니다.

## 1. 4계층 케이크

전체 코드는 네 개의 의존 계층으로 구성된다.

```
┌─────────────────────────────────────────────────────┐
│ games/*           (밸런스·고유 시스템·게임별 엔트리)
├─────────────────────────────────────────────────────┤
│ content packs     (korean-folklore, …)  — 테마·에셋
├─────────────────────────────────────────────────────┤
│ genre cores       (2d-rpg-core, 2d-idle-core)
│ + plugins         (economy-inflation, karma, …)
├─────────────────────────────────────────────────────┤
│ 2d-core           (부트·세이브·i18n·EventBus·Capacitor·E2E)
└─────────────────────────────────────────────────────┘
```

### 각 계층의 역할

| 계층 | 패키지 prefix | 책임 | 현재 존재 여부 |
|---|---|---|---|
| 게임 | `@forge/game-*` | 한 게임의 밸런스·고유 시스템·매니페스트·릴리스 설정 | `inflation-rpg` 1개 |
| 콘텐츠 팩 | `@forge/content-*` | 테마(스프라이트·BGM·폰트·인물 데이터·i18n)를 게임 간 공유. **언제든 새 테마 팩 추가 가능** (예: `content-korean-folklore`, `content-roma`, `content-fantasy`) | 미존재. 첫 한국 테마 콘텐츠는 inflation-rpg 내부에 있음 |
| 장르 코어 | `@forge/{genre}-core` | RPG·idle·플랫포머·퍼즐처럼 같은 장르의 게임들이 공유할 시스템 (전투·스킬·인벤토리 등). **장르가 늘어나면 새 패키지 추가** | 미존재 |
| 플러그인 | `@forge/{plugin-name}` (예: `economy-inflation`) | 장르 독립적이지만 모든 게임이 쓰지 않는 기능. 코어보다 옵션 성격 | 미존재 |
| 코어 | `@forge/core` | 모든 2D 게임의 바닥 — 부팅, EventBus, SaveManager, i18n, Capacitor 헬퍼, E2E hook | 1개. 현재는 `GameManifest` 스키마만 |

게임 외 부속:

- `apps/dev-shell` — 개발용 통합 포털. Next.js 앱.
- `tooling/*` — 빌드·릴리스·창고 스크립트 (필요해질 때 추가).

### 패키지가 비어있는 것이 정상

Phase 0/1 시점에 `2d-rpg-core`, `economy-inflation`, `content-korean-folklore`
는 의도적으로 만들지 않았다. "3의 규칙" 때문이다 (§3 참고). 두 번째 게임이
실제로 같은 코드를 필요로 할 때까지 코어 패키지를 선제적으로 만들지 않는다.

## 2. 의존성 단방향 규칙

화살표는 단 한 방향으로만 허용된다.

```
games/* → content packs → genre cores + plugins → 2d-core → (phaser, react, capacitor)
```

### MUST 규칙

- `2d-core` 는 장르 코어를 모른다.
- 장르 코어는 특정 게임을 모른다.
- 플러그인은 장르 코어를 모르고 `2d-core` 만 의존한다. 장르 코어가 플러그인을
  옵션으로 통합한다.
- 콘텐츠 팩은 코드 의존을 최소화한다 — 데이터·에셋 위주. 필요한 타입은
  `2d-core` 또는 관련 장르 코어에서 가져온다.

### CI 가 강제한다

- **eslint-plugin-boundaries** 가 import 시점에 차단한다. `eslint.config.mjs`
  의 `boundaries/element-types` 룰이 위 화살표 외 모든 import 를 거부한다.
- **madge --circular** 가 순환 참조를 차단한다. `pnpm circular` 스크립트로
  실행하며 CI 의 check job 이 매번 돌린다.

규칙을 우회하지 않는다. 위반 발견 시 alias·리팩터로 정상 화살표로 되돌린다.

## 3. "3의 규칙" 승격 프로토콜

> 같은 로직이 두 게임에서 실제로 쓰이는 것이 확인되기 전에는 코어로 승격하지
> 않는다.

선제적 추상화를 막는 핵심 원칙. 이유:

- 1개일 때 추상화하면 90% 확률로 두 번째 게임이 들어올 때 뜯어고쳐야 한다.
- 코드는 게임 안에 두어도 어차피 동작한다. 코어로 옮기는 비용은 나중에 한 번
  내면 된다.
- 결과적으로 코어는 "정말 두 곳에서 쓰는 것"만 모이게 된다.

### 승격 절차 (mechanical)

1. 게임 A 가 기능 X 를 필요로 한다.
   - inflation-rpg 에 동등 기능 **있음 + 두 게임이 같은 의미로 사용** → 승격.
   - 있음 + 다른 의미로 사용 → 양쪽 변종 유지. 3번째 게임이 요구할 때 재검토.
   - 없음 → 게임 A 안에 local 구현. 승격하지 않는다.
2. 코드와 테스트를 inflation-rpg 에서 적절한 계층(`packages/<pkg>/src/`)으로
   **이동**(복사 아님)한다.
3. 양쪽 게임이 `@forge/<pkg>` 에서 import 하도록 경로를 교체한다.
4. 해당 패키지 아래로 테스트를 옮기고 inflation-rpg 쪽엔 smoke 만 남긴다.
5. 커밋 하나에 `promote: X to @forge/<pkg>` 로 기록한다.
6. Playwright full-game-flow 통과를 확인한다. 실패 시 승격을 롤백한다.

### 안티패턴 (금지)

- "언젠가 쓸 것 같아서" 빈 패키지를 미리 만들지 않는다.
- 게임 A 기획 전에 `SaveManager` 같은 인기 후보를 선제적 승격하지 않는다.
- 승격과 동시에 "더 나은" API 로 리디자인하지 않는다. **분리한다**: 먼저
  그대로 이동, 다음 PR 에서 리팩터.

## 4. 개발 모드 vs 릴리스 모드

같은 게임 코드가 두 가지 방식으로 부팅된다.

### 개발 모드 (통합 포털)

```
pnpm dev
  ↓
apps/dev-shell (Next.js, http://localhost:3000)
  ↓
/                       → 게임 셀렉터
/games/inflation-rpg    → inflation-rpg 동적 로드
/games/<future-slug>    → 추가 게임
```

- 한 개의 dev 서버가 모든 게임을 hot-swap 한다.
- Phaser 인스턴스는 라우트 이동 시 `destroy(true)`.
- E2E hook 이 활성화되어 있다 (`window.gameState`, `window.phaserGame` 등).
- `process.env.NODE_ENV !== 'production'` 일 때만 hook 노출.

### 릴리스 모드 (게임별 독립 앱)

각 `games/*` 워크스페이스는 자체 빌드 타겟을 가진다.

| 타겟 | 명령 | 결과물 |
|---|---|---|
| 웹 | `pnpm --filter @forge/game-<slug> build:web` | `games/<slug>/out/` (정적) |
| iOS | `pnpm --filter @forge/game-<slug> build:ios` | Capacitor sync → Xcode |
| Android | `pnpm --filter @forge/game-<slug> build:android` | Capacitor sync → Android Studio |

- 각 게임의 `next.config.ts`: `output: 'export'`, `basePath` 없음 (루트 마운트).
- 각 게임의 `capacitor.config.ts`: 자체 `appId`, `appName`, `webDir: 'out'`.
- E2E hook 은 기본값 off.

### 동일 `StartGame(config)` 엔트리 — MUST

포털과 릴리스가 **같은 함수**를 호출한다. 게임 코드는 어떤 모드에서 실행되는지
모르고, config 만 받는다.

```ts
// games/<slug>/src/startGame.ts
export interface StartGameConfig {
  parent: string;            // DOM 컨테이너 id
  assetsBasePath: string;    // 에셋 URL prefix (Phaser load.setBaseURL)
  exposeTestHooks: boolean;  // window.* hook 노출 여부
}

export function StartGame(config: StartGameConfig): Phaser.Game { ... }
```

이 원칙이 깨지지 않도록 다음을 지킨다:

1. 게임 코드는 `window.location` 같은 전역 경로를 가정하지 않는다.
2. 모든 에셋 경로는 `config.assetsBasePath` 로부터 계산한다.
3. 저장 키는 게임마다 고유하다 (현재 inflation-rpg 는 upstream 키
   `'korea_inflation_rpg_save'` 를 그대로 쓴다 — 게임 #2 도착 시
   `@forge/core` 로 승격하면서 namespace 도입 예정).
4. E2E hook 은 `config.exposeTestHooks` 플래그 아래에서만 활성화된다.

## 5. assetsBasePath 흐름

게임의 에셋은 두 가지 다른 URL 에서 서빙된다.

| 모드 | URL 패턴 | 어떻게 서빙되나 |
|---|---|---|
| 포털 | `/games/inflation-rpg/assets/...` | `apps/dev-shell/public/games/inflation-rpg/assets` 가 `games/inflation-rpg/public/assets` 로 symlink |
| 릴리스 | `/assets/...` | `games/inflation-rpg/public/assets` 를 Next 가 그대로 정적 서빙 |

이 차이를 게임 코드가 알 필요 없도록, 다음 흐름이 만들어진다:

```
StartGame(config)
  → game.registry.set('assetsBasePath', config.assetsBasePath)
  → Boot.preload()  reads registry  →  this.load.setBaseURL(...)
  → Preloader.preload()  reads registry  →  this.load.setBaseURL(...)
  → 모든 후속 load.image('images/x.png')  →  '<base>/images/x.png'
```

Boot 와 Preloader 는 registry 값이 비어 있을 때만 legacy `setPath('assets')`
fallback 으로 동작한다 (upstream 코드와의 호환).

## 6. dev-shell 의 server/client 분리

Next 16 (Turbopack) 의 server component bundle 에 Phaser 가 들어가지 않도록
다음 분리가 강제된다.

```
apps/dev-shell/src/lib/registry.server.ts   ← server-safe. 매니페스트만.
apps/dev-shell/src/lib/registry.ts          ← client-only. 동적 import 콜백 포함.

apps/dev-shell/src/app/games/[slug]/page.tsx     ← server component. registry.server 만 import.
apps/dev-shell/src/components/GameMount.tsx      ← client wrapper. dynamic({ ssr: false })
apps/dev-shell/src/components/GameMountInner.tsx ← 실제 mount 로직. registry.ts 사용.
```

만약 server component 가 `registry.ts` 를 import 하면 Turbopack 이 Phaser
체인 전체를 server bundle 로 끌어들인다. Phaser 는 `window` 에 의존하므로
SSR 단계에서 실패한다.

## 7. 모노레포 도구

- **pnpm workspaces** — `pnpm-workspace.yaml` 의 globs (`apps/*`, `games/*`,
  `packages/*`, `tooling/*`).
- **Turborepo** — `turbo.json` 의 task 그래프. `build`, `dev`, `typecheck`,
  `lint`, `test`, `e2e`, `clean`. 의존성 그래프 기반 캐시.
- **TypeScript** — 모든 워크스페이스가 `tsconfig.base.json` 을 extends 한다.
  base 는 strict + `noUncheckedIndexedAccess` + `noImplicitOverride`.
  inflation-rpg 와 dev-shell 은 upstream 레거시 코드 호환을 위해 두 strict
  플래그를 opt-out 했다. 신규 패키지는 base 를 그대로 따른다.

## 8. 알려진 부채 (Phase 2 전 처리 권장)

- **cross-workspace `@/game/*` alias** — `apps/dev-shell/tsconfig.json` 과
  `next.config.ts` 가 `games/inflation-rpg/src/game/*` 로 직접 별칭을 건다.
  새 게임 추가 시 별칭이 늘어난다. 정책 옵션: 신규 게임은 내부에서 상대
  경로를 쓰고, inflation-rpg 만 grandfathered.
- **upstream 호환 키** — `'korea_inflation_rpg_save'` localStorage 키와
  `com.korea.inflationrpg` Capacitor appId 가 그대로 살아있다. `SaveManager`
  를 `@forge/core` 로 승격할 때 namespace 패턴으로 통합한다.

## 9. 더 자세한 의도

- 초기 설계 스펙: `docs/superpowers/specs/2026-04-17-2d-game-forge-initial-design.md`
- Phase 0 구현 plan: `docs/superpowers/plans/2026-04-17-phase0-bootstrap.md`
- Phase 1 구현 plan: `docs/superpowers/plans/2026-04-17-phase1-inflation-rpg-port.md`
- 새 게임 추가 가이드: [CONTRIBUTING.md](CONTRIBUTING.md)
