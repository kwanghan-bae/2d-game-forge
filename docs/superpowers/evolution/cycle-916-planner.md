# Cycle 916 Planner — C917-C919 3-Cycle 블록 계획

category: meta (planner)

## 현황 요약

| 항목 | 상태 |
|------|------|
| vitest | 2415 PASS |
| critic | 25/40 (C913 이후 정체, 25-26 진동) |
| EncounterEngine | 2709 LOC |
| `*Remaining` 필드 | **73 개** (C913 추정 40+ 대비 실측 73) |
| DurationBuffTracker | 52 LOC, 9 tests — EncounterEngine 미연동 |
| 직전 3 cycle layer | C914=system, C915=structure, C916=balance+collab |
| 다음 rotation | C917=system, C918=structure, C919=balance+collab |
| Fight 240-399 밀도 | 6%, 140f 구간 — VT 대기실 단조로움 (구조적 약점) |
| 최근 성과 | First Trial 2-phase (C911), DurationBuffTracker 생성 (C914), VT_MIN 226 + SN ATK 1.30 (C915) |

---

## Critic 반복 지적 3의 규칙 판정

| 항목 | 언급 횟수 | 3의 규칙 | 판정 |
|------|-----------|----------|------|
| DurationBuffTracker 연동 (EE 복잡도) | 6+ (C853, C889, C892, C895, C907, C910, C913) | ✅ 초과 | **P1 유지** |
| Fight 240-399 VT 저밀도 (6%, 140f) | 4+ (C895, C907, C910, C913) | ✅ | **P1 격상** |
| Repeatable 이벤트 피로도 (Merc/Merchant 반복) | 3 (C910, C913, C916) | ✅ 도달 | **P1 격상** |
| Consequence template 재사용 | 2 (C907, C910) | ❌ 미달 | backlog 유지 |
| 5-tier → 8-tier narrative variance | 1 (C908 level-designer) | ❌ | backlog |

---

## 점수 정체 분석 — "왜 25-26에서 멈추나?"

critic 점수 구성: Variety(7) + Pacing(6) + Agency(7) + Narrative(5) = 25/40.

**병목**: Pacing(6/10) + Narrative(5/10).
- **Pacing 6→8 조건**: fight 240-399 의 VT-only 140f 단조 구간 해소. 이 구간에 선택형 이벤트 1+ 추가 필요.
- **Narrative 5→7 조건**: 동일 Merc/Merchant 텍스트 반복 피로 해소. 신규 repeatable 이벤트 OR 기존 이벤트 variant text 확대.

**전략 전환**: C914-C916 은 DurationBuffTracker 생성 + 밸런스 미세조정에 집중했으나, critic 점수에는 **비가시적** 개선. C917-C919 는 **플레이어 체감 다양성** (Pacing + Narrative) 을 직접 공격하되, DurationBuffTracker 연동을 병행한다.

---

## C917 [system] — Mid-Game Repeatable Event: "Wandering Sage"

### 한 줄
Fight 260-399 VT 저밀도 구간에 신규 repeatable 선택 이벤트 "Wandering Sage" 를 신설하여 Pacing 점수를 직접 공략한다.

### 평가 핀포인트
- **게임비평가**: fight 240-399 가 VT 자동해소 대기 외에 플레이어 개입 0. Pacing 6/10 의 직접 원인.
- **스토리작가**: Merc(115-550) + Merchant(125-600) 가 260-399 에서 유일한 선택형인데 양쪽 모두 초반부터 등장해 피로도 높음. 신규 캐릭터 필요.
- **레벨디자이너**: 해당 구간 밀도 6%→12% 이상 끌어올리려면 전용 이벤트 1 개 + 5%+ 확률 필요.

### 우선순위
1. **Wandering Sage 이벤트** — fight 260-399 전용 repeatable, EXP/ATK/Heal 3-way choice
2. **DurationBuffTracker 1차 연동** — Sage buff duration 을 DurationBuffTracker 로 처리하여 연동 시작점 확보

### 기능 요구사항

