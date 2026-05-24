# Cycle 5 PRD — Stale Realm Bug Fix (사용자 보고 "계속 오류" root cause)

## 한 줄

V3-DEF + V3-H compound bug — `endCycle()` 가 `run.currentRealmId` 를 reset 안 해서 다음 cycle 의 hero (base village col 1 spawn) 가 sea realm columnBounds (cols 21-40) pathfinder 에 막혀 candidates 소진 → 5세 즉사 epilogue. 사용자 보고 "계속 오류" = 이 game-breaking bug.

정찰 보고: agent `ac48030ccc2df6b72`.

## Root cause 흐름

1. 이전 cycle 종료 → `endCycle()` → `clearHeroSnapshot()` 만 호출. `run.currentRealmId` 는 `'sea'` 또는 마지막 realm 으로 stale.
2. 새 cycle → `OverworldScene.create` → mapLayout 의 base village (col 1) 에 hero spawn.
3. `pickNextDestination` 의 `columnBounds = findRealm('sea').columnRange = [21, 40]`. hero 는 col 1.
4. 모든 path null → candidates consumed → `cycle_ended` emit (1 frame 내).
5. `endCycle()` 의 default cause `'자연사'` 5세 saga.

증거:
- localStorage `run.currentRealmId = "sea"`
- `meta.sagaHistory` 3 건 모두 `finalAge:5 / finalJob:"평민" / cause:"자연사" / eventCount:0`
- patch `currentRealmId = 'base'` 후 reload → LV 22 in 10s 정상

## 우선순위

1. **F1 (must)**: `endCycle` reset `currentRealmId='base'` + `run.npcs=[]` (1 file)
2. **F2 (must)**: persist v22 → v23 migration. 기존 stale 유저 base reset (cycle 4 finisher 가 확인한 saga 3건 base 도 해당)
3. **F3 (must)**: Default endCause `'자연사'` → candidates 소진 시 `'exit_lost'` 별도 cause. 미래 동급 bug 즉시 visible.
4. **F4 (carry-over, defer)**: Pathfinder columnBounds null path 시 fallback retry (사후 안전망). 1-line 이지만 logic test 필요해서 cycle 5 의 자원 절약 위해 cycle 6 으로 미룸.

## F1-F3 acceptance

### F1. endCycle realm reset

- 파일: `games/inflation-rpg/src/overworld/cycleSliceV2.ts:77-115` (`endCycle`)
- 변경: `endCycle` 함수 안 sagaHistory 기록 직후 `run.currentRealmId = 'base'` + `run.npcs = []`
- Unit test: `endCycle` 호출 후 `getState().run.currentRealmId === 'base'`, `getState().run.npcs.length === 0`
- e2e: 새 cycle 시작 → 10초 idle → hero LV > 1 (실제 진행)

### F2. persist v22 → v23 migration

- 파일: `games/inflation-rpg/src/store/gameStore.ts` (현 `STORE_VERSION` 22 → 23)
- migration: `run.currentRealmId = 'base'` 강제. 기존 v22 state load 시 적용
- Unit test: v22 state ({ run: { currentRealmId: 'sea', ... }, ... }) load 후 currentRealmId === 'base'
- localStorage v22 backup 한 시점에서 reload 시 즉시 정상 진행 확인

### F3. exit_lost cause 분리

- 파일: `games/inflation-rpg/src/overworld/CycleControllerV2.ts:513` (`finalize` 의 `endCause ?? '자연사'`)
- 변경: candidates 소진 path 에서 emit 하는 cycle_ended 의 cause 를 `'exit_lost'` (또는 `'무위'`) 로 명시. default `'자연사'` 는 진짜 자연 수명 도달 시에만
- Unit test: candidates 소진 reproduce → cause === 'exit_lost' (또는 새 명칭)
- Saga book / EternalSaga 의 cause 표시도 한 줄 추가 (한글 label "출구 없음" / "길을 잃다")

## 반대 기준 (NOT this)

- F4 (pathfinder fallback) — cycle 6
- D1-D7 backlog (priest saturator 등) — cycle 6+
- run.npcs clear 외 다른 run.* field 의 cleanup — 본 cycle 의 scope 외 (필요 시 carry-over)
- sagaHistory 의 stale saga 3건 retroactive 삭제 — 본 cycle 외

## 머지 가드

- typecheck/lint: PASS
- vitest: 1130 baseline + 신규 (F1 1 + F2 1 + F3 2 = 4+)
- circular: baseline 1 (회귀 0)
- e2e: dev server 정상 시작 → 새 cycle 10초 idle → hero LV > 1 + age > 5 (Playwright 검증)
- localStorage migration: 가짜 v22 state ({ currentRealmId: 'sea' }) load 후 v23 로 자동 migrate

## Phase G self-check 예상

- 약점 고갈: ✗ (F4 + a/b/c carry-over + D1-D7)
- 3 연속 같은 1순위: cycle 0 saturation → 1 variance → 2 process → 3 prefix bug → 4 polish → **5 game-breaking bug**. 모두 다른 카테고리. soft-halt 신호 없음.
- 자원 추정: cycle 5 는 명확한 1-line fix x 3 + migration 1 + test. 한 implementer subagent 로 full cycle 가능.
- 새 cycle 진입 가능.

## Cycle 6 carry-over

- F4 pathfinder fallback (사후 안전망)
- a) sagaHistory 5세 stale saga retroactive cleanup (UI 또는 migration)
- b) run.* field 의 cleanup 전수 검토 (npcs 외 다른 field 도 stale 가능성)
- c) prod 빌드 정찰 (`pnpm --filter @forge/game-inflation-rpg build:web`) — 이건 cycle 4 정찰의 carry-over 였음. cycle 5 의 F1 fix 가 들어가면 prod 빌드도 같이 정상화될 가능성 큼
- d) D1-D7 backlog (priest saturator structural / prudent dim source famine / MAX_ARRIVALS + idle 회춘 / NPC first-vs-recurring 필터 / spare_enemy moral saturation / levelUp 자릿수 톤 / EternalSaga era key 동적 생성)
