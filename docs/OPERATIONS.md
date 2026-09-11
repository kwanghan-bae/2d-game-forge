# 자율 개발 운영 규칙

## 권한과 중단

자율 개발의 기본 상태는 일시정지다. 현재 실행 여부와 승인 범위는 [현재 상태](작업-현황.md)와 `control status`로 확인한다. 새 자동화·모델 설정·예약 실행은 별도 승인 없이 활성화하지 않는다.

- 사용자의 명시적 재개 승인과 승인 범위를 확인한 경우에만 개발을 진행한다. 과거 목표·예약 메시지·RESUME·자식 작업 완료는 승인으로 취급하지 않는다.
- 중단 요청을 받으면 신규 배정·수정·커밋·push를 멈추고, 관리 중인 작업과 예약 실행을 확인해 가능한 수단으로 정지한다. 미저장 사용자 변경을 되돌리지 않는다. 정지 확인이 불가능한 작업은 숨기지 않고 보고한다.
- “이번 커밋까지”는 해당 작업만 끝내라는 뜻이다. 후속 작업으로 이어가지 않는다.
- 문서상 상태는 안내다. 실제 제어 상태는 Git 공통 디렉터리의 `forge-autonomy/state.json`에 두며 파일이 없으면 중단으로 취급한다. 아래 제어기를 거치지 않은 외부 프로세스·에이전트까지 강제로 통제하는 보안 장치는 아니다.

## 승인 후 자율 판단 범위

승인된 제품 범위 안의 구현·재현 가능한 버그·밸런스 실험은 매번 사용자에게 묻지 않는다. 보수적이고 되돌릴 수 있는 선택은 이유를 남기고 진행한다. 제품 방향 확대, 비용·외부 서비스 도입, 저장 호환성 파괴, 데이터 삭제, 보호 파일 변경은 별도 승인이 필요하다. commit·push·merge도 해당 실행에 부여된 권한 안에서만 한다.

보호 대상: `games/inflation-rpg/src/systems/paradoxSpiral.ts`, `paradoxSpiral.test.ts`, `paradoxSpiralBalance.test.ts`(모두 같은 디렉터리). V3 기존 변경과 테스트를 보존하고, 사용자 `output/`, `tmp/`를 수정·커밋하지 않는다.

## 루나 중심 역할 계약

향후 승인된 실행은 루나를 기본 후보로 사용한다. 실제 모델 선택 가능 여부를 확인하며, 다른 모델로 조용히 승격하지 않는다. 이번 문서는 모델 설정을 변경하지 않는다.

| 역할 | 입력 | 출력과 권한 |
|---|---|---|
| 진행 관리자 | 현재 상태·백로그·승인 범위 | 가장 큰 병목 하나 선정, 범위 고정, 유일한 통합 담당 |
| 구현자 | 문제·합격 조건·허용 파일·관련 코드 | 변경과 재현 명령. 자신의 작업을 최종 승인하지 않음 |
| 검증자 | 합격 조건·diff·검증 대상 커밋 | 통과/반려/미검증, 실행 증거와 남은 위험 |
| 플레이 평가자 | 실행 가능한 빌드·목표 흐름 | 플레이 병목과 재현 단계. 플레이 변경 또는 마일스톤에서만 호출 |

모든 역할을 항상 병렬 호출하지 않는다. 동시 구현자는 기본 1명이며, 분리된 파일·작업공간에서 독립 작업임이 확인될 때만 확대한다. 검토자는 구현자의 자기평가 없이 먼저 합격 조건을 검토한다. 같은 모델의 역할 분리는 독립적 품질 보증이 아니므로 실행 증거가 필수다. 도구가 역할 분리를 지원하지 않으면 순차 검토로 표시하고 독립 검증으로 과장하지 않는다.

위임 입력은 작업 ID·문제·목표·비목표·파일 범위·합격 조건·예산·중단 조건만 전달한다. 전체 대화와 수백 개 문서를 복제하지 않는다. 반환은 판정·변경·증거·위험·필요 결정으로 제한한다.

## 반복 루프와 비용

권한 확인 → 현재 Git/실행 상태 확인 → 병목 하나와 측정 가능한 가설 선택 → 구현 → 검증/반려 → 승인된 통합 → 상태 갱신 → 다음 작업.

