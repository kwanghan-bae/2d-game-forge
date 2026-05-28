# Cycle 12 — Balance: 골드 경제 밸런스 검증

## 요약

골드 수입 vs 장비 가격 곡선이 적정한지 sim 테스트로 검증. 모든 장비가 의도 레벨에서
50킬 이내 구매 가능 확인.

## 변경

| 파일 | 내용 |
|------|------|
| `systems/goldBalance.test.ts` | 3 tests (affordability, monotonic, hard mode) |

## 검증 결과

- 모든 장비: 해당 rarity 의도 레벨에서 50킬 이내 구매 가능
- 골드 스케일링: level 증가에 따라 단조 증가
- 하드 모드: 정확히 5배 보너스

## 태그

- Commit: 69f1730
- Category: balance (3/12)
