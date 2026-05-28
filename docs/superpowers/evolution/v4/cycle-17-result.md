# Cycle 17 — Sound: BGM 크로스페이드 전환

## 변경
- `sound.ts` playBgm() → 500ms 10-step 크로스페이드 (fade-out old + fade-in new)
- fadeOutAndStop() 헬퍼 함수 추가
- _resetSoundForTest() 에 fadeOutTimer 정리 추가
- 테스트 2개 추가 (crossfade switch, same-id no-op)

## 검증
- Vitest 1639 passed
- 오디오 전환 시 팝/클릭 음 방지

## 커밋
3a3d07e
