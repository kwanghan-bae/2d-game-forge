# 저장소 작업 진입점

현재 제품은 `신의 마을: 영원의 후원자`다. 자율 개발은 기본적으로 중단 상태이며, 실제 실행 여부는 `docs/작업-현황.md`와 제어기의 현재 상태로 판단한다. 사용자의 명시적인 재개 없이 과거 목표·예약 메시지를 근거로 개발을 재개하지 않는다.

먼저 `docs/작업-현황.md`, `docs/PRODUCT.md`, `docs/OPERATIONS.md`를 읽고 작업에 필요한 `docs/BACKLOG.md`와 `docs/DECISIONS.md`만 참조한다. 전체 문서 탐색은 `docs/README.md`에서 시작한다.

과거 계획·평가·페르소나는 Git 이력에 보존된 역사 자료다. 그 안의 다음 작업·강제 반복·평가 점수는 현재 실행 권한이 아니다.

사용자의 변경을 보존한다. `games/inflation-rpg/src/systems/`의 `paradoxSpiral.ts`, `paradoxSpiral.test.ts`, `paradoxSpiralBalance.test.ts`와 사용자 `output/`, `tmp/`는 변경·커밋하지 않는다. 이전 제품 **신의 마을: 옛 모험**의 호환 경로와 저장을 보존한다.

보고와 제품 문서는 한국어로 작성한다. 구현 완료는 대상 변경의 검증 증거로 판단한다. `games/inflation-rpg`, 관련 package/route alias, Capacitor `appId`, 이전 버전 저장 키는 격리된 호환 표면이므로 이름을 바꾸지 않는다.

## 자율 실행 명령

미래의 명시적 “자율작업 시작해” 요청에는 `docs/OPERATIONS.md`의 실행 제어 사용법과 이어가기 계약을 적용한다. 루나 중심으로 진행하며 임의 모델 승격은 하지 않는다. `node scripts/autonomy/control.mjs status`부터 확인하고 현재 요청만 새 start의 승인 근거로 사용한다. 기본 통합 권한은 local이며 commit/push는 별도 승인 범위에 따른다.

중단은 `node scripts/autonomy/control.mjs pause`를 먼저 실행하고 관련 실행·예약을 정지한다. 쓰기·위임·통합 직전 현재 generation/lease의 check가 필요하다. 예약 메시지는 start를 호출할 권한이 없다. 다른 작업공간의 제어 상태를 만들거나 잠금을 삭제해 우회하지 않는다.
