# @forge/game-inflation-rpg

forge의 첫 번째 게임인 **신의 마을: 영원의 후원자**를 제공한다. 이전 제품
**신의 마을: 옛 모험**은 `inflation-rpg-legacy` 경로와 `StartLegacyGame()`으로 보존한다.

## 플랫폼

- 웹 (dev-shell 포털 또는 standalone Next export)
- iOS / Android (Capacitor 8)

## 주요 스크립트

- `pnpm --filter @forge/game-inflation-rpg dev` — standalone Next dev 서버
  (`:3100`). 포털 통합 개발은 레포 루트에서 `pnpm dev` 후
  `http://localhost:3000/games/inflation-rpg`를 사용한다.
- `pnpm --filter @forge/game-inflation-rpg build` — Next 정적 export → `out/`.
- `pnpm --filter @forge/game-inflation-rpg build:ios` — Next build + Capacitor
  sync + Xcode 열기.
- `pnpm --filter @forge/game-inflation-rpg build:android` — 동등하게 Android
  Studio 열기.
- `pnpm --filter @forge/game-inflation-rpg test` — Vitest.
- `pnpm --filter @forge/game-inflation-rpg e2e` — Playwright. 현재 게임과 이전
  버전 회귀를 함께 검증한다.
- `pnpm --filter @forge/dev-shell e2e` — 포털의 현재 게임·신의 마을: 옛 모험 경로를 확인한다.

## 모바일 UI 확인

모바일 레이아웃 개발·테스트는 **로컬 브라우저**에서 한다. Capacitor 빌드는
실기기 배포용이다.

```bash
pnpm dev  # http://localhost:3000 포털 실행
```

Chrome DevTools → Toggle device toolbar (⌘⇧M) → iPhone 14 (390×844) 선택.

Playwright 프로필은 입력·레이아웃 검증용이며 실기기, native 결제, 백그라운드
복귀 증거를 대신하지 않는다.

## 공개 export

- `StartGame(config: StartGameConfig): ForgeGameInstance` — 현재 게임 부팅 엔트리.
- `StartLegacyGame(config: StartGameConfig): ForgeGameInstance` — 이전 버전 부팅 엔트리.
- `gameManifest: GameManifestValue` — dev-shell registry가 소비할 매니페스트.

`StartGameConfig`의 필드:

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
│   ├── startGame.ts             # 현재 게임 / 이전 버전 부팅 엔트리
│   ├── types.ts                 # 공용 타입
│   ├── village/                 # 현재 게임 제품 모듈
│   │   ├── VillageApp.tsx
│   │   ├── domain.ts             # 시설·원정·정산 순수 도메인
│   │   ├── save.ts               # canonical schema·offline·legacy import
│   │   ├── legacyCompatibility.ts # 이전 저장·계측 키의 읽기 전용 경계
│   │   └── screens/              # 마을·영웅·원정·사가·설정 화면
│   ├── app/                     # release 모드 Next 셸
│   ├── components/              # PhaserGame.tsx 등 공용 컴포넌트
│   ├── screens/                 # 이전 버전 화면
│   ├── store/                   # 이전 버전 Zustand store
│   ├── battle/                  # Phaser 전투 씬
│   ├── systems/                 # 순수 계산 로직
│   ├── data/                    # 정적 데이터
│   └── styles/                  # 공용 스타일
├── public/assets/               # 큐레이션된 에셋
└── tests/e2e/                   # 현재 게임·이전 버전 Playwright spec
```

## 격리된 호환 표면

workspace/package와 route alias인 `inflation-rpg`, Capacitor `appId`
`com.korea.inflationrpg`, 이전 버전 localStorage 키
`korea_inflation_rpg_save`는 배포 호환을 위해 변경하지 않는다. 현재 게임의
canonical 저장은 `shin-ui-eternal-sponsor-save-v2`이고, 이전 세대의
`shin-ui-eternal-sponsor-v4-save-v1`는 `legacyCompatibility.ts`에서만 읽는다.
