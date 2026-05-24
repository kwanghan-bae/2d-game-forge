# Cycle 7 PRD — Pathfinder Fallback + Stale Saga Cleanup + 정찰 정확도

## 한 줄

Cycle 5+6 의 2 이월 carry-over 정리 — (F4) Pathfinder columnBounds null 시 fallback retry 사후 안전망, (S1) sagaHistory 의 5세 stale saga 3건 retroactive cleanup, (R1) 정찰 정확도 페르소나 doc patch.

정찰 skip (cycle 6 finisher 가 1순위 핀포인트 + 자율진화 회고 작성, 모두 명확).

## F4 — Pathfinder columnBounds null fallback retry

### Context

Cycle 5 의 stale realm bug root cause 분석에서 발견:
- `OverworldScene.pickNextDestination` 의 `columnBounds = findRealm(this.currentRealm).columnRange` 가 hero col 범위 밖일 때 모든 path null
- Cycle 5 가 root (currentRealmId reset) 해소
- F4 = 만일 미래에 동일 카테고리 bug 재발 시 즉시 fallback 으로 안전망

### 구현

- 파일: `games/inflation-rpg/src/overworld/OverworldScene.ts` 의 `pickNextDestination` (정찰 시점 line 149-180 추정)
- 변경: `columnBounds` 적용 후 path null 이면 한 번 더 columnBounds 없이 retry. 그래도 null 이면 consumed
- log: 첫 columnBounds path null + retry-succeeded 시 console.warn 또는 telemetry — 미래 stale realm 류 bug 즉시 visible

### 수용

- Unit test: hero col 1, currentRealm 'sea' (cols 21-40), target col 5 (sea 밖) — first attempt null, retry without bounds 후 path 반환
- Unit test: hero col 25 (sea 안), target col 30 (sea 안) — first attempt 성공, retry 호출 안 됨
- Telemetry: retry-succeeded count = N (test 환경에서 N ≥ 1)
- 회귀: cycle 5 의 stale realm fix 가 retry 발동 0 인 일반 상황에서 변화 없음

## S1 — sagaHistory 5세 stale saga retroactive cleanup

### Context

Cycle 4 finisher 가 본 + cycle 5 정찰 확인 + cycle 6 정찰 추가 확인:
- `meta.sagaHistory` 의 첫 3-4 건이 cycle 5 fix 전 stale (5세 평민 LV 1 자연사 / eventCount 0)
- 사용자 saga book 첫인상 망침
- Cycle 6 의 P1 fix 는 새 entry 만 정상 — 기존 stale 은 잔존

### 구현 옵션

(a) **UI hint** — saga book 의 stale entry 에 "이 사가는 이전 버전의 bug 로 생성됨" 라벨. Retroactive 안 함, 단지 사용자가 알도록
(b) **Migration v23 → v24** — stale entry 자동 삭제 (eventCount === 0 AND finalAge ≤ 5 AND deathCause === '자연사' AND finalLevel ≤ 1 의 4-조건 AND)
(c) **사용자 명시 삭제 UI** — saga book 에 "삭제" 버튼

권장: **(b) Migration v23 → v24**. 사용자 개입 없이 한 번에 cleanup. 조건 매우 엄격해서 false positive risk 거의 0.

### 수용

- Unit test: `migrateV23ToV24` 가 stale entry 4-조건 매칭 시 삭제, 정상 entry 보존
- Unit test: 정상 entry (eventCount > 0 또는 finalLevel > 1 등) 는 그대로
- E2E or unit: localStorage 에 가짜 v23 state + sagaHistory 3 stale + 1 정상 → reload → sagaHistory 1 정상만 남음
- 회귀: cycle 6 의 P1 fix 가 만드는 새 entry 는 stale 조건 충족 안 함 (finalLevel > 1 일 가능성 매우 높음)

## R1 — 정찰 정확도 페르소나 doc patch

### Context

Cycle 6 implementer 가 회고:
- 정찰 보고 가끔 over-claim. cycle 6 정찰의 "saga book 빈 4 카드" 주장은 screen-04 와 모순 (실제로는 eternalSaga 읽음).
- Cycle 4 정찰의 "console 계속 오류" 도 실제로는 favicon 404 1건만.
- **정찰 보고를 신뢰할 수 없으면 cycle 의 fix 방향이 잘못 잡힘 — implementer 의 분석 시간이 추가 소요**.

### Fix

페르소나 `docs/personas/04-game-critic.md` (게임비평가) 와 `docs/personas/02-qa.md` (QA) 의 "사고 방식" 또는 "절대 금지" 에 root cause 가설 항목 추가:

> **확정 grep query 룰**: 보고에 포함된 모든 "X 가 빈/없음/잘못됨" 주장은, 보고서에 *확정 grep query 1개* (또는 동등 빌드/실행 명령) 를 첨부한다. grep 결과 첨부 없는 "X 가 빈" 주장은 보고 금지.

또는 더 강한:

> **Root cause 후보 3 + 확정 query**: 모든 P0/P1 약점 보고는 root cause 후보 3 개 (또는 그 이하) 와 각 후보의 확정 grep query / 빌드 명령 / 실행 절차 1 개를 첨부한다. 후보 0 또는 query 0 인 보고는 partial — implementer 가 root cause 부터 시작.

### 수용

- `docs/personas/02-qa.md` 또는 `docs/personas/04-game-critic.md` 에 위 룰 추가
- 한국어 평서문 ~다체
- Unit test 없음 (doc 변경)
- 본 cycle 의 implementer 가 추가하면서 cycle 6 의 회고를 commit message body 에 인용

## 우선순위

- 동시 dispatch 가능 (서로 다른 파일):
  - F4: `OverworldScene.ts` + unit test
  - S1: `gameStore.ts` 의 migration + unit test
  - R1: `docs/personas/02-qa.md` 또는 `04-game-critic.md`

한 implementer subagent 가 3 fix 묶음.

## 머지 가드

- typecheck/lint PASS
- vitest 1147 baseline + 신규 (F4 2+ + S1 2+ + R1 0 = 4+)
- circular baseline 1
- Playwright (finisher 단계): stale saga 삭제 검증 + F4 fallback trigger 안 함 in 일반 case

## Phase G self-check 예상

- 약점 고갈: ✗ (cycle 6 finisher 가 추가한 staggered field carry-over + D1-D7 + content/balance/realm 정체 등)
- 3 연속 같은 1순위: ... → 5 game-breaking bug → 6 store↔UI 동기화 → **7 carry-over 정리**. 다른 카테고리.
- 자원 추정: cycle 5 와 비슷 (3 fix 명확)

## Cycle 8+ carry-over

- HeroSnapshot 의 `staggered` field 누락 (cycle 6 carry-over)
- prod 빌드 추가 정찰 (cycle 6 D 가 30초 idle 만 — 더 긴 시나리오 + 모바일 viewport 추가)
- realm 정체 (10× 4분에 stage 3/6 stuck) — Stage progression rate 문제 (Cycle 8+ content/balance)
- 학습 스킬 1개 / 신의 가호 0 / 장비 0/1 의 surface 빈약 (Cycle 8+ content/balance)
- D1-D7 backlog (priest saturator 등) — Cycle 8+
- run.* field stale cleanup 전수 검토 (cycle 5 의 npcs / cycle 6 의 staggered 외 추가)
