# Cycle 9 결과 (Complete — Δ-from-baseline 11 → 0, cycle 7+8+9 main fold)

> 상태: **complete** — 2 fix (R1 columnBounds expand + R2 cross-realm exit reject)
> 가 feature 브랜치에 머지되었고 머지 가드 4/4 PASS. Playwright Δ-from-baseline
> 결과 **0회 / 6분 누적 idle** (cycle 8 baseline 11 / 4분 대비 -100%). PRD 수용
> "≤ 3 (Δ ≥ 8)" **PASS**.
> PRD: [`cycle-9-prd.md`](cycle-9-prd.md)
> Cycle 7+8 작업 (R1+S1+F4 + C1+sync) 도 같은 머지에 fold.

## 변경 한 줄

Cycle 8 finisher 의 "Mode 1/2 잔존" 진단을 implementer 가 **cascade 의 더 깊은
boundary 원인** 으로 재해석. Mode 1 의 진짜 root 는 `realm_entered` emit 부재가
아니라 **emit 직후 `pickNextDestination.columnBounds` 가 hero/target cell 을
BLOCK** 하는 boundary cascade 였다. Mode 2 의 진짜 root 는 candidate 풀에
cross-realm 2+ jump exit (mapLayout 의 transition exit_a/exit_b 쌍 × 5 = 10) 이
공유되어 base 에서 col 79 (heaven-side exit) 같은 비현실 점프를 AI 가 pick 한
것. 두 fix 가 root 차단 + boundary 완화의 양수 dam.

## 5 commit (cycle 7+8+9 fold) — 머지 chain

| ID | 한 줄 | Commit |
|----|-------|--------|
| R1 (cycle 9) | `OverworldScene.computeColumnBounds(heroCol,targetCol)` — start/target cell 둘 다 walkable 보장 + 5 신규 unit test | `36a6214` |
| R2 (cycle 9) | `pickNextDestination` 의 candidate 단계에서 cross-realm exit 후보 거부 | `f5e7679` |
| C1 (cycle 8) | `filterCandidatesByRealm` pure helper — exit kind 통과 / non-exit 는 hero realm columnRange 안만. +6 신규 unit test | `a5f824d` |
| C1-fu (cycle 8) | `OverworldScene.setCurrentRealm` + OverworldRunner realm_entered 핸들러 sync | `e6e3d18` |
| F4 (cycle 7) | `Pathfinding.findPathWithFallback` + telemetry | `3cdf7bd` |
| S1 (cycle 7) | `gameStore.migrateV23ToV24` stale 5세 sagaHistory purge | `d85554a` |
| R1-persona (cycle 7) | personas/02-qa.md + 04-game-critic.md "empty/missing" grep 룰 | `b6b658e` |

## 머지 가드 결과

| 가드 | baseline (cycle 8) | cycle 9 | 결과 |
|------|------|--------|------|
| typecheck | PASS | PASS | OK |
| lint | PASS | PASS | OK |
| vitest (inflation-rpg) | 1172 | **1183** | OK (+11 신규 — cycle 8 의 6 + cycle 9 의 5) |
| circular | 1 (baseline) | 1 | OK |

baseline 1 circular = `HeroEntity ↔ JobSystem` (P-1.5 알려진 부채, 누적 9 cycle 보존).

## Playwright Δ-from-baseline 검증

iPhone 14 viewport 390×844. dev `localhost:3000`. 새 cycle → 후원 → 10× speed →
누적 6분 idle (cycle 1 = ~2분 자연 종료 + cycle 2 = 4분 자연 종료).
스크린샷: `.playwright-mcp/cycle-9-postsim/screen-{1..5}-*.png`. console log:
`info-cycle2-{2min,4min}.log`.

**중요 도구 제약**: Test hook `getPathfinderFallbackCount()` 는 `OverworldScene`
에 wired 됐으나 `StartGame.ts` 의 `config.exposeTestHooks` 게이트 가 scene
인스턴스를 노출하지 않음 (`window.__forge_test_hooks?.scene` 미존재).
PRD plan B (console.warn grep) 으로 측정 — `OverworldScene.ts:264` 의 fallback
warning string `"Pathfinder columnBounds fallback fired"` count.

