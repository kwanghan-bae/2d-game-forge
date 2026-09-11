# @forge/dev-shell

forge 모노레포의 개발용 통합 포털. 등록된 모든 게임을 한 dev 서버에서
hot-swap 으로 띄울 수 있다. 외부 출시되지 않는다 — 로컬 개발 전용.

## 라우팅

| 경로 | 의미 |
|---|---|
| `/` | 게임 셀렉터. `registeredGames` 의 매니페스트 목록을 카드로 표시 |
| `/games/[slug]` | 해당 슬러그의 게임을 동적 import 후 `StartGame(config)` 으로 부팅 |

## 게임 등록

공용 manifest와 client loader를 함께 갱신해야 한다.

| 파일 | 역할 |
|---|---|
| `src/lib/registry.shared.ts` | server/client가 함께 쓰는 data-only manifest 원본. slug·제목·asset 경로의 단일 출처 |
| `src/lib/registry.server.ts` | server component가 사용. shared manifest만 복사해 Phaser가 server bundle로 끌려 들어가지 않도록 격리 |
| `src/lib/registry.ts` | client component가 사용. shared manifest에 V4/legacy package subpath를 가리키는 `load` 동적 import 콜백을 연결 |

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

- 개발 모드 (`pnpm dev`): hook 노출. 공통 설정은 `window.gameConfig`로,
  V3 legacy 회귀 테스트는 `window.__zustand_inflation_rpg_store__`와
  `window.__cycle_store_v2__`로 검증한다. V4 경로에서는 legacy store를 지운다.
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

## 호환성 메모

- `@/components/ui/*`와 `@/lib/*`는 게임 패키지의 공용 UI/helper를 포털에서
  해석하기 위한 제한된 cross-workspace alias다. 게임별 모듈에는 상대 경로를
  사용하고 새 게임 전용 alias는 추가하지 않는다.
- `tsconfig.json`의 `noUncheckedIndexedAccess: false`,
  `noImplicitOverride: false`는 현재 레거시 코드 호환을 위해 완화되어 있다.
  관련 코드를 정리한 뒤 base 설정으로 되돌린다.
