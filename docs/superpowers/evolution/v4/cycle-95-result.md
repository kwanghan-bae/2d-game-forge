# Cycle 95 — Balance: Monster HP Multiplier Verification

## 변경 요약
61 일반 몬스터의 스탯 배율 밸런스 검증 4 테스트.
- hpMult 0.5~4.0 범위 확인
- atkMult가 hpMult의 2배+0.5를 초과하지 않음 (극단적 밸런스 붕괴 방지)
- 높은 hpMult 몬스터가 더 많은 경험치 제공
- levelMin < levelMax 진행 검증

## 파일
- `src/data/monsterBalance.test.ts` — 4 tests

## 검증
- Vitest: 1794 passed