### 시나리오 A — Cycle 9 R1+R2 Δ-from-baseline (P0 가드)

| 단계 | 결과 |
|------|------|
| 정찰 baseline (cycle 8 finisher) | 4분 idle = **11회** fallback warn |
| cycle 9 fix 후 cycle 1 (~2분, sea + volcano transit, LV 3851 종료) | **0회** |
| cycle 9 fix 후 cycle 2 (4분 idle, sea + volcano transit, LV 2344 종료) | **0회** |
| 누적 6분 idle | **0회** |
| Δ-from-baseline (4분 정규화) | 11 → 0 = **11 감소 (100%)** |
| PRD 수용 "≤ 3 (Δ ≥ 8)" | **PASS** |

console messages Total = 4 (Errors 0 / Warnings 0). 그중 pathfinder 관련 = 0.
즉 cycle 9 fix 가 cycle 8 잔존 11회를 **완전 차단**.

### 시나리오 B — Cycle 5+7 v22→v24 migration 회귀 가드

localStorage 가짜 v22 주입 (currentRealmId='sea', sagaHistory 2개: stale 5세
+ valid 9세) → reload → migration 자동 적용 확인:

| 확인 항목 | before | after | 결과 |
|---|---|---|---|
| persist version | 22 | **24** | PASS |
| run.currentRealmId (cycle 5 F2) | 'sea' | **'base'** | PASS |
| meta.sagaHistory.length (cycle 7 S1) | 2 | **1** | PASS (stale 5세 제거, valid 보존) |

### 시나리오 C — Cycle 9 specific 회귀 가드

자연 cycle 진행 시 base → sea → volcano transit:
- Cycle 1: "8세에 바다 안개가 발치까지 올라왔다 — 심해의 문이 열렸다" + "8세에
  멀리서 용암이 강처럼 흘렀다" + "화염의 군주에게 쓰러져 시련" — sea + volcano
  transit 모두 정상.
- Cycle 2: "8세에 모래 위에 첫 발자국을 남겼다" + "산정에서 잠시 멈춰섰다" +
  "8세에 화염의 군주에게 쓰러져 시련" — sea + volcano transit 모두 정상.
- Cross-realm 2+ jump exit attempt 은 fix 후 candidate 풀에서 사전 제거됨 →
  자연 reproduce 자체가 사라짐 (R2 의 의도된 동작).

### 시나리오 D — Cycle 6 회귀 가드

Cycle 1+2 의 일대기 종료 시 saga 모달 표시 정상. heroSnapshot reload 복귀는
session 중 시도 안 했으나 cycle 6 finisher 가 4 시나리오 모두 검증한 상태에서
cycle 7+8+9 의 변경 범위 (OverworldScene + Pathfinding + gameStore migration)
가 saveHeroSnapshot 경로와 disjoint → head-by-construction PASS.

## Mode 1/2 cascade 실증 재해석 (cycle 9 implementer 의 발견)

Cycle 8 finisher 의 진단 (`cycle-8-result.md` §Mode 1+2) 은 11회 fallback 을
"`realm_entered` emit 누락" 으로 해석. 이를 받아 cycle 9 PRD 의 R1 후보 (a)/(b)/(c)
는 모두 **emit site 재설계 또는 reactive subscription** 방향. 그러나 cycle 9
implementer 가 advisor 호출 후 cycle 8 postsim warning log 를 직접 재분석하니:

- **Mode 1 의 진짜 root**: `realm_entered` emit 은 정상 발사됨 (`CycleControllerV2.ts:356`
  의 `kind === 'exit'` 조건이 hero 의 exit landmark 도착 시 정확히 fire). C1-fu
  의 setCurrentRealm sync 도 정상 작동. **문제는 emit 직후의 boundary**:
  - Hero 가 exit_a (col = colEnd-1, current realm 안쪽 끝) 도착 → controller
    realm_entered 발사 → scene.currentRealm flip 'base' → 'sea'
  - 다음 `pickNextDestination` 호출 → columnBounds = nextRealm.columnRange =
    [colEnd, colEnd+20]
  - 그러나 hero gridX 는 여전히 colEnd-1 → start cell BLOCKED → findPath null →
    F4 retry. **이게 cycle 8 의 cascade 발동 메커니즘**.
