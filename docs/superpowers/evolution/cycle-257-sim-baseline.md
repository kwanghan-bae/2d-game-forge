# Cycle 257 — Sim Baseline (seed=300 chained 50-cycle)

작성 = 2026-05-28. cycle 256 PRD §86 chain stage 1 — silent regression 자릿수 확정.

## 측정 명령

```
pnpm --filter @forge/game-inflation-rpg sim:v3 -- --chained --seed 300 --count 50
```

50 chained cycle (사이드이펙트 누적 mirror) × maxArrivals=1200 default.

## 핵심 metric

| metric | seed=100 (cycle 256) | seed=300 (cycle 257) | Δ-from-baseline (cycle 17/100/156) |
|---|---|---|---|
| maxLevel p50 | 4,887,360 | **4,923,482** | **-28.3%** (baseline 6.86M) |
| maxLevel p90 | ~7,000,000 | 7,005,043 | -0% (꼬리 정합) |
| saint 비율 | 40/50 (80%) | **41/50 (82%)** | **+23.5%p** (baseline 58.5%, cycle 156 V1c-2) |
| 자연사 비율 | 30/30 (100%) | 50/50 (100%) | 0% (회귀 0) |
| rejuvCount p50 | 2 | 2 | 0 (flat cap) |
| shrineVisits p50 | 0 | 0 | 0 (dead surface) |
| jobs sim 도달 | 5/16 | **4/16** | -1 (saint/sage/archmage/grandmaster) |

## 결론

**Silent regression 확정**:
- maxLevel p50 -28% 침식은 *seed 변동 noise 아님*. seed=100/300 두 측정 모두 4.9M 자릿수.
- saint dominance 82% 는 cycle 156 V1c-2 의 58.5% blind spot 이 100 cycle 자율진화 동안 *자가-악화*.
- p90 7M 정합 = 꼬리 inflation 정체성은 살아 있으나 *p50 의 왼쪽 꼬리 두꺼워짐* 패턴.

## Cycle 259 nerf Δ-guard baseline lock

cycle 259 stage 의 `saint.atkMul: 2.5 → 2.8` + `merciful.min: 7 → 9` 변경 후 ≥ 3 seeds (1024/2048/4096) 평균 측정.

가드 식:
- saint 비율: baseline **82%** (cycle 257 seed=300) 대비 Δ ≤ -25%p (즉 ≤ 57%)
- maxLevel p50: baseline **4.92M** (cycle 257 seed=300) 대비 Δ ≥ +0.6M (즉 ≥ 5.52M)
- 회귀 가드: 자연사 비율 ≥ 95% (현 100% 의 5%p noise 마진)

multi-seed 필수 사유 = maxLevel p50 noise 자릿수가 0.5M 수준이라 단일 seed Δ +0.6M 은 noise 인접.

## Cycle 256 PRD §168 메타-rule 2 첫 실행

**sim baseline 매 20 cycle 강제** 룰의 첫 적용:
- cycle 256 = 첫 baseline (seed=100, level-critic dispatch 시점)
- cycle 257 = 재현 baseline (seed=300, chain stage 1)
- 다음 강제 = cycle 276 (PRD §138 명시 cycle list)

## Carry-over (cycle 258+)

- cycle 258 stage = NATURAL_DEATH_VARIANTS 1 → 5 + composition (story-critic 약점 #1 + #3)
- cycle 259 stage = saint nerf (본 baseline 인용 Δ-guard 의무)
- cycle 260 stage = first 10-cycle STATUS + chain accountability table 첨부 의무

skillsLearnedCount tail (palm_strike 9 / soul_drain 7 / curse 12) = dead skill 후보. cycle 261+ 후속 cycle 의 surface 후보.

12/16 미관측 jobs = mid-term backlog. cycle 261-280 block 의 후속 surface 또는 mega-phase 진입 (HeroDecisionAI Sim-C, deadline cycle 280).
