# Cycle 76 — Narrative: Area Danger Warnings

## 변경 요약
적 레벨이 플레이어 레벨의 2배 이상인 구역 진입 시
전투 로그 첫 줄에 ⚠️ 위험 경고 표시. 6종 경고 문구 풀.

## 파일
- `src/data/areaWarnings.ts` — getAreaWarning (threshold 2x)
- `src/data/areaWarnings.test.ts` — 4 tests
- `src/battle/BattleScene.ts` — import + initialLog 에 warning 삽입

## 검증
- Vitest: 1734 passed
- Typecheck: clean