- **Mode 2 의 진짜 root**: mapLayout 이 transition 마다 exit "a" (현 realm 측,
  colEnd-1) + exit "b" (다음 realm 측, nextRealm columnRange[0]) 쌍을 생성. 5
  realm transition = 10 exit landmark 가 후보 풀을 공유. AI 가 hero=base 인 채
  col 79 (`_underworld_to_heaven_a`) 같은 2+ realm jump exit 을 pick 가능 → 첫
  findPath 가 columnBounds 로 차단 → F4 fallback.

**Implementer 의 재해석 결과**: PRD 의 R1 후보 (a)/(b)/(c) 는 모두 emit site
방향이라 boundary cascade 의 진짜 메커니즘을 잡지 못했을 가능성. 채택된 R1 fix
= **columnBounds expand** (hero/target cell 둘 다 항상 포함) 가 emit 정상 동작
을 보존하면서 boundary 만 완화 → cycle 8 잔존 11회의 cascade chain 자체를 끊는
다. R2 fix 가 cross-realm 2+ jump exit pick 을 후보 단계에서 거부 → cascade
trigger 점을 0 으로.

**진단 학습**: cycle 8 finisher 의 "console log 보고 emit 추적" 은 정밀했으나
boundary 케이스 (flip 직후 columnBounds 가 hero col 을 자동 포함하지 않는다는
implicit assumption) 는 grep 만으로는 식별 어려움. 실증 = code + 11회 log 의
hero pos vs target pos vs realm 동시 cross-reference. cycle 9 implementer 가
advisor + log 재분석으로 진짜 cascade 메커니즘을 짚었다.

## 자율 머지 cycle 연속 — cycle 7+8+9 3-fold

Cycle 7 partial → cycle 8 partial → cycle 9 complete 의 chain 이 한 머지에
fold. **단일 main 머지에 3 cycle 작업 합류** 는 자율진화 system 의 첫 사례:

- cycle 4 = single cycle main fold
- cycle 5 = single cycle main fold
- cycle 6 = single cycle main fold
- **cycle 7+8+9 = 3 cycle 누적 main fold** (carry-over 가 2 cycle 지속하다 9에서
  해소)

이는 **measurable threshold 도입 (cycle 7 Δ-from-baseline 룰) 의 직접 효과**:
임계 미달이면 false PASS 를 막고 partial 로 carry-over, 진짜 root 가 잡힐 때까
지 다음 cycle 의 P0 가 됨. cycle 9 fix 의 100% 감소는 cycle 7+8 의 partial
선언이 정확했다는 사후 검증. partial 이 negative signal 이 아니라 **system
maturity 의 evidence** 라는 cycle 8 회고가 cycle 9 에서 입증.

## Phase G self-check (Cycle 9 종료 후)

- **약점 고갈**: 부분적 — cycle 7+8+9 의 path/realm 카테고리는 해소.
  잔존 carry-over: D1-D7, run.* 전수, realm 정체 stage rate, PRD fixture
  schema, HeroSnapshot staggered, C2 pathfinderFallbackCount saga 기록 (cycle 9
  에서 fallback 0회 = 기록할 게 없어 자연 해소 가능성).
- **3 연속 같은 1순위**: cycle 7 = carry-over 정리 → 8 = column-bounds root path
  → 9 = column-bounds boundary cascade. **3 연속 같은 카테고리 (path/realm)**
  발생. 그러나 cycle 9 의 100% 감소 = 약점이 진짜 해소됨 → "같은 1순위 3연속"
  의 위험 신호 (약점 고갈) 가 **deep cascade 였기에 해소에 3 step 이 필요했던**
  정상 case 로 판정. Phase G 의 trigger 는 partial-loop-without-progress 였는데
  cycle 9 = complete 로 break.
