# Cycle 61 Result

- **Category**: Narrative
- **Title**: Character Death Farewell Quotes
- **Verdict**: PASS

## 구현 내용

영웅이 전투에서 패배할 때 캐릭터별 고유 사망 대사를 표시한다.

- `deathQuotes.ts`: 16 캐릭터 × 2 사망 대사 (랜덤 1개 선택)
- BattleScene 패배 시점에 화면 중앙 이탈릭 텍스트로 fade-in (400ms)
- 알 수 없는 캐릭터는 '…' fallback

## 테스트

- deathQuotes.test.ts: 4 tests (16개 보유, 각 2개, 랜덤 선택, fallback)

## 비주얼 성숙도: 16/30 (변동 없음)
