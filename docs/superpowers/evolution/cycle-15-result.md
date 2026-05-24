# Cycle 15 Result — Round-robin realm rotation

> PRD: [`cycle-15-prd.md`](cycle-15-prd.md). 자율진화 15 — cycle 14 finisher
> 1순위 (연속 cycle realm rotation 부재) 해소.

## 한 줄

`pickStartingRealm` round-robin + hero.gridX 동기화. cycle 마다 unlocked
realm 의 다음 index 에서 시작. 사용자가 cycle 13 후 처음 base 외 realm
에서 시작 가능. 30-cycle sim batch 자연사 100% / 비-base 66.7% / maxLevel
p50 회귀 < 1.5%.

## 머지 정보

- **Commit**: `00718e8`
- **Branch**: `feat/cycle-15-realm-rotation`
- **Main merge**: `30f209c` (--no-ff)
- **Tag**: `cycle-15-complete`
- 6 file / +282 / -7

## 머지 가드

| 검증 | 결과 |
|------|------|
| `pnpm --filter @forge/game-inflation-rpg typecheck` | 0 exit |
| `pnpm --filter @forge/game-inflation-rpg lint` | 0 exit |
| `pnpm --filter @forge/game-inflation-rpg test` | **1222 / 1222 passed** (cycle 14 baseline 1208 + 14 new) |
| `pnpm circular` | 1 (pre-existing `HeroEntity.ts > JobSystem.ts`) |
| `pnpm e2e -- --project=chromium tests/e2e/cycle-1-variance-realm-npc.spec.ts` | 2/2 PASS (chromium + iphone14) |

## Sim 30-cycle batch (3 realm × 10 seed × startRealm sweep)

```bash
# base baseline
pnpm tsx scripts/sim-cycle-v2.ts --count 10 --seed 42 --start-realm base --unlocked base
# sea
pnpm tsx scripts/sim-cycle-v2.ts --count 10 --seed 52 --start-realm sea --unlocked base,sea
# volcano
pnpm tsx scripts/sim-cycle-v2.ts --count 10 --seed 62 --start-realm volcano --unlocked base,sea,volcano
```

| Realm | Seed | 자연사 | maxLevel p50 | 회귀 vs base |
|-------|------|--------|--------------|--------------|
| base | 42-51 | 10/10 | 6,876,177 | 0% (baseline) |
| sea | 52-61 | 10/10 | 6,972,776 | +1.40% |
| volcano | 62-71 | 10/10 | 6,977,985 | +1.48% |

- 자연사 30/30 = **100%** (PRD ≥ 95% 만족)
- 비-base 시작 20/30 = **66.7%** (PRD ≥ 30% 만족)
- maxLevel p50 회귀 ≤ 1.5% (PRD ≤ 10% 만족)

Balance breakage 0. Lv1 hero 가 sea/volcano 에서 시작해도 hero.gridX 동기화
+ enemy field level sponge 가 정상 progression 보장.

## 변경 파일

| 파일 | 변경 |
|------|------|
| `src/overworld/realmRotation.ts` | **신규** — pure selector (pickStartingRealm + spawnColumnForRealm) |
| `src/overworld/cycleSliceV2.ts` | +20 — start() heroSnapshot=null branch 에서 rotation 호출 |
| `src/overworld/OverworldScene.ts` | +13 — hero sprite spawn = entity gridX (legacy fallback 유지) |
| `scripts/sim-cycle-v2.ts` | +20 — startRealm + unlockedRealms 파라미터 + hero.gridX sync |
| `src/overworld/__tests__/realmRotation.test.ts` | **신규** — 10 unit test |
| `src/overworld/__tests__/cycleSliceV2.test.ts` | +91 — 4 cycle-15 회귀 가드 |

## Findings

- **Lv1 hero in sea/volcano survives**: PRD 의 우려 (Lv1 hero 가 underworld
  tier realm 시작 시 즉사) 는 발현되지 않음. Enemy field level scaling +
  sponge 효과 + AI 의 enemy 회피 우선순위가 balance 보존.
- **Hero spawn drift 위험**: OverworldScene 의 hero sprite 위치는 entity
  gridX/Y 기반으로 변경 — store-side rotation 이 sprite 위치까지 따라옴.
  Legacy village hardcode 는 gridX=0 (default) 일 때 fallback 으로만.
- **Sim-real parity 유지**: `pickStartingRealm` pure selector 를 sim driver
  도 동일 logic 으로 호출 가능 (sim 은 batch param 으로 외부 주입, live 는
  store 의 sagaHistory.length 로 자동 계산).

## Cycle 16 1순위 — 보고서 권장

**Sim 의 multi-cycle chained driver**. 현재 sim 은 단일 cycle batch (startRealm
파라미터로 외부 분포 sweep). Cycle 15 이후의 V3 progression — atk/hp bonus
누적, unlockedRealms 누적, sagaHistory 길이의 자연 증가 — 를 검증하려면
**chained sim** (cycle N+1 의 startRealm = cycle N 의 endCycle 후
unlockedRealms+sagaHistory 누적 기반 selector 호출) 필요. 수용 기준:
chained 50-cycle 에서 unlocked 카운트 자연 증가 + 시작 realm 분포 균등
+ maxLevel growth curve 단조성 측정.