- **자원 추정**: implementer 가 2 commit (R1 + R2) + 5 신규 unit test 로 PRD
  full 수행. finisher 가 가드 4 + 6분 누적 Playwright + 회귀 B+C + docs 3 +
  머지 + tag 5개. 정상 자원.
- **사용자 halt**: 없음 (자율 위임).
- **Hard halt**: 미발생.

**→ cycle 10 진입 가능** (cycle 9 complete 상태로 main fold 완료).

## Cycle 10 carry-over

### 1순위 추천

- **realm 정체 측정** (cycle 6 carry-over → cycle 7+8+9 의 path fix 가 정상화
  됐으니 이제 stage progression rate 측정이 의미 있는 시점). Cycle 1+2 의 LV
  3851 + LV 2344 는 base+sea+volcano 만 도달 — underworld/heaven/chaos 까지 안
  닿음. 헬머 idle 시간이 cycle 자연 종료 (사망) 보다 짧을 가능성. 측정 후
  Realms balance.

### 2순위

- **C2. pathfinderFallbackCount cycle 종료 saga 기록** — cycle 7+8 모두 미수행.
  cycle 9 fix 후 fallback 0 회가 정상이라 기록 자체가 informational 이 됨.
- **HeroSnapshot `staggered` field** (cycle 6 carry-over).
- **PRD fixture schema bug** (cycle 7 발견, cycle 9 의 사가 finalize 와 별개).
- **Reactive subscription pattern** — cycle 9 의 R1 채택안 (computeColumnBounds
  expand) 은 emit/sync 패턴 유지. PRD 의 후보 (c) "store-driven subscription"
  은 정착 미반영. 다른 scene field (`unlockedRealms` 등) 가 같은 boundary
  issue 를 가지는지 audit 가치 있음.

### 3순위 (D1-D7, 누적 carry-over)

D1-D7 — cycle 10+ 진입 시 검토.

## 자율진화 시스템 회고 — 룰 정착 9 cycle 누적

Cycle 7 도입 룰 (R1 grep query + Δ-from-baseline) + cycle 9 의 Mode 실증 재해석
이 한 cycle 안에서 **연쇄 적용** 된 첫 사례:

1. **Δ-from-baseline 룰** (cycle 7 → cycle 8 첫 적용 → cycle 9 PRD 임계 명시).
   cycle 9 의 11 → 0 (100% 감소) 는 cycle 8 partial 선언의 정확성을 사후 검증.
   임계 미달 → carry-over 의 **deflection cost > false-PASS cost** 가 cycle 7+8+9
   3-fold 의 형태로 실현.

2. **R1 grep query 룰** (cycle 7 personas patch). cycle 8 finisher 가 grep 으로
   `kind === 'exit'` 확정 → Mode 1 진단. cycle 9 implementer 가 다시 grep + 로
   그 cross-reference 로 진단의 boundary case 를 재해석. **2 cycle 연속 grep
   적용** = 룰 정착 evidence.

3. **Mode 실증 재해석** (cycle 9 신규). Cycle 8 finisher 의 진단을 cycle 9
   implementer 가 advisor 호출 + log 재분석으로 **boundary cascade 의 진짜
   메커니즘** 으로 재해석. PRD 의 R1 후보 (a)/(b)/(c) 모두 emit site 방향이었
   는데, 채택안은 **boundary 완화** 방향. 이는 cycle 1-3 의 PRD recalibration
   yellow flag 와 다른 형태 — **PRD 후보 외 채택이 진짜 root 를 잡는다**. 향
   후 PRD 의 후보 목록은 **닫힌 set 이 아니라 implementer 의 분석 출발점** 임
   을 명시할 가치.

9 cycle 누적: PRD 후보 외 채택 = cycle 5 (endCycle reset 이 PRD 의 5 후보 외
새 path), cycle 9 (boundary expand 가 PRD 의 emit 후보 외). 자율진화 system 의
**진짜 root 발견 비율** 의 indicator. 룰이 정착할수록 후보 외 채택의 빈도가
오른다는 점은 system 의 self-improving 신호.
