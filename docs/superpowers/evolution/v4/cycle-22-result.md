# Cycle 22 — Sound: 연속 레벨업 피치 상승

## 변경
- `playSfx(id, playbackRate=1)` 에 playbackRate 옵션 추가 (0.5~2.0 clamp)
- BattleScene: `consecutiveLevelUps` 카운터 추가
- 연속 레벨업마다 pitch +10% (최대 +50% = 1.5배속)
- 비레벨업 킬 시 카운터 리셋

## 검증
- Vitest 1645 passed

## 커밋
3253de3
