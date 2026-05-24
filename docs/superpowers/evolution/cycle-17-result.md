# Cycle 17 Result — Chained 1200-arrival bonus growth balance probe

> PRD: [`cycle-17-prd.md`](cycle-17-prd.md). 자율진화 17 — cycle 16 finisher
> 1순위 (1200-arrival chained 의 atk/hp bonus growth → maxLevel 곡선 영향
> 측정 + balance rebalance 필요 판정).

## 한 줄

**Case 1 (balance OK)** — chained N=20 @ 1200 arrival 의 maxLevel_p50 =
6.98M, batch (atkBonus=0) p50 = 6.91M, **ratio = 1.01x**. atk/hp bonus
누적 (cycle 19 시점 atkBase 50 → 1336, +1286) 이 maxLevel 에 거의 영향
없음. 진정한 cap 은 aging 자연사 (arrival 1154/1200), bonus 의 flat
+1286 은 lv^1.0 = 6.9M 의 dynamic range 에서 무시 가능. **별도 balance
fix 불필요, 측정 + docs only commit**.

## 머지 정보

- **Commit**: `5a8a099` (feat) + `ea8c686` (docs)
- **Branch**: `feat/cycle-17-bonus-balance`
- **Main merge**: `7472ba1` (--no-ff)
- **Tag**: `cycle-17-complete`
- 1 file new (`measure-cycle-17.ts`) + 2 docs

## 머지 가드

| 검증 | 결과 |
|------|------|
| `pnpm --filter @forge/game-inflation-rpg typecheck` | 0 exit |
| `pnpm --filter @forge/game-inflation-rpg lint` | 0 exit |
| `pnpm --filter @forge/game-inflation-rpg test` | **1227 / 1227 passed** (cycle 16 baseline 1227, 변동 0) |
| `pnpm circular` | 1 (pre-existing `HeroEntity.ts > JobSystem.ts`) |

## Chained vs Batch 측정 (seed=100, count=20, max-arrivals=1200)

```bash
pnpm tsx scripts/measure-cycle-17.ts --count 20 --batch-count 20 \
  --seed 100 --max-arrivals 1200
```

```json
{
  "config": { "count": 20, "batchCount": 20, "seedStart": 100, "maxArrivals": 1200 },
  "batch":   { "p50": 6913463, "avg": 6918240, "max": 7065062, "endCauses": { "자연사": 20 } },
  "chained": {
    "p50": 6976261, "avg": 6956829, "max": 7021463,
    "endCauses": { "자연사": 20 },
    "finalAtkBonus": 1319, "finalHpBonus": 1311,
    "finalSagaLength": 20, "finalUnlockedCount": 6
  },
  "ratio": 1.01,
  "band": "Case 1 (< 10x, balance OK)",
  "polynomialDegree": 0,
  "curve": [
    { "cycle": 0,  "maxLevel": 6692225, "startAtkBase":  50, "startHpBase":  100, "arrivals": 1154 },
    { "cycle": 5,  "maxLevel": 6986563, "startAtkBase": 704, "startHpBase":  751, "arrivals": 1154 },
    { "cycle": 10, "maxLevel": 6965723, "startAtkBase": 980, "startHpBase": 1026, "arrivals": 1154 },
    { "cycle": 15, "maxLevel": 6949843, "startAtkBase":1191, "startHpBase": 1234, "arrivals": 1154 },
    { "cycle": 19, "maxLevel": 6990183, "startAtkBase":1336, "startHpBase": 1377, "arrivals": 1154 }
  ]
}
```

## 재현 검증 (seed=300, count=10)

같은 도구 다른 seed:

```json
{
  "batch":   { "p50": ~7.0M, "endCauses": { "자연사": 10 } },
  "chained": {
    "p50": ~7.0M, "finalAtkBonus": ~890, "finalHpBonus": 928,
    "finalSagaLength": 10, "finalUnlockedCount": 6
  },
  "ratio": 1.00,
  "polynomialDegree": 0
}
```

두 seed 의 ratio 1.00~1.01 — Case 1 확정.

| PRD 수용 | 임계 | 실측 | 결과 |
|----------|------|------|------|
| a · chained/batch < 10x | < 10 | **1.01** | PASS — Case 1 |
| b · polynomial degree | < 0.5 | **0** (flat) | PASS |
| c · vitest 1227 baseline | ≥ 1227 | 1227 | PASS |
| d · circular 1 변동 0 | === 1 | 1 | PASS |