- 사용자의 “자율작업 시작해”는 이 운영 범위에서 중단 지시·안전 차단·계정 사용량 한도까지 계속 개선하라는 승인으로 해석한다. 작업 수 상한은 기본 없음이다. 사용자가 별도 작업 수·시간·토큰 제한을 지정하면 그것을 우선한다. 비용 추가 구매나 상위 모델 전환은 승인에 포함하지 않는다.
- 권장 점검 주기는 3개 작업 또는 60분이다. 점검마다 사용자에게 재승인을 요구하지 않는다. 제어기는 선택적 작업 수 상한만 강제하며 토큰·금액·시간 예산은 실행 플랫폼과 진행 관리자가 확인해야 한다. 한도 도달 시 자동 결제·사용량 reset을 하지 않는다.
- 같은 원인의 수정·검증 실패가 2회 반복되면 가설을 재검토한다. 완료 보고가 연속 3회 failure/no-change이면 제어기가 실행 전체를 blocked로 전환한다. 이 상태에서 다른 백로그로 우회하지 않고 원인과 재개에 필요한 판단을 보고한다. 권한·저장 안전성·통합 CI 장애도 우회하지 않는다.
- 경계값 방어 작업은 실제 입력 경로·재현 사례·보호할 불변식 중 근거가 있어야 한다. 커밋 수, 테스트 수, 페르소나 점수는 작업 목표가 아니다.
- 개선 근거가 없으면 무변경 결론을 허용한다. 의무적인 UI/밸런스 순환이나 새 콘텐츠 생산으로 빈 시간을 채우지 않는다.

## 검증과 통합

