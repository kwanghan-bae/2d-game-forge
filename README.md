# 2d-game-forge

2D 게임을 찍어내는 프레임워크 + 모노레포 공장입니다. 엔진·세이브·i18n·빌드
파이프라인은 코어 패키지로 공유하고, 각 게임은 자체 워크스페이스로 독립
출시합니다. **콘텐츠 팩(테마·에셋·인물 데이터·BGM 등)은 언제든 새로 추가해
확장**할 수 있습니다 — 첫 콘텐츠 팩은 한국 설화·역사 테마이고, 다른 테마는
새 `@forge/content-*` 패키지를 추가하는 식으로 확장됩니다.

- **주 타겟**: 모바일(Capacitor 8 → iOS / Android)
- **개발·테스트 타겟**: 로컬 브라우저(Next.js 16 정적 export)
- **엔진**: Phaser 3.90, React 19, TypeScript 5
- **모노레포 도구**: pnpm workspaces + Turborepo

## 현재 상태

- **Phase 0 — Bootstrap** 완료 (`phase-0-complete` 태그). pnpm + Turborepo
  monorepo 골격, `@forge/core` 의 `GameManifest` 스키마, `@forge/dev-shell`
  Next.js 포털, Playwright smoke E2E, ESLint 계층 boundary 룰, CI 가 갖춰져
  있다.
- **Phase 1 — inflation-rpg 이식** 완료 (`phase-1-complete` 태그).
  korea-inflation-rpg 의 핵심 플레이 루프가 `games/inflation-rpg/` 워크스페이스로
  이식되었다. 포털에서 `/games/inflation-rpg` 경로로 부팅된다. Vitest 450개,
  Playwright 3개가 통과한다.
- 다음 단계는 **Phase 2 — 두 번째 게임**. 미착수. 두 번째 게임이 도착하면
  inflation-rpg 와 공유되는 부분이 `@forge/core` 또는 장르 코어 패키지로
  승격된다 ("3의 규칙").

## Quick start

요구 사항: Node.js 22 LTS 이상, pnpm 9 (Corepack 권장).

```bash
# 의존성 설치
corepack enable pnpm
pnpm install

# 포털 dev 서버 실행 (http://localhost:3000)
pnpm dev
```

브라우저에서 `http://localhost:3000` 을 열면 게임 셀렉터가 보인다.
"조선 인플레이션 RPG" 를 누르면 게임이 부팅된다.

추가 명령:

```bash
pnpm typecheck   # 모든 워크스페이스 typecheck
pnpm lint        # 모든 워크스페이스 lint (계층 boundary 검증 포함)
pnpm test        # 모든 워크스페이스 vitest
pnpm circular    # madge 순환 의존 검사
pnpm e2e         # 모든 워크스페이스 Playwright
```

특정 게임만 빌드:

```bash
pnpm --filter @forge/game-inflation-rpg build:web      # 정적 export → out/
pnpm --filter @forge/game-inflation-rpg build:ios      # Capacitor sync + Xcode
pnpm --filter @forge/game-inflation-rpg build:android  # Capacitor sync + Android Studio
```

## 디렉터리 구조

```
2d-game-forge/
├── apps/
│   └── dev-shell/            # Next.js 포털. /games/[slug] 라우트로 게임 로드
├── games/
│   └── inflation-rpg/        # 첫 번째 게임 (korea-inflation-rpg 이식)
├── packages/
│   └── 2d-core/              # 모든 게임이 공유할 베이스. 현재는 GameManifest 만
├── docs/
│   ├── ARCHITECTURE.md       # 시스템 설계와 의존성 규칙
│   ├── CONTRIBUTING.md       # 새 게임 추가 절차
│   └── superpowers/          # spec 과 plan 기록
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

각 워크스페이스는 자체 `README.md` 를 가진다.

## 더 읽을 것

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 4계층 패키지 구조,
  의존성 단방향 규칙, "3의 규칙" 승격 프로토콜, dev/release 모드의 동일
  엔트리 원칙.
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) — 새 게임 추가 단계별 가이드와
  자주 하는 실수.
- [apps/dev-shell/README.md](apps/dev-shell/README.md) — 포털 라우팅과
  게임 등록 위치.
- [packages/2d-core/README.md](packages/2d-core/README.md) — 코어 패키지
  현재 공개 API 와 성장 정책.
- [games/inflation-rpg/README.md](games/inflation-rpg/README.md) — inflation-rpg
  게임 빌드·디버그.
- [docs/superpowers/specs/2026-04-17-2d-game-forge-initial-design.md](docs/superpowers/specs/2026-04-17-2d-game-forge-initial-design.md)
  — 초기 설계 스펙 (변경되지 않는 시점-스냅샷).

## 라이선스

미지정. 외부 공개 시점에 결정한다.
