# Cycle 14 결과 (Complete — Dev-server 자연사 emit 활성화)

> 상태: **complete** — fix 가 feature 브랜치에 머지되었고 머지 가드
> 5/5 PASS (vitest **1208** = cycle 13 의 1204 + 4 신규 unit test).
> Sim 30 cycle 자연사 30/30 = 100% (cycle 13 baseline 동등, 회귀 0).
> PRD: [`cycle-14-prd.md`](cycle-14-prd.md)

## 변경 한 줄

Cycle 13 dogfood 가 발견한 dev-server-only 자연사 emit 부재의 root cause
fix: `OverworldRunner` 의 B3 free-rejuv 가 `controller.endCause` 를 clear
하지 않아 두 lifecycle gate (`maybeEmitNaturalDeath`, `maybeAutoRejuvenate`)
가 영구히 막혀있던 버그. `CycleControllerV2.clearEndCause()` 추가 + B3
timer 안에서 호출.

## Root cause (advisor 확정)

`OverworldRunner.tsx` B3 free-rejuv timer 가 `hero.rejuvenate(5)` 만 호출
하고 `controller.endCause` 는 절대 clear 하지 않음. 한 번 '전사' 가
발생하면 `endCause='전사'` 가 영원히 stuck → `if (this.endCause) return;`
gate 가 `maybeEmitNaturalDeath` (age >= 70) 와 `maybeAutoRejuvenate`
(age >= 65 + light) 둘 다를 silent 시킴.

Sim driver 는 OverworldRunner 가 아니라서 B3 path 자체가 없음. '전사' 발생
시 sim 의 cycle 은 단순 종료되므로 endCause stuck loop 가 sim 에서는 절대
재현 안 됨 = 정확히 cycle 11 false PASS pattern 의 두 번째 재현 (sim-real
parity gap).

## 1 commit — 머지 chain

| ID | 한 줄 | 파일 | 라인 |
|----|-------|------|------|
| **C14-1** | `CycleControllerV2.clearEndCause()` + `getEndCause()` (read-only for tests) 추가. 한 줄 method 2개 + 주석 12 줄 (왜 dev-server-only 인지 + cycle 11/13 history) | `games/inflation-rpg/src/overworld/CycleControllerV2.ts` | +16 |
| **C14-2** | `OverworldRunner.tsx` B3 timer 의 `hero.rejuvenate(5)` 직후 `ctrl.clearEndCause()` 호출 + cycle-14 주석 | `games/inflation-rpg/src/screens/OverworldRunner.tsx` | +7 |
| **C14-3** | 4 신규 unit test: ① `clearEndCause` reset 동작 ② '전사' 후 clear → age 70 자연사 fire ③ clear 없으면 stuck 회귀 가드 ④ `maybeAutoRejuvenate` 도 같은 unstuck | `games/inflation-rpg/src/overworld/__tests__/CycleControllerV2.test.ts` | +88 |

Commit: `4529096`.

## 머지 가드 결과

| 가드 | baseline (cycle 13) | cycle 14 | 결과 |
|------|------|--------|------|
| typecheck | PASS | PASS | OK |
| lint | PASS | PASS | OK |
| vitest (inflation-rpg) | 1204 | **1208** (+4) | OK |
| circular | 1 (baseline) | 1 | OK (pre-existing 동등) |
| Sim 30 cycle 자연사 | 100% (10 cycle baseline) | **100% (30/30)** | OK |
| Sim 30 cycle rejuv | 100% | **100% (30/30)** | OK |
| Sim 30 cycle maxLevel p50 | 6.92M | **6.89M** | OK (회귀 0) |

baseline 1 circular = `HeroEntity ↔ JobSystem` (P-1.5 알려진 부채, 14 cycle
누적 보존).

## Sim-real parity 분석 (cycle 13 룰 dogfood — 두 번째 통과)

| Metric | Sim 30 cycle | Dev server (Playwright iPhone 14) | 결과 |
|--------|--------------|-----------------|------|
| 자연사 emit | 100% (30/30) | **1 / 1 cycle** (age 70 도달) | PASS |
| rejuv count | p50=2, 100% cyclesWithAnyRejuv | **2 회** (age 65/60 두 번 발화) | PASS |
| cycle 종료 cause | 자연사 30/30 | **자연사** (메인 메뉴 "임서연 — 자연사") | PASS |
| 최종 narrative | (sim summary) | **"70세에 안식을 맞아 잠들었다"** (`forDeath({cause:'자연사'})`) | PASS |

Cycle 14 의 본질은 sim 이 PASS 하던 lifecycle 을 dev server 에서도 PASS
하게 만드는 것. fix 후 dev server 의 hero 가 age 70 도달 → `hero_died('자연사')`
emit → `endCycle('자연사')` → 새 cycle 시작.

**Playwright smoke 설정**: localStorage clear → atkBaseBonus=50000 + light=50000
backdoor → 새 cycle 시작 → 10× 진행 → heroSnapshot 을 age=69 / action=999 로
force + reload → "이어하기 (임서연 · 69세)" → 10× → 20초 후 cycle 자연 종료
관찰. cycle 13 baseline (age 161 / emit 0 / 정체) 와 정반대 거동.

