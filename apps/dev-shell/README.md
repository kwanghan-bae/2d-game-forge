# @forge/dev-shell

등록된 게임을 로컬 브라우저에서 확인하는 개발용 포털이다. 현재는
`신의 마을: 영원의 후원자` 하나를 제공한다.

## 라우팅

| 경로 | 의미 |
|---|---|
| `/` | 등록된 게임 선택기 |
| `/games/[slug]` | 매니페스트에 등록된 게임을 `StartGame(config)`으로 부팅 |

## 게임 등록

| 파일 | 역할 |
|---|---|
| `src/lib/registry.shared.ts` | server/client 공용 data-only 매니페스트 원본 |
| `src/lib/registry.server.ts` | server component가 읽는 매니페스트 조회기 |
| `src/lib/registry.ts` | client component가 사용하는 동적 게임 loader |

새 게임을 추가할 때는 매니페스트와 loader, workspace 의존성,
`next.config.ts`의 `transpilePackages`를 함께 갱신한다.

## 환경과 검증

`GameMountInner.tsx`가 `StartGame`을 호출할 때 테스트 hook을 개발 환경에서만
활성화한다. 포털은 게임의 단일 부팅 엔트리를 그대로 사용하며 별도 실행
경로나 저장 계층을 갖지 않는다.

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
pnpm e2e
```

포털 E2E는 매니페스트·라우팅·부팅 smoke를 검증한다. 게임 규칙과 화면 흐름은
`@forge/game-inflation-rpg`의 단위 테스트와 Playwright에서 검증한다.
