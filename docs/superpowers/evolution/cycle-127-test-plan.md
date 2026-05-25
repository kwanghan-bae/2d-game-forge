---
category: 운영
---

# Cycle 127 Test Plan — N5 Live Ops Mega-phase QA scaffolding

## 한 줄

cycle 125 의 N5 Live Ops mega-phase spec (`cycle-125-prd.md`) 에 대한 QA test
plan. 실제 구현은 cycle 128 (F1 AchievementSystem) → cycle 129 (F2
SeasonalModifier) → cycle 130 (F3 Token + persist v26) 의 sub-cycle 진입.
본 문서 = test case 매트릭스 + 회귀 핫스팟 + 검증 명령 + DoD. code 변경 0,
test scaffolding 0 (구현 cycle 에서 따라 실행할 정의 only).

## 참고 페르소나 룰 (Sim-real parity dual evidence)

`docs/personas/02-qa.md` §"Sim-real parity 검증 룰" 직접 회수:
- sim 측정이 포함된 acceptance 는 모두 (a) sim driver mirror grep + (b)
  Playwright dev server 1-smoke 의 dual evidence 의무.
- grep query 결과는 보고서에 line 단위로 인용. 결과 누락 시 보고서 자체 반려.
- 본 test plan 의 모든 sim-driven case (F1.5, F2.4, OOS.1) 는 dual evidence
  acceptance 를 case 별로 명시한다.

## Baseline 확인 — 본 cycle 125 시점 grep evidence

```bash
grep -rn "achievement\|liveOps\|seasonId\|seasonToken\|epoch0\|SEASON_MS" \
  games/inflation-rpg/src --include="*.ts" --include="*.tsx" | grep -v "test"
```

