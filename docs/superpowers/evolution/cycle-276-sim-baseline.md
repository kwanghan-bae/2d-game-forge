# Cycle 276 — Sim Baseline (메타-rule 2 두 번째 강제 실행)

작성 = 2026-05-28. cycle 256 PRD §138 의 sim baseline 매 20 cycle 강제 룰. cycle 257 의 첫 baseline 의 정확 20 cycle 후 측정.

## 측정 명령

```
pnpm --filter @forge/game-inflation-rpg sim:v3 -- --chained --seed 300 --count 50
```

seed=300 통일 — cycle 257 baseline 과 직접 비교.

## 결과

| metric | cycle 257 (seed=300) | cycle 276 (seed=300) | Δ |
|---|---|---|---|
| maxLevel p50 | 4,923,482 | **4,923,482** | **0 (변동 0)** |
| maxLevel avg | 5,337,394 | 5,337,394 | 0 |
| saint 비율 | 41/50 (82%) | **41/50 (82%)** | **0** |
| 자연사 50/50 | 100% | 100% | 0 |
| jobs sim 도달 | 4/16 (saint/sage/archmage/grandmaster) | **4/16 동일** | 0 |

**완전 deterministic** — 20 cycle 동안 가해진 변경 (cycle 261-275 의 narrative variant / skill polish / UI / invariant 누적) 이 *sim 출력에 0 영향*.

## 진단

이는 정상 결과:
- narrative variant / UI color / emoji prefix = sim 출력 axis 외 (text/visual 만)
- palm_strike/curse/soul_drain polish (atkMul/hpMul) = monk/dark_lord/assassin 자격 도달자 없는 sim 에서 사용 불가 → effect 0
- 다른 cycle 들은 invariant test 만 — production 무관

**핵심 의미** = silent regression -28% 의 *진짜 root cause 는 cycle 261-275 의 axis 외*. saint dominance + 12 dead jobs + maxLevel ceiling 의 lever 가 *그 외 axis* 에 있음.

## Advisor 권고 (cycle 275 호출)

cycle 261-275 = cycle 255 STATUS 자축 패턴 *real-time 반복*. 본 baseline 의 *변동 0* 결과가 advisor 의 진단 *그대로 검증*. 메타-rule 1 (micro mode ≤ 30%) 의 정량 측정 (6/20 = 30% 임계점) + 본 baseline 의 변동 0 = **현재 패턴이 silent regression 회수 무관함을 정량 확인**.

## Cycle 277+ 의 saint retry plan

cycle 277 = saint atkMul **낮춤** (advisor 권고). 직전 cycle 259 의 *방향 wrong* 회피.

- Lever: `saint.atkMul: 2.5 → 2.0` (낮춤, *나누기 직관*)
- merciful.min: 7 유지 (cycle 259 의 9 → 7 revert 상태)
- n=3 post-change baseline (1024/2048/4096)

가드 식 (cycle 259 의 baseline n=1 문제 해소):
- baseline = cycle 257 + cycle 276 *동일* 82% (변동 0 이 baseline σ ≈ 0)
- saint 비율: 82% → Δ ≤ -10%p (즉 ≤ 72%, **multi-seed σ 마진 안전**)
- maxLevel p50: 4.92M → Δ ≥ -0.3M (즉 ≥ 4.62M, 음의 가드 — saint 약화 시 다른 job 으로 자격 이동 = maxLevel 안정 유지 의도)

가드 PASS → ship. FAIL → revert + cycle 259 같은 diagnosis 박제.

## 메타-rule 진척 (cycle 276 시점)

- 메타-rule 1 (micro mode ≤ 30%) = 6/20 = 30% (cycle 275 시점). 임계점.
- 메타-rule 2 (sim baseline 매 20 cycle) = 본 cycle 의 두 번째 실행. PASS.
- 메타-rule 3 (자축 톤 M===N only) = 본 baseline 의 "변동 0" = M===0/0 (axis 외) 명시.
