# Cycle 11 — Sound: 전투 맥락 SFX 확장

## 요약

전투 중 3개 핵심 이벤트에 SFX 트리거 추가.

## 변경

| 파일 | 내용 |
|------|------|
| `battle/BattleScene.ts` | +3 playSfx() 호출 (coin, skill, player-hit) |

## SFX 목록 (누적)

| ID | 트리거 시점 | 도입 |
|----|------------|------|
| crit | 치명타 발생 | Cycle 5 |
| dodge | 회피 성공 | Cycle 5 |
| hit | 적 명중 | Cycle 5 |
| levelup | 레벨업/부활 | Cycle 5 |
| defeat | 사망 | Cycle 5 |
| boss-victory | 보스 처치 | Cycle 5 |
| coin | 적 처치 보상 | Cycle 11 |
| skill | 액티브 스킬 발동 | Cycle 11 |
| player-hit | 피격 | Cycle 11 |

## 검증

- typecheck: clean
- vitest: 1632 passed
- 실제 .ogg 파일 없어도 silent fallback 동작 확인 완료 (Cycle 5 검증)

## 태그

- Commit: 313ef4a
- Category: sound (2/11)
