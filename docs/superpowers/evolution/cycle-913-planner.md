# Cycle 913 Planner — C914-C916 3-Cycle 블록 계획

category: meta (planner)

## 현황 요약

| 항목 | 상태 |
|------|------|
| vitest | 2406 PASS |
| critic | 26/40 (C910 이후 정체) |
| EncounterEngine | 2709 LOC |
| Duration buff fields | 40+ `*Remaining` 필드 (EncounterEngine 산재) |
| 직전 3 cycle layer | C911=system, C912=structure, C913=balance |
| 다음 rotation | C914=system, C915=structure, C916=balance+collab |
| First Trial | 2-phase pending choice 완료 (C911) |
| Event windows | SPARRING_MAX 200, MERC_MAX 550 완료 (C912) |
| VT_AGG monitoring | 0.30/12f/0.12 유지, 종료 (C913) |

## 백로그 우선순위 판정

| 항목 | 언급 횟수 | 3의 규칙 | 판정 |
|------|-----------|----------|------|
| DurationBuffTracker (Map 마이그레이션) | 5+ (C853, C889, C892, C895, C907, C910) | ✅ 초과 | **P1 확정** |
| Consequence template | 2 (C907, C910) | ❌ 미달 | backlog 유지 |
| EventOrchestrator/MidGameEventResolver 통합 | 2 (C907, C910) | ❌ 미달 | backlog 유지 |
| StormNexus ATK_MUL headroom | 2 (C910, level-designer) | ❌ 미달 | backlog, C916 여유분에 편입 가능 |
| OverworldEvent union 24 missing | 1 (C895) | ❌ | backlog |
| 5-tier → 8-tier variance | 1 (level-designer) | ❌ | backlog |

### P1 판정 근거: DurationBuffTracker

- **5+ 회 반복 언급**: C853 planner 첫 제안 → C889 critic "2671 LOC 주범" → C892 planner "40+ *Remaining 필드" → C895 "76개 field" → C907/C910 collab 에서 "confirmed P1, 대규모 별도 계획 필요"
- **컨셉 정합성**: idle hero sim 의 핵심인 encounter 전투 루프의 가독성·테스트 격리를 직접 개선한다
- **위험**: 단일 cycle 로 불가능한 규모. **2-cycle 분할** (C914 system + C915 structure) 이 적정

---

## C914 [system] — DurationBuffTracker Phase 1: 클래스 생성 + 핵심 와이어링

### 한 줄
`DurationBuffTracker` 클래스를 신규 생성하여 `Map<BuffId, number>` 기반 duration 추적 시스템을 구축하고, EncounterEngine 의 상위 10-15 개 `*Remaining` 필드를 마이그레이션한다.

### 평가 핀포인트
- **게임비평가**: EncounterEngine 2709 LOC 는 구조적 복잡도의 근원. critic 점수 26/40 정체의 기여 요인
- **스토리작가**: 이벤트 나레이션의 buff duration 참조가 하드코딩 field 에 의존 — 확장 시 매번 새 field 추가 필요
- **레벨디자이너**: 새 buff 이벤트 추가 비용이 높음 (field 선언 + decrement 로직 + reset 로직 3 곳 수정 필요)

### 우선순위
1. **DurationBuffTracker 클래스** — EncounterEngine 의 `*Remaining` field 40+ 개를 `Map<BuffId, number>` 로 통합하는 generic tracker 생성

### 기능 요구사항

#### F1. DurationBuffTracker 클래스 생성
- **목적**: 40+ 개 독립 `*Remaining` 필드를 1 개 Map 으로 통합하여 EncounterEngine LOC 절감의 기반 구축
- **동작**:
  - `DurationBuffTracker` 클래스: `Map<string, number>` 내부 저장
  - `set(buffId, duration)`: buff 등록
  - `tick()`: 모든 active buff 의 남은 턴수를 1 감소, 0 이하 시 제거
  - `isActive(buffId): boolean`: 특정 buff 활성 여부 확인
  - `remaining(buffId): number`: 남은 턴수 반환 (미등록 시 0)
  - `reset()`: 전체 초기화
  - EncounterEngine 의 **상위 10-15 개 `*Remaining` 필드**를 DurationBuffTracker 로 마이그레이션 (전체 40+ 중 1차분)
  - `tickSimpleDurations()` 의 해당 10-15 줄을 `tracker.tick()` 단일 호출로 대체
