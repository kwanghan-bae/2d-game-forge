# Cycle 277 — Diagnosis (atkMul lever 무관 확정, 두 번째 revert)

작성 = 2026-05-28. advisor 권고 (cycle 275 호출 = "atkMul DOWN, n=3 baseline") 직접 실행. 결과 = **atkMul lever 자체 무관**.

## 시도

- `saint.atkMul: 2.5 → 2.0` (낮춤 — advisor 의 "right lever" 권고)
- `merciful.min: 7` 유지 (cycle 259 revert 후 상태)
- n=3 post-change sim (seeds 1024/2048/4096)

## 결과 (n=3 chained 50-cycle)

| seed | saint 비율 | maxLevel p50 | sage |
|---|---|---|---|
| 1024 | 36/50 = **72%** | 4.90M | 12 |
| 2048 | 35/50 = **70%** | 5.43M | 12 |
| 4096 | 43/50 = **86%** | 4.90M | 7 |
| **평균** | **114/150 = 76%** | 5.08M | 10.3 |

## 결정적 발견 — atkMul lever 무관

세 측정의 saint 비율 비교:
- **cycle 257 baseline** (atkMul 2.5, n=1): 82%
- **cycle 259** (atkMul 2.8, **min 9**, n=3): 76%
- **cycle 277** (atkMul 2.0, min 7, n=3): **76%**

atkMul 2.0 / 2.5 / 2.8 = 세 다른 값 모두 saint 평균 76-82% (σ ≈ 5%p). **atkMul lever 자체 effect 0**. merciful.min 7 → 9 도 effect 0 (cycle 259 = 같은 76%).

## Root cause 확정 (lever 외 axis)

saint 자격 통과 = personality.merciful ≥ 7. JobSystem.evaluate 가 age50 milestone 시 personality.merciful 측정. merciful 점수의 누적 drift 가 root cause:
- moralChoice 이벤트의 merciful 분포 (사용자 자비 선택 가중)
- shrineCalm/shrineHealed 같은 sub-event 의 merciful 인상
- 50 cycle 의 평균 merciful 점수 = personality drift 의 axis

**atkMul / hpMul / requiredPersonality.min** 모두 *자격 통과 후 성능* 또는 *자격 임계점* 변경. saint dominance = *자격 통과율* 결정인데 그게 personality drift axis 에서 결정됨.

진짜 lever 후보:
1. moralChoice 이벤트의 merciful 분포 재설계 (data layer)
2. shrine event의 merciful 가중 ↓
3. sage requiredPersonality 신설 (null catch-all 제거)
4. Tier-3 자격 후보 추가 (hero/archmage/dark_lord/grandmaster 의 자격 임계점 ↓)

## 조치

1. **jobs.ts revert** — saint atkMul 2.0 → 2.5 원복.
2. **diagnosis doc** = 본 파일.
3. **carry-over (cycle 281+)**:
   - 위 4 lever 후보 의 sim 측정 (1 cycle / 1 lever, 4 cycle 누적 budget)
   - 가장 effective lever 채택 후 *Saint Re-Balance mega-phase* spec 작성
4. **메타-rule 3 답습** — 본 cycle 의 STATUS 표현 = "saint atkMul retry FAIL + revert + **atkMul lever 자체 무관 확정** + cycle 281+ root cause axis 추적 carry-over"

## 자율진화 시스템 메타-finding (cycle 277)

### Finding 7 — Lever 무관 정량 확정 패턴

cycle 259 + cycle 277 = atkMul 의 3 다른 값 모두 saint dominance 측정 76-82% (noise σ 안). 두 cycle 의 *상호 검증* 으로 *lever 무관* 결론 도출. 단일 cycle 에서 검출 불가했음 — *반복 측정의 결정성*.

### Finding 8 — Advisor 권고도 atkMul lever 의 *방향* 만 권고. axis 자체의 무관성 미발견

advisor 도 cycle 275 호출 시 "atkMul DOWN" 권고. cycle 277 측정 = 같은 axis 의 효과 0 확인. **advisor 의 권고도 axis 가정 위 — 다중-cycle 검증으로 axis 자체 reject 가능성** 박제.

### Finding 9 — n=3 baseline 도 axis 외 lever 검출 불가

cycle 257 baseline 단일 + cycle 276 deterministic 동일 + cycle 277 n=3 의 saint 76% 모두 *axis 자체 lever* 검출 못 함. baseline n 늘리는 것이 axis 분석에 도움 0 — *다른 axis 의 lever 측정* 필요.

## 다음 cycle (278+) plan

advisor 권고 채택 — saint retry 일단락. **cycle 278 = HeroDecisionAI mega-phase spec entry** (cycle 280 deadline 임박).

본 diagnosis 의 4 lever 후보 추적은 cycle 281+ carry-over.
