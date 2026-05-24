# Cycle 12 PRD — 실 게임 Lifecycle 활성 + sim chunked write

## 한 줄

Cycle 11 의 "자연사 99.3%" 는 sim 1200 arrivals 강제 cap 의 인공 metric. 실 게임은 시련 spiral 로 **11세 사망** → eternal hero 핵심 narrative 0% 활성. **자율진화 시스템 첫 false PASS** (sim PASS, dev server FAIL). 시련 패배 완화 + sim 측정 도구 부채 청산.

정찰: agent `a289003b79287d184`. R1 grep 검증: `OverworldScene.ts:221,232` (`cycle_ended '무위'`), `HeroLifecycle.ts:14` (`ACTIONS_FOR_END_AGE = 1000`).

## L1 (P0) — 실 게임 lifecycle 활성

### Root cause 후보
1. **시련 패배 fieldLevel scaling** — 청년기 시련 fieldLevel 이 너무 빨리 polynomial 폭발 → hero 사망 → cycle 종료. age 11 cap.
2. **cycle 종료 logic** — candidates 고갈 시 `cycle_ended '무위'` (cycle 5 F3 의 cause) 발화. realm rotation 대신 종료. R1 grep `OverworldScene.ts:221,232`.
3. **MAX_ARRIVALS 부재** — 정찰의 "1200 maxArrivals" 는 sim 옵션. 실 controller 에는 동등 cap 없음. 실 게임은 candidates 고갈 또는 사망까지 무한 진행.

### Fix 후보 (implementer 결정)

(a) **fieldLevel scaling 완화** — 시련 fieldLevel polynomial 곡선의 exponent 감소 (예: 2.0 → 1.5)
(b) **candidates rotation** — `cycle_ended '무위'` 직전 realm rotation (next unlocked realm 으로 hero 이동) — design 변경 큼
(c) **MAX_ARRIVALS runtime cap** — controller 에도 1200 cap (sim 과 동등). 종료 가능
(d) **시련 패배 후 retreat** — 시련 stagger 의 회복 path 완화 → hero 살아 남음

권장: **(d) + (a) 묶음**. (d) 가 lifecycle drama 의 "시련 패배 → 회춘 → 살아 돌아옴" 정체성과 자연 일치. (a) 가 시련 진입 자체 감소. (b/c) 는 design 변경 큼.

### 수용 기준 (Δ-from-baseline + multi-seed)

Baseline (cycle 11 fold 직후 정찰, 30 cycle quick):
- ageEnd: 11 (정찰 직접 측정)
- 자연사 endCause: 0/30 = 0%
- rejuv ≥ 1: 0/30 = 0%

Cycle 12 후 (1× 속도 30 cycle multi-seed):
- **ageEnd p50 ≥ 30** (청년기 끝 도달)
- **자연사 endCause ≥ 50%** (≥ 15/30)
- **rejuv ≥ 1 인 cycle ≥ 30%** (≥ 9/30)
- **maxLevel p50 회귀 ≤ 10%** (cycle 11 의 6.92M → 6.2M 이상)

### Unit test
- 시련 패배 시 fieldLevel polynomial 새 곡선 확인 (1 unit)
- stagger 회복 후 hero 살아남음 (1 unit)
- MAX_ARRIVALS controller 적용 (있다면, 1 unit)

## L2 (도구, P1) — Sim chunked write (C10-D)

### Root cause
- `sim-cycle-v2.ts:135` 의 events.join 이 V8 string length cap (~512MB) 초과
- 1 cycle 당 6000+ events × 1200 arrivals → string serialization 실패

### Fix
- 매 cycle 결과를 별도 jsonl shard 또는 writeStream chunked
- 또는 events 를 in-memory aggregate 만 하고 jsonl 출력은 summary 만

권장: **별도 shard** (cycle 당 `c{N}.jsonl` 파일) — 이미 정찰 결과 폴더 구조와 일치 (`/tmp/cycle-10-recon/run1024/c*.jsonl`)

### 수용
- `pnpm sim:v3 --count 30 --max-arrivals 1200` OOM 없이 완료
- L1 검증의 1200 arrivals baseline 측정 가능

## 머지 가드

- typecheck/lint PASS
- vitest 1194 baseline + 신규 (5+)
- circular baseline 1
- Multi-seed sim 30 cycle (L1 4-항목 PASS)
- 1200 arrivals sim OOM-free (L2)

## Phase G self-check

- 약점 고갈: ✗ (D1-D7 + cycle 6+ carry-over + L1 알고리즘 후속)
- 3 연속 같은 1순위: cycle 10 lifecycle (앞) → cycle 11 lifecycle (뒤) → **cycle 12 lifecycle (실 게임)**. 같은 카테고리 3 연속 — soft halt 신호 작동 가능. 다만 cycle 11 false PASS 의 직접 후속이라 자연 chain
- 자원 추정: cycle 11 finisher 후 매우 무거움. cycle 12 partial 가능성 높음. 결과 보고 fold 결정

## Cycle 13+ carry-over

- 모든 cycle 11 carry-over (PRD 산술 충돌 검증 룰 + 정찰 measurable baseline + dead-emit-path)
- D1-D7 backlog
- cycle 10 C10-C maxLevel intent 검증
- cycle 6 staggered field
- cycle 7 PRD fixture schema
- cycle 8 reactive subscription audit
- cycle 10 P1 boss-pick weight
- 정찰 D5 narrative tone "5세에" 압축 (cycle 12 정찰 2순위)
- **자율진화 시스템 회고: sim PASS ≠ dev server PASS** — cycle 12 의 새 finding 페르소나 patch (정찰에 Playwright dev server 실측 의무화)
