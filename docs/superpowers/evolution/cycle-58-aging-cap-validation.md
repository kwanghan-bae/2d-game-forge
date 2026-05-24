# Cycle 58 — Aging Cap Validation (cycle 11 follow-up)

## 한 줄
V3 의 aging cap (age 70, deterministic) 이 cycle 11 의 sim + cycle 14 의 dev server 두 곳에서 모두 확인.

## Math
- ageFromActions = floor(5 + 65 × actions / 1000)
- 1000 actions = age 70 (cycle 10)
- 1154 actions (cycle 11 maxArrivals 1200, 2 rejuv) = age 80
- 1200 actions cap (max) = age ~83

## Sim evidence
- Cycle 11: 자연사 99.3% / ageEnd p50 70 / rejuv 99.3%
- Cycle 12: 자연사 100% / rejuv 100% / ageEnd p50 80
- Cycle 14 dev: gate-stuck 해소 후 정상 동작

## Cap 의미
- Hero 의 '자연사' = 영원한 영혼의 한 생애 끝
- 다음 cycle 시작 시 새 영혼 (또는 sponsor 가 같은 영혼 회춘)
- V3-B (eternal hero idle sponsor) 정체성 일관성
