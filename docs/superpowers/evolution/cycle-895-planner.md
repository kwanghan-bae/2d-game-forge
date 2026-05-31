# Cycle 895 Planner — C896-C898 계획 수립

## 현황 요약

| 항목 | 상태 |
|------|------|
| Choice events | 5개 (Proving, Mercenary, Crossroads, Wandering Merchant, Last Stand) |
| Consequence events | 2개 (Reputation, Veteran's Trial) |
| NarrativeGenerator | 프로덕션 와이어링 완료 (C893) |
| ConsequenceResolver | 분리 완료 (C891) |
| LastStand UI | 모달 완료 (C893a) |
| EncounterEngine | 2651 LOC, duration buff fields **76개** |
| Build type errors | **66개** (24 OverworldRunner, 14 EncounterEngine, 28 기타) |
| 직전 3 cycle | C893=system, C894=structure, C895=balance |

## Fight 500+ 이벤트 커버리지 분석

| 이벤트 | 구간 | fight 501-600 커버? |
|--------|------|---------------------|
| Wandering Merchant | 125-500 | ❌ (500에서 끊김) |
| Veteran's Trial | 275-450 | ❌ |
| Last Stand | 400-600 | ✅ |

**발견**: fight 501-600 구간에 Last Stand **단독**. fight 501+ 에서 Wandering Merchant 종료 후 선택지가 Last Stand 하나뿐이다. 이벤트 다양성 부족.

## Build Type Debt 분석

66개 type error 의 root cause 패턴:

| 패턴 | 건수 | 원인 |
|------|------|------|
| OverworldRunner — OverworldEvent union 미포함 | 24 | legacy event type 이 union 에 추가 안 됨 |
| EncounterEngine — ActiveEventState / AtkBuffs 등 확장 미반영 | 14 | 신규 field 추가 시 test/context type 미동기화 |
| Test fixture 불일치 | 28 | 새 필드 추가 후 test mock 미갱신 |

**모두 같은 root cause**: 타입을 확장할 때 downstream consumer 동기화를 안 함. 한 번의 structure cycle 로 일괄 해소 가능.

## 76개 Duration Buff Field 문제

EncounterEngine 에 `xxxRemaining = 0` 패턴의 field 가 76개. 각각 독립 decrement 로직 존재. 이것이 2651 LOC 의 주범이다.

**DurationBuffTracker 추출 방안**: `Map<BuffId, number>` 기반 generic tracker 로 통합하면:
- 76개 field → 1개 Map
- 76개 decrement → 1개 `tick()` 메서드
- 예상 LOC 절감: ~400-600 줄

## Layer 순환 확인

| Cycle | Layer | 근거 |
|-------|-------|------|
| C896 | **system** | 지정됨 |
| C897 | **structure** | 지정됨 |
| C898 | **balance+collab** | 지정됨 |

직전 3 cycle (C893=system, C894=structure, C895=balance) 과 동일 패턴이므로 카테고리 룰 9 검증 필요. C893-C895 가 system→structure→balance 이고 C896-C898 도 system→structure→balance. 3 연속 같은 카테고리는 없으므로 룰 9 PASS.

---

# Cycle 896 PRD — Late-game Event Density (fight 500+)

category: system

## 한 줄
fight 501-600 구간의 이벤트 단독 문제를 해소하여 late-game 이벤트 다양성을 확보한다.

## 평가 핀포인트
- 게임비평가: fight 500+ 에서 Last Stand 하나만 발생, 반복감 심화. 선택지 결핍이 late-game 체감을 떨어뜨림.
- 스토리작가: Wandering Merchant 가 fight 500 에서 종료되어 상인과의 서사적 관계가 끊김. late-game 서사 빈도 하락.
- 레벨디자이너: fight 450-500 구간은 VT + Last Stand + Merchant 3중 겹침인데, 501+ 는 Last Stand 단독. 밀도 절벽.

## 우선순위
1. **Wandering Merchant 윈도우 확장** — fight 500→600 으로 확장. 가장 적은 코드 변경으로 커버리지 확보.
2. **Veteran's Trial 윈도우 확장** — fight 450→550 으로 확장. consequence event 의 late-game 진입.
3. **Late-game 밀도 검증** — 확장 후 fight 501-600 구간 이벤트 발생 빈도 측정.

## 기능 요구사항

### F1. Wandering Merchant 윈도우 확장
- **목적**: fight 501-600 에 choice event 추가
- **동작**:
  - `WANDERING_MERCHANT_MAX_FIGHTS` 500 → 600
  - MidGameEventResolver 의 기존 로직 그대로 작동 (윈도우만 확장)
  - sim driver 에도 동일 상수 반영 확인
- **수용 기준**:
  - fight 501-600 구간에서 Wandering Merchant 이벤트가 1회 이상 발생 가능 (단위 테스트)
  - 기존 fight 125-500 구간의 발생 빈도에 회귀 없음
- **반대 기준 (NOT this)**:
  - 새로운 Merchant 변형 추가 아님 — 윈도우 확장만

### F2. Veteran's Trial 윈도우 확장
- **목적**: fight 451-550 에 consequence event 도달
- **동작**:
  - `VETERANS_TRIAL_MAX_FIGHT` 450 → 550
  - ConsequenceResolver 기존 로직 그대로 작동
- **수용 기준**:
  - fight 451-550 구간에서 VT 발생 가능 (단위 테스트)
  - Last Stand 와의 overlap (400-550) 에서 우선순위 충돌 없음 (C892 에서 이미 VT 우선 로직 존재)
- **반대 기준 (NOT this)**:
  - VT 보상 수치 변경 아님 — 윈도우만

### F3. Late-game 커버리지 검증
- **목적**: 변경 후 fight 501-600 밀도 확인
- **동작**:
  - 기존 sim 또는 단위 테스트로 fight 501-600 에서 이벤트 종류 ≥ 2 확인
- **수용 기준**:
  - fight 501-600 에서 활성 이벤트 윈도우 수: baseline 1 (Last Stand only) → **≥ 3** (Last Stand + Merchant + VT)
- **반대 기준 (NOT this)**:
  - 새로운 이벤트 타입 추가 아님

## 우선순위 외 backlog
- fight 600+ 구간 (현재 어떤 이벤트도 커버하지 않음) — 향후 system cycle
- Wandering Merchant 의 late-game 변형 상품 — 향후 narrative cycle

---

# Cycle 897 PRD — DurationBuffTracker 추출 + Type Debt 일괄 해소

category: structure

## 한 줄
EncounterEngine 의 76개 duration buff field 를 generic tracker 로 통합하고, 66개 build type error 를 일괄 해소한다.

## 평가 핀포인트
- 게임비평가: 신규 이벤트 추가 시마다 EncounterEngine 에 field 2-3개 + decrement 로직 추가가 필요해 개발 속도 저하.
- 스토리작가: (해당 없음 — structure cycle)
- 레벨디자이너: 새 buff 추가 비용이 높아 밸런스 실험이 어려움. type error 누적이 빌드 신뢰도 하락.

## 우선순위
1. **DurationBuffTracker 추출** — 76개 field → Map 기반 tracker. EncounterEngine LOC ~400-600 절감.
2. **OverworldEvent union 완성** — 24개 OverworldRunner type error 일괄 해소.
3. **Test fixture 동기화** — 나머지 42개 type error 해소.

## 기능 요구사항

### F1. DurationBuffTracker 클래스 추출
- **목적**: EncounterEngine LOC 절감 + 새 buff 추가 비용 제로화
- **동작**:
  - `encounter/DurationBuffTracker.ts` 신규: `Map<string, number>` 기반
  - `activate(id, duration)` / `tick()` (전체 -1, 0 이하 삭제) / `isActive(id)` / `remaining(id)` API
  - EncounterEngine 에서 `xxxRemaining` field 76개를 `this.buffs: DurationBuffTracker` 1개로 교체
  - 기존 `if (this.xxxRemaining > 0) { ... this.xxxRemaining--; }` 패턴을 `if (this.buffs.isActive('xxx')) { ... }` + `this.buffs.tick()` (한 번) 으로 교체
- **수용 기준**:
  - EncounterEngine LOC: baseline 2651 대비 Δ ≤ -300 (즉, ≤ 2351)
  - DurationBuffTracker 단위 테스트 ≥ 5개
  - 기존 EncounterEngine 테스트 전체 PASS (회귀 0)
  - vitest 전체 PASS
- **반대 기준 (NOT this)**:
  - buff 의 동작 (배수, 조건 등) 변경 아님 — 저장 메커니즘만 교체
  - 비-duration buff (boolean flag 등) 는 이번 scope 외

### F2. OverworldEvent Union 완성
- **목적**: 24개 OverworldRunner type error 해소
- **동작**:
  - `OverworldEvents.ts` 의 union type 에 누락된 event type 추가: `event_cursed_altar`, `event_fairy`, `event_time_rift`, `event_chain_reward`, `event_blacksmith`, `event_gambler`, `event_rest_shrine`, `event_trap`, `event_trap_avoided`, `danger_retreat`
  - 각 event 의 payload type 정의 (기존 emit 코드에서 역추론)
- **수용 기준**:
  - `tsc --noEmit` OverworldRunner.tsx error: baseline 24 대비 Δ = -24 (즉, 0)
  - 신규 event type 각각 최소 1개 단위 테스트
- **반대 기준 (NOT this)**:
  - event 동작 변경 아님 — type 정의만

### F3. Test Fixture 동기화
- **목적**: 나머지 42개 type error 해소
- **동작**:
  - `ActiveEventState`, `AtkMultiplierContext`, `DefenseContext`, `EventOrchestratorCtx`, `ActiveAtkBuffs` 등의 test mock 에 누락 field 추가
  - `SaveIndicator.test.tsx` — `"main_menu"` → `"main-menu"` 수정
  - `skillBalance.test.ts` — `ActiveSkill.name` → 올바른 property 사용
  - `questBalance.test.ts` — optional chaining 추가
- **수용 기준**:
  - `tsc --noEmit` 전체 error: baseline 66 대비 Δ = -66 (즉, 0)
  - vitest 전체 PASS
- **반대 기준 (NOT this)**:
  - 프로덕션 코드 변경 최소화 — test/type 파일만

## 비고
- F1 은 F2/F3 와 독립적이므로 순서 무관. 단, F1 이 EncounterEngine 의 field 를 대거 변경하므로 F2/F3 의 fixture 갱신과 충돌 가능 → F1 우선 실행 후 F2/F3.
- DurationBuffTracker 가 성공하면 향후 신규 buff 추가는 상수 1줄 + activate 호출 1줄로 종결.

---

# Cycle 898 PRD — Event EV 정규화 + 밀도 곡선 최종 검증

category: balance

## 한 줄
C896 윈도우 확장 + C897 리팩터 이후의 이벤트 밀도와 EV 곡선을 정규화한다.

## 평가 핀포인트
- 게임비평가: 이벤트 윈도우 확장 후 밀도가 예상대로인지 실측 필요. 확장이 late-game 파워 커브에 미치는 영향 미검증.
- 스토리작가: Merchant/VT 의 late-game 출현이 서사적 흐름과 자연스러운지 확인 필요.
- 레벨디자이너: fight 구간별 이벤트 밀도 균등성 검증. 특정 구간 과밀/과소 여부 실측.

## 우선순위
1. **이벤트 밀도 곡선 측정** — fight 0-600 을 50-fight 버킷으로 나누어 이벤트 발생 횟수 측정.
2. **EV 정규화** — 과밀 구간의 rate 미세 조정, 과소 구간의 pity threshold 조정.
3. **Collab 기록** — C896-C898 3-cycle 회고 + INDEX 갱신.

## 기능 요구사항

### F1. 이벤트 밀도 곡선 측정
- **목적**: 전 구간 이벤트 분포 실측
- **동작**:
  - sim 또는 단위 테스트로 fight 0-600 을 12개 버킷 (0-49, 50-99, ..., 550-599) 으로 나누어 각 버킷의 이벤트 발생 횟수 집계
  - choice event / consequence event / passive event 별 분리 집계
- **수용 기준**:
  - 12개 버킷 모두에서 이벤트 ≥ 1회 발생 (빈 버킷 0)
  - fight 500-599 버킷: baseline (C895 시점, Last Stand only) 대비 이벤트 종류 Δ ≥ +2
- **반대 기준 (NOT this)**:
  - 새 이벤트 추가 아님 — 측정과 조정만

### F2. EV 정규화 미세 조정
- **목적**: 과밀/과소 구간 해소
- **동작**:
  - F1 측정 결과 기반으로 rate/pity 상수 조정 (상수 변경만, 로직 변경 없음)
  - 조정 대상 예상: Merchant rate, VT pity threshold, Last Stand cooldown
- **수용 기준**:
  - 12개 버킷의 이벤트 횟수 CV (coefficient of variation): 측정 후 결정 (F1 baseline 기반 Δ 설정)
  - vitest 전체 PASS
- **반대 기준 (NOT this)**:
  - 이벤트 보상 수치 변경 아님 — 발생 빈도만

### F3. Collab 기록 + INDEX 갱신
- **목적**: C896-C898 3-cycle 진행 기록
- **동작**:
  - INDEX.md 에 C896-C898 한 줄 요약 추가
  - RESUME.md 갱신
  - 다음 3-cycle (C899-C901) 방향 제안
- **수용 기준**:
  - INDEX.md, RESUME.md 갱신 완료
  - 다음 cycle 방향 1줄 이상
- **반대 기준 (NOT this)**:
  - 코드 변경 없음

## 우선순위 외 backlog
- fight 600+ 구간 신규 이벤트 (예: "Endless Arena", "Final Merchant") — C899+ system cycle 후보
- DurationBuffTracker 의 비-duration buff 확장 (boolean flag tracker) — C899+ structure 후보
- EncounterEngine 의 combat 로직 분리 (CombatEngine 추출) — LOC 추가 절감 후보

## 비고

### 리스크
- C897 F1 (DurationBuffTracker) 이 대규모 리팩터이므로 regression 가능성 높음. vitest 전체 PASS 를 gate 로 설정.
- C896 윈도우 확장이 기존 overlap 로직 (C892 VT 우선) 에 새 edge case 를 만들 수 있음 → C898 에서 실측 검증.

### 컨셉 가드
- 3 cycle 모두 기존 시스템 정교화. 새 메카닉 추가 없음 — "왜 지금?" 에 대한 답: fight 500+ 이벤트 단독 문제가 C895 밸런스 패스에서 확인됨, EncounterEngine 76 buff field 가 3회 이상 약점으로 지적됨 (3의 규칙 해당).
- YAGNI: fight 600+ 이벤트는 현재 도달 빈도가 낮으므로 backlog. DurationBuffTracker 는 76 field 의 실재하는 고통이므로 지금.

### 의존성
```
C896 (system: 윈도우 확장)
  └─ C897 (structure: buff tracker + type debt) — C896 과 독립, 병렬 가능
      └─ C898 (balance: 밀도 검증) — C896 + C897 결과에 의존
```

### 산술 검증
- C896 F1+F2: Merchant 600 + VT 550 + Last Stand 600 = fight 501-550 에 3개, 551-600 에 2개 이벤트 커버. 단독→다수 전환 확인.
- C897 F1: 76 field × ~5 LOC/field (decl + decrement + check + activate + comment) = ~380 LOC. Map 대체 = ~50 LOC. 순 절감 ~330. 보수적 목표 -300 설정.
