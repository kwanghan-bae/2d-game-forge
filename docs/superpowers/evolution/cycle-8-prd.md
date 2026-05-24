# Cycle 8 PRD — columnBounds Caller Root Fix (P0)

## 한 줄

Cycle 7 finisher Playwright B 가 발견 — F4 fallback 이 hot path 의 99% (30초 idle 10회 / 4분 idle 89회) 발동. 진짜 root cause = `OverworldScene.pickNextDestination` 의 columnBounds 가 **target 의 realm 무시** 한 채 `currentRealm.columnRange` 만 적용해서 cross-realm target 매번 fail → F4 retry 의존. C1 fix 후 cycle 7 의 R1+S1+F4 함께 main fold.

## 정찰 보고 (cycle 7 finisher 직속)

- Agent `a9dcee4a692b7f152` 의 Scenario B FAIL 보고
- 확정 grep: `grep -n "columnBounds = .*currentRealm" games/inflation-rpg/src/overworld/OverworldScene.ts`
- console.warn dump: `cycle-7-postsim/console-warns-scenario-c.log` (89 건/cycle)
- 모든 trigger pattern: `realm=base + target column 100+ (base columnRange [0,20] 밖)`
- 정찰 baseline: 30초 idle = 10회 / 4분 idle = 89회 (cycle 8 의 measurable Δ-from-baseline 측정 가능)

## Root cause 분석 + 후보 3

### 현재 코드 패턴
```ts
const columnBounds = this.currentRealm
  ? findRealm(this.currentRealm).columnRange
  : undefined;
const path = await this.pathfinder.findPath(heroPos.x, heroPos.y, target.gridX, target.gridY, columnBounds ? { columnBounds } : undefined);
```
→ target 이 다른 realm (예: hero=base[0,20], target=sea[21,40]) 일 때 columnBounds=base[0,20] 가 sea target 을 거부 → F4 retry 발동.

### 후보 3 (cycle 7 finisher 가 R1 룰 첫 자연 적용 — 후보 3 명시)

(a) **bounds 의미 확장** — `columnBounds = union(hero realm.columnRange, target realm.columnRange)` — hero 와 target 의 realm 둘 다 허용
(b) **target realm 으로 동적** — `columnBounds = target.realmId === currentRealm ? currentRealm.columnRange : findRealm(target.realmId).columnRange` — target 의 realm 적용 (다만 cross-realm 이동의 의도 자체가 의심)
(c) **bounds 제거** — `columnBounds = undefined` (항상 unconstrained) — F4 fallback 의 안전망에 의존하지 않고 normal path
(d) **bounds 의미 재설계** — 원래 의도가 hero 가 자신의 realm 안에서만 머무르는 것이라면, 그렇다면 target 선택 시점에서 hero realm 밖 target 을 candidates 에서 제외. target selection 단계 fix.

### implementer 가 결정

(d) 가 가장 architecturally clean (target selection 의 잘못된 hot path 차단). (a) 는 cross-realm 의 모호함을 유지. (c) 는 columnBounds 의 design 의도 자체 폐기.

implementer 가 git log + 코드 의도 grep 으로 columnBounds 의 original purpose 확인 후 결정. 후보 (d) 우선 검토.

## 수용 기준 (Δ-from-baseline + measurable)

### 기능
- Unit test: hero col 1 (base) + target col 25 (sea) 인 candidate 가 (i) target selection 단계에서 제외되거나 (ii) bounds 가 union 으로 path 정상 반환
- Unit test: hero col 5 (base) + target col 10 (base) — 기존 normal case 회귀 0

### Playwright Δ-from-baseline
- 정찰 baseline: 4분 idle `getPathfinderFallbackCount()` = 89
- 수용: cycle 8 fix 후 4분 idle `getPathfinderFallbackCount()` ≤ 9 (90% 감소 / Δ ≥ 80)
- 0 까지 요구 안 함 (F4 안전망 의도적 유지)

### 회귀 가드
- Cycle 5 stale realm fix 회귀 0 (currentRealmId reset 정상)
- Cycle 6 P0 reload resume 회귀 0
- Cycle 6 P1 saga snapshot 회귀 0
- Cycle 7 R1+S1+F4 commit 들이 함께 main 으로 fold

## 작업 순서

1. Cycle 8 branch = `feat/cycle-8-columnbounds-root-fix`. **base = cycle 7 branch** (`feat/cycle-7-fallback-cleanup-recon`) 의 끝 commit `b91b47c` — cycle 7 의 R1+S1+F4 commits 포함
2. implementer:
   - Phase A: grep + git log 로 columnBounds original purpose 확인
   - Phase B: 후보 (d) 우선 구현 + unit test
   - Phase C: typecheck/lint/vitest baseline + 신규
3. finisher: Playwright Δ-from-baseline 검증 + main 머지 (cycle 7 + cycle 8 함께 fold) + tag `cycle-8-complete` + cycle 7 의 `cycle-7-partial-complete` 그대로 (history 보존)

## 머지 가드

- typecheck/lint PASS
- vitest 1166 baseline + 신규 (3+)
- circular baseline 1
- Playwright: Δ-from-baseline fallback count ≤ 9 (정찰 89 의 90% 감소)
- 회귀: cycle 5+6+7 모두 PASS

## Phase G self-check 예상

- 약점 고갈: ✗ (staggered + prod 빌드 + realm 정체 + content/balance + D1-D7)
- 3 연속 같은 1순위: ... → 6 store sync → 7 carry-over cleanup → **8 root path fix** = 다른 카테고리
- 자원 추정: cycle 7 보다 더 작음 (root cause + 후보 3 명시 + measurable baseline 모두 있음 — implementer 의 분석 시간 최소). 1 implementer + 1 finisher.

## Cycle 9+ carry-over

- `pathfinderFallbackCount` cycle 종료 saga 기록 (cycle 7 의 C2) — 미래 동급 bug 자동 visible
- HeroSnapshot `staggered` field (cycle 6 carry-over)
- prod 빌드 추가 정찰 (긴 시나리오 + 모바일)
- realm 정체 (cycle 6 정찰의 stage 3/6 stuck)
- content/balance: 학습 스킬 / 가호 / 장비 surface 빈약 (cycle 6 정찰)
- D1-D7 backlog
- PRD fixture schema bug — `sagaHistory[].hero.deathCause` vs canonical `hero.cause + top-level deathCause` (cycle 7 의 발견)
- 정찰 의 measurable baseline 1회 사전 측정 룰 (cycle 7 R1 의 자연 확장 — 페르소나 doc patch)
