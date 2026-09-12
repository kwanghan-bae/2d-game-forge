# 신작 재사용을 위한 도메인 모듈화 설계

- 설계일: 2026-09-12
- 대상 제품: 신의 마을: 영원의 후원자
- 상태: 사용자 승인 완료, 구현 전
- 범위: 현재 게임의 도메인 모듈 분해와 공용 코어 경계 정리

## 1. 목적

현재 게임의 규칙을 신작에 그대로 복사하는 대신, 게임을 모르는 인프라와
게임별 규칙을 분리한다. 동시에 `village/domain.ts`에 모인 시설·영웅·원정·
정산·설정 책임을 공개 유스케이스 단위로 나눠 독립 테스트와 후속 재사용이
가능한 구조를 만든다.

이 설계의 최종 목표는 작은 private 함수까지 기계적으로 파일화하는 것이
아니라, 하나의 공개 책임이 하나의 모듈로 이해되고 교체되는 구조다.

## 2. 목표와 비목표

### 목표

- 현재 게임의 외부 동작과 저장 계약을 유지한다.
- `village/domain.ts`를 구현 없는 호환 façade로 축소한다.
- 시설·영웅·원정·이야기·설정·개입 기능을 독립 모듈로 분리한다.
- 도메인 모듈 간 façade 역참조와 순환 의존성을 금지한다.
- 실제 두 게임에서 공통으로 필요한 계약만 `@forge/core`로 승격한다.
- 현재 게임에만 필요한 RPG 계약은 게임 패키지로 되돌린다.
- `save.ts`, `useVillageGame.ts`, `types.ts`의 후속 분해 순서를 고정한다.

### 비목표

- 이번 설계에서 새로운 게임 규칙, 화면, 저장 schema를 추가하지 않는다.
- 기존 제품의 외부 저장 호환이나 과거 저장 import를 복구하지 않는다.
- 두 번째 게임이 없는데 공용 플랫폼 구현을 선제적으로 만들지 않는다.
- React, Next, Capacitor, 광고 제공자, 특정 게임 엔진을 `@forge/core`에
  도메인 구현으로 넣지 않는다.
- 보호된 Paradox 파일과 사용자 `output/`, `tmp/`를 변경하지 않는다.

## 3. 현재 구조의 문제 신호

설계 시점의 주요 파일 크기와 책임은 다음과 같다.

| 파일 | 규모 | 책임 신호 |
|---|---:|---|
| `village/domain.ts` | 1,624줄 | 시설·영웅·원정·정산·설정·사가를 모두 조합 |
| `village/save.ts` | 618줄 | schema 검증·localStorage·복구·오프라인 정산을 조합 |
| `village/useVillageGame.ts` | 562줄 | React 상태·명령·광고·분석·시간 흐름을 조합 |
| `src/types.ts` | 644줄 | 현재 화면과 순수 RPG 시스템의 타입이 한 파일에 공존 |
| `hero/HeroEntity.ts` | 369줄 | 영웅 상태·성장·장비·전투 계산의 경계가 넓음 |

`@forge/core`에는 lifecycle·manifest·test hook·save envelope처럼 공용성이
높은 계약과 RPG 전용 시스템 계약이 함께 있다. 두 종류를 분리하지 않으면
신작이 현재 게임의 규칙과 무관한데도 불필요한 RPG 타입을 의존하게 된다.

## 4. 목표 모듈 구조

### 4.1 도메인 모듈

```text
games/inflation-rpg/src/village/
├── domain.ts                         # 외부 호환 façade
└── domain/
    ├── contracts.ts                   # 공개 결과·preview 계약
    ├── shared/
    │   ├── guards.ts                  # 값·시간·상태 검증
    │   ├── saveMutation.ts            # clone·touch·이벤트 timestamp
    │   ├── resourceMath.ts            # 지불·지급·포화 산술
    │   └── ids.ts                     # 저장 id·task id 생성
    ├── hero/
    │   ├── autonomy.ts                # 영웅 행동 결정·진행
    │   └── progression.ts             # 경험치·회춘·영웅 power
    ├── facility/
    │   ├── preview.ts                 # 시설·대장간 preview
    │   ├── tasks.ts                   # task 시작·취소·휴식
    │   └── upgrade.ts                 # 시설 upgrade 비용·변경
    ├── expedition/
    │   ├── forecast.ts                # 승률·forecast
    │   ├── commands.ts                # 원정 시작·확인·영역 해금
    │   └── settlement.ts              # 전투·원정·시설 정산 조합
    ├── story/
    │   └── choices.ts                 # story 선택 적용
    ├── intervention/
    │   └── commands.ts                # 개입 charge·사용
    ├── rewards/
    │   └── offline.ts                 # offline resource bonus
    └── settings/
        └── commands.ts                # policy·settings 변경
```

