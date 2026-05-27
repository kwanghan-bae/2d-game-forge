# Cycle 259 — Diagnosis (PRD nerf 가드 FAIL, revert + carry-over)

작성 = 2026-05-28. cycle 256 PRD §87 chain stage 3. **Δ-guard FAIL → revert + 두 finding 박제**.

## 시도한 변경

- `games/inflation-rpg/src/data/jobs.ts:39` — saint: `atkMul: 2.5 → 2.8`, `merciful.min: 7 → 9`
- `JobSystem.test.ts:49` — assertion `merciful >= 7` → `merciful >= 9`

## 측정 (≥3 seeds, chained 50-cycle)

| seed | saint 비율 | maxLevel avg |
|---|---|---|
| 1024 | 36/50 = **72%** | 5.31M |
| 2048 | 35/50 = **70%** | 5.36M |
| 4096 | 43/50 = **86%** | 5.30M |
| **평균** | **114/150 = 76%** | **5.32M** |

## PRD §161 Δ-guard 평가

- saint 비율: cycle 257 baseline 82% (seed=300) → cycle 259 76% (3-seed 평균) — **Δ -6%p**. PRD 가드 `Δ ≤ -25%p` **FAIL**.
- maxLevel avg: 5.34M (baseline) → 5.32M — **Δ -0.02M**. PRD 가드 `Δ ≥ +0.6M` **FAIL**.
- 자연사 비율: 50/50 = 100% (회귀 0).

## Finding 1 — PRD lever miscalibration

`atkMul 2.5 → 2.8` 은 *방향 자체가 wrong*. saint 의 자격 통과자에게 *더 강한 atk* 를 주는 것 = saint 의 매력 ↑ = dominance 강화 방향. nerf 의도와 반대.

진짜 lever 후보:
- `atkMul 2.5 → 2.0` 등 *낮춤* (PRD 와 반대 방향)
- `merciful.min 7 → 12+` (자격 통과 확률 더 좁힘)
- sage (`requiredPersonality: null`) fallback 재설계 — saint 자격 fail 시 sage 흡수 패턴이 root cause 후보

cycle 256 game-planner 가 PRD 작성 시 level-critic 의 "atkMul 2.5 → 2.8" 권고를 *그대로 인용* 했음. level-critic 자체의 lever 방향 misdiagnosis 가 PRD 에 fan-out.

## Finding 2 — Baseline n=1 (시그마) 문제

cycle 257 baseline = seed=300 단일 측정 (saint 82%). cycle 259 측정 = 3 seeds (72/70/86, σ ≈ 9%p). **baseline 의 noise band 가 측정 effect 와 같은 자릿수** — Δ -6%p 가 *진짜 effect* 인지 *baseline noise* 인지 분리 불가.

PRD §161 의 "Δ-guard ≤ -25%p" 가 baseline 단일 seed 위에서 산정된 점이 *math malformed*. 향후 nerf cycle 의 baseline 도 n=3 측정 필수.

## 조치 (이 cycle 의 deliverable)

1. **jobs.ts revert** — saint atkMul/min 원복 (2.5 / 7)
2. **JobSystem.test.ts revert** — assertion `merciful >= 7` 원복
3. **diagnosis doc** = 본 파일
4. **carry-over 명시** — cycle 261+ 에 다시 시도:
   - 새 PRD lever 후보 (atkMul 낮춤 또는 min 12+ 또는 sage fallback 재설계)
   - 새 baseline = n=3 측정 (1024/2048/4096 또는 같은 set 으로 통일)
   - 새 Δ-guard 식 = baseline σ 추정 후 *signal-noise ratio* 가드

## 자율진화 시스템 메타-finding

cycle 259 의 가드 FAIL 은 *실패가 아닌 진단*. PRD §168 "표류 deadline 룰" 적용 — cycle 261+ 5 cycle 안에 *상향 nerf + n=3 baseline* 재시도.

메타-rule 3 (자축 톤 = M===N only) 답습 — 본 cycle 의 STATUS 표현 = "saint nerf 시도 + Δ-guard FAIL + diagnosis 박제 + revert + carry-over (1/1 단계 완료, 효과 0)".

자축 표현 *회피* — "saint nerf 완료" 같은 misrepresentation 금지.

## 다음 cycle (260) 의 영향

cycle 260 = first 10-cycle STATUS. chain accountability table 의 cycle 259 행 = "saint balance 시도 + Δ-guard FAIL + revert + diagnosis 박제" (단순 PASS 아님).

PRD §94 chain accountability table 형식 수정:
- cycle 259 axis = "saint balance 시도 (Δ-guard FAIL → revert)"
- production-consumed = **0/1** (revert 후 production 효과 0)
- misrepresentation 회피 표현 = "Δ-guard FAIL, revert + carry-over (cycle 261+ 상향 nerf 후보)"
