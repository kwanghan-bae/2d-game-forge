# Cycle 6 — 화면 전환 페이드 (Visual)

## 결과: PASS ✅

## 변경 요약

| 항목 | before | after |
|------|--------|-------|
| 화면 전환 | 즉시 mount/unmount | 300ms opacity fade-in |
| ScreenTransition 컴포넌트 | 없음 | 신규 생성 |
| StoryModal | 전환 영향 | 전환 외부 (overlay 유지) |

## 기술 노트

- `requestAnimationFrame` 으로 mount → opacity:0 → next frame → opacity:1
  자연스러운 fade 보장
- duration prop으로 커스터마이즈 가능 (기본 300ms)
- transitionKey = screen 상태 → screen 바뀔 때마다 재트리거

## Maturity 변화

- 전환: 0→1
- 전체: 8/30 → 9/30
