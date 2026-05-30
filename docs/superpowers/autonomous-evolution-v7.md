# 자율진화 게임 개발 프로토콜 v7

## v6 에서 배운 것

v6 는 5레이어 순환과 10사이클 평가를 **규칙으로 명시**했으나, 실행을 **강제하는
hook**이 없었다. 결과:

- **RESUME.md 미생성**: 세션 간 상태 전달 실패. compaction 후 카운터 유실.
- **협의 기록 미영속**: sub-agent 결과가 context 안에만 존재, 파일로 안 남음.
- **평가 80% 누락**: C571~C650 (80사이클) 중 평가 2회 (10사이클마다면 8회 필요).
- **레이어 편향**: C630~C650 전체가 밸런스+구조만. UI/비주얼/시스템 = 0회.
- **100사이클 완주 실패**: 매번 30~50사이클에서 세션 종료.

**근본 원인**: context compaction 이후 "언제 뭘 했는지" 상태가 사라지면
관성적으로 가장 쉬운 작업만 반복. RESUME.md가 유일한 진실 소스여야 하는데
작성을 안 함.

---

## v7 핵심 변경 (v6 대비)

| 항목 | v6 | v7 |
|------|----|----|
| RESUME.md | 형식만 명시 | **매 사이클 종료 시 필수 갱신** |
| 협의 기록 | 없음 | **파일 영속 필수** (`cycle-N-collab.md`) |
| 평가 주기 | 10사이클 (미강제) | **3사이클 — RESUME.md 카운터로 강제** |
| 평가 범위 | 7 에이전트 전원 | **핵심 3+선택 2** (속도 vs 깊이 균형) |
| 세션 목표 | 100사이클 | **30사이클 단위** (현실적 완주 보장) |
| 레이어 체크 | 10사이클 사후 확인 | **매 사이클 시작 시 RESUME 읽고 결정** |

---

## 5 레이어 정의 (v6 유지)

| # | 레이어 | 범위 | 예시 |
|---|--------|------|------|
| 1 | **구조** | 리팩터, 모듈 분리, 타입 정리 | EncounterEngine 분리 |
| 2 | **시스템** | 게임 로직 변경 (선택 기반만) | 이벤트 선택지 |
| 3 | **UI/UX** | React 컴포넌트, 화면, 모달 | 전투 HUD 개선 |
| 4 | **비주얼/사운드** | 에셋, 이펙트, BGM, SFX | 전투 이펙트 |
| 5 | **데이터/밸런스** | 수치 조정, 콘텐츠 추가 | 몬스터 밸런스 |

---

## 강제 순환 규칙

**연속 제한**: 동일 레이어 **2회 연속 금지**.

**6사이클 예산** (매 평가 시점에 체크):
- 5 레이어 각각 최소 1회 이상 (6사이클이니 1개만 2회)
- 미달 레이어 → 다음 사이클 즉시 강제 배정

---

## 사이클 구조

### 매 사이클 — 5단계 (건너뛸 수 없음)

```
┌─────────────────────────────────────────────────────────┐
│ STEP 0: RESUME.md 읽기 → 레이어/카운터/lock 확인        │
│ STEP 1: 레이어 선택 (lock과 예산 기반)                   │
│ STEP 2: 구현 + 테스트                                   │
│ STEP 3: 커밋                                            │
│ STEP 4: RESUME.md 갱신 (cycle++, layer budget 갱신)     │
└─────────────────────────────────────────────────────────┘
```

**STEP 0 없이 STEP 2 금지.** RESUME.md를 읽지 않고 코드를 수정하지 않는다.

### 매 3사이클 — 협의 (MANDATORY)

**트리거**: RESUME.md의 `cycles_since_collab` 가 3 이상이면 **다음 사이클은
반드시 협의 사이클**.

**협의 사이클 절차**:

1. **에이전트 dispatch** (필수 3 + 선택 2):
   - 필수: `game-critic`, `level-designer`, `game-planner`
   - 선택 (레이어 예산 부족 기준): `ui-ux-designer`, `qa-engineer`,
     `story-writer`, `asset-investigator` 중 2개
2. **결과 영속**: `docs/superpowers/evolution/cycle-N-collab.md` 에 기록
   - 각 에이전트 핵심 피드백 요약
   - 합의된 다음 3사이클 작업 목록
   - 거부한 제안과 사유
