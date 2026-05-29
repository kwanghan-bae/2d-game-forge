# Cycle 101 — Visual: Enemy Idle Bobbing

## 변경 요약
적 스프라이트에 idle bobbing (수직 부유) 애니메이션 추가.
- 일반 적: 4px, 1000ms Sine loop
- 보스: 4px, 1500ms (느리고 위엄 있게)
- spawn animation 완료 후 시작 (boss 600ms, normal 350ms delay)

## 파일
- `src/battle/BattleScene.ts` — enemy bob tween after spawn
- `src/battle/enemyBob.test.ts` — 3 tests

## 검증
- Vitest: 1813 passed