실제 함수 배치는 다음 공개 책임을 기준으로 한다.

- `hero/autonomy.ts`: `getHeroNextAction`, `decideHeroAction`,
  `advanceHeroActions`, `advanceHeroAutonomy`
- `hero/progression.ts`: `rejuvenateHero`, `getVillageHeroPower`와 해당
  변경에만 필요한 경험치 보조 함수
- `facility/preview.ts`: `getBlacksmithEquipmentOutput`,
  `getBlacksmithEquipmentRecommendation`, `getFacilityTaskPreview`
- `facility/tasks.ts`: `startFacilityTask`, `cancelFacilityTask`, `restAgent`
- `facility/upgrade.ts`: `upgradeFacility`, `getFacilityUpgradeCost`
- `expedition/forecast.ts`: `getExpeditionSuccessChance`,
  `getExpeditionForecast`, `getNextRealmId`
- `expedition/commands.ts`: `startExpedition`,
  `confirmPendingExpedition`, `confirmNextRealmUnlock`
- `expedition/settlement.ts`: `completeFacilityTasks`,
  `completeFacilityTaskNow`와 내부 정산·전투 resolver
- `story/choices.ts`: `chooseStoryChoice`
- `intervention/commands.ts`: `grantInterventionCharge`, `useIntervention`
- `rewards/offline.ts`: `grantOfflineResourceBonus`
- `settings/commands.ts`: `setVillagePolicy`, `updateVillageSettings`

기능 모듈은 필요한 private helper를 내부에 둘 수 있다. 여러 기능이 공유하는
helper만 `shared/`로 이동하며, 의미 없는 범용 `utils.ts`는 만들지 않는다.

### 4.2 의존 방향

```text
external consumers
  → domain.ts façade
  → public domain module
  → shared + village types/data/equipment + pure systems
```

- 외부 소비자는 기존 `domain.ts` import를 유지할 수 있다.
- 내부 모듈은 필요한 공개 모듈을 직접 참조하고 façade를 참조하지 않는다.
- `shared/`는 React·브라우저 전역·localStorage·광고·결제를 참조하지 않는다.
- `domain/`은 `save.ts`의 I/O를 참조하지 않는다.
- 여러 기능을 조합하는 코드는 `settlement.ts` 같은 명시적 오케스트레이터에
  둔다.
- 도메인 함수는 현재처럼 입력 save를 기반으로 새 상태를 반환하며,
  호출자가 상태 복제 semantics를 추측하지 않도록 계약에서 명시한다.

## 5. 공용 코어 경계

### 5.1 `@forge/core`에 유지하는 것

- `ForgeGameInstance`, `StartGameFn`
- `GameManifest`, manifest parser
- opt-in test hook 계약
- 데이터 비종속 save envelope
- UI/theme 토큰과 호스트가 공유하는 최소 UI 계약

### 5.2 현재 게임으로 되돌리는 것

`IStatSystem`, `IProgressionSystem`, `CharacterClassBase` 같은 RPG 계약은
현재 게임의 `systems` 또는 `contracts` 영역으로 이동한다. 현재 소비처가 없는
`IBattlePointSystem`은 제거한다. 이 이동은 동작을 바꾸지 않고 타입 import만
정리한다.

### 5.3 향후 승격 후보와 문턱

다음 후보는 현재 게임에 바로 구현하지 않고, 두 번째 소비자가 생겼을 때
승격한다.

- raw key/value 저장 adapter와 JSON document store 계약
- 범용 metric/event sink 계약
- rewarded ad·purchase provider 계약

승격 조건은 두 독립 게임의 실제 사용, 제품 개념의 부재, 브라우저·플랫폼
구현과의 분리, 독립 테스트 가능성이다. 한 게임에서 “나중에 쓸 것 같다”는
이유만으로는 승격하지 않는다.

## 6. 단계별 실행 계획

### 단계 A — domain 분해

1. `domain/contracts.ts`와 `domain/shared/`의 최소 계약을 만든다.
2. 한 기능군씩 구현을 이동하고, façade가 기존 export를 재-export한다.
3. 내부 소비자만 직접 모듈을 참조하도록 정리한다.
4. 기존 `villageDomain.test.ts`를 기능별 테스트로 이동한다.
5. `domain.ts`가 구현을 포함하지 않는지 확인한다.

### 단계 B — core RPG 계약 정리

1. 현재 사용처를 게임 패키지 내부 계약으로 이동한다.
2. 사용처 없는 RPG 계약과 core export를 제거한다.
3. core README와 public export를 갱신한다.

