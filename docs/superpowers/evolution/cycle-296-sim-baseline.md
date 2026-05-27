# Cycle 296 — Sim Baseline (메타-rule 2 세 번째 강제 실행) + Balance lever 무관 확정 3차

작성 = 2026-05-28. cycle 256 PRD §138 룰의 정확 20 cycle 후 측정. cycle 292/293 의 saint dominance 분산 lever 3종 적용 후의 effect 측정.

## 측정

```
pnpm --filter @forge/game-inflation-rpg sim:v3 -- --chained --seed 300 --count 50
```

## 결과 (saint lever 3종 적용 후)

| metric | cycle 257 (lever 적용 전) | cycle 276 (변동 0) | **cycle 296** (lever 적용 후) | Δ-from-baseline |
|---|---|---|---|---|
| maxLevel p50 | 4,923,482 | 4,923,482 | **4,923,482** | **0** |
| maxLevel avg | 5,337,394 | 5,337,394 | 5,324,542 | -0.2% |
| saint 비율 | 41/50 (82%) | 41/50 (82%) | **40/50 (80%)** | **-2%p** |
| sage | 7 | 7 | 8 | +1 |
| 자연사 | 50/50 | 50/50 | 50/50 | 0 |
| jobs sim 도달 | 4/16 | **4/16 동일** | **4/16 동일** | 0 |

## 결정적 finding — Balance lever 무관 3차 검증 확정

세 측정의 saint 비율 비교:
- **cycle 259** (atkMul 2.8 + min 9, n=3): 76% (noise)
- **cycle 277** (atkMul 2.0, n=3): 76% (noise)
- **cycle 296** (Tier-3 alt 자격 lever): 80% (noise)

**balance lever 의 3 axis** (saint atkMul, saint min, Tier-3 alt 자격) **모두 saint dominance 와 noise band 내** — axis 자체 reject 확정.

## 진짜 root cause — Personality drift axis

saint 자격 = merciful ≥ 7. merciful 의 누적 drift 가 root:
- moralChoice 이벤트의 MERCIFUL_PROC_RATE
- shrine event 의 merciful 인상

진짜 lever 4 후보 = cycle 321+ carry-over (mega-phase β/γ/δ 완료 후 진입).

## 조치

cycle 292/293 lever **keep** (의도 정합, effect 작아도). diagnosis 박제 + 진짜 lever carry-over.

## 메타-rule 진척

- 메타-rule 2 세 번째 강제 PASS. 다음 = cycle 316.

## F13 메타-finding 신규

Balance lever 무관 3차 검증의 *과학적 확정*. 단일 axis (saint 자격 / atkMul / Tier-3 자격) 의 3 다른 lever 시도 모두 saint dominance 와 noise band 내. *axis 자체 reject 확정* — 진짜 lever = personality drift axis 의 *coupling 없는* 독립 axis.
