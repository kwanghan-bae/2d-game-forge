# STATUS 2026-05-25 — Cycle 17 (Complete — Chained 1200-arrival bonus growth balance probe)

> 최신 머지 (main): `7472ba1` (tag `cycle-17-complete`)
> 자율진화 spec: `docs/superpowers/specs/2026-05-24-autonomous-evolution-design.md`

## 한 줄

자율진화 Cycle 17 의 chained 1200-arrival bonus growth balance probe —
chained_p50 / batch_p50 = **1.01x** (Case 1 / balance OK). N=20 chained @
1200 arrival 의 maxLevel p50 = **6.98M**, batch (atkBonus=0) p50 = **6.91M**
— atk/hp bonus 누적 (cycle 19 atkBase 50→1336) 이 maxLevel 에 거의 영향
없음. **별도 balance fix 불필요, docs only commit**. 머지 가드 vitest
**1227** = cycle 16 baseline (회귀 0).

## 자율진화 진행 (17 cycles, 12 머지)

| Cycle | Merge | Tag | Key | Status |
|---|---|---|---|---|
| 0 (시드) | `81bea39` | `phase-v3-h-complete` | V3-H | baseline |
| 1 | `bd3ff10` | `cycle-1-complete` | Variance + Realm Tone + NPC Saga | full PASS |
| 2 partial | `be1b8f7` | `cycle-2-partial-complete` | F1 multi-seed 룰 | partial |
| 3 partial | `6135a9a` | `cycle-3-partial-complete` | F1 이중 prefix bug fix | partial |
| 4 | `ce4cb80` | `cycle-4-complete` | Polish Pass (6 fix) | full PASS |
| 5 | `28e5539` | `cycle-5-complete` | Stale Realm Bug Fix (3 fix) | full PASS |
| 6 | `2737dba` | `cycle-6-complete` | Run Resume + Saga Snapshot | full PASS |
| 7+8+9 fold | `d3cdb35` | `cycle-7/8/9-complete` | F4+S1+R1 + C1+sync + R1+R2 | full PASS (3-fold) |
| 10+11 fold | `dbb5ce5` | `cycle-10/11-complete` | MAX_ARRIVALS + 자연사 emit + auto-rejuv | full PASS (2-fold) |
| 12 | `08eab5e` | `cycle-12-complete` | respawn-in-realm + sim filter parity + sim shard | full PASS (false PASS 해소) |
| 13 | `b8d50bb` | `cycle-13-complete` | Persona Patch + sim-real parity 룰 dogfood | full PASS (메타-cycle) |
| 14 | `77196a1` | `cycle-14-complete` | Dev-server 자연사 emit (`clearEndCause` fix) | full PASS |
| 15 | `30f209c` | `cycle-15-complete` | Round-robin realm rotation + hero.gridX sync | full PASS |
| 16 | `d5851ef` | `cycle-16-complete` | Multi-cycle chained sim driver | full PASS |
| **17** | **`7472ba1`** | **`cycle-17-complete`** | **Chained 1200-arrival bonus balance probe (Case 1)** | **full PASS (measurement-only)** |

### 자율 머지 cycle 카운트

**12 main merges / 17 cycles**.

## Cycle 17 의 1 commit (feature 브랜치)

| ID | 한 줄 | 파일 | 라인 |
|----|-------|------|------|
| **C17** | `scripts/measure-cycle-17.ts` 신규 — runSimV2 (atkBonus=0 batch baseline) + runSimV2Chained 를 같은 maxArrivals/count 로 돌려 ratio + curve sample + polynomial degree 출력 | 1 file new | +135/0 |

Commit SHA: `5a8a099` (feat) + `ea8c686` (docs). Main merge `7472ba1`.

## 머지 가드 결과

| 가드 | baseline (cycle 16) | cycle 17 | 결과 |
|------|------|--------|------|
| typecheck | PASS | PASS | OK |
| lint | PASS | PASS | OK |
| vitest (inflation-rpg) | 1227 | **1227** (변동 0) | OK |
| circular | 1 (baseline) | 1 | OK |
| Sim chained_p50 / batch_p50 @ 1200 arrival | n/a | **1.01x** | OK (PRD Case 1, < 10x) |
| Polynomial degree (log-log) | n/a | **0** | OK (PRD < 0.5) |
| 재현 검증 (seed=300, N=10) | n/a | ratio **1.00** | OK (두 seed 일관) |

baseline 1 circular = `HeroEntity ↔ JobSystem` (P-1.5 알려진 부채, 17 cycle
누적 보존).

## Root cause / Finding

Cycle 16 chained 50-cycle (400 cap) 의 maxLevel p50 = 468k vs cycle 15
batch (1200 cap) p50 = 6.87M 의 15x ratio 는 **arrival cap 차이 때문이지
chained progression 의 effect 가 아님**. 두 mode 를 같은 1200 cap 으로
정렬하면 ratio 1.01.

배경 수식 ([`inflationCurve.ts`](games/inflation-rpg/src/cycle/inflationCurve.ts)):

- `hero.atk = atkBase * lv^1.0` (k_atk = 1.0)
- `hero.hpMax = hpBase * lv^0.7` (k_hp = 0.7)
- `atkBaseBonus` 는 `atkBase` 에 flat 추가 (50 → 50+N)

