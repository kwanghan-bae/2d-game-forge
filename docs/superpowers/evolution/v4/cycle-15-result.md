# Cycle 15 — Visual: HP 바 부드러운 애니메이션

## 요약

적 HP 바를 즉시 변경에서 200ms Phaser tween 애니메이션으로 교체.

## 변경

| 파일 | 내용 |
|------|------|
| `battle/BattleScene.ts` | animateHpBar() 메서드 추가, 4곳의 setDisplaySize → tween 교체 |

## 비주얼 성숙도

- 이펙트: 1 → 2 (HP bar tween 추가)
- 전체: 8/30 → 9/30

## 태그

- Commit: 51b24ed
- Category: visual (5/15)
