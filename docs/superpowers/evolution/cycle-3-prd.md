# Cycle 3 PRD — Partial (이중 괄호 prefix bug fix)

## 한 줄

Cycle 1 F2 implementation 의 regression bug (`(N세) (N세) 짠 공기가...` 이중 prefix) 만 fix 후 머지. 나머지 약점 (priest saturator multi-seed confirmed / monk-ranger 봉인 / MAX_ARRIVALS / NPC first-vs-recurring / spare_enemy saturate) 은 cycle 4 backlog.

## 평가 핀포인트

- **게임비평가**: ① priest pivot noise 확정 (multi-seed Δ -0.007) ② monk/ranger 봉인 ③ NPC variant 고갈 + **이중 괄호 prefix 버그**
- **스토리작가**: ① **이중 괄호 prefix 버그** (c4096 25줄/c4121 7줄) ② NPC "첫 조우" 톤 위반 ③ spare_enemy 70.4% saturate
- **레벨디자이너**: ① priest saturator (Δ-from-multi-seed-baseline ≤ 0.30 목표) ② prudent source famine ③ MAX_ARRIVALS=500 4 sub-symptom root cause

## 우선순위

1. **F1 — 이중 괄호 prefix bug fix** — 평가 2 인 (critic + story) 공통. cycle 1 의 F2 implementation regression. 1-2 commit 분량. cycle 3 의 자원 추정 trigger (현 ~85% context) 안에서 안전 진행.
2-N: 모두 cycle 4 backlog carry-over (자원 추정 trigger 회피)

## 기능 요구사항

### F1. 이중 괄호 prefix bug fix

- **목적**: Cycle 1 F2 (`forRealmEnter` / `forSeasonChange` / `forNpcEncounter` / `forNpcDeath` / `forFamilyEvent`) 의 variant 텍스트가 `(AGE세) ...` 로 시작하는데, `sim-cycle-v2.ts:330` 또는 동등 renderer 가 또 한 번 `(N세) ` prefix 를 prepend 해서 이중 prefix 발생. **사용자 visible regression**.
- **동작**:
  - 두 옵션 (구현자가 grep 후 선택):
    - (A) variant catalog (`data/narrationVariants.ts`) 의 모든 entry 에서 `(AGE세) ` prefix 제거 → 생성된 텍스트는 본문만, renderer 가 prefix 담당.
    - (B) renderer 에서 variant 가 이미 `(N세)` 로 시작하는지 detect 후 skip prefix.
  - (A) 가 데이터 cleaner 하지만 variant 가 prefix 를 본문 일부로 활용하는 경우 (예: "(15세에는 평범한)") fail. grep 으로 그런 case 가 있는지 확인 후 결정.
  - 정상화 후 sim 재실행 → 이중 괄호 0 회 확인.
- **수용 기준**:
  - `grep -E '\([0-9]+세\) \([0-9]+세\)' /tmp/cycle-3-post-sim/c*.jsonl /tmp/cycle-3-post-sim/c*.md` → 0 line
  - vitest 1088 (cycle 2 baseline) 회귀 없음
  - 기존 F2 unit test (forRealmEnter/forSeasonChange variant 다양성) 회귀 없음
- **반대 기준 (NOT this)**:
  - NPC "첫 조우" 필터 도입 (cycle 4 carry-over)
  - spare_enemy frequency 조정 (cycle 4 carry-over)
  - MAX_ARRIVALS / priest saturator / monk-ranger valley (모두 cycle 4)

## 우선순위 외 backlog (cycle 4 carry-over)

### D1. Priest saturator structural (multi-seed 0.453 confirmed)

- `MERCIFUL_PROC_RATE 0.10 → 0.05` + `priest.min 3 → 5` (level-critic 수치 1)
- 수용: 3-seed maxShare priest ≤ 0.30 (Δ ≥ 0.15)

### D2. Prudent dim source famine

- `PERSONALITY_ENCOUNTERS` 의 prudent source 1 → 2 (treasure_cave + 신규 1)
- 수용: monk+ranger 3-seed ≥ 5%

### D3. MAX_ARRIVALS sim cap + idle 회춘 trigger

- `MAX_ARRIVALS 500 → 1000` + idle 회춘 trigger 추가 (age 임계 또는 arrivals 임계)
- 수용: cyclesWithRejuvenation 3-seed ≥ 5

### D4. NPC first-vs-recurring 필터

- `CycleControllerV2.ts:388` 에 npc id 기반 first/recurring 분기
- forNpcEncounter 의 `kind` 에 `recurring_rival` 등 추가 variant

### D5. spare_enemy moral saturation

- `PERSONALITY_ENCOUNTERS` weighting 조정 또는 spare_enemy variant 8 → 24

### D6. levelUp 자릿수 톤 (cycle 1+2 carry-over)

### D7. EternalSaga era key 의 chapter title 동적 생성

## 비고

### 자원 추정

Cycle 3 partial scope = F1 (1-2 commit) 만. cycle 1+2+3 누적 ~85% context. F1 머지 후 Phase G hard halt 또는 사용자 confirm gate.

### Multi-seed 룰의 첫 검증 결과

planner persona 의 새 룰 (df8b3a0 머지) 이 cycle 3 의 평가에서 즉시 효과 발휘:
- single-seed 1024 의 priest 0.40 outlier 가 진실 (multi-seed 0.453) 로 정정됨
- F1 의 skillsLearned (9.0) 가 multi-seed 견고 = 진짜 win 확인
- monk/ranger 의 0.7% = single-seed sample 부족이 아니라 systemic famine 확인

PRD F2/F3 (cycle 2 의 C1/C2) 가 cycle 3 에서 D1-D7 으로 expand — 더 정밀한 수치 제안 가능. 다만 자원 추정 trigger 안에서는 cycle 4 의 input.

### 3 의 규칙 가드

cycle 0 saturation → cycle 1 variance → cycle 2 process → cycle 3 prefix bug fix. 서로 다른 카테고리, soft-halt 신호 없음.