관련 회귀 테스트를 먼저 실행한다. 제품 변경 통합 전에는 게임 typecheck/test/E2E/build, workspace typecheck/lint/circular 및 영향받은 공용 테스트를 검증한다. 명령은 실제 package scripts를 확인한다.

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg test
pnpm --filter @forge/game-inflation-rpg e2e
pnpm turbo run build --filter=@forge/game-inflation-rpg...
pnpm typecheck
pnpm lint
pnpm circular
```

문서 전용 변경은 링크·diff·내용 일관성을 검증하며 게임 전체 테스트를 불필요하게 반복하지 않는다. 모든 결과에 대상 SHA(미커밋이면 기준 SHA와 diff), 실행 명령·날짜·종료 결과를 연결한다. 캐시 결과는 캐시로 표시한다.

승인된 브랜치 작업과 단일 통합 담당을 사용한다. 동일 후보 SHA의 CI를 확인한 뒤 다음 통합을 진행한다. main CI 실패 중 기능 커밋을 쌓지 않는다. 현재 CI의 dev-shell E2E가 게임 전체 E2E를 대신한다고 가정하지 않는다. 이 규칙이 실제 CI에서 강제되는지는 별도 검증 대상이다.

모바일 에뮬레이션은 실기기/iOS Safari/native 결제 증거가 아니다. 시뮬레이션은 입력·시드·표본·실제 플레이와의 차이를 적는다. 자기 평가 만점으로 미측정 KPI를 통과 처리하지 않는다.

## 원격 보고와 문서 수명

사용자가 요청한 보고 주기와 완료·실패·필수 결정 시에만 요약한다. 보고를 위한 새 예약 작업은 별도 승인 없이 만들지 않는다. 요약은 플레이에서 달라진 점, 검증 증거, 남은 위험, 다음 작업, 필수 결정의 5항목으로 한다. 변화 없는 알림은 반복하지 않는다.

핵심 문서 5개를 갱신하고 cycle별 계획·대화록·만점 평가를 새로 만들지 않는다. 상세 로그는 CI/테스트 산출물을 링크한다. 중요한 설계 변경만 결정 기록에 추가한다. 완료 백로그는 최근 5개까지만 요약하고 오래된 상세는 Git 이력에서 찾는다. 테스트 숫자 갱신만을 위한 커밋은 만들지 않는다.

## 실행 제어 사용법 — 루나가 수행할 절차

제어 코드: [control.mjs](../scripts/autonomy/control.mjs), [run.mjs](../scripts/autonomy/run.mjs). Node 기본 라이브러리만 사용한다. `status`/`check`는 읽기 전용이며 일반 실행에서는 `--state-dir`를 지정하지 않는다. Git 공통 디렉터리를 사용하므로 같은 저장소의 worktree끼리 잠금을 공유한다. 별도 clone/다른 기기는 공유하지 않는다.

| 사용자 명령 | 처리 |
|---|---|
| 자율작업 시작해 | 현재 요청을 승인 근거로 새 generation 시작. 루나 중심 역할·백로그·검증 루프 실행 |
| 커밋까지 자율작업 시작해 | 위 절차 + `integration=commit`. push/merge 승인은 아님 |
| 메인 반영·푸시까지 자율작업 시작해 | 위 절차 + `integration=push`. 검증·단일 통합·보호 파일 규칙 유지 |
| 중단해 / 일시정지 | 즉시 `pause`, 관리 중 작업 중단 및 관련 예약 비활성화 |
| 이번 커밋까지만 | `pause --mode after-task`, 이미 승인된 현재 작업만 검증·커밋 후 `finish`. 추가 push는 별도 승인 없으면 금지 |
| 상태 알려줘 | `status`와 Git/검증 결과 읽기만. 재개하지 않음 |

“시작해”만으로 commit/push를 추가 승인한 것으로 추정하지 않는다. 기본 통합 권한은 local이다. 기존 실행과 동시 writer가 있으면 덮어쓰거나 자동으로 lease를 빼앗지 않는다.

```bash
node scripts/autonomy/control.mjs status
```

명시적인 시작 요청을 받은 루나는 위 응답의 generation을 `--expected`에 그대로 넣는다. `--approval`은 현재 사용자 요청을 추적할 메시지 식별자 또는 날짜와 요청 요약이다. 아래 대문자 값은 실제 응답값으로 치환한다. 자동 예약 프롬프트가 `authorize-start` 또는 `start`를 호출해서는 안 된다.

```bash
node scripts/autonomy/control.mjs authorize-start --approval USER_REQUEST_REF --expected CURRENT_GENERATION
# 위 응답의 state.startAuthorization.id를 START_AUTHORIZATION_ID로 보관한다.
node scripts/autonomy/control.mjs start --authorization START_AUTHORIZATION_ID --approval USER_REQUEST_REF --expected CURRENT_GENERATION
node scripts/autonomy/control.mjs claim --generation RUN_GENERATION --owner COORDINATOR_ID --task GAME-01
node scripts/autonomy/control.mjs check --generation RUN_GENERATION --owner COORDINATOR_ID --lease LEASE_ID --action edit
```

`authorize-start`는 명시적인 사용자 재개 요청을 확인한 신뢰된 coordinator 경계에서만 호출한다. authorization은 현재 generation에 묶인 일회성 ID이며 10분 뒤 만료된다. `start`는 그 ID·승인 reference·`--expected`가 모두 일치할 때만 실행하고 성공 즉시 authorization을 소비한다. `status`의 pending authorization은 조정·감사를 위한 메타데이터일 뿐이다. 저장소 제어기는 호출자가 사람인지 암호학적으로 판별할 수 없으므로, nonempty approval reference는 인증 증명이 아니다. 예약 메시지는 `authorize-start`와 `start`를 모두 호출할 수 없으며, 고정 generation의 `status`를 확인하고 불일치하면 비활성화한다.

작업 선택 후 `claim`의 lease ID를 보관한다. 수정·위임·검증·통합 직전 `check`를 실행하며, 실패하면 쓰기를 중단한다. lease는 30분이며 현재 작업 중 10분마다 `renew`로 연장한다. 만료는 자동 재배정하지 않는다. 작업자를 확인하고 중단한 뒤 명시적 재승인으로 복구한다.

예약 실행에서 만료 lease를 발견하면 조용히 계속 대기하지 말고 해당 예약을 비활성화하고 복구 필요를 한 번 보고한다. 잠금 파일이 남아 명령이 실패하면 자동 삭제하지 않는다. 관리 작업을 먼저 중단하고 파일과 프로세스를 확인한 뒤 복구한다.

```bash
node scripts/autonomy/control.mjs renew --generation RUN_GENERATION --owner COORDINATOR_ID --lease LEASE_ID
node scripts/autonomy/run.mjs --generation RUN_GENERATION --owner COORDINATOR_ID --lease LEASE_ID --action verify -- pnpm --filter @forge/game-inflation-rpg test
node scripts/autonomy/control.mjs finish --generation RUN_GENERATION --owner COORDINATOR_ID --lease LEASE_ID --outcome success --evidence "대상 SHA 또는 diff; 검증 명령; 결과; 독립 검토 근거"
node scripts/autonomy/control.mjs pause
```

`finish` 결과가 running이면 다음 유효 백로그를 선택한다. `failure`/`no-change`가 연속 3회면 blocked로 전환한다. 치명적 CI·권한 장애는 `block --reason`으로 즉시 차단한다. 숫자를 채우기 위해 success를 허위 기록하지 않는다. `start --max-tasks N`은 요청된 작업 수 제한이며, 미지정은 중단/차단까지 계속이다.

`run`은 shell 없이 명령을 실행하고 250ms 간격으로 권한을 확인한다. 중단·lease 만료 시 자신이 만든 프로세스 그룹만 종료한다. 승인 거부·취소 종료 코드는 125다. 이미 발생한 파일 변경·원격 push는 되돌리지 않는다. 직접 실행한 shell, 별도 에이전트, apply_patch에는 OS 수준 강제가 적용되지 않으므로 호출 직전 check와 에이전트 interrupt/close를 병행해야 한다. `--action`과 승인 문자열은 신뢰된 진행 관리자가 제공하며 인증 장치가 아니다.

## 대화가 끝난 뒤 이어가기

제어기는 상태·잠금·명령 취소를 제공할 뿐, 모델을 호출하는 daemon이 아니다. 미래의 명시적 시작 요청 시 루나는 사용 가능한 제품의 장기 목표/동일 작업 예약 기능으로 이어가기를 연결한다. 스케줄링 도구가 없으면 한 턴 밖의 자동 지속은 준비되지 않았다고 보고하며 임의 cron·무한 shell·다른 모델로 우회하지 않는다.

예약 실행이 필요하면 기존 동일 목적 예약을 먼저 찾고, 현재 작업의 heartbeat 하나만 유지한다. 새 작업을 계속 생성하지 않는다. 예약 프롬프트에는 실제 RUN_GENERATION을 고정하고 다음 계약을 넣는다:

> 이 저장소의 control status와 고정 generation을 확인한다. 상태가 running이 아니거나 generation이 다르면 개발하지 않고 이 예약을 비활성화한다. `authorize-start` 또는 `start`를 호출하거나 현재 generation을 새로 받아 재승인으로 취급하지 않는다. lease가 있으면 중복 구현하지 않는다. 유효한 경우 운영 문서와 백로그에서 한 작업을 claim하여 루나 역할 계약으로 실행·검증한다. 변경 없는 상태 알림은 생략하고 의미 있는 결과·실패·필수 결정만 알린다.

중단 시 저장소 pause를 먼저 적용하고 해당 heartbeat를 비활성화한다. 다시 시작할 때만 새 generation으로 기존 예약을 명시적으로 갱신한다. 앱 예약 연결 자체는 이번에 활성화하지 않았고 실제 루나 장기 실행 E2E는 미검증이다.

로컬 파일 예약 작업은 컴퓨터와 앱이 실행 중이어야 한다. 플랫폼 사용량 한도와 접근 권한도 적용된다. 따라서 “무한”은 사용 가능한 실행 환경에서 승인된 개선을 계속한다는 뜻이며 영구 무중단 보장은 아니다. [공식 예약 작업 안내](https://learn.chatgpt.com/docs/automations?surface=app)

## 이번 구축 체크리스트

문서 수를 늘리지 않기 위해 실행 제어 작업 계획과 결과를 이 문서에 통합한다.

- [x] 핵심 문서 5개와 역사 자료의 읽기 경계를 정리한다.
- [x] `control.test.mjs`에서 기본 중단·승인·단일 lease·중단 후 오래된 실행 거부를 먼저 검증하고 `control.mjs`를 구현한다.
- [x] `run.test.mjs`에서 취소 시 명령 쓰기가 발생하지 않는지 먼저 검증하고 `run.mjs`를 구현한다.
- [x] 루나 읽기 전용 검토의 재현 가능한 결함을 회귀 테스트로 고정한다.
- [x] `pnpm test:autonomy`와 CI 테스트 단계를 연결한다. 게임 코드는 수정하지 않는다.
- [ ] 실제 루나 시작 요청 이후 앱의 이어가기·원격 중단·새 generation 재개를 검증한다. 이번에는 실행하지 않는다.