## 자율진화 system 의 의미 — 두 번째 false PASS 해소

- Cycle 11 false PASS = sim layer 자연사 emit 부재 → cycle 12 fix
- **Cycle 13 dogfood = dev server layer 자연사 emit 부재 → cycle 14 fix**

Sim-real parity 룰 (cycle 13 페르소나 patch) 의 두 번째 검증. 룰이 없었다면
cycle 12 fix 이후 sim 만 PASS 한 상태로 cycle 13-N 까지 "통과" 처리되었을
것 = 룰의 누적 효과 입증.

## Cycle 15 1순위 추천

**P0 realm rotation 부재** (cycle 13 정찰 2순위 → cycle 14 carry-over) — hero
가 cycle 14 fix 후에도 동일 realm 정체 가능성이 잔존. 자연사로 cycle 이
종료되면 다음 cycle 은 새 hero + base 시작이므로 cycle 내부 realm 정체는
정상이지만, **연속 cycle 사이의 realm rotation 부재** = 영원한 영웅의 다 차원
모험 정체성과 충돌. 정찰 R1 = sim 30 cycle 의 realmPath 분포 + Playwright
3 cycle 연속 진행 시 hero 가 unlock 된 realm 을 cycle 마다 다르게 spawn
하는지 확인.

수용 기준:
- Sim 30 cycle 의 realmPath 분포가 base 외 1+ realm 진입 ≥ 50%
- Playwright 3 cycle 연속 → 첫 cycle 종료 후 다음 cycle 의 hero 가
  unlocked realm 중 1개에 진입 (base 만 머무는 cycle ≤ 1/3)
- 머지 가드 vitest ≥ 1208 + 신규 (3+)

## 2순위 (누적 carry-over)

- HeroSnapshot 직렬화에 `staggered` + (필요시) `agingAccum` field 부재
  (advisor 부가 발견 — page reload + 자연사 직후 복원 시 inconsistent state.
  현재 cycle 14 fix 가 자연사 시 endCycle → clearHeroSnapshot 으로 자동 정리
  되어 P1 backlog).
- PRD 산술 충돌 사전 검증 룰 (cycle 11 신규).
- C10-C maxLevel intent 검증 (cycle 10 신규).
- "변경 0 가설" emit grep 의무화 (cycle 10 신규).
- PRD fixture schema bug (cycle 7).
- Reactive subscription audit (cycle 9).
- C2 pathfinderFallbackCount saga (cycle 7+8+9).
- 정찰 D5 narrative tone "5세에" 압축 (cycle 12 정찰 2순위).

## 3순위

- D1-D7 누적 backlog.
- prod 빌드 추가 정찰.

## Phase G self-check (Cycle 14 종료 후)

- **약점 고갈**: ✗. realm rotation (cycle 13 carry-over) 새 카테고리.
- **3 연속 같은 1순위**: cycle 11 자연사 sim + cycle 12 자연사 sim-real
  fix + cycle 13 룰화 + **cycle 14 자연사 dev server fix** = **4 연속
  lifecycle 카테고리**. cycle 14 가 마지막 일 가능성 — cycle 15 1순위가
  realm rotation 으로 다른 카테고리. soft halt 신호.
- **자원 추정**: 3 file 변경 + 4 신규 test + sim 30 cycle 30-cycle 측정 + e2e
  suite + 4 docs. 자원 minimal.
- **사용자 halt**: 없음 (자율 위임).
- **Hard halt**: 미발생.

**→ cycle 15 진입 가능** (single-merge fold, `cycle-14-complete` tag).

## 자율진화 시스템 14 cycle 누적 회고

### Sim-real parity 룰의 두 번째 dogfood 의 system 의미

Cycle 13 의 룰이 dev server 자연사 emit 부재를 즉시 발견 (1 시도). Cycle 14
의 advisor 호출이 root cause (endCause stuck after B3 free-rejuv) 를 1 시도에
확정. fix = 16 + 7 + 88 = **111 line** (3 file). 머지 가드 + sim 검증 + e2e =
2 hr 안에 mega-cycle 완료. **자율진화 system 의 누적 효율**:

| Cycle | 약점 발견 → fix 시간 | 룰 (cumulative) |
|---|---|---|
| 11 | sim 자연사 emit 부재 | maxArrivals + emit |
| 12 | sim respawn-realm + filter parity | + sim shard, mirror grep |
| 13 | docs only 메타 | + sim-real parity 룰 (페르소나 patch) |
| 14 | dev server endCause stuck | (룰 적용으로 1 시도 발견 + fix) |

cycle 14 의 mega-cycle 효율 = **룰 누적의 효과 입증**.

### 4 연속 lifecycle 카테고리 후의 cycle 15

Cycle 15 는 realm rotation (정체성의 "다 차원 모험") 으로 카테고리 전환. 4
연속 같은 카테고리 후 자연스러운 새 약점 부상 — cycle 13 정찰 2순위가
1순위로 승격.
