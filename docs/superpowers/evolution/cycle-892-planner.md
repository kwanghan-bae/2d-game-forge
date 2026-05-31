# Cycle 892 Planner — C893–C895 계획

category: system (C893) → structure (C894) → balance (C895)

## 컨텍스트

| Cycle | Category  | 주요 변경                                       |
|-------|-----------|------------------------------------------------|
| C890  | system    | Last Stand Challenge (fight 400-600)            |
| C891  | structure | ConsequenceResolver 추출 (MidGameEventResolver 325→277 LOC) |
| C892  | balance   | Last Stand EV rebalance + VT priority in overlap |

**직전 비평가 지적 (C889, 3 회 규칙 적용):**

1. `NarrativeGenerator.forChoiceEvent` / `forConsequenceEvent` — C888 에서 작성, 테스트 커버 존재하나 **프로덕션 코드에서 호출 0 회**. CycleControllerV2 는 `EVENT_NARRATION` 레지스트리 경유 하드코딩 텍스트 사용. 사가(saga) 에 choice/consequence 이벤트의 풍부한 나레이션이 반영되지 않는다.
2. `VETERANS_TRIAL_GREEDY_EXP_PENALTY` — `constants-events.ts:412` 에 정의, 사용처 0. dead constant.
3. EncounterEngine **2,671 LOC** — `*Remaining` 필드 40 개 이상 + `tickSimpleDurations()` 35 줄. buff duration 추적이 engine 본체에 산재해 있어 가독성·테스트 격리 모두 저하.

지적 ①②는 2 회 등장 (C888 신규, C889 비평) → backlog 유지 대상이나, ①은 "작성했으나 미연결"이라는 명백한 incomplete wiring 이므로 system cycle 에 적합. ③은 C853 planner 에서도 DurationBuffManager 추출 제안 → **3 회 이상** → 우선순위 1.

---

## C893 [system] — NarrativeGenerator choice/consequence wiring + dead code 제거

### 한 줄
choice/consequence 이벤트의 saga 나레이션을 NarrativeGenerator 경유로 연결하고, dead constant 를 제거한다.

### 평가 핀포인트
- **게임비평가**: forChoiceEvent/forConsequenceEvent 가 test-only 코드. 프로덕션 saga 에 choice event 풍미가 없다.
- **스토리작가**: 5 개 player choice + 2 consequence 의 나레이션이 EVENT_NARRATION 하드코딩 — NarrativeGenerator 의 age 기반·style 기반 변형이 사용되지 않는다.
- **레벨디자이너**: VETERANS_TRIAL_GREEDY_EXP_PENALTY dead constant 가 혼란 유발.

### 우선순위
1. **Wire forChoiceEvent into CycleControllerV2** — EVENT_NARRATION 의 accept/decline 텍스트를 NarrativeGenerator.forChoiceEvent 로 대체하여 age 기반 나레이션 활성화
2. **Wire forConsequenceEvent into ConsequenceResolver → CycleControllerV2** — consequence event 발동 시 saga entry 에 forConsequenceEvent 나레이션 기록
3. **Remove VETERANS_TRIAL_GREEDY_EXP_PENALTY** — dead constant 삭제

### 기능 요구사항

#### F1. Choice event saga wiring
- **목적**: 5 개 player choice (proving, crossroads, mercenary, merchant, last_stand) 의 saga 나레이션을 NarrativeGenerator.forChoiceEvent 경유로 통합
- **동작**:
  - CycleControllerV2.recordEventChoice 에서 forChoiceEvent 호출하여 narrativeText 생성
  - EVENT_NARRATION 의 accept/decline 텍스트는 fallback 으로 유지 (forChoiceEvent 반환이 빈 문자열이면 기존 텍스트 사용)
  - hero.age, eventType, choice 를 forChoiceEvent 에 전달
- **수용 기준**:
  - CycleControllerV2 에서 NarrativeGenerator.forChoiceEvent 호출이 존재
  - 기존 EVENT_NARRATION 기반 테스트가 계속 통과 (fallback 경로)
  - saga entry 의 narrativeText 에 `세에` 패턴이 포함 (age 기반 확인)
- **반대 기준 (NOT this)**:
  - EVENT_NARRATION 레지스트리 자체를 삭제하지 않는다 (fallback 유지)
  - forChoiceEvent 의 텍스트 내용 변경은 이 cycle 범위 밖

#### F2. Consequence event saga wiring
- **목적**: reputation payoff, veteran's trial 결과의 saga 나레이션을 forConsequenceEvent 경유로 통합
- **동작**:
  - ConsequenceResolver 가 consequence event 결과를 반환할 때 narrativeText 필드 포함
  - CycleControllerV2 에서 consequence event 처리 시 recordToStore 호출
  - hero.age, eventType, style (aggressive/defensive/greedy/balanced) 전달
