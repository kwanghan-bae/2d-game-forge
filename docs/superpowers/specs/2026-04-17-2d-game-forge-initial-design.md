---
title: 2d-game-forge Initial Design
date: 2026-04-17
status: approved (initial). Phase 1 완료 후 framing 일부 보완 (2026-04-18).
---

# 2d-game-forge — 초기 설계 스펙

## §0 개요

**이름**: `2d-game-forge` (약칭 **forge**).

**한 줄 요약**: 2D 게임을 찍어내는 프레임워크 + pnpm + Turborepo 모노레포.
엔진·세이브·i18n·빌드 파이프라인은 코어 패키지로 공유하고, 각 게임은
독립 앱으로 배포한다. **콘텐츠 팩(테마·에셋·인물 데이터·BGM 등)은 언제든 새로
추가해 확장**할 수 있다 — 첫 콘텐츠 팩은 한국 설화·역사 테마이지만, 다른
테마(로마/판타지/스페이스 등)는 새 `@forge/content-*` 패키지로 추가하는 방식.
장르도 마찬가지: 첫 장르는 RPG 이고, 퍼즐·플랫포머·idle 등은 새 장르 코어
패키지로 추가된다.

**주 타겟**: iOS / Android (Capacitor 래핑).
**테스트 타겟**: 로컬 브라우저 (Next.js export).
두 타겟이 같은 게임 엔트리 코드를 공유한다.

### 목표 (do)

- **재사용 최대화**: 엔진 부트스트랩, 세이브, i18n, HUD 기반, 입력, 모바일 빌드
  파이프라인, E2E 훅을 공통 패키지로. 테마 콘텐츠(스프라이트·BGM·인물 데이터)도
  콘텐츠 팩으로 공유 가능.
- **증식 쉬움**: 새 게임 = 새 워크스페이스 → `@forge/*` 임포트 → 에셋·밸런스·고유
  시스템만 작성.
- **확장 자유**: 새 테마, 새 장르, 새 플러그인은 각각 `@forge/content-*`,
  `@forge/<genre>-core`, `@forge/<plugin>` 패키지를 추가하는 방식으로 무한 확장.
- **발견 기반 추출**: "1개일 땐 게임 안에. 2개째에 실제로 쓰이면 패키지로 승격."
  과잉 추상화를 구조적으로 금지.
- **웹 개발, 모바일 출시**: 로컬 브라우저에서 즉시 플레이되고 동일 코드가 Capacitor로
  iOS/Android 빌드된다.

### 비목표 (don't)

- 범용 2D 엔진 재발명 안 함. Phaser 3 래핑만 한다.
- 비주얼 에디터/노코드 툴 안 만든다. 코드 + 데이터 파일 중심.
- 게임을 병렬 구현 안 한다. 순차: inflation-rpg 이식 → 두 번째 게임 → 세 번째 게임.
- Phase 0~1 에 `packages/*` 를 선제적으로 채우지 않는다. **의도적으로 비워둔다.**
- 특정 테마(한국)나 장르(RPG)에 프레임워크를 묶지 않는다. 첫 두 결정은
  순서일 뿐, 제약이 아니다.

### 성공 기준

기준을 Phase 별로 분리한다. 각 기준은 해당 Phase 완료 시점에 충족되어야 한다.

**Phase 1 완료 (이 스펙의 주요 스코프)**

1. korea-inflation-rpg 가 forge 내부에서 핵심 플레이 루프가 원본과 동일하게
   작동한다 (선별된 Vitest 100~150 + Playwright full-game-flow 1개 통과).
2. `pnpm dev` 실행 후 포털에서 inflation-rpg 가 로드되고 수동 플레이가 가능하다.
3. inflation-rpg 가 자체 `appId`, 아이콘, 스플래시로 iOS / Android 빌드를
   `pnpm --filter` 명령으로 낼 수 있다 (로컬 Xcode / Android Studio 기준).

**Phase 2 완료 (게임 A 도착 후, 별도 스펙/플랜에서 다룸)**

