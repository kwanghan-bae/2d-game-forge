# @forge/game-inflation-rpg

forge 의 첫 번째 게임. 조선 시대 배경의 인플레이션 RPG. Phase 3까지 메타 진행
시스템 완성, Phase 4a MobileUX Layer 적용 완료.

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
- `pnpm --filter @forge/game-inflation-rpg test` — Vitest (103 테스트).
- `pnpm --filter @forge/game-inflation-rpg e2e` — Playwright (full-game-flow +
  full-run + mobile-layout, iPhone 14 / Desktop Chrome 두 프로파일).

## 모바일 로컬 실행

### 사전 요구 사항

| 플랫폼 | 필요한 것 |
|--------|-----------|
| iOS | macOS + Xcode 15+ + CocoaPods (`brew install cocoapods`) |
| Android | Android Studio + JDK 17+ + Android SDK (API 34+) |

### iOS 시뮬레이터 / 실기기

```bash
pnpm --filter @forge/game-inflation-rpg build:ios
# Xcode 에서 디바이스 선택 → Run (⌘R)
# Portrait 전용: Xcode → Target → Deployment Info → Landscape 체크 해제
```

### Android 에뮬레이터 / 실기기

```bash
pnpm --filter @forge/game-inflation-rpg build:android
# Android Studio 에서 디바이스 선택 → Run
# Portrait 전용: AndroidManifest.xml → android:screenOrientation="portrait"
```

### E2E 모바일 레이아웃 테스트

```bash
# iPhone 14 프로파일만
pnpm --filter @forge/game-inflation-rpg e2e -- --project=iphone14
# Desktop Chrome 만
pnpm --filter @forge/game-inflation-rpg e2e -- --project=chromium
# 전체 (두 프로파일)
pnpm --filter @forge/game-inflation-rpg e2e
```

## 공개 export

- `StartGame(config: StartGameConfig): void` — 단일 부팅 엔트리.
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
│   ├── types.ts                 # 공용 타입 (MetaState, RunState 등)
│   ├── App.tsx                  # React 최상위 컴포넌트
│   ├── app/                     # release 모드 Next 셸
│   ├── components/              # PhaserGame.tsx 등 공용 컴포넌트
│   ├── screens/                 # React UI 화면
│   │   ├── MainMenu.tsx
│   │   ├── ClassSelect.tsx
│   │   ├── WorldMap.tsx
│   │   ├── Battle.tsx           # Phaser 캔버스 래퍼
│   │   ├── Inventory.tsx
│   │   ├── Shop.tsx
│   │   ├── StatAlloc.tsx
│   │   └── GameOver.tsx
│   ├── store/
│   │   └── gameStore.ts         # Zustand 스토어 (MetaState + RunState)
│   ├── battle/
│   │   ├── BattleGame.ts        # Phaser.Game 팩토리
│   │   └── BattleScene.ts       # 전투 씬 로직
│   ├── systems/                 # 순수 계산 로직
│   │   ├── bp.ts                # BP 계산
│   │   ├── equipment.ts         # 장비 유틸
│   │   ├── experience.ts        # 경험치 / 레벨업
│   │   ├── progression.ts       # 월드맵 구역 잠금
│   │   └── stats.ts             # 최종 스탯 계산
│   ├── data/                    # 정적 데이터 (캐릭터, 몬스터, 맵, 장비)
│   └── styles/
│       └── game.css             # safe-area, 터치 타겟, scroll-list 유틸
├── public/assets/               # 큐레이션된 에셋
└── tests/
    ├── game/                    # Vitest 103 테스트
    └── e2e/
        ├── full-game-flow.spec.ts
        ├── full-run.spec.ts
        └── mobile-layout.spec.ts  # iPhone 14 E2E (Phase 4a)
```

## 의존성

- runtime: `@forge/core`(workspace), Phaser, React, Next, Capacitor, Zod,
  Zustand, BigNumber.js.
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
  `next.config.ts` 에서 inflation-rpg 의 `src/` 로 alias 가 걸려 있다.
  신규 게임은 동일한 alias 를 만들지 말고 내부에 상대 경로를 사용한다
  (CONTRIBUTING §11 참조).

## 더 읽을 것

- [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) — `StartGame(config)` 계약,
  `assetsBasePath` 흐름, 승격 프로토콜.
- [docs/CONTRIBUTING.md](../../docs/CONTRIBUTING.md) — 새 게임 추가 시 이
  게임을 참고 예시로 사용.
- [Phase 4+5 릴리스 스펙](../../docs/superpowers/specs/2026-04-21-inflation-rpg-phase4-5-release-design.md)
  — App Store 출시 로드맵.
