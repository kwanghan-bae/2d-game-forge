# Cycle 15 PRD — Round-robin starting realm rotation

> 자율진화 15 번째 cycle. cycle 14 finisher 의 1순위 — 연속 cycle 시작 realm
> 부재가 V3 "영원한 영웅의 다 차원 모험" 정체성과 충돌. 결과:
> [`cycle-15-result.md`](cycle-15-result.md)

## 한 줄

`cycleSliceV2.endCycle` 의 stale-realm guard 가 `run.currentRealmId='base'` 로
force-reset → cycle 사이 unlockedRealms 가 누적되어도 시작 위치는 항상 base.
`pickStartingRealm` round-robin selector + `hero.gridX` 동기화로 cycle 마다
unlocked realm 을 회전하며 시작.

## Root cause

`games/inflation-rpg/src/overworld/cycleSliceV2.ts` line 121-129:

```ts
useGameStore.setState(s => ({
  ...s,
  run: {
    ...s.run,
    currentRealmId: 'base',  // ← cycle-5 F1 stale-realm guard
    npcs: [],
  },
}));
```

이 가드의 동기:
- Cycle-5 F1: 이전 realm 의 columnBounds 가 base 의 hero (col 1) 와 mismatch
  → pathfinder 모든 candidate 차단 → '무위' 5세 즉사.
- cycle-5 fix 의 단순화 = 다음 cycle 의 spawn 도 항상 base village col 1
  로 강제 → 단일 valid pair.

가드는 옳지만, cycle 사이 progression 부재는 V3 의 "다 차원 모험" 정체성
정면 위배. Cycle 14 시점 — sagaHistory 13 cycle 모두 시작 realm = base.

## Discriminating constraint

**Hero.gridX 와 currentRealmId 는 같이 움직여야 한다** (advisor recon T1).
pathfinder.columnBounds 는 realm.columnRange 에서 파생. mismatch = cycle-5 F1
의 정확한 재현. 따라서 rotation logic 은 둘을 함께 갱신해야 함.

## Fix — round-robin + spawn 동기화

| ID | 한 줄 | 파일 | 라인 |
|----|-------|------|------|
| **C15-1** | `realmRotation.ts` pure selector 모듈 신설. `pickStartingRealm(unlockedRealms, cycleNumber)` = `unlocked[n % unlocked.length]`. `spawnColumnForRealm(id)` = `realm.columnRange[0] + 1`. | `src/overworld/realmRotation.ts` | +64 |
| **C15-2** | `cycleSliceV2.start()` heroSnapshot=null branch 에서 selector 호출 후 store + controller currentRealmId 갱신, hero.gridX/gridY 동기화. Resume 은 스킵. | `src/overworld/cycleSliceV2.ts` | +20 |
| **C15-3** | `OverworldScene.create()` hero sprite spawn = hero entity gridX/gridY 기반 (legacy base village hardcode 의 fallback 만 남김). | `src/overworld/OverworldScene.ts` | +13 |
| **C15-4** | `scripts/sim-cycle-v2.ts` 에 `startRealm` + `unlockedRealms` 파라미터 추가. hero.gridX 도 realm 에 맞춰 동기화. | `scripts/sim-cycle-v2.ts` | +20 |
| **C15-5** | `realmRotation.test.ts` 10 신규 unit test (round-robin / 빈 unlocked / 음수 / spawn col). | `src/overworld/__tests__/realmRotation.test.ts` | +64 |
| **C15-6** | `cycleSliceV2.test.ts` 4 신규 cycle-15 회귀 가드 (single unlocked / 2 unlocked rotation / 3 unlocked / heroSnapshot resume 스킵). | `src/overworld/__tests__/cycleSliceV2.test.ts` | +91 |

## 수용 기준

| 항목 | baseline (cycle 14) | cycle 15 target | 결과 |
|------|------|--------|------|
| Sim 30 cycle 자연사 | 100% (10) | ≥ 95% | **100% (30/30)** PASS |
| Sim 30 cycle 비-base 시작 | 0% | ≥ 30% | **66.7% (20/30)** PASS |
| Sim base maxLevel p50 | 6.92M | 회귀 ≤ 10% | **6.88M** PASS |
| Sim sea maxLevel p50 | n/a | 회귀 ≤ 10% vs base | **6.97M (+1.4%)** PASS |
| Sim volcano maxLevel p50 | n/a | 회귀 ≤ 10% vs base | **6.98M (+1.5%)** PASS |
| vitest 회귀 | 1208 | +14 신규 | **1222 (+14)** PASS |
| typecheck / lint / circular | PASS / PASS / 1 (baseline) | 동일 | PASS |
| E2E cycle-1-variance-realm-npc | PASS | 회귀 0 | **PASS (chromium + iphone14)** PASS |

## Sim 30-cycle 배치 (3 realm × 10 seed)

| Realm | Seed | atk/hp | 자연사 | maxLevel p50 |
|-------|------|--------|--------|--------------|
| base | 42-51 | 50/100 | 10/10 | 6,876,177 |
| sea | 52-61 | 50/100 | 10/10 | 6,972,776 |
| volcano | 62-71 | 50/100 | 10/10 | 6,977,985 |

비-base 시작 = 20/30 = 66.7%. 모든 realm 자연사 100% — Lv1 hero 라도 hero
spawn col 이 realm.columnRange[0]+1 로 동기화되면 pathfinder 가 정상 작동
+ enemy field level 의 sponge 효과로 balance 안정.

## Sim-real parity

Sim driver 는 `startRealm` + `unlockedRealms` 파라미터로 batch sweep 가능.
실제 live game 의 cycle 사이 rotation 은 store 의 `sagaHistory.length` 가
구동 — 둘 다 `pickStartingRealm` pure selector 공유로 sim-real parity
보존 (cycle 12 의 filter parity 룰).

## 머지 가드

- Commit: `00718e8` (feat branch `feat/cycle-15-realm-rotation`)
- Main merge: `30f209c` (--no-ff)
- Tag: `cycle-15-complete`
- vitest 1222/1222, typecheck/lint 0 exit, circular 1 (pre-existing)
- E2E PASS
