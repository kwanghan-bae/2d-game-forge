# Cycle 62 Result

- **Category**: Sound
- **Title**: Realm-Specific Battle Ambient Sound Loop
- **Verdict**: PASS

## 구현 내용

전투 중 렐름별 고유 앰비언트 사운드가 BGM 아래에서 루프 재생된다.

- 6 렐름 매핑: base→wind, sea→waves, volcano→lava, underworld→whispers, heaven→chimes, chaos→static
- 볼륨 = sfxVolume × 0.3 (미묘한 레이어링)
- BattleScene create 시 `playAmbient(realmId)` 호출
- 전투 종료 (승리/패배 모두) 시 `stopAmbient()` 호출
- 파일 누락 시 silent fallback (기존 SFX 패턴 동일)

## 테스트

- ambient.test.ts: 2 tests (non-browser 안전 + idempotent stop)

## 비주얼 성숙도: 16/30
- SFX 0→1 (앰비언트 시스템 구축)
