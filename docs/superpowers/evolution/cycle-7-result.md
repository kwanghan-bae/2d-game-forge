# Cycle 7 결과 (Partial Merge — F4 가드 FAIL 후 머지 보류 결정)

> 상태: **partial** — 3 fix (F4 + S1 + R1) 가 feature 브랜치에 머지되었으나
> Playwright 시나리오 B (F4 일반 case fallback 0건) 가드 **FAIL**.
> PRD: [`cycle-7-prd.md`](cycle-7-prd.md)
> 머지 가드 4/4 (typecheck/lint/vitest 1166/circular baseline) PASS, Playwright 1/3 FAIL.

## 변경 한 줄

Cycle 5+6 의 2 이월 carry-over 정리 — (F4) Pathfinder columnBounds null
fallback retry, (S1) sagaHistory 5세 stale saga retroactive cleanup
(migration v23→v24), (R1) 정찰 정확도 페르소나 patch (확정 grep query 룰).
**S1 + R1 은 검증 통과**. F4 는 코드 동작은 OK 지만 PRD 의 수용 기준
"일반 case fallback trigger 0" 가 비현실적 — base realm 의 columnRange [0, 20]
밖에 있는 target (NPC encounter / cross-realm landmark) 이 일반 case 에서
빈번하게 발생, 첫 findPath 항상 null → fallback 항상 발동.

## 3 commit (cycle 7)

| ID | 한 줄 | Commit |
|----|-------|--------|
| R1 | personas/02-qa.md + 04-game-critic.md "empty/missing" 주장에 확정 grep query 1개 첨부 룰 | `b6b658e` |
| S1 | gameStore.ts `migrateV23ToV24` — eventCount=0 AND finalAge≤5 AND cause='자연사' AND finalLevel≤1 의 4-조건 stale entry 삭제 | `d85554a` |
| F4 | Pathfinding.ts `findPathWithFallback` + OverworldScene `pathfinderFallbackCount` 텔레메트리 + console.warn | `3cdf7bd` |

## 머지 가드 결과

| 가드 | baseline (cycle 6) | cycle 7 | 결과 |
|------|------|--------|------|
| typecheck | PASS | PASS | OK |
| lint | PASS | PASS | OK |
| vitest (inflation-rpg) | 1147 / 1147 | **1166 / 1166** | OK (+19 신규 cycle 7) |
| circular | 1 (baseline) | 1 | OK |

baseline 1 circular = `HeroEntity ↔ JobSystem` (P-1.5 알려진 부채).

## Playwright 검증 (3 시나리오, iPhone 14 viewport 390×844)

dev `localhost:3000`. 정찰 screenshot: `cycle-7-postsim/screen-1..3-*.png`.

### 시나리오 A — S1 stale saga purge (v22 → v24 migration)

| 단계 | 결과 |
|------|------|
| 가짜 v22 state (sagaHistory 3 stale 5세 + 1 정상 LV 1000) localStorage 주입 | OK |
| 페이지 reload | OK |
| MainMenu "누적 사가: 1" 표시 (store 에서는 1 만 hydrate) | **PASS** |
| 후원 클릭 → 첫 persist write → localStorage 상태 확인 | OK |
| `version: 22 → 24`, `sagaCount: 4 → 1`, 보존된 entry = `finalLevel:1000, finalAge:35`, `currentRealmId: 'sea' → 'base'` (v22→v23 chain) | **PASS** |

**중간 발견** — PRD 의 fixture schema 가 잘못됨: `hero.deathCause` 로 적었으나
canonical schema 는 `hero.cause` (nested) + top-level `deathCause` (flat alias).
첫 시도에서 migration 의 stale-filter 가 매치 안 함. 두 번째 시도에 canonical
schema 로 주입 → PASS. PRD 의 다음 사이클 fixture 작성 시 참조 필수.

screenshot: `cycle-7-postsim/screen-1-s1-sage-purged.png`

### 시나리오 B — F4 일반 case fallback 0건

| 단계 | 결과 |
|------|------|
| fresh state → 새 cycle 시작 → 후원 → 30 초 idle | OK |
| console.warn 의 `Pathfinder columnBounds fallback fired` grep | **10+ 회 발동** |
| 모든 trigger 가 `realm=base` + target column 100+ (base columnRange [0, 20] 밖) | **FAIL** |
| 추가 60+ 60 초 (10× speed) idle 시 총 89 회 누적 | FAIL 확인 |

**Root cause**: `OverworldScene.pickNextDestination` 의 `columnBounds =
findRealm(this.currentRealm).columnRange` 가 hero 의 movement target 이 다른
realm 의 column 까지 spawn 되는 일반 case 에서 매번 첫 findPath null →
F4 fallback 매번 발동. F4 의 retry 자체는 정상 작동 (hero 가 stuck 되지
않음), 다만 **PRD 의 수용 "= 0" 기준은 비현실적**.

**의미**: F4 fix 는 의도된 사후 안전망으로 정확히 동작하지만, columnBounds
의 의미 자체가 cross-realm target 에 대해 잘못 적용되고 있음. F4 fix 가
없으면 hero stuck → '무위' 종료 빈번 발생할 위험을 사후 해소 중. 단, 안전망에
99% 의존하는 hot path 는 **Cycle 8 P0 carry-over** 로 명시 (root: caller 의
columnBounds 산정).