#### F1. Wandering Sage Event
- **목적**: fight 260-399 의 VT-only 단조 구간에 신규 선택 이벤트를 추가하여 Pacing 개선
- **동작**:
  - 트리거: fight 260-399, 확률 5%/fight, repeatable
  - 3-way choice: Wisdom(EXP×1.25, 8f) / Fortify(ATK×1.15, 10f) / Meditate(HP heal 20%)
  - EventChoiceFSM 재사용 (3s timeout, auto-decline→Wisdom)
  - NarrativeGenerator 확장: `forChoiceEvent('SAGE')` 매핑 추가
  - Toast label 추가: "wandering_sage_wisdom" / "wandering_sage_fortify" / "wandering_sage_meditate"
- **수용 기준**:
  - Fight 260-399 구간 선택형 이벤트 밀도: baseline 6% 대비 Δ ≥ +4%p (목표 ≥ 10%)
  - EventChoiceFSM 3-state 재사용 확인 (신규 FSM 코드 0 줄)
  - 단위 테스트 ≥ 6 개 (trigger window, 3 choices, timeout, density)
  - ChoiceHistory 에 sage 선택 기록 (aggressive=Fortify, defensive=Meditate, balanced=Wisdom)
- **반대 기준 (NOT this)**:
  - Sage 를 consequence 이벤트로 만들지 않는다 (독립 repeatable)
  - fight 260 미만에 배치하지 않는다 (기존 이벤트 포화 구간)

#### F2. DurationBuffTracker 1차 연동 (Sage buff)
- **목적**: C914 에서 생성한 DurationBuffTracker 를 EncounterEngine 에 첫 연동하여 마이그레이션 진입점 확보
- **동작**:
  - EncounterEngine 에 `private tracker = new DurationBuffTracker()` 인스턴스 추가
  - Sage 의 Wisdom/Fortify buff duration → `tracker.activate('sageWisdom', 8)` / `tracker.activate('sageFortify', 10)`
  - `tick()` 호출을 기존 `tickSimpleDurations()` 말미에 1 줄 추가
  - **기존 73 개 `*Remaining` 필드는 이번에 마이그레이션하지 않는다** (C918 scope)
- **수용 기준**:
  - EncounterEngine 에 `DurationBuffTracker` import + 인스턴스 존재
  - Sage buff 가 `tracker.isActive()` 로 판정됨 (새 `*Remaining` 필드 추가 0)
  - 기존 테스트 전량 통과 (회귀 0)
- **반대 기준 (NOT this)**:
  - 기존 73 개 필드를 이번에 마이그레이션하지 않는다

---

## C918 [structure] — DurationBuffTracker 1차 마이그레이션 (상위 25 필드)

### 한 줄
EncounterEngine 의 `*Remaining` 73 개 중 상위 25 개를 DurationBuffTracker 로 마이그레이션하여 LOC 를 실질 절감한다.

### 평가 핀포인트
- **게임비평가**: 2709 LOC 는 critic 이 "구조적 복잡도" 로 반복 지적하는 항목. 가시적 LOC 감소가 구조 점수에 반영됨.
- **스토리작가**: N/A (구조 리팩터링)
- **레벨디자이너**: C917 Sage 의 `tracker.activate()` 패턴이 검증되었으므로 기존 필드 일괄 이관 안전.

### 우선순위
1. **상위 25 `*Remaining` 필드 → DurationBuffTracker 이관** — 선언 + decrement + reset 3 곳 제거

### 기능 요구사항

#### F1. 1차 마이그레이션 (25 필드)
- **목적**: EncounterEngine 의 73 개 duration 필드 중 가장 단순한 25 개를 이관하여 LOC 절감 + 패턴 검증
- **동작**:
  - 대상 선정 기준: "단순 decrement + 0 비교" 만 하는 필드 (side-effect 없는 순수 duration)
  - 각 필드에 대해:
    1. `private xxxRemaining = 0` 선언 제거
    2. `tickSimpleDurations()` 내 해당 decrement 줄 제거
    3. 활성 체크 `this.xxxRemaining > 0` → `this.tracker.isActive('xxx')`
    4. 활성화 `this.xxxRemaining = N` → `this.tracker.activate('xxx', N)`
    5. `reset()` 내 해당 줄 제거 (tracker.reset() 으로 통합)
  - `serialize()` / `deserialize()` 에서 tracker state 직렬화 추가
