# Cycle 91 — System: Playtime Tracker

## 변경 요약
세션 플레이타임 추적 모듈. start/pause/resume/format API.
- performance.now() 기반 정밀 측정
- pause/resume 지원 (탭 이탈 등)
- 포맷: "3h 15m", "45m 12s", "30s"

## 파일
- `src/systems/playtimeTracker.ts` — playtime module
- `src/systems/playtimeTracker.test.ts` — 4 tests

## 검증
- Vitest: 1781 passed
