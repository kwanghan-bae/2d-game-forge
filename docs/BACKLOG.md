# 우선순위 백로그

상태: **Village domain 분해와 로컬 회귀·제품 정체성 검증, AI 1차 vertical slice, AI-02 지원 에이전트 brain, AI-03A 기억·신념·재계획을 완료**. 실제 신규 사용자 지표와 실기기 검증은 측정 전으로 유지한다. 이후 작업은 사용자의 새 실행 명령과 새 generation 없이는 시작하지 않는다.

| ID / 우선순위 | 해결할 문제 | 합격 조건 | 현재 증거·상태 |
|---|---|---|---|
| OPS-01 / 검증됨 | 중단 뒤 자동 재개 방지 | 로컬 제어 검증 + 오래된 generation·lease 재사용 차단 | 현재 브랜치 `pnpm test:autonomy` 30/30 통과. 실행 상태와 선택적 task budget은 [작업 현황](작업-현황.md) 및 `control status`를 기준으로 하며 제품 사실로 고정하지 않는다. push·예약은 만들지 않음 |
| QA-01 / 검증됨 | 현재 제품 검증 범위 | 현재 게임의 unit/typecheck/build/E2E와 포털 smoke를 각각 통과 | 2026-09-12 실제 실행: 게임 typecheck 종료 0, unit 233개 파일·2,093개 통과, root E2E 36개(포털 4·게임 32) 통과, build 3/3 task 성공(1 cached), workspace typecheck 5/5(3 cached)·lint 4/4(2 cached), circular 527개 파일·순환 없음, 기준 diff check 종료 0. 금지된 active-tree 경로의 추적 역사 문서 두 개를 제거한 뒤 제품 정체성 검사 7/7 통과·종료 0. 실기기 검증은 DEVICE-01에 남김 |
| GAME-01 / 표본 대기 | 신규 첫 30분 루프 입증 | 15분 첫 원정, 30분 내 시설·정책 2종 결정 측정 | 로컬 bounded 계측과 설정 진단 구현. 실제 신규 사용자 표본은 soft launch에서 수집 필요 |
| GAME-02 / 검증됨 | 선택이 결과에 미치는 효과 | 시설·장비·정책이 영웅 행동과 원정 예측·정산에 동일하게 반영 | 15초 자율 판단과 공통 원정 forecast 구현, 현재 게임 회귀 테스트 통과 |
| GAME-03 / 검증됨 | 복귀와 패배 이후 선택 | 8시간 중복 정산 방지, 보스 자동 확정 금지, 패배 원인·추천·재도전 표시 | 도메인·화면·Chromium/iPhone 14 E2E 통과. 실기기 백그라운드 복귀는 DEVICE-01에 남김 |
| DATA-01 / 구현됨 | 목표 지표 측정 | 주요 이벤트와 첫 15/30분 지표를 개인정보 없이 로컬 계산 | 최대 500건·중복 제거·손상 fail-open 구현. 서버 분석과 D1/D7은 이번 로컬 우선 범위에서 제외 |
| AI-01 / 1차 구현됨 | 동일한 규칙형 행동 반복 | 성격·욕구·기억·날씨·정책을 함께 평가하고, 사건 선택이 관계·위협도·사가에 반영 | 결정형 Utility AI, bounded memory, 게임 내 일일 사건 큐, 오프라인 연결, 미해결 사건 자동 행동 정지. game unit 234개 파일·2,099개 테스트, typecheck/lint, E2E 34개(Chromium 17·iPhone 14 17), build 통과. 실기기·실사용자 지표는 미측정 |
| SCHEMA-03 / 기반 구현됨 | AI·세계 상태를 장기 확장 가능한 저장 계약으로 고정 | schema 3 필수 simulation journal, 결정형 tick/seed, 유효한 schema 2의 1회 승격, 손상 저장 원본 보존 | canonical key는 유지하고 `meta.simulation`에 tick·마지막 시각·bounded 사건 처리 저널을 저장. schema 2→3 migration 회귀 포함 |
| AI-02 / 구현됨 | 지원 에이전트가 서로 다른 목표와 관계를 갖지 못함 | 에이전트별 목표·피로·신뢰·스케줄러가 원정·시설·사건 선택에 설명 가능하게 반영 | `meta.ai.agentBrains` additive 확장. 3명별 utility·관계·일정 scheduler, 자동 원정 길잡이 배정, forecast 보정, 사건 관계 변화, Town Hub 설명을 구현하고 회귀 통과 |
| AI-03A / 구현됨 | 행동이 현재 목표만 보고 즉시 바뀌어 경험의 연속성이 약함 | 에이전트별 기억·신념·다단계 계획·중단 횟수가 다음 계획에 반영되고 deterministic replay 가능 | `agentBrains.<agent>.cognition` additive 확장. bounded memory·role-biased beliefs·plan steps·event interruption·schema 3 one-time upgrade를 구현하고 회귀 통과 |
| AI-03 / 장기 | 사건이 단발성으로 끝나고 행동 품질을 측정하기 어려움 | 사건 연쇄, 세계 세력, deterministic replay, 행동 다양성·설명 이해도 평가 | AI-03A 이후. LLM·외부 모델·서버를 제품 범위에 도입하지 않는 경계 유지 |
| DEVICE-01 / 차단 | 실기기 출시 검증 | iOS/Android 조작·복귀·광고 실패·결제 취소/복원/환불 결과 | 장비·스토어 계정이 필요하며 브라우저 에뮬레이션으로 대체할 수 없음 |

다음 실행에서는 `QA-01`의 원격 결과 확인 또는 `DEVICE-01`의 실기기 검증을 AI-03 구현보다 먼저 선택한다. RPG 고유 계약의 core 승격은 별도 두 번째 게임에서 같은 계약이 필요해질 때까지 보류한다. 작업을 시작할 때만 담당·허용 파일·가설·재현 명령·예산을 기록하며, 테스트 존재와 실제 시장 검증을 구분한다.
