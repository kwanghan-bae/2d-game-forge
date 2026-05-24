# Cycle 16 Result — Multi-cycle chained sim driver

> PRD: [`cycle-16-prd.md`](cycle-16-prd.md). 자율진화 16 — cycle 15 finisher
> 1순위 (sim 의 multi-cycle chained state carry 부재) 해소.

## 한 줄

`runSimV2Chained` 신규 export — `cycleSliceV2.start() + endCycle()` 의
사이드이펙트 (rotation pick, SagaStorage.append, sponsorGold spend,
unlockedRealms onBossKill 누적, currentRealmId base reset) 를 sim loop
안에서 mirror. 50-cycle chained 의 sagaHistory.length=50 / unlockedRealms
6/6 organic unlock / atk+hp bonus=1,076 / startRealm 분포 σ=5.66% mean.

## 머지 정보

- **Commit**: `43692e7` (feat) + `30f012e` (docs)
- **Branch**: `feat/cycle-16-chained-sim`
- **Main merge**: `d5851ef` (--no-ff)
- **Tag**: `cycle-16-complete`
- 7 file / +695 / -12

## 머지 가드

| 검증 | 결과 |
|------|------|
| `pnpm --filter @forge/game-inflation-rpg typecheck` | 0 exit |
| `pnpm --filter @forge/game-inflation-rpg lint` | 0 exit |
| `pnpm --filter @forge/game-inflation-rpg test` | **1227 / 1227 passed** (cycle 15 baseline 1222 + 5 new) |
| `pnpm circular` | 1 (pre-existing `HeroEntity.ts > JobSystem.ts`) |

## Chained 50-cycle 측정 (seed=100, max-arrivals=400)

```bash
pnpm tsx scripts/measure-cycle-16.ts --count 50 --seed 100 --max-arrivals 400
```

```json
{
  "cycleCount": 50,
  "sagaHistoryLength": 50,
  "unlockedRealmsAtEnd": ["base", "sea", "volcano", "underworld", "heaven", "chaos"],
  "unlockedCountAtEnd": 6,
  "atkBaseBonus": 541,
  "hpBaseBonus": 535,
  "sponsorGold": 1143,
  "startRealmDistribution": {
    "base": 9, "sea": 9, "volcano": 8,
    "underworld": 8, "heaven": 8, "chaos": 8
  },
  "startRealmStddevPctOfMean": "5.66%",
  "maxLevel_p50": 468983,
  "bossKillsTotal": 130
}
```

| PRD 수용 | 임계 | 실측 | 결과 |
|----------|------|------|------|
| a · sagaHistory.length === N | === 50 | 50 | PASS |
| b · unlockedRealms.length ≥ 3 | ≥ 3 | 6 | PASS |
| c · atk+hp bonus > 0 | > 0 | 1076 | PASS |
| · startRealm 분포 σ/mean | < 20% | **5.66%** | PASS (보너스) |
| d · 기존 batch mode 회귀 | sagaHistory 0 변동 | 0 | PASS (unit test) |
| · batch maxLevel p50 회귀 | ≈ cycle 15 의 6.87M | **6.86M** (10-cycle seed 200) | PASS (~0% drift) |
| · batch 자연사 회귀 | === 100% | 10/10 | PASS |
| e · 머지 가드 vitest | ≥ 1222 + 신규 | 1227 | PASS |

## 변경 파일

| 파일 | 변경 |
|------|------|
| `scripts/sim-cycle-v2.ts` | +~130 — `runSimV2Chained` 신규 + `runOneCycle` `chained` param + SimV2CycleResult.startRealm + CLI `--chained` flag |
| `scripts/measure-cycle-16.ts` | **신규** — one-shot store-state measurement (sagaHistory/unlockedRealms/bonuses + 분포) |
| `scripts/__tests__/sim-cycle-v2.smoke.test.ts` | +~85 — 4 cycle-16 회귀 가드 |

## Findings

- **maxLevel p50 chained = 468k**. cycle 15 의 batch 1200-arrival p50
  (6.87M) 대비 낮음 — 400 arrival cap 때문이지 chained 진행 회귀 아님.
  Cycle 17 후보: 1200-arrival chained 의 atk/hp bonus growth curve
  balance impact 측정.
- **Event 폭발 ($2.7GB jsonl shards for 50 × 1200 chained)**. Chained 의
  hero 가 cumulative atk/hp bonus 로 강해지면 monster 처리 속도가 폭발 →
  arrival 당 event 폭증. 측정 도구의 운영비용 considered — 400 cap 가
  cycle 16 의 sweet spot. 더 깊은 chained sim 은 별도 phase.
- **6/6 realm organic unlock at cycle 50 / max-arrivals 400**. boss kill
  130 회 = 5 realm transition × ≥ 26 회 per realm. unlockedRealms 첫
  도달 cycle 추적은 별도 측정 (`startRealmDistribution` 만 cycle 16 보고).
- **σ/mean 5.66%** = 6 realm 9/9/8/8/8/8 분포. PRD < 20% 보너스 만족.
  Cycle 17 의 1200-arrival chained 에서도 비슷한 균등성 기대됨.
- **Side-effect drift risk**. `runSimV2Chained` 가 `cycleSliceV2.endCycle`
  의 사이드이펙트를 inline 으로 mirror. Future endCycle 변경 시 silent
  desync 가능 — sim-real parity 룰 (cycle 13 dogfood) 의 직접 적용 대상.
  Comment 로 박제. Cycle 13 처럼 dogfood 정찰 의무.

## Cycle 17 1순위 — 보고서 권장

**1200-arrival chained 의 atk/hp bonus balance impact**. Cycle 16 은
"누적 일어남" 만 검증. 50-cycle chained 의 maxLevel p50 곡선이 cycle 0
대비 N 배 증가하는지, balance pivot 필요한지 별도 측정. 수용 기준:
chained N=50 의 maxLevel p50 vs batch (atkBonus 0) 의 ratio < 10x
(over-inflation 방지) 또는 balance 식 재정의 필요 판정.
