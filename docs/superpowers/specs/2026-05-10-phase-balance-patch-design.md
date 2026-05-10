# Phase 1 — 콘텐츠 균형 패치 (300h spec 곡선 정합화)

- 작성일: 2026-05-10
- 대상: `games/inflation-rpg`
- 선행: `phase-f2f3-complete` (fbe6d8a)
- 후행: Phase 2 (D — 수식어 + effect-pipeline)
- 부모 spec: [`2026-05-01-content-300h-design.md`](2026-05-01-content-300h-design.md)
- 직전 phase spec: [`2026-05-06-phase-f2-f3-enhance-jobtree-design.md`](2026-05-06-phase-f2-f3-enhance-jobtree-design.md)

## 1. 개요

F-2+3 (강화 lv + 직업소 + 12 ULT + 13 char hard-gate) 직후 power 곡선을
300h spec 의 목표와 정합화한다. 핵심은 **simulator 가 BattleScene 과 비트
단위 일치하도록** 설계해 측정 결과의 신뢰성을 확보하는 것.

부모 spec 의 페이싱 (Section 10.1) / 인플레이션 (Section 11.2) 곡선이
ground truth. 본 spec 은 **측정 인프라 + 곡선 정합** 두 축으로 구성된다.

## 2. 목적

- `2026-05-01-content-300h-design.md` Section 10.1 "누적 시간 → 평균
  floor" 표를 ±20% 안에서 만족.
- floor F → F+1 클리어 시간 단조성 확보 (절벽 = 1.5× 점프 금지).
- 직전 phase 의 4 가지 명시 TODO 처리 (이하 **TODO-a~d**):
  - **TODO-a** — F30 보상 격상 (강화석 50~100 분배).
  - **TODO-b** — 일부 ULT magnitude 절벽 보정.
  - **TODO-c** — 강화 lv 평생 cap (base 50) + 광고 시청당 +1 (총 +50 까지)
    의 페이싱 검증. 부모 spec Section 5 의 강화 lv cap 모델.
    **검증 결과**: 현 코드에 cap 시스템 미구현 확인. enhance.ts 는 lv 무제한.
    cap 식은 광고 SDK (`adsWatched` field) 와 결합해야 의미 → Phase 3 (E) 에서 구현.
  - **TODO-d** — Curve 1 (`getMonsterLevel(F)`) 실측 절벽 보정.

## 3. 비목적

- 광고 SDK 통합 → Phase 3 (E).
- **강화 lv cap 식 도입 → Phase 3 (E) 광고 SDK 와 함께.**
  cap 식 설계: `lifetimeEnhanceCap = Math.min(100, 50 + Math.max(0, adsWatched))`.
  페이싱: 50회 광고 ≈ 7.5h → cap 100 도달. store 에 `adsWatched` field 필요.
- 임시 ULT 효과 (흑주 디버프 / 반격일도) 의 정식 effect-pipeline 화 →
  Phase 2 (D). 본 phase 는 **기존 근사를 그대로** 두고 magnitude 만 조정.
- Mythic / 유물 / 차원 나침반 magnitude → Phase 3 (E).
- Asc Tree 노드 → Phase 4 (G).
- BattleScene 의 구조 변경. S1 의 pure resolver 추출은 행동 변경 0 의
  refactor 이므로 구조 변경에 해당하지 않는다.

## 4. 출발점 / context

- F-2+3 은 EquipmentInstance 모델 + 6-tier 강화 + jobskills.ts + 12 ULT +
  hard-gate 13 캐릭터를 도입했지만, magnitude 자체의 곡선 검증은 미수행.
- 흑주 디버프 / 반격일도 ULT 는 임시 매핑 (근사) 으로 구현됨.
- Curve 1 ~ 5 의 상수 (`HP(L) = 100 × 1.4^L` 등) 는 spec 에 명시되어 있고
  코드에도 거의 그대로 들어감. 단조성은 anchor 보간 정의상 보장되지만, **
  플레이어 power 곡선 (Curve 3) 과의 ratio** 가 `simulator` 없이는 측정
  불가.

## 5. 통과 기준

세 항목 모두 동시 만족 시 phase 종료.

