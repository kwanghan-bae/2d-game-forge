# Cycle 3 — 패시브 스킬 다양화 (System)

## 결과: PASS ✅

## 변경 요약

| 항목 | before | after |
|------|--------|-------|
| 고유 패시브 효과 | 3종 (stat_boost, beast_damage, item_find 등) | 8종 (+crit_rate, dodge_rate, exp_boost, gold_boost, boss_damage, first_strike) |
| 동일 패시브 캐릭터 | 8/16 | 2/16 (hwarang, seonin — 둘 다 stat_boost이나 값 다름) |
| 패시브 전투 반영 | ❌ display-only | ✅ BattleScene에서 6종 효과 소비 |
| 테스트 | 1609 | 1618 (+9 passives) |

## 캐릭터별 패시브 매핑

| 캐릭터 | 효과 | 값 | 설명 |
|--------|------|-----|------|
| hwarang | stat_boost | 1.15 | 올스탯 15% |
| geomgaek | crit_rate | 0.25 | 크리티컬 확률 +25% |
| dosa | boss_damage | 1.3 | 보스 데미지 30% 증가 |
| yacha | dodge_rate | 0.2 | 회피 확률 20% |
| jangsu | first_strike | 2.0 | 첫 타격 2배 데미지 |
| seungbyeong | exp_boost | 1.2 | 경험치 20% 증가 |
| yongnyeo | gold_boost | 1.3 | 골드 획득 30% 증가 |
| seonin | stat_boost | 1.2 | 올스탯 20% |

## 위험/부채

- 기존 `beast_damage`, `item_find`, `life_conversion`, `bp_ring` 등은 아직 미구현 (Phase 2 레거시 캐릭터용)
- 향후 패시브 밸런스 패치 필요할 수 있음 (first_strike 2x가 강력)

## Maturity 변화

- system: +1 (display-only → combat-wired)
- 전체: 5/30 → 6/30
