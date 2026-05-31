# Cycle 946 Planner — 6-Cycle Roadmap (C947–C952)

category: meta

## 상황 요약

| 지표 | 현재값 | 목표 |
|------|--------|------|
| EncounterEngine LOC | 2785 | ≤1900 (Δ −885) |
| 수동 `*Remaining` 필드 | ~277 (grep 기준) | 0 (DurationBuffTracker 완전 이전) |
| constants import 심볼 수 | 600+ (단일 import 라인) | ≤200 (namespace 분할) |
| getCombatSummary hardcoded 이름 | 60+ | 0 (BuffCatalog lookup) |
| 520-600 구간 이벤트 공백 | 3 events seeded (C941) | +2 추가 필요 |

## 완료 아크 회고 (C938–C946)

- **Stat Shard 영구보상** (C938): 비-buff 보상 축 신설 → 플레이어 장기 동기
- **Late-game seeding** (C940-941): 520-570 gap 에 3 이벤트 → 아직 570-600 미해결
- **BuffCatalog** (C944): 메타데이터 중앙화 → getCombatSummary 이전 진입점 확보
- **Duration migration ×3** (C945): midGameBuffs 로 3 필드 이전 → *Remaining* 277→~274
- **Density invariants** (C946): 아크 검증 테스트 통과

## 카테고리 순환 (룰 9 준수)

최근 3 cycle 카테고리: C944 system → C945 structure → C946 balance

C947–C952 계획:
| Cycle | 카테고리 | 축 |
|-------|----------|-----|
| C947 | **structure** | 구조 감축 |
| C948 | **system** | 재미 증폭 |
| C949 | **balance** | 밸런스 조정 |
| C950 | **structure** | 구조 감축 |
| C951 | **narrative** | 재미 증폭 (체감) |
| C952 | **chore** | 기술 부채 정리 |

---

## C947 — Constants Namespace 분할 Phase 1

category: structure

### 한 줄
600+ 심볼 단일 import 를 5 개 namespace module 로 분할하여 EE import 가독성 회복.

### 기능 요구사항

**F1. constants 파일 분할**
- **목적**: 단일 `constants.ts` (528 LOC, 600+ export) 가 인지 부하의 근원. 도메인별 분리로 관련 상수만 import.
- **동작**:
  - `constants-combat.ts` (전투 핵심: CRIT, COMBO, OVERKILL 계열)
  - `constants-economy.ts` (GOLD, BANK, SHOP, FORGE 계열)
  - `constants-progression.ts` (EXP, PRESTIGE, LEVEL 계열)
  - `constants-events.ts` (기존 유지 — WEATHER, MERCHANT, SHRINE 등)
  - `constants-meta.ts` (SEASON, TEMPORAL, SYNERGY, RELIC 계열)
  - barrel `constants/index.ts` 로 re-export → 기존 import path 호환 유지
- **수용 기준**:
  - EE import 라인 600+ 심볼 → 5 개 namespace import 각 ≤150 심볼
  - typecheck PASS, 기존 테스트 0 regression
- **반대 기준**: 런타임 동작 변경 없음. 새 상수 추가 금지.

### LOC 영향
EE 본체 변경 최소 (import 라인 축소 → −20~30 LOC). 주로 파일 이동.

---

## C948 — 570-600 구간 이벤트 2종 추가

category: system

### 한 줄
C941 이 채운 520-570 이후 남은 570-600 공백에 2 개 mid-late 이벤트 추가.

### 기능 요구사항

**F1. Echo Memory (fight 571-590)**
- **목적**: 장기 플레이어에게 "과거 성장 반영" 체감. Critic 지적 공백 해소.
- **동작**:
  - 발동 조건: fight 571+ AND totalPrestige ≥ 2
  - 효과: ATK × ECHO_MEMORY_ATK_MUL (기존 상수 재사용) for 15 fights
  - BuffCatalog 등록 필수
- **수용 기준**: sim 50-cycle 에서 해당 구간 event firing rate > 0

**F2. Shard Fusion (fight 591-610)**
- **목적**: Stat Shard (C938) 와 시너지. 영구 보상 축 강화.
- **동작**:
  - 발동 조건: fight 591+ AND statShardCount ≥ 3
  - 효과: 영구 ATK + SHARD_FUSION_ATK_REWARD (기존 상수)
  - PermanentRewardTracker 에 기록
- **수용 기준**: sim 에서 조건 충족 시 영구 ATK 증가 확인

---

## C949 — Late-game Pity Ramp 튜닝 + Density Invariant 강화

category: balance

### 한 줄
C943 pity ramp (500→12, 700→10, 800+→9) 의 체감 검증 및 미세 조정.

### 기능 요구사항

**F1. Pity interval smooth curve**
- **목적**: 계단식(12/10/9) → 연속 감소 곡선으로 전환. 구간 경계 체감 단절 해소.
- **동작**: `getPityInterval(fight)` 헬퍼 — `Math.max(9, 15 - floor((fight-400)/150))` 같은 연속 함수
- **수용 기준**: fight 400-1000 구간 event density monotone non-decreasing (invariant test)