- **수용 기준**:
  - `DurationBuffTracker` 클래스 파일이 독립 모듈로 존재
  - 단위 테스트 ≥ 8 개 (set, tick, isActive, remaining, reset, edge cases)
  - EncounterEngine 에서 마이그레이션된 field 수 ≥ 10
  - 기존 EncounterEngine 테스트 전량 통과 (회귀 0)
  - EncounterEngine LOC: baseline 2709 대비 Δ ≤ -80
- **반대 기준 (NOT this)**:
  - 40+ 필드 전량을 한 번에 마이그레이션하지 않는다 (리스크 과다)
  - DurationBuffTracker 에 buff 효과 로직을 넣지 않는다 (duration 추적만 담당)

---

## C915 [structure] — DurationBuffTracker Phase 2: 잔여 필드 마이그레이션 + EncounterEngine 분해

### 한 줄
나머지 25-30 개 `*Remaining` 필드를 DurationBuffTracker 로 이관하고, `tickSimpleDurations()` 를 제거하여 EncounterEngine 을 2200 LOC 이하로 축소한다.

### 평가 핀포인트
- **게임비평가**: C914 에서 기반 완성, 구조적 복잡도 실질 감소는 Phase 2 에서 달성해야 한다
- **스토리작가**: N/A (구조 리팩터링)
- **레벨디자이너**: 새 buff 이벤트 추가 비용이 `tracker.set('newBuff', turns)` 1 줄로 축소되어야 한다

### 우선순위
1. **잔여 *Remaining 필드 전량 마이그레이션** — Phase 1 이후 남은 25-30 개 필드를 DurationBuffTracker 로 이관

### 기능 요구사항

#### F1. 잔여 필드 마이그레이션 + tickSimpleDurations 제거
- **목적**: EncounterEngine 의 `*Remaining` 패턴을 완전 제거하여 LOC 대폭 절감
- **동작**:
  - Phase 1 에서 미처리된 나머지 `*Remaining` 필드를 전량 DurationBuffTracker 로 이관
  - `tickSimpleDurations()` 메서드 전체를 `this.tracker.tick()` 단일 호출로 대체 후 메서드 제거
  - EncounterEngine 의 `reset()` / `serialize()` / `deserialize()` 에서 *Remaining 필드 참조를 tracker API 로 교체
  - buff 활성 체크 (`if (this.xxxRemaining > 0)`) 를 `this.tracker.isActive('xxx')` 로 교체
- **수용 기준**:
  - EncounterEngine 내 `*Remaining` 패턴 field 수: 0 (grep 검증)
  - `tickSimpleDurations` 메서드: 삭제 또는 단일 `tracker.tick()` 위임 (≤ 3 줄)
  - EncounterEngine LOC: baseline 2709 대비 Δ ≤ -400 (목표 ≤ 2300)
  - 기존 EncounterEngine 전체 테스트 통과 (회귀 0)
  - 신규 buff 추가 시 필요한 코드 변경: `tracker.set()` 1 줄 + 효과 로직만 (field 선언 불필요)
- **반대 기준 (NOT this)**:
  - buff 효과 로직 (데미지 계산, 스탯 보정 등) 을 DurationBuffTracker 에 넣지 않는다
  - EncounterEngine 을 여러 파일로 분할하지 않는다 (이번 scope 아님)

---

## C916 [balance+collab] — StormNexus headroom 조정 + C914-C916 collab 정산

### 한 줄
StormNexus ATK_MUL 1.35→1.30 headroom 조정 + DurationBuffTracker 마이그레이션 후 밸런스 검증 + collab 레코드 작성.

### 평가 핀포인트
- **게임비평가**: DurationBuffTracker 리팩터링 후 기존 전투 밸런스가 변하지 않았는지 검증 필요
- **스토리작가**: N/A
- **레벨디자이너**: StormNexus × FR_AGG headroom 이 1.5% 로 clip 위험. ATK_MUL 1.35→1.30 으로 여유 확보 제안

