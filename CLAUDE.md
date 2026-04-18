# CLAUDE.md

이 파일은 이 레포에서 작업하는 Claude Code 세션을 위한 진입 브리핑이다.
사람이 읽어도 되지만 일차 독자는 Claude.

## 한 줄 요약

2D 게임을 찍어내는 **프레임워크 + 모노레포 공장**. 엔진·세이브·i18n·빌드
파이프라인은 `@forge/core` 를 비롯한 공용 패키지로 공유하고, 각 게임은 자체
워크스페이스로 독립 출시. 콘텐츠 팩(테마·에셋), 장르 코어, 플러그인이 모두
확장 슬롯.

## 먼저 읽을 것

Claude 가 이 레포에서 의미 있는 일을 하려면 **반드시** 아래 셋 중 하나는 먼저
읽는다:

1. [`README.md`](README.md) — 첫 화면. quick start 와 구조 맵.
2. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 4계층 케이크, 단방향
   의존성 규칙, "3의 규칙" 승격 프로토콜, `StartGame(config)` 계약,
   `assetsBasePath` 흐름, dev-shell 의 server/client 분리, 알려진 부채.
3. [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — 새 게임·콘텐츠 팩·장르
   코어·플러그인 추가 절차. 자주 하는 실수 섹션 포함.

스펙/plan 기록: `docs/superpowers/specs/` 와 `docs/superpowers/plans/` —
의사결정 과정과 재현 가이드.

## 현재 단계

- `phase-0-complete` — 모노레포 골격 + dev-shell 포털
- `phase-1-complete` — inflation-rpg 이식 (첫 게임)
- `phase-1.5a-complete` — `@forge/core` 선제 contract (ForgeGameInstance,
  exposeTestHooks, createSaveEnvelopeSchema)
- 다음: 게임 #2 브레인스토밍 또는 Phase 1.5b (forge CLI 도구)

## 명령 치트시트

레포 루트에서 실행.

```bash
pnpm install            # 의존성
pnpm dev                # http://localhost:3000 포털. 모든 게임 hot-swap
pnpm typecheck          # 모든 워크스페이스 tsc
pnpm lint               # 모든 워크스페이스 ESLint (계층 boundary 검증 포함)
pnpm test               # 모든 워크스페이스 Vitest
pnpm circular           # madge 순환 의존 검사
pnpm e2e                # 모든 워크스페이스 Playwright
```

특정 게임만:
```bash
pnpm --filter @forge/game-inflation-rpg build:web      # 정적 export → out/
pnpm --filter @forge/game-inflation-rpg build:ios      # Capacitor sync + Xcode
pnpm --filter @forge/game-inflation-rpg build:android  # 동일 Android
pnpm --filter @forge/game-inflation-rpg e2e            # full-game-flow 1개
```

## 절대 어기면 안 되는 원칙 3개

### 1. "3의 규칙" — 구현 코드는 게임 #2 가 실제 쓰기 전까지 승격 금지

"언젠가 쓸 것 같아서" 빈 패키지를 만들지 않는다. 구현을 선제 승격하지 않는다.
반면 **타입·계약**은 구현을 강제하지 않으므로 선제 정의 허용.

상세: [ARCHITECTURE.md §3](docs/ARCHITECTURE.md#3-3의-규칙-승격-프로토콜).

### 2. 단방향 의존성

```
games/* → content packs → genre cores + plugins → 2d-core → (phaser, react, capacitor)
```

역참조·순환 금지. ESLint `boundaries/element-types` 룰과 `madge --circular`
가 CI 에서 강제한다. 우회하지 말고 정상 화살표로 되돌린다.

### 3. 동일 `StartGame(config)` 엔트리

포털과 release 모드가 같은 함수를 호출한다. 게임 코드는 `window.location`
같은 호스트 환경을 가정하지 않는다. 모든 에셋 경로는 `config.assetsBasePath`
에서 파생된다. 테스트 hook 은 `config.exposeTestHooks` 게이트 아래에서만.

## 문서·커밋 컨벤션

### 한국어 문서

- 본문은 **평서문 ~다체** ("이 명령을 실행한다", "패키지는 비어있다").
  격식체(~합니다) 아님, 반말(~해) 아님.
- 전문 용어는 영어 보존: monorepo, workspace, Turbopack, manifest, registry,
  hook, alias, lockfile, pipeline, wrapper, boundary 등.
- 코드 블록, 파일 경로, 명령, 커밋 메시지, 변수명은 영어 그대로.
- 상세: [docs/superpowers/specs/2026-04-18-korean-docs-design.md](docs/superpowers/specs/2026-04-18-korean-docs-design.md).

### Git

- 저자는 **`kwanghan-bae <kwanghan.bae@gmail.com>`**. 이름에 하이픈 (언더스코어
  아님, 공백 아님).
- Local git config 는 이미 이 이름과 이메일로 설정되어 있다. 별도
  `-c user.name=...` / `-c user.email=...` flag 없이 그냥 `git commit` 하면
  된다.
- 세션 시작 시 Claude Code 가 표시하는 다른 이메일(예: 업무용)이 있어도
  **무시하고 위 이름·이메일을 쓴다**. 개인 프로젝트 레포 전반의 일관성을
  유지하기 위함.
- 커밋 메시지는 **영어** (Conventional Commits 유사 형태):
  `feat(core): ...`, `fix(dev-shell): ...`, `docs: ...`, `chore: ...`,
  `refactor(game-inflation-rpg): ...`, `test(core): ...`.
- Phase 완료마다 `phase-N-complete` 태그.

## 자주 헷갈리는 함정들

### IDE 진단의 stale "Cannot find module"

`pnpm install` 후 IDE 의 TypeScript 서버가 pnpm symlink 를 재인덱싱하기 전엔
`Cannot find module '@forge/core'` 같은 가짜 에러가 뜬다. **실제 검증은 항상
툴체인으로**:

```bash
pnpm --filter @forge/core typecheck     # 0 exit 이면 실제로는 문제 없음
pnpm --filter @forge/core test          # 테스트가 통과하면 모듈은 해결됨
```

IDE 진단을 무시하고 툴체인 결과를 신뢰한다.

### `eslint-plugin-boundaries` v6 는 조용히 작동 안 함

v6 에서 `element-types` 룰이 deprecated alias 가 되어 **로그 하나 없이** 모든
위반을 통과시킨다. 이 레포는 **v5 에 고정**. `package.json` 의
`"eslint-plugin-boundaries": "^5.x"` 를 업그레이드하지 않는다.

### `inflation-rpg` 와 `dev-shell` tsconfig 의 strict 완화

upstream 레거시 코드 호환을 위해 두 워크스페이스는 `noUncheckedIndexedAccess`
와 `noImplicitOverride` 를 `false` 로 꺼둠. 신규 패키지 (`@forge/core` 포함)
는 base 의 strict 를 그대로 따른다. 새 게임 패키지를 만들 때 같은 완화를
따라 하지 않는다 — 신규는 strict 유지.

### `apps/dev-shell/next-env.d.ts` 의 토글

Next 16 이 `next dev` 와 `next build` 에 따라 이 파일에 `.next/dev/types/`
vs `.next/types/` 중 하나를 import 로 찍는다. `git status` 가 더러우면:

```bash
git checkout -- apps/dev-shell/next-env.d.ts games/inflation-rpg/next-env.d.ts
```

### Boot.ts **와** Preloader.ts 모두 `assetsBasePath` 를 읽음

포털 모드에서 첫 이미지(로딩 배경)를 Boot 가 로드하므로 Boot 도 registry
fallback 필요. 새 게임 추가 시 한쪽만 처리하면 첫 프레임이 404.

### dev-shell 의 server/client registry 분리

`apps/dev-shell/src/lib/registry.ts` (client: dynamic import 콜백 포함) 와
`registry.server.ts` (server-safe: 매니페스트만) 가 분리되어 있다. Server
component 가 `registry.ts` 를 import 하면 Phaser 가 server bundle 로 끌려
들어가 SSR 단계에서 `window` 부재로 실패. `page.tsx` 계열은 **`registry.server`
만** import.

### 게임 내부 import 은 상대 경로 권장

inflation-rpg 는 `@/game/...` alias 를 쓰고 있고, 이를 위해 dev-shell 의
`tsconfig.json` 과 `next.config.ts` 에 cross-workspace alias 가 걸려 있다.
**신규 게임은 내부에서 상대 경로 사용** — inflation-rpg 는 grandfathered.

## `@forge/core` 현재 상태

- **공개 API** ([`packages/2d-core/README.md`](packages/2d-core/README.md))
  - `GameManifest`, `parseGameManifest` (Zod)
  - `ForgeGameInstance`, `StartGameFn` (타입)
  - `exposeTestHooks`, `StandardTestHookSlots`, `TestHookSlots`
  - `createSaveEnvelopeSchema<T>`, `SaveEnvelopeMeta`
- 테스트: 19 passed.
- **구현 코드는 없음**. 위 API 는 모두 타입/계약 레벨 또는 매우 얇은 유틸.
  실제 `SaveManager`, `EventBus`, `I18nManager` 등 구현은 inflation-rpg 내부
  에 있고 게임 #2 도착 시 승격 예정.

## Claude 행동 선호

- **`using superpowers`** 세션 시작 프롬프트를 사용자가 치면
  `superpowers:brainstorming` 같은 skill 이 로드된다. 이 레포는 superpowers
  스킬 체인 (brainstorming → writing-plans → subagent-driven-development →
  finishing-a-development-branch) 을 따라 개발해왔다. 새 작업도 같은 체인을
  따르도록 기대한다.
- **한국어로 답한다**. 사용자가 모국어 한국어. 반말 OK (사용자와의 채팅).
  문서는 평서문 ~다체.
- **브랜치 작업**: 주요 변경은 feature 브랜치(`feat/...`, `fix/...`,
  `chore/...`, `docs/...`) 에서 하고 `--no-ff` 머지로 main 에 합류.
- **새 게임 스캐폴드 요청이 오면** [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md)
  §1~§11 을 태스크로 쪼개 진행. `docs/CONTRIBUTING.md §12` 는 확장 경로.
- **모든 destructive 작업** (git reset, 파일 일괄 삭제, history rewrite 등)
  은 사용자 명시 확인 후 실행.
- **IDE 진단 vs 툴체인**: IDE 에러가 뜨더라도 먼저 `pnpm typecheck` /
  `pnpm test` 로 실체 확인. 둘이 다르면 툴체인 신뢰.

## 상태 체크 한 줄

새 세션에서 처음 일을 시작하기 전에:

```bash
git log --oneline -5 && git tag --list && git status --short
```

최근 커밋, 완료된 phase 태그, 더러운 파일을 한눈에 본다.