- **수용 기준**:
  - 마이그레이션 완료 필드 수 ≥ 25
  - EncounterEngine LOC: baseline 2709 대비 Δ ≤ -150 (목표 ≤ 2559)
  - `tickSimpleDurations()` 줄 수: baseline 대비 Δ ≤ -25
  - 기존 EncounterEngine 전체 테스트 통과 (회귀 0)
  - serialize/deserialize round-trip 테스트 ≥ 2 개
- **반대 기준 (NOT this)**:
  - 복잡한 side-effect 를 동반하는 필드 (waveRemaining, investFightsRemaining 등) 는 이번에 이관하지 않는다
  - DurationBuffTracker 에 side-effect 로직을 넣지 않는다
  - 73 개 전량을 한 번에 하지 않는다 (리스크 관리)

---

## C919 [balance+collab] — 밸런스 검증 + Sage 튜닝 + Collab 정산

### 한 줄
C917 Sage + C918 마이그레이션 후 밸런스 검증, Sage 확률/보상 미세조정, C917-C919 collab 정산.

### 평가 핀포인트
- **게임비평가**: 신규 이벤트 추가 후 전체 밸런스 동요 여부 확인 필수
- **스토리작가**: Sage narrative variant 가 최소 3 개 이상인지 확인
- **레벨디자이너**: fight 260-399 밀도 목표 ≥ 10% 달성 여부 + BUFF_STACK_CAP 초과 여부

### 우선순위
1. **Post-change 밸런스 smoke** — sim/vitest 전량 PASS 확인
2. **Sage 확률 미세조정** — 밀도 목표 미달 시 5%→6% 또는 window 확장
3. **Collab 레코드** — C917-C919 성과 정산 + critic dispatch 준비

### 기능 요구사항

#### F1. 밸런스 검증
- **목적**: C917 Sage + C918 마이그레이션이 기존 밸런스에 영향 없음 확인
- **동작**:
  - sim smoke 전량 실행
  - 주요 지표 (maxLevel, ageEnd, rejuv, 자연사) 와 C916 baseline 비교
  - BUFF_STACK_CAP 침범 여부: Sage Fortify(1.15) × 기존 max compound 확인
- **수용 기준**:
  - sim smoke 전량 PASS
  - vitest 전량 PASS
  - Sage Fortify worst-case compound: SN(1.30) × Sage(1.15) × LS(1.30) = 1.9455 → cap 1.85 clip 발생
    - → Sage Fortify 를 1.15→1.10 또는 BUFF_STACK_CAP exempt list 에서 제외 결정
  - Fight 260-399 밀도 ≥ 10% (level-designer 검증)

#### F2. Sage 튜닝 (조건부)
- **목적**: 밀도 목표 미달 또는 cap 침범 시 조정
- **동작** (조건부):
  - IF 밀도 < 10%: SAGE_CHANCE 5→6% 또는 SAGE_MAX 399→420
  - IF cap 침범: Sage Fortify ATK_MUL 1.15→1.10
  - IF 양쪽 OK: no change
- **수용 기준**:
  - BUFF_STACK_CAP(1.85) 대비 worst-case ≤ 1.82 (headroom ≥ 1.6%)
  - Fight 260-399 밀도 ≥ 10%

#### F3. Collab 레코드
- **동작**: C917-C919 성과 요약 + critic/level/planner 피드백 취합 + 다음 블록 방향 제시

---

## 3-Cycle 블록 요약

