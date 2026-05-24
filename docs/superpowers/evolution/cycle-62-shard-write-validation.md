# Cycle 62 — Sim Shard Write Validation (cycle 12 L2 follow-up)

## 한 줄
Cycle 12 의 sim shard write (per-event openSync/writeSync) 가 V8 string cap (~512MB) 초과 방지. 1200 arrivals × ~6000 events × 50 cycle = ~3GB 데이터.

## Pre-fix
- `events.map(e => JSON.stringify(e)).join('\n')` 가 한 cycle 1200 arrivals 시 V8 cap 초과 `RangeError: Invalid string length`

## Post-fix
- 매 event 별도 line write
- 1 cycle 결과 = 1 jsonl shard
- 50 cycle = 50 shards (~965MB 평균)

## Validation
- Cycle 12 smoke (count 2 + maxArrivals 40) PASS
- Cycle 17 measure-cycle-17.ts 의 1200-arrival chained 정상 작동