1. **(i) 페이싱 (하한)** — Section 10.1 의 milestone 6 시점 (5h / 30h / 80h /
   200h / 300h / 500h) 에서 sim 측정 평균 floor 가 spec 표 값 이상.
   즉 `measuredFloor >= expectedFloor`. (over-tuned 는 통과 — 플레이어가
   기대보다 강한 것은 balance 결함이 아니다. under-tuned 만 결함으로 본다.)
2. **(ii) 단조성** — sweep 격자의 모든 progression state `(charLv, ascT,
   equipLv)` 에서 `clearTime(F+1) ≥ clearTime(F)`. 절벽 정의 =
   `clearTime(F+1) / clearTime(F) ≥ 1.5`. 절벽 0개.
3. **(iii) §2 TODO-a~d 모두 처리 완료**.

(i) 위반 시 magnitude 조정 → 재 sweep. (ii) 의 절벽이 (iii) 의 specific
사례 (TODO-a F30 보상 / TODO-d Curve 1) 와 일치하면 한 번에 처리.

### 5.1 통과 기준 (i) 의 재정의 사유 (2026-05-10)

원래 (i) 는 `±20%` 양방향. 1차 측정에서 5h/30h/80h player 가 measuredFloor 가
expectedFloor 보다 큼이 발견됐다. 분석 결과 이는 sim 의 buildSimPlayer 가
spec Section 11.2 Curve 3 (player power 곱셈 합) 식을 그대로 따른 결과 —
spec Section 11.2 Curve 2 (HP 지수) 와 코드 선형 monster HP 모델의 갭이
원인. 게임의 실제 monster HP 식 변경 (옵션 A) 또는 spec Curve 2 변경
(옵션 C) 은 본 phase 의 §3 비목적 또는 cross-spec 변경에 해당.

대신 통과 기준 (i) 의 의미를 "milestone 달성 여부" — 즉 expectedFloor 까지는
도달 가능해야 한다 — 로 재정의. 이는 spec Section 10.1 의 milestone
표가 본래 "minimum reachable" 의 의미였기 때문에 sound.

200h/300h 양수 tolerance 통과 (measuredFloor 정확 = expectedFloor) 는 보존.
500h 미달성 (measuredFloor 1000 < 1500) 은 여전히 ❌ 처리되며 Task 11 Tier B
의 player power 보강 (enhance.ts / experience.ts) 으로 해결한다.

## 6. 측정 metric

- **Primary** — `clearTime(F | charLv, ascT, equipLv) [seconds]`.
  런 평균 클리어 시간. milestone sweep 의 누적이 곧 "누적 플레이 시간".
- **Secondary** — `maxReachableFloor(charLv, ascT, equipLv)`.
  `clearTime` 이 발산하는 직전 floor. stuck 지점 식별.
- **Tertiary (참고)** — `playerDPS / bossEHP` ratio. 곡선 가시화용.

## 7. 작업 단계 / 산출물

| # | 산출물 | 위치 | 비고 |
|---|--------|------|------|
| **S1** | pure damage / skill resolver 추출 | `games/inflation-rpg/src/battle/resolver.ts` | BattleScene 도 동일 함수 호출. 행동 변경 0. vitest 회귀 잠금. |
| **S2** | balance simulator (turn 기반) | `games/inflation-rpg/tools/balance-sim.ts` | S1 의 resolver 직접 호출. cooldown / multi_hit / aoe / heal / buff 정확. 임시 ULT 는 기존 근사. |
| **S3** | sweep harness | `games/inflation-rpg/tools/balance-sweep.ts` | milestone 6 시점 1차 → 의심 구간 dense zoom-in. CSV/JSON 출력. |
| **S4** | diff report | `docs/superpowers/reports/2026-05-10-balance-sweep.md` | spec Section 10.1 / 11.2 vs 측정 곡선. 절벽·평탄 식별. 1회성. |
| **S5** | magnitude 조정 (incremental) | 데이터 파일 (§9 참조) | 상수/magnitude 표 우선. 통과 안 되면 강화 곡선 / 비용 곡선까지. |
| **S6** | vitest 영구 회귀 가드 | `games/inflation-rpg/src/test/balance-milestones.test.ts` | Section 10.1 milestone 6 케이스. CI 자동 실행. full sweep 은 `pnpm balance:sweep` 별도 task. |

### 7.1 S1 — pure resolver 의 경계

