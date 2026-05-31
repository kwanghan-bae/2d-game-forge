# Cycle 851-853 Plan — system → structure → balance rotation

category: meta

## 한 줄
80-130 gap 신규 날씨 이벤트(system) → death handling 60줄 추출(structure) → 500k+ gold zone death penalty 곡선 재조정(balance).

## 평가 핀포인트
- 게임비평가: Mercenary Offer(C848) 하나로 80-130 gap 의 선택지 다양성은 미흡. 여전히 대부분 자동전투 연속. 스코어 ~30/40 정체의 핵심 원인은 이 구간의 콘텐츠 밀도.
- 스토리작가: 80-130 gap 에 환경 서사가 없음. 전투만 반복되어 분위기 전환점이 부재. 날씨·지형 같은 컨텍스트 이벤트가 idle 에서도 서사적 텍스처를 줄 수 있음.
- 레벨디자이너: EncounterEngine ~2340 줄. gold context(20줄) 보다 death handling(60줄) 추출이 ROI 높음. 500k+ gold zone 에서 death 가 너무 관대하여 후반부 긴장 부족 지속.

## 우선순위
1. **Weather Event: Clear Sky Path** (C851 system) — 80-130 gap 콘텐츠 밀도 부족 3회 이상 지적. Mercenary Offer 이후 2번째 choice event 로 gap 채움.
2. **Extract handleHeroDeath** (C852 structure) — 미추출 블록 중 최대(60줄). EncounterEngine 2200 목표 접근.
3. **High-Gold Death Penalty Ramp** (C853 balance) — 500k+ gold zone death 가 무해한 문제 3회 이상 지적. C850 gamble EV 튜닝의 자연 후속.

---

## 기능 요구사항

### F1. Weather Event: Clear Sky Path (C851 — system)

- **목적**: 80-130 gap 에 비전투 선택 이벤트 1종 추가. 콘텐츠 밀도 향상 + idle 서사 텍스처.
- **동작**:
  - Fight 90-120 구간에서 확률 trigger (chance 0.06, pity: 15 fights without gap event → guaranteed).
  - `pendingChoice` 활용 (C848 인프라 재사용): "맑은 길(Clear Sky)" vs "우회로(Detour)".
  - Clear Sky: 다음 3 fights ATK ×1.15 버프 (sunshine buff). 전투 없는 이동 1 tick 소모.
  - Detour: 즉시 gold ×(1.0 + rng(0.1)) 보상 + 다음 fight 난이도 −10%.
  - Timeout fallback (5초): 자동으로 Clear Sky 선택 (idle 본질 유지).
- **수용 기준**:
  - unit test: Clear Sky 선택 시 sunshineBuff 3 fights 적용 검증.
  - unit test: Detour 선택 시 gold 보상 + 난이도 감소 검증.
  - unit test: timeout fallback 시 Clear Sky 자동 적용 검증.
  - EncounterEngine 추가분 ≤ 25 줄 (event 데이터는 별도 파일).
- **반대 기준 (NOT this)**:
  - UI 구현 아님 — 선택 인터페이스는 기존 `resolveChoice` 재사용.
  - 날씨가 영구 시스템이 아님 — 단일 이벤트 효과 (3 fights 한정).
  - 80-130 gap 외 구간에는 trigger 하지 않음.

---

### F2. Extract handleHeroDeath (C852 — structure)

- **목적**: EncounterEngine 사이즈 감소. death handling ~60줄 블록을 순수 함수로 추출.
- **동작**:
  - L1408 부근의 death handling 로직 (death penalty 계산, revival check, gold loss, streak reset) 을 `handleHeroDeath(ctx): DeathResult` 순수 함수로 추출.
  - ctx interface: `{ heroLevel, heroGold, heroHp, deathCount, hasRevivalItem, rng }`.
  - 반환: `DeathResult { goldLost, streakReset, revived, penaltyApplied }`.
  - EncounterEngine 본체에서 1-line call 로 대체.
  - 기존 동작 100% 보존.
- **수용 기준**:
  - EncounterEngine line count Δ ≤ −50.
  - `handleHeroDeath` unit test ≥ 3 case (일반 death, revival item 보유 시, 고레벨 penalty 스케일링).
  - typecheck PASS, 기존 vitest 전 green.
  - sim smoke 결과 변동 없음 (deterministic output 보존).
- **반대 기준 (NOT this)**:
  - 로직 변경 없음 — 순수 추출 리팩터.
  - gold context(20줄), village visit(40줄) 은 이번 scope 외.
  - death penalty 수치 조정은 C853 에서.

---

### F3. High-Gold Death Penalty Ramp (C853 — balance)

- **목적**: 500k+ gold zone 에서 death 가 무위험인 문제 해결. 후반부 긴장감 복원.
- **동작**:
  - C852 에서 추출한 `handleHeroDeath` 내 penalty 공식 수정.
  - 기존: `penalty = basePenalty` (flat).
  - 변경: `penalty = basePenalty * (1 + goldTier * 0.2)` where `goldTier = floor(gold / 500_000)`.
  - Cap: penalty 가 현재 gold 의 20% 초과 불가 (frustration guard — C850 의 25% 에서 강화).
  - gold < 500k 구간: 변경 없음 (기존 공식 유지).
- **수용 기준**:
  - unit test: gold 1.5M 에서 death penalty 가 gold 200k 대비 ≥ 50% 증가.
  - unit test: cap 20% 동작 검증 (gold 2M, penalty 가 400k 이하).
  - unit test: gold 300k 에서 기존 penalty 와 동일 (regression guard).
  - 기존 sim smoke 의 mid-game 지표 변동 Δ ≤ ±3%.
- **반대 기준 (NOT this)**:
  - 레벨 기반 penalty 아님 — gold 기반 스케일링.
  - 보상 상향 동반 없음 — 순수 penalty 강화.
  - Revival item 확률 변경 없음.

---

## 우선순위 외 backlog
- Gold context block 추출 (20줄) — C852 이후 structure 슬롯에서 처리 가능하나 ROI 낮아 대기.
- Village visit logic 추출 (40줄) — death handling 다음 후보.
- 80-130 gap 3번째 choice event (예: Wandering Sage) — C851 결과 확인 후 다음 system 슬롯.
- RunStats UI 노출 — backend-only constraint 해소 시점까지 보류.
- Late-game 500+ 신규 이벤트 — 현재 이벤트 밀도 개선 후 검토.

## 비고
- **컨셉 가드**: Clear Sky Path 는 idle 본질 유지 (timeout fallback). 날씨는 영구 시스템이 아닌 일회성 이벤트 효과.
- **카테고리 연속 검증**: C848 system → C849 structure → C850 balance → C851 system. 3 연속 동일 없음, 룰 9 안전.
- **의존성**: C853 은 C852(handleHeroDeath 추출)에 의존. C851 은 독립적.
- **EncounterEngine 목표 추적**: ~2340 → C851(+25) → C852(−55) → C853(±5) = ~2315. 2200 목표까지 잔여 ~115줄. gold context + village visit + 추가 블록 2-3회 추출 필요.
- **리스크**: C851 의 sunshine buff 가 80-130 gap 의 전투를 너무 쉽게 만들 가능성. ATK ×1.15 는 보수적 수치이며 3 fights 한정이므로 체감 영향 제한적.
