# Cycle 16 PRD — Multi-cycle chained sim driver

> 자율진화 16 번째 cycle. cycle 15 finisher 의 1순위 — sim 의 multi-cycle
> chained state carry 부재로 V3 progression (atk/hp bonus 누적,
> unlockedRealms 누적, sagaHistory 길이 자연 증가) 검증 불가. 결과:
> [`cycle-16-result.md`](cycle-16-result.md)

## 한 줄

`sim-cycle-v2.ts` 가 매 cycle 마다 fresh `CycleControllerV2` 를 만들고
store 를 거치지 않음 → cycle 사이 V3 meta progression 이 sim 에서 사라짐.
`runSimV2Chained` 신규 export — `cycleSliceV2.start() + endCycle()` 의
사이드이펙트 (rotation pick, sagaHistory append, sponsorGold spend,
unlockedRealms onBossKill 누적) 를 sim loop 안에서 mirror.

## Root cause

`games/inflation-rpg/scripts/sim-cycle-v2.ts` `runSimV2`:

```ts
for (let i = 0; i < opts.count; i++) {
  const seed = opts.seedStart + i;
  const { result, ... } = runOneCycle(seed, opts, maxArrivals);
  // 각 cycle 은 fresh controller. store sagaHistory/unlockedRealms 무관.
  results.push(result);
}
```

`runOneCycle` 의 `onBossKill` 콜백은 `realm.nextRealm` 만 반환할 뿐
`useGameStore.unlockRealm()` 을 호출하지 않음 → sim 의 currentRealmId 만
local 추적. Cycle 15 의 startRealm sweep 은 외부 batch 파라미터로 분포
주입했을 뿐 V3 progression 의 organic 누적은 검증 불가.

## Discriminating constraint

**Sim 은 dev server 의 single source of truth (cycleSliceV2.start +
endCycle) 와 같은 store 사이드이펙트를 적용해야** 한다 (advisor recon
T1). 그렇지 않으면 future endCycle 변경이 sim 에서 silently desync.

## 수용 기준

| # | 항목 | 임계 |
|---|------|------|
| a | chained 50-cycle 의 `sagaHistory.length === 50` | 정확 일치 |
| b | chained 끝 시점 `unlockedRealms.length >= 3` | organic boss kill |
| c | chained 끝 시점 `atkBaseBonus + hpBaseBonus > 0` | spend 누적 |
| d | 기존 batch mode 회귀 0 | sagaHistory 무변동 |
| e | 머지 가드 (typecheck / lint / vitest 1222 baseline + 신규) | 0 exit |

## 비-목표

- Chained mode 의 maxLevel growth curve 단조성 정량 검증 — atk/hp bonus
  effect 의 balance impact 는 별도 phase (cycle 17 후보).
- Chained 의 1200-arrival 정밀 측정 — 너무 무거움 (event 폭발).
  cycle 16 은 400-arrival 으로 카운트 + 분포만 측정.
- Sim driver 의 live `useCycleStoreV2.start()` 직접 호출 — slice 의
  React/Zustand wiring 의 의도적 격리 유지. Chained 는 사이드이펙트만
  inline (slice 변경 시 drift risk 는 comment 로 박제).

## Edge cases

- vitest worker pollution: 다른 test 가 미리 setState 한 sagaHistory 가
  chained 의 cycle 0 에 끌려옴 → entry 에서 명시 reset (sagaHistory: [],
  unlockedRealms: ['base'], sponsorGold: 0, atkBaseBonus: 0, hpBaseBonus:
  0, light: 0, currentRealmId: 'base').
- light 누적: live `endCycle` 은 light 를 reset 하지 않음. Chained 도
  reset 안 함. Batch mode 만 cycle 마다 light=0 으로 정화 (sim 분석
  purity).
- onBossKill 의 store mutation: chained 일 때만 `useGameStore.getState().
  unlockRealm()` 호출. Batch 는 기존 동작 (local realm tracker 만 갱신).

## 변경 파일

| 파일 | 변경 | 비고 |
|------|------|------|
| `scripts/sim-cycle-v2.ts` | +~130 | `runSimV2Chained` 신규 + `runOneCycle` `chained` param |
| `scripts/__tests__/sim-cycle-v2.smoke.test.ts` | +~80 | 4 cycle-16 회귀 가드 |

## Cycle 17 1순위 — 후보

**Chained sim 의 atk/hp bonus growth curve balance 측정**. Cycle 16 은
"누적이 일어난다" 만 검증. 50-cycle chained 의 maxLevel p50 곡선이 cycle 0
대비 N 배 증가하는지, balance pivot 필요한지는 별도 cycle.