**기대 결과**: 0 hit. 본 cycle 시점에서 위 어휘는 존재하지 않음 (PRD §"Grep
evidence" 직접 회수). cycle 128 의 첫 commit 후 hit 발생 시작.

```bash
grep -n "version" games/inflation-rpg/src/store/gameStore.ts | head -1
# 기대: version: 25 (cycle 122 의 v25 bump). cycle 130 의 F3 ship 시 v26 으로 bump.
```

## 회귀 위험

| 영역 | 기존 테스트 파일 | 위험 사유 |
|---|---|---|
| persist v25 → v26 migration | `tests/e2e/v9-migration.spec.ts` 패턴 | cycle 130 의 v26 bump 시 v25 saved game 의 `achievementProgress` / `seasonToken` field 부재로 hydrate 실패 위험. cycle 122 v25 회귀 패턴 (v25 bump 후 sim worker pollution) 재발 가드 의무. |
| 기존 age 기반 `season/SeasonState.ts` | `src/season/__tests__/*` | PRD R1 의 naming 충돌. F2 의 신규 `liveOps/SeasonalModifierEngine.ts` 가 기존 `season/SeasonState.ts` 와 별도 namespace 임을 grep 으로 확정 검증. import path 혼용 시 환경 tint (봄/여름/가을/겨울) 와 live-ops modifier 가 cross-mutation 위험. |
| HeroDecisionAI trait pick | `src/decisionAI/__tests__/HeroDecisionAI.test.ts` (cycle 76 의 trait weight) | F2 의 trait roll weight 가중 (`volcano-fire-trait-boost` ×2) 이 기존 trait pick 확률에 silent 영향. modifier inactive 시 기존 분포 100% 보존 의무. |
| AutoBattleController arrival cap | `src/cycle/__tests__/AutoBattleController.test.ts` | F2 의 modifier 가 MAX_ARRIVALS (=1200) 변경 0 의무. cycle 17 atk-bound 봉인 의 lid 가 변동 시 maxLevel cap 무효화. |
| sim driver smoke | `scripts/__tests__/sim-cycle-v2.smoke.test.ts` | cycle 130 의 v26 bump 후 sim worker 가 v25 default state 로 fallback 시 cycle 122 회귀 (sim worker pollution) 재발 위험. |
| ascension 균열석 economy | `src/meta/*` 의 crackStones consume | F3 token 환전 (`seasonToken 10 → 균열석 1`) 이 crackStones balance update 시 ascension 비용 (Phase F-1) 의 invariant 위반 위험. |

## 신규 케이스 매트릭스

### F1. AchievementSystem (cycle 128 구현 대상)

| ID | 케이스 | type | 기대 결과 | 파일 |
|---|---|---|---|---|
| F1.1 | `lv-10m-in-3-cycles` trigger — 3 연속 cycle 중 1 회 이상 maxLevel ≥ 10M | unit | `progress` = 1/3 → 2/3 → 3/3 + `completed: true` + `completedAt` 정수 ms. 단일 cycle 안에 maxLevel 10M 미달 시 progress increment 0 | `src/liveOps/__tests__/AchievementSystem.test.ts` |
| F1.2 | `lv-10m-in-3-cycles` 회귀 — cycle 1 = 10M, cycle 2 = 5M, cycle 3 = 12M | unit | `progress` = 1 → 1 → 2 (연속 아님 → 미완) | same |
| F1.3 | `npc-collect-4-uniques` trigger — `npcsMet` Set 의 distinct id 4 도달 | unit | `progress` = 1 → 2 → 3 → 4 + `completed: true`. 같은 npc id 중복 emit 시 progress 무변동 | same |
| F1.4 | `realm-conquest-6` trigger — 단일 cycle 안 unlockedRealms 변천 0 → 6 | unit | `progress` = 6 + `completed: true`. cycle 종료 시 partial (e.g., 4) 면 다음 cycle 시작 시 0 reset | same |
| F1.5 | `aging-master-10` trigger — 동일 realm 자연사 10 회 누적 (cycle 간 영구 누적) | unit | realm 별 dict `{ field: 4, volcano: 10 }` → `volcano: 10` 도달 시 `completed: true`. cycle 종료 시 dict 영구 persist | same |
| F1.6 | `inflation-flash-100x` trigger — 단일 cycle 안 level/prevLevel ≥ 100 jump 3 회 | unit | jumpCount = 1 → 2 → 3 + `completed: true`. cycle 종료 시 jumpCount 0 reset | same |
| F1.7 | persist round-trip v25 → v26 — 진행도 보존 | unit | `migrate(v25 state)` → `v26 state` with `achievementProgress: {}` (empty default). v25 saved game 의 hero/sponsorGold 등 기존 field 0 손실. JSON.stringify → parse → migrate 로 round-trip | `src/store/__tests__/gameStore.persist.test.ts` (cycle 130 신규) |
| F1.8 | 중복 완료 방지 — 이미 `completed: true` 의 achievement 재 trigger | unit | `claimedAt` 정수 (1 회) 후 동일 event 재 emit → `progress` 무변동 + `claimedAt` 무변동 (no-op). token 지급 0 회 | same as F1.1 |
| F1.9 | `claimAchievement(id)` 미완 도전 호출 — `completed: false` 일 때 | unit | throw `Error('achievement not completed')` 또는 return `{ ok: false, reason: 'not_completed' }`. token 지급 0 | same as F1.1 |
| F1.10 | `claimAchievement(id)` 완료 도전 호출 — token 지급 invariant | unit | `seasonToken += AWARD_PER_ID[id]` (1+2+2+3+5 의 spec) + `claimedAt` set + return `{ ok: true, tokenDelta: <id 별 정수> }` | same as F1.1 |
| F1.11 | hero state mutation 0 — achievement 완료 후 hero.atk/hp/level 무변동 | unit | `before.atk === after.atk` 등 7-field equality. cycle 17 atk-bound 봉인 회귀 가드 | same as F1.1 |
| F1.12 | sim driver mirror — sim-cycle-v2 가 evaluateAchievements emit | unit | `grep -n "evaluateAchievements\|AchievementProgress" scripts/sim-cycle-v2.ts` 결과 ≥ 1 hit + 해당 line 인용. 미 mirror 시 sim driver false PASS 위험 (룰 Sim-real parity §1) | `scripts/__tests__/sim-cycle-v2.smoke.test.ts` 의 신규 case |
| F1.13 | Playwright 1-smoke — dev server 30s × 10 speed → progress event ≥ 1 emit | e2e | `await page.waitForEvent("console", msg => msg.text().includes("achievement_progress"))` 30s 안 1 회 이상. F1.12 와 dual evidence | `tests/e2e/cycle-127-live-ops.spec.ts` (cycle 130 신규) |
| F1.14 | trivial / impossible 재검증 — multi-seed (1024/2048/4096) × 30-cycle chained sim | unit (sim-driven) | `lv-10m-in-3-cycles` 완료 rate 0.10-0.40 (PRD §F1 acceptance 직접 회수). 0.05 미만 또는 0.50 초과 시 starter 재정의 의무 (cycle 128 carry-over) | `scripts/measure-cycle-128-achievements.ts` (신규) |

**F1 invariant**:
- achievement 완료 시 hero state mutation 0 (PRD §F1 NOT this 직접 회수)
- 중복 완료 시 token 지급 0 회 (F1.8 의 직접 case)
- persist round-trip 시 진행도 보존 (F1.7 의 직접 case)

### F2. SeasonalModifier (cycle 129 구현 대상)

| ID | 케이스 | type | 기대 결과 | 파일 |
|---|---|---|---|---|
| F2.1 | `seasonId` determinism — 같은 `getNow` mock 입력 → 같은 출력 | unit | `seasonId(epoch0 + 0) === 0`, `seasonId(epoch0 + SEASON_MS - 1) === 0`, `seasonId(epoch0 + SEASON_MS) === 1`. boundary 정확히 ms 단위 | `src/liveOps/__tests__/seasonId.test.ts` |
| F2.2 | `seasonId` determinism — 다른 timestamp → 다른 seasonId | unit | `seasonId(epoch0 + 30 * SEASON_MS) === 30` (30 시즌 후). `getNow` mock 2 회 호출 시 referential equal 분리 | same |
| F2.3 | `cycleStartSeasonId` snapshot — mid-cycle clock change 면역 | unit | cycle 시작 시 `getNow` = epoch0 → snapshot 0. mid-cycle 에서 `getNow` mock = epoch0 + SEASON_MS → 다음 cycle 시작 시점에서 snapshot 1 로 갱신. *현재 cycle 진행 중 modifier 는 snapshot 0 의 set 유지* | same |
| F2.4 | modifier apply — trait roll weight only 변경 | unit | `volcano-fire-trait-boost` active 시 fire trait pick 확률 = baseline ×2. modifier inactive 시 baseline 분포 100% 보존. 1000 회 sample 카이제곱 PASS | `src/liveOps/__tests__/applyModifier.test.ts` |
| F2.5 | modifier — `atk/hp/MAX_ARRIVALS` 무변동 검증 (cycle 17 봉인 회귀 가드) | unit (sim-driven) | 5 modifier 각각 active vs inactive 의 `hero.atk`, `hero.hp`, `MAX_ARRIVALS` constant 의 referential equality. mutation 0 회 | same |
| F2.6 | modifier — maxLevel p50 무영향 검증 (multi-seed, 룰 6) | unit (sim-driven) | seeds 1024/2048/4096 × `modifier active/inactive` × 30-cycle chained = 180 cycles sim. \|Δ maxLevel p50\| ≤ baseline 6.98M 의 ±5% (PRD §F2 acceptance 직접 회수) | `scripts/measure-cycle-129-modifier-cap.ts` (신규) |
| F2.7 | 시즌 전환 timing — cycle 진행 중 시즌 변경 | unit | cycle 진행 중 `getNow` mock 이 시즌 경계 cross → `cycleStartSeasonId` 무변동 (snapshot 면역). 다음 cycle 시작 시점에서 snapshot 갱신. *진행 중 modifier 즉시 변경 0* | same as F2.3 |
| F2.8 | 시즌 종료 후 modifier reset — `seasonToken` reset | unit | `seasonId` 변경 시점에 `seasonToken = 0` reset + 이전 시즌 progress flush (F3 wire). 미환전 token 자동 환전 (FOMO 회피) | `src/liveOps/__tests__/seasonRollover.test.ts` |
| F2.9 | sim driver mirror — `applyModifier` + `seasonId` 가 scripts/sim-cycle-v2.ts 에 wire | unit | `grep -n "applyModifier\|seasonId" scripts/sim-cycle-v2.ts` 결과 ≥ 1 hit + 해당 line 인용. 미 mirror 시 sim 측정 false PASS (룰 Sim-real parity §1) | `scripts/__tests__/sim-cycle-v2.smoke.test.ts` 의 신규 case |
| F2.10 | Playwright 1-smoke — dev server 1-2 분 → volcano realm 진입 시 fire trait pick log | e2e | `volcano-fire-trait-boost` active state mock → console log 에 `trait_picked: fire_*` 1 회 이상 emit (HeroDecisionAI 인용). F2.9 와 dual evidence | `tests/e2e/cycle-127-live-ops.spec.ts` |
| F2.11 | referential equality — `applyModifier(1, ctx) === applyModifier(1, ctx)` | unit | pure function, same input → same output. memoization 없이도 deep equal | same as F2.4 |

**F2 invariant**:
- modifier 가 `atk`, `hp`, `MAX_ARRIVALS`, `fieldLevelRange` 어느 것도 변경 0 (F2.5 + F2.6 가 직접 가드)
- `seasonId` deterministic, server fetch 0 (F2.1+F2.2 의 직접 case)
- 시즌 종료 시 modifier reset, persist 0 (F2.8 의 직접 case)

### F3. Token Economy (cycle 130 구현 대상)

| ID | 케이스 | type | 기대 결과 | 파일 |
|---|---|---|---|---|
| F3.1 | achievement 완료 → token 지급 e2e | integration | `claimAchievement('lv-10m-in-3-cycles')` 호출 → `seasonToken += 1`. PRD §F3 의 5 starter 정수 합 = 13 (1+2+2+3+5) | `src/liveOps/__tests__/tokenEconomy.test.ts` |
| F3.2 | token → 균열석 환전 비율 invariant | unit | `exchangeToken(10) → crackStones += 1 + seasonToken -= 10`. PRD §F3 의 명시 ratio. 9 token 시 환전 호출 → no-op (잔액 부족) | same |
| F3.3 | 잔액 음수 가드 | unit | `seasonToken = 5` 상태에서 `exchangeToken(10)` 호출 → throw `Error('insufficient token')` 또는 return `{ ok: false, reason: 'insufficient' }`. `seasonToken` 무변동 + `crackStones` 무변동 | same |
| F3.4 | persist round-trip v25 → v26 — token + lastTokenSeasonId 보존 | unit | `migrate(v25)` → v26 state 의 `seasonToken: 0` + `lastTokenSeasonId: null` default. v25 saved game 에 field 부재 → migrate 후 default 주입. round-trip 으로 deep equal | `src/store/__tests__/gameStore.persist.test.ts` |
| F3.5 | persist round-trip — 이미 v26 인 saved game | unit | `migrate(v26)` = identity (no-op). `seasonToken: 47` 상태로 round-trip 시 47 보존 | same |
| F3.6 | 시즌 종료 자동 환전 (FOMO 회피) | integration | `seasonId` 변경 감지 시점에 `seasonToken` 잔액 자동 환전 → `crackStones` 누적. 사용자 명시 호출 없이도 default 실행. 환전 후 `seasonToken = 0`, `lastTokenSeasonId` 갱신 | same as F2.8 |
| F3.7 | 트리거 invariant — token 발생 = achievement 진행도만 | unit (grep) | `grep -rn "maxLevel.*seasonToken\|rank.*seasonToken\|playerLevel.*seasonToken" games/inflation-rpg/src --include="*.ts"` 결과 = 0 hit. PRD §F3 acceptance 직접 회수 | grep CI step (lint stage) |
| F3.8 | 트리거 invariant — 광고 결제 channel 0 | unit (grep) | `grep -rn "adReward.*seasonToken\|iap.*seasonToken\|adFree.*seasonToken" games/inflation-rpg/src --include="*.ts"` 결과 = 0 hit. PRD §"Out of scope" #1 #3 직접 회수 | same |
| F3.9 | Phase F-1 ascension 비용 invariant — crackStones 소모 vs token 환전 | unit | token 환전으로 crackStones 누적 후 ascension 호출 → crackStones 소모 정상 작동 (organic drop 과 동일 path). 환전 crackStones 가 ascension cost 에 영향 0 의 mutation, channel 단일화 | `src/meta/__tests__/ascension.test.ts` (기존 + 신규 case) |

**F3 invariant**:
- 환전 비율 10:1 (F3.2 의 직접 case)
- 잔액 음수 가드 (F3.3 의 직접 case)
- 트리거 = achievement only, 광고/결제/maxLevel rank channel 0 (F3.7+F3.8 의 grep CI step)

### OOS. Out-of-scope 회귀 가드 (PRD §"Out of scope" 4 항목)

PRD §"Out of scope" 의 4 항목 모두에 *positive* 위반 detection test 1 개씩
의무 — "어떤 코드 변경이 들어와도 out-of-scope 가 silently 침투하면 fail".

| ID | 케이스 | type | 기대 결과 | 파일 |
|---|---|---|---|---|
| OOS.1 | **Phase 5 IAP integration 차단** — token 의 IAP product 0 | unit (grep) | `grep -rn "seasonToken.*productId\|iap.*token\|token.*purchase" games/inflation-rpg/src --include="*.ts"` 결과 = 0 hit | OOS grep CI step |
| OOS.2 | **server 운영 차단** — fetch / API call 0 in liveOps module | unit (grep) | `grep -rn "fetch\|XMLHttpRequest\|axios\|api/" games/inflation-rpg/src/liveOps --include="*.ts"` 결과 = 0 hit | same |
| OOS.3 | **광고 boost 차단** — token 의 광고 wire 0 | unit (grep) | `grep -rn "adReward.*token\|admob.*token\|ad.*seasonToken" games/inflation-rpg/src --include="*.ts"` 결과 = 0 hit | same |
| OOS.4 | **modifier 의 maxLevel cap 영향 차단** — multi-seed sim Δ ≤ 5% baseline | unit (sim-driven) | F2.6 의 직접 회수. \|Δ maxLevel p50\| ≤ baseline 6.98M 의 ±5%. 5% 초과 시 PRD 위반 → fail. seeds 1024/2048/4096 평균 (single seed noise 0.02-0.04 자릿수 동일하므로 룰 6 multi-seed 의무) | F2.6 와 동일 file |

**OOS invariant**: out-of-scope 항목 4 개 모두 grep 0 hit 또는 sim Δ ≤ 5%
로 *positive detection* 가능. 누군가 silently 위반 코드 추가 시 CI 가드 fail.

### EDGE. Edge case + risk test

| ID | 케이스 | type | 기대 결과 | 파일 |
|---|---|---|---|---|
| EDGE.1 | clock skew — `getNow` mock 으로 시간 조작 | unit | `getNow` mock = epoch0 → seasonId 0. mock 갱신 = epoch0 + SEASON_MS × 30 (30 시즌 뒤) → seasonId 30. mid-cycle 변경 시 cycleStartSeasonId 면역 (F2.3 직접 회수) | F2.1 의 file |
| EDGE.2 | persist 부분 손상 — v26 saved game 에 `achievementProgress` field 누락 | unit | `migrate({ ..., achievementProgress: undefined })` → `{ achievementProgress: {} }` default 주입. 기존 hero/sponsorGold 등 무변동. crash 0 | F1.7 의 file |
| EDGE.3 | persist 부분 손상 — `seasonToken` field 가 string (corrupted) | unit | `migrate({ ..., seasonToken: 'corrupted' })` → `seasonToken: 0` default 주입 (zod validation fail → fallback). crash 0 | F3.4 의 file |
| EDGE.4 | sim worker pollution 회피 (cycle 122 v25 회귀 패턴) | integration | `scripts/sim-cycle-v2.ts` 가 v26 state default 로 시작. v25 saved game 이 sim worker 에 leak 0. 첫 cycle 의 `achievementProgress` = {} 의 invariant | `scripts/__tests__/sim-cycle-v2.smoke.test.ts` |
| EDGE.5 | `seasonId` 0 boundary — `getNow` < epoch0 (시계 과거) | unit | `seasonId(epoch0 - 1)` → `-1` 또는 `0` clamp. PRD 미정의이므로 *clamp 0* policy 권고 (cycle 128 구현 시 결정). 어느 쪽이든 crash 0 | F2.1 의 file |
| EDGE.6 | 시즌 5 starter 동시 완료 — token 13 합산 | integration | 단일 frame 안 5 starter 모두 trigger → `seasonToken += 13` (1+2+2+3+5). 순서 무관 + 누적 정확 | F1.10 의 file |
| EDGE.7 | naming 충돌 (R1) — 기존 `season/SeasonState.ts` 와 신규 `liveOps/SeasonalModifierEngine.ts` 분리 | unit (grep) | `grep -rn "from '.*season/SeasonState'" games/inflation-rpg/src/liveOps --include="*.ts"` 결과 = 0 hit (cross-import 금지). `grep -rn "from '.*liveOps/" games/inflation-rpg/src/season --include="*.ts"` 결과 = 0 hit (역 cross-import 금지) | grep CI step |

## 검증 명령

```bash
# unit + integration — cycle 128~130 의 각 sub-cycle 마다 의무
pnpm --filter @forge/game-inflation-rpg test

# 특정 영역만 (cycle 128 의 F1 진입 직후)
pnpm --filter @forge/game-inflation-rpg test src/liveOps/__tests__/AchievementSystem
pnpm --filter @forge/game-inflation-rpg test src/liveOps/__tests__/seasonId
pnpm --filter @forge/game-inflation-rpg test src/liveOps/__tests__/applyModifier
pnpm --filter @forge/game-inflation-rpg test src/liveOps/__tests__/tokenEconomy
pnpm --filter @forge/game-inflation-rpg test src/store/__tests__/gameStore.persist

# e2e — cycle 130 의 ship 직전 의무 (Playwright dual evidence)
pnpm --filter @forge/game-inflation-rpg e2e --grep "cycle-127-live-ops"

# sim-driven acceptance — multi-seed (룰 6) 의무
pnpm --filter @forge/game-inflation-rpg tsx scripts/measure-cycle-128-achievements.ts \
  --seeds 1024,2048,4096 --cycles 30
pnpm --filter @forge/game-inflation-rpg tsx scripts/measure-cycle-129-modifier-cap.ts \
  --seeds 1024,2048,4096 --cycles 30 --modes active,inactive

# sim driver mirror grep (dual evidence §1)
grep -n "evaluateAchievements\|AchievementProgress" games/inflation-rpg/scripts/sim-cycle-v2.ts
grep -n "applyModifier\|seasonId" games/inflation-rpg/scripts/sim-cycle-v2.ts

# OOS + EDGE grep CI step (cycle 130 ship 전 의무)
grep -rn "maxLevel.*seasonToken\|rank.*seasonToken" games/inflation-rpg/src --include="*.ts"
grep -rn "seasonToken.*productId\|iap.*token" games/inflation-rpg/src --include="*.ts"
grep -rn "fetch\|XMLHttpRequest\|axios" games/inflation-rpg/src/liveOps --include="*.ts"
grep -rn "adReward.*token\|admob.*token" games/inflation-rpg/src --include="*.ts"
grep -rn "from '.*season/SeasonState'" games/inflation-rpg/src/liveOps --include="*.ts"
grep -rn "from '.*liveOps/" games/inflation-rpg/src/season --include="*.ts"

# typecheck + lint + circular (cycle 단위 마지막 항상)
pnpm typecheck
pnpm lint
pnpm circular
```

## DoD (Definition of Done) — N5 ship 시점 (cycle 135 종결)

### Vitest 곡선

- baseline (cycle 125 시점) = **1408 PASS**.
- cycle 128 (F1 AchievementSystem ship) = baseline + ~25 신규 case
  (F1.1~F1.14 = 14 case 의 multi-variant 포함 ~25 expected). **≥ 1433 PASS** 의무.
- cycle 129 (F2 SeasonalModifier ship) = +~20 신규 case (F2.1~F2.11 + sim
  driver mirror). **≥ 1453 PASS** 의무.
- cycle 130 (F3 + persist v26) = +~15 case (F3.1~F3.9 + EDGE.2/3/6). **≥
  1468 PASS** 의무.
- cycle 131 (telemetry) = +~5 case. **≥ 1473 PASS** 의무.
- cycle 132-135 (balance + content expansion sub-phase) = +~10-20 case.
  **≥ 1483-1493 PASS** 의무.
- **N5 ship 시점 (cycle 135 종결) 기대 = ~1490 PASS, 회귀 0**.

### E2E 곡선

- baseline (cycle 125 시점) = **chromium + iphone14 양쪽 100% PASS**.
- cycle 130 ship 시점 = 신규 `cycle-127-live-ops.spec.ts` 1 개 추가 (F1.13 +
  F2.10 의 dual evidence). chromium + iphone14 양쪽 PASS 의무.
- v25 → v26 migration e2e = `v9-migration.spec.ts` 패턴 follow (별도 spec 권고).

### Typecheck / lint / circular

- 0 exit 의무. cycle 128~135 의 각 sub-cycle 마다 의무.
- ESLint boundaries v5 의 element-types 룰이 `liveOps/*` 의 cross-namespace
  import 차단 검증 (EDGE.7 의 grep 가드 + lint 가드 dual layer).

### Headless sim regression

- multi-seed (1024/2048/4096) × 30-cycle chained sim.
- **maxLevel p50** = baseline 6.98M ± 5% (= 6.63M ~ 7.33M). 초과 시 cycle 17
  atk-bound 봉인 회귀 → ship 차단.
- **natural-death rate** = 99.3% ± 1%. 초과 시 hero life cycle 비정상.
- **ageEnd p50** = 70 ± 5. 초과 시 V3-B aging system 회귀.
- **atkBonus ratio** = 1.01 (cycle 17 봉인). 초과 시 F2 modifier 가 atk_bonus
  silently 회복 의심.
- **cyclesWithNpc** = 2/cycle ± 0.5. 초과 시 F2 의 `npc-encounter-boost`
  modifier 가 NPC pool 에 silently mutation.

### Manual QA 체크리스트 (cycle 130 ship 직전, real device 권고)

1. **MainMenu 진입** — SeasonPassScreen entry button 가시. tap → 화면 진입.
2. **AchievementProgress UI 가시** — 5 starter 의 progress 0% 표시.
3. **`lv-10m-in-3-cycles` 진행 가시** — 단일 cycle 안 maxLevel 10M 도달 시
   progress 1/3 → 다음 cycle 시작 시점 갱신.
4. **claimAchievement button** — `completed: true` 의 achievement 만 button
   enabled, 미완은 disabled.
5. **token 환전 button** — `seasonToken ≥ 10` 일 때만 enabled.
6. **잔액 음수 가드 UI** — `seasonToken = 5` 일 때 환전 button disabled +
   toast "10 token 부족" message.
7. **시즌 전환 자동 환전** — device 시간 30 일 앞당기기 (R3 회수) → app 재진입
   시 modal "이전 시즌 token 자동 환전: X 균열석" 표시.
8. **persist 안전성** — app kill → 재기동 → `achievementProgress`, `seasonToken`,
   `cycleStartSeasonId` 모두 복원.
9. **AdFree IAP unaffected** — Phase 5 의 adFreeOwned + crack_stone_pack 4 품목
   이 token economy 와 분리 표시 (channel 단일화 visible).
10. **clock skew 보호** — device 시간 후진 (예: 1 시간 과거 → 1 시간 미래)
    동안 cycle 진행 → 현재 cycle 의 modifier 무변동.

### Sim-real parity dual evidence (cycle 128/129/130 의 각 ship 직전)

- F1 (cycle 128): sim driver mirror grep (F1.12) 결과 line 인용 + Playwright
  1-smoke (F1.13) console log line 인용. 두 evidence 의 ageEnd / endCause 등
  metric 산술 거리 < 10% 일치.
- F2 (cycle 129): sim driver mirror grep (F2.9) 결과 line 인용 + Playwright
  1-smoke (F2.10) console log line 인용. fire trait pick 분포 일치.
- F3 (cycle 130): read-only economy 이므로 sim 의무 면제 (PRD §F3 acceptance
  직접 회수). 대신 grep evidence (F3.7+F3.8) 만 의무.

## 통과 기준 요약

- vitest pass rate: 100% (≥ 1490 by cycle 135)
- e2e (chromium + iphone14): 100%
- typecheck/lint/circular: 0 exit
- headless sim regression: maxLevel p50 6.98M ± 5%, natural-death 99.3% ± 1%
- OOS grep 가드: 4 항목 모두 0 hit
- EDGE.7 cross-namespace import: 0 hit
- Sim-real parity dual evidence: 3 case (F1.12+F1.13, F2.9+F2.10, F3 grep) 의
  line 인용 의무

## 마무리 한 줄

> **cycle 127 = N5 mega-phase QA scaffolding.** code 0, test scaffolding 0.
> deliverable = test case 매트릭스 (F1 14 + F2 11 + F3 9 + OOS 4 + EDGE 7 =
> 45 case) + 회귀 핫스팟 (6 영역) + 검증 명령 + DoD (vitest 1490 / e2e
> 양 platform / sim 회귀 5% / manual QA 10 단계). cycle 128-130 의 각 ship
> 시점에 본 plan 의 case 가 그대로 file path 별로 실현. 룰 Sim-real parity
> dual evidence 의무 모든 sim-driven case 에 명시. server-less + cycle 17
> atk-bound 봉인 + V3 정체성 안전 유지.
