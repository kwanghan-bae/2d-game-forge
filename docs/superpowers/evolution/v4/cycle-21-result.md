# Cycle 21 — Visual: 적 처치 파티클 이펙트

## 변경
- `spawnDeathParticles()` 메서드 추가 (BattleScene)
- 8개 직사각형 파티클 방사형 burst (gold/red/white)
- 400ms Power2 ease-out, alpha+scale 감소 후 destroy
- 적 사망 시 자동 호출

## 검증
- Vitest 1645 passed

## 커밋
6779c3c
