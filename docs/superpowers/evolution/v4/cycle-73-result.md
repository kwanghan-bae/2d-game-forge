# Cycle 73 — Balance: Boss HP Scaling Verification

## 변경 요약
보스 HP/ATK 스케일링 균형 검증 테스트 5개 추가.
- bpReward 티어별 평균 hpMult 단조증가 확인
- 하드모드 보스 ≥ 노멀 동일 구역
- hpMult:atkMult 비율 3:1~10:1 범위
- 인접 보스 간 최대 gap ≤ 20
- bpReward 범위 2-8

## 파일
- `src/data/bossScaling.test.ts` — 5 tests

## 검증
- Vitest: 1727 passed
