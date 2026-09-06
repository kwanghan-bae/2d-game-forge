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