| Cycle | Layer | 핵심 작업 | 목표 지표 |
|-------|-------|-----------|-----------|
| C917 | system | Wandering Sage 신규 이벤트 + DurationBuffTracker 첫 연동 | 밀도 Δ ≥ +4%p, 신규 테스트 ≥ 6 |
| C918 | structure | `*Remaining` 25 필드 DurationBuffTracker 마이그레이션 | LOC Δ ≤ -150, 회귀 0 |
| C919 | balance+collab | Sage 밸런스 + post-refactor 검증 + collab 정산 | cap headroom ≥ 1.6%, 밀도 ≥ 10% |

---

## 예상 성과 (C919 완료 시점)

| 지표 | C916 baseline | C919 목표 | Δ |
|------|---------------|-----------|---|
| EncounterEngine LOC | 2709 | ≤ 2559 | -150+ |
| `*Remaining` 필드 수 | 73 | ≤ 48 | -25 |
| Fight 260-399 밀도 | 6% | ≥ 10% | +4%p |
| Critic Pacing | 6/10 | 7/10 (목표) | +1 |
| Critic 총점 | 25/40 | 26-27/40 (목표) | +1~2 |
| DurationBuffTracker 연동 | 미연동 | 25+ buffs tracked | 0→25 |

---

## 점수 정체 타파 전략 근거

1. **Pacing 6→7**: fight 260-399 에 Sage 추가로 "VT 대기만 하는 140f 구간" 해소. critic 이 4 회 지적한 핵심 약점 직접 공략.
2. **Narrative 5→6**: Sage 는 기존 Merc/Merchant 와 다른 캐릭터·톤 (학자/현자). 피로도 분산. 3-way choice 로 variety 기여.
3. **구조 부채 병행 해소**: DurationBuffTracker 연동을 Sage 에서 시작하여 자연스럽게 C918 대규모 마이그레이션으로 연결. "왜 지금?" = Sage buff 가 연동 진입점 제공.

---

## 우선순위 외 backlog (변동사항)

| 항목 | 상태 | 비고 |
|------|------|------|
| DurationBuffTracker 잔여 48 필드 마이그레이션 | C920+ | C918 완료 후 2차 블록 계획 |
| Consequence template 재사용 | 2 mentions | 3 회 도달 시 P1 격상 |
| EventOrchestrator/MidGameEventResolver 통합 | 2 mentions | EE LOC 2200 이하 달성 시 재평가 |
| 5-tier → 8-tier narrative variance | 1 mention | Sage 추가로 5-tier 활용폭 확대 후 재평가 |
| OverworldEvent union missing types | 1 mention | type debt, structure cycle 편입 가능 |
| fight 400-450 추가 이벤트 | 0 mention | Sage 효과 확인 후 판단 |

---

## 비고

- **YAGNI 검증**: Sage 이벤트는 "왜 지금?" — fight 260-399 저밀도가 4+ 회 critic/level 지적. 유일한 해법은 해당 구간 전용 이벤트. PASS.
- **컨셉 가드**: Wandering Sage = idle hero 세계관의 NPC 조언자. eternal hero 의 여정에 자연스러운 조우. PASS.
- **리스크**:
  - Sage Fortify × StormNexus compound = 1.30×1.15 = 1.495. Last Stand 추가 시 1.495×1.30 = 1.9435 → cap clip. → C919 에서 Fortify 1.15→1.10 조정 가능성 높음.
  - C918 마이그레이션 25 필드는 "단순 decrement" 만 대상. side-effect 동반 필드는 후속 블록에서 개별 처리.
- **룰 9 카테고리 확인**: C914=system, C915=structure, C916=balance, C917=system, C918=structure, C919=balance. 3-cycle rotation 유지, 4 연속 동일 카테고리 없음. PASS.
- **C913 planner 대비 변경점**: C913 planner 는 C914-C916 전체를 DurationBuffTracker 마이그레이션에 할당했으나, 실제로는 Phase 1(생성) 만 완료. C917-C919 는 "가시적 다양성 개선(Sage) + 마이그레이션 병행" 으로 전략 전환. 이유: 구조 개선만으로는 critic 점수가 오르지 않음이 C914-C916 에서 실증됨.
