# Cycle 16 — Narrative: 보스 처치 승리 연출

## 요약

보스 처치 시 Phaser 씬 내에서 극적인 승리 텍스트 애니메이션 표시.

## 변경

| 파일 | 내용 |
|------|------|
| `battle/BattleScene.ts` | showBossVictoryText() 추가 + onBossKill 에서 호출 |

## 연출 상세

- 4개 한국어 승리 문구 랜덤: 격파!/승리!/정복!/토벌 완료!
- Scale 0.5→1.2 (Back.easeOut, 400ms) 로 임팩트 등장
- 500ms 딜레이 후 위로 올라가며 fade-out (600ms)
- Gold accent 색상, 32px bold

## 태그

- Commit: 2c4dce6
- Category: narrative (3/16)
