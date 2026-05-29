# Cycle 84 — Balance: Skill Cooldown Verification

## 변경 요약
32개 액티브 스킬의 쿨다운 밸런스 검증 테스트 5개.
- 모든 쿨다운 3~25초 범위
- execute 스킬 ≥10초, heal ≥7초
- buff 지속시간 ≤ 쿨다운 (영구 가동 방지)
- 캐릭터당 정확히 2스킬

## 파일
- `src/data/skillBalance.test.ts` — 5 tests

## 검증
- Vitest: 1764 passed (all 5 new pass)