- **수용 기준**:
  - consequence event 발동 시 saga 에 entry 가 기록됨 (type: 'eventChoice' 또는 새 type)
  - narrativeText 에 style-dependent 텍스트가 반영됨
- **반대 기준 (NOT this)**:
  - ConsequenceResolver 의 게임 로직(버프 수치 등) 변경 없음

#### F3. Dead constant 제거
- **목적**: 미사용 상수 정리
- **동작**:
  - `constants-events.ts` 에서 `VETERANS_TRIAL_GREEDY_EXP_PENALTY` 삭제
  - export 목록에서 제거
  - import 하는 파일이 없음을 확인 (현재 0 곳)
- **수용 기준**:
  - grep 결과 해당 상수 이름이 코드베이스에 0 회 출현
  - 기존 테스트 전체 통과
- **반대 기준 (NOT this)**:
  - 다른 상수 정리는 이 cycle 범위 밖

### Target files
- `games/inflation-rpg/src/overworld/CycleControllerV2.ts` (F1, F2 — recordEventChoice 수정)
- `games/inflation-rpg/src/overworld/encounter/ConsequenceResolver.ts` (F2 — narrativeText 반환 추가)
- `games/inflation-rpg/src/overworld/encounter/constants-events.ts` (F3 — 상수 삭제)
- `games/inflation-rpg/src/saga/NarrativeGenerator.ts` (참조만, 수정 없음)

---

## C894 [structure] — DurationBuffTracker 추출

### 한 줄
EncounterEngine 의 40+ `*Remaining` 필드와 `tickSimpleDurations()` 를 독립 클래스 `DurationBuffTracker` 로 추출한다.

### 평가 핀포인트
- **게임비평가**: EncounterEngine 2,671 LOC — buff duration 상태가 engine 본체에 산재. 새 buff 추가 시마다 3 곳 수정 필요 (필드 선언, tick, 사용).
- **스토리작가**: (해당 없음)
- **레벨디자이너**: 40+ Remaining 필드가 engine 복잡도의 주요 원인. 단위 테스트에서 buff 상태만 격리 테스트 불가.

### 우선순위
1. **DurationBuffTracker 클래스 추출** — 3 회 이상 지적된 핵심 구조 개선
2. **EncounterEngine 위임 전환** — 필드 직접 소유 → tracker.isActive() / tracker.tick() 위임
3. **단위 테스트** — DurationBuffTracker 독립 테스트

### 기능 요구사항

#### F1. DurationBuffTracker 클래스
- **목적**: duration-tracked buff 상태를 단일 책임 클래스로 격리
- **동작**:
  - `games/inflation-rpg/src/overworld/encounter/DurationBuffTracker.ts` 신규 파일
  - API: `activate(buffId: string, duration: number)`, `tick()`, `isActive(buffId): boolean`, `remaining(buffId): number`, `reset()`
  - 내부: `Map<string, number>` — buffId → remaining fights
  - `tick()` 은 모든 active buff 의 remaining 을 1 감소, 0 이하면 제거
- **수용 기준**:
  - DurationBuffTracker 가 독립 파일로 존재
  - activate → tick N 회 → isActive 가 false 되는 기본 시나리오 테스트 통과
  - EncounterEngine 에서 import 되어 사용
- **반대 기준 (NOT this)**:
  - buff 의 효과(ATK 배율 등)는 tracker 에 포함하지 않는다 — duration 만 관리
  - 기존 buff 의 수치 변경 없음

#### F2. EncounterEngine 위임 전환
- **목적**: 40+ `*Remaining` 필드를 tracker 위임으로 대체하여 LOC 감소
- **동작**:
  - `private buffs = new DurationBuffTracker()` 필드 추가
  - 각 `*Remaining` 필드를 `this.buffs.activate('shrineAtk', duration)` / `this.buffs.isActive('shrineAtk')` / `this.buffs.remaining('shrineAtk')` 로 대체
  - `tickSimpleDurations()` 메서드를 `this.buffs.tick()` 한 줄로 대체
  - 기존 reset 경로에서 `this.buffs.reset()` 호출
- **수용 기준**:
  - EncounterEngine 에서 `*Remaining` 필드 선언이 0 개 (또는 tracker 미적용 특수 케이스 2-3 개 이하)
  - `tickSimpleDurations()` 메서드 본문이 `this.buffs.tick()` + 특수 케이스 0-3 줄
  - EncounterEngine LOC: 2,671 → **Δ ≤ −100** (최소 100 줄 감소)
  - 기존 테스트 전체 통과
- **반대 기준 (NOT this)**:
  - wave, combo 등 duration 이 아닌 카운터는 이동하지 않는다
  - buff 효과 로직은 EncounterEngine 에 잔류

