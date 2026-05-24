# Cycle 13 PRD — 페르소나 patch (sim-real parity 검증 룰)

## 한 줄

Cycle 12 의 carry-over 1순위 = sim-real parity 검증 룰 페르소나 patch. cycle 11 false PASS (sim 99.3% / dev server age 11) 의 직접 educed 룰을 PRD 작성자 (`01-game-planner.md`) + QA (`02-qa.md`) 두 페르소나의 사고 방식에 명시. 코드 변경 0 (docs only).

정찰: docs-only cycle 이라 별도 정찰 페르소나 dispatch 불필요. `01-game-planner.md` + `02-qa.md` 기존 "사고 방식" 섹션 구조 확인 후 patch 위치 결정.

## 패치 위치

advisor (cycle 13 첫 호출) 조언: cycle 12 result 의 `03-product-owner.md` 참조는 typo. 실 디렉토리는 `01-game-planner.md` (PRD 작성자) + `02-qa.md` (검증). 본진 = 01, mirror = 02.

## F1 — `01-game-planner.md` "사고 방식" 신규 룰

기존 룰 (Δ-from-baseline + Multi-seed acceptance) 다음 줄에 sim-real parity 검증 룰 추가. 형식 = 기존 룰과 동형 (Why / How to apply 포함).

- **수용 기준**:
  - PRD 작성 시점 자가 검증 룰
  - 두 evidence 의무: (1) sim driver mirror grep, (2) Playwright dev server 1-smoke
  - 룰 본문에 cycle 11 false PASS 의 root cause 인용 (age 11 vs age 70)

## F2 — `02-qa.md` "사고 방식" 신규 룰 (mirror)

기존 룰 (확정 grep query 룰) 다음 줄에 검증 보고 측면의 mirror. 본진은 F1 임을 명시.

- **수용 기준**:
  - QA / 정찰 보고서 작성 시점 자가 검증 룰
  - 두 evidence 의무 동일
  - 룰 위반 시 보고서 자체 반려

## 반대 기준 (NOT this)

- 코드 변경 0 (docs only)
- `03-product-owner.md` 신규 파일 생성 금지 (typo 정정만)
- 다른 페르소나 doc 변경 금지 (04 critic 은 평가 페르소나로 PRD 와 무관)

## 정찰 (Phase 2 — 새 룰의 첫 dogfood)

본 cycle 의 정찰 자체가 새 룰 적용의 첫 case. PRD 본문에 두 evidence 첨부:

### Evidence 1 — Sim driver mirror grep

```
$ grep -n 'filterCandidatesByRealm\|hero_died\|MAX_ARRIVALS\|computeLightDelta\|cycle_ended' games/inflation-rpg/scripts/sim-cycle-v2.ts
16:import { ... filterCandidatesByRealm ... } from '../src/overworld/Landmark';
20:import { computeLightDelta } from '../src/overworld/lightEmit';
225: const reachable = filterCandidatesByRealm(unconsumed, currentRealmId);
264: } else if (ev.type === 'hero_died') {
285: const { delta: lightDelta } = computeLightDelta(events, target.type.kind);
296: // The hero_died('자연사') event sets `endCause = '자연사'` above
```

Sim driver 가 controller 의 filter (`filterCandidatesByRealm`) + emit (`hero_died`) + light (`computeLightDelta`) 세 layer mirror 확인. **PASS**.

### Evidence 2 — Playwright dev server 1-smoke (iPhone 14 viewport, 10× 속도 ~90 초)

- t=0: age 5 LV 1 (new cycle)
- t=30s: age 65 LV 4.2M, **재생 #1**, 노년기, NPC 연인 라엘 (관계 50)
- t=60s: age 82 LV 7.8M, **마지막**
- t=90s: age 161 LV 44.9M, **재생 #1 유지** (추가 rejuv 없음)
- **자연사 emit 0회** (age 161 에도 미발화)
- **realm 정체** = "폭풍의 바다 (2/6)" 60+ 세 연속 동일

### Sim baseline (10-cycle @ seed 1024 --max-arrivals 1200)

- maxLevel p50: **6.92M** (cycle 12 baseline 동등, 회귀 0)
- 자연사 endCause: **10/10 = 100%**
- rejuv ≥ 1 cycle: **10/10 = 100%**

### Sim-real parity 분석

| Metric | Sim (10 cycle) | Dev server (90s 10×) |
|--------|----------------|----------------------|
| 자연사 emit | 100% | **0%** (age 161 까지 미발화) |
| rejuv count | p50=2 / 100% | **1회 후 정체** |
| maxLevel | 6.92M | 44.9M (age 무한 진행) |
| realm rotation | (sim 측정 없음) | **부재** (60+ 세 동일 realm) |

**Sim PASS / Dev server FAIL 의 cycle 11 pattern 재현**. cycle 12 의 fix 가 **sim layer 만 해소** 했고 dev server controller path 는 여전히 자연사 emit 부재. 새 룰의 첫 dogfood 에서 **즉시 cycle 14 1순위 finding** 도출.

## Cycle 14 1순위 추천

**P0 dev server 자연사 emit 활성화** — `CycleControllerV2.maybeEmitNaturalDeath` (cycle 11 C10-A) 가 sim 에서는 작동하지만 dev server controller path 에서 호출되지 않음. age >= 70 condition 의 evaluator 가 dev server 에 wire 되지 않은 가설. 정찰 R1 = `CycleControllerV2.ts` 의 maybeEmitNaturalDeath 호출 site 가 sim driver 와 dev server controller 양쪽에서 호출되는지 grep 검증.

수용 기준:
- dev server 10× 속도 90 초 진행 시 age ≤ 100 (자연사 발화 후 새 cycle)
- realm rotation 또는 age cap 둘 중 하나로 lifecycle 종료
- saga history 에 자연사 cycle 1+ 기록

## 비고

- 룰 본문 자체가 **자기 검증 적용** (cycle 13 정찰 = 룰의 첫 적용 case)
- cycle 12 result 의 `03-product-owner.md` typo → cycle 13 result 에 정정 fold
- 코드 변경 0 / vitest 회귀 0 / 머지 가드 4/4
