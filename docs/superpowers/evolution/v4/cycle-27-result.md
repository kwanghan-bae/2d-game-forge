# Cycle 27 — Sound: UI 클릭 사운드

## 변경
- App.tsx에 global capture-phase click listener 추가
- button, [role=button], a 태그 클릭 시 playSfx('click') 호출
- 개별 컴포넌트 수정 불필요한 글로벌 접근

## 검증
- Vitest 1652 passed

## 커밋
a3e562c
