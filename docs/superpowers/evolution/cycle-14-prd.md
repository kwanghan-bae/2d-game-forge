# Cycle 14 PRD — Dev-server 자연사 emit 활성화 (`endCause` stuck 해소)

> 자율진화 14 번째 cycle. cycle 13 의 sim-real parity 룰 dogfood 가
> 발견한 dev-server-only 자연사 emit 부재의 root cause fix.
> 결과: [`cycle-14-result.md`](cycle-14-result.md)

## 한 줄

`OverworldRunner` 의 B3 free-rejuv path 가 `hero.rejuvenate(5)` 만 호출하고
controller 의 `endCause` 를 clear 하지 않아, '전사' 한 번 발생 후 모든
`maybeEmitNaturalDeath` + `maybeAutoRejuvenate` 가 `if (this.endCause) return`
gate 에 영구히 막혀 hero 가 age 70 을 넘어가도 자연사 emit 부재
+ realm 정체. **dev-server-only** (sim driver 는 B3 path 가 없어 sim 에서는
재현 불가) = 정확히 cycle 11 false-PASS pattern 의 재현.

## Root cause

`games/inflation-rpg/src/screens/OverworldRunner.tsx` line 211-237:

```tsx
const heroDied = evs.find(e => e.type === 'hero_died');
if (heroDied && heroDied.type === 'hero_died') {
  if (heroDied.cause === '전사') {
    autoRejuvTimerRef.current = setTimeout(() => {
      const ctrl = useCycleStoreV2.getState().controller;
      if (!ctrl) return;
      ctrl.getHero().rejuvenate(5);
      ctrl.recordRejuvenation(5);
      // ← 여기서 ctrl.endCause = '전사' 는 영원히 stuck
    }, 2000);
  } else { ... }
}
```

`CycleControllerV2.handleArrival` line 252-253 가 `hero_died('전사')` event
를 보면 `this.endCause = '전사'` 를 set. 이후의 모든 arrival 에서:

- `maybeEmitNaturalDeath` (line 517): `if (this.endCause) return;` → age >= 70 무시
- `maybeAutoRejuvenate` (line 488): `if (this.endCause) return;` → 광채 기반 회춘도 막힘

Hero 는 B3 path (2초 후 무료 rejuv) 만으로 무한 부활하며 age 가 161+ 까지 누적.

## Fix — `clearEndCause` add + B3 timer 안에서 호출

| ID | 한 줄 | 파일 | 라인 |
|----|-------|------|------|
| **C14-1** | `CycleControllerV2.clearEndCause()` + `getEndCause()` (테스트용 read-only) public method 추가 | `games/inflation-rpg/src/overworld/CycleControllerV2.ts` | +16 |
| **C14-2** | `OverworldRunner.tsx` B3 free-rejuv timer 안에서 `hero.rejuvenate(5)` 직후 `ctrl.clearEndCause()` 호출 | `games/inflation-rpg/src/screens/OverworldRunner.tsx` | +7 |
| **C14-3** | 4 신규 unit test: `clearEndCause` 동작 + age-70 자연사 fire after clear + clear 없으면 stuck 회귀 가드 + `maybeAutoRejuvenate` 도 같은 unstuck | `games/inflation-rpg/src/overworld/__tests__/CycleControllerV2.test.ts` | +88 |

## 수용 기준

| 항목 | baseline (cycle 13) | cycle 14 target | 결과 |
|------|------|--------|------|
| Sim 30 cycle 자연사 | 100% (10 cycle baseline) | ≥ 90% | **100% (30/30)** PASS |
| Sim 30 cycle rejuv | 100% | ≥ 90% | **100% (30/30)** PASS |
| Sim 30 cycle maxLevel p50 | 6.92M | 회귀 0 | **6.89M** PASS |
| vitest 회귀 | 1204 | +3 신규 | **1208 (+4)** PASS |
| typecheck / lint / circular | PASS / PASS / 1 (baseline) | 동일 | PASS |
| Playwright dev server age | 161 / emit 0 | ≤ 100 / emit 1+ | **age 70 / 자연사 emit 1** PASS |

## Sim-real parity 검증 (cycle 13 룰 적용)

| Evidence | 결과 |
|---|---|
| 1. Sim driver mirror grep | cycle 13 baseline 동일 — sim 은 B3 path 자체가 없으므로 fix wire 불필요. clearEndCause 는 dev server 만의 path. |
| 2. Sim 30 cycle | 100% 자연사 (회귀 0, 위 표) |
| 3. Playwright dev server | localStorage clear + atkBaseBonus=50000 buff + heroSnapshot age=69/action=999 backdoor → reload → 이어하기 → 10× → 20s 후 **"임서연 — 자연사 / 최종 나이 70세 / 최종 레벨 2,115,963 / cycle 자연 종료"** 메인 메뉴 화면 도달. saga 에 `rejuvenation` 2회 + age 70 의 "안식을 맞아 잠들었다" narrative 1회 = `forDeath({cause:'자연사'})` template 1:1 일치. cycle 13 baseline (age 161 / emit 0 / cycle 정체) 와 정반대 거동. |

## 영향 — 곡선 / saga

- Dev server 의 영원한 hero 가 70 → 종료 → 새 cycle 시작 로 정상화.
- Sim driver 는 변화 없음 (이미 100% 자연사).
- Saga: 매 cycle 자연사 1개 마커 + 회춘 N (per-cycle 2 cap) 정상 emit.

## 한 줄 정의 — cycle 11 false-PASS pattern 의 두 번째 발견

Cycle 12 가 sim layer 의 false PASS 를 해소, cycle 13 의 룰이 dev server
layer 의 잔존 부재를 dogfood 로 발견, cycle 14 가 fix. 룰 효과 입증 (룰이
없었다면 cycle 12 fix 후 cycle 13 도 "통과" 로 표기되었을 것).