console.warn dump: `cycle-7-postsim/console-warns-scenario-c.log` (89 건)

### 시나리오 C — Cycle 5+6 회귀 가드

| 단계 | 결과 |
|------|------|
| fresh state → 새 cycle → 후원 → 30 초 idle | OK (LV 5, age 5, realm base, heroSnapshot 22 field) |
| 페이지 reload | OK |
| MainMenu "이어하기 (신민준 · 5세)" 버튼 visible (Cycle 6 P0 회귀 가드) | **PASS** |
| "이어하기" 클릭 → cycle 복귀 진행 | OK |
| Cycle 6 P1 sagaHistory finalize 5 field 검증 → vitest `cycle6-saga-snapshot.test.ts` 9 cases PASS | **PASS** (E2E 자연사까지 60+ 분 소요 → vitest 통과로 대체) |
| Cycle 5 v22→v23 migration 회귀 가드: 시나리오 A 에서 `currentRealmId: 'sea' → 'base'` 자동 reset 확인 | **PASS** |

screenshot: `cycle-7-postsim/screen-2-cycle6-resume-button.png`,
`screen-3-cycle-running.png`

## 결정 — main 머지 보류

PRD 의 escalation 룰: `가드 1 개라도 FAIL → main 보류, carry-over 명시`.
시나리오 B FAIL → main 머지 보류. feature 브랜치 `feat/cycle-7-fallback-cleanup-recon`
에 3 commit 유지, tag `cycle-7-partial`. F4 코드 자체는 vitest + S1+R1 로 검증됐고
사후 안전망으로 정상 동작 — 단, PRD 수용 "= 0" 이 잘못된 기대치라 partial 처리.

## Phase G self-check (Cycle 7 종료 후)

- **약점 고갈**: ✗ (cycle 8 carry-over: columnBounds caller root, F4 hot-path 빈도, D1-D7, run.* 전수, realm 정체)
- **3 연속 같은 1순위**: cycle 1 variance → 2 process → 3 prefix bug → 4 polish → 5 game-breaking → 6 store↔UI → 7 carry-over 정리. 7 cycle 모두 다른 카테고리. soft-halt 없음.
- **자원 추정**: 3 fix + 19 신규 vitest. implementer 한 phase 안에서 PRD full 수행. finisher 가 가드 4 + Playwright 3 시나리오 + 머지 보류 결정 + carry-over 정리.
- **사용자 halt**: 없음.
- **Hard halt**: 미발생.

**→ cycle 8 진입 가능 (단 partial 상태)**. cycle 8 P0 = columnBounds caller 의
target selection root fix. F4 fallback 은 hot path 아닌 안전망으로 복원.

## Cycle 8 carry-over

### 1순위 (cycle 8 P0)

- **C1. columnBounds caller root fix** — `OverworldScene.pickNextDestination`
  가 target 의 realm 을 무시하고 `currentRealm.columnRange` 로 bounds 적용.
  fix 후보: (a) bounds 의 의미를 "hero 가 갈 수 있는 모든 column" 으로 확장,
  (b) target 의 realm 으로 bounds 동적 선택, (c) bounds 적용 제거 (전체 그리드
  search). 확정 grep: `grep -n "columnBounds = .*currentRealm" games/inflation-rpg/src/overworld/OverworldScene.ts`.
- **C2. F4 telemetry 활용** — `pathfinderFallbackCount` 가 cycle 종료 시 saga
  에 기록되도록 (debug). C1 fix 후 0 회 baseline 측정.

### 2순위

- **b. `run.*` field cleanup 전수 검토** (cycle 6 carry-over 잔존).
- **realm 정체** — cycle 6 의 stage progression rate 측정.
- **PRD fixture schema 정확도** — cycle 7 시나리오 A 에서 첫 fixture 가 잘못된
  schema (`hero.deathCause`) 로 작성. 정찰/PRD 작성자가 canonical 필드를
  코드에서 grep 하고 명시하도록 페르소나 doc 추가 룰.

### 3순위 (D1-D7, 누적 carry-over)

D1-D7 — Cycle 8+ 진입 시 검토.

## 자율진화 시스템 정확도 회고

Cycle 7 partial 결과는 **자율진화 루프의 self-improving 성격을 보여줌**:
- R1 patch (정찰 정확도 룰) 가 commit 됐지만 cycle 7 자신의 PRD fixture
  schema 가 잘못된 채로 작성됨. 즉 R1 룰이 **다음 사이클부터** 적용 가능.
- F4 수용 "= 0" 도 cycle 6 finisher 의 정찰 시점에서 측정 안 됐음 — F4 의
  자주 발동 가능성을 예측 못 함. cycle 8 부터 정찰 brief 가 "수용 기준의
  baseline 측정 1 회 권장" 추가 시점.

자율 머지 cycle 연속: 4 + 5 + 6 = 3 (cycle 7 partial 로 끊김). cycle 8 의
columnBounds root fix 후 full 복원 시 4 연속 재개 가능.

## 사용자 보고 status

cycle 5+6 의 game-breaking + idle critical 해소 후 cycle 7 은 carry-over
정리. 사용자 보고 0건 (자율 위임 4 cycle 연속). F4 안전망이 cycle 8 의 root
fix 까지 hero stuck 차단 — 사용자는 89 회/cycle console.warn 은 noisy 지만
gameplay 영향 없음.
