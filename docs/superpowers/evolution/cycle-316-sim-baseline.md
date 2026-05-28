# Cycle 316 — Sim Baseline (메타-rule 2 4차 강제) + MERCIFUL_DRIFT lever 무관 확정

작성 = 2026-05-28. cycle 297 의 MERCIFUL_DRIFT 3→2 lever 의 effect 측정.

## 결과

| metric | cycle 296 (lever 적용 전) | cycle 316 (lever 적용 후) | Δ |
|---|---|---|---|
| maxLevel p50 | 4,923,482 | 4,923,482 | **0** |
| saint 비율 | 40/50 (80%) | 40/50 (80%) | **0** |
| jobs sim 도달 | 4/16 | 4/16 | 0 |

## Finding — 4차 검증 확정

MERCIFUL_DRIFT 3 → 2 도 saint dominance 와 변동 0. cycle 259/277/296/316 = **4 다른 lever / axis** 모두 saint 80% 노이즈 밴드 내.

진짜 진짜 root cause = `if (current >= 0) sparing` 의 deterministic branch. **drift 크기 자체와 무관** — 한 번 sparing 누적 시작 시 deterministic 가속.

## 진짜 root cause 후보

1. **MERCIFUL_PROC_RATE 0.07 → 0** (proc 자체 제거)
2. **conditional sparing 의 random branch** (`if (current >= 0)` 대신 `rng.chance(0.5)`)
3. **personality.merciful 초기 random seed** (현재 0 시작 → 양수 sparing 우세)

cycle 321+ Saint Re-Balance mega-phase 의 진짜 진입 lever.

## 조치

- cycle 297 lever (MERCIFUL_DRIFT 2) **keep** (effect 0 but 의도 정합)
- diagnosis 박제 + cycle 321+ carry-over

## F14 메타-finding

4 lever 무관 확정 = *진짜 root cause 는 lever 의 axis 자체가 아니라 deterministic branch 의 시스템 설계*. 단순 magnitude 조정 4 회 모두 noise. 진짜 lever = *branch 분기 자체 재설계* (mega-phase scope).