### 우선순위
1. **StormNexus ATK_MUL headroom fix** — 1.35→1.30 으로 clip 위험 해소
2. **Post-refactor 밸런스 검증** — DurationBuffTracker 마이그레이션이 sim 결과에 영향 없음 확인
3. **Collab 레코드** — C914-C916 블록 성과 정산

### 기능 요구사항

#### F1. StormNexus ATK_MUL 조정
- **목적**: FR_AGG 와의 compound headroom 을 1.5% → ~5% 로 확보하여 향후 ATK 소스 추가 시 clip 위험 제거
- **동작**:
  - `STORM_NEXUS_ATK_MUL`: 1.35 → 1.30
  - 관련 테스트 기대값 갱신
- **수용 기준**:
  - `STORM_NEXUS_ATK_MUL` 값이 1.30
  - StormNexus 관련 기존 테스트 전량 통과
  - BUFF_STACK_CAP (1.85) 대비 worst-case compound ≤ 1.80 (headroom ≥ 2.7%)
- **반대 기준 (NOT this)**:
  - FR_AGG 의 값은 변경하지 않는다 (별도 검증 필요)

#### F2. Post-refactor 밸런스 smoke
- **목적**: C914-C915 DurationBuffTracker 마이그레이션이 게임 밸런스에 영향을 주지 않았음을 확인
- **동작**:
  - 기존 sim smoke 실행하여 주요 지표 (maxLevel, ageEnd, rejuv, 자연사) 가 C913 baseline 과 동등한지 확인
- **수용 기준**:
  - sim smoke 전량 PASS
  - vitest 전량 PASS

---

## 3-Cycle 블록 요약

| Cycle | Layer | 작업 | 핵심 지표 |
|-------|-------|------|-----------|
| C914 | system | DurationBuffTracker Phase 1 (클래스 생성 + 10-15 필드 이관) | LOC Δ ≤ -80, 신규 테스트 ≥ 8 |
| C915 | structure | DurationBuffTracker Phase 2 (잔여 전량 이관 + tickSimpleDurations 제거) | LOC Δ ≤ -400, *Remaining count = 0 |
| C916 | balance+collab | StormNexus headroom 1.35→1.30 + post-refactor 검증 + collab | headroom ≥ 2.7%, sim parity |

## 예상 성과
- **EncounterEngine**: 2709 LOC → ≤ 2300 LOC (Δ ≥ -400)
- **신규 buff 추가 비용**: field 선언 + decrement + reset 3 곳 → `tracker.set()` 1 줄
- **critic 점수 기여**: 구조적 복잡도 해소가 26/40 정체 타파의 선결 조건
- **StormNexus headroom**: 1.5% → ≥ 2.7% (clip 안전)

## 우선순위 외 backlog (변동 없음)
- Consequence template: 2 mentions → 3 회 도달 시 P1 격상
- EventOrchestrator/MidGameEventResolver 통합: 2 mentions → DurationBuffTracker 완료 후 재평가
- OverworldEvent union 24 missing: type debt, structure cycle 에 적합
- 5-tier → 8-tier narrative variance: level-designer 1 mention

## 비고
- **YAGNI 검증**: DurationBuffTracker 는 "왜 지금?" 에 대해 5+ 회 반복 지적 + 2709 LOC 구조적 부채가 critic 점수 정체의 기여 요인이라는 명확한 근거가 있다. PASS.
- **컨셉 가드**: buff duration 추적은 idle hero sim 의 전투 루프 핵심 메커닉. 컨셉 일관성 확인. PASS.
- **리스크**: Phase 1 → Phase 2 의존성이 있으므로 C914 실패 시 C915 scope 조정 필요. C916 balance 는 C914-C915 와 독립적으로 실행 가능.
- **룰 9 카테고리 확인**: C911=system, C912=structure, C913=balance, C914=system, C915=structure, C916=balance. 3-cycle rotation 유지, 4 연속 동일 카테고리 없음. PASS.
