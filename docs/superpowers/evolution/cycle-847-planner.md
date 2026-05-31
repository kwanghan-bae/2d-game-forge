# Cycle 848-850 Plan — system → structure → balance rotation

category: meta

## 한 줄
Player Agency 첫 도입(system) → ATK multiplier block 추출(structure) → death penalty 곡선 튜닝(balance).

## 평가 핀포인트
- 게임비평가: 이벤트가 전부 자동 해결되어 플레이어 개입감 0. 선택지 부재가 idle 이상의 방치감 유발. (~30/40 정체 원인 #1)
- 스토리작가: 이벤트 결과가 일방적 — 선택 분기가 없어 서사적 긴장 형성 불가. consolation 추가(C847)는 결과 완충일 뿐 '결정'이 아님.
- 레벨디자이너: EncounterEngine 2320 줄 — ATK multiplier context block(88 줄)이 가장 큰 미추출 단위. death penalty 가 후반부 너무 관대해 위험 부담 부족.

## 우선순위
1. **Player Agency: Choice-Routed Event** (C848 system) — 3 회 연속 평가 핀포인트. 우선순위 1 확정.
2. **Extract tickAtkMultiplierContext** (C849 structure) — EncounterEngine 사이즈 감소 최대 ROI (88 줄 단일 블록).
3. **Death Penalty Curve Steepening** (C850 balance) — 후반부 위험 부담 부족 직접 해결.

---

## 기능 요구사항

### F1. Choice-Routed Event (C848 — system)

- **목적**: 플레이어 에이전시 도입. 자동 해결 일변도 탈피.
- **동작**:
  - 기존 event 중 **Merchant Gamble** 또는 **Sparring Grounds** 1 종을 choice-routed 로 전환.
  - event 발생 시 `pendingChoice: { options: [A, B], timeout: number }` 필드를 state 에 기록.
  - timeout(예: 5 초) 내 선택 없으면 기존 자동 해결 fallback (idle 본질 유지).
  - controller 의 `resolveChoice(optionIndex)` 메서드 추가 — UI 는 이번 scope 외, 테스트에서 호출.
  - 선택지에 따라 결과 분기: 예) Merchant → "위험 도박(고보상/고위험)" vs "안전 구매(저보상/무위험)".
- **수용 기준**:
  - `resolveChoice` 호출 시 결과가 option 에 따라 분기됨을 unit test 로 검증.
  - timeout 경과 후 자동 fallback 이 동작함을 unit test 로 검증.
  - EncounterEngine 에 `pendingChoice` 관련 추가 줄 수 ≤ 30 줄.
- **반대 기준 (NOT this)**:
  - UI 레이어 구현 아님 (backend-only constraint 준수).
  - 모든 event 를 choice-routed 로 바꾸지 않음. 1 종만.
  - 선택이 게임 밸런스를 극단적으로 바꾸지 않음 (consolation/cap 유지).

---

### F2. Extract tickAtkMultiplierContext (C849 — structure)

- **목적**: EncounterEngine 사이즈 감소. 단일 최대 미추출 블록(88 줄) 제거.
- **동작**:
  - L781-869 의 ATK multiplier context 계산을 `tickAtkMultiplierContext(state): AtkMultiplierContext` 순수 함수로 추출.
  - 반환값은 readonly interface (`AtkMultiplierContext`).
  - EncounterEngine 본체에서 해당 블록을 1-line 호출로 대체.
  - 기존 테스트 green 유지.
- **수용 기준**:
  - EncounterEngine 본체에서 해당 88 줄이 1-line import + call 로 대체됨.
  - `tickAtkMultiplierContext` 에 대한 unit test ≥ 2 case (기본 배율, 버프 적용 배율).
  - typecheck PASS, 기존 vitest 전 green.
- **반대 기준 (NOT this)**:
  - 로직 변경 없음 — 순수 추출 리팩터.
  - gold context block(20 줄)은 이번 scope 외.

---

### F3. Death Penalty Curve Steepening (C850 — balance)

- **목적**: 후반부(레벨 500k+) death 가 거의 무해한 문제 해결. 위험-보상 텐션 복원.
- **동작**:
  - death penalty 공식에 레벨 구간별 스케일링 추가: `penalty = basePenalty * (1 + levelTier * 0.15)` (levelTier = floor(level / 200000)).
  - cap: penalty 가 현재 골드의 25% 초과 불가 (frustration guard).
  - 기존 저레벨(< 200k) 구간은 변경 없음.
- **수용 기준**:
  - level 600k 에서 death penalty 가 level 100k 대비 ≥ 40% 증가함을 unit test 검증.
  - penalty cap(25%) 이 동작함을 unit test 검증.
  - 기존 저레벨 테스트 결과 불변.
- **반대 기준 (NOT this)**:
  - death 시 레벨 리셋/영구 손실 같은 극단적 페널티 아님.
  - 보상 증가 동반 없음 — 순수 penalty 강화.

---

## 우선순위 외 backlog
- Gold context block 추출 (20 줄) — C849 이후 자연 후속, 단 ROI 낮아 대기.
- Village visit logic 추출 (40 줄) — 동일.
- Death handling section 추출 (60 줄) — C850 balance 이후 다음 structure 슬롯에 적합.
- RunStats UI 표시 — backend-only constraint 해소 시점까지 보류.
- Late-game 신규 event 추가 — Agency 도입 후 choice-routed event 2 호 후보.

## 비고
- **컨셉 가드**: choice 는 timeout fallback 으로 idle 본질 유지. 선택 안 해도 게임 진행됨.
- **카테고리 연속 검증**: C845 system → C846 structure → C847 balance → C848 system. 3 연속 동일 없음, 룰 9 안전.
- **리스크**: `pendingChoice` state 추가 시 save/load 호환성 — optional field 로 처리, 없으면 무시.
- **EncounterEngine 줄 수 목표**: 2320 → ~2235 (C849 후). Agency 추가분(~30) 상쇄하여 순감 ~55 줄.