### 단계 C — 저장 경계 분해

```text
village/save/
├── schema.ts        # 현재 schema 검증
├── persistence.ts   # key/value I/O
├── recovery.ts      # 손상 save 복구 사본
└── offline.ts       # 오프라인 정산
```

canonical key·schema·현재 전용 저장 정책을 유지한다. `schema.ts`는 도메인
정책을 검사하지만 I/O를 하지 않고, `persistence.ts`는 도메인 규칙을
추측하지 않는다.

### 단계 D — React hook 분해

`useVillageGame.ts`는 React lifecycle·state binding을 담당하는 얇은 adapter로
축소한다. 명령 조합, monetization bridge, telemetry bridge, refresh/offline
흐름은 독립 모듈로 이동한다. 도메인 모듈을 React hook으로 다시 감싸지 않는다.

### 단계 E — 타입과 잔여 순수 모듈 정리

`src/types.ts`를 현재 Village 계약, RPG 순수 시스템 계약, 호스트 설정으로
bounded context별 분리한다. seasonal·cycle·narration 계열은 각 파일의
실제 소비처와 향후 제품 결정에 따라 유지·제거·별도 패키지 중 하나를
선택한다. 이름이 오래되어 보인다는 이유만으로 기능을 삭제하지 않는다.

각 단계는 독립 커밋으로 검토 가능하게 하고, 단계 사이에 전체 회귀 검증을
실행한다.

## 7. 오류와 데이터 흐름

- 사용자 입력 오류와 도메인 조건 미충족은 기존 typed result의 `ok: false`로
  반환하고 예외를 던지지 않는다.
- 도메인 모듈은 손상 save를 자동 보정하거나 과거 저장을 import하지 않는다.
- 저장 읽기는 현재 schema 검증 결과를 `missing`, `invalid`, `unavailable`,
  `valid`로 전달한다.
- 복구 사본 생성은 best-effort이며 실패해도 새 게임 시작 자체를 막지 않는다.
- 광고·결제·외부 provider 실패는 게임 진행을 영구 pending 상태로 남기지
  않고 실패 결과로 종료한다.
- telemetry 실패는 도메인 명령의 성공·실패를 바꾸지 않는다.

## 8. 검증과 완료 기준

### 도메인 단계 완료 기준

- `domain.ts`는 façade와 re-export만 포함하며 120줄 이하를 목표로 한다.
- 공개 유스케이스 모듈은 하나의 기능 책임을 가지며 400줄을 넘으면 추가
  분해를 검토한다.
- 기능 모듈은 browser global과 React를 직접 참조하지 않는다.
- 기존 게임 typecheck/test/E2E/build가 통과한다.
- workspace typecheck/lint/circular이 통과한다.
- 제품 정체성 검사와 보호 파일 감사가 통과한다.
- 기존 동작을 설명하는 테스트 수를 삭제로 줄이지 않는다. 테스트 이동으로
  파일 수가 바뀌어도 검증 범위는 유지한다.

### 공용 코어 단계 완료 기준

- core public export에 현재 게임 고유 명사와 RPG 규칙이 없다.
- core의 각 계약은 독립 테스트를 갖는다.
- 현재 게임과 호스트의 typecheck/test가 모두 통과한다.
- 두 번째 게임이 없는 동안 새 플랫폼 구현을 추가하지 않는다.

## 9. 주요 위험과 대응

| 위험 | 대응 |
|---|---|
| façade 이동 중 export 누락 | 기존 façade import를 먼저 유지하고 컴파일로 확인 |
| 모듈 간 순환 의존성 | 내부 모듈의 façade import 금지, `madge`를 단계마다 실행 |
| 상태 clone semantics 변경 | 함수 이동만 먼저 하고 입력·출력 snapshot 테스트를 유지 |
| 공용 코어의 조기 추상화 | 두 번째 실제 소비자 전까지 게임 패키지에 보류 |
| 타입 파일 분해 중 숨은 테스트 의존 | import graph와 전체 테스트를 함께 확인 |
| 대규모 일괄 변경의 회귀 | A~E를 별도 커밋과 검증 단위로 실행 |

## 10. 결정

- 첫 리팩토링은 `village/domain.ts`에서 시작한다.
- 함수 단위 재사용을 목표로 하되 private helper의 기계적 파일화를 피한다.
- 공용화는 구현보다 계약을 먼저 만들고, 실제 두 번째 소비자가 생길 때만
  승격한다.
- 현재 제품은 출시 전이며 외부 저장 호환 계약이 없으므로 저장 호환을 위한
  과거 경로를 다시 만들지 않는다.