3. **RESUME.md 갱신**: `cycles_since_collab = 0`, `next_3_cycles` 갱신

**협의 없이 4번째 사이클 진행 금지.**

---

## RESUME.md 형식 (강제)

파일 위치: `docs/superpowers/evolution/RESUME.md`

```markdown
# RESUME — v7

## 상태
- Cycle: N
- Target: N+30 (이번 세션 목표)
- Last commit: SHA (subject)
- Vitest: XXXX passed | E2E: XX passed

## 레이어 카운터 (이번 6-cycle era)
- 구조: X
- 시스템: X
- UI/UX: X
- 비주얼: X
- 밸런스: X
- Era start: CN

## 제약
- Layer lock: [직전 레이어] (동일 레이어 연속 금지)
- cycles_since_collab: N (3 도달 시 다음은 협의 사이클)
- File budget (6-cycle): {파일명: 수정횟수} (동일 파일 6회 이상 금지)

## 다음 3사이클 (협의에서 확정)
1. [레이어] 작업 내용
2. [레이어] 작업 내용
3. [레이어] 작업 내용

## 캐리오버 (미완료)
- [ ] 항목1
- [ ] 항목2
```

**이 파일이 없으면 사이클 시작 불가. 첫 행동은 RESUME.md 생성.**

---

## 협의 기록 형식

파일: `docs/superpowers/evolution/cycle-N-collab.md`

```markdown
# Cycle N 협의

## 참여 에이전트
- game-critic: [한줄 핵심]
- level-designer: [한줄 핵심]
- game-planner: [한줄 핵심]
- (선택 에이전트들)

## 합의 사항
- 다음 3사이클: [작업 목록]
- 우선순위 변경: [있으면]
- 거부된 제안: [사유 포함]

## 수치 스냅샷
- EncounterEngine.ts: XXXX줄
- 테스트: XX passed
- Death rate (sim): XX%
```

---

## 금지 사항 (v6 유지 + 추가)

### 절대 금지

1. **새 곱셈기 추가 금지** — ATK/EXP/Gold formula에 `* newMul` 추가 불가
2. **자동발동 메카닉 추가 금지** — 모든 새 시스템은 플레이어 선택 개입 필수
3. **단일 파일 800줄 초과 금지** — 초과 시 분리가 해당 사이클 작업
4. **6사이클 연속 동일 파일 수정 금지** — File budget 추적

### 프로세스 (신규 강제 hook)

5. **RESUME.md 없이 코드 수정 금지** — 첫 행동은 항상 RESUME.md 읽기/생성
6. **협의 없이 4사이클 연속 진행 금지** — cycles_since_collab 카운터 강제
7. **협의 결과 파일 미생성 시 다음 사이클 진행 금지**
8. **세션 종료 시 RESUME.md 반드시 최신 상태로 커밋**

### 품질

9. **통합 증명 필수** — 새 코드가 플레이어에게 보이는 경로 증명
10. **Dead code 금지** — export 했으면 import 하는 곳 있어야 함
11. **테스트는 행동 검증** — 존재 확인 테스트 금지

---

## 세션 운영

### 세션 시작

```bash
# 1. 상태 확인
git log --oneline -5 && git status --short

# 2. RESUME.md 읽기
cat docs/superpowers/evolution/RESUME.md

# 3. 프로토콜에 따라 사이클 시작 (또는 협의 사이클)
```

### 세션 종료 (30사이클 완주 또는 context 부족)

1. 현재 사이클 완료 + 커밋
2. RESUME.md 갱신 + 커밋
3. `task_complete` 로 요약 보고

### Compaction 대비

RESUME.md가 **유일한 진실 소스**. Compaction summary가 아무리 길어도
RESUME.md 한 파일만 읽으면 정확히 어디서 재개하는지 알 수 있어야 한다.

---

## 사용법

```
# 시작 (C651부터)
이 프로토콜(autonomous-evolution-v7.md)로 자율진화 시작.

# 이어서
이 프로토콜(autonomous-evolution-v7.md)로 자율진화 이어간다.
```

재개 절차:
1. `docs/superpowers/evolution/RESUME.md` 읽기
2. `cycles_since_collab` 확인 → 3 이상이면 협의 사이클
3. 레이어 lock/예산 확인 → 다음 레이어 결정
4. 사이클 실행
