# @forge/game-inflation-rpg

**신의 마을: 영원의 후원자**의 현재 게임 패키지다. 출시 전 개발 중이며,
Android를 우선 대상으로 한다. 웹은 동일한 로직을 빠르게 검증하는 개발
표면으로 사용한다.

## 플랫폼과 명령

- 웹 포털: 루트에서 `pnpm dev` 후 `/games/inflation-rpg`
- standalone 웹: `pnpm --filter @forge/game-inflation-rpg dev`
- 단위 테스트: `pnpm --filter @forge/game-inflation-rpg test`
- 타입체크: `pnpm --filter @forge/game-inflation-rpg typecheck`
- 웹 E2E: `pnpm --filter @forge/game-inflation-rpg e2e`
- Android: `pnpm --filter @forge/game-inflation-rpg build:android`
- iOS: `pnpm --filter @forge/game-inflation-rpg build:ios`

Playwright는 로직·입력·레이아웃 검증용이다. 실기기 조작, 백그라운드 복귀,
광고와 결제 동작을 대신하지 않는다.

## 공개 경계

- `StartGame(config)` — 포털과 standalone/native가 공유하는 단일 부팅 엔트리
- `@forge/game-inflation-rpg/game` — 부팅 엔트리 package subpath
- `gameManifest` — dev-shell이 소비하는 매니페스트

`StartGameConfig`는 `parent`, `assetsBasePath`, `exposeTestHooks`를 받는다.
테스트 hook은 개발 환경에서만 활성화한다.

## 현재 구조

```text
games/inflation-rpg/
├── src/
│   ├── index.ts              # 매니페스트와 공개 export
│   ├── startGame.ts          # 단일 게임 부팅
│   ├── mountGame.ts          # React root 생명주기와 테스트 hook 경계
│   ├── village/              # 현재 마을·영웅·원정·사가 도메인과 화면
│   ├── app/                  # standalone Next 셸
│   ├── data/                 # 게임 데이터와 서사
│   ├── hero/                 # 영웅 생명주기·순수 규칙
│   ├── battle/               # 현재 원정에서 사용하는 전투 계산
│   ├── systems/              # 공유 가능한 순수 계산 시스템
│   └── styles/               # 공통 스타일
├── public/assets/            # 현재 화면 이미지
├── public/sounds/            # 현재 오디오
└── tests/e2e/                # 현재 게임 Playwright 흐름
```

## 저장과 Android 식별자

- canonical 저장 키: `shin-ui-eternal-sponsor-save-v2`
- Android `applicationId`/namespace: `com.shinui.eternalsponsor`
- 표시 앱 이름: `신의 마을: 영원의 후원자`

출시 전 제품이므로 과거 실행 경로, 저장 키, 세대별 호환 계층을 제공하지
않는다. 저장 계약을 바꿀 때는 [제품 기준서](../../docs/PRODUCT.md)와
[현재 상태](../../docs/작업-현황.md)를 함께 갱신한다.
