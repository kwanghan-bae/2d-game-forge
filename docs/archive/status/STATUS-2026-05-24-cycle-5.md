# STATUS 2026-05-24 — Cycle 5 머지 직후

> 최신 머지: `28e5539` (tag `cycle-5-complete`)
> 직전: Cycle 4 (`ce4cb80`)
> 자율진화 spec: `docs/superpowers/specs/2026-05-24-autonomous-evolution-design.md`

## 한 줄

자율진화 Cycle 5 의 **Stale Realm Bug Fix (3 fix)** full 머지. 사용자 보고
"계속 오류" 의 진짜 root cause — V3-DEF + V3-H compound bug (`endCycle` 가
`run.currentRealmId` 를 reset 안 해서 다음 cycle hero 가 이전 realm 의
pathfinder 에 막혀 candidates 소진 → 5세 즉사) — 를 한 cycle 안에 해소.

## 자율진화 진행 (5 cycles)

| Cycle | Merge | Tag | Key | Status |
|---|---|---|---|---|
| 0 (시드) | `81bea39` | `phase-v3-h-complete` | V3-H | baseline |
| 1 | `bd3ff10` | `cycle-1-complete` | Variance + Realm Tone + NPC Saga | full PASS |
| 2 partial | `be1b8f7` | `cycle-2-partial-complete` | F1 multi-seed 룰 | partial |
| 3 partial | `6135a9a` | `cycle-3-partial-complete` | F1 이중 prefix bug fix | partial |
| 4 | `ce4cb80` | `cycle-4-complete` | Polish Pass (6 fix) | full PASS |
| **5** | **`28e5539`** | **`cycle-5-complete`** | **Stale Realm Bug Fix (3 fix)** | **full PASS** |

## Cycle 5 의 3 fix

| ID | 한 줄 | Commit |
|----|-------|--------|
| F1 | `endCycle` 의 saga record 직후 `run.currentRealmId='base'` + `run.npcs=[]` reset | `d50231e` |
| F2 | persist v22 → v23 migration — 기존 stale 유저 `currentRealmId` 강제 `'base'` | `9c0d93c` |
| F3 | candidates-exhausted cause `'자연사'` → `'무위'` 분리 (saga book 라벨 "출구 없음") | `61115fa` |

## 머지 가드 (Cycle 5)

- typecheck/lint: PASS
- vitest: **1138 / 1138** (cycle 4 baseline 1130 + 8 신규)
- circular: baseline 1 (회귀 0)
- Playwright iPhone 14 검증 3 시나리오: 모두 PASS, console error **0**
  - 시나리오 A (v22 stale state 주입 → reload → v23 migration): `currentRealmId` `sea`→`base` 자동
  - 시나리오 B (새 cycle → 10× idle ~45초): LV 1 → **LV 285606**, age 5 → 26, 회춘 1
  - 시나리오 C (이전 cycle 후 새 cycle): 새 영혼 정상 spawn (base realm), 5세 즉사 0건

## Cycle 5 의 핵심 finding — Stale Realm Compound Bug

이전 cycle 종료 시 `endCycle()` 가 `clearHeroSnapshot()` 만 호출하고
`run.currentRealmId` 를 그대로 두는 **V3-DEF 의 dormant bug** 가, V3-H 의
multi-zone columnBounds pathfinder 가 enforce 되면서 game-breaking 으로
승격됐다.

- **V3-DEF**: `run.currentRealmId` 도입, multi-zone 진입.
  `endCycle` reset 미구현은 당시 visible 영향 없었음 (모든 realm 의 columnBounds
  가 비슷한 col range 였거나, pathfinder 가 더 관대했음).
- **V3-H**: pathfinder 가 `columnBounds` 를 strict 하게 enforce.
  base village (col 1) hero 가 sea realm (cols 21-40) 의 columnBounds 와
  교집합 0 → candidates 소진 → `cycle_ended` emit. default cause `'자연사'`.

**자율진화 발견 경로**: cycle 4 finisher 가 Playwright 로 5세 즉사 epilogue 를
관찰 → cycle 5 정찰 agent 가 localStorage `run.currentRealmId='sea'` 확인 +
patch 후 reload 시 LV 22 in 10s 정상 진행 → root cause 확정.

