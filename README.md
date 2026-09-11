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

현재 제품은 **신의 마을: 영원의 후원자 V4**이며 V3는 legacy로 보존한다.
자율 개발은 기본 중단이며, 실제 실행 범위와 검증 상태는 현재 상태 문서와 실행 제어기에서 확인한다.

[문서 안내](docs/README.md)에서 시작한다. [현재 상태](docs/작업-현황.md)에 검증 한계를 기록한다.
이전 Phase·cycle은 [역사 기록](docs/archive/2026-09-08-readme-status.md)에서 필요할 때만 읽는다.

## 빠른 시작

요구 사항: Node.js 22 LTS 이상, pnpm 9 (Corepack 권장).

```bash
# 의존성 설치
corepack enable pnpm
pnpm install

# 포털 dev 서버 실행 (http://localhost:3000)
pnpm dev
```

브라우저에서 `http://localhost:3000` 을 열면 게임 셀렉터가 보인다.
기본 제품인 **신의 마을: 영원의 후원자**를 누르면 V4가 부팅된다.
기존 V3는 **조선 인플레이션 RPG**의 `inflation-rpg-legacy` 경로로 별도 실행할 수 있다.

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
pnpm turbo run build --filter=@forge/game-inflation-rpg... # native plugin + game dependency chain
pnpm --filter @forge/game-inflation-rpg build:ios      # Capacitor sync + Xcode
pnpm --filter @forge/game-inflation-rpg build:android  # Capacitor sync + Android Studio
```

## 모바일 UI 확인

모바일 레이아웃 개발·테스트는 **로컬 브라우저**에서 한다. Capacitor 빌드는
실기기 배포용이다.

### 브라우저에서 모바일 뷰 확인

```bash
pnpm dev  # http://localhost:3000 포털 실행
```

Chrome DevTools → Toggle device toolbar (⌘⇧M) → iPhone 14 (390×844) 선택.

### E2E 모바일 레이아웃 테스트 (Playwright)

Playwright 가 iPhone 14 viewport 로 자동 실행한다 — 시뮬레이터 불필요.

```bash
# iPhone 14 프로파일만
pnpm --filter @forge/game-inflation-rpg e2e -- --project=iphone14
# Desktop Chrome 만
pnpm --filter @forge/game-inflation-rpg e2e -- --project=chromium
# 전체 (두 프로파일)
pnpm --filter @forge/game-inflation-rpg e2e
```

### 실기기 빌드 (iOS / Android)

실기기나 스토어 배포가 필요할 때만 사용한다.

| 플랫폼 | 사전 요구 사항 |
|--------|----------------|
| iOS | macOS + Xcode 15+ + CocoaPods (`brew install cocoapods`) |
| Android | Android Studio + JDK 17+ + Android SDK (API 34+) |

```bash
pnpm --filter @forge/game-inflation-rpg build:ios      # → Xcode 에서 Run
pnpm --filter @forge/game-inflation-rpg build:android  # → Android Studio 에서 Run
```

## 디렉터리 구조

```
2d-game-forge/
├── apps/
│   └── dev-shell/            # Next.js 포털. /games/[slug] 라우트로 게임 로드
├── games/
│   └── inflation-rpg/        # 첫 번째 게임 (korea-inflation-rpg 이식)
├── packages/
│   └── 2d-core/              # 공용 게임 계약·세이브 envelope·test hooks·UI token
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
- [docs/작업-현황.md](docs/작업-현황.md) — 현재 작업 범위와 다음 개발 순서.
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
