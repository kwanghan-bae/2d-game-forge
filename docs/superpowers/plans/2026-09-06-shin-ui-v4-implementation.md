# `신의 마을: 영원의 후원자` v4 실행 계획

## 목표

기존 V3를 보존하면서 `games/inflation-rpg/src/v4/`에 로컬 우선 마을 경영형 영원한 영웅 모듈을 구축한다. v4는 기본 진입점으로 실행하고, V3는 명시적인 legacy 진입점과 별도 저장 키로 유지한다.

## 범위와 보호선

- 출시 시설 7개, 지원 에이전트 3명, Realm 3개, 동시 원정 1개만 구현한다.
- v4 저장은 V3 저장과 키·schema·mutation을 공유하지 않는다.
- V3 `CycleControllerV2`, `paradoxSpiral.ts`, 기존 V3 테스트는 v4 구현에서 수정하지 않는다.
- 기존 V3 순수 계산은 adapter를 통해서만 재사용한다.
- 서버·계정·클라우드·PvP·가족/사망 시뮬레이션은 범위 밖이다.

## 단계별 작업

### 1. 타입·정적 데이터

- v4 통화, 시설, 작업, 에이전트, 영웅 snapshot, 원정, 사가, 저장 envelope 타입을 만든다.
- 7개 시설과 3개 에이전트의 출시 정적 데이터를 만든다.
- 3개 Realm, 일반/정예/보스 전투 데이터와 정책 정의를 만든다.

검증: 타입 import smoke test, 정적 데이터 수량·ID 중복 테스트.

### 2. 저장·순수 도메인

- `createInitialV4Save(seed)`를 구현한다.
- `migrateV3HeroSnapshot(input)`을 구현한다.
- `simulateOfflineProgress(save, now)`를 순수 함수로 구현한다.
- 최대 8시간, 온라인 효율 70%, 미래 시각/음수 경과/중복 정산 방지를 적용한다.
- localStorage adapter와 명시적인 V3 가져오기 adapter를 분리한다.

검증: 초기 저장, round-trip, V3 adapter, 1/8시간 offline, 시간 조작, 재화 source/sink 테스트.

### 3. 영웅 runtime·전투·원정

- V3 순수 계산을 감싸는 `V4HeroRuntime` adapter를 만든다.
- 정책별 행동 선택, 원정 자동 진행, 일반/정예/보스 결과를 순수 함수로 구현한다.
- 원정은 한 번에 하나만 진행하며 실패 시 영구 장비/재화 손실을 발생시키지 않는다.

검증: 정책 선택, 전투 성공/실패, 보상, 보스 자동 확정 금지, 원정 round-trip 테스트.

### 4. 시설·에이전트 store

- 고정 hub 슬롯 기반 시설 상태를 만든다.
- 시설별 활성 작업 1개 제한과 작업 시작/완료/취소를 구현한다.
- 에이전트 레벨·신뢰도·피로도·특성·작업 상태만 저장한다.
- 시설 생산량, 작업 시간, 에이전트 보정이 영웅/원정 결과에 연결되게 한다.

검증: 시설 레벨별 생산량, 작업 큐, 에이전트 피로/신뢰도, 재화 불변식.

### 5. 진입점·화면

- `src/v4/startGame.ts`와 v4 `App`을 만든다.
- `StartGame()`은 v4를 렌더링하고 `StartLegacyGame()`은 기존 App을 렌더링한다.
- TownHub, 영웅 상세, 원정, offline 결과, 사가 화면을 만든다.
- 기존 Forge 토큰·Galmuri·Joseon pixel asset을 재사용하고 모바일 390×844를 기준으로 한다.

검증: 신규 저장 → 첫 전투 → 시설 → 장비 → 원정 → offline 결과 E2E, Phaser 중복 생성 방지.

### 6. manifest·legacy·서비스 adapter

- `inflation-rpg` manifest를 v4 제품명으로 변경하고 `inflation-rpg-legacy`를 추가한다.
- v4 광고/IAP adapter를 연결하되 실패 시 진행을 중단하지 않는다.
- 보상형 광고 하루 5회, 오프라인 2배/작업 즉시 완료/개입 충전에만 사용한다.

검증: manifest registry, 저장 키 격리, 광고 실패·결제 취소, legacy 진입.

### 7. 품질 게이트와 커밋

각 작업 단위마다 아래 순서로 실행한다.

1. 실패 테스트 또는 계약 테스트 추가
2. 최소 구현
3. 관련 테스트
4. 전체 game test
5. typecheck/lint/circular/e2e 가능한 범위 확인
6. `git diff --check`와 변경 파일 검토
7. 작업 단위 커밋

