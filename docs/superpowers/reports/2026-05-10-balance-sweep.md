# Balance Sweep — 자동 생성

> spec `2026-05-01-content-300h-design.md` Section 10.1 / 11.2 vs simulator 측정.

| 시점 (h) | 기대 floor | 측정 floor | 클리어 시간 (s) | ±20% 통과 | 절벽 |
|---|---|---|---|---|---|
| 5 | 8 | 60 | 0.0 | ❌ | 0 |
| 30 | 25 | 100 | 0.5 | ❌ | 23, 24 |
| 80 | 60 | 100 | 0.5 | ❌ | 0 |
| 200 | 200 | 200 | 3.9 | ✅ | 0 |
| 300 | 500 | 500 | 5.8 | ✅ | 0 |
| 500 | 1500 | 1000 | ∞ | ❌ | 0 |

## 통과 기준

- **(i)** 모든 row 의 `±20% 통과` 가 ✅.
- **(ii)** 모든 row 의 `절벽` 이 0.
- **(iii)** TODO-a~d 처리 (별도 검증).

## 1차 측정 분석 (수동)

### 발견 사항

- **5h**: measuredFloor=60, expectedFloor=8. 기대 대비 **7.5배 over-tuned**. clearTime=0.0s — combo+crit 즉사. buildSimPlayer 의 baseAbilityMul(1+0.5×2=2.0) + charLvMul(1+0.02×5=1.1) 가 F8 몬스터 HP 를 한 틱에 녹임. 초반 곡선이 너무 평탄.
- **30h**: measuredFloor=100 (probe 상한), expectedFloor=25. **4배 over-tuned**. 클리어 시간 0.5s 로 거의 즉사 수준. cliff F23, F24 감지 — 절벽 2개. HP 스케일 링크가 F20~F30 구간에서 불연속.
- **80h**: measuredFloor=100 (probe 상한 100 까지만 확인), expectedFloor=60. **~1.67배 over-tuned** (실제 max 는 100 초과일 가능성). clearTime=0.5s.
- **200h**: measuredFloor=200, expectedFloor=200. ✅ tolerance 내. clearTime=3.9s.
- **300h**: measuredFloor=500, expectedFloor=500. ✅ tolerance 내. clearTime=5.8s.
- **500h**: measuredFloor=1000, expectedFloor=1500. clearTime=∞ (F1500 발산). **under-tuned**. 플레이어 공격이 고 floor 몬스터 HP 를 충분히 넘지 못함. enhanceMultiplier(mythic, 5000) 가 선형 장비 ATK 에 적용되어도 고 floor monsterLevel 의 지수 HP 스케일을 못 따라감.

### 핵심 지점 (Curve 2 결정)

부모 spec Section 11.2 Curve 2: `HP(L) = 100 × 1.4^L`. L=180 (F30) 에서 ~1.5e21.
현재 코드: `enemyMaxHp = monsterLevel * 20 (or 50) * hpMult`. L=180 에서 ~3,600.

→ 코드 모델 (선형) 과 spec 목표 (지수) 가 근본적으로 다르다. Task 7 의 옵션 A/B/C 결정:
- A. resolver 자체를 spec Curve 2 에 맞춰 수정 (코드 로직 변경, §3 비목적 위반)
- B. spec Curve 2 를 코드 선형 모델로 수정 (spec 변경)
- C. monsters.ts hpMult 만 lv 구간별 조정 (Tier A 순수, 가장 보수)

권장: **C** (Tier A 보수). 사용자 합의 후 실행.

초반 (5h/30h/80h) over-tuning 은 buildSimPlayer 의 baseAbilityMul 과 낮은 floor HP 의 불균형. 중반 (200h/300h) 은 이미 spec 범위 내. 후반 (500h) 은 player power 가 monsterLevel 지수 HP 를 따라가지 못함 — enhanceMultiplier 선형 누적이 고 floor exponential HP 에 부족.

### 절벽

cliffsDetected: **F23, F24** (30h milestone). 나머지 milestone 은 절벽 없음.
F23/F24 는 getMonsterLevel 의 구간 경계와 일치할 가능성 높음 (floor→monsterLevel 매핑 변곡점).

### 현재 pass/fail 요약

| 기준 | 결과 |
|---|---|
| (i) 모든 row ✅ | ❌ — 4개 row 실패 (5h, 30h, 80h, 500h) |
| (ii) 모든 절벽 0 | ❌ — F23, F24 절벽 존재 |
| (iii) TODO-a~d | 미처리 |

### 다음 작업 (Task 7~10)

1. Task 7 (TODO-d) — Curve 2 옵션 C 적용 (monsters.ts hpMult lv 구간별 조정) + Curve 1 anchor 미세 조정. 목표: 5h/30h/80h over-tuning 수정 + 500h 발산 해소.
2. Task 8 (TODO-a) — F30 보상 격상 (cliff 보상 보정).
3. Task 9 (TODO-b) — ULT magnitude 절벽 보정 (F23/F24 cliff 추가 원인 점검).
4. Task 10 (TODO-c) — 강화 cap 페이싱 검증.
