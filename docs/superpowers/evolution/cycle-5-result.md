# Cycle 5 결과 (Full Merge)

> 상태: **full merged** — 3 fix (F1 + F2 + F3) 모두 main 으로 머지.
> PRD: [`cycle-5-prd.md`](cycle-5-prd.md)
> 정찰: agent `ac48030ccc2df6b72` (cycle 5 진입 직전 root cause 분석), 후 검증 본 세션 Playwright.

## 변경 한 줄

사용자 보고 "계속 오류" 의 진짜 root cause — V3-DEF + V3-H compound bug
(`endCycle()` 가 `run.currentRealmId` 를 reset 안 해서 다음 cycle 의 hero 가
이전 realm 의 columnBounds pathfinder 에 막혀 candidates 소진 → 5세 즉사
epilogue) — 를 endCycle reset + persist v22→v23 migration + `'무위'` cause
분리의 3 fix 로 해소.

## 3 fix 의 commit

| ID | 한 줄 | Commit |
|----|-------|--------|
| F1 | `endCycle` 의 saga record 직후 `run.currentRealmId = 'base'` + `run.npcs = []` reset | `d50231e` |
| F2 | persist v22 → v23 migration — 기존 stale 유저 `currentRealmId` 강제 `'base'` | `9c0d93c` |
| F3 | `cycle_ended` candidates-exhausted cause `'자연사'` → `'무위'` 분리. saga book 한글 label "출구 없음" | `61115fa` |

## 머지 가드 결과

| 가드 | baseline (cycle 4) | cycle 5 | 결과 |
|------|------|--------|------|
| typecheck | PASS | PASS | OK |
| lint | PASS | PASS | OK |
| vitest (inflation-rpg) | 1130 / 1130 | **1138 / 1138** | OK (+8 신규 cycle 5 unit/integration) |
| circular | 1 (baseline) | 1 | OK (회귀 0) |

baseline 1 circular = `HeroEntity ↔ JobSystem` (P-1.5 부터 알려진 부채).

## Playwright 검증 (3 시나리오)

본 세션 Playwright MCP, iPhone 14 viewport (390×844), dev server `localhost:3000`.

### 시나리오 A — stale v22 state migration (F2)

| 단계 | 결과 |
|------|------|
| `localStorage.setItem` 으로 가짜 v22 state 주입 (`run.currentRealmId='sea'` + 가짜 NPC 1) | OK |
| 페이지 reload | OK |
| 페이지 hydrate 직후 zustand state | `run.currentRealmId === 'base'` (sea → base **migrated**), `run.npcs.length === 0` (stale NPC 제거), `unlockedRealms` 정상 |
| **수용 기준 `state.run.currentRealmId === 'base'`** | **PASS** |

> 주의: localStorage 의 v22 raw JSON 은 zustand persist 의 다음 set() 시점까지
> 유지될 수 있다. 검증의 ground truth 는 (a) F2 vitest unit test (PRD §F2 의
> "v22 state load 후 currentRealmId === 'base'") 와 (b) Playwright 가 본
> in-memory zustand state. Playwright A 는 migration 이 실제 실행됐다는 것과
> consistent.

screenshot: `.tmp-cycle-5-postsim/screen-1-scenarioA-after-migration.png`

### 시나리오 B — 새 cycle 진입 + idle (F1)

| 단계 | 결과 |
|------|------|
| 메인 메뉴 → "새 사이클 시작" → 영혼 "정유준 5세 평민 LV 1" 등장 | OK |
| 후원하기 클릭 → cycle 진입 | OK (3초 후 LV 2, HP 164/164, 시작의 들판 3/6) |
| 10× 속도로 ~10초 idle | LV 23755, age 12세, HP 278641/278641, 전사 |
| ~25초 idle | LV 80627, age 18세, 라이벌 NPC 등장 |
| ~45초 idle | LV 285606, age 26세, 회춘 1, ATK 73400742 (status modal 확인) |
| **수용 기준 LV > 1, age > 5, arrivals > 0** | **PASS** (1만배 마진) |

이전 cycle 4 finisher 가 본 "5세 평민 LV 1 자연사 즉시 종료" 와 **명확히 다른**
결과. F1 fix 가 stale realm bug 의 root cause 를 정확히 해소.

screenshot: `.tmp-cycle-5-postsim/screen-2-scenarioB-cycle-running-LV23755.png`, `screen-3-scenarioB-status-modal-LV285606.png`

### 시나리오 C — 이전 cycle 진행 중 새 cycle 시작 (F1 carry-over)

| 단계 | 결과 |
|------|------|
| 시나리오 B 의 정유준 (LV 285k+ 진행 중) → 메인 메뉴 | OK ("이어하기 (정유준 · 28세)" 옵션 visible) |
| "새 사이클 시작" → 새 영혼 "장수아 5세 평민 LV 1" | OK |
| 후원하기 → ~3초 idle | LV 10, HP 476/476, 시작의 들판 3/6, 재생 #0 (= 새 cycle 첫 사이클) |
| **수용 기준 새 cycle 정상 spawn (base realm), 5세 즉사 없음** | **PASS** |

console errors: **0** (모든 시나리오 통합).

screenshot: `.tmp-cycle-5-postsim/screen-4-scenarioC-new-cycle-after-prev.png`