4. 게임 A(퓨전 역사 RPG) 구현 시 최소 하나 이상의 대형 시스템 (전투, 인플레이션,
   세이브 중)이 `packages/*` 에 실존하고 두 게임이 이를 임포트한다.

**Phase 3 완료 (게임 B 도착 후, 별도 스펙/플랜에서 다룸)**

5. 포털 한 탭에서 inflation-rpg / 게임 A / 게임 B 간 전환이 즉시 가능하다.
6. 각 게임이 독립된 `appId`, 아이콘, 스플래시로 iOS / Android 빌드를 낸다.

---

## §1 레포 구조와 패키지 아키텍처

### 디렉터리 레이아웃

```
2d-game-forge/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json              # 루트 (스크립트 프록시만)
├── tsconfig.base.json        # 공통 TS 설정 (strict, ES2022, bundler)
├── .github/workflows/        # CI
├── docs/superpowers/specs/   # 이 문서를 포함한 설계 문서
│
├── apps/
│   └── dev-shell/            # Next.js 포털. /games/[slug] 라우트
│
├── games/
│   ├── inflation-rpg/        # 1번 타자 (korea-inflation-rpg 이식)
│   │   ├── src/
│   │   ├── public/assets/
│   │   ├── capacitor.config.ts   # appId: com.korea.inflationrpg
│   │   ├── next.config.ts        # output: 'export'
│   │   ├── tests/
│   │   └── package.json
│   ├── fusion-history-rpg/   # 게임 A (Phase 2)
│   └── idle-folklore/        # 게임 B (Phase 3)
│
├── packages/                 # "3의 규칙" 통과한 것만 존재
│   ├── 2d-core/              # 부트·EventBus·SaveManager·i18n·Capacitor·E2E훅
│   ├── 2d-rpg-core/          # 전투·스탯·스킬·인벤토리·상점 (RPG 계열)
│   ├── 2d-idle-core/         # 오프라인 수익·업그레이드 트리
│   ├── economy-inflation/    # 장르 독립 플러그인 (인플레이션 수식)
│   └── content-korean-folklore/  # 한국 설화·인물·스프라이트·BGM·폰트·i18n
│
└── tooling/                  # 필요해지면 추가
    └── create-game/          # `pnpm forge new <genre> <name>` (미래)
```

### 패키지 네임스페이스

- `@forge/core`
- `@forge/rpg-core`
- `@forge/idle-core`
- `@forge/economy-inflation`
- `@forge/content-korean-folklore`
- `@forge/dev-shell` (apps/)
- `@forge/game-inflation-rpg`, `@forge/game-fusion-history-rpg`,
  `@forge/game-idle-folklore` (games/)

### 레이어 계층 (4-layer cake)

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

### 의존성 방향 규칙 (MUST)

- **단방향만 허용**:
  ```
  games/* → content packs → genre cores + plugins → 2d-core → (phaser, react, capacitor)
  ```
- `2d-core` 는 장르 코어를 모른다.
- 장르 코어는 특정 게임을 모른다.
- 플러그인(`economy-inflation` 등)은 장르 코어를 모르고 `2d-core` 만 의존한다.
  장르 코어가 플러그인을 옵션으로 통합한다.
- 콘텐츠 팩은 코드 의존을 최소화한다 (데이터·에셋 위주). 필요한 타입은
  `2d-core` 또는 관련 장르 코어에서 가져온다.
- 역방향/순환 임포트는 CI 에서 실패시킨다 (eslint boundaries + madge --circular).

### Day 1 패키지 초기 상태

- `2d-core`: **빈 껍데기**. README + `src/index.ts` 만. inflation-rpg 작동에 불필요.
- `2d-rpg-core`: **존재하지 않음**. 게임 A 기획 전까지 만들지 않음.
- `economy-inflation`: **존재하지 않음**. 게임 A 가 쓰기 전에 분리하지 않음.
- `content-korean-folklore`: **존재하지 않음**. 두 번째 한국 테마 게임이 동일
  자원을 요구할 때 분리.
