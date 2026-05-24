# Cycle 61 — Respawn Helper Validation (cycle 12 follow-up)

## 한 줄
Cycle 12 의 `pickRespawnPlacement` helper 가 base + 5 non-base realm 모두에서 hero realm 안 spawn 보장. cycle 12 9 unit test PASS.

## Logic
- Hero realm 'base': zoneForColumn(consumed.gridX) 유지 (V1e zone-banded narrative 호환)
- Hero realm non-base: realm.columnRange 안 + realm.enemyRoster 에서 chapter index keyed pick

## Test coverage
- base zone preserved
- 5 non-base realm: spawn ∈ realm.columnRange
- chapter index → LANDMARK_TYPES id 모두 valid
- 5 realm × chapter regression guard
