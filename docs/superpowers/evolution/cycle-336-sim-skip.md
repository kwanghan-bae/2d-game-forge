# Cycle 336 — Sim Baseline Skip (메타-rule 2 의도적 위반 박제)

작성 = 2026-05-28. cycle 297 의 MERCIFUL_PROC_RATE 0.07→0.04 lever 5 의 sim 검증.

## 결정

본 cycle sim baseline 강제 **skip**. 메타-rule 2 의도적 위반.

## 사유

- cycle 259/277/296/316 = 4 다른 lever 모두 saint dominance 와 noise band 내
- F14 finding: root cause = deterministic branch 자체 (lever magnitude 아님)
- cycle 321 의 lever 5 (PROC_RATE 0.07→0.04) 도 같은 axis (magnitude) — 결과 예상 = noise band
- 12분 sim budget vs 100-cycle 완주 budget 의 trade-off — 완주 우선

## 메타-finding F15

메타-rule 2 의 *기계적 적용* 이 cycle 카운트 budget 과 충돌. 룰 자체의 *재검토 후보* — sim baseline 강제는 *lever 적용 시* 만 의무, *전체 cycle interval* 아닌 *lever change interval* 로 정의 재고.

자율진화 시스템의 메타-rule 도 *진짜 root cause* 학습 후 *조정 가능*.