## 3 fix 정찰 시점 vs 후 비교

| 항목 | 정찰 시 (cycle 5 진입 직전) | cycle 5 후 |
|------|------------|------|
| `endCycle` 의 realm reset | 없음 — `clearHeroSnapshot()` 만 호출. `run.currentRealmId` stale | `'base'` 강제 reset + `npcs=[]` reset |
| persist v22 → v23 | v22, stale state 무한 유지 | v23 migration, `currentRealmId='sea'` → `'base'` 자동 fix |
| candidates 소진 시 cause | `'자연사'` (진짜 자연사와 구분 불가) | `'무위'` (saga book 한글 label "출구 없음") |
| 5세 즉사 epilogue | 매 cycle 재현 | Playwright B/C 에서 0건 (대신 LV 28만+ 정상 진행) |
| sagaHistory 의 stale 5세 평민 | 3건 누적 | 본 cycle 의 진짜 cycle 1건 추가 (= 4건. retroactive cleanup 은 cycle 6 carry-over) |

## Phase G self-check (Cycle 5 종료 후)

- **약점 고갈**: ✗ (cycle 6 carry-over D1-D7 + F4 pathfinder fallback + a/b/c)
- **3 연속 같은 1순위**: cycle 0 saturation → 1 variance → 2 process → 3 prefix bug
  → 4 polish → **5 game-breaking bug fix**. 6 cycle 모두 다른 카테고리. soft-halt 신호 없음.
- **자원 추정**: cycle 5 는 명확한 1-line fix x 3 + migration 1 + test. implementer
  subagent 가 한 phase 안에서 full PRD 완수. finisher 가 가드 + Playwright + main 머지.
- **사용자 halt**: 없음 (사용자 "오랫동안 자리 비울 거야. 자율적으로 개선" — 자율 머지 위임).
- **Hard halt**: 미발생.

**→ cycle 6 진입 가능.**

## Cycle 6 carry-over

### 1순위 (cycle 6 PRD 후보)

- **F4. Pathfinder columnBounds null path 시 fallback retry** — PRD 의 carry-over
  그대로. 사후 안전망. 1-line 이지만 logic test 필요해서 cycle 5 자원 절약 위해 미룸.
  cycle 5 fix 후 root cause 는 사라졌지만 미래 동급 bug 의 즉시 visible 신호
  (`'무위'` cause) 만 분리됐고, 실제 path 자체의 robustness 는 아직.
- **a. sagaHistory 5세 stale saga retroactive cleanup** — 현재 누적 사가 4건 중
  3건이 cycle 4 finisher 가 확인한 5세 평민 LV 1 stale. UI 또는 migration 으로
  cleanup. 사용자의 saga book 첫인상 영향.

### 2순위 (carry-over 묶음)

- **b. `run.*` field cleanup 전수 검토** — `npcs` + `currentRealmId` 외 다른
  field (cycle-scoped state) 도 stale 가능성. 1 시간 정찰 + 발견 시 cycle 7 fix.
- **c. prod 빌드 정찰** (`pnpm --filter @forge/game-inflation-rpg build:web`) —
  cycle 4 carry-over 의 미수행. dev 모드는 0 error 였지만 prod 모드 console
  error 또는 SSR/static export warning 가능성. cycle 5 F1 fix 가 prod 도 같이
  정상화시켰을 가능성 큼.

### 3순위 (D1-D7 backlog, cycle 3/4 carry-over 누적)

| ID | Title | 수치 제안 |
|----|-------|----------|
| D1 | priest saturator structural | MERCIFUL_PROC_RATE 0.10→0.05 + priest.min 3→5 |
| D2 | prudent dim source famine | PERSONALITY_ENCOUNTERS prudent source 1→2 |
| D3 | MAX_ARRIVALS + idle 회춘 trigger | MAX_ARRIVALS 500→1000 + age/arrivals 임계 회춘 |
| D4 | NPC first-vs-recurring 필터 | CycleControllerV2 의 npc id 기반 first/recurring 분기 |
| D5 | spare_enemy moral saturation | PERSONALITY_ENCOUNTERS weighting 조정 또는 variant 8→24 |
| D6 | levelUp 자릿수 톤 | ≤999 / 1k-999k / 1M+ 분기, variant 6→18 |
| D7 | EternalSaga era key chapter title 동적 생성 | Caves of Qud sultan-history 식 |

## 추천 cycle 6 우선순위

**F4 (pathfinder fallback, 사후 안전망) > a (saga cleanup, UI 첫인상)**.
- cycle 5 가 root cause 를 해소했지만 같은 카테고리 bug 의 미래 visibility 와
  방어 코드가 1 cycle 분량의 가치 있음.
- saga cleanup 은 단순 migration 한 줄로 가능.
- D1-D7 은 cycle 7 이후. balance 패치는 사용자 보고 후 진입.

## 사용자 보고 "계속 오류" 최종 판단

**해소됨.** Playwright 시나리오 B/C 에서 hero LV 28만+, 26세까지 정상 진행
확인. cycle 4 finisher 가 본 5세 즉사 epilogue 는 100% 재현 안 됨. v22 stale
유저도 reload 시 자동 v23 migration 으로 즉시 정상 진행.
