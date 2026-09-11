# 아키텍처

현재 저장소는 공용 Forge 코어와 하나의 게임 워크스페이스로 구성된다. 현재
게임은 React 기반 Village 화면을 단일 부팅 경로로 사용한다.

## 의존성 방향

```text
apps/dev-shell → games/inflation-rpg → @forge/core
```

`@forge/core`는 게임 매니페스트·게임 인스턴스·공용 UI 계약을 제공하고,
게임 고유 규칙을 알지 못한다. 게임 내부의 도메인·데이터·화면은 게임
워크스페이스 안에서만 연결한다.

같은 로직이 실제로 두 게임에서 필요해질 때만 공용 패키지로 승격한다.

## 부팅 흐름

```text
dev-shell 또는 standalone Next
  → StartGame(config)
  → mountGame(config, VillageApp)
  → VillageApp
  → useVillageGame
  → village domain/save/telemetry
```

포털과 standalone/native는 동일한 `StartGame(config)`을 호출한다. 게임은
호스트의 URL을 추측하지 않고 `assetsBasePath`를 통해 이미지를 찾는다.
테스트 hook은 `exposeTestHooks`가 켜진 개발 환경에서만 노출한다.

## 포털 server/client 분리

```text
registry.shared.ts  → 매니페스트만 보유
registry.server.ts  → server component용 조회
registry.ts         → client용 동적 loader
GameMount.tsx       → SSR 차단 wrapper
GameMountInner.tsx  → StartGame 호출과 destroy
```

server component가 client loader를 직접 import하지 않도록 유지한다.

## 게임 내부 경계

- `village/`: 현재 제품의 상태·저장·원정·시설·사가·화면
- `hero/`: 영웅 생명주기와 순수 규칙
- `battle/`: 원정에서 사용하는 전투 계산
- `data/`: 시설·영역·장비·서사 데이터
- `systems/`: 재화·장비·진행 등 독립적인 순수 계산
- `app/`: standalone Next 진입점

저장 경계는 `village/save.ts` 하나로 모은다. 현재 canonical key는
`shin-ui-eternal-sponsor-save-v2`이며, 유효하지 않은 저장은 복구 사본을
남긴 뒤 새 저장을 만들 수 있다. 다른 제품이나 과거 키를 자동으로 읽거나
가져오지 않는다.

## 자산과 Android

포털에서는 `/games/inflation-rpg/assets/...`, standalone에서는 `/assets/...`
를 `assetsBasePath`로 전달한다. Android의 namespace와 applicationId는
`com.shinui.eternalsponsor`이고 표시 이름은 `신의 마을: 영원의 후원자`다.

## 검증

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg test
pnpm --filter @forge/game-inflation-rpg e2e
pnpm typecheck
pnpm lint
pnpm circular
pnpm build
```

웹 Playwright는 로직·입력·레이아웃을 검증한다. Android 실기기 조작·복귀와
스토어 기능은 별도 장비 검증으로 구분한다.