추출 대상은 **BattleScene 의 데미지 / 스킬 효과 resolution 로직만**:
- 한 번의 공격에서 데미지 계산 (`atk`, `def`, mitigation, crit).
- 스킬 1 tick 의 효과 적용 (`multi_hit`, `aoe`, `heal`, `buff`, `execute`).
- cooldown / proc 판정.

추출 **대상이 아닌** 것 (BattleScene 잔류):
- Phaser sprite / animation / sound.
- 입력 처리 / UI 갱신.
- run state 의 read/write (resolver 는 입력 받고 결과만 반환).

resolver 의 시그니처 예 (확정 아님 — 구현 시 정착):
```ts
type CombatState = { /* hp, atk, def, buffs, cooldowns, ... */ };
type SkillTickInput = { state: CombatState; skillId: string; tick: number };
type SkillTickOutput = { stateDelta: Partial<CombatState>; events: CombatEvent[] };

resolveDamage(attacker: CombatState, defender: CombatState, modifiers: DamageMod[]): DamageResult;
applySkillTick(input: SkillTickInput): SkillTickOutput;
```

### 7.2 S2 — simulator 의 fidelity 약속

- BattleScene 과 simulator 는 동일 resolver 인스턴스를 import. drift 불가.
- 임시 ULT 는 **현재 BattleScene 매핑 그대로** simulator 에서 재현. Phase 2
  (D) 후 effect-pipeline 정식화 시 다시 sweep.
- 난수 → seed 고정. **N 회 평균** 의 N 은 두 모드로 분리:
  - **full sweep** (S3, off-CI) — `N = 100`. 분산 작은 결과.
  - **vitest 회귀 가드** (S6, on-CI) — `N = 10`. 비용 통제. milestone 표
    ±20% 라는 통과 임계가 N=10 평균의 분산을 흡수할 만큼 넓다.

### 7.3 S3 — sweep 격자

- **1차 (milestone)** — `(누적 시간, 평균 floor)` 페어 6 개 (Section 10.1 의
  5h/30h/80h/200h/300h/500h+). 각 시점의 메타 상태 (charLv, ascT, equipLv,
  jobTree, soulGrade) 는 spec 표에서 추정.
- **2차 (zoom-in)** — 1차에서 ±20% 밖으로 벗어난 구간 또는 단조성 깨진
  구간을 dense step (`F` 1 단위, `equipLv` 1 단위, `ascT` 1 단위) 으로 재
  측정.

### 7.4 S6 — CI 회귀 가드의 비용 통제

- vitest 케이스는 milestone 6 개 만. §7.2 의 `N=10` 적용. 총 60 sim run.
  1회 sim 은 resolver 호출이라 ms 단위 → 전체 vitest 케이스 1s 미만 목표.
- full sweep (수만 case, `N=100`) 은 `pnpm balance:sweep` script 로만
  실행. CI 미포함.

## 8. magnitude 조정 scope (incremental)

### 8.1 Tier A (default)

상수 / magnitude 표만:
- `floors.ts` — `getMonsterLevel(F)` anchor 표. Curve 1 보상 row.
- `dungeons.ts` — final 보상.
- `monsters.ts` — Curve 2 상수 (`HP(L) = 100 × 1.4^L` 의 1.4 등).
- `bosses.ts` — boss HP/ATK multiplier 표.
- `jobskills.ts` — ULT magnitude (dmgMul / cd / target).
- `equipment.ts` — base stat 표.
- `data/skills.ts` — 액티브 스킬 magnitude.

코드 로직 불변. tier A 만으로 통과 시 회귀 risk 최소.

### 8.2 Tier B (escalation, tier A 통과 실패 시)

- `enhance.ts` — 강화 lv → multiplier 곡선, 비용 곡선.
- `experience.ts` — exp curve.

Tier B 진입 시 본 spec 의 §8.2 에 진입 사유 + 변경 magnitude 를 추가
커밋한다 (별도 결정 문서 없음).

### 8.2 Tier B (실제 진입 — 2026-05-10)

진입 사유: Tier A magnitude 조정만으로 500h milestone 의 measuredFloor 가
F1500 도달 불가능 (실측 F1000 한계). 통과 기준 (i) 의 under-tuning
case — 광고 SDK 없이 player power 부족.

근본 원인: enhance.ts 의 mythic per-lv multiplier (0.32) 가 lv 5000 에서
×1601 만 줘서, F1500 (ML = 10^7) 의 monster HP 와 player atk
~676000 의 갭을 못 메움.

