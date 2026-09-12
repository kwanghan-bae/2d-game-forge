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
- `village/domain.ts`: 기존 호출자를 위한 47줄 compatibility façade. 구현 없이
  아래 direct module의 공개 연산과 타입만 re-export한다.
- `village/domain/contracts.ts`: 공개 결과·preview·cost 계약과 상수
- `village/domain/hero/`: 영웅 자율 행동과 성장·회춘
- `village/domain/facility/`: 시설 preview, 작업, 업그레이드
- `village/domain/expedition/`: 원정 forecast, 명령, 정산
- `village/domain/story/`, `intervention/`, `rewards/`, `settings/`: 남은 공개 명령
- `village/domain/shared/`: `agentTrust`, `guards`, `heroActionClock`, `ids`,
  `resourceMath`, `saveMutation`처럼 책임을 이름으로 드러낸 공용 helper
- `hero/`: 영웅 생명주기와 순수 규칙
- `battle/`: 원정에서 사용하는 전투 계산
- `data/`: 시설·영역·장비·서사 데이터
- `systems/`: 재화·장비·진행 등 독립적인 순수 계산
- `app/`: standalone Next 진입점

게임 외부 호출자는 필요하면 `village/domain.ts` façade를 계속 사용할 수 있다.
production domain module끼리는 direct module을 import하며 façade를 역참조하지
않는다. `utils`나 `common` 같은 범용 dumping-ground module은 두지 않는다.
책임별 회귀 테스트는 `village/domain/__tests__/`의 hero, facility, expedition,
commands, module-boundaries 파일에 둔다.

저장 경계는 `village/save.ts` 하나로 모은다. 현재 canonical key는
`shin-ui-eternal-sponsor-save-v2`이며, 유효하지 않은 저장은 복구 사본을
남긴 뒤 새 저장을 만들 수 있다. 다른 제품이나 과거 키를 자동으로 읽거나
가져오지 않으며 schema 2, clone semantics, 오류와 결과 shape를 유지한다.

RPG 고유 계약은 현재 게임 workspace에 남긴다. 별도 두 번째 게임에서 같은
계약이 실제로 필요하다는 증거가 생기기 전에는 `@forge/core`로 승격하지 않는다.

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

2026-09-12 최종 domain 분해 검증 범위는 기준
`be0b1bcae8bb804bd2f57f6040d44e1a3c5ca081`부터 최종 HEAD
`fc41a055c228e052eec088de4f53ac905b0cf618`까지다. `4fd30c10`은 설계 기준이고
`dfa32ed4`는 이전 검증의 구현 HEAD로, 최종 범위와 구분한다. façade는 47줄이며
구현 선언 검색 결과가 없었다. 게임 typecheck와 233개 파일·2,093개 unit test, root E2E 36개,
production build 3/3 task, workspace typecheck 5/5, lint 4/4가 통과했다.
Madge 직접 실행은 522개 파일, root `pnpm circular`은 build 뒤 527개 파일을
검사해 모두 순환 의존성이 없었다. 최종 범위의 diff check와 현재 status에서
보호된 Paradox 파일 및 `output/`, `tmp/` 변경은 없었다.

active tree의 금지된 역사 자료 경로에서 추적 계획·설계 문서 두 개를 제거한 뒤
필수 제품 정체성 검사 7/7이 통과했다. 삭제한 자료의 내용은 Git 이력에 남으며,
현재 제품 식별자와 canonical 저장 경계는 바뀌지 않았다.

웹 Playwright는 로직·입력·레이아웃을 검증한다. Android 실기기 조작·복귀와
스토어 기능은 별도 장비 검증으로 구분한다.
