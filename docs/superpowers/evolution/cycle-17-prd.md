# Cycle 17 PRD — Chained 1200-arrival bonus growth balance probe

> 자율진화 17 번째 cycle. cycle 16 finisher 의 1순위 — `runSimV2Chained`
> 의 400-arrival 측정만으로는 atk/hp bonus 누적이 maxLevel 곡선에 미치는
> 영향을 알 수 없음. 1200-arrival (natural-death window) 에서 cycle N
> 후의 hero 가 cycle 0 hero 대비 얼마나 폭주/정체하는지 측정 + balance
> rebalance 필요 판정. 결과: [`cycle-17-result.md`](cycle-17-result.md)

## 한 줄

Chained 1200-arrival N=20 의 maxLevel_p50 ≈ batch (atkBonus=0) 의 p50.
ratio = 1.01 (Case 1 / balance OK). 별도 balance fix 불필요, 측정 +
docs only commit. 진정한 cap 은 arrival 이 아니라 hero 의 aging 자연사
(arrival 1154/1200).

## Root cause

Cycle 16 chained 의 maxLevel_p50 = 468k @ 400 arrival. Cycle 15 batch
@ 1200 arrival 의 p50 = 6.87M. 두 값의 ratio(15x) 는 arrival cap 차이
때문이지 chained progression 의 효과가 아님 — 두 측정 setup 이 다른
arrival cap. **같은 arrival cap 에서 chained vs batch p50 비교가
필요**.

배경 수식:

- `hero.atk = atkBase * lv^1.0` ([`inflationCurve.ts`](../../../games/inflation-rpg/src/cycle/inflationCurve.ts))
- `hero.hpMax = hpBase * lv^0.7`
- `atkBaseBonus` 는 `atkBase` 에 **flat** 으로 더함 (50 → 50 + N)
- bonus 의 atk 기여 = N · lv^1.0. lv 가 수백만 단위면 N=1000 의 +1000
  flat 은 lv^1.0 의 100% 변동에 비해 작음.
- MetaProgression cost 는 `50 + 10·N` (atk), `30 + 6·N` (hp) — 선형
  증가. 누적 cost ~ N^2 / 2. 따라서 cycle N 후 bonus 는 O(√(누적 gold)).

Cycle 16 의 노트 (chained jsonl 2.7GB 폭발) 는 outDir 가 설정된 별도
run 때문이지 측정 자체 비용이 아님. measure-cycle-N 패턴은 outDir 를
주지 않아 disk explosion 비대상.

## Discriminating constraint

**같은 arrival cap (1200)** + **같은 N** + outDir 미설정 으로 chained
vs batch 의 p50 ratio 단일 숫자로 결론. RSS peak 은 cycle 16 의 stamped
event 가 매 cycle GC → N=20 까지는 안전 (advisor 검증).

## 수용 기준

| # | 항목 | 임계 |
|---|------|------|
| a | chained_p50 / batch_p50 < 10x | Case 1 — balance OK, defer |
| a' | 10x ≤ ratio < 100x | Case 2 — diminishing returns 도입 |
| a'' | ratio ≥ 100x | Case 3 — bonus cap or cycle-N decay |
| b | polynomial degree (log-log slope) | < 0.5 → flat 인정 |
| c | typecheck / lint / vitest 1227 baseline | 0 exit |
| d | circular 1 (pre-existing) | 변동 0 |

## 비-목표

- 광고/현금화 hook 변동 (Phase 5 영역)
- 100+ cycle 의 hyper-late 측정 (N=20 으로 충분히 saturate 보일 것)
- jsonl shard 수집 (이번엔 summary-only — disk explosion 회피)

## 실행 도구

`scripts/measure-cycle-17.ts` 신규 — `runSimV2` (batch atkBonus=0) +
`runSimV2Chained` 를 동일 `maxArrivals` / count 로 돌려 ratio + curve
sample (cycle 0/¼/½/¾/N-1) + polynomial degree 출력.

```bash
pnpm tsx scripts/measure-cycle-17.ts --count 20 --batch-count 20 \
  --seed 100 --max-arrivals 1200
```

추가 seed (300) 로 재현성 검증.
