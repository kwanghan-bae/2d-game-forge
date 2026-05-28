# Cycle 8 — System: 나머지 패시브 구현

## 요약

Cycle 3에서 도입한 패시브 프레임워크의 미구현 3종(item_find, beast_damage, life_conversion)을
완전 배선.

## 변경

| 파일 | 내용 |
|------|------|
| `systems/passives.ts` | PassiveBonuses 인터페이스 10필드 확정 + switch 3 case 추가 |
| `battle/BattleScene.ts` | life_conversion (HP→ATK), beast_damage (non-boss ×1.5) 배선. passiveBonuses 기본값 10필드 |
| `store/gameStore.ts` | `incrementDungeonKill(level, itemFindMult?)` — DR 보상에 itemFindMult 곱셈 |
| `systems/passives.test.ts` | +3 tests (mudang, choeui, tiger_hunter) |
| `systems/passiveBalance.test.ts` | power estimator에 3 효과 추가 (여전히 ratio < 2.0) |

## 검증

- typecheck: clean
- vitest: 1629 passed (+3)
- balance sim: max/min ratio < 2.0 유지

## 태그

- Commit: cd55d82
- Category: system (2/8)
