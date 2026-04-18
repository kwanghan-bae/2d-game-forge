# @forge/dev-shell

forge 모노레포의 개발용 통합 포털. 등록된 모든 게임을 한 dev 서버에서
hot-swap 으로 띄울 수 있다. 외부 출시되지 않는다 — 로컬 개발 전용.

## 라우팅

| 경로 | 의미 |
|---|---|
| `/` | 게임 셀렉터. `registeredGames` 의 매니페스트 목록을 카드로 표시 |
| `/games/[slug]` | 해당 슬러그의 게임을 동적 import 후 `StartGame(config)` 으로 부팅 |

## 게임 등록

두 파일을 모두 수정해야 한다.

| 파일 | 역할 |
|---|---|
| `src/lib/registry.server.ts` | server component 가 사용. 매니페스트 데이터만. Phaser 가 server bundle 로 끌려 들어가지 않도록 격리 |
| `src/lib/registry.ts` | client component 가 사용. `load: () => import('@forge/game-...')` 동적 import 콜백 포함 |

추가로 `next.config.ts` 의 `transpilePackages` 에 게임 패키지명을 추가하고,
`pnpm --filter @forge/dev-shell add @forge/game-<slug>@workspace:*` 로
워크스페이스 의존성을 등록한다.

상세 절차는 [docs/CONTRIBUTING.md](../../docs/CONTRIBUTING.md) §6 참조.

## 에셋 서빙

`public/games/<slug>/assets` 가 게임의 `public/assets/` 로 symlink 되어
있다. 포털 origin 에서 `/games/<slug>/assets/...` 로 접근 가능하다.

새 게임 추가 시 symlink 도 함께 만든다 — [docs/CONTRIBUTING.md](../../docs/CONTRIBUTING.md)
§7 참조.

## 환경 게이트

`GameMountInner.tsx` 가 `StartGame` 을 호출할 때
`exposeTestHooks: process.env.NODE_ENV !== 'production'` 으로 게이트한다.

- 개발 모드 (`pnpm dev`): hook 노출. E2E 가 `window.gameState`,
  `window.phaserGame` 등으로 게임 상태에 접근 가능.
- 프로덕션 빌드 (`next build`): hook 노출 안 함. 만약 dev-shell 을 외부
  배포하게 되면 (의도된 시나리오 아님) globals 가 노출되지 않는다.

## server / client 분리

Next 16 (Turbopack) 의 server bundle 에 Phaser 가 들어가면 `window` 부재로
SSR 단계에서 실패한다. 이를 피하기 위해 다음 분리가 강제된다.

```
src/app/games/[slug]/page.tsx     ← server component. registry.server 만 import.
src/components/GameMount.tsx      ← 'use client' wrapper. dynamic({ ssr: false })
src/components/GameMountInner.tsx ← 실제 mount 로직. registry.ts (loaders) 사용.
```

server component 가 `registry.ts` 를 import 하면 안 된다.

## 스크립트

```bash
pnpm dev          # http://localhost:3000
pnpm build        # next build (정적 export 아님 — 포털은 SSR 가능 셸)
pnpm typecheck
pnpm lint
pnpm e2e          # Playwright. 포털 자체 smoke 만 돌림
```

게임의 E2E (`full-game-flow` 등) 는 게임 워크스페이스에서 실행한다.

## 의존성 부채

- `tsconfig.json` 과 `next.config.ts` 에 cross-workspace `@/game/*` alias 가
  걸려 있다. inflation-rpg 의 upstream 코드가 `@/game/...` 형태 import 를
  쓰기 때문에 dev-shell 의 transpile 단계에서 해소가 필요하다.
- 신규 게임은 [CONTRIBUTING.md](../../docs/CONTRIBUTING.md) §11 의 "자주 하는
  실수" 에 따라 내부 import 에 상대 경로를 쓴다. inflation-rpg 만
  grandfathered exception.
- `tsconfig.json` 의 `noUncheckedIndexedAccess: false`, `noImplicitOverride:
  false` 도 같은 이유로 완화되어 있다. 부채 해소 시 base 로 되돌린다.