- inflation-rpg 내부의 `InflationManager`, `SaveManager` 등은 복사된 채로 있다가
  게임 A 가 요구하면 그때 승격.

### 공용 설정

- `tsconfig.base.json`: strict, target ES2022, moduleResolution bundler.
- 각 패키지는 extends + `paths` 로 확장.
- Turborepo 파이프라인: `build`, `test`, `typecheck`, `lint`, `e2e`.
  의존성 그래프 기반 캐시.

### 버전 / 릴리스

- 초기에는 단일 버전 (모든 패키지 `0.1.0`).
- 외부 배포 없으므로 changesets / npm publish 는 YAGNI.
- 필요 시 changesets 도입.

---

## §2 게임 수명 주기 — 개발 모드 vs 릴리스 모드

### 개발 모드 (통합 포털)

```
pnpm dev
  ↓
apps/dev-shell (Next.js, localhost:3000)
  ↓
/                           → 게임 셀렉터
/games/inflation-rpg        → inflation-rpg 로드
/games/fusion-history-rpg
/games/idle-folklore
```

- `apps/dev-shell/src/app/games/[slug]/page.tsx` 가 동적 import 로
  `games/<slug>/src/game/main.ts` 의 `StartGame` 을 부른다.
- 각 게임은 매니페스트를 내보낸다:
  ```ts
  export const gameManifest: GameManifest = {
    slug: 'inflation-rpg',
    title: '조선 인플레이션 RPG',
    StartGame,
    assetsBasePath: '/games/inflation-rpg/assets',
  };
  ```
  포털이 매니페스트를 읽어 메뉴를 구성한다.
- Phaser 인스턴스는 라우트 이동 시 `destroy(true)` (korea-inflation-rpg 의
  `PhaserGame.tsx` 패턴 유지).
- 한 개의 `pnpm dev` 가 포털을 띄우고 Turborepo 가 의존 패키지 watch 를 자동
  연결한다.

### 릴리스 모드 (게임별 독립 앱)

각 `games/*` 워크스페이스는 자체 빌드 타겟을 가진다.

| 타겟 | 명령 | 결과물 |
|------|------|--------|
| 웹 | `pnpm --filter @forge/game-inflation-rpg build:web` | `games/inflation-rpg/out/` (정적) |
| iOS | `pnpm --filter @forge/game-inflation-rpg build:ios` | Capacitor sync → Xcode |
| Android | `pnpm --filter @forge/game-inflation-rpg build:android` | Capacitor sync → Android Studio |

- 각 게임의 `next.config.ts`: `output: 'export'`, `basePath` 없음 (루트).
- 각 게임의 `capacitor.config.ts`: 자체 `appId`, `appName`, `webDir: 'out'`.
  아이콘·스플래시는 `games/<name>/resources/` 아래.

### 동일 엔트리 원칙 (MUST)

포털과 릴리스가 **같은 `StartGame` 함수**를 호출해야 한다.

1. **환경 독립성**: 게임 코드는 `window.location`, 절대 경로, 혹은 호스트 페이지
   구조를 가정하지 않는다. 모든 에셋 경로는 매니페스트의 `assetsBasePath` 또는
   `import.meta.url` 기준 상대경로로 로드한다.
2. **매니페스트 기반 부팅**: 부팅 시 필요한 정보(에셋 베이스, 초기 씬, i18n 로케일,
   저장 네임스페이스)는 `StartGame(config)` 의 인자로 주입된다. 포털과 릴리스는
   config 만 다르게 넘기고 엔트리는 같다.
   - 현재 korea-inflation-rpg 의 `StartGame(parent: string)` 시그니처는 이 원칙을
     만족하지 않으므로 이식 시 `StartGame(config: StartGameConfig)` 형태로
     **변경**된다. `parent` 는 `config.parent` 로 흡수된다.
   - `StartGameConfig` 의 구체 필드 설계는 구현 플랜에서 확정한다.
