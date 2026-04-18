# @forge/game-inflation-rpg

forge 의 첫 번째 게임. korea-inflation-rpg 의 핵심 플레이 루프를 큐레이션해
이식한 결과다.

## 플랫폼

- 웹 (dev-shell 포털 또는 standalone Next export)
- iOS / Android (Capacitor 8)

## 주요 스크립트

- `pnpm --filter @forge/game-inflation-rpg dev` — standalone Next dev 서버
  (`:3100`). 포털 통합 개발은 레포 루트에서 `pnpm dev` 후
  `http://localhost:3000/games/inflation-rpg` 사용.
- `pnpm --filter @forge/game-inflation-rpg build:web` — 정적 export → `out/`.
- `pnpm --filter @forge/game-inflation-rpg build:ios` — Next build + Capacitor
  sync + Xcode 열기.
- `pnpm --filter @forge/game-inflation-rpg build:android` — 동등하게 Android
  Studio 열기.
- `pnpm --filter @forge/game-inflation-rpg test` — Vitest (큐레이션된 23개
  파일, 약 450 테스트).
- `pnpm --filter @forge/game-inflation-rpg e2e` — Playwright (`full-game-flow`,
  3 테스트). 포털 dev 서버를 자동으로 띄운다.

## 공개 export

- `StartGame(config: StartGameConfig): Phaser.Game` — 단일 부팅 엔트리.
  dev-shell 의 `/games/inflation-rpg` 라우트와 release-mode React wrapper
  양쪽이 동일하게 호출한다.
- `gameManifest: GameManifestValue` — dev-shell 의 registry 가 소비할
  매니페스트.

`StartGameConfig` 의 필드:

```ts
interface StartGameConfig {
  parent: string;            // DOM 컨테이너 id
  assetsBasePath: string;    // 에셋 URL prefix
  exposeTestHooks: boolean;  // window.* hook 노출 여부
}
```

## 디렉터리

```
games/inflation-rpg/
├── src/
│   ├── index.ts                 # gameManifest + StartGame export
│   ├── startGame.ts             # StartGame(config) 구현
│   ├── app/                     # release 모드 Next 셸
│   ├── components/PhaserGame.tsx  # release 모드 React wrapper
│   └── game/                    # 게임 로직 (이식 결과)
│       ├── main.ts              # Phaser config factory
│       ├── testHooks.ts         # opt-in window.* 노출
│       ├── scenes/              # 9개 main loop scene + 보조 매니저
│       ├── data/                # 몬스터/아이템/스킬/클래스 등
│       ├── i18n/                # ko.json + en.json + I18nManager
│       ├── physics/             # GridPhysics
│       ├── core/                # SkillManager, BossAI, signals
│       ├── state/               # GameStateRestorer
│       ├── types/               # PlayerTypes
│       └── utils/               # SaveManager, InflationManager 등
├── public/assets/               # 큐레이션된 에셋 (~74개)
└── tests/
    ├── game/                    # Vitest 23개 파일
    └── e2e/full-game-flow.spec.ts  # Playwright 1개 파일
```

## 의존성

- runtime: `@forge/core`(workspace), Phaser, React, Next, Capacitor, Zod,
  BigNumber.js, @preact/signals-react.
- Phase 1 시점 `@forge/core` 에서 가져오는 것은 `GameManifest` 스키마 하나.
- 다른 어떤 게임도 import 하지 않는다 (의존성 단방향 규칙).

## 알려진 부채

이식 단계에서 의도적으로 남겨둔 정리 대상. 두 번째 게임 도착 시 처리 권장.

- **upstream 호환 키 유지**:
  - `localStorage` 키: `'korea_inflation_rpg_save'`.
  - Capacitor `appId`: `com.korea.inflationrpg`.
  - 두 번째 게임이 같은 `SaveManager` 를 쓰게 되면 충돌. `SaveManager` 를
    `@forge/core` 로 승격할 때 namespace 도입 예정.
- **strict TypeScript opt-out**: `tsconfig.json` 에서
  `noUncheckedIndexedAccess`, `noImplicitOverride` 를 끄고 있다. upstream
  레거시 코드와의 호환 때문. 점진적으로 코드 수정 후 base 로 되돌릴 수 있음.
- **`@/game/*` cross-workspace alias**: dev-shell 의 tsconfig 와
  `next.config.ts` 에서 inflation-rpg 의 `src/game/*` 로 alias 가 걸려 있다.
  upstream 코드가 `@/game/...` import 를 쓰기 때문. 신규 게임은 동일한 alias
  를 만들지 말고 내부에 상대 경로를 사용한다 (CONTRIBUTING §11 참조).
- **`Boot.ts` 와 `Preloader.ts` 의 fallback 경로**: registry 값이 비어 있을
  때만 동작하는 legacy `setPath('assets')` fallback 이 남아 있다. 모든 호출자가
  `assetsBasePath` 를 항상 넘기는 것이 확실해지면 fallback 제거 가능.

## 더 읽을 것

- [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) — `StartGame(config)` 계약,
  `assetsBasePath` 흐름, 승격 프로토콜.
- [docs/CONTRIBUTING.md](../../docs/CONTRIBUTING.md) — 새 게임 추가 시 이
  게임을 참고 예시로 사용.
- [Phase 1 plan](../../docs/superpowers/plans/2026-04-17-phase1-inflation-rpg-port.md)
  — 이식 결정 과정.