#### F3. DurationBuffTracker 단위 테스트
- **목적**: tracker 의 핵심 동작을 EncounterEngine 과 독립적으로 검증
- **동작**:
  - `games/inflation-rpg/src/overworld/__tests__/DurationBuffTracker.test.ts` 신규
  - 시나리오: activate/tick/isActive, 중복 activate (갱신), tick 이후 만료, reset
- **수용 기준**:
  - 최소 4 개 테스트 케이스
  - 테스트 단독 실행 시 EncounterEngine import 없이 통과

### Target files
- `games/inflation-rpg/src/overworld/encounter/DurationBuffTracker.ts` (신규)
- `games/inflation-rpg/src/overworld/EncounterEngine.ts` (필드 제거 + 위임)
- `games/inflation-rpg/src/overworld/__tests__/DurationBuffTracker.test.ts` (신규)

---

## C895 [balance] — Buff duration 밸런스 정규화 + collab checkpoint

### 한 줄
C894 에서 추출한 DurationBuffTracker 기반으로 buff duration 분포를 정규화하고, C893-C895 collab checkpoint 를 기록한다.

### 평가 핀포인트
- **게임비평가**: buff duration 이 3 fights ~ 20 fights 까지 불균일. 체감 일관성 부족.
- **스토리작가**: (해당 없음)
- **레벨디자이너**: short-duration buff (3 fights) 는 체감 불가. long-duration buff (20 fights) 는 과도. 5-12 fights 밴드로 정규화 필요.

### 우선순위
1. **Buff duration 정규화** — DurationBuffTracker 의 buffId 목록 기반으로 duration 상수 검토
2. **Short buff floor** — 3-fight buff 를 최소 5 fights 로 상향
3. **Collab record** — C893-C895 진행 기록

### 기능 요구사항

#### F1. Duration 정규화
- **목적**: buff duration 체감 일관성 확보
- **동작**:
  - `constants-events.ts` 의 `*_DURATION` 상수 중 값이 3 이하인 것을 5 로 상향
  - 값이 20 이상인 것을 15 로 하향 (특수 케이스 제외)
  - DurationBuffTracker.activate 호출부의 duration 인자가 상수를 사용하는지 확인
- **수용 기준**:
  - `*_DURATION` 상수 중 3 이하 값: 0 개 (기존 baseline 대비 Δ = 전수 제거)
  - `*_DURATION` 상수 중 20 이상 값: 기존 baseline 대비 Δ ≤ −50% (특수 케이스 1-2 개 허용)
  - 기존 sim smoke 테스트 통과
- **반대 기준 (NOT this)**:
  - buff 효과 배율(ATK mul, EXP mul 등) 변경 없음 — duration 만 조정
  - 신규 buff 추가 없음

#### F2. Collab checkpoint
- **목적**: C893-C895 진행 기록 및 다음 3-cycle 계획 seed
- **동작**:
  - `docs/superpowers/evolution/cycle-895-collab.md` 작성
  - EncounterEngine LOC 변화, DurationBuffTracker 추출 결과, NarrativeGenerator wiring 완료 여부 기록
- **수용 기준**:
  - collab 문서에 LOC 변화 수치 포함
  - 다음 cycle 방향 제안 포함

### Target files
- `games/inflation-rpg/src/overworld/encounter/constants-events.ts` (duration 상수 조정)
- `docs/superpowers/evolution/cycle-895-collab.md` (신규)

---

## 우선순위 외 backlog

- **EVENT_NARRATION 레지스트리 통합/제거** — C893 에서 forChoiceEvent fallback 으로 유지. 2 번째 사용처에서 제거 검토.
- **EncounterEngine buff 효과 로직 추출** — DurationBuffTracker 는 duration 만 관리. 효과(ATK mul 적용 등) 추출은 별도 cycle.
- **NarrativeGenerator.forChoiceEvent 텍스트 다양화** — 현재 단일 텍스트. seed 기반 변형은 narrative cycle 에서 별도 처리.
- **tickSimpleDurations 내 특수 케이스** (temporalFissure 등 단순 decrement 외 로직) — C894 에서 tracker 미적용 잔류 가능, 후속 정리.

## 비고

- **컨셉 가드**: 3 cycle 모두 기존 시스템의 정리·연결·정규화. 신규 게임 메카닉 추가 없음. "자율 진화하는 idle hero sim" 의 내부 품질 향상에 집중.
- **카테고리 순환**: C890=system → C891=structure → C892=balance → C893=system → C894=structure → C895=balance. 룰 9 준수 (같은 카테고리 3 연속 없음).
- **리스크**: C894 의 40+ 필드 위임 전환은 regression 범위가 넓다. 기존 EncounterEngine 테스트 전체 통과를 gate 로 설정. 부분 전환(20 개 → 나머지 후속)도 허용.
- **의존성**: C895 는 C894 의 DurationBuffTracker 완료에 의존. C894 가 부분 완료 시 C895 범위를 완료된 buff 에 한정.