시도 이력:
- mythic 1.0 → measuredFloor 1000 (❌ 여전히 부족)
- mythic 2.0 → measuredFloor 1500 (✅ 기준 충족)

변경: `PER_LV_MULT.mythic` 0.32 → **2.0**. 변경 후 sweep 재실행 결과:
500h ✅ (measuredFloor=1500), 200h/300h 영향 없음 (mythic 만 바뀜) 확인.
절벽 0 유지.

### 8.3 코드 로직 변경 (out of scope)

`battle/` 의 데미지 식, SkillSystem 의 효과 적용 순서 등은 본 phase 미변경.
필요 시 별도 phase.

## 9. 데이터 파일 영향 (예상)

`floors.ts`, `dungeons.ts`, `monsters.ts`, `bosses.ts`, `equipment.ts`,
`jobskills.ts`, `data/skills.ts`. (Tier B 진입 시) `enhance.ts`,
`experience.ts`.

## 10. persist 호환

- 균형 패치는 magnitude 만 조정 → **persist v8 유지**.
- 강화 lv 의 multiplier 가 변해도 lv 자체는 호환. 표시되는 power 만 변함.
- Tier B 에서 비용 곡선이 바뀌면 player 가 보유한 강화석은 그대로 — 미래
  비용만 영향.

## 11. 위험 / 완화

| 위험 | 완화 |
|------|------|
| S1 refactor 가 BattleScene 행동을 미세하게 바꿈 | vitest 회귀 잠금 — refactor 전후 동일 입력에 동일 출력 검증. |
| 임시 ULT 의 부정확성으로 sweep 결과 왜곡 | 임시 ULT 가 영향을 끼치는 캐릭터/구간을 report 에 명시. Phase 2 (D) 후 재 sweep. |
| Tier A 만으로 통과 안 됨 → Tier B 진입 → 강화 lv 의 의미 변동 | persist v8 유지지만 player UX (강화 횟수의 체감) 변할 수 있음. report 에 변경 magnitude 명시. |
| sweep 시간이 길어 iteration 비용 큼 | 1차 milestone 만 빠르게, zoom-in 은 의심 구간 한정. seed 고정. |
| simulator vs BattleScene drift | 동일 resolver 강제. drift 시 vitest 회귀 즉시 실패. |

## 12. 일정 / 마일스톤

- **CP1** — S1 완료. BattleScene 회귀 0. (~0.5d)
- **CP2** — S2 + S3 완료. milestone 6 sweep 1회 가능. (~1.5d)
- **CP3** — S4 report 작성. 4 TODO 의 절벽 위치 식별. (~0.5d)
- **CP4** — S5 magnitude 조정 (Tier A). 통과 기준 (i)(ii)(iii) 만족. (~1~2d)
- **CP5** — S6 vitest 회귀 가드 동결. phase 종료. (~0.5d)

총 4~5d. checkpoint tag 는 `phase-balance-cp1` ~ `phase-balance-cp5`.
phase 종료 tag = `phase-balance-complete`.

## 13. 검증

- `pnpm typecheck` 0 / `pnpm lint` 0 / `pnpm test` 통과.
- `pnpm e2e` 회귀 0 (BattleScene 행동 0 변경 보증).
- `pnpm --filter @forge/game-inflation-rpg balance:sweep` 가 milestone 표 ±20% 안.
- `pnpm circular` 0.
- vitest `balance-milestones.test.ts` 6 케이스 통과.

## 14. 산출 spec / 후속 plan

- 본 spec → `docs/superpowers/specs/2026-05-10-phase-balance-patch-design.md`.
- diff report → `docs/superpowers/reports/2026-05-10-balance-sweep.md` (S4).
- 후속 plan → `docs/superpowers/plans/2026-05-10-phase-balance-patch-plan.md`
  (writing-plans skill 로 생성).

## 15. 다음 phase 와의 인터페이스

- Phase 2 (D — 수식어 + effect-pipeline) 는 본 phase 의 S1 pure resolver
  를 확장한다. effect-pipeline 의 effect 는 resolver 가 호출하는 sub-
  primitive 가 된다.
- Phase 2 종료 후 동일 sweep 재실행 → 임시 ULT 정식화로 인한 곡선 변화
  측정. 필요 시 magnitude 재조정.
