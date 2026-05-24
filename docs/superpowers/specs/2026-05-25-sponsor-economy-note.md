# Sponsor Economy Note

## 한 줄
SponsorGold 0 시작 + cycle 종료 시 자동 가산. V3 의 idle sponsor 정체성에 부합. 별도 fix 불필요.

## 현재 모델
- `meta.sponsorGold` 0 으로 시작
- Cycle 종료 시 `goldFromCycle(state.run)` 누적
- 다음 cycle prep 화면에서 `spend('balanced')` 자동
- atkBaseBonus + hpBaseBonus quadratic cost 누적

## 검증
- Cycle 16 chained sim: 50 cycle 후 atk+hp bonus 1076 — organic 진화 확인
- Cycle 17 balance probe: chained/batch ratio 1.01 — 누적 영향 작음
- Cycle 38 V3 identity recap: aging-bound (자연사 cap), stat 아님

## Conclusion
별도 balance fix 불필요. V3 정체성 일관성 정합.

## Carry-over close
- Sponsor economy 검증 ✓