---

## C950 — DurationBuffTracker Phase 5: *Remaining* 일괄 이전 (30 필드)

category: structure

### 한 줄
EE 의 ~277 *Remaining* 수동 필드 중 30 개를 DurationBuffTracker 로 이전. LOC −150 목표.

### 기능 요구사항

**F1. Batch migration 30 fields**
- **목적**: C945 에서 3 필드/cycle → 이제 패턴 안정화됨. 10× 배치로 가속.
- **동작**:
  - 이전 대상: combat 관련 duration buffs (SHRINE, VILLAGE, BOSS_FURY 등 30 개)
  - 각 필드: `xyzRemaining` 제거 → `tracker.tick(id)` / `tracker.activate(id, duration)` 패턴
  - getCombatSummary 는 BuffCatalog 에서 자동 수집
- **수용 기준**:
  - EE LOC: baseline 2785 대비 Δ ≤ −150
  - `grep -c "Remaining" EncounterEngine.ts`: baseline 277 대비 Δ ≤ −30
  - 기존 테스트 0 regression
- **반대 기준**: 새 buff 추가 금지. 순수 리팩토링.

---

## C951 — Narration Flavor: Late-game 전투 묘사 3종

category: narrative

### 한 줄
fight 500+ 구간 전용 battleFlavorText 3 세트 추가. "공백 체감" 의 텍스트 축 보강.

### 기능 요구사항

**F1. Late-game flavor text pool**
- **목적**: Critic 의 "520-600 공백 체감" 은 이벤트 밀도뿐 아니라 텍스트 단조로움도 원인.
- **동작**:
  - `battleFlavorText.ts` 에 fight 500+ 전용 pool 3 개 (각 5-8 variants)
  - 테마: 고대 유적 / 차원 균열 / 영혼의 시련
  - fight threshold 조건부 선택 로직 추가
- **수용 기준**:
  - fight 500+ 에서 flavor text pool 이 early-game 과 겹치지 않음 (invariant test)
  - narrationVariants.test.ts 통과

---

## C952 — getCombatSummary BuffCatalog 완전 이전

category: chore

### 한 줄
getCombatSummary 내 60+ hardcoded 이름을 BuffCatalog lookup 으로 교체. Dead code 제거.

### 기능 요구사항

**F1. BuffCatalog-driven summary**
- **목적**: C944 BuffCatalog 가 존재하나, getCombatSummary 는 여전히 수동 문자열 나열. 이중 관리 제거.
- **동작**:
  - `activeBuffInfos` 를 `BuffCatalog.getActive(tracker)` 한 줄로 교체
  - hardcoded `if (xyzRemaining > 0) push(...)` 60+ 개 제거
  - C950 이후 *Remaining* 30 개 감소 전제 → 잔여 ~247 중 tracker 이전 완료분만 대상
- **수용 기준**:
  - getCombatSummary 메서드 LOC: baseline 대비 Δ ≤ −80
  - BuffCatalog.getActive 와 수동 수집 결과 동일 (snapshot test)
- **반대 기준**: tracker 미이전 필드는 그대로 유지 (점진적 이전 원칙).

---

## 6-Cycle 누적 효과 예측

| 지표 | C946 (현재) | C952 (예상) | Δ |
|------|-------------|-------------|---|
| EE LOC | 2785 | ~2500 | −285 |
| *Remaining* 필드 | 277 | ~247 | −30 |
| constants 단일 import | 600+ | 5×≤150 | 구조 개선 |
| 520-600 이벤트 수 | 3 | 5 | +2 |
| getCombatSummary 수동 이름 | 60+ | ~30 | −30 |
| battleFlavorText 500+ pool | 0 | 3 세트 | +3 |

## 리스크 & 의존성

1. **C950 배치 이전 30 필드**: 한 cycle 에 30 필드 변경은 regression 위험. 반드시 기존 테스트 커버리지 확인 후 진행.
2. **C952 는 C950 의존**: tracker 이전 완료 필드만 BuffCatalog 교체 가능. C950 지연 시 C952 스코프 축소.
3. **카테고리 룰 9**: C947 structure → C948 system → C949 balance → C950 structure = 3 cycle 간격으로 structure 반복. 허용 범위 (연속 아님).

## 컨셉 가드

모든 변경은 "1 → 수십만 레벨 폭발, 자율 진화하는 idle hero sim" 정체성 유지:
- 구조 감축 = 자율진화 속도 향상 (작은 변경 → 빠른 cycle)
- 이벤트 추가 = 장기 진행 체감 강화 (idle 의 핵심 = "방치해도 새로운 일이 일어남")
- Narrative = 텍스트 다양성으로 세계관 깊이 (hero sim 의 서사축)

---

*작성: Cycle 946 기획 완료. 다음 dispatch: C947 structure (constants 분할).*