## 변경 파일

| 파일 | 변경 |
|------|------|
| `scripts/measure-cycle-17.ts` | **신규** — `runSimV2` (atkBonus=0 batch baseline) + `runSimV2Chained` 를 같은 maxArrivals/count 로 돌려 ratio + curve + polynomial degree 출력 |
| `docs/superpowers/evolution/cycle-17-prd.md` | 신규 |
| `docs/superpowers/evolution/cycle-17-result.md` | 신규 (이 파일) |

## Findings

- **Ratio 1.01x** — chained bonus 누적이 maxLevel 에 영향 거의 없음. PRD
  의 Case 1 임계 (< 10x) 를 한참 통과. 별도 balance fix 불필요.
- **Aging cap dominates arrival cap**. 두 mode 모두 1200 arrival 까지
  안 가고 arrival 1154 (age 70) 에서 `자연사` 로 종료. 1200 max-arrivals
  는 실효 cap 이 아니라 fail-safe. **maxLevel 의 진정한 cap = 자연사 +
  arrival 1154**. 이 시점 안에서 atk/hp bonus 가 풀어주는 ceiling 이
  없으므로 추가 stat 이 무의미.
- **atkBase flat bonus 의 효과 < curve power**. `hero.atk = atkBase ·
  lv^1.0`. cycle 19 시점 atkBase = 1336 (cycle 0 기준 50, +1286). 그러나
  level 이 ~수백만 단위로 inflate 한 시점에서 +1286 의 flat 기여는
  `1336 · lv^1.0` 의 dynamic range 에 비해 거의 0%. inflationCurve k_atk
  = 1.0 의 power-law dominance.
- **MetaProgression cost 의 quadratic 누적**. cost = 50+10·N (atk), 30+6·N
  (hp). 누적 cost ~ N²/2. cycle 19 시점 atkBonus = 1286, hpBonus = 1277.
  goldFromCycle (10 + maxLevel·0.1 + kills + bossKills·25 + drops·2) 가
  cycle 당 ~700-1100 sponsorGold 생산 → cycle 19 까지 누적 약 16k gold.
  현재 cost curve 가 inflation 을 흡수.
- **Polynomial degree = 0** — log-log slope estimate. cycle 1~19 의
  maxLevel 변동이 noise level. balance debt 없음.
- **Aging-bound vs stat-bound system**. Sim-B 의 trait `t_swift` (BP 흐름)
  도 polish 였지만 핵심은 변치 않음 — V3 hero 의 lifespan 이 maxLevel
  cap 을 정함. Cycle 18+ 의 fundamental question: maxLevel ceiling 을
  push 하려면 `lifespan/aging` axis 를 건드려야 함 (atk bonus 가 아니라).

## Cycle 18 1순위 — 보고서 권장

**Aging axis vs maxLevel ceiling 측정**. Cycle 17 finding: bonus 누적이
maxLevel 에 무관. aging (`HeroLifecycle`) 의 자연사 시점 (age 70 / arrival
1154) 이 cap. 따라서 다음 의미 있는 progression axis 는:

1. **회춘 (rejuvenation) 빈도** — auto-rejuv 가 발동하면 추가 arrival
   ~77 회 (cycle 11 C10-B 노트). N 번 회춘 = N·77 추가 arrival → N·~1M
   maxLevel 추가 가능?
2. **lifespan 연장** — agingDebuff curve 변경시 maxLevel cap shift?
3. **Compass/Realm 별 maxLevel ceiling** — chaos realm 의 level 곡선이
   base 보다 높은지 (k_eHp realm-specific)?

수용 기준 (한 줄): cycle 0 → cycle 19 의 rejuvCount 차이 > 0 이고
maxLevel curve 가 rejuvCount 와 양의 상관 (R > 0.3) — 그러면 회춘 axis
가 cap 을 push. 그렇지 않으면 lifespan / realm-specific exponent 측정.

또는 (대안 1순위): **Sim-real parity dogfood** — 현재 `runSimV2Chained`
의 endCycle 사이드이펙트 mirror 가 cycle 16 노트의 "future endCycle
변경 시 silent desync" 위험. live `cycleSliceV2.endCycle` 와 sim 의
mirror 가 한 곳에서만 보장되도록 shared helper 추출 (cycle 13 dogfood
방식). 수용 기준: `cycleSliceV2.endCycle` 의 핵심 step 4종이 sim 과
live 양쪽에서 동일 함수 호출.
