# Cycle 5 — 전투 BGM + 맥락 SFX (Sound)

## 결과: PASS ✅

## 변경 요약

| 항목 | before | after |
|------|--------|-------|
| BGM 활성화 | 정의만 (unused) | App.tsx useEffect로 screen별 자동 전환 |
| 전투 BGM | 없음 | BattleScene.create()→'battle', shutdown()→'field' |
| 치명타 SFX | 없음 | playSfx('crit') on crit hit |
| 회피 SFX | 없음 | playSfx('dodge') on passive dodge |
| 테스트 | 1623 | 1623 (무변경 — 기존 sound.test.ts가 커버) |

## 기술 노트

- BGM/SFX 파일은 여전히 placeholder (silent fallback).
  실제 ogg 파일은 에셋 통합 사이클에서 추가.
- Phaser `shutdown()` lifecycle 사용하여 battle→field 복귀 보장.
- bgmIdForScreen 맵: main-menu/cycle-prep-v2 → 'lobby', overworld → 'field'

## Maturity 변화

- sound: 0→1 (BGM 시스템 활성화 + 맥락 SFX 3종 추가)
- 전체: 7/30 → 8/30