cycle 19 시점 atkBase = 1336 (+1286). 그러나 level ~수백만 단위에서
`1336 · lv^1.0` 의 dynamic range 에서 +1286 의 flat 기여는 거의 0%
영향. **진정한 cap = aging 자연사 (arrival 1154/1200, age 70)** — bonus
가 풀어주는 ceiling 이 없으므로 추가 stat 무의미.

MetaProgression cost (50+10·N atk, 30+6·N hp) 의 quadratic 누적이
organic inflation 을 흡수. 별도 diminishing returns 도입 불필요.

## Sim chained @ 1200 arrival 측정 (seed=100 / count=20)

```bash
pnpm tsx scripts/measure-cycle-17.ts --count 20 --batch-count 20 \
  --seed 100 --max-arrivals 1200
```

| 항목 | 임계 | 실측 |
|------|------|------|
| chained maxLevel p50 | n/a | **6,976,261** |
| batch (atkBonus=0) maxLevel p50 | n/a | **6,913,463** |
| ratio (chained/batch) | < 10x | **1.01x** |
| polynomial degree (log-log) | < 0.5 | **0** |
| chained final atkBonus | n/a | 1,319 |
| chained final hpBonus | n/a | 1,311 |
| chained 자연사 % | n/a | 20/20 (100%) |
| batch 자연사 % | n/a | 20/20 (100%) |
| 재현 검증 (seed=300, N=10) ratio | < 10x | **1.00x** |

## V3 정체성 dimension 검증 layer 상태

| Layer | Cycle 16 | Cycle 17 | 비고 |
|-------|----------|----------|------|
| 어린시절~마지막 lifecycle | active | active | OK |
| 자연사 emit | 100% (batch) | 100% (batch + chained 1200) | OK |
| 회춘 trigger | n/a (400 cap) | n/a (이번 측정 외) | n/a |
| 다 차원 모험 (realm 회전) | 66.7% 비-base (cycle 15 sweep) | 6/6 organic unlock (chained) | OK |
| chained progression carry | 6/6 realm + 1076 bonus (400 cap) | **+ 1200 cap 정량화: ratio 1.01x** | **cycle 17 신규** |

Sim 의 chained progression 이 maxLevel 에 미치는 정량적 영향이 측정됨
(Case 1 확정). aging-bound 시스템 정체성 확립.

## Cycle 18 1순위 추천

**Aging axis vs maxLevel ceiling 측정**. Cycle 17 finding: bonus 누적이
maxLevel 에 무관 → 다음 의미 있는 progression axis 는 aging/lifespan.
수용 기준 (한 줄): cycle 0 → cycle 19 의 rejuvCount 차이 > 0 이고
maxLevel curve 가 rejuvCount 와 양의 상관 (R > 0.3).

대안 1순위: **Sim-real parity dogfood** — cycle 16 의 chained endCycle
사이드이펙트 inline mirror 가 future endCycle 변경 시 silent desync
위험. `cycleSliceV2.endCycle` shared helper 추출 (cycle 13 dogfood
방식). 수용 기준: endCycle 핵심 4 step 이 sim 과 live 양쪽에서 동일
함수 호출.

## 2순위 (누적 carry-over)

- Chained sim 의 endCycle drift 정찰 (cycle 16 신규 — cycle 18 대안 1순위)
- Aging axis ↔ maxLevel ceiling (cycle 17 신규 — cycle 18 주 1순위)
- HeroSnapshot 직렬화에 `staggered` + `agingAccum` field 부재 (cycle 14 P1)
- PRD 산술 충돌 사전 검증 룰 (cycle 11)
- C10-C maxLevel intent 검증 (cycle 10)
- "변경 0 가설" emit grep 의무화 (cycle 10)
- PRD fixture schema bug (cycle 7)
- Reactive subscription audit (cycle 9)
- C2 pathfinderFallbackCount saga (cycle 7+8+9)
- 정찰 D5 narrative tone "5세에" 압축 (cycle 12)

## 자율진화 system 17 cycle 누적

- Cycle 17 카테고리 = **measurement / balance-validation** (코드 변경 0,
  scripts/measure-cycle-17.ts 신규 도구만). Cycle 13 의 "메타-cycle"
  (persona patch only) 와 짝을 이루는 두 번째 docs/scripts-only cycle.
- Advisor 1 시도 정확도: cycle 14 + 15 + 16 + **17** (4 핵심 모두 plan
  반영, 측정 도구 jsonl explosion risk 사전 회피) 4 cycle 연속.
- Cycle 13 sim-real parity 룰 누적 효과: cycle 14 + 15 + 16 + 17 (carry
  cycle 16 drift comment 의 sim-real parity 룰 dogfood 의무 carry-over).
  6 cycle 째 self-improving loop.
- **Aging-bound vs stat-bound 정체성 정량화** — V3 hero 의 maxLevel cap 은
  `lifespan/aging` axis 가 결정. Stat (atk/hp bonus) 는 dynamic range 에서
  무시 가능. Cycle 18+ progression axis 의 방향성 확정.

## Cycle 18 진입 권고

- Cycle 18 spec: aging axis vs maxLevel ceiling 측정 (rejuvCount 상관 + 회춘
  axis 가 cap push 가능한지) 또는 sim-real parity dogfood (endCycle shared
  helper 추출) 양자택일
- 자원: 자율 위임 권한 보존
- Hard halt 미발생
