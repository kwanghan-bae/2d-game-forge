# Cycle 19 — Balance: 스킬 DPS 밸런스 검증

## 변경
- `skillBalance.test.ts` 생성: DPS efficiency 함수로 32스킬 밸런스 검사
- 4개 assertion: 스킬 수, 아웃라이어 제한, 쿨타임 범위, 배율 범위

## 검증
- Vitest 4/4 passed
- 현재 스킬 풀: median DPS efficiency 내에서 max < 4× 충족

## 커밋
c4c1df1
