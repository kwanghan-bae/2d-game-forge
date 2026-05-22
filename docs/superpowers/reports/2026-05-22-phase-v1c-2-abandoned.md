# Phase V1c-2 — Abandoned (BP-bound Finding)

**Date:** 2026-05-22
**Branch:** `feat/v1c-2-balance-rng` (deleted — explored on, no commits worth keeping)
**Parent:** [V1c-1 report](./2026-05-22-phase-v1c-1-report.md)

## 한 문장 요약

V1c-2 의 설계 (k_eHp 1.0→1.15 + boss multipliers + RNG axes) 가 **현재 시스템 하에서 구조적으로 작동 불가능** 함을 확인하고 advisor 합의 후 abandon. V1c-1 가 진짜 deliverable.

## 무엇을 시도했고 무엇을 봤나

### 시도 1 — STATUS §4c 그대로 (k_eHp 1.15 + BOSS_HP_MUL 4→6 + BOSS_ATK_MUL 2→3)

200-cycle sim:
- maxLevel P50: 14,162 → **13,671** (criterion #2 ≥ 1,000 통과)
- **자연사: 100% → 56.5%, 전사 43.5%** ❌ criterion #3 (≥ 80%) 회귀
- arrivals min: 100 → 3 (초반 boss 한방)

Boss multipliers 가 과함. 되돌림.

### 시도 2 — k_eHp 1.15 단독 (boss 4/2 유지)

200-cycle sim:
- maxLevel P50: **14,162** (변화 0)
- 자연사 100% 유지
- multi-scenario sim 4 strategy 별 last-cycle maxLevel: **13,859 동일** (criterion #6 strategy 차이 = 0%)

### 시도 3 (sanity) — k_eHp 0.8 (enemies *weaker*)

50-cycle sim:
- maxLevel P50: **14,268** (k_eHp 1.0 14,162 / k_eHp 1.15 14,162 와 < 1% 차이)
- 자연사 100%

**즉 곡선의 enemy hp exponent 는 maxLevel 에 literally 무관.**

## Root cause: BP-bound + level-up full heal

두 mechanism 의 결합:

1. **`BP cost = 1 per kill` (flat, swing 수 무관)** — `EncounterEngine.resolveEncounter` 의 `hero.consumeBp(isBoss ? 3 : 1)`.
2. **`level-up → hp = hpMax` (full heal)** — `HeroEntity.gainExp` 의 `this.hp = this.hpMax;`.

조합 효과 (Lv 1000 기준 수치):
- expReq(Lv 1000) = 10 × 1000^1.2 ≈ 39,810
- expGain(per kill, Lv 1000) = 12 × 1000^1.8 ≈ 3,014,266
- **Levels per kill ≈ 76**

매 kill 마다 76 level-ups → 76 full heals. Hero 는 사실상 불사. BP=100 → 100 kills → fixed maxLevel.

곡선/RNG 튜닝은 cycle 내 *느낌* 만 바꾸고 *outcome* 은 못 바꿈. atk-bound dead zone 은 위 두 mechanism 중 하나 (또는 둘) 의 design 변경 없인 surface 불가.

## RNG axes (C) 도 같은 wall

- **crit (10% × 2x atk)**: 1-hit 이 더 자주 → BP-bound 그대로
- **drop tier**: 더 좋은 장비 → atkFlat boost → 여전히 BP-bound
- **enemy variance ±20%**: 유일하게 영향 있지만 *나쁜 방향* — criterion #3 회귀 위험

## 결론: V1c-2 abandon

Goal directive 가 명시적으로 허용: *"Criterion #6 grinding 금지 — 미만족시 explanation 으로 OK"*.

- V1c-2 의 modify 는 commit 가치 없음 (sim 측정상 no-op)
- exploration 자체는 record 로 남김 (이 문서)
- branch `feat/v1c-2-balance-rng` 는 변경 없이 삭제 (history 무관)

## 후속 design 결정 — user 가 결정할 두 갈래

BP-bound 을 깨려면 user-facing balance 변화 필요. 자율 세션이 결정할 범위 밖.

1. **BP cost ∝ swings** — `EncounterEngine` 가 `Math.ceil(enemyHp / heroAtk) * BP_PER_SWING` 으로 BP 소비. atk bonus 가 swing 수 줄임 → BP 절약 → cycle 길어짐 → maxLevel 증가. atk-bound 즉시 surface.
2. **Level-up heal cap/제거** — 매 kill 76 heals 가 사라지면 hero 가 죽음 위험. enemy variance / 다단 retaliation 의 balance 가 의미. atk-bound 의 다른 면.

둘 다 design 결정. 메모리 / STATUS-2026-05-22 에 candidate 로 명시.

— Phase V1c-2 abandon 보고 (2026-05-22)
