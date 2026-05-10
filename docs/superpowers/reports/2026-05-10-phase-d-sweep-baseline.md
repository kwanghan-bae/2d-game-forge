# Balance Sweep — 자동 생성

> spec `2026-05-01-content-300h-design.md` Section 10.1 / 11.2 vs simulator 측정.

| 시점 (h) | 기대 floor | 측정 floor | 클리어 시간 (s) | ≥기대 통과 | 절벽 |
|---|---|---|---|---|---|
| 5 | 8 | 30 | 0.0 | ✅ | 0 |
| 30 | 25 | 60 | 2.9 | ✅ | 0 |
| 80 | 60 | 100 | 1.9 | ✅ | 0 |
| 200 | 200 | 200 | 10.0 | ✅ | 0 |
| 300 | 500 | 500 | 16.6 | ✅ | 0 |
| 500 | 1500 | 1500 | 166.1 | ✅ | 0 |

## 통과 기준

- **(i)** 모든 row 의 `measuredFloor ≥ expectedFloor` 가 ✅.
- **(ii)** 모든 row 의 `절벽` 이 0.
- **(iii)** TODO-a~d 처리 (별도 검증).

<!-- AUTO-GENERATED ABOVE / MANUAL ANALYSIS BELOW — preserved across re-runs -->
