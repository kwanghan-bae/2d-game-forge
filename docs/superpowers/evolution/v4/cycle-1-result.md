# Cycle 1 Result — "이모지에서 스프라이트로"

## 판정: PASS ✅

## 변경 요약

| 항목 | 내용 |
|------|------|
| 카테고리 | Visual |
| 커밋 | b2f8648 |
| 파일 수정 | 2 modified + 2 created |
| 신규 코드 | ~120 LOC (spriteFrames + spriteLoader + scene 수정) |
| 테스트 | 1609 vitest ✅, typecheck ✅, lint ✅ |

## 달성 사항

1. **BattleScene sprite 표시**: 아군(좌) + 적(우) pixel art sprite 렌더링
2. **OverworldScene hero sprite**: 이모지 Text → 16px Sprite @2x scale
3. **OverworldScene landmark sprites**: enemy/boss 랜드마크를 sprite로 교체
4. **Hit VFX**: 적 피격 시 white tint flash + scale punch animation
5. **프레임 매핑 시스템**: characterId → hero frame, monsterId → monster frame (hash 기반)

## 에셋 사용

- `tiny_dungeon_sheet.png` (Kenney Tiny Dungeon, CC0) — 기존 미사용 에셋 활성화
- 12×11 grid @16px = 132 프레임 (캐릭터 row 8, 몬스터 row 9, 아이템 row 10)

## 비주얼 성숙도

| 변경 전 | 변경 후 | 변화 |
|---------|---------|------|
| 1/30 | 5/30 | +4 |

## carry-over (다음 사이클 후보)

1. k_gain == k_req → inflation 정체성 위배 (balance)
2. 패시브 스킬 7/16 동일 (system)
3. personality-blind 나레이션 (narrative)
