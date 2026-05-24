# Cycle 9 PRD — realm_entered Column-Driven Emit + Candidate Audit (cycle 7+8+9 fold)

## 한 줄

Cycle 8 finisher Playwright Δ-from-baseline 의 11 잔존 fallback 의 2 mode 해소. (R1) `realm_entered` emit 이 hero column-bucket 변경 시에도 fire 또는 scene.currentRealm 을 store reactive subscription 으로 대체, (R2) C1 filter 의 cross-realm non-exit candidate misclassify audit. cycle 9 머지 시 **cycle 7+8+9 한 번에 fold**.

## 정찰 (cycle 8 finisher 직속, 추가 정찰 skip)

- Agent `a6be011e89ad09b36` 의 Mode 1+2 분석
- 확정 grep: `grep -n "realm_entered" games/inflation-rpg/src/overworld/CycleControllerV2.ts` → line 356 의 `kind === 'exit'` 조건
- console log: `.playwright-mcp/cycle-8-postsim/cycle-8-warnings.log` (11 건)
- 정찰 baseline: cycle 8 post-C1 = 11 회/cycle (4분 idle)

## Root cause (cycle 8 finisher 완성)

### Mode 1 — 73% (8/11)
- `realm_entered` emit site = `CycleControllerV2.ts:356`, `kind === 'exit'` 조건
- Hero 가 exit landmark 도착 시점에만 fire. 그러나 hero 가 **column 직접 traversal** (예: base col 19 → sea col 21 직진 ; 다른 cell 통과 도중) 시 fire 안 함
- → `OverworldScene.currentRealm` 영구 stale (예: scene 은 'sea' 로 알고 있는데 hero 는 underworld col 79)
- C1 filter 가 stale realm 기준으로 적용 → candidate 거부 → F4 retry warn

### Mode 2 — 9% (1/11)
- C1 filter 가 `kind === 'exit'` 통과 (의도) 인데, exit landmark 이지만 cross-realm 일 때 column 범위 검증 누락 가능
- 예: `hero (9,7) base → target (79,6) underworld` 가 exit 으로 misclassify 되어 filter 통과

## 후보 R1 (Mode 1 해소)

(a) **realm_entered emit 확장** — `CycleControllerV2.tick` 또는 hero column 변경 hook 에 column-bucket → realm mapping 검사 + 변경 시 realm_entered emit
(b) **Scene reactive subscription** — `OverworldScene.currentRealm` 을 store.run.currentRealmId 의 reactive subscription 으로 대체 (push 대신 pull). scene boot 시 + every frame begin 또는 zustand subscribe
(c) **Hybrid** — column-bucket 변경 시 fire + scene 도 store subscribe (방어선 둘)

권장: **(b) Reactive subscription**. Push (event) 패턴은 race condition + missed fire 위험 항상 있음. Pull (subscription) 패턴은 source of truth (store) 한 곳만 유지. V3-H 의 setUnlockedRealms 패턴이 이미 store-driven 이라 일관성.

다만 (a) 가 더 작은 변경 (1-line in tick). 트레이드오프 → implementer 가 advisor 호출 후 결정.

## 후보 R2 (Mode 2 해소)

- `Landmark.ts` 의 `filterCandidatesByRealm` 의 `kind === 'exit'` 항상 통과 조건 audit
- Exit landmark 의 cross-realm column 검증 추가 (예: exit target column 이 currentRealm.columnRange ∪ unlockedRealms[next].columnRange 안 에 있는지)
- Unit test: hero base col 9 + exit target col 79 (underworld, 2 realm 건너뜀) → filter 거부

## 수용 기준 (Δ-from-baseline + measurable)

### 기능
- Unit test R1: scene.currentRealm 이 store update 와 동기화 (예: store.run.currentRealmId 'sea' → 'volcano' 변경 후 한 tick 안에 scene.currentRealm === 'volcano')
- Unit test R2: hero base + 2-realm-jump exit target → filter 거부

### Playwright Δ-from-baseline
- Cycle 8 baseline: 11 회 / 4분 idle
- 수용: cycle 9 fix 후 4분 idle `getPathfinderFallbackCount()` ≤ 3 (75% 감소 / Δ ≥ 8)
- 0 까지 요구 안 함 (race condition / 1-frame transition lag 등 잔존 가능)

### 회귀 가드
- Cycle 5+6+7+8 모두 PASS
- cycle 7 의 R1+S1+F4 + cycle 8 의 C1+sync 가 cycle 9 의 R1+R2 와 conflict 없는지 확인

## 작업 순서

1. cycle 9 branch = `feat/cycle-9-realm-emit-redesign`. **Base = cycle 8 branch (`feat/cycle-8-columnbounds-root-fix`) 의 끝 commit** — cycle 7+8 commits 포함
2. implementer:
   - Phase A: cycle 8 의 OverworldScene + CycleControllerV2 grep + advisor (R1 후보 (a/b/c) 결정)
   - Phase B: R1 + R2 구현 + unit test
   - Phase C: 머지 가드
3. finisher: Playwright Δ-from-baseline ≤ 3 검증 + main fold (cycle 7+8+9 한 번에) + tag `cycle-9-complete` + 기존 partial tag 보존

## 머지 가드

- typecheck/lint PASS
- vitest 1172 baseline + 신규 (3+)
- circular baseline 1
- Playwright: 4분 idle fallback count ≤ 3 (Δ ≥ 8 from cycle 8 의 11)
- 회귀: cycle 5+6+7+8 모두 PASS

## Phase G self-check 예상

- 약점 고갈: ✗ (cycle 6 staggered + prod 빌드 + realm 정체 + content/balance + D1-D7 + PRD fixture schema bug + 정찰 measurable baseline 룰 페르소나 patch)
- 3 연속 같은 1순위: cycle 7 = carry-over → 8 = root path → **9 = root path 후속**. 살짝 같은 카테고리 (path).
  - **다만 9 가 8 의 직접 후속 (cycle 8 finisher 의 Mode 1/2 진단)** 이라 자율 chain 의 자연 합리적 흐름. 3 연속 같은 1순위의 의미는 "약점 고갈 신호" 인데, 여기는 같은 약점의 더 깊은 layer 라 신호 약함
- 자원 추정: cycle 8 와 비슷 (root cause + 후보 + measurable 모두 있음)

## Cycle 10+ carry-over

- 모든 cycle 8 carry-over 잔존
- 추가: cycle 9 의 R1 (b) 선택 시 reactive subscription 패턴의 다른 scene field 도 동일 변환 검토 (`unlockedRealms` 등)