3. **저장 네임스페이스**: `@forge/core` 의 `SaveManager(namespace)` 패턴. 포털
   모드에서도 게임 간 세이브가 충돌하지 않는다.
4. **전역 테스트 훅 격리**: `window.gameState` 같은 훅은 개발/테스트 모드 플래그
   아래에서만 노출 (`exposeTestHooks({...})` 헬퍼). Capacitor 릴리스 빌드에서는
   no-op.

이 네 규칙이 지켜지지 않으면 포털과 릴리스가 발산하여 공장이 무너진다.

### CI 파이프라인 (초기)

- PR: `turbo run typecheck test lint` (모든 패키지·게임).
- PR: `turbo run e2e --filter=games/*` 에서 **스모크 레벨 E2E 만** 실행
  (전체 플로우는 nightly).
- main 머지 후: nightly 로 전체 Playwright + 번들 크기 체크.
- 모바일 빌드는 초기엔 로컬에서 (Xcode / Android Studio). CI 자동화는 나중.

---

## §3 이식 전략과 승격 리듬

### Phase 0 — 부트스트랩 (1~2 일)

1. 루트에 `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, 루트
   `package.json`.
2. `apps/dev-shell/` 에 Next.js 최소 골격 (셀렉터 + `/games/[slug]` 라우트).
3. `packages/2d-core/` 를 빈 패키지로 생성.
4. CI: typecheck + lint.

**산출물**: `pnpm dev` 로 포털이 뜸. 아직 게임 없음.

### Phase 1 — inflation-rpg 핵심 이식 (3~6 일, 큐레이션 포함)

korea-inflation-rpg 를 통째로 가져오지 않는다. **최소 플레이 루프 + 가치 있는
불변식**만 가져온다.

**코드 선별 — 유지**

- 메인 플레이 루프에 실제로 호출되는 씬:
  `Boot → Preloader → MainMenu → ClassSelect → WorldMap → BattleScene →
  InventoryScene → GameOver`.
- 핵심 매니저: `GameState`, `SaveManager`, `InflationManager`, `StatManager`,
  `DataManager`, `EventBus`.

**코드 선별 — 버림**

- 실험 코드, 주석 처리된 기능.
- `suggest_csv/`, `suggest_catalog.txt` 등 R&D 잔재.
- 미사용 유틸, 사용하지 않는 `scripts/`.
- 현재 런타임 도달이 불가능한 클래스.

**에셋 선별**

- 유지 기준: "포털에서 메인메뉴 → 직업 선택 → 전투 1회 → 세이브/로드 → 종료"
  플로우에 필요한가.
- 유지: 4직업 스프라이트, 핵심 몬스터 약 10 마리, 메인 바이옴 1~2개 타일셋,
  필수 UI, 핵심 BGM / SE, i18n 한/영.
- 버림: 미사용 애니메이션 프레임, 대체 BGM, 실험 타일, preview 류.

**테스트 선별 — 게임이 실제로 망가지는 불변식만**

- **유지 (Vitest, 100~150 개 수준)**: `InflationManager`, `StatCalculator`,
  `SaveManager.migration`, `Monsters` 밸런스, `KarmaManager`,
  `ReincarnationManager`, `SkillManager`, `GameState.migration`, `SkillData`,
  `ClassData`. 수학·저장·밸런스 규칙.
- **유지 (Playwright, 1 개)**: `full-game-flow.spec.ts` 만.
- **버림**: 모든 `*.ui.test.ts`, `_deprecated/`, smoke 가 커버하는 중복 E2E
  (`battle.spec.ts`, `inventory.spec.ts`, `inventory-shop.spec.ts`,
  `save-load.spec.ts`, `game-over.spec.ts`, `gameplay-simulation.spec.ts`,
  `basic-verification.spec.ts`, `game_flow.spec.ts`), 구현 디테일 테스트.

**이식 기계적 절차**

1. korea-inflation-rpg 전체를 `games/inflation-rpg/` 로 복사
   (`.git`, `node_modules`, `.next`, `out`, `.worktrees`, `android`, `ios`,
   `coverage`, `playwright-report` 제외).
2. 위 선별 기준으로 파일을 삭제 / 정리.
3. `package.json` 정리: 루트 공통 의존성은 루트로 올리고 게임 고유 의존성만 남김.
   이름은 `@forge/game-inflation-rpg`.
4. Next.js export 구성 유지. 포털이 `dynamic(() => import(...))` 로 로드.
5. `capacitor.config.ts` 유지 (릴리스 빌드용).
6. 남긴 테스트가 전부 통과하도록 경로·baseURL 조정.

**정지 조건**: 선별된 테스트가 그린이고 포털에서 플로우가 수동 확인된다.

**산출물**: 포털에서 inflation-rpg 핵심 플레이 가능. `packages/*` 는 여전히
비어있다. 이것이 의도된 상태.

**트레이드오프**: 안전망(테스트 수)이 얇아진다. 대신 승격 시 "이 테스트가
가치 있나" 가 자동으로 필터된다.

### Phase 2 — 게임 A 도착 & "승격" 시작

게임 A(퓨전 역사 RPG, 인플레이션 RPG 컨셉) 기획이 시작되면
`games/fusion-history-rpg/` 워크스페이스를 만들고 필요한 조각을 **요구 기반으로**
승격한다.

**승격 규칙 (Promotion Protocol)**

- 게임 A 가 기능 X 를 필요로 함.
  - inflation-rpg 에 동등 기능 **있음 + 두 게임이 같은 의미로 사용** → 승격.
  - 있음 + 다른 의미로 사용 → 양쪽 변종 유지. 3번째 게임이 요구할 때 재검토.
  - 없음 → 게임 A 안에 local 구현. 승격 하지 않음.

**승격 절차 (mechanical)**

1. 코드와 테스트를 inflation-rpg 에서 `packages/<적절 계층>/src/` 로 **이동**
   (복사 아님).
2. 양쪽 게임이 `@forge/<pkg>` 에서 import 하도록 경로 교체.
3. 해당 패키지 아래로 테스트를 옮기고 inflation-rpg 쪽엔 smoke 만 남긴다.
4. 커밋 하나에 `promote: X to @forge/<pkg>` 로 기록.
5. Playwright full-game-flow 통과 확인. 실패 시 승격 롤백.

**승격 우선순위**: 지금 결정하지 않는다. 게임 A 스펙에서 파생.

### Phase 3 — 게임 B 도착

- `packages/2d-rpg-core` 가 형태를 갖춘 뒤 방치형(B) 착수.
- `packages/2d-idle-core` 신규 생성. `2d-core`, `economy-inflation` 재활용.
- B 요구에 맞추기 위해 `2d-core` 가 수정될 수 있다. 역방향 압력을 받아들인다.

### 안티패턴 (금지)

- Phase 0~1 에서 "언젠가 쓸 것 같아서" 빈 `2d-rpg-core` 만들기 → **금지**.
- 게임 A 기획 전에 `SaveManager` 선제적 승격 → **금지**.
- 승격과 동시에 "더 나은" API 로 리디자인 → **분리**. 먼저 그대로 이동,
  다음 PR 에서 리팩터.

---

## §4 테스트·품질 전략

### 테스트 계층과 소재지

| 계층 | 도구 | 위치 | 역할 |
|------|------|------|------|
| 패키지 유닛 | Vitest | `packages/<pkg>/tests/` | 해당 패키지 순수 로직 |
| 게임 유닛/통합 | Vitest | `games/<name>/tests/` | 게임 고유 로직 + 패키지 조합 |
| 포털 스모크 | Playwright | `tests/e2e/smoke/` | 포털에서 각 게임 부팅 & 메인메뉴 진입 |
| 게임 E2E | Playwright | `games/<name>/tests/e2e/` | 전체 플레이 플로우 |

- Phase 1 직후에는 거의 전부 `games/inflation-rpg/tests/` 에 남는다.
- 승격 시 Vitest 파일도 함께 `packages/*/tests/` 로 **이동**.

### Playwright 구성

- 루트에 포털용 config 1개 (`playwright.config.ts`).
- 게임별 config 1개씩 (`games/<name>/playwright.config.ts`), 기존 `baseURL` 을
  포털 라우트로 재지정.

### E2E 훅 표준화

- 기존 `window.gameState`, `window.currentScene` 등은 `@forge/core` 의
  `exposeTestHooks({...})` 헬퍼 아래로 이동.
- Capacitor 릴리스 빌드에서는 no-op.
- 개발/테스트 모드 플래그 (`process.env.NODE_ENV !== 'production'` 또는 명시적
  env var) 에서만 노출.

### 품질 게이트 (CI)

- PR: `turbo run typecheck test lint` → 모든 패키지·게임 통과 필수.
- PR: `turbo run e2e --filter=games/*` → 게임별 E2E 의 smoke 만.
- main 머지 후 nightly: 전체 Playwright + 번들 크기.
- 타입체크로 의존성 방향 규칙을 강제 (역참조 시 컴파일 실패).

### 추가 검증 장치

- **의존성 방향 린트**: `eslint-plugin-boundaries` 또는 경량 커스텀 스크립트로
  `packages/2d-core/**` 가 `packages/2d-rpg-core/**` 를 import 하면 CI 실패.
  Phase 0 부터 도입.
- **순환 참조 탐지**: `madge --circular` 를 CI 에 추가.
- **번들 크기 스모크**: 각 게임 `.next/` export 크기 기준치 ±20% 초과 시 경고.

### 로컬 편의

- `pnpm dev` → 포털.
- `pnpm --filter @forge/game-inflation-rpg test` → 해당 게임만.
- `pnpm forge promote <file>` (Phase 2 이후 추가) → 승격 스크립트
  (파일 이동 + import 치환 + 테스트 이동).

### 문서·컨벤션

- 각 패키지 루트에 `README.md`: 한 줄 목적, 공개 API, 예시.
- 각 게임 루트에 `README.md`: 슬러그, 플랫폼 대상, `@forge/*` 의존 목록.
- 설계 변경은 `docs/superpowers/specs/` 에 새 스펙 추가. 이 문서는 초기 스펙
  으로 박제.

---

## §5 외부 관계

### korea-inflation-rpg 원본 레포

- forge 이식 후 **아카이브 상태로 유지**. 삭제하지 않음.
- README 상단에 "forge 로 이전됨" 안내 추가 (이 작업은 원본 레포에서 수행).
- 신규 개발은 forge 에서만. 원본 레포의 브랜치/이슈는 동결.

### 버전 관리

- forge 는 새 git 레포로 초기화. main 브랜치.
- 이 설계 스펙이 첫 커밋 포함 대상.

---

## §6 요약 — 핵심 결정 10 개

1. **pnpm workspaces + Turborepo** 모노레포.
2. **4 레이어 케이크**: `2d-core` → 장르 코어 + 플러그인 → 콘텐츠 팩 → 게임.
3. **의존성 단방향 규칙 MUST**, CI 강제.
4. **하이브리드 배포**: 개발은 통합 포털(`/games/[slug]`), 릴리스는 게임별 독립 앱.
5. **동일 `StartGame` 엔트리**: 포털과 릴리스가 같은 함수 호출. 환경 의존 제거.
6. **Phase 0~1 에 `packages/*` 의도적으로 비움**. 과잉 추상화 금지.
7. **"3의 규칙" 기반 승격**: 2개 게임이 실제로 쓸 때만 패키지로 올림.
8. **이식은 큐레이션**: 핵심 플레이 루프 + 수학·저장 불변식만 가져옴.
   Vitest 100~150 / Playwright full-game-flow 1개.
9. **인플레이션은 장르 독립 플러그인** (`economy-inflation`). RPG 와 방치형 모두
   재사용.
10. **한국 설화 콘텐츠 팩** (`content-korean-folklore`) 은 두 번째 한국 테마 게임이
    요구할 때 분리. Phase 1 에는 inflation-rpg 내부.