## Cycle 6 carry-over

### 1순위

- **F4. Pathfinder columnBounds null path 시 fallback retry** — 사후 안전망.
  cycle 5 가 root cause 를 해소했지만 같은 카테고리 bug 의 미래 visibility 와
  방어 코드 가치 있음. PRD 의 carry-over 그대로.
- **a. sagaHistory 5세 stale saga retroactive cleanup** — 현재 누적 사가 4건
  중 3건이 cycle 4 finisher 가 본 5세 평민 LV 1 stale. UI 또는 migration 으로 cleanup.

### 2순위

- **b. `run.*` field cleanup 전수 검토** — `npcs` + `currentRealmId` 외 다른
  cycle-scoped field 도 stale 가능성. 1시간 정찰 + 발견 시 cycle 7 fix.
- **c. prod 빌드 정찰** (`pnpm --filter @forge/game-inflation-rpg build:web`) —
  cycle 4 carry-over 의 미수행. dev 모드는 0 error 였지만 prod 모드 console
  error 또는 SSR/static export warning 가능성. cycle 5 F1 fix 가 prod 도 같이
  정상화시켰을 가능성 큼.

### 3순위

D1-D7 (priest saturator / prudent famine / NPC first-vs-recurring / spare_enemy
moral saturation / levelUp 자릿수 톤 / EternalSaga era key). 모두 multi-seed
acceptance 룰 적용 의무.

## Phase G self-check (Cycle 5 종료)

- 약점 고갈: 미도달 (cycle 6 carry-over 풍부 — F4, saga cleanup, run.* 전수, prod 정찰, D1-D7)
- 3 연속 같은 1순위: 6 cycle 모두 다른 카테고리 (saturation → variance →
  process → prefix bug → polish → **game-breaking bug**). soft-halt 신호 없음
- 자원 추정: cycle 5 는 명확한 1-line fix x 3 + migration 1 + test. implementer
  subagent 한 phase 안에서 PRD full 완수. finisher 가 가드 + Playwright + main 머지
- 사용자 halt: 없음 (사용자 "오랫동안 자리 비울 거야. 자율적으로 개선" — 자율 머지 위임)
- Hard halt: 미발생

**→ cycle 6 진입 가능.** F4 + saga cleanup 추천.

## 사용자 보고 "계속 오류" 최종 판단

**해소됨.** cycle 4 finisher 가 본 5세 즉사 epilogue 의 root cause 가
정확히 endCycle reset 누락 + sea realm 의 columnBounds pathfinder 충돌이라는
것을 정찰 + Playwright 검증 으로 확정. cycle 5 fix 후 같은 시나리오에서
LV 28만+, 26세까지 정상 진행. v22 stale 유저도 reload 시 자동 migration.

cycle 4 의 UI polish 가 사용자 만족 도달 여부의 답이 본 cycle 의 발견이었음 —
**UI polish 이전에 game-breaking bug 가 있어서 사용자가 게임을 시작조차
못 하고 있었던 것**. cycle 5 가 그 vacuum 을 메웠다.

## 자율진화 시스템 검증 결과 (5 cycles 누적)

- **8 페르소나** 모두 1+ 회 invoke
- **7 phase A-G** 전부 실행. cycle 1+4+5 full / cycle 2+3 partial
- **머지 가드** 자율 통과 (1138 PASS)
- **자율 root cause 발견**: cycle 4 finisher Playwright observation → cycle 5
  정찰 agent root cause 분석 → cycle 5 implementer 3 fix. 사용자 개입 0
- **Multi-seed 룰** cycle 2 → 3 검증 효과 입증
- **병렬 그룹 dispatch** cycle 4 첫 시도, merge conflict 0
- **Soft halt 의 합리적 사용**: cycle 2/3 partial → cycle 4 full 회복
- **사용자 자율 위임 모드** 2 cycle 연속 (4 + 5). 가드 통과 시 main 머지까지
  자율 진행. cycle 5 가 첫 game-breaking bug 자율 발견+해소 cycle