기존 baseline 오류와 새 오류는 로그에서 분리한다. 같은 오류가 3회 연속 재현되거나 외부 계정/결제/배포 권한이 필요하면 자동 루프를 멈추고 보고한다.

## 최종 검증 명령

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg test
pnpm --filter @forge/game-inflation-rpg e2e
pnpm typecheck
pnpm lint
pnpm circular
```

## 출시 판정

- 신규 유저가 15분 안에 첫 원정을 시작한다.
- 첫 30분 안에 시설·장비·정책 중 2개 이상을 변경한다.
- 일반 구간 3연속 패배율이 5% 미만이다.
- 8시간 offline 보상 뒤 의미 있는 선택이 노출된다.
- V3 legacy 저장과 v4 저장이 서로 변경되지 않는다.
- 광고/결제 실패가 진행 중단으로 이어지지 않는다.

## 현재 실행 현황 (2026-09-07)

### 완료된 제품 수직 슬라이스

- V4 전용 저장 envelope·schema 1·V3 명시 import adapter·시간 조작 검증을 구현했다.
- V4를 기본 진입점으로 연결하고 V3를 `StartLegacyGame()` 및 `inflation-rpg-legacy` manifest로 보존했다.
- 7개 시설, 3명 지원 에이전트, 시설 작업 큐, 레벨·신뢰도·피로도·전문 보정, 작업 취소 환불을 구현했다.
- 영웅 정책·노화·회춘·훈련·장비 3종·V3 순수 전투 계산 adapter를 연결했다.
- 3개 Realm의 일반·정예·보스 단계, 결정론적 승률 예측·전투, 패배 보호, 보스/다음 Realm 확인 흐름을 구현했다.
- 최대 8시간·70% 효율의 오프라인 정산, 위험 보스 보류, 결과 화면과 선택형 보상 광고를 구현했다.
- TownHub·영웅 상세·원정·오프라인 결과·사가·설정 화면과 모바일 레이아웃 검증을 구현했다.
- 저장 손상 복구 화면, 단조 증가 timestamp, 모바일 44px 터치 타깃과 unknown 장비명 fallback을 보강했다.
- 작업·원정·사가·V3 가져오기 ID의 동일 시각 충돌을 방지하고 중복 사가 ID 저장을 거부한다.
- 명시적 작업·원정·V3 가져오기 이벤트의 과거 action clock은 마지막 저장 시각으로 정규화하고, 정산 경로의 과거 시각은 계속 no-op으로 유지한다.
- 앱 재개(`visibilitychange`·`pageshow`)에서 즉시 정산하고, 직접 호출·오프라인 처리 모두 미래 저장 시각을 차단한다.
- 위험 원정의 조기·비유한 확인 시각은 보류 상태를 해제하지 않으며, 비정상 시각 입력은 저장 가능한 timestamp로 정규화한다.
- 저장 복구 검증에서 훈련·원정의 동시 상태와 영웅 행동 상태 불일치를 거부한다.
- 빈 offline 보상 상태를 명시하고, 비정상 정산 효율이 재화·경험치를 오염시키지 않도록 기본 효율로 제한한다.
- 빈 offline 보상에서는 2배 광고를 노출만 하지 않고 비활성화하며, 훅에서도 광고 provider를 호출하지 않는다.
- 즉시 작업 완료와 개입 충전 async 광고 액션에 per-action 동시 호출 잠금을 두어 중복 광고 소비/상태 덮어쓰기를 막는다.
- 광고 제거 IAP adapter도 동시 구매 요청을 하나의 in-flight Promise로 공유해 중복 결제를 방지한다.
- 보상형 광고 provider 성공 후 usage store가 실패해도 보상은 유지하고 카운터 저장만 best-effort로 처리한다.
- usage store read 예외도 adapter 생성/일자 전환을 중단시키지 않고 0회 복원으로 격리한다.
- 활성 작업·원정의 0초 예약을 저장 복구 단계에서 거부해 진행률 `NaN` 상태를 차단한다.
- 비유한 완료 시각과 미래 저장 시각의 작업/광고 즉시 완료를 no-op 또는 실패로 처리한다.
- 피로도 100인 길잡이의 신규 원정 배정을 도메인에서 차단하고, 원정 화면에 휴식 필요/사용 중 상태를 명시한다.
- 원정 예측 승률도 실제 배정 가능 여부를 따르도록 정리해, 피로한 길잡이의 보정치를 미리 보여주지 않는다.
- 원정 패배 시 출발 준비 비용을 전액 반환해 패배가 영구 재화 손실로 이어지지 않게 한다.
- 오프라인 보상형 재화·개입 충전·다음 Realm 해금은 비유한 또는 저장 시각보다 이전인 action clock에서 no-op 처리한다.
- 원정 진행률·남은 시간 UI는 0초 예약, 비유한 현재 시각에서도 `NaN`/`Infinity`를 노출하지 않는다.
- 마을 시설의 남은 작업 시간도 비유한 완료/현재 시각을 0초로 안전 표시한다.
- 오프라인 결과 모달은 비유한 정산 시간·효율·재화 payload를 0 또는 빈 보상으로 정규화해 내부 숫자를 노출하지 않는다.
- 개입 충전이 3/3이거나 일일 광고가 5/5이면 무효 수익화 버튼을 비활성화한다.
- 개입 충전 도메인도 최대치 도달 시 no-op으로 처리해 우회 호출이 저장 시각을 갱신하지 않는다.
- 장비 레벨 20 상한 이후 제작 보상은 레벨과 영웅 스탯을 추가로 증가시키지 않는다.
- pre-upgrade V4의 중복 장비 ID를 hydration 때 단일 장비·레벨 20 이하로 정규화해 재저장 후 schema가 깨지지 않게 한다.
- 정책·음량·음소거 도메인 입력이 런타임 미지원 값으로 들어와도 기존 유효 설정을 유지해 저장 schema 오염을 막는다.
- 알 수 없는 원정 정책은 재화 차감과 원정 dispatch 전에 거부해 직접 도메인 호출 우회도 안전하게 처리한다.
- 알 수 없는 신의 개입 타입은 충전 소모와 원정 후퇴 전에 거부해 직접 도메인 호출 우회도 안전하게 처리한다.
- 과대한 작업 보상이나 재화 합산이 `Infinity`가 될 경우 해당 보상만 무시해 저장 수치 오염을 차단한다.
- 광고 대기 중 발생한 최신 저장 변경을 `saveRef`로 보존해 즉시 완료·오프라인 2배·개입 충전이 오래된 React 상태를 덮어쓰지 않게 한다.
- V4 영웅 runtime의 비숫자·비유한 회춘 입력은 0년으로 정규화해 snapshot에 `NaN` 나이가 전파되지 않게 한다.
- 미지원 Realm ID는 unlock 확인과 원정 비용 차감 전에 명시적으로 거부한다.
- 전투 adapter의 비숫자 전투 수치와 턴 수는 안전한 기본값으로 정규화해 결과에 `NaN`이 전파되지 않게 한다.
- V4 hook의 동기·비동기 action 모두 최신 `saveRef`를 읽어 연속 입력과 광고 대기 중 상태 덮어쓰기를 방지한다.
- 장비 bonus 계산도 비숫자 레벨을 Lv.1로 fallback해 영웅 공격력·방어력·HP에 `NaN`이 전파되지 않게 한다.
- malformed 영웅 스탯의 전투력·원정 승률 forecast도 0 또는 최소 확률로 제한해 UI에 비유한 수치를 노출하지 않는다.
- 장비 bonus 적용 단계도 비유한 필드를 0으로 무시해 직접 adapter 호출이 영웅 snapshot을 오염시키지 않게 한다.
- 영원의 사가는 최신 200개 기록만 유지해 장기 플레이에서도 localStorage와 기록관 DOM이 무한히 커지지 않게 한다.
- 도메인과 V3 import adapter의 action timestamp도 음수·비유한·MAX_SAFE 초과 입력을 기존 저장 시각으로 정규화해 unsafe save clock을 만들지 않게 한다.
- 전투 adapter의 유한하지만 overflow를 일으킬 수 있는 스탯·피해 합산을 안전한 상한으로 포화시키고, 외부 턴 예산도 100턴으로 제한한다.
- 시설 정산의 malformed 경험치 보상과 기존 영웅 EXP도 1회 상한·레벨업 반복 상한으로 제한해 비정상 저장이 무한 정산 루프를 만들지 않게 한다.
- 시설 레벨이 극단값이어도 작업 산출량·경험치·소요 시간·강화 비용을 유한한 경제 수치로 제한해 UI와 저장 schema 오염을 막는다.
- V3 영웅을 명시적으로 가져올 때 목적지의 진행 중 훈련·원정 행동 상태를 유지해 가져오기 직후 저장 대칭성이 깨지지 않게 한다.
- 시간 역행·미래·비유한 시각에서 신의 개입을 원본 save no-op으로 거부해 잘못된 시계 조작이 충전을 소모하지 않게 한다.
- V3 import adapter가 목적지 V4 save를 깊은 복제해 중첩 재화·시설·작업·에이전트 참조를 공유하지 않게 한다.
- 영웅 runtime의 회춘도 malformed 나이·회춘 횟수·HP 최대값을 유한 범위로 정규화해 adapter 직접 호출의 `NaN` 전파를 차단한다.
- 영웅 runtime snapshot 복제 시 malformed 장비 배열·레벨 map을 정제해 adapter 생성 단계의 iterable/type 오류를 차단한다.
- 장비 보너스 적용 시 malformed 영웅 공격력·방어력·HP·치명타 수치를 정규화하고 음수/overflow 보너스를 차단해 equipment adapter 단독 호출도 유효 상태를 유지한다.
- 장비 정의 lookup은 own-property만 허용해 `__proto__`·`constructor` 같은 상속 키가 장비로 오인되어 `NaN` 보너스를 만드는 경로를 차단한다.
- V3 영웅 명시 import에서 중복 장비 ID를 dedupe하고 장비 레벨을 20 이하로 제한해 v4 저장 schema와 UI를 보존한다.
- V4 브라우저 부팅 E2E에서 기존 V3 저장 키가 변경되지 않는지 Chromium·iPhone 14 양쪽으로 확인한다.
- V3 명시 import의 선택적 방어력·치명타·HP 최대값도 유한 범위로 보정해 손상된 legacy snapshot이 v4에 `NaN`을 유입하지 않게 한다.
- V3 명시 import의 장비 배열은 문자열 항목만 남겨 비정상 payload가 v4 장비 UI와 레벨 map을 오염시키지 않게 한다.
- V3 명시 import의 이름·나이·레벨·EXP·HP·공격력·행동 카운트도 V4 유효 범위로 정규화해 손상된 영웅 snapshot이 저장 복구를 깨뜨리지 않게 한다.
- React StrictMode의 초기 effect 재실행을 1회 정산 guard로 막아 개발 셸에서도 offline 저장 side effect가 중복 실행되지 않게 한다.
- 비동기 보상 광고와 위험 원정 확인이 저장 시각 검증으로 no-op이 된 경우 성공 문구를 표시하지 않고 재시도 안내를 표시한다.
- 보상형 광고 사용량을 일일 상한 범위로 정규화해 비정상 저장값이 UI와 광고 제한을 오염시키지 않게 한다.
- 8시간 오프라인 상한 구간이 이후 수동 저장 시각보다 앞서도 해당 구간의 완료 작업과 원정을 정산하도록 실시간 시각 검증과 분리한다.
- 오프라인 상한 밖의 원정은 조기 해결하지 않고 다음 정산으로 넘겨 과도한 보상·전투 진행을 방지한다.
- 시설 레벨이 저장 가능한 최대 정수에 도달하면 강화 비용을 차감하지 않고 안전하게 중단한다.
- 유효한 증가분이 없는 오프라인 보너스 입력은 예외나 timestamp-only mutation 없이 원본 저장을 유지한다.
- 저장 가능한 최대 정수 근처의 재화 bonus와 영웅 행동 기록을 포화시켜 정상 정산 한 번으로 안전 범위를 넘지 않게 한다.
- 자정 경계에서 진행 중인 보상형 광고를 시작 날짜에 귀속해 새 날짜의 일일 5회 제한을 오염시키지 않는다.
- 합산 전투력이 안전 정수 상한을 넘지 않게 포화시켜 원정 결과 저장이 다시 무효화되지 않게 한다.
- 개입 충전이 3/3이면 보상형 광고 provider를 호출하기 전에 handler에서 차단해 불필요한 광고 소비를 막는다.
- 즉시 완료 대상 작업이 사라진 오래된 handler도 광고 provider를 호출하기 전에 차단해 불필요한 광고 소비를 막는다.
- 광고 제거·보상형 광고 adapter, 광고 실패/결제 취소 비차단 처리를 연결했다.
- 앱이 백그라운드에서 복귀할 때는 온라인 100% 정산과 분리된 오프라인 70% 경로를 사용하고, 숨김 상태의 주기 정산은 건너뛴다.
- 손상 저장에서 새 V4 저장으로 복구한 뒤에도 resume 정산 callback이 새 `storageStatus`를 따라가도록 해 오프라인 진행이 끊기지 않게 한다.
- 기기 저장소를 사용할 수 없는 환경에서도 게임은 계속 진행하되, 앱 종료 시 진행 보존이 불확실하다는 비차단 경고를 표시한다.
- 읽기는 가능하지만 `setItem`이 quota/private-mode 오류로 실패하는 경우도 저장 실패로 감지해 unavailable 경고를 표시한다.
- 최근 원정 패배가 있으면 다음 Realm 해금 문구보다 부족한 능력치·추천 시설·재도전 계획을 첫 화면의 가장 가까운 목표로 우선 표시한다.

### 누적 검증 기록

- 직접 작업 완료·위험 원정 확인도 `Number.MAX_SAFE_INTEGER` 밖의 시각을 거부해 timestamp 정규화가 결제를 우회하지 않도록 고정했다.
- 원정 출발 카드에 보스 승률과 함께 예상 보상 재화를 표시해 출발 전 위험·보상 판단을 완성했다.
- 작업·원정 시작 시 완료 시각이 저장 가능한 정수 상한을 넘으면 재화 차감 없이 원본 저장을 보존한다.
- V4 단위/컴포넌트 테스트: 396개 파일, 3,368개 테스트 통과.
- V4 Chromium·iPhone 14 E2E: 24/24 통과(각 프로젝트 12/12).
- V3 심층·다중 지역 회귀 smoke: 2/2 통과.
- standalone Next production build, game typecheck, lint, circular 검사 통과.
- 시설·에이전트·Realm 정의 lookup을 own-property accessor로 통일해 외부 문자열이 `constructor` 같은 상속 키로 해석되지 않게 했다.
- V4 저장 숫자 필드를 `Number.MAX_SAFE_INTEGER` 이하로 검증해 JSON 재로드 때 정밀도를 잃는 재화·시간·전투 수치가 유효 저장으로 남지 않게 했다.
- legacy `v2-vertical-slice`는 dev-only cycle controller hook으로 영웅을 다음 자연사 직전까지 준비한 뒤 실제 Phaser 도착→CycleResult 경로를 검증하도록 단축했다. Chromium 6.7초, iPhone14 6.2초에 통과하며 제품 런타임에는 hook이 노출되지 않는다.
- 레거시 브라우저 실행에는 `pauseOnInteractiveChoice` 경계를 적용해 선택창이 열린 동안 다음 도착을 보류하고, shrine/danger 선택창에 안정적인 test id를 추가했다. V3-C spend smoke는 새 서버에서 통과했으며 직접 시뮬레이션의 연속 진행 기본값은 유지한다.
- 브라우저 선택 게이트가 멈출 수 있던 미연결 선택 이벤트 4종(first trial, wandering sage, elder's judgment, veteran's challenge)을 `TimedChoiceModal`과 컨트롤러 proxy로 연결하고 idle fallback을 추가했다.
- 브라우저 선택 게이트에서 idle 진행이 멈추지 않도록 danger는 4초 후 자동 전투, shrine은 4초 후 자동 황금 축복으로 안전하게 해소하고 중복 클릭을 차단했다. V3-H·V3-DEF·사가 필터 smoke와 전체 단위 테스트로 회귀를 확인했다.
- V3-H 깊이 회귀가 RNG와 연속 smoke 실행 부하에 따라 50초 안에 Realm을 벗어나지 못하던 간헐 실패를 고정 sleep 대신 실제 `hud-realm` 전환 assertion으로 교정하고, 개발 전용 고정 시드와 선택 모달 polling으로 Chromium/iPhone14에서 결정론적으로 검증했다.
- V2 vertical slice가 보스 선택창에 걸리던 모바일/데스크톱 타이밍 변동을 dev-only fast-forward 후 blocking choice polling으로 보강해 실제 Phaser→컨트롤러→결과 화면 경로를 유지하면서 안정화했다.
- Chromium·iPhone14 각각 short 회귀 17/17(장시간 V2 baseline 제외)을 통과했고, v9 저장 마이그레이션 smoke도 두 프로파일에서 통과했다.
- 장시간 V2 baseline도 dev-only fast-forward 경로로 Chromium 3.4초·iPhone14 2.3초에 통과했으며, 최신 전체 E2E 38/38(Chromium 19/19, iPhone14 19/19, 4.3분)을 통과했다. root `pnpm test`(5개 package), `pnpm build`(game/dev-shell 포함)도 최신 HEAD에서 성공했다.

### 다음 자동 사이클 우선순위

1. 오프라인·개입·원정 결과의 중복 정산 및 앱 재개 경계를 실기기에서 재검증한다.
2. 시설·장비·원정 결과 화면의 남은 하드코딩 문구와 빈 보상 상태를 UX 관점에서 정리한다.
3. 저장 복구·모바일 재개·광고/결제 실패 경계를 실기기 QA 항목으로 확장한다.
4. 각 단위 완료 후 game test, typecheck, lint, circular, 가능한 E2E를 반복 실행한다.
