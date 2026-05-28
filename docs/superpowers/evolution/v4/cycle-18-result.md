# Cycle 18 — System: 전투 킬 카운터 HUD

## 변경
- BattleScene에 `killCount` 필드 + `killCountText` Phaser Text 추가
- create() 에서 (336, 16) 우상단에 'Kill: 0' 표시 (금색 #f0c060)
- 적 처치마다 카운터 증가 + 텍스트 갱신
- 던전 진입마다 0으로 리셋

## 검증
- Vitest 1639 passed
- 보스+일반 적 모두 카운트

## 커밋
19e2124
