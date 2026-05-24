# Cycle 69 — Circular Baseline Note (P-1.5 known debt)

## 한 줄
HeroEntity → JobSystem circular dependency baseline 1 since `3f9cc9e`. 모든 50+ cycle 회귀 0 유지.

## Background
- P-1.5 phase 에서 introduced
- madge --circular detects 1
- 모든 cycle 의 머지 가드 = baseline 1 회귀 0

## 미래 fix candidate
- HeroEntity 의 JobSystem import 를 lazy 또는 dependency injection 으로
- 또는 JobSystem 의 type 만 import (type-only)
- 또는 별도 module 로 분리

## Cycle 70+ defer
- 현재 회귀 0 = 작동 정상
- 변경 시 50+ cycle 의 회귀 가드 영향 큼
- Cycle 81+ (Phase C) 의 final layer 후보
